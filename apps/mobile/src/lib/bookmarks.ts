/**
 * Saved posts ("Tersimpan"), kept on the device only.
 *
 * Stores the post summary (not just the slug) so the saved list renders
 * without a request, offline included. A tiny external store keeps every
 * subscriber in sync without a React context.
 */
import type { ApiPostSummary } from "@blog/shared";
import { useSyncExternalStore } from "react";
import { storage } from "./storage";

const STORAGE_KEY = "bookmarks";
const listeners = new Set<() => void>();

export interface Bookmark {
	post: ApiPostSummary;
	/** ISO 8601. */
	savedAt: string;
}

function read(): Bookmark[] {
	try {
		const parsed: unknown = JSON.parse(storage.getItemSync(STORAGE_KEY) ?? "[]");
		return Array.isArray(parsed) ? (parsed as Bookmark[]) : [];
	} catch {
		return [];
	}
}

// Read lazily on first use: the SQLite store may not be needed at startup.
let bookmarks: Bookmark[] | null = null;

function getSnapshot(): Bookmark[] {
	bookmarks ??= read();
	return bookmarks;
}

function write(next: Bookmark[]): void {
	bookmarks = next;
	storage.setItemSync(STORAGE_KEY, JSON.stringify(next));
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Saved posts, newest first. */
export function useBookmarks(): Bookmark[] {
	return useSyncExternalStore(subscribe, getSnapshot);
}

export function useIsBookmarked(slug: string): boolean {
	return useSyncExternalStore(subscribe, () => getSnapshot().some((b) => b.post.slug === slug));
}

/** Saves or un-saves a post; returns true when the post is now saved. */
export function toggleBookmark(post: ApiPostSummary): boolean {
	const current = getSnapshot();
	if (current.some((b) => b.post.slug === post.slug)) {
		write(current.filter((b) => b.post.slug !== post.slug));
		return false;
	}
	write([{ post: toSummary(post), savedAt: new Date().toISOString() }, ...current]);
	return true;
}

export function removeBookmark(slug: string): void {
	write(getSnapshot().filter((b) => b.post.slug !== slug));
}

/** Drops detail-only fields (content, updatedAt) when an ApiPost is saved. */
function toSummary(post: ApiPostSummary): ApiPostSummary {
	const { slug, title, excerpt, publishedAt, readingTime, featuredImage, bylines, categories, tags } =
		post;
	return { slug, title, excerpt, publishedAt, readingTime, featuredImage, bylines, categories, tags };
}
