<script lang="ts">
	import { resolve } from '$app/paths';
	import { buttonVariants } from '$lib/components/ui/button/index.js';

	let { children, data } = $props();

	const emailLabel = $derived(data.user?.email ?? 'Library menu');
	const avatarLabel = $derived((data.user?.email?.charAt(0) ?? 'T').toUpperCase());
</script>

<div class="min-h-screen">
	<main class="min-h-screen px-4 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-28 lg:px-8 xl:px-10">
		{@render children()}
	</main>

	<details class="fixed bottom-4 left-4 z-40 w-64 [&_summary::-webkit-details-marker]:hidden">
		<div
			class="mb-3 rounded-3xl border border-border/70 bg-background/95 p-2 shadow-2xl backdrop-blur"
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
			class="flex cursor-pointer list-none items-center gap-3 rounded-full border border-border/70 bg-background/95 px-3 py-2 shadow-lg backdrop-blur transition-colors hover:bg-muted"
		>
			<span
				class="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
			>
				{avatarLabel}
			</span>
			<span class="text-sm font-medium text-foreground">Library menu</span>
		</summary>
	</details>
</div>
