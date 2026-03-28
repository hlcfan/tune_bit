<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardFooter,
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
		form?.success
			? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
			: 'border-destructive/30 bg-destructive/5 text-destructive'
	);

	function getRenameValue(collection: { id: string; name: string }) {
		if (form?.intent === 'renameCollection' && form?.targetId === collection.id && 'name' in form) {
			return form.name;
		}

		return collection.name;
	}

	function getCollectionDateLabel(timestamp: string) {
		return new Date(timestamp).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Tune Bit | Library</title>
	<meta
		name="description"
		content="Manage your private Tune Bit collections and songs inside the protected library."
	/>
</svelte:head>

<div class="space-y-8">
	<section class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
		<Card class="border-border/70 bg-card/90">
			<CardHeader class="space-y-4">
				<Badge variant="outline" class="w-fit">Phase 4 collections and songs</Badge>
				<div class="space-y-3">
					<CardTitle class="max-w-3xl text-4xl leading-tight font-semibold tracking-tight">
						Build your private note library one collection at a time.
					</CardTitle>
					<CardDescription class="max-w-2xl text-base leading-7">
						Collections are now backed by the authenticated database schema, and each one becomes
						the home for the songs you will upload and read in later phases.
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent class="grid gap-4 sm:grid-cols-3">
				<div class="rounded-2xl border border-dashed px-4 py-4">
					<p class="text-sm text-muted-foreground">Collections</p>
					<p class="mt-2 font-medium">{data.collections.length}</p>
				</div>
				<div class="rounded-2xl border border-dashed px-4 py-4">
					<p class="text-sm text-muted-foreground">Songs</p>
					<p class="mt-2 font-medium">{totalSongs}</p>
				</div>
				<div class="rounded-2xl border border-dashed px-4 py-4">
					<p class="text-sm text-muted-foreground">Signed in as</p>
					<p class="mt-2 font-medium break-all">{data.user.email}</p>
				</div>
			</CardContent>
		</Card>

		<Card class="border-border/70">
			<CardHeader>
				<Badge variant="outline" class="w-fit">Create collection</Badge>
				<CardTitle>Start a new collection</CardTitle>
				<CardDescription>
					Use collections to separate sets like rehearsal books, lessons, or service music before
					adding songs inside them.
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
					<p class="font-medium text-foreground">What this unlocks</p>
					<p class="mt-2">
						Each collection gets its own song list, management actions, and future upload entry
						point.
					</p>
				</div>
			</CardContent>
		</Card>
	</section>

	<section>
		<Card class="border-border/70">
			<CardHeader>
				<CardTitle>Your collections</CardTitle>
				<CardDescription>
					Rename, delete, and open collections to manage the songs they contain.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if feedbackMessage}
					<p class={`rounded-xl border px-3 py-2 text-sm ${feedbackClass}`}>
						{feedbackMessage}
					</p>
				{/if}

				{#if data.collections.length === 0}
					<div class="rounded-2xl border border-dashed px-4 py-8 text-center">
						<p class="text-base font-medium">No collections yet</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Create your first collection to start organizing songs for future uploads and reading.
						</p>
					</div>
				{:else}
					<div class="grid gap-4 xl:grid-cols-2">
						{#each data.collections as collection (collection.id)}
							<Card class="border-border/70 bg-background/80">
								<CardHeader class="space-y-3">
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div class="space-y-1">
											<CardTitle>{collection.name}</CardTitle>
											<CardDescription>
												Updated {getCollectionDateLabel(collection.updated_at)}
											</CardDescription>
										</div>
										<Badge variant="outline">{collection.songCount} songs</Badge>
									</div>
								</CardHeader>
								<CardContent class="space-y-4">
									<form method="POST" action="?/renameCollection" class="space-y-3">
										<input type="hidden" name="collectionId" value={collection.id} />
										<div class="space-y-2">
											<label class="text-sm font-medium" for={`rename-${collection.id}`}>
												Collection name
											</label>
											<Input
												id={`rename-${collection.id}`}
												name="name"
												maxlength={200}
												required
												value={getRenameValue(collection)}
											/>
										</div>
										<Button type="submit" variant="outline">Save name</Button>
									</form>
								</CardContent>
								<CardFooter
									class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between"
								>
									<a
										class={buttonVariants({ variant: 'ghost' })}
										href={resolve('/app/collections/[collectionId]', {
											collectionId: collection.id
										})}
									>
										Open collection
									</a>
									<form method="POST" action="?/deleteCollection">
										<input type="hidden" name="collectionId" value={collection.id} />
										<input type="hidden" name="collectionName" value={collection.name} />
										<Button type="submit" variant="destructive">Delete</Button>
									</form>
								</CardFooter>
							</Card>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	</section>

	<section class="flex flex-wrap items-center gap-3">
		<a class={buttonVariants({})} href={resolve('/')}> Review product overview </a>
		<a class={buttonVariants({ variant: 'outline' })} href={resolve('/')}>
			Back to the public home page
		</a>
	</section>
</div>
