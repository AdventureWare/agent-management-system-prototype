<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { clearFormDraft, readFormDraft, writeFormDraft } from '$lib/client/form-drafts';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import CollectionToolbar from '$lib/components/CollectionToolbar.svelte';
	import DataTableSection from '$lib/components/DataTableSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import PageTabs from '$lib/components/PageTabs.svelte';
	import SelectionActionBar from '$lib/components/SelectionActionBar.svelte';
	import ThreadActivityIndicator from '$lib/components/ThreadActivityIndicator.svelte';
	import { formatThreadStateLabel } from '$lib/thread-activity';
	import {
		formatTaskApprovalModeLabel,
		formatTaskStatusLabel,
		taskStatusToneClass
	} from '$lib/types/control-plane';
	import type { TaskStaleSignalKey } from '$lib/types/task-work-item';

	let { data, form } = $props();

	let query = $state('');
	let selectedStatus = $state('all');
	let selectedTaskView = $state<'active' | 'completed'>('active');
	let selectedTaskIds = $state.raw<string[]>([]);
	let selectedStaleFilters = $state.raw<TaskStaleSignalKey[]>([]);
	let createTaskAttachmentInput = $state<HTMLInputElement | null>(null);
	let createTaskDraftReady = $state(false);
	let pendingCreateAttachments = $state.raw<
		{ id: string; name: string; sizeBytes: number; contentType: string }[]
	>([]);

	const CREATE_TASK_DRAFT_KEY = 'ams:create-task';

	function createDialogShouldStartOpen() {
		return form?.formContext === 'taskCreate' && !form?.ok;
	}

	let isCreateModalOpen = $state(createDialogShouldStartOpen());

	const STALE_FILTERS = [
		{ key: 'staleInProgress', label: 'Stale in-progress' },
		{ key: 'noRecentRunActivity', label: 'No recent run activity' },
		{ key: 'activeThreadNoRecentOutput', label: 'Active thread, no recent output' }
	] as const;

	let ideationSuccess = $derived(form?.ok && form?.successAction === 'runTaskIdeationAssistant');
	let createSuccess = $derived(form?.ok && form?.successAction === 'createTask');
	let createAndRunSuccess = $derived(form?.ok && form?.successAction === 'createTaskAndRun');
	let createdAttachmentCount = $derived(
		form?.ok && (form?.successAction === 'createTask' || form?.successAction === 'createTaskAndRun')
			? Number(form.attachmentCount ?? 0)
			: 0
	);
	let ideationDraftCreateCount = $derived(
		form?.ok && form?.successAction === 'createDraftTasksFromIdeation'
			? Number(form.createdCount ?? 0)
			: 0
	);
	let ideationDraftCreateSuccess = $derived(ideationDraftCreateCount > 0);
	let deleteCount = $derived.by(() => {
		if (form?.ok && form?.successAction === 'deleteTasks') {
			return Number(form.deletedCount ?? 0);
		}

		return data.deleted ? 1 : 0;
	});
	let deleteSuccess = $derived(deleteCount > 0);

	function compactText(value: string, maxLength = 120) {
		const normalized = value.replace(/\s+/g, ' ').trim();

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
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
		const nextFiles = new Map(
			Array.from(createTaskAttachmentInput?.files ?? []).map((file) => [
				createAttachmentKey(file),
				file
			])
		);

		for (const file of files) {
			if (file.size === 0) {
				continue;
			}

			nextFiles.set(createAttachmentKey(file), file);
		}

		replaceCreateAttachmentFiles([...nextFiles.values()]);
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

	function confidenceClass(confidence: 'high' | 'medium' | 'low') {
		switch (confidence) {
			case 'high':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'medium':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function matchesTask(task: (typeof data.tasks)[number], term: string) {
		const normalizedTerm = term.trim().toLowerCase();

		if (!normalizedTerm) {
			return true;
		}

		return [
			task.title,
			task.summary,
			task.projectName,
			task.assigneeName,
			task.status,
			task.targetDate ?? '',
			formatDateLabel(task.targetDate),
			task.artifactPath,
			...(task.requiredCapabilityNames ?? []),
			...(task.requiredToolNames ?? []),
			...task.attachments.map((attachment) => `${attachment.name} ${attachment.path}`),
			task.statusThread?.name ?? '',
			task.statusThread?.sessionState ?? '',
			task.statusThread ? formatThreadStateLabel(task.statusThread.sessionState) : '',
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

	function staleBadgeLabel(task: (typeof data.tasks)[number], signal: TaskStaleSignalKey) {
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

	function matchesStaleFilters(task: (typeof data.tasks)[number]) {
		if (selectedStaleFilters.length === 0) {
			return true;
		}

		return selectedStaleFilters.some((filterKey) => task.freshness[filterKey]);
	}

	function threadActionLabel(task: (typeof data.tasks)[number]) {
		if (!task.linkThread) {
			return '';
		}

		if (task.statusThread?.id === task.linkThread.id) {
			switch (task.statusThread.sessionState) {
				case 'starting':
				case 'waiting':
				case 'working':
					return 'Open active thread';
			}
		}

		return task.linkThreadKind === 'latest' ? 'Open latest thread' : 'Open assigned thread';
	}

	function isTaskSelected(taskId: string) {
		return selectedTaskIds.includes(taskId);
	}

	function toggleTaskSelection(taskId: string, checked: boolean) {
		if (checked) {
			selectedTaskIds = isTaskSelected(taskId) ? selectedTaskIds : [...selectedTaskIds, taskId];
			return;
		}

		selectedTaskIds = selectedTaskIds.filter((candidate) => candidate !== taskId);
	}

	function setSelectionForRows(rows: (typeof data.tasks)[number][], checked: boolean) {
		const rowIds = rows.map((task) => task.id);
		const rowIdSet = new Set(rowIds);

		if (checked) {
			selectedTaskIds = [...new Set([...selectedTaskIds, ...rowIds])];
			return;
		}

		selectedTaskIds = selectedTaskIds.filter((taskId) => !rowIdSet.has(taskId));
	}

	function areAllRowsSelected(rows: (typeof data.tasks)[number][]) {
		return rows.length > 0 && rows.every((task) => isTaskSelected(task.id));
	}

	function clearSelection() {
		selectedTaskIds = [];
	}

	$effect(() => {
		const visibleTaskIdSet = new Set(
			(selectedTaskView === 'completed' ? completedTasks : activeTasks).map((task) => task.id)
		);
		const nextSelectedTaskIds = selectedTaskIds.filter((taskId) => visibleTaskIdSet.has(taskId));

		if (
			nextSelectedTaskIds.length === selectedTaskIds.length &&
			nextSelectedTaskIds.every((taskId, index) => taskId === selectedTaskIds[index])
		) {
			return;
		}

		selectedTaskIds = nextSelectedTaskIds;
	});

	let filteredTasks = $derived.by(() =>
		data.tasks.filter((task) => {
			if (selectedStatus !== 'all' && task.status !== selectedStatus) {
				return false;
			}

			if (!matchesStaleFilters(task)) {
				return false;
			}

			return matchesTask(task, query);
		})
	);
	let activeTasks = $derived(filteredTasks.filter((task) => task.status !== 'done'));
	let completedTasks = $derived(filteredTasks.filter((task) => task.status === 'done'));
	let visibleTaskRows = $derived(selectedTaskView === 'completed' ? completedTasks : activeTasks);
	let staleTaskCount = $derived(
		data.tasks.filter((task) => task.freshness.staleSignals.length > 0).length
	);
	let staleFilterCounts = $derived.by(() => ({
		staleInProgress: data.tasks.filter((task) => task.freshness.staleInProgress).length,
		noRecentRunActivity: data.tasks.filter((task) => task.freshness.noRecentRunActivity).length,
		activeThreadNoRecentOutput: data.tasks.filter(
			(task) => task.freshness.activeThreadNoRecentOutput
		).length
	}));
	let createTaskFormValues = $derived(
		form?.formContext === 'taskCreate'
			? {
					projectId: form.projectId?.toString() ?? '',
					name: form.name?.toString() ?? '',
					instructions: form.instructions?.toString() ?? '',
					assigneeWorkerId: form.assigneeWorkerId?.toString() ?? '',
					targetDate: form.targetDate?.toString() ?? '',
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
					name: '',
					instructions: '',
					assigneeWorkerId: '',
					targetDate: '',
					requiredCapabilityNames: '',
					requiredToolNames: '',
					submitMode: 'create'
				}
	);
	let createTaskProjectId = $state('');
	let createTaskName = $state('');
	let createTaskInstructions = $state('');
	let createTaskAssigneeWorkerId = $state('');
	let createTaskTargetDate = $state('');
	let createTaskRequiredCapabilityNames = $state('');
	let createTaskRequiredToolNames = $state('');
	let selectedProjectSkillSummary = $derived(
		data.projectSkillSummaries.find((summary) => summary.projectId === createTaskProjectId) ?? null
	);

	$effect(() => {
		if (form?.formContext === 'taskCreate') {
			createTaskProjectId = createTaskFormValues.projectId;
			createTaskName = createTaskFormValues.name;
			createTaskInstructions = createTaskFormValues.instructions;
			createTaskAssigneeWorkerId = createTaskFormValues.assigneeWorkerId;
			createTaskTargetDate = createTaskFormValues.targetDate;
			createTaskRequiredCapabilityNames = createTaskFormValues.requiredCapabilityNames;
			createTaskRequiredToolNames = createTaskFormValues.requiredToolNames;
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

		const savedDraft = readFormDraft<{
			projectId: string;
			name: string;
			instructions: string;
			assigneeWorkerId: string;
			targetDate: string;
			requiredCapabilityNames: string;
			requiredToolNames: string;
		}>(CREATE_TASK_DRAFT_KEY);

		if (savedDraft) {
			createTaskProjectId = savedDraft.projectId ?? '';
			createTaskName = savedDraft.name ?? '';
			createTaskInstructions = savedDraft.instructions ?? '';
			createTaskAssigneeWorkerId = savedDraft.assigneeWorkerId ?? '';
			createTaskTargetDate = savedDraft.targetDate ?? '';
			createTaskRequiredCapabilityNames = savedDraft.requiredCapabilityNames ?? '';
			createTaskRequiredToolNames = savedDraft.requiredToolNames ?? '';
			isCreateModalOpen = true;
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
			name: createTaskName,
			instructions: createTaskInstructions,
			assigneeWorkerId: createTaskAssigneeWorkerId,
			targetDate: createTaskTargetDate,
			requiredCapabilityNames: createTaskRequiredCapabilityNames,
			requiredToolNames: createTaskRequiredToolNames
		});
	});
</script>

{#snippet taskTable(
	title: string,
	description: string,
	rows: (typeof data.tasks)[number][],
	emptyMessage: string
)}
	<DataTableSection
		{title}
		{description}
		summary={`${rows.length} shown`}
		empty={rows.length === 0}
		{emptyMessage}
	>
		<table class="w-full min-w-[980px] divide-y divide-slate-800 text-left">
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
							<div class="min-w-52 space-y-3">
								<span
									class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${taskStatusToneClass(task.status)}`}
								>
									{formatTaskStatusLabel(task.status)}
								</span>
								{#if task.statusThread}
									<div class="rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2">
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
								<a
									class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
									href={resolve(`/app/tasks/${task.id}`)}
								>
									Open task
								</a>
								{#if task.linkThread}
									<a
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
										href={resolve(`/app/sessions/${task.linkThread.id}`)}
									>
										{threadActionLabel(task)}
									</a>
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
	<div class="flex flex-col gap-6 px-6 sm:px-8 xl:px-12 2xl:px-16">
		<PageHeader
			eyebrow="Tasks"
			title="Browse the queue, then open one task"
			description="Tasks should read like an operating queue. Scan by status, search for a specific brief, and use the detail page for editing, launching threads, and deeper execution context."
		>
			{#snippet actions()}
				<button
					class="btn preset-filled-primary-500 font-semibold"
					type="button"
					onclick={() => {
						isCreateModalOpen = true;
					}}
				>
					Add task
				</button>
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
				{#if form?.sessionId}
					<a class="underline" href={resolve(`/app/sessions/${form.sessionId.toString()}`)}>
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
		{:else if ideationSuccess}
			<p
				aria-live="polite"
				class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
			>
				Task ideation queued for {form?.projectName?.toString() || 'the selected project'}.
				{#if form?.sessionId}
					<a class="underline" href={resolve(`/app/sessions/${form.sessionId.toString()}`)}>
						Open thread details
					</a>
					to review the suggested tasks.
				{/if}
			</p>
		{:else if ideationDraftCreateSuccess}
			<p
				aria-live="polite"
				class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
			>
				{ideationDraftCreateCount === 1
					? `1 draft task created for ${form?.projectName?.toString() || 'the selected project'}.`
					: `${ideationDraftCreateCount} draft tasks created for ${form?.projectName?.toString() || 'the selected project'}.`}
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

		<div class="grid gap-3 md:grid-cols-3">
			<MetricCard
				label="Active queue"
				value={activeTasks.length}
				detail="Draft, ready, blocked, review, and in-progress tasks that still need attention."
			/>
			<MetricCard
				label="Completed"
				value={completedTasks.length}
				detail="Finished tasks still available for reference and follow-up."
			/>
			<MetricCard
				label="Stale signals"
				value={staleTaskCount}
				detail="Tasks currently flagged for stale work, quiet threads, or inactive runs."
			/>
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
			<div class="space-y-6">
				<CollectionToolbar
					title="Task index"
					description="Search by task title, summary, project, assignee, or artifact path."
				>
					{#snippet controls()}
						<div class="w-full xl:w-80">
							<label class="sr-only" for="task-search">Search tasks</label>
							<input
								id="task-search"
								bind:value={query}
								class="input text-white placeholder:text-slate-500"
								placeholder="Search tasks…"
							/>
						</div>

						<div class="flex flex-wrap gap-2">
							<button
								class={[
									'inline-flex items-center justify-center rounded-full border px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] uppercase transition',
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
										'inline-flex items-center justify-center rounded-full border px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] uppercase transition',
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

						<div class="flex flex-col gap-2 xl:items-end">
							<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Stale work filters</p>
							<div class="flex flex-wrap gap-2">
								{#each STALE_FILTERS as filter (filter.key)}
									<button
										aria-pressed={selectedStaleFilters.includes(filter.key)}
										class={[
											'inline-flex items-center justify-center rounded-full border px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] uppercase transition',
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
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white"
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
					{/snippet}
				</CollectionToolbar>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
					<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
								Queue views
							</p>
							<p class="mt-2 text-sm text-slate-400">
								Switch between active work that still needs attention and completed work kept for
								reference.
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

				<details class="group card border border-slate-800 bg-slate-950/60 p-6">
					<summary
						class="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
					>
						<div class="space-y-2">
							<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
								Task ideation
							</p>
							<h2 class="text-xl font-semibold text-white">Ideation assistant and saved reviews</h2>
							<p class="max-w-3xl text-sm text-slate-400">
								Keep this collapsed until you need more draft work. Run the assistant or review
								saved suggestions without taking space away from the queue.
							</p>
						</div>
						<div class="flex flex-wrap items-center gap-2 text-xs text-slate-300">
							<span class="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-1">
								{data.ideationReviews.length} saved review{data.ideationReviews.length === 1
									? ''
									: 's'}
							</span>
							<span
								class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 font-medium tracking-[0.14em] uppercase transition group-open:border-sky-400/40 group-open:text-sky-200"
							>
								Expand
							</span>
						</div>
					</summary>

					<div class="mt-6 space-y-6 border-t border-slate-800 pt-6">
						<form
							class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6"
							method="POST"
							action="?/runTaskIdeationAssistant"
						>
							<div class="space-y-2">
								<p class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase">
									Run assistant
								</p>
								<h3 class="text-lg font-semibold text-white">Need more tasks to queue?</h3>
								<p class="text-sm text-slate-400">
									Run a reusable assistant thread that inspects a project, reviews its task history,
									and proposes additional task ideas before you create them manually.
								</p>
							</div>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Project</span>
								<select class="select text-white" name="projectId" required>
									<option value="" disabled selected>Select a project</option>
									{#each data.projects as project (project.id)}
										<option value={project.id}>{project.name}</option>
									{/each}
								</select>
							</label>

							<p
								class="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300"
							>
								The assistant uses the selected project’s configured workspace plus its existing
								tasks, runs, goals, and related project context. If a resumable ideation thread
								already exists, this reuses it instead of starting from scratch.
							</p>

							<button
								class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-200"
								type="submit"
							>
								Run task ideation assistant
							</button>
						</form>

						<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
							<div class="space-y-2">
								<p class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase">
									Saved reviews
								</p>
								<h3 class="text-lg font-semibold text-white">Create drafts from ideation output</h3>
								<p class="text-sm text-slate-400">
									Review each project’s latest ideation reply here, then create only the suggestions
									you want as draft tasks.
								</p>
							</div>

							{#if data.ideationReviews.length === 0}
								<p
									class="mt-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-5 text-sm text-slate-400"
								>
									Run the ideation assistant first. Its latest saved reply will appear here for
									review.
								</p>
							{:else}
								<div class="mt-4 space-y-4">
									{#each data.ideationReviews as review (review.sessionId)}
										<form
											class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
											method="POST"
											action="?/createDraftTasksFromIdeation"
										>
											<input name="sessionId" type="hidden" value={review.sessionId} />

											<div class="flex flex-col gap-3">
												<div
													class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
												>
													<div>
														<h4 class="text-base font-semibold text-white">{review.projectName}</h4>
														<p class="mt-1 text-sm text-slate-400">{review.sessionSummary}</p>
													</div>
													<a
														class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
														href={resolve(`/app/sessions/${review.sessionId}`)}
													>
														Open thread
													</a>
												</div>

												<div class="flex flex-wrap gap-2 text-xs text-slate-300">
													<span
														class="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1"
													>
														{review.suggestionCount} suggestion{review.suggestionCount === 1
															? ''
															: 's'}
													</span>
													<span
														class="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1"
													>
														Last activity {review.lastActivityLabel}
													</span>
													<span
														class="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1"
													>
														Default role {review.defaultDraftRoleName}
													</span>
												</div>

												<p
													class="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300"
												>
													Selected suggestions become <span class="font-medium text-white"
														>In Draft</span
													>
													tasks in <span class="font-medium text-white">{review.projectName}</span>
													with default routing to
													<span class="font-medium text-white"> {review.defaultDraftRoleName}</span>
													{#if review.defaultArtifactPath}
														and artifact path
														<span class="ui-wrap-anywhere font-medium text-white">
															{review.defaultArtifactPath}
														</span>.
													{:else}
														.
													{/if}
												</p>
											</div>

											{#if review.suggestionCount === 0}
												<p
													class="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-4 text-sm text-slate-400"
												>
													{review.hasActiveRun
														? 'The ideation run is still active. Wait for a saved assistant reply, then refresh or reopen this page.'
														: 'The latest saved reply did not match the expected suggestion format. Open the thread to review the raw output.'}
												</p>
											{:else}
												<div class="space-y-3">
													{#each review.suggestions as suggestion (suggestion.index)}
														<label
															class="block rounded-2xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-slate-700"
														>
															<div class="flex items-start gap-3">
																<input
																	class="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
																	name="suggestionIndex"
																	type="checkbox"
																	value={suggestion.index}
																/>
																<div class="min-w-0 flex-1">
																	<div class="flex flex-wrap items-center gap-2">
																		<p class="font-medium text-white">{suggestion.title}</p>
																		<span
																			class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${confidenceClass(suggestion.confidence)}`}
																		>
																			{suggestion.confidence} confidence
																		</span>
																	</div>
																	<p class="mt-2 text-sm text-slate-300">
																		{suggestion.whyItMatters}
																	</p>
																	<div class="mt-3 space-y-2 text-sm">
																		<div>
																			<p
																				class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase"
																			>
																				Draft summary
																			</p>
																			<p class="mt-1 whitespace-pre-wrap text-slate-300">
																				{suggestion.suggestedInstructions}
																			</p>
																		</div>
																		<div>
																			<p
																				class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase"
																			>
																				Signals
																			</p>
																			<p class="mt-1 whitespace-pre-wrap text-slate-400">
																				{suggestion.signals}
																			</p>
																		</div>
																	</div>
																</div>
															</div>
														</label>
													{/each}
												</div>

												<button
													class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-200"
													type="submit"
												>
													Create selected draft tasks
												</button>
											{/if}
										</form>
									{/each}
								</div>
							{/if}
						</section>
					</div>
				</details>
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
					class="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:items-start"
					method="POST"
					action="?/createTask"
					data-persist-scope="manual"
					enctype="multipart/form-data"
					onpaste={handleCreateTaskAttachmentPaste}
				>
					<div class="min-w-0 space-y-4">
						<div class="grid gap-4 md:grid-cols-3">
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

					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
						<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
							Queue snapshot
						</p>
						<h3 class="mt-2 text-lg font-semibold text-white">Create with context</h3>
						<p class="mt-2 text-sm text-slate-300">
							Keep intake lightweight. Create the work item here, then return to the queue or open
							the task detail page for deeper editing and execution controls.
						</p>
						<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
							<MetricCard
								label="Active queue"
								value={activeTasks.length}
								detail="Work still in draft, ready, blocked, review, or in progress."
							/>
							<MetricCard
								label="Completed"
								value={completedTasks.length}
								detail="Finished work kept around for reference and follow-up."
							/>
						</div>
						{#if selectedProjectSkillSummary}
							<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Skills in this workspace
								</p>
								<p class="mt-2 text-sm text-slate-300">
									{selectedProjectSkillSummary.totalCount === 0
										? 'This project currently exposes no installed skills to new task threads.'
										: `${selectedProjectSkillSummary.totalCount} skills available across project-local and global roots.`}
								</p>
							</div>
						{/if}
					</div>
				</form>
			</AppDialog>
		{/if}
	</div>
</AppPage>
