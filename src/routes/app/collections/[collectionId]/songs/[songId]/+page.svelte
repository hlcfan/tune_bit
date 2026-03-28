<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';

	type PreparedUpload = {
		originalFilename: string;
		mimeType: string;
		signedUploadUrl: string;
		storageKey: string;
		uploadHeaders: Record<string, string>;
	};

	type UploadProgressItem = {
		fileName: string;
		progress: number;
		status: 'pending' | 'uploading' | 'uploaded' | 'failed';
	};

	let { data } = $props();
	let uploadInput = $state<HTMLInputElement | null>(null);
	let uploadFiles = $state<string[]>([]);
	let uploadProgressItems = $state<UploadProgressItem[]>([]);
	let feedbackMessage = $state('');
	let isFeedbackError = $state(false);
	let isUploading = $state(false);

	const feedbackClass = $derived(
		isFeedbackError
			? 'border-destructive/30 bg-destructive/5 text-destructive'
			: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
	);
	const totalPages = $derived(data.notePages.length);

	$effect(() => {
		if (data.message) {
			feedbackMessage = data.message;
			isFeedbackError = false;
		}
	});

	function getDateLabel(timestamp: string) {
		return new Date(timestamp).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getFileName(noteFileId: string) {
		return (
			data.noteFiles.find((noteFile: { id: string }) => noteFile.id === noteFileId)
				?.original_filename ?? 'Uploaded file'
		);
	}

	function getMimeLabel(mimeType: string) {
		if (mimeType === 'application/pdf') {
			return 'PDF';
		}

		if (mimeType === 'image/jpeg') {
			return 'JPG';
		}

		if (mimeType === 'image/png') {
			return 'PNG';
		}

		if (mimeType === 'image/webp') {
			return 'WEBP';
		}

		return mimeType;
	}

	function updateUploadFiles() {
		const selectedFiles = Array.from(uploadInput?.files ?? []);
		uploadFiles = selectedFiles.map((file) => file.name);
		uploadProgressItems = selectedFiles.map((file) => ({
			fileName: file.name,
			progress: 0,
			status: 'pending'
		}));
	}

	function getPrepareUploadPath() {
		return resolve('/app/collections/[collectionId]/songs/[songId]/uploads/prepare', {
			collectionId: data.collection.id,
			songId: data.song.id
		});
	}

	function getFinalizeUploadPath() {
		return resolve('/app/collections/[collectionId]/songs/[songId]/uploads/finalize', {
			collectionId: data.collection.id,
			songId: data.song.id
		});
	}

	function getCleanupUploadPath() {
		return resolve('/app/collections/[collectionId]/songs/[songId]/uploads/cleanup', {
			collectionId: data.collection.id,
			songId: data.song.id
		});
	}

	function getSelectedFiles() {
		return Array.from(uploadInput?.files ?? []).filter((file) => file.size > 0);
	}

	function updateUploadProgressItem(
		fileName: string,
		progress: number,
		status: UploadProgressItem['status']
	) {
		uploadProgressItems = uploadProgressItems.map((item) =>
			item.fileName === fileName
				? {
						...item,
						progress,
						status
					}
				: item
		);
	}

	function getProgressStatusLabel(status: UploadProgressItem['status']) {
		if (status === 'uploaded') {
			return 'Uploaded';
		}

		if (status === 'uploading') {
			return 'Uploading';
		}

		if (status === 'failed') {
			return 'Failed';
		}

		return 'Waiting';
	}

	function getProgressBarClass(status: UploadProgressItem['status']) {
		if (status === 'uploaded') {
			return 'bg-emerald-500';
		}

		if (status === 'failed') {
			return 'bg-destructive';
		}

		return 'bg-foreground';
	}

	function uploadFileWithProgress(file: File, upload: PreparedUpload) {
		return new Promise<void>((resolveUpload, rejectUpload) => {
			const request = new XMLHttpRequest();

			request.open('PUT', upload.signedUploadUrl);

			for (const [headerName, headerValue] of Object.entries(upload.uploadHeaders)) {
				request.setRequestHeader(headerName, headerValue);
			}

			request.upload.addEventListener('progress', (event) => {
				if (!event.lengthComputable) {
					updateUploadProgressItem(file.name, 0, 'uploading');
					return;
				}

				const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
				updateUploadProgressItem(file.name, progress, 'uploading');
			});

			request.addEventListener('load', () => {
				if (request.status >= 200 && request.status < 300) {
					updateUploadProgressItem(file.name, 100, 'uploaded');
					resolveUpload();
					return;
				}

				updateUploadProgressItem(file.name, 0, 'failed');
				rejectUpload(new Error(`Could not upload ${file.name} to storage.`));
			});

			request.addEventListener('error', () => {
				updateUploadProgressItem(file.name, 0, 'failed');
				rejectUpload(new Error(`Could not upload ${file.name} to storage.`));
			});

			request.addEventListener('abort', () => {
				updateUploadProgressItem(file.name, 0, 'failed');
				rejectUpload(new Error(`Could not upload ${file.name} to storage.`));
			});

			updateUploadProgressItem(file.name, 0, 'uploading');
			request.send(file);
		});
	}

	async function readJsonResponse(response: Response) {
		const body = await response.json().catch(() => null);

		if (!response.ok) {
			throw new Error(
				body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
					? body.message
					: 'Upload failed. Try again in a moment.'
			);
		}

		return body;
	}

	async function cleanupUploads(uploads: PreparedUpload[]) {
		if (uploads.length === 0) {
			return;
		}

		await fetch(getCleanupUploadPath(), {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({ uploads })
		});
	}

	async function handleUploadSubmit(event: SubmitEvent) {
		event.preventDefault();

		const files = getSelectedFiles();

		if (files.length === 0) {
			feedbackMessage = 'Choose one or more PDF or image files to upload.';
			isFeedbackError = true;
			return;
		}

		isUploading = true;
		feedbackMessage = '';
		isFeedbackError = false;

		let uploads: PreparedUpload[] = [];
		let didFinalize = false;

		try {
			const prepareResponse = await fetch(getPrepareUploadPath(), {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					files: files.map((file) => ({
						name: file.name,
						size: file.size,
						type: file.type
					}))
				})
			});
			const prepareBody = (await readJsonResponse(prepareResponse)) as {
				uploads: PreparedUpload[];
			};

			uploads = prepareBody.uploads ?? [];

			for (const [index, upload] of uploads.entries()) {
				const file = files[index];

				if (!file) {
					throw new Error('Could not match the selected files to the upload plan.');
				}

				await uploadFileWithProgress(file, upload);
			}

			const finalizeResponse = await fetch(getFinalizeUploadPath(), {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ uploads })
			});
			const finalizeBody = (await readJsonResponse(finalizeResponse)) as {
				message: string;
			};

			didFinalize = true;
			feedbackMessage = finalizeBody.message;
			isFeedbackError = false;
			uploadFiles = [];

			if (uploadInput) {
				uploadInput.value = '';
			}

			await invalidateAll();
		} catch (error) {
			if (!didFinalize) {
				await cleanupUploads(uploads).catch(() => null);
			}

			feedbackMessage =
				error instanceof Error ? error.message : 'Upload failed. Try again in a moment.';
			isFeedbackError = true;
		} finally {
			isUploading = false;
		}
	}
