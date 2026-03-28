import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PDFDocument } from 'pdf-lib';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getStorageEnvironment } from '$lib/server/environment.js';

const STORAGE_PROVIDER = 'cloudflare-r2';
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
const PRESIGNED_UPLOAD_EXPIRATION_SECONDS = 60 * 15;

type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

const MIME_TYPE_BY_EXTENSION = new Map<string, AcceptedMimeType>([
	['.pdf', 'application/pdf'],
	['.jpg', 'image/jpeg'],
	['.jpeg', 'image/jpeg'],
	['.png', 'image/png'],
	['.webp', 'image/webp']
]);

export type UploadDraft = {
	name: string;
	size: number;
	type: string;
};

export type PreparedUpload = {
	originalFilename: string;
	mimeType: AcceptedMimeType;
	signedUploadUrl: string;
	storageKey: string;
	uploadHeaders: Record<string, string>;
};

type PrepareDirectUploadInput = {
	files: UploadDraft[];
	songId: string;
	userId: string;
};

type FinalizeUploadInput = {
	uploads: PreparedUpload[];
	songId: string;
	userId: string;
	supabase: SupabaseClient;
};

type UploadResult = {
	fileCount: number;
	pageCount: number;
};

let storageClient: S3Client | null = null;

function normalizeStorageEndpoint(endpoint: string) {
	return endpoint.trim().replace(/\/+$/, '');
}

function getStorageEndpointValidationMessage(endpoint: string) {
	if (!endpoint) {
		return 'Storage is not configured yet. Add the Cloudflare R2 environment variables before uploading files.';
	}

	let parsedUrl: URL;

	try {
		parsedUrl = new URL(endpoint);
	} catch {
		return 'CLOUDFLARE_R2_S3_API_URL must be a valid HTTPS URL.';
	}

	if (parsedUrl.protocol !== 'https:') {
		return 'CLOUDFLARE_R2_S3_API_URL must use HTTPS.';
	}

	if (parsedUrl.hostname.endsWith('.r2.dev')) {
		return 'CLOUDFLARE_R2_S3_API_URL must use the Cloudflare R2 S3 API endpoint, not the public r2.dev URL.';
	}

	if (!parsedUrl.hostname.endsWith('.r2.cloudflarestorage.com')) {
		return 'CLOUDFLARE_R2_S3_API_URL must look like https://<account-id>.r2.cloudflarestorage.com.';
	}

	return null;
}

function getStorageConfigurationIssue() {
	const { s3ApiUrl, accessKeyId, secretAccessKey, bucket } = getStorageEnvironment();
	const trimmedAccessKeyId = accessKeyId.trim();
	const trimmedSecretAccessKey = secretAccessKey.trim();
	const trimmedBucket = bucket.trim();

	if (!trimmedAccessKeyId || !trimmedSecretAccessKey || !trimmedBucket) {
		return 'Storage is not configured yet. Add the Cloudflare R2 environment variables before uploading files.';
	}

	return getStorageEndpointValidationMessage(normalizeStorageEndpoint(s3ApiUrl));
}

function getStorageClient() {
	if (storageClient) {
		return storageClient;
	}

	const { s3ApiUrl, accessKeyId, secretAccessKey } = getStorageEnvironment();
	const storageConfigurationIssue = getStorageConfigurationIssue();

	if (storageConfigurationIssue) {
		throw new Error(storageConfigurationIssue);
	}

	storageClient = new S3Client({
		region: 'auto',
		endpoint: normalizeStorageEndpoint(s3ApiUrl),
		forcePathStyle: true,
		credentials: {
			accessKeyId: accessKeyId.trim(),
			secretAccessKey: secretAccessKey.trim()
		}
	});

	return storageClient;
}

function getSafeFileNameSegment(fileName: string) {
	const normalizedName = fileName
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9.-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^\.+/, '')
		.replace(/^-+|-+$/g, '');

	return normalizedName || 'upload';
}

function getFileExtension(fileName: string) {
	const lastDotIndex = fileName.lastIndexOf('.');

	if (lastDotIndex === -1) {
		return '';
	}

	return fileName.slice(lastDotIndex).toLowerCase();
}

function getMimeType(file: { name: string; type: string }) {
	const providedType = file.type.toLowerCase();

	if (ACCEPTED_MIME_TYPES.includes(providedType as AcceptedMimeType)) {
		return providedType as AcceptedMimeType;
	}

	return MIME_TYPE_BY_EXTENSION.get(getFileExtension(file.name)) ?? null;
}

function getSongStoragePrefix(userId: string, songId: string) {
	const now = new Date();
	const dateSegment = now.toISOString().slice(0, 10);

	return `users/${userId}/songs/${songId}/${dateSegment}`;
}

function buildStorageKey(userId: string, songId: string, fileName: string) {
	return `${getSongStoragePrefix(userId, songId)}/${crypto.randomUUID()}-${getSafeFileNameSegment(fileName)}`;
}

