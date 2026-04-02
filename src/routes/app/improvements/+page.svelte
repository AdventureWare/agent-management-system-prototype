<script lang="ts">
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		createKnowledgeItemFromSelfImprovementOpportunity,
		createTaskFromSelfImprovementOpportunity,
		fetchSelfImprovementSnapshot,
		updateSelfImprovementKnowledgeItemStatus,
		updateSelfImprovementOpportunityStatus
	} from '$lib/client/agent-data';
	import {
		SELF_IMPROVEMENT_CATEGORY_OPTIONS,
		SELF_IMPROVEMENT_SOURCE_OPTIONS,
		SELF_IMPROVEMENT_STATUS_OPTIONS,
		formatSelfImprovementCategoryLabel,
		formatSelfImprovementKnowledgeStatusLabel,
		formatSelfImprovementSignalTypeLabel,
		formatSelfImprovementStatusLabel,
		selfImprovementKnowledgeStatusToneClass,
		selfImprovementSeverityToneClass,
		selfImprovementStatusToneClass,
		type SelfImprovementKnowledgeStatus,
		type SelfImprovementSnapshot,
		type SelfImprovementStatus,
		type TrackedSelfImprovementOpportunity
	} from '$lib/types/self-improvement';

	type ImprovementProjectOption = {
		id: string;
		name: string;
	};

	type ImprovementGoalOption = {
		id: string;
		name: string;
		label: string;
	};

	let { data } = $props<{
		data: {
			snapshot: SelfImprovementSnapshot;
			projects: ImprovementProjectOption[];
			goals: ImprovementGoalOption[];
		};
	}>();
	let refreshedSnapshot = $state.raw<SelfImprovementSnapshot | null>(null);
	let snapshot = $derived(refreshedSnapshot ?? data.snapshot);
	let isRefreshing = $state(false);
	let refreshError = $state<string | null>(null);
	let actionError = $state<string | null>(null);
	let pendingOpportunityIds = $state.raw<string[]>([]);
	let pendingKnowledgeItemIds = $state.raw<string[]>([]);
	let searchQuery = $state('');
	let statusFilter = $state<'all' | SelfImprovementStatus>('all');
	let categoryFilter = $state<'all' | (typeof SELF_IMPROVEMENT_CATEGORY_OPTIONS)[number]>('all');
	let sourceFilter = $state<'all' | (typeof SELF_IMPROVEMENT_SOURCE_OPTIONS)[number]>('all');
	let activeProjectId = $state<'all' | string>('all');
	let requestedProjectId = $state<'all' | string>('all');
	let activeGoalId = $state<'all' | string>('all');
	let requestedGoalId = $state<'all' | string>('all');

	let activeProjectLabel = $derived.by(() => {
		if (activeProjectId === 'all') {
			return 'All projects';
		}

		return (
			data.projects.find((project: ImprovementProjectOption) => project.id === activeProjectId)
				?.name ?? 'Selected project'
		);
	});

	let activeGoalLabel = $derived.by(() => {
		if (activeGoalId === 'all') {
			return 'All goals';
		}

		return (
			data.goals.find((goal: ImprovementGoalOption) => goal.id === activeGoalId)?.name ??
			'Selected goal'
		);
	});

	let filteredOpportunities = $derived.by(() => {
		const search = searchQuery.trim().toLowerCase();

		return snapshot.opportunities.filter((opportunity: TrackedSelfImprovementOpportunity) => {
			if (statusFilter !== 'all' && opportunity.status !== statusFilter) {
				return false;
			}

			if (categoryFilter !== 'all' && opportunity.category !== categoryFilter) {
				return false;
			}

			if (sourceFilter !== 'all' && opportunity.source !== sourceFilter) {
				return false;
			}

			if (!search) {
				return true;
			}

			const haystack = [
				opportunity.title,
				opportunity.summary,
				opportunity.projectName ?? '',
				opportunity.category,
				opportunity.source,
				...opportunity.signals,
				...opportunity.recommendedActions
			]
				.join(' ')
				.toLowerCase();

			return haystack.includes(search);
		});
	});

	function opportunityIsPending(opportunityId: string) {
		return pendingOpportunityIds.includes(opportunityId);
	}

	function knowledgeItemIsPending(knowledgeItemId: string) {
		return pendingKnowledgeItemIds.includes(knowledgeItemId);
	}

	function normalizeProjectScope(projectId: string) {
		return projectId === 'all' ? null : projectId;
	}

	function normalizeGoalScope(goalId: string) {
		return goalId === 'all' ? null : goalId;
	}

	function resetQueueFilters() {
		searchQuery = '';
		statusFilter = 'all';
		categoryFilter = 'all';
		sourceFilter = 'all';
	}

	async function refreshSnapshot(
		projectId: string | null = normalizeProjectScope(activeProjectId),
		goalId: string | null = normalizeGoalScope(activeGoalId)
	) {
		if (isRefreshing) {
			return;
		}

		isRefreshing = true;

		try {
			refreshedSnapshot = await fetchSelfImprovementSnapshot({
				projectId,
				goalId
			});
			activeProjectId = projectId ?? 'all';
			activeGoalId = goalId ?? 'all';
			refreshError = null;
		} catch (err) {
			refreshError =
				err instanceof Error ? err.message : 'Could not refresh self-improvement opportunities.';
		} finally {
			isRefreshing = false;
		}
	}

	async function runOpportunityAction(opportunityId: string, action: () => Promise<void>) {
		if (opportunityIsPending(opportunityId)) {
			return;
		}

		pendingOpportunityIds = [...pendingOpportunityIds, opportunityId];
		actionError = null;

		try {
			await action();
			await refreshSnapshot();
		} catch (err) {
			actionError =
				err instanceof Error ? err.message : 'Could not update the self-improvement opportunity.';
		} finally {
			pendingOpportunityIds = pendingOpportunityIds.filter((id) => id !== opportunityId);
		}
	}

	async function runKnowledgeItemAction(knowledgeItemId: string, action: () => Promise<void>) {
		if (knowledgeItemIsPending(knowledgeItemId)) {
			return;
		}

		pendingKnowledgeItemIds = [...pendingKnowledgeItemIds, knowledgeItemId];
		actionError = null;

		try {
			await action();
			await refreshSnapshot();
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Could not update the knowledge item.';
		} finally {
			pendingKnowledgeItemIds = pendingKnowledgeItemIds.filter((id) => id !== knowledgeItemId);
		}
	}

	async function updateOpportunityStatus(opportunityId: string, status: SelfImprovementStatus) {
		await runOpportunityAction(opportunityId, async () => {
			await updateSelfImprovementOpportunityStatus(opportunityId, status);
		});
	}

	async function createOpportunityTask(opportunityId: string) {
		await runOpportunityAction(opportunityId, async () => {
			await createTaskFromSelfImprovementOpportunity(opportunityId, {
				goalId: normalizeGoalScope(activeGoalId)
			});
		});
	}

	async function createKnowledgeDraft(opportunityId: string) {
		await runOpportunityAction(opportunityId, async () => {
			await createKnowledgeItemFromSelfImprovementOpportunity(opportunityId, {
				goalId: normalizeGoalScope(activeGoalId)
			});
		});
	}

	async function updateKnowledgeStatus(
		knowledgeItemId: string,
		status: SelfImprovementKnowledgeStatus
	) {
		await runKnowledgeItemAction(knowledgeItemId, async () => {
			await updateSelfImprovementKnowledgeItemStatus(knowledgeItemId, status);
		});
	}

	async function generateSuggestions() {
		resetQueueFilters();
		await refreshSnapshot(
			normalizeProjectScope(requestedProjectId),
			normalizeGoalScope(requestedGoalId)
		);
	}
