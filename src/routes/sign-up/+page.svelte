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
	import { cn } from '$lib/utils.js';

	let { data, form } = $props();

	const redirectsToLibrary = $derived(data.redirectTo === '/app');
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

<div class="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
	<Card class="border-border/70 bg-card/90">
		<CardHeader class="space-y-4">
			<Badge variant="outline" class="w-fit">Private account setup</Badge>
			<div class="space-y-3">
				<CardTitle class="max-w-2xl text-4xl leading-tight font-semibold tracking-tight">
					Create your Tune Bit library account.
				</CardTitle>
				<CardDescription class="max-w-xl text-base leading-7">
					Phase 2 adds the authenticated foundation that every later collection, song, upload, and
					viewer flow will build on.
				</CardDescription>
			</div>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="rounded-2xl border border-dashed px-4 py-4">
					<p class="text-sm text-muted-foreground">Ownership model</p>
					<p class="mt-2 font-medium">
						Each future collection and song will be scoped to your user id.
					</p>
				</div>
				<div class="rounded-2xl border border-dashed px-4 py-4">
					<p class="text-sm text-muted-foreground">Protected routes</p>
					<p class="mt-2 font-medium">The library shell only opens once a valid session exists.</p>
				</div>
			</div>
			<div class="rounded-2xl border px-4 py-4">
				<p class="text-sm text-muted-foreground">After sign-up</p>
				<p class="mt-2 font-medium">
					{redirectsToLibrary
						? 'Successful account creation continues into the protected app area when a session is returned.'
						: data.redirectTo}
				</p>
			</div>
		</CardContent>
	</Card>

	<Card class="border-border/70">
		<CardHeader>
			<CardTitle>Start with email and password</CardTitle>
			<CardDescription>
				Use a valid email address and a password with at least 8 characters.
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
						autocomplete="new-password"
						minlength={8}
						required
					/>
				</div>
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
		</CardContent>
		<CardFooter class="flex flex-col items-start gap-3 text-sm text-muted-foreground">
			<p>
				Already have an account?
				<a class="text-foreground underline underline-offset-4" href={resolve('/sign-in')}>
					Sign in here
				</a>
			</p>
			<a class={buttonVariants({ variant: 'ghost' })} href={resolve('/')}>Back to overview</a>
		</CardFooter>
	</Card>
</div>
