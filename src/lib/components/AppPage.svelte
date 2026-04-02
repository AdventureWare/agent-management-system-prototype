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
				return 'max-w-[72rem]';
			case 'full':
				return 'max-w-none';
			default:
				return 'max-w-[90rem]';
		}
	});
</script>

<section class={['ui-page', widthClass, className]}>
	{@render children?.()}
</section>
