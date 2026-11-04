import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Chip } from "heroui-native/chip";
import { Skeleton } from "heroui-native/skeleton";
import { Typography } from "heroui-native/text";
import { ScrollView, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { categoryIcon } from "@/lib/icons";
import { categoriesQuery } from "@/lib/queries";

/** Horizontal row of category chips (with post counts), like the web home page. */
export function CategoryRail() {
	const { data, isPending } = useQuery(categoriesQuery());
	const categories = (data ?? []).filter((category) => category.count > 0);

	if (isPending) {
		return (
			<View className="flex-row gap-2 px-5">
				<Skeleton className="h-9 w-32 rounded-full" />
				<Skeleton className="h-9 w-24 rounded-full" />
				<Skeleton className="h-9 w-28 rounded-full" />
			</View>
		);
	}
	if (categories.length === 0) return null;

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerClassName="gap-2 px-5"
			accessibilityLabel="Kategori"
		>
			{categories.map((category) => (
				<Chip
					key={category.slug}
					size="lg"
					variant="secondary"
					color="default"
					accessibilityRole="link"
					onPress={() => router.push({ pathname: "/category/[slug]", params: { slug: category.slug } })}
				>
					<Icon icon={categoryIcon(category.slug, category.icon)} size={16} tone="accent" />
					<Chip.Label>{category.label}</Chip.Label>
					<Typography type="body-xs" color="muted" className="tabular-nums">
						{category.count}
					</Typography>
				</Chip>
			))}
		</ScrollView>
	);
}
