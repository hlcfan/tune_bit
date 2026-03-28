import { env } from '$env/dynamic/public';

export const publicEnvironmentKeys = [
	'PUBLIC_SUPABASE_URL',
	'PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
] as const;

export const publicEnvironment = {
	supabaseUrl: env.PUBLIC_SUPABASE_URL ?? '',
	supabasePublishableKey: env.PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? ''
};

export function hasPublicSupabaseEnv() {
	return Boolean(publicEnvironment.supabaseUrl && publicEnvironment.supabasePublishableKey);
}
