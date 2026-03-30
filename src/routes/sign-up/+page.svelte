<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { cn } from '$lib/utils.js';

	let { data, form } = $props();

	const redirectsToLibrary = $derived(data.redirectTo === '/home');
	const submittedEmail = $derived(form && 'email' in form ? form.email : '');
	const isSuccess = $derived(Boolean(form && 'success' in form && form.success));
</script>

<svelte:head>
	<title>Tune Bit | Sign Up</title>
	<meta
		name="description"
		content="Create a Tune Bit account to build a private online note library for collections, songs, and uploads."
	/>
</svelte:head>

<div class="mx-auto max-w-md">
	<Card class="border-border/70 shadow-xs">
		<CardHeader class="space-y-3">
			<CardTitle class="text-3xl tracking-tight">Create your account</CardTitle>
			<p class="text-sm leading-6 text-muted-foreground">
				Set up your private library with your email and password.
			</p>
			{#if !redirectsToLibrary}
				<p class="text-sm leading-6 text-muted-foreground">
					After sign-up, you&apos;ll continue to {data.redirectTo}.
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
						autocomplete="new-password"
						minlength={8}
						required
					/>
				</div>
				<p class="text-sm leading-6 text-muted-foreground">Use at least 8 characters.</p>
				{#if form?.message}
					<p
						class={cn(
							'rounded-xl border px-3 py-2 text-sm',
							isSuccess
								? 'border-border bg-muted/40 text-foreground'
								: 'border-destructive/30 bg-destructive/5 text-destructive'
						)}
					>
						{form.message}
					</p>
				{/if}
				<Button class="w-full" type="submit">Create account</Button>
			</form>

			<div class="space-y-3 text-sm text-muted-foreground">
				<p>
					Already have an account?
					<a class="text-foreground underline underline-offset-4" href={resolve('/sign-in')}>
						Sign in here
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
