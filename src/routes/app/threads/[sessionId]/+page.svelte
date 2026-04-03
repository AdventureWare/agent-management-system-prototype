<script lang="ts">
	import SessionDetailPage from '../../sessions/[sessionId]/+page.svelte';

	let { data, form } = $props();
</script>

<SessionDetailPage data={data as never} form={form as never} />
