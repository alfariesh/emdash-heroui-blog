/**
 * "Listen to this article": one app-wide narration player (expo-audio).
 *
 * The player lives at module scope, not in a screen, so narration keeps
 * playing in the background, on the lock screen and while the reader opens
 * other articles; every article screen shows a mini player for it. Screens
 * read it through small `useSyncExternalStore` hooks (no React context):
 * `usePlayback()` for the controls, `useReadAlongWord()` for one block's
 * highlight, which changes only when the narration reaches another word.
 * The pure rules (position lookup, word split, resume, stall) are in
 * read-along.ts.
 */
import type { ApiPostAudio } from "@blog/shared";
import {
	createAudioPlayer,
	setAudioModeAsync,
	type AudioPlayer,
	type AudioStatus,
} from "expo-audio";
import { useSyncExternalStore } from "react";
import {
	clampSeek,
	isStalled,
	nextSpeed,
	positionAt,
	positionToSave,
	resumeStartMs,
	type ReadAlongPosition,
} from "./read-along";
import { storage } from "./storage";

/** What is playing: enough for the controls and the lock screen. */
export interface AudioTrack {
	slug: string;
	title: string;
	/** MP3 URL; it also identifies the narration's version. */
	url: string;
	durationMs: number;
	/** Narrator, shown as the lock screen's artist. */
	voice: string;
	artworkUrl: string | null;
}

export interface PlaybackState {
	track: AudioTrack | null;
	playing: boolean;
	buffering: boolean;
	positionMs: number;
	/** From the file once loaded, the API's value before. */
	durationMs: number;
	speed: number;
	/** The file failed to load, or stalled: playback stopped until `retryPlayback()`. */
	failed: boolean;
}

/** Often enough to move the word highlight with the voice (~3 words a second). */
const UPDATE_INTERVAL_MS = 100;
const SEEK_STEP_MS = 10_000;
/** Saving the resume position while playing; pausing and stopping save at once. */
const SAVE_EVERY_MS = 5000;
const FOLLOW_KEY = "article-audio:follow";
/** Per file, so a regenerated narration starts from the beginning. */
const positionKey = (url: string) => `article-audio:position:${url}`;

const IDLE: PlaybackState = {
	track: null,
	playing: false,
	buffering: false,
	positionMs: 0,
	durationMs: 0,
	speed: 1,
	failed: false,
};

let player: AudioPlayer | null = null;
let statusSubscription: { remove(): void } | null = null;
let sessionConfigured = false;
let state: PlaybackState = IDLE;
/** Timings for `state.track`, once fetched. */
let narration: ApiPostAudio | null = null;
let position: ReadAlongPosition | null = null;
let followAlong: boolean | null = null;
/** The reader asked to play (the status may still say "buffering"). */
let wantsToPlay = false;
let lastProgressAt = 0;
let lastSavedAt = 0;
/** Applied once the (re)loaded file reports it is ready: seeking earlier is ignored. */
let pendingSeekMs: number | null = null;
let watchdog: ReturnType<typeof setInterval> | null = null;
/** Bumped by every (re)load, so screens can retry requests that failed with the file. */
let loadAttempt = 0;

const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function update(patch: Partial<PlaybackState>) {
	state = { ...state, ...patch };
	position = narration ? positionAt(narration.blocks, state.positionMs) : null;
	emit();
}

function savePosition() {
	const track = state.track;
	if (!track) return;
	lastSavedAt = Date.now();
	const ms = positionToSave(state.positionMs, state.durationMs);
	try {
		if (ms === null) void storage.removeItem(positionKey(track.url)).catch(() => undefined);
		else storage.setItemSync(positionKey(track.url), String(ms));
	} catch {
		// Resuming is a convenience; a storage error must not stop playback.
	}
}

function savedStartMs(track: AudioTrack): number {
	try {
		return resumeStartMs(Number(storage.getItemSync(positionKey(track.url))), track.durationMs);
	} catch {
		return 0;
	}
}

