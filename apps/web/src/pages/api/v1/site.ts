import type { ApiMenuItem, ApiSite } from "@blog/shared";
import { DEFAULT_LOCALE, resolveBlogSiteIdentity } from "@blog/shared";
import type { APIRoute } from "astro";
import { getMenu, getSiteSettings, type MenuItem } from "emdash";
import { absoluteUrl, handle, jsonOk, toApiImage } from "../../../lib/public-api";
import { publicOrigin } from "../../../lib/site-url";

/** GET /api/v1/site: title, tagline, logo and the primary menu. */
export const GET: APIRoute = (context) =>
	handle(async () => {
		const [settings, menu] = await Promise.all([getSiteSettings(), getMenu("primary")]);
		const { siteTitle, siteTagline, siteLogo } = resolveBlogSiteIdentity(settings);
		const origin = publicOrigin(context);

		const toItem = (item: MenuItem): ApiMenuItem => ({
			label: item.label,
			url: absoluteUrl(item.url, origin),
			target: item.target ?? null,
			children: item.children.map(toItem),
		});

		const site: ApiSite = {
			title: siteTitle,
			tagline: siteTagline,
			logo: siteLogo ? toApiImage(context, { ...siteLogo, src: siteLogo.url, id: siteLogo.mediaId }) : null,
			locale: DEFAULT_LOCALE,
			url: origin,
			menu: (menu?.items ?? []).map(toItem),
		};
		return jsonOk(site);
	});
