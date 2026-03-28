import { env } from '$env/dynamic/private';

export function getSupabaseAdminEnvironment() {
	return {
		serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? ''
	};
}

export function getStorageEnvironment() {
	return {
		s3ApiUrl: env.CLOUDFLARE_R2_S3_API_URL ?? '',
		accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? '',
		secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? '',
		bucket: env.CLOUDFLARE_R2_BUCKET ?? ''
	};
}
