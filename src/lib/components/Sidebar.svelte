<script lang="ts">
	import { resolve } from '$app/paths';
	import { appNavigationSections, type AppNavigationLinkId } from '$lib/app-navigation';
	import {
		ActivityIcon,
		ArrowLeftRightIcon,
		BriefcaseBusinessIcon,
		CalendarRangeIcon,
		CpuIcon,
		FolderOpenIcon,
		LayoutDashboardIcon,
		ListTodoIcon,
		MenuIcon,
		MessagesSquareIcon,
		TargetIcon,
		UsersIcon,
		XIcon
	} from '@lucide/svelte';
	import { Navigation } from '@skeletonlabs/skeleton-svelte';

	let { children } = $props();

	const iconByLinkId: Record<AppNavigationLinkId, typeof LayoutDashboardIcon> = {
		home: LayoutDashboardIcon,
		tasks: ListTodoIcon,
		sessions: MessagesSquareIcon,
		runs: ActivityIcon,
		projects: FolderOpenIcon,
		goals: TargetIcon,
		planning: CalendarRangeIcon,
		workers: UsersIcon,
		roles: BriefcaseBusinessIcon,
		providers: CpuIcon
	};

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
	class="flex min-h-screen w-full flex-col bg-slate-950 text-slate-100 md:grid md:grid-cols-[auto_minmax(0,1fr)]"
>
	<header
		class="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur md:hidden"
	>
		<div class="flex items-center justify-between gap-3 px-4 py-3">
			<div class="min-w-0">
				<p class="text-[11px] font-semibold tracking-[0.24em] text-sky-300 uppercase">
					Agent Ops
				</p>
				<p class="truncate text-sm text-slate-300">Overview, work, context, and capacity</p>
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
						<p class="text-sm text-slate-400">Choose the surface that matches your next task</p>
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

				<nav class="space-y-4">
					{#each appNavigationSections as section (section.title)}
						<div class="space-y-2">
							<div class="px-1">
								<p class="text-[11px] font-semibold tracking-[0.2em] text-slate-500 uppercase">
									{section.title}
								</p>
								<p class="mt-1 text-xs text-slate-500">{section.description}</p>
							</div>
							{#each section.links as link (link.href)}
								{@const Icon = iconByLinkId[link.id]}
								<a
									class="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200 transition hover:border-slate-700 hover:text-white"
									href={resolve(link.href)}
									onclick={closeMobileNav}
								>
									<Icon class="size-4" />
									<span>{link.label}</span>
								</a>
							{/each}
						</div>
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
			<Navigation.Header class={layoutRail ? '' : 'space-y-4 px-4 pt-4'}>
				{#if !layoutRail}
					<div class="space-y-1">
						<p class="text-[11px] font-semibold tracking-[0.24em] text-sky-300 uppercase">
							Agent Ops
						</p>
						<p class="text-sm text-slate-300">Work-first control plane</p>
						<p class="text-xs text-slate-500">Overview, work, context, and capacity</p>
					</div>
				{/if}
				<Navigation.Trigger onclick={toggleLayout}>
					<ArrowLeftRightIcon class={layoutRail ? 'size-5' : 'size-4'} />
					{#if !layoutRail}<span>Resize</span>{/if}
				</Navigation.Trigger>
			</Navigation.Header>
			{#each appNavigationSections as section (section.title)}
				{#if !layoutRail}
					<div class="space-y-1 px-4 pt-4 pb-2">
						<p class="text-[10px] font-semibold tracking-[0.2em] text-slate-500 uppercase">
							{section.title}
						</p>
						<p class="text-xs text-slate-500">{section.description}</p>
					</div>
				{/if}
				<Navigation.Menu>
					{#each section.links as link (link.href)}
						{@const Icon = iconByLinkId[link.id]}
						<Navigation.TriggerAnchor href={resolve(link.href)}>
							<Icon class={layoutRail ? 'size-5' : 'size-4'} />
							<Navigation.TriggerText>{link.label}</Navigation.TriggerText>
						</Navigation.TriggerAnchor>
					{/each}
				</Navigation.Menu>
			{/each}
		</Navigation.Content>
	</Navigation>

	<div
		class="min-h-[calc(100vh-65px)] min-w-0 overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_35%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(2,6,23,1))] md:h-screen md:min-h-screen"
	>
		{@render children()}
	</div>
</div>
