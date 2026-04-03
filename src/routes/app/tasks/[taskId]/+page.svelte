<script lang="ts">
	import { resolve } from '$app/paths';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import ArtifactBrowser from '$lib/components/ArtifactBrowser.svelte';
	import DetailFactCard from '$lib/components/DetailFactCard.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import PageTabs from '$lib/components/PageTabs.svelte';
	import ThreadActivityIndicator from '$lib/components/ThreadActivityIndicator.svelte';
	import { formatThreadStateLabel } from '$lib/thread-activity';
	import { uniqueTopicLabels } from '$lib/topic-labels';
	import {
		PRIORITY_OPTIONS,
		TASK_APPROVAL_MODE_OPTIONS,
		TASK_RISK_LEVEL_OPTIONS,
		approvalStatusToneClass,
		formatPriorityLabel,
		formatDecisionTypeLabel,
		formatReviewStatusLabel,
		formatRunStatusLabel,
		formatTaskApprovalModeLabel,
		formatTaskRiskLevelLabel,
		formatTaskStatusLabel,
		reviewStatusToneClass,
		runStatusToneClass,
		taskStatusToneClass
	} from '$lib/types/control-plane';

	let { data, form } = $props();

	let updateSuccess = $derived(form?.ok && form?.successAction === 'updateTask');
	let attachSuccess = $derived(form?.ok && form?.successAction === 'attachTaskFile');
	let removeAttachmentSuccess = $derived(
		form?.ok && form?.successAction === 'removeTaskAttachment'
	);
	let threadAssignSuccess = $derived(form?.ok && form?.successAction === 'updateTaskThread');
	let launchSuccess = $derived(form?.ok && form?.successAction === 'launchTaskSession');
	let recoverSuccess = $derived(form?.ok && form?.successAction === 'recoverTaskSession');
	let showAllCandidateThreads = $state(false);
	let visibleCandidateThreads = $derived(
		showAllCandidateThreads ? data.candidateThreads : data.candidateThreads.slice(0, 3)
	);
	let visibleAssignmentSuggestions = $derived(data.assignmentSuggestions.slice(0, 4));
	let governanceSuccessMessage = $derived.by(() => {
		switch (form?.successAction) {
			case 'approveReview':
				return 'Review approved.';
			case 'requestChanges':
				return 'Changes requested and task moved back into attention.';
			case 'approveApproval':
				return 'Approval granted.';
			case 'rejectApproval':
				return 'Approval rejected and task blocked.';
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
					return 'governance';
				case 'attachTaskFile':
				case 'removeTaskAttachment':
					return 'resources';
				default:
					return 'resources';
			}
		})()
	);
	let governanceSignalCount = $derived(
		(data.task.openReview ? 1 : 0) + (data.task.pendingApproval ? 1 : 0)
	);
	let taskTitleExpanded = $state(false);
	let taskInstructionsExpanded = $state(false);
	let taskTitleNeedsClamp = $derived(data.task.title.trim().length > 140);
	let taskInstructionsNeedClamp = $derived(data.task.summary.trim().length > 360);

	function threadActionLabel() {
		if (!data.task.linkThread) {
			return '';
		}

		if (data.task.statusThread?.id === data.task.linkThread.id) {
			switch (data.task.statusThread.sessionState) {
				case 'starting':
				case 'waiting':
				case 'working':
					return 'Open active thread';
			}
		}

		return data.task.linkThreadKind === 'latest' ? 'Open latest thread' : 'Open assigned thread';
	}

	function compactText(value: string, maxLength = 320) {
		const normalized = value.replace(/\s+/g, ' ').trim();

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
	}

	function formatDateLabel(value: string | null | undefined) {
		if (!value) {
			return 'Not set';
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

	function matchedContextSummary(thread: {
		matchedContext?: {
			projectLabels?: string[];
			goalLabels?: string[];
			laneLabels?: string[];
			focusLabels?: string[];
			entityLabels?: string[];
			roleLabels?: string[];
			capabilityLabels?: string[];
			toolLabels?: string[];
			keywordLabels?: string[];
			labels?: string[];
		};
	}) {
		const match = thread.matchedContext;

		if (!match) {
			return [];
		}

		return [
			...(match.projectLabels ?? []),
			...(match.goalLabels ?? []),
			...(match.laneLabels ?? []),
			...(match.focusLabels ?? []),
			...(match.entityLabels ?? []),
			...(match.roleLabels ?? []),
			...(match.capabilityLabels ?? []),
			...(match.toolLabels ?? []),
			...(match.keywordLabels ?? [])
		].filter(
			(label, index, labels) =>
				labels.findIndex((candidate) => candidate.toLowerCase() === label.toLowerCase()) === index
		);
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

	function assignmentSuggestionClass(eligible: boolean) {
		return eligible
			? 'border-emerald-900/70 bg-emerald-950/30'
			: 'border-slate-800 bg-slate-950/70';
	}

	function createFollowUpTaskInstructions() {
		return [
			`Create a follow-up task related to "${data.task.title}".`,
			`Current task summary:\n${compactText(data.task.summary, 420)}`
		].join('\n\n');
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

<AppPage width="full">
	<DetailHeader
		backHref={resolve('/app/tasks')}
		backLabel="Back to tasks"
		eyebrow="Task detail"
		title={data.task.title}
		description={data.task.summary}
		titleClass={taskTitleExpanded ? '' : 'ui-clamp-3'}
		descriptionClass={taskInstructionsExpanded ? '' : 'ui-clamp-5'}
	>
		{#snippet actions()}
			<div class="flex w-full flex-wrap gap-3 lg:w-auto lg:justify-end">
				<form method="GET" action={resolve('/app/tasks')}>
					<input type="hidden" name="create" value="1" />
					<input type="hidden" name="projectId" value={data.task.projectId} />
					<input type="hidden" name="name" value={`Follow-up: ${data.task.title}`} />
					<input type="hidden" name="instructions" value={createFollowUpTaskInstructions()} />
					<AppButton type="submit" variant="accent">Create follow-up task</AppButton>
				</form>
				<AppButton type="submit" variant="neutral" form="task-update-form">Save changes</AppButton>
				<AppButton
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
				{#if data.task.linkThread}
					<AppButton
						href={resolve(`/app/threads/${data.task.linkThread.id}`)}
						variant="accent"
						reserveLabel="Open assigned thread"
					>
						{threadActionLabel()}
					</AppButton>
				{/if}
			</div>
		{/snippet}
		{#snippet meta()}
			<div class="flex flex-wrap items-center gap-3">
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(data.task.status)}`}
				>
					{formatTaskStatusLabel(data.task.status)}
				</span>
				<span class="text-sm text-slate-500">Updated {data.task.updatedAtLabel}</span>
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

	<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
		<DetailFactCard
			label="Project"
			value={data.task.projectName}
			href={data.project ? resolve(`/app/projects/${data.project.id}`) : undefined}
			hrefLabel={data.project ? 'Open project details' : undefined}
			class="card border border-slate-800 bg-slate-950/70 p-4"
			labelClass="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase"
			valueClass="ui-wrap-anywhere mt-3 text-lg font-semibold text-white"
		/>
		<DetailFactCard
			label="Assignee"
			value={data.task.assigneeName}
			detail={`Desired role: ${data.task.desiredRoleName || data.task.desiredRoleId || 'Not set'}`}
			class="card border border-slate-800 bg-slate-950/70 p-4"
			labelClass="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase"
			valueClass="ui-wrap-anywhere mt-3 text-lg font-semibold text-white"
			detailClass="ui-wrap-anywhere mt-2 text-sm text-slate-400"
		/>
		<DetailFactCard
			label="Runs recorded"
			value={data.task.runCount}
			detail={`Updated ${data.task.updatedAtLabel}`}
			class="card border border-slate-800 bg-slate-950/70 p-4"
			labelClass="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase"
			valueClass="mt-3 text-3xl font-semibold text-white"
			detailClass="mt-2 text-sm text-slate-400"
		/>
		<DetailFactCard
			label="Target date"
			value={formatDateLabel(data.task.targetDate)}
			detail={data.task.targetDate
				? `Scheduled for ${data.task.targetDate}`
				: 'Set a task-level target date to make queue timing visible.'}
			class="card border border-slate-800 bg-slate-950/70 p-4"
			labelClass="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase"
			valueClass="mt-3 text-lg font-semibold text-white"
			detailClass="mt-2 text-sm text-slate-400"
		/>
		<DetailFactCard
			label="Thread access"
			class="card border border-slate-800 bg-slate-950/70 p-4"
			labelClass="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase"
		>
			{#if data.task.linkThread}
				<div class="mt-1 flex flex-wrap items-center gap-3">
					<AppButton
						href={resolve(`/app/threads/${data.task.linkThread.id}`)}
						size="sm"
						variant="accent"
						reserveLabel="Open assigned thread"
					>
						{threadActionLabel()}
					</AppButton>
					<p class="ui-wrap-anywhere text-sm font-medium text-white">
						{data.task.linkThread.name}
					</p>
				</div>
				{#if data.task.statusThread}
					<div class="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2">
						<ThreadActivityIndicator compact thread={data.task.statusThread} />
					</div>
				{/if}
				{#if data.task.linkThread.id !== data.task.statusThread?.id}
					<p class="mt-2 text-xs text-slate-500">
						{formatThreadStateLabel(data.task.linkThread.sessionState)}
					</p>
				{/if}
			{:else}
				<p class="mt-1 text-lg font-semibold text-white">None yet</p>
				<p class="mt-2 text-sm text-slate-400">
					Launch the task to create a thread, or assign an existing thread below.
				</p>
			{/if}
		</DetailFactCard>
	</div>

	<section class="card border border-slate-800 bg-slate-950/70 px-5 py-4">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Skill access</p>
				<p class="mt-2 text-sm text-white">
					{data.availableSkills.totalCount === 0
						? 'No installed skills were discovered for this task workspace yet.'
						: `${data.availableSkills.totalCount} installed skill${data.availableSkills.totalCount === 1 ? '' : 's'} are available to new task threads.`}
				</p>
				<p class="mt-1 text-sm text-slate-400">
					{data.availableSkills.projectCount} project-local · {data.availableSkills.globalCount}
					global
				</p>
			</div>

			{#if data.availableSkills.previewSkills.length > 0}
				<div class="flex flex-wrap gap-2 lg:max-w-2xl lg:justify-end">
					{#each data.availableSkills.previewSkills as skill (skill.id)}
						<span
							class="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-200"
							title={skill.description || undefined}
						>
							{skill.id}
							<span class="text-slate-500"> · {skill.sourceLabel}</span>
						</span>
					{/each}
				</div>
			{/if}
		</div>
	</section>

	{#if form?.message}
		<p
			aria-live="polite"
			class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
		>
			{form.message}
		</p>
	{/if}

	{#if updateSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Task updates saved.
		</p>
	{:else if attachSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			File attached to the task.
		</p>
	{:else if removeAttachmentSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Attachment removed from the task.
		</p>
	{:else if threadAssignSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Thread assignment updated.
		</p>
	{:else if launchSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Task queued in its work thread.
			{#if form?.sessionId}
				<a class="underline" href={resolve(`/app/threads/${form.sessionId.toString()}`)}>
					Open thread details
				</a>
				to review the queued work.
			{/if}
		</p>
	{:else if recoverSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Recovered the stalled run and queued fresh work.
			{#if form?.sessionId}
				<a class="underline" href={resolve(`/app/threads/${form.sessionId.toString()}`)}>
					Open thread details
				</a>
				to review the recovered work.
			{/if}
		</p>
	{:else if governanceSuccessMessage}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			{governanceSuccessMessage}
		</p>
	{/if}

	{#if runTaskDisabled}
		<section class="card border border-sky-900/50 bg-sky-950/25 px-5 py-4">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<p class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase">
						Run availability
					</p>
					<p class="mt-2 text-sm font-medium text-sky-100">{runTaskDisabledTitle}</p>
					<p class="mt-1 text-sm text-sky-100/80">{runTaskDisabledMessage}</p>
					{#if data.stalledRecovery?.eligible}
						<div class="mt-4 rounded-2xl border border-amber-900/50 bg-amber-950/25 px-4 py-3">
							<p class="text-xs font-semibold tracking-[0.16em] text-amber-300 uppercase">
								Stalled recovery
							</p>
							<p class="mt-2 text-sm font-medium text-amber-100">
								{data.stalledRecovery.headline}
							</p>
							<p class="mt-1 text-sm text-amber-100/80">{data.stalledRecovery.detail}</p>
						</div>
					{/if}
				</div>
				<div class="flex flex-col gap-3 sm:items-end">
					{#if taskHasActiveRun && data.task.linkThread}
						<a
							class="inline-flex items-center justify-center rounded-full border border-sky-800/60 px-4 py-2 text-sm font-medium text-sky-200 transition hover:border-sky-500/60 hover:text-sky-100"
							href={resolve(`/app/threads/${data.task.linkThread.id}`)}
						>
							{threadActionLabel() || 'Open current work thread'}
						</a>
					{/if}
					{#if data.stalledRecovery?.eligible}
						<button
							class="inline-flex items-center justify-center rounded-full border border-amber-700/70 bg-amber-950/40 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-500/60 hover:text-white"
							type="submit"
							form="task-update-form"
							formaction="?/recoverTaskSession"
						>
							Recover stalled run
						</button>
					{/if}
				</div>
			</div>
		</section>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
		<form id="task-update-form" method="POST" action="?/updateTask">
			<DetailSection
				id="task-configuration"
				eyebrow="Task details"
				title="Edit task brief and execution settings"
				description="Keep the collection page lightweight. Use this page to edit the task itself."
				bodyClass="space-y-6"
			>
				<section class="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5">
					<div class="space-y-2">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Task brief
						</p>
						<h3 class="text-lg font-semibold text-white">Core task definition</h3>
						<p class="text-sm text-slate-400">
							Set the title and worker-facing instructions that define the task itself.
						</p>
					</div>

					<div class="mt-5 space-y-4">
						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
							<input class="input text-white" name="name" required value={data.task.title} />
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Instructions</span>
							<textarea class="textarea min-h-40 text-white" name="instructions" required
								>{data.task.summary}</textarea
							>
						</label>
					</div>
				</section>

				<section class="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5">
					<div class="space-y-2">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Execution settings
						</p>
						<h3 class="text-lg font-semibold text-white">Project, status, and assignment</h3>
						<p class="text-sm text-slate-400">
							Choose where the task belongs, what state it is in, and who should pick it up.
						</p>
					</div>

					<div
						class="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_220px]"
					>
						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Project</span>
							<select class="select text-white" name="projectId" required>
								{#each data.projects as project (project.id)}
									<option value={project.id} selected={data.task.projectId === project.id}>
										{project.name}
									</option>
								{/each}
							</select>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Goal</span>
							<select class="select text-white" name="goalId">
								<option value="" selected={!data.task.goalId}>No goal linked</option>
								{#each data.goals as goal (goal.id)}
									<option value={goal.id} selected={data.task.goalId === goal.id}>
										{goal.label}
									</option>
								{/each}
							</select>
							<p class="mt-2 text-xs text-slate-500">
								{#if data.goals.length === 0}
									Create a goal first if this task should roll up to a broader outcome.
								{:else}
									This is the canonical task-to-goal link used by goal detail and hierarchy views.
								{/if}
							</p>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
							<select class="select text-white" name="status">
								{#each data.statusOptions as status (status)}
									<option value={status} selected={data.task.status === status}>
										{formatTaskStatusLabel(status)}
									</option>
								{/each}
							</select>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Target date</span>
							<input
								class="input text-white"
								name="targetDate"
								type="date"
								value={data.task.targetDate ?? ''}
							/>
						</label>
					</div>

					<label class="mt-4 block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Assigned worker</span>
						<select class="select text-white" name="assigneeWorkerId">
							<option value="" selected={!data.task.assigneeWorkerId}>Unassigned</option>
							{#each data.workers as worker (worker.id)}
								<option value={worker.id} selected={data.task.assigneeWorkerId === worker.id}>
									{worker.name}
								</option>
							{/each}
						</select>
					</label>

					<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Assignment suggestions
								</p>
								<p class="mt-2 text-sm text-slate-400">
									Workers are ranked by requirement fit, role match, current status, and open
									assigned load.
								</p>
							</div>
							<p class="text-xs text-slate-500">
								{data.assignmentSuggestions.filter((suggestion) => suggestion.eligible).length} fit current
								requirements
							</p>
						</div>

						<div class="mt-4 space-y-3">
							{#each visibleAssignmentSuggestions as suggestion (suggestion.workerId)}
								<div
									class={`rounded-2xl border p-3 ${assignmentSuggestionClass(suggestion.eligible)}`}
								>
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-2">
												<p class="font-medium text-white">{suggestion.workerName}</p>
												{#if suggestion.eligible}
													<span
														class="rounded-full border border-emerald-900/70 bg-emerald-950/40 px-2 py-1 text-[0.7rem] text-emerald-200"
													>
														Matches requirements
													</span>
												{:else}
													<span
														class="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[0.7rem] text-slate-300"
													>
														Needs adjustment
													</span>
												{/if}
												{#if suggestion.isCurrentAssignee}
													<span
														class="rounded-full border border-sky-900/70 bg-sky-950/40 px-2 py-1 text-[0.7rem] text-sky-200"
													>
														Current assignee
													</span>
												{/if}
											</div>
											<p class="mt-1 text-xs text-slate-400">
												{suggestion.roleName} · {suggestion.providerName} · {suggestion.status}
											</p>
										</div>
										<p class="text-xs text-slate-500">
											{suggestion.assignedOpenTaskCount} open assigned task(s)
										</p>
									</div>

									{#if suggestion.missingCapabilityNames.length > 0 || suggestion.missingToolNames.length > 0}
										<div class="mt-3 space-y-2 text-xs text-slate-300">
											{#if suggestion.missingCapabilityNames.length > 0}
												<p>
													Missing capabilities: {suggestion.missingCapabilityNames.join(', ')}
												</p>
											{/if}
											{#if suggestion.missingToolNames.length > 0}
												<p>Missing tools: {suggestion.missingToolNames.join(', ')}</p>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>

					<div class="mt-4 grid gap-4 lg:grid-cols-2">
						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">
								Required capabilities
							</span>
							<input
								class="input text-white"
								name="requiredCapabilityNames"
								placeholder="research, svelte, ios"
								value={(data.task.requiredCapabilityNames ?? []).join(', ')}
							/>
							<p class="mt-2 text-xs text-slate-500">
								Use a comma-separated list for capabilities or skills the task needs.
							</p>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Required tools</span>
							<input
								class="input text-white"
								name="requiredToolNames"
								placeholder="codex, xcodebuild"
								value={(data.task.requiredToolNames ?? []).join(', ')}
							/>
							<p class="mt-2 text-xs text-slate-500">
								Use a comma-separated list for tools or runtimes the task must use.
							</p>
						</label>
					</div>
				</section>

				<section class="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5">
					<input type="hidden" name="dependencyTaskSelection" value="true" />

					<div class="space-y-2">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Routing and governance
						</p>
						<h3 class="text-lg font-semibold text-white">Queue priority, gates, and blockers</h3>
						<p class="text-sm text-slate-400">
							Use the detail page to manage the full task model without bloating the quick-create
							flow.
						</p>
					</div>

					<div class="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Priority</span>
							<select class="select text-white" name="priority">
								{#each PRIORITY_OPTIONS as priority (priority)}
									<option value={priority} selected={data.task.priority === priority}>
										{formatPriorityLabel(priority)}
									</option>
								{/each}
							</select>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Risk level</span>
							<select class="select text-white" name="riskLevel">
								{#each TASK_RISK_LEVEL_OPTIONS as riskLevel (riskLevel)}
									<option value={riskLevel} selected={data.task.riskLevel === riskLevel}>
										{formatTaskRiskLevelLabel(riskLevel)}
									</option>
								{/each}
							</select>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Approval mode</span>
							<select class="select text-white" name="approvalMode">
								{#each TASK_APPROVAL_MODE_OPTIONS as approvalMode (approvalMode)}
									<option value={approvalMode} selected={data.task.approvalMode === approvalMode}>
										{formatTaskApprovalModeLabel(approvalMode)}
									</option>
								{/each}
							</select>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Requires review</span>
							<select class="select text-white" name="requiresReview">
								<option value="true" selected={data.task.requiresReview}>Yes</option>
								<option value="false" selected={!data.task.requiresReview}>No</option>
							</select>
						</label>
					</div>

					<div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Desired role</span>
							<select class="select text-white" name="desiredRoleId">
								<option value="" selected={!data.task.desiredRoleId}>No role preference</option>
								{#if data.task.desiredRoleId && !(data.roles ?? []).some((role) => role.id === data.task.desiredRoleId)}
									<option value={data.task.desiredRoleId} selected>
										{data.task.desiredRoleName || data.task.desiredRoleId} (missing role)
									</option>
								{/if}
								{#each data.roles ?? [] as role (role.id)}
									<option value={role.id} selected={data.task.desiredRoleId === role.id}>
										{role.name}
									</option>
								{/each}
							</select>
							<p class="mt-2 text-xs text-slate-500">
								Use this when the task should route toward a role even before a worker is assigned.
							</p>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Blocked reason</span>
							<textarea
								class="textarea min-h-28 text-white"
								name="blockedReason"
								placeholder="Document the blocker, missing approval, or dependency holding this task."
								>{data.task.blockedReason}</textarea
							>
							<p class="mt-2 text-xs text-slate-500">
								Record the current blocker explicitly instead of relying on status alone.
							</p>
						</label>
					</div>

					<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Dependencies
								</p>
								<p class="mt-2 text-sm text-slate-400">
									Select the tasks that must be unblocked or completed before this one can move.
								</p>
							</div>
							<span
								class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
							>
								{data.dependencyTasks.length} selected
							</span>
						</div>

						{#if (data.availableDependencyTasks ?? []).length === 0}
							<p class="mt-4 text-sm text-slate-500">
								No other tasks are available to use as dependencies yet.
							</p>
						{:else}
							<div class="mt-4 grid gap-3 xl:grid-cols-2">
								{#each data.availableDependencyTasks ?? [] as dependency (dependency.id)}
									<label
										class={`rounded-2xl border p-3 transition ${
											dependency.isSelected
												? 'border-sky-800/70 bg-sky-950/20'
												: 'border-slate-800 bg-slate-900/60'
										}`}
									>
										<div class="flex items-start gap-3">
											<input
												checked={dependency.isSelected}
												class="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
												name="dependencyTaskIds"
												type="checkbox"
												value={dependency.id}
											/>
											<div class="min-w-0">
												<p class="ui-wrap-anywhere text-sm font-medium text-white">
													{dependency.title}
												</p>
												<p class="mt-1 text-xs text-slate-400">
													{dependency.projectName} · {formatTaskStatusLabel(dependency.status)}
												</p>
											</div>
										</div>
									</label>
								{/each}
							</div>
						{/if}
					</div>
				</section>

				<section class="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5">
					<div class="space-y-2">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Task metadata
						</p>
						<h3 class="text-lg font-semibold text-white">Reference information</h3>
						<p class="text-sm text-slate-400">
							Keep this context visible while editing without mixing it into the main form fields.
						</p>
					</div>

					<div class="mt-5 grid gap-4 sm:grid-cols-2">
						<DetailFactCard
							label="Created"
							value={new Date(data.task.createdAt).toLocaleString()}
							class="rounded-2xl p-4 text-sm text-slate-300"
							valueClass="mt-2 text-sm text-slate-300"
						/>
						<DetailFactCard
							label="Artifact path"
							value={data.task.artifactPath || 'Not set'}
							class="rounded-2xl p-4 text-sm text-slate-300"
							valueClass="ui-wrap-anywhere mt-2 text-sm text-slate-300"
						/>
					</div>

					<div class="mt-4 grid gap-4 sm:grid-cols-2">
						<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Routing summary
							</p>
							<div class="mt-3 space-y-2 text-sm text-slate-300">
								<p>Priority: {formatPriorityLabel(data.task.priority)}</p>
								<p>Risk level: {formatTaskRiskLevelLabel(data.task.riskLevel)}</p>
								<p>Approval mode: {formatTaskApprovalModeLabel(data.task.approvalMode)}</p>
								<p>Requires review: {data.task.requiresReview ? 'Yes' : 'No'}</p>
							</div>
						</div>

						<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Desired role
							</p>
							<p class="mt-2 text-sm text-slate-300">
								{data.task.desiredRoleName || data.task.desiredRoleId || 'No role preference'}
							</p>
						</div>
					</div>

					<div class="mt-4 grid gap-4 sm:grid-cols-2">
						<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Required capabilities
							</p>
							{#if (data.task.requiredCapabilityNames ?? []).length === 0}
								<p class="mt-2 text-sm text-slate-400">No capability requirements recorded.</p>
							{:else}
								<div class="mt-3 flex flex-wrap gap-2">
									{#each data.task.requiredCapabilityNames ?? [] as capability (capability)}
										<span
											class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
										>
											{capability}
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Required tools
							</p>
							{#if (data.task.requiredToolNames ?? []).length === 0}
								<p class="mt-2 text-sm text-slate-400">No tool requirements recorded.</p>
							{:else}
								<div class="mt-3 flex flex-wrap gap-2">
									{#each data.task.requiredToolNames ?? [] as tool (tool)}
										<span
											class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
										>
											{tool}
										</span>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</section>

				<div class="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5">
					<div class="space-y-2">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Save behavior
						</p>
						<h3 class="text-lg font-semibold text-white">Actions stay in the page header</h3>
						<p class="text-sm text-slate-400">
							Save changes or run the task from the top of the page so you do not need to scroll
							back to find the primary controls after editing.
						</p>
					</div>
				</div>
			</DetailSection>
		</form>

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
				<div
					id="task-detail-panel-resources"
					role="tabpanel"
					aria-labelledby="task-detail-tab-resources"
				>
					<DetailSection
						id="resources"
						eyebrow="Resources"
						title="Files, uploads, and task outputs"
						description="Keep source material and generated artifacts together so the task can be reviewed from one place."
						bodyClass="divide-y divide-slate-800/90 p-0"
					>
						<div class="px-6 py-6">
							<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
								Attachments
							</p>
							<h3 class="mt-2 text-xl font-semibold text-white">Attached files</h3>
							<p class="mt-2 max-w-2xl text-sm text-slate-400">
								Upload supporting files for this task. Files are stored under the task artifact area
								so the worker thread and human reviewer can reference the same source material.
							</p>

							<form
								class="mt-5 space-y-4"
								method="POST"
								action="?/attachTaskFile"
								enctype="multipart/form-data"
							>
								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Choose file</span>
									<input
										class="file-input w-full border border-slate-700 bg-slate-900 text-slate-100"
										name="attachment"
										type="file"
										required
									/>
								</label>

								<div
									class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300"
								>
									<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
										Storage root
									</p>
									<p class="ui-wrap-anywhere mt-2">{data.attachmentRoot || 'Not configured'}</p>
								</div>

								<button
									class="btn border border-slate-700 font-semibold text-slate-100"
									type="submit"
								>
									Attach file
								</button>
							</form>

							<div class="mt-5 space-y-4">
								{#if data.task.attachments.length === 0}
									<p
										class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
									>
										No files are attached to this task yet. Upload one above when the worker or
										reviewer needs shared source material.
									</p>
								{:else}
									{#each data.task.attachments as attachment (attachment.id)}
										<article class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
											<div class="flex flex-wrap items-start justify-between gap-3">
												<div class="min-w-0">
													<p class="ui-wrap-anywhere font-medium text-white">{attachment.name}</p>
													<p class="mt-2 text-sm text-slate-300">
														{formatAttachmentSize(attachment.sizeBytes)} · {attachment.contentType ||
															'Unknown type'}
													</p>
													<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">
														{attachment.path}
													</p>
													<p class="mt-2 text-xs text-slate-500">
														Attached {new Date(attachment.attachedAt).toLocaleString()}
													</p>
												</div>
												<div class="flex flex-col gap-2 sm:items-end">
													<a
														class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
														href={resolve(
															`/api/tasks/${data.task.id}/attachments/${attachment.id}`
														)}
													>
														Download
													</a>
													<form method="POST" action="?/removeTaskAttachment">
														<input type="hidden" name="attachmentId" value={attachment.id} />
														<button
															class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-rose-400/40 hover:text-rose-200"
															type="submit"
														>
															Detach
														</button>
													</form>
												</div>
											</div>
										</article>
									{/each}
								{/if}
							</div>
						</div>

						<div class="px-6 py-6">
							<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
								Artifact root
							</p>
							<h3 class="mt-2 text-xl font-semibold text-white">Browse task outputs</h3>
							<p class="mt-2 max-w-2xl text-sm text-slate-400">
								Review the task artifact root directly instead of relying on the raw path alone.
								Attached files remain linked through the existing task download route.
							</p>

							<div class="mt-5">
								<ArtifactBrowser
									browser={data.artifactBrowser}
									emptyLabel="No files or folders are present under this task root yet. Run the task or attach a file if you expected outputs here."
								/>
							</div>
						</div>
					</DetailSection>
				</div>
			{:else if selectedDetailPanel === 'execution'}
				<div
					id="task-detail-panel-execution"
					role="tabpanel"
					aria-labelledby="task-detail-tab-execution"
				>
					<DetailSection
						id="execution"
						eyebrow="Execution"
						title="Thread continuity and run history"
						description="Manage where work continues and review how this task has executed over time."
						tone="sky"
						bodyClass="divide-y divide-slate-800/90 p-0"
					>
						<div class="px-6 py-6">
							<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
								Published knowledge
							</p>
							<h3 class="mt-2 text-xl font-semibold text-white">
								Guidance retrieved for the next launch
							</h3>
							<p class="mt-2 max-w-2xl text-sm text-slate-400">
								These published lessons are matched against the current task and injected into new
								launch prompts from this page.
							</p>

							{#if (data.retrievedKnowledgeItems ?? []).length === 0}
								<p class="mt-5 text-sm text-slate-500">
									No published knowledge currently matches this task. Publish a knowledge item from
									the improvements queue when you identify a reusable lesson.
								</p>
							{:else}
								<div class="mt-5 space-y-3">
									{#each data.retrievedKnowledgeItems ?? [] as knowledgeItem (knowledgeItem.id)}
										<article class="rounded-2xl border border-sky-900/40 bg-sky-950/15 p-4">
											<div class="flex flex-wrap items-center gap-2">
												<p class="text-sm font-medium text-white">{knowledgeItem.title}</p>
												<span
													class="badge border border-sky-800/60 bg-sky-950/40 text-[0.65rem] tracking-[0.16em] text-sky-200 uppercase"
												>
													Score {knowledgeItem.matchScore}
												</span>
											</div>
											<p class="mt-2 text-sm text-slate-300">{knowledgeItem.summary}</p>
											<div class="mt-4 grid gap-4 lg:grid-cols-2">
												<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
													<p
														class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase"
													>
														Trigger pattern
													</p>
													<p class="mt-2 text-sm text-slate-300">{knowledgeItem.triggerPattern}</p>
												</div>
												<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
													<p
														class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase"
													>
														Recommended response
													</p>
													<p class="mt-2 text-sm text-slate-300">
														{knowledgeItem.recommendedResponse}
													</p>
												</div>
											</div>
											{#if knowledgeItem.matchReasons.length > 0}
												<p class="mt-3 text-xs text-sky-200">
													{knowledgeItem.matchReasons.join(' ')}
												</p>
											{/if}
										</article>
									{/each}
								</div>
							{/if}
						</div>

						<div class="px-6 py-6">
							<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
								Thread continuity
							</p>
							<h3 class="mt-2 text-xl font-semibold text-white">
								Assign this task to a work thread
							</h3>
							<p class="mt-2 max-w-2xl text-sm text-slate-400">
								A work thread is reusable context. Assign this task to an existing thread when you
								want follow-up work to continue in the same conversation instead of creating a fresh
								one.
							</p>

							{#if data.suggestedThread && data.suggestedThread.id !== data.task.threadSessionId}
								<div class="mt-5 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4">
									<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
										<div class="min-w-0">
											<p class="text-xs font-semibold tracking-[0.16em] text-emerald-300 uppercase">
												Suggested available thread
											</p>
											<p class="thread-name-clamp mt-2 text-sm font-medium text-white">
												{data.suggestedThread.name}
											</p>
											{#if uniqueTopicLabels(data.suggestedThread.topicLabels).length > 0}
												<div class="mt-3 flex flex-wrap gap-2">
													{#each uniqueTopicLabels(data.suggestedThread.topicLabels) as topicLabel (topicLabel)}
														<span
															class="badge border border-emerald-900/60 bg-emerald-950/30 text-[0.65rem] tracking-[0.16em] text-emerald-100 uppercase"
														>
															{topicLabel}
														</span>
													{/each}
												</div>
											{/if}
											{#if matchedContextSummary(data.suggestedThread).length > 0}
												<div class="mt-3">
													<p class="text-[11px] tracking-[0.16em] text-emerald-300 uppercase">
														Shared context
													</p>
													<div class="mt-2 flex flex-wrap gap-2">
														{#each matchedContextSummary(data.suggestedThread) as label (label)}
															<span
																class="badge border border-emerald-900/60 bg-emerald-950/20 text-[0.65rem] tracking-[0.16em] text-emerald-100 uppercase"
															>
																{label}
															</span>
														{/each}
													</div>
												</div>
											{/if}
											<p class="mt-2 text-sm text-emerald-100/90">
												{data.suggestedThread.suggestionReason}
											</p>
											<p class="mt-2 text-xs text-slate-400">
												{formatThreadStateLabel(data.suggestedThread.sessionState)} · Available to resume
											</p>
										</div>

										<div class="flex flex-col gap-2 sm:items-end">
											<form method="POST" action="?/updateTaskThread">
												<input
													type="hidden"
													name="threadSessionId"
													value={data.suggestedThread.id}
												/>
												<button
													class="rounded-full border border-emerald-700/70 bg-emerald-950/40 px-3 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200 uppercase transition hover:border-emerald-500/60 hover:text-emerald-100"
													type="submit"
												>
													Assign suggested thread
												</button>
											</form>
											<a
												class="text-sm text-sky-300 transition hover:text-sky-200"
												href={resolve(`/app/threads/${data.suggestedThread.id}`)}
											>
												Open thread
											</a>
										</div>
									</div>
								</div>
							{/if}

							<form class="mt-5 space-y-4" method="POST" action="?/updateTaskThread">
								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Assigned thread</span>
									<select class="select text-white" name="threadSessionId">
										<option value="" selected={!data.task.threadSessionId}>
											Create a new thread when this task runs
										</option>
										{#each data.candidateThreads as thread (thread.id)}
											<option value={thread.id} selected={data.task.threadSessionId === thread.id}>
												{thread.isSuggested ? 'Suggested · ' : ''}{thread.name} ·
												{formatThreadStateLabel(thread.sessionState)} ·
												{thread.canResume
													? 'ready'
													: thread.hasActiveRun
														? 'busy'
														: 'blocked'}{thread.topicLabels?.length
													? ` · ${thread.topicLabels.join(', ')}`
													: ''}
											</option>
										{/each}
									</select>
								</label>
								<p class="text-sm text-slate-400">
									Leave the task unassigned if the next run should start a new thread from scratch.
								</p>

								<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<button
										class="btn border border-slate-700 font-semibold text-slate-100"
										type="submit"
									>
										Save thread assignment
									</button>
									{#if data.task.linkThread}
										<a
											class="text-sm text-sky-300 transition hover:text-sky-200"
											href={resolve(`/app/threads/${data.task.linkThread.id}`)}
										>
											{threadActionLabel()}
										</a>
									{/if}
								</div>
							</form>

							{#if data.candidateThreads.length > 0}
								<div class="mt-5 space-y-3">
									{#each visibleCandidateThreads as thread (thread.id)}
										<div class="relative rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
											<a
												class="absolute top-4 right-4 text-sm text-sky-300 transition hover:text-sky-200"
												href={resolve(`/app/threads/${thread.id}`)}
											>
												Open thread
											</a>
											<div class="min-w-0 pr-28">
												<div class="flex flex-wrap items-center gap-2">
													<p class="thread-name-clamp text-sm font-medium text-white">
														{thread.name}
													</p>
													{#if thread.isSuggested}
														<span
															class="badge border border-emerald-800/70 bg-emerald-950/40 text-[0.65rem] tracking-[0.18em] text-emerald-200 uppercase"
														>
															Suggested
														</span>
													{/if}
												</div>
												<p class="mt-1 text-xs text-slate-500">
													{formatThreadStateLabel(thread.sessionState)} ·
													{thread.canResume
														? 'Can resume'
														: thread.hasActiveRun
															? 'Busy'
															: 'Blocked'}
												</p>
											</div>
											{#if uniqueTopicLabels(thread.topicLabels).length > 0}
												<div class="mt-3 flex flex-wrap gap-2">
													{#each uniqueTopicLabels(thread.topicLabels) as topicLabel (topicLabel)}
														<span
															class="badge border border-sky-900/50 bg-sky-950/30 text-[0.65rem] tracking-[0.16em] text-sky-200 uppercase"
														>
															{topicLabel}
														</span>
													{/each}
												</div>
											{/if}
											{#if matchedContextSummary(thread).length > 0}
												<div class="mt-3">
													<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
														Shared context
													</p>
													<div class="mt-2 flex flex-wrap gap-2">
														{#each matchedContextSummary(thread) as label (label)}
															<span
																class="badge border border-emerald-900/40 bg-emerald-950/10 text-[0.65rem] tracking-[0.16em] text-emerald-200 uppercase"
															>
																{label}
															</span>
														{/each}
													</div>
												</div>
											{/if}
											{#if thread.previewText}
												<p class="thread-preview-clamp mt-3 text-sm leading-6 text-slate-300">
													{compactText(thread.previewText)}
												</p>
											{/if}
											{#if thread.isSuggested && thread.suggestionReason}
												<p class="mt-3 text-xs font-medium text-emerald-200">
													{thread.suggestionReason}
												</p>
											{/if}
											<p class="ui-wrap-anywhere mt-3 text-xs text-slate-400">
												{thread.relatedTasks.length > 0
													? `Related tasks: ${thread.relatedTasks.map((task) => task.title).join(', ')}`
													: 'No tasks linked yet.'}
											</p>
										</div>
									{/each}
								</div>
								{#if data.candidateThreads.length > 3}
									<button
										class="mt-4 text-sm text-sky-300 transition hover:text-sky-200"
										type="button"
										onclick={() => {
											showAllCandidateThreads = !showAllCandidateThreads;
										}}
									>
										{showAllCandidateThreads
											? 'Show fewer threads'
											: `See more threads (${data.candidateThreads.length - 3} more)`}
									</button>
								{/if}
							{:else}
								<p class="mt-5 text-sm text-slate-500">
									No reusable threads match this project context yet. Start the task once to create
									a fresh thread, or revisit this panel after related work has accumulated.
								</p>
							{/if}
						</div>

						<div class="px-6 py-6">
							<div class="flex items-start justify-between gap-3">
								<div>
									<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
										Run history
									</p>
									<h3 class="mt-2 text-xl font-semibold text-white">Execution timeline</h3>
								</div>
								<a
									class="rounded-full border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
									href={resolve('/app/runs')}
								>
									Open runs
								</a>
							</div>

							<div class="mt-5 space-y-4">
								{#if data.relatedRuns.length === 0}
									<p
										class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
									>
										No runs are recorded for this task yet. Launch the task to create the first run,
										then return here to compare later attempts.
									</p>
								{:else}
									{#each data.relatedRuns as run (run.id)}
										<article class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
											<div class="flex flex-wrap items-start justify-between gap-3">
												<div class="min-w-0 flex-1">
													<div class="flex flex-wrap items-center gap-2">
														<a
															class="ui-wrap-anywhere font-medium text-white transition hover:text-sky-200"
															href={resolve(`/app/runs/${run.id}`)}
														>
															{run.id}
														</a>
														<span
															class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${runStatusToneClass(run.status)}`}
														>
															{formatRunStatusLabel(run.status)}
														</span>
													</div>
													<p class="ui-wrap-anywhere mt-2 text-sm text-slate-300">
														{run.summary || 'No summary recorded.'}
													</p>
												</div>
												<p class="text-xs text-slate-500">Updated {run.updatedAtLabel}</p>
											</div>

											<div class="mt-4 grid gap-3 sm:grid-cols-3">
												<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
													<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
														Worker
													</p>
													<p class="mt-2 text-sm text-white">{run.workerName}</p>
												</div>
												<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
													<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
														Provider
													</p>
													<p class="mt-2 text-sm text-white">{run.providerName}</p>
												</div>
												<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
													<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
														Thread record
													</p>
													{#if run.sessionId}
														<a
															class="ui-wrap-inline mt-2 text-sm text-sky-300 transition hover:text-sky-200"
															href={resolve(`/app/threads/${run.sessionId}`)}
														>
															{run.threadId || run.sessionId}
														</a>
													{:else}
														<p class="mt-2 text-sm text-white">No thread</p>
													{/if}
												</div>
											</div>
											<div class="mt-3">
												<a
													class="text-xs font-medium text-sky-300 transition hover:text-sky-200"
													href={resolve(`/app/runs/${run.id}`)}
												>
													Open run details
												</a>
											</div>
										</article>
									{/each}
								{/if}
							</div>
						</div>
					</DetailSection>
				</div>
			{:else if selectedDetailPanel === 'governance'}
				<div
					id="task-detail-panel-governance"
					role="tabpanel"
					aria-labelledby="task-detail-tab-governance"
				>
					<DetailSection
						id="governance"
						eyebrow="Governance"
						title="Review state and execution constraints"
						description="Track decisions that can block or redirect the task before more work is queued."
						tone="amber"
						bodyClass="divide-y divide-slate-800/90 p-0"
					>
						<div class="px-6 py-6">
							<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
								Governance
							</p>
							<h3 class="mt-2 text-xl font-semibold text-white">Review and approval state</h3>

							<div class="mt-5 space-y-4">
								<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
									<div class="flex flex-wrap items-center justify-between gap-3">
										<div>
											<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
												Open review
											</p>
											<p class="mt-2 text-sm text-white">
												{data.task.openReview
													? data.task.openReview.summary || 'Waiting on reviewer decision.'
													: 'No open review'}
											</p>
										</div>
										{#if data.task.openReview}
											<span
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${reviewStatusToneClass(data.task.openReview.status)}`}
											>
												{formatReviewStatusLabel(data.task.openReview.status)}
											</span>
										{/if}
									</div>

									{#if data.task.openReview}
										<div class="mt-4 flex flex-col gap-3 sm:flex-row">
											<form method="POST" action="?/approveReview">
												<button
													class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200"
													type="submit"
												>
													Approve review
												</button>
											</form>
											<form method="POST" action="?/requestChanges">
												<button
													class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
													type="submit"
												>
													Request changes
												</button>
											</form>
										</div>
									{/if}
								</div>

								<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
									<div class="flex flex-wrap items-center justify-between gap-3">
										<div>
											<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
												Pending approval
											</p>
											<p class="mt-2 text-sm text-white">
												{data.task.pendingApproval
													? data.task.pendingApproval.summary ||
														`Waiting on ${formatTaskApprovalModeLabel(data.task.pendingApproval.mode)} approval.`
													: 'No pending approval'}
											</p>
										</div>
										{#if data.task.pendingApproval}
											<span
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${approvalStatusToneClass(data.task.pendingApproval.status)}`}
											>
												{formatTaskApprovalModeLabel(data.task.pendingApproval.mode)}
											</span>
										{/if}
									</div>

									{#if data.task.pendingApproval}
										<div class="mt-4 flex flex-col gap-3 sm:flex-row">
											<form method="POST" action="?/approveApproval">
												<button
													class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200"
													type="submit"
												>
													Approve gate
												</button>
											</form>
											<form method="POST" action="?/rejectApproval">
												<button
													class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
													type="submit"
												>
													Reject gate
												</button>
											</form>
										</div>
									{/if}
								</div>
							</div>
						</div>

						<div class="px-6 py-6">
							<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
								Dependency context
							</p>
							<h3 class="mt-2 text-xl font-semibold text-white">
								Dependencies and execution notes
							</h3>

							<div class="mt-5 space-y-4">
								<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
									<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
										Routing summary
									</p>
									<div class="mt-3 space-y-2 text-sm text-white">
										<p>Priority: {formatPriorityLabel(data.task.priority)}</p>
										<p>Risk level: {formatTaskRiskLevelLabel(data.task.riskLevel)}</p>
										<p>Approval mode: {formatTaskApprovalModeLabel(data.task.approvalMode)}</p>
										<p>Requires review: {data.task.requiresReview ? 'Yes' : 'No'}</p>
										<p>
											Desired role:
											{data.task.desiredRoleName || data.task.desiredRoleId || 'No role preference'}
										</p>
									</div>
								</div>

								<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
									<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
										Goal link
									</p>
									{#if data.task.goalId}
										<a
											class="mt-2 inline-flex text-sm font-medium text-sky-300 transition hover:text-sky-200"
											href={resolve(`/app/goals/${data.task.goalId}`)}
										>
											{data.task.goalName || data.task.goalId}
										</a>
									{:else}
										<p class="mt-2 text-sm text-white">No goal linked</p>
									{/if}
								</div>

								<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
									<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
										Blocked reason
									</p>
									<p class="mt-2 text-sm text-white">
										{data.task.blockedReason || 'No blocker recorded'}
									</p>
								</div>

								<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
									<div class="flex flex-wrap items-center justify-between gap-3">
										<div>
											<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
												Dependencies
											</p>
											<p class="mt-2 text-sm text-white">
												Tasks this work item depends on before it can move cleanly.
											</p>
										</div>
										<span
											class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
										>
											{data.dependencyTasks.length}
										</span>
									</div>

									{#if data.dependencyTasks.length === 0}
										<p class="mt-4 text-sm text-slate-400">No dependencies recorded.</p>
									{:else}
										<div class="mt-4 space-y-3">
											{#each data.dependencyTasks as dependency (dependency.id)}
												<div class="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3">
													<div class="flex flex-wrap items-center justify-between gap-3">
														<a
															class="ui-wrap-anywhere text-sm font-medium text-sky-300 transition hover:text-sky-200"
															href={resolve(`/app/tasks/${dependency.id}`)}
														>
															{dependency.title}
														</a>
														<span
															class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(dependency.status)}`}
														>
															{formatTaskStatusLabel(dependency.status)}
														</span>
													</div>
													<p class="mt-2 text-xs text-slate-500">{dependency.projectName}</p>
												</div>
											{/each}
										</div>
									{/if}
								</div>

								<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
									<div class="flex flex-wrap items-center justify-between gap-3">
										<div>
											<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
												Recent decisions
											</p>
											<p class="mt-2 text-sm text-white">
												Planning, review, approval, and recovery decisions recorded for this task.
											</p>
										</div>
										<span
											class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
										>
											{data.recentDecisions.length}
										</span>
									</div>

									{#if data.recentDecisions.length === 0}
										<p class="mt-4 text-sm text-slate-400">
											No decisions are recorded for this task yet. Reviews, approvals, and recovery
											actions will appear here after work starts moving.
										</p>
									{:else}
										<div class="mt-4 space-y-3">
											{#each data.recentDecisions as decision (decision.id)}
												<article class="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3">
													<div class="flex flex-wrap items-center justify-between gap-3">
														<span
															class="badge border border-amber-900/70 bg-amber-950/40 text-[0.7rem] tracking-[0.2em] text-amber-300 uppercase"
														>
															{formatDecisionTypeLabel(decision.decisionType)}
														</span>
														<p class="text-xs text-slate-500">{decision.createdAtLabel}</p>
													</div>
													<p class="mt-3 text-sm leading-6 text-white">{decision.summary}</p>
												</article>
											{/each}
										</div>
									{/if}
								</div>

								<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
									<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
										Dependencies
									</p>
									{#if data.dependencyTasks.length === 0}
										<p class="mt-2 text-sm text-slate-400">
											No dependencies are recorded. This task can proceed independently unless you
											add a blocker or upstream task.
										</p>
									{:else}
										<div class="mt-3 space-y-3">
											{#each data.dependencyTasks as dependency (dependency.id)}
												<a
													class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3 transition hover:border-sky-400/40"
													href={resolve(`/app/tasks/${dependency.id}`)}
												>
													<span class="text-sm text-white">{dependency.title}</span>
													<span
														class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(dependency.status)}`}
													>
														{formatTaskStatusLabel(dependency.status)}
													</span>
												</a>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						</div>
					</DetailSection>
				</div>
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

<style>
	.thread-name-clamp {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		line-clamp: 4;
		-webkit-line-clamp: 4;
		overflow: hidden;
		overflow-wrap: anywhere;
		word-break: break-word;
		hyphens: auto;
	}

	.thread-preview-clamp {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		line-clamp: 5;
		-webkit-line-clamp: 5;
		overflow: hidden;
		overflow-wrap: anywhere;
		word-break: break-word;
		hyphens: auto;
	}
</style>
