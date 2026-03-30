export function normalizeRedirectTo(redirectTo: string | null, fallback = '/home') {
	if (!redirectTo?.startsWith('/')) {
		return fallback;
	}

	if (redirectTo.startsWith('//')) {
		return fallback;
	}

	return redirectTo;
}