function getUploadValidationMessage(files: Array<{ name: string; size: number; type: string }>) {
	if (!isStorageConfigured()) {
		return getStorageConfigurationMessage();
	}

	if (files.length === 0) {
		return 'Choose one or more PDF or image files to upload.';
	}

	for (const file of files) {
		if (!file.name.trim() || !Number.isFinite(file.size) || file.size <= 0) {
			return 'Choose one or more PDF or image files to upload.';
		}

		const mimeType = getMimeType(file);

		if (!mimeType) {
			return `${file.name} is not supported. Upload PDF, JPG, JPEG, PNG, or WEBP files only.`;
		}
	}

	return null;
}

async function getPageCount(fileBytes: Uint8Array, mimeType: AcceptedMimeType) {
	if (mimeType !== 'application/pdf') {
		return 1;
	}

	const document = await PDFDocument.load(fileBytes);

	return document.getPageCount();
}

async function getCurrentSortOrder(supabase: SupabaseClient, userId: string, songId: string) {
	const { data, error } = await supabase
		.from('note_pages')
		.select('sort_order')
		.eq('user_id', userId)
		.eq('song_id', songId)
		.order('sort_order', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		throw new Error('Could not prepare the page order for this upload.');
	}

	return typeof data?.sort_order === 'number' ? data.sort_order : -1;
}

async function getUploadedObjectBytes(storageKey: string) {
	const client = getStorageClient();
	const { bucket } = getStorageEnvironment();
	const response = await client.send(
		new GetObjectCommand({
			Bucket: bucket,
			Key: storageKey
		})
	);

	if (!response.Body) {
		throw new Error('Could not read the uploaded file from storage.');
	}

	return new Uint8Array(await response.Body.transformToByteArray());
}

async function assertUploadedObjectExists(storageKey: string) {
	const client = getStorageClient();
	const { bucket } = getStorageEnvironment();

	await client.send(
		new HeadObjectCommand({
			Bucket: bucket,
			Key: storageKey
		})
	);
}

async function removeUploadedObjects(storageKeys: string[]) {
	if (storageKeys.length === 0) {
		return;
	}

	const client = getStorageClient();
	const { bucket } = getStorageEnvironment();

	await Promise.allSettled(
		storageKeys.map((storageKey) =>
			client.send(
				new DeleteObjectCommand({
					Bucket: bucket,
					Key: storageKey
				})
			)
		)
	);
}

async function removeInsertedNoteFiles(
	supabase: SupabaseClient,
	userId: string,
	songId: string,
	noteFileIds: string[]
) {
	if (noteFileIds.length === 0) {
		return;
	}

	await supabase
		.from('note_files')
		.delete()
		.eq('user_id', userId)
		.eq('song_id', songId)
		.in('id', noteFileIds);
}

export function isStorageConfigured() {
	return !getStorageConfigurationIssue();
}

export function getStorageConfigurationMessage() {
	return (
		getStorageConfigurationIssue() ??
		'Storage is not configured yet. Add the Cloudflare R2 environment variables before uploading files.'
	);
}

export function normalizeUploadDrafts(value: unknown): UploadDraft[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.flatMap((file) => {
		if (!file || typeof file !== 'object') {
			return [];
		}

		const name = 'name' in file && typeof file.name === 'string' ? file.name.trim() : '';
		const type = 'type' in file && typeof file.type === 'string' ? file.type.trim() : '';
		const size =
			'size' in file && typeof file.size === 'number' && Number.isFinite(file.size) ? file.size : 0;

		return name
			? [
					{
						name,
						type,
						size
					}
				]
			: [];
	});
}

export function normalizePreparedUploads(value: unknown): PreparedUpload[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.flatMap((upload) => {
		if (!upload || typeof upload !== 'object') {
			return [];
		}

		const originalFilename =
			'originalFilename' in upload && typeof upload.originalFilename === 'string'
				? upload.originalFilename.trim()
				: '';
		const mimeType =
			'mimeType' in upload && typeof upload.mimeType === 'string' ? upload.mimeType.trim() : '';
		const signedUploadUrl =
			'signedUploadUrl' in upload && typeof upload.signedUploadUrl === 'string'
				? upload.signedUploadUrl
				: '';
		const storageKey =
			'storageKey' in upload && typeof upload.storageKey === 'string'
				? upload.storageKey.trim()
				: '';
		const uploadHeaders =
			'uploadHeaders' in upload &&
			upload.uploadHeaders &&
			typeof upload.uploadHeaders === 'object' &&
			!Array.isArray(upload.uploadHeaders)
				? Object.fromEntries(
						Object.entries(upload.uploadHeaders).flatMap(([key, headerValue]) =>
							typeof headerValue === 'string' ? [[key, headerValue]] : []
						)
					)
				: {};

		return originalFilename && mimeType && signedUploadUrl && storageKey
			? [
					{
						originalFilename,
						mimeType: mimeType as AcceptedMimeType,
						signedUploadUrl,
						storageKey,
						uploadHeaders
					}
				]
			: [];
	});
}

export function validateUploadDrafts(files: UploadDraft[]) {
	return getUploadValidationMessage(files);
}

export function validateUploadInput(files: File[]) {
	return getUploadValidationMessage(
		files.map((file) => ({
			name: file.name,
			size: file.size,
			type: file.type
		}))
	);
}

