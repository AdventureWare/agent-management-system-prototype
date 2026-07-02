<script lang="ts">
	import PageTabs from '$lib/components/PageTabs.svelte';
	import {
		TASK_AUTONOMY_LEVEL_OPTIONS,
		TASK_READINESS_LEVEL_OPTIONS,
		TASK_RISK_LEVEL_OPTIONS,
		formatTaskAutonomyLevelLabel,
		formatTaskReadinessLevelLabel,
		formatTaskRiskLevelLabel,
		formatTaskStatusLabel
	} from '$lib/types/control-plane';

	type DelegationReadinessMode =
		| 'CAPTURED'
		| 'NEEDS_CLARIFICATION'
		| 'NEEDS_PLANNING'
		| 'NEEDS_RESEARCH'
		| 'READY_FOR_EXECUTION'
		| 'AWAITING_REVIEW'
		| 'AUTOMATION_CANDIDATE';
	type TaskSortField = 'updated' | 'targetDate' | 'priority';
	type TaskSortDirection = 'asc' | 'desc';
	type TaskQueueFocus = 'all' | 'needsAttention';
	type TaskQueuePresetId = 'open' | 'needsAttention' | 'completed';

	type WorkflowFilterOption = {
		id: string;
		name: string;
		count: number;
	};
	type WorkflowFilterOptions = {
		workflows: WorkflowFilterOption[];
		withoutWorkflowCount: number;
	};
	type QueuePresetCounts = Record<TaskQueuePresetId, number>;

	let {
		query = $bindable(''),
		selectedStatus = $bindable('all'),
		selectedWorkflowId = $bindable('all'),
		selectedReadinessLevel = $bindable('all'),
		selectedAutonomyLevel = $bindable('all'),
		selectedRiskLevel = $bindable('all'),
		selectedBlockedFilter = $bindable<'all' | 'blocked' | 'unblocked'>('all'),
		selectedDelegationMode = $bindable<'all' | DelegationReadinessMode>('all'),
		selectedTaskView = $bindable<'active' | 'completed'>('active'),
		selectedSortField = $bindable<TaskSortField>('updated'),
		selectedSortDirection = $bindable<TaskSortDirection>('desc'),
		selectedQueueFocus = $bindable<TaskQueueFocus>('all'),
		statusOptions,
		workflowFilterOptions,
		delegationModeOptions,
		queuePresetCounts,
		activeQueuePresetId,
		activeTaskRowCount,
		completedTaskRowCount,
		onApplyQueuePreset
	}: {
		query: string;
		selectedStatus: string;
		selectedWorkflowId: string;
		selectedReadinessLevel: string;
		selectedAutonomyLevel: string;
		selectedRiskLevel: string;
		selectedBlockedFilter: 'all' | 'blocked' | 'unblocked';
		selectedDelegationMode: 'all' | DelegationReadinessMode;
		selectedTaskView: 'active' | 'completed';
		selectedSortField: TaskSortField;
		selectedSortDirection: TaskSortDirection;
		selectedQueueFocus: TaskQueueFocus;
		statusOptions: readonly string[];
		workflowFilterOptions: WorkflowFilterOptions;
		delegationModeOptions: Array<{ id: DelegationReadinessMode; label: string }>;
		queuePresetCounts: QueuePresetCounts;
		activeQueuePresetId: string | null;
		activeTaskRowCount: number;
		completedTaskRowCount: number;
		onApplyQueuePreset: (presetId: TaskQueuePresetId) => void;
	} = $props();

	function applyDelegationShortcut(mode: DelegationReadinessMode) {
		selectedDelegationMode = mode;
		selectedReadinessLevel = 'all';
		selectedRiskLevel = 'all';
		selectedBlockedFilter = 'all';
	}
