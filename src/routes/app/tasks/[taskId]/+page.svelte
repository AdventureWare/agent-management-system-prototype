<script lang="ts">
	import TaskDetailPageContent from './TaskDetailPageContent.svelte';

	let props = $props();
</script>

<TaskDetailPageContent data={props.data} form={props.form} />
