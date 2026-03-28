import { normalizeRedirectTo } from '$lib/server/auth.js';
import {
	createSupabaseAdminClient,
	isAllowedDevelopmentSignupFallback,
	isSupabaseConfigured
} from '$lib/server/supabase.js';
import { fail, redirect } from '@sveltejs/kit';

function getAuthInput(value: FormDataEntryValue | null) {
	return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value: string) {
	return value.trim().toLowerCase();
}

function isValidEmailAddress(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function shouldUseDevelopmentSignupFallback(message: string) {
	const normalizedMessage = message.toLowerCase();

	return (
		normalizedMessage.includes('email address') &&
		(normalizedMessage.includes('is invalid') || normalizedMessage.includes('not authorized'))
	);
}

export const load = async ({ locals, url }: { locals: App.Locals; url: URL }) => {
	const { session } = await locals.safeGetSession();

	if (session) {
		redirect(303, normalizeRedirectTo(url.searchParams.get('redirectTo')));
	}

	return {
		redirectTo: normalizeRedirectTo(url.searchParams.get('redirectTo'))
	};
};

export const actions = {
	default: async ({ request, locals, url }: { request: Request; locals: App.Locals; url: URL }) => {
		if (!isSupabaseConfigured()) {
			return fail(500, {
				message:
					'Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY before testing authentication locally.'
			});
		}

		const formData = await request.formData();
		const email = normalizeEmail(getAuthInput(formData.get('email')));
		const password = getAuthInput(formData.get('password'));
		const redirectTo = normalizeRedirectTo(url.searchParams.get('redirectTo'));

		if (!email || !password) {
			return fail(400, {
				email,
				message: 'Enter both an email address and password to create an account.'
			});
		}

		if (!isValidEmailAddress(email)) {
			return fail(400, {
				email,
				message: 'Enter a valid email address.'
			});
		}

		if (password.length < 8) {
			return fail(400, {
				email,
				message: 'Use at least 8 characters for the password.'
			});
		}

		const {
			data: { session },
			error
		} = await locals.supabase.auth.signUp({
			email,
			password
		});

		if (error) {
			if (
				isAllowedDevelopmentSignupFallback() &&
				shouldUseDevelopmentSignupFallback(error.message)
			) {
				const adminClient = createSupabaseAdminClient();
				const { error: fallbackError } = await adminClient.auth.admin.createUser({
					email,
					password,
					email_confirm: true
				});

				if (!fallbackError) {
					const { error: signInError } = await locals.supabase.auth.signInWithPassword({
						email,
						password
					});

					if (!signInError) {
						redirect(303, redirectTo);
					}
				}
			}

			return fail(400, {
				email,
				message: shouldUseDevelopmentSignupFallback(error.message)
					? 'Supabase could not send a confirmation email for that address. For local development, either disable Confirm email in Supabase Auth or configure custom SMTP.'
					: error.message
			});
		}

		if (session) {
			redirect(303, redirectTo);
		}

		return {
			success: true,
			email,
			message:
				'Your account was created. If email confirmation is enabled in Supabase, finish that step and then sign in.'
		};
	}
};
