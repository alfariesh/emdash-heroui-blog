import { parseSnippet } from "@blog/shared";
import { Typography } from "heroui-native/text";
import { Text } from "react-native";

/**
 * Search match context. The API sends escaped text with `<mark>` around
 * matches; parseSnippet() turns it into segments, so no HTML engine is needed.
 */
export function Snippet({ html, title }: { html: string | null; title?: string }) {
	const segments = parseSnippet(html);
	if (segments.length === 0) return null;
	// Some matches only hit the title; repeating it under itself adds nothing.
	const plain = segments.map((segment) => segment.text).join("").trim();
	if (title && plain.toLowerCase() === title.trim().toLowerCase()) return null;

	return (
		<Typography type="body-sm" color="muted" numberOfLines={3}>
			{segments.map((segment, index) =>
				segment.highlight ? (
					<Text key={index} className="rounded-sm bg-accent-soft font-semibold text-accent">
						{segment.text}
					</Text>
				) : (
					segment.text
				),
			)}
		</Typography>
	);
}
