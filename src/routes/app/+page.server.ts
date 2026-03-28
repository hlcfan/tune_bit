import { error, fail, redirect } from '@sveltejs/kit';

const APP_PATH = '/app';
const MAX_NAME_LENGTH = 200;

type CollectionRow = {
	id: string;
	name: string;
	created_at: string;
	updated_at: string;
};

type SongCollectionRow = {
	collection_id: string;
};

function getTextInput(formData: FormData, key: string) {
	const value = formData.get(key);

	return typeof value === 'string' ? value.trim() : '';
}

function validateCollectionName(name: string) {
	if (!name) {
		return 'Enter a collection name.';
	}

	if (name.length > MAX_NAME_LENGTH) {
		return `Use ${MAX_NAME_LENGTH} characters or fewer for the collection name.`;
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

function toCollectionMessage(action: 'create' | 'rename' | 'delete', collectionName: string) {
	if (action === 'create') {
		return `Created ${collectionName}.`;
	}

	if (action === 'rename') {
		return `Updated ${collectionName}.`;
	}

	return `Removed ${collectionName}.`;
}

export const load = async ({ locals, url }: { locals: App.Locals; url: URL }) => {
	const user = await requireUser(locals);

	const [{ data: collections, error: collectionsError }, { data: songs, error: songsError }] =
		await Promise.all([
			locals.supabase
				.from('collections')
				.select('id, name, created_at, updated_at')
				.eq('user_id', user.id)
				.order('updated_at', { ascending: false }),
			locals.supabase.from('songs').select('collection_id').eq('user_id', user.id)
		]);

	if (collectionsError || songsError) {
		error(500, 'Could not load your collections right now.');
	}

	const songCountByCollection = new Map<string, number>();

	for (const song of (songs ?? []) as SongCollectionRow[]) {
		songCountByCollection.set(
			song.collection_id,
			(songCountByCollection.get(song.collection_id) ?? 0) + 1
		);
	}

	return {
		message: url.searchParams.get('message'),
		collections: ((collections ?? []) as CollectionRow[]).map((collection) => ({
			...collection,
			songCount: songCountByCollection.get(collection.id) ?? 0
		}))
	};
};

export const actions = {
	createCollection: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
		const user = await requireUser(locals);
		const formData = await request.formData();
		const name = getTextInput(formData, 'name');
		const validationMessage = validateCollectionName(name);

		if (validationMessage) {
			return fail(400, {
				intent: 'createCollection',
				name,
				message: validationMessage
			});
		}

		const { error: insertError } = await locals.supabase.from('collections').insert({
			user_id: user.id,
			name
		});

		if (insertError) {
			return fail(500, {
				intent: 'createCollection',
				name,
				message: 'Could not create that collection right now.'
			});
		}

		return {
			success: true,
			intent: 'createCollection',
			message: toCollectionMessage('create', name)
		};
	},
	renameCollection: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
		const user = await requireUser(locals);
		const formData = await request.formData();
		const collectionId = getTextInput(formData, 'collectionId');
		const name = getTextInput(formData, 'name');
		const validationMessage = validateCollectionName(name);

		if (!collectionId) {
			return fail(400, {
				intent: 'renameCollection',
				name,
				message: 'Choose a collection to rename.'
			});
		}

		if (validationMessage) {
			return fail(400, {
				intent: 'renameCollection',
				targetId: collectionId,
				name,
				message: validationMessage
			});
		}

		const { error: updateError } = await locals.supabase
			.from('collections')
			.update({ name })
			.eq('id', collectionId)
			.eq('user_id', user.id);

		if (updateError) {
			return fail(500, {
				intent: 'renameCollection',
				targetId: collectionId,
				name,
				message: 'Could not rename that collection right now.'
			});
		}

		return {
			success: true,
			intent: 'renameCollection',
			targetId: collectionId,
			message: toCollectionMessage('rename', name)
		};
	},
	deleteCollection: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
		const user = await requireUser(locals);
		const formData = await request.formData();
		const collectionId = getTextInput(formData, 'collectionId');
		const collectionName = getTextInput(formData, 'collectionName');

		if (!collectionId) {
			return fail(400, {
				intent: 'deleteCollection',
				message: 'Choose a collection to delete.'
			});
		}

		const { error: deleteError } = await locals.supabase
			.from('collections')
			.delete()
			.eq('id', collectionId)
			.eq('user_id', user.id);

		if (deleteError) {
			return fail(500, {
				intent: 'deleteCollection',
				targetId: collectionId,
				message: 'Could not delete that collection right now.'
			});
		}

		return {
			success: true,
			intent: 'deleteCollection',
			targetId: collectionId,
			message: toCollectionMessage('delete', collectionName || 'that collection')
		};
	}
};
