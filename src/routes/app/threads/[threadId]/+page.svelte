<script lang="ts">
	import ThreadDetailPanel from '$lib/components/ThreadDetailPanel.svelte';

	let { data, form = null } = $props();
</script>

<ThreadDetailPanel
	thread={data.thread}
	sandboxOptions={data.sandboxOptions}
	modelOptions={data.modelOptions}
	threadFocusTask={data.threadFocusTask}
	taskResponseAction={data.taskResponseAction}
	threadContacts={data.threadContacts}
	threadContactTargets={data.threadContactTargets}
	threadControlPlaneRuns={data.threadControlPlaneRuns}
	lazyLoadThreadContactTargets
	responseContextArtifacts={data.responseContextArtifacts}
	{form}
	backHref="/app/threads"
/>
