<script lang="ts">
	import { resolve } from '$app/paths';
	import AppButton from '$lib/components/AppButton.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import { getTaskThreadReviewHref } from '$lib/task-thread-context';
	import {
		formatTaskStatusLabel,
		taskStatusToneClass,
		type TaskStatus
	} from '$lib/types/control-plane';

	type TaskHeroView = {
		id: string;
		title: string;
		summary: string;
		projectId: string;
		goalId?: string | null;
		desiredRoleId?: string | null;
		status: TaskStatus;
		updatedAtLabel: string;
		linkThread?: { id: string } | null;
	};

	let {
		task,
		threadActionLabel,
		runTaskDisabled,
		runTaskButtonLabel,
		runTaskDisabledTitle,
		delegationInputContext,
		delegationIntegrationNotes,
		delegatedSubtaskInstructions,
		followUpTaskInstructions
	}: {
		task: TaskHeroView;
		threadActionLabel: string;
		runTaskDisabled: boolean;
		runTaskButtonLabel: string;
		runTaskDisabledTitle: string;
		delegationInputContext: string;
		delegationIntegrationNotes: string;
		delegatedSubtaskInstructions: string;
		followUpTaskInstructions: string;
	} = $props();

	let taskTitleExpanded = $state(false);
	let taskInstructionsExpanded = $state(false);
	let taskTitleNeedsClamp = $derived(task.title.trim().length > 140);
	let taskInstructionsNeedClamp = $derived(task.summary.trim().length > 360);
</script>

<DetailHeader
	backHref={resolve('/app/tasks')}
	backLabel="Back to tasks"
	eyebrow="Task detail"
	title={task.title}
	description={task.summary}
	titleClass={taskTitleExpanded ? '' : 'ui-clamp-3'}
	descriptionClass={taskInstructionsExpanded ? '' : 'ui-clamp-5'}
>
	{#snippet actions()}
		<div class="flex w-full flex-wrap gap-3 lg:w-auto lg:justify-end">
			<form class="w-full sm:w-auto" method="GET" action={resolve('/app/tasks')}>
				<input type="hidden" name="create" value="1" />
				<input type="hidden" name="projectId" value={task.projectId} />
				<input type="hidden" name="goalId" value={task.goalId} />
				<input type="hidden" name="parentTaskId" value={task.id} />
				<input type="hidden" name="desiredRoleId" value={task.desiredRoleId} />
				<input type="hidden" name="delegationInputContext" value={delegationInputContext} />
				<input type="hidden" name="delegationIntegrationNotes" value={delegationIntegrationNotes} />
				<input type="hidden" name="name" value={`Delegated subtask: ${task.title}`} />
				<input type="hidden" name="instructions" value={delegatedSubtaskInstructions} />
				<AppButton class="w-full sm:w-auto" type="submit" variant="primary">
					Delegate subtask
				</AppButton>
			</form>
			<form class="w-full sm:w-auto" method="GET" action={resolve('/app/tasks')}>
				<input type="hidden" name="create" value="1" />
				<input type="hidden" name="projectId" value={task.projectId} />
				<input type="hidden" name="name" value={`Follow-up: ${task.title}`} />
				<input type="hidden" name="instructions" value={followUpTaskInstructions} />
				<AppButton class="w-full sm:w-auto" type="submit" variant="accent">
					Create follow-up task
				</AppButton>
			</form>
			<AppButton class="w-full sm:w-auto" type="submit" variant="neutral" form="task-update-form">
				Save changes
			</AppButton>
			<AppButton
				class="w-full sm:w-auto"
				variant={runTaskDisabled ? 'neutral' : 'primary'}
				type="submit"
				form="task-update-form"
				formaction="?/launchTaskSession"
				disabled={runTaskDisabled}
				reserveLabel="Task starting"
				title={runTaskDisabledTitle || undefined}
			>
				{runTaskButtonLabel}
			</AppButton>
			{#if task.linkThread}
				<AppButton
					class="w-full sm:w-auto"
					href={resolve(getTaskThreadReviewHref(task.linkThread.id))}
					variant="accent"
					reserveLabel="Open assigned thread"
				>
					{threadActionLabel}
				</AppButton>
			{/if}
		</div>
	{/snippet}
	{#snippet meta()}
		<div class="flex flex-wrap items-center gap-3">
			<span
				class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(task.status)}`}
			>
				{formatTaskStatusLabel(task.status)}
			</span>
			<span class="text-sm text-slate-500">Updated {task.updatedAtLabel}</span>
			{#if taskTitleNeedsClamp}
				<AppButton
					size="sm"
					type="button"
					variant="ghost"
					onclick={() => {
						taskTitleExpanded = !taskTitleExpanded;
					}}
				>
					{taskTitleExpanded ? 'Collapse title' : 'Expand title'}
				</AppButton>
			{/if}
			{#if taskInstructionsNeedClamp}
				<AppButton
					size="sm"
					type="button"
					variant="ghost"
					onclick={() => {
						taskInstructionsExpanded = !taskInstructionsExpanded;
					}}
				>
					{taskInstructionsExpanded ? 'Collapse instructions' : 'Expand instructions'}
				</AppButton>
			{/if}
		</div>
	{/snippet}
</DetailHeader>
