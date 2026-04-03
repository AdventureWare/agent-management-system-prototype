<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { appNavigationSections } from '$lib/app-navigation';
	import {
		createTaskFromSelfImprovementOpportunity,
		fetchHomeDashboard,
		updateSelfImprovementOpportunityStatus
	} from '$lib/client/agent-data';
	import { formatThreadStateLabel } from '$lib/thread-activity';
	import type { AgentThreadDetail } from '$lib/types/agent-session';
	import {
		formatTaskApprovalModeLabel,
		formatTaskStatusLabel,
		taskStatusToneClass
	} from '$lib/types/control-plane';
	import {
		formatSelfImprovementCategoryLabel,
		formatSelfImprovementStatusLabel,
		selfImprovementSeverityToneClass,
		selfImprovementStatusToneClass
	} from '$lib/types/self-improvement';
	import type { SelfImprovementStatus } from '$lib/types/self-improvement';
	import type { DashboardTaskAttentionItem, HomeDashboardData } from '$lib/types/home-dashboard';
	import type { TaskStaleSignalKey } from '$lib/types/task-work-item';

	let { data } = $props<{ data: HomeDashboardData }>();
	let autoRefresh = $state(true);
	let isRefreshing = $state(false);
	let refreshedDashboard = $state.raw<HomeDashboardData | null>(null);
	let refreshError = $state<string | null>(null);
	let dashboard: HomeDashboardData = $derived(refreshedDashboard ?? data);

	let activeSessions = $derived(
		dashboard.sessions.filter(
			(session: AgentThreadDetail) =>
				session.sessionState === 'starting' ||
				session.sessionState === 'waiting' ||
				session.sessionState === 'working'
		)
	);
	let attentionSessions = $derived(
		dashboard.sessions.filter((session: AgentThreadDetail) => session.sessionState === 'attention')
	);
	let availableSessions = $derived(
		dashboard.sessions.filter((session: AgentThreadDetail) => session.sessionState === 'ready')
	);
	let latestSessions = $derived(dashboard.sessions.slice(0, 5));
	let blockedTasks = $derived(
		dashboard.taskAttention.filter((task: DashboardTaskAttentionItem) => task.status === 'blocked')
	);
	let reviewTasks = $derived(
		dashboard.taskAttention.filter((task: DashboardTaskAttentionItem) => task.openReview)
	);
	let approvalTasks = $derived(
		dashboard.taskAttention.filter((task: DashboardTaskAttentionItem) => task.pendingApproval)
	);
	let dependencyTasks = $derived(
		dashboard.taskAttention.filter((task: DashboardTaskAttentionItem) => task.hasUnmetDependencies)
	);
	let staleTasks = $derived(dashboard.staleTasks);
	let improvementOpportunities = $derived(dashboard.improvementOpportunities);
	let opportunityActionIds = $state.raw<string[]>([]);
	let opportunityActionError = $state<string | null>(null);
	let opportunityActionNotice = $state<string | null>(null);

	function userIsEditingFormControl() {
		const activeElement = document.activeElement;

		if (!(activeElement instanceof HTMLElement)) {
			return false;
		}

		if (activeElement.isContentEditable) {
			return true;
		}

		return ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);
	}

	async function refreshDashboard(options: { force?: boolean } = {}) {
		if (isRefreshing) {
			return;
		}

		if (!options.force && (document.hidden || userIsEditingFormControl())) {
			return;
		}

		isRefreshing = true;

		try {
			refreshedDashboard = await fetchHomeDashboard();
			refreshError = null;
		} catch (err) {
			refreshError = err instanceof Error ? err.message : 'Could not refresh dashboard.';
		} finally {
			isRefreshing = false;
		}
	}

	function opportunityActionIsPending(opportunityId: string) {
		return opportunityActionIds.includes(opportunityId);
	}

	async function runOpportunityAction<T>(
		opportunityId: string,
		action: () => Promise<T>
	): Promise<T | null> {
		if (opportunityActionIsPending(opportunityId)) {
			return null;
		}

		opportunityActionIds = [...opportunityActionIds, opportunityId];
		opportunityActionError = null;
		opportunityActionNotice = null;

		try {
			const result = await action();
			await refreshDashboard({ force: true });
			return result;
		} catch (err) {
			opportunityActionError =
				err instanceof Error ? err.message : 'Could not update the suggestion.';
			return null;
		} finally {
			opportunityActionIds = opportunityActionIds.filter((id) => id !== opportunityId);
		}
	}

	async function updateOpportunityStatus(opportunityId: string, status: SelfImprovementStatus) {
		await runOpportunityAction(opportunityId, async () => {
			await updateSelfImprovementOpportunityStatus(opportunityId, status);
		});
	}

	async function createOpportunityTask(opportunityId: string) {
		const taskId = await runOpportunityAction(opportunityId, async () => {
			return createTaskFromSelfImprovementOpportunity(opportunityId);
		});

		if (taskId) {
			opportunityActionNotice = 'Opened the created follow-up task.';
			await goto(resolve(`/app/tasks/${taskId}`));
		}
	}

	function sessionStateClass(state: AgentThreadDetail['sessionState']) {
		switch (state) {
			case 'working':
				return 'border border-emerald-800/70 bg-emerald-950/50 text-emerald-300';
			case 'starting':
				return 'border border-violet-800/70 bg-violet-950/50 text-violet-300';
			case 'waiting':
			case 'ready':
				return 'border border-sky-800/70 bg-sky-950/50 text-sky-300';
			case 'attention':
				return 'border border-rose-900/70 bg-rose-950/40 text-rose-300';
			case 'unavailable':
			default:
				return 'border border-slate-700 bg-slate-900 text-slate-300';
		}
	}

	function staleBadgeClass(signal: TaskStaleSignalKey) {
		switch (signal) {
			case 'staleInProgress':
				return 'border border-violet-800/70 bg-violet-950/40 text-violet-200';
			case 'noRecentRunActivity':
				return 'border border-rose-800/70 bg-rose-950/40 text-rose-200';
			case 'activeThreadNoRecentOutput':
				return 'border border-amber-800/70 bg-amber-950/40 text-amber-200';
			default:
				return 'border border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function staleBadgeLabel(task: DashboardTaskAttentionItem, signal: TaskStaleSignalKey) {
		switch (signal) {
			case 'staleInProgress':
				return `stale WIP ${task.freshness.taskAgeLabel}`;
			case 'noRecentRunActivity':
				return `run quiet ${task.freshness.runActivityAgeLabel}`;
			case 'activeThreadNoRecentOutput':
				return `thread quiet ${task.freshness.threadActivityAgeLabel}`;
			default:
				return '';
		}
	}

	$effect(() => {
		if (!autoRefresh || activeSessions.length === 0) {
			return;
		}

		const intervalId = window.setInterval(() => {
			if (document.visibilityState !== 'visible') {
				return;
			}

			void refreshDashboard();
		}, 10000);

		return () => {
			window.clearInterval(intervalId);
		};
	});
</script>

{#snippet sessionCard(session: AgentThreadDetail)}
	<article class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
		<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
			<div class="min-w-0 space-y-2">
				<div class="flex flex-wrap items-center gap-2">
					<h3 class="ui-wrap-anywhere font-medium text-white">{session.name}</h3>
					<span
						class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
					>
						{session.sandbox}
					</span>
					<span
						class={[
							'inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase',
							sessionStateClass(session.sessionState)
						]}
					>
						{formatThreadStateLabel(session.sessionState)}
					</span>
					<span
						class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
					>
						latest run {session.latestRunStatus}
					</span>
				</div>
				<p class="ui-clamp-3 text-sm text-slate-300">{session.sessionSummary}</p>
				<p class="ui-wrap-anywhere text-xs text-slate-500">{session.cwd}</p>
			</div>

			<div class="text-left text-xs text-slate-500 sm:text-right">
				<p>Last activity</p>
				<p class="mt-1 text-sm text-white">{session.lastActivityLabel}</p>
			</div>
		</div>

		<div class="grid gap-3 sm:grid-cols-4">
			<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
				<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Thread</p>
				<p class="mt-2 text-sm font-medium text-white">
					{session.threadId ? 'Available' : 'Missing'}
				</p>
			</div>
			<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
				<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Runs</p>
				<p class="mt-2 text-sm font-medium text-white">{session.runCount}</p>
			</div>
			<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
				<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Exit code</p>
				<p class="mt-2 text-sm font-medium text-white">{session.lastExitCode ?? 'n/a'}</p>
			</div>
			<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
				<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Follow-up</p>
				<p class="mt-2 text-sm font-medium text-white">
					{session.canResume ? 'Available' : 'Blocked'}
				</p>
			</div>
		</div>

		{#if session.latestRun?.lastMessage}
			<div class="space-y-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
				<p class="text-[11px] font-medium tracking-[0.16em] text-slate-400 uppercase">
					Last agent message
				</p>
				<p class="ui-wrap-anywhere text-sm whitespace-pre-wrap text-slate-200">
					{session.latestRun.lastMessage}
				</p>
			</div>
		{/if}
	</article>
{/snippet}

<section
	class="mx-auto flex w-full max-w-[90rem] flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-8 xl:px-8 2xl:px-10"
>
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Home</p>
		<h1 class="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
			Agent activity at a glance
		</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			This is the operator view. It keeps the current state, trouble spots, and resumable work on
			one page so you can check your laptop workers quickly while you are away.
		</p>
		<div
			class="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:flex-wrap sm:items-center"
		>
			<label
				class="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2"
			>
				<input bind:checked={autoRefresh} type="checkbox" />
				<span>Auto-refresh every 10s while runs are active</span>
			</label>
			<button
				class="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-slate-300 transition hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:rounded-full"
				type="button"
				onclick={() => {
					void refreshDashboard({ force: true });
				}}
				disabled={isRefreshing}
			>
				{isRefreshing ? 'Refreshing...' : 'Refresh now'}
			</button>
			<a
				class="w-full rounded-2xl border border-sky-800/70 bg-sky-950/40 px-3 py-2 text-center text-sky-200 transition hover:border-sky-700 hover:text-white sm:w-auto sm:rounded-full"
				href={resolve('/app/threads')}
			>
				Open detailed thread controls
			</a>
		</div>
		{#if refreshError}
			<p
				class="rounded-xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
			>
				{refreshError}
			</p>
		{/if}
	</div>

	<section class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
		<div class="flex flex-col gap-2">
			<h2 class="text-lg font-semibold text-white sm:text-xl">Browse by area</h2>
			<p class="max-w-3xl text-sm text-slate-400">
				Use this page for cross-cutting status, then move into the work, context, or capacity
				surface that matches the decision you need to make next.
			</p>
		</div>

		<div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			{#each appNavigationSections as section (section.id)}
				<article class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
					<p class="text-[11px] font-semibold tracking-[0.18em] text-sky-300 uppercase">
						{section.title}
					</p>
					<p class="mt-2 text-sm text-slate-400">{section.description}</p>
					<div class="mt-4 flex flex-wrap gap-2">
						{#each section.links as link (link.href)}
							{@const isCurrent = link.href === '/app/home'}
							<a
								class={[
									'rounded-full border px-3 py-2 text-xs font-medium tracking-[0.14em] uppercase transition',
									isCurrent
										? 'border-sky-700/70 bg-sky-950/50 text-sky-200'
										: 'border-slate-700 text-slate-200 hover:border-slate-600 hover:text-white'
								]}
								href={resolve(link.href)}
								aria-current={isCurrent ? 'page' : undefined}
							>
								{link.label}
							</a>
						{/each}
					</div>
				</article>
			{/each}
		</div>
	</section>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Active</p>
			<p class="mt-2 text-3xl font-semibold text-white">{dashboard.sessionSummary.activeCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Available</p>
			<p class="mt-2 text-3xl font-semibold text-white">{dashboard.sessionSummary.readyCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Needs attention</p>
			<p class="mt-2 text-3xl font-semibold text-white">
				{dashboard.sessionSummary.attentionCount}
			</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">History only / idle</p>
			<p class="mt-2 text-3xl font-semibold text-white">
				{dashboard.sessionSummary.unavailableCount}
			</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Total threads</p>
			<p class="mt-2 text-3xl font-semibold text-white">{dashboard.sessionSummary.totalCount}</p>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Ready tasks</p>
			<p class="mt-2 text-3xl font-semibold text-white">
				{dashboard.controlSummary.readyTaskCount}
			</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Blocked tasks</p>
			<p class="mt-2 text-3xl font-semibold text-white">
				{dashboard.controlSummary.blockedTaskCount}
			</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Open reviews</p>
			<p class="mt-2 text-3xl font-semibold text-white">
				{dashboard.controlSummary.openReviewCount}
			</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Pending approvals</p>
			<p class="mt-2 text-3xl font-semibold text-white">
				{dashboard.controlSummary.pendingApprovalCount}
			</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Dependency blocked</p>
			<p class="mt-2 text-3xl font-semibold text-white">
				{dashboard.controlSummary.dependencyBlockedTaskCount}
			</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">High risk open</p>
			<p class="mt-2 text-3xl font-semibold text-white">
				{dashboard.controlSummary.highRiskTaskCount}
			</p>
		</div>
	</div>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
		<div class="space-y-6">
			<section class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-xl font-semibold text-white">Stale work watchlist</h2>
						<p class="text-sm text-slate-400">
							Aging tasks, quiet runs, and active threads that have stopped producing fresh output.
						</p>
					</div>
					<a class="text-sm text-sky-300 hover:text-white" href={resolve('/app/improvements')}
						>Open suggestions</a
					>
				</div>

				<div class="grid gap-3 sm:grid-cols-3">
					<div class="rounded-xl border border-violet-900/50 bg-violet-950/30 p-4">
						<p class="text-xs tracking-[0.16em] text-violet-300 uppercase">Stale WIP</p>
						<p class="mt-2 text-2xl font-semibold text-white">
							{dashboard.staleTaskSummary.staleInProgressCount}
						</p>
					</div>
					<div class="rounded-xl border border-rose-900/50 bg-rose-950/30 p-4">
						<p class="text-xs tracking-[0.16em] text-rose-300 uppercase">No recent run activity</p>
						<p class="mt-2 text-2xl font-semibold text-white">
							{dashboard.staleTaskSummary.noRecentRunActivityCount}
						</p>
					</div>
					<div class="rounded-xl border border-amber-900/50 bg-amber-950/30 p-4">
						<p class="text-xs tracking-[0.16em] text-amber-300 uppercase">Quiet active threads</p>
						<p class="mt-2 text-2xl font-semibold text-white">
							{dashboard.staleTaskSummary.activeThreadNoRecentOutputCount}
						</p>
					</div>
				</div>

				{#if dashboard.staleTaskSummary.totalCount === 0}
					<p class="text-sm text-slate-400">No stale work is being surfaced right now.</p>
				{:else}
					<div class="space-y-3">
						{#each staleTasks as task (task.id)}
							<article class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<p class="font-medium text-white">{task.title}</p>
											<span
												class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${taskStatusToneClass(task.status)}`}
											>
												{formatTaskStatusLabel(task.status)}
											</span>
											{#each task.freshness.staleSignals as signal (signal)}
												<span
													class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${staleBadgeClass(signal)}`}
												>
													{staleBadgeLabel(task, signal)}
												</span>
											{/each}
										</div>
										<p class="ui-clamp-3 mt-2 text-sm text-slate-300">{task.summary}</p>
										<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">
											{task.projectName} · {task.assigneeName} · updated {task.updatedAtLabel}
										</p>
										<div class="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
											{#if task.freshness.noRecentRunActivity}
												<p>Last run activity {task.freshness.runActivityAgeLabel}</p>
											{/if}
											{#if task.freshness.activeThreadNoRecentOutput}
												<p>Thread activity {task.freshness.threadActivityAgeLabel}</p>
											{/if}
										</div>
									</div>
									<a
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-sm leading-none text-slate-300 transition hover:border-slate-600 hover:text-white"
										href={resolve(`/app/tasks/${task.id}`)}
									>
										Inspect task
									</a>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>

			<section class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-xl font-semibold text-white">Live workload</h2>
						<p class="text-sm text-slate-400">Running and queued work on this laptop.</p>
					</div>
					<a class="text-sm text-sky-300 hover:text-white" href={resolve('/app/runs')}
						>Manage runs</a
					>
				</div>

				{#if activeSessions.length === 0}
					<p class="text-sm text-slate-400">No active runs right now.</p>
				{:else}
					<div class="space-y-4">
						{#each activeSessions as session (session.id)}
							{@render sessionCard(session)}
						{/each}
					</div>
				{/if}
			</section>

			<section class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6">
				<div>
					<h2 class="text-xl font-semibold text-white">Needs attention</h2>
					<p class="text-sm text-slate-400">
						Stopped runs and threads that likely need a decision.
					</p>
				</div>

				{#if attentionSessions.length === 0}
					<p class="text-sm text-slate-400">Nothing is blocked or failed right now.</p>
				{:else}
					<div class="space-y-4">
						{#each attentionSessions as session (session.id)}
							{@render sessionCard(session)}
						{/each}
					</div>
				{/if}
			</section>

			<section class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-xl font-semibold text-white">Task attention queue</h2>
						<p class="text-sm text-slate-400">
							Blocked work, open reviews, pending approvals, and items waiting on dependencies.
						</p>
					</div>
					<a class="text-sm text-sky-300 hover:text-white" href={resolve('/app/tasks')}
						>Open task board</a
					>
				</div>

				<div class="grid gap-3 sm:grid-cols-4">
					<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
						<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Blocked</p>
						<p class="mt-2 text-2xl font-semibold text-white">{blockedTasks.length}</p>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
						<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Open reviews</p>
						<p class="mt-2 text-2xl font-semibold text-white">{reviewTasks.length}</p>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
						<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Approvals</p>
						<p class="mt-2 text-2xl font-semibold text-white">{approvalTasks.length}</p>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
						<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Dependencies</p>
						<p class="mt-2 text-2xl font-semibold text-white">{dependencyTasks.length}</p>
					</div>
				</div>

				{#if dashboard.taskAttention.length === 0}
					<p class="text-sm text-slate-400">No task-level intervention points right now.</p>
				{:else}
					<div class="space-y-3">
						{#each dashboard.taskAttention as task (task.id)}
							<article class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<p class="font-medium text-white">{task.title}</p>
											<span
												class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${taskStatusToneClass(task.status)}`}
											>
												{formatTaskStatusLabel(task.status)}
											</span>
											<span
												class={[
													'inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase',
													task.riskLevel === 'high'
														? 'border border-rose-900/70 bg-rose-950/40 text-rose-300'
														: task.riskLevel === 'medium'
															? 'border border-amber-900/70 bg-amber-950/40 text-amber-300'
															: 'border border-emerald-900/70 bg-emerald-950/40 text-emerald-300'
												]}
											>
												{task.riskLevel} risk
											</span>
											{#if task.openReview}
												<span
													class="inline-flex items-center justify-center rounded-full border border-amber-900/70 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
												>
													review open
												</span>
											{/if}
											{#if task.pendingApproval}
												<span
													class="inline-flex items-center justify-center rounded-full border border-amber-900/70 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
												>
													approval {formatTaskApprovalModeLabel(task.pendingApproval.mode)}
												</span>
											{/if}
											{#if task.hasUnmetDependencies}
												<span
													class="inline-flex items-center justify-center rounded-full border border-rose-800/70 bg-rose-950/40 px-2 py-1 text-center text-[11px] leading-none text-rose-200 uppercase"
												>
													waiting on dependency
												</span>
											{/if}
											{#each task.freshness.staleSignals as signal (signal)}
												<span
													class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${staleBadgeClass(signal)}`}
												>
													{staleBadgeLabel(task, signal)}
												</span>
											{/each}
										</div>
										<p class="ui-clamp-3 mt-2 text-sm text-slate-300">{task.summary}</p>
										<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">
											{task.projectName !== 'No project' ? task.projectName : task.goalName} · {task.assigneeName}
											· approval {formatTaskApprovalModeLabel(task.approvalMode)}
										</p>
										{#if task.blockedReason}
											<p class="mt-2 text-sm text-rose-200">{task.blockedReason}</p>
										{/if}
										{#if task.dependencyTaskNames.length > 0}
											<p class="ui-wrap-anywhere mt-2 text-xs text-slate-400">
												Depends on: {task.dependencyTaskNames.join(', ')}
											</p>
										{/if}
										{#if task.openReview}
											<p class="mt-2 text-xs text-sky-200">{task.openReview.summary}</p>
										{/if}
										{#if task.pendingApproval}
											<p class="mt-2 text-xs text-amber-200">{task.pendingApproval.summary}</p>
										{/if}
									</div>
									<a
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-sm leading-none text-slate-300 transition hover:border-slate-600 hover:text-white"
										href={resolve(`/app/tasks/${task.id}`)}
									>
										Inspect task
									</a>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</div>

		<div class="space-y-6">
			<section class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-xl font-semibold text-white">Suggestions</h2>
						<p class="text-sm text-slate-400">
							Patterns emerging from failures, blockers, reviews, stale work, and reusable thread
							context.
						</p>
					</div>
					<a class="text-sm text-sky-300 hover:text-white" href={resolve('/app/tasks')}
						>Open task board</a
					>
				</div>

				<div class="grid gap-3 sm:grid-cols-3">
					<div class="rounded-xl border border-violet-900/50 bg-violet-950/30 p-4">
						<p class="text-xs tracking-[0.16em] text-violet-300 uppercase">Open</p>
						<p class="mt-2 text-2xl font-semibold text-white">
							{dashboard.improvementSummary.openCount}
						</p>
					</div>
					<div class="rounded-xl border border-sky-900/50 bg-sky-950/30 p-4">
						<p class="text-xs tracking-[0.16em] text-sky-300 uppercase">Accepted</p>
						<p class="mt-2 text-2xl font-semibold text-white">
							{dashboard.improvementSummary.acceptedCount}
						</p>
					</div>
					<div class="rounded-xl border border-rose-900/50 bg-rose-950/30 p-4">
						<p class="text-xs tracking-[0.16em] text-rose-300 uppercase">High severity</p>
						<p class="mt-2 text-2xl font-semibold text-white">
							{dashboard.improvementSummary.highSeverityCount}
						</p>
					</div>
				</div>

				{#if dashboard.improvementSummary.totalCount === 0}
					<p class="text-sm text-slate-400">No suggestions are being surfaced right now.</p>
				{:else}
					{#if opportunityActionError}
						<p
							class="rounded-xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
						>
							{opportunityActionError}
						</p>
					{/if}
					{#if opportunityActionNotice}
						<p
							class="rounded-xl border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
						>
							{opportunityActionNotice}
						</p>
					{/if}
					<div class="space-y-3">
						{#each improvementOpportunities as opportunity (opportunity.id)}
							<article class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
								<div class="flex flex-col gap-3">
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<p class="font-medium text-white">{opportunity.title}</p>
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
										</div>
										<p class="ui-clamp-3 mt-2 text-sm text-slate-300">{opportunity.summary}</p>
										<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">
											{opportunity.projectName ?? 'No project'} · first seen {opportunity.firstSeenAt.slice(
												0,
												10
											)}
										</p>
										{#if opportunity.signals.length > 0}
											<p class="ui-wrap-anywhere mt-2 text-xs text-slate-400">
												{opportunity.signals[0]}
											</p>
										{/if}
										{#if opportunity.createdTaskId}
											<p class="mt-2 text-xs text-sky-200">
												Follow-up task created: {opportunity.createdTaskTitle ??
													opportunity.createdTaskId}
											</p>
										{/if}
									</div>
									<div class="flex flex-wrap gap-2">
										{#if opportunity.createdTaskId}
											<a
												class="inline-flex items-center justify-center rounded-full border border-sky-800/70 bg-sky-950/40 px-3 py-2 text-center text-sm leading-none text-sky-200 transition hover:border-sky-700 hover:text-white"
												href={resolve(`/app/tasks/${opportunity.createdTaskId}`)}
											>
												Open follow-up task
											</a>
										{:else if opportunity.suggestedTask}
											<button
												class="inline-flex items-center justify-center rounded-full border border-sky-800/70 bg-sky-950/40 px-3 py-2 text-center text-sm leading-none text-sky-200 transition hover:border-sky-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
												type="button"
												onclick={() => {
													void createOpportunityTask(opportunity.id);
												}}
												disabled={opportunityActionIsPending(opportunity.id)}
											>
												{opportunityActionIsPending(opportunity.id)
													? 'Working...'
													: 'Create follow-up task'}
											</button>
										{/if}

										{#if !opportunity.suggestedTask && opportunity.status !== 'accepted'}
											<button
												class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-sm leading-none text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
												type="button"
												onclick={() => {
													void updateOpportunityStatus(opportunity.id, 'accepted');
												}}
												disabled={opportunityActionIsPending(opportunity.id)}
											>
												Accept
											</button>
										{/if}

										{#if opportunity.status !== 'dismissed'}
											<button
												class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-sm leading-none text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
												type="button"
												onclick={() => {
													void updateOpportunityStatus(opportunity.id, 'dismissed');
												}}
												disabled={opportunityActionIsPending(opportunity.id)}
											>
												Dismiss
											</button>
										{/if}

										{#if opportunity.status !== 'open'}
											<button
												class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-sm leading-none text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
												type="button"
												onclick={() => {
													void updateOpportunityStatus(opportunity.id, 'open');
												}}
												disabled={opportunityActionIsPending(opportunity.id)}
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

			<section class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6">
				<div>
					<h2 class="text-xl font-semibold text-white">Available for follow-up</h2>
					<p class="text-sm text-slate-400">
						Work threads that are idle and can take another instruction.
					</p>
				</div>

				{#if availableSessions.length === 0}
					<p class="text-sm text-slate-400">No resumable threads right now.</p>
				{:else}
					<div class="space-y-3">
						{#each availableSessions as session (session.id)}
							<a
								class="block rounded-xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-slate-700"
								href={resolve('/app/threads')}
							>
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div class="min-w-0">
										<p class="font-medium text-white">{session.name}</p>
										<p class="ui-clamp-3 mt-1 text-sm text-slate-300">{session.sessionSummary}</p>
										<p class="ui-wrap-anywhere mt-1 text-xs text-slate-500">{session.cwd}</p>
									</div>
									<div class="text-left text-xs text-slate-500 sm:text-right">
										<p>Last activity</p>
										<p class="mt-1 text-sm text-white">{session.lastActivityLabel}</p>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</section>

			<section class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6">
				<div>
					<h2 class="text-xl font-semibold text-white">Recent threads</h2>
					<p class="text-sm text-slate-400">Newest threads across all states.</p>
				</div>

				<div class="space-y-3">
					{#each latestSessions as session (session.id)}
						<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<p class="font-medium text-white">{session.name}</p>
										<span
											class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
										>
											{formatThreadStateLabel(session.sessionState)}
										</span>
									</div>
									<p class="ui-clamp-3 mt-1 text-sm text-slate-300">{session.sessionSummary}</p>
								</div>
								<p class="text-xs text-slate-500 sm:text-right">{session.lastActivityLabel}</p>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<section class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6">
				<div>
					<h2 class="text-xl font-semibold text-white">Operator notes</h2>
					<p class="text-sm text-slate-400">
						Use the dashboard for scan speed and the threads page for control.
					</p>
				</div>
				<ul class="space-y-3 text-sm text-slate-300">
					<li>
						Check this page first when you are away from the laptop and want a fast status read.
					</li>
					<li>
						Open the detailed threads page when you need to start a task, cancel a run, or send the
						next prompt.
					</li>
					<li>
						If a run fails without a thread id, treat it as a dead end and start a new thread
						instead of trying to resume it.
					</li>
				</ul>
			</section>
		</div>
	</div>
</section>
