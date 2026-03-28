<script lang="ts">
	import { Trash2 } from '@lucide/svelte';
	import { browser } from '$app/environment';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { SvelteMap } from 'svelte/reactivity';

	type PdfJsModule = typeof import('pdfjs-dist');
	type PdfDocumentLoadingTask = ReturnType<PdfJsModule['getDocument']>;
	type PdfDocumentProxy = Awaited<PdfDocumentLoadingTask['promise']>;

	const pdfDocumentPromiseByUrl = new SvelteMap<string, Promise<PdfDocumentProxy>>();
	let pdfJsPromise: Promise<PdfJsModule> | null = null;

	async function getPdfJs() {
		if (!pdfJsPromise) {
			pdfJsPromise = Promise.all([
				import('pdfjs-dist'),
				import('pdfjs-dist/build/pdf.worker.min.mjs?url')
			]).then(([pdfJs, worker]) => {
				pdfJs.GlobalWorkerOptions.workerSrc = worker.default;
				return pdfJs;
			});
		}

		return pdfJsPromise;
	}

	async function getPdfDocument(fileUrl: string) {
		const existingDocumentPromise = pdfDocumentPromiseByUrl.get(fileUrl);

		if (existingDocumentPromise) {
			return existingDocumentPromise;
		}

		const documentPromise = getPdfJs().then(
			(pdfJs) =>
				pdfJs.getDocument({
					url: fileUrl,
					withCredentials: true
				}).promise
		);
		pdfDocumentPromiseByUrl.set(fileUrl, documentPromise);

		return documentPromise;
	}

	let {
		fileName,
		fileUrl,
		maxViewportHeight,
		mimeLabel,
		mimeType,
		pageNumber,
		sortOrder,
		zoom,
		canZoomIn,
		canZoomOut,
		onDelete,
		onZoomIn,
		onZoomOut,
		onZoomReset
	}: {
		fileName: string;
		fileUrl: string;
		maxViewportHeight: number;
		mimeLabel: string;
		mimeType: string;
		pageNumber: number;
		sortOrder: number;
		zoom: number;
		canZoomIn: boolean;
		canZoomOut: boolean;
		onDelete: () => void;
		onZoomIn: () => void;
		onZoomOut: () => void;
		onZoomReset: () => void;
	} = $props();

	let pageElement = $state<HTMLElement | null>(null);
	let pageHeaderElement = $state<HTMLDivElement | null>(null);
	let canvasContainer = $state<HTMLDivElement | null>(null);
	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let imageLoaded = $state(false);
	let imageNaturalWidth = $state(0);
	let imageNaturalHeight = $state(0);
	let isLoading = $state(false);
	let isVisible = $state(!browser);
	let renderWidth = $state(0);
	let pageHeaderHeight = $state(0);
	let errorMessage = $state('');

	const isPdf = $derived(mimeType === 'application/pdf');
	const pageLabel = $derived(`Page ${sortOrder + 1}`);
	const zoomLabel = $derived(`${Math.round(zoom * 100)}%`);
	const pageHeadingId = $derived(`song-note-page-${sortOrder + 1}`);
	const contentViewportHeight = $derived(
		Math.max(Math.floor(maxViewportHeight - pageHeaderHeight - 48), 220)
	);
	const imageDisplayDimensions = $derived.by(() => {
		if (imageNaturalWidth === 0 || imageNaturalHeight === 0) {
			return null;
		}

		const fitWidthScale = Math.max(renderWidth - 24, 240) / imageNaturalWidth;
		const fitHeightScale = Math.max(contentViewportHeight - 24, 160) / imageNaturalHeight;
		const displayScale = Math.max(Math.min(fitWidthScale, fitHeightScale), 0.1) * zoom;

		return {
			width: Math.max(Math.floor(imageNaturalWidth * displayScale), 1),
			height: Math.max(Math.floor(imageNaturalHeight * displayScale), 1)
		};
	});

	$effect(() => {
		if (!browser || !pageElement) {
			isVisible = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					isVisible = true;
					observer.disconnect();
				}
			},
			{
				rootMargin: '320px 0px'
			}
		);
		observer.observe(pageElement);

		return () => observer.disconnect();
	});

	$effect(() => {
		if (!browser || !canvasContainer) {
			return;
		}

		const currentCanvasContainer = canvasContainer;

		renderWidth = Math.max(Math.floor(currentCanvasContainer.clientWidth), 0);
		const resizeObserver = new ResizeObserver((entries) => {
			const [entry] = entries;
			renderWidth = Math.max(
				Math.floor(entry?.contentRect.width ?? currentCanvasContainer.clientWidth),
				0
			);
		});
		resizeObserver.observe(currentCanvasContainer);

		return () => resizeObserver.disconnect();
	});

	$effect(() => {
		if (isPdf) {
			return;
		}

		imageLoaded = false;
		imageNaturalWidth = 0;
		imageNaturalHeight = 0;
		errorMessage = '';
	});

	$effect(() => {
		if (!browser || !pageHeaderElement) {
			return;
		}

		const currentPageHeaderElement = pageHeaderElement;
		pageHeaderHeight = Math.max(
			Math.floor(currentPageHeaderElement.getBoundingClientRect().height),
			0
		);
		const resizeObserver = new ResizeObserver((entries) => {
			const [entry] = entries;
			pageHeaderHeight = Math.max(
				Math.floor(
					entry?.contentRect.height ?? currentPageHeaderElement.getBoundingClientRect().height
				),
				0
			);
		});
		resizeObserver.observe(currentPageHeaderElement);

		return () => resizeObserver.disconnect();
	});

	$effect(() => {
		if (
			!isPdf ||
			!browser ||
			!canvasElement ||
			!canvasContainer ||
			!isVisible ||
			renderWidth === 0
		) {
			return;
		}

		const currentCanvasElement = canvasElement;
		let isCancelled = false;
		let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;

		isLoading = true;
		errorMessage = '';

		async function renderPdfPage() {
			try {
				const pdfDocument = await getPdfDocument(fileUrl);

				if (isCancelled) {
					return;
				}

				const pdfPage = await pdfDocument.getPage(pageNumber);

				if (isCancelled) {
					return;
				}

				const baseViewport = pdfPage.getViewport({ scale: 1 });
				const fitWidthScale = Math.max(renderWidth - 24, 240) / baseViewport.width;
				const fitHeightScale = Math.max(contentViewportHeight - 24, 160) / baseViewport.height;
				const displayScale = Math.max(Math.min(fitWidthScale, fitHeightScale), 0.1) * zoom;
				const deviceScale = displayScale * (window.devicePixelRatio || 1);
				const displayViewport = pdfPage.getViewport({ scale: displayScale });
				const renderViewport = pdfPage.getViewport({ scale: deviceScale });
				const context = currentCanvasElement.getContext('2d');

				if (!context) {
					throw new Error('Could not prepare the PDF page.');
				}

				currentCanvasElement.width = Math.ceil(renderViewport.width);
				currentCanvasElement.height = Math.ceil(renderViewport.height);
				currentCanvasElement.style.width = `${displayViewport.width}px`;
				currentCanvasElement.style.height = `${displayViewport.height}px`;

				renderTask = pdfPage.render({
					canvas: currentCanvasElement,
					canvasContext: context,
					viewport: renderViewport
				});

				await renderTask.promise;

				if (isCancelled) {
					return;
				}

				isLoading = false;
			} catch (renderError) {
				if (
					renderError &&
					typeof renderError === 'object' &&
					'name' in renderError &&
					renderError.name === 'RenderingCancelledException'
				) {
					return;
				}

				if (isCancelled) {
					return;
				}

				errorMessage = 'Could not render this PDF page.';
				isLoading = false;
			}
		}

		void renderPdfPage();

		return () => {
			isCancelled = true;
			renderTask?.cancel();
		};
	});

	function handleImageLoad(event: Event) {
		if (canvasContainer) {
			renderWidth = Math.max(Math.floor(canvasContainer.clientWidth), 0);
		}

		const currentTarget = event.currentTarget;

		if (currentTarget instanceof HTMLImageElement) {
			imageNaturalWidth = currentTarget.naturalWidth;
			imageNaturalHeight = currentTarget.naturalHeight;
		}

		imageLoaded = true;
		errorMessage = '';
	}

	function handleImageError() {
		imageLoaded = false;
		errorMessage = 'Could not load this image page.';
	}
