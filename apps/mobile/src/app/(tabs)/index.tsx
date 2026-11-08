import { formatDate } from "@blog/shared";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Button } from "heroui-native/button";
import { Typography } from "heroui-native/text";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoryRail } from "@/components/category-rail";
import { PostList } from "@/components/post/post-list";
import { useTabBarInset } from "@/components/tab-bar";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SettingsIcon } from "@/lib/icons";
import { siteQuery } from "@/lib/queries";

const WEEKDAY = new Intl.DateTimeFormat("id-ID", { weekday: "long" });

/** "Rabu, 4 November 2026" */
function today(): string {
	const now = new Date();
	return `${WEEKDAY.format(now)}, ${formatDate(now, "long")}`;
}

export default function HomeScreen() {
	const { top } = useSafeAreaInsets();
	const bottomInset = useTabBarInset();

	return (
		<View className="flex-1 bg-background" style={{ paddingTop: top }}>
			<PostList featureFirst bottomInset={bottomInset} header={<HomeHeader />} />
		</View>
	);
}

function HomeHeader() {
	const { data: site } = useQuery(siteQuery());

	return (
		<View className="-mx-4 pb-2">
			<ScreenHeader
				overline={today()}
				title={site?.title ?? "Blog"}
				description={site?.tagline}
				actions={
					<Button
						isIconOnly
						variant="ghost"
						size="sm"
						accessibilityLabel="Pengaturan"
						onPress={() => router.push("/settings")}
					>
						<Icon icon={SettingsIcon} size={22} />
					</Button>
				}
			/>
			<CategoryRail />
			<Typography.Heading type="h5" className="px-5 pt-7 pb-3">
				Tulisan Terbaru
			</Typography.Heading>
		</View>
	);
}
