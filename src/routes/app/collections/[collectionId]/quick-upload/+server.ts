import { json, redirect } from '@sveltejs/kit';
import {
	createDirectSongUploadPlan,
	normalizeUploadDrafts,
	validateUploadDrafts
} from '$lib/server/uploads.js';

const APP_PATH = '/app';
const MAX_NAME_LENGTH = 200;

type CollectionRow = {
	id: string;
	name: string;
};

function validateName(name: string) {
	if (!name) {
		return 'Enter a song name.';
	}

	if (name.length > MAX_NAME_LENGTH) {
		return `Use ${MAX_NAME_LENGTH} characters or fewer for the song name.`;
	}

	return null;
}

async function requireUser(locals: App.Locals) {
	const { user } = await locals.safeGetSession();

	if (!user) {
		redirect(303, `/sign-in?redirectTo=${encodeURIComponent(APP_PATH)}`);
	}

	return user;
}

async function loadCollection(locals: App.Locals, userId: string, collectionId: string) {
	const { data: collection, error: collectionError } = await locals.supabase
		.from('collections')
		.select('id, name')
		.eq('id', collectionId)
		.eq('user_id', userId)
		.maybeSingle();

	if (collectionError) {
		throw new Error('Could not load that collection right now.');
	}

	if (!collection) {
		throw new Error('That collection could not be found.');
	}

	return collection as CollectionRow;
}

function getSongPath(collectionId: string, songId: string) {
	return `/app/collections/${encodeURIComponent(collectionId)}/songs/${encodeURIComponent(songId)}`;
}

export const POST = async ({
	request,
	locals,
	params
}: {
	request: Request;
	locals: App.Locals;
	params: { collectionId: string };
}) => {
	const user = await requireUser(locals);

	try {
		await loadCollection(locals, user.id, params.collectionId);
	} catch (error) {
		return json(
			{
				message:
					error instanceof Error ? error.message : 'Could not load that collection right now.'
			},
			{ status: 404 }
		);
	}

	const body = await request.json().catch(() => null);
	const title =
		body && typeof body === 'object' && 'title' in body && typeof body.title === 'string'
			? body.title.trim()
			: '';
	const files = normalizeUploadDrafts(
		body && typeof body === 'object' && 'files' in body ? body.files : null
	);
	const titleValidationMessage = validateName(title);
	const uploadValidationMessage = validateUploadDrafts(files);

	if (titleValidationMessage) {
		return json({ message: titleValidationMessage }, { status: 400 });
	}

	if (uploadValidationMessage) {
		return json({ message: uploadValidationMessage }, { status: 400 });
	}

	const { data: insertedSong, error: insertSongError } = await locals.supabase
		.from('songs')
		.insert({
			user_id: user.id,
			collection_id: params.collectionId,
			title
		})
		.select('id, title')
		.single();

	if (insertSongError || !insertedSong) {
		return json({ message: 'Could not create that song right now.' }, { status: 500 });
	}

	try {
		const uploads = await createDirectSongUploadPlan({
			files,
			songId: insertedSong.id,
			userId: user.id
		});

		return json({
			redirectTo: getSongPath(params.collectionId, insertedSong.id),
			songId: insertedSong.id,
			songTitle: insertedSong.title,
			uploads
		});
	} catch (error) {
		await locals.supabase
			.from('songs')
			.delete()
			.eq('id', insertedSong.id)
			.eq('collection_id', params.collectionId)
			.eq('user_id', user.id);

		return json(
			{
				message: error instanceof Error ? error.message : 'Could not prepare that upload right now.'
			},
			{ status: 500 }
		);
	}
};
