import { json, redirect } from '@sveltejs/kit';
import { finalizeUploadedSongFiles, normalizePreparedUploads } from '$lib/server/uploads.js';

const APP_PATH = '/app';

function formatUploadSummary(fileCount: number, pageCount: number) {
	const fileLabel = fileCount === 1 ? 'file' : 'files';
	const pageLabel = pageCount === 1 ? 'page' : 'pages';

	return `Uploaded ${fileCount} ${fileLabel} across ${pageCount} ${pageLabel}.`;
}

async function requireUser(locals: App.Locals) {
	const { user } = await locals.safeGetSession();

	if (!user) {
		redirect(303, `/sign-in?redirectTo=${encodeURIComponent(APP_PATH)}`);
	}

	return user;
}

async function loadSong(locals: App.Locals, userId: string, collectionId: string, songId: string) {
	const { data: song, error: songError } = await locals.supabase
		.from('songs')
		.select('id')
		.eq('id', songId)
		.eq('collection_id', collectionId)
		.eq('user_id', userId)
		.maybeSingle();

	if (songError) {
		throw new Error('Could not load that song right now.');
	}

	if (!song) {
		throw new Error('That song could not be found.');
	}
}

export const POST = async ({
	request,
	locals,
	params
}: {
	request: Request;
	locals: App.Locals;
	params: { collectionId: string; songId: string };
}) => {
	const user = await requireUser(locals);

	try {
		await loadSong(locals, user.id, params.collectionId, params.songId);
	} catch (error) {
		return json(
			{
				message: error instanceof Error ? error.message : 'Could not load that song right now.'
			},
			{ status: 404 }
		);
	}

	const body = await request.json().catch(() => null);
	const uploads = normalizePreparedUploads(
		body && typeof body === 'object' && 'uploads' in body ? body.uploads : null
	);

	try {
		const result = await finalizeUploadedSongFiles({
			uploads,
			songId: params.songId,
			userId: user.id,
			supabase: locals.supabase
		});

		return json({
			message: formatUploadSummary(result.fileCount, result.pageCount)
		});
	} catch (error) {
		return json(
			{
				message: error instanceof Error ? error.message : 'Could not finish that upload right now.'
			},
			{ status: 500 }
		);
	}
};
