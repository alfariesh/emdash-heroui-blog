import { formatReadingTime, type ApiByline } from "@blog/shared";
import { Avatar } from "heroui-native/avatar";
import { Typography } from "heroui-native/text";
import { cn } from "heroui-native/utils";
import type { ReactNode } from "react";
import { View } from "react-native";
import { initials } from "@/lib/text";

interface BylineProps {
	bylines: ApiByline[];
	/** Names spelled out before the rest collapse into "+N". */
	max?: number;
	size?: "sm" | "md";
	/** Show each author's role ("Kontributor tamu") under the names. */
	showRole?: boolean;
	className?: string;
	/** Optional metadata for full-size cards and article headers. Compact cards omit it. */
	children?: ReactNode;
	/** Full-size cards and article headers align reading time with the author names. */
	readingTime?: number;
}

/** Overlapping avatars + author names, like the web's Byline.astro. */
export function Byline({
	bylines,
	max = 1,
	size = "sm",
	showRole = false,
	className,
	children,
	readingTime,
}: BylineProps) {
	const duration = readingTime === undefined ? null : (
		<Typography type="body-xs" color="muted" className="shrink-0 tabular-nums">
			{formatReadingTime(readingTime)}
		</Typography>
	);
	if (bylines.length === 0) {
		if (!children && !duration) return null;
		return <View className={className}>{duration}{children}</View>;
	}

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
				<View className="flex-row items-center justify-between gap-3">
					<Typography type="body-sm" weight="medium" numberOfLines={1} className="flex-1">
						{names.join(", ")}
						{hidden > 0 ? <Typography type="body-sm" color="muted">{` +${hidden}`}</Typography> : null}
					</Typography>
					{duration}
				</View>
				{children}
				{role ? (
					<Typography type="body-xs" color="muted" numberOfLines={1}>
						{role}
					</Typography>
				) : null}
			</View>
		</View>
	);
}
