<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		class: className = '',
		width = 'wide'
	} = $props<{
		children?: Snippet;
		class?: string;
		width?: 'wide' | 'medium';
	}>();

	let widthClass = $derived(width === 'medium' ? 'max-w-6xl' : 'max-w-7xl');
</script>

<section class={['ui-page', widthClass, className]}>
	{@render children?.()}
</section>
