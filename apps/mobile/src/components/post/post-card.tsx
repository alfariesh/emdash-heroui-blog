import type { ApiPostSummary } from "@blog/shared";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Card } from "heroui-native/card";
import { PressableFeedback } from "heroui-native/pressable-feedback";
import { Typography } from "heroui-native/text";
import { cn } from "heroui-native/utils";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { categoryIcon } from "@/lib/icons";
import { prefetchPost } from "@/lib/queries";
import { Byline } from "./byline";
import { PostMeta } from "./post-meta";
import { TermChips } from "./term-chips";

export type PostCardVariant = "feature" | "row";

interface PostCardProps {
	post: ApiPostSummary;
	/** feature: large image card (top of the feed). row: compact list item with a thumbnail. */
	variant?: PostCardVariant;
	/** Hide the category on that category's own archive. */
	hideCategory?: boolean;
	className?: string;
}

/**
 * A post in a list. The whole card is one pressable; pressing in starts
 * fetching the full post so the detail screen usually opens fully loaded.
 * Cards are HeroUI `Card` (radius-3xl) with images inset by p-2 at
 * radius-2xl, so the corners stay concentric, as on the web.
 */
export function PostCard({ post, variant = "row", hideCategory = false, className }: PostCardProps) {
	const queryClient = useQueryClient();
	const categories = hideCategory ? [] : post.categories;

	const open = () => router.push({ pathname: "/posts/[slug]", params: { slug: post.slug } });

	return (
		<PressableFeedback
			onPress={open}
			onPressIn={() => prefetchPost(queryClient, post.slug)}
			accessibilityRole="link"
			accessibilityLabel={post.title}
			accessibilityHint="Buka tulisan"
			className={className}
		>
			{variant === "feature" ? (
				<FeatureCard post={post} categories={categories} />
			) : (
				<RowCard post={post} categories={categories} />
			)}
		</PressableFeedback>
	);
}

interface CardBodyProps {
	post: ApiPostSummary;
	categories: ApiPostSummary["categories"];
}

function FeatureCard({ post, categories }: CardBodyProps) {
	return (
		<Card className="gap-0 p-2">
			<View className="aspect-[4/3] overflow-hidden rounded-2xl bg-surface-secondary">
				{post.featuredImage ? (
					<Image image={post.featuredImage} className="size-full" priority="high" />
				) : (
					<CategoryArt slug={categories[0]?.slug} icon={categories[0]?.icon} large />
				)}
			</View>
			<Card.Body className="gap-3 px-3 pt-4 pb-3">
				<TermChips categories={categories} tags={post.tags} max={3} />
				<Typography.Heading type="h3" className="text-[26px] leading-8 tracking-tight" numberOfLines={3}>
					{post.title}
				</Typography.Heading>
				{post.excerpt ? (
					<Typography.Paragraph color="muted" numberOfLines={3}>
						{post.excerpt}
					</Typography.Paragraph>
				) : null}
			</Card.Body>
			<Card.Footer className="px-3 pb-2">
				<Byline bylines={post.bylines} readingTime={post.readingTime}>
					<PostMeta publishedAt={post.publishedAt} />
				</Byline>
			</Card.Footer>
		</Card>
	);
}

function RowCard({ post, categories }: CardBodyProps) {
	const category = categories[0];
	return (
		<Card className="flex-row items-center gap-4 p-2 ps-4">
			<View className="flex-1 gap-1.5 py-2">
				{category ? (
					<Typography type="body-xs" weight="semibold" numberOfLines={1} className="text-accent">
						{category.label}
					</Typography>
				) : null}
				<Typography.Heading type="h6" className="text-[17px] leading-6" numberOfLines={3}>
					{post.title}
				</Typography.Heading>
				<Byline bylines={post.bylines} className="mt-1" />
			</View>
			<View className="size-24 overflow-hidden rounded-2xl bg-surface-secondary">
				{post.featuredImage ? (
					<Image image={post.featuredImage} className="size-full" recyclingKey={post.slug} />
				) : (
					<CategoryArt slug={category?.slug} icon={category?.icon} />
				)}
			</View>
		</Card>
	);
}

/** Placeholder art for a post without a featured image: the category icon on a soft accent tile. */
function CategoryArt({ slug, icon, large = false }: { slug?: string; icon?: string | null; large?: boolean }) {
	return (
		<View className={cn("size-full items-center justify-center bg-accent-soft")}>
			<Icon icon={categoryIcon(slug ?? "", icon)} size={large ? 48 : 28} strokeWidth={1.5} tone="accent" />
		</View>
	);
}
