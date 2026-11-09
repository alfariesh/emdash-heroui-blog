import type { ApiTerm } from "@blog/shared";
import { Typography } from "heroui-native/text";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { categoryIcon, HashtagIcon } from "@/lib/icons";

interface TermHeaderProps {
	taxonomy: "category" | "tag";
	slug: string;
	/** Undefined while the term list loads; the slug stands in for the label. */
	term: ApiTerm | undefined;
}

/** Archive header for a category or tag: icon tile, name, description, post count. */
export function TermHeader({ taxonomy, slug, term }: TermHeaderProps) {
	const icon = taxonomy === "category" ? categoryIcon(slug, term?.icon) : HashtagIcon;
	return (
		<View className="gap-3 px-1 pt-2 pb-6">
			<View className="size-14 items-center justify-center rounded-2xl bg-accent-soft">
				<Icon icon={icon} size={28} tone="accent" />
			</View>
			<View className="gap-1">
				<Typography type="body-xs" color="muted" weight="medium" className="uppercase tracking-wider">
					{taxonomy === "category" ? "Category" : "Tag"}
				</Typography>
				<Typography.Heading type="h2" className="text-[30px] leading-9 tracking-tight">
					{term?.label ?? slug}
				</Typography.Heading>
			</View>
			{term?.description ? <Typography.Paragraph color="muted">{term.description}</Typography.Paragraph> : null}
			{term ? (
				<Typography type="body-sm" color="muted" className="tabular-nums">
					{term.count} posts
				</Typography>
			) : null}
		</View>
	);
}
