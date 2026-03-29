<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import FocusModeViewer from '$lib/components/note-viewer/focus-mode-viewer.svelte';
	import SongNotePage from '$lib/components/note-viewer/song-note-page.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { onMount, tick } from 'svelte';

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

	let { data, form } = $props();
	let uploadDialog = $state<HTMLDialogElement | null>(null);
	let deleteNoteDialog = $state<HTMLDialogElement | null>(null);
	let uploadInput = $state<HTMLInputElement | null>(null);
	let selectedUploadFiles = $state<File[]>([]);
	let uploadProgressItems = $state<UploadProgressItem[]>([]);
	let feedbackMessage = $state('');
	let isFeedbackError = $state(false);
	let isUploading = $state(false);
	let isDragActive = $state(false);
	let layout = $state<ViewerLayout>(1);
	let isFocusMode = $state(false);
	let pageZoomById = $state<Record<string, number>>({});
	let viewerToolbarElement = $state<HTMLElement | null>(null);
	let viewerViewportHeight = $state(720);
	let focusReturnElement = $state<HTMLElement | null>(null);
	let activeNoteFileId = $state<string | null>(null);

	const noteFiles = $derived((data.noteFiles ?? []) as NoteFile[]);
	const notePages = $derived((data.notePages ?? []) as NotePage[]);
	const noteFilesById = $derived(
		new Map(noteFiles.map((noteFile) => [noteFile.id, noteFile] as const))
	);
	const activeNoteFile = $derived(
		activeNoteFileId ? (noteFilesById.get(activeNoteFileId) ?? null) : null
	);
	const activeNoteFileName = $derived(
		activeNoteFile?.original_filename ??
			(form?.intent === 'deleteNoteFile' && 'noteFileName' in form
				? form.noteFileName
				: 'This uploaded file')
	);
	const activeNoteFilePageCount = $derived(activeNoteFile?.page_count ?? 0);
	const activeDeleteNoteFileId = $derived(activeNoteFile?.id ?? activeNoteFileId ?? '');
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
	const uploadFiles = $derived(selectedUploadFiles.map((file) => file.name));
	const feedbackClass = $derived(
		isFeedbackError
			? 'border-destructive/30 bg-destructive/5 text-destructive'
			: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
	);
	const deleteNoteFileMessage = $derived(form?.intent === 'deleteNoteFile' ? form.message : null);
	const totalPages = $derived(notePages.length);
	const viewerGridClass = $derived(
		layout === 1
			? 'grid-cols-1'
			: layout === 2
				? 'grid-cols-1 xl:grid-cols-2'
				: 'grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3'
	);

	$effect(() => {
		if (data.message) {
			feedbackMessage = data.message;
			isFeedbackError = false;
		}
	});

	$effect(() => {
		if (!form?.message) {
			return;
		}

		feedbackMessage = form.message;
		isFeedbackError = !('success' in form && form.success);
	});

	$effect(() => {
		if (!browser || !viewerToolbarElement) {
			return;
		}

		const currentViewerToolbarElement = viewerToolbarElement;
		const updateViewerViewportHeight = () => {
			const sectionTop = Math.max(currentViewerToolbarElement.getBoundingClientRect().top, 0);
			const reservedViewportHeight = 24;
			viewerViewportHeight = Math.max(
				Math.floor(window.innerHeight - sectionTop - reservedViewportHeight),
				320
			);
		};

		updateViewerViewportHeight();

		const resizeObserver = new ResizeObserver(() => {
			updateViewerViewportHeight();
		});
		resizeObserver.observe(currentViewerToolbarElement);
		window.addEventListener('resize', updateViewerViewportHeight);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener('resize', updateViewerViewportHeight);
		};
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

	$effect(() => {
		if (
			!deleteNoteDialog ||
			!form ||
			form.intent !== 'deleteNoteFile' ||
			!('targetId' in form) ||
			!form.targetId
		) {
			return;
		}

		activeNoteFileId = form.targetId;

		if ('success' in form && form.success) {
			deleteNoteDialog.close();
			activeNoteFileId = null;
			return;
		}

		if (!deleteNoteDialog.open) {
			deleteNoteDialog.showModal();
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

		if (window.sessionStorage.getItem(FOCUS_STORAGE_KEY) === 'true') {
			void setFocusMode(true);
		}

		const handleKeydown = (event: KeyboardEvent) => {
			if (!canHandleViewerShortcut(event.target)) {
				return;
			}

			if (event.key === 'Escape' && isFocusMode) {
				event.preventDefault();
				void setFocusMode(false);
				return;
			}

			if (event.key === '1' || event.key === '2' || event.key === '3') {
				event.preventDefault();
				setLayout(Number(event.key) as ViewerLayout);
				return;
			}

			if (event.key.toLowerCase() === 'f') {
				event.preventDefault();
				void setFocusMode(!isFocusMode);
			}
		};

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});

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

	function getUploadProgressItemId(file: File, index: number) {
		return `${index}-${file.name}-${file.lastModified}-${file.size}`;
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

	function openUploadModal() {
		if (uploadDialog && !uploadDialog.open) {
			uploadDialog.showModal();
		}
	}

	function closeUploadModal() {
		if (isUploading) {
			return;
		}

		isDragActive = false;
		uploadDialog?.close();
	}

	function openDeleteNoteDialog(noteFileId: string) {
		activeNoteFileId = noteFileId;
		deleteNoteDialog?.showModal();
	}

	function closeDeleteNoteDialog() {
		deleteNoteDialog?.close();
	}

	const enhanceDeleteNoteForm: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({
				reset: false,
				invalidateAll: result.type === 'success'
			});
		};
	};

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

	function canHandleViewerShortcut(target: EventTarget | null) {
		return !(
			target instanceof HTMLElement &&
			(target.isContentEditable ||
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.tagName === 'SELECT')
		);
	}

	function setLayout(nextLayout: ViewerLayout) {
		layout = nextLayout;

		if (browser) {
			window.sessionStorage.setItem(LAYOUT_STORAGE_KEY, String(nextLayout));
		}
	}

	async function setFocusMode(nextFocusMode: boolean) {
		if (browser && nextFocusMode) {
			focusReturnElement =
				document.activeElement instanceof HTMLElement ? document.activeElement : null;
		}

		isFocusMode = nextFocusMode;

		if (browser) {
			window.sessionStorage.setItem(FOCUS_STORAGE_KEY, String(nextFocusMode));
			await tick();

			if (nextFocusMode) {
				viewerToolbarElement?.focus();
				return;
			}

			if (focusReturnElement?.isConnected) {
				focusReturnElement.focus();
				return;
			}

			const focusToggle = document.querySelector<HTMLElement>('[data-focus-mode-toggle="true"]');
			focusToggle?.focus();
		}
	}

	function toggleFocusMode() {
		void setFocusMode(!isFocusMode);
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

		const files = selectedUploadFiles;

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
			clearSelectedUploadFiles();
			isDragActive = false;
			uploadDialog?.close();
			await invalidateAll();
		} catch (error) {
			if (!didFinalize) {
				await cleanupUploads(uploads).catch(() => null);
			}

			feedbackMessage =
				error instanceof Error ? error.message : 'Upload failed. Try again in a moment.';
			isFeedbackError = true;

			if (uploadDialog && !uploadDialog.open) {
				uploadDialog.showModal();
			}
		} finally {
			isUploading = false;
		}
	}
