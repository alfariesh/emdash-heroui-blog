/**
 * Renderers for Portable Text object blocks (everything that is not a text
 * block). The API normalises images to `{ url, alt, caption, width, height }`;
 * other blocks keep EmDash's shapes (see emdash/src/components/*.astro), so
 * their fields are read defensively.
 */
import type { ApiImage, ApiPortableTextBlock } from "@blog/shared";
import { Button } from "heroui-native/button";
import { Separator } from "heroui-native/separator";
import { Surface } from "heroui-native/surface";
import { Typography } from "heroui-native/text";
import type { ReactNode } from "react";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { ArrowUpRightIcon, LinkIcon, PlayIcon, type IconSvgElement } from "@/lib/icons";
import { MONOSPACE } from "./text-block";

const str = (value: unknown) => (typeof value === "string" && value.trim() ? value : undefined);
const num = (value: unknown) => (typeof value === "number" && value > 0 ? value : null);

function toImage(value: unknown): (ApiImage & { caption?: string }) | null {
	if (!value || typeof value !== "object") return null;
	const node = value as Record<string, unknown>;
	const url = str(node.url);
	if (!url) return null;
	return {
		url,
		alt: str(node.alt) ?? "",
		width: num(node.width),
		height: num(node.height),
		caption: str(node.caption),
	};
}

interface ObjectBlockProps {
	block: ApiPortableTextBlock;
	onLink: (href: string) => void;
	/** Web URL of the entry, for blocks only the website can show. */
	webUrl: string;
	/** Renders nested Portable Text (columns). */
	renderNested: (blocks: ApiPortableTextBlock[]) => ReactNode;
}

export function ObjectBlock({ block, onLink, webUrl, renderNested }: ObjectBlockProps) {
	const node = block as Record<string, unknown>;

	switch (block._type) {
		case "image": {
			const image = toImage(node);
			return image ? <Figure image={image} /> : null;
		}
		case "gallery": {
			const images = (Array.isArray(node.images) ? node.images : []).map(toImage).filter((i) => i !== null);
			return images.length > 0 ? <Gallery images={images} /> : null;
		}
		case "code": {
			const code = str(node.code);
			return code ? <CodeBlock code={code} filename={str(node.filename)} language={str(node.language)} /> : null;
		}
		case "break":
			return <Break variant={str(node.style)} />;
		case "pullquote": {
			const text = str(node.text);
			return text ? <Pullquote text={text} citation={str(node.citation)} /> : null;
		}
		case "button": {
			const text = str(node.text);
			const url = str(node.url);
			return text ? <LinkButton text={text} url={url} variant={str(node.style)} onLink={onLink} /> : null;
		}
		case "buttons": {
			const buttons = Array.isArray(node.buttons) ? (node.buttons as Record<string, unknown>[]) : [];
			return (
				<View className="flex-row flex-wrap gap-2">
					{buttons.map((button, index) => {
						const text = str(button.text);
						return text ? (
							<LinkButton
								key={str(button._key) ?? index}
								text={text}
								url={str(button.url)}
								variant={str(button.style)}
								onLink={onLink}
							/>
						) : null;
					})}
				</View>
			);
		}
		case "columns": {
			const columns = Array.isArray(node.columns) ? (node.columns as Record<string, unknown>[]) : [];
			// Phone width: columns stack.
			return (
				<View className="gap-5">
					{columns.map((column, index) => (
						<View key={str(column._key) ?? index}>
							{renderNested(Array.isArray(column.content) ? (column.content as ApiPortableTextBlock[]) : [])}
						</View>
					))}
				</View>
			);
		}
		case "embed": {
			const url = str(node.url);
			return (
				<WebOnlyBlock
					icon={PlayIcon}
					title={str(node.provider) ?? "Embedded media"}
					description={str(node.caption) ?? url}
					onOpen={() => onLink(url ?? webUrl)}
				/>
			);
		}
		case "file": {
			const url = str(node.url);
			return url ? (
				<WebOnlyBlock
					icon={LinkIcon}
					title={str(node.filename) ?? url.split("/").pop() ?? "File"}
					description="Open or download the file"
					onOpen={() => onLink(url)}
				/>
			) : null;
		}
		case "video":
		case "iframe":
		case "htmlBlock":
		case "table":
		case "cover":
			return (
				<WebOnlyBlock
					icon={block._type === "video" ? PlayIcon : LinkIcon}
					title={TITLES[block._type] ?? "Extra content"}
					description="This part can only be shown on the web."
					onOpen={() => onLink(webUrl)}
				/>
			);
		default:
			// Plugin blocks the app does not know: skip, as the contract allows.
			return null;
	}
}

