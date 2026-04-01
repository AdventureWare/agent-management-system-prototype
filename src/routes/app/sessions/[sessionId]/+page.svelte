<script lang="ts">
	import SessionDetailPanel from '$lib/components/SessionDetailPanel.svelte';

	let { data, form = null } = $props();
</script>

<SessionDetailPanel
	session={data.session}
	sandboxOptions={data.sandboxOptions}
	taskResponseAction={data.taskResponseAction}
	{form}
	backHref="/app/sessions"
/>
