<script lang="ts">
	import AppHomePage from '../app/+page.svelte';

	let { data, form } = $props();
</script>

<AppHomePage {data} {form} />
