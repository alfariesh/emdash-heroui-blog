import type { ApiSearchResult } from "@blog/shared";
import { FlashList } from "@shopify/flash-list";
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Chip } from "heroui-native/chip";
import { PressableFeedback } from "heroui-native/pressable-feedback";
import { SearchField } from "heroui-native/search-field";
import { Spinner } from "heroui-native/spinner";
import { Surface } from "heroui-native/surface";
import { Typography } from "heroui-native/text";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Snippet } from "@/components/search/snippet";
import { useTabBarInset } from "@/components/tab-bar";
import { Icon } from "@/components/ui/icon";
import { ErrorView, StateView } from "@/components/ui/state-view";
import { ArrowRightIcon, SearchIcon, SearchRemoveIcon } from "@/lib/icons";
import { flattenPages, prefetchPost, SEARCH_MIN_LENGTH, searchQuery, tagsQuery } from "@/lib/queries";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const DEBOUNCE_MS = 300;

export default function SearchScreen() {
	const { top } = useSafeAreaInsets();
	const bottomInset = useTabBarInset();
	const [text, setText] = useState("");
	const q = useDebouncedValue(text.trim(), DEBOUNCE_MS);
	// Keep showing the previous results while the next query loads: no spinner flash per keystroke.
	const query = useInfiniteQuery({ ...searchQuery(q), placeholderData: keepPreviousData });
	const results = flattenPages(query.data);
	const active = q.length >= SEARCH_MIN_LENGTH;

	return (
		<View className="flex-1 bg-background" style={{ paddingTop: top }}>
			<View className="gap-4 px-4 pt-4 pb-3">
				<Typography.Heading type="h2" className="px-1 text-[32px] leading-10 tracking-tight">
					Search
				</Typography.Heading>
				<SearchField value={text} onChange={setText}>
					<SearchField.Group>
						<SearchField.SearchIcon />
						<SearchField.Input
							placeholder="Search posts and pages…"
							returnKeyType="search"
							autoCorrect={false}
							autoCapitalize="none"
							enterKeyHint="search"
						/>
						<SearchField.ClearButton accessibilityLabel="Clear search" />
					</SearchField.Group>
				</SearchField>
			</View>

			{!active ? (
				<Suggestions onPick={setText} />
			) : (
				<FlashList
					data={results}
					keyExtractor={(item) => `${item.collection}:${item.slug}`}
					renderItem={({ item }) => <SearchResultItem result={item} />}
					ItemSeparatorComponent={() => <View className="h-3" />}
					keyboardDismissMode="on-drag"
					keyboardShouldPersistTaps="handled"
					onEndReached={() => {
						if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
					}}
					onEndReachedThreshold={0.6}
					ListHeaderComponent={
						query.isSuccess && results.length > 0 ? (
							<Typography type="body-xs" color="muted" className="px-1 pb-3">
								{`Results for “${q}”`}
							</Typography>
						) : null
					}
					ListEmptyComponent={
						query.isPending ? (
							<View className="items-center py-16">
								<Spinner />
							</View>
						) : query.isError ? (
							<ErrorView error={query.error} onRetry={() => void query.refetch()} />
						) : (
							<StateView
								icon={SearchRemoveIcon}
								title="No results"
								description={`No posts or pages match “${q}”. Try another word.`}
							/>
						)
					}
					ListFooterComponent={
						query.isFetchingNextPage ? (
							<View className="items-center py-6">
								<Spinner size="sm" />
							</View>
						) : null
					}
					contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset }}
				/>
			)}
		</View>
	);
}

function SearchResultItem({ result }: { result: ApiSearchResult }) {
	const queryClient = useQueryClient();
	const isPost = result.collection === "posts";

	const open = () =>
		router.push(
			isPost
				? { pathname: "/posts/[slug]", params: { slug: result.slug } }
				: { pathname: "/pages/[slug]", params: { slug: result.slug } },
		);

	return (
		<PressableFeedback
			onPress={open}
			onPressIn={isPost ? () => prefetchPost(queryClient, result.slug) : undefined}
			accessibilityRole="link"
			accessibilityLabel={result.title}
		>
			<Surface className="flex-row items-center gap-3 p-4">
				<View className="flex-1 gap-1.5">
					<Typography type="body-xs" weight="semibold" className={isPost ? "text-accent" : "text-muted"}>
						{isPost ? "Post" : "Page"}
					</Typography>
					<Typography.Heading type="h6" numberOfLines={2}>
						{result.title}
					</Typography.Heading>
					<Snippet html={result.snippet} title={result.title} />
				</View>
				<Icon icon={ArrowRightIcon} size={18} tone="muted" />
			</Surface>
		</PressableFeedback>
	);
}

/** Before typing: a hint plus popular tags as one-tap queries. */
function Suggestions({ onPick }: { onPick: (q: string) => void }) {
	const { data: tags } = useQuery(tagsQuery());
	const popular = (tags ?? [])
		.filter((tag) => tag.count > 0)
		.sort((a, b) => b.count - a.count)
		.slice(0, 8);

	return (
		<View className="px-4">
			<StateView
				icon={SearchIcon}
				title="Find a post"
				description="Type at least two letters to search titles and post text."
				className="py-10"
			/>
			{popular.length > 0 ? (
				<View className="items-center gap-3">
					<Typography type="body-xs" color="muted" weight="medium" className="px-1 text-center uppercase tracking-wider">
						Try searching
					</Typography>
					<View className="flex-row flex-wrap justify-center gap-2">
						{popular.map((tag) => (
							<Chip key={tag.slug} size="lg" variant="secondary" color="default" onPress={() => onPick(tag.label)}>
								<Chip.Label>{tag.label}</Chip.Label>
							</Chip>
						))}
					</View>
				</View>
			) : null}
		</View>
	);
}
