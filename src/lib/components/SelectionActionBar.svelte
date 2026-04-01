<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		actions,
		tone = 'default'
	} = $props<{
		title: string;
		description: string;
		actions?: Snippet;
		tone?: 'default' | 'muted';
	}>();
</script>

<section
	class={[
		'rounded-2xl p-4 sm:p-5',
		tone === 'muted'
			? 'border border-slate-700 bg-slate-900/80'
			: 'border border-slate-800 bg-slate-950/70'
	]}
>
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-sm font-semibold tracking-[0.16em] text-white uppercase">{title}</h2>
			<p class="mt-1 text-sm text-slate-400">{description}</p>
		</div>
		{#if actions}
			<div class="flex flex-col gap-2 sm:flex-row">
				{@render actions()}
			</div>
		{/if}
	</div>
</section>
