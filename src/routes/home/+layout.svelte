<script lang="ts">
	import AppLayout from '../app/+layout.svelte';

	let { children, data } = $props();
</script>

<AppLayout {data}>
	{@render children()}
</AppLayout>
