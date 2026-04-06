<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description = '',
		controls,
		children,
		class: className = ''
	} = $props<{
		title: string;
		description?: string;
		controls?: Snippet;
		children?: Snippet;
		class?: string;
	}>();
</script>

<section class={['ui-toolbar', className]}>
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div class="min-w-0">
			<h2 class="text-xl font-semibold text-white">{title}</h2>
			{#if description}
				<p class="mt-1 text-sm text-slate-400">{description}</p>
			{/if}
		</div>

		{#if controls}
			<div class="flex w-full flex-col gap-3 lg:max-w-[38rem] lg:items-end">
				{@render controls()}
			</div>
		{/if}
	</div>

	{#if children}
		<div class="mt-4">
			{@render children()}
		</div>
	{/if}
</section>
