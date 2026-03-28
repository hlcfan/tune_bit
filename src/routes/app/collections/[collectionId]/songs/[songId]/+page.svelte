<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SongNotePage from '$lib/components/note-viewer/song-note-page.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { onMount } from 'svelte';

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

	type NoteFile = {
		id: string;
		original_filename: string;
		mime_type: string;
		page_count: number;
		created_at: string;
	};

	type NotePage = {
		id: string;
		note_file_id: string;
		page_number: number;
		sort_order: number;
		preview_key: string | null;
		created_at: string;
	};

	type ViewerLayout = 1 | 2 | 3;

	const LAYOUT_STORAGE_KEY = 'tune-bit.viewer-layout';
	const FOCUS_STORAGE_KEY = 'tune-bit.viewer-focus';
	const DEFAULT_PAGE_ZOOM = 1;
	const MIN_PAGE_ZOOM = 0.75;
	const MAX_PAGE_ZOOM = 2.25;
	const PAGE_ZOOM_STEP = 0.25;

	let { data } = $props();
	let uploadInput = $state<HTMLInputElement | null>(null);
	let uploadFiles = $state<string[]>([]);
	let uploadProgressItems = $state<UploadProgressItem[]>([]);
	let feedbackMessage = $state('');
	let isFeedbackError = $state(false);
	let isUploading = $state(false);
	let layout = $state<ViewerLayout>(1);
	let isFocusMode = $state(false);
	let pageZoomById = $state<Record<string, number>>({});

	const noteFiles = $derived((data.noteFiles ?? []) as NoteFile[]);
	const notePages = $derived((data.notePages ?? []) as NotePage[]);
	const noteFilesById = $derived(
		new Map(noteFiles.map((noteFile) => [noteFile.id, noteFile] as const))
	);
	const viewerPages = $derived(
		notePages.flatMap((notePage) => {
			const noteFile = noteFilesById.get(notePage.note_file_id);

			return noteFile
				? [
						{
							...notePage,
							fileName: noteFile.original_filename,
							fileUrl: getNoteFilePath(noteFile.id),
							mimeLabel: getMimeLabel(noteFile.mime_type),
							mimeType: noteFile.mime_type
						}
					]
				: [];
		})
	);
	const feedbackClass = $derived(
		isFeedbackError
			? 'border-destructive/30 bg-destructive/5 text-destructive'
			: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
	);
	const totalPages = $derived(notePages.length);
	const viewerGridClass = $derived(
		layout === 1
			? 'grid-cols-1'
			: layout === 2
				? 'grid-cols-1 xl:grid-cols-2'
				: 'grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3'
	);
	const surfaceClass = $derived(
		isFocusMode ? 'fixed inset-0 z-50 overflow-y-auto bg-background px-4 py-4 sm:px-6 sm:py-6' : ''
	);

	$effect(() => {
		if (data.message) {
			feedbackMessage = data.message;
			isFeedbackError = false;
		}
	});

	$effect(() => {
		const nextPageZoomById = Object.fromEntries(
			notePages.map((notePage) => [notePage.id, pageZoomById[notePage.id] ?? DEFAULT_PAGE_ZOOM])
		);

		if (
			Object.keys(nextPageZoomById).length !== Object.keys(pageZoomById).length ||
			Object.entries(nextPageZoomById).some(([pageId, zoom]) => pageZoomById[pageId] !== zoom)
		) {
			pageZoomById = nextPageZoomById;
		}
	});

	onMount(() => {
		if (!browser) {
			return;
		}

		const storedLayout = window.sessionStorage.getItem(LAYOUT_STORAGE_KEY);

		if (storedLayout === '1' || storedLayout === '2' || storedLayout === '3') {
			layout = Number(storedLayout) as ViewerLayout;
		}

		isFocusMode = window.sessionStorage.getItem(FOCUS_STORAGE_KEY) === 'true';

		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape' || !isFocusMode) {
				return;
			}

			isFocusMode = false;
			window.sessionStorage.setItem(FOCUS_STORAGE_KEY, 'false');
		};

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	function getDateLabel(timestamp: string) {
		return new Date(timestamp).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getFileName(noteFileId: string) {
		return noteFilesById.get(noteFileId)?.original_filename ?? 'Uploaded file';
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

	function getNoteFilePath(noteFileId: string) {
		return new URL(
			resolve('/app/collections/[collectionId]/songs/[songId]/files/[noteFileId]', {
				collectionId: data.collection.id,
				songId: data.song.id,
				noteFileId
			}),
			page.url
		).toString();
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

	function setLayout(nextLayout: ViewerLayout) {
		layout = nextLayout;

		if (browser) {
			window.sessionStorage.setItem(LAYOUT_STORAGE_KEY, String(nextLayout));
		}
	}

	function toggleFocusMode() {
		isFocusMode = !isFocusMode;

		if (browser) {
			window.sessionStorage.setItem(FOCUS_STORAGE_KEY, String(isFocusMode));
		}
	}

	function getPageZoom(pageId: string) {
		return pageZoomById[pageId] ?? DEFAULT_PAGE_ZOOM;
	}

	function updatePageZoom(pageId: string, nextZoom: number) {
		pageZoomById = {
			...pageZoomById,
			[pageId]: Math.max(MIN_PAGE_ZOOM, Math.min(MAX_PAGE_ZOOM, nextZoom))
		};
	}

	function zoomIn(pageId: string) {
		updatePageZoom(pageId, getPageZoom(pageId) + PAGE_ZOOM_STEP);
	}

	function zoomOut(pageId: string) {
		updatePageZoom(pageId, getPageZoom(pageId) - PAGE_ZOOM_STEP);
	}

	function resetZoom(pageId: string) {
		updatePageZoom(pageId, DEFAULT_PAGE_ZOOM);
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
		content="Read uploaded PDF and image note pages in Tune Bit with multiple layouts, focus mode, and independent per-page zoom."
	/>
</svelte:head>

<div class={surfaceClass}>
	<div class="mx-auto max-w-[1800px] space-y-8">
		{#if !isFocusMode}
			<section class="flex flex-wrap items-center gap-3">
				<a
					class={buttonVariants({ variant: 'outline' })}
					href={resolve('/app/collections/[collectionId]', {
						collectionId: data.collection.id
					})}
				>
					Back to collection
				</a>
				<Badge variant="outline">{noteFiles.length} files</Badge>
				<Badge variant="outline">{totalPages} pages</Badge>
				<a class={buttonVariants({ variant: 'outline' })} href="#song-upload-panel"
					>Jump to uploads</a
				>
			</section>

			<section class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
				<Card class="border-border/70 bg-card/90">
					<CardHeader class="space-y-4">
						<Badge variant="outline" class="w-fit">Phase 6 note viewer</Badge>
						<div class="space-y-3">
							<CardTitle class="max-w-3xl text-4xl leading-tight font-semibold tracking-tight">
								{data.song.title}
							</CardTitle>
							<CardDescription class="max-w-2xl text-base leading-7">
								Read pages in a calm multi-column viewer, switch into focus mode, and zoom each page
								independently without leaving the song workspace.
							</CardDescription>
						</div>
					</CardHeader>
					<CardContent class="grid gap-4 sm:grid-cols-3">
						<div class="rounded-2xl border border-dashed px-4 py-4">
							<p class="text-sm text-muted-foreground">Collection</p>
							<p class="mt-2 font-medium">{data.collection.name}</p>
						</div>
						<div class="rounded-2xl border border-dashed px-4 py-4">
							<p class="text-sm text-muted-foreground">Current layout</p>
							<p class="mt-2 font-medium">{layout} column{layout === 1 ? '' : 's'}</p>
						</div>
						<div class="rounded-2xl border border-dashed px-4 py-4">
							<p class="text-sm text-muted-foreground">Viewer mode</p>
							<p class="mt-2 font-medium">{isFocusMode ? 'Focus' : 'Normal'}</p>
						</div>
					</CardContent>
				</Card>

				<Card class="border-border/70">
					<CardHeader>
						<CardTitle>Reading behavior</CardTitle>
						<CardDescription>
							PDF pages render in the browser on demand while image uploads stay in song order with
							the same per-page zoom controls.
						</CardDescription>
					</CardHeader>
					<CardContent class="grid gap-4 sm:grid-cols-2">
						<div class="rounded-2xl border px-4 py-4">
							<p class="text-sm text-muted-foreground">Progressive loading</p>
							<p class="mt-2 font-medium">Viewer pages wait until they approach the viewport.</p>
						</div>
						<div class="rounded-2xl border px-4 py-4">
							<p class="text-sm text-muted-foreground">Session memory</p>
							<p class="mt-2 font-medium">
								Layout choice persists for the rest of this browser session.
							</p>
						</div>
						<div class="rounded-2xl border px-4 py-4">
							<p class="text-sm text-muted-foreground">Page zoom</p>
							<p class="mt-2 font-medium">Each note page keeps its own zoom state.</p>
						</div>
						<div class="rounded-2xl border px-4 py-4">
							<p class="text-sm text-muted-foreground">Private access</p>
							<p class="mt-2 font-medium">
								All file reads stay behind authenticated server routes.
							</p>
						</div>
					</CardContent>
				</Card>
			</section>
		{/if}

		<section class="space-y-5">
			<div
				class={`sticky z-20 rounded-3xl border border-border/70 bg-background/95 p-4 backdrop-blur ${isFocusMode ? 'top-0 shadow-lg' : 'top-3'}`}
			>
				<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div class="space-y-1">
						<div class="flex flex-wrap items-center gap-2">
							<Badge variant="outline">{isFocusMode ? 'Focus mode' : 'Normal mode'}</Badge>
							<Badge variant="outline">{viewerPages.length} rendered pages</Badge>
						</div>
						<p class="text-lg font-semibold tracking-tight">{data.song.title}</p>
						<p class="text-sm text-muted-foreground">
							Choose a layout and zoom any page without affecting the rest of the song.
						</p>
					</div>

					<div class="flex flex-col gap-3 lg:items-end">
						<div class="flex flex-wrap gap-2">
							<Button
								variant={layout === 1 ? 'default' : 'outline'}
								size="sm"
								onclick={() => setLayout(1)}
							>
								1 column
							</Button>
							<Button
								variant={layout === 2 ? 'default' : 'outline'}
								size="sm"
								onclick={() => setLayout(2)}
							>
								2 columns
							</Button>
							<Button
								variant={layout === 3 ? 'default' : 'outline'}
								size="sm"
								onclick={() => setLayout(3)}
							>
								3 columns
							</Button>
						</div>

						<div class="flex flex-wrap gap-2">
							{#if !isFocusMode}
								<a
									class={buttonVariants({ variant: 'outline', size: 'sm' })}
									href="#song-upload-panel"
								>
									Add more files
								</a>
							{/if}
							<Button
								variant={isFocusMode ? 'default' : 'outline'}
								size="sm"
								onclick={toggleFocusMode}
							>
								{isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
							</Button>
						</div>
					</div>
				</div>
			</div>

			{#if viewerPages.length === 0}
				<Card class="border-border/70">
					<CardContent class="py-14">
						<div class="mx-auto max-w-xl space-y-3 text-center">
							<p class="text-2xl font-semibold tracking-tight">
								Upload the first note file to start reading.
							</p>
							<p class="text-sm leading-6 text-muted-foreground">
								Tune Bit renders PDFs in the browser on demand and keeps uploaded image files in
								page order with the same viewer controls.
							</p>
							{#if !isFocusMode}
								<div class="pt-2">
									<a class={buttonVariants({})} href="#song-upload-panel">Open the upload panel</a>
								</div>
							{/if}
						</div>
					</CardContent>
				</Card>
			{:else}
				<div class={`grid gap-4 ${viewerGridClass}`}>
					{#each viewerPages as viewerPage (viewerPage.id)}
						<SongNotePage
							fileName={viewerPage.fileName}
							fileUrl={viewerPage.fileUrl}
							mimeLabel={viewerPage.mimeLabel}
							mimeType={viewerPage.mimeType}
							pageNumber={viewerPage.page_number}
							sortOrder={viewerPage.sort_order}
							zoom={getPageZoom(viewerPage.id)}
							canZoomIn={getPageZoom(viewerPage.id) < MAX_PAGE_ZOOM}
							canZoomOut={getPageZoom(viewerPage.id) > MIN_PAGE_ZOOM}
							onZoomIn={() => zoomIn(viewerPage.id)}
							onZoomOut={() => zoomOut(viewerPage.id)}
							onZoomReset={() => resetZoom(viewerPage.id)}
						/>
					{/each}
				</div>
			{/if}
		</section>

		{#if !isFocusMode}
			<section id="song-upload-panel" class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
				<Card class="border-border/70">
					<CardHeader>
						<Badge variant="outline" class="w-fit">Upload files</Badge>
						<CardTitle>Add PDF or image note files</CardTitle>
						<CardDescription>
							Each image becomes one page. PDFs stay intact and create ordered page metadata before
							the viewer loads them on demand in the browser.
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
											Supports PDF, JPG, JPEG, PNG, and WEBP. The browser uploads directly to R2
											with a short-lived signed URL.
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
											{uploadProgressItems.filter((item) => item.status === 'uploaded').length}/
											{uploadProgressItems.length}
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

				<Card class="border-border/70">
					<CardHeader>
						<CardTitle>Uploaded files</CardTitle>
						<CardDescription
							>Review the original assets currently attached to this song.</CardDescription
						>
					</CardHeader>
					<CardContent class="space-y-4">
						{#if noteFiles.length === 0}
							<div class="rounded-2xl border border-dashed px-4 py-8 text-center">
								<p class="text-base font-medium">No files uploaded yet</p>
								<p class="mt-2 text-sm text-muted-foreground">
									Upload the first note file to create file and page metadata for this song.
								</p>
							</div>
						{:else}
							<div class="space-y-4">
								{#each noteFiles as noteFile (noteFile.id)}
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
												<p class="text-sm text-muted-foreground">Viewer delivery</p>
												<p class="mt-2 font-medium">Protected in-browser rendering</p>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</CardContent>
				</Card>
			</section>

			<section>
				<Card class="border-border/70">
					<CardHeader>
						<CardTitle>Page order</CardTitle>
						<CardDescription>
							Each upload appends pages in reading order so the viewer stays consistent across
							layouts.
						</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						{#if notePages.length === 0}
							<div class="rounded-2xl border border-dashed px-4 py-8 text-center">
								<p class="text-base font-medium">No pages yet</p>
								<p class="mt-2 text-sm text-muted-foreground">
									Page rows appear here after the first successful upload.
								</p>
							</div>
						{:else}
							<div class="grid gap-3 xl:grid-cols-2">
								{#each notePages as notePage (notePage.id)}
									<div
										class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
									>
										<div class="space-y-1">
											<p class="font-medium">
												#{notePage.sort_order + 1} · {getFileName(notePage.note_file_id)}
											</p>
											<p class="text-sm text-muted-foreground">
												Source page {notePage.page_number}
											</p>
										</div>
										<Badge variant="outline">Order {notePage.sort_order + 1}</Badge>
									</div>
								{/each}
							</div>
						{/if}
					</CardContent>
				</Card>
			</section>
		{/if}
	</div>
</div>
