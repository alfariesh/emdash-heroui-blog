/**
 * "Lanjutkan membaca": where the reader left each article, on the device
 * only (like bookmarks). The article screen saves when it closes or the app
 * goes to the background, never per scroll frame. Rules: reading-positions.ts.
 */
import { parsePositions, recordPosition, type ReadingPosition } from "./reading-positions";
import { storage } from "./storage";

const STORAGE_KEY = "reading-positions";

/** The saved position in a half-read article, if any. */
export function getReadingPosition(slug: string): ReadingPosition | undefined {
	return parsePositions(storage.getItemSync(STORAGE_KEY))[slug];
}

/** Saves (or clears, when barely started or finished) the position in an article. */
export function saveReadingPosition(slug: string, offset: number, progress: number): void {
	const next = recordPosition(parsePositions(storage.getItemSync(STORAGE_KEY)), slug, offset, progress, new Date());
	storage.setItemSync(STORAGE_KEY, JSON.stringify(next));
}
