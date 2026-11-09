import { formatDate } from "@blog/shared";
import { Typography } from "heroui-native/text";
import { cn } from "heroui-native/utils";

interface PostMetaProps {
	publishedAt: string | null;
	/** short: "4 Nov 2026"; long: "4 November 2026". */
	dateStyle?: "short" | "long";
	className?: string;
}

/** Publication date below the author names; reading time belongs on the names' row. */
export function PostMeta({ publishedAt, dateStyle = "short", className }: PostMetaProps) {
	if (!publishedAt) return null;

	return (
		<Typography type="body-xs" color="muted" className={cn("tabular-nums", className)}>
			{formatDate(publishedAt, dateStyle)}
		</Typography>
	);
}
