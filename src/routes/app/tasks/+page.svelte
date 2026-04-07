<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { clearFormDraft, readFormDraft, writeFormDraft } from '$lib/client/form-drafts';
	import { agentThreadStore } from '$lib/client/agent-thread-store';
	import { mergeStoredTaskRecord, taskRecordStore } from '$lib/client/task-record-store';
	import { collectTaskLinkedThreads, mergeTaskThreadState } from '$lib/client/task-thread-state';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import DataTableSection from '$lib/components/DataTableSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import PageTabs from '$lib/components/PageTabs.svelte';
	import SelectionActionBar from '$lib/components/SelectionActionBar.svelte';
	import ThreadActivityIndicator from '$lib/components/ThreadActivityIndicator.svelte';
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

	let query = $state('');
	let selectedStatus = $state('all');
	let selectedTaskView = $state<'active' | 'completed'>('active');
	let selectedTaskIds = $state.raw<string[]>([]);
	let selectedStaleFilters = $state.raw<TaskStaleSignalKey[]>([]);
	let createTaskAttachmentInput = $state<HTMLInputElement | null>(null);
	let createTaskDraftReady = $state(false);
	let createTaskAdvancedOpen = $state(false);
	let pendingCreateAttachments = $state.raw<
		{ id: string; name: string; sizeBytes: number; contentType: string }[]
	>([]);

	const CREATE_TASK_DRAFT_KEY = 'ams:create-task';
	const threadStoreState = fromStore(agentThreadStore);
	const taskRecordState = fromStore(taskRecordStore);

	function createDialogShouldStartOpen() {
		return (
			(form?.formContext === 'taskCreate' && !form?.ok) || data.createTaskPrefill?.open === true
		);
	}

	let isCreateModalOpen = $state(createDialogShouldStartOpen());

	const STALE_FILTERS = [
		{ key: 'staleInProgress', label: 'Stale WIP' },
		{ key: 'noRecentRunActivity', label: 'Quiet run' },
		{ key: 'activeThreadNoRecentOutput', label: 'Quiet thread' }
	] as const;

	let createSuccess = $derived(form?.ok && form?.successAction === 'createTask');
	let createAndRunSuccess = $derived(form?.ok && form?.successAction === 'createTaskAndRun');
	let createdAttachmentCount = $derived(
		form?.ok && (form?.successAction === 'createTask' || form?.successAction === 'createTaskAndRun')
			? Number(form.attachmentCount ?? 0)
			: 0
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

	$effect(() => {
		taskRecordStore.seedTasks(data.tasks);
		agentThreadStore.seedThreads(
			data.tasks.flatMap((task) => collectTaskLinkedThreads(task)),
			{ replace: false }
		);
	});

	function compactText(value: string, maxLength = 120) {
		const normalized = value.replace(/\s+/g, ' ').trim();

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
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

	function formatAttachmentSize(sizeBytes: number) {
		if (sizeBytes < 1024) {
			return `${sizeBytes} B`;
		}

		if (sizeBytes < 1024 * 1024) {
			return `${(sizeBytes / 1024).toFixed(1)} KB`;
		}

		return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
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
			task.assigneeName,
			task.desiredRoleName,
			task.status,
			task.targetDate ?? '',
			formatDateLabel(task.targetDate),
			task.artifactPath,
			task.blockedReason,
			...task.dependencyTaskNames,
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

	function toggleStaleFilter(filterKey: TaskStaleSignalKey) {
		selectedStaleFilters = selectedStaleFilters.includes(filterKey)
			? selectedStaleFilters.filter((candidate) => candidate !== filterKey)
			: [...selectedStaleFilters, filterKey];
	}

	function matchesStaleFilters(task: TaskRow) {
		if (selectedStaleFilters.length === 0) {
			return true;
		}

		return selectedStaleFilters.some((filterKey) => task.freshness[filterKey]);
	}

	function threadActionLabel(task: TaskRow) {
		if (!task.linkThread) {
			return '';
		}

		if (task.statusThread?.id === task.linkThread.id) {
			switch (task.statusThread.threadState ?? task.statusThread.threadState) {
				case 'starting':
				case 'waiting':
				case 'working':
					return 'Open active thread';
			}
		}

		return task.linkThreadKind === 'latest' ? 'Open latest thread' : 'Open assigned thread';
	}

	function isTaskSelected(taskId: string) {
		return selectedTaskIdSet.has(taskId);
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

	let taskCollections = $derived.by(() => {
		const filteredTasks: TaskRow[] = [];
		const activeTasks: TaskRow[] = [];
		const completedTasks: TaskRow[] = [];
		let staleTaskCount = 0;
		const staleFilterCounts = {
			staleInProgress: 0,
			noRecentRunActivity: 0,
			activeThreadNoRecentOutput: 0
		};

		for (const task of tasks) {
			if (task.freshness.staleSignals.length > 0) {
				staleTaskCount += 1;
			}

			if (task.freshness.staleInProgress) {
				staleFilterCounts.staleInProgress += 1;
			}

			if (task.freshness.noRecentRunActivity) {
				staleFilterCounts.noRecentRunActivity += 1;
			}

			if (task.freshness.activeThreadNoRecentOutput) {
				staleFilterCounts.activeThreadNoRecentOutput += 1;
			}

			if (selectedStatus !== 'all' && task.status !== selectedStatus) {
				continue;
			}

			if (!matchesStaleFilters(task) || !matchesTask(task, query)) {
				continue;
			}

			filteredTasks.push(task);

			if (task.status === 'done') {
				completedTasks.push(task);
				continue;
			}

			activeTasks.push(task);
		}

		return {
			filteredTasks,
			activeTasks,
			completedTasks,
			visibleTaskRows: selectedTaskView === 'completed' ? completedTasks : activeTasks,
			staleTaskCount,
			staleFilterCounts
		};
	});
	let filteredTasks = $derived(taskCollections.filteredTasks);
	let activeTasks = $derived(taskCollections.activeTasks);
	let completedTasks = $derived(taskCollections.completedTasks);
	let visibleTaskRows = $derived(taskCollections.visibleTaskRows);
	let visibleTaskRowIdSet = $derived(new Set(visibleTaskRows.map((task) => task.id)));
	let staleTaskCount = $derived(taskCollections.staleTaskCount);
	let staleFilterCounts = $derived(taskCollections.staleFilterCounts);

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
					assigneeWorkerId: form.assigneeWorkerId?.toString() ?? '',
					targetDate: form.targetDate?.toString() ?? '',
					goalId: form.goalId?.toString() ?? '',
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
					assigneeWorkerId: '',
					targetDate: '',
					goalId: '',
					area: 'product',
					priority: 'medium',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiredThreadSandbox: '',
					requiresReview: true,
					desiredRoleId: '',
					blockedReason: '',
					dependencyTaskIds: [],
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
	let createTaskAssigneeWorkerId = $state('');
	let createTaskTargetDate = $state('');
	let createTaskGoalId = $state('');
	let createTaskArea = $state('product');
	let createTaskPriority = $state('medium');
	let createTaskRiskLevel = $state('medium');
	let createTaskApprovalMode = $state('none');
	let createTaskRequiredThreadSandbox = $state<'' | AgentSandbox>('');
	let createTaskRequiresReview = $state(true);
	let createTaskDesiredRoleId = $state('');
	let createTaskBlockedReason = $state('');
	let createTaskDependencyTaskIds = $state.raw<string[]>([]);
	let createTaskRequiredCapabilityNames = $state('');
	let createTaskRequiredToolNames = $state('');
	let selectedProjectSkillSummary = $derived(
		data.projectSkillSummaries.find((summary) => summary.projectId === createTaskProjectId) ?? null
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
	let createTaskDesiredRoleName = $derived(
		data.roles.find((role) => role.id === createTaskDesiredRoleId)?.name ?? createTaskDesiredRoleId
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

	function toggleCreateTaskDependency(taskId: string, checked: boolean) {
		createTaskDependencyTaskIds = checked
			? [...new Set([...createTaskDependencyTaskIds, taskId])]
			: createTaskDependencyTaskIds.filter((candidateId) => candidateId !== taskId);
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
					assigneeWorkerId?: string;
					targetDate?: string;
					goalId?: string;
					area?: string;
					priority?: string;
					riskLevel?: string;
					approvalMode?: string;
					requiredThreadSandbox?: string;
					requiresReview?: boolean;
					desiredRoleId?: string;
					blockedReason?: string;
					dependencyTaskIds?: string[];
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
			Boolean(draft.assigneeWorkerId?.trim()) ||
			Boolean(draft.targetDate?.trim()) ||
			Boolean(draft.goalId?.trim()) ||
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
		createTaskAssigneeWorkerId = prefill?.assigneeWorkerId ?? '';
		createTaskTargetDate = prefill?.targetDate ?? '';
		createTaskGoalId = prefill?.goalId ?? '';
		createTaskArea = (prefill as { area?: string } | null | undefined)?.area ?? 'product';
		createTaskPriority = prefill?.priority ?? 'medium';
		createTaskRiskLevel = prefill?.riskLevel ?? 'medium';
		createTaskApprovalMode = prefill?.approvalMode ?? 'none';
		createTaskRequiredThreadSandbox = normalizeSandboxValue(prefill?.requiredThreadSandbox);
		createTaskRequiresReview = prefill?.requiresReview ?? true;
		createTaskDesiredRoleId = prefill?.desiredRoleId ?? '';
		createTaskBlockedReason = prefill?.blockedReason ?? '';
		createTaskDependencyTaskIds = prefill?.dependencyTaskIds ?? [];
		createTaskRequiredCapabilityNames = prefill?.requiredCapabilityNames ?? '';
		createTaskRequiredToolNames = prefill?.requiredToolNames ?? '';
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
	}

	function resetCreateTaskMetadata() {
		createTaskParentTaskId = '';
		createTaskDelegationObjective = '';
		createTaskDelegationInputContext = '';
		createTaskDelegationExpectedDeliverable = '';
		createTaskDelegationDoneCondition = '';
		createTaskDelegationIntegrationNotes = '';
		createTaskGoalId = '';
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
		createTaskAdvancedOpen = false;
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
			createTaskAssigneeWorkerId = createTaskFormValues.assigneeWorkerId;
			createTaskTargetDate = createTaskFormValues.targetDate;
			createTaskGoalId = createTaskFormValues.goalId;
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
			createTaskRequiredCapabilityNames = createTaskFormValues.requiredCapabilityNames;
			createTaskRequiredToolNames = createTaskFormValues.requiredToolNames;
			syncCreateTaskAdvancedOpen(createTaskFormValues);
			return;
		}

		if (createTaskDraftReady && !createTaskProjectId && data.projects.length === 1) {
			createTaskProjectId = data.projects[0]?.id ?? '';
		}
	});

	onMount(() => {
		if (createSuccess || createAndRunSuccess) {
			clearFormDraft(CREATE_TASK_DRAFT_KEY);
			createTaskDraftReady = true;
			return;
		}

		if (form?.formContext === 'taskCreate') {
			createTaskDraftReady = true;
			return;
		}

		if (data.createTaskPrefill?.open) {
			applyCreateTaskPrefill(data.createTaskPrefill);
			createTaskDraftReady = true;
			isCreateModalOpen = true;
			return;
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
			assigneeWorkerId: string;
			targetDate: string;
			goalId: string;
			area: string;
			priority: string;
			riskLevel: string;
			approvalMode: string;
			requiredThreadSandbox: string;
			requiresReview: boolean;
			desiredRoleId: string;
			blockedReason: string;
			dependencyTaskIds: string[];
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
			createTaskAssigneeWorkerId = savedDraft.assigneeWorkerId ?? '';
			createTaskTargetDate = savedDraft.targetDate ?? '';
			createTaskGoalId = savedDraft.goalId ?? '';
			createTaskArea = savedDraft.area ?? 'product';
			createTaskPriority = savedDraft.priority ?? 'medium';
			createTaskRiskLevel = savedDraft.riskLevel ?? 'medium';
			createTaskApprovalMode = savedDraft.approvalMode ?? 'none';
			createTaskRequiredThreadSandbox = normalizeSandboxValue(savedDraft.requiredThreadSandbox);
			createTaskRequiresReview = savedDraft.requiresReview ?? true;
			createTaskDesiredRoleId = savedDraft.desiredRoleId ?? '';
			createTaskBlockedReason = savedDraft.blockedReason ?? '';
			createTaskDependencyTaskIds = savedDraft.dependencyTaskIds ?? [];
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
			isCreateModalOpen = true;
		} else if (savedDraft) {
			clearFormDraft(CREATE_TASK_DRAFT_KEY);
		}

		createTaskDraftReady = true;
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
			assigneeWorkerId: createTaskAssigneeWorkerId,
			targetDate: createTaskTargetDate,
			goalId: createTaskGoalId,
			area: createTaskArea === 'product' ? '' : createTaskArea,
			priority: createTaskPriority === 'medium' ? '' : createTaskPriority,
			riskLevel: createTaskRiskLevel === 'medium' ? '' : createTaskRiskLevel,
			approvalMode: createTaskApprovalMode === 'none' ? '' : createTaskApprovalMode,
			requiredThreadSandbox: createTaskRequiredThreadSandbox,
			requiresReview: createTaskRequiresReview ? undefined : false,
			desiredRoleId: createTaskDesiredRoleId,
			blockedReason: createTaskBlockedReason,
			dependencyTaskIds: createTaskDependencyTaskIds,
			requiredCapabilityNames: createTaskRequiredCapabilityNames,
			requiredToolNames: createTaskRequiredToolNames
		});
	});
</script>

{#snippet taskTable(title: string, description: string, rows: TaskRow[], emptyMessage: string)}
	<DataTableSection
		{title}
		{description}
		summary={`${rows.length} shown`}
		empty={rows.length === 0}
		{emptyMessage}
	>
		<div class="space-y-3 lg:hidden">
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
								type="checkbox"
								onchange={(event) => {
									toggleTaskSelection(task.id, event.currentTarget.checked);
								}}
							/>
						</label>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="ui-wrap-anywhere text-base font-semibold text-white">{task.title}</p>
									<p class="ui-clamp-3 mt-2 text-sm text-slate-400">
										{compactText(task.summary, 180)}
									</p>
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
										{formatTaskApprovalModeLabel(task.approvalMode)}
									</span>
								{/if}
								{#if !task.requiresReview}
									<span
										class="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
									>
										Review optional
									</span>
								{/if}
								{#if task.desiredRoleId}
									<span
										class="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
									>
										Role {task.desiredRoleName}
									</span>
								{/if}
								{#if task.openReview}
									<span
										class="inline-flex items-center justify-center rounded-full border border-amber-900/70 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
									>
										Review open
									</span>
								{/if}
								{#if task.pendingApproval}
									<span
										class="inline-flex items-center justify-center rounded-full border border-amber-900/70 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
									>
										Approval {formatTaskApprovalModeLabel(task.pendingApproval.mode)}
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

							{#if task.statusThread}
								<div class="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-3">
									<ThreadActivityIndicator compact thread={task.statusThread} />
								</div>
							{/if}

							<div class="mt-3 grid gap-3 sm:grid-cols-2">
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Project</p>
									<p class="ui-wrap-anywhere mt-2 text-sm text-white">{task.projectName}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Assignee</p>
									<p class="ui-wrap-anywhere mt-2 text-sm text-white">{task.assigneeName}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Runs</p>
									<p class="mt-2 text-sm text-white">{task.runCount}</p>
									{#if task.statusThread}
										<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">
											{task.statusThread.name}
										</p>
									{/if}
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Updated</p>
									<p class="mt-2 text-sm text-white">{task.updatedAtLabel}</p>
									<p class="mt-1 text-xs text-slate-500">
										{new Date(task.updatedAt).toLocaleString()}
									</p>
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
							{#if task.targetDate}
								<p class="mt-2 text-xs text-slate-500">Target {formatDateLabel(task.targetDate)}</p>
							{/if}

							<div class="mt-4 flex flex-col gap-2 sm:flex-row">
								<AppButton
									class="w-full sm:w-auto"
									href={resolve(`/app/tasks/${task.id}`)}
									size="sm"
									variant="accent"
								>
									Open task
								</AppButton>
								{#if task.linkThread}
									<AppButton
										class="w-full sm:w-auto"
										href={resolve(`/app/threads/${task.linkThread.id}`)}
										size="sm"
										variant="accent"
										reserveLabel="Open assigned thread"
									>
										{threadActionLabel(task)}
									</AppButton>
								{/if}
							</div>
						</div>
					</div>
				</article>
			{/each}
		</div>

		<table class="hidden w-full min-w-[980px] divide-y divide-slate-800 text-left lg:table">
			<thead class="text-xs tracking-[0.16em] text-slate-500 uppercase">
				<tr>
					<th class="px-3 py-3 font-medium">
						<label class="flex items-center justify-center">
							<span class="sr-only">Select all shown tasks</span>
							<input
								checked={areAllRowsSelected(rows)}
								class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
								type="checkbox"
								onchange={(event) => {
									setSelectionForRows(rows, event.currentTarget.checked);
								}}
							/>
						</label>
					</th>
					<th class="px-3 py-3 font-medium">Task</th>
					<th class="px-3 py-3 font-medium">Project</th>
					<th class="px-3 py-3 font-medium">Status</th>
					<th class="px-3 py-3 font-medium">Assignee</th>
					<th class="px-3 py-3 font-medium">Runs</th>
					<th class="px-3 py-3 font-medium">Updated</th>
					<th class="px-3 py-3 font-medium">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-900/80">
				{#each rows as task (task.id)}
					<tr class="bg-slate-950/30 transition hover:bg-slate-900/60">
						<td class="px-3 py-3 align-top">
							<label class="flex items-center justify-center">
								<span class="sr-only">Select {task.title}</span>
								<input
									checked={isTaskSelected(task.id)}
									class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
									type="checkbox"
									onchange={(event) => {
										toggleTaskSelection(task.id, event.currentTarget.checked);
									}}
								/>
							</label>
						</td>
						<td class="px-3 py-3 align-top">
							<div class="max-w-sm min-w-0">
								<p class="ui-clamp-2 font-medium text-white">{task.title}</p>
								<p class="ui-clamp-3 mt-1 text-sm text-slate-400">
									{compactText(task.summary)}
								</p>
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
											{formatTaskApprovalModeLabel(task.approvalMode)}
										</span>
									{/if}
									{#if !task.requiresReview}
										<span
											class="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
										>
											Review optional
										</span>
									{/if}
									{#if task.desiredRoleId}
										<span
											class="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
										>
											Role {task.desiredRoleName}
										</span>
									{/if}
									{#if task.openReview}
										<span
											class="inline-flex items-center justify-center rounded-full border border-amber-900/70 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
										>
											Review open
										</span>
									{/if}
									{#if task.pendingApproval}
										<span
											class="inline-flex items-center justify-center rounded-full border border-amber-900/70 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
										>
											Approval {formatTaskApprovalModeLabel(task.pendingApproval.mode)}
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
								{#if task.targetDate}
									<p class="mt-2 text-xs text-slate-500">
										Target {formatDateLabel(task.targetDate)}
									</p>
								{/if}
							</div>
						</td>
						<td class="px-3 py-3 align-top text-sm text-slate-300">
							<p class="ui-clamp-3 max-w-40">{task.projectName}</p>
						</td>
						<td class="px-3 py-3 align-top">
							<div class="min-w-52 space-y-2.5">
								<span
									class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${taskStatusToneClass(task.status)}`}
								>
									{formatTaskStatusLabel(task.status)}
								</span>
								{#if task.statusThread}
									<div
										class="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2"
									>
										<ThreadActivityIndicator compact thread={task.statusThread} />
									</div>
								{/if}
							</div>
						</td>
						<td class="px-3 py-3 align-top text-sm text-slate-300">
							<p class="ui-clamp-3 max-w-40">{task.assigneeName}</p>
						</td>
						<td class="px-3 py-3 align-top">
							<p class="text-sm text-white">{task.runCount}</p>
							{#if task.statusThread}
								<p class="ui-clamp-3 mt-1 max-w-40 text-xs text-slate-500">
									{task.statusThread.name}
								</p>
							{/if}
						</td>
						<td class="px-3 py-3 align-top">
							<p class="text-sm text-white">{task.updatedAtLabel}</p>
							<p class="mt-1 text-xs text-slate-500">
								{new Date(task.updatedAt).toLocaleString()}
							</p>
						</td>
						<td class="px-3 py-3 align-top">
							<div class="flex min-w-40 flex-col items-start gap-2">
								<AppButton href={resolve(`/app/tasks/${task.id}`)} size="sm" variant="accent">
									Open task
								</AppButton>
								{#if task.linkThread}
									<AppButton
										href={resolve(`/app/threads/${task.linkThread.id}`)}
										size="sm"
										variant="accent"
										reserveLabel="Open assigned thread"
									>
										{threadActionLabel(task)}
									</AppButton>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</DataTableSection>
{/snippet}

<AppPage width="full" class="min-w-0">
	<div class="flex flex-col gap-4 px-1 sm:gap-5 sm:px-2 xl:px-4 2xl:px-8">
		<PageHeader
			density="compact"
			eyebrow="Tasks"
			title="Browse the queue, then open one task"
			description="Scan, filter, and open a task. Use the detail page for editing, launches, and deeper execution context."
		>
			{#snippet actions()}
				<AppButton
					class="w-full sm:w-auto"
					type="button"
					variant="primary"
					onclick={() => {
						resetCreateTaskMetadata();
						isCreateModalOpen = true;
					}}
				>
					Add task
				</AppButton>
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
		{:else if deleteSuccess}
			<p
				aria-live="polite"
				class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
			>
				{deleteCount === 1
					? 'Task deleted and removed from the queue.'
					: `${deleteCount} tasks deleted and removed from the queue.`}
			</p>
		{/if}

		<div class="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
			<MetricCard density="compact" label="Active queue" value={activeTasks.length} />
			<MetricCard density="compact" label="Completed" value={completedTasks.length} />
			<MetricCard density="compact" label="Stale signals" value={staleTaskCount} />
		</div>

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
							<div class="min-w-0">
								<h2 class="text-lg font-semibold text-white">Task index</h2>
							</div>

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

						<div class="flex flex-col gap-1.5 xl:flex-row xl:items-center xl:justify-between">
							<p class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase">
								Stale work filters
							</p>
							<div class="flex flex-wrap gap-2 xl:justify-end">
								{#each STALE_FILTERS as filter (filter.key)}
									<button
										aria-pressed={selectedStaleFilters.includes(filter.key)}
										class={[
											'inline-flex items-center justify-center rounded-full border px-2.5 py-1.5 text-center text-[0.6875rem] leading-none font-medium tracking-[0.14em] uppercase transition',
											selectedStaleFilters.includes(filter.key)
												? 'border-sky-400/40 bg-sky-400 text-slate-950'
												: 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
										]}
										type="button"
										onclick={() => {
											toggleStaleFilter(filter.key);
										}}
									>
										{filter.label} ({staleFilterCounts[filter.key]})
									</button>
								{/each}
								{#if selectedStaleFilters.length > 0}
									<button
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2.5 py-1.5 text-center text-[0.6875rem] leading-none font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white"
										type="button"
										onclick={() => {
											selectedStaleFilters = [];
										}}
									>
										Clear stale filters
									</button>
								{/if}
							</div>
						</div>
					</div>
				</section>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
					<div class="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<p class="text-[0.6875rem] font-semibold tracking-[0.2em] text-slate-500 uppercase">
								Queue views
							</p>
						</div>
						<PageTabs
							ariaLabel="Task list views"
							bind:value={selectedTaskView}
							items={[
								{ id: 'active', label: 'Active queue', badge: activeTasks.length },
								{ id: 'completed', label: 'Completed work', badge: completedTasks.length }
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
					{@render taskTable(
						selectedTaskView === 'completed' ? 'Completed work' : 'Active queue',
						selectedTaskView === 'completed'
							? 'Finished tasks kept here for reference and thread follow-up.'
							: 'Draft, ready, in-progress, review, and blocked work that still needs attention.',
						visibleTaskRows,
						selectedTaskView === 'completed'
							? 'No completed tasks match the current filters.'
							: 'No active tasks match the current filters.'
					)}
				</div>
			</div>
		{/if}

		{#if data.projects.length > 0 && isCreateModalOpen}
			<AppDialog
				bind:open={isCreateModalOpen}
				title="Create task"
				description="Create a new work item without taking focus away from the queue. Editing, launch controls, and deeper execution history stay on the task detail page after creation."
				closeLabel="Close create task dialog"
				bodyClass="p-0"
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

						<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
								<input
									class="input text-white placeholder:text-slate-500"
									bind:value={createTaskName}
									name="name"
									placeholder="Build the first task creation flow…"
									required
								/>
							</label>

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
								<span class="mb-2 block text-sm font-medium text-slate-200">Target date</span>
								<input
									class="input text-white"
									bind:value={createTaskTargetDate}
									name="targetDate"
									type="date"
								/>
							</label>
						</div>

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

						<div class="grid gap-4 md:grid-cols-1">
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Assign to worker</span>
								<select
									bind:value={createTaskAssigneeWorkerId}
									class="select text-white"
									name="assigneeWorkerId"
								>
									<option value="">Leave unassigned</option>
									{#each data.workers as worker (worker.id)}
										<option value={worker.id}>{worker.name}</option>
									{/each}
								</select>
							</label>
						</div>

						<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="max-w-2xl">
									<p class="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
										Advanced intake
									</p>
									<p class="mt-2 text-sm text-white">
										Set routing, approvals, blockers, and dependencies when this task needs more
										than the default quick-create path.
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
									{createTaskAdvancedOpen ? 'Hide advanced' : 'Show advanced'}
								</button>
							</div>

							{#if createTaskAdvancedOpen}
								<div class="mt-5 space-y-4">
									<input type="hidden" name="area" value={createTaskArea} />

									<div class="grid gap-4 lg:grid-cols-3">
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

									<div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
										<label class="block">
											<span class="mb-2 block text-sm font-medium text-slate-200">Priority</span>
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
											<span class="mb-2 block text-sm font-medium text-slate-200">Risk level</span>
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
											<span class="mb-2 block text-sm font-medium text-slate-200"
												>Approval mode</span
											>
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
												Required sandbox
											</span>
											<select
												bind:value={createTaskRequiredThreadSandbox}
												class="select text-white"
												name="requiredThreadSandbox"
											>
												<option value="">Inherit worker and project defaults</option>
												{#each AGENT_SANDBOX_OPTIONS as sandbox (sandbox)}
													<option value={sandbox}>{formatAgentSandboxLabel(sandbox)}</option>
												{/each}
											</select>
											<span class="mt-2 block text-xs text-slate-500">
												Use this when the task needs a specific sandbox for its first work thread.
											</span>
										</label>

										<label class="block">
											<span class="mb-2 block text-sm font-medium text-slate-200"
												>Requires review</span
											>
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

									<div class="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
										<label class="block">
											<span class="mb-2 block text-sm font-medium text-slate-200">Desired role</span
											>
											<select
												bind:value={createTaskDesiredRoleId}
												class="select text-white"
												name="desiredRoleId"
											>
												<option value="">No role preference</option>
												{#if createTaskDesiredRoleId && !data.roles.some((role) => role.id === createTaskDesiredRoleId)}
													<option value={createTaskDesiredRoleId}>
														{createTaskDesiredRoleName} (missing role)
													</option>
												{/if}
												{#each data.roles as role (role.id)}
													<option value={role.id}>{role.name}</option>
												{/each}
											</select>
											<span class="mt-2 block text-xs text-slate-500">
												Use this when the task should route toward a role before a worker is
												assigned.
											</span>
										</label>

										<label class="block">
											<span class="mb-2 block text-sm font-medium text-slate-200"
												>Blocker notes</span
											>
											<textarea
												bind:value={createTaskBlockedReason}
												class="textarea min-h-28 text-white placeholder:text-slate-500"
												name="blockedReason"
												placeholder="Document the blocker, missing approval, or dependency holding this task."
											></textarea>
											<span class="mt-2 block text-xs text-slate-500">
												Record the current blocker explicitly instead of relying on status alone.
											</span>
										</label>
									</div>

									<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
										<div class="flex flex-wrap items-center justify-between gap-3">
											<div>
												<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
													Dependencies
												</p>
												<p class="mt-2 text-sm text-slate-400">
													Select tasks that must be cleared before this one should move.
												</p>
											</div>
											<span
												class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
											>
												{createTaskDependencyCount} selected
											</span>
										</div>

										{#if data.availableDependencyTasks.length === 0}
											<p class="mt-4 text-sm text-slate-500">
												No other tasks are available to use as dependencies yet.
											</p>
										{:else}
											<div class="mt-4 grid gap-3 xl:grid-cols-2">
												{#each data.availableDependencyTasks as dependency (dependency.id)}
													<label
														class={`rounded-2xl border p-3 transition ${
															createTaskDependencyTaskIds.includes(dependency.id)
																? 'border-sky-800/70 bg-sky-950/20'
																: 'border-slate-800 bg-slate-900/60'
														}`}
													>
														<div class="flex items-start gap-3">
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
															<div class="min-w-0">
																<p class="ui-wrap-anywhere text-sm font-medium text-white">
																	{dependency.title}
																</p>
																<p class="mt-1 text-xs text-slate-400">
																	{dependency.projectName} · {formatTaskStatusLabel(
																		dependency.status
																	)}
																</p>
															</div>
														</div>
													</label>
												{/each}
											</div>
										{/if}
									</div>
								</div>
							{/if}
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
								/>
								<span class="mt-2 block text-xs text-slate-500">
									Comma-separated abilities the task needs, regardless of who does it.
								</span>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Required tools</span>
								<input
									bind:value={createTaskRequiredToolNames}
									class="input text-white placeholder:text-slate-500"
									name="requiredToolNames"
									placeholder="codex, playwright"
								/>
								<span class="mt-2 block text-xs text-slate-500">
									Comma-separated tools or execution surfaces needed for this work.
								</span>
							</label>
						</div>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Instructions</span>
							<textarea
								bind:value={createTaskInstructions}
								class="textarea min-h-40 text-white placeholder:text-slate-500"
								name="instructions"
								placeholder="Describe the work, expected outcome, and any constraints…"
								required
							></textarea>
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
								Create task
							</button>
							<button
								class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-100 transition hover:border-sky-700 hover:text-white"
								name="submitMode"
								type="submit"
								value="createAndRun"
							>
								Create and run
							</button>
							<p class="text-sm text-slate-400">
								Choose a project, name the work clearly, then create a queued task or launch it
								immediately.
							</p>
						</div>
					</div>
				</form>
			</AppDialog>
		{/if}
	</div>
</AppPage>
