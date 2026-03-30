<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import FeedbackFlash from '$lib/components/feedback-flash.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	type Collection = {
		id: string;
		name: string;
	};

	type PreparedUpload = {
		originalFilename: string;
		mimeType: string;
		signedUploadUrl: string;
		storageKey: string;
		uploadHeaders: Record<string, string>;
	};

	type UploadProgressItem = {
		id: string;
		fileName: string;
		progress: number;
		status: 'pending' | 'uploading' | 'uploaded' | 'failed';
	};

	type QuickUploadResponse = {
		redirectTo: string;
		collectionId: string;
		songId: string;
		uploads: PreparedUpload[];
	};

	let { data, form } = $props();
	let uploadInput = $state<HTMLInputElement | null>(null);
	let selectedUploadFiles = $state<File[]>([]);
	let uploadProgressItems = $state<UploadProgressItem[]>([]);
	let clientFeedbackMessage = $state('');
	let isFeedbackError = $state(false);
	let isUploading = $state(false);
	let isDragActive = $state(false);

	const collections = $derived((data.collections ?? []) as Collection[]);
	const selectedCollectionId = $derived(
		form?.intent === 'createSong' && 'collectionId' in form
			? form.collectionId
			: data.selectedCollectionId
	);
	const selectedCollection = $derived(
		collections.find((collection) => collection.id === selectedCollectionId) ?? null
	);
	const songTitle = $derived(form?.intent === 'createSong' && 'title' in form ? form.title : '');
	const formFeedbackMessage = $derived(form?.message ?? '');
	const feedbackMessage = $derived(clientFeedbackMessage || formFeedbackMessage);
	const feedbackClass = $derived(
		clientFeedbackMessage
			? isFeedbackError
				? 'border-destructive/30 bg-destructive/5 text-destructive'
				: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
			: form && 'success' in form && form.success
				? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
				: 'border-destructive/30 bg-destructive/5 text-destructive'
	);
	const selectedUploadEntries = $derived(
		selectedUploadFiles.map((file, index) => ({
			file,
			progressItemId: getUploadProgressItemId(file, index)
		}))
	);
	const selectedUploadCountLabel = $derived(
		`${selectedUploadFiles.length} file${selectedUploadFiles.length === 1 ? '' : 's'} selected`
	);
	const submitLabel = $derived(
		isUploading
			? 'Uploading files…'
			: selectedUploadFiles.length > 0
				? 'Add song and upload files'
				: 'Add song'
	);

	function getUploadProgressItemId(file: File, index: number) {
		return `${index}-${file.name}-${file.lastModified}-${file.size}`;
	}

	function getFileTypeLabel(file: File) {
		if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
			return 'PDF';
		}

		return 'Image';
	}

	function formatFileSize(size: number) {
		if (size < 1024 * 1024) {
			return `${Math.max(1, Math.round(size / 1024))} KB`;
		}

		return `${(size / (1024 * 1024)).toFixed(1)} MB`;
	}

	function syncUploadInputFiles(files: File[]) {
		if (!browser || !uploadInput || typeof DataTransfer === 'undefined') {
			return;
		}

		const dataTransfer = new DataTransfer();

		for (const file of files) {
			dataTransfer.items.add(file);
		}

		uploadInput.files = dataTransfer.files;
	}

	function setSelectedUploadFiles(files: File[]) {
		selectedUploadFiles = files.filter((file) => file.size > 0);
		uploadProgressItems = selectedUploadFiles.map((file, index) => ({
			id: getUploadProgressItemId(file, index),
			fileName: file.name,
			progress: 0,
			status: 'pending'
		}));
	}

	function clearSelectedUploadFiles() {
		selectedUploadFiles = [];
		uploadProgressItems = [];

		if (uploadInput) {
			uploadInput.value = '';
		}
	}

	function updateUploadFiles() {
		setSelectedUploadFiles(Array.from(uploadInput?.files ?? []));
	}

	function openFilePicker() {
		uploadInput?.click();
	}

	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		isDragActive = true;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragActive = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();

		if (event.currentTarget === event.target) {
			isDragActive = false;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragActive = false;

		const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
		syncUploadInputFiles(droppedFiles);
		setSelectedUploadFiles(droppedFiles);
	}

	function updateUploadProgressItem(
		progressItemId: string,
		progress: number,
		status: UploadProgressItem['status']
	) {
		uploadProgressItems = uploadProgressItems.map((item) =>
			item.id === progressItemId
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

	function uploadFileWithProgress(file: File, upload: PreparedUpload, progressItemId: string) {
		return new Promise<void>((resolveUpload, rejectUpload) => {
			const request = new XMLHttpRequest();

			request.open('PUT', upload.signedUploadUrl);

			for (const [headerName, headerValue] of Object.entries(upload.uploadHeaders)) {
				request.setRequestHeader(headerName, headerValue);
			}

			request.upload.addEventListener('progress', (event) => {
				if (!event.lengthComputable) {
					updateUploadProgressItem(progressItemId, 0, 'uploading');
					return;
				}

				const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
				updateUploadProgressItem(progressItemId, progress, 'uploading');
			});

			request.addEventListener('load', () => {
				if (request.status >= 200 && request.status < 300) {
					updateUploadProgressItem(progressItemId, 100, 'uploaded');
					resolveUpload();
					return;
				}

				updateUploadProgressItem(progressItemId, 0, 'failed');
				rejectUpload(new Error(`Could not upload ${file.name} to storage.`));
			});

			request.addEventListener('error', () => {
				updateUploadProgressItem(progressItemId, 0, 'failed');
				rejectUpload(new Error(`Could not upload ${file.name} to storage.`));
			});

			request.addEventListener('abort', () => {
				updateUploadProgressItem(progressItemId, 0, 'failed');
				rejectUpload(new Error(`Could not upload ${file.name} to storage.`));
			});

			updateUploadProgressItem(progressItemId, 0, 'uploading');
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

	function getQuickUploadPath() {
		return '/app/songs/new/quick-upload';
	}

	function getFinalizeUploadPath(collectionId: string, songId: string) {
		return resolve('/app/collections/[collectionId]/songs/[songId]/uploads/finalize', {
			collectionId,
			songId
		});
	}

	function getCleanupUploadPath(collectionId: string, songId: string) {
		return resolve('/app/collections/[collectionId]/songs/[songId]/uploads/cleanup', {
			collectionId,
			songId
		});
	}

	async function cleanupUploads(collectionId: string, songId: string, uploads: PreparedUpload[]) {
		if (uploads.length === 0) {
			return;
		}

		await fetch(getCleanupUploadPath(collectionId, songId), {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({ uploads })
		});
	}

	function buildSongPathWithMessage(collectionId: string, songId: string, message: string) {
		const url = new URL(
			resolve('/app/collections/[collectionId]/songs/[songId]', {
				collectionId,
				songId
			}),
			browser ? window.location.origin : 'http://localhost'
		);
		url.searchParams.set('message', message);

		return `${url.pathname}${url.search}${url.hash}`;
	}

	async function handleCreateSongSubmit(event: SubmitEvent) {
		if (selectedUploadFiles.length === 0 || isUploading) {
			return;
		}

		event.preventDefault();

		const formElement = event.currentTarget as HTMLFormElement;
		const formData = new FormData(formElement);
		const title = formData.get('title');
		const collectionId = formData.get('collectionId');
		const files = selectedUploadFiles;

		isUploading = true;
		clientFeedbackMessage = '';
		isFeedbackError = false;

		let uploads: PreparedUpload[] = [];
		let quickUploadResult: QuickUploadResponse | null = null;

		try {
			const quickUploadResponse = await fetch(getQuickUploadPath(), {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					title: typeof title === 'string' ? title : '',
					collectionId: typeof collectionId === 'string' ? collectionId : '',
					files: files.map((file) => ({
						name: file.name,
						size: file.size,
						type: file.type
					}))
				})
			});
			quickUploadResult = (await readJsonResponse(quickUploadResponse)) as QuickUploadResponse;
			uploads = quickUploadResult.uploads ?? [];

			if (uploads.length !== files.length) {
				throw new Error('Could not confirm an upload plan for every selected file.');
			}

			for (const [index, upload] of uploads.entries()) {
				const file = files[index];
				const progressItem = uploadProgressItems[index];

				if (!file || !progressItem || upload.originalFilename !== file.name) {
					throw new Error('Could not match the selected files to the upload plan.');
				}

				await uploadFileWithProgress(file, upload, progressItem.id);
			}

			const finalizeResponse = await fetch(
				getFinalizeUploadPath(quickUploadResult.collectionId, quickUploadResult.songId),
				{
					method: 'POST',
					headers: {
						'content-type': 'application/json'
					},
					body: JSON.stringify({ uploads })
				}
			);
			const finalizeBody = (await readJsonResponse(finalizeResponse)) as {
				message: string;
			};

			clearSelectedUploadFiles();
			isDragActive = false;
			if (browser) {
				window.location.assign(
					buildSongPathWithMessage(
						quickUploadResult.collectionId,
						quickUploadResult.songId,
						finalizeBody.message
					)
				);
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Upload failed. Try again in a moment.';

			if (quickUploadResult) {
				await cleanupUploads(
					quickUploadResult.collectionId,
					quickUploadResult.songId,
					uploads
				).catch(() => null);
				if (browser) {
					window.location.assign(
						buildSongPathWithMessage(
							quickUploadResult.collectionId,
							quickUploadResult.songId,
							message
						)
					);
				}
				return;
			}

			clientFeedbackMessage = message;
			isFeedbackError = true;
		} finally {
			isUploading = false;
		}
	}
</script>

<svelte:head>
	<title>Tune Bit | Add a Song</title>
	<meta
		name="description"
		content="Add a song in Tune Bit, choose its collection, and optionally upload note files in the same flow."
	/>
</svelte:head>

<div class="space-y-6">
	<section class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
		<div class="space-y-3">
			<div class="flex flex-wrap items-center gap-3">
				{#if selectedCollection}
					<a
						class={buttonVariants({ variant: 'outline' })}
						href={resolve('/app/collections/[collectionId]', {
							collectionId: selectedCollection.id
						})}
					>
						Back
					</a>
				{:else}
					<a class={buttonVariants({ variant: 'outline' })} href={resolve('/home')}>Back</a>
				{/if}
				<Badge variant="outline">Add a song</Badge>
				{#if collections.length > 0}
					<Badge variant="outline">{collections.length} collections</Badge>
				{/if}
			</div>

			<div class="space-y-2">
				<h1 class="text-4xl font-semibold tracking-tight">Add a song</h1>
				<p class="max-w-4xl text-base text-muted-foreground">
					Enter the song details on the left, then drag note files into the upload area on the right
					if you want to start the song with files already attached.
				</p>
			</div>
		</div>
	</section>

	{#if feedbackMessage}
		<FeedbackFlash message={feedbackMessage} class={feedbackClass} />
	{/if}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
		<section class="space-y-6">
			<Card class="border-border/70">
				<CardHeader class="space-y-2">
					<CardTitle>Song details</CardTitle>
					<CardDescription>
						Tune Bit keeps the current collection selected when you start here from a collection
						page and falls back to your most recently updated collection from the library home.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-5">
					<form
						method="POST"
						action="?/createSong"
						class="space-y-5"
						onsubmit={handleCreateSongSubmit}
					>
						<div class="space-y-2">
							<label class="text-sm font-medium" for="song-title">Song title</label>
							<Input
								id="song-title"
								name="title"
								maxlength={200}
								placeholder="Autumn Leaves"
								required
								value={songTitle}
								disabled={isUploading}
							/>
						</div>

						<div class="space-y-2">
							<label class="text-sm font-medium" for="collection-id">Collection</label>
							<select
								id="collection-id"
								name="collectionId"
								class="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
								disabled={isUploading}
							>
								{#if collections.length === 0}
									<option
										value={data.defaultCollectionValue}
										selected={selectedCollectionId === data.defaultCollectionValue}
									>
										Create {data.defaultCollectionName}
									</option>
								{:else}
									{#each collections as collection (collection.id)}
										<option value={collection.id} selected={selectedCollectionId === collection.id}>
											{collection.name}
										</option>
									{/each}
								{/if}
							</select>
						</div>

						<div class="space-y-3">
							<Button class="w-full sm:w-auto" type="submit" disabled={isUploading}>
								{submitLabel}
							</Button>
							<p class="text-sm leading-6 text-muted-foreground">
								If you leave the upload side empty, Tune Bit opens the new song right away so you
								can add files later.
							</p>
						</div>
					</form>
				</CardContent>
			</Card>
		</section>

		<section class="space-y-6">
			<Card class="border-border/70">
				<CardHeader class="space-y-2">
					<CardTitle>Upload files</CardTitle>
				</CardHeader>
				<CardContent class="space-y-5">
					<div
						class={`relative rounded-3xl border border-dashed px-6 py-12 text-center transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}`}
						ondragenter={handleDragEnter}
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
						ondrop={handleDrop}
						role="button"
						tabindex="0"
					>
						<input
							bind:this={uploadInput}
							id="song-upload-files"
							type="file"
							name="files"
							accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
							multiple
							class="absolute inset-0 cursor-pointer opacity-0"
							disabled={isUploading}
							onchange={updateUploadFiles}
						/>
						<div class="flex flex-col items-center gap-4">
							<Badge variant="outline">
								{selectedUploadFiles.length > 0 ? selectedUploadCountLabel : 'Optional'}
							</Badge>
							<div class="space-y-2">
								<p class="text-lg font-medium">Drag and drop files here</p>
								<p class="max-w-2xl text-sm leading-6 text-muted-foreground">
									Supports PDF, JPG, JPEG, PNG, and WEBP. Files upload after the song is created.
								</p>
							</div>
							<Button
								type="button"
								variant="outline"
								onclick={openFilePicker}
								disabled={isUploading}
							>
								Browse files
							</Button>
						</div>
					</div>

					{#if selectedUploadEntries.length > 0}
						<div class="space-y-4 rounded-2xl border px-4 py-4">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<p class="text-sm font-medium">Selected files</p>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onclick={clearSelectedUploadFiles}
									disabled={isUploading}
								>
									Clear
								</Button>
							</div>

							<div class="space-y-3">
								{#each selectedUploadEntries as { file, progressItemId } (progressItemId)}
									<div class="rounded-2xl border border-border/70 px-4 py-4">
										<div class="flex flex-wrap items-start justify-between gap-3">
											<div class="min-w-0 space-y-2">
												<p class="font-medium break-all">{file.name}</p>
												<div
													class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
												>
													<Badge variant="outline">{getFileTypeLabel(file)}</Badge>
													<span>{formatFileSize(file.size)}</span>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if uploadProgressItems.length > 0}
						<div aria-live="polite" class="rounded-2xl border px-4 py-4">
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm font-medium">Upload progress</p>
								<p class="text-sm text-muted-foreground">
									{uploadProgressItems.filter((item) => item.status === 'uploaded').length}/
									{uploadProgressItems.length}
									uploaded
								</p>
							</div>
							<div class="mt-4 space-y-3">
								{#each uploadProgressItems as item (item.id)}
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
				</CardContent>
			</Card>
		</section>
	</div>
</div>
