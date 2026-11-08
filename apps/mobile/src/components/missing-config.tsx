import { Typography } from "heroui-native/text";
import { View } from "react-native";
import { StateView } from "@/components/ui/state-view";
import { InformationIcon } from "@/lib/icons";

/** Shown when no API origin is configured (a release build without EXPO_PUBLIC_API_URL). */
export function MissingConfig() {
	return (
		<View className="flex-1 justify-center bg-background">
			<StateView
				icon={InformationIcon}
				title="Alamat server belum diatur"
				description="Aplikasi ini belum tahu dari mana mengambil tulisan."
			/>
			{__DEV__ ? (
				<Typography.Code className="mx-auto">EXPO_PUBLIC_API_URL=https://blog.example.com</Typography.Code>
			) : null}
		</View>
	);
}
