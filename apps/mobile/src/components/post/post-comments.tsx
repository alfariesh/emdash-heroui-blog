import type { ApiComment } from "@blog/shared";
import { formatDate } from "@blog/shared";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "heroui-native/avatar";
import { Button } from "heroui-native/button";
import { Card } from "heroui-native/card";
import { Chip } from "heroui-native/chip";
import { Skeleton } from "heroui-native/skeleton";
import { Typography } from "heroui-native/text";
import { cn } from "heroui-native/utils";
import { useState } from "react";
import { Text, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { CommentWriteIcon, RefreshIcon } from "@/lib/icons";
import { openExternal } from "@/lib/links";
import { postCommentsQuery } from "@/lib/queries";
import { initials, splitLinks } from "@/lib/text";
import { useOpenLink } from "@/lib/use-open-link";

/** Threads shown before "Show …": a long discussion would otherwise bury "Read next". */
const INITIAL_THREADS = 5;

interface PostCommentsProps {
	slug: string;
	/** Public web URL of the post; "Write a comment" opens its comment form. */
	webUrl: string;
	className?: string;
}

/**
 * "Discussion": approved comments under an article, like the web's comment card.
 * The app only reads them; writing happens on the web form, which keeps
 * EmDash's spam checks and moderation in one place.
 */
export function PostComments({ slug, webUrl, className }: PostCommentsProps) {
	const { data, error, isPending, fetchStatus, refetch } = useQuery(postCommentsQuery(slug));
	const [expanded, setExpanded] = useState(false);

	// Comments turned off in the admin: no card at all, as on the web.
	if (data && !data.enabled) return null;

	const threads = data?.comments ?? [];
	const visible = expanded ? threads : threads.slice(0, INITIAL_THREADS);
	const hiddenCount = threads
		.slice(visible.length)
		.reduce((sum, thread) => sum + 1 + thread.replies.length, 0);

	return (
		<Card className={cn("gap-5 p-5", className)}>
			<View className="gap-1">
				<Typography.Heading type="h5">Discussion</Typography.Heading>
				{data ? (
					<Typography type="body-sm" color="muted" className="tabular-nums">
						{data.total === 0 ? "No comments yet" : `${data.total} comments`}
					</Typography>
				) : null}
			</View>

			{data ? (
				visible.map((thread) => <CommentThread key={thread.id} comment={thread} />)
			) : isPending && fetchStatus === "fetching" ? (
				<CommentsSkeleton />
			) : (
				<View className="flex-row items-center gap-3">
					<Typography type="body-sm" color="muted" className="flex-1">
						{error ? "Comments failed to load." : "Comments will appear when this device is online."}
					</Typography>
					{error ? (
						<Button variant="secondary" size="sm" onPress={() => void refetch()}>
							<Icon icon={RefreshIcon} size={16} />
							<Button.Label>Try again</Button.Label>
						</Button>
					) : null}
				</View>
			)}

			{hiddenCount > 0 ? (
				<Button variant="ghost" size="sm" onPress={() => setExpanded(true)} className="self-start">
					<Button.Label className="tabular-nums">{`Show ${hiddenCount} more comments`}</Button.Label>
				</Button>
			) : null}

			<Button
				variant="secondary"
				onPress={() => void openExternal(`${webUrl}#comments`)}
				accessibilityHint="Opens the comment form on the website"
			>
				<Icon icon={CommentWriteIcon} size={18} />
				<Button.Label>Write a comment</Button.Label>
			</Button>
		</Card>
	);
}

/** A top-level comment with its replies indented under it (replies are one level deep). */
function CommentThread({ comment }: { comment: ApiComment }) {
	return (
		<View className="gap-4">
			<CommentItem comment={comment} />
			{comment.replies.length > 0 ? (
				// ms-11 = avatar (32) + gap (12): the reply rail lines up with the parent's text.
				<View className="ms-11 gap-4 border-s border-separator ps-4">
					{comment.replies.map((reply) => (
						<CommentItem key={reply.id} comment={reply} />
					))}
				</View>
			) : null}
		</View>
	);
}

function CommentItem({ comment }: { comment: ApiComment }) {
	const openLink = useOpenLink();

	return (
		<View className="flex-row gap-3">
			<Avatar
				size="sm"
				variant="soft"
				color={comment.isMember ? "accent" : "default"}
				alt={comment.authorName}
				className="size-8"
			>
				<Avatar.Fallback classNames={{ text: "text-xs font-semibold" }}>{initials(comment.authorName)}</Avatar.Fallback>
			</Avatar>
			<View className="min-w-0 flex-1 gap-1">
				<View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
					<Typography type="body-sm" weight="semibold" numberOfLines={1} className="shrink">
						{comment.authorName}
					</Typography>
					{comment.isMember ? (
						<Chip size="sm" variant="soft" color="accent">
							<Chip.Label>Author</Chip.Label>
						</Chip>
					) : null}
				</View>
				<Typography type="body-xs" color="muted" className="tabular-nums">
					{formatDate(comment.createdAt, "short")}
				</Typography>
				<Typography selectable className="pt-1 text-[15px] leading-6 text-foreground/90">
					{splitLinks(comment.body).map(({ text, url }, index) =>
						url ? (
							<Text
								key={index}
								className="font-medium text-accent underline"
								onPress={() => openLink(url)}
								accessibilityRole="link"
							>
								{text}
							</Text>
						) : (
							text
						),
					)}
				</Typography>
			</View>
		</View>
	);
}

/** Two comment rows, the footprint of a short discussion. */
function CommentsSkeleton() {
	return (
		<View className="gap-5" accessibilityLabel="Loading comments">
			{["w-11/12", "w-3/4"].map((widthClass) => (
				<View key={widthClass} className="flex-row gap-3">
					<Skeleton className="size-8 rounded-full" />
					<View className="flex-1 gap-2 pt-1">
						<Skeleton className="h-3.5 w-28 rounded-md" />
						<Skeleton className="h-3 w-20 rounded-md" />
						<Skeleton className={cn("mt-1 h-4 rounded-md", widthClass)} />
					</View>
				</View>
			))}
		</View>
	);
}