</script>

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
					placeholder="Search tasks..."
					spellcheck="false"
				/>
			</div>
		</div>

		<div class="flex flex-col gap-1.5">
			<span class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase">Queue views</span>
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
						onApplyQueuePreset('open');
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
						onApplyQueuePreset('needsAttention');
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
						onApplyQueuePreset('completed');
					}}
				>
					<span class="flex items-center justify-between gap-3">
						<span class="text-sm font-medium">Completed</span>
						<span class="rounded-full border border-current/20 px-2 py-0.5 text-xs">
							{queuePresetCounts.completed}
						</span>
					</span>
					<span class="mt-1 block text-xs text-slate-400">
						Done or canceled work, sorted by the most recent updates.
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

			{#each statusOptions as status (status)}
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
				<span class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase"> Workflow </span>
				<select
					bind:value={selectedWorkflowId}
					aria-label="Filter by workflow"
					class="select min-w-0 text-sm text-white"
				>
					<option value="all">All workflows</option>
					<option value="none">No workflow ({workflowFilterOptions.withoutWorkflowCount})</option>
					{#each workflowFilterOptions.workflows as workflow (workflow.id)}
						<option value={workflow.id}>{workflow.name} ({workflow.count})</option>
					{/each}
				</select>
			</label>

			<label class="flex min-w-0 flex-col gap-1.5">
				<span class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase">Sort by</span>
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
				<span class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase">Direction</span>
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

		<div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
			<label class="flex min-w-0 flex-col gap-1.5">
				<span class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase">
					Delegation mode
				</span>
				<select
					bind:value={selectedDelegationMode}
					aria-label="Filter by delegation readiness mode"
					class="select min-w-0 text-sm text-white"
				>
					<option value="all">All modes</option>
					{#each delegationModeOptions as mode (mode.id)}
						<option value={mode.id}>{mode.label}</option>
					{/each}
				</select>
			</label>

			<label class="flex min-w-0 flex-col gap-1.5">
				<span class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase"> Readiness </span>
				<select
					bind:value={selectedReadinessLevel}
					aria-label="Filter by readiness level"
					class="select min-w-0 text-sm text-white"
				>
					<option value="all">All readiness levels</option>
					{#each TASK_READINESS_LEVEL_OPTIONS as readinessLevel (readinessLevel)}
						<option value={readinessLevel}>{formatTaskReadinessLevelLabel(readinessLevel)}</option>
					{/each}
				</select>
			</label>

			<label class="flex min-w-0 flex-col gap-1.5">
				<span class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase"> Autonomy </span>
				<select
					bind:value={selectedAutonomyLevel}
					aria-label="Filter by autonomy level"
					class="select min-w-0 text-sm text-white"
				>
					<option value="all">All autonomy levels</option>
					{#each TASK_AUTONOMY_LEVEL_OPTIONS as autonomyLevel (autonomyLevel)}
						<option value={autonomyLevel}>{formatTaskAutonomyLevelLabel(autonomyLevel)}</option>
					{/each}
				</select>
			</label>

			<label class="flex min-w-0 flex-col gap-1.5">
				<span class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase">Risk</span>
				<select
					bind:value={selectedRiskLevel}
					aria-label="Filter by risk level"
					class="select min-w-0 text-sm text-white"
				>
					<option value="all">All risk levels</option>
					{#each TASK_RISK_LEVEL_OPTIONS as riskLevel (riskLevel)}
						<option value={riskLevel}>{formatTaskRiskLevelLabel(riskLevel)}</option>
					{/each}
				</select>
			</label>

			<label class="flex min-w-0 flex-col gap-1.5">
				<span class="text-[0.6875rem] tracking-[0.16em] text-slate-500 uppercase"> Blockers </span>
				<select
					bind:value={selectedBlockedFilter}
					aria-label="Filter by blocked state"
					class="select min-w-0 text-sm text-white"
				>
					<option value="all">Blocked and unblocked</option>
					<option value="blocked">Blocked only</option>
					<option value="unblocked">Unblocked only</option>
				</select>
			</label>
		</div>

		<div class="flex flex-wrap gap-2">
			<button
				class="inline-flex items-center justify-center rounded-full border border-emerald-800/70 bg-emerald-950/30 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-emerald-100 uppercase transition hover:border-emerald-700 hover:text-white"
				type="button"
				onclick={() => {
					applyDelegationShortcut('READY_FOR_EXECUTION');
				}}
			>
				Ready for execution
			</button>
			<button
				class="inline-flex items-center justify-center rounded-full border border-sky-800/70 bg-sky-950/30 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-sky-100 uppercase transition hover:border-sky-700 hover:text-white"
				type="button"
				onclick={() => {
					applyDelegationShortcut('NEEDS_PLANNING');
				}}
			>
				Needs planning
			</button>
			<button
				class="inline-flex items-center justify-center rounded-full border border-rose-800/70 bg-rose-950/30 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-rose-100 uppercase transition hover:border-rose-700 hover:text-white"
				type="button"
				onclick={() => {
					applyDelegationShortcut('NEEDS_RESEARCH');
				}}
			>
				Needs research
			</button>
			<button
				class="inline-flex items-center justify-center rounded-full border border-amber-800/70 bg-amber-950/30 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-amber-100 uppercase transition hover:border-amber-700 hover:text-white"
				type="button"
				onclick={() => {
					applyDelegationShortcut('AWAITING_REVIEW');
				}}
			>
				Awaiting review
			</button>
		</div>
	</div>
</section>

<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
	<div class="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
		<PageTabs
			ariaLabel="Task list views"
			bind:value={selectedTaskView}
			items={[
				{ id: 'active', label: 'Open tasks', badge: activeTaskRowCount },
				{ id: 'completed', label: 'Completed', badge: completedTaskRowCount }
			]}
			panelIdPrefix="task-list"
		/>
	</div>
</div>
