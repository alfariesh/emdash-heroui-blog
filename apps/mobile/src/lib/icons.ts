/**
 * Hugeicons (free set) used by the app.
 *
 * Icons are deep-imported one file each (`@hugeicons/core-free-icons/<Name>`):
 * the package root re-exports ~12k icons and Metro would parse all of them.
 * Category icon *keys* are shared with the web via @blog/shared; the
 * `satisfies` check fails the build when a key is added there but not here
 * (the web keeps the same map in apps/web/src/lib/icons.ts).
 */
import { getCategoryIcon, type CategoryIconKey } from "@blog/shared";
import Airplane01Icon from "@hugeicons/core-free-icons/Airplane01Icon";
import Book02Icon from "@hugeicons/core-free-icons/Book02Icon";
import Briefcase01Icon from "@hugeicons/core-free-icons/Briefcase01Icon";
import Camera01Icon from "@hugeicons/core-free-icons/Camera01Icon";
import Folder01Icon from "@hugeicons/core-free-icons/Folder01Icon";
import Globe02Icon from "@hugeicons/core-free-icons/Globe02Icon";
import Idea01Icon from "@hugeicons/core-free-icons/Idea01Icon";
import News01Icon from "@hugeicons/core-free-icons/News01Icon";
import Note01Icon from "@hugeicons/core-free-icons/Note01Icon";
import PaintBoardIcon from "@hugeicons/core-free-icons/PaintBoardIcon";
import Restaurant01Icon from "@hugeicons/core-free-icons/Restaurant01Icon";
import SourceCodeIcon from "@hugeicons/core-free-icons/SourceCodeIcon";
import type { IconSvgElement } from "@hugeicons/react-native";

export type { IconSvgElement };

export { default as AlertIcon } from "@hugeicons/core-free-icons/Alert02Icon";
export { default as ArrowLeftIcon } from "@hugeicons/core-free-icons/ArrowLeft01Icon";
export { default as ArrowRightIcon } from "@hugeicons/core-free-icons/ArrowRight01Icon";
export { default as ArrowUpRightIcon } from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
export { default as BookmarkIcon } from "@hugeicons/core-free-icons/Bookmark02Icon";
export { default as BookOpenIcon } from "@hugeicons/core-free-icons/BookOpen01Icon";
export { default as CalendarIcon } from "@hugeicons/core-free-icons/Calendar03Icon";
export { default as CheckIcon } from "@hugeicons/core-free-icons/Tick02Icon";
export { default as CloseIcon } from "@hugeicons/core-free-icons/Cancel01Icon";
export { default as CommentIcon } from "@hugeicons/core-free-icons/BubbleChatIcon";
export { default as CommentWriteIcon } from "@hugeicons/core-free-icons/BubbleChatEditIcon";
export { default as ClockIcon } from "@hugeicons/core-free-icons/Clock01Icon";
export { default as CompassIcon } from "@hugeicons/core-free-icons/Compass01Icon";
export { default as DatabaseIcon } from "@hugeicons/core-free-icons/Database01Icon";
export { default as FileNotFoundIcon } from "@hugeicons/core-free-icons/FileNotFoundIcon";
export { default as GlobeIcon } from "@hugeicons/core-free-icons/Globe02Icon";
export { default as HashtagIcon } from "@hugeicons/core-free-icons/HashtagIcon";
export { default as HomeIcon } from "@hugeicons/core-free-icons/Home11Icon";
export { default as InformationIcon } from "@hugeicons/core-free-icons/InformationCircleIcon";
export { default as LinkIcon } from "@hugeicons/core-free-icons/LinkSquare02Icon";
export { default as MoonIcon } from "@hugeicons/core-free-icons/Moon02Icon";
export { default as PlayIcon } from "@hugeicons/core-free-icons/PlayCircleIcon";
export { default as RefreshIcon } from "@hugeicons/core-free-icons/Refresh01Icon";
export { default as SearchIcon } from "@hugeicons/core-free-icons/Search01Icon";
export { default as SearchRemoveIcon } from "@hugeicons/core-free-icons/SearchRemoveIcon";
export { default as SettingsIcon } from "@hugeicons/core-free-icons/Settings02Icon";
export { default as ShareIcon } from "@hugeicons/core-free-icons/Share08Icon";
export { default as SmartPhoneIcon } from "@hugeicons/core-free-icons/SmartPhone01Icon";
export { default as SunIcon } from "@hugeicons/core-free-icons/Sun03Icon";
export { default as TrashIcon } from "@hugeicons/core-free-icons/Delete02Icon";
export { default as WifiOffIcon } from "@hugeicons/core-free-icons/WifiDisconnected01Icon";

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

/**
 * Icon for a category. Prefers the key the API sent (`ApiTermRef.icon`), so a
 * newer server key falls back to the slug map and then to the folder icon.
 */
export function categoryIcon(slug: string, key?: string | null): IconSvgElement {
	if (key && key in CATEGORY_ICON_MAP) return CATEGORY_ICON_MAP[key as CategoryIconKey];
	return CATEGORY_ICON_MAP[getCategoryIcon(slug)];
}
