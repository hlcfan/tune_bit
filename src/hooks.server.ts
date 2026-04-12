import { createSupabaseServerClient, safeGetSession } from '$lib/server/supabase.js';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event);
	let safeSessionPromise: ReturnType<typeof safeGetSession> | null = null;
	event.locals.safeGetSession = () => {
		if (!safeSessionPromise) {
			safeSessionPromise = safeGetSession(event);
		}

		return safeSessionPromise;
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
