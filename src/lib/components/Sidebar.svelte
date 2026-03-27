<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		ArrowLeftRightIcon,
		CpuIcon,
		FolderOpenIcon,
		LayoutDashboardIcon,
		ListTodoIcon,
		MenuIcon,
		MessagesSquareIcon,
		XIcon
	} from '@lucide/svelte';
	import { Navigation } from '@skeletonlabs/skeleton-svelte';

	let { children } = $props();

	const links = [
		{ label: 'Dashboard', href: '/app/home', icon: LayoutDashboardIcon },
		{ label: 'Projects', href: '/app/projects', icon: FolderOpenIcon },
		{ label: 'Tasks', href: '/app/tasks', icon: ListTodoIcon },
		{ label: 'Providers', href: '/app/providers', icon: CpuIcon },
		{ label: 'Remote Work', href: '/app/sessions', icon: MessagesSquareIcon }
	] as const;

	let layoutRail = $state(true);
	let mobileNavOpen = $state(false);

	function toggleLayout() {
		layoutRail = !layoutRail;
	}

	function toggleMobileNav() {
		mobileNavOpen = !mobileNavOpen;
	}

	function closeMobileNav() {
		mobileNavOpen = false;
	}
</script>

<svelte:document
	onclick={(event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) {
			return;
		}

		if (target.dataset.mobileOverlay === 'true') {
			closeMobileNav();
		}
	}}
/>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape') {
			closeMobileNav();
		}
	}}
/>

<div
	class="flex min-h-screen w-full flex-col bg-slate-950 text-slate-100 md:grid md:grid-cols-[auto_1fr]"
>
	<header
		class="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur md:hidden"
	>
		<div class="flex items-center justify-between gap-3 px-4 py-3">
			<div class="min-w-0">
				<p class="text-[11px] font-semibold tracking-[0.24em] text-sky-300 uppercase">Agent Ops</p>
				<p class="truncate text-sm text-slate-300">Remote dashboard and session control</p>
			</div>
			<button
				class="inline-flex items-center justify-center rounded-full border border-slate-800 bg-slate-900 p-2 text-slate-200"
				type="button"
				aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
				aria-expanded={mobileNavOpen}
				onclick={toggleMobileNav}
			>
				{#if mobileNavOpen}
					<XIcon class="size-5" />
				{:else}
					<MenuIcon class="size-5" />
				{/if}
			</button>
		</div>
	</header>

	{#if mobileNavOpen}
		<div class="fixed inset-0 z-40 md:hidden" aria-label="Mobile navigation">
			<div
				class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
				data-mobile-overlay="true"
			></div>
			<div
				class="absolute inset-x-3 top-16 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl"
			>
				<div class="mb-4 flex items-center justify-between gap-3">
					<div>
						<p class="text-[11px] font-semibold tracking-[0.24em] text-sky-300 uppercase">
							Navigation
						</p>
						<p class="text-sm text-slate-400">Choose a control surface</p>
					</div>
					<button
						class="inline-flex items-center justify-center rounded-full border border-slate-800 bg-slate-900 p-2 text-slate-200"
						type="button"
						aria-label="Close navigation"
						onclick={closeMobileNav}
					>
						<XIcon class="size-4" />
					</button>
				</div>

				<nav class="space-y-2">
					{#each links as link (link.href)}
						{@const Icon = link.icon}
						<a
							class="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200 transition hover:border-slate-700 hover:text-white"
							href={resolve(link.href)}
							onclick={closeMobileNav}
						>
							<Icon class="size-4" />
							<span>{link.label}</span>
						</a>
					{/each}
				</nav>
			</div>
		</div>
	{/if}

	<Navigation
		layout={layoutRail ? 'rail' : 'sidebar'}
		class={[
			'hidden md:block',
			layoutRail
				? 'border-r border-slate-800 bg-slate-950'
				: 'grid grid-rows-[1fr_auto] gap-4 border-r border-slate-800 bg-slate-950'
		]}
	>
		<Navigation.Content>
			<Navigation.Header>
				<Navigation.Trigger onclick={toggleLayout}>
					<ArrowLeftRightIcon class={layoutRail ? 'size-5' : 'size-4'} />
					{#if !layoutRail}<span>Resize</span>{/if}
				</Navigation.Trigger>
			</Navigation.Header>
			<Navigation.Menu>
				{#each links as link (link.href)}
					{@const Icon = link.icon}
					<Navigation.TriggerAnchor href={resolve(link.href)}>
						<Icon class={layoutRail ? 'size-5' : 'size-4'} />
						<Navigation.TriggerText>{link.label}</Navigation.TriggerText>
					</Navigation.TriggerAnchor>
				{/each}
			</Navigation.Menu>
		</Navigation.Content>
	</Navigation>

	<div
		class="min-h-[calc(100vh-65px)] overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_35%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(2,6,23,1))] md:h-screen md:min-h-screen"
	>
		{@render children()}
	</div>
</div>
