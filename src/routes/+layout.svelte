<script lang="ts">
	import './layout.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { buttonVariants } from '$lib/components/ui/button/index.js';

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
		<div class="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
			<header
				class="mb-10 flex flex-col gap-4 rounded-3xl border border-border bg-background/85 px-4 py-4 shadow-xs backdrop-blur sm:flex-row sm:items-center sm:justify-between"
			>
				<div class="space-y-1">
					<a class="text-lg font-semibold tracking-tight text-foreground" href={resolve('/')}
						>Tune Bit</a
					>
					<p class="max-w-2xl text-sm text-muted-foreground">
						A calm, private library for collections, songs, uploads, and fast note reading.
					</p>
				</div>

				<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
					<nav class="flex items-center gap-1 text-sm">
						<a
							class="rounded-full px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
							href={resolve('/')}
						>
							Overview
						</a>
						{#if data.user}
							<a
								class="rounded-full px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
								href={resolve('/home')}
							>
								Library
							</a>
						{:else}
							<a
								class="rounded-full px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
								href={resolve('/sign-in')}
							>
								Sign in
							</a>
							<a
								class="rounded-full px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
								href={resolve('/sign-up')}
							>
								Sign up
							</a>
						{/if}
					</nav>

					{#if data.user}
						<div class="flex items-center gap-3">
							<p class="hidden text-sm text-muted-foreground lg:block">{data.user?.email}</p>
							<form method="POST" action={resolve('/auth/sign-out')}>
								<button class={buttonVariants({ variant: 'outline' })} type="submit">
									Sign out
								</button>
							</form>
						</div>
					{:else}
						<a class={buttonVariants({ variant: 'outline' })} href={resolve('/sign-up')}>
							Create account
						</a>
					{/if}
				</div>
			</header>

			<main class="flex-1">
				{@render children()}
			</main>

			<footer
				class="mt-10 flex flex-col gap-2 border-t border-border px-1 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
			>
				<p>Collections and songs now live inside the protected library shell.</p>
				<p>Next up: secure uploads, storage metadata, and the collection-level upload flow.</p>
			</footer>
		</div>
	{/if}
</div>
