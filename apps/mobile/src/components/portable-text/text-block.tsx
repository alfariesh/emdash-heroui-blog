import type { ApiPortableTextMarkDef, ApiPortableTextSpan, ApiPortableTextTextBlock } from "@blog/shared";
import { Typography } from "heroui-native/text";
import { cn } from "heroui-native/utils";
import type { ReactNode } from "react";
import { Platform, Text, View, type TextStyle } from "react-native";

export const MONOSPACE = Platform.select({ ios: "Menlo", default: "monospace" });
const ITALIC: TextStyle = { fontFamily: "Inter_400Regular_Italic", fontStyle: "italic" };

/** Article typography, tuned for long reading (the web uses 17px / 1.8). */
const STYLE_CLASS: Record<string, string> = {
	normal: "text-[17px] leading-[30px] text-foreground/90",
	h1: "mt-4 text-[28px] leading-9 font-semibold tracking-tight text-foreground",
	h2: "mt-6 text-[24px] leading-8 font-semibold tracking-tight text-foreground",
	h3: "mt-4 text-[20px] leading-7 font-semibold tracking-tight text-foreground",
	h4: "mt-2 text-[18px] leading-7 font-semibold text-foreground",
	h5: "text-[17px] leading-7 font-semibold text-foreground",
	h6: "text-[15px] leading-6 font-semibold uppercase tracking-wide text-muted",
	blockquote: "text-[18px] leading-8 text-foreground/80",
};

const HEADING_LEVEL: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };

/** Decorator marks that map to classes; `em` and `code` need font families (see Spans). */
const DECORATOR_CLASS: Record<string, string> = {
	strong: "font-semibold text-foreground",
	underline: "underline",
	"strike-through": "line-through",
	superscript: "text-[12px]",
	subscript: "text-[12px]",
	code: "rounded-md bg-default text-[15px] text-foreground",
};

interface TextBlockProps {
	block: ApiPortableTextTextBlock;
	onLink: (href: string) => void;
	/** Overrides the style's classes, e.g. for list items. */
	className?: string;
}

export function TextBlock({ block, onLink, className }: TextBlockProps) {
	const style = block.style ?? "normal";
	const text = (
		<Typography
			selectable
			accessibilityRole={HEADING_LEVEL[style] ? "header" : undefined}
			className={cn(STYLE_CLASS[style] ?? STYLE_CLASS.normal, className)}
		>
			<Spans block={block} onLink={onLink} />
		</Typography>
	);

	if (style === "blockquote") {
		return <View className="border-s-2 border-accent ps-4">{text}</View>;
	}
	return text;
}

function Spans({ block, onLink }: { block: ApiPortableTextTextBlock; onLink: (href: string) => void }) {
	const defs = new Map<string, ApiPortableTextMarkDef>();
	for (const def of block.markDefs ?? []) defs.set(def._key, def);

	return block.children.map((span, index) => (
		<Span key={span._key ?? index} span={span} defs={defs} onLink={onLink} />
	));
}

function Span({
	span,
	defs,
	onLink,
}: {
	span: ApiPortableTextSpan;
	defs: Map<string, ApiPortableTextMarkDef>;
	onLink: (href: string) => void;
}): ReactNode {
	const marks = span.marks ?? [];
	if (marks.length === 0) return span.text;

	let href: string | undefined;
	const classes: string[] = [];
	for (const mark of marks) {
		const def = defs.get(mark);
		if (def) {
			if (def._type === "link" && typeof def.href === "string") href = def.href;
			continue;
		}
		const decorator = DECORATOR_CLASS[mark];
		if (decorator) classes.push(decorator);
	}

	// Inter is loaded per face: italic and monospace are font families, not weights.
	const isStrong = marks.includes("strong");
	const style: TextStyle | undefined = marks.includes("code")
		? { fontFamily: MONOSPACE }
		: marks.includes("em")
			? isStrong
				? { fontStyle: "italic" }
				: ITALIC
			: undefined;

	return (
		<Text
			className={cn(classes, href && "font-medium text-accent underline")}
			style={style}
			onPress={href ? () => onLink(href) : undefined}
			accessibilityRole={href ? "link" : undefined}
		>
			{span.text}
		</Text>
	);
}
