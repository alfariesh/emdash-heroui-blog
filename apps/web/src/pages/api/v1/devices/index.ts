import type { APIRoute } from "astro";
import { callDeviceRoute, isRateLimited, readRegistration } from "../../../../lib/push-devices";
import { handle, jsonError, jsonOk, NO_STORE, notFound, preflight } from "../../../../lib/public-api";

/** POST /api/v1/devices: subscribes a device to new-post notifications (re-registering refreshes it). */
export const POST: APIRoute = (context) =>
	handle(async () => {
		if (await isRateLimited(context)) {
			return jsonError("too_many_requests", "Too many requests. Try again in a moment.");
		}
		const registration = await readRegistration(context.request);
		if (!registration) return jsonError("bad_request", "The device data is invalid.");

		const status = await callDeviceRoute(context, "register", registration);
		return status ? jsonOk(status, NO_STORE) : notFound("Notifications are not available yet.");
	});

export const OPTIONS: APIRoute = () => preflight("POST, DELETE");

/** Other methods get the API's JSON 404, like unknown paths. */
export const ALL: APIRoute = () => notFound("Endpoint not found.");
