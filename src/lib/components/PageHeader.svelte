<script lang="ts">
	import { AppBar } from '@skeletonlabs/skeleton-svelte';
	import type { Snippet } from 'svelte';

	let {
		eyebrow,
		title,
		description = '',
		actions,
		meta
	} = $props<{
		eyebrow?: string;
		title: string;
		description?: string;
		actions?: Snippet;
		meta?: Snippet;
	}>();
</script>

<AppBar class="ui-page-header">
	<AppBar.Toolbar class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<AppBar.Headline class="min-w-0 flex-1 space-y-3">
			{#if eyebrow}
				<p class="ui-eyebrow">{eyebrow}</p>
			{/if}
			<h1 class="ui-page-title">{title}</h1>
			{#if description}
				<p class="ui-page-description">{description}</p>
			{/if}
		</AppBar.Headline>

		{#if actions}
			<AppBar.Trail class="flex w-full flex-wrap gap-3 lg:w-auto lg:justify-end">
				{@render actions()}
			</AppBar.Trail>
		{/if}
	</AppBar.Toolbar>

	{#if meta}
		<div class="mt-4">
			{@render meta()}
		</div>
	{/if}
</AppBar>