</script>

<div
	bind:this={pageElement}
	aria-labelledby={pageHeadingId}
	class="rounded-3xl border border-border/70 bg-card/95 p-4 shadow-sm"
	role="group"
	style="content-visibility: auto; contain-intrinsic-size: 900px;"
>
	<div class="space-y-4">
		<div bind:this={pageHeaderElement} class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0">
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant="outline">{pageLabel}</Badge>
					<Badge variant="outline">{mimeLabel}</Badge>
					<p id={pageHeadingId} class="min-w-0 font-medium break-all">
						{fileName}
					</p>
				</div>
			</div>

			<div
				aria-label={`Zoom controls for ${pageLabel.toLowerCase()}`}
				class="flex flex-wrap items-center justify-end gap-2"
				role="group"
			>
				<Button
					aria-label={`Delete ${fileName}`}
					class="text-destructive hover:text-destructive"
					size="icon-xs"
					variant="outline"
					onclick={onDelete}
				>
					<Trash2 />
				</Button>
				<Badge variant="outline">{zoomLabel}</Badge>
				<Button
					aria-label={`Zoom out ${pageLabel.toLowerCase()}`}
					size="xs"
					variant="outline"
					disabled={!canZoomOut}
					onclick={onZoomOut}
				>
					−
				</Button>
				<Button
					aria-label={`Reset zoom for ${pageLabel.toLowerCase()}`}
					size="xs"
					variant="outline"
					onclick={onZoomReset}
				>
					Reset
				</Button>
				<Button
					aria-label={`Zoom in ${pageLabel.toLowerCase()}`}
					size="xs"
					variant="outline"
					disabled={!canZoomIn}
					onclick={onZoomIn}
				>
					+
				</Button>
			</div>
		</div>

		<div
			bind:this={canvasContainer}
			aria-busy={isPdf ? isLoading : !imageLoaded && !errorMessage}
			class="flex items-start justify-center overflow-auto rounded-2xl bg-muted/20 p-3"
			style={`height: ${contentViewportHeight}px;`}
		>
			{#if isPdf}
				{#if !isVisible}
					<div class="aspect-[8.5/11] h-full animate-pulse rounded-xl bg-muted"></div>
				{:else if errorMessage}
					<div
						class="flex aspect-[8.5/11] h-full items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm text-muted-foreground"
					>
						{errorMessage}
					</div>
				{:else}
					{#if isLoading}
						<div class="aspect-[8.5/11] h-full animate-pulse rounded-xl bg-muted"></div>
					{/if}
					<canvas
						bind:this={canvasElement}
						class={`rounded-xl bg-white shadow-sm ${isLoading ? 'hidden' : 'block'}`}
					></canvas>
				{/if}
			{:else if !isVisible}
				<div class="aspect-[8.5/11] h-full animate-pulse rounded-xl bg-muted"></div>
			{:else if errorMessage}
				<div
					class="flex aspect-[8.5/11] h-full items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm text-muted-foreground"
				>
					{errorMessage}
				</div>
			{:else}
				<div class="relative">
					{#if !imageLoaded}
						<div class="absolute inset-0 animate-pulse rounded-xl bg-muted"></div>
					{/if}
					<img
						src={fileUrl}
						alt={`${fileName} page ${sortOrder + 1}`}
						loading="lazy"
						class={`rounded-xl bg-white shadow-sm transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
						style={imageDisplayDimensions
							? `width: ${imageDisplayDimensions.width}px; height: ${imageDisplayDimensions.height}px;`
							: ''}
						onload={handleImageLoad}
						onerror={handleImageError}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>
