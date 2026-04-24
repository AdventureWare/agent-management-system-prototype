<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { resolve } from '$app/paths';
	import { agentThreadStore } from '$lib/client/agent-thread-store';
	import { fetchJson } from '$lib/client/agent-data';
	import { shouldPauseRefresh } from '$lib/client/refresh';
	import AgentCurrentContextPanel from '$lib/components/AgentCurrentContextPanel.svelte';
	import AppButton from '$lib/components/AppButton.svelte';
	import { mergeStoredTaskRecord, taskRecordStore } from '$lib/client/task-record-store';
	import {
		collectTaskLinkedThreads,
		mergeTaskThreadCandidateState,
		mergeTaskThreadState
	} from '$lib/client/task-thread-state';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import PageTabs from '$lib/components/PageTabs.svelte';
	import TaskDetailEditorForm from '$lib/components/tasks/TaskDetailEditorForm.svelte';
	import TaskExecutionPanel from '$lib/components/tasks/TaskExecutionPanel.svelte';
	import TaskGovernancePanel from '$lib/components/tasks/TaskGovernancePanel.svelte';
	import TaskDetailHero from '$lib/components/tasks/TaskDetailHero.svelte';
	import TaskDetailOverview from '$lib/components/tasks/TaskDetailOverview.svelte';
	import TaskResourcesPanel from '$lib/components/tasks/TaskResourcesPanel.svelte';
	import { getTaskThreadActionLabel, isActiveTaskThread } from '$lib/task-thread-context';
	import { ACTIVE_REFRESH_INTERVAL_MS } from '$lib/thread-activity';
	import { formatTaskStatusLabel, taskStatusToneClass } from '$lib/types/control-plane';
	import { fromStore } from 'svelte/store';

	let props = $props<{
		data: PageData;
		form?: ActionData;
		embedded?: boolean;
		actionBasePath?: string;
	}>();
	let form = $derived(props.form);
	let embedded = $derived(props.embedded ?? false);
	let actionBasePath = $derived(props.actionBasePath ?? '');
	let refreshedData = $state.raw<PageData | null>(null);
	let sourceData = $derived(refreshedData ?? props.data);
	let autoRefresh = $state(true);
	let isRefreshing = $state(false);
	let refreshError = $state<string | null>(null);
	const threadStoreState = fromStore(agentThreadStore);
	const taskRecordState = fromStore(taskRecordStore);
	let data = $derived.by(() => ({
		...sourceData,
		task: mergeTaskThreadState(
			mergeStoredTaskRecord(sourceData.task, taskRecordState.current.byId),
			threadStoreState.current.byId
		),
		candidateThreads: sourceData.candidateThreads.map(
			(thread: PageData['candidateThreads'][number]) =>
				mergeTaskThreadCandidateState(thread, threadStoreState.current.byId)
		),
		suggestedThread: mergeTaskThreadCandidateState(
			sourceData.suggestedThread,
			threadStoreState.current.byId
		)
	}));

	const autoRefreshIntervalLabel = `${ACTIVE_REFRESH_INTERVAL_MS / 1000}s`;

	$effect(() => {
		taskRecordStore.seedTask(sourceData.task);
		agentThreadStore.seedThreads(collectTaskLinkedThreads(sourceData.task), { replace: false });
	});

	let updateSuccess = $derived(form?.ok && form?.successAction === 'updateTask');
	let attachSuccess = $derived(form?.ok && form?.successAction === 'attachTaskFile');
	let removeAttachmentSuccess = $derived(
		form?.ok && form?.successAction === 'removeTaskAttachment'
	);
	let threadAssignSuccess = $derived(form?.ok && form?.successAction === 'updateTaskThread');
	let launchSuccess = $derived(form?.ok && form?.successAction === 'launchTaskSession');
	let recoverSuccess = $derived(form?.ok && form?.successAction === 'recoverTaskSession');
	let submittedThreadId = $derived(
		form && typeof form === 'object' && 'threadId' in form ? (form.threadId?.toString() ?? '') : ''
	);
	let governanceSuccessMessage = $derived.by(() => {
		switch (form?.successAction) {
			case 'decomposeTask': {
				const createdChildCount =
					typeof form === 'object' &&
					form &&
					'createdChildCount' in form &&
					typeof form.createdChildCount === 'number'
						? form.createdChildCount
						: null;

				return createdChildCount && createdChildCount > 0
					? `Created ${createdChildCount} delegated child task${createdChildCount === 1 ? '' : 's'}.`
					: 'Delegated child tasks created.';
			}
			case 'approveReview':
				return 'Review approved.';
			case 'requestChanges':
				return 'Changes requested and task moved back into attention.';
			case 'approveApproval':
				return 'Approval granted.';
			case 'rejectApproval':
				return 'Approval rejected and task blocked.';
			case 'acceptChildHandoff':
				return 'Child handoff accepted into the parent task.';
			case 'requestChildHandoffChanges':
				return 'Child handoff returned for follow-up.';
			default:
				return '';
		}
	});
	let selectedDetailPanel = $state<'resources' | 'execution' | 'governance' | 'danger'>(
		(() => {
			switch (form?.successAction) {
				case 'updateTaskThread':
				case 'launchTaskSession':
				case 'recoverTaskSession':
					return 'execution';
				case 'approveReview':
				case 'requestChanges':
				case 'approveApproval':
				case 'rejectApproval':
				case 'decomposeTask':
				case 'acceptChildHandoff':
				case 'requestChildHandoffChanges':
					return 'governance';
				case 'attachTaskFile':
				case 'removeTaskAttachment':
					return 'resources';
				default:
					if (props.data.initialDetailPanel) {
						return props.data.initialDetailPanel;
					}

					return props.data.task.linkThread || props.data.relatedRuns.length > 0
						? 'execution'
						: 'resources';
			}
		})()
	);
	let governanceSignalCount = $derived(
		(data.task.openReview ? 1 : 0) +
			(data.task.pendingApproval ? 1 : 0) +
			(data.parentTask ? 1 : 0) +
			data.childTasks.length
	);
	let pendingChildHandoffCount = $derived(
		data.childTasks.filter(
			(childTask: PageData['childTasks'][number]) => childTask.integrationStatus === 'pending'
		).length
	);
	let activeChildTaskCount = $derived(
		data.childTasks.filter(
			(childTask: PageData['childTasks'][number]) => childTask.integrationStatus === 'not_ready'
		).length
	);
	let acceptedChildTaskCount = $derived(
		data.childTasks.filter(
			(childTask: PageData['childTasks'][number]) => childTask.integrationStatus === 'accepted'
		).length
	);
	let relatedChildTaskPreview = $derived(data.childTasks.slice(0, 3));

	$effect(() => {
		if (props.data) {
			refreshedData = null;
		}
	});

	function shouldAutoRefreshTaskDetail() {
		return data.task.hasActiveRun || isActiveTaskThread(data.task.statusThread);
	}

	async function refreshTaskDetail(options: { force?: boolean } = {}) {
		if (isRefreshing || shouldPauseRefresh({ force: options.force })) {
			return;
		}

		isRefreshing = true;

		try {
			refreshedData = await fetchJson<PageData>(
				`/api/tasks/${data.task.id}`,
				'Could not refresh the task detail.'
			);
			refreshError = null;
		} catch (err) {
			refreshError = err instanceof Error ? err.message : 'Could not refresh the task detail.';
		} finally {
			isRefreshing = false;
		}
	}

	function handleWindowFocus() {
		void refreshTaskDetail();
	}

	function handleVisibilityChange() {
		if (document.visibilityState !== 'visible') {
			return;
		}

		void refreshTaskDetail();
	}

	$effect(() => {
		if (!autoRefresh || !shouldAutoRefreshTaskDetail()) {
			return;
		}

		const intervalId = window.setInterval(
			() => {
				void refreshTaskDetail();
			},
			Math.max(ACTIVE_REFRESH_INTERVAL_MS, 5_000)
		);

		return () => {
			window.clearInterval(intervalId);
		};
	});

	function threadActionLabel() {
		return getTaskThreadActionLabel(data.task);
	}

	function taskAction(actionName: string) {
		return actionBasePath ? `${actionBasePath}?/${actionName}` : `?/${actionName}`;
	}

	function compactText(value: string, maxLength = 320) {
		const normalized = value.replace(/\s+/g, ' ').trim();

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
	}

	function buildAgentUseHref(filters: Record<string, string | null | undefined>) {
		const params = new URLSearchParams();

		for (const [key, value] of Object.entries(filters)) {
			if (typeof value === 'string' && value.trim()) {
				params.set(key, value);
			}
		}

		return `/app/agent-use${params.size > 0 ? `?${params.toString()}` : ''}`;
	}

	function formatActiveRunStateLabel(status: string | null | undefined) {
		switch (status) {
			case 'queued':
				return 'Task queued';
			case 'starting':
				return 'Task starting';
			case 'running':
				return 'Task running';
			default:
				return 'Run task';
		}
	}

	function createFollowUpTaskInstructions() {
		return [
			`Create a follow-up task related to "${data.task.title}".`,
			`Current task summary:\n${compactText(data.task.summary, 420)}`
		].join('\n\n');
	}

	function createDelegatedSubtaskInstructions() {
		return [
			`Delegate a focused subtask from "${data.task.title}" to a specialized agent.`,
			`Parent task summary:\n${compactText(data.task.summary, 420)}`,
			'Subtask brief:\n- Define one narrow objective.\n- Specify required output or artifact.\n- Keep scope separate enough to integrate cleanly into the parent task.'
		].join('\n\n');
	}

	function createDelegationInputContext() {
		return [
			`Parent task: ${data.task.title}`,
			`Current status: ${formatTaskStatusLabel(data.task.status)}`,
			`Task summary: ${compactText(data.task.summary, 420)}`
		].join('\n');
	}

	function createDelegationIntegrationNotes() {
		return [
			`Return the completed handoff to parent task ${data.task.id}.`,
			'Call out unresolved risks or assumptions so the parent task can decide whether integration is safe.'
		].join('\n');
	}

	let taskHasActiveRun = $derived(Boolean(data.task.hasActiveRun));
	let taskIsReadyToRun = $derived(data.task.status === 'ready');
	let launchContractBlocked = $derived(!data.launchContext.contract.canLaunch);
	let launchCoverageBlocked = $derived.by(() => {
		if (!data.executionPreflight.hasDeclaredRequirements) {
			return false;
		}

		if (data.executionPreflight.currentAssignee) {
			return (
				!data.executionPreflight.currentAssignee.withinConcurrencyLimit ||
				data.executionPreflight.currentAssignee.missingCapabilityNames.length > 0 ||
				data.executionPreflight.currentAssignee.missingToolNames.length > 0
			);
		}

		if (
			data.executionPreflight.registeredExecutionSurfaceCount === 0 &&
			data.executionPreflight.eligibleExecutionSurfaceCount === 0 &&
			data.executionPreflight.directProvider?.canLaunchDirectly
		) {
			return false;
		}

		return data.executionPreflight.eligibleExecutionSurfaceCount === 0;
	});
	let runTaskDisabled = $derived(
		!taskIsReadyToRun || taskHasActiveRun || launchContractBlocked || launchCoverageBlocked
	);
	let runTaskButtonLabel = $derived(
		taskHasActiveRun ? formatActiveRunStateLabel(data.task.activeRun?.status) : 'Run task'
	);
	let runTaskDisabledTitle = $derived.by(() => {
		if (taskHasActiveRun) {
			return 'A run is already in progress for this task.';
		}

		if (!taskIsReadyToRun) {
			return 'This task is not ready to run yet.';
		}

		if (launchContractBlocked) {
			return 'This task needs a clearer execution contract before a new run can start.';
		}

		if (launchCoverageBlocked) {
			if (
				data.executionPreflight.registeredExecutionSurfaceCount === 0 &&
				data.executionPreflight.directProvider
			) {
				return 'Current execution-surface coverage and direct provider coverage do not satisfy this task’s declared launch requirements.';
			}

			return 'Current execution-surface coverage does not satisfy this task’s declared launch requirements.';
		}

		return '';
	});
	let runTaskDisabledMessage = $derived.by(() => {
		if (taskHasActiveRun) {
			switch (data.task.activeRun?.status) {
				case 'queued':
					return 'This task already has queued work. Open the current work thread or wait for it to start before running again.';
				case 'starting':
					return 'This task is already starting in its work thread. Open the current work thread or wait for startup to finish before running again.';
				case 'running':
					return 'This task is already running. Open the current work thread or wait for the current run to finish before running again.';
				default:
					return 'This task already has active work. Open the current work thread or wait for it to finish before running again.';
			}
		}

		if (!taskIsReadyToRun) {
			return `Set the task status to Ready before running it. Current status: ${formatTaskStatusLabel(data.task.status)}.`;
		}

		if (launchContractBlocked) {
			return (
				data.launchContext.contract.launchBlockerMessage ??
				'Add success criteria, a ready condition, and an expected outcome before running this task.'
			);
		}

		if (launchCoverageBlocked) {
			if (data.executionPreflight.currentAssignee) {
				if (!data.executionPreflight.currentAssignee.withinConcurrencyLimit) {
					return `${data.executionPreflight.currentAssignee.executionSurfaceName} is already at its concurrency limit.`;
				}

				const missingParts = [
					data.executionPreflight.currentAssignee.missingCapabilityNames.length > 0
						? `capabilities: ${data.executionPreflight.currentAssignee.missingCapabilityNames.join(', ')}`
						: '',
					data.executionPreflight.currentAssignee.missingToolNames.length > 0
						? `tools: ${data.executionPreflight.currentAssignee.missingToolNames.join(', ')}`
						: ''
				].filter(Boolean);

				return `${data.executionPreflight.currentAssignee.executionSurfaceName} does not cover the declared ${missingParts.join(' · ')}.`;
			}

			if (
				data.executionPreflight.registeredExecutionSurfaceCount === 0 &&
				data.executionPreflight.directProvider
			) {
				const missingParts = [
					data.executionPreflight.directProvider.missingCapabilityNames.length > 0
						? `capabilities: ${data.executionPreflight.directProvider.missingCapabilityNames.join(', ')}`
						: '',
					data.executionPreflight.directProvider.missingToolNames.length > 0
						? `tools: ${data.executionPreflight.directProvider.missingToolNames.join(', ')}`
						: ''
				].filter(Boolean);

				if (!data.executionPreflight.directProvider.enabled && missingParts.length === 0) {
					return `No execution surface is registered for this task, and ${data.executionPreflight.directProvider.providerName} is currently disabled.`;
				}

				return `No execution surface is registered for this task, and ${data.executionPreflight.directProvider.providerName} does not cover the declared ${missingParts.join(' · ')}.`;
			}

			return 'No current execution surface can launch this task with its declared capability and tool requirements.';
		}

		return '';
	});
