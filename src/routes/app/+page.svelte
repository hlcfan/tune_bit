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
	let activeCollectionId = $state<string | null>(null);
	let activeCollectionMenuId = $state<string | null>(null);

	const totalSongs = $derived(
		data.collections.reduce((runningTotal: number, collection: { songCount: number }) => {
			return runningTotal + collection.songCount;
		}, 0)
	);
	const activeCollection = $derived(
		data.collections.find((collection) => collection.id === activeCollectionId) ?? null
	);
	const createCollectionName = $derived(
		form?.intent === 'createCollection' && 'name' in form ? form.name : ''
	);
	const renameCollectionName = $derived(
		form?.intent === 'renameCollection' && 'name' in form
			? form.name
			: (activeCollection?.name ?? '')
	);
	const feedbackMessage = $derived(form?.message ?? data.message);
	const feedbackClass = $derived(
		form?.success || (!form && data.message)
			? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
			: 'border-destructive/30 bg-destructive/5 text-destructive'
	);
	const renameCollectionMessage = $derived(
		form?.intent === 'renameCollection' ? form.message : null
	);
	const deleteCollectionMessage = $derived(
		form?.intent === 'deleteCollection' ? form.message : null
	);

	function getCollectionDateLabel(timestamp: string) {
		return new Date(timestamp).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getSongCountLabel(songCount: number) {
		return `${songCount} song${songCount === 1 ? '' : 's'}`;
	}

	function toggleCollectionMenu(collectionId: string) {
		activeCollectionMenuId = activeCollectionMenuId === collectionId ? null : collectionId;
	}

	function closeCollectionMenu() {
		activeCollectionMenuId = null;
	}

	function openRenameDialog(collectionId: string) {
		activeCollectionId = collectionId;
		closeCollectionMenu();
		renameDialog?.showModal();
	}

	function closeRenameDialog() {
		renameDialog?.close();
	}

	function openDeleteDialog(collectionId: string) {
		activeCollectionId = collectionId;
		closeCollectionMenu();
		deleteDialog?.showModal();
	}

	function closeDeleteDialog() {
		deleteDialog?.close();
	}

	$effect(() => {
		if (
			!renameDialog ||
			!form ||
			form.intent !== 'renameCollection' ||
			('success' in form && form.success) ||
			!('targetId' in form) ||
			!form.targetId
		) {
			return;
		}

		activeCollectionId = form.targetId;

		if (!renameDialog.open) {
			renameDialog.showModal();
		}
	});

	$effect(() => {
		if (
			!deleteDialog ||
			!form ||
			form.intent !== 'deleteCollection' ||
			('success' in form && form.success) ||
			!('targetId' in form) ||
			!form.targetId
		) {
			return;
		}

		activeCollectionId = form.targetId;

		if (!deleteDialog.open) {
			deleteDialog.showModal();
		}
	});
</script>

<svelte:head>
	<title>Tune Bit | Collections</title>
	<meta
		name="description"
		content="Browse collections, create a new collection, and start a new song from the authenticated Tune Bit home."
	/>
</svelte:head>

<div class="space-y-6">
	<section class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
		<div class="space-y-3">
			<div class="flex flex-wrap items-center gap-2">
				<Badge variant="outline">{data.collections.length} collections</Badge>
				<Badge variant="outline">{totalSongs} songs</Badge>
			</div>
			<div class="space-y-2">
				<h1 class="text-4xl font-semibold tracking-tight">Collections</h1>
				<p class="max-w-3xl text-base text-muted-foreground">
					Keep your library easy to scan, jump into a collection quickly, or start a new song from
					here.
				</p>
			</div>
		</div>

		<div class="flex flex-wrap gap-3">
			<a class={buttonVariants({ variant: 'outline' })} href={resolve('/app/songs/new')}>
				Add New Song
			</a>
		</div>
	</section>

	{#if feedbackMessage}
		<FeedbackFlash message={feedbackMessage} class={feedbackClass} />
	{/if}

	<section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
		<Card class="overflow-visible border-border/70">
			<CardHeader class="space-y-2">
				<CardTitle>Your collections</CardTitle>
				<CardDescription>
					Open any collection to manage songs, settings, and reading workflows.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				{#if data.collections.length === 0}
					<div class="rounded-3xl border border-dashed px-6 py-12 text-center">
						<p class="text-lg font-medium">No collections yet</p>
						<p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
							Create your first collection or go straight to Add New Song. Tune Bit can create a
							default first collection during song setup when you do not have one yet.
						</p>
						<div class="mt-5 flex flex-wrap justify-center gap-3">
							<a class={buttonVariants({ variant: 'outline' })} href={resolve('/app/songs/new')}>
								Add New Song
							</a>
						</div>
					</div>
				{:else}
					<div class="divide-y divide-border rounded-3xl border">
						{#each data.collections as collection (collection.id)}
							<div
								class={`group relative flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-muted/40 lg:flex-row lg:items-center lg:justify-between ${
									activeCollectionMenuId === collection.id ? 'z-30' : 'z-0'
								}`}
							>
								<a
									class="absolute inset-0 rounded-3xl"
									aria-label={`Open ${collection.name}`}
									href={resolve('/app/collections/[collectionId]', {
										collectionId: collection.id
									})}
								>
								</a>
								<div class="relative z-10 min-w-0 space-y-1">
									<p
										class="truncate text-lg font-medium tracking-tight transition-colors group-hover:text-primary"
									>
										{collection.name}
									</p>
									<div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
										<Badge variant="outline">{getSongCountLabel(collection.songCount)}</Badge>
										<p>Updated {getCollectionDateLabel(collection.updated_at)}</p>
									</div>
								</div>

								<div class="relative z-20 flex flex-wrap items-center gap-3">
									<form method="GET" action={resolve('/app/songs/new')}>
										<input type="hidden" name="collectionId" value={collection.id} />
										<Button class="cursor-pointer" type="submit" variant="outline" size="sm">
											Add song
										</Button>
									</form>
									<div
										class="relative z-20 shrink-0"
										use:clickOutside={() => {
											if (activeCollectionMenuId === collection.id) {
												closeCollectionMenu();
											}
										}}
									>
										<Button
											class="cursor-pointer"
											type="button"
											variant="ghost"
											size="icon-sm"
											aria-expanded={activeCollectionMenuId === collection.id}
											aria-haspopup="menu"
											aria-label={`Open actions for ${collection.name}`}
											onclick={() => toggleCollectionMenu(collection.id)}
										>
											<Ellipsis />
										</Button>

										{#if activeCollectionMenuId === collection.id}
											<div
												class="absolute top-full right-0 z-30 mt-2 w-44 rounded-2xl border border-border/70 bg-background p-2 shadow-xl"
											>
												<Button
													class="w-full cursor-pointer justify-start"
													type="button"
													variant="ghost"
													onclick={() => openRenameDialog(collection.id)}
												>
													Rename
												</Button>
												<Button
													class="w-full cursor-pointer justify-start"
													type="button"
													variant="ghost"
													onclick={() => openDeleteDialog(collection.id)}
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

		<Card class="border-border/70">
			<CardHeader class="space-y-2">
				<CardTitle>Add Collection</CardTitle>
				<CardDescription>
					Create a home for rehearsal books, lesson notes, service music, or any other set you want
					to group together.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<form method="POST" action="?/createCollection" class="space-y-4">
					<div class="space-y-2">
						<label class="text-sm font-medium" for="collection-name">Collection name</label>
						<Input
							id="collection-name"
							name="name"
							maxlength={200}
							placeholder="Jazz standards"
							required
							value={createCollectionName}
						/>
					</div>
					<Button class="w-full" type="submit">Create collection</Button>
				</form>

				<div class="rounded-2xl border px-4 py-4 text-sm text-muted-foreground">
					<p class="font-medium text-foreground">Fast path</p>
					<p class="mt-2 leading-6">
						Need to start reading right away? Use Add New Song to create a song first and let Tune
						Bit choose the right collection automatically.
					</p>
				</div>
			</CardContent>
		</Card>
	</section>
</div>

<dialog
	bind:this={renameDialog}
	class="m-auto w-[min(calc(100%-2rem),32rem)] rounded-3xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-background/70"
>
	<div class="space-y-6 p-6">
		<div class="space-y-2">
			<Badge variant="outline" class="w-fit">Collection</Badge>
			<h2 class="text-2xl font-semibold tracking-tight">Rename collection</h2>
			<p class="text-sm text-muted-foreground">
				Update the name for {activeCollection?.name ?? 'this collection'}.
			</p>
		</div>

		{#if renameCollectionMessage}
			<p
				class="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
			>
				{renameCollectionMessage}
			</p>
		{/if}

		<form method="POST" action="?/renameCollection" class="space-y-4">
			<input type="hidden" name="collectionId" value={activeCollection?.id ?? ''} />
			<div class="space-y-2">
				<label class="text-sm font-medium" for="rename-collection-name">Collection name</label>
				<Input
					id="rename-collection-name"
					name="name"
					maxlength={200}
					required
					value={renameCollectionName}
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
				<Badge variant="outline" class="w-fit">Collection</Badge>
				<h2 class="text-2xl font-semibold tracking-tight">Delete collection</h2>
				<p class="text-sm text-muted-foreground">
					This removes {activeCollection?.name ?? 'this collection'} from your library.
				</p>
			</div>
			<Button class="cursor-pointer" type="button" variant="ghost" onclick={closeDeleteDialog}>
				Close
			</Button>
		</div>

		{#if deleteCollectionMessage}
			<p
				class="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
			>
				{deleteCollectionMessage}
			</p>
		{/if}

		<div class="rounded-2xl border px-4 py-4 text-sm text-muted-foreground">
			<p class="font-medium text-foreground">Confirm deletion</p>
			<p class="mt-2 leading-6">
				Remove this collection only if you are sure. This action cannot be undone.
			</p>
		</div>

		<form method="POST" action="?/deleteCollection" class="space-y-4">
			<input type="hidden" name="collectionId" value={activeCollection?.id ?? ''} />
			<input type="hidden" name="collectionName" value={activeCollection?.name ?? ''} />
			<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<Button class="cursor-pointer" type="button" variant="ghost" onclick={closeDeleteDialog}>
					Cancel
				</Button>
				<Button class="cursor-pointer" type="submit" variant="destructive">
					Delete collection
				</Button>
			</div>
		</form>
	</div>
</dialog>
