import { router, Stack } from "expo-router";
import { Button } from "heroui-native/button";
import { View } from "react-native";
import { StateView } from "@/components/ui/state-view";
import { FileNotFoundIcon } from "@/lib/icons";

export default function NotFoundScreen() {
	return (
		<View className="flex-1 justify-center bg-background">
			<Stack.Screen options={{ title: "" }} />
			<StateView
				icon={FileNotFoundIcon}
				title="Page not found"
				description="This link does not open any page in the app."
				action={
					<Button variant="primary" onPress={() => router.replace("/")}>
						<Button.Label>Back to home</Button.Label>
					</Button>
				}
			/>
		</View>
	);
}
