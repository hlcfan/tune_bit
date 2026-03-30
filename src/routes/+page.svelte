<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { buttonVariants } from '$lib/components/ui/button/index.js';

	let { data } = $props();
	const title = 'Tune Bit | Private Sheet Music Library';
	const description =
		'Tune Bit is a private sheet music library for organizing collections and songs, uploading note files, and reading music without clutter.';
	const canonicalUrl = $derived(new URL(page.url.pathname, page.url.origin).toString());

	const benefits = [
		{
			title: 'Everything stays together',
			body: 'Collections, songs, PDFs, and note pages live in one tidy place, so you spend less time hunting.'
		},
		{
			title: 'Uploads stay simple',
			body: 'Bring in images or PDFs, sort them into the right song, and move on without extra setup.'
		},
		{
			title: 'Reading stays clear',
			body: 'Open the notes, adjust the view, and focus on the music instead of the interface.'
		}
	];
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
</svelte:head>

<div class="space-y-24">
	<section class="mx-auto max-w-4xl space-y-12">
		<div class="space-y-7">
			<p class="text-sm font-medium tracking-wide text-muted-foreground">
				Private sheet music library
			</p>
			<h1 class="max-w-3xl text-4xl leading-[1.02] font-semibold tracking-tight sm:text-5xl">
				Sheet music gets scattered fast. It doesn&apos;t have to.
			</h1>
			<p class="max-w-2xl text-[1.05rem] leading-8 text-muted-foreground sm:text-[1.1rem]">
				Keep collections, songs, PDFs, and note pages in one calm, private place so you can open
				what you need and get on with playing.
			</p>
		</div>

		<div class="flex flex-col gap-3 pt-2 sm:flex-row">
			{#if data.user}
				<a class={buttonVariants({})} href={resolve('/home')}>Open library</a>
			{:else}
				<a class={buttonVariants({})} href={resolve('/sign-up')}>Create account</a>
				<a class={buttonVariants({ variant: 'outline' })} href={resolve('/sign-in')}>Sign in</a>
			{/if}
		</div>
	</section>

	<section class="mx-auto max-w-4xl border-t border-border/60 pt-12">
		<div class="grid gap-10 md:grid-cols-3">
			{#each benefits as benefit (benefit)}
				<div class="space-y-3">
					<p class="text-base font-medium tracking-tight text-foreground">{benefit.title}</p>
					<p class="text-sm leading-7 text-muted-foreground">{benefit.body}</p>
				</div>
			{/each}
		</div>
	</section>

	<section class="mx-auto max-w-4xl border-t border-border/60 pt-12">
		<div class="max-w-2xl space-y-4">
			<p class="text-sm font-medium text-foreground">Private by default</p>
			<p class="text-sm leading-7 text-muted-foreground sm:text-base">
				You sign in before you enter the library, and your collections, songs, and note files stay
				with your account from the start. It&apos;s your space, not a public folder with extra
				steps.
			</p>
		</div>
	</section>
</div>
