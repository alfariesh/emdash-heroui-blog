import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { Skeleton } from "heroui-native/skeleton";
import { Typography } from "heroui-native/text";
import { cn } from "heroui-native/utils";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PortableText } from "@/components/portable-text/portable-text";
import { ErrorView } from "@/components/ui/state-view";
import { API_URL } from "@/lib/config";
import { pageQuery } from "@/lib/queries";

/** A static EmDash page (e.g. "tentang"), rendered natively. */
export default function PageScreen() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	const { bottom } = useSafeAreaInsets();
	const { data: page, error, refetch } = useQuery(pageQuery(slug));

	return (
		<ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: bottom + 32 }}>
			<Stack.Screen options={{ title: page?.title ?? "" }} />
			{page ? (
				<View className="gap-6 px-5 pt-4">
					<Typography.Heading type="h1" className="text-[30px] leading-[38px] tracking-tight">
						{page.title}
					</Typography.Heading>
					<PortableText
						value={page.content}
						webUrl={`${API_URL ?? ""}/pages/${encodeURIComponent(page.slug)}`}
					/>
				</View>
			) : error ? (
				<ErrorView error={error} onRetry={() => void refetch()} className="pt-24" />
			) : (
				<View className="gap-3 px-5 pt-4">
					<Skeleton className="mb-3 h-9 w-1/2 rounded-lg" />
					{["w-full", "w-11/12", "w-full", "w-3/4"].map((width, index) => (
						<Skeleton key={index} className={cn("h-4 rounded-md", width)} />
					))}
				</View>
			)}
		</ScrollView>
	);
}
