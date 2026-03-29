<script lang="ts">
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

	let { data, form } = $props();

	const totalSongs = $derived(
		data.collections.reduce((runningTotal: number, collection: { songCount: number }) => {
			return runningTotal + collection.songCount;
		}, 0)
	);
	const createCollectionName = $derived(
		form?.intent === 'createCollection' && 'name' in form ? form.name : ''
	);
	const feedbackMessage = $derived(form?.message ?? data.message);
	const feedbackClass = $derived(
		form?.success || (!form && data.message)
			? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
			: 'border-destructive/30 bg-destructive/5 text-destructive'
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
			<a class={buttonVariants({ variant: 'ghost' })} href={resolve('/')}>Public overview</a>
		</div>
	</section>

	{#if feedbackMessage}
		<FeedbackFlash message={feedbackMessage} class={feedbackClass} />
	{/if}

	<section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
		<Card class="border-border/70">
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
								class="group relative flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-muted/40 lg:flex-row lg:items-center lg:justify-between"
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
									<p class="text-sm text-muted-foreground">
										Updated {getCollectionDateLabel(collection.updated_at)}
									</p>
								</div>

								<div class="relative z-10 flex flex-wrap items-center gap-3">
									<Badge variant="outline">{getSongCountLabel(collection.songCount)}</Badge>
									<form method="GET" action={resolve('/app/songs/new')}>
										<input type="hidden" name="collectionId" value={collection.id} />
										<Button class="cursor-pointer" type="submit" variant="outline" size="sm">
											Add song
										</Button>
									</form>
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
