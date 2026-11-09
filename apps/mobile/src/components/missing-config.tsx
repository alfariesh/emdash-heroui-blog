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
				title="Server address is not set"
				description="This app does not know where to load posts from."
			/>
			{__DEV__ ? (
				<Typography.Code className="mx-auto">EXPO_PUBLIC_API_URL=https://blog.example.com</Typography.Code>
			) : null}
		</View>
	);
}
