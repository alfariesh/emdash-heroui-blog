import type { ApiPortableTextMarkDef, ApiPortableTextSpan, ApiPortableTextTextBlock } from "@blog/shared";
import * as Haptics from "expo-haptics";
import { Typography } from "heroui-native/text";
import { cn } from "heroui-native/utils";
import { useEffect, useEffectEvent, useRef, type ComponentRef, type ReactNode } from "react";
import { Platform, Text, View, type TextProps, type TextStyle } from "react-native";
import { playFromBlock, useNarrationReady, useReadAlongWord } from "@/lib/article-audio";
import { splitWords, type WordSegment } from "@/lib/read-along";

export const MONOSPACE = Platform.select({ ios: "Menlo", default: "monospace" });
const ITALIC: TextStyle = { fontFamily: "GoogleSans_400Regular_Italic", fontStyle: "italic" };

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

/** Read-along tints, the web's `::highlight()` colours: the block barely there, the word easy to follow. */
export const READ_ALONG_BLOCK_CLASS = "bg-accent/7";
const READ_ALONG_WORD_CLASS = "bg-accent/25 text-foreground";

/** A mounted native view (measurable), as a `View` ref holds it. */
export type ViewInstance = ComponentRef<typeof View>;

/** Lets the article's narration highlight the blocks it reads (see lib/article-audio.ts). */
export interface ReadAlong {
	/** Post whose narration the blocks belong to. */
	slug: string;
	/** A block has started being read: the screen may scroll it into view. */
	onActiveBlock: (view: ViewInstance) => void;
}

interface TextBlockProps {
	block: ApiPortableTextTextBlock;
	onLink: (href: string) => void;
	/** Overrides the style's classes, e.g. for list items. */
	className?: string;
	readAlong?: ReadAlong;
}

export function TextBlock({ readAlong, ...props }: TextBlockProps) {
	if (readAlong) return <ReadAlongTextBlock {...props} readAlong={readAlong} />;
	return <TextBlockContent {...props} word={null} />;
}

type PlayFromHereProps = Pick<
	TextProps,
	"selectable" | "onLongPress" | "accessibilityActions" | "onAccessibilityAction"
>;

/**
 * Text props for "play from here": while this post's narration is loaded, a
 * long press on a narrated block plays from its start (also a screen reader
 * action). Selection gives way meanwhile: on iOS it would take the long press.
 */
export function usePlayFromHere(slug: string, key: string | undefined): PlayFromHereProps {
	const ready = useNarrationReady(slug);
	if (!ready || !key) return SELECTABLE;
	const play = () => {
		if (playFromBlock(key)) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	};
	return {
		selectable: false,
		onLongPress: play,
		accessibilityActions: [{ name: "longpress", label: "Play from here" }],
		onAccessibilityAction: (event) => {
			if (event.nativeEvent.actionName === "longpress") play();
		},
	};
}

/**
 * A text block that follows the narration. The wrapper is always there (with
 * padding pulled out by a negative margin) so the tint never shifts layout.
 */
function ReadAlongTextBlock({ readAlong, ...props }: TextBlockProps & { readAlong: ReadAlong }) {
	const word = useReadAlongWord(readAlong.slug, props.block._key);
	const playFromHere = usePlayFromHere(readAlong.slug, props.block._key);
	const view = useRef<ViewInstance>(null);
	const active = word !== null;
	const onActive = useEffectEvent(() => {
		if (view.current) readAlong.onActiveBlock(view.current);
	});

	useEffect(() => {
		if (active) onActive();
	}, [active]);

	return (
		<View ref={view} className={cn("-mx-2 rounded-lg px-2", active && READ_ALONG_BLOCK_CLASS)}>
			<TextBlockContent {...props} word={word} textProps={playFromHere} />
		</View>
	);
}

interface TextBlockContentProps extends Omit<TextBlockProps, "readAlong"> {
	word: number | null;
	textProps?: PlayFromHereProps;
}

const SELECTABLE: PlayFromHereProps = { selectable: true };

function TextBlockContent({ block, onLink, className, word, textProps = SELECTABLE }: TextBlockContentProps) {
	const style = block.style ?? "normal";
	const text = (
		<Typography
			{...textProps}
			accessibilityRole={HEADING_LEVEL[style] ? "header" : undefined}
			className={cn(STYLE_CLASS[style] ?? STYLE_CLASS.normal, className)}
		>
			<Spans block={block} onLink={onLink} word={word} />
		</Typography>
	);

	if (style === "blockquote") {
		return <View className="border-s-2 border-accent ps-4">{text}</View>;
	}
	return text;
}

interface WordRunsProps {
	segments: readonly WordSegment[];
	/** Index of the word to tint; others render plain. */
	word: number;
}

/** A span's text as nested Text runs with one word tinted (nested Text takes a background on both platforms). */
export function WordRuns({ segments, word }: WordRunsProps): ReactNode {
	return segments.map((segment, index) =>
		segment.word === word ? (
			<Text key={index} className={READ_ALONG_WORD_CLASS}>
				{segment.text}
			</Text>
		) : (
			segment.text
		),
	);
}

function Spans({
	block,
	onLink,
	word,
}: {
	block: ApiPortableTextTextBlock;
	onLink: (href: string) => void;
	word: number | null;
}) {
	const defs = new Map<string, ApiPortableTextMarkDef>();
	for (const def of block.markDefs ?? []) defs.set(def._key, def);
	// Split only the block being read: every other block renders its spans as they are.
	const words = word !== null && word >= 0 ? splitWords(block.children.map((span) => span.text)) : null;

	return block.children.map((span, index) => {
		const segments = words?.[index];
		return (
			<Span
				key={span._key ?? index}
				span={span}
				defs={defs}
				onLink={onLink}
				content={segments && word !== null ? <WordRuns segments={segments} word={word} /> : span.text}
			/>
		);
	});
}

function Span({
	span,
	defs,
	onLink,
	content,
}: {
	span: ApiPortableTextSpan;
	defs: Map<string, ApiPortableTextMarkDef>;
	onLink: (href: string) => void;
	/** The span's text, possibly split into word runs. */
	content: ReactNode;
}): ReactNode {
	const marks = span.marks ?? [];
	if (marks.length === 0) return content;

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

	// Google Sans is loaded per face: italic and monospace are font families, not weights.
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
			{content}
		</Text>
	);
}
