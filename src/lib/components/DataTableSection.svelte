<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description = '',
		summary = '',
		empty = false,
		emptyMessage = '',
		children
	} = $props<{
		title: string;
		description?: string;
		summary?: string;
		empty?: boolean;
		emptyMessage?: string;
		children?: Snippet;
	}>();
</script>

<section class="ui-panel min-w-0">
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-lg font-semibold text-white">{title}</h2>
			{#if description}
				<p class="mt-1 text-sm text-slate-400">{description}</p>
			{/if}
		</div>
		{#if summary}
			<p class="text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">{summary}</p>
		{/if}
	</div>

	{#if empty}
		<p class="ui-empty-state mt-4">{emptyMessage}</p>
	{:else}
		<div class="mt-4 overflow-x-auto">
			{@render children?.()}
		</div>
	{/if}
</section>
