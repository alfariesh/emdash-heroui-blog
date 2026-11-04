import { Tabs } from "expo-router/js-tabs";
import { TabBar, TABS } from "@/components/tab-bar";

export default function TabsLayout() {
	return (
		<Tabs
			tabBar={(props) => <TabBar {...props} />}
			screenOptions={{
				headerShown: false,
				// Keep visited tabs mounted but frozen: instant switches, no off-screen renders.
				freezeOnBlur: true,
				animation: "shift",
			}}
		>
			{Object.entries(TABS).map(([name, { label }]) => (
				<Tabs.Screen key={name} name={name} options={{ title: label }} />
			))}
		</Tabs>
	);
}
