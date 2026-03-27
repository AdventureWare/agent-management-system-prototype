<script lang="ts">
	import { resolve } from '$app/paths';
	import SessionDetailPanel from '$lib/components/SessionDetailPanel.svelte';

	let { data } = $props();
</script>

<SessionDetailPanel session={data.session} backHref={resolve('/app/sessions')} />
