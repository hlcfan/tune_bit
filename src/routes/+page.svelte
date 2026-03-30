<script lang="ts">
	import { resolve } from '$app/paths';
	import { buttonVariants } from '$lib/components/ui/button/index.js';

	let { data } = $props();

	const benefits = [
		'Keep collections and songs together in a private library.',
		'Upload PDFs or images without adding clutter to the workflow.',
		'Read notes in a calm viewer built for quick scanning and focus.'
	];
</script>

<svelte:head>
	<title>Tune Bit</title>
	<meta
		name="description"
		content="Tune Bit is a private place to organize collections and songs, upload note files, and read music without clutter."
	/>
</svelte:head>

<div class="space-y-16">
	<section class="mx-auto max-w-4xl space-y-8">
		<div class="space-y-5">
			<p class="text-sm font-medium text-muted-foreground">Tune Bit</p>
			<h1 class="max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
				A private place for your sheet music and note pages.
			</h1>
			<p class="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
				Keep collections and songs together, upload PDFs or images, and read notes without a busy
				interface getting in the way.
			</p>
		</div>

		<div class="flex flex-col gap-3 sm:flex-row">
			{#if data.user}
				<a class={buttonVariants({})} href={resolve('/home')}>Open library</a>
			{:else}
				<a class={buttonVariants({})} href={resolve('/sign-up')}>Create account</a>
				<a class={buttonVariants({ variant: 'outline' })} href={resolve('/sign-in')}>Sign in</a>
			{/if}
		</div>
	</section>

	<section class="mx-auto max-w-4xl border-t border-border/70 pt-8">
		<div class="grid gap-6 md:grid-cols-3">
			{#each benefits as benefit (benefit)}
				<div class="space-y-2">
					<p class="text-sm font-medium text-foreground">What Tune Bit helps with</p>
					<p class="text-sm leading-6 text-muted-foreground">{benefit}</p>
				</div>
			{/each}
		</div>
	</section>

	<section class="mx-auto max-w-4xl border-t border-border/70 pt-8">
		<div class="max-w-2xl space-y-3">
			<p class="text-sm font-medium text-foreground">Private by default</p>
			<p class="text-sm leading-6 text-muted-foreground sm:text-base">
				Your library opens only after sign-in, so collections, songs, and note files stay tied to
				your account from the start.
			</p>
		</div>
	</section>
</div>
