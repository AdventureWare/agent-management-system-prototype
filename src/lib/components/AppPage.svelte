<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		class: className = '',
		width = 'wide'
	} = $props<{
		children?: Snippet;
		class?: string;
		width?: 'wide' | 'medium' | 'full';
	}>();

	let widthClass = $derived.by(() => {
		switch (width) {
			case 'medium':
				return 'max-w-6xl';
			case 'full':
				return 'max-w-none';
			default:
				return 'max-w-7xl';
		}
	});
</script>

<section class={['ui-page', widthClass, className]}>
	{@render children?.()}
</section>
