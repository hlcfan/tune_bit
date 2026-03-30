<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';

	let { data } = $props();

	const pillars = [
		{
			title: 'Collections and songs',
			description:
				'Organize a private library by collection first, then keep each song grouped with the right note pages.'
		},
		{
			title: 'Secure uploads',
			description:
				'Support multi-file image and PDF uploads through protected server-side flows without exposing storage credentials.'
		},
		{
			title: 'Focused reading',
			description:
				'Keep the viewer fast and calm with focus mode, multiple layouts, and independent zoom per page.'
		}
	];

	const phases = [
		{
			name: 'Foundation',
			state: 'Complete',
			summary:
				'Scaffold, styling, component system, app shell, and environment contract are in place.'
		},
		{
			name: 'Authentication',
			state: 'Complete',
			summary: 'Supabase email/password auth, protected routes, and session-aware shell behavior.'
		},
		{
			name: 'Schema and security',
			state: 'Next',
			summary:
				'User-scoped tables, indexes, foreign keys, and row-level security across all owned data.'
		}
	];

	const privateEnvironmentKeys = [
		'SUPABASE_SERVICE_ROLE_KEY',
		'CLOUDFLARE_R2_S3_API_URL',
		'CLOUDFLARE_R2_ACCESS_KEY_ID',
		'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
		'CLOUDFLARE_R2_BUCKET'
	];

	const authStatusRows = [
		{ label: 'SvelteKit scaffold', status: 'Done' },
		{ label: 'Tailwind CSS v4 pipeline', status: 'Done' },
		{ label: 'shadcn-svelte setup', status: 'Done' },
		{ label: 'Supabase auth and protected shell', status: 'Done' }
	];
</script>

<svelte:head>
	<title>Tune Bit | Authentication</title>
	<meta
		name="description"
		content="Tune Bit authentication and access control for a private musical note library with protected app routes."
	/>
</svelte:head>

