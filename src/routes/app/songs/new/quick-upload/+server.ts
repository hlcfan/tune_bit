import { json, redirect } from '@sveltejs/kit';
import {
	createDirectSongUploadPlan,
	normalizeUploadDrafts,
	validateUploadDrafts
} from '$lib/server/uploads.js';

const APP_PATH = '/app';
const MAX_NAME_LENGTH = 200;
const DEFAULT_COLLECTION_VALUE = '__create-default-collection__';
const DEFAULT_COLLECTION_NAME = 'My Collection';

type CollectionRow = {
	id: string;
	name: string;
	updated_at: string;
};

function validateSongTitle(title: string) {
	if (!title) {
		return 'Enter a song title.';
	}

	if (title.length > MAX_NAME_LENGTH) {
		return `Use ${MAX_NAME_LENGTH} characters or fewer for the song title.`;
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

async function loadCollections(locals: App.Locals, userId: string) {
	const { data: collections, error: collectionsError } = await locals.supabase
		.from('collections')
		.select('id, name, updated_at')
		.eq('user_id', userId)
		.order('updated_at', { ascending: false });

	if (collectionsError) {
		throw new Error('Could not load your collections right now.');
	}

	return (collections ?? []) as CollectionRow[];
}

function getSongPath(collectionId: string, songId: string) {
	return `/app/collections/${encodeURIComponent(collectionId)}/songs/${encodeURIComponent(songId)}`;
}

export const POST = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	const user = await requireUser(locals);
	const collections = await loadCollections(locals, user.id);
	const body = await request.json().catch(() => null);
	const title =
		body && typeof body === 'object' && 'title' in body && typeof body.title === 'string'
			? body.title.trim()
			: '';
	const requestedCollectionId =
		body &&
		typeof body === 'object' &&
		'collectionId' in body &&
		typeof body.collectionId === 'string'
			? body.collectionId.trim()
			: '';
	const files = normalizeUploadDrafts(
		body && typeof body === 'object' && 'files' in body ? body.files : null
	);
	const titleValidationMessage = validateSongTitle(title);
	const uploadValidationMessage = validateUploadDrafts(files);

	if (titleValidationMessage) {
		return json({ message: titleValidationMessage }, { status: 400 });
	}

	if (uploadValidationMessage) {
		return json({ message: uploadValidationMessage }, { status: 400 });
	}

	let collectionId = requestedCollectionId;
	let createdCollectionId = '';

	if (collectionId === DEFAULT_COLLECTION_VALUE) {
		if (collections.length > 0) {
			return json({ message: 'Choose one of your collections for this song.' }, { status: 400 });
		}

		const { data: insertedCollection, error: insertCollectionError } = await locals.supabase
			.from('collections')
			.insert({
				user_id: user.id,
				name: DEFAULT_COLLECTION_NAME
			})
			.select('id')
			.single();

		if (insertCollectionError || !insertedCollection) {
			return json(
				{ message: 'Could not create your first collection right now.' },
				{ status: 500 }
			);
		}

		collectionId = insertedCollection.id;
		createdCollectionId = insertedCollection.id;
	}

	const hasExistingCollectionSelection = collections.some(
		(collection) => collection.id === collectionId
	);

	if (!collectionId || (!hasExistingCollectionSelection && !createdCollectionId)) {
		return json({ message: 'Choose a collection for this song.' }, { status: 400 });
	}

	const { data: insertedSong, error: insertSongError } = await locals.supabase
		.from('songs')
		.insert({
			user_id: user.id,
			collection_id: collectionId,
			title
		})
		.select('id')
		.single();

	if (insertSongError || !insertedSong) {
		if (createdCollectionId) {
			await locals.supabase
				.from('collections')
				.delete()
				.eq('id', createdCollectionId)
				.eq('user_id', user.id);
		}

		return json({ message: 'Could not create that song right now.' }, { status: 500 });
	}

	try {
		const uploads = await createDirectSongUploadPlan({
			files,
			songId: insertedSong.id,
			userId: user.id
		});

		return json({
			redirectTo: getSongPath(collectionId, insertedSong.id),
			collectionId,
			songId: insertedSong.id,
			uploads
		});
	} catch (error) {
		await locals.supabase
			.from('songs')
			.delete()
			.eq('id', insertedSong.id)
			.eq('collection_id', collectionId)
			.eq('user_id', user.id);

		if (createdCollectionId) {
			await locals.supabase
				.from('collections')
				.delete()
				.eq('id', createdCollectionId)
				.eq('user_id', user.id);
		}

		return json(
			{
				message: error instanceof Error ? error.message : 'Could not prepare that upload right now.'
			},
			{ status: 500 }
		);
	}
};
