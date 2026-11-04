/**
 * Hugeicons (free set) used by the web app.
 *
 * Category icon *keys* are shared with the mobile app via @blog/shared
 * (category-icons.ts); this file maps each key to an icon object. The
 * `satisfies` check fails the build if a key is added there but not here.
 */
import { getCategoryIcon, type CategoryIconKey } from "@blog/shared";
import {
	Airplane01Icon,
	Book02Icon,
	Briefcase01Icon,
	Camera01Icon,
	Folder01Icon,
	Globe02Icon,
	Idea01Icon,
	News01Icon,
	Note01Icon,
	PaintBoardIcon,
	Restaurant01Icon,
	SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export const CATEGORY_ICON_MAP = {
	folder: Folder01Icon,
	code: SourceCodeIcon,
	design: PaintBoardIcon,
	note: Note01Icon,
	idea: Idea01Icon,
	book: Book02Icon,
	camera: Camera01Icon,
	travel: Airplane01Icon,
	food: Restaurant01Icon,
	news: News01Icon,
	work: Briefcase01Icon,
	world: Globe02Icon,
} satisfies Record<CategoryIconKey, IconSvgElement>;

/** Hugeicons icon for a category slug (folder icon when none is configured). */
export function categoryIcon(slug: string): IconSvgElement {
	return CATEGORY_ICON_MAP[getCategoryIcon(slug)];
}
