<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { Snippet } from 'svelte';

	let {
		backHref,
		backLabel = 'Back',
		eyebrow,
		title,
		description = '',
		actions,
		meta,
		class: className = ''
	} = $props<{
		backHref?: string;
		backLabel?: string;
		eyebrow?: string;
		title: string;
		description?: string;
		actions?: Snippet;
		meta?: Snippet;
		class?: string;
	}>();
</script>

<div class={['space-y-4', className]}>
	{#if backHref}
		<a
			class="inline-flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-sky-300 uppercase transition hover:text-sky-200"
			href={backHref}
		>
			{backLabel}
		</a>
	{/if}

	<PageHeader {eyebrow} {title} {description} {actions} {meta} />
</div>
