<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'default' | 'sky' | 'amber' | 'rose';

	let {
		id,
		eyebrow,
		title,
		description = '',
		actions,
		children,
		tone = 'default',
		bodyClass = '',
		class: className = ''
	} = $props<{
		id?: string;
		eyebrow?: string;
		title: string;
		description?: string;
		actions?: Snippet;
		children?: Snippet;
		tone?: Tone;
		bodyClass?: string;
		class?: string;
	}>();

	let panelClass = $derived.by(() => {
		switch (tone) {
			case 'sky':
				return 'border-slate-800 bg-slate-950/70';
			case 'amber':
				return 'border-slate-800 bg-slate-950/70';
			case 'rose':
				return 'border-rose-900/50 bg-rose-950/20';
			default:
				return 'border-slate-800 bg-slate-950/70';
		}
	});

	let headerClass = $derived.by(() => {
		switch (tone) {
			case 'sky':
				return 'border-slate-800/90 bg-gradient-to-r from-slate-950 via-slate-950 to-sky-950/30';
			case 'amber':
				return 'border-slate-800/90 bg-gradient-to-r from-slate-950 via-slate-950 to-amber-950/25';
			case 'rose':
				return 'border-rose-900/50 bg-gradient-to-r from-rose-950/40 via-slate-950 to-rose-950/20';
			default:
				return 'border-slate-800/90 bg-gradient-to-r from-slate-950 via-slate-950 to-slate-900/80';
		}
	});

	let eyebrowClass = $derived.by(() => {
		switch (tone) {
			case 'rose':
				return 'text-rose-300';
			default:
				return 'text-slate-400';
		}
	});
</script>

<section {id} class={['overflow-hidden rounded-3xl border', panelClass, className]}>
	<div class={['border-b px-6 py-6', headerClass]}>
		<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
			<div class="min-w-0">
				{#if eyebrow}
					<p class={['text-xs font-semibold tracking-[0.24em] uppercase', eyebrowClass]}>
						{eyebrow}
					</p>
				{/if}
				<h2 class="ui-wrap-anywhere mt-2 text-xl font-semibold text-white">{title}</h2>
				{#if description}
					<p class="ui-wrap-anywhere mt-2 max-w-2xl text-sm text-slate-400">{description}</p>
				{/if}
			</div>

			{#if actions}
				<div class="flex flex-wrap gap-3 lg:justify-end">
					{@render actions()}
				</div>
			{/if}
		</div>
	</div>

	<div class={['p-6', bodyClass]}>
		{@render children?.()}
	</div>
</section>
