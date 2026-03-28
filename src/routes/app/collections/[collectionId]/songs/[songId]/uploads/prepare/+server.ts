import { json, redirect } from '@sveltejs/kit';
import {
	createDirectSongUploadPlan,
	normalizeUploadDrafts,
	validateUploadDrafts
} from '$lib/server/uploads.js';

const APP_PATH = '/app';

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
	const files = normalizeUploadDrafts(
		body && typeof body === 'object' && 'files' in body ? body.files : null
	);
	const validationMessage = validateUploadDrafts(files);

	if (validationMessage) {
		return json({ message: validationMessage }, { status: 400 });
	}

	try {
		const uploads = await createDirectSongUploadPlan({
			files,
			songId: params.songId,
			userId: user.id
		});

		return json({ uploads });
	} catch (error) {
		return json(
			{
				message: error instanceof Error ? error.message : 'Could not prepare that upload right now.'
			},
			{ status: 500 }
		);
	}
};