</script>

<svelte:window onfocus={handleWindowFocus} />
<svelte:document onvisibilitychange={handleVisibilityChange} />

<section class={embedded ? 'space-y-6' : 'ui-page max-w-none space-y-6'}>
	<TaskDetailHero
		task={data.task}
		threadActionLabel={threadActionLabel()}
		{runTaskDisabled}
		{runTaskButtonLabel}
		{runTaskDisabledTitle}
		{actionBasePath}
		readOnly={embedded}
		delegationInputContext={createDelegationInputContext()}
		delegationIntegrationNotes={createDelegationIntegrationNotes()}
		delegatedSubtaskInstructions={createDelegatedSubtaskInstructions()}
		followUpTaskInstructions={createFollowUpTaskInstructions()}
	/>

	{#if !embedded}
		<TaskDetailEditorForm
			task={data.task}
			projects={data.projects}
			goals={data.goals}
			workflows={data.workflows}
			statusOptions={data.statusOptions}
			executionSurfaces={data.executionSurfaces}
			assignmentSuggestions={data.assignmentSuggestions}
			roles={data.roles ?? []}
			dependencyTasksCount={data.dependencyTasks.length}
			availableDependencyTasks={data.availableDependencyTasks ?? []}
			executionRequirementInventory={data.executionRequirementInventory}
			projectInstalledSkills={data.projectInstalledSkills}
			{actionBasePath}
		/>
	{/if}

	{#if data.parentTask || data.childTasks.length > 0}
		<section class="card border border-slate-800/90 bg-slate-950/75 px-5 py-4">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<p class="text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase">
						Related tasks
					</p>
					<p class="mt-1 text-sm text-slate-400">
						Keep the parent-child task chain visible without digging through the governance panel
						first.
					</p>
				</div>
				<button
					class="btn border border-slate-700 bg-slate-950/70 text-xs font-semibold text-slate-100"
					type="button"
					onclick={() => {
						selectedDetailPanel = 'governance';
					}}
				>
					Open related tasks workspace
				</button>
			</div>

			<div class="mt-4 grid gap-3 lg:grid-cols-2">
				{#if data.parentTask}
					<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
						<p class="text-[0.7rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Parent task
						</p>
						<div class="mt-2 flex flex-wrap items-center gap-2">
							<a
								class="ui-wrap-anywhere text-sm font-medium text-sky-300 transition hover:text-sky-200"
								href={resolve(`/app/tasks/${data.parentTask.id}`)}
							>
								{data.parentTask.title}
							</a>
							<span
								class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(data.parentTask.status)}`}
							>
								{formatTaskStatusLabel(data.parentTask.status)}
							</span>
						</div>
						<p class="mt-2 text-xs text-slate-500">{data.parentTask.projectName}</p>
					</div>
				{/if}

				{#if data.childTasks.length > 0}
					<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p class="text-[0.7rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Child tasks
								</p>
								<p class="mt-2 text-sm text-white">
									{data.childTasks.length === 1
										? '1 delegated child task is linked to this parent.'
										: `${data.childTasks.length} delegated child tasks are linked to this parent.`}
								</p>
							</div>
							<span
								class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
							>
								{pendingChildHandoffCount} pending · {activeChildTaskCount} active · {acceptedChildTaskCount}
								accepted
							</span>
						</div>

						<div class="mt-3 flex flex-wrap gap-2">
							{#each relatedChildTaskPreview as childTask (childTask.id)}
								<a
									class="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-center text-xs leading-none font-medium text-slate-100 transition hover:border-slate-600 hover:text-white"
									href={resolve(`/app/tasks/${childTask.id}`)}
								>
									{childTask.title}
								</a>
							{/each}
							{#if data.childTasks.length > relatedChildTaskPreview.length}
								<button
									class="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-center text-xs leading-none font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
									type="button"
									onclick={() => {
										selectedDetailPanel = 'governance';
									}}
								>
									+{data.childTasks.length - relatedChildTaskPreview.length} more in governance
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<TaskDetailOverview
		onRefresh={() => {
			void refreshTaskDetail({ force: true });
		}}
		{isRefreshing}
		showLiveUpdates={shouldAutoRefreshTaskDetail()}
		{autoRefreshIntervalLabel}
		{refreshError}
		{actionBasePath}
		readOnly={embedded}
		task={data.task}
		project={data.project}
		threadActionLabel={threadActionLabel()}
		availableSkills={data.availableSkills}
		formMessage={form?.message}
		{updateSuccess}
		{attachSuccess}
		{removeAttachmentSuccess}
		{threadAssignSuccess}
		{launchSuccess}
		{recoverSuccess}
		{submittedThreadId}
		{governanceSuccessMessage}
		{runTaskDisabled}
		{runTaskDisabledTitle}
		{runTaskDisabledMessage}
		{taskHasActiveRun}
		stalledRecovery={data.stalledRecovery}
	/>

	<div class="space-y-6">
		<section class="card border border-slate-800/90 bg-slate-950/75 px-5 py-4">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<p class="text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase">
						Task workspaces
					</p>
					<p class="mt-1 text-sm text-slate-400">
						Switch between supporting materials, execution continuity, governance, and cleanup
						without scanning the entire page.
					</p>
				</div>
				<PageTabs
					ariaLabel="Task detail panels"
					bind:value={selectedDetailPanel}
					items={[
						{ id: 'resources', label: 'Resources', badge: data.task.attachments.length },
						{ id: 'execution', label: 'Execution', badge: data.relatedRuns.length },
						{ id: 'governance', label: 'Governance', badge: governanceSignalCount },
						...(embedded ? [] : [{ id: 'danger', label: 'Danger zone', tone: 'danger' as const }])
					]}
					panelIdPrefix="task-detail"
				/>
			</div>
		</section>

		{#if selectedDetailPanel === 'resources'}
			<TaskResourcesPanel
				taskId={data.task.id}
				attachments={data.task.attachments}
				attachmentRoot={data.attachmentRoot}
				artifactBrowser={data.artifactBrowser}
				{actionBasePath}
				readOnly={embedded}
			/>
		{:else if selectedDetailPanel === 'execution'}
			<TaskExecutionPanel
				task={data.task}
				executionPreflight={data.executionPreflight}
				launchContext={data.launchContext}
				retrievedKnowledgeItems={data.retrievedKnowledgeItems ?? []}
				suggestedThread={data.suggestedThread}
				candidateThreads={data.candidateThreads}
				relatedRuns={data.relatedRuns}
				threadActionLabel={threadActionLabel()}
				{actionBasePath}
				readOnly={embedded}
			/>
		{:else if selectedDetailPanel === 'governance'}
			<TaskGovernancePanel
				task={data.task}
				parentTask={data.parentTask}
				childTaskRollup={data.childTaskRollup}
				childTasks={data.childTasks}
				roles={data.roles ?? []}
				dependencyTasks={data.dependencyTasks}
				recentDecisions={data.recentDecisions}
				{actionBasePath}
				readOnly={embedded}
			/>
		{:else}
			<div id="task-detail-panel-danger" role="tabpanel" aria-labelledby="task-detail-tab-danger">
				<DetailSection
					id="danger-zone"
					eyebrow="Danger zone"
					title="Delete task"
					description="This removes the task from the control plane, drops its related runs, reviews, and approvals, and detaches it from dependency lists on other tasks."
					tone="rose"
				>
					<form class="mt-5" method="POST" action={taskAction('deleteTask')}>
						<button
							class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
							type="submit"
						>
							Delete task
						</button>
					</form>
				</DetailSection>
			</div>
		{/if}
	</div>

	<section class="space-y-6">
		<section class="card border border-slate-800/90 bg-slate-950/75 px-5 py-4">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<p class="text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase">
						Operational diagnostics
					</p>
					<p class="mt-1 max-w-2xl text-sm text-slate-400">
						These panels are mainly useful when debugging routing, managed-run state, or agent
						behavior. They stay below the main editing surfaces so the task brief remains the
						primary focus.
					</p>
				</div>
				<div class="flex flex-wrap gap-3">
					<AppButton href={buildAgentUseHref({ task: data.task.id })} variant="neutral">
						View task agent use
					</AppButton>
					{#if data.task.latestRunId}
						<AppButton href={buildAgentUseHref({ run: data.task.latestRunId })} variant="ghost">
							View latest run agent use
						</AppButton>
					{/if}
				</div>
			</div>
		</section>

		<AgentCurrentContextPanel context={data.agentCurrentContext} />
	</section>
</section>
