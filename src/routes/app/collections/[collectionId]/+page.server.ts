import { error, fail, redirect } from '@sveltejs/kit';

const APP_PATH = '/app';
const MAX_NAME_LENGTH = 200;

type CollectionRow = {
	id: string;
	name: string;
	created_at: string;
	updated_at: string;
};

type SongRow = {
	id: string;
	title: string;
	created_at: string;
	updated_at: string;
};

type NoteFileRow = {
	song_id: string;
	page_count: number;
};

function getTextInput(formData: FormData, key: string) {
	const value = formData.get(key);

	return typeof value === 'string' ? value.trim() : '';
}

function validateName(name: string, label: 'collection' | 'song') {
	if (!name) {
		return `Enter a ${label} name.`;
	}

	if (name.length > MAX_NAME_LENGTH) {
		return `Use ${MAX_NAME_LENGTH} characters or fewer for the ${label} name.`;
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
		.select('id, name, created_at, updated_at')
		.eq('id', collectionId)
		.eq('user_id', userId)
		.maybeSingle();

	if (collectionError) {
		error(500, 'Could not load that collection right now.');
	}

	if (!collection) {
		error(404, 'That collection could not be found.');
	}

	return collection as CollectionRow;
}

export const load = async ({
	locals,
	params,
	url
}: {
	locals: App.Locals;
	params: { collectionId: string };
	url: URL;
}) => {
	const user = await requireUser(locals);
	const collection = await loadCollection(locals, user.id, params.collectionId);
	const [{ data: songs, error: songsError }, { data: noteFiles, error: noteFilesError }] =
		await Promise.all([
			locals.supabase
				.from('songs')
				.select('id, title, created_at, updated_at')
				.eq('user_id', user.id)
				.eq('collection_id', params.collectionId)
				.order('updated_at', { ascending: false }),
			locals.supabase.from('note_files').select('song_id, page_count').eq('user_id', user.id)
		]);

	if (songsError || noteFilesError) {
		error(500, 'Could not load the songs in that collection right now.');
	}

	const uploadSummaryBySongId = new Map<
		string,
		{
			fileCount: number;
			pageCount: number;
		}
	>();

	for (const noteFile of (noteFiles ?? []) as NoteFileRow[]) {
		const currentSummary = uploadSummaryBySongId.get(noteFile.song_id) ?? {
			fileCount: 0,
			pageCount: 0
		};

		uploadSummaryBySongId.set(noteFile.song_id, {
			fileCount: currentSummary.fileCount + 1,
			pageCount: currentSummary.pageCount + noteFile.page_count
		});
	}

	return {
		collection,
		message: url.searchParams.get('message'),
		songs: ((songs ?? []) as SongRow[]).map((song) => {
			const uploadSummary = uploadSummaryBySongId.get(song.id) ?? {
				fileCount: 0,
				pageCount: 0
			};

			return {
				...song,
				fileCount: uploadSummary.fileCount,
				pageCount: uploadSummary.pageCount
			};
		})
	};
};

export const actions = {
	renameCollection: async ({
		request,
		locals,
		params
	}: {
		request: Request;
		locals: App.Locals;
		params: { collectionId: string };
	}) => {
		const user = await requireUser(locals);
		const formData = await request.formData();
		const name = getTextInput(formData, 'name');
		const validationMessage = validateName(name, 'collection');

		if (validationMessage) {
			return fail(400, {
				intent: 'renameCollection',
				name,
				message: validationMessage
			});
		}

		const { error: updateError } = await locals.supabase
			.from('collections')
			.update({ name })
			.eq('id', params.collectionId)
			.eq('user_id', user.id);

		if (updateError) {
			return fail(500, {
				intent: 'renameCollection',
				name,
				message: 'Could not rename that collection right now.'
			});
		}

		return {
			success: true,
			intent: 'renameCollection',
			message: `Updated ${name}.`
		};
	},
	deleteCollection: async ({
		locals,
		params
	}: {
		locals: App.Locals;
		params: { collectionId: string };
	}) => {
		const user = await requireUser(locals);
		const collection = await loadCollection(locals, user.id, params.collectionId);
		const { error: deleteError } = await locals.supabase
			.from('collections')
			.delete()
			.eq('id', params.collectionId)
			.eq('user_id', user.id);

		if (deleteError) {
			return fail(500, {
				intent: 'deleteCollection',
				message: 'Could not delete that collection right now.'
			});
		}

		redirect(303, `${APP_PATH}?message=${encodeURIComponent(`Removed ${collection.name}.`)}`);
	},
	createSong: async ({
		request,
		locals,
		params
	}: {
		request: Request;
		locals: App.Locals;
		params: { collectionId: string };
	}) => {
		const user = await requireUser(locals);
		await loadCollection(locals, user.id, params.collectionId);
		const formData = await request.formData();
		const title = getTextInput(formData, 'title');
		const validationMessage = validateName(title, 'song');

		if (validationMessage) {
			return fail(400, {
				intent: 'createSong',
				title,
				message: validationMessage
			});
		}

		const { error: insertError } = await locals.supabase.from('songs').insert({
			user_id: user.id,
			collection_id: params.collectionId,
			title
		});

		if (insertError) {
			return fail(500, {
				intent: 'createSong',
				title,
				message: 'Could not create that song right now.'
			});
		}

		return {
			success: true,
			intent: 'createSong',
			message: `Added ${title}.`
		};
	},
	renameSong: async ({
		request,
		locals,
		params
	}: {
		request: Request;
		locals: App.Locals;
		params: { collectionId: string };
	}) => {
		const user = await requireUser(locals);
		const formData = await request.formData();
		const songId = getTextInput(formData, 'songId');
		const title = getTextInput(formData, 'title');
		const validationMessage = validateName(title, 'song');

		if (!songId) {
			return fail(400, {
				intent: 'renameSong',
				message: 'Choose a song to rename.'
			});
		}

		if (validationMessage) {
			return fail(400, {
				intent: 'renameSong',
				targetId: songId,
				title,
				message: validationMessage
			});
		}

		const { error: updateError } = await locals.supabase
			.from('songs')
			.update({ title })
			.eq('id', songId)
			.eq('collection_id', params.collectionId)
			.eq('user_id', user.id);

		if (updateError) {
			return fail(500, {
				intent: 'renameSong',
				targetId: songId,
				title,
				message: 'Could not rename that song right now.'
			});
		}

		return {
			success: true,
			intent: 'renameSong',
			targetId: songId,
			message: `Updated ${title}.`
		};
	},
	deleteSong: async ({
		request,
		locals,
		params
	}: {
		request: Request;
		locals: App.Locals;
		params: { collectionId: string };
	}) => {
		const user = await requireUser(locals);
		const formData = await request.formData();
		const songId = getTextInput(formData, 'songId');
		const songTitle = getTextInput(formData, 'songTitle');

		if (!songId) {
			return fail(400, {
				intent: 'deleteSong',
				message: 'Choose a song to delete.'
			});
		}

		const { error: deleteError } = await locals.supabase
			.from('songs')
			.delete()
			.eq('id', songId)
			.eq('collection_id', params.collectionId)
			.eq('user_id', user.id);

		if (deleteError) {
			return fail(500, {
				intent: 'deleteSong',
				targetId: songId,
				message: 'Could not delete that song right now.'
			});
		}

		return {
			success: true,
			intent: 'deleteSong',
			targetId: songId,
			message: `Removed ${songTitle || 'that song'}.`
		};
	}
};
