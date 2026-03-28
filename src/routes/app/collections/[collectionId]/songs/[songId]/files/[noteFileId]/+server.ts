import { getStoredObject, getStoredObjectMetadata } from '$lib/server/uploads.js';
import { error, redirect } from '@sveltejs/kit';

const APP_PATH = '/app';

async function requireUser(locals: App.Locals) {
	const { user } = await locals.safeGetSession();

	if (!user) {
		redirect(303, `/sign-in?redirectTo=${encodeURIComponent(APP_PATH)}`);
	}

	return user;
}

async function loadAuthorizedNoteFile(
	locals: App.Locals,
	params: { collectionId: string; songId: string; noteFileId: string },
	userId: string
) {
	const [{ data: song, error: songError }, { data: noteFile, error: noteFileError }] =
		await Promise.all([
			locals.supabase
				.from('songs')
				.select('id')
				.eq('id', params.songId)
				.eq('collection_id', params.collectionId)
				.eq('user_id', userId)
				.maybeSingle(),
			locals.supabase
				.from('note_files')
				.select('id, storage_key, mime_type, original_filename')
				.eq('id', params.noteFileId)
				.eq('song_id', params.songId)
				.eq('user_id', userId)
				.maybeSingle()
		]);

	if (songError || noteFileError) {
		error(500, 'Could not verify access to that note file right now.');
	}

	if (!song || !noteFile) {
		error(404, 'That note file could not be found.');
	}

	return noteFile;
}

function buildResponseHeaders(
	noteFile: { mime_type: string; original_filename: string },
	storedObject: {
		ContentLength?: number;
		ContentRange?: string;
		ContentType?: string;
		ETag?: string;
		LastModified?: Date;
	}
) {
	const headers = new Headers({
		'accept-ranges': 'bytes',
		'cache-control': 'private, max-age=60',
		'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(noteFile.original_filename)}`,
		'content-type': storedObject.ContentType ?? noteFile.mime_type
	});

	if (typeof storedObject.ContentLength === 'number') {
		headers.set('content-length', String(storedObject.ContentLength));
	}

	if (storedObject.ContentRange) {
		headers.set('content-range', storedObject.ContentRange);
	}

	if (storedObject.ETag) {
		headers.set('etag', storedObject.ETag);
	}

	if (storedObject.LastModified) {
		headers.set('last-modified', storedObject.LastModified.toUTCString());
	}

	return headers;
}

function handleStorageError(storageError: unknown) {
	if (
		storageError &&
		typeof storageError === 'object' &&
		'name' in storageError &&
		storageError.name === 'NoSuchKey'
	) {
		error(404, 'That note file is no longer available.');
	}

	if (
		storageError &&
		typeof storageError === 'object' &&
		'name' in storageError &&
		(storageError.name === 'InvalidRange' || storageError.name === 'RequestedRangeNotSatisfiable')
	) {
		error(416, 'That byte range is not available for this note file.');
	}

	error(500, 'Could not load that note file right now.');
}

export const GET = async ({
	request,
	locals,
	params
}: {
	request: Request;
	locals: App.Locals;
	params: { collectionId: string; songId: string; noteFileId: string };
}) => {
	const user = await requireUser(locals);
	const noteFile = await loadAuthorizedNoteFile(locals, params, user.id);
	const requestedRange = request.headers.get('range') ?? undefined;

	try {
		const storedObject = await getStoredObject(noteFile.storage_key, {
			range: requestedRange
		});

		if (!storedObject.Body) {
			error(404, 'That note file is no longer available.');
		}

		const body =
			typeof storedObject.Body.transformToWebStream === 'function'
				? storedObject.Body.transformToWebStream()
				: new Uint8Array(await storedObject.Body.transformToByteArray());
		const headers = buildResponseHeaders(noteFile, storedObject);

		return new Response(body, {
			status: requestedRange && storedObject.ContentRange ? 206 : 200,
			headers
		});
	} catch (storageError) {
		handleStorageError(storageError);
	}
};

export const HEAD = async ({
	locals,
	params
}: {
	locals: App.Locals;
	params: { collectionId: string; songId: string; noteFileId: string };
}) => {
	const user = await requireUser(locals);
	const noteFile = await loadAuthorizedNoteFile(locals, params, user.id);

	try {
		const storedObject = await getStoredObjectMetadata(noteFile.storage_key);
		const headers = buildResponseHeaders(noteFile, storedObject);

		return new Response(null, {
			headers
		});
	} catch (storageError) {
		handleStorageError(storageError);
	}
};
