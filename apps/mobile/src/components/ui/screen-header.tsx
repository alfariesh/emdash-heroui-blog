import { Typography } from "heroui-native/text";
import { cn } from "heroui-native/utils";
import type { ReactNode } from "react";
import { View } from "react-native";

interface ScreenHeaderProps {
	title: string;
	/** Replaces the text title, e.g. with a logo. `title` stays the accessible name. */
	titleContent?: ReactNode;
	/** Small line above the title, e.g. today's date. */
	overline?: string;
	description?: string | null;
	/** Icon buttons on the trailing side of the title row. */
	actions?: ReactNode;
	className?: string;
}

/** Editorial large-title header for the top of a tab screen (inside its scroll view). */
export function ScreenHeader({ title, titleContent, overline, description, actions, className }: ScreenHeaderProps) {
	return (
		<View className={cn("gap-2 px-5 pt-4 pb-6", className)}>
			<View className="flex-row items-start justify-between gap-4">
				<View className="flex-1 gap-1">
					{overline ? (
						<Typography type="body-xs" color="muted" weight="medium" className="uppercase tracking-wider">
							{overline}
						</Typography>
					) : null}
					{titleContent ? (
						<View accessible accessibilityRole="header" accessibilityLabel={title}>
							{titleContent}
						</View>
					) : (
						<Typography.Heading type="h2" className="text-[32px] leading-10 tracking-tight">
							{title}
						</Typography.Heading>
					)}
				</View>
				{actions ? <View className="flex-row items-center gap-1 pt-1">{actions}</View> : null}
			</View>
			{description ? (
				<Typography.Paragraph color="muted" className="text-pretty">
					{description}
				</Typography.Paragraph>
			) : null}
		</View>
	);
}
