import { redirect } from '@sveltejs/kit';

type AppLayoutLoadArgs = {
	parent: () => Promise<App.PageData>;
	url: URL;
};

export const load = async ({ parent, url }: AppLayoutLoadArgs) => {
	const { session, user } = await parent();

	if (!user) {
		redirect(303, `/sign-in?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
	}

	return {
		session,
		user
	};
};
