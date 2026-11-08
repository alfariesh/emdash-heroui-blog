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
import { Platform, Share, useWindowDimensions, View } from "react-native";
import Animated, {
	clamp,
	Extrapolation,
	interpolate,
	useAnimatedRef,
	useAnimatedStyle,
	useDerivedValue,
	useScrollOffset,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArticleTopBar, TOP_BAR_HEIGHT } from "@/components/post/article-top-bar";
import { Byline } from "@/components/post/byline";
import { PostCard } from "@/components/post/post-card";
import { PostMeta } from "@/components/post/post-meta";
import { TermChips } from "@/components/post/term-chips";
import { PortableText } from "@/components/portable-text/portable-text";
import { GlassIconButton } from "@/components/ui/glass-icon-button";
import { Image } from "@/components/ui/image";
import { ErrorView } from "@/components/ui/state-view";
import { toggleBookmark, useIsBookmarked } from "@/lib/bookmarks";
import { BookmarkIcon, ShareIcon } from "@/lib/icons";
import { postWebUrl } from "@/lib/links";
import { findCachedSummary, flattenPages, postQuery, postsQuery } from "@/lib/queries";

const MAX_HERO_HEIGHT = 520;

export default function PostScreen() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
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

	return <Article post={post} contentLoading={isPlaceholderData} contentError={error} onRetry={refetch} />;
}

interface ArticleProps {
	post: ApiPost;
	contentLoading: boolean;
	contentError: Error | null;
	onRetry: () => void;
}

function Article({ post, contentLoading, contentError, onRetry }: ArticleProps) {
	const { width } = useWindowDimensions();
	const { top, bottom } = useSafeAreaInsets();
	const scrollRef = useAnimatedRef<Animated.ScrollView>();
	const scrollY = useScrollOffset(scrollRef);
	const contentHeight = useSharedValue(1);
	const viewportHeight = useSharedValue(1);

	const hasHero = post.featuredImage !== null;
	const heroHeight = Math.min(Math.round(width * 1.1), MAX_HERO_HEIGHT);
	const barHeight = top + TOP_BAR_HEIGHT;
	const solidAt = hasHero ? heroHeight - barHeight - 24 : 8;
	const webUrl = postWebUrl(post.slug);

	// Share of the article read, for the progress line in the top bar (UI thread).
	const progress = useDerivedValue(() => {
		const max = contentHeight.get() - viewportHeight.get();
		return max > 0 ? clamp(scrollY.get() / max, 0, 1) : 0;
	});

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
				onContentSizeChange={(_, height) => contentHeight.set(height)}
				contentContainerStyle={{ paddingBottom: bottom + 32, paddingTop: hasHero ? 0 : barHeight }}
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

				<View className={cn("gap-6 bg-background px-5", hasHero ? "-mt-8 rounded-t-[32px] pt-7" : "pt-2")}>
					<ArticleHeader post={post} />
					<Separator />
					{contentLoading ? (
						<BodySkeleton />
					) : contentError && post.content.length === 0 ? (
						<ErrorView error={contentError} onRetry={onRetry} className="py-8" />
					) : (
						<PortableText value={post.content} webUrl={webUrl} />
					)}
					{post.tags.length > 0 ? (
						<TermChips categories={[]} tags={post.tags} max={post.tags.length} interactive size="md" className="pt-4" />
					) : null}
				</View>

				<RelatedPosts post={post} />
			</Animated.ScrollView>

			<ArticleTopBar
				title={post.title}
				scrollY={scrollY}
				solidAt={solidAt}
				progress={progress}
				overImage={hasHero}
				actions={<ArticleActions post={post} webUrl={webUrl} />}
			/>
		</View>
	);
}

function ArticleHeader({ post }: { post: ApiPost }) {
	return (
		<View className="gap-4">
			<TermChips categories={post.categories} tags={[]} interactive size="md" />
			<Typography.Heading type="h1" selectable className="text-[30px] leading-[38px] tracking-tight">
				{post.title}
			</Typography.Heading>
			{post.excerpt ? (
				<Typography selectable color="muted" className="text-[18px] leading-7">
					{post.excerpt}
				</Typography>
			) : null}
			<View className="gap-3 pt-1">
				<Byline bylines={post.bylines} max={2} size="md" showRole />
				<PostMeta publishedAt={post.publishedAt} readingTime={post.readingTime} dateStyle="long" />
			</View>
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
			label: nowSaved ? "Disimpan ke Tersimpan" : "Dihapus dari Tersimpan",
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
				accessibilityLabel={saved ? "Hapus dari Tersimpan" : "Simpan tulisan"}
				selected={saved}
				tone={saved ? "accent" : "foreground"}
				onPress={onBookmark}
			/>
			<GlassIconButton icon={ShareIcon} accessibilityLabel="Bagikan" onPress={onShare} />
		</>
	);
}

/** "Baca Juga": newest posts from the same category (or overall), sharing that list's cache. */
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
				Baca Juga
			</Typography.Heading>
			{related.map((other) => (
				<PostCard key={other.slug} post={other} />
			))}
		</View>
	);
}

function StaticTopBar() {
	const scrollY = useSharedValue(0);
	const progress = useSharedValue(0);
	return <ArticleTopBar title="" scrollY={scrollY} solidAt={0} progress={progress} />;
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
		<View className="gap-3 pt-2" accessibilityLabel="Memuat tulisan">
			{["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"].map((widthClass, index) => (
				<Skeleton key={index} className={cn("h-4 rounded-md", widthClass)} />
			))}
		</View>
	);
}
