import { normalizeRedirectTo } from '$lib/server/auth.js';
import { isSupabaseConfigured } from '$lib/server/supabase.js';
import { fail, redirect } from '@sveltejs/kit';

function getAuthInput(value: FormDataEntryValue | null) {
	return typeof value === 'string' ? value.trim() : '';
}

export const load = async ({ locals, url }: { locals: App.Locals; url: URL }) => {
	const { user } = await locals.safeGetSession();

	if (user) {
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
		const email = getAuthInput(formData.get('email'));
		const password = getAuthInput(formData.get('password'));
		const redirectTo = normalizeRedirectTo(url.searchParams.get('redirectTo'));

		if (!email || !password) {
			return fail(400, {
				email,
				message: 'Enter both an email address and password to continue.'
			});
		}

		const { error } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			return fail(400, {
				email,
				message: error.message
			});
		}

		redirect(303, redirectTo);
	}
};
