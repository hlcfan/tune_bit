<script lang="ts">
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
	import { Input } from '$lib/components/ui/input/index.js';

	let { data, form } = $props();

	const collections = $derived(data.collections ?? []);
	const selectedCollectionId = $derived(
		form?.intent === 'createSong' && 'collectionId' in form
			? form.collectionId
			: data.selectedCollectionId
	);
	const selectedCollection = $derived(
		collections.find((collection: { id: string }) => collection.id === selectedCollectionId) ?? null
	);
	const songTitle = $derived(form?.intent === 'createSong' && 'title' in form ? form.title : '');
	const feedbackMessage = $derived(form?.message ?? '');
	const feedbackClass = $derived(
		form && 'success' in form && form.success
			? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
			: 'border-destructive/30 bg-destructive/5 text-destructive'
	);
</script>

<svelte:head>
	<title>Tune Bit | Add New Song</title>
	<meta
		name="description"
		content="Create a new song in Tune Bit and choose which collection it should belong to."
	/>
</svelte:head>

<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
	<section class="space-y-6">
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
				<a class={buttonVariants({ variant: 'outline' })} href={resolve('/app')}>Back</a>
			{/if}
			<Badge variant="outline">Add New Song</Badge>
			{#if collections.length > 0}
				<Badge variant="outline">{collections.length} collections</Badge>
			{/if}
		</div>

		<div class="space-y-3">
			<h1 class="text-4xl font-semibold tracking-tight">Create a song</h1>
			<p class="max-w-3xl text-base text-muted-foreground">
				Start with the title, choose the right collection, and continue directly into the song
				detail screen for note uploads and reading.
			</p>
		</div>

		<Card class="border-border/70">
			<CardHeader class="space-y-2">
				<CardTitle>Song details</CardTitle>
				<CardDescription>
					Tune Bit preselects the current collection when you come from a collection page and falls
					back to your most recently updated collection from the collections home.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if feedbackMessage}
					<p class={`rounded-2xl border px-4 py-3 text-sm ${feedbackClass}`}>
						{feedbackMessage}
					</p>
				{/if}

				<form method="POST" action="?/createSong" class="space-y-5">
					<div class="space-y-2">
						<label class="text-sm font-medium" for="song-title">Song title</label>
						<Input
							id="song-title"
							name="title"
							maxlength={200}
							placeholder="Autumn Leaves"
							required
							value={songTitle}
						/>
					</div>

					<div class="space-y-2">
						<label class="text-sm font-medium" for="collection-id">Collection</label>
						<select
							id="collection-id"
							name="collectionId"
							class="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
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

					<Button class="w-full sm:w-auto" type="submit">Create song</Button>
				</form>
			</CardContent>
		</Card>
	</section>

	<section class="space-y-6">
		<Card class="border-border/70">
			<CardHeader class="space-y-2">
				<CardTitle>What happens next</CardTitle>
				<CardDescription>
					After creation, Tune Bit opens the song page so you can upload notes without leaving
					context.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4 text-sm text-muted-foreground">
				<div class="rounded-2xl border px-4 py-4">
					<p class="font-medium text-foreground">From collections home</p>
					<p class="mt-2 leading-6">
						The collection list is ordered by recent activity, so the newest collection is ready by
						default.
					</p>
				</div>
				<div class="rounded-2xl border px-4 py-4">
					<p class="font-medium text-foreground">From a collection</p>
					<p class="mt-2 leading-6">
						The selected collection stays locked in as the starting choice for the new song.
					</p>
				</div>
				<div class="rounded-2xl border px-4 py-4">
					<p class="font-medium text-foreground">First run</p>
					<p class="mt-2 leading-6">
						If you do not have any collections yet, Tune Bit creates {data.defaultCollectionName}
						before it creates the song.
					</p>
				</div>
			</CardContent>
		</Card>
	</section>
</div>
