<script lang="ts">
	import ThreadDetailPanel from '$lib/components/ThreadDetailPanel.svelte';

	let { data, form = null } = $props();
</script>

<ThreadDetailPanel
	thread={data.session}
	sandboxOptions={data.sandboxOptions}
	taskResponseAction={data.taskResponseAction}
	responseContextArtifacts={data.responseContextArtifacts}
	{form}
	backHref="/app/threads"
/>
