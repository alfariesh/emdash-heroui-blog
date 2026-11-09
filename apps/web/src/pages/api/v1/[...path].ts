import type { APIRoute } from "astro";
import { notFound } from "../../../lib/public-api";

/** Any other path under /api/v1 gets a JSON 404 instead of the HTML 404 page. */
export const ALL: APIRoute = () => notFound("Endpoint not found.");