/**
 * A file that never loads (offline, server down) reports no error on every
 * platform; it just buffers. The watchdog turns "no progress for a while"
 * into a failure the controls can offer to retry.
 */
function startWatchdog() {
	lastProgressAt = Date.now();
	if (watchdog) return;
	watchdog = setInterval(() => {
		if (!isStalled({ wantsToPlay, lastProgressAt, now: Date.now() })) return;
		fail();
	}, 1000);
}

function stopWatchdog() {
	if (watchdog) clearInterval(watchdog);
	watchdog = null;
}

function fail() {
	wantsToPlay = false;
	stopWatchdog();
	player?.pause();
	update({ playing: false, buffering: false, failed: true });
}

function onStatus(status: AudioStatus) {
	if (!state.track || !player) return;
	if (status.isLoaded && pendingSeekMs !== null) {
		const target = pendingSeekMs;
		pendingSeekMs = null;
		void player.seekTo(target / 1000);
	}
	const durationMs = status.duration > 0 ? status.duration * 1000 : state.durationMs;
	const positionMs = status.didJustFinish ? durationMs : status.currentTime * 1000;
	if (positionMs !== state.positionMs) lastProgressAt = Date.now();
	if (status.didJustFinish) {
		wantsToPlay = false;
		stopWatchdog();
	}
	if (status.error) {
		// The status keeps reporting the error until the next load; fail once.
		if (!state.failed) fail();
		return;
	}
	update({
		playing: status.playing && !status.didJustFinish,
		buffering: wantsToPlay && (status.isBuffering || !status.isLoaded),
		// At the end the position stays on the last frame, so "play" can tell to start over.
		positionMs,
		durationMs,
	});
	if (status.didJustFinish || Date.now() - lastSavedAt >= SAVE_EVERY_MS) savePosition();
}

/**
 * Background playback and the lock screen need an exclusive session:
 * expo-audio only shows Now Playing controls with `doNotMix`.
 */
async function configureSession() {
	if (sessionConfigured) return;
	sessionConfigured = true;
	try {
		await setAudioModeAsync({
			playsInSilentMode: true,
			shouldPlayInBackground: true,
			interruptionMode: "doNotMix",
		});
	} catch {
		// Without a session the narration still plays in the foreground.
		sessionConfigured = false;
	}
}

function load(url: string) {
	loadAttempt += 1;
	if (!player) {
		player = createAudioPlayer(url, { updateInterval: UPDATE_INTERVAL_MS });
		statusSubscription = player.addListener("playbackStatusUpdate", onStatus);
	} else {
		player.replace(url);
	}
	player.setPlaybackRate(state.speed);
}

function play() {
	if (!player) return;
	wantsToPlay = true;
	player.play();
	startWatchdog();
}

/**
 * Starts (or resumes) a post's narration, from where the reader left it
 * last time; another post's narration stops.
 */
export function playTrack(track: AudioTrack): void {
	if (player && state.track?.url === track.url) {
		if (state.failed) retryPlayback();
		else if (!state.playing) resume();
		return;
	}
	savePosition();
	void configureSession();
	narration = null;
	const startMs = savedStartMs(track);
	pendingSeekMs = startMs > 0 ? startMs : null;
	state = {
		...IDLE,
		track,
		durationMs: track.durationMs,
		speed: state.speed,
		positionMs: startMs,
		buffering: true,
	};
	load(track.url);
	play();
	player?.setActiveForLockScreen(
		true,
		{ title: track.title, artist: track.voice, artworkUrl: track.artworkUrl ?? undefined },
		{ showSeekForward: true, showSeekBackward: true },
	);
	update({});
}

/** Reloads a file that failed and plays on from the same position. */
export function retryPlayback(): void {
	const track = state.track;
	if (!track || !player) return;
	pendingSeekMs = state.positionMs > 0 ? state.positionMs : null;
	load(track.url);
	update({ failed: false, buffering: true });
	play();
}

