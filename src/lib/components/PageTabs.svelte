<script lang="ts">
	type TabItem = {
		id: string;
		label: string;
		badge?: string | number;
		tone?: 'default' | 'danger';
	};

	let {
		items,
		value = $bindable(),
		ariaLabel = 'Page tabs',
		class: className = '',
		panelIdPrefix
	} = $props<{
		items: TabItem[];
		value: string;
		ariaLabel?: string;
		class?: string;
		panelIdPrefix?: string;
	}>();
</script>

<div class={['ui-tabs', className]} role="tablist" aria-label={ariaLabel}>
	{#each items as item (item.id)}
		<button
			role="tab"
			type="button"
			tabindex={value === item.id ? 0 : -1}
			id={panelIdPrefix ? `${panelIdPrefix}-tab-${item.id}` : undefined}
			aria-selected={value === item.id}
			aria-controls={panelIdPrefix ? `${panelIdPrefix}-panel-${item.id}` : undefined}
			class={[
				'ui-tab',
				value === item.id ? 'ui-tab-active' : 'ui-tab-inactive',
				item.tone === 'danger' ? 'ui-tab-danger' : ''
			]}
			onclick={() => {
				value = item.id;
			}}
		>
			<span>{item.label}</span>
			{#if item.badge !== undefined}
				<span class="ui-tab-badge">{item.badge}</span>
			{/if}
		</button>
	{/each}
</div>
