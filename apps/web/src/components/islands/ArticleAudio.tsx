import type { ApiPostAudio } from "@blog/shared";
import { GoBackward10SecIcon, GoForward10SecIcon, HeadphonesIcon, PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button, Slider, Switch } from "@heroui/react";
import { positionAt } from "emdash-plugin-article-audio/client";
import { useEffect, useRef, useState } from "react";
import {
	clearHighlights,
	findBlockElements,
	highlightsSupported,
	setHighlights,
	type BlockTarget,
} from "../../lib/read-along";

interface Props {
	slug: string;
	title: string;
	/** Absolute MP3 URL and length, rendered on the server so the card needs no request. */
	url: string;
	durationMs: number;
	voice: string;
	image?: string | null;
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2, 0.75];
const RESUME_KEY = "article-audio:position:";

function formatTime(ms: number) {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = String(total % 60).padStart(2, "0");
	return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

const minutes = (ms: number) => `${Math.max(1, Math.round(ms / 60_000))} min listen`;

function readResume(slug: string): number {
	try {
		return Number(localStorage.getItem(RESUME_KEY + slug)) || 0;
	} catch {
		return 0;
	}
}

function writeResume(slug: string, ms: number) {
	try {
		if (ms > 0) localStorage.setItem(RESUME_KEY + slug, String(Math.round(ms)));
		else localStorage.removeItem(RESUME_KEY + slug);
	} catch {
		// Private mode or blocked storage: resuming is a convenience only.
	}
}

/**
 * "Listen to this article": plays the post's narration and, with word
 * timing, highlights the word being read in the article body.
 */
export default function ArticleAudio({ slug, title, url, durationMs, voice, image }: Props) {
	const audio = useRef<HTMLAudioElement>(null);
	const card = useRef<HTMLElement>(null);
	const [cardVisible, setCardVisible] = useState(true);
	const [playing, setPlaying] = useState(false);
	const [loading, setLoading] = useState(false);
	const [time, setTime] = useState(0);
	const [duration, setDuration] = useState(durationMs);
	const [speed, setSpeed] = useState(1);
	const [follow, setFollow] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const narration = useRef<{ data: ApiPostAudio; targets: Array<BlockTarget | null> } | null>(null);
	const lastScroll = useRef(0);
	const current = useRef<{ block: number; word: number } | null>(null);

	// A compact player floats in when follow-along has scrolled the card away.
	useEffect(() => {
		const element = card.current;
		if (!element || typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(([entry]) => setCardVisible(entry.isIntersecting), { rootMargin: "-64px 0px 0px 0px" });
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	// The reader scrolling on their own pauses follow-along scrolling for a few seconds.
	useEffect(() => {
		const onUserScroll = () => (lastScroll.current = performance.now());
		window.addEventListener("wheel", onUserScroll, { passive: true });
		window.addEventListener("touchmove", onUserScroll, { passive: true });
		return () => {
			window.removeEventListener("wheel", onUserScroll);
			window.removeEventListener("touchmove", onUserScroll);
		};
	}, []);

	async function loadTimings() {
		if (narration.current) return narration.current;
		// The timings must belong to this exact file: key the request by it, so a
		// cached response from before a regeneration is never paired with new audio.
		const file = url.split("/").pop() ?? "";
		const endpoint = `/api/v1/posts/${encodeURIComponent(slug)}/audio?file=${encodeURIComponent(file)}`;
		let response = await fetch(endpoint);
		let body = response.ok ? ((await response.json()) as { ok: boolean; data?: ApiPostAudio }) : null;
		if (body?.data && body.data.url !== url) {
			response = await fetch(endpoint, { cache: "no-store" });
			body = response.ok ? ((await response.json()) as { ok: boolean; data?: ApiPostAudio }) : null;
		}
		if (!body?.ok || !body.data || body.data.url !== url) return null;
		const root = document.querySelector("[data-post-content]");
		const titleEl = document.querySelector("[data-post-title]");
		narration.current = { data: body.data, targets: root ? findBlockElements(body.data.blocks, root, titleEl) : [] };
		return narration.current;
	}

	// Follow along: highlight the current word (or block) from the playhead.
	useEffect(() => {
		const element = audio.current;
		if (!element || !playing) return;
		let frame = 0;
		const tick = () => {
			const ms = element.currentTime * 1000;
			setTime(ms);
			const loaded = narration.current;
			if (follow && loaded && highlightsSupported()) {
				const position = positionAt(loaded.data, ms);
				const previous = current.current;
				if (position?.block !== previous?.block || position?.word !== previous?.word) {
					current.current = position;
					const target = position ? loaded.targets[position.block] : null;
					if (target && position) {
						setHighlights(target, loaded.data.timing === "word" ? position.word : -1);
						if (position.block !== previous?.block && performance.now() - lastScroll.current > 4000) {
							const rect = target.element.getBoundingClientRect();
							if (rect.top < 96 || rect.bottom > window.innerHeight * 0.8) {
								const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
								target.element.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
							}
						}
					} else clearHighlights();
				}
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [playing, follow]);

	useEffect(() => {
		if (!follow) {
			clearHighlights();
			current.current = null;
		}
	}, [follow]);

	useEffect(() => () => clearHighlights(), []);

	// Lock-screen and headset controls.
	useEffect(() => {
		if (!("mediaSession" in navigator) || !playing) return;
		navigator.mediaSession.metadata = new MediaMetadata({
			title,
			artist: voice,
			artwork: image ? [{ src: image, sizes: "1200x675" }] : [],
		});
		const element = audio.current;
		const seek = (delta: number) => element && (element.currentTime = Math.max(0, element.currentTime + delta));
		navigator.mediaSession.setActionHandler("play", () => void element?.play());
		navigator.mediaSession.setActionHandler("pause", () => element?.pause());
		navigator.mediaSession.setActionHandler("seekbackward", () => seek(-10));
		navigator.mediaSession.setActionHandler("seekforward", () => seek(10));
	}, [playing, title, voice, image]);

	async function toggle() {
		const element = audio.current;
		if (!element) return;
		if (!element.paused) {
			element.pause();
			return;
		}
		setError(null);
		setLoading(true);
		try {
			if (element.currentTime === 0) {
				const resume = readResume(slug);
				if (resume > 5_000 && resume < duration - 10_000) element.currentTime = resume / 1000;
			}
			// Timings are only needed once playing; they load in parallel with the audio.
			void loadTimings().catch(() => null);
			element.playbackRate = speed;
			await element.play();
		} catch {
			setError("The audio could not be played. Try again.");
		} finally {
			setLoading(false);
		}
	}

	function seekTo(ms: number) {
		const element = audio.current;
		if (!element) return;
		element.currentTime = ms / 1000;
		setTime(ms);
	}

	function nextSpeed() {
		const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
		setSpeed(next);
		if (audio.current) audio.current.playbackRate = next;
	}

	const started = time > 0 || playing;

	return (
		<section ref={card} className="w-full rounded-3xl bg-surface p-4 sm:p-5" aria-label="Listen to this article">
			<audio
				ref={audio}
				src={url}
				preload="none"
				onPlay={() => setPlaying(true)}
				onPause={() => {
					setPlaying(false);
					writeResume(slug, (audio.current?.currentTime ?? 0) * 1000);
				}}
				onEnded={() => {
					setPlaying(false);
					writeResume(slug, 0);
					clearHighlights();
				}}
				onLoadedMetadata={(event) => {
					const seconds = event.currentTarget.duration;
					if (Number.isFinite(seconds)) setDuration(seconds * 1000);
				}}
				onWaiting={() => setLoading(true)}
				onPlaying={() => setLoading(false)}
				onError={() => setError("The audio could not be loaded.")}
			/>
			<div className="flex items-center gap-4">
				<Button
					isIconOnly
					variant="primary"
					size="lg"
					className="shrink-0 rounded-full"
					aria-label={playing ? "Pause" : started ? "Resume listening" : "Listen to this article"}
					onPress={() => void toggle()}
				>
					<HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} aria-hidden="true" />
				</Button>
				<div className="min-w-0 flex-1">
					<p className="typography--body-sm typography--weight-semibold flex items-center gap-1.5 text-foreground">
						<HugeiconsIcon icon={HeadphonesIcon} size={16} className="shrink-0 text-muted" aria-hidden="true" />
						{loading ? "Loading…" : playing ? "Listening" : started ? "Paused" : "Listen to this article"}
					</p>
					<p className="typography--body-sm truncate text-muted">
						{minutes(duration)}
						{voice ? ` · ${voice}` : ""}
					</p>
				</div>
				<Button variant="ghost" size="sm" className="shrink-0 tabular-nums" aria-label={`Playback speed ${speed}×`} onPress={nextSpeed}>
					{speed}×
				</Button>
			</div>

			{started && (
				<div className="mt-4 grid gap-3">
					<Slider
						aria-label="Position"
						minValue={0}
						maxValue={Math.max(1, Math.round(duration / 1000))}
						value={Math.round(time / 1000)}
						onChange={(value) => typeof value === "number" && seekTo(value * 1000)}
						className="w-full"
					>
						<Slider.Track>
							<Slider.Fill />
							<Slider.Thumb />
						</Slider.Track>
					</Slider>
					<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
						<div className="flex items-center gap-1">
							<Button isIconOnly variant="ghost" size="sm" aria-label="Back 10 seconds" onPress={() => seekTo(Math.max(0, time - 10_000))}>
								<HugeiconsIcon icon={GoBackward10SecIcon} aria-hidden="true" />
							</Button>
							<Button isIconOnly variant="ghost" size="sm" aria-label="Forward 10 seconds" onPress={() => seekTo(Math.min(duration, time + 10_000))}>
								<HugeiconsIcon icon={GoForward10SecIcon} aria-hidden="true" />
							</Button>
							<span className="typography--body-sm ms-1 tabular-nums text-muted">
								{formatTime(time)} / {formatTime(duration)}
							</span>
						</div>
						{highlightsSupported() && (
							<Switch size="sm" isSelected={follow} onChange={setFollow}>
								<Switch.Content>
									<Switch.Control>
										<Switch.Thumb />
									</Switch.Control>
									<span className="typography--body-sm text-muted">Follow along</span>
								</Switch.Content>
							</Switch>
						)}
					</div>
				</div>
			)}
			{error && (
				<p role="alert" className="typography--body-sm mt-3 text-danger">
					{error}
				</p>
			)}

			<div
				data-visible={started && !cardVisible}
				aria-hidden={!(started && !cardVisible)}
				className="audio-mini fixed start-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex h-12 items-center gap-1 rounded-full bg-background/80 ps-1 pe-4 shadow-overlay backdrop-blur-md backdrop-saturate-150 sm:start-6 sm:bottom-6"
			>
				<Button
					isIconOnly
					variant="ghost"
					size="sm"
					className="rounded-full"
					aria-label={playing ? "Pause article audio" : "Resume article audio"}
					isDisabled={!(started && !cardVisible)}
					onPress={() => void toggle()}
				>
					<HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} aria-hidden="true" />
				</Button>
				<span className="typography--body-sm tabular-nums text-muted">
					{formatTime(time)} / {formatTime(duration)}
				</span>
			</div>
		</section>
	);
}
