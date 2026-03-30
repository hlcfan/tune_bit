<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
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

<div class="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
	<Card class="border-border/70 bg-card/90">
		<CardHeader class="space-y-4">
			<Badge variant="outline" class="w-fit">Phase 2 authentication</Badge>
			<div class="space-y-3">
				<CardTitle class="max-w-2xl text-4xl leading-tight font-semibold tracking-tight">
					Sign in to open your private note library.
				</CardTitle>
				<CardDescription class="max-w-xl text-base leading-7">
					Tune Bit now protects app routes with Supabase sessions so your collections, songs, and
					future uploads stay user-scoped from the first screen onward.
				</CardDescription>
			</div>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="rounded-2xl border border-dashed px-4 py-4">
					<p class="text-sm text-muted-foreground">Access boundary</p>
					<p class="mt-2 font-medium">Signed-out users stop at the auth screens.</p>
				</div>
				<div class="rounded-2xl border border-dashed px-4 py-4">
					<p class="text-sm text-muted-foreground">Session behavior</p>
					<p class="mt-2 font-medium">
						Returning sessions route back into the protected app shell.
					</p>
				</div>
			</div>
			<div class="rounded-2xl border px-4 py-4">
				<p class="text-sm text-muted-foreground">Redirect target</p>
				<p class="mt-2 font-medium">
					{redirectsToLibrary
						? 'Successful sign-in opens the protected library shell.'
						: data.redirectTo}
				</p>
			</div>
		</CardContent>
	</Card>

	<Card class="border-border/70">
		<CardHeader>
			<CardTitle>Welcome back</CardTitle>
			<CardDescription>
				Enter the same email and password you use for Supabase Auth.
			</CardDescription>
		</CardHeader>
		<CardContent>
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
		</CardContent>
		<CardFooter class="flex flex-col items-start gap-3 text-sm text-muted-foreground">
			<p>
				Need an account?
				<a class="text-foreground underline underline-offset-4" href={resolve('/sign-up')}>
					Create one here
				</a>
			</p>
			<a class={buttonVariants({ variant: 'ghost' })} href={resolve('/')}>Back to overview</a>
		</CardFooter>
	</Card>
</div>
