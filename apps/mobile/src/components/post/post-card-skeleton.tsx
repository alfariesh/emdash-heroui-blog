import { Card } from "heroui-native/card";
import { Skeleton } from "heroui-native/skeleton";
import { View } from "react-native";
import type { PostCardVariant } from "./post-card";

/** Loading placeholder with the same footprint as PostCard, so nothing jumps when data lands. */
export function PostCardSkeleton({ variant = "row" }: { variant?: PostCardVariant }) {
	if (variant === "feature") {
		return (
			<Card className="gap-0 p-2" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
				<Skeleton className="aspect-[4/3] rounded-2xl" />
				<View className="gap-3 px-3 pt-4 pb-3">
					<Skeleton className="h-6 w-28 rounded-full" />
					<Skeleton className="h-7 w-11/12 rounded-lg" />
					<Skeleton className="h-7 w-2/3 rounded-lg" />
					<Skeleton className="mt-1 h-4 w-full rounded-md" />
					<Skeleton className="h-4 w-4/5 rounded-md" />
				</View>
			</Card>
		);
	}

	return (
		<Card
			className="flex-row items-center gap-4 p-2 ps-4"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
		>
			<View className="flex-1 gap-2 py-2">
				<Skeleton className="h-3 w-20 rounded-md" />
				<Skeleton className="h-5 w-full rounded-md" />
				<Skeleton className="h-5 w-3/4 rounded-md" />
				<Skeleton className="h-3 w-32 rounded-md" />
			</View>
			<Skeleton className="size-24 rounded-2xl" />
		</Card>
	);
}
