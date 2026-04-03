<script lang="ts">
	import SessionsPage from '../sessions/+page.svelte';

	let { data } = $props();
</script>

<SessionsPage data={data as never} />
