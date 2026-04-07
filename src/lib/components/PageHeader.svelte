<script lang="ts">
	import { AppBar } from '@skeletonlabs/skeleton-svelte';
	import type { Snippet } from 'svelte';

	let {
		eyebrow,
		title,
		description = '',
		titleClass = '',
		descriptionClass = '',
		class: className = '',
		density = 'default',
		actions,
		meta
	} = $props<{
		eyebrow?: string;
		title: string;
		description?: string;
		titleClass?: string;
		descriptionClass?: string;
		class?: string;
		density?: 'default' | 'compact';
		actions?: Snippet;
		meta?: Snippet;
	}>();
</script>

<AppBar class={['ui-page-header', density === 'compact' && 'ui-page-header-compact', className]}>
	<AppBar.Toolbar
		class={[
			'flex flex-col lg:flex-row lg:justify-between',
			density === 'compact' ? 'gap-2 sm:gap-3 lg:items-center' : 'gap-3 sm:gap-4 lg:items-start'
		]}
	>
		<AppBar.Headline class={['min-w-0 flex-1', density === 'compact' ? 'space-y-2' : 'space-y-3']}>
			{#if eyebrow}
				<p class="ui-eyebrow">{eyebrow}</p>
			{/if}
			<h1 class={['ui-page-title ui-wrap-title', titleClass]}>{title}</h1>
			{#if description}
				<p class={['ui-page-description ui-wrap-anywhere', descriptionClass]}>{description}</p>
			{/if}
		</AppBar.Headline>

		{#if actions}
			<AppBar.Trail
				class={[
					'flex w-full flex-wrap lg:w-auto lg:justify-end',
					density === 'compact' ? 'gap-2' : 'gap-2 sm:gap-3'
				]}
			>
				{@render actions()}
			</AppBar.Trail>
		{/if}
	</AppBar.Toolbar>

	{#if meta}
		<div class={density === 'compact' ? 'mt-2 sm:mt-3' : 'mt-3 sm:mt-4'}>
			{@render meta()}
		</div>
	{/if}
</AppBar>
