import type { APIRoute } from "astro";
import { appleAppSiteAssociation, verificationResponse } from "../../lib/app-links";

/**
 * GET /.well-known/apple-app-site-association: iOS Universal Links. Apple's
 * CDN fetches it when the app is installed; it must not redirect and has no
 * file extension. 404 until APP_LINKS_IOS_APP_IDS is set.
 */
export const GET: APIRoute = () => verificationResponse(appleAppSiteAssociation());
