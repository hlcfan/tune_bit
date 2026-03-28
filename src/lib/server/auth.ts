export function normalizeRedirectTo(redirectTo: string | null, fallback = '/app') {
	if (!redirectTo?.startsWith('/')) {
		return fallback;
	}

	if (redirectTo.startsWith('//')) {
		return fallback;
	}

	return redirectTo;
}
