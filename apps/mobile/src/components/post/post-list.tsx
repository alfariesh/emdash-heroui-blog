import type { ApiPostSummary } from "@blog/shared";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useScrollToTop } from "expo-router";
import { Button } from "heroui-native/button";
import { useThemeColor } from "heroui-native/hooks";
import { Spinner } from "heroui-native/spinner";
import { Typography } from "heroui-native/text";
import { useRef, useState, type ReactElement } from "react";
import { RefreshControl, View } from "react-native";
import { ErrorView, StateView } from "@/components/ui/state-view";
import { BookOpenIcon, WifiOffIcon } from "@/lib/icons";
import { flattenPages, postsQuery, type PostFilter } from "@/lib/queries";
import { PostCard, type PostCardVariant } from "./post-card";
import { PostCardSkeleton } from "./post-card-skeleton";

interface Row {
	variant: PostCardVariant;
	post: ApiPostSummary;
}

interface PostListProps {
	filter?: PostFilter;
	/** Rendered above the posts (title, chips…); scrolls with the list. */
	header?: ReactElement;
	/** Optional content after the last page, so pagination never moves it between posts. */
	footer?: ReactElement;
	/** Show the newest post that has an image as a large feature card. */
	featureFirst?: boolean;
	hideCategory?: boolean;
	/** Bottom padding: the tab bar inset on tab screens, the safe area elsewhere. */
	bottomInset: number;
	emptyTitle?: string;
	emptyDescription?: string;
}

/**
 * Infinite, cursor-paginated list of posts on FlashList v2 (cell recycling,
 * no size estimates needed). Two item types (feature, row) keep separate
 * recycling pools. Handles first load, pull-to-refresh, offline, errors and
 * the end of the list.
 */
export function PostList({
	filter,
	header,
	footer,
	featureFirst = false,
	hideCategory = false,
	bottomInset,
	emptyTitle = "No posts yet",
	emptyDescription = "Published posts will show up here.",
}: PostListProps) {
	const query = useInfiniteQuery(postsQuery(filter));
	const listRef = useRef<FlashListRef<Row>>(null);
	const [manualRefresh, setManualRefresh] = useState(false);
	const accent = useThemeColor("accent");
	useScrollToTop(listRef);

	const posts = flattenPages(query.data);
	const featureIndex = featureFirst ? posts.findIndex((post) => post.featuredImage) : -1;
	const rows: Row[] = posts.map((post, index) => ({
		post,
		variant: index === featureIndex ? "feature" : "row",
	}));
	// The feature card leads the list even when an image-less post is newer.
	if (featureIndex > 0) rows.unshift(...rows.splice(featureIndex, 1));

	const onRefresh = async () => {
		setManualRefresh(true);
		try {
			await query.refetch();
		} finally {
			setManualRefresh(false);
		}
	};

	const onEndReached = () => {
		if (query.hasNextPage && !query.isFetchingNextPage && !query.isError) void query.fetchNextPage();
	};

	return (
		<FlashList
			ref={listRef}
			data={rows}
			keyExtractor={(row) => row.post.slug}
			getItemType={(row) => row.variant}
			renderItem={({ item }) => (
				<PostCard post={item.post} variant={item.variant} hideCategory={hideCategory} />
			)}
			ItemSeparatorComponent={Separator}
			ListHeaderComponent={header}
			ListEmptyComponent={
				query.isPending ? (
					query.fetchStatus === "paused" ? (
						<StateView
							icon={WifiOffIcon}
							title="You are offline"
							description="Posts will load once this device is online."
						/>
					) : (
						<LoadingRows featureFirst={featureFirst} />
					)
				) : query.isError ? (
					<ErrorView error={query.error} onRetry={() => void query.refetch()} />
				) : (
					<StateView icon={BookOpenIcon} title={emptyTitle} description={emptyDescription} />
				)
			}
			ListFooterComponent={
				rows.length > 0 ? (
					<View>
						{!query.hasNextPage ? footer : null}
						<ListFooter
							loading={query.isFetchingNextPage}
							failed={query.isFetchNextPageError}
							done={!query.hasNextPage}
							onRetry={() => void query.fetchNextPage()}
						/>
					</View>
				) : null
			}
			onEndReached={onEndReached}
			onEndReachedThreshold={0.6}
			refreshControl={
				<RefreshControl
					refreshing={manualRefresh}
					onRefresh={onRefresh}
					tintColor={accent}
					colors={[accent]}
				/>
			}
			contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset }}
			showsVerticalScrollIndicator={false}
		/>
	);
}

function Separator() {
	return <View className="h-3" />;
}

function LoadingRows({ featureFirst }: { featureFirst: boolean }) {
	return (
		<View className="gap-3">
			{featureFirst ? <PostCardSkeleton variant="feature" /> : null}
			<PostCardSkeleton />
			<PostCardSkeleton />
			<PostCardSkeleton />
		</View>
	);
}

interface ListFooterProps {
	loading: boolean;
	failed: boolean;
	done: boolean;
	onRetry: () => void;
}

function ListFooter({ loading, failed, done, onRetry }: ListFooterProps) {
	return (
		<View className="min-h-20 items-center justify-center py-6">
			{loading ? (
				<Spinner size="sm" />
			) : failed ? (
				<Button variant="ghost" size="sm" onPress={onRetry}>
					<Button.Label>Could not load. Try again</Button.Label>
				</Button>
			) : done ? (
				<View className="flex-row items-center gap-3">
					<View className="h-px w-8 bg-separator" />
					<Typography type="body-xs" color="muted">
						You have reached the end
					</Typography>
					<View className="h-px w-8 bg-separator" />
				</View>
			) : null}
		</View>
	);
}
