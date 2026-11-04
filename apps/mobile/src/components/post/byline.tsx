import type { ApiByline } from "@blog/shared";
import { Avatar } from "heroui-native/avatar";
import { Typography } from "heroui-native/text";
import { cn } from "heroui-native/utils";
import { View } from "react-native";

const WHITESPACE = /\s+/;

function initials(name: string): string {
	return name
		.split(WHITESPACE)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => [...word][0]?.toUpperCase() ?? "")
		.join("");
}

interface BylineProps {
	bylines: ApiByline[];
	/** Names spelled out before the rest collapse into "+N". */
	max?: number;
	size?: "sm" | "md";
	/** Show each author's role ("Kontributor tamu") under the names. */
	showRole?: boolean;
	className?: string;
}

/** Overlapping avatars + author names, like the web's Byline.astro. */
export function Byline({ bylines, max = 1, size = "sm", showRole = false, className }: BylineProps) {
	if (bylines.length === 0) return null;

	const names = bylines.slice(0, max).map((b) => b.name);
	const hidden = bylines.length - names.length;
	const role = showRole ? bylines.find((b) => b.role)?.role : null;

	return (
		<View className={cn("min-w-0 flex-row items-center gap-2.5", className)}>
			<View className="flex-row">
				{bylines.slice(0, 3).map((byline, index) => (
					<Avatar
						key={`${byline.name}-${index}`}
						size={size}
						variant="soft"
						color="accent"
						alt={byline.name}
						className={cn("border-2 border-surface", index > 0 && "-ms-2.5", size === "sm" && "size-7")}
					>
						{byline.avatarUrl ? <Avatar.Image source={{ uri: byline.avatarUrl }} /> : null}
						<Avatar.Fallback classNames={{ text: cn("font-semibold", size === "sm" ? "text-[10px]" : "text-xs") }}>
							{initials(byline.name)}
						</Avatar.Fallback>
					</Avatar>
				))}
			</View>
			<View className="min-w-0 flex-1">
				<Typography type="body-sm" weight="medium" numberOfLines={1}>
					{names.join(", ")}
					{hidden > 0 ? <Typography type="body-sm" color="muted">{` +${hidden}`}</Typography> : null}
				</Typography>
				{role ? (
					<Typography type="body-xs" color="muted" numberOfLines={1}>
						{role}
					</Typography>
				) : null}
			</View>
		</View>
	);
}
