import type { ApiPost } from "@blog/shared";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Button } from "heroui-native/button";
import { GlassView } from "heroui-native/glass-view";
import { useThemeColor } from "heroui-native/hooks";
import { PressableFeedback } from "heroui-native/pressable-feedback";
import { Slider } from "heroui-native/slider";
import { Spinner } from "heroui-native/spinner";
import { Switch } from "heroui-native/switch";
import { Typography } from "heroui-native/text";
import { cn } from "heroui-native/utils";
import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Icon } from "@/components/ui/icon";
import {
	cycleSpeed,
	playTrack,
	retryPlayback,
	seekTo,
	setFollowAlong,
	skipBack,
	skipForward,
	stopPlayback,
	togglePlayback,
	useFollowAlong,
	usePlayback,
	type AudioTrack,
	type PlaybackState,
} from "@/lib/article-audio";
import {
	ArrowDownIcon,
	AudioPauseIcon,
	AudioPlayIcon,
	AudioSeekBackIcon,
	AudioSeekForwardIcon,
	AudioWaveIcon,
	CloseIcon,
	HeadphonesIcon,
	RefreshIcon,
	type IconSvgElement,
} from "@/lib/icons";
import { formatTime, listenLabel, listenMinutes, speedLabel } from "@/lib/read-along";

/** Same size and bottom offset as the back-to-top button, so the two share a row. */
export const MINI_PLAYER_HEIGHT = 48;
export const DOCK_BOTTOM_GAP = 16;
const RING_SIZE = 40;
const RING_STROKE = 2.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MORPH = LinearTransition.duration(260);

/** The narration of a post as a player track, or null when the post has none. */
export function audioTrack(post: ApiPost): AudioTrack | null {
	if (!post.audio) return null;
	return {
		slug: post.slug,
		title: post.title,
		url: post.audio.url,
		durationMs: post.audio.durationMs,
		voice: post.audio.voice,
		artworkUrl: post.featuredImage?.url ?? null,
	};
}

interface ListenButtonProps {
	track: AudioTrack;
	/** Opens the full player (after starting this narration if needed). */
	onOpen: () => void;
}

/**
 * "Listen · 6 min" pill beside the article byline. It starts this post's
 * narration and opens the player docked at the bottom; while this post is
 * playing it reads "Playing" and just opens the player.
 */
export function ListenButton({ track, onOpen }: ListenButtonProps) {
	const playback = usePlayback();
	const isCurrent = playback.track?.url === track.url;
	const playing = isCurrent && playback.playing;

	const onPress = () => {
		void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		if (!isCurrent || !playback.playing) playTrack(track);
		onOpen();
	};

	return (
		<PressableFeedback
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={
				playing ? "Playing. Open the audio player" : `Listen to this article, ${listenLabel(track.durationMs)}`
			}
			hitSlop={6}
			className="h-9 shrink-0 flex-row items-center gap-1.5 rounded-full bg-accent-soft px-3.5"
		>
			<Icon icon={playing ? AudioWaveIcon : HeadphonesIcon} size={16} strokeWidth={2} tone="accent" />
			<Typography type="body-sm" weight="semibold" className="text-accent tabular-nums">
				{playing ? "Playing" : `Listen · ${listenMinutes(track.durationMs)} min`}
			</Typography>
		</PressableFeedback>
	);
}

interface AudioDockProps {
	/** Slug of the article on screen: another post's narration offers a link to it. */
	slug: string;
	expanded: boolean;
	onExpand: () => void;
	onCollapse: () => void;
	/** Right inset of the mini player: leaves room for the back-to-top button in the same row. */
	endInset: number;
}

/**
 * The narration player docked at the bottom of article screens: the full
 * card (opened from the Listen pill or by tapping the mini player) or the
 * mini player it shrinks into when the reader scrolls. One view resizes
 * between the two (a layout transition, which follows Reduce Motion), so
 * the card visibly morphs instead of swapping.
 */
export function AudioDock({ slug, expanded, onExpand, onCollapse, endInset }: AudioDockProps) {
	const { bottom } = useSafeAreaInsets();
	const playback = usePlayback();
	const track = playback.track;
	if (!track) return null;

	return (
		<Animated.View
			entering={FadeInDown.duration(220)}
			exiting={FadeOutDown.duration(180)}
			layout={MORPH}
			className={cn("absolute overflow-hidden border border-border", expanded ? "rounded-[28px]" : "rounded-full")}
			style={{ left: 16, right: expanded ? 16 : endInset, bottom: bottom + DOCK_BOTTOM_GAP }}
		>
			<GlassView intensity={90} className={expanded ? "rounded-[28px]" : "rounded-full"} />
			{expanded ? (
				<Animated.View key="full" entering={FadeIn.duration(200).delay(60)} exiting={FadeOut.duration(80)}>
					<FullPlayer playback={playback} track={track} otherPost={track.slug !== slug} onCollapse={onCollapse} />
				</Animated.View>
			) : (
				<Animated.View key="mini" entering={FadeIn.duration(200).delay(60)} exiting={FadeOut.duration(80)}>
					<MiniPlayer playback={playback} track={track} onExpand={onExpand} />
				</Animated.View>
			)}
		</Animated.View>
	);
}

