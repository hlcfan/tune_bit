<script lang="ts">
	import FeedbackFlash from '$lib/components/feedback-flash.svelte';
	import SongNotePage from '$lib/components/note-viewer/song-note-page.svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	type ViewerLayout = 1 | 2 | 3;

	type ViewerPage = {
		id: string;
		note_file_id: string;
		page_number: number;
		sort_order: number;
		fileName: string;
		fileUrl: string;
		mimeLabel: string;
		mimeType: string;
	};

	let {
		layout,
		viewerPages,
		maxViewportHeight,
		feedbackMessage = '',
		feedbackClass = '',
		getPageZoom,
		onLayoutChange,
		onExit,
		onZoomIn,
		onZoomOut,
		onZoomReset,
		minPageZoom,
		maxPageZoom,
		viewerElement = $bindable(null)
	}: {
		layout: ViewerLayout;
		viewerPages: ViewerPage[];
		maxViewportHeight: number;
		feedbackMessage?: string;
		feedbackClass?: string;
		getPageZoom: (pageId: string) => number;
		onLayoutChange: (layout: ViewerLayout) => void;
		onExit: () => void;
		onZoomIn: (pageId: string) => void;
		onZoomOut: (pageId: string) => void;
		onZoomReset: (pageId: string) => void;
		minPageZoom: number;
		maxPageZoom: number;
		viewerElement?: HTMLElement | null;
	} = $props();

	const focusGridClass = $derived(
		layout === 1 ? 'grid-cols-1' : layout === 2 ? 'grid-cols-2' : 'grid-cols-3'
	);
</script>

<div class="fixed inset-0 z-50 bg-background">
	<div class="h-full overflow-y-auto">
		<section
			bind:this={viewerElement}
			aria-label="Song viewer"
			class="relative min-w-0 px-3 py-3 sm:px-4 sm:py-4"
			tabindex="-1"
		>
			<div class="pointer-events-none absolute inset-x-0 top-3 z-[60] flex justify-center">
				<div
					aria-label="Focus mode toolbar"
					class="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/90 p-1 shadow-lg backdrop-blur"
					role="toolbar"
				>
					<div aria-label="Viewer layout" class="flex items-center gap-1" role="group">
						<Button
							aria-label="Switch to 1-column layout"
							aria-pressed={layout === 1}
							variant={layout === 1 ? 'default' : 'ghost'}
							size="xs"
							title="Press 1 key for 1-column layout"
							onclick={() => onLayoutChange(1)}
						>
							1
						</Button>
						<Button
							aria-label="Switch to 2-column layout"
							aria-pressed={layout === 2}
							variant={layout === 2 ? 'default' : 'ghost'}
							size="xs"
							title="Press 2 key for 2-column layout"
							onclick={() => onLayoutChange(2)}
						>
							2
						</Button>
						<Button
							aria-label="Switch to 3-column layout"
							aria-pressed={layout === 3}
							variant={layout === 3 ? 'default' : 'ghost'}
							size="xs"
							title="Press 3 key for 3-column layout"
							onclick={() => onLayoutChange(3)}
						>
							3
						</Button>
					</div>
					<Button
						aria-label="Exit focus mode"
						variant="outline"
						size="xs"
						title="Press Escape key to exit focus mode"
						onclick={onExit}
					>
						Exit
					</Button>
				</div>
			</div>

			{#if feedbackMessage}
				<FeedbackFlash message={feedbackMessage} class={`mb-4 ${feedbackClass}`} />
			{/if}

			{#if viewerPages.length === 0}
				<div class="flex min-h-[50vh] items-center justify-center text-center">
					<p class="text-sm text-muted-foreground">Upload the first note file to start reading.</p>
				</div>
			{:else}
				<div class={`grid gap-x-0 gap-y-3 ${focusGridClass}`}>
					{#each viewerPages as viewerPage (viewerPage.id)}
						<SongNotePage
							fileName={viewerPage.fileName}
							fileUrl={viewerPage.fileUrl}
							{maxViewportHeight}
							mimeLabel={viewerPage.mimeLabel}
							mimeType={viewerPage.mimeType}
							pageNumber={viewerPage.page_number}
							sortOrder={viewerPage.sort_order}
							zoom={getPageZoom(viewerPage.id)}
							canZoomIn={getPageZoom(viewerPage.id) < maxPageZoom}
							canZoomOut={getPageZoom(viewerPage.id) > minPageZoom}
							onZoomIn={() => onZoomIn(viewerPage.id)}
							onZoomOut={() => onZoomOut(viewerPage.id)}
							onZoomReset={() => onZoomReset(viewerPage.id)}
							isFocusMode={true}
							showDeleteButton={false}
						/>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>