function translateUploadError(error: unknown) {
	if (!(error instanceof Error)) {
		return new Error('Upload failed. Try again in a moment.', { cause: error });
	}

	if (error.message.includes('alert handshake failure') || error.message.includes('write EPROTO')) {
		return new Error(
			'Cloudflare R2 rejected the TLS handshake. Check that CLOUDFLARE_R2_S3_API_URL uses the account S3 API endpoint in the form https://<account-id>.r2.cloudflarestorage.com.',
			{ cause: error }
		);
	}

	return error;
}

function validatePreparedUploads(uploads: PreparedUpload[], userId: string, songId: string) {
	const uploadValidationMessage = validateUploadDrafts(
		uploads.map((upload) => ({
			name: upload.originalFilename,
			size: 1,
			type: upload.mimeType
		}))
	);

	if (uploadValidationMessage) {
		return uploadValidationMessage;
	}

	const expectedStoragePrefix = `${getSongStoragePrefix(userId, songId)}/`;

	for (const upload of uploads) {
		if (!upload.storageKey.startsWith(expectedStoragePrefix)) {
			return 'One or more uploaded files could not be verified for this song.';
		}
	}

	return null;
}

export async function createDirectSongUploadPlan({
	files,
	songId,
	userId
}: PrepareDirectUploadInput): Promise<PreparedUpload[]> {
	const validationMessage = validateUploadDrafts(files);

	if (validationMessage) {
		throw new Error(validationMessage);
	}

	const client = getStorageClient();
	const { bucket } = getStorageEnvironment();

	try {
		return await Promise.all(
			files.map(async (file) => {
				const mimeType = getMimeType(file);

				if (!mimeType) {
					throw new Error(`${file.name} is not supported.`);
				}

				const storageKey = buildStorageKey(userId, songId, file.name);
				const signedUploadUrl = await getSignedUrl(
					client,
					new PutObjectCommand({
						Bucket: bucket,
						Key: storageKey,
						ContentType: mimeType
					}),
					{
						expiresIn: PRESIGNED_UPLOAD_EXPIRATION_SECONDS
					}
				);

				return {
					originalFilename: file.name,
					mimeType,
					signedUploadUrl,
					storageKey,
					uploadHeaders: {
						'content-type': mimeType
					}
				};
			})
		);
	} catch (error) {
		throw translateUploadError(error);
	}
}

export async function finalizeUploadedSongFiles({
	uploads,
	songId,
	userId,
	supabase
}: FinalizeUploadInput): Promise<UploadResult> {
	const validationMessage = validatePreparedUploads(uploads, userId, songId);

	if (validationMessage) {
		throw new Error(validationMessage);
	}

	const uploadedStorageKeys = uploads.map((upload) => upload.storageKey);
	const insertedNoteFileIds: string[] = [];
	let nextSortOrder = (await getCurrentSortOrder(supabase, userId, songId)) + 1;
	let totalPageCount = 0;

	try {
		for (const upload of uploads) {
			const mimeType = getMimeType({
				name: upload.originalFilename,
				type: upload.mimeType
			});

			if (!mimeType) {
				throw new Error(`${upload.originalFilename} is not supported.`);
			}

			const fileBytes =
				mimeType === 'application/pdf' ? await getUploadedObjectBytes(upload.storageKey) : null;
			const pageCount = fileBytes ? await getPageCount(fileBytes, mimeType) : 1;

			if (!fileBytes) {
				await assertUploadedObjectExists(upload.storageKey);
			}

			const { data: insertedNoteFile, error: noteFileError } = await supabase
				.from('note_files')
				.insert({
					user_id: userId,
					song_id: songId,
					storage_provider: STORAGE_PROVIDER,
					storage_key: upload.storageKey,
					original_filename: upload.originalFilename,
					mime_type: mimeType,
					page_count: pageCount
				})
				.select('id')
				.single();

			if (noteFileError || !insertedNoteFile) {
				throw new Error('Could not save the uploaded file metadata.');
			}

			insertedNoteFileIds.push(insertedNoteFile.id);

			const notePages = Array.from({ length: pageCount }, (_, pageIndex) => ({
				user_id: userId,
				song_id: songId,
				note_file_id: insertedNoteFile.id,
				page_number: pageIndex + 1,
				sort_order: nextSortOrder + pageIndex,
				preview_key: null
			}));

			const { error: notePagesError } = await supabase.from('note_pages').insert(notePages);

			if (notePagesError) {
				throw new Error('Could not save the uploaded page order.');
			}

			nextSortOrder += pageCount;
			totalPageCount += pageCount;
		}

		await supabase
			.from('songs')
			.update({ updated_at: new Date().toISOString() })
			.eq('id', songId)
			.eq('user_id', userId);

		return {
			fileCount: uploads.length,
			pageCount: totalPageCount
		};
	} catch (error) {
		await removeInsertedNoteFiles(supabase, userId, songId, insertedNoteFileIds);
		await removeUploadedObjects(uploadedStorageKeys);
		throw translateUploadError(error);
	}
}

export async function cleanupPreparedUploads(storageKeys: string[]) {
	await removeUploadedObjects(storageKeys);
}
