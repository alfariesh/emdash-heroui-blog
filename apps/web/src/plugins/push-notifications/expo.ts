/**
 * Client for the Expo push service, without imports so Node's test runner
 * can load it (`pnpm --filter @blog/web test`).
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Expo accepts at most 100 notifications per request. */
export const EXPO_BATCH_SIZE = 100;

/** What every recipient of one notification sees. */
export interface PushContent {
	title: string;
	body: string;
	data: Record<string, unknown>;
	/** Android notification channel; the app creates it. */
	channelId: string;
}

/** One Expo message addressed to a whole batch of tokens. */
export interface ExpoMessage extends PushContent {
	to: string[];
	priority: "default";
}

export interface TicketSummary {
	ok: number;
	failed: number;
	/** Tokens Expo no longer delivers to (app uninstalled, token expired): remove them. */
	unregistered: string[];
	/** The request itself failed (network, HTTP error), so nothing reached Expo. */
	requestFailed: boolean;
}

type FetchFn = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
	ok: boolean;
	status: number;
	json(): Promise<unknown>;
}>;

const ELLIPSIS = "…";
const WHITESPACE = /\s+/g;

/** Collapses whitespace and cuts at a word boundary, for notification text. */
export function truncate(text: string, max: number): string {
	const clean = text.replace(WHITESPACE, " ").trim();
	if (clean.length <= max) return clean;
	const cut = clean.slice(0, max - 1);
	const lastSpace = cut.lastIndexOf(" ");
	return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}${ELLIPSIS}`;
}

/** The message for one batch (at most EXPO_BATCH_SIZE tokens). */
export function buildMessage(tokens: string[], content: PushContent): ExpoMessage {
	return { ...content, to: tokens, priority: "default" };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Reads Expo's tickets for a batch: one per token, in the same order.
 * Only DeviceNotRegistered leads to removal; other errors (rate limits,
 * credentials, message size) are counted and logged, not acted on.
 */
export function readTickets(tokens: string[], body: unknown): TicketSummary {
	const tickets = isRecord(body) && Array.isArray(body.data) ? body.data : [];
	const summary: TicketSummary = { ok: 0, failed: 0, unregistered: [], requestFailed: false };
	tokens.forEach((token, index) => {
		const ticket: unknown = tickets[index];
		if (isRecord(ticket) && ticket.status === "ok") {
			summary.ok++;
			return;
		}
		summary.failed++;
		const details = isRecord(ticket) && isRecord(ticket.details) ? ticket.details : undefined;
		if (details?.error === "DeviceNotRegistered") summary.unregistered.push(token);
	});
	return summary;
}

const requestFailed = (tokens: string[]): TicketSummary => ({
	ok: 0,
	failed: tokens.length,
	unregistered: [],
	requestFailed: true,
});

/**
 * Sends one batch. A transport or HTTP failure counts every token as failed
 * and removes none: the tokens may be fine, the request was not.
 */
export async function sendBatch(
	fetchFn: FetchFn,
	tokens: string[],
	content: PushContent,
	accessToken?: string | null,
): Promise<TicketSummary> {
	const headers: Record<string, string> = {
		Accept: "application/json",
		"Content-Type": "application/json",
	};
	if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
	try {
		const response = await fetchFn(EXPO_PUSH_URL, {
			method: "POST",
			headers,
			body: JSON.stringify([buildMessage(tokens, content)]),
		});
		if (!response.ok) return requestFailed(tokens);
		return readTickets(tokens, await response.json());
	} catch {
		return requestFailed(tokens);
	}
}
