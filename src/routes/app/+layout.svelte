<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { onMount } from 'svelte';

	let { children, data } = $props();
	let isSongFocusMode = $state(false);

	const emailLabel = $derived(data.user?.email ?? 'Library menu');
	const avatarLabel = $derived((data.user?.email?.charAt(0) ?? 'T').toUpperCase());
	const isSongPage = $derived(page.route.id === '/app/collections/[collectionId]/songs/[songId]');
	const shouldHideFloatingMenu = $derived(isSongPage && isSongFocusMode);

	onMount(() => {
		if (!browser) {
			return;
		}

		const handleSongFocusModeChange = (event: Event) => {
			if (event instanceof CustomEvent) {
				isSongFocusMode = Boolean(event.detail);
			}
		};

		window.addEventListener('tunebit:song-focus-mode-change', handleSongFocusModeChange);

		return () => {
			window.removeEventListener('tunebit:song-focus-mode-change', handleSongFocusModeChange);
		};
	});
</script>

<div class="min-h-screen">
	<main class="min-h-screen px-4 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-28 lg:px-8 xl:px-10">
		{@render children()}
	</main>

	{#if !shouldHideFloatingMenu}
		<details class="fixed bottom-4 left-4 z-40 [&_summary::-webkit-details-marker]:hidden">
			<div
				class="absolute bottom-full left-0 mb-3 w-64 rounded-3xl border border-border/70 bg-background/95 p-2 shadow-2xl backdrop-blur"
			>
				<p class="px-3 py-2 text-xs text-muted-foreground">{emailLabel}</p>
				<div class="space-y-1">
					<a
						class={`${buttonVariants({ variant: 'ghost' })} w-full justify-start`}
						href={resolve('/app')}
					>
						Collections
					</a>
					<form method="POST" action={resolve('/auth/sign-out')}>
						<button
							class={`${buttonVariants({ variant: 'ghost' })} w-full justify-start`}
							type="submit"
						>
							Log out
						</button>
					</form>
				</div>
			</div>

			<summary
				aria-label="Open library menu"
				class="flex size-12 cursor-pointer list-none items-center justify-center rounded-full border border-border/70 bg-background/95 shadow-lg backdrop-blur transition-colors hover:bg-muted"
			>
				<span
					class="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
				>
					{avatarLabel}
				</span>
			</summary>
		</details>
	{/if}
</div>
