<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

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

	let { data, form } = $props();
	let quickUploadDialog = $state<HTMLDialogElement | null>(null);
	let quickUploadInput = $state<HTMLInputElement | null>(null);
	let quickUploadFiles = $state<string[]>([]);
	let quickUploadProgressItems = $state<UploadProgressItem[]>([]);
	let quickUploadTitle = $state('');
	let quickUploadMessage = $state('');
	let isQuickUploadError = $state(false);
	let isQuickUploading = $state(false);

	const libraryPath = resolve('/app');
	const createSongTitle = $derived(
		form?.intent === 'createSong' && 'title' in form ? form.title : ''
	);
	const renameCollectionName = $derived(
		form?.intent === 'renameCollection' && 'name' in form ? form.name : data.collection.name
	);
	const feedbackMessage = $derived(form?.message ?? data.message);
	const feedbackClass = $derived(
		form?.success || data.message
			? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
			: 'border-destructive/30 bg-destructive/5 text-destructive'
	);
	const quickUploadFeedbackClass = $derived(
		isQuickUploadError
			? 'border-destructive/30 bg-destructive/5 text-destructive'
			: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
	);
	const totalUploadedFiles = $derived(
		data.songs.reduce((runningTotal: number, song: { fileCount: number }) => {
			return runningTotal + song.fileCount;
		}, 0)
	);
	const totalUploadedPages = $derived(
		data.songs.reduce((runningTotal: number, song: { pageCount: number }) => {
			return runningTotal + song.pageCount;
		}, 0)
	);

	function getSongTitle(song: { id: string; title: string }) {
		if (form?.intent === 'renameSong' && form?.targetId === song.id && 'title' in form) {
			return form.title;
		}

		return song.title;
	}

	function getDateLabel(timestamp: string) {
		return new Date(timestamp).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function openQuickUpload() {
		quickUploadDialog?.showModal();
	}

	function closeQuickUpload() {
		quickUploadDialog?.close();
	}

	function updateQuickUploadFiles() {
		const selectedFiles = Array.from(quickUploadInput?.files ?? []);
		quickUploadFiles = selectedFiles.map((file) => file.name);
		quickUploadProgressItems = selectedFiles.map((file) => ({
			fileName: file.name,
			progress: 0,
			status: 'pending'
		}));
	}

	function getQuickUploadSelectedFiles() {
		return Array.from(quickUploadInput?.files ?? []).filter((file) => file.size > 0);
	}

	function updateQuickUploadProgressItem(
		fileName: string,
		progress: number,
		status: UploadProgressItem['status']
	) {
		quickUploadProgressItems = quickUploadProgressItems.map((item) =>
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
					updateQuickUploadProgressItem(file.name, 0, 'uploading');
					return;
				}

				const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
				updateQuickUploadProgressItem(file.name, progress, 'uploading');
			});

			request.addEventListener('load', () => {
				if (request.status >= 200 && request.status < 300) {
					updateQuickUploadProgressItem(file.name, 100, 'uploaded');
					resolveUpload();
					return;
				}

				updateQuickUploadProgressItem(file.name, 0, 'failed');
				rejectUpload(new Error(`Could not upload ${file.name} to storage.`));
			});

			request.addEventListener('error', () => {
				updateQuickUploadProgressItem(file.name, 0, 'failed');
				rejectUpload(new Error(`Could not upload ${file.name} to storage.`));
			});

			request.addEventListener('abort', () => {
				updateQuickUploadProgressItem(file.name, 0, 'failed');
				rejectUpload(new Error(`Could not upload ${file.name} to storage.`));
			});

			updateQuickUploadProgressItem(file.name, 0, 'uploading');
			request.send(file);
		});
	}

	function getQuickUploadPath() {
		return resolve('/app/collections/[collectionId]/quick-upload', {
			collectionId: data.collection.id
		});
	}

	function getFinalizeUploadPath(songId: string) {
		return resolve('/app/collections/[collectionId]/songs/[songId]/uploads/finalize', {
			collectionId: data.collection.id,
			songId
		});
	}

	function getCleanupUploadPath(songId: string) {
		return resolve('/app/collections/[collectionId]/songs/[songId]/uploads/cleanup', {
			collectionId: data.collection.id,
			songId
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

	async function cleanupUploads(songId: string, uploads: PreparedUpload[]) {
		if (!songId) {
			return;
		}

		await fetch(getCleanupUploadPath(songId), {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				deleteSong: true,
				uploads
			})
		});
	}

	async function handleQuickUploadSubmit(event: SubmitEvent) {
		event.preventDefault();

		const files = getQuickUploadSelectedFiles();
		const title = quickUploadTitle.trim();

		if (!title) {
			quickUploadMessage = 'Enter a song name.';
			isQuickUploadError = true;
			return;
		}

		if (files.length === 0) {
			quickUploadMessage = 'Choose one or more PDF or image files to upload.';
			isQuickUploadError = true;
			return;
		}

		isQuickUploading = true;
		quickUploadMessage = '';
		isQuickUploadError = false;

		let uploads: PreparedUpload[] = [];
		let songId = '';
		let didFinalize = false;

		try {
			const prepareResponse = await fetch(getQuickUploadPath(), {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					title,
					files: files.map((file) => ({
						name: file.name,
						size: file.size,
						type: file.type
					}))
				})
			});
			const prepareBody = (await readJsonResponse(prepareResponse)) as {
				redirectTo: string;
				songId: string;
				songTitle: string;
				uploads: PreparedUpload[];
			};

			songId = prepareBody.songId;
			uploads = prepareBody.uploads ?? [];

			for (const [index, upload] of uploads.entries()) {
				const file = files[index];

				if (!file) {
					throw new Error('Could not match the selected files to the upload plan.');
				}

				await uploadFileWithProgress(file, upload);
			}

			const finalizeResponse = await fetch(getFinalizeUploadPath(songId), {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ uploads })
			});
			await readJsonResponse(finalizeResponse);

			didFinalize = true;
			const songPath = resolve('/app/collections/[collectionId]/songs/[songId]', {
				collectionId: data.collection.id,
				songId
			});
			await goto(songPath);
		} catch (error) {
			if (!didFinalize) {
				await cleanupUploads(songId, uploads).catch(() => null);
			}

			quickUploadMessage =
				error instanceof Error ? error.message : 'Upload failed. Try again in a moment.';
			isQuickUploadError = true;

			if (quickUploadDialog && !quickUploadDialog.open) {
				quickUploadDialog.showModal();
			}
		} finally {
			isQuickUploading = false;
		}
	}
