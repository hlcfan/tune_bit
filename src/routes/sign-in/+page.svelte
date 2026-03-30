<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	let { data, form } = $props();

	const redirectsToLibrary = $derived(data.redirectTo === '/home');
	const submittedEmail = $derived(form && 'email' in form ? form.email : '');
</script>

<svelte:head>
	<title>Tune Bit | Sign In</title>
	<meta
		name="description"
		content="Sign in to Tune Bit to access your private collections, songs, and note files."
	/>
</svelte:head>

<div class="mx-auto max-w-md">
	<Card class="border-border/70 shadow-xs">
		<CardHeader class="space-y-3">
			<CardTitle class="text-3xl tracking-tight">Sign in</CardTitle>
			<p class="text-sm leading-6 text-muted-foreground">
				Use your email and password to open your library.
			</p>
			{#if !redirectsToLibrary}
				<p class="text-sm leading-6 text-muted-foreground">
					After signing in, you&apos;ll continue to {data.redirectTo}.
				</p>
			{/if}
		</CardHeader>
		<CardContent class="space-y-6">
			<form method="POST" class="space-y-4">
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
						class="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
					>
						{form.message}
					</p>
				{/if}
				<Button class="w-full" type="submit">Sign in</Button>
			</form>

			<div class="space-y-3 text-sm text-muted-foreground">
				<p>
					Need an account?
					<a class="text-foreground underline underline-offset-4" href={resolve('/sign-up')}>
						Create one here
					</a>
				</p>
				<a
					class="inline-flex text-muted-foreground transition-colors hover:text-foreground"
					href={resolve('/')}
				>
					Back to overview
				</a>
			</div>
		</CardContent>
	</Card>
</div>
