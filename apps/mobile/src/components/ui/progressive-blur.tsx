import NativeMaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "heroui-native/hooks";
import { colorKit } from "heroui-native/utils";
import type { ComponentType, ReactElement } from "react";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";
import { useUniwind } from "uniwind";

type GradientColors = [string, string, ...string[]];
type GradientStops = [number, number, ...number[]];

// Under pnpm the package's own typings cannot resolve @types/react, so its class is not a valid JSX type.
const MaskedView = NativeMaskedView as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>;

/**
 * A BlurView has one intensity, so the ramp is built from overlapping layers:
 * each is masked to fade out a little higher than the one before it, and the
 * blur adds up towards the top edge. `solid` and `end` are shares of the height.
 */
const BLUR_LAYERS = [
	{ intensity: 6, solid: 0.72, end: 1 },
	{ intensity: 12, solid: 0.58, end: 0.88 },
	{ intensity: 20, solid: 0.44, end: 0.74 },
	{ intensity: 32, solid: 0.3, end: 0.6 },
] as const;

const MASK_COLORS: GradientColors = ["#000000", "#000000", "#00000000"];

/** [position, background alpha]. Keeps the title legible over the blurred text. */
const IOS_SCRIM = [
	[0, 0.82],
	[0.5, 0.72],
	[0.75, 0.42],
	[0.9, 0.12],
	[1, 0],
] as const;

/** Android has no reliable backdrop blur: a nearly opaque fade does the whole job. */
const ANDROID_SCRIM = [
	[0, 1],
	[0.68, 0.96],
	[0.82, 0.6],
	[0.93, 0.16],
	[1, 0],
] as const;

/**
 * Absolute-fill backdrop that is strongest at its top edge and dissolves
 * towards the bottom, so content slides under floating chrome without a hard line.
 */
export function ProgressiveBlur() {
	const { theme } = useUniwind();
	const background = useThemeColor("background");
	const scrim = Platform.OS === "ios" ? IOS_SCRIM : ANDROID_SCRIM;

	return (
		<View style={StyleSheet.absoluteFill} pointerEvents="none">
			{Platform.OS === "ios"
				? BLUR_LAYERS.map(({ intensity, solid, end }) => (
						<MaskedView
							key={intensity}
							style={StyleSheet.absoluteFill}
							maskElement={
								<LinearGradient
									colors={MASK_COLORS}
									locations={[0, solid, end]}
									style={StyleSheet.absoluteFill}
								/>
							}
						>
							<BlurView
								intensity={intensity}
								tint={theme === "dark" ? "dark" : "light"}
								style={StyleSheet.absoluteFill}
							/>
						</MaskedView>
					))
				: null}
			<LinearGradient
				colors={scrim.map(([, alpha]) => colorKit.setAlpha(background, alpha).hex()) as GradientColors}
				locations={scrim.map(([position]) => position) as GradientStops}
				style={StyleSheet.absoluteFill}
			/>
		</View>
	);
}
