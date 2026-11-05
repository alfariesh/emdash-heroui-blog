import { isExpoPushToken } from "@blog/shared";
import type { APIRoute } from "astro";
import { callDeviceRoute, isRateLimited } from "../../../../lib/push-devices";
import { handle, jsonError, jsonOk, NO_STORE, notFound, preflight } from "../../../../lib/public-api";

/** DELETE /api/v1/devices/[token]: stops new-post notifications; fine for an unknown token. */
export const DELETE: APIRoute = (context) =>
	handle(async () => {
		if (await isRateLimited(context)) {
			return jsonError("too_many_requests", "Terlalu banyak permintaan. Coba lagi sebentar lagi.");
		}
		const token = context.params.token;
		if (!isExpoPushToken(token)) return jsonError("bad_request", "Token perangkat tidak valid.");

		const status = await callDeviceRoute(context, "unregister", { token });
		return status ? jsonOk(status, NO_STORE) : notFound("Notifikasi belum tersedia.");
	});

export const OPTIONS: APIRoute = () => preflight("DELETE");

export const ALL: APIRoute = () => notFound("Endpoint tidak ditemukan.");
