import { isSupabaseConfigured } from '$lib/server/supabase.js';

export const load = async ({ locals }: { locals: App.Locals }) => {
	const { session, user } = await locals.safeGetSession();

	return {
		session,
		user,
		isSupabaseConfigured: isSupabaseConfigured()
	};
};