interface FullPlayerProps {
	playback: PlaybackState;
	track: AudioTrack;
	/** The narration belongs to another article than the one on screen. */
	otherPost: boolean;
	onCollapse: () => void;
}

function FullPlayer({ playback, track, otherPost, onCollapse }: FullPlayerProps) {
	const follow = useFollowAlong();
	// While the thumb is dragged the bar shows the drag, and seeks once on release.
	const [dragMs, setDragMs] = useState<number | null>(null);
	const shownMs = dragMs ?? playback.positionMs;
	const sliderValue = (value: number | number[]) => (Array.isArray(value) ? (value[0] ?? 0) : value);

	return (
		<View className="gap-3 p-4">
			<View className="flex-row items-center gap-3">
				<View className="size-10 items-center justify-center rounded-full bg-accent-soft">
					<Icon icon={HeadphonesIcon} size={20} tone="accent" />
				</View>
				<View className="min-w-0 flex-1">
					<Typography weight="semibold" numberOfLines={1}>
						{otherPost ? track.title : "Listen to this article"}
					</Typography>
					<Typography type="body-xs" color="muted" numberOfLines={1}>
						{`${listenLabel(track.durationMs)} · ${track.voice}`}
					</Typography>
				</View>
				<RoundButton icon={ArrowDownIcon} label="Minimize player" onPress={onCollapse} size="sm" />
			</View>

			{otherPost ? (
				<Button
					variant="ghost"
					size="sm"
					className="self-start"
					onPress={() => router.push({ pathname: "/posts/[slug]", params: { slug: track.slug } })}
				>
					<Button.Label>Open article</Button.Label>
				</Button>
			) : null}

			<View className="gap-1">
				<Slider
					value={shownMs}
					minValue={0}
					maxValue={Math.max(1, playback.durationMs)}
					step={1000}
					onChange={(value) => setDragMs(sliderValue(value))}
					onChangeEnd={(value) => {
						seekTo(sliderValue(value));
						setDragMs(null);
					}}
					accessibilityLabel="Playback position"
				>
					<Slider.Track>
						<Slider.Fill />
						<Slider.Thumb />
					</Slider.Track>
				</Slider>
				<View className="flex-row justify-between">
					<Typography type="body-xs" color="muted" className="tabular-nums">
						{formatTime(shownMs)}
					</Typography>
					<Typography type="body-xs" color="muted" className="tabular-nums">
						{formatTime(playback.durationMs)}
					</Typography>
				</View>
			</View>

			{playback.failed ? (
				<View className="flex-row items-center justify-between gap-3 rounded-2xl bg-default px-3 py-2">
					<Typography type="body-sm" className="flex-1">
						Couldn't load the audio.
					</Typography>
					<Button variant="secondary" size="sm" onPress={retryPlayback}>
						<Icon icon={RefreshIcon} size={16} />
						<Button.Label>Try again</Button.Label>
					</Button>
				</View>
			) : null}

			<View className="flex-row items-center justify-between">
				<SpeedButton speed={playback.speed} />
				<View className="flex-row items-center gap-4">
					<RoundButton icon={AudioSeekBackIcon} label="Back 10 seconds" onPress={skipBack} />
					<PlayButton playback={playback} size="lg" />
					<RoundButton icon={AudioSeekForwardIcon} label="Forward 10 seconds" onPress={skipForward} />
				</View>
				<RoundButton icon={CloseIcon} label="Stop listening" onPress={stopPlayback} size="sm" />
			</View>

			<View className="flex-row items-center justify-between gap-3 border-t border-separator pt-3">
				<View className="flex-1">
					<Typography type="body-sm" weight="medium">
						Follow along
					</Typography>
					<Typography type="body-xs" color="muted">
						Highlight and scroll to the text being read. Long-press a paragraph to play from it.
					</Typography>
				</View>
				<Switch isSelected={follow} onSelectedChange={setFollowAlong} accessibilityLabel="Follow along" />
			</View>
		</View>
	);
}

interface MiniPlayerProps {
	playback: PlaybackState;
	track: AudioTrack;
	onExpand: () => void;
}

