<script lang="ts">
	import { X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { fade } from 'svelte/transition';

	let {
		message = '',
		class: className = '',
		timeoutMs = 4000,
		ariaLive = 'polite',
		onDismiss = () => {}
	}: {
		message?: string;
		class?: string;
		timeoutMs?: number;
		ariaLive?: 'off' | 'polite' | 'assertive';
		onDismiss?: () => void;
	} = $props();

	let isVisible = $state(false);
	let dismissTimer: ReturnType<typeof setTimeout> | null = null;

	function clearDismissTimer() {
		if (dismissTimer) {
			clearTimeout(dismissTimer);
			dismissTimer = null;
		}
	}

	function dismiss() {
		clearDismissTimer();
		isVisible = false;
		onDismiss();
	}

	$effect(() => {
		clearDismissTimer();

		if (!message) {
			isVisible = false;
			return;
		}

		isVisible = true;

		if (timeoutMs > 0) {
			dismissTimer = setTimeout(() => {
				isVisible = false;
				dismissTimer = null;
				onDismiss();
			}, timeoutMs);
		}

		return () => clearDismissTimer();
	});
</script>

{#if message && isVisible}
	<div
		in:fade={{ duration: 150 }}
		out:fade={{ duration: 200 }}
		aria-live={ariaLive}
		class={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${className}`}
		role="status"
	>
		<p class="min-w-0 flex-1">{message}</p>
		<Button
			type="button"
			variant="ghost"
			size="icon-xs"
			class="-mt-1 -mr-1 shrink-0 rounded-full text-current hover:bg-black/5 dark:hover:bg-white/10"
			aria-label="Dismiss notification"
			onclick={dismiss}
		>
			<X />
		</Button>
	</div>
{/if}
