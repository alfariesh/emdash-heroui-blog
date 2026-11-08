import type { ApiMenuItem } from "@blog/shared";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { router, type Href } from "expo-router";
import { ListGroup } from "heroui-native/list-group";
import { Separator } from "heroui-native/separator";
import { Typography } from "heroui-native/text";
import { useToast } from "heroui-native/toast";
import { Fragment, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import {
	CheckIcon,
	DatabaseIcon,
	GlobeIcon,
	InformationIcon,
	MoonIcon,
	SmartPhoneIcon,
	SunIcon,
	type IconSvgElement,
} from "@/lib/icons";
import { openExternal, toAppHref } from "@/lib/links";
import { siteQuery } from "@/lib/queries";
import { persistOptions, queryClient } from "@/lib/query-client";
import { setThemePreference, useThemePreference, type ThemePreference } from "@/lib/theme";

const THEMES: { value: ThemePreference; label: string; description: string; icon: IconSvgElement }[] = [
	{ value: "system", label: "Ikuti sistem", description: "Terang atau gelap sesuai perangkat", icon: SmartPhoneIcon },
	{ value: "light", label: "Terang", description: "Selalu tampilan terang", icon: SunIcon },
	{ value: "dark", label: "Gelap", description: "Selalu tampilan gelap", icon: MoonIcon },
];

export default function SettingsScreen() {
	const { bottom } = useSafeAreaInsets();
	const preference = useThemePreference();
	const { data: site } = useQuery(siteQuery());
	const { toast } = useToast();

	// Static pages from the site's primary menu ("Tentang"…), opened natively.
	const pages = (site?.menu ?? []).flatMap((item) => flattenMenu(item)).flatMap((item) => {
		const href = toAppHref(item.url);
		return href && typeof href === "object" && href.pathname === "/pages/[slug]" ? [{ item, href }] : [];
	});

	const clearCache = async () => {
		queryClient.clear();
		await persistOptions.persister.removeClient();
		toast.show({ variant: "success", label: "Cache offline dibersihkan" });
	};

	return (
		<ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: bottom + 32 }}>
			<Section title="Tampilan">
				<ListGroup>
					{THEMES.map((theme, index) => (
						<Fragment key={theme.value}>
							{index > 0 ? <Separator className="mx-4" /> : null}
							<ListGroup.Item
								onPress={() => setThemePreference(theme.value)}
								accessibilityRole="radio"
								accessibilityState={{ checked: preference === theme.value }}
							>
								<ListGroup.ItemPrefix>
									<Icon icon={theme.icon} size={22} tone={preference === theme.value ? "accent" : "muted"} />
								</ListGroup.ItemPrefix>
								<ListGroup.ItemContent>
									<ListGroup.ItemTitle>{theme.label}</ListGroup.ItemTitle>
									<ListGroup.ItemDescription>{theme.description}</ListGroup.ItemDescription>
								</ListGroup.ItemContent>
								<ListGroup.ItemSuffix>
									{/* Children replace the default chevron; an empty box keeps rows aligned. */}
									{preference === theme.value ? (
										<Icon icon={CheckIcon} size={20} strokeWidth={2} tone="accent" />
									) : (
										<View className="size-5" />
									)}
								</ListGroup.ItemSuffix>
							</ListGroup.Item>
						</Fragment>
					))}
				</ListGroup>
			</Section>

			<Section title="Tentang">
				<ListGroup>
					{pages.map(({ item, href }) => (
						<Fragment key={item.url}>
							<LinkItem icon={InformationIcon} title={item.label} onPress={() => router.push(href as Href)} />
							<Separator className="mx-4" />
						</Fragment>
					))}
					<LinkItem
						icon={GlobeIcon}
						title="Buka situs web"
						description={site ? site.url.replace(/^https?:\/\//, "") : undefined}
						onPress={() => site && void openExternal(site.url)}
					/>
				</ListGroup>
			</Section>

			<Section title="Data">
				<ListGroup>
					<LinkItem
						icon={DatabaseIcon}
						title="Bersihkan cache offline"
						description="Tulisan dimuat ulang dari server. Tersimpan tidak terhapus."
						onPress={() => void clearCache()}
						chevron={false}
					/>
				</ListGroup>
			</Section>

			<View className="items-center gap-1 pt-4">
				<Typography type="body-xs" color="muted">
					{`${site?.title ?? Constants.expoConfig?.name ?? "Blog"} · versi ${Constants.expoConfig?.version ?? "1.0.0"}`}
				</Typography>
				<Typography type="body-xs" color="muted">
					Konten dikelola dengan EmDash
				</Typography>
			</View>
		</ScrollView>
	);
}

function flattenMenu(item: ApiMenuItem): ApiMenuItem[] {
	return [item, ...item.children.flatMap(flattenMenu)];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<View className="gap-2 px-4 pt-6">
			<Typography type="body-xs" color="muted" weight="medium" className="px-4 uppercase tracking-wider">
				{title}
			</Typography>
			{children}
		</View>
	);
}

interface LinkItemProps {
	icon: IconSvgElement;
	title: string;
	description?: string;
	onPress: () => void;
	chevron?: boolean;
}

function LinkItem({ icon, title, description, onPress, chevron = true }: LinkItemProps) {
	return (
		<ListGroup.Item onPress={onPress} accessibilityRole="button">
			<ListGroup.ItemPrefix>
				<Icon icon={icon} size={22} tone="muted" />
			</ListGroup.ItemPrefix>
			<ListGroup.ItemContent>
				<ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
				{description ? <ListGroup.ItemDescription>{description}</ListGroup.ItemDescription> : null}
			</ListGroup.ItemContent>
			{chevron ? <ListGroup.ItemSuffix /> : null}
		</ListGroup.Item>
	);
}
