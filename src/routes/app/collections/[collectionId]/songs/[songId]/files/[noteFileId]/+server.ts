import { getStoredObject } from '$lib/server/uploads.js';
import { error, redirect } from '@sveltejs/kit';

const APP_PATH = '/app';

async function requireUser(locals: App.Locals) {
	const { user } = await locals.safeGetSession();

	if (!user) {
		redirect(303, `/sign-in?redirectTo=${encodeURIComponent(APP_PATH)}`);
	}

	return user;
}

export const GET = async ({
	locals,
	params
}: {
	locals: App.Locals;
	params: { collectionId: string; songId: string; noteFileId: string };
}) => {
	const user = await requireUser(locals);
	const [{ data: song, error: songError }, { data: noteFile, error: noteFileError }] =
		await Promise.all([
			locals.supabase
				.from('songs')
				.select('id')
				.eq('id', params.songId)
				.eq('collection_id', params.collectionId)
				.eq('user_id', user.id)
				.maybeSingle(),
			locals.supabase
				.from('note_files')
				.select('id, storage_key, mime_type, original_filename')
				.eq('id', params.noteFileId)
				.eq('song_id', params.songId)
				.eq('user_id', user.id)
				.maybeSingle()
		]);

	if (songError || noteFileError) {
		error(500, 'Could not verify access to that note file right now.');
	}

	if (!song || !noteFile) {
		error(404, 'That note file could not be found.');
	}

	try {
		const storedObject = await getStoredObject(noteFile.storage_key);

		if (!storedObject.Body) {
			error(404, 'That note file is no longer available.');
		}

		const body =
			typeof storedObject.Body.transformToWebStream === 'function'
				? storedObject.Body.transformToWebStream()
				: new Uint8Array(await storedObject.Body.transformToByteArray());
		const headers = new Headers({
			'cache-control': 'private, max-age=60',
			'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(noteFile.original_filename)}`,
			'content-type': storedObject.ContentType ?? noteFile.mime_type
		});

		if (typeof storedObject.ContentLength === 'number') {
			headers.set('content-length', String(storedObject.ContentLength));
		}

		if (storedObject.ETag) {
			headers.set('etag', storedObject.ETag);
		}

		if (storedObject.LastModified) {
			headers.set('last-modified', storedObject.LastModified.toUTCString());
		}

		return new Response(body, {
			headers
		});
	} catch (storageError) {
		if (
			storageError &&
			typeof storageError === 'object' &&
			'name' in storageError &&
			storageError.name === 'NoSuchKey'
		) {
			error(404, 'That note file is no longer available.');
		}

		error(500, 'Could not load that note file right now.');
	}
};
