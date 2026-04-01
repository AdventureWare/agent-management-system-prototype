<script lang="ts">
	let {
		label,
		value,
		detail = ''
	} = $props<{
		label: string;
		value: string | number;
		detail?: string;
	}>();
</script>

<article class="ui-metric-card">
	<p class="ui-metric-label">{label}</p>
	<p class="ui-metric-value">{value}</p>
	{#if detail}
		<p class="ui-metric-detail">{detail}</p>
	{/if}
</article>
