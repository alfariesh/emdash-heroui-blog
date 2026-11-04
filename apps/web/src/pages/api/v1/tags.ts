import type { APIRoute } from "astro";
import { handle, jsonOk } from "../../../lib/public-api";
import { listTerms } from "../../../lib/public-api-terms";

/** GET /api/v1/tags: every tag with its published-post count. */
export const GET: APIRoute = () => handle(async () => jsonOk(await listTerms("tag")));
