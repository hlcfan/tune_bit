<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	let { data, form } = $props();

	const redirectsToLibrary = $derived(data.redirectTo === '/home');
	const submittedEmail = $derived(form && 'email' in form ? form.email : '');
	const title = 'Tune Bit | Sign In';
	const description =
		'Sign in to Tune Bit to open your private sheet music library, collections, songs, and note files.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
</svelte:head>

<div class="mx-auto w-full max-w-lg">
	<Card class="border-border/60 shadow-xs">
		<CardHeader class="space-y-5 px-6 pt-7 sm:px-7">
			<h1 class="text-3xl font-medium tracking-tight">Sign in</h1>
			<p class="text-sm leading-7 text-muted-foreground">Pick up where you left off.</p>
			{#if !redirectsToLibrary}
				<p class="text-sm leading-7 text-muted-foreground">
					After you sign in, you&apos;ll head to {data.redirectTo}.
				</p>
			{/if}
		</CardHeader>
		<CardContent class="space-y-8 px-6 pb-6 sm:px-7 sm:pb-7">
			<form method="POST" class="space-y-6">
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						value={submittedEmail}
					/>
				</div>
				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
					/>
				</div>
				{#if form?.message}
					<p
						class="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm leading-6 text-destructive"
					>
						{form.message}
					</p>
				{/if}
				<Button class="w-full" type="submit">Sign in</Button>
			</form>

			<div class="pt-1 text-sm text-muted-foreground">
				<p>
					Need an account?
					<a class="text-foreground underline underline-offset-4" href={resolve('/sign-up')}>
						Create one
					</a>
				</p>
			</div>
		</CardContent>
	</Card>
</div>
