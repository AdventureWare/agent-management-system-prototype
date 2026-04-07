<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description = '',
		controls,
		children,
		density = 'default',
		class: className = ''
	} = $props<{
		title: string;
		description?: string;
		controls?: Snippet;
		children?: Snippet;
		density?: 'default' | 'compact';
		class?: string;
	}>();
</script>

<section class={['ui-toolbar', className]}>
	<div
		class={[
			'flex flex-col lg:flex-row lg:justify-between',
			density === 'compact' ? 'gap-3 lg:items-center' : 'gap-4 lg:items-start'
		]}
	>
		<div class="min-w-0">
			<h2
				class={density === 'compact'
					? 'text-lg font-semibold text-white'
					: 'text-xl font-semibold text-white'}
			>
				{title}
			</h2>
			{#if description}
				<p
					class={density === 'compact'
						? 'mt-1 text-xs text-slate-400'
						: 'mt-1 text-sm text-slate-400'}
				>
					{description}
				</p>
			{/if}
		</div>

		{#if controls}
			<div
				class={[
					'flex w-full flex-col lg:max-w-[38rem] lg:items-end',
					density === 'compact' ? 'gap-2' : 'gap-3'
				]}
			>
				{@render controls()}
			</div>
		{/if}
	</div>

	{#if children}
		<div class={density === 'compact' ? 'mt-3' : 'mt-4'}>
			{@render children()}
		</div>
	{/if}
</section>