<div class="space-y-12 pb-8">
	<section class="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
		<Card class="border-border/70 bg-card/90">
			<CardHeader class="space-y-4">
				<Badge variant="outline" class="w-fit">Phase 2 authentication</Badge>
				<div class="space-y-4">
					<CardTitle
						class="max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl"
					>
						Tune Bit now protects the note library behind real account access.
					</CardTitle>
					<CardDescription class="max-w-2xl text-base leading-7">
						The app now uses Supabase Auth for email/password sign-up and sign-in, keeps the shell
						session-aware, and blocks the protected app area until a valid user session exists.
					</CardDescription>
				</div>
			</CardHeader>

			<CardContent class="space-y-6">
				<div class="grid gap-4 sm:grid-cols-3">
					<div class="rounded-2xl border border-dashed px-4 py-4">
						<p class="text-sm text-muted-foreground">Current access state</p>
						<p class="mt-2 text-base font-medium">
							{data.user
								? 'Signed in and ready for protected app routes.'
								: 'Signed out until auth completes.'}
						</p>
					</div>
					<div class="rounded-2xl border border-dashed px-4 py-4">
						<p class="text-sm text-muted-foreground">Security baseline</p>
						<p class="mt-2 text-base font-medium">
							User identity is now available in server flows.
						</p>
					</div>
					<div class="rounded-2xl border border-dashed px-4 py-4">
						<p class="text-sm text-muted-foreground">Next build step</p>
						<p class="mt-2 text-base font-medium">
							Attach schema and RLS to the authenticated user.
						</p>
					</div>
				</div>

				<div class="flex flex-col gap-3 sm:flex-row">
					{#if data.user}
						<a class={buttonVariants({})} href={resolve('/home')}>Open protected app</a>
					{:else}
						<a class={buttonVariants({})} href={resolve('/sign-up')}>Create an account</a>
						<a class={buttonVariants({ variant: 'outline' })} href={resolve('/sign-in')}>
							Sign in
						</a>
					{/if}
				</div>
			</CardContent>
		</Card>

		<Card class="border-border/70 bg-card/90">
			<CardHeader>
				<div class="flex items-center justify-between gap-3">
					<div class="space-y-1">
						<CardTitle>Authentication status</CardTitle>
						<CardDescription>
							The project is ready to move from identity to user-scoped data.
						</CardDescription>
					</div>
					<Badge variant={data.isSupabaseConfigured ? 'default' : 'secondary'}>
						{data.isSupabaseConfigured ? 'Public env ready' : 'Public env pending'}
					</Badge>
				</div>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-3">
					{#each authStatusRows as row (row.label)}
						<div class="flex items-center justify-between gap-4 rounded-2xl border px-4 py-3">
							<span class="font-medium">{row.label}</span>
							<Badge>{row.status}</Badge>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	</section>

	<section class="space-y-5">
		<div class="space-y-2">
			<Badge variant="outline">Product surface</Badge>
			<h2 class="text-2xl font-semibold tracking-tight">
				The MVP still revolves around three simple jobs.
			</h2>
		</div>

		<div class="grid gap-5 lg:grid-cols-3">
			{#each pillars as pillar (pillar.title)}
				<Card class="border-border/70">
					<CardHeader>
						<CardTitle>{pillar.title}</CardTitle>
						<CardDescription>{pillar.description}</CardDescription>
					</CardHeader>
				</Card>
			{/each}
		</div>
	</section>

	<section class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
		<Card class="border-border/70">
			<CardHeader>
				<Badge variant="outline" class="w-fit">Delivery order</Badge>
				<CardTitle>Build continues in vertical slices.</CardTitle>
				<CardDescription>
					With auth in place, the next meaningful slice is the schema and security layer that lets
					collections, songs, note files, and note pages stay private by default.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#each phases as phase, index (phase.name)}
					<div class="space-y-3 rounded-2xl border px-4 py-4">
						<div class="flex items-center justify-between gap-4">
							<div>
								<p class="font-medium">{index + 1}. {phase.name}</p>
								<p class="mt-1 text-sm text-muted-foreground">{phase.summary}</p>
							</div>
							<Badge variant={phase.state === 'Complete' ? 'default' : 'outline'}>
								{phase.state}
							</Badge>
						</div>
					</div>
				{/each}
			</CardContent>
		</Card>

		<Card class="border-border/70">
			<CardHeader>
				<Badge variant="outline" class="w-fit">Protected routes</Badge>
				<CardTitle>App access now flows through sign-up, sign-in, and sign-out.</CardTitle>
				<CardDescription>
					The landing page stays public, while the library area is reserved for authenticated users.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				<div class="rounded-2xl border px-4 py-3">
					<p class="font-medium">1. Create an account with email and password.</p>
				</div>
				<div class="rounded-2xl border px-4 py-3">
					<p class="font-medium">2. Start a session and enter the protected /app area.</p>
				</div>
				<div class="rounded-2xl border px-4 py-3">
					<p class="font-medium">3. Sign out from the shared header when finished.</p>
				</div>
			</CardContent>
			<CardFooter class="text-sm text-muted-foreground">
				Server-side session checks gate the library shell before database-backed features arrive.
			</CardFooter>
		</Card>
	</section>

	<section class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
		<Card class="border-border/70">
			<CardHeader>
				<Badge variant="outline" class="w-fit">Environment contract</Badge>
				<CardTitle>Configuration still separates browser-safe and server-only values.</CardTitle>
				<CardDescription>
					The browser only receives the public Supabase URL and publishable key, while the service
					role key and Cloudflare R2 credentials remain server-side.
				</CardDescription>
			</CardHeader>
			<CardContent class="grid gap-4 sm:grid-cols-2">
				<div class="rounded-2xl border px-4 py-4">
					<p class="text-sm font-medium">Public</p>
					<ul class="mt-3 space-y-2 text-sm text-muted-foreground">
						<li>PUBLIC_SUPABASE_URL</li>
						<li>PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY</li>
					</ul>
				</div>
				<div class="rounded-2xl border px-4 py-4">
					<p class="text-sm font-medium">Server only</p>
					<ul class="mt-3 space-y-2 text-sm text-muted-foreground">
						{#each privateEnvironmentKeys as key (key)}
							<li>{key}</li>
						{/each}
					</ul>
				</div>
			</CardContent>
			<CardFooter class="text-sm text-muted-foreground">
				Uploads and signed file access remain server-side by design.
			</CardFooter>
		</Card>

		<Card class="border-border/70">
			<CardHeader>
				<Badge variant="outline" class="w-fit">Immediate next slice</Badge>
				<CardTitle>The next milestone is schema-backed privacy.</CardTitle>
				<CardDescription>
					Phase 3 turns this identity boundary into a real data boundary with user-owned tables and
					row-level security.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				<div class="rounded-2xl border px-4 py-3">
					<p class="font-medium">1. Create the core relational tables and indexes.</p>
				</div>
				<div class="rounded-2xl border px-4 py-3">
					<p class="font-medium">2. Add RLS policies for every user-owned record.</p>
				</div>
				<div class="rounded-2xl border px-4 py-3">
					<p class="font-medium">3. Build collections and songs on top of that protected schema.</p>
				</div>
			</CardContent>
		</Card>
	</section>
</div>