</script>

<svelte:head>
	<title>Tune Bit | {data.collection.name}</title>
	<meta
		name="description"
		content="Manage songs and launch secure uploads inside a Tune Bit collection."
	/>
</svelte:head>

<div class="space-y-8">
	<section class="flex flex-wrap items-center gap-3">
		<a class={buttonVariants({ variant: 'outline' })} href={libraryPath}>Back to library</a>
		<Badge variant="outline">{data.songs.length} songs</Badge>
		<Button type="button" onclick={openQuickUpload}>Quick upload</Button>
	</section>

	<section class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
		<Card class="border-border/70 bg-card/90">
			<CardHeader class="space-y-4">
				<Badge variant="outline" class="w-fit">Phase 5 uploads</Badge>
				<div class="space-y-3">
					<CardTitle class="max-w-3xl text-4xl leading-tight font-semibold tracking-tight">
						{data.collection.name}
					</CardTitle>
					<CardDescription class="max-w-2xl text-base leading-7">
						Launch uploads from this collection or open a song workspace to issue short-lived R2
						upload URLs from the app and send files straight from the browser.
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent class="grid gap-4 sm:grid-cols-3">
				<div class="rounded-2xl border border-dashed px-4 py-4">
					<p class="text-sm text-muted-foreground">Songs in this collection</p>
					<p class="mt-2 font-medium">{data.songs.length}</p>
				</div>
				<div class="rounded-2xl border border-dashed px-4 py-4">
					<p class="text-sm text-muted-foreground">Uploaded files</p>
					<p class="mt-2 font-medium">{totalUploadedFiles}</p>
				</div>
				<div class="rounded-2xl border border-dashed px-4 py-4">
					<p class="text-sm text-muted-foreground">Stored pages</p>
					<p class="mt-2 font-medium">{totalUploadedPages}</p>
				</div>
				<div class="rounded-2xl border border-dashed px-4 py-4 sm:col-span-3">
					<p class="text-sm text-muted-foreground">Last updated</p>
					<p class="mt-2 font-medium">{getDateLabel(data.collection.updated_at)}</p>
				</div>
			</CardContent>
		</Card>

		<Card class="border-border/70">
			<CardHeader>
				<Badge variant="outline" class="w-fit">Create song</Badge>
				<CardTitle>Add a song to this collection</CardTitle>
				<CardDescription>
					Each song becomes the future container for uploaded note pages and the reading view.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<form method="POST" action="?/createSong" class="space-y-4">
					<div class="space-y-2">
						<label class="text-sm font-medium" for="song-title">Song title</label>
						<Input
							id="song-title"
							name="title"
							maxlength={200}
							placeholder="Autumn Leaves"
							required
							value={createSongTitle}
						/>
					</div>
					<Button class="w-full" type="submit">Create song</Button>
				</form>
				<div class="rounded-2xl border px-4 py-4 text-sm text-muted-foreground">
					<p class="font-medium text-foreground">Quick upload path</p>
					<p class="mt-2">
						Need to create a song and upload files in one step instead? Use the quick upload modal
						from this page.
					</p>
				</div>
			</CardContent>
		</Card>
	</section>

	<section class="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
		<Card class="border-border/70">
			<CardHeader>
				<CardTitle>Collection settings</CardTitle>
				<CardDescription>Rename the collection or remove it with all of its songs.</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<form method="POST" action="?/renameCollection" class="space-y-4">
					<div class="space-y-2">
						<label class="text-sm font-medium" for="collection-title">Collection name</label>
						<Input
							id="collection-title"
							name="name"
							maxlength={200}
							required
							value={renameCollectionName}
						/>
					</div>
					<Button type="submit" variant="outline">Save collection name</Button>
				</form>
			</CardContent>
			<CardFooter>
				<form method="POST" action="?/deleteCollection">
					<Button type="submit" variant="destructive">Delete collection</Button>
				</form>
			</CardFooter>
		</Card>

		<Card class="border-border/70">
			<CardHeader>
				<CardTitle>Songs</CardTitle>
				<CardDescription>
					Upload directly into a song, keep the ordering metadata current, and prepare each song for
					the viewer phase.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if feedbackMessage}
					<p class={`rounded-xl border px-3 py-2 text-sm ${feedbackClass}`}>
						{feedbackMessage}
					</p>
				{/if}

				{#if data.songs.length === 0}
					<div class="rounded-2xl border border-dashed px-4 py-8 text-center">
						<p class="text-base font-medium">No songs yet</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Add the first song in this collection or use quick upload to create one while sending
							files.
						</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each data.songs as song (song.id)}
							<div class="rounded-2xl border px-4 py-4">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="space-y-1">
										<p class="font-medium">{song.title}</p>
										<p class="text-sm text-muted-foreground">
											Updated {getDateLabel(song.updated_at)}
										</p>
										<p class="text-sm text-muted-foreground">
											{song.fileCount} files · {song.pageCount} pages
										</p>
									</div>
									<Badge variant="outline">Song</Badge>
								</div>
								<form method="POST" action="?/renameSong" class="mt-4 space-y-3">
									<input type="hidden" name="songId" value={song.id} />
									<div class="space-y-2">
										<label class="text-sm font-medium" for={`song-${song.id}`}>Song title</label>
										<Input
											id={`song-${song.id}`}
											name="title"
											maxlength={200}
											required
											value={getSongTitle(song)}
										/>
									</div>
									<div class="flex flex-wrap items-center gap-3">
										<a
											class={buttonVariants({})}
											href={resolve('/app/collections/[collectionId]/songs/[songId]', {
												collectionId: data.collection.id,
												songId: song.id
											})}
										>
											Open song viewer
										</a>
										<Button type="submit" variant="outline">Save song name</Button>
									</div>
								</form>
								<form method="POST" action="?/deleteSong" class="mt-3">
									<input type="hidden" name="songId" value={song.id} />
									<input type="hidden" name="songTitle" value={song.title} />
									<Button type="submit" variant="destructive">Delete song</Button>
								</form>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	</section>

	<dialog
		bind:this={quickUploadDialog}
		class="w-full max-w-2xl rounded-3xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-background/70"
	>
		<div class="space-y-6 p-6">
			<div class="flex items-start justify-between gap-4">
				<div class="space-y-2">
					<Badge variant="outline" class="w-fit">Collection upload</Badge>
					<h2 class="text-2xl font-semibold tracking-tight">Create a song and upload files</h2>
					<p class="max-w-xl text-sm leading-6 text-muted-foreground">
						Start with the song name, then drop PDF or image files into the upload area. Tune Bit
						issues short-lived upload URLs and stores the files privately with user-scoped keys.
					</p>
				</div>
				<Button type="button" variant="ghost" onclick={closeQuickUpload}>Close</Button>
			</div>

			{#if quickUploadMessage}
				<p class={`rounded-xl border px-3 py-2 text-sm ${quickUploadFeedbackClass}`}>
					{quickUploadMessage}
				</p>
			{/if}

			<form class="space-y-5" onsubmit={handleQuickUploadSubmit}>
				<div class="space-y-2">
					<label class="text-sm font-medium" for="quick-upload-song-title">Song name</label>
					<Input
						id="quick-upload-song-title"
						name="title"
						maxlength={200}
						placeholder="Blue Bossa"
						required
						value={quickUploadTitle}
					/>
				</div>

				<div class="space-y-2">
					<label class="text-sm font-medium" for="quick-upload-files">Files</label>
					<div class="relative rounded-2xl border border-dashed px-5 py-8 text-center">
						<input
							bind:this={quickUploadInput}
							id="quick-upload-files"
							type="file"
							name="files"
							accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
							multiple
							required
							class="absolute inset-0 cursor-pointer opacity-0"
							onchange={updateQuickUploadFiles}
						/>
						<div class="space-y-2">
							<p class="font-medium">Drop files here or click to browse</p>
							<p class="text-sm text-muted-foreground">
								Supports PDF, JPG, JPEG, PNG, and WEBP. The browser uploads directly to R2 with
								short-lived signed URLs.
							</p>
						</div>
					</div>
				</div>

				{#if quickUploadFiles.length > 0}
					<div class="rounded-2xl border px-4 py-4">
						<p class="text-sm font-medium">Ready to upload</p>
						<div class="mt-3 flex flex-wrap gap-2">
							{#each quickUploadFiles as fileName, index (`${fileName}-${index}`)}
								<Badge variant="outline">{fileName}</Badge>
							{/each}
						</div>
					</div>
				{/if}

				{#if quickUploadProgressItems.length > 0}
					<div class="rounded-2xl border px-4 py-4">
						<div class="flex items-center justify-between gap-3">
							<p class="text-sm font-medium">Upload progress</p>
							<p class="text-sm text-muted-foreground">
								{quickUploadProgressItems.filter((item) => item.status === 'uploaded')
									.length}/{quickUploadProgressItems.length}
								uploaded
							</p>
						</div>
						<div class="mt-4 space-y-3">
							{#each quickUploadProgressItems as item (`${item.fileName}-${item.status}-${item.progress}`)}
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

				<div class="flex flex-wrap items-center justify-end gap-3">
					<Button type="button" variant="outline" onclick={closeQuickUpload}>Cancel</Button>
					<Button type="submit" disabled={isQuickUploading}>
						{isQuickUploading ? 'Uploading files…' : 'Create song and upload'}
					</Button>
				</div>
			</form>
		</div>
	</dialog>
</div>
