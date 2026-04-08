<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { persistPageFields } from '$lib/client/persist-page-fields';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();
	let isEmbeddedPanel = $derived(page.url.searchParams.get('embed') === 'panel');

	onMount(() => {
		if (isEmbeddedPanel) {
			return;
		}

		document.documentElement.classList.add('app-shell-locked');
		document.body.classList.add('app-shell-locked');

		return () => {
			document.documentElement.classList.remove('app-shell-locked');
			document.body.classList.remove('app-shell-locked');
		};
	});
</script>

{#if isEmbeddedPanel}
	<div use:persistPageFields>
		{@render children()}
	</div>
{:else}
	<Sidebar>
		<div use:persistPageFields>
			{@render children()}
		</div>
	</Sidebar>
{/if}
