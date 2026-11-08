import { useRouter } from "expo-router";
import { openExternal, toAppHref } from "./links";

/** Opens a content link: in-app screen when one exists, the browser otherwise. */
export function useOpenLink(): (href: string) => void {
	const router = useRouter();
	return (href) => {
		if (!href || href.startsWith("#")) return;
		const appHref = toAppHref(href);
		if (appHref) router.push(appHref);
		else void openExternal(href);
	};
}