/** One row as tall as the back-to-top button: progress ring around play/pause, title and time, speed. */
function MiniPlayer({ playback, track, onExpand }: MiniPlayerProps) {
	return (
		<View className="flex-row items-center gap-2 ps-1 pe-1.5" style={{ height: MINI_PLAYER_HEIGHT - 2 }}>
			<PlayButton playback={playback} size="ring" />
			<PressableFeedback
				onPress={onExpand}
				accessibilityRole="button"
				accessibilityLabel={`${track.title}. Open the audio player`}
				className="min-w-0 flex-1 justify-center"
			>
				<Typography type="body-sm" weight="semibold" numberOfLines={1}>
					{track.title}
				</Typography>
				<Typography type="body-xs" color="muted" numberOfLines={1} className="tabular-nums">
					{playback.failed
						? "Couldn't load the audio"
						: `${formatTime(playback.positionMs)} / ${formatTime(playback.durationMs)}`}
				</Typography>
			</PressableFeedback>
			<SpeedButton speed={playback.speed} compact />
		</View>
	);
}

interface PlayButtonProps {
	playback: PlaybackState;
	/** "ring": the mini player's button, with playback progress drawn around it. */
	size: "lg" | "ring";
}

function PlayButton({ playback, size }: PlayButtonProps) {
	const [ringTrack, ringFill] = useThemeColor(["border", "accent"]);
	const failed = playback.failed;
	const loading = !failed && playback.buffering;
	const playing = playback.playing || loading;
	const progress = playback.durationMs > 0 ? Math.min(1, playback.positionMs / playback.durationMs) : 0;
	const label = failed ? "Try again" : playing ? "Pause" : "Play";
	const icon = failed ? RefreshIcon : playing ? AudioPauseIcon : AudioPlayIcon;

	if (size === "lg") {
		return (
			<PressableFeedback
				onPress={failed ? retryPlayback : togglePlayback}
				accessibilityRole="button"
				accessibilityLabel={label}
				hitSlop={6}
				className="size-14 items-center justify-center rounded-full bg-accent"
			>
				{loading ? (
					<Spinner size="sm" color="white" />
				) : (
					<Icon icon={icon} size={26} strokeWidth={2} tone="on-accent" />
				)}
			</PressableFeedback>
		);
	}

	return (
		<PressableFeedback
			onPress={failed ? retryPlayback : togglePlayback}
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
			hitSlop={6}
			className="items-center justify-center rounded-full"
			style={{ width: RING_SIZE, height: RING_SIZE }}
		>
			{/* Rotated so the ring starts at twelve o'clock, like the back-to-top ring. */}
			<Svg
				width={RING_SIZE}
				height={RING_SIZE}
				pointerEvents="none"
				style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
			>
				<Circle
					cx={RING_SIZE / 2}
					cy={RING_SIZE / 2}
					r={RING_RADIUS}
					stroke={ringTrack}
					strokeWidth={RING_STROKE}
					fill="none"
				/>
				<Circle
					cx={RING_SIZE / 2}
					cy={RING_SIZE / 2}
					r={RING_RADIUS}
					stroke={ringFill}
					strokeWidth={RING_STROKE}
					strokeLinecap="round"
					strokeDasharray={RING_CIRCUMFERENCE}
					strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
					fill="none"
				/>
			</Svg>
			<View pointerEvents="none">
				{loading ? (
					<Spinner size="sm" />
				) : (
					<Icon icon={icon} size={18} strokeWidth={2} tone={failed ? "danger" : "foreground"} />
				)}
			</View>
		</PressableFeedback>
	);
}

interface RoundButtonProps {
	icon: IconSvgElement;
	label: string;
	onPress: () => void;
	size?: "sm" | "md";
}

function RoundButton({ icon, label, onPress, size = "md" }: RoundButtonProps) {
	return (
		<PressableFeedback
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={label}
			hitSlop={6}
			className={cn("items-center justify-center rounded-full bg-default", size === "md" ? "size-11" : "size-9")}
		>
			<Icon icon={icon} size={size === "md" ? 22 : 18} />
		</PressableFeedback>
	);
}

function SpeedButton({ speed, compact = false }: { speed: number; compact?: boolean }) {
	return (
		<PressableFeedback
			onPress={cycleSpeed}
			accessibilityRole="button"
			accessibilityLabel={`Playback speed ${speed}×`}
			accessibilityHint="Changes the playback speed"
			hitSlop={6}
			className={cn("items-center justify-center rounded-full bg-default", compact ? "h-8 w-12" : "h-9 w-14")}
		>
			<Typography type="body-sm" weight="semibold" className="tabular-nums">
				{speedLabel(speed)}
			</Typography>
		</PressableFeedback>
	);
}
