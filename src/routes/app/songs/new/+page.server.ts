import { error, fail, redirect } from '@sveltejs/kit';

const APP_PATH = '/app';
const MAX_NAME_LENGTH = 200;
const DEFAULT_COLLECTION_VALUE = '__create-default-collection__';
const DEFAULT_COLLECTION_NAME = 'My Collection';

type CollectionRow = {
	id: string;
	name: string;
	updated_at: string;
};

function getTextInput(formData: FormData, key: string) {
	const value = formData.get(key);

	return typeof value === 'string' ? value.trim() : '';
}

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
		error(500, 'Could not load your collections right now.');
	}

	return (collections ?? []) as CollectionRow[];
}

function getSelectedCollectionId(collections: CollectionRow[], requestedCollectionId: string) {
	if (
		requestedCollectionId &&
		collections.some((collection) => collection.id === requestedCollectionId)
	) {
		return requestedCollectionId;
	}

	return collections[0]?.id ?? DEFAULT_COLLECTION_VALUE;
}

export const load = async ({ locals, url }: { locals: App.Locals; url: URL }) => {
	const user = await requireUser(locals);
	const collections = await loadCollections(locals, user.id);
	const requestedCollectionId = url.searchParams.get('collectionId')?.trim() ?? '';

	return {
		collections,
		defaultCollectionName: DEFAULT_COLLECTION_NAME,
		defaultCollectionValue: DEFAULT_COLLECTION_VALUE,
		selectedCollectionId: getSelectedCollectionId(collections, requestedCollectionId)
	};
};

export const actions = {
	createSong: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
		const user = await requireUser(locals);
		const collections = await loadCollections(locals, user.id);
		const formData = await request.formData();
		const title = getTextInput(formData, 'title');
		const requestedCollectionId = getTextInput(formData, 'collectionId');
		const titleValidationMessage = validateSongTitle(title);

		if (titleValidationMessage) {
			return fail(400, {
				intent: 'createSong',
				title,
				collectionId: getSelectedCollectionId(collections, requestedCollectionId),
				message: titleValidationMessage
			});
		}

		let collectionId = requestedCollectionId;
		let createdCollectionId = '';

		if (collectionId === DEFAULT_COLLECTION_VALUE) {
			if (collections.length > 0) {
				return fail(400, {
					intent: 'createSong',
					title,
					collectionId: getSelectedCollectionId(collections, requestedCollectionId),
					message: 'Choose one of your collections for this song.'
				});
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
				return fail(500, {
					intent: 'createSong',
					title,
					collectionId: DEFAULT_COLLECTION_VALUE,
					message: 'Could not create your first collection right now.'
				});
			}

			collectionId = insertedCollection.id;
			createdCollectionId = insertedCollection.id;
		}

		const hasExistingCollectionSelection = collections.some(
			(collection) => collection.id === collectionId
		);

		if (!collectionId || (!hasExistingCollectionSelection && !createdCollectionId)) {
			return fail(400, {
				intent: 'createSong',
				title,
				collectionId: getSelectedCollectionId(collections, requestedCollectionId),
				message: 'Choose a collection for this song.'
			});
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

			return fail(500, {
				intent: 'createSong',
				title,
				collectionId: createdCollectionId
					? DEFAULT_COLLECTION_VALUE
					: getSelectedCollectionId(collections, requestedCollectionId),
				message: 'Could not create that song right now.'
			});
		}

		redirect(
			303,
			`/app/collections/${encodeURIComponent(collectionId)}/songs/${encodeURIComponent(insertedSong.id)}`
		);
	}
};
