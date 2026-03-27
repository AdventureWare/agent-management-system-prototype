<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();
</script>

<Sidebar>
	{@render children()}
</Sidebar>
