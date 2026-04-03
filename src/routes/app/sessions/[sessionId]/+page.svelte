<script lang="ts">
	import ThreadDetailPage from '../../threads/[sessionId]/+page.svelte';

	let { data, form = null } = $props();
</script>

<ThreadDetailPage data={data as never} form={form as never} />
