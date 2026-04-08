<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { clearFormDraft, readFormDraft } from '$lib/client/form-drafts';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import CollectionToolbar from '$lib/components/CollectionToolbar.svelte';
	import DataTableSection from '$lib/components/DataTableSection.svelte';
	import GoalEditor from '$lib/components/GoalEditor.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatGoalStatusLabel, goalStatusToneClass } from '$lib/types/control-plane';

	let { data, form } = $props();
	const CREATE_GOAL_DRAFT_KEY = 'ams:create-goal';
	const ROOT_GOAL_PARENT_KEY = '__root__';

	type GoalDirectoryGoal = (typeof data.goals)[number];
	type GoalDirectoryRow = GoalDirectoryGoal & {
		depth: number;
		visibleChildCount: number;
		isExpanded: boolean;
		isDirectMatch: boolean;
		isContextRow: boolean;
	};

	let query = $state('');
	let selectedStatus = $state('all');
	let collapsedGoalIds = $state.raw<string[]>([]);

	function modalShouldStartOpen() {
		return Boolean(form?.message) || form?.reopenCreateModal === true;
	}

	let isCreateModalOpen = $state(modalShouldStartOpen());

	let createSuccess = $derived(form?.ok && form?.successAction === 'createGoal');
	let goalWritingAssistSuccess = $derived(form?.ok && form?.successAction === 'assistGoalWriting');
	let goalWritingAssistChangeSummary = $derived(
		goalWritingAssistSuccess ? (form?.assistChangeSummary?.toString() ?? '') : ''
	);
	let deleteSuccess = $derived(data.deleted);

	function matchesStatus(goal: GoalDirectoryGoal) {
		return selectedStatus === 'all' || goal.status === selectedStatus;
	}

	function matchesGoal(goal: GoalDirectoryGoal, term: string) {
		const normalizedTerm = term.trim().toLowerCase();

		if (!normalizedTerm) {
			return true;
		}

		return [
			goal.name,
			goal.summary,
			goal.parentGoalName,
			goal.successSignal,
			goal.targetDate,
			goal.artifactPath,
			...goal.linkedProjects.map((project) => project.name),
			...goal.linkedTasks.map((task) => `${task.title} ${task.projectName}`),
			...goal.childGoals.map((childGoal) => childGoal.name)
		]
			.join(' ')
			.toLowerCase()
			.includes(normalizedTerm);
	}

	function formatDateLabel(value: string | null | undefined) {
		if (!value) {
			return 'Unscheduled';
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

	let forceExpandedTree = $derived(query.trim().length > 0 || selectedStatus !== 'all');
	let totalGoalCount = $derived(data.goals.length);
	let rootGoalCount = $derived(data.goals.filter((goal) => !goal.parentGoalId).length);
	let activeGoalCount = $derived(data.goals.filter((goal) => goal.status !== 'done').length);
	let visibleGoalRows = $derived.by<GoalDirectoryRow[]>(() => {
		const goalById: Record<string, GoalDirectoryGoal> = {};

		for (const goal of data.goals) {
			goalById[goal.id] = goal;
		}

		const childrenByParentId: Record<string, GoalDirectoryGoal[]> = {};

		for (const goal of data.goals) {
			const parentKey =
				goal.parentGoalId && goalById[goal.parentGoalId] ? goal.parentGoalId : ROOT_GOAL_PARENT_KEY;
			const siblings = childrenByParentId[parentKey] ?? [];
			siblings.push(goal);
			childrenByParentId[parentKey] = siblings;
		}

		const directMatchIds: Record<string, boolean> = {};
		const includedGoalIds: Record<string, boolean> = {};

		function includeGoal(goal: GoalDirectoryGoal): boolean {
			const children = childrenByParentId[goal.id] ?? [];
			const hasIncludedDescendant = children.some(includeGoal);
			const isDirectMatch = matchesStatus(goal) && matchesGoal(goal, query);

			if (isDirectMatch) {
				directMatchIds[goal.id] = true;
			}

			if (isDirectMatch || hasIncludedDescendant) {
				includedGoalIds[goal.id] = true;
				return true;
			}

			return false;
		}

		for (const rootGoal of childrenByParentId[ROOT_GOAL_PARENT_KEY] ?? []) {
			includeGoal(rootGoal);
		}

		const rows: GoalDirectoryRow[] = [];

		function visit(goal: GoalDirectoryGoal, depth: number) {
			if (!includedGoalIds[goal.id]) {
				return;
			}

			const visibleChildren = (childrenByParentId[goal.id] ?? []).filter(
				(childGoal) => includedGoalIds[childGoal.id]
			);
			const isExpanded = forceExpandedTree || !collapsedGoalIds.includes(goal.id);

			rows.push({
				...goal,
				depth,
				visibleChildCount: visibleChildren.length,
				isExpanded,
				isDirectMatch: Boolean(directMatchIds[goal.id]),
				isContextRow: Boolean(includedGoalIds[goal.id]) && !directMatchIds[goal.id]
			});

			if (visibleChildren.length > 0 && isExpanded) {
				for (const childGoal of visibleChildren) {
					visit(childGoal, depth + 1);
				}
			}
		}

		for (const rootGoal of childrenByParentId[ROOT_GOAL_PARENT_KEY] ?? []) {
			visit(rootGoal, 0);
		}

		return rows;
	});

	function toggleGoalExpansion(goalId: string) {
		if (collapsedGoalIds.includes(goalId)) {
			collapsedGoalIds = collapsedGoalIds.filter((candidate) => candidate !== goalId);
			return;
		}

		collapsedGoalIds = [...collapsedGoalIds, goalId];
	}

	function goalIndentStyle(depth: number) {
		return `padding-left: ${depth * 1.35}rem;`;
	}

	function hierarchyLabel(depth: number) {
		if (depth === 0) {
			return 'Root';
		}

		if (depth === 1) {
			return 'Subgoal';
		}

		return `Level ${depth + 1}`;
	}

	onMount(() => {
		if (createSuccess) {
			clearFormDraft(CREATE_GOAL_DRAFT_KEY);
			return;
		}

		if (readFormDraft(CREATE_GOAL_DRAFT_KEY)) {
			isCreateModalOpen = true;
		}
	});
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Goals"
		title="Browse outcomes, then manage one"
		description="Goals now work like projects: the collection page helps you find the right outcome, while each goal has its own detail page for editing workspace, parent/subgoal structure, and linked work."
	>
		{#snippet actions()}
			<button
				class="btn preset-filled-primary-500 font-semibold"
				type="button"
				onclick={() => {
					isCreateModalOpen = true;
				}}
			>
				Add goal
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

	{#if createSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Goal created and relationship links saved.
		</p>
	{/if}

	{#if deleteSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Goal deleted.
		</p>
	{/if}

	<div class="grid gap-3 md:grid-cols-3">
		<MetricCard
			label="Goals tracked"
			value={totalGoalCount}
			detail="All goals in the current hierarchy, including subgoals."
		/>
		<MetricCard
			label="Top-level goals"
			value={rootGoalCount}
			detail="Root outcomes that organize the rest of the goal tree."
		/>
		<MetricCard
			label="Active goals"
			value={activeGoalCount}
			detail="Goals still in ready, running, review, or blocked states."
		/>
	</div>

	<CollectionToolbar
		title="Goal directory"
		description="Search by outcome, related project, task, or workspace, then open a goal to manage it."
	>
		{#snippet controls()}
			<div class="grid gap-3 sm:grid-cols-2 xl:w-[34rem]">
				<label class="block">
					<span class="sr-only">Search goals</span>
					<input
						bind:value={query}
						class="input text-white placeholder:text-slate-500"
						id="goal-search"
						placeholder="Search goals…"
					/>
				</label>

				<label class="block">
					<span class="sr-only">Filter goals by status</span>
					<select bind:value={selectedStatus} class="select text-white">
						<option value="all">All statuses</option>
						{#each data.statusOptions as status (status)}
							<option value={status}>{formatGoalStatusLabel(status)}</option>
						{/each}
					</select>
				</label>
			</div>
		{/snippet}
	</CollectionToolbar>

	<DataTableSection
		title="Goal hierarchy"
		description="Browse the goal tree with parent context, linked work, and workspace cues in one place."
		summary={`${visibleGoalRows.length} matching row${visibleGoalRows.length === 1 ? '' : 's'}`}
		empty={visibleGoalRows.length === 0}
		emptyMessage="No goals match the current search or status filter."
	>
		<table class="min-w-full divide-y divide-slate-800 text-left">
			<thead class="bg-slate-900/70">
				<tr class="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
					<th class="px-4 py-3">Goal tree</th>
					<th class="px-4 py-3">Status</th>
					<th class="px-4 py-3">Target</th>
					<th class="px-4 py-3">Area</th>
					<th class="px-4 py-3">Parent</th>
					<th class="px-4 py-3">Links</th>
					<th class="px-4 py-3">Workspace</th>
					<th class="px-4 py-3">Open</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-800 bg-slate-950/40">
				{#each visibleGoalRows as goal (goal.id)}
					<tr
						class={`align-top transition ${goal.isContextRow ? 'bg-slate-950/20 hover:bg-slate-900/40' : 'hover:bg-slate-900/60'}`}
					>
						<td class="px-4 py-4">
							<div class="flex min-w-[18rem] items-start gap-3" style={goalIndentStyle(goal.depth)}>
								<div class="flex h-7 w-7 items-center justify-center">
									{#if goal.visibleChildCount > 0}
										<button
											aria-label={`${goal.isExpanded ? 'Collapse' : 'Expand'} subgoals for ${goal.name}`}
											class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
											type="button"
											onclick={() => {
												toggleGoalExpansion(goal.id);
											}}
										>
											{goal.isExpanded ? '-' : '+'}
										</button>
									{:else}
										<span
											class={`block h-2.5 w-2.5 rounded-full ${goal.depth === 0 ? 'bg-sky-400/70' : 'bg-slate-600'}`}
										></span>
									{/if}
								</div>

								<div class="min-w-0 space-y-2">
									<div class="flex flex-wrap items-center gap-2">
										<a
											class={`ui-wrap-anywhere text-sm font-semibold transition hover:text-sky-200 ${goal.isContextRow ? 'text-slate-300' : 'text-white'}`}
											href={resolve(`/app/goals/${goal.id}`)}
										>
											{goal.name}
										</a>
										<span
											class="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[0.65rem] font-medium tracking-[0.14em] text-slate-300 uppercase"
										>
											{hierarchyLabel(goal.depth)}
										</span>
										{#if goal.isContextRow}
											<span
												class="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[0.65rem] font-medium tracking-[0.14em] text-slate-400 uppercase"
											>
												Context
											</span>
										{/if}
									</div>
									<p
										class={`ui-clamp-2 text-sm ${goal.isContextRow ? 'text-slate-400' : 'text-slate-300'}`}
									>
										{goal.summary}
									</p>
								</div>
							</div>
						</td>
						<td class="px-4 py-4">
							<span
								class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${goalStatusToneClass(goal.status)}`}
							>
								{formatGoalStatusLabel(goal.status)}
							</span>
						</td>
						<td class="px-4 py-4 text-sm text-slate-300">
							{formatDateLabel(goal.targetDate)}
						</td>
						<td class="px-4 py-4 text-xs font-semibold tracking-[0.18em] text-sky-300 uppercase">
							{goal.area}
						</td>
						<td class="px-4 py-4 text-sm text-slate-300">{goal.parentGoalName || 'Top level'}</td>
						<td class="px-4 py-4 text-sm text-slate-300">
							{goal.linkedProjects.length} project{goal.linkedProjects.length === 1 ? '' : 's'}
							<br />
							{goal.relatedTaskCount} task{goal.relatedTaskCount === 1 ? '' : 's'}
						</td>
						<td class="px-4 py-4 text-sm text-slate-400">
							<p class="ui-clamp-2 min-w-[18rem]">{goal.artifactPath || 'Not configured'}</p>
						</td>
						<td class="px-4 py-4">
							<a
								class="inline-flex rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.16em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
								href={resolve(`/app/goals/${goal.id}`)}
							>
								Open
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</DataTableSection>
</AppPage>

{#if isCreateModalOpen}
	<AppDialog
		bind:open={isCreateModalOpen}
		title="Add goal"
		description="Capture the outcome in one place, then use the same relationship controls you’ll see on the goal detail page."
		closeLabel="Close add goal form"
		bodyClass="p-0"
	>
		<div class="p-6">
			<GoalEditor
				action="?/createGoal"
				assistAction="?/assistGoalWriting"
				assistChangeSummary={goalWritingAssistChangeSummary}
				description="Outcome first, relationships second. Use the built-in coach if you need help wording the goal, then keep the workspace blank if linked context already tells the system where it should live."
				folderOptions={data.folderOptions}
				heading="Create goal"
				areaOptions={data.areaOptions}
				parentGoalOptions={data.parentGoalOptions}
				projectOptions={data.projectOptions}
				statusOptions={data.statusOptions}
				submitLabel="Create goal"
				taskOptions={data.taskOptions}
				draftStorageKey={CREATE_GOAL_DRAFT_KEY}
				clearDraftOnSuccess={createSuccess}
				values={form?.values ?? {}}
			/>
		</div>
	</AppDialog>
{/if}
