/**
 * @blog/shared — code used by both apps/web (Astro) and apps/mobile (React Native).
 *
 * Keep this package framework-agnostic: no imports from astro, emdash,
 * react-dom or react-native, and no DOM/Node globals.
 */
export { DEFAULT_LOCALE, formatDate } from "./locale";
export {
	extractText,
	formatReadingTime,
	getReadingTime,
	type PortableTextBlock,
} from "./reading-time";
export {
	resolveBlogSiteIdentity,
	type BlogSiteIdentitySettings,
	type MediaReference,
} from "./site-identity";
export {
	CATEGORY_ICON_KEYS,
	CATEGORY_ICONS,
	DEFAULT_CATEGORY_ICON,
	getCategoryIcon,
	isCategoryIconKey,
	type CategoryIconKey,
} from "./category-icons";
export * from "./api";
