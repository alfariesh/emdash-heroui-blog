import { onlineManager } from "@tanstack/react-query";
import { Button } from "heroui-native/button";
import { Typography } from "heroui-native/text";
import { cn } from "heroui-native/utils";
import type { ReactNode } from "react";
import { View } from "react-native";
import { errorMessage, isNotFound } from "@/lib/errors";
import { AlertIcon, FileNotFoundIcon, RefreshIcon, WifiOffIcon, type IconSvgElement } from "@/lib/icons";
import { Icon } from "./icon";

interface StateViewProps {
	icon: IconSvgElement;
	title: string;
	description?: string;
	action?: ReactNode;
	className?: string;
}

/** Centered icon + message for empty, error and offline states. */
export function StateView({ icon, title, description, action, className }: StateViewProps) {
	return (
		<View className={cn("items-center justify-center gap-3 px-8 py-16", className)}>
			<View className="mb-1 size-16 items-center justify-center rounded-full bg-accent-soft">
				<Icon icon={icon} size={28} tone="accent" />
			</View>
			<Typography.Heading type="h5" align="center">
				{title}
			</Typography.Heading>
			{description ? (
				<Typography.Paragraph type="body-sm" color="muted" align="center" className="max-w-xs">
					{description}
				</Typography.Paragraph>
			) : null}
			{action ? <View className="mt-2">{action}</View> : null}
		</View>
	);
}

interface ErrorViewProps {
	error: unknown;
	onRetry?: () => void;
	className?: string;
}

/** Turns a query error into the right message: offline, not found, or a retryable failure. */
export function ErrorView({ error, onRetry, className }: ErrorViewProps) {
	if (isNotFound(error)) {
		return (
			<StateView
				icon={FileNotFoundIcon}
				title="Not found"
				description="This content does not exist or has not been published."
				className={className}
			/>
		);
	}

	const offline = !onlineManager.isOnline();
	return (
		<StateView
			icon={offline ? WifiOffIcon : AlertIcon}
			title={offline ? "You are offline" : "Could not load"}
			description={
				offline ? "Connect this device to the internet, then try again." : errorMessage(error)
			}
			action={
				onRetry ? (
					<Button variant="secondary" size="sm" onPress={onRetry}>
						<Icon icon={RefreshIcon} size={16} />
						<Button.Label>Try again</Button.Label>
					</Button>
				) : null
			}
			className={className}
		/>
	);
}
