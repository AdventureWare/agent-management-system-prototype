<script lang="ts">
	import ThreadDetailPanel from '$lib/components/ThreadDetailPanel.svelte';

	let { data, form = null } = $props();
</script>

<ThreadDetailPanel
	thread={data.thread}
	sandboxOptions={data.sandboxOptions}
	threadFocusTask={data.threadFocusTask}
	taskResponseAction={data.taskResponseAction}
	responseContextArtifacts={data.responseContextArtifacts}
	{form}
	backHref="/app/threads"
/>