</script>

<AppPage>
	<PageHeader
		eyebrow="Improvements"
		title="Review and steer the self-improvement loop"
		description="Generate suggestion sets for the whole system or a single project, then triage the resulting opportunities into tasks, knowledge, or explicit decisions."
	>
		{#snippet actions()}
			<button
				class="btn border border-slate-700 bg-slate-950 font-semibold text-slate-200"
				type="button"
				onclick={() => {
					void refreshSnapshot();
				}}
				disabled={isRefreshing}
			>
				{isRefreshing ? 'Refreshing...' : 'Refresh current scope'}
			</button>
			<a class="btn preset-filled-primary-500 font-semibold" href={resolve('/app/home')}>
				Back to home
			</a>
		{/snippet}
		{#snippet meta()}
			<div class="flex flex-wrap gap-2">
				<span class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] text-slate-300">
					{snapshot.summary.totalCount} tracked opportunity(ies)
				</span>
				<span class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] text-slate-300">
					{filteredOpportunities.length} currently visible
				</span>
				<span class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] text-slate-300">
					Scope: {activeProjectLabel} / {activeGoalLabel}
				</span>
			</div>
		{/snippet}
	</PageHeader>

	{#if refreshError}
		<p class="ui-notice border border-rose-900/70 bg-rose-950/40 text-rose-200">{refreshError}</p>
	{/if}

	{#if actionError}
		<p class="ui-notice border border-rose-900/70 bg-rose-950/40 text-rose-200">{actionError}</p>
	{/if}

	<section class="ui-panel space-y-5">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<h2 class="text-xl font-semibold text-white">Suggestion studio</h2>
				<p class="mt-1 max-w-2xl text-sm text-slate-400">
					Run a fresh suggestion pass whenever you want. Start broad across the full system or scope
					the queue to a project, a goal subtree, or both when you want tighter recommendations.
				</p>
			</div>
			<div
				class="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300"
			>
				Last generated {snapshot.generatedAt.slice(0, 19).replace('T', ' ')}
			</div>
		</div>

		<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
			<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Project scope</span>
					<select bind:value={requestedProjectId} class="select text-white">
						<option value="all">All projects</option>
						{#each data.projects as project (project.id)}
							<option value={project.id}>{project.name}</option>
						{/each}
					</select>
					<p class="mt-2 text-xs text-slate-500">
						Use this when you want a fresh queue for one project instead of the whole system.
					</p>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Goal focus</span>
					<select bind:value={requestedGoalId} class="select text-white">
						<option value="all">All goals</option>
						{#each data.goals as goal (goal.id)}
							<option value={goal.id}>{goal.label}</option>
						{/each}
					</select>
					<p class="mt-2 text-xs text-slate-500">
						Goal scoping currently filters the suggestion set by the selected goal subtree, using
						linked tasks and projects as evidence.
					</p>
				</label>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
						Current scope
					</p>
					<div class="mt-2 space-y-1">
						<p class="text-lg font-semibold text-white">{activeProjectLabel}</p>
						<p class="text-sm text-slate-300">{activeGoalLabel}</p>
					</div>
					<p class="mt-2 text-sm text-slate-400">
						Generate a new suggestion set to switch the queue and metrics to a different project and
						goal focus.
					</p>
				</div>
			</div>

			<div class="flex flex-col gap-3 xl:w-64">
				<button
					class="btn preset-filled-primary-500 font-semibold disabled:opacity-60"
					type="button"
					onclick={() => {
						void generateSuggestions();
					}}
					disabled={isRefreshing}
				>
					{isRefreshing ? 'Generating...' : 'Generate suggestions'}
				</button>
				<button
					class="btn border border-slate-700 bg-slate-950 font-semibold text-slate-200 disabled:opacity-60"
					type="button"
					onclick={() => {
						requestedProjectId = 'all';
						requestedGoalId = 'all';
						void refreshSnapshot(null, null);
					}}
					disabled={isRefreshing}
				>
					Show full system scope
				</button>
			</div>
		</div>
	</section>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
		<MetricCard
			label="Open"
			value={snapshot.summary.openCount}
			detail="Opportunities still waiting on a decision."
		/>
		<MetricCard
			label="Accepted"
			value={snapshot.summary.acceptedCount}
			detail="Accepted opportunities, with or without a draft task yet."
		/>
		<MetricCard
			label="Dismissed"
			value={snapshot.summary.dismissedCount}
			detail="Dismissed opportunities that remain visible while still active."
		/>
		<MetricCard
			label="High severity"
			value={snapshot.summary.highSeverityCount}
			detail="High-severity items usually merit an explicit decision."
		/>
		<MetricCard
			label="Thread reuse gaps"
			value={snapshot.summary.bySource.thread_reuse_gap}
			detail="Opportunities to improve context reuse and continuity."
		/>
	</div>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<MetricCard
			label="Active signals"
			value={snapshot.signalSummary.totalCount}
			detail="Structured evidence records backing the current opportunity set."
		/>
		<MetricCard
			label="High-severity signals"
			value={snapshot.signalSummary.highSeverityCount}
			detail="High-severity evidence records often deserve immediate triage."
		/>
		<MetricCard
			label="Run failures"
			value={snapshot.signalSummary.byType.run_failure}
			detail="Concrete failed or blocked run records."
		/>
		<MetricCard
			label="Blocked tasks"
			value={snapshot.signalSummary.byType.task_blocked}
			detail="Task-level blockers captured as reusable evidence."
		/>
	</div>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<MetricCard
			label="Knowledge items"
			value={snapshot.knowledgeSummary.totalCount}
			detail="Durable lessons captured from accepted self-improvement work."
		/>
		<MetricCard
			label="Draft knowledge"
			value={snapshot.knowledgeSummary.draftCount}
			detail="Knowledge items that still need review or promotion."
		/>
		<MetricCard
			label="Published knowledge"
			value={snapshot.knowledgeSummary.publishedCount}
			detail="Knowledge items ready to be reused by future work."
		/>
		<MetricCard
			label="Quality lessons"
			value={snapshot.knowledgeSummary.byCategory.quality}
			detail="Published or draft lessons sourced from review and quality gaps."
		/>
	</div>

	<section class="ui-panel space-y-4">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<h2 class="text-xl font-semibold text-white">Queue filters</h2>
				<p class="mt-1 text-sm text-slate-400">
					Once a suggestion set is generated for the active scope, use these controls to narrow the
					queue for review.
				</p>
			</div>
			<button
				class="btn border border-slate-700 bg-slate-950 font-semibold text-slate-200"
				type="button"
				onclick={resetQueueFilters}
			>
				Reset filters
			</button>
		</div>

		<div class="grid gap-4 lg:grid-cols-4">
			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Search</span>
				<input
					bind:value={searchQuery}
					class="input text-white"
					placeholder="Search title, summary, or signal"
					type="search"
				/>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
				<select bind:value={statusFilter} class="select text-white">
					<option value="all">All statuses</option>
					{#each SELF_IMPROVEMENT_STATUS_OPTIONS as status (status)}
						<option value={status}>{formatSelfImprovementStatusLabel(status)}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Category</span>
				<select bind:value={categoryFilter} class="select text-white">
					<option value="all">All categories</option>
					{#each SELF_IMPROVEMENT_CATEGORY_OPTIONS as category (category)}
						<option value={category}>{formatSelfImprovementCategoryLabel(category)}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Source</span>
				<select bind:value={sourceFilter} class="select text-white">
					<option value="all">All sources</option>
					{#each SELF_IMPROVEMENT_SOURCE_OPTIONS as source (source)}
						<option value={source}>{source.replaceAll('_', ' ')}</option>
					{/each}
				</select>
			</label>
		</div>
	</section>

	<section class="ui-panel space-y-4">
		<div>
			<h2 class="text-xl font-semibold text-white">Recent feedback signals</h2>
			<p class="mt-1 text-sm text-slate-400">
				These are the raw structured signals the system is currently using as evidence.
			</p>
		</div>

		{#if snapshot.signals.length === 0}
			<p class="ui-empty-state">No feedback signals are currently being tracked.</p>
		{:else}
			<div class="space-y-3">
				{#each snapshot.signals.slice(0, 8) as signal (signal.id)}
					<article class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<p class="font-medium text-white">{signal.title}</p>
									<span
										class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${selfImprovementSeverityToneClass(signal.severity)}`}
									>
										{signal.severity}
									</span>
									<span
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
									>
										{formatSelfImprovementSignalTypeLabel(signal.signalType)}
									</span>
								</div>
								<p class="mt-2 text-sm text-slate-300">{signal.summary}</p>
								<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">
									{signal.projectName ?? 'No project'} · first seen {signal.firstSeenAt.slice(
										0,
										10
									)} · last seen {signal.lastSeenAt.slice(0, 10)}
								</p>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>

	<section class="ui-panel space-y-4">
		<div>
			<h2 class="text-xl font-semibold text-white">Knowledge library</h2>
			<p class="mt-1 text-sm text-slate-400">
				These are the durable lessons the system has captured from accepted improvement work.
			</p>
		</div>

		{#if snapshot.knowledgeItems.length === 0}
			<p class="ui-empty-state">
				No knowledge items have been created yet. Accept an opportunity and convert it into a
				knowledge draft when it points to a reusable lesson.
			</p>
		{:else}
			<div class="space-y-4">
				{#each snapshot.knowledgeItems.slice(0, 8) as knowledgeItem (knowledgeItem.id)}
					<article
						id={`knowledge-item-${knowledgeItem.id}`}
						class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
					>
						<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
							<div class="min-w-0 flex-1 space-y-3">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-lg font-semibold text-white">{knowledgeItem.title}</h3>
									<span
										class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${selfImprovementKnowledgeStatusToneClass(knowledgeItem.status)}`}
									>
										{formatSelfImprovementKnowledgeStatusLabel(knowledgeItem.status)}
									</span>
									<span
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
									>
										{formatSelfImprovementCategoryLabel(knowledgeItem.category)}
									</span>
								</div>

								<p class="text-sm text-slate-300">{knowledgeItem.summary}</p>

								<div class="grid gap-4 lg:grid-cols-2">
									<div class="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
										<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
											Trigger pattern
										</p>
										<p class="text-sm text-slate-300">{knowledgeItem.triggerPattern}</p>
									</div>

									<div class="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
										<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
											Recommended response
										</p>
										<p class="text-sm text-slate-300">{knowledgeItem.recommendedResponse}</p>
									</div>
								</div>

								<div class="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
									<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
										Applicability
									</p>
									<div class="flex flex-wrap gap-2">
										{#each knowledgeItem.applicabilityScope as scope (scope)}
											<span class="badge border border-slate-700 bg-slate-950/70 text-slate-300">
												{scope}
											</span>
										{/each}
									</div>
								</div>

								<p class="ui-wrap-anywhere text-xs text-slate-500">
									{knowledgeItem.projectName ?? 'No project'} · created {knowledgeItem.createdAt.slice(
										0,
										10
									)} · updated {knowledgeItem.updatedAt.slice(0, 10)}
								</p>
							</div>

							<div class="flex w-full flex-col gap-2 xl:w-56">
								{#if knowledgeItem.status !== 'published'}
									<button
										class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200 disabled:opacity-60"
										type="button"
										onclick={() => {
											void updateKnowledgeStatus(knowledgeItem.id, 'published');
										}}
										disabled={knowledgeItemIsPending(knowledgeItem.id)}
									>
										{knowledgeItemIsPending(knowledgeItem.id) ? 'Working...' : 'Publish'}
									</button>
								{/if}

								{#if knowledgeItem.status !== 'archived'}
									<button
										class="btn border border-slate-700 bg-slate-950 font-semibold text-slate-200 disabled:opacity-60"
										type="button"
										onclick={() => {
											void updateKnowledgeStatus(knowledgeItem.id, 'archived');
										}}
										disabled={knowledgeItemIsPending(knowledgeItem.id)}
									>
										Archive
									</button>
								{/if}

								{#if knowledgeItem.status !== 'draft'}
									<button
										class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-200 disabled:opacity-60"
										type="button"
										onclick={() => {
											void updateKnowledgeStatus(knowledgeItem.id, 'draft');
										}}
										disabled={knowledgeItemIsPending(knowledgeItem.id)}
									>
										Reopen as draft
									</button>
								{/if}
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>

	<section class="ui-panel space-y-4">
		<div>
			<h2 class="text-xl font-semibold text-white">Tracked opportunities</h2>
			<p class="mt-1 text-sm text-slate-400">
				Each record combines live analysis with durable triage status and draft-task linkage.
			</p>
		</div>

		{#if filteredOpportunities.length === 0}
			<p class="ui-empty-state">
				No opportunities match the current filters. Clear one or more filters to widen the queue.
			</p>
		{:else}
			<div class="space-y-4">
				{#each filteredOpportunities as opportunity (opportunity.id)}
					<article class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
						<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
							<div class="min-w-0 flex-1 space-y-3">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-lg font-semibold text-white">{opportunity.title}</h3>
									<span
										class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${selfImprovementSeverityToneClass(opportunity.severity)}`}
									>
										{opportunity.severity}
									</span>
									<span
										class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${selfImprovementStatusToneClass(opportunity.status)}`}
									>
										{formatSelfImprovementStatusLabel(opportunity.status)}
									</span>
									<span
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
									>
										{formatSelfImprovementCategoryLabel(opportunity.category)}
									</span>
									<span
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
									>
										{opportunity.source.replaceAll('_', ' ')}
									</span>
								</div>

								<p class="text-sm text-slate-300">{opportunity.summary}</p>

								<p class="ui-wrap-anywhere text-xs text-slate-500">
									{opportunity.projectName ?? 'No project'} · first seen {opportunity.firstSeenAt.slice(
										0,
										10
									)}
									· last seen {opportunity.lastSeenAt.slice(0, 10)}
								</p>

								<div class="grid gap-4 lg:grid-cols-2">
									<div class="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
										<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
											Signals
										</p>
										<ul class="space-y-2 text-sm text-slate-300">
											{#each opportunity.signals as signal (signal)}
												<li>{signal}</li>
											{/each}
										</ul>
									</div>

									<div class="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
										<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
											Recommended actions
										</p>
										<ul class="space-y-2 text-sm text-slate-300">
											{#each opportunity.recommendedActions as actionItem (actionItem)}
												<li>{actionItem}</li>
											{/each}
										</ul>
									</div>
								</div>

								{#if opportunity.createdTaskId}
									<p class="text-sm text-sky-200">
										Linked draft task: {opportunity.createdTaskTitle ?? opportunity.createdTaskId}
									</p>
								{/if}

								{#if opportunity.createdKnowledgeItemId}
									<p class="text-sm text-emerald-200">
										Linked knowledge item:
										<a
											class="underline decoration-dotted underline-offset-4"
											href={`#knowledge-item-${opportunity.createdKnowledgeItemId}`}
										>
											{opportunity.createdKnowledgeItemTitle ?? opportunity.createdKnowledgeItemId}
										</a>
									</p>
								{/if}
							</div>

							<div class="flex w-full flex-col gap-2 xl:w-56">
								{#if opportunity.createdTaskId}
									<a
										class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-200"
										href={resolve(`/app/tasks/${opportunity.createdTaskId}`)}
									>
										Open draft task
									</a>
								{:else if opportunity.suggestedTask}
									<button
										class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-200 disabled:opacity-60"
										type="button"
										onclick={() => {
											void createOpportunityTask(opportunity.id);
										}}
										disabled={opportunityIsPending(opportunity.id)}
									>
										{opportunityIsPending(opportunity.id) ? 'Working...' : 'Create draft task'}
									</button>
								{/if}

								{#if opportunity.createdKnowledgeItemId}
									<a
										class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200"
										href={`#knowledge-item-${opportunity.createdKnowledgeItemId}`}
									>
										Open knowledge item
									</a>
								{:else if opportunity.suggestedKnowledgeItem}
									<button
										class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200 disabled:opacity-60"
										type="button"
										onclick={() => {
											void createKnowledgeDraft(opportunity.id);
										}}
										disabled={opportunityIsPending(opportunity.id)}
									>
										{opportunityIsPending(opportunity.id) ? 'Working...' : 'Create knowledge draft'}
									</button>
								{/if}

								{#if opportunity.status !== 'accepted'}
									<button
										class="btn border border-slate-700 bg-slate-950 font-semibold text-slate-200 disabled:opacity-60"
										type="button"
										onclick={() => {
											void updateOpportunityStatus(opportunity.id, 'accepted');
										}}
										disabled={opportunityIsPending(opportunity.id)}
									>
										Accept
									</button>
								{/if}

								{#if opportunity.status !== 'dismissed'}
									<button
										class="btn border border-slate-700 bg-slate-950 font-semibold text-slate-200 disabled:opacity-60"
										type="button"
										onclick={() => {
											void updateOpportunityStatus(opportunity.id, 'dismissed');
										}}
										disabled={opportunityIsPending(opportunity.id)}
									>
										Dismiss
									</button>
								{/if}

								{#if opportunity.status !== 'open'}
									<button
										class="btn border border-slate-700 bg-slate-950 font-semibold text-slate-200 disabled:opacity-60"
										type="button"
										onclick={() => {
											void updateOpportunityStatus(opportunity.id, 'open');
										}}
										disabled={opportunityIsPending(opportunity.id)}
									>
										Reopen
									</button>
								{/if}
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</AppPage>
