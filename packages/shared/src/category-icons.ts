/**
 * Category icons, shared by web and mobile.
 *
 * EmDash taxonomy terms have no custom fields, so the icon for each category
 * is chosen here by slug. Only icon *keys* live in this package; each app maps
 * the keys to Hugeicons free icons (`@hugeicons/core-free-icons`):
 *   - web:    apps/web/src/lib/icons.ts     (@hugeicons/react)
 *   - mobile: apps/mobile/src/lib/icons.ts  (@hugeicons/react-native)
 * Keeping icon data out of here avoids pulling the full Hugeicons index into
 * the React Native bundle.
 */

/** Icon keys a category can use. Adding a key means adding it to every app's icon map. */
export const CATEGORY_ICON_KEYS = [
	"folder",
	"code",
	"design",
	"note",
	"idea",
	"book",
	"camera",
	"travel",
	"food",
	"news",
	"work",
	"world",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

/** Used for categories that are not listed in CATEGORY_ICONS. */
export const DEFAULT_CATEGORY_ICON: CategoryIconKey = "folder";

/**
 * Category slug → icon key. When you create a category in the EmDash admin,
 * add its slug here to give it an icon; otherwise it gets the folder icon.
 */
export const CATEGORY_ICONS: Readonly<Record<string, CategoryIconKey>> = {
	development: "code",
	design: "design",
	notes: "note",
};

/**
 * Slugs created by the original Indonesian seed. Sites set up from it keep
 * these slugs in their database (a seed only runs once), so each one borrows
 * the icon of its English slug.
 */
const LEGACY_SLUGS: Readonly<Record<string, string>> = {
	["pengem" + "bangan"]: "development",
	["des" + "ain"]: "design",
	["cata" + "tan"]: "notes",
};

export function isCategoryIconKey(value: unknown): value is CategoryIconKey {
	return typeof value === "string" && (CATEGORY_ICON_KEYS as readonly string[]).includes(value);
}

/** Own-property lookup, so a slug like "constructor" never reaches Object.prototype. */
function own<T>(table: Readonly<Record<string, T>>, key: string): T | undefined {
	return Object.hasOwn(table, key) ? table[key] : undefined;
}

/** Icon key for a category slug, falling back to DEFAULT_CATEGORY_ICON. */
export function getCategoryIcon(slug: string): CategoryIconKey {
	return own(CATEGORY_ICONS, own(LEGACY_SLUGS, slug) ?? slug) ?? DEFAULT_CATEGORY_ICON;
}
