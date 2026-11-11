import type { ApiPost, ApiPostSummary } from "@blog/shared";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { Separator } from "heroui-native/separator";
import { Skeleton } from "heroui-native/skeleton";
import { Typography } from "heroui-native/text";
import { useToast } from "heroui-native/toast";
import { cn } from "heroui-native/utils";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { Platform, Share, useWindowDimensions, View, type LayoutChangeEvent } from "react-native";
import Animated, {
	clamp,
	Extrapolation,
	interpolate,
	useAnimatedReaction,
	useAnimatedRef,
	useAnimatedStyle,
	useDerivedValue,
	useReducedMotion,
	useScrollOffset,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { AdSlot } from "@/components/ad-slot";
import {
	AudioDock,
	audioTrack,
	DOCK_BOTTOM_GAP,
	ListenButton,
	MINI_PLAYER_HEIGHT,
} from "@/components/post/article-audio";
import { ArticleTopBar, TOP_BAR_HEIGHT } from "@/components/post/article-top-bar";
import { BackToTop } from "@/components/post/back-to-top";
import { Byline } from "@/components/post/byline";
import { PostCard } from "@/components/post/post-card";
import { PostComments } from "@/components/post/post-comments";
import { PostMeta } from "@/components/post/post-meta";
import { ResumeReading } from "@/components/post/resume-reading";
import { TermChips } from "@/components/post/term-chips";
import { PortableText } from "@/components/portable-text/portable-text";
import {
	READ_ALONG_BLOCK_CLASS,
	usePlayFromHere,
	WordRuns,
	type ReadAlong,
} from "@/components/portable-text/text-block";
import { GlassIconButton } from "@/components/ui/glass-icon-button";
import { Image } from "@/components/ui/image";
import { ErrorView } from "@/components/ui/state-view";
import { attachNarration, useActiveTrack, useLoadAttempt, useReadAlongWord } from "@/lib/article-audio";
import { toggleBookmark, useIsBookmarked } from "@/lib/bookmarks";
import { BookmarkIcon, ShareIcon } from "@/lib/icons";
import { postWebUrl } from "@/lib/links";
import { findCachedSummary, flattenPages, postAudioQuery, postQuery, postsQuery } from "@/lib/queries";
import { followScrollTarget, mayFollowScroll, splitWords } from "@/lib/read-along";
import { useReadingPosition } from "@/lib/use-reading-position";

const MAX_HERO_HEIGHT = 520;
/** URL fragment of the web's comment section: …/posts/slug#comments opens at the comments. */
const COMMENTS_HASH = "comments";
/** How long a #comments link keeps re-aiming while comments and "Read next" load below the card. */
const COMMENTS_SCROLL_MS = 3000;

export default function PostScreen() {
	// Expo Router passes a link's #fragment as the "#" param.
	const { slug, "#": hash } = useLocalSearchParams<{ slug: string; "#"?: string }>();
	const queryClient = useQueryClient();

	// Paint the title, image and byline from a cached list summary while the
	// full post (Portable Text) loads.
	const { data: post, error, isPlaceholderData, refetch } = useQuery({
		...postQuery(slug),
		placeholderData: () => {
			const summary = findCachedSummary(queryClient, slug);
			return summary ? ({ ...summary, updatedAt: "", content: [] } satisfies ApiPost) : undefined;
		},
	});

	if (!post) {
		return (
			<View className="flex-1 bg-background">
				{error ? (
					<View className="flex-1 justify-center">
						<ErrorView error={error} onRetry={() => void refetch()} />
					</View>
				) : (
					<ArticleSkeleton />
				)}
				<StaticTopBar />
			</View>
		);
	}

	return (
		<Article
			post={post}
			contentLoading={isPlaceholderData}
			contentError={error}
			onRetry={refetch}
			openAtComments={hash === COMMENTS_HASH}
		/>
	);
}

interface ArticleProps {
	post: ApiPost;
	contentLoading: boolean;
	contentError: Error | null;
	onRetry: () => void;
	/** Scroll to "Discussion" once it lays out (a link to …#comments). */
	openAtComments?: boolean;
}

function Article({ post, contentLoading, contentError, onRetry, openAtComments = false }: ArticleProps) {
	const { width, height: windowHeight } = useWindowDimensions();
	const { top, bottom } = useSafeAreaInsets();
	const scrollRef = useAnimatedRef<Animated.ScrollView>();
	const scrollY = useScrollOffset(scrollRef);
	const viewportHeight = useSharedValue(1);
	const reduceMotion = useReducedMotion();
	const commentsTarget = useRef<number | null>(null);
	const commentsDeadline = useRef(0);
	/** When the reader last dragged the article: follow-along waits a few seconds after that. */
	const lastUserScroll = useRef(-Infinity);

	const hasHero = post.featuredImage !== null;
	const heroHeight = Math.min(Math.round(width * 1.1), MAX_HERO_HEIGHT);
	const barHeight = top + TOP_BAR_HEIGHT;
	const solidAt = hasHero ? heroHeight - barHeight - 24 : 8;
	const webUrl = postWebUrl(post.slug);
	const bodyFailed = contentError !== null && post.content.length === 0;
	const reading = useReadingPosition({
		slug: post.slug,
		ready: !contentLoading && !bodyFailed,
		offer: !openAtComments,
		scrollY,
		viewportHeight,
	});
	const resume = reading.resume;
	const bodyEnd = reading.bodyEnd;

	// "Listen to this article": the Listen pill beside the byline starts the narration and
	// opens the full player docked at the bottom; scrolling shrinks it into the mini player.
	const track = audioTrack(post);
	const activeTrack = useActiveTrack();
	const isPlayingHere = track !== null && activeTrack?.url === track.url;
	const {
		data: narration,
		isError: timingsFailed,
		refetch: refetchTimings,
	} = useQuery({
		...postAudioQuery(post.slug, track?.url ?? ""),
		// Timings are fetched only once this post's narration has started.
		enabled: isPlayingHere,
	});
	useEffect(() => {
		if (narration) attachNarration(narration);
	}, [narration]);
	// Timings that failed with the file (offline) are fetched again when the reader retries.
	const loadAttempt = useLoadAttempt();
	const retryTimings = useEffectEvent(() => {
		if (isPlayingHere && timingsFailed) void refetchTimings();
	});
	useEffect(() => {
		retryTimings();
	}, [loadAttempt]);

	const [audioExpanded, setAudioExpanded] = useState(false);
	const dockOpen = activeTrack !== null;
	const expanded = dockOpen && audioExpanded;
	// Space the collapsed dock takes at the bottom (content padding, pills above it).
	const dockOffset = dockOpen ? MINI_PLAYER_HEIGHT + 12 : 0;

	// The mini player shares a row with back-to-top, so it needs to know when that
	// button is on screen (the same threshold BackToTop uses).
	const showBackToTopAfter = windowHeight / 2;
	const [pastBackToTop, setPastBackToTop] = useState(false);
	useAnimatedReaction(
		() => scrollY.get() >= showBackToTopAfter,
		(past, wasPast) => {
			if (past !== wasPast) scheduleOnRN(setPastBackToTop, past);
		},
	);
	// The full card spans the width, so back-to-top steps aside while it is open.
	const backToTopSuspended = resume !== null || expanded;
	// Gutter, or gutter + the 48 pt back-to-top button + an 8 pt gap.
	const dockEndInset = pastBackToTop && !backToTopSuspended ? 16 + 48 + 8 : 16;

	// Follow along: when a new block starts, bring it into the reading band unless the
	// reader has been scrolling on their own in the last few seconds.
	const readAlong: ReadAlong = {
		slug: post.slug,
		onActiveBlock: (view) => {
			if (!mayFollowScroll(Date.now(), lastUserScroll.current)) return;
			view.measureInWindow((_x, y, _width, height) => {
				const target = followScrollTarget({
					scrollY: scrollY.get(),
					blockTop: y,
					blockHeight: height,
					viewportTop: barHeight,
					viewportHeight: windowHeight - barHeight - bottom - dockOffset - DOCK_BOTTOM_GAP,
				});
				if (target !== null) scrollRef.current?.scrollTo({ y: target, animated: !reduceMotion });
			});
		},
	};

	// Where the H1 ends, from nested layouts: the bar's title takes over once it has slid under.
	const titleLayout = useRef({ body: 0, header: 0, title: 0 });
	const titleAt = useSharedValue(0);
	const placeTitle = (part: "body" | "header" | "title", value: number) => {
		titleLayout.current[part] = value;
		const { body, header, title } = titleLayout.current;
		titleAt.set(title > 0 ? body + header + title - barHeight : 0);
	};

	// While the page below the card is still loading it can be too short to
	// scroll the card to the top, so the scroll is retried as the content grows
	// for a moment, unless the reader starts dragging first.
	const scrollToComments = () => {
		const target = commentsTarget.current;
		if (target === null || Date.now() > commentsDeadline.current) return;
		scrollRef.current?.scrollTo({ y: target, animated: !reduceMotion });
	};

	// The card mounts only after the body has rendered, and it moves when the banner above it
	// loads, so every layout inside the window re-aims. The window opens on the first layout.
	const onCommentsLayout = (event: LayoutChangeEvent) => {
		if (!openAtComments) return;
		if (commentsTarget.current === null) commentsDeadline.current = Date.now() + COMMENTS_SCROLL_MS;
		commentsTarget.current = Math.max(0, event.nativeEvent.layout.y - barHeight - 12);
		scrollToComments();
	};

	// Share of the body read (UI thread): comments and "Read next" below count as finished.
	const progress = useDerivedValue(() => {
		const end = bodyEnd.get();
		if (end <= 0) return 0;
		const max = end - viewportHeight.get();
		return max > 0 ? clamp(scrollY.get() / max, 0, 1) : 1;
	});

	const scrollToTop = () => {
		commentsDeadline.current = 0;
		void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		scrollRef.current?.scrollTo({ y: 0, animated: !reduceMotion });
	};

	// Parallax: the hero drifts at half speed and stretches on iOS overscroll.
	const heroStyle = useAnimatedStyle(() => {
		const y = scrollY.get();
		return {
			transform: [
				{ translateY: interpolate(y, [-heroHeight, 0, heroHeight], [-heroHeight / 2, 0, heroHeight * 0.5]) },
				{ scale: interpolate(y, [-heroHeight, 0], [2, 1], Extrapolation.CLAMP) },
			],
		};
	});

	return (
		<View className="flex-1 bg-background">
			<Animated.ScrollView
				ref={scrollRef}
				scrollEventThrottle={16}
				onLayout={(event) => viewportHeight.set(event.nativeEvent.layout.height)}
				onContentSizeChange={scrollToComments}
				onScrollBeginDrag={() => {
					commentsDeadline.current = 0;
					lastUserScroll.current = Date.now();
					// Reading on: the full player shrinks into the mini player.
					setAudioExpanded(false);
				}}
				onScrollEndDrag={() => {
					lastUserScroll.current = Date.now();
				}}
				contentContainerStyle={{
					paddingBottom: bottom + 32 + dockOffset,
					paddingTop: hasHero ? 0 : barHeight,
				}}
				showsVerticalScrollIndicator={false}
			>
				{hasHero ? (
					<Animated.View style={[{ height: heroHeight }, heroStyle]}>
						<Image image={post.featuredImage} className="size-full" priority="high" transition={0} />
						{/* Scrim so the status bar and glass buttons stay legible on bright photos. */}
						<LinearGradient
							colors={["rgba(0,0,0,0.35)", "transparent"]}
							style={{ position: "absolute", top: 0, left: 0, right: 0, height: barHeight + 40 }}
							pointerEvents="none"
						/>
					</Animated.View>
				) : null}

				<View
					className={cn("gap-6 bg-background px-5", hasHero ? "-mt-8 rounded-t-[32px] pt-7" : "pt-2")}
					onLayout={(event) => {
						reading.onBodyLayout(event);
						placeTitle("body", event.nativeEvent.layout.y);
					}}
				>
					<ArticleHeader
						post={post}
						onLayout={(event) => placeTitle("header", event.nativeEvent.layout.y)}
						onTitleLayout={(event) =>
							placeTitle("title", event.nativeEvent.layout.y + event.nativeEvent.layout.height)
						}
						listen={track ? <ListenButton track={track} onOpen={() => setAudioExpanded(true)} /> : null}
					/>
					<Separator />
					{contentLoading ? (
						<BodySkeleton />
					) : bodyFailed ? (
						<ErrorView error={contentError} onRetry={onRetry} className="py-8" />
					) : (
						<PortableText value={post.content} webUrl={webUrl} readAlong={track ? readAlong : undefined} />
					)}
					{post.tags.length > 0 ? (
						<TermChips categories={[]} tags={post.tags} max={post.tags.length} interactive size="md" className="pt-4" />
					) : null}
				</View>

				{contentLoading || bodyFailed ? null : (
					<AdSlot placement="post_bottom" className="mx-4 mt-10" />
				)}

				{/* After the body has loaded, so the comments request never competes with it. */}
				{contentLoading || bodyFailed ? null : (
					<View className="mx-4 mt-12" onLayout={onCommentsLayout}>
						<PostComments slug={post.slug} webUrl={webUrl} />
					</View>
				)}

				<RelatedPosts post={post} />
			</Animated.ScrollView>

			<ArticleTopBar
				title={post.title}
				scrollY={scrollY}
				solidAt={solidAt}
				titleAt={titleAt}
				overImage={hasHero}
				actions={<ArticleActions post={post} webUrl={webUrl} />}
			/>

			{/* Waits for the resume pill: on a phone-width screen the two would overlap. */}
			<BackToTop
				scrollY={scrollY}
				progress={progress}
				showAfter={showBackToTopAfter}
				suspended={backToTopSuspended}
				onPress={scrollToTop}
			/>

			{resume && !expanded ? (
				<ResumeReading
					progress={resume.progress}
					onResume={() => {
						scrollRef.current?.scrollTo({ y: resume.offset, animated: !reduceMotion });
						reading.dismiss();
					}}
					onDismiss={reading.dismiss}
					bottomOffset={dockOffset}
				/>
			) : null}

			<AudioDock
				slug={post.slug}
				expanded={expanded}
				onExpand={() => setAudioExpanded(true)}
				onCollapse={() => setAudioExpanded(false)}
				endInset={dockEndInset}
			/>
		</View>
	);
}

interface ArticleHeaderProps {
	post: ApiPost;
	onLayout: (event: LayoutChangeEvent) => void;
	onTitleLayout: (event: LayoutChangeEvent) => void;
	/** "Listen" pill beside the byline, when the post has narration. */
	listen?: ReactNode;
}

function ArticleHeader({ post, onLayout, onTitleLayout, listen }: ArticleHeaderProps) {
	return (
		<View className="gap-4" onLayout={onLayout}>
			<TermChips categories={post.categories} tags={[]} interactive size="md" />
			<View onLayout={onTitleLayout}>
				<ArticleTitle post={post} />
			</View>
			{post.excerpt ? (
				<Typography selectable color="muted" className="text-[18px] leading-7">
					{post.excerpt}
				</Typography>
			) : null}
			<View className="flex-row items-center gap-3 pt-1">
				{/* The Listen pill already gives a length; reading time beside it would crowd the row. */}
				<Byline
					bylines={post.bylines}
					max={2}
					size="md"
					showRole
					readingTime={listen ? undefined : post.readingTime}
					className="flex-1"
				>
					<PostMeta publishedAt={post.publishedAt} dateStyle="long" />
				</Byline>
				{listen}
			</View>
		</View>
	);
}

/** The H1, tinted like a body block while the narration reads the title. */
function ArticleTitle({ post }: { post: ApiPost }) {
	const word = useReadAlongWord(post.slug, post.audio ? "title" : undefined);
	const playFromHere = usePlayFromHere(post.slug, post.audio ? "title" : undefined);
	const segments = word !== null && word >= 0 ? splitWords([post.title])[0] : undefined;
	return (
		<View className={cn("-mx-2 rounded-lg px-2", word !== null && READ_ALONG_BLOCK_CLASS)}>
			<Typography.Heading type="h1" {...playFromHere} className="text-[30px] leading-[38px] tracking-tight">
				{segments && word !== null ? <WordRuns segments={segments} word={word} /> : post.title}
			</Typography.Heading>
		</View>
	);
}

function ArticleActions({ post, webUrl }: { post: ApiPostSummary; webUrl: string }) {
	const saved = useIsBookmarked(post.slug);
	const { toast } = useToast();

	const onBookmark = () => {
		const nowSaved = toggleBookmark(post);
		void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		toast.show({
			variant: nowSaved ? "success" : "default",
			label: nowSaved ? "Saved" : "Removed from Saved",
		});
	};

	const onShare = () =>
		void Share.share(
			// iOS shares `url` as a link; Android only sends `message`.
			Platform.OS === "ios" ? { title: post.title, url: webUrl } : { title: post.title, message: `${post.title}\n${webUrl}` },
		);

	return (
		<>
			<GlassIconButton
				icon={BookmarkIcon}
				accessibilityLabel={saved ? "Remove from Saved" : "Save post"}
				selected={saved}
				tone={saved ? "accent" : "foreground"}
				onPress={onBookmark}
			/>
			<GlassIconButton icon={ShareIcon} accessibilityLabel="Share" onPress={onShare} />
		</>
	);
}

/** "Read next": newest posts from the same category (or overall), sharing that list's cache. */
function RelatedPosts({ post }: { post: ApiPost }) {
	const category = post.categories[0]?.slug;
	const { data } = useInfiniteQuery(postsQuery(category ? { category } : {}));
	const related = flattenPages(data)
		.filter((other) => other.slug !== post.slug)
		.slice(0, 3);
	if (related.length === 0) return null;

	return (
		<View className="gap-3 px-4 pt-12">
			<Typography.Heading type="h5" className="px-1">
				Read next
			</Typography.Heading>
			{related.map((other) => (
				<PostCard key={other.slug} post={other} />
			))}
		</View>
	);
}

function StaticTopBar() {
	const scrollY = useSharedValue(0);
	return <ArticleTopBar title="" scrollY={scrollY} solidAt={0} titleAt={scrollY} />;
}

function ArticleSkeleton() {
	const { top } = useSafeAreaInsets();
	return (
		<View className="gap-4 px-5" style={{ paddingTop: top + TOP_BAR_HEIGHT + 8 }}>
			<Skeleton className="h-7 w-28 rounded-full" />
			<Skeleton className="h-9 w-full rounded-lg" />
			<Skeleton className="h-9 w-3/4 rounded-lg" />
			<Skeleton className="h-5 w-1/2 rounded-md" />
			<BodySkeleton />
		</View>
	);
}

function BodySkeleton() {
	return (
		<View className="gap-3 pt-2" accessibilityLabel="Loading post">
			{["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"].map((widthClass, index) => (
				<Skeleton key={index} className={cn("h-4 rounded-md", widthClass)} />
			))}
		</View>
	);
}
