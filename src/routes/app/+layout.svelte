<script lang="ts">
	import { persistPageFields } from '$lib/client/persist-page-fields';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();
</script>

<Sidebar>
	<div use:persistPageFields>
		{@render children()}
	</div>
</Sidebar>
