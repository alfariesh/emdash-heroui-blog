import { formatCount, type ApiTerm } from "@blog/shared";
import { useQuery } from "@tanstack/react-query";
import { router, useScrollToTop } from "expo-router";
import { Card } from "heroui-native/card";
import { Chip } from "heroui-native/chip";
import { useThemeColor } from "heroui-native/hooks";
import { PressableFeedback } from "heroui-native/pressable-feedback";
import { Skeleton } from "heroui-native/skeleton";
import { Typography } from "heroui-native/text";
import { useRef, useState, type ReactNode } from "react";
import { RefreshControl, ScrollView, View, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarInset } from "@/components/tab-bar";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/ui/screen-header";
import { ErrorView } from "@/components/ui/state-view";
import { categoryIcon } from "@/lib/icons";
import { categoriesQuery, tagsQuery } from "@/lib/queries";

export default function ExploreScreen() {
	const { top } = useSafeAreaInsets();
	const bottomInset = useTabBarInset();
	const accent = useThemeColor("accent");
	const scrollRef = useRef<ScrollViewInstance>(null);
	useScrollToTop(scrollRef);

	const categories = useQuery(categoriesQuery());
	const tags = useQuery(tagsQuery());
	const [refreshing, setRefreshing] = useState(false);

	const onRefresh = async () => {
		setRefreshing(true);
		try {
			await Promise.all([categories.refetch(), tags.refetch()]);
		} finally {
			setRefreshing(false);
		}
	};

	return (
		<ScrollView
			ref={scrollRef}
			className="flex-1 bg-background"
			contentContainerStyle={{ paddingTop: top, paddingBottom: bottomInset }}
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} colors={[accent]} />
			}
		>
			<ScreenHeader title="Explore" description="Browse posts by category and tag." />

			<Section title="Categories">
				{categories.isPending ? (
					<CategoryGridSkeleton />
				) : categories.isError ? (
					<ErrorView error={categories.error} onRetry={() => void categories.refetch()} />
				) : (
					<CategoryGrid categories={categories.data} />
				)}
			</Section>

			<Section title="Tag">
				{tags.isPending ? (
					<View className="flex-row flex-wrap gap-2">
						{[96, 72, 112, 84].map((width) => (
							<Skeleton key={width} className="h-9 rounded-full" style={{ width }} />
						))}
					</View>
				) : tags.isError ? (
					<ErrorView error={tags.error} onRetry={() => void tags.refetch()} />
				) : (
					<TagCloud tags={tags.data} />
				)}
			</Section>
		</ScrollView>
	);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<View className="gap-3 px-4 pb-8">
			<Typography.Heading type="h5" className="px-1">
				{title}
			</Typography.Heading>
			{children}
		</View>
	);
}

function CategoryGrid({ categories }: { categories: ApiTerm[] }) {
	// Empty categories are hidden, as on the web home page.
	const visible = categories.filter((category) => category.count > 0);
	return (
		<View className="flex-row flex-wrap gap-3">
			{visible.map((category) => (
				<PressableFeedback
					key={category.slug}
					className="basis-[47%] grow"
					accessibilityRole="link"
					accessibilityLabel={`${category.label}, ${formatCount(category.count, "post")}`}
					onPress={() => router.push({ pathname: "/category/[slug]", params: { slug: category.slug } })}
				>
					<Card className="h-full gap-3 p-4">
						<View className="size-11 items-center justify-center rounded-2xl bg-accent-soft">
							<Icon icon={categoryIcon(category.slug, category.icon)} size={22} tone="accent" />
						</View>
						<View className="gap-0.5">
							<Typography.Heading type="h6" numberOfLines={1}>
								{category.label}
							</Typography.Heading>
							<Typography type="body-xs" color="muted" className="tabular-nums">
								{formatCount(category.count, "post")}
							</Typography>
						</View>
						{category.description ? (
							<Typography type="body-xs" color="muted" numberOfLines={2}>
								{category.description}
							</Typography>
						) : null}
					</Card>
				</PressableFeedback>
			))}
		</View>
	);
}

function CategoryGridSkeleton() {
	return (
		<View className="flex-row flex-wrap gap-3">
			{[0, 1, 2, 3].map((key) => (
				<Skeleton key={key} className="h-32 grow basis-[47%] rounded-3xl" />
			))}
		</View>
	);
}

function TagCloud({ tags }: { tags: ApiTerm[] }) {
	const visible = tags.filter((tag) => tag.count > 0);
	return (
		<View className="flex-row flex-wrap gap-2">
			{visible.map((tag) => (
				<Chip
					key={tag.slug}
					size="lg"
					variant="secondary"
					color="default"
					accessibilityRole="link"
					onPress={() => router.push({ pathname: "/tag/[slug]", params: { slug: tag.slug } })}
				>
					<Chip.Label>#{tag.label}</Chip.Label>
					<Typography type="body-xs" color="muted" className="tabular-nums">
						{tag.count}
					</Typography>
				</Chip>
			))}
		</View>
	);
}
