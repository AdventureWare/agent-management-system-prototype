<script lang="ts">
	let {
		label,
		value,
		detail = '',
		class: className = '',
		density = 'default'
	} = $props<{
		label: string;
		value: string | number;
		detail?: string;
		class?: string;
		density?: 'default' | 'compact';
	}>();
</script>

<article class={['ui-metric-card', density === 'compact' && 'ui-metric-card-compact', className]}>
	<p class="ui-metric-label">{label}</p>
	<p class="ui-metric-value">{value}</p>
	{#if detail}
		<p class="ui-metric-detail">{detail}</p>
	{/if}
</article>
