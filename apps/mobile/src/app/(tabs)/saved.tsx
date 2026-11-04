import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useScrollToTop } from "expo-router";
import { useRef } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/post/post-card";
import { useTabBarInset } from "@/components/tab-bar";
import { ScreenHeader } from "@/components/ui/screen-header";
import { StateView } from "@/components/ui/state-view";
import { useBookmarks, type Bookmark } from "@/lib/bookmarks";
import { BookmarkIcon } from "@/lib/icons";

export default function SavedScreen() {
	const { top } = useSafeAreaInsets();
	const bottomInset = useTabBarInset();
	const bookmarks = useBookmarks();
	const listRef = useRef<FlashListRef<Bookmark>>(null);
	useScrollToTop(listRef);

	return (
		<View className="flex-1 bg-background" style={{ paddingTop: top }}>
			<FlashList
				ref={listRef}
				data={bookmarks}
				keyExtractor={(bookmark) => bookmark.post.slug}
				renderItem={({ item }) => <PostCard post={item.post} />}
				ItemSeparatorComponent={() => <View className="h-3" />}
				ListHeaderComponent={
					<ScreenHeader
						title="Tersimpan"
						description={
							bookmarks.length > 0
								? `${bookmarks.length} tulisan untuk dibaca nanti, tersimpan di perangkat ini.`
								: null
						}
						className="-mx-4"
					/>
				}
				ListEmptyComponent={
					<StateView
						icon={BookmarkIcon}
						title="Belum ada yang disimpan"
						description="Ketuk ikon penanda saat membaca untuk menyimpan tulisan ke sini."
					/>
				}
				contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset }}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
}
