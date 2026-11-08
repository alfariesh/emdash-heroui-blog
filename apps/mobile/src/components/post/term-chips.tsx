import type { ApiTermRef } from "@blog/shared";
import { router } from "expo-router";
import { Chip } from "heroui-native/chip";
import { cn } from "heroui-native/utils";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { categoryIcon } from "@/lib/icons";

interface TermChipsProps {
	categories: ApiTermRef[];
	tags: ApiTermRef[];
	/** Total chips shown; the category takes the first slot. */
	max?: number;
	/** Chips open their archive screen; off inside pressable cards. */
	interactive?: boolean;
	size?: "sm" | "md";
	className?: string;
}

/** Category chip (accent, with icon) followed by tag chips. */
export function TermChips({
	categories,
	tags,
	max = 3,
	interactive = false,
	size = "sm",
	className,
}: TermChipsProps) {
	const category = categories[0];
	const visibleTags = tags.slice(0, Math.max(0, max - (category ? 1 : 0)));
	if (!category && visibleTags.length === 0) return null;

	return (
		<View
			className={cn("flex-row flex-wrap gap-1.5", className)}
			pointerEvents={interactive ? "auto" : "none"}
		>
			{category ? (
				<Chip
					size={size}
					variant="soft"
					color="accent"
					accessibilityRole={interactive ? "link" : "text"}
					onPress={
						interactive
							? () => router.push({ pathname: "/category/[slug]", params: { slug: category.slug } })
							: undefined
					}
				>
					<Icon icon={categoryIcon(category.slug, category.icon)} size={size === "sm" ? 12 : 14} strokeWidth={2} tone="accent" />
					<Chip.Label>{category.label}</Chip.Label>
				</Chip>
			) : null}
			{visibleTags.map((tag) => (
				<Chip
					key={tag.slug}
					size={size}
					variant="secondary"
					color="default"
					accessibilityRole={interactive ? "link" : "text"}
					onPress={
						interactive
							? () => router.push({ pathname: "/tag/[slug]", params: { slug: tag.slug } })
							: undefined
					}
				>
					<Chip.Label>{interactive ? `#${tag.label}` : tag.label}</Chip.Label>
				</Chip>
			))}
		</View>
	);
}