function resume() {
	if (!player) return;
	if (state.failed) {
		retryPlayback();
		return;
	}
	// Finished: "play" starts over.
	if (state.positionMs >= state.durationMs - 250) seekTo(0);
	play();
	update({ playing: true });
}

export function togglePlayback(): void {
	if (!player) return;
	if (state.playing || wantsToPlay) {
		wantsToPlay = false;
		stopWatchdog();
		player.pause();
		update({ playing: false, buffering: false });
		savePosition();
	} else resume();
}

export function seekTo(ms: number): void {
	if (!player) return;
	const target = clampSeek(ms, state.durationMs);
	if (state.failed) pendingSeekMs = target;
	else void player.seekTo(target / 1000);
	lastProgressAt = Date.now();
	// Move the controls and highlight now; the next status update confirms.
	update({ positionMs: target });
}

export function seekBy(deltaMs: number): void {
	seekTo(state.positionMs + deltaMs);
}

export const skipBack = () => seekBy(-SEEK_STEP_MS);
export const skipForward = () => seekBy(SEEK_STEP_MS);

/** Plays from the start of a narrated block ("Play from here"); false when it is not narrated. */
export function playFromBlock(key: string): boolean {
	const block = narration?.blocks.find((candidate) => candidate.key === key);
	if (!block) return false;
	seekTo(block.startMs);
	if (!state.playing) resume();
	return true;
}

/** Next speed in PLAYBACK_SPEEDS; applies to the current and later narrations. */
export function cycleSpeed(): void {
	const speed = nextSpeed(state.speed);
	player?.setPlaybackRate(speed);
	update({ speed });
}

/** Stops the narration and removes the mini player and lock screen controls. */
export function stopPlayback(): void {
	savePosition();
	wantsToPlay = false;
	pendingSeekMs = null;
	stopWatchdog();
	statusSubscription?.remove();
	statusSubscription = null;
	if (player) {
		player.pause();
		player.clearLockScreenControls();
		player.remove();
		player = null;
	}
	narration = null;
	state = { ...IDLE, speed: state.speed };
	update({});
}

/** Attaches fetched timings, if they belong to the file that is playing. */
export function attachNarration(data: ApiPostAudio): void {
	if (state.track?.url !== data.url || narration === data) return;
	narration = data;
	update({});
}

function readFollowAlong(): boolean {
	followAlong ??= storage.getItemSync(FOLLOW_KEY) !== "off";
	return followAlong;
}

/** "Follow along": highlight and scroll with the narration. On by default, remembered. */
export function setFollowAlong(on: boolean): void {
	followAlong = on;
	storage.setItemSync(FOLLOW_KEY, on ? "on" : "off");
	emit();
}

export function usePlayback(): PlaybackState {
	return useSyncExternalStore(subscribe, () => state);
}

/** The loaded narration's track; changes only when another one starts or it stops. */
export function useActiveTrack(): AudioTrack | null {
	return useSyncExternalStore(subscribe, () => state.track);
}

export function useFollowAlong(): boolean {
	return useSyncExternalStore(subscribe, readFollowAlong);
}

/** Changes whenever a narration is (re)loaded, e.g. after "Try again". */
export function useLoadAttempt(): number {
	return useSyncExternalStore(subscribe, () => loadAttempt);
}

/** This post's narration is loaded with its timings, so blocks can be played from. */
export function useNarrationReady(slug: string): boolean {
	return useSyncExternalStore(subscribe, () => narration !== null && state.track?.slug === slug);
}

/**
 * Read-along state of one rendered block: null when it is not being read
 * (or follow-along is off), -1 to highlight the whole block (estimated
 * timings, or between words), else the index of the word being read.
 */
export function useReadAlongWord(slug: string, key: string | undefined): number | null {
	return useSyncExternalStore(subscribe, () => {
		if (!key || !position || !narration || state.track?.slug !== slug || !readFollowAlong()) return null;
		if (narration.blocks[position.block]?.key !== key) return null;
		return narration.timing === "word" ? position.word : -1;
	});
}
