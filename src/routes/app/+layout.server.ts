import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, url }: { locals: App.Locals; url: URL }) => {
	const { session, user } = await locals.safeGetSession();

	if (!user) {
		redirect(303, `/sign-in?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
	}

	return {
		session,
		user
	};
};
