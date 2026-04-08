<script lang="ts">
	import { onMount } from 'svelte';
	import AppButton from '$lib/components/AppButton.svelte';

	let {
		href,
		label,
		variant = 'accent',
		disabled = false,
		menuAriaLabel = '',
		newTabLabel = 'Open in new tab',
		panelLabel = 'Open in side panel',
		title = 'Click to open. Hold for more options.',
		onOpenPanel = null,
		class: className = ''
	}: {
		href: string;
		label: string;
		variant?: 'primary' | 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'ghost';
		disabled?: boolean;
		menuAriaLabel?: string;
		newTabLabel?: string;
		panelLabel?: string;
		title?: string;
		onOpenPanel?: (() => void) | null;
		class?: string;
	} = $props();

	const HOLD_DELAY_MS = 420;

	let menuOpen = $state(false);
	let root = $state<HTMLElement | null>(null);
	let holdTimer = 0;
	let suppressPrimaryClick = $state(false);
	let canOpenPanel = $derived(typeof onOpenPanel === 'function');
	let computedMenuAriaLabel = $derived(menuAriaLabel || `${label} options`);

	function clearHoldTimer() {
		if (!holdTimer) {
			return;
		}

		window.clearTimeout(holdTimer);
		holdTimer = 0;
	}

	function openMenu() {
		if (disabled) {
			return;
		}

		clearHoldTimer();
		menuOpen = true;
	}

	function closeMenu() {
		clearHoldTimer();
		menuOpen = false;
	}

	function startHold(event: PointerEvent) {
		if (disabled || event.button !== 0) {
			return;
		}

		clearHoldTimer();
		suppressPrimaryClick = false;
		holdTimer = window.setTimeout(() => {
			suppressPrimaryClick = true;
			openMenu();
		}, HOLD_DELAY_MS);
	}

	function cancelHold() {
		clearHoldTimer();
	}

	function handlePrimaryClick(event: MouseEvent) {
		clearHoldTimer();

		if (disabled) {
			event.preventDefault();
			return;
		}

		if (suppressPrimaryClick) {
			event.preventDefault();
			suppressPrimaryClick = false;
			return;
		}

		closeMenu();
	}

	function handleContextMenu(event: MouseEvent) {
		if (disabled) {
			return;
		}

		event.preventDefault();
		suppressPrimaryClick = true;
		openMenu();
	}

	function toggleMenu() {
		if (menuOpen) {
			closeMenu();
			return;
		}

		suppressPrimaryClick = true;
		openMenu();
	}

	function openInNewTab() {
		if (disabled) {
			return;
		}

		window.open(href, '_blank', 'noopener,noreferrer');
		closeMenu();
	}

	function openInPanel() {
		if (!canOpenPanel || disabled) {
			return;
		}

		onOpenPanel?.();
		closeMenu();
	}

	onMount(() => {
		const handlePointerDown = (event: PointerEvent) => {
			if (!root?.contains(event.target as Node)) {
				closeMenu();
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				closeMenu();
			}
		};

		window.addEventListener('pointerdown', handlePointerDown);
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			clearHoldTimer();
			window.removeEventListener('pointerdown', handlePointerDown);
			window.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

<div bind:this={root} class={['relative inline-flex items-center gap-2', className]}>
	<AppButton
		{href}
		size="sm"
		{variant}
		{disabled}
		{title}
		onclick={handlePrimaryClick}
		oncontextmenu={handleContextMenu}
		onpointerdown={startHold}
		onpointerup={cancelHold}
		onpointercancel={cancelHold}
		onpointerleave={cancelHold}
	>
		{label}
	</AppButton>
	<AppButton
		type="button"
		size="sm"
		variant="neutral"
		{disabled}
		ariaLabel={computedMenuAriaLabel}
		title={computedMenuAriaLabel}
		onclick={toggleMenu}
	>
		More
	</AppButton>

	{#if menuOpen}
		<div
			class="absolute top-[calc(100%+0.5rem)] right-0 z-30 w-56 rounded-xl border border-slate-800 bg-slate-950/98 p-2 shadow-[0_18px_48px_rgba(2,6,23,0.45)]"
		>
			<div class="space-y-1">
				<AppButton class="w-full justify-start" {href} size="sm" variant="ghost">
					Open page
				</AppButton>
				<AppButton
					class="w-full justify-start"
					type="button"
					size="sm"
					variant="ghost"
					onclick={openInNewTab}
				>
					{newTabLabel}
				</AppButton>
				{#if canOpenPanel}
					<AppButton
						class="w-full justify-start"
						type="button"
						size="sm"
						variant="ghost"
						onclick={openInPanel}
					>
						{panelLabel}
					</AppButton>
				{/if}
			</div>
			<p class="mt-2 px-3 text-[11px] text-slate-500">
				Hold the main action button to reopen this menu.
			</p>
		</div>
	{/if}
</div>
