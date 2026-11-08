import type { ApiImage } from "@blog/shared";
import { Image as ExpoImage, type ImageProps as ExpoImageProps } from "expo-image";
import { withUniwind } from "uniwind";

/** expo-image with `className` support. */
export const StyledImage = withUniwind(ExpoImage);

interface ImageProps extends Omit<ExpoImageProps, "source" | "alt"> {
	image: ApiImage | null | undefined;
	className?: string;
}

/**
 * An image from the API. expo-image decodes at the rendered size, caches on
 * disk, and fades in; pass `recyclingKey` inside virtualized lists so a
 * recycled cell never flashes the previous row's picture.
 */
export function Image({ image, className, transition = 180, ...props }: ImageProps) {
	return (
		<StyledImage
			source={image ? { uri: image.url, width: image.width ?? undefined, height: image.height ?? undefined } : null}
			alt={image?.alt ?? ""}
			accessibilityIgnoresInvertColors
			contentFit="cover"
			transition={transition}
			cachePolicy="memory-disk"
			className={className}
			{...props}
		/>
	);
}
