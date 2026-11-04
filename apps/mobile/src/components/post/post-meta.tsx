import { formatDate, formatReadingTime } from "@blog/shared";
import { Typography } from "heroui-native/text";
import { cn } from "heroui-native/utils";

interface PostMetaProps {
	publishedAt: string | null;
	readingTime: number;
	/** short: "4 Nov 2026"; long: "4 November 2026". */
	dateStyle?: "short" | "long";
	className?: string;
}

/** "4 Nov 2026 · 2 menit baca", in tabular numerals so lists line up. */
export function PostMeta({ publishedAt, readingTime, dateStyle = "short", className }: PostMetaProps) {
	const parts = [
		publishedAt ? formatDate(publishedAt, dateStyle) : null,
		formatReadingTime(readingTime),
	].filter(Boolean);

	return (
		<Typography type="body-xs" color="muted" numberOfLines={1} className={cn("tabular-nums", className)}>
			{parts.join("  ·  ")}
		</Typography>
	);
}
