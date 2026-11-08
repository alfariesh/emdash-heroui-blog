/**
 * The blog's public, read-only API (`/api/v1` on apps/web). The contract and
 * the client live in @blog/shared; this file only binds it to the configured
 * origin. Never call the EmDash admin API (`/_emdash/api/…`) from the app:
 * it needs a token, and a token must not ship inside an app build.
 */
import { createBlogClient } from "@blog/shared";
import { API_URL } from "./config";

/** `API_URL` is checked in the root layout; an empty base never reaches a request. */
export const api = createBlogClient(API_URL ?? "");
