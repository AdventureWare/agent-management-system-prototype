<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import type { PageData as TaskDetailPageData } from './[taskId]/$types';
	import type { PageData as ThreadDetailPageData } from '../threads/[threadId]/$types';
	import TaskDetailPageContent from './[taskId]/TaskDetailPageContent.svelte';
	import ThreadDetailPanel from '$lib/components/ThreadDetailPanel.svelte';
	import { fetchJson } from '$lib/client/agent-data';
	import {
		getHiddenCollapsedRowCount,
		getHiddenTaskViewNotice
	} from '$lib/client/collection-visibility';
	import { clearFormDraft, readFormDraft, writeFormDraft } from '$lib/client/form-drafts';
	import { agentThreadStore } from '$lib/client/agent-thread-store';
	import {
		appendExecutionRequirementName,
		findUnknownExecutionRequirementNames
	} from '$lib/execution-requirements';
	import {
		buildTaskExecutionContractStatus,
		getTaskLaunchContractBlockerMessage,
		getTaskReviewContractGapMessage
	} from '$lib/task-execution-contract';
	import { mergeStoredTaskRecord, taskRecordStore } from '$lib/client/task-record-store';
	import { collectTaskLinkedThreads, mergeTaskThreadState } from '$lib/client/task-thread-state';
	import {
		getTaskApprovalPolicyLabel,
		getTaskPendingApprovalBadgeLabel,
		getTaskReviewBadgeLabel,
		getTaskReviewRequirementLabel
	} from '$lib/task-governance-ui';
	import { getTaskThreadActionLabel, getTaskThreadReviewHref } from '$lib/task-thread-context';
	import AgentGuidanceHintBadge from '$lib/components/AgentGuidanceHintBadge.svelte';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import DataTableSection from '$lib/components/DataTableSection.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import PageTabs from '$lib/components/PageTabs.svelte';
	import QueueOpenButton from '$lib/components/QueueOpenButton.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';
	import SelectionActionBar from '$lib/components/SelectionActionBar.svelte';
	import { formatThreadStateLabel } from '$lib/thread-activity';
	import {
		AGENT_SANDBOX_OPTIONS,
		formatAgentSandboxLabel,
		type AgentSandbox
	} from '$lib/types/agent-thread';
	import {
		PRIORITY_OPTIONS,
		TASK_APPROVAL_MODE_OPTIONS,
		TASK_RISK_LEVEL_OPTIONS,
		formatPriorityLabel,
		formatTaskApprovalModeLabel,
		formatTaskRiskLevelLabel,
		formatTaskStatusLabel,
		taskStatusToneClass
	} from '$lib/types/control-plane';
	import type { TaskStaleSignalKey } from '$lib/types/task-work-item';
	import { fromStore } from 'svelte/store';

	let { data, form } = $props();
	type TaskRow = (typeof data.tasks)[number];
	type DependencyTaskOption = (typeof data.availableDependencyTasks)[number];
	type QueueDetailPanel = {
		kind: 'task' | 'thread';
		href: string;
		title: string;
		description: string;
		rowTaskId: string;
		detailId: string;
	};
	type TaskLayoutMode = 'mobile' | 'desktop';
	type CreateTaskFlowMode = 'quick' | 'full';
	type TaskSortField = 'updated' | 'targetDate' | 'priority';
	type TaskSortDirection = 'asc' | 'desc';
	type TaskQueueFocus = 'all' | 'needsAttention';
	type TaskQueuePresetId = 'open' | 'needsAttention' | 'completed';
	type TaskQueueRow = TaskRow & {
		depth: number;
		visibleChildCount: number;
		isDirectMatch: boolean;
		isContextRow: boolean;
		isExpanded: boolean;
	};
	type TaskQueueCollection = {
		rows: TaskQueueRow[];
		directMatchCount: number;
		hiddenCollapsedRowCount: number;
	};
	type TaskQueueQuickAction = {
		action: 'launchTaskSession' | 'recoverTaskSession';
		label: string;
		title: string;
		variant: 'success' | 'warning';
	};

	let query = $state('');
	let selectedStatus = $state('all');
	let selectedWorkflowId = $state('all');
	let selectedTaskView = $state<'active' | 'completed'>('active');
	let selectedSortField = $state<TaskSortField>('updated');
	let selectedSortDirection = $state<TaskSortDirection>('desc');
	let selectedQueueFocus = $state<TaskQueueFocus>('all');
	let selectedTaskIds = $state.raw<string[]>([]);
	let selectedPreviewTaskId = $state('');
	let collapsedTaskIds = $state.raw<string[]>([]);
	let queueDetailPanel = $state<QueueDetailPanel | null>(null);
	let createTaskAttachmentInput = $state<HTMLInputElement | null>(null);
	let createTaskDraftReady = $state(false);
	let createTaskAdvancedOpen = $state(false);
	let createTaskFlowMode = $state<CreateTaskFlowMode>('quick');
	let createTaskDependencyQuery = $state('');
	let isSaveTaskTemplateDialogOpen = $state(false);
	let taskDetailPanelCache = $state.raw<Record<string, TaskDetailPageData>>({});
	let taskDetailPanelData = $state.raw<TaskDetailPageData | null>(null);
	let taskDetailPanelLoadError = $state<string | null>(null);
	let taskDetailPanelLoadingTaskId = $state('');
	let threadDetailPanelCache = $state.raw<Record<string, ThreadDetailPageData>>({});
	let threadDetailPanelData = $state.raw<ThreadDetailPageData | null>(null);
	let threadDetailPanelLoadError = $state<string | null>(null);
	let threadDetailPanelLoadingThreadId = $state('');
	let pendingCreateAttachments = $state.raw<
		{ id: string; name: string; sizeBytes: number; contentType: string }[]
	>([]);
	let taskLayoutMode = $state<TaskLayoutMode>('desktop');

	const CREATE_TASK_DRAFT_KEY = 'ams:create-task';
	const ROOT_TASK_PARENT_KEY = '__root__';
	const threadStoreState = fromStore(agentThreadStore);
	const taskRecordState = fromStore(taskRecordStore);

	function createDialogShouldStartOpen() {
		return (
			(form?.formContext === 'taskCreate' && (form?.reopenCreateModal === true || !form?.ok)) ||
			data.createTaskPrefill?.open === true
		);
	}

	let isCreateModalOpen = $state(createDialogShouldStartOpen());

	let createSuccess = $derived(form?.ok && form?.successAction === 'createTask');
	let createTaskWithWorkflowSuccess = $derived(
		form?.ok && form?.successAction === 'createTaskWithWorkflow'
	);
	let createAndRunSuccess = $derived(form?.ok && form?.successAction === 'createTaskAndRun');
	let saveTaskTemplateSuccess = $derived(form?.ok && form?.successAction === 'saveTaskTemplate');
	let taskWritingAssistSuccess = $derived(form?.ok && form?.successAction === 'assistTaskWriting');
	let taskWritingAssistChangeSummary = $derived(
		taskWritingAssistSuccess ? (form?.assistChangeSummary?.toString() ?? '') : ''
	);
	let queueSessionSuccess = $derived.by(() => {
		if (!form?.ok) {
			return null;
		}

		switch (form.successAction) {
			case 'launchTaskSession':
				return {
					message: 'Task queued in its work thread.',
					threadId: form.threadId?.toString() ?? ''
				};
			case 'recoverTaskSession':
				return {
					message: 'Recovered the stalled run and queued fresh work.',
					threadId: form.threadId?.toString() ?? ''
				};
			default:
				return null;
		}
	});
	let governanceSuccessMessage = $derived.by(() => {
		if (!form?.ok) {
			return null;
		}

		switch (form.successAction) {
			case 'approveReview':
				return 'Review approved.';
			case 'requestChanges':
				return 'Changes requested and task moved back to blocked.';
			case 'approveApproval':
				return 'Approval gate cleared.';
			case 'rejectApproval':
				return 'Approval rejected and task moved to blocked.';
			default:
				return null;
		}
	});
	let createdAttachmentCount = $derived(
		form?.ok &&
			(form?.successAction === 'createTask' ||
				form?.successAction === 'createTaskAndRun' ||
				form?.successAction === 'createTaskWithWorkflow')
			? Number(form.attachmentCount ?? 0)
			: 0
	);
	let instantiatedWorkflowTaskCount = $derived(
		createTaskWithWorkflowSuccess ? Number(form?.createdTaskCount ?? 0) : 0
	);
	let instantiatedWorkflowTaskHref = $derived(
		createTaskWithWorkflowSuccess && form?.parentTaskId
			? resolve(`/app/tasks/${form.parentTaskId}`)
			: ''
	);
	let deleteCount = $derived.by(() => {
		if (form?.ok && form?.successAction === 'deleteTasks') {
			return Number(form.deletedCount ?? 0);
		}

		return data.deleted ? 1 : 0;
	});
	let deleteSuccess = $derived(deleteCount > 0);
	let tasks = $derived.by(() =>
		data.tasks.map((task) =>
			mergeTaskThreadState(
				mergeStoredTaskRecord(task, taskRecordState.current.byId),
				threadStoreState.current.byId
			)
		)
	);
	let selectedTaskIdSet = $derived(new Set(selectedTaskIds));
	let projectRootByTaskId = $derived(
		new Map(data.projects.map((project) => [project.id, project.projectRootFolder?.trim() ?? '']))
	);

	const RECOVERABLE_RUN_STATUSES = new Set(['queued', 'starting', 'running']);

	$effect(() => {
		taskRecordStore.seedTasks(data.tasks, { replace: true });
		agentThreadStore.seedThreads(
			data.tasks.flatMap((task) => collectTaskLinkedThreads(task)),
			{ replace: true }
		);
	});

	function compactText(value: string, maxLength = 120) {
		const normalized = value.replace(/\s+/g, ' ').trim();

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
	}

	function openTaskDetailPanel(task: TaskRow) {
		queueDetailPanel = {
			kind: 'task',
			href: resolve(`/app/tasks/${task.id}`),
			title: task.title,
			description: 'Task detail panel',
			rowTaskId: task.id,
			detailId: task.id
		};
	}

	function openThreadDetailPanel(task: TaskRow) {
		if (!task.linkThread) {
			return;
		}

		queueDetailPanel = {
			kind: 'thread',
			href: resolve(getTaskThreadReviewHref(task.linkThread.id)),
			title: task.linkThread.name,
			description: `Thread linked to ${task.title}`,
			rowTaskId: task.id,
			detailId: task.linkThread.id
		};
	}

	function normalizeSandboxValue(value: string | null | undefined): '' | AgentSandbox {
		return AGENT_SANDBOX_OPTIONS.includes(value as AgentSandbox) ? (value as AgentSandbox) : '';
	}

	function formatDateLabel(value: string | null | undefined) {
		if (!value) {
			return 'No target date';
		}

		const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));

		if (!year || !month || !day) {
			return value;
		}

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(Date.UTC(year, month - 1, day)));
	}

	async function loadTaskDetailPanel(taskId: string, options: { force?: boolean } = {}) {
		if (!taskId.trim()) {
			return;
		}

		if (!options.force && taskDetailPanelCache[taskId]) {
			taskDetailPanelData = taskDetailPanelCache[taskId] ?? null;
			taskDetailPanelLoadError = null;
			return;
		}

		taskDetailPanelLoadingTaskId = taskId;
		taskDetailPanelLoadError = null;

		if (!taskDetailPanelCache[taskId]) {
			taskDetailPanelData = null;
		}

		try {
			const detail = await fetchJson<TaskDetailPageData>(
				`/api/tasks/${taskId}`,
				'Could not load the task detail panel.'
			);

			taskDetailPanelCache = {
				...taskDetailPanelCache,
				[taskId]: detail
			};

			if (queueDetailPanel?.kind === 'task' && queueDetailPanel.rowTaskId === taskId) {
				taskDetailPanelData = detail;
				taskDetailPanelLoadError = null;
			}
		} catch (err) {
			if (queueDetailPanel?.kind === 'task' && queueDetailPanel.rowTaskId === taskId) {
				taskDetailPanelLoadError =
					err instanceof Error ? err.message : 'Could not load the task detail panel.';
			}
		} finally {
			if (taskDetailPanelLoadingTaskId === taskId) {
				taskDetailPanelLoadingTaskId = '';
			}
		}
	}

	async function loadThreadDetailPanel(threadId: string, options: { force?: boolean } = {}) {
		if (!threadId.trim()) {
			return;
		}

		if (!options.force && threadDetailPanelCache[threadId]) {
			threadDetailPanelData = threadDetailPanelCache[threadId] ?? null;
			threadDetailPanelLoadError = null;
			return;
		}

		threadDetailPanelLoadingThreadId = threadId;
		threadDetailPanelLoadError = null;

		if (!threadDetailPanelCache[threadId]) {
			threadDetailPanelData = null;
		}

		try {
			const detail = await fetchJson<ThreadDetailPageData>(
				`/api/agents/threads/${threadId}/panel`,
				'Could not load the thread detail panel.'
			);

			threadDetailPanelCache = {
				...threadDetailPanelCache,
				[threadId]: detail
			};

			if (queueDetailPanel?.kind === 'thread' && queueDetailPanel.detailId === threadId) {
				threadDetailPanelData = detail;
				threadDetailPanelLoadError = null;
			}
		} catch (err) {
			if (queueDetailPanel?.kind === 'thread' && queueDetailPanel.detailId === threadId) {
				threadDetailPanelLoadError =
					err instanceof Error ? err.message : 'Could not load the thread detail panel.';
			}
		} finally {
			if (threadDetailPanelLoadingThreadId === threadId) {
				threadDetailPanelLoadingThreadId = '';
			}
		}
	}

	function formatAttachmentSize(sizeBytes: number) {
		if (sizeBytes < 1024) {
			return `${sizeBytes} B`;
		}

		if (sizeBytes < 1024 * 1024) {
			return `${(sizeBytes / 1024).toFixed(1)} KB`;
		}

		return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatInventoryCoverageLabel(entry: {
		executionSurfaceCount: number;
		providerCount: number;
	}) {
		const parts: string[] = [];

		if (entry.executionSurfaceCount > 0) {
			parts.push(
				`${entry.executionSurfaceCount} execution surface${entry.executionSurfaceCount === 1 ? '' : 's'}`
			);
		}

		if (entry.providerCount > 0) {
			parts.push(`${entry.providerCount} provider${entry.providerCount === 1 ? '' : 's'}`);
		}

		return parts.join(' · ') || 'No current coverage';
	}

	function createAttachmentKey(file: File) {
		return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
	}

	function syncPendingCreateAttachments() {
		pendingCreateAttachments = Array.from(createTaskAttachmentInput?.files ?? []).map((file) => ({
			id: createAttachmentKey(file),
			name: file.name || 'Attachment',
			sizeBytes: file.size,
			contentType: file.type || 'Unknown type'
		}));
	}

	function replaceCreateAttachmentFiles(files: File[]) {
		if (!createTaskAttachmentInput || typeof DataTransfer === 'undefined') {
			return;
		}

		const transfer = new DataTransfer();

		for (const file of files) {
			transfer.items.add(file);
		}

		createTaskAttachmentInput.files = transfer.files;
		syncPendingCreateAttachments();
	}

	function mergeCreateAttachmentFiles(files: Iterable<File>) {
		const nextFiles = Array.from(createTaskAttachmentInput?.files ?? []);

		for (const file of files) {
			if (file.size === 0) {
				continue;
			}

			const nextFileKey = createAttachmentKey(file);
			const existingIndex = nextFiles.findIndex(
				(existingFile) => createAttachmentKey(existingFile) === nextFileKey
			);

			if (existingIndex >= 0) {
				nextFiles[existingIndex] = file;
				continue;
			}

			nextFiles.push(file);
		}

		replaceCreateAttachmentFiles(nextFiles);
	}

	function clearPendingCreateAttachments() {
		if (createTaskAttachmentInput) {
			createTaskAttachmentInput.value = '';
		}

		pendingCreateAttachments = [];
	}

	function handleCreateTaskAttachmentPaste(event: ClipboardEvent) {
		const pastedFiles = Array.from(event.clipboardData?.items ?? [])
			.filter((item) => item.kind === 'file')
			.map((item) => item.getAsFile())
			.filter((file): file is File => file !== null);

		if (pastedFiles.length === 0) {
			return;
		}

		mergeCreateAttachmentFiles(pastedFiles);
	}

	function matchesTask(task: TaskRow, term: string) {
		const normalizedTerm = term.trim().toLowerCase();

		if (!normalizedTerm) {
			return true;
		}

		return [
			task.title,
			task.summary,
			task.projectName,
			task.workflowName,
			task.assigneeName,
			task.desiredRoleName,
			task.status,
			task.targetDate ?? '',
			formatDateLabel(task.targetDate),
			task.artifactPath,
			task.blockedReason,
			...task.dependencyTaskNames,
			...(task.requiredPromptSkillNames ?? []),
			...(task.requiredCapabilityNames ?? []),
			...(task.requiredToolNames ?? []),
			...task.attachments.map((attachment) => `${attachment.name} ${attachment.path}`),
			task.statusThread?.name ?? '',
			task.statusThread?.threadState ?? task.statusThread?.threadState ?? '',
			task.statusThread
				? formatThreadStateLabel(
						task.statusThread.threadState ?? task.statusThread.threadState ?? 'idle'
					)
				: '',
			...task.freshness.staleSignals
		]
			.join(' ')
			.toLowerCase()
			.includes(normalizedTerm);
	}

	function staleBadgeClass(signal: TaskStaleSignalKey) {
		switch (signal) {
			case 'staleInProgress':
				return 'border-violet-900/70 bg-violet-950/40 text-violet-200';
			case 'noRecentRunActivity':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
			case 'activeThreadNoRecentOutput':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function staleBadgeLabel(task: TaskRow, signal: TaskStaleSignalKey) {
		switch (signal) {
			case 'staleInProgress':
				return `Stale WIP ${task.freshness.taskAgeLabel}`;
			case 'noRecentRunActivity':
				return `Run quiet ${task.freshness.runActivityAgeLabel}`;
			case 'activeThreadNoRecentOutput':
				return `Thread quiet ${task.freshness.threadActivityAgeLabel}`;
			default:
				return '';
		}
	}

	function matchesWorkflow(task: TaskRow) {
		if (selectedWorkflowId === 'all') {
			return true;
		}

		if (selectedWorkflowId === 'none') {
			return !task.workflowId;
		}

		return task.workflowId === selectedWorkflowId;
	}

	function taskNeedsAttention(task: TaskRow) {
		return (
			task.status === 'blocked' ||
			task.status === 'review' ||
			task.hasUnmetDependencies ||
			Boolean(task.openReview) ||
			Boolean(task.pendingApproval) ||
			task.freshness.isStale
		);
	}

	function applyQueuePreset(presetId: TaskQueuePresetId) {
		query = '';
		selectedStatus = 'all';
		selectedWorkflowId = 'all';

		switch (presetId) {
			case 'needsAttention':
				selectedTaskView = 'active';
				selectedSortField = 'targetDate';
				selectedSortDirection = 'asc';
				selectedQueueFocus = 'needsAttention';
				break;
			case 'completed':
				selectedTaskView = 'completed';
				selectedSortField = 'updated';
				selectedSortDirection = 'desc';
				selectedQueueFocus = 'all';
				break;
			case 'open':
			default:
				selectedTaskView = 'active';
				selectedSortField = 'updated';
				selectedSortDirection = 'desc';
				selectedQueueFocus = 'all';
				break;
		}
	}

	function matchesActiveQueuePreset(presetId: TaskQueuePresetId) {
		switch (presetId) {
			case 'needsAttention':
				return (
					!query.trim() &&
					selectedStatus === 'all' &&
					selectedWorkflowId === 'all' &&
					selectedTaskView === 'active' &&
					selectedSortField === 'targetDate' &&
					selectedSortDirection === 'asc' &&
					selectedQueueFocus === 'needsAttention'
				);
			case 'completed':
				return (
					!query.trim() &&
					selectedStatus === 'all' &&
					selectedWorkflowId === 'all' &&
					selectedTaskView === 'completed' &&
					selectedSortField === 'updated' &&
					selectedSortDirection === 'desc' &&
					selectedQueueFocus === 'all'
				);
			case 'open':
			default:
				return (
					!query.trim() &&
					selectedStatus === 'all' &&
					selectedWorkflowId === 'all' &&
					selectedTaskView === 'active' &&
					selectedSortField === 'updated' &&
					selectedSortDirection === 'desc' &&
					selectedQueueFocus === 'all'
				);
		}
	}

	function threadActionLabel(task: TaskRow) {
		return getTaskThreadActionLabel(task);
	}

	function isTaskSelected(taskId: string) {
		return selectedTaskIdSet.has(taskId);
	}

	function getQueueQuickAction(task: TaskRow): TaskQueueQuickAction | null {
		const launchBlocker = getTaskLaunchContractBlockerMessage(
			buildTaskExecutionContractStatus({
				successCriteria: task.successCriteria ?? '',
				readyCondition: task.readyCondition ?? '',
				expectedOutcome: task.expectedOutcome ?? ''
			})
		);
		const projectRoot = projectRootByTaskId.get(task.projectId) ?? '';

		if (
			task.status === 'ready' &&
			!task.hasUnmetDependencies &&
			task.pendingApproval?.mode !== 'before_run' &&
			!launchBlocker &&
			Boolean(projectRoot)
		) {
			return {
				action: 'launchTaskSession',
				label: 'Run task',
				title: 'Queue the task in a work thread from the tasks page.',
				variant: 'success'
			};
		}

		if (
			task.status === 'in_progress' &&
			Boolean(task.latestRun?.agentThreadId) &&
			RECOVERABLE_RUN_STATUSES.has(task.latestRun?.status ?? '') &&
			(task.freshness.noRecentRunActivity || task.freshness.activeThreadNoRecentOutput)
		) {
			return {
				action: 'recoverTaskSession',
				label: 'Recover stalled',
				title: 'Retire the stalled run and queue fresh work.',
				variant: 'warning'
			};
		}

		return null;
	}

	function toggleTaskSelection(taskId: string, checked: boolean) {
		if (checked) {
			selectedTaskIds = isTaskSelected(taskId) ? selectedTaskIds : [...selectedTaskIds, taskId];
			return;
		}

		selectedTaskIds = selectedTaskIds.filter((candidate) => candidate !== taskId);
	}

	function setSelectionForRows(rows: TaskRow[], checked: boolean) {
		const rowIds = rows.map((task) => task.id);
		const rowIdSet = new Set(rowIds);

		if (checked) {
			selectedTaskIds = [...new Set([...selectedTaskIds, ...rowIds])];
			return;
		}

		selectedTaskIds = selectedTaskIds.filter((taskId) => !rowIdSet.has(taskId));
	}

	function areAllRowsSelected(rows: TaskRow[]) {
		return rows.length > 0 && rows.every((task) => isTaskSelected(task.id));
	}

	function clearSelection() {
		selectedTaskIds = [];
	}

	let forceExpandedTree = $derived(
		query.trim().length > 0 ||
			selectedStatus !== 'all' ||
			selectedWorkflowId !== 'all' ||
			selectedQueueFocus !== 'all'
	);

	function parseTargetDateValue(value: string | null | undefined) {
		if (!value) {
			return null;
		}

		const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));

		if (!year || !month || !day) {
			return null;
		}

		return Date.UTC(year, month - 1, day);
	}

	function getPrioritySortValue(priority: TaskRow['priority']) {
		switch (priority) {
			case 'urgent':
				return 4;
			case 'high':
				return 3;
			case 'medium':
				return 2;
			case 'low':
			default:
				return 1;
		}
	}

	function compareTaskRows(left: TaskRow, right: TaskRow) {
		const direction = selectedSortDirection === 'asc' ? 1 : -1;

		switch (selectedSortField) {
			case 'targetDate': {
				const leftValue = parseTargetDateValue(left.targetDate);
				const rightValue = parseTargetDateValue(right.targetDate);

				if (leftValue !== null && rightValue !== null && leftValue !== rightValue) {
					return (leftValue - rightValue) * direction;
				}

				if (leftValue !== rightValue) {
					return leftValue === null ? 1 : -1;
				}

				break;
			}
			case 'priority': {
				const leftValue = getPrioritySortValue(left.priority);
				const rightValue = getPrioritySortValue(right.priority);

				if (leftValue !== rightValue) {
					return (leftValue - rightValue) * direction;
				}

				break;
			}
			case 'updated':
			default: {
				if (left.updatedAt !== right.updatedAt) {
					return left.updatedAt.localeCompare(right.updatedAt) * direction;
				}
				break;
			}
		}

		if (left.updatedAt !== right.updatedAt) {
			return right.updatedAt.localeCompare(left.updatedAt);
		}

		return left.title.localeCompare(right.title);
	}

	function toggleTaskBranch(taskId: string) {
		if (collapsedTaskIds.includes(taskId)) {
			collapsedTaskIds = collapsedTaskIds.filter((candidate) => candidate !== taskId);
			return;
		}

		collapsedTaskIds = [...collapsedTaskIds, taskId];
	}

	function getTargetDateMeta(value: string | null | undefined) {
		const dateValue = parseTargetDateValue(value);
		const label = value ? formatDateLabel(value) : 'No target date';

		if (dateValue === null) {
			return {
				label,
				detail: '',
				toneClass: 'text-white',
				badgeClass: '',
				showBadge: false
			};
		}

		const now = new Date();
		const todayValue = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
		const dayDelta = Math.round((dateValue - todayValue) / (24 * 60 * 60 * 1000));

		if (dayDelta < 0) {
			return {
				label,
				detail:
					Math.abs(dayDelta) === 1 ? 'Overdue by 1 day' : `Overdue by ${Math.abs(dayDelta)} days`,
				toneClass: 'text-rose-200',
				badgeClass: 'border-rose-900/70 bg-rose-950/40 text-rose-200',
				showBadge: true
			};
		}

		if (dayDelta === 0) {
			return {
				label,
				detail: 'Due today',
				toneClass: 'text-amber-200',
				badgeClass: 'border-amber-900/70 bg-amber-950/40 text-amber-200',
				showBadge: true
			};
		}

		return {
			label,
			detail: '',
			toneClass: 'text-white',
			badgeClass: '',
			showBadge: false
		};
	}

	function buildTaskQueueCollection(sourceTasks: TaskRow[]): TaskQueueCollection {
		const taskById = new Map(sourceTasks.map((task) => [task.id, task]));
		const childrenByParentId = new Map<string, TaskRow[]>();

		for (const task of sourceTasks) {
			const parentKey =
				task.parentTaskId && taskById.has(task.parentTaskId)
					? task.parentTaskId
					: ROOT_TASK_PARENT_KEY;
			const siblings = childrenByParentId.get(parentKey) ?? [];
			siblings.push(task);
			childrenByParentId.set(parentKey, siblings);
		}

		for (const siblings of childrenByParentId.values()) {
			siblings.sort(compareTaskRows);
		}

		const directMatchIds = new Set<string>();
		const includedTaskIds = new Set<string>();

		function includeTask(task: TaskRow): boolean {
			const visibleChildren = childrenByParentId.get(task.id) ?? [];
			const hasIncludedDescendant = visibleChildren.some(includeTask);
			const isDirectMatch = matchesTask(task, query);

			if (isDirectMatch) {
				directMatchIds.add(task.id);
			}

			if (isDirectMatch || hasIncludedDescendant) {
				includedTaskIds.add(task.id);
				return true;
			}

			return false;
		}

		for (const rootTask of childrenByParentId.get(ROOT_TASK_PARENT_KEY) ?? []) {
			includeTask(rootTask);
		}

		const rows: TaskQueueRow[] = [];

		function visit(task: TaskRow, depth: number) {
			if (!includedTaskIds.has(task.id)) {
				return;
			}

			const visibleChildren = (childrenByParentId.get(task.id) ?? []).filter((childTask) =>
				includedTaskIds.has(childTask.id)
			);
			const isExpanded = forceExpandedTree || !collapsedTaskIds.includes(task.id);

			rows.push({
				...task,
				depth,
				visibleChildCount: visibleChildren.length,
				isDirectMatch: directMatchIds.has(task.id),
				isContextRow: includedTaskIds.has(task.id) && !directMatchIds.has(task.id),
				isExpanded
			});

			if (isExpanded) {
				for (const childTask of visibleChildren) {
					visit(childTask, depth + 1);
				}
			}
		}

		for (const rootTask of childrenByParentId.get(ROOT_TASK_PARENT_KEY) ?? []) {
			visit(rootTask, 0);
		}

		return {
			rows,
			directMatchCount: directMatchIds.size,
			hiddenCollapsedRowCount: getHiddenCollapsedRowCount({
				matchingRowCount: includedTaskIds.size,
				visibleRowCount: rows.length
			})
		};
	}

	function taskIndentStyle(depth: number) {
		return `padding-left: ${depth * 1.25}rem;`;
	}

	function taskHierarchyLabel(depth: number) {
		if (depth === 0) {
			return 'Task';
		}

		if (depth === 1) {
			return 'Subtask';
		}

		return `Level ${depth + 1}`;
	}

	function threadStateToneClass(state: string | null | undefined) {
		switch (state ?? 'idle') {
			case 'working':
				return 'border-violet-800/70 bg-violet-950/40 text-violet-200';
			case 'starting':
			case 'waiting':
				return 'border-sky-800/70 bg-sky-950/40 text-sky-200';
			case 'ready':
				return 'border-emerald-800/70 bg-emerald-950/40 text-emerald-200';
			case 'attention':
			case 'unavailable':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
			case 'idle':
			default:
				return 'border-slate-700 bg-slate-900/80 text-slate-300';
		}
	}

	let taskCollections = $derived.by(() => {
		const filteredTasks: TaskRow[] = [];

		for (const task of tasks) {
			if (selectedStatus !== 'all' && task.status !== selectedStatus) {
				continue;
			}

			if (!matchesWorkflow(task)) {
				continue;
			}

			if (selectedQueueFocus === 'needsAttention' && !taskNeedsAttention(task)) {
				continue;
			}

			filteredTasks.push(task);
		}

		const activeTasks = filteredTasks.filter((task) => task.status !== 'done');
		const completedTasks = filteredTasks.filter((task) => task.status === 'done');
		const activeCollection = buildTaskQueueCollection(activeTasks);
		const completedCollection = buildTaskQueueCollection(completedTasks);

		return {
			filteredTasks,
			activeTasks,
			completedTasks,
			activeTaskRows: activeCollection.rows,
			completedTaskRows: completedCollection.rows,
			activeDirectMatchCount: activeCollection.directMatchCount,
			completedDirectMatchCount: completedCollection.directMatchCount,
			activeHiddenCollapsedRowCount: activeCollection.hiddenCollapsedRowCount,
			completedHiddenCollapsedRowCount: completedCollection.hiddenCollapsedRowCount,
			visibleTaskRows:
				selectedTaskView === 'completed' ? completedCollection.rows : activeCollection.rows
		};
	});
	let activeTasks = $derived(taskCollections.activeTasks);
	let completedTasks = $derived(taskCollections.completedTasks);
	let visibleTaskRows = $derived(taskCollections.visibleTaskRows);
	let hiddenCollapsedTaskRowCount = $derived(
		selectedTaskView === 'completed'
			? taskCollections.completedHiddenCollapsedRowCount
			: taskCollections.activeHiddenCollapsedRowCount
	);
	let workflowFilterOptions = $derived.by(() => {
		const workflowCounts = new Map<string, { id: string; name: string; count: number }>();
		let withoutWorkflowCount = 0;

		for (const task of tasks) {
			if (!task.workflowId) {
				withoutWorkflowCount += 1;
				continue;
			}

			const existing = workflowCounts.get(task.workflowId);

			if (existing) {
				existing.count += 1;
				continue;
			}

			workflowCounts.set(task.workflowId, {
				id: task.workflowId,
				name: task.workflowName || 'Unknown workflow',
				count: 1
			});
		}

		return {
			workflows: [...workflowCounts.values()].sort((left, right) =>
				left.name.localeCompare(right.name)
			),
			withoutWorkflowCount
		};
	});
	let queuePresetCounts = $derived.by(() => ({
		open: tasks.filter((task) => task.status !== 'done').length,
		needsAttention: tasks.filter((task) => task.status !== 'done' && taskNeedsAttention(task))
			.length,
		completed: tasks.filter((task) => task.status === 'done').length
	}));
	let activeQueuePresetId = $derived.by(() => {
		if (matchesActiveQueuePreset('needsAttention')) {
			return 'needsAttention';
		}

		if (matchesActiveQueuePreset('completed')) {
			return 'completed';
		}

		if (matchesActiveQueuePreset('open')) {
			return 'open';
		}

		return null;
	});
	let hiddenTaskViewNotice = $derived(
		getHiddenTaskViewNotice({
			selectedTaskView,
			visibleTaskCount:
				selectedTaskView === 'completed'
					? taskCollections.completedDirectMatchCount
					: taskCollections.activeDirectMatchCount,
			activeCount: taskCollections.activeDirectMatchCount,
			completedCount: taskCollections.completedDirectMatchCount
		})
	);
	let previewTask = $derived.by(
		() =>
			visibleTaskRows.find((task) => task.id === selectedPreviewTaskId) ??
			visibleTaskRows[0] ??
			null
	);
	let visibleTaskRowIdSet = $derived(new Set(visibleTaskRows.map((task) => task.id)));
	let queuePanelTask = $derived.by(() => {
		const rowTaskId = queueDetailPanel?.rowTaskId ?? null;
		return rowTaskId ? (tasks.find((task) => task.id === rowTaskId) ?? null) : null;
	});
	let activePanelRowTaskId = $derived(queueDetailPanel?.rowTaskId ?? '');
	let isTaskDetailPanelLoading = $derived(
		queueDetailPanel?.kind === 'task' && taskDetailPanelLoadingTaskId === queueDetailPanel.detailId
	);
	let isThreadDetailPanelLoading = $derived(
		queueDetailPanel?.kind === 'thread' &&
			threadDetailPanelLoadingThreadId === queueDetailPanel.detailId
	);

	$effect(() => {
		const panel = queueDetailPanel;

		if (!panel || panel.kind !== 'task') {
			taskDetailPanelData = null;
			taskDetailPanelLoadError = null;
			return;
		}

		taskDetailPanelData = taskDetailPanelCache[panel.detailId] ?? null;
		taskDetailPanelLoadError = null;

		if (!taskDetailPanelData) {
			void loadTaskDetailPanel(panel.detailId);
		}
	});

	$effect(() => {
		const panel = queueDetailPanel;

		if (!panel || panel.kind !== 'thread') {
			threadDetailPanelData = null;
			threadDetailPanelLoadError = null;
			return;
		}

		threadDetailPanelData = threadDetailPanelCache[panel.detailId] ?? null;
		threadDetailPanelLoadError = null;

		if (!threadDetailPanelData) {
			void loadThreadDetailPanel(panel.detailId);
		}
	});

	$effect(() => {
		const nextSelectedTaskIds = selectedTaskIds.filter((taskId) => visibleTaskRowIdSet.has(taskId));

		if (
			nextSelectedTaskIds.length === selectedTaskIds.length &&
			nextSelectedTaskIds.every((taskId, index) => taskId === selectedTaskIds[index])
		) {
			return;
		}

		selectedTaskIds = nextSelectedTaskIds;
	});

	$effect(() => {
		if (!previewTask) {
			if (selectedPreviewTaskId) {
				selectedPreviewTaskId = '';
			}

			return;
		}

		if (selectedPreviewTaskId !== previewTask.id) {
			selectedPreviewTaskId = previewTask.id;
		}
	});

	let createTaskFormValues = $derived(
		form?.formContext === 'taskCreate'
			? {
					projectId: form.projectId?.toString() ?? '',
					parentTaskId: form.parentTaskId?.toString() ?? '',
					delegationObjective: form.delegationObjective?.toString() ?? '',
					delegationInputContext: form.delegationInputContext?.toString() ?? '',
					delegationExpectedDeliverable: form.delegationExpectedDeliverable?.toString() ?? '',
					delegationDoneCondition: form.delegationDoneCondition?.toString() ?? '',
					delegationIntegrationNotes: form.delegationIntegrationNotes?.toString() ?? '',
					name: form.name?.toString() ?? '',
					instructions: form.instructions?.toString() ?? '',
					successCriteria: form.successCriteria?.toString() ?? '',
					readyCondition: form.readyCondition?.toString() ?? '',
					expectedOutcome: form.expectedOutcome?.toString() ?? '',
					assigneeExecutionSurfaceId: form.assigneeExecutionSurfaceId?.toString() ?? '',
					targetDate: form.targetDate?.toString() ?? '',
					goalId: form.goalId?.toString() ?? '',
					taskTemplateId: form.taskTemplateId?.toString() ?? '',
					workflowId: form.workflowId?.toString() ?? '',
					area: ('area' in form ? form.area?.toString() : undefined) ?? 'product',
					priority: form.priority?.toString() ?? 'medium',
					riskLevel: form.riskLevel?.toString() ?? 'medium',
					approvalMode: form.approvalMode?.toString() ?? 'none',
					requiredThreadSandbox: form.requiredThreadSandbox?.toString() ?? '',
					requiresReview: form.requiresReview?.toString() !== 'false',
					desiredRoleId: form.desiredRoleId?.toString() ?? '',
					blockedReason: form.blockedReason?.toString() ?? '',
					dependencyTaskIds:
						Array.isArray(form.dependencyTaskIds) &&
						form.dependencyTaskIds.every((value) => typeof value === 'string')
							? form.dependencyTaskIds
							: [],
					requiredPromptSkillNames:
						Array.isArray(form.requiredPromptSkillNames) &&
						form.requiredPromptSkillNames.every((value) => typeof value === 'string')
							? form.requiredPromptSkillNames.join(', ')
							: '',
					requiredCapabilityNames:
						Array.isArray(form.requiredCapabilityNames) &&
						form.requiredCapabilityNames.every((value) => typeof value === 'string')
							? form.requiredCapabilityNames.join(', ')
							: '',
					requiredToolNames:
						Array.isArray(form.requiredToolNames) &&
						form.requiredToolNames.every((value) => typeof value === 'string')
							? form.requiredToolNames.join(', ')
							: '',
					submitMode: form.submitMode?.toString() === 'createAndRun' ? 'createAndRun' : 'create'
				}
			: {
					projectId: '',
					parentTaskId: '',
					delegationObjective: '',
					delegationInputContext: '',
					delegationExpectedDeliverable: '',
					delegationDoneCondition: '',
					delegationIntegrationNotes: '',
					name: '',
					instructions: '',
					successCriteria: '',
					readyCondition: '',
					expectedOutcome: '',
					assigneeExecutionSurfaceId: '',
					targetDate: '',
					goalId: '',
					taskTemplateId: '',
					workflowId: '',
					area: 'product',
					priority: 'medium',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiredThreadSandbox: '',
					requiresReview: true,
					desiredRoleId: '',
					blockedReason: '',
					dependencyTaskIds: [],
					requiredPromptSkillNames: '',
					requiredCapabilityNames: '',
					requiredToolNames: '',
					submitMode: 'create'
				}
	);
	let createTaskProjectId = $state('');
	let createTaskParentTaskId = $state('');
	let createTaskDelegationObjective = $state('');
	let createTaskDelegationInputContext = $state('');
	let createTaskDelegationExpectedDeliverable = $state('');
	let createTaskDelegationDoneCondition = $state('');
	let createTaskDelegationIntegrationNotes = $state('');
	let createTaskName = $state('');
	let createTaskInstructions = $state('');
	let createTaskSuccessCriteria = $state('');
	let createTaskReadyCondition = $state('');
	let createTaskExpectedOutcome = $state('');
	let createTaskAssigneeExecutionSurfaceId = $state('');
	let createTaskTargetDate = $state('');
	let createTaskGoalId = $state('');
	let createTaskTemplateId = $state('');
	let createTaskWorkflowId = $state('');
	let createTaskArea = $state('product');
	let createTaskPriority = $state('medium');
	let createTaskRiskLevel = $state('medium');
	let createTaskApprovalMode = $state('none');
	let createTaskRequiredThreadSandbox = $state<'' | AgentSandbox>('');
	let createTaskRequiresReview = $state(true);
	let createTaskDesiredRoleId = $state('');
	let createTaskBlockedReason = $state('');
	let createTaskDependencyTaskIds = $state.raw<string[]>([]);
	let createTaskRequiredPromptSkillNames = $state('');
	let createTaskRequiredCapabilityNames = $state('');
	let createTaskRequiredToolNames = $state('');
	let saveTaskTemplateName = $state('');
	let saveTaskTemplateSummary = $state('');
	let selectedProjectSkillSummary = $derived(
		data.projectSkillSummaries.find((summary) => summary.projectId === createTaskProjectId) ?? null
	);
	let availableTaskTemplates = $derived(data.taskTemplates);
	let selectedCreateTaskTemplate = $derived(
		data.taskTemplates.find((taskTemplate) => taskTemplate.id === createTaskTemplateId) ?? null
	);
	let availableCreateTaskWorkflows = $derived(data.workflows);
	let selectedCreateWorkflow = $derived(
		data.workflows.find((workflow) => workflow.id === createTaskWorkflowId) ?? null
	);
	let createTaskUsesWorkflowTemplate = $derived(Boolean(selectedCreateWorkflow));
	let selectedProjectInstalledSkillNames = $derived(
		selectedProjectSkillSummary?.installedSkills.map((skill) => skill.id) ?? []
	);
	let createTaskParentTask = $derived(
		tasks.find((task) => task.id === createTaskParentTaskId) ?? null
	);
	let createTaskHasDelegationPacket = $derived(
		Boolean(
			createTaskDelegationObjective.trim() ||
			createTaskDelegationInputContext.trim() ||
			createTaskDelegationExpectedDeliverable.trim() ||
			createTaskDelegationDoneCondition.trim() ||
			createTaskDelegationIntegrationNotes.trim()
		)
	);
	let createTaskDependencyCount = $derived(createTaskDependencyTaskIds.length);
	let createTaskSelectedDependencies = $derived(
		createTaskDependencyTaskIds.flatMap((dependencyTaskId) => {
			const dependency =
				data.availableDependencyTasks.find((candidate) => candidate.id === dependencyTaskId) ??
				null;
			return dependency ? [dependency] : [];
		})
	);
	let createTaskDependencySearchLabel = $derived(
		createTaskDependencyQuery.trim() ? 'Matching tasks' : 'Suggested dependencies'
	);
	let createTaskDependencySearchResults = $derived.by(() => {
		const normalizedQuery = createTaskDependencyQuery.trim().toLowerCase();
		const selectedIdSet = new Set(createTaskDependencyTaskIds);
		const orderedDependencies = [...data.availableDependencyTasks].sort((left, right) => {
			const leftProjectMatch = left.projectId === createTaskProjectId ? 0 : 1;
			const rightProjectMatch = right.projectId === createTaskProjectId ? 0 : 1;

			if (leftProjectMatch !== rightProjectMatch) {
				return leftProjectMatch - rightProjectMatch;
			}

			const projectComparison = left.projectName.localeCompare(right.projectName);
			return projectComparison !== 0 ? projectComparison : left.title.localeCompare(right.title);
		});
		const filteredDependencies = orderedDependencies.filter((dependency) => {
			if (selectedIdSet.has(dependency.id)) {
				return false;
			}

			if (!normalizedQuery) {
				return true;
			}

			const haystack = [
				dependency.title,
				dependency.projectName,
				formatTaskStatusLabel(dependency.status)
			]
				.join(' ')
				.toLowerCase();

			return haystack.includes(normalizedQuery);
		});

		return filteredDependencies.slice(0, normalizedQuery ? 10 : 6);
	});
	let createTaskDependencySearchOverflowCount = $derived.by(() => {
		const normalizedQuery = createTaskDependencyQuery.trim().toLowerCase();
		const selectedIdSet = new Set(createTaskDependencyTaskIds);
		const matchCount = data.availableDependencyTasks.filter((dependency) => {
			if (selectedIdSet.has(dependency.id)) {
				return false;
			}

			if (!normalizedQuery) {
				return true;
			}

			const haystack = [
				dependency.title,
				dependency.projectName,
				formatTaskStatusLabel(dependency.status)
			]
				.join(' ')
				.toLowerCase();

			return haystack.includes(normalizedQuery);
		}).length;

		return Math.max(0, matchCount - createTaskDependencySearchResults.length);
	});
	let createTaskDesiredRoleName = $derived(
		data.roles.find((role) => role.id === createTaskDesiredRoleId)?.name ?? createTaskDesiredRoleId
	);
	let createTaskSelectedGoal = $derived(
		data.goals.find((goal) => goal.id === createTaskGoalId) ?? null
	);
	let createTaskSelectedExecutionSurface = $derived(
		data.executionSurfaces.find(
			(executionSurface) => executionSurface.id === createTaskAssigneeExecutionSurfaceId
		) ?? null
	);
	let createTaskUnknownCapabilityNames = $derived(
		findUnknownExecutionRequirementNames(
			createTaskRequiredCapabilityNames,
			data.executionRequirementInventory.capabilityNames
		)
	);
	let createTaskUnknownPromptSkillNames = $derived(
		findUnknownExecutionRequirementNames(
			createTaskRequiredPromptSkillNames,
			selectedProjectInstalledSkillNames
		)
	);
	let createTaskUnknownToolNames = $derived(
		findUnknownExecutionRequirementNames(
			createTaskRequiredToolNames,
			data.executionRequirementInventory.toolNames
		)
	);
	let createTaskAdvancedSummary = $derived.by(() => {
		const parts: string[] = [];

		if (createTaskPriority !== 'medium') {
			parts.push(`${formatPriorityLabel(createTaskPriority)} priority`);
		}

		if (createTaskRiskLevel !== 'medium') {
			parts.push(`${formatTaskRiskLevelLabel(createTaskRiskLevel)} risk`);
		}

		if (createTaskApprovalMode !== 'none') {
			parts.push(formatTaskApprovalModeLabel(createTaskApprovalMode));
		}

		if (createTaskRequiredThreadSandbox) {
			parts.push(`Sandbox ${formatAgentSandboxLabel(createTaskRequiredThreadSandbox)}`);
		}

		if (!createTaskRequiresReview) {
			parts.push('Review optional');
		}

		if (createTaskDesiredRoleId) {
			parts.push(`Role ${createTaskDesiredRoleName}`);
		}

		if (createTaskBlockedReason) {
			parts.push('Blocker recorded');
		}

		if (createTaskSuccessCriteria.trim()) {
			parts.push('Success criteria set');
		}

		if (createTaskReadyCondition.trim()) {
			parts.push('Ready condition set');
		}

		if (createTaskExpectedOutcome.trim()) {
			parts.push('Expected outcome set');
		}

		if (createTaskRequiredPromptSkillNames.trim()) {
			parts.push('Prompt skills requested');
		}

		if (createTaskHasDelegationPacket) {
			parts.push('Delegation packet set');
		}

		if (createTaskDependencyCount > 0) {
			parts.push(
				createTaskDependencyCount === 1
					? '1 dependency selected'
					: `${createTaskDependencyCount} dependencies selected`
			);
		}

		return parts.length > 0
			? parts.join(' · ')
			: 'Defaults stay lightweight: medium priority, medium risk, no approval, review required.';
	});
	let createTaskExecutionContract = $derived(
		buildTaskExecutionContractStatus({
			successCriteria: createTaskSuccessCriteria,
			readyCondition: createTaskReadyCondition,
			expectedOutcome: createTaskExpectedOutcome
		})
	);
	let createTaskLaunchContractBlocker = $derived(
		getTaskLaunchContractBlockerMessage(createTaskExecutionContract)
	);
	let createTaskReviewContractGap = $derived(
		getTaskReviewContractGapMessage(createTaskExecutionContract)
	);
	let createTaskFullFlowSummary = $derived.by(() => {
		const parts: string[] = [];

		if (selectedCreateTaskTemplate) {
			parts.push(`Template ${selectedCreateTaskTemplate.name}`);
		}

		if (createTaskSelectedGoal) {
			parts.push(`Goal ${createTaskSelectedGoal.label}`);
		}

		if (selectedCreateWorkflow) {
			parts.push(`Workflow ${selectedCreateWorkflow.name}`);
		}

		if (createTaskTargetDate) {
			parts.push(`Target ${formatDateLabel(createTaskTargetDate)}`);
		}

		if (createTaskSelectedExecutionSurface) {
			parts.push(`Assigned to ${createTaskSelectedExecutionSurface.name}`);
		}

		if (createTaskRequiredPromptSkillNames.trim()) {
			parts.push('Prompt skills requested');
		}

		if (createTaskRequiredCapabilityNames.trim()) {
			parts.push('Capabilities set');
		}

		if (createTaskRequiredToolNames.trim()) {
			parts.push('Tools set');
		}

		if (
			shouldOpenCreateTaskAdvancedIntake({
				successCriteria: createTaskSuccessCriteria,
				readyCondition: createTaskReadyCondition,
				expectedOutcome: createTaskExpectedOutcome,
				priority: createTaskPriority,
				riskLevel: createTaskRiskLevel,
				approvalMode: createTaskApprovalMode,
				requiredThreadSandbox: createTaskRequiredThreadSandbox,
				requiresReview: createTaskRequiresReview,
				desiredRoleId: createTaskDesiredRoleId,
				blockedReason: createTaskBlockedReason,
				dependencyTaskIds: createTaskDependencyTaskIds
			})
		) {
			parts.push('Routing and governance configured');
		}

		return parts.join(' · ');
	});

	function shouldOpenCreateTaskAdvancedIntake(input: {
		successCriteria?: string;
		readyCondition?: string;
		expectedOutcome?: string;
		priority?: string;
		riskLevel?: string;
		approvalMode?: string;
		requiredThreadSandbox?: string;
		requiresReview?: boolean;
		desiredRoleId?: string;
		blockedReason?: string;
		dependencyTaskIds?: string[];
	}) {
		return (
			Boolean(input.successCriteria?.trim()) ||
			Boolean(input.readyCondition?.trim()) ||
			Boolean(input.expectedOutcome?.trim()) ||
			(input.priority ?? 'medium') !== 'medium' ||
			(input.riskLevel ?? 'medium') !== 'medium' ||
			(input.approvalMode ?? 'none') !== 'none' ||
			Boolean(input.requiredThreadSandbox) ||
			(input.requiresReview ?? true) !== true ||
			Boolean(input.desiredRoleId) ||
			Boolean(input.blockedReason?.trim()) ||
			(input.dependencyTaskIds?.length ?? 0) > 0
		);
	}

	function syncCreateTaskAdvancedOpen(
		input: Parameters<typeof shouldOpenCreateTaskAdvancedIntake>[0]
	) {
		createTaskAdvancedOpen = shouldOpenCreateTaskAdvancedIntake(input);
	}

	function shouldUseFullCreateFlow(input: {
		parentTaskId?: string;
		taskTemplateId?: string;
		goalId?: string;
		workflowId?: string;
		assigneeExecutionSurfaceId?: string;
		targetDate?: string;
		requiredPromptSkillNames?: string;
		requiredCapabilityNames?: string;
		requiredToolNames?: string;
		successCriteria?: string;
		readyCondition?: string;
		expectedOutcome?: string;
		priority?: string;
		riskLevel?: string;
		approvalMode?: string;
		requiredThreadSandbox?: string;
		requiresReview?: boolean;
		desiredRoleId?: string;
		blockedReason?: string;
		dependencyTaskIds?: string[];
	}) {
		return (
			Boolean(input.parentTaskId?.trim()) ||
			Boolean(input.taskTemplateId?.trim()) ||
			Boolean(input.goalId?.trim()) ||
			Boolean(input.workflowId?.trim()) ||
			Boolean(input.assigneeExecutionSurfaceId?.trim()) ||
			Boolean(input.targetDate?.trim()) ||
			Boolean(input.requiredPromptSkillNames?.trim()) ||
			Boolean(input.requiredCapabilityNames?.trim()) ||
			Boolean(input.requiredToolNames?.trim()) ||
			shouldOpenCreateTaskAdvancedIntake(input)
		);
	}

	function syncCreateTaskFlowMode(input: Parameters<typeof shouldUseFullCreateFlow>[0]) {
		createTaskFlowMode = shouldUseFullCreateFlow(input) ? 'full' : 'quick';
	}

	function applyCreateTaskTemplateById(taskTemplateId: string) {
		const taskTemplate =
			data.taskTemplates.find((candidateTemplate) => candidateTemplate.id === taskTemplateId) ??
			null;

		createTaskTemplateId = taskTemplateId;

		if (!taskTemplate) {
			return;
		}

		createTaskProjectId = taskTemplate.projectId;
		createTaskName = taskTemplate.taskTitle;
		createTaskInstructions = taskTemplate.taskSummary;
		createTaskSuccessCriteria = taskTemplate.successCriteria;
		createTaskReadyCondition = taskTemplate.readyCondition;
		createTaskExpectedOutcome = taskTemplate.expectedOutcome;
		createTaskAssigneeExecutionSurfaceId = taskTemplate.assigneeExecutionSurfaceId ?? '';
		createTaskGoalId = taskTemplate.goalId ?? '';
		createTaskWorkflowId = createTaskParentTaskId ? '' : (taskTemplate.workflowId ?? '');
		createTaskArea = taskTemplate.area;
		createTaskPriority = taskTemplate.priority;
		createTaskRiskLevel = taskTemplate.riskLevel;
		createTaskApprovalMode = taskTemplate.approvalMode;
		createTaskRequiredThreadSandbox = normalizeSandboxValue(taskTemplate.requiredThreadSandbox);
		createTaskRequiresReview = taskTemplate.requiresReview;
		createTaskDesiredRoleId = taskTemplate.desiredRoleId;
		createTaskRequiredPromptSkillNames = taskTemplate.requiredPromptSkillNames.join(', ');
		createTaskRequiredCapabilityNames = taskTemplate.requiredCapabilityNames.join(', ');
		createTaskRequiredToolNames = taskTemplate.requiredToolNames.join(', ');
		createTaskDependencyQuery = '';
		createTaskFlowMode = 'full';
		syncCreateTaskAdvancedOpen({
			successCriteria: taskTemplate.successCriteria,
			readyCondition: taskTemplate.readyCondition,
			expectedOutcome: taskTemplate.expectedOutcome,
			priority: taskTemplate.priority,
			riskLevel: taskTemplate.riskLevel,
			approvalMode: taskTemplate.approvalMode,
			requiredThreadSandbox: taskTemplate.requiredThreadSandbox ?? '',
			requiresReview: taskTemplate.requiresReview,
			desiredRoleId: taskTemplate.desiredRoleId
		});
	}

	function openSaveTaskTemplateDialogForCreate() {
		saveTaskTemplateName = createTaskName.trim() || 'New task template';
		saveTaskTemplateSummary = '';
		isSaveTaskTemplateDialogOpen = true;
	}

	function toggleCreateTaskDependency(taskId: string, checked: boolean) {
		createTaskDependencyTaskIds = checked
			? [...new Set([...createTaskDependencyTaskIds, taskId])]
			: createTaskDependencyTaskIds.filter((candidateId) => candidateId !== taskId);
	}

	function removeCreateTaskDependency(taskId: string) {
		toggleCreateTaskDependency(taskId, false);
	}

	function scrollCreateTaskSectionIntoView(sectionId: string) {
		document.getElementById(sectionId)?.scrollIntoView({
			block: 'start',
			behavior: 'smooth'
		});
	}

	function openCreateTaskDialog(mode: CreateTaskFlowMode) {
		resetCreateTaskMetadata();
		createTaskFlowMode = mode;
		isCreateModalOpen = true;
	}

	function hasCreateTaskDraftContent(
		draft:
			| {
					projectId?: string;
					parentTaskId?: string;
					delegationObjective?: string;
					delegationInputContext?: string;
					delegationExpectedDeliverable?: string;
					delegationDoneCondition?: string;
					delegationIntegrationNotes?: string;
					name?: string;
					instructions?: string;
					successCriteria?: string;
					readyCondition?: string;
					expectedOutcome?: string;
					assigneeExecutionSurfaceId?: string;
					targetDate?: string;
					goalId?: string;
					taskTemplateId?: string;
					workflowId?: string;
					area?: string;
					priority?: string;
					riskLevel?: string;
					approvalMode?: string;
					requiredThreadSandbox?: string;
					requiresReview?: boolean;
					desiredRoleId?: string;
					blockedReason?: string;
					dependencyTaskIds?: string[];
					requiredPromptSkillNames?: string;
					requiredCapabilityNames?: string;
					requiredToolNames?: string;
			  }
			| null
			| undefined
	) {
		if (!draft) {
			return false;
		}

		return (
			Boolean(draft.projectId?.trim()) ||
			Boolean(draft.parentTaskId?.trim()) ||
			Boolean(draft.delegationObjective?.trim()) ||
			Boolean(draft.delegationInputContext?.trim()) ||
			Boolean(draft.delegationExpectedDeliverable?.trim()) ||
			Boolean(draft.delegationDoneCondition?.trim()) ||
			Boolean(draft.delegationIntegrationNotes?.trim()) ||
			Boolean(draft.name?.trim()) ||
			Boolean(draft.instructions?.trim()) ||
			Boolean(draft.successCriteria?.trim()) ||
			Boolean(draft.readyCondition?.trim()) ||
			Boolean(draft.expectedOutcome?.trim()) ||
			Boolean(draft.assigneeExecutionSurfaceId?.trim()) ||
			Boolean(draft.targetDate?.trim()) ||
			Boolean(draft.goalId?.trim()) ||
			Boolean(draft.taskTemplateId?.trim()) ||
			Boolean(draft.workflowId?.trim()) ||
			Boolean(draft.requiredPromptSkillNames?.trim()) ||
			Boolean(draft.requiredCapabilityNames?.trim()) ||
			Boolean(draft.requiredToolNames?.trim()) ||
			shouldOpenCreateTaskAdvancedIntake({
				priority: draft.priority,
				riskLevel: draft.riskLevel,
				approvalMode: draft.approvalMode,
				requiredThreadSandbox: draft.requiredThreadSandbox,
				requiresReview: draft.requiresReview,
				desiredRoleId: draft.desiredRoleId,
				blockedReason: draft.blockedReason,
				dependencyTaskIds: draft.dependencyTaskIds
			})
		);
	}

	function applyCreateTaskPrefill(
		prefill: NonNullable<typeof data.createTaskPrefill> | null | undefined
	) {
		createTaskProjectId = prefill?.projectId ?? '';
		createTaskParentTaskId = prefill?.parentTaskId ?? '';
		createTaskDelegationObjective = prefill?.delegationObjective ?? '';
		createTaskDelegationInputContext = prefill?.delegationInputContext ?? '';
		createTaskDelegationExpectedDeliverable = prefill?.delegationExpectedDeliverable ?? '';
		createTaskDelegationDoneCondition = prefill?.delegationDoneCondition ?? '';
		createTaskDelegationIntegrationNotes = prefill?.delegationIntegrationNotes ?? '';
		createTaskName = prefill?.name ?? '';
		createTaskInstructions = prefill?.instructions ?? '';
		createTaskSuccessCriteria = prefill?.successCriteria ?? '';
		createTaskReadyCondition = prefill?.readyCondition ?? '';
		createTaskExpectedOutcome = prefill?.expectedOutcome ?? '';
		createTaskAssigneeExecutionSurfaceId = prefill?.assigneeExecutionSurfaceId ?? '';
		createTaskTargetDate = prefill?.targetDate ?? '';
		createTaskGoalId = prefill?.goalId ?? '';
		createTaskTemplateId = '';
		createTaskWorkflowId = prefill?.workflowId ?? '';
		createTaskArea = (prefill as { area?: string } | null | undefined)?.area ?? 'product';
		createTaskPriority = prefill?.priority ?? 'medium';
		createTaskRiskLevel = prefill?.riskLevel ?? 'medium';
		createTaskApprovalMode = prefill?.approvalMode ?? 'none';
		createTaskRequiredThreadSandbox = normalizeSandboxValue(prefill?.requiredThreadSandbox);
		createTaskRequiresReview = prefill?.requiresReview ?? true;
		createTaskDesiredRoleId = prefill?.desiredRoleId ?? '';
		createTaskBlockedReason = prefill?.blockedReason ?? '';
		createTaskDependencyTaskIds = prefill?.dependencyTaskIds ?? [];
		createTaskRequiredPromptSkillNames = prefill?.requiredPromptSkillNames ?? '';
		createTaskRequiredCapabilityNames = prefill?.requiredCapabilityNames ?? '';
		createTaskRequiredToolNames = prefill?.requiredToolNames ?? '';
		createTaskDependencyQuery = '';
		syncCreateTaskAdvancedOpen({
			successCriteria: createTaskSuccessCriteria,
			readyCondition: createTaskReadyCondition,
			expectedOutcome: createTaskExpectedOutcome,
			priority: createTaskPriority,
			riskLevel: createTaskRiskLevel,
			approvalMode: createTaskApprovalMode,
			requiredThreadSandbox: createTaskRequiredThreadSandbox,
			requiresReview: createTaskRequiresReview,
			desiredRoleId: createTaskDesiredRoleId,
			blockedReason: createTaskBlockedReason,
			dependencyTaskIds: createTaskDependencyTaskIds
		});
		syncCreateTaskFlowMode({
			parentTaskId: createTaskParentTaskId,
			goalId: createTaskGoalId,
			workflowId: createTaskWorkflowId,
			assigneeExecutionSurfaceId: createTaskAssigneeExecutionSurfaceId,
			targetDate: createTaskTargetDate,
			requiredPromptSkillNames: createTaskRequiredPromptSkillNames,
			requiredCapabilityNames: createTaskRequiredCapabilityNames,
			requiredToolNames: createTaskRequiredToolNames,
			successCriteria: createTaskSuccessCriteria,
			readyCondition: createTaskReadyCondition,
			expectedOutcome: createTaskExpectedOutcome,
			priority: createTaskPriority,
			riskLevel: createTaskRiskLevel,
			approvalMode: createTaskApprovalMode,
			requiredThreadSandbox: createTaskRequiredThreadSandbox,
			requiresReview: createTaskRequiresReview,
			desiredRoleId: createTaskDesiredRoleId,
			blockedReason: createTaskBlockedReason,
			dependencyTaskIds: createTaskDependencyTaskIds
		});
	}

	function resetCreateTaskMetadata() {
		createTaskParentTaskId = '';
		createTaskDelegationObjective = '';
		createTaskDelegationInputContext = '';
		createTaskDelegationExpectedDeliverable = '';
		createTaskDelegationDoneCondition = '';
		createTaskDelegationIntegrationNotes = '';
		createTaskGoalId = '';
		createTaskTemplateId = '';
		createTaskWorkflowId = '';
		createTaskArea = 'product';
		createTaskSuccessCriteria = '';
		createTaskReadyCondition = '';
		createTaskExpectedOutcome = '';
		createTaskPriority = 'medium';
		createTaskRiskLevel = 'medium';
		createTaskApprovalMode = 'none';
		createTaskRequiredThreadSandbox = '';
		createTaskRequiresReview = true;
		createTaskDesiredRoleId = '';
		createTaskBlockedReason = '';
		createTaskDependencyTaskIds = [];
		createTaskRequiredPromptSkillNames = '';
		createTaskRequiredCapabilityNames = '';
		createTaskRequiredToolNames = '';
		createTaskDependencyQuery = '';
		createTaskAdvancedOpen = false;
		createTaskFlowMode = 'quick';
	}

	$effect(() => {
		if (form?.formContext === 'taskCreate') {
			createTaskProjectId = createTaskFormValues.projectId;
			createTaskParentTaskId = createTaskFormValues.parentTaskId;
			createTaskDelegationObjective = createTaskFormValues.delegationObjective;
			createTaskDelegationInputContext = createTaskFormValues.delegationInputContext;
			createTaskDelegationExpectedDeliverable = createTaskFormValues.delegationExpectedDeliverable;
			createTaskDelegationDoneCondition = createTaskFormValues.delegationDoneCondition;
			createTaskDelegationIntegrationNotes = createTaskFormValues.delegationIntegrationNotes;
			createTaskName = createTaskFormValues.name;
			createTaskInstructions = createTaskFormValues.instructions;
			createTaskSuccessCriteria = createTaskFormValues.successCriteria;
			createTaskReadyCondition = createTaskFormValues.readyCondition;
			createTaskExpectedOutcome = createTaskFormValues.expectedOutcome;
			createTaskAssigneeExecutionSurfaceId = createTaskFormValues.assigneeExecutionSurfaceId;
			createTaskTargetDate = createTaskFormValues.targetDate;
			createTaskGoalId = createTaskFormValues.goalId;
			createTaskWorkflowId = createTaskFormValues.workflowId;
			createTaskArea = createTaskFormValues.area;
			createTaskPriority = createTaskFormValues.priority;
			createTaskRiskLevel = createTaskFormValues.riskLevel;
			createTaskApprovalMode = createTaskFormValues.approvalMode;
			createTaskRequiredThreadSandbox = normalizeSandboxValue(
				createTaskFormValues.requiredThreadSandbox
			);
			createTaskRequiresReview = createTaskFormValues.requiresReview;
			createTaskDesiredRoleId = createTaskFormValues.desiredRoleId;
			createTaskBlockedReason = createTaskFormValues.blockedReason;
			createTaskDependencyTaskIds = createTaskFormValues.dependencyTaskIds;
			createTaskRequiredPromptSkillNames = createTaskFormValues.requiredPromptSkillNames;
			createTaskRequiredCapabilityNames = createTaskFormValues.requiredCapabilityNames;
			createTaskRequiredToolNames = createTaskFormValues.requiredToolNames;
			syncCreateTaskAdvancedOpen(createTaskFormValues);
			syncCreateTaskFlowMode(createTaskFormValues);
			return;
		}

		if (createTaskDraftReady && !createTaskProjectId && data.projects.length === 1) {
			createTaskProjectId = data.projects[0]?.id ?? '';
		}
	});

	$effect(() => {
		if (!createTaskWorkflowId) {
			return;
		}

		if (!availableCreateTaskWorkflows.some((workflow) => workflow.id === createTaskWorkflowId)) {
			createTaskWorkflowId = '';
		}
	});

	$effect(() => {
		if (!createTaskTemplateId) {
			return;
		}

		if (!data.taskTemplates.some((taskTemplate) => taskTemplate.id === createTaskTemplateId)) {
			createTaskTemplateId = '';
		}
	});

	$effect(() => {
		if (!saveTaskTemplateSuccess) {
			return;
		}

		isSaveTaskTemplateDialogOpen = false;
		saveTaskTemplateName = '';
		saveTaskTemplateSummary = '';

		if (typeof form?.taskTemplateId === 'string') {
			createTaskTemplateId = form.taskTemplateId;
		}
	});

	onMount(() => {
		const mediaQuery = window.matchMedia('(min-width: 1024px)');
		const syncTaskLayoutMode = () => {
			taskLayoutMode = mediaQuery.matches ? 'desktop' : 'mobile';
		};
		const cleanup = () => {
			mediaQuery.removeEventListener('change', syncTaskLayoutMode);
		};

		syncTaskLayoutMode();
		mediaQuery.addEventListener('change', syncTaskLayoutMode);

		if (createSuccess || createAndRunSuccess || createTaskWithWorkflowSuccess) {
			clearFormDraft(CREATE_TASK_DRAFT_KEY);
			createTaskDraftReady = true;
			return cleanup;
		}

		if (form?.formContext === 'taskCreate') {
			createTaskDraftReady = true;
			return cleanup;
		}

		if (data.createTaskPrefill?.open) {
			applyCreateTaskPrefill(data.createTaskPrefill);
			createTaskDraftReady = true;
			isCreateModalOpen = true;
			return cleanup;
		}

		const savedDraft = readFormDraft<{
			projectId: string;
			parentTaskId: string;
			delegationObjective: string;
			delegationInputContext: string;
			delegationExpectedDeliverable: string;
			delegationDoneCondition: string;
			delegationIntegrationNotes: string;
			name: string;
			instructions: string;
			successCriteria: string;
			readyCondition: string;
			expectedOutcome: string;
			assigneeExecutionSurfaceId: string;
			targetDate: string;
			goalId: string;
			taskTemplateId: string;
			workflowId: string;
			area: string;
			priority: string;
			riskLevel: string;
			approvalMode: string;
			requiredThreadSandbox: string;
			requiresReview: boolean;
			desiredRoleId: string;
			blockedReason: string;
			dependencyTaskIds: string[];
			requiredPromptSkillNames: string;
			requiredCapabilityNames: string;
			requiredToolNames: string;
		}>(CREATE_TASK_DRAFT_KEY);

		if (savedDraft && hasCreateTaskDraftContent(savedDraft)) {
			createTaskProjectId = savedDraft.projectId ?? '';
			createTaskParentTaskId = savedDraft.parentTaskId ?? '';
			createTaskDelegationObjective = savedDraft.delegationObjective ?? '';
			createTaskDelegationInputContext = savedDraft.delegationInputContext ?? '';
			createTaskDelegationExpectedDeliverable = savedDraft.delegationExpectedDeliverable ?? '';
			createTaskDelegationDoneCondition = savedDraft.delegationDoneCondition ?? '';
			createTaskDelegationIntegrationNotes = savedDraft.delegationIntegrationNotes ?? '';
			createTaskName = savedDraft.name ?? '';
			createTaskInstructions = savedDraft.instructions ?? '';
			createTaskSuccessCriteria = savedDraft.successCriteria ?? '';
			createTaskReadyCondition = savedDraft.readyCondition ?? '';
			createTaskExpectedOutcome = savedDraft.expectedOutcome ?? '';
			createTaskAssigneeExecutionSurfaceId = savedDraft.assigneeExecutionSurfaceId ?? '';
			createTaskTargetDate = savedDraft.targetDate ?? '';
			createTaskGoalId = savedDraft.goalId ?? '';
			createTaskTemplateId = savedDraft.taskTemplateId ?? '';
			createTaskWorkflowId = savedDraft.workflowId ?? '';
			createTaskArea = savedDraft.area ?? 'product';
			createTaskPriority = savedDraft.priority ?? 'medium';
			createTaskRiskLevel = savedDraft.riskLevel ?? 'medium';
			createTaskApprovalMode = savedDraft.approvalMode ?? 'none';
			createTaskRequiredThreadSandbox = normalizeSandboxValue(savedDraft.requiredThreadSandbox);
			createTaskRequiresReview = savedDraft.requiresReview ?? true;
			createTaskDesiredRoleId = savedDraft.desiredRoleId ?? '';
			createTaskBlockedReason = savedDraft.blockedReason ?? '';
			createTaskDependencyTaskIds = savedDraft.dependencyTaskIds ?? [];
			createTaskRequiredPromptSkillNames = savedDraft.requiredPromptSkillNames ?? '';
			createTaskRequiredCapabilityNames = savedDraft.requiredCapabilityNames ?? '';
			createTaskRequiredToolNames = savedDraft.requiredToolNames ?? '';
			syncCreateTaskAdvancedOpen({
				successCriteria: createTaskSuccessCriteria,
				readyCondition: createTaskReadyCondition,
				expectedOutcome: createTaskExpectedOutcome,
				priority: createTaskPriority,
				riskLevel: createTaskRiskLevel,
				approvalMode: createTaskApprovalMode,
				requiredThreadSandbox: createTaskRequiredThreadSandbox,
				requiresReview: createTaskRequiresReview,
				desiredRoleId: createTaskDesiredRoleId,
				blockedReason: createTaskBlockedReason,
				dependencyTaskIds: createTaskDependencyTaskIds
			});
			syncCreateTaskFlowMode({
				parentTaskId: createTaskParentTaskId,
				taskTemplateId: createTaskTemplateId,
				goalId: createTaskGoalId,
				workflowId: createTaskWorkflowId,
				assigneeExecutionSurfaceId: createTaskAssigneeExecutionSurfaceId,
				targetDate: createTaskTargetDate,
				requiredPromptSkillNames: createTaskRequiredPromptSkillNames,
				requiredCapabilityNames: createTaskRequiredCapabilityNames,
				requiredToolNames: createTaskRequiredToolNames,
				successCriteria: createTaskSuccessCriteria,
				readyCondition: createTaskReadyCondition,
				expectedOutcome: createTaskExpectedOutcome,
				priority: createTaskPriority,
				riskLevel: createTaskRiskLevel,
				approvalMode: createTaskApprovalMode,
				requiredThreadSandbox: createTaskRequiredThreadSandbox,
				requiresReview: createTaskRequiresReview,
				desiredRoleId: createTaskDesiredRoleId,
				blockedReason: createTaskBlockedReason,
				dependencyTaskIds: createTaskDependencyTaskIds
			});
			isCreateModalOpen = true;
		} else if (savedDraft) {
			clearFormDraft(CREATE_TASK_DRAFT_KEY);
		}

		createTaskDraftReady = true;

		return cleanup;
	});

	$effect(() => {
		if (!createTaskDraftReady) {
			return;
		}

		const defaultProjectId = data.projects.length === 1 ? (data.projects[0]?.id ?? '') : '';

		writeFormDraft(CREATE_TASK_DRAFT_KEY, {
			projectId: createTaskProjectId === defaultProjectId ? '' : createTaskProjectId,
			parentTaskId: createTaskParentTaskId,
			delegationObjective: createTaskDelegationObjective,
			delegationInputContext: createTaskDelegationInputContext,
			delegationExpectedDeliverable: createTaskDelegationExpectedDeliverable,
			delegationDoneCondition: createTaskDelegationDoneCondition,
			delegationIntegrationNotes: createTaskDelegationIntegrationNotes,
			name: createTaskName,
			instructions: createTaskInstructions,
			successCriteria: createTaskSuccessCriteria,
			readyCondition: createTaskReadyCondition,
			expectedOutcome: createTaskExpectedOutcome,
			assigneeExecutionSurfaceId: createTaskAssigneeExecutionSurfaceId,
			targetDate: createTaskTargetDate,
			goalId: createTaskGoalId,
			taskTemplateId: createTaskTemplateId,
			workflowId: createTaskWorkflowId,
			area: createTaskArea === 'product' ? '' : createTaskArea,
			priority: createTaskPriority === 'medium' ? '' : createTaskPriority,
			riskLevel: createTaskRiskLevel === 'medium' ? '' : createTaskRiskLevel,
			approvalMode: createTaskApprovalMode === 'none' ? '' : createTaskApprovalMode,
			requiredThreadSandbox: createTaskRequiredThreadSandbox,
			requiresReview: createTaskRequiresReview ? undefined : false,
			desiredRoleId: createTaskDesiredRoleId,
			blockedReason: createTaskBlockedReason,
			dependencyTaskIds: createTaskDependencyTaskIds,
			requiredPromptSkillNames: createTaskRequiredPromptSkillNames,
			requiredCapabilityNames: createTaskRequiredCapabilityNames,
			requiredToolNames: createTaskRequiredToolNames
		});
	});
</script>

{#snippet taskTable(title: string, description: string, rows: TaskQueueRow[], emptyMessage: string)}
	<DataTableSection {title} {description} summary="" empty={rows.length === 0} {emptyMessage}>
		{#if taskLayoutMode === 'mobile'}
			<div class="space-y-3">
				<div
					class="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
				>
					<p class="text-xs font-medium tracking-[0.14em] text-slate-400 uppercase">
						Select shown tasks
					</p>
					<label class="flex items-center justify-center">
						<span class="sr-only">Select all shown tasks</span>
						<input
							checked={areAllRowsSelected(rows)}
							class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
							data-persist-off
							type="checkbox"
							onchange={(event) => {
								setSelectionForRows(rows, event.currentTarget.checked);
							}}
						/>
					</label>
				</div>

				{#each rows as task (task.id)}
					<article
						class="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
						data-testid={`task-mobile-card-${task.id}`}
					>
						<div class="flex items-start gap-3">
							<label class="mt-1 flex items-center justify-center">
								<span class="sr-only">Select {task.title}</span>
								<input
									checked={isTaskSelected(task.id)}
									class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
									data-persist-off
									type="checkbox"
									onchange={(event) => {
										toggleTaskSelection(task.id, event.currentTarget.checked);
									}}
								/>
							</label>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0">
										<div class="flex items-start gap-2" style={taskIndentStyle(task.depth)}>
											<div class="flex h-6 w-6 items-center justify-center">
												{#if task.visibleChildCount > 0}
													<button
														aria-label={`${task.isExpanded ? 'Collapse' : 'Expand'} child tasks for ${task.title}`}
														class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
														type="button"
														onclick={() => {
															toggleTaskBranch(task.id);
														}}
													>
														{task.isExpanded ? '-' : '+'}
													</button>
												{:else}
													<span
														aria-hidden="true"
														class={`block h-2.5 w-2.5 rounded-full ${task.depth === 0 ? 'bg-sky-400/70' : 'bg-slate-600'}`}
													></span>
												{/if}
											</div>
											<div class="min-w-0">
												<div class="flex flex-wrap items-center gap-2">
													<p
														class={`ui-wrap-anywhere text-base font-semibold ${task.isContextRow ? 'text-slate-300' : 'text-white'}`}
													>
														{task.title}
													</p>
													<span
														class="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[0.65rem] font-medium tracking-[0.14em] text-slate-300 uppercase"
													>
														{taskHierarchyLabel(task.depth)}
													</span>
												</div>
												<p class="ui-clamp-3 mt-2 text-sm text-slate-400">
													{compactText(task.summary, 180)}
												</p>
											</div>
										</div>
									</div>
									<span
										class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${taskStatusToneClass(task.status)}`}
									>
										{formatTaskStatusLabel(task.status)}
									</span>
								</div>

								<div class="mt-3 flex flex-wrap gap-2">
									<span
										class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${
											task.priority === 'urgent'
												? 'border border-rose-900/70 bg-rose-950/40 text-rose-200'
												: task.priority === 'high'
													? 'border border-amber-900/70 bg-amber-950/40 text-amber-200'
													: task.priority === 'low'
														? 'border border-slate-700 bg-slate-900/80 text-slate-300'
														: 'border border-sky-900/70 bg-sky-950/40 text-sky-200'
										}`}
									>
										{formatPriorityLabel(task.priority)}
									</span>
									<span
										class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${
											task.riskLevel === 'high'
												? 'border border-rose-900/70 bg-rose-950/40 text-rose-300'
												: task.riskLevel === 'medium'
													? 'border border-amber-900/70 bg-amber-950/40 text-amber-300'
													: 'border border-emerald-900/70 bg-emerald-950/40 text-emerald-300'
										}`}
									>
										{formatTaskRiskLevelLabel(task.riskLevel)} risk
									</span>
									{#if task.approvalMode !== 'none'}
										<span
											class="inline-flex items-center justify-center rounded-full border border-amber-900/70 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
										>
											{getTaskApprovalPolicyLabel(task.approvalMode)}
										</span>
									{/if}
									{#if !task.requiresReview}
										<span
											class="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
										>
											{getTaskReviewRequirementLabel(task.requiresReview)}
										</span>
									{/if}
									{#if task.desiredRoleId}
										<span
											class="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
										>
											Role {task.desiredRoleName}
										</span>
									{/if}
									{#if task.workflowName}
										<span
											class="inline-flex items-center justify-center rounded-full border border-sky-900/70 bg-sky-950/40 px-2 py-1 text-center text-[11px] leading-none text-sky-200 uppercase"
										>
											Workflow {task.workflowName}
										</span>
									{/if}
									{#each task.freshness.staleSignals as signal (signal)}
										<span
											class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${staleBadgeClass(signal)}`}
										>
											{staleBadgeLabel(task, signal)}
										</span>
									{/each}
								</div>

								<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Project</p>
										<p class="ui-wrap-anywhere mt-2 text-sm text-white">{task.projectName}</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
											Task status
										</p>
										<div class="mt-2 flex flex-wrap gap-2">
											<span
												class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${taskStatusToneClass(task.status)}`}
											>
												{formatTaskStatusLabel(task.status)}
											</span>
											{#if task.openReview}
												<span
													class="inline-flex items-center justify-center rounded-full border border-amber-900/70 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
												>
													{getTaskReviewBadgeLabel(task.openReview.status)}
												</span>
											{/if}
											{#if task.pendingApproval}
												<span
													class="inline-flex items-center justify-center rounded-full border border-amber-900/70 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
												>
													{getTaskPendingApprovalBadgeLabel(task.pendingApproval.mode)}
												</span>
											{/if}
										</div>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Thread</p>
										{#if task.statusThread}
											<div class="mt-2 space-y-2">
												<span
													class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${threadStateToneClass(task.statusThread.threadState)}`}
												>
													{formatThreadStateLabel(task.statusThread.threadState ?? 'idle')}
												</span>
												<p class="ui-clamp-2 text-sm text-white">{task.statusThread.name}</p>
												<p class="text-xs text-slate-500">
													Updated {task.statusThread.lastActivityLabel}
												</p>
											</div>
										{:else}
											<p class="mt-2 text-sm text-slate-500">No thread</p>
										{/if}
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
											Target date
										</p>
										<p class={`mt-2 text-sm ${getTargetDateMeta(task.targetDate).toneClass}`}>
											{getTargetDateMeta(task.targetDate).label}
										</p>
										{#if getTargetDateMeta(task.targetDate).showBadge}
											<span
												class={`mt-2 inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${getTargetDateMeta(task.targetDate).badgeClass}`}
											>
												{getTargetDateMeta(task.targetDate).detail}
											</span>
										{:else}
											<p class="mt-1 text-xs text-slate-500">Updated {task.updatedAtLabel}</p>
										{/if}
									</div>
								</div>

								{#if task.hasUnmetDependencies}
									<p class="mt-3 text-xs text-rose-300">Blocked by unmet dependencies</p>
								{/if}
								{#if task.blockedReason}
									<p class="ui-clamp-2 mt-2 text-xs text-rose-200">{task.blockedReason}</p>
								{/if}
								{#if task.dependencyTaskNames.length > 0}
									<p class="ui-clamp-2 mt-2 text-xs text-slate-500">
										Depends on: {task.dependencyTaskNames.join(', ')}
									</p>
								{/if}
								{#if task.agentGuidanceHint}
									<AgentGuidanceHintBadge hint={task.agentGuidanceHint} compact class="mt-3" />
								{/if}

								<div class="mt-4 flex flex-col gap-2 sm:flex-row">
									{@render queueQuickAction(task, 'w-full sm:w-auto')}
									<QueueOpenButton
										class="w-full sm:w-auto"
										href={resolve(`/app/tasks/${task.id}`)}
										label="Open task"
										panelLabel="Open task in side panel"
										menuAriaLabel={`Open task options for ${task.title}`}
										onOpenPanel={() => {
											openTaskDetailPanel(task);
										}}
									/>
									{#if task.linkThread}
										<QueueOpenButton
											class="w-full sm:w-auto"
											href={resolve(getTaskThreadReviewHref(task.linkThread.id))}
											label={threadActionLabel(task)}
											panelLabel="Open thread in side panel"
											menuAriaLabel={`Open thread options for ${task.linkThread.name}`}
											onOpenPanel={() => {
												openThreadDetailPanel(task);
											}}
										/>
									{/if}
								</div>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{:else}
			<div>
				<div
					class={queueDetailPanel
						? 'xl:grid xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] xl:gap-4'
						: ''}
				>
					<div class="min-w-0 overflow-x-auto">
						<table class="w-full min-w-[980px] divide-y divide-slate-800 text-left xl:min-w-0">
							<thead class="text-xs tracking-[0.16em] text-slate-500 uppercase">
								<tr>
									<th class="px-3 py-3 font-medium">
										<label class="flex items-center justify-center">
											<span class="sr-only">Select all shown tasks</span>
											<input
												checked={areAllRowsSelected(rows)}
												class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
												data-persist-off
												type="checkbox"
												onchange={(event) => {
													setSelectionForRows(rows, event.currentTarget.checked);
												}}
											/>
										</label>
									</th>
									<th class="px-3 py-3 font-medium">Task</th>
									<th class="px-3 py-3 font-medium">Project</th>
									<th class="px-3 py-3 font-medium">Task status</th>
									<th class="px-3 py-3 font-medium">Thread status</th>
									<th class="px-3 py-3 font-medium">Target date</th>
									<th class="px-3 py-3 font-medium">Updated</th>
									<th class="px-3 py-3 font-medium">Actions</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-900/80">
								{#each rows as task (task.id)}
									<tr
										class={[
											'bg-slate-950/30 transition hover:bg-slate-900/60',
											activePanelRowTaskId === task.id ? 'bg-sky-950/20' : ''
										]}
									>
										<td class="px-3 py-3 align-top">
											<label class="flex items-center justify-center">
												<span class="sr-only">Select {task.title}</span>
												<input
													checked={isTaskSelected(task.id)}
													class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
													data-persist-off
													type="checkbox"
													onchange={(event) => {
														toggleTaskSelection(task.id, event.currentTarget.checked);
													}}
												/>
											</label>
										</td>
										<td class="px-3 py-3 align-top">
											<div class="max-w-sm min-w-0" style={taskIndentStyle(task.depth)}>
												<div class="flex items-start gap-3">
													<div class="flex h-7 w-7 items-center justify-center">
														{#if task.visibleChildCount > 0}
															<button
																aria-label={`${task.isExpanded ? 'Collapse' : 'Expand'} child tasks for ${task.title}`}
																class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
																type="button"
																onclick={() => {
																	toggleTaskBranch(task.id);
																}}
															>
																{task.isExpanded ? '-' : '+'}
															</button>
														{:else}
															<span
																class={`block h-2.5 w-2.5 rounded-full ${task.depth === 0 ? 'bg-sky-400/70' : 'bg-slate-600'}`}
															></span>
														{/if}
													</div>
													<div class="min-w-0 flex-1">
														<div class="flex flex-wrap items-center gap-2">
															<p
																class={`ui-clamp-2 font-medium ${task.isContextRow ? 'text-slate-300' : 'text-white'}`}
															>
																{task.title}
															</p>
															<span
																class="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[0.65rem] font-medium tracking-[0.14em] text-slate-300 uppercase"
															>
																{taskHierarchyLabel(task.depth)}
															</span>
														</div>
														<p class="ui-clamp-3 mt-1 text-sm text-slate-400">
															{compactText(task.summary)}
														</p>
													</div>
												</div>
												<div class="mt-2 flex flex-wrap gap-2">
													<span
														class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${
															task.priority === 'urgent'
																? 'border border-rose-900/70 bg-rose-950/40 text-rose-200'
																: task.priority === 'high'
																	? 'border border-amber-900/70 bg-amber-950/40 text-amber-200'
																	: task.priority === 'low'
																		? 'border border-slate-700 bg-slate-900/80 text-slate-300'
																		: 'border border-sky-900/70 bg-sky-950/40 text-sky-200'
														}`}
													>
														{formatPriorityLabel(task.priority)}
													</span>
													<span
														class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${
															task.riskLevel === 'high'
																? 'border border-rose-900/70 bg-rose-950/40 text-rose-300'
																: task.riskLevel === 'medium'
																	? 'border border-amber-900/70 bg-amber-950/40 text-amber-300'
																	: 'border border-emerald-900/70 bg-emerald-950/40 text-emerald-300'
														}`}
													>
														{formatTaskRiskLevelLabel(task.riskLevel)} risk
													</span>
													{#if task.approvalMode !== 'none'}
														<span
															class="inline-flex items-center justify-center rounded-full border border-amber-900/70 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
														>
															{getTaskApprovalPolicyLabel(task.approvalMode)}
														</span>
													{/if}
													{#if !task.requiresReview}
														<span
															class="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
														>
															{getTaskReviewRequirementLabel(task.requiresReview)}
														</span>
													{/if}
													{#if task.desiredRoleId}
														<span
															class="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
														>
															Role {task.desiredRoleName}
														</span>
													{/if}
													{#if task.workflowName}
														<span
															class="inline-flex items-center justify-center rounded-full border border-sky-900/70 bg-sky-950/40 px-2 py-1 text-center text-[11px] leading-none text-sky-200 uppercase"
														>
															Workflow {task.workflowName}
														</span>
													{/if}
													{#each task.freshness.staleSignals as signal (signal)}
														<span
															class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${staleBadgeClass(signal)}`}
														>
															{staleBadgeLabel(task, signal)}
														</span>
													{/each}
												</div>
											</div>
											{#if task.hasUnmetDependencies}
												<p class="mt-2 text-xs text-rose-300">Blocked by unmet dependencies</p>
											{/if}
											{#if task.blockedReason}
												<p class="ui-clamp-2 mt-2 text-xs text-rose-200">{task.blockedReason}</p>
											{/if}
											{#if task.dependencyTaskNames.length > 0}
												<p class="ui-clamp-2 mt-2 text-xs text-slate-500">
													Depends on: {task.dependencyTaskNames.join(', ')}
												</p>
											{/if}
										</td>
										<td class="px-3 py-3 align-top text-sm text-slate-300">
											<p class="ui-clamp-3 max-w-40">{task.projectName}</p>
										</td>
										<td class="px-3 py-3 align-top">
											<div class="min-w-40 space-y-2">
												<span
													class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${taskStatusToneClass(task.status)}`}
												>
													{formatTaskStatusLabel(task.status)}
												</span>
												{#if task.openReview}
													<span
														class="inline-flex items-center justify-center rounded-full border border-amber-900/70 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
													>
														{getTaskReviewBadgeLabel(task.openReview.status)}
													</span>
												{/if}
												{#if task.pendingApproval}
													<span
														class="inline-flex items-center justify-center rounded-full border border-amber-900/70 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
													>
														{getTaskPendingApprovalBadgeLabel(task.pendingApproval.mode)}
													</span>
												{/if}
												{#if task.agentGuidanceHint}
													<AgentGuidanceHintBadge
														hint={task.agentGuidanceHint}
														compact
														class="mt-2"
													/>
												{/if}
											</div>
										</td>
										<td class="px-3 py-3 align-top">
											{#if task.statusThread}
												<div class="max-w-44 min-w-0 space-y-1.5">
													<span
														class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${threadStateToneClass(task.statusThread.threadState)}`}
													>
														{formatThreadStateLabel(task.statusThread.threadState ?? 'idle')}
													</span>
													<p class="ui-clamp-2 text-xs text-slate-300">
														{task.statusThread.name}
													</p>
													<p class="text-xs text-slate-500">
														Updated {task.statusThread.lastActivityLabel}
													</p>
												</div>
											{:else}
												<p class="text-sm text-slate-500">No thread</p>
											{/if}
										</td>
										<td class="px-3 py-3 align-top">
											<p class={`text-sm ${getTargetDateMeta(task.targetDate).toneClass}`}>
												{getTargetDateMeta(task.targetDate).label}
											</p>
											{#if getTargetDateMeta(task.targetDate).showBadge}
												<span
													class={`mt-2 inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${getTargetDateMeta(task.targetDate).badgeClass}`}
												>
													{getTargetDateMeta(task.targetDate).detail}
												</span>
											{/if}
										</td>
										<td class="px-3 py-3 align-top">
											<p class="text-sm text-white">{task.updatedAtLabel}</p>
											<p class="mt-1 text-xs text-slate-500">
												{new Date(task.updatedAt).toLocaleString()}
											</p>
										</td>
										<td class="px-3 py-3 align-top">
											<div class="flex min-w-52 flex-col items-start gap-2">
												{@render queueQuickAction(task)}
												<QueueOpenButton
													href={resolve(`/app/tasks/${task.id}`)}
													label="Open task"
													panelLabel="Open task in side panel"
													menuAriaLabel={`Open task options for ${task.title}`}
													onOpenPanel={() => {
														openTaskDetailPanel(task);
													}}
												/>
												{#if task.linkThread}
													<QueueOpenButton
														href={resolve(getTaskThreadReviewHref(task.linkThread.id))}
														label={threadActionLabel(task)}
														panelLabel="Open thread in side panel"
														menuAriaLabel={`Open thread options for ${task.linkThread.name}`}
														onOpenPanel={() => {
															openThreadDetailPanel(task);
														}}
													/>
												{/if}
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					{#if queueDetailPanel}
						<aside
							class="hidden min-w-0 space-y-4 rounded-2xl border border-slate-800 bg-slate-950/55 p-5 xl:block"
							data-testid="task-detail-panel"
						>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
										Side panel
									</p>
									<p class="ui-wrap-anywhere mt-2 text-xl font-semibold text-white">
										{queueDetailPanel.title}
									</p>
								</div>
								<AppButton
									type="button"
									size="sm"
									variant="ghost"
									onclick={() => {
										queueDetailPanel = null;
									}}
								>
									Close panel
								</AppButton>
							</div>

							<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<p class="text-sm text-slate-400">{queueDetailPanel.description}</p>
								<AppButton
									class="w-full sm:w-auto"
									href={queueDetailPanel.href}
									size="sm"
									variant="accent"
									target="_blank"
									rel="noreferrer noopener"
								>
									Open in new tab
								</AppButton>
							</div>

							{#if queuePanelTask}
								{@render governanceActions(queuePanelTask)}
							{/if}

							<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80">
								{#if queueDetailPanel.kind === 'task'}
									<div class="h-[78vh] min-h-[42rem] overflow-y-auto p-5">
										<div class="mb-4 flex items-center justify-end">
											<AppButton
												type="button"
												size="sm"
												variant="ghost"
												disabled={isTaskDetailPanelLoading}
												onclick={() => {
													if (queueDetailPanel?.kind !== 'task') {
														return;
													}

													void loadTaskDetailPanel(queueDetailPanel.rowTaskId, { force: true });
												}}
											>
												{isTaskDetailPanelLoading ? 'Refreshing...' : 'Refresh panel'}
											</AppButton>
										</div>

										{#if taskDetailPanelData}
											<TaskDetailPageContent
												data={taskDetailPanelData}
												embedded
												actionBasePath={queueDetailPanel.href}
											/>
										{:else if taskDetailPanelLoadError}
											<div class="rounded-2xl border border-rose-900/60 bg-rose-950/30 p-4">
												<p class="text-sm text-rose-200">{taskDetailPanelLoadError}</p>
											</div>
										{:else}
											<div
												class="flex h-full min-h-[32rem] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 px-6 py-10"
											>
												<p class="text-sm text-slate-400">
													{isTaskDetailPanelLoading
														? 'Loading task detail panel.'
														: 'Preparing task detail panel.'}
												</p>
											</div>
										{/if}
									</div>
								{:else}
									<div class="h-[78vh] min-h-[42rem] overflow-y-auto p-5">
										<div class="mb-4 flex items-center justify-end">
											<AppButton
												type="button"
												size="sm"
												variant="ghost"
												disabled={isThreadDetailPanelLoading}
												onclick={() => {
													if (queueDetailPanel?.kind !== 'thread') {
														return;
													}

													void loadThreadDetailPanel(queueDetailPanel.detailId, {
														force: true
													});
												}}
											>
												{isThreadDetailPanelLoading ? 'Refreshing...' : 'Refresh panel'}
											</AppButton>
										</div>

										{#if threadDetailPanelData}
											<ThreadDetailPanel
												thread={threadDetailPanelData.thread}
												sandboxOptions={threadDetailPanelData.sandboxOptions}
												threadFocusTask={threadDetailPanelData.threadFocusTask}
												taskResponseAction={threadDetailPanelData.taskResponseAction}
												threadContacts={threadDetailPanelData.threadContacts}
												threadContactTargets={threadDetailPanelData.threadContactTargets}
												responseContextArtifacts={threadDetailPanelData.responseContextArtifacts}
												embedded
												readOnly
											/>
										{:else if threadDetailPanelLoadError}
											<div class="rounded-2xl border border-rose-900/60 bg-rose-950/30 p-4">
												<p class="text-sm text-rose-200">{threadDetailPanelLoadError}</p>
											</div>
										{:else}
											<div
												class="flex h-full min-h-[32rem] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 px-6 py-10"
											>
												<p class="text-sm text-slate-400">
													{isThreadDetailPanelLoading
														? 'Loading thread detail panel.'
														: 'Preparing thread detail panel.'}
												</p>
											</div>
										{/if}
									</div>
								{/if}
							</div>

							<p class="text-xs text-slate-500">
								The queue stays visible on the left while task and thread detail stay available here
								for quick review.
							</p>
						</aside>
					{/if}
				</div>
			</div>
		{/if}
	</DataTableSection>
{/snippet}

{#snippet governanceActions(task: TaskRow)}
	{#if task.openReview || task.pendingApproval}
		<div class="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4">
			<p class="text-xs font-semibold tracking-[0.16em] text-amber-300 uppercase">
				Next governance action
			</p>
			<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
				{#if task.openReview}
					<form method="POST" action="?/approveReview">
						<input type="hidden" name="taskId" value={task.id} />
						<button
							class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200"
							type="submit"
						>
							Approve review
						</button>
					</form>
					<form method="POST" action="?/requestChanges">
						<input type="hidden" name="taskId" value={task.id} />
						<button
							class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
							type="submit"
						>
							Request changes
						</button>
					</form>
				{/if}
				{#if task.pendingApproval}
					<form method="POST" action="?/approveApproval">
						<input type="hidden" name="taskId" value={task.id} />
						<button
							class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200"
							type="submit"
						>
							Approve gate
						</button>
					</form>
					<form method="POST" action="?/rejectApproval">
						<input type="hidden" name="taskId" value={task.id} />
						<button
							class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
							type="submit"
						>
							Reject gate
						</button>
					</form>
				{/if}
			</div>
		</div>
	{/if}
{/snippet}

{#snippet queueQuickAction(task: TaskQueueRow, className = '')}
	{@const quickAction = getQueueQuickAction(task)}
	{#if quickAction}
		<form method="POST" action={`?/${quickAction.action}`}>
			<input type="hidden" name="taskId" value={task.id} />
			<AppButton
				class={className}
				type="submit"
				size="sm"
				variant={quickAction.variant}
				title={quickAction.title}
			>
				{quickAction.label}
			</AppButton>
		</form>
	{/if}
{/snippet}

<AppPage width="full" class="min-w-0">
	<div class="flex flex-col gap-4 px-1 sm:gap-5 sm:px-2 xl:px-4 2xl:px-8">
		<PageHeader density="compact" title="Tasks">
			{#snippet actions()}
				<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
					<AppButton
						class="w-full sm:w-auto"
						type="button"
						variant="primary"
						onclick={() => {
							openCreateTaskDialog('quick');
						}}
					>
						Quick task
					</AppButton>
					<AppButton
						class="w-full sm:w-auto"
						type="button"
						variant="neutral"
						onclick={() => {
							openCreateTaskDialog('full');
						}}
					>
						Full task
					</AppButton>
				</div>
			{/snippet}
		</PageHeader>

		{#if form?.message}
			<p
				aria-live="polite"
				class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
			>
				{form.message}
			</p>
		{/if}

		{#if createAndRunSuccess}
			<p
				aria-live="polite"
				class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
			>
				Task created and launched in a work thread.
				{#if createdAttachmentCount > 0}
					{createdAttachmentCount === 1
						? ' 1 attachment saved with it.'
						: ` ${createdAttachmentCount} attachments saved with it.`}
				{/if}
				{#if form?.threadId}
					<a class="underline" href={resolve(`/app/threads/${form.threadId.toString()}`)}>
						Open thread details
					</a>
					to follow the run.
				{/if}
			</p>
		{:else if createSuccess}
			<p
				aria-live="polite"
				class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
			>
				Task created and linked to its project.
				{#if createdAttachmentCount > 0}
					{createdAttachmentCount === 1
						? ' 1 attachment saved with it.'
						: ` ${createdAttachmentCount} attachments saved with it.`}
				{/if}
			</p>
		{:else if createTaskWithWorkflowSuccess}
			<p
				aria-live="polite"
				class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
			>
				Created {instantiatedWorkflowTaskCount} task{instantiatedWorkflowTaskCount === 1 ? '' : 's'} from
				the selected workflow template.
				{#if createdAttachmentCount > 0}
					{createdAttachmentCount === 1
						? ' 1 attachment saved on the parent task.'
						: ` ${createdAttachmentCount} attachments saved on the parent task.`}
				{/if}
				{#if instantiatedWorkflowTaskHref}
					<a
						class="ml-2 font-medium text-emerald-100 underline"
						href={instantiatedWorkflowTaskHref}
					>
						Open parent task
					</a>
				{/if}
			</p>
		{:else if deleteSuccess}
			<p
				aria-live="polite"
				class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
			>
				{deleteCount === 1
					? 'Task deleted and removed from the queue.'
					: `${deleteCount} tasks deleted and removed from the queue.`}
			</p>
		{:else if governanceSuccessMessage}
			<p
				aria-live="polite"
				class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
			>
				{governanceSuccessMessage}
			</p>
		{:else if queueSessionSuccess}
			<p
				aria-live="polite"
				class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
			>
				{queueSessionSuccess.message}
				{#if queueSessionSuccess.threadId}
					<a class="underline" href={resolve(`/app/threads/${queueSessionSuccess.threadId}`)}>
						Open thread details
					</a>
					to review the queued work.
				{/if}
			</p>
		{/if}

		{#if data.projects.length === 0}
			<section class="card rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
				<h2 class="text-xl font-semibold text-white">Create a project first</h2>
				<p class="mt-2 max-w-2xl text-sm text-slate-400">
					Tasks require a project link, so add at least one project before creating work items.
				</p>
				<a
					class="mt-4 inline-flex items-center justify-center rounded-full border border-sky-800/70 bg-sky-950/40 px-4 py-2 text-center text-sm leading-none font-medium text-sky-200 transition hover:border-sky-700 hover:text-white"
					href={resolve('/app/projects')}
				>
					Open projects
				</a>
			</section>
		{:else}
			<div class="space-y-4 sm:space-y-5">
				<section
					class="ui-toolbar sticky top-0 z-20 border-slate-800/95 bg-slate-950/88 p-3.5 shadow-[0_18px_48px_rgba(2,6,23,0.45)] backdrop-blur supports-[backdrop-filter]:bg-slate-950/72 sm:p-4"
					data-testid="task-index-toolbar"
				>
					<div class="flex flex-col gap-3">
						<div class="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
							<div class="w-full xl:max-w-sm">
								<label class="sr-only" for="task-search">Search tasks</label>
								<input
									id="task-search"
									bind:value={query}
									autocomplete="off"
									autocapitalize="off"
									autocorrect="off"
									class="input text-white placeholder:text-slate-500"
									data-persist-off
									placeholder="Search tasks…"
									spellcheck="false"
								/>
							</div>
						</div>

						<div class="flex flex-col gap-1.5">
							<span class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase">
								Queue views
							</span>
							<div class="grid gap-2 lg:grid-cols-3">
								<button
									aria-pressed={activeQueuePresetId === 'open'}
									class={[
										'rounded-2xl border px-3 py-3 text-left transition',
										activeQueuePresetId === 'open'
											? 'border-sky-500/60 bg-sky-500/10 text-white'
											: 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
									]}
									type="button"
									onclick={() => {
										applyQueuePreset('open');
									}}
								>
									<span class="flex items-center justify-between gap-3">
										<span class="text-sm font-medium">Open tasks</span>
										<span class="rounded-full border border-current/20 px-2 py-0.5 text-xs">
											{queuePresetCounts.open}
										</span>
									</span>
									<span class="mt-1 block text-xs text-slate-400">
										All active work, sorted by the latest task updates.
									</span>
								</button>

								<button
									aria-pressed={activeQueuePresetId === 'needsAttention'}
									class={[
										'rounded-2xl border px-3 py-3 text-left transition',
										activeQueuePresetId === 'needsAttention'
											? 'border-amber-500/60 bg-amber-500/10 text-white'
											: 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
									]}
									type="button"
									onclick={() => {
										applyQueuePreset('needsAttention');
									}}
								>
									<span class="flex items-center justify-between gap-3">
										<span class="text-sm font-medium">Needs attention</span>
										<span class="rounded-full border border-current/20 px-2 py-0.5 text-xs">
											{queuePresetCounts.needsAttention}
										</span>
									</span>
									<span class="mt-1 block text-xs text-slate-400">
										Blocked, stale, review-gated, or dependency-gated work sorted by target date.
									</span>
								</button>

								<button
									aria-pressed={activeQueuePresetId === 'completed'}
									class={[
										'rounded-2xl border px-3 py-3 text-left transition',
										activeQueuePresetId === 'completed'
											? 'border-emerald-500/60 bg-emerald-500/10 text-white'
											: 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
									]}
									type="button"
									onclick={() => {
										applyQueuePreset('completed');
									}}
								>
									<span class="flex items-center justify-between gap-3">
										<span class="text-sm font-medium">Completed</span>
										<span class="rounded-full border border-current/20 px-2 py-0.5 text-xs">
											{queuePresetCounts.completed}
										</span>
									</span>
									<span class="mt-1 block text-xs text-slate-400">
										Finished work, sorted by the most recently updated completions.
									</span>
								</button>
							</div>
							{#if activeQueuePresetId === null}
								<p class="text-xs text-slate-500">Custom queue filters are active.</p>
							{/if}
						</div>

						<div class="flex flex-wrap gap-2">
							<button
								class={[
									'inline-flex items-center justify-center rounded-full border px-2.5 py-1.5 text-center text-[0.6875rem] leading-none font-medium tracking-[0.14em] uppercase transition',
									selectedStatus === 'all'
										? 'border-sky-400/40 bg-sky-400 text-slate-950'
										: 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
								]}
								type="button"
								onclick={() => {
									selectedStatus = 'all';
								}}
							>
								All
							</button>

							{#each data.statusOptions as status (status)}
								<button
									class={[
										'inline-flex items-center justify-center rounded-full border px-2.5 py-1.5 text-center text-[0.6875rem] leading-none font-medium tracking-[0.14em] uppercase transition',
										selectedStatus === status
											? 'border-sky-400/40 bg-sky-400 text-slate-950'
											: 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
									]}
									type="button"
									onclick={() => {
										selectedStatus = status;
									}}
								>
									{formatTaskStatusLabel(status)}
								</button>
							{/each}
						</div>

						<div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,16rem)_auto]">
							<label class="flex min-w-0 flex-col gap-1.5">
								<span class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase">
									Workflow
								</span>
								<select
									bind:value={selectedWorkflowId}
									aria-label="Filter by workflow"
									class="select min-w-0 text-sm text-white"
								>
									<option value="all">All workflows</option>
									<option value="none">
										No workflow ({workflowFilterOptions.withoutWorkflowCount})
									</option>
									{#each workflowFilterOptions.workflows as workflow (workflow.id)}
										<option value={workflow.id}>{workflow.name} ({workflow.count})</option>
									{/each}
								</select>
							</label>

							<label class="flex min-w-0 flex-col gap-1.5">
								<span class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase">
									Sort by
								</span>
								<select
									bind:value={selectedSortField}
									aria-label="Sort tasks"
									class="select min-w-0 text-sm text-white"
								>
									<option value="updated">Updated</option>
									<option value="targetDate">Target date</option>
									<option value="priority">Priority</option>
								</select>
							</label>

							<div class="flex flex-col gap-1.5">
								<span class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase">
									Direction
								</span>
								<button
									class="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-700 hover:text-white"
									type="button"
									onclick={() => {
										selectedSortDirection = selectedSortDirection === 'asc' ? 'desc' : 'asc';
									}}
								>
									{selectedSortDirection === 'asc' ? 'Ascending' : 'Descending'}
								</button>
							</div>
						</div>
					</div>
				</section>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
					<div class="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
						<PageTabs
							ariaLabel="Task list views"
							bind:value={selectedTaskView}
							items={[
								{ id: 'active', label: 'Open tasks', badge: activeTasks.length },
								{ id: 'completed', label: 'Completed', badge: completedTasks.length }
							]}
							panelIdPrefix="task-list"
						/>
					</div>
				</div>

				{#if selectedTaskIds.length > 0}
					<SelectionActionBar
						title="Bulk actions"
						description={`${selectedTaskIds.length} task${selectedTaskIds.length === 1 ? '' : 's'} selected.`}
					>
						{#snippet actions()}
							<button
								class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-600 hover:text-white"
								type="button"
								onclick={clearSelection}
							>
								Clear selection
							</button>
							<form method="POST" action="?/deleteTasks">
								{#each selectedTaskIds as taskId (taskId)}
									<input name="taskId" type="hidden" value={taskId} />
								{/each}
								<button
									class="inline-flex items-center justify-center rounded-full border border-rose-800/70 bg-rose-950/40 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-rose-200 uppercase transition hover:border-rose-700 hover:text-white"
									type="submit"
								>
									Delete selected
								</button>
							</form>
						{/snippet}
					</SelectionActionBar>
				{/if}

				<div
					id={`task-list-panel-${selectedTaskView}`}
					role="tabpanel"
					aria-labelledby={`task-list-tab-${selectedTaskView}`}
				>
					{#if hiddenCollapsedTaskRowCount > 0}
						<div
							class="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<p class="text-sm text-amber-100">
								{hiddenCollapsedTaskRowCount} matching task{hiddenCollapsedTaskRowCount === 1
									? ' is'
									: 's are'} currently hidden inside collapsed task branches.
							</p>
							<button
								class="inline-flex items-center justify-center rounded-full border border-amber-800/70 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-amber-100 uppercase transition hover:border-amber-700 hover:text-white"
								type="button"
								onclick={() => {
									collapsedTaskIds = [];
								}}
							>
								Expand all
							</button>
						</div>
					{/if}

					{#if hiddenTaskViewNotice}
						<div
							class="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<p class="text-sm text-amber-100">
								{hiddenTaskViewNotice.description}
								{` ${hiddenTaskViewNotice.count} matching task${hiddenTaskViewNotice.count === 1 ? ' is' : 's are'} available in ${hiddenTaskViewNotice.label}.`}
							</p>
							<button
								class="inline-flex items-center justify-center rounded-full border border-amber-800/70 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-amber-100 uppercase transition hover:border-amber-700 hover:text-white"
								type="button"
								onclick={() => {
									selectedTaskView = hiddenTaskViewNotice.targetView;
								}}
							>
								Open {hiddenTaskViewNotice.label}
							</button>
						</div>
					{/if}

					{@render taskTable(
						selectedTaskView === 'completed' ? 'Completed' : 'Open tasks',
						'',
						visibleTaskRows,
						selectedTaskView === 'completed'
							? 'No completed tasks match the current filters.'
							: 'No open tasks match the current filters.'
					)}
				</div>
			</div>
		{/if}

		{#if data.projects.length > 0 && isCreateModalOpen}
			<AppDialog
				bind:open={isCreateModalOpen}
				title={createTaskFlowMode === 'quick' ? 'Quick task' : 'Full task'}
				description={createTaskFlowMode === 'quick'
					? 'Capture the task quickly with the fields operators need most often, then launch it or refine it later on the detail page.'
					: 'Set planning, execution, and coordination details in a dedicated workspace so the task is ready to route cleanly.'}
				closeLabel="Close create task dialog"
				bodyClass="p-0"
				panelClass={createTaskFlowMode === 'full' ? 'max-w-none' : 'max-w-[min(72rem,100%)]'}
				surfaceClass={createTaskFlowMode === 'full'
					? 'min-h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] rounded-[2rem]'
					: ''}
			>
				<form
					class="space-y-6 p-6"
					method="POST"
					action="?/createTask"
					data-persist-scope="manual"
					enctype="multipart/form-data"
					onpaste={handleCreateTaskAttachmentPaste}
				>
					<input type="hidden" name="parentTaskId" value={createTaskParentTaskId} />
					<div class="min-w-0 space-y-4">
						<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
							<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
								<div class="max-w-3xl">
									<p class="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
										{createTaskFlowMode === 'quick' ? 'Quick add' : 'Full setup'}
									</p>
									<p class="mt-2 text-sm text-white">
										{createTaskFlowMode === 'quick'
											? 'Quick add keeps intake focused on the fields that shape routing and launch the fastest.'
											: 'Full setup breaks task creation into clearer sections so routing, execution, and coordination stay readable.'}
									</p>
									<p class="mt-2 text-sm text-slate-400">
										{createTaskFlowMode === 'quick'
											? 'Project, preferred role, task name, instructions, and attachments stay front and center.'
											: 'Use this when the task needs workflow context, execution requirements, governance, or explicit dependencies before it enters the queue.'}
									</p>
								</div>
								<div class="flex flex-wrap gap-2">
									<AppButton
										type="button"
										variant={createTaskFlowMode === 'quick' ? 'neutral' : 'primary'}
										onclick={() => {
											createTaskFlowMode = 'quick';
										}}
									>
										Quick task
									</AppButton>
									<AppButton
										type="button"
										variant={createTaskFlowMode === 'full' ? 'neutral' : 'primary'}
										onclick={() => {
											createTaskFlowMode = 'full';
										}}
									>
										Full task
									</AppButton>
								</div>
							</div>
							{#if createTaskFlowMode === 'quick'}
								<p class="mt-3 text-sm text-slate-400">
									Switch to Full task when this work needs workflow setup, deeper execution
									requirements, approvals, or dependency planning before creation.
								</p>
								{#if createTaskFullFlowSummary}
									<p
										class="mt-3 rounded-2xl border border-sky-900/40 bg-sky-950/15 px-4 py-3 text-sm text-sky-100"
									>
										Full-task settings retained: {createTaskFullFlowSummary}
									</p>
								{/if}
								<input type="hidden" name="goalId" value={createTaskGoalId} />
								<input type="hidden" name="workflowId" value={createTaskWorkflowId} />
								<input
									type="hidden"
									name="assigneeExecutionSurfaceId"
									value={createTaskAssigneeExecutionSurfaceId}
								/>
								<input type="hidden" name="targetDate" value={createTaskTargetDate} />
								<input type="hidden" name="area" value={createTaskArea} />
								<input type="hidden" name="priority" value={createTaskPriority} />
								<input type="hidden" name="riskLevel" value={createTaskRiskLevel} />
								<input type="hidden" name="approvalMode" value={createTaskApprovalMode} />
								<input
									type="hidden"
									name="requiredThreadSandbox"
									value={createTaskRequiredThreadSandbox}
								/>
								<input
									type="hidden"
									name="requiresReview"
									value={createTaskRequiresReview ? 'true' : 'false'}
								/>
								<input type="hidden" name="blockedReason" value={createTaskBlockedReason} />
								<input
									type="hidden"
									name="requiredPromptSkillNames"
									value={createTaskRequiredPromptSkillNames}
								/>
								<input
									type="hidden"
									name="requiredCapabilityNames"
									value={createTaskRequiredCapabilityNames}
								/>
								<input type="hidden" name="requiredToolNames" value={createTaskRequiredToolNames} />
								<input type="hidden" name="successCriteria" value={createTaskSuccessCriteria} />
								<input type="hidden" name="readyCondition" value={createTaskReadyCondition} />
								<input type="hidden" name="expectedOutcome" value={createTaskExpectedOutcome} />
								{#each createTaskDependencyTaskIds as dependencyTaskId (dependencyTaskId)}
									<input type="hidden" name="dependencyTaskIds" value={dependencyTaskId} />
								{/each}
							{/if}
						</div>

						{#if createTaskFlowMode === 'full'}
							<div
								class="sticky top-0 z-10 -mx-6 border-y border-slate-800 bg-slate-950/92 px-6 py-3 backdrop-blur sm:-mx-8 sm:px-8"
							>
								<div class="flex flex-wrap items-center gap-2">
									<span
										class="text-[0.7rem] font-semibold tracking-[0.16em] text-slate-500 uppercase"
									>
										Jump to
									</span>
									{#each [{ id: 'full-task-context', label: 'Context' }, { id: 'full-task-requirements', label: 'Requirements' }, { id: 'full-task-definition', label: 'Definition' }, { id: 'full-task-dependencies', label: 'Dependencies' }, { id: 'full-task-instructions', label: 'Instructions' }] as section (section.id)}
										<button
											type="button"
											class="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:text-white"
											onclick={() => {
												scrollCreateTaskSectionIntoView(section.id);
											}}
										>
											{section.label}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						{#if createTaskParentTaskId}
							<div class="rounded-2xl border border-sky-900/60 bg-sky-950/20 p-4">
								<p class="text-xs font-semibold tracking-[0.16em] text-sky-300 uppercase">
									Delegation lineage
								</p>
								{#if createTaskParentTask}
									<p class="mt-2 text-sm text-white">
										This task will be linked as a delegated child of
										<a
											class="font-medium text-sky-300 transition hover:text-sky-200"
											href={resolve(`/app/tasks/${createTaskParentTask.id}`)}
										>
											{createTaskParentTask.title}
										</a>.
									</p>
									<p class="mt-2 text-sm text-slate-400">
										Keep the subtask narrow so the parent can integrate its output cleanly.
									</p>
								{:else}
									<p class="mt-2 text-sm text-white">
										This task will be linked to parent task <code>{createTaskParentTaskId}</code>.
									</p>
								{/if}

								<div class="mt-4 grid gap-4 lg:grid-cols-2">
									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">
											Delegation objective
										</span>
										<textarea
											bind:value={createTaskDelegationObjective}
											class="textarea min-h-28 text-white placeholder:text-slate-500"
											name="delegationObjective"
											placeholder="Describe the exact slice of work this child task owns."
											required
										></textarea>
									</label>

									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">
											Done condition
										</span>
										<textarea
											bind:value={createTaskDelegationDoneCondition}
											class="textarea min-h-28 text-white placeholder:text-slate-500"
											name="delegationDoneCondition"
											placeholder="Describe what must be true before the parent can accept the handoff."
											required
										></textarea>
									</label>

									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">
											Input context
										</span>
										<textarea
											bind:value={createTaskDelegationInputContext}
											class="textarea min-h-28 text-white placeholder:text-slate-500"
											name="delegationInputContext"
											placeholder="Capture upstream context, constraints, or source material this child needs."
										></textarea>
									</label>

									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">
											Expected deliverable
										</span>
										<textarea
											bind:value={createTaskDelegationExpectedDeliverable}
											class="textarea min-h-28 text-white placeholder:text-slate-500"
											name="delegationExpectedDeliverable"
											placeholder="Name the artifact, output format, or concrete result expected from this child."
										></textarea>
									</label>
								</div>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">
										Integration notes
									</span>
									<textarea
										bind:value={createTaskDelegationIntegrationNotes}
										class="textarea min-h-24 text-white placeholder:text-slate-500"
										name="delegationIntegrationNotes"
										placeholder="Describe how the parent task should incorporate or verify the child output."
									></textarea>
								</label>
							</div>
						{/if}

						{#if createTaskFlowMode === 'full'}
							<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
								<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">
											Use task template
										</span>
										<select
											bind:value={createTaskTemplateId}
											class="select text-white"
											name="taskTemplateId"
											onchange={(event) => {
												applyCreateTaskTemplateById(
													(event.currentTarget as HTMLSelectElement).value
												);
											}}
										>
											<option value="">No task template</option>
											{#each availableTaskTemplates as taskTemplate (taskTemplate.id)}
												<option value={taskTemplate.id}>
													{taskTemplate.name} · {taskTemplate.projectName}
												</option>
											{/each}
										</select>
										<span class="mt-2 block text-xs text-slate-500">
											Optional. Task templates prefill repeated task defaults like project, goal,
											role, workflow, instructions, review settings, and execution requirements.
										</span>
										{#if data.taskTemplates.length === 0}
											<span class="mt-2 block text-xs text-slate-500">
												No task templates are saved yet.
											</span>
										{/if}
									</label>

									<button
										class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white"
										type="button"
										onclick={openSaveTaskTemplateDialogForCreate}
									>
										Save current as template
									</button>
								</div>

								{#if selectedCreateTaskTemplate}
									<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
										<div class="flex flex-wrap items-center gap-2">
											<p class="text-sm font-medium text-white">
												{selectedCreateTaskTemplate.name}
											</p>
											<span
												class="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-1 text-[11px] text-slate-300 uppercase"
											>
												{selectedCreateTaskTemplate.projectName}
											</span>
											{#if selectedCreateTaskTemplate.workflowId}
												<span
													class="rounded-full border border-sky-800/60 bg-slate-950/80 px-2 py-1 text-[11px] text-sky-200 uppercase"
												>
													Workflow linked
												</span>
											{/if}
										</div>
										{#if selectedCreateTaskTemplate.summary}
											<p class="mt-2 text-sm text-slate-300">
												{selectedCreateTaskTemplate.summary}
											</p>
										{/if}
										<p class="mt-2 text-xs text-slate-400">
											Applying a task template fills the form once. You can still edit any field
											before creating the task.
										</p>
										<p class="mt-3 text-xs text-slate-500">
											Manage template details in the task template library.
											<a
												class="ml-1 font-medium text-sky-300 underline"
												href={resolve(
													selectedCreateTaskTemplate
														? `/app/task-templates/${selectedCreateTaskTemplate.id}`
														: '/app/task-templates'
												)}
											>
												{selectedCreateTaskTemplate ? 'Open template detail' : 'Open library'}
											</a>
										</p>
									</div>
								{/if}

								{#if saveTaskTemplateSuccess}
									<p
										class="mt-4 rounded-2xl border border-emerald-900/70 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200"
									>
										Saved task template {form?.taskTemplateName?.toString() ?? 'template'}.
									</p>
								{/if}
							</div>
						{/if}

						<div
							class={`grid gap-4 ${createTaskFlowMode === 'full' ? 'xl:grid-cols-3' : 'md:grid-cols-2'}`}
						>
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Project</span>
								<select
									bind:value={createTaskProjectId}
									class="select text-white"
									name="projectId"
									required
								>
									<option value="" disabled>Select a project</option>
									{#each data.projects as project (project.id)}
										<option value={project.id}>{project.name}</option>
									{/each}
								</select>
							</label>

							<RolePicker
								label="Preferred role"
								inputId="create-task-desired-role"
								bind:value={createTaskDesiredRoleId}
								helperText="Helps route the work immediately, even from the quick form."
								missingValueLabel={createTaskDesiredRoleName
									? `${createTaskDesiredRoleName} (missing role)`
									: ''}
								roles={data.roles}
							/>

							{#if createTaskFlowMode === 'full'}
								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Target date</span>
									<input
										class="input text-white"
										bind:value={createTaskTargetDate}
										name="targetDate"
										type="date"
									/>
								</label>
							{/if}
						</div>

						<label id="full-task-instructions" class="block scroll-mt-28">
							<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
							<input
								class="input text-white placeholder:text-slate-500"
								bind:value={createTaskName}
								name="name"
								placeholder="Build the first task creation flow…"
								required
							/>
						</label>

						{#if createTaskFlowMode === 'full'}
							<div
								id="full-task-context"
								class="grid scroll-mt-28 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
							>
								<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div>
											<p class="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
												Task context
											</p>
											<p class="mt-2 text-sm text-slate-400">
												Connect the task to the goal, workflow, schedule, and launch surface.
											</p>
										</div>
										{#if createTaskFullFlowSummary}
											<p class="max-w-xl text-sm text-slate-400">{createTaskFullFlowSummary}</p>
										{/if}
									</div>
									<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
										<label class="block">
											<span class="mb-2 block text-sm font-medium text-slate-200">Goal</span>
											<select bind:value={createTaskGoalId} class="select text-white" name="goalId">
												<option value="">No goal linked</option>
												{#each data.goals as goal (goal.id)}
													<option value={goal.id}>{goal.label}</option>
												{/each}
											</select>
											<span class="mt-2 block text-xs text-slate-500">
												Optional. Link the task to the outcome it advances.
											</span>
										</label>

										<label class="block">
											<span class="mb-2 block text-sm font-medium text-slate-200">
												Apply workflow
											</span>
											<select
												bind:value={createTaskWorkflowId}
												class="select text-white"
												disabled={Boolean(createTaskParentTaskId)}
												name="workflowId"
											>
												<option value="">No workflow</option>
												{#each availableCreateTaskWorkflows as workflow (workflow.id)}
													<option value={workflow.id}>{workflow.name}</option>
												{/each}
											</select>
											<span class="mt-2 block text-xs text-slate-500">
												Optional. Expand this into a parent task plus standard child tasks for that
												flow.
											</span>
											{#if createTaskParentTaskId}
												<span class="mt-2 block text-xs text-slate-500">
													Delegated child tasks cannot apply workflow templates.
												</span>
											{:else if availableCreateTaskWorkflows.length === 0}
												<span class="mt-2 block text-xs text-slate-500">
													No workflows are available yet.
												</span>
											{/if}
										</label>

										<label class="block">
											<span class="mb-2 block text-sm font-medium text-slate-200">
												Assign to execution surface
											</span>
											<select
												bind:value={createTaskAssigneeExecutionSurfaceId}
												class="select text-white"
												name="assigneeExecutionSurfaceId"
											>
												<option value="">Leave unassigned</option>
												{#each data.executionSurfaces as executionSurface (executionSurface.id)}
													<option value={executionSurface.id}>{executionSurface.name}</option>
												{/each}
											</select>
										</label>
									</div>
								</div>

								<div class="space-y-4">
									{#if selectedCreateWorkflow}
										<div class="rounded-2xl border border-sky-900/40 bg-sky-950/15 p-4">
											<div class="flex flex-wrap items-center gap-2">
												<p class="text-sm font-medium text-white">{selectedCreateWorkflow.name}</p>
												<span
													class="rounded-full border border-sky-800/60 bg-slate-950/80 px-2 py-1 text-[11px] text-sky-200 uppercase"
												>
													{selectedCreateWorkflow.stepCount} step{selectedCreateWorkflow.stepCount ===
													1
														? ''
														: 's'}
												</span>
											</div>
											<p class="mt-2 text-sm text-slate-300">
												Selecting a workflow turns this into a parent task plus generated child
												tasks. The child tasks carry the actual execution sequence, roles, and
												internal dependencies.
											</p>
											{#if createTaskProjectId && selectedCreateWorkflow.projectId !== createTaskProjectId}
												<p class="mt-2 text-xs text-slate-400">
													This workflow belongs to {selectedCreateWorkflow.projectName}, but the
													created tasks will stay linked to the selected project.
												</p>
											{/if}
											<p class="mt-2 text-xs text-slate-400">
												The parent task stays as the umbrella for the work and will complete when
												the generated child tasks are complete.
											</p>
										</div>
									{/if}

									<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
										<p class="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
											Skill coverage
										</p>
										{#if selectedProjectSkillSummary}
											<p class="mt-2 text-sm text-white">
												{selectedProjectSkillSummary.totalCount === 0
													? 'No installed Codex skills were found for this project workspace yet.'
													: `${selectedProjectSkillSummary.totalCount} installed skill${selectedProjectSkillSummary.totalCount === 1 ? '' : 's'} will be available when this task launches.`}
											</p>
											<p class="mt-2 text-sm text-slate-400">
												{selectedProjectSkillSummary.projectCount} project-local ·
												{selectedProjectSkillSummary.globalCount} global
											</p>
											{#if selectedProjectSkillSummary.previewSkills.length > 0}
												<div class="mt-3 flex flex-wrap gap-2">
													{#each selectedProjectSkillSummary.previewSkills as skill (skill.id)}
														<span
															class="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-1 text-xs text-slate-200"
															title={skill.description || undefined}
														>
															{skill.id}
															<span class="text-slate-500"> · {skill.sourceLabel}</span>
														</span>
													{/each}
												</div>
											{/if}
										{:else}
											<p class="mt-2 text-sm text-slate-400">
												Select a project to preview the skills available to its future task threads.
											</p>
										{/if}
									</div>
								</div>
							</div>
						{/if}

						{#if createTaskFlowMode === 'full'}
							<label id="full-task-requirements" class="block scroll-mt-28">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Requested prompt skills
								</span>
								<input
									bind:value={createTaskRequiredPromptSkillNames}
									class="input text-white placeholder:text-slate-500"
									name="requiredPromptSkillNames"
									placeholder="frontend-sveltekit, docs-writer"
									list="task-create-prompt-skill-inventory"
								/>
								<span class="mt-2 block text-xs text-slate-500">
									Comma-separated installed Codex skills this task should explicitly request in its
									first thread prompt.
								</span>
								{#if !selectedProjectSkillSummary}
									<span class="mt-2 block text-xs text-slate-500">
										Select a project first to validate against its installed skill inventory.
									</span>
								{:else if selectedProjectInstalledSkillNames.length === 0}
									<span class="mt-2 block text-xs text-slate-500">
										This project does not currently expose any installed prompt skills.
									</span>
								{:else}
									<div class="mt-3 flex flex-wrap gap-2">
										{#each selectedProjectSkillSummary.installedSkills as skill (skill.id)}
											<button
												type="button"
												class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-700 hover:text-white"
												title={skill.description || skill.sourceLabel}
												onclick={() => {
													createTaskRequiredPromptSkillNames = appendExecutionRequirementName(
														createTaskRequiredPromptSkillNames,
														skill.id
													);
												}}
											>
												{skill.id}
											</button>
										{/each}
									</div>
									<span class="mt-2 block text-xs text-slate-500">
										Select a known installed skill to append it from the current project workspace.
									</span>
								{/if}
								{#if selectedProjectInstalledSkillNames.length > 0 && createTaskUnknownPromptSkillNames.length > 0}
									<span class="mt-2 block text-xs text-amber-300">
										Not installed in this project workspace: {createTaskUnknownPromptSkillNames.join(
											', '
										)}
									</span>
								{/if}
							</label>

							<div id="full-task-definition" class="scroll-mt-28 space-y-4">
								<input type="hidden" name="area" value={createTaskArea} />

								<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div>
											<p class="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
												Execution contract
											</p>
											<p class="mt-2 text-sm text-slate-400">
												Define what done looks like before the task enters the queue.
											</p>
										</div>
										<p class="max-w-xl text-sm text-slate-400">
											{createTaskReviewContractGap ||
												'Reviewers will have an explicit outcome and acceptance standard for this task.'}
										</p>
									</div>
									<div class="mt-4 grid gap-4 lg:grid-cols-3">
										<label class="block">
											<span class="mb-2 block text-sm font-medium text-slate-200">
												Success criteria
											</span>
											<textarea
												bind:value={createTaskSuccessCriteria}
												class="textarea min-h-28 text-white placeholder:text-slate-500"
												name="successCriteria"
												placeholder="Describe how a reviewer should judge this task as complete."
											></textarea>
										</label>

										<label class="block">
											<span class="mb-2 block text-sm font-medium text-slate-200">
												Ready condition
											</span>
											<textarea
												bind:value={createTaskReadyCondition}
												class="textarea min-h-28 text-white placeholder:text-slate-500"
												name="readyCondition"
												placeholder="Describe what must already be true before this task should run."
											></textarea>
										</label>

										<label class="block">
											<span class="mb-2 block text-sm font-medium text-slate-200">
												Expected outcome
											</span>
											<textarea
												bind:value={createTaskExpectedOutcome}
												class="textarea min-h-28 text-white placeholder:text-slate-500"
												name="expectedOutcome"
												placeholder="Describe the desired end state or deliverable."
											></textarea>
										</label>
									</div>

									<div
										class={`mt-4 rounded-2xl border p-4 ${createTaskLaunchContractBlocker ? 'border-amber-900/50 bg-amber-950/15' : 'border-emerald-900/40 bg-emerald-950/15'}`}
									>
										<p
											class={`text-xs font-semibold tracking-[0.16em] uppercase ${createTaskLaunchContractBlocker ? 'text-amber-300' : 'text-emerald-300'}`}
										>
											Launch readiness
										</p>
										<p
											class={`mt-2 text-sm ${createTaskLaunchContractBlocker ? 'text-amber-100' : 'text-emerald-100'}`}
										>
											{createTaskLaunchContractBlocker ||
												'Create and run can start immediately once this contract is saved.'}
										</p>
									</div>
								</div>

								<div
									id="full-task-dependencies"
									class="grid scroll-mt-28 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
								>
									<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
										<div class="flex flex-wrap items-center justify-between gap-3">
											<div>
												<p class="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
													Dependencies
												</p>
												<p class="mt-2 text-sm text-slate-400">
													Search for prerequisite tasks instead of scanning the whole queue.
												</p>
											</div>
											<span
												class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
											>
												{createTaskDependencyCount} selected
											</span>
										</div>

										{#if createTaskSelectedDependencies.length > 0}
											<div class="mt-4 flex flex-wrap gap-2">
												{#each createTaskSelectedDependencies as dependency (dependency.id)}
													<button
														type="button"
														class="inline-flex items-center gap-2 rounded-full border border-sky-800/70 bg-sky-950/20 px-3 py-2 text-left text-sm text-sky-100 transition hover:border-sky-700 hover:text-white"
														onclick={() => {
															removeCreateTaskDependency(dependency.id);
														}}
													>
														<span class="min-w-0">
															<span class="ui-wrap-anywhere block font-medium"
																>{dependency.title}</span
															>
															<span class="block text-xs text-sky-200/80">
																{dependency.projectName} · {formatTaskStatusLabel(
																	dependency.status
																)}
															</span>
														</span>
														<span aria-hidden="true" class="text-base leading-none">×</span>
													</button>
												{/each}
											</div>
										{/if}

										{#if data.availableDependencyTasks.length === 0}
											<p class="mt-4 text-sm text-slate-500">
												No other tasks are available to use as dependencies yet.
											</p>
										{:else}
											<label class="mt-4 block">
												<span class="mb-2 block text-sm font-medium text-slate-200">
													Search tasks
												</span>
												<input
													bind:value={createTaskDependencyQuery}
													autocomplete="off"
													class="input text-white placeholder:text-slate-500"
													placeholder="Search by task name, project, or status…"
													type="search"
												/>
											</label>

											<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
												<div class="flex flex-wrap items-center justify-between gap-3">
													<p
														class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase"
													>
														{createTaskDependencySearchLabel}
													</p>
													{#if createTaskDependencySearchOverflowCount > 0}
														<p class="text-xs text-slate-500">
															Showing the first {createTaskDependencySearchResults.length} matches
														</p>
													{/if}
												</div>
												{#if createTaskDependencySearchResults.length === 0}
													<p class="mt-3 text-sm text-slate-500">
														{createTaskDependencyQuery.trim()
															? 'No tasks match the current search.'
															: 'All available tasks are already selected.'}
													</p>
												{:else}
													<div class="mt-3 max-h-72 overflow-y-auto overscroll-contain">
														{#each createTaskDependencySearchResults as dependency (dependency.id)}
															<label
																class="flex items-start gap-3 border-t border-slate-800 px-1 py-3 first:border-t-0"
															>
																<input
																	checked={createTaskDependencyTaskIds.includes(dependency.id)}
																	class="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
																	name="dependencyTaskIds"
																	type="checkbox"
																	value={dependency.id}
																	onchange={(event) => {
																		toggleCreateTaskDependency(
																			dependency.id,
																			event.currentTarget.checked
																		);
																	}}
																/>
																<div class="min-w-0 flex-1">
																	<div class="flex flex-wrap items-start justify-between gap-2">
																		<p class="ui-wrap-anywhere text-sm font-medium text-white">
																			{dependency.title}
																		</p>
																		<span class="text-xs text-slate-400">
																			{formatTaskStatusLabel(dependency.status)}
																		</span>
																	</div>
																	<p class="mt-1 text-xs text-slate-400">
																		{dependency.projectName}
																	</p>
																</div>
															</label>
														{/each}
													</div>
												{/if}
											</div>
										{/if}
									</div>

									<div class="space-y-4">
										<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
											<p class="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
												Blockers & notes
											</p>
											<label class="mt-4 block">
												<span class="mb-2 block text-sm font-medium text-slate-200">
													Blocker notes
												</span>
												<textarea
													bind:value={createTaskBlockedReason}
													class="textarea min-h-28 text-white placeholder:text-slate-500"
													name="blockedReason"
													placeholder="Document the blocker, missing approval, or dependency holding this task."
												></textarea>
											</label>
										</div>

										<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
											<div class="flex flex-wrap items-start justify-between gap-3">
												<div>
													<p
														class="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase"
													>
														Additional settings
													</p>
													<p class="mt-2 text-sm text-slate-400">{createTaskAdvancedSummary}</p>
												</div>
												<button
													class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white"
													type="button"
													onclick={() => {
														createTaskAdvancedOpen = !createTaskAdvancedOpen;
													}}
												>
													{createTaskAdvancedOpen ? 'Hide settings' : 'Show settings'}
												</button>
											</div>

											{#if createTaskAdvancedOpen}
												<div class="mt-5 space-y-4">
													<div class="grid gap-4 sm:grid-cols-2">
														<label class="block">
															<span class="mb-2 block text-sm font-medium text-slate-200"
																>Priority</span
															>
															<select
																bind:value={createTaskPriority}
																class="select text-white"
																name="priority"
															>
																{#each PRIORITY_OPTIONS as priority (priority)}
																	<option value={priority}>{formatPriorityLabel(priority)}</option>
																{/each}
															</select>
														</label>

														<label class="block">
															<span class="mb-2 block text-sm font-medium text-slate-200"
																>Risk level</span
															>
															<select
																bind:value={createTaskRiskLevel}
																class="select text-white"
																name="riskLevel"
															>
																{#each TASK_RISK_LEVEL_OPTIONS as riskLevel (riskLevel)}
																	<option value={riskLevel}>
																		{formatTaskRiskLevelLabel(riskLevel)}
																	</option>
																{/each}
															</select>
														</label>

														<label class="block">
															<span class="mb-2 block text-sm font-medium text-slate-200">
																Approval mode
															</span>
															<select
																bind:value={createTaskApprovalMode}
																class="select text-white"
																name="approvalMode"
															>
																{#each TASK_APPROVAL_MODE_OPTIONS as approvalMode (approvalMode)}
																	<option value={approvalMode}>
																		{formatTaskApprovalModeLabel(approvalMode)}
																	</option>
																{/each}
															</select>
														</label>

														<label class="block">
															<span class="mb-2 block text-sm font-medium text-slate-200">
																Requires review
															</span>
															<select
																bind:value={createTaskRequiresReview}
																class="select text-white"
																name="requiresReview"
															>
																<option value={true}>Yes</option>
																<option value={false}>No</option>
															</select>
														</label>
													</div>

													<label class="block">
														<span class="mb-2 block text-sm font-medium text-slate-200">
															Required sandbox
														</span>
														<select
															bind:value={createTaskRequiredThreadSandbox}
															class="select text-white"
															name="requiredThreadSandbox"
														>
															<option value=""
																>Inherit execution-surface and project defaults</option
															>
															{#each AGENT_SANDBOX_OPTIONS as sandbox (sandbox)}
																<option value={sandbox}>{formatAgentSandboxLabel(sandbox)}</option>
															{/each}
														</select>
													</label>
												</div>
											{/if}
										</div>
									</div>
								</div>
							</div>

							<div class="grid gap-4 md:grid-cols-2">
								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">
										Required capabilities
									</span>
									<input
										bind:value={createTaskRequiredCapabilityNames}
										class="input text-white placeholder:text-slate-500"
										name="requiredCapabilityNames"
										placeholder="planning, citations, svelte"
										list="task-create-capability-inventory"
									/>
									<span class="mt-2 block text-xs text-slate-500">
										Comma-separated abilities the task needs, regardless of who does it.
									</span>
									{#if data.executionRequirementInventory.capabilities.length === 0}
										<span class="mt-2 block text-xs text-slate-500">
											No execution-surface or provider capability inventory is registered yet. These
											labels stay free-form for now.
										</span>
									{:else}
										<div class="mt-3 flex flex-wrap gap-2">
											{#each data.executionRequirementInventory.capabilities as capability (capability.name)}
												<button
													type="button"
													class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-700 hover:text-white"
													title={formatInventoryCoverageLabel(capability)}
													onclick={() => {
														createTaskRequiredCapabilityNames = appendExecutionRequirementName(
															createTaskRequiredCapabilityNames,
															capability.name
														);
													}}
												>
													{capability.name}
												</button>
											{/each}
										</div>
										<span class="mt-2 block text-xs text-slate-500">
											Select a known label to append it from the current execution-surface and
											provider inventory.
										</span>
									{/if}
									{#if data.executionRequirementInventory.capabilities.length > 0 && createTaskUnknownCapabilityNames.length > 0}
										<span class="mt-2 block text-xs text-amber-300">
											Not in the current inventory: {createTaskUnknownCapabilityNames.join(', ')}
										</span>
									{/if}
								</label>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Required tools</span>
									<input
										bind:value={createTaskRequiredToolNames}
										class="input text-white placeholder:text-slate-500"
										name="requiredToolNames"
										placeholder="codex, playwright"
										list="task-create-tool-inventory"
									/>
									<span class="mt-2 block text-xs text-slate-500">
										Comma-separated tools or execution surfaces needed for this work.
									</span>
									{#if data.executionRequirementInventory.tools.length === 0}
										<span class="mt-2 block text-xs text-slate-500">
											No provider launcher inventory is registered yet. These labels stay free-form
											for now.
										</span>
									{:else}
										<div class="mt-3 flex flex-wrap gap-2">
											{#each data.executionRequirementInventory.tools as tool (tool.name)}
												<button
													type="button"
													class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-700 hover:text-white"
													title={formatInventoryCoverageLabel(tool)}
													onclick={() => {
														createTaskRequiredToolNames = appendExecutionRequirementName(
															createTaskRequiredToolNames,
															tool.name
														);
													}}
												>
													{tool.name}
												</button>
											{/each}
										</div>
										<span class="mt-2 block text-xs text-slate-500">
											Select a known launcher label to append it from the current provider
											inventory.
										</span>
									{/if}
									{#if data.executionRequirementInventory.tools.length > 0 && createTaskUnknownToolNames.length > 0}
										<span class="mt-2 block text-xs text-amber-300">
											Not in the current inventory: {createTaskUnknownToolNames.join(', ')}
										</span>
									{/if}
								</label>
							</div>

							<datalist id="task-create-capability-inventory">
								{#each data.executionRequirementInventory.capabilityNames as capabilityName (capabilityName)}
									<option value={capabilityName}></option>
								{/each}
							</datalist>

							<datalist id="task-create-prompt-skill-inventory">
								{#each selectedProjectSkillSummary?.installedSkills ?? [] as skill (skill.id)}
									<option value={skill.id}></option>
								{/each}
							</datalist>

							<datalist id="task-create-tool-inventory">
								{#each data.executionRequirementInventory.toolNames as toolName (toolName)}
									<option value={toolName}></option>
								{/each}
							</datalist>
						{/if}

						<label class="block">
							<span class="mb-2 flex flex-wrap items-center justify-between gap-3">
								<span class="text-sm font-medium text-slate-200">Instructions</span>
								<button
									class="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
									type="submit"
									formaction="?/assistTaskWriting"
									formmethod="POST"
									disabled={!createTaskInstructions.trim()}
								>
									Improve with AI
								</button>
							</span>
							<span class="mb-2 block text-xs text-slate-500">
								Uses the current draft and task metadata to rewrite the instructions in place.
							</span>
							<textarea
								bind:value={createTaskInstructions}
								class="textarea min-h-40 text-white placeholder:text-slate-500"
								name="instructions"
								placeholder="Describe the work, expected outcome, and any constraints…"
								required
							></textarea>
							{#if taskWritingAssistSuccess}
								<p
									class="mt-3 rounded-2xl border border-emerald-900/70 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200"
								>
									{taskWritingAssistChangeSummary}
								</p>
							{/if}
						</label>

						<div class="space-y-3">
							<div>
								<p class="text-sm font-medium text-slate-200">Attachments</p>
								<p class="mt-2 max-w-2xl text-sm text-slate-400">
									Attach source files during intake. You can choose multiple files or paste files
									anywhere in this form.
								</p>
							</div>

							<label class="block">
								<span class="sr-only">Attach files</span>
								<input
									bind:this={createTaskAttachmentInput}
									class="file-input w-full border border-slate-700 bg-slate-900 text-slate-100"
									name="attachments"
									type="file"
									multiple
									onchange={syncPendingCreateAttachments}
								/>
							</label>

							<div
								class="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-4 text-sm text-slate-300"
							>
								<p class="font-medium text-white">Paste files into the form to attach them</p>
								<p class="mt-2 text-slate-400">
									Copied screenshots, images, and files are added to the same upload list as the
									file picker.
								</p>
							</div>

							{#if pendingCreateAttachments.length > 0}
								<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
									<div class="flex flex-wrap items-center justify-between gap-3">
										<p class="text-sm font-medium text-white">
											{pendingCreateAttachments.length === 1
												? '1 attachment selected'
												: `${pendingCreateAttachments.length} attachments selected`}
										</p>
										<button
											class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white"
											type="button"
											onclick={clearPendingCreateAttachments}
										>
											Clear
										</button>
									</div>
									<div class="mt-4 space-y-3">
										{#each pendingCreateAttachments as attachment (attachment.id)}
											<div class="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
												<p class="ui-wrap-anywhere font-medium text-white">{attachment.name}</p>
												<p class="mt-2 text-sm text-slate-300">
													{formatAttachmentSize(attachment.sizeBytes)} · {attachment.contentType}
												</p>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>

						<div class="flex flex-wrap items-center gap-3">
							<button
								class="btn preset-filled-primary-500 font-semibold"
								name="submitMode"
								type="submit"
								value="create"
							>
								{createTaskUsesWorkflowTemplate
									? 'Create task set'
									: createTaskFlowMode === 'quick'
										? 'Create quick task'
										: 'Create task'}
							</button>
							{#if !createTaskUsesWorkflowTemplate}
								<button
									class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-100 transition hover:border-sky-700 hover:text-white"
									disabled={Boolean(createTaskLaunchContractBlocker)}
									name="submitMode"
									type="submit"
									value="createAndRun"
								>
									Create and run
								</button>
							{/if}
							<p class="text-sm text-slate-400">
								{createTaskFlowMode === 'quick'
									? createTaskUsesWorkflowTemplate
										? 'This will create the parent task first, then generate the workflow child tasks underneath it.'
										: createTaskLaunchContractBlocker
											? `${createTaskLaunchContractBlocker} Switch to Full task if you need to add routing, approvals, assignment, or execution setup.`
											: 'Quick task keeps the form minimal while still letting you queue work or launch it immediately.'
									: createTaskUsesWorkflowTemplate
										? 'This will create the parent task first, then generate the workflow child tasks underneath it.'
										: createTaskLaunchContractBlocker
											? `${createTaskLaunchContractBlocker} Use Advanced intake to finish the launch contract.`
											: 'Choose a project, name the work clearly, then create a queued task or launch it immediately.'}
							</p>
						</div>
					</div>
				</form>
			</AppDialog>
		{/if}

		{#if isSaveTaskTemplateDialogOpen}
			<AppDialog
				bind:open={isSaveTaskTemplateDialogOpen}
				title="Save task template"
				description="Store the current task defaults so you can reapply them later without re-entering the same fields."
				closeLabel="Close save task template dialog"
			>
				<form
					class="space-y-4"
					method="POST"
					action="?/saveTaskTemplate"
					data-persist-scope="manual"
				>
					<input type="hidden" name="projectId" value={createTaskProjectId} />
					<input type="hidden" name="parentTaskId" value={createTaskParentTaskId} />
					<input type="hidden" name="delegationObjective" value={createTaskDelegationObjective} />
					<input
						type="hidden"
						name="delegationInputContext"
						value={createTaskDelegationInputContext}
					/>
					<input
						type="hidden"
						name="delegationExpectedDeliverable"
						value={createTaskDelegationExpectedDeliverable}
					/>
					<input
						type="hidden"
						name="delegationDoneCondition"
						value={createTaskDelegationDoneCondition}
					/>
					<input
						type="hidden"
						name="delegationIntegrationNotes"
						value={createTaskDelegationIntegrationNotes}
					/>
					<input type="hidden" name="name" value={createTaskName} />
					<input type="hidden" name="instructions" value={createTaskInstructions} />
					<input type="hidden" name="successCriteria" value={createTaskSuccessCriteria} />
					<input type="hidden" name="readyCondition" value={createTaskReadyCondition} />
					<input type="hidden" name="expectedOutcome" value={createTaskExpectedOutcome} />
					<input
						type="hidden"
						name="assigneeExecutionSurfaceId"
						value={createTaskAssigneeExecutionSurfaceId}
					/>
					<input type="hidden" name="targetDate" value={createTaskTargetDate} />
					<input type="hidden" name="goalId" value={createTaskGoalId} />
					<input type="hidden" name="workflowId" value={createTaskWorkflowId} />
					<input type="hidden" name="area" value={createTaskArea} />
					<input type="hidden" name="priority" value={createTaskPriority} />
					<input type="hidden" name="riskLevel" value={createTaskRiskLevel} />
					<input type="hidden" name="approvalMode" value={createTaskApprovalMode} />
					<input
						type="hidden"
						name="requiredThreadSandbox"
						value={createTaskRequiredThreadSandbox}
					/>
					<input
						type="hidden"
						name="requiresReview"
						value={createTaskRequiresReview ? 'true' : 'false'}
					/>
					<input type="hidden" name="desiredRoleId" value={createTaskDesiredRoleId} />
					<input type="hidden" name="blockedReason" value={createTaskBlockedReason} />
					<input
						type="hidden"
						name="requiredPromptSkillNames"
						value={createTaskRequiredPromptSkillNames}
					/>
					<input
						type="hidden"
						name="requiredCapabilityNames"
						value={createTaskRequiredCapabilityNames}
					/>
					<input type="hidden" name="requiredToolNames" value={createTaskRequiredToolNames} />
					<input type="hidden" name="submitMode" value="create" />
					{#each createTaskDependencyTaskIds as dependencyTaskId (dependencyTaskId)}
						<input type="hidden" name="dependencyTaskIds" value={dependencyTaskId} />
					{/each}

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Template name</span>
						<input
							bind:value={saveTaskTemplateName}
							class="input text-white placeholder:text-slate-500"
							name="taskTemplateName"
							placeholder="Research brief"
							required
						/>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200"> Template summary </span>
						<textarea
							bind:value={saveTaskTemplateSummary}
							class="textarea min-h-24 text-white placeholder:text-slate-500"
							name="taskTemplateSummary"
							placeholder="Use this for repeated research requests in the AMS prototype project."
						></textarea>
					</label>

					<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							What gets saved
						</p>
						<p class="mt-2 text-sm text-slate-300">
							Project, goal, workflow, title, instructions, review settings, role defaults,
							execution surface, and execution requirements.
						</p>
						<p class="mt-2 text-sm text-slate-400">
							Runtime details like target date, dependencies, and delegation context stay editable
							per task instance.
						</p>
					</div>

					<div class="flex flex-wrap items-center gap-3">
						<button class="btn preset-filled-primary-500 font-semibold" type="submit">
							Save template
						</button>
						<button
							class="btn border border-slate-700 font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
							type="button"
							onclick={() => {
								isSaveTaskTemplateDialogOpen = false;
							}}
						>
							Cancel
						</button>
					</div>
				</form>
			</AppDialog>
		{/if}
	</div>
</AppPage>
