<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { tick } from 'svelte';
	import {
		captureSelfImprovementSuggestion,
		createKnowledgeItemFromSelfImprovementOpportunity,
		createTaskFromSelfImprovementOpportunity,
		fetchSelfImprovementSnapshot,
		updateSelfImprovementKnowledgeItemStatus,
		updateSelfImprovementOpportunityStatus
	} from '$lib/client/agent-data';
	import {
		SELF_IMPROVEMENT_CATEGORY_OPTIONS,
		SELF_IMPROVEMENT_SEVERITY_OPTIONS,
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
	let actionNotice = $state<string | null>(null);
	let pendingOpportunityIds = $state.raw<string[]>([]);
	let pendingKnowledgeItemIds = $state.raw<string[]>([]);
	let searchQuery = $state('');
	let statusFilter = $state<'all' | SelfImprovementStatus>('open');
	let categoryFilter = $state<'all' | (typeof SELF_IMPROVEMENT_CATEGORY_OPTIONS)[number]>('all');
	let sourceFilter = $state<'all' | (typeof SELF_IMPROVEMENT_SOURCE_OPTIONS)[number]>('all');
	let activeProjectId = $state<'all' | string>('all');
	let requestedProjectId = $state<'all' | string>('all');
	let activeGoalId = $state<'all' | string>('all');
	let requestedGoalId = $state<'all' | string>('all');
	let savedLessonsOpen = $state(false);
	let feedbackSignalsOpen = $state(false);
	let captureTitle = $state('');
	let captureSummary = $state('');
	let captureCategory = $state<(typeof SELF_IMPROVEMENT_CATEGORY_OPTIONS)[number]>('coordination');
	let captureSeverity = $state<(typeof SELF_IMPROVEMENT_SEVERITY_OPTIONS)[number]>('medium');
	let isCapturingSuggestion = $state(false);

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

	function opportunityNeedsManualAcceptance(opportunity: TrackedSelfImprovementOpportunity) {
		return !opportunity.suggestedTask && !opportunity.suggestedKnowledgeItem;
	}

	function normalizeProjectScope(projectId: string) {
		return projectId === 'all' ? null : projectId;
	}

	function normalizeGoalScope(goalId: string) {
		return goalId === 'all' ? null : goalId;
	}

	function resetQueueFilters() {
		searchQuery = '';
		statusFilter = 'open';
		categoryFilter = 'all';
		sourceFilter = 'all';
	}

	async function refreshSnapshot(
		projectId: string | null = normalizeProjectScope(activeProjectId),
		goalId: string | null = normalizeGoalScope(activeGoalId)
	) {
		if (isRefreshing) {
			return null;
		}

		isRefreshing = true;

		try {
			const nextSnapshot = await fetchSelfImprovementSnapshot({
				projectId,
				goalId
			});
			refreshedSnapshot = nextSnapshot;
			activeProjectId = projectId ?? 'all';
			activeGoalId = goalId ?? 'all';
			refreshError = null;
			return nextSnapshot;
		} catch (err) {
			refreshError =
				err instanceof Error ? err.message : 'Could not refresh the suggestions queue.';
			return null;
		} finally {
			isRefreshing = false;
		}
	}

	async function runOpportunityAction<T>(
		opportunityId: string,
		action: () => Promise<T>
	): Promise<T | null> {
		if (opportunityIsPending(opportunityId)) {
			return null;
		}

		pendingOpportunityIds = [...pendingOpportunityIds, opportunityId];
		actionError = null;
		actionNotice = null;

		try {
			const result = await action();
			await refreshSnapshot();
			return result;
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Could not update the suggestion.';
			return null;
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
		actionNotice = null;

		try {
			await action();
			await refreshSnapshot();
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Could not update the saved lesson.';
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
		const taskId = await runOpportunityAction(opportunityId, async () => {
			return createTaskFromSelfImprovementOpportunity(opportunityId, {
				projectId: normalizeProjectScope(activeProjectId),
				goalId: normalizeGoalScope(activeGoalId)
			});
		});

		if (taskId) {
			await goto(resolve(`/app/tasks/${taskId}`));
		}
	}

	async function createKnowledgeDraft(opportunityId: string) {
		const knowledgeItemId = await runOpportunityAction(opportunityId, async () => {
			return createKnowledgeItemFromSelfImprovementOpportunity(opportunityId, {
				goalId: normalizeGoalScope(activeGoalId)
			});
		});

		if (knowledgeItemId) {
			savedLessonsOpen = true;
			actionNotice =
				'Saved a lesson for future runs. It is available in the Saved lessons section below.';
			await tick();
			document
				.getElementById(`knowledge-item-${knowledgeItemId}`)
				?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
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
		actionNotice = null;
		const nextSnapshot = await refreshSnapshot(
			normalizeProjectScope(requestedProjectId),
			normalizeGoalScope(requestedGoalId)
		);

		if (!nextSnapshot) {
			return;
		}

		if (nextSnapshot.summary.totalCount === 0) {
			actionNotice = 'No suggestions were found for this scope yet.';
			return;
		}

		if (nextSnapshot.summary.openCount === 0) {
			statusFilter = 'all';
			actionNotice =
				'This scope has tracked suggestions, but none are currently open. Showing all statuses so you can review or reopen them.';
			return;
		}

		actionNotice = 'Generated the latest suggestions for this scope.';
	}

	async function captureSuggestion() {
		if (isCapturingSuggestion) {
			return;
		}

		isCapturingSuggestion = true;
		actionError = null;
		actionNotice = null;

		try {
			await captureSelfImprovementSuggestion({
				title: captureTitle,
				summary: captureSummary,
				category: captureCategory,
				severity: captureSeverity,
				projectId: normalizeProjectScope(requestedProjectId),
				goalId: normalizeGoalScope(requestedGoalId)
			});
			captureTitle = '';
			captureSummary = '';
			await refreshSnapshot(
				normalizeProjectScope(requestedProjectId),
				normalizeGoalScope(requestedGoalId)
			);
			actionNotice = 'Captured the suggestion and added it to the current queue.';
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Could not capture the suggestion.';
		} finally {
			isCapturingSuggestion = false;
		}
	}
</script>

<AppPage>
	<PageHeader
		eyebrow="Suggestions"
		title="Review and steer system suggestions"
		description="Suggestions are generated from context across feedback, goals, projects, tasks, capacity, and runtime signals. Review them here, then turn the strongest items into follow-up tasks, saved lessons, or explicit decisions."
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

	{#if actionNotice}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			{actionNotice}
		</p>
	{/if}

	<section class="ui-panel space-y-5">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<h2 class="text-xl font-semibold text-white">Suggestion studio</h2>
				<p class="mt-1 max-w-2xl text-sm text-slate-400">
					Pick a scope, generate a fresh queue from the current context, and then work straight
					through the visible suggestions.
				</p>
			</div>
			<div class="text-sm text-slate-400">
				Last generated {snapshot.generatedAt.slice(0, 19).replace('T', ' ')}
			</div>
		</div>

		<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
			<div class="grid gap-4 lg:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Project scope</span>
					<select bind:value={requestedProjectId} class="select text-white">
						<option value="all">All projects</option>
						{#each data.projects as project (project.id)}
							<option value={project.id}>{project.name}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Goal focus</span>
					<select bind:value={requestedGoalId} class="select text-white">
						<option value="all">All goals</option>
						{#each data.goals as goal (goal.id)}
							<option value={goal.id}>{goal.label}</option>
						{/each}
					</select>
				</label>
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

		<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<h3 class="text-sm font-semibold text-white">Capture a suggestion</h3>
					<p class="mt-1 text-sm text-slate-400">
						Use this when you want to add a suggestion that did not surface from the system’s own
						analysis.
					</p>
				</div>
				<p class="text-xs text-slate-500">
					New suggestions use the selected project and goal scope above.
				</p>
			</div>

			<div
				class="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_repeat(2,minmax(0,0.7fr))_auto]"
			>
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Title</span>
					<input bind:value={captureTitle} class="input text-white" maxlength="120" />
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Summary</span>
					<input bind:value={captureSummary} class="input text-white" maxlength="320" />
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Category</span>
					<select bind:value={captureCategory} class="select text-white">
						{#each SELF_IMPROVEMENT_CATEGORY_OPTIONS as category (category)}
							<option value={category}>{formatSelfImprovementCategoryLabel(category)}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Severity</span>
					<select bind:value={captureSeverity} class="select text-white">
						{#each SELF_IMPROVEMENT_SEVERITY_OPTIONS as severity (severity)}
							<option value={severity}>{severity}</option>
						{/each}
					</select>
				</label>

				<div class="flex items-end">
					<button
						class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-200 disabled:opacity-60"
						type="button"
						onclick={() => {
							void captureSuggestion();
						}}
						disabled={isCapturingSuggestion}
					>
						{isCapturingSuggestion ? 'Capturing...' : 'Capture suggestion'}
					</button>
				</div>
			</div>
		</div>

		<div class="grid gap-3 lg:grid-cols-4">
			<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
				<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">Open</p>
				<p class="mt-2 text-2xl font-semibold text-white">{snapshot.summary.openCount}</p>
				<p class="mt-1 text-sm text-slate-400">Still waiting on a decision.</p>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
				<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
					High severity
				</p>
				<p class="mt-2 text-2xl font-semibold text-white">{snapshot.summary.highSeverityCount}</p>
				<p class="mt-1 text-sm text-slate-400">Worth resolving first.</p>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
				<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
					Planning gaps
				</p>
				<p class="mt-2 text-2xl font-semibold text-white">
					{snapshot.summary.bySource.planning_gaps}
				</p>
				<p class="mt-1 text-sm text-slate-400">Missing next-step work.</p>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
				<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
					Saved lessons
				</p>
				<p class="mt-2 text-2xl font-semibold text-white">{snapshot.knowledgeSummary.totalCount}</p>
				<p class="mt-1 text-sm text-slate-400">Reusable guidance captured so far.</p>
			</div>
		</div>
	</section>

	<details bind:open={savedLessonsOpen} class="ui-panel group">
		<summary
			class="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
		>
			<div>
				<h2 class="text-xl font-semibold text-white">Saved lessons</h2>
				<p class="mt-1 text-sm text-slate-400">
					Reusable guidance captured from prior suggestions. Open this when you want to review or
					publish lessons instead of deploying tasks.
				</p>
			</div>
			<div class="flex flex-wrap gap-2 text-xs text-slate-300">
				<span class="badge border border-slate-700 bg-slate-950/70">
					{snapshot.knowledgeSummary.totalCount} total
				</span>
				<span class="badge border border-slate-700 bg-slate-950/70">
					{snapshot.knowledgeSummary.publishedCount} published
				</span>
				<span class="badge border border-slate-700 bg-slate-950/70">
					{snapshot.knowledgeSummary.draftCount} draft
				</span>
			</div>
		</summary>

		<div class="mt-4">
			{#if snapshot.knowledgeItems.length === 0}
				<p class="ui-empty-state">
					No saved lessons have been captured yet. Use Save lesson when a suggestion is better
					treated as reusable guidance than as a follow-up task.
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
											<p
												class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase"
											>
												Trigger pattern
											</p>
											<p class="text-sm text-slate-300">{knowledgeItem.triggerPattern}</p>
										</div>

										<div class="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
											<p
												class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase"
											>
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
		</div>
	</details>

	<section class="ui-panel space-y-4">
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<h2 class="text-xl font-semibold text-white">Review queue</h2>
					<p class="mt-1 text-sm text-slate-400">
						Work through the visible suggestions, create follow-up tasks where needed, and dismiss
						noise quickly.
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

			<div class="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.8fr))]">
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

			<div class="flex flex-wrap gap-2 text-xs text-slate-300">
				<span class="badge border border-slate-700 bg-slate-950/70">
					{filteredOpportunities.length} visible
				</span>
				<span class="badge border border-slate-700 bg-slate-950/70"
					>Scope: {activeProjectLabel}</span
				>
				<span class="badge border border-slate-700 bg-slate-950/70">Goal: {activeGoalLabel}</span>
			</div>
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

								<div class="grid gap-3 lg:grid-cols-2">
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
										<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
											Why now
										</p>
										<p class="mt-2 text-sm text-slate-300">
											{opportunity.signals[0] ??
												'This suggestion has supporting evidence attached.'}
										</p>
									</div>

									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
										<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
											Best next move
										</p>
										<p class="mt-2 text-sm text-slate-300">
											{opportunity.recommendedActions[0] ??
												'Turn this suggestion into a concrete follow-up task or dismiss it.'}
										</p>
									</div>
								</div>

								{#if opportunity.createdTaskId}
									<p class="text-sm text-sky-200">
										Linked follow-up task: {opportunity.createdTaskTitle ??
											opportunity.createdTaskId}
									</p>
								{/if}

								{#if opportunity.createdKnowledgeItemId}
									<p class="text-sm text-emerald-200">
										Linked saved lesson:
										<a
											class="underline decoration-dotted underline-offset-4"
											href={`#knowledge-item-${opportunity.createdKnowledgeItemId}`}
										>
											{opportunity.createdKnowledgeItemTitle ?? opportunity.createdKnowledgeItemId}
										</a>
									</p>
								{/if}

								<details class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
									<summary class="cursor-pointer list-none text-sm font-medium text-slate-200">
										View evidence and implementation notes
									</summary>
									<div class="mt-4 grid gap-4 lg:grid-cols-2">
										<div class="space-y-2">
											<p
												class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase"
											>
												Signals
											</p>
											<ul class="space-y-2 text-sm text-slate-300">
												{#each opportunity.signals as signal (signal)}
													<li>{signal}</li>
												{/each}
											</ul>
										</div>

										<div class="space-y-2">
											<p
												class="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase"
											>
												Recommended actions
											</p>
											<ul class="space-y-2 text-sm text-slate-300">
												{#each opportunity.recommendedActions as actionItem (actionItem)}
													<li>{actionItem}</li>
												{/each}
											</ul>
										</div>
									</div>
								</details>
							</div>

							<div class="flex w-full flex-col gap-2 xl:w-56">
								{#if opportunity.createdTaskId}
									<a
										class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-200"
										href={resolve(`/app/tasks/${opportunity.createdTaskId}`)}
									>
										Open follow-up task
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
										{opportunityIsPending(opportunity.id) ? 'Working...' : 'Create follow-up task'}
									</button>
								{/if}

								{#if opportunity.createdKnowledgeItemId}
									<a
										class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200"
										href={`#knowledge-item-${opportunity.createdKnowledgeItemId}`}
									>
										Open saved lesson
									</a>
								{:else if opportunity.suggestedKnowledgeItem && !opportunity.suggestedTask}
									<button
										class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200 disabled:opacity-60"
										type="button"
										onclick={() => {
											void createKnowledgeDraft(opportunity.id);
										}}
										disabled={opportunityIsPending(opportunity.id)}
									>
										{opportunityIsPending(opportunity.id) ? 'Working...' : 'Save lesson'}
									</button>
								{/if}

								{#if opportunityNeedsManualAcceptance(opportunity) && opportunity.status !== 'accepted'}
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

	<details bind:open={feedbackSignalsOpen} class="ui-panel group">
		<summary
			class="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
		>
			<div>
				<h2 class="text-xl font-semibold text-white">System signals</h2>
				<p class="mt-1 text-sm text-slate-400">
					Raw system evidence behind the current suggestion set, including feedback-derived signals.
					Open this when you need to inspect why the auto-generated items are being produced.
				</p>
			</div>
			<div class="flex flex-wrap gap-2 text-xs text-slate-300">
				<span class="badge border border-slate-700 bg-slate-950/70">
					{snapshot.signalSummary.totalCount} tracked
				</span>
				<span class="badge border border-slate-700 bg-slate-950/70">
					{snapshot.signalSummary.highSeverityCount} high severity
				</span>
			</div>
		</summary>

		<div class="mt-4">
			{#if snapshot.signals.length === 0}
				<p class="ui-empty-state">No system signals are currently being tracked.</p>
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
		</div>
	</details>
</AppPage>
