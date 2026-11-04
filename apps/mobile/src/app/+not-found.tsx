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
				title="Halaman tidak ditemukan"
				description="Tautan ini tidak mengarah ke halaman mana pun di aplikasi."
				action={
					<Button variant="primary" onPress={() => router.replace("/")}>
						<Button.Label>Kembali ke Beranda</Button.Label>
					</Button>
				}
			/>
		</View>
	);
}
