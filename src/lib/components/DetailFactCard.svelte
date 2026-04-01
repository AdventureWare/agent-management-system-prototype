<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		value,
		detail = '',
		href,
		hrefLabel,
		children,
		class: className = '',
		labelClass = 'text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase',
		valueClass = 'ui-wrap-anywhere mt-2 text-sm font-medium text-white',
		detailClass = 'mt-1 text-xs text-slate-500'
	} = $props<{
		label: string;
		value?: string | number | null;
		detail?: string;
		href?: string;
		hrefLabel?: string;
		children?: Snippet;
		class?: string;
		labelClass?: string;
		valueClass?: string;
		detailClass?: string;
	}>();

	let hasValue = $derived(value !== undefined && value !== null && `${value}`.length > 0);
</script>

<article class={['rounded-xl border border-slate-800 bg-slate-950/60 p-3', className]}>
	<p class={labelClass}>{label}</p>

	{#if children}
		<div class="mt-2">
			{@render children()}
		</div>
	{:else}
		{#if hasValue}
			<p class={valueClass}>{value}</p>
		{/if}
		{#if detail}
			<p class={detailClass}>{detail}</p>
		{/if}
	{/if}

	{#if href && hrefLabel}
		<a class="mt-2 inline-flex text-sm text-sky-300 transition hover:text-sky-200" {href}>
			{hrefLabel}
		</a>
	{/if}
</article>
