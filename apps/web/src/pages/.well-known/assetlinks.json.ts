import type { APIRoute } from "astro";
import { assetLinks, verificationResponse } from "../../lib/app-links";

/**
 * GET /.well-known/assetlinks.json: Android App Links. Android verifies it
 * when the app is installed (intent filters with autoVerify). 404 until
 * APP_LINKS_ANDROID_PACKAGE and APP_LINKS_ANDROID_SHA256 are set.
 */
export const GET: APIRoute = () => verificationResponse(assetLinks());