</script>

<svelte:head>
	<title>Tune Bit | {data.song.title}</title>
	<meta
		name="description"
		content="Read note pages, manage uploads, and stay inside one integrated Tune Bit song screen."
	/>
</svelte:head>

<div>
	<div class="space-y-6">
		{#if !isFocusMode}
			<section class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
				<div class="space-y-3">
					<div class="flex flex-wrap items-center gap-2">
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
					</div>
					<div class="space-y-2">
						<h1 class="text-4xl font-semibold tracking-tight">{data.song.title}</h1>
						<p class="max-w-4xl text-base text-muted-foreground">
							Review uploaded notes, open the upload modal when you need more files, and keep the
							viewer front and center.
						</p>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<Button onclick={openUploadModal}>Upload Notes</Button>
					<div aria-label="Viewer layout" class="flex flex-wrap gap-2" role="group">
						<Button
							aria-pressed={layout === 1}
							variant={layout === 1 ? 'default' : 'outline'}
							size="sm"
							title="Press 1 key for 1-column layout"
							onclick={() => setLayout(1)}
						>
							1 column
						</Button>
						<Button
							aria-pressed={layout === 2}
							variant={layout === 2 ? 'default' : 'outline'}
							size="sm"
							title="Press 2 key for 2-column layout"
							onclick={() => setLayout(2)}
						>
							2 columns
						</Button>
						<Button
							aria-pressed={layout === 3}
							variant={layout === 3 ? 'default' : 'outline'}
							size="sm"
							title="Press 3 key for 3-column layout"
							onclick={() => setLayout(3)}
						>
							3 columns
						</Button>
					</div>
					<Button
						aria-pressed={isFocusMode}
						data-focus-mode-toggle="true"
						variant={isFocusMode ? 'default' : 'outline'}
						size="sm"
						title={isFocusMode
							? 'Press Escape key to exit focus mode'
							: 'Press F key to enter focus mode'}
						onclick={toggleFocusMode}
					>
						{isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
					</Button>
				</div>
			</section>
		{/if}

		{#if isFocusMode}
			<FocusModeViewer
				bind:viewerElement={viewerToolbarElement}
				{layout}
				{viewerPages}
				maxViewportHeight={viewerViewportHeight}
				{feedbackMessage}
				{feedbackClass}
				{getPageZoom}
				onLayoutChange={setLayout}
				onExit={toggleFocusMode}
				onZoomIn={zoomIn}
				onZoomOut={zoomOut}
				onZoomReset={resetZoom}
				minPageZoom={MIN_PAGE_ZOOM}
				maxPageZoom={MAX_PAGE_ZOOM}
			/>
		{:else}
			<section
				bind:this={viewerToolbarElement}
				aria-label="Song viewer"
				class="min-w-0 space-y-5"
				tabindex="-1"
			>
				{#if feedbackMessage}
					<p aria-live="polite" class={`rounded-2xl border px-4 py-3 text-sm ${feedbackClass}`}>
						{feedbackMessage}
					</p>
				{/if}
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
								<div class="pt-2">
									<Button onclick={openUploadModal}>Upload Notes</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				{:else}
					<div class={`grid gap-4 ${viewerGridClass}`}>
						{#each viewerPages as viewerPage (viewerPage.id)}
							<SongNotePage
								fileName={viewerPage.fileName}
								fileUrl={viewerPage.fileUrl}
								maxViewportHeight={viewerViewportHeight}
								mimeLabel={viewerPage.mimeLabel}
								mimeType={viewerPage.mimeType}
								pageNumber={viewerPage.page_number}
								sortOrder={viewerPage.sort_order}
								zoom={getPageZoom(viewerPage.id)}
								canZoomIn={getPageZoom(viewerPage.id) < MAX_PAGE_ZOOM}
								canZoomOut={getPageZoom(viewerPage.id) > MIN_PAGE_ZOOM}
								onDelete={() => openDeleteNoteDialog(viewerPage.note_file_id)}
								onZoomIn={() => zoomIn(viewerPage.id)}
								onZoomOut={() => zoomOut(viewerPage.id)}
								onZoomReset={() => resetZoom(viewerPage.id)}
							/>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		{#if !isFocusMode}
			<dialog
				bind:this={uploadDialog}
				class="m-auto w-full max-w-2xl rounded-3xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-background/70"
			>
				<div class="space-y-6 p-6">
					<div class="flex items-start justify-between gap-4">
						<div class="space-y-2">
							<Badge variant="outline" class="w-fit">Song upload</Badge>
							<h2 class="text-2xl font-semibold tracking-tight">Upload notes</h2>
							<p class="max-w-xl text-sm leading-6 text-muted-foreground">
								Drop PDF or image files here or browse manually. Tune Bit uploads them directly to
								private storage, then refreshes this song in place.
							</p>
						</div>
						<Button type="button" variant="ghost" onclick={closeUploadModal}>Close</Button>
					</div>

					{#if feedbackMessage}
						<p class={`rounded-2xl border px-4 py-3 text-sm ${feedbackClass}`}>
							{feedbackMessage}
						</p>
					{/if}

					<form class="space-y-5" onsubmit={handleUploadSubmit}>
						<div class="space-y-2">
							<label class="text-sm font-medium" for="song-upload-files">Files</label>
							<div
								class={`relative rounded-2xl border border-dashed px-5 py-10 text-center transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}`}
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
									onchange={updateUploadFiles}
								/>
								<div class="space-y-2">
									<p class="font-medium">Drop files here or click to browse</p>
									<p class="text-sm text-muted-foreground">
										Supports PDF, JPG, JPEG, PNG, and WEBP with direct browser uploads to secure
										private storage.
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

						<div class="flex flex-wrap items-center justify-end gap-3">
							<Button type="button" variant="outline" onclick={closeUploadModal}>Cancel</Button>
							<Button type="submit" disabled={isUploading}>
								{isUploading ? 'Uploading files…' : 'Upload files'}
							</Button>
						</div>
					</form>
				</div>
			</dialog>
		{/if}

		<dialog
			bind:this={deleteNoteDialog}
			class="m-auto w-full max-w-xl rounded-3xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-background/70"
		>
			<div class="space-y-6 p-6">
				<div class="space-y-2">
					<Badge variant="outline" class="w-fit">Delete note</Badge>
					<h2 class="text-2xl font-semibold tracking-tight">Delete uploaded note</h2>
					<p class="max-w-xl text-sm leading-6 text-muted-foreground">
						Remove this uploaded file and every page it adds to the song viewer.
					</p>
				</div>

				{#if deleteNoteFileMessage}
					<p
						class="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
					>
						{deleteNoteFileMessage}
					</p>
				{/if}

				<div class="rounded-2xl border px-4 py-4 text-sm text-muted-foreground">
					<p class="font-medium text-foreground">{activeNoteFileName}</p>
					<p class="mt-2 leading-6">
						{activeNoteFilePageCount} page{activeNoteFilePageCount === 1 ? '' : 's'} will be removed from
						the song. This action cannot be undone.
					</p>
				</div>

				<form
					method="POST"
					action="?/deleteNoteFile"
					use:enhance={enhanceDeleteNoteForm}
					class="space-y-4"
				>
					<input type="hidden" name="noteFileId" value={activeDeleteNoteFileId} />
					<input type="hidden" name="noteFileName" value={activeNoteFileName} />
					<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
						<Button type="button" variant="ghost" onclick={closeDeleteNoteDialog}>Cancel</Button>
						<Button type="submit" variant="destructive">Delete note</Button>
					</div>
				</form>
			</div>
		</dialog>
	</div>
</div>
