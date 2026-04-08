<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { agentThreadStore } from '$lib/client/agent-thread-store';
	import { fetchJson } from '$lib/client/agent-data';
	import { shouldPauseRefresh } from '$lib/client/refresh';
	import { mergeStoredTaskRecord, taskRecordStore } from '$lib/client/task-record-store';
	import {
		collectTaskLinkedThreads,
		mergeTaskThreadCandidateState,
		mergeTaskThreadState
	} from '$lib/client/task-thread-state';
	import AppPage from '$lib/components/AppPage.svelte';
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
	import { formatTaskStatusLabel } from '$lib/types/control-plane';
	import { fromStore } from 'svelte/store';

	let props = $props<{ data: PageData; form?: ActionData }>();
	let form = $derived(props.form);
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
					return props.data.task.linkThread || props.data.relatedRuns.length > 0
						? 'execution'
						: 'resources';
			}
		})()
	);
	let governanceSignalCount = $derived(
		(data.task.openReview ? 1 : 0) + (data.task.pendingApproval ? 1 : 0)
	);

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

		const intervalId = window.setInterval(() => {
			void refreshTaskDetail();
		}, ACTIVE_REFRESH_INTERVAL_MS);

		return () => {
			window.clearInterval(intervalId);
		};
	});

	function threadActionLabel() {
		return getTaskThreadActionLabel(data.task);
	}

	function compactText(value: string, maxLength = 320) {
		const normalized = value.replace(/\s+/g, ' ').trim();

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
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
	let runTaskDisabled = $derived(!taskIsReadyToRun || taskHasActiveRun);
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

		return '';
	});
</script>

<svelte:window onfocus={handleWindowFocus} />
<svelte:document onvisibilitychange={handleVisibilityChange} />

<AppPage width="full">
	<TaskDetailHero
		task={data.task}
		threadActionLabel={threadActionLabel()}
		{runTaskDisabled}
		{runTaskButtonLabel}
		{runTaskDisabledTitle}
		delegationInputContext={createDelegationInputContext()}
		delegationIntegrationNotes={createDelegationIntegrationNotes()}
		delegatedSubtaskInstructions={createDelegatedSubtaskInstructions()}
		followUpTaskInstructions={createFollowUpTaskInstructions()}
	/>

	<TaskDetailOverview
		onRefresh={() => {
			void refreshTaskDetail({ force: true });
		}}
		{isRefreshing}
		showLiveUpdates={shouldAutoRefreshTaskDetail()}
		{autoRefreshIntervalLabel}
		{refreshError}
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

	<div class="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
		<TaskDetailEditorForm
			task={data.task}
			projects={data.projects}
			goals={data.goals}
			statusOptions={data.statusOptions}
			workers={data.workers}
			assignmentSuggestions={data.assignmentSuggestions}
			roles={data.roles ?? []}
			dependencyTasksCount={data.dependencyTasks.length}
			availableDependencyTasks={data.availableDependencyTasks ?? []}
			executionRequirementInventory={data.executionRequirementInventory}
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
							{ id: 'danger', label: 'Danger zone', tone: 'danger' }
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
						<form class="mt-5" method="POST" action="?/deleteTask">
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
	</div>
</AppPage>
