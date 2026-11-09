import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostList } from "@/components/post/post-list";
import { TermHeader } from "@/components/term-header";
import { categoriesQuery } from "@/lib/queries";

export default function CategoryScreen() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	const { bottom } = useSafeAreaInsets();
	// The term list is small and usually cached already (home rail, Explore).
	const { data: categories } = useQuery(categoriesQuery());
	const term = categories?.find((category) => category.slug === slug);

	return (
		<View className="flex-1 bg-background">
			<Stack.Screen options={{ title: term?.label ?? "" }} />
			<PostList
				filter={{ category: slug }}
				hideCategory
				bottomInset={bottom + 24}
				header={<TermHeader taxonomy="category" slug={slug} term={term} />}
				emptyTitle="No posts in this category yet"
			/>
		</View>
	);
}