</script>

<svelte:head>
	<title>Tune Bit | {data.song.title}</title>
	<meta
		name="description"
		content="Upload PDF and image note files into a Tune Bit song with secure private storage."
	/>
</svelte:head>

<div class="space-y-8">
	<section class="flex flex-wrap items-center gap-3">
		<a
			class={buttonVariants({ variant: 'outline' })}
			href={resolve('/app/collections/[collectionId]', {
				collectionId: data.collection.id
			})}
		>
			Back to collection
		</a>
		<Badge variant="outline">{data.noteFiles.length} files</Badge>
		<Badge variant="outline">{totalPages} pages</Badge>
	</section>

	<section class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
		<Card class="border-border/70 bg-card/90">
			<CardHeader class="space-y-4">
				<Badge variant="outline" class="w-fit">Song workspace</Badge>
				<div class="space-y-3">
					<CardTitle class="max-w-3xl text-4xl leading-tight font-semibold tracking-tight">
						{data.song.title}
					</CardTitle>
					<CardDescription class="max-w-2xl text-base leading-7">
						Add uploads directly to this song. Tune Bit keeps the source files private and stores
						page ordering metadata for the next viewer phase.
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent class="grid gap-4 sm:grid-cols-3">
				<div class="rounded-2xl border border-dashed px-4 py-4">
					<p class="text-sm text-muted-foreground">Collection</p>
					<p class="mt-2 font-medium">{data.collection.name}</p>
				</div>
				<div class="rounded-2xl border border-dashed px-4 py-4">
					<p class="text-sm text-muted-foreground">Uploaded files</p>
					<p class="mt-2 font-medium">{data.noteFiles.length}</p>
				</div>
				<div class="rounded-2xl border border-dashed px-4 py-4">
					<p class="text-sm text-muted-foreground">Stored pages</p>
					<p class="mt-2 font-medium">{totalPages}</p>
				</div>
			</CardContent>
		</Card>

		<Card class="border-border/70">
			<CardHeader>
				<Badge variant="outline" class="w-fit">Upload files</Badge>
				<CardTitle>Add PDF or image note files</CardTitle>
				<CardDescription>
					Each image becomes one page. PDFs stay intact and create ordered page metadata for every
					page after the browser sends the file straight to private R2 storage.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if feedbackMessage}
					<p class={`rounded-xl border px-3 py-2 text-sm ${feedbackClass}`}>
						{feedbackMessage}
					</p>
				{/if}

				<form class="space-y-5" onsubmit={handleUploadSubmit}>
					<div class="space-y-2">
						<label class="text-sm font-medium" for="song-upload-files">Files</label>
						<div class="relative rounded-2xl border border-dashed px-5 py-8 text-center">
							<input
								bind:this={uploadInput}
								id="song-upload-files"
								type="file"
								name="files"
								accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
								multiple
								required
								class="absolute inset-0 cursor-pointer opacity-0"
								onchange={updateUploadFiles}
							/>
							<div class="space-y-2">
								<p class="font-medium">Drop files here or click to browse</p>
								<p class="text-sm text-muted-foreground">
									Supports PDF, JPG, JPEG, PNG, and WEBP. The browser uploads directly to R2 with a
									short-lived signed URL.
								</p>
							</div>
						</div>
					</div>

					{#if uploadFiles.length > 0}
						<div class="rounded-2xl border px-4 py-4">
							<p class="text-sm font-medium">Ready to upload</p>
							<div class="mt-3 flex flex-wrap gap-2">
								{#each uploadFiles as fileName, index (`${fileName}-${index}`)}
									<Badge variant="outline">{fileName}</Badge>
								{/each}
							</div>
						</div>
					{/if}

					{#if uploadProgressItems.length > 0}
						<div class="rounded-2xl border px-4 py-4">
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm font-medium">Upload progress</p>
								<p class="text-sm text-muted-foreground">
									{uploadProgressItems.filter((item) => item.status === 'uploaded')
										.length}/{uploadProgressItems.length}
									uploaded
								</p>
							</div>
							<div class="mt-4 space-y-3">
								{#each uploadProgressItems as item (`${item.fileName}-${item.status}-${item.progress}`)}
									<div class="space-y-2">
										<div class="flex items-center justify-between gap-3 text-sm">
											<p class="truncate font-medium">{item.fileName}</p>
											<span class="shrink-0 text-muted-foreground">
												{getProgressStatusLabel(item.status)} · {item.progress}%
											</span>
										</div>
										<div class="h-2 overflow-hidden rounded-full bg-muted">
											<div
												class={`h-full transition-all ${getProgressBarClass(item.status)}`}
												style={`width: ${item.progress}%`}
											></div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<Button class="w-full" type="submit" disabled={isUploading}>
						{isUploading ? 'Uploading files…' : 'Upload files'}
					</Button>
				</form>
			</CardContent>
		</Card>
	</section>

	<section class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
		<Card class="border-border/70">
			<CardHeader>
				<CardTitle>Uploaded files</CardTitle>
				<CardDescription
					>Review the original assets currently attached to this song.</CardDescription
				>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if data.noteFiles.length === 0}
					<div class="rounded-2xl border border-dashed px-4 py-8 text-center">
						<p class="text-base font-medium">No files uploaded yet</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Upload the first note file to create file and page metadata for this song.
						</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each data.noteFiles as noteFile (noteFile.id)}
							<div class="rounded-2xl border px-4 py-4">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="space-y-1">
										<p class="font-medium break-all">{noteFile.original_filename}</p>
										<p class="text-sm text-muted-foreground">
											Uploaded {getDateLabel(noteFile.created_at)}
										</p>
									</div>
									<Badge variant="outline">{getMimeLabel(noteFile.mime_type)}</Badge>
								</div>
								<div class="mt-4 grid gap-3 sm:grid-cols-2">
									<div class="rounded-2xl border border-dashed px-4 py-4">
										<p class="text-sm text-muted-foreground">Pages created</p>
										<p class="mt-2 font-medium">{noteFile.page_count}</p>
									</div>
									<div class="rounded-2xl border border-dashed px-4 py-4">
										<p class="text-sm text-muted-foreground">Storage scope</p>
										<p class="mt-2 font-medium">Private R2 object</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<Card class="border-border/70">
			<CardHeader>
				<CardTitle>Page order</CardTitle>
				<CardDescription>
					Each upload appends pages in reading order so the viewer can render them later.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if data.notePages.length === 0}
					<div class="rounded-2xl border border-dashed px-4 py-8 text-center">
						<p class="text-base font-medium">No pages yet</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Page rows appear here after the first successful upload.
						</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each data.notePages as notePage (notePage.id)}
							<div
								class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
							>
								<div class="space-y-1">
									<p class="font-medium">
										#{notePage.sort_order + 1} · {getFileName(notePage.note_file_id)}
									</p>
									<p class="text-sm text-muted-foreground">Source page {notePage.page_number}</p>
								</div>
								<Badge variant="outline">Order {notePage.sort_order + 1}</Badge>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	</section>
</div>
