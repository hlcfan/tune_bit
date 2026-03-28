import { error, redirect } from '@sveltejs/kit';

const APP_PATH = '/app';

type CollectionRow = {
	id: string;
	name: string;
};

type SongRow = {
	id: string;
	title: string;
	created_at: string;
	updated_at: string;
};

type NoteFileRow = {
	id: string;
	original_filename: string;
	mime_type: string;
	page_count: number;
	created_at: string;
};

type NotePageRow = {
	id: string;
	note_file_id: string;
	page_number: number;
	sort_order: number;
	preview_key: string | null;
	created_at: string;
};

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
		error(500, 'Could not load that collection right now.');
	}

	if (!collection) {
		error(404, 'That collection could not be found.');
	}

	return collection as CollectionRow;
}

async function loadSong(locals: App.Locals, userId: string, collectionId: string, songId: string) {
	const { data: song, error: songError } = await locals.supabase
		.from('songs')
		.select('id, title, created_at, updated_at')
		.eq('id', songId)
		.eq('collection_id', collectionId)
		.eq('user_id', userId)
		.maybeSingle();

	if (songError) {
		error(500, 'Could not load that song right now.');
	}

	if (!song) {
		error(404, 'That song could not be found.');
	}

	return song as SongRow;
}

export const load = async ({
	locals,
	params,
	url
}: {
	locals: App.Locals;
	params: { collectionId: string; songId: string };
	url: URL;
}) => {
	const user = await requireUser(locals);
	const [collection, song] = await Promise.all([
		loadCollection(locals, user.id, params.collectionId),
		loadSong(locals, user.id, params.collectionId, params.songId)
	]);
	const [{ data: noteFiles, error: noteFilesError }, { data: notePages, error: notePagesError }] =
		await Promise.all([
			locals.supabase
				.from('note_files')
				.select('id, original_filename, mime_type, page_count, created_at')
				.eq('user_id', user.id)
				.eq('song_id', params.songId)
				.order('created_at', { ascending: true }),
			locals.supabase
				.from('note_pages')
				.select('id, note_file_id, page_number, sort_order, preview_key, created_at')
				.eq('user_id', user.id)
				.eq('song_id', params.songId)
				.order('sort_order', { ascending: true })
		]);

	if (noteFilesError || notePagesError) {
		error(500, 'Could not load the uploaded note data right now.');
	}

	return {
		message: url.searchParams.get('message'),
		collection,
		song,
		noteFiles: (noteFiles ?? []) as NoteFileRow[],
		notePages: (notePages ?? []) as NotePageRow[]
	};
};
