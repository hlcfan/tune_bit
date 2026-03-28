import { dev } from '$app/environment';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { publicEnvironment } from '$lib/config/public.js';
import { getSupabaseAdminEnvironment } from '$lib/server/environment.js';
import type { RequestEvent } from '@sveltejs/kit';

export function isSupabaseConfigured() {
	return Boolean(
		publicEnvironment.supabaseUrl.trim() && publicEnvironment.supabasePublishableKey.trim()
	);
}

export function createSupabaseServerClient(event: RequestEvent) {
	return createServerClient(
		publicEnvironment.supabaseUrl,
		publicEnvironment.supabasePublishableKey,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					for (const { name, value, options } of cookiesToSet) {
						event.cookies.set(name, value, {
							...options,
							path: '/'
						});
					}
				}
			}
		}
	);
}

export function canUseSupabaseAdmin() {
	return Boolean(isSupabaseConfigured() && getSupabaseAdminEnvironment().serviceRoleKey.trim());
}

export function createSupabaseAdminClient() {
	const { serviceRoleKey } = getSupabaseAdminEnvironment();

	return createClient(publicEnvironment.supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

export function isAllowedDevelopmentSignupFallback() {
	return dev && canUseSupabaseAdmin();
}

export async function safeGetSession(event: RequestEvent) {
	if (!isSupabaseConfigured()) {
		return {
			session: null,
			user: null
		};
	}

	const {
		data: { user },
		error
	} = await event.locals.supabase.auth.getUser();

	if (error || !user) {
		return {
			session: null,
			user: null
		};
	}

	return {
		session: null,
		user
	};
}