const TITLES: Record<string, string> = {
	video: "Video",
	iframe: "Embedded content",
	htmlBlock: "Interactive content",
	table: "Table",
	cover: "Sampul",
};

function Figure({ image }: { image: ApiImage & { caption?: string } }) {
	const ratio = image.width && image.height ? image.width / image.height : 16 / 10;
	return (
		<View className="gap-2.5 py-1">
			<View className="overflow-hidden rounded-2xl bg-surface-secondary" style={{ aspectRatio: ratio }}>
				<Image image={image} className="size-full" />
			</View>
			{image.caption ? (
				<Typography type="body-sm" color="muted" align="center" className="px-4">
					{image.caption}
				</Typography>
			) : null}
		</View>
	);
}

/** Horizontal, snapping strip; each image keeps the first one's ratio so the row is even. */
function Gallery({ images }: { images: (ApiImage & { caption?: string })[] }) {
	const { width } = useWindowDimensions();
	const itemWidth = Math.round(width * 0.78);
	const first = images[0];
	const ratio = first?.width && first.height ? first.width / first.height : 4 / 3;

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			snapToInterval={itemWidth + 12}
			decelerationRate="fast"
			className="-mx-5"
			contentContainerClassName="gap-3 px-5"
		>
			{images.map((image, index) => (
				<View key={`${image.url}-${index}`} style={{ width: itemWidth }} className="gap-2">
					<View className="overflow-hidden rounded-2xl bg-surface-secondary" style={{ aspectRatio: ratio }}>
						<Image image={image} className="size-full" />
					</View>
					{image.caption ? (
						<Typography type="body-xs" color="muted" numberOfLines={2}>
							{image.caption}
						</Typography>
					) : null}
				</View>
			))}
		</ScrollView>
	);
}

function CodeBlock({ code, filename, language }: { code: string; filename?: string; language?: string }) {
	const label = filename ?? language;
	return (
		<Surface variant="secondary" className="gap-0 p-0 shadow-none">
			{label ? (
				<Text style={{ fontFamily: MONOSPACE }} className="border-b border-border px-4 py-2 text-xs text-muted">
					{label}
				</Text>
			) : null}
			<ScrollView horizontal showsHorizontalScrollIndicator={false}>
				<Text selectable style={{ fontFamily: MONOSPACE }} className="p-4 text-[13px] leading-5 text-foreground">
					{code.replace(/\n$/, "")}
				</Text>
			</ScrollView>
		</Surface>
	);
}

function Break({ variant }: { variant?: string }) {
	if (variant === "space") return <View className="h-4" />;
	if (variant === "dots") {
		return (
			<Typography color="muted" align="center" className="tracking-[8px]">
				• • •
			</Typography>
		);
	}
	return <Separator className="my-2" />;
}

function Pullquote({ text, citation }: { text: string; citation?: string }) {
	return (
		<View className="gap-3 border-y-2 border-accent py-6">
			<Typography
				align="center"
				className="text-[21px] leading-8 text-foreground"
				style={{ fontFamily: "GoogleSans_400Regular_Italic", fontStyle: "italic" }}
			>
				{text}
			</Typography>
			{citation ? (
				<Typography type="body-sm" color="muted" align="center">
					— {citation}
				</Typography>
			) : null}
		</View>
	);
}

function LinkButton({
	text,
	url,
	variant,
	onLink,
}: {
	text: string;
	url?: string;
	variant?: string;
	onLink: (href: string) => void;
}) {
	return (
		<Button
			variant={variant === "outline" ? "outline" : "primary"}
			isDisabled={!url}
			onPress={url ? () => onLink(url) : undefined}
			className="self-start"
		>
			<Button.Label>{text}</Button.Label>
		</Button>
	);
}

/** A block the app cannot draw natively: a card that opens it on the web. */
function WebOnlyBlock({
	icon,
	title,
	description,
	onOpen,
}: {
	icon: IconSvgElement;
	title: string;
	description?: string;
	onOpen: () => void;
}) {
	return (
		<Surface variant="secondary" className="flex-row items-center gap-4 p-4 shadow-none">
			<View className="size-11 items-center justify-center rounded-2xl bg-accent-soft">
				<Icon icon={icon} size={22} tone="accent" />
			</View>
			<View className="flex-1 gap-0.5">
				<Typography type="body-sm" weight="semibold" numberOfLines={1}>
					{title}
				</Typography>
				{description ? (
					<Typography type="body-xs" color="muted" numberOfLines={2}>
						{description}
					</Typography>
				) : null}
			</View>
			<Button isIconOnly size="sm" variant="secondary" accessibilityLabel={`Open ${title}`} onPress={onOpen}>
				<Icon icon={ArrowUpRightIcon} size={18} />
			</Button>
		</Surface>
	);
}
