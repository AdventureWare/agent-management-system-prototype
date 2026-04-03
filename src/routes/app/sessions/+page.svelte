<script lang="ts">
	import ThreadsPage from '../threads/+page.svelte';

	let { data } = $props();
</script>

<ThreadsPage data={data as never} />
