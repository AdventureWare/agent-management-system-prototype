<script lang="ts">
	import SessionDetailPanel from '$lib/components/SessionDetailPanel.svelte';

	let { data } = $props();
</script>

<SessionDetailPanel session={data.session} backHref="/app/sessions" />
