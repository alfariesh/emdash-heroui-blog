import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostList } from "@/components/post/post-list";
import { TermHeader } from "@/components/term-header";
import { tagsQuery } from "@/lib/queries";

export default function TagScreen() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	const { bottom } = useSafeAreaInsets();
	const { data: tags } = useQuery(tagsQuery());
	const term = tags?.find((tag) => tag.slug === slug);

	return (
		<View className="flex-1 bg-background">
			<Stack.Screen options={{ title: term ? `#${term.label}` : "" }} />
			<PostList
				filter={{ tag: slug }}
				bottomInset={bottom + 24}
				header={<TermHeader taxonomy="tag" slug={slug} term={term} />}
				emptyTitle="Belum ada tulisan dengan tag ini"
			/>
		</View>
	);
}
