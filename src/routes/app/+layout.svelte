<script lang="ts">
	import { onMount } from 'svelte';
	import { persistPageFields } from '$lib/client/persist-page-fields';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();

	onMount(() => {
		document.documentElement.classList.add('app-shell-locked');
		document.body.classList.add('app-shell-locked');

		return () => {
			document.documentElement.classList.remove('app-shell-locked');
			document.body.classList.remove('app-shell-locked');
		};
	});
</script>

<Sidebar>
	<div use:persistPageFields>
		{@render children()}
	</div>
</Sidebar>
