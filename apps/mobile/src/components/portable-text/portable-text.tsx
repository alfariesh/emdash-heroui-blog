import type { ApiPortableTextBlock } from "@blog/shared";
import { cn } from "heroui-native/utils";
import { Text, View } from "react-native";
import { useOpenLink } from "@/lib/use-open-link";
import { groupBlocks, type ListNode } from "./group-blocks";
import { ObjectBlock } from "./object-blocks";
import { TextBlock } from "./text-block";

interface PortableTextProps {
	value: readonly ApiPortableTextBlock[];
	/** Web URL of the entry: blocks the app cannot draw natively link there. */
	webUrl: string;
	className?: string;
}

/**
 * Native renderer for the API's Portable Text: no WebView, no HTML. Text
 * blocks become selectable Text with marks; internal links navigate in-app
 * (see lib/links.ts); object blocks render in object-blocks.tsx.
 */
export function PortableText({ value, webUrl, className }: PortableTextProps) {
	const onLink = useOpenLink();

	const render = (blocks: readonly ApiPortableTextBlock[]) =>
		groupBlocks(blocks).map((node) => {
			switch (node.kind) {
				case "text":
					return <TextBlock key={node.key} block={node.block} onLink={onLink} />;
				case "list":
					return <List key={node.key} list={node} depth={0} onLink={onLink} />;
				case "object":
					return (
						<ObjectBlock
							key={node.key}
							block={node.block}
							onLink={onLink}
							webUrl={webUrl}
							renderNested={(nested) => <View className="gap-5">{render(nested)}</View>}
						/>
					);
			}
		});

	return <View className={cn("gap-5", className)}>{render(value)}</View>;
}

const BULLETS = ["•", "◦", "▪"];

function List({ list, depth, onLink }: { list: ListNode; depth: number; onLink: (href: string) => void }) {
	return (
		<View className="gap-2" accessibilityRole="list">
			{list.items.map((item, index) => (
				<View key={item.block?._key ?? `${list.key}-${index}`} className="flex-row gap-2">
					<Text
						className="w-6 text-right text-[17px] leading-[30px] text-muted tabular-nums"
						importantForAccessibility="no"
						accessibilityElementsHidden
					>
						{item.block ? (list.type === "number" ? `${index + 1}.` : BULLETS[depth % BULLETS.length]) : ""}
					</Text>
					<View className="flex-1 gap-2">
						{item.block ? <TextBlock block={item.block} onLink={onLink} /> : null}
						{item.children.map((child) => (
							<List key={child.key} list={child} depth={depth + 1} onLink={onLink} />
						))}
					</View>
				</View>
			))}
		</View>
	);
}
