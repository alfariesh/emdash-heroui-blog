import type { ApiAdPlacement } from "@blog/shared";
import { Card } from "heroui-native/card";
import { PressableFeedback } from "heroui-native/pressable-feedback";
import { Typography } from "heroui-native/text";
import { useState } from "react";
import { View } from "react-native";
import { Image } from "@/components/ui/image";
import { useAd } from "@/lib/use-ad";
import { useOpenLink } from "@/lib/use-open-link";

interface AdSlotProps {
	placement: ApiAdPlacement;
	className?: string;
}

/** A compact 3:1 banner; unavailable campaigns and failed images leave no empty slot. */
export function AdSlot({ placement, className }: AdSlotProps) {
	const snapshot = useAd(placement);
	const openLink = useOpenLink();
	const [failedImage, setFailedImage] = useState<{ url: string; expiresAt: number } | null>(null);
	if (!snapshot?.ad) return null;
	const { ad, expiresAt } = snapshot;
	// Retry a transient image failure with the next selection, without remounting healthy images.
	if (failedImage?.url === ad.image.url && failedImage.expiresAt === expiresAt) return null;

	return (
		<PressableFeedback
			className={className}
			onPress={() => openLink(ad.targetUrl)}
			accessibilityRole="link"
			accessibilityLabel={`Advertisement: ${ad.image.alt.trim() || ad.title}`}
			accessibilityHint="Open the ad link"
		>
			<Card className="gap-2 p-2 shadow-none">
				<Typography type="body-xs" color="muted" className="px-3 pt-1">Ad</Typography>
				<View className="aspect-[3/1] overflow-hidden rounded-2xl bg-surface-secondary">
					<Image
						image={ad.image}
						className="size-full"
						contentFit="contain"
						recyclingKey={ad.image.url}
						accessible={false}
						onError={() => setFailedImage({ url: ad.image.url, expiresAt })}
					/>
				</View>
			</Card>
		</PressableFeedback>
	);
}
