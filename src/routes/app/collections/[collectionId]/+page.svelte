<script lang="ts">
	import { Ellipsis } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import FeedbackFlash from '$lib/components/feedback-flash.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { clickOutside } from '$lib/utils.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	let { data, form } = $props();
	let renameDialog = $state<HTMLDialogElement | null>(null);
	let deleteDialog = $state<HTMLDialogElement | null>(null);
	let activeSongId = $state<string | null>(null);
	let activeSongMenuId = $state<string | null>(null);

	const libraryPath = resolve('/home');
	const renameCollectionName = $derived(
		form?.intent === 'renameCollection' && 'name' in form ? form.name : data.collection.name
	);
	const feedbackMessage = $derived(form?.message ?? data.message);
	const feedbackClass = $derived(
		form?.success || (!form && data.message)
			? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
			: 'border-destructive/30 bg-destructive/5 text-destructive'
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
	const activeSong = $derived(data.songs.find((song) => song.id === activeSongId) ?? null);
	const renameSongTitle = $derived(activeSong ? getSongTitle(activeSong) : '');
	const renameSongMessage = $derived(form?.intent === 'renameSong' ? form.message : null);
	const deleteSongMessage = $derived(form?.intent === 'deleteSong' ? form.message : null);

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

	function getSongCountLabel(songCount: number) {
		return `${songCount} song${songCount === 1 ? '' : 's'}`;
	}

	function toggleSongMenu(songId: string) {
		activeSongMenuId = activeSongMenuId === songId ? null : songId;
	}

	function closeSongMenu() {
		activeSongMenuId = null;
	}

	function openRenameDialog(songId: string) {
		activeSongId = songId;
		closeSongMenu();
		renameDialog?.showModal();
	}

	function closeRenameDialog() {
		renameDialog?.close();
	}

	function openDeleteDialog(songId: string) {
		activeSongId = songId;
		closeSongMenu();
		deleteDialog?.showModal();
	}

	function closeDeleteDialog() {
		deleteDialog?.close();
	}

	$effect(() => {
		if (
			!renameDialog ||
			!form ||
			form.intent !== 'renameSong' ||
			('success' in form && form.success) ||
			!('targetId' in form) ||
			!form.targetId
		) {
			return;
		}

		activeSongId = form.targetId;

		if (!renameDialog.open) {
			renameDialog.showModal();
		}
	});

	$effect(() => {
		if (
			!deleteDialog ||
			!form ||
			form.intent !== 'deleteSong' ||
			('success' in form && form.success) ||
			!('targetId' in form) ||
			!form.targetId
		) {
			return;
		}

		activeSongId = form.targetId;

		if (!deleteDialog.open) {
			deleteDialog.showModal();
		}
	});
</script>

<svelte:head>
	<title>Tune Bit | {data.collection.name}</title>
	<meta
		name="description"
		content="Browse a collection, manage song names, and open the integrated Tune Bit song screen."
	/>
</svelte:head>

<div class="space-y-6">
	<section class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
		<div class="space-y-3">
			<div class="flex flex-wrap items-center gap-2">
				<a class={buttonVariants({ variant: 'outline' })} href={libraryPath}>Collections</a>
				<Badge variant="outline">{getSongCountLabel(data.songs.length)}</Badge>
				<Badge variant="outline">{totalUploadedFiles} files</Badge>
				<Badge variant="outline">{totalUploadedPages} pages</Badge>
				<Badge variant="outline">Updated {getDateLabel(data.collection.updated_at)}</Badge>
			</div>
			<div class="space-y-2">
				<h1 class="text-4xl font-semibold tracking-tight">{data.collection.name}</h1>
			</div>
		</div>

		<form method="GET" action={resolve('/app/songs/new')}>
			<input type="hidden" name="collectionId" value={data.collection.id} />
			<Button type="submit">Add New Song</Button>
		</form>
	</section>

	{#if feedbackMessage}
		<FeedbackFlash message={feedbackMessage} class={feedbackClass} />
	{/if}

	<section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
		<Card class="overflow-visible border-border/70">
			<CardHeader class="space-y-2">
				<CardTitle>Songs</CardTitle>
				<CardDescription>
					Keep the list compact, open a song to read and upload notes, and tuck management actions
					into a lightweight row menu.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if data.songs.length === 0}
					<div class="rounded-3xl border border-dashed px-6 py-12 text-center">
						<p class="text-lg font-medium">No songs yet</p>
						<p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
							Create the first song for this collection, then use the song page to upload notes and
							start reading.
						</p>
						<div class="mt-5">
							<form method="GET" action={resolve('/app/songs/new')}>
								<input type="hidden" name="collectionId" value={data.collection.id} />
								<Button type="submit">Add New Song</Button>
							</form>
						</div>
					</div>
				{:else}
					<div class="space-y-4">
						{#each data.songs as song (song.id)}
							<div
								class="group relative rounded-3xl border px-5 py-4 transition-colors hover:bg-muted/40"
							>
								<a
									class="absolute inset-0 rounded-3xl"
									aria-label={`Open ${song.title}`}
									href={resolve('/app/collections/[collectionId]/songs/[songId]', {
										collectionId: data.collection.id,
										songId: song.id
									})}
								>
								</a>
								<div
									class="pointer-events-none relative z-10 flex items-start justify-between gap-4"
								>
									<div class="min-w-0 space-y-1">
										<p
											class="truncate text-lg font-medium tracking-tight transition-colors group-hover:text-primary"
										>
											{song.title}
										</p>
										<p class="text-sm text-muted-foreground">
											Updated {getDateLabel(song.updated_at)}
										</p>
										<p class="text-sm text-muted-foreground">
											{song.fileCount} files · {song.pageCount} pages
										</p>
									</div>

									<div
										class="pointer-events-auto relative z-20 shrink-0"
										use:clickOutside={() => {
											if (activeSongMenuId === song.id) {
												closeSongMenu();
											}
										}}
									>
										<Button
											class="cursor-pointer"
											type="button"
											variant="ghost"
											size="icon-sm"
											aria-expanded={activeSongMenuId === song.id}
											aria-haspopup="menu"
											aria-label={`Open actions for ${song.title}`}
											onclick={() => toggleSongMenu(song.id)}
										>
											<Ellipsis />
										</Button>

										{#if activeSongMenuId === song.id}
											<div
												class="absolute top-full right-0 z-20 mt-2 w-44 rounded-2xl border border-border/70 bg-background p-2 shadow-xl"
											>
												<Button
													class="w-full cursor-pointer justify-start"
													type="button"
													variant="ghost"
													onclick={() => openRenameDialog(song.id)}
												>
													Rename
												</Button>
												<Button
													class="w-full cursor-pointer justify-start"
													type="button"
													variant="ghost"
													onclick={() => openDeleteDialog(song.id)}
												>
													Delete
												</Button>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<div class="space-y-6">
			<Card class="border-border/70">
				<CardHeader class="space-y-2">
					<CardTitle>Settings</CardTitle>
					<CardDescription>Rename this collection.</CardDescription>
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
						<Button type="submit" variant="outline" class="w-full">Save collection name</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	</section>
</div>

<dialog
	bind:this={renameDialog}
	class="m-auto w-[min(calc(100%-2rem),32rem)] rounded-3xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-background/70"
>
	<div class="space-y-6 p-6">
		<div class="space-y-2">
			<Badge variant="outline" class="w-fit">Song</Badge>
			<h2 class="text-2xl font-semibold tracking-tight">Rename song</h2>
			<p class="text-sm text-muted-foreground">
				Update the title for {activeSong?.title ?? 'this song'}.
			</p>
		</div>

		{#if renameSongMessage}
			<p
				class="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
			>
				{renameSongMessage}
			</p>
		{/if}

		<form method="POST" action="?/renameSong" class="space-y-4">
			<input type="hidden" name="songId" value={activeSong?.id ?? ''} />
			<div class="space-y-2">
				<label class="text-sm font-medium" for="rename-song-title">Song title</label>
				<Input
					id="rename-song-title"
					name="title"
					maxlength={200}
					required
					value={renameSongTitle}
				/>
			</div>
			<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<Button class="cursor-pointer" type="button" variant="ghost" onclick={closeRenameDialog}>
					Cancel
				</Button>
				<Button class="cursor-pointer" type="submit" variant="outline">Save</Button>
			</div>
		</form>
	</div>
</dialog>

<dialog
	bind:this={deleteDialog}
	class="m-auto w-[min(calc(100%-2rem),32rem)] rounded-3xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-background/70"
>
	<div class="space-y-6 p-6">
		<div class="flex items-start justify-between gap-4">
			<div class="space-y-2">
				<Badge variant="outline" class="w-fit">Song</Badge>
				<h2 class="text-2xl font-semibold tracking-tight">Delete song</h2>
				<p class="text-sm text-muted-foreground">
					This removes {activeSong?.title ?? 'this song'} from the collection.
				</p>
			</div>
			<Button class="cursor-pointer" type="button" variant="ghost" onclick={closeDeleteDialog}>
				Close
			</Button>
		</div>

		{#if deleteSongMessage}
			<p
				class="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
			>
				{deleteSongMessage}
			</p>
		{/if}

		<div class="rounded-2xl border px-4 py-4 text-sm text-muted-foreground">
			<p class="font-medium text-foreground">Confirm deletion</p>
			<p class="mt-2 leading-6">
				Remove this song and its uploaded files only if you are sure. This action cannot be undone.
			</p>
		</div>

		<form method="POST" action="?/deleteSong" class="space-y-4">
			<input type="hidden" name="songId" value={activeSong?.id ?? ''} />
			<input type="hidden" name="songTitle" value={activeSong?.title ?? ''} />
			<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<Button class="cursor-pointer" type="button" variant="ghost" onclick={closeDeleteDialog}>
					Cancel
				</Button>
				<Button class="cursor-pointer" type="submit" variant="destructive">Delete song</Button>
			</div>
		</form>
	</div>
</dialog>
