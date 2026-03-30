<script lang="ts">
	import './layout.css';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { buttonVariants } from '$lib/components/ui/button/index.js';

	injectSpeedInsights();

	let { children, data } = $props();

	const isAuthenticatedAppRoute = $derived(
		page.route.id?.startsWith('/app') || page.route.id?.startsWith('/home') || false
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Tune Bit</title>
	<meta
		name="description"
		content="Tune Bit is a private note library for uploading, organizing, and viewing musical notes by collection and song."
	/>
</svelte:head>

<div class="min-h-screen bg-background">
	{#if isAuthenticatedAppRoute}
		{@render children()}
	{:else}
		<div class="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
			<header class="flex items-center justify-between gap-4 border-b border-border/50 pb-7">
				<a class="text-[1.1rem] font-semibold tracking-tight text-foreground" href={resolve('/')}
					>Tune Bit</a
				>

				<div class="flex items-center gap-2 sm:gap-3">
					{#if data.user}
						<a
							class="text-sm text-muted-foreground transition-colors hover:text-foreground"
							href={resolve('/home')}
						>
							Open library
						</a>
						<form method="POST" action={resolve('/auth/sign-out')}>
							<button class={buttonVariants({ variant: 'outline' })} type="submit">
								Sign out
							</button>
						</form>
					{:else}
						<a
							class="text-sm text-muted-foreground transition-colors hover:text-foreground"
							href={resolve('/sign-in')}
						>
							Sign in
						</a>
						<a class={buttonVariants({})} href={resolve('/sign-up')}>Create account</a>
					{/if}
				</div>
			</header>

			<main class="flex flex-1 flex-col justify-center py-20 sm:py-24">
				{@render children()}
			</main>

			<footer class="border-t border-border/50 pt-7 text-sm text-muted-foreground">
				<p>A calm, private place for collections, songs, and note pages.</p>
			</footer>
		</div>
	{/if}
</div>
