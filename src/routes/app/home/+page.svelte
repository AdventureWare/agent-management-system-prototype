<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { AgentSessionDetail, AgentTimelineStep } from '$lib/types/agent-session';

	let { data } = $props();
	let autoRefresh = $state(true);
	let isRefreshing = $state(false);

	let activeSessions = $derived(
		data.sessions.filter((session) => session.status === 'running' || session.status === 'queued')
	);
	let attentionSessions = $derived(
		data.sessions.filter((session) => session.status === 'failed' || session.status === 'canceled')
	);
	let followUpSessions = $derived(
		data.sessions.filter((session) => session.status === 'completed' && session.canResume)
	);
	let latestSessions = $derived(data.sessions.slice(0, 5));
	let blockedTasks = $derived(data.taskAttention.filter((task) => task.status === 'blocked'));
	let reviewTasks = $derived(
		data.taskAttention.filter((task) => task.status === 'review' && task.requiresReview)
	);
	let dependencyTasks = $derived(data.taskAttention.filter((task) => task.hasUnmetDependencies));

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

	async function refreshDashboard() {
		if (isRefreshing || document.hidden || userIsEditingFormControl()) {
			return;
		}

		isRefreshing = true;

		try {
			await invalidateAll();
		} finally {
			isRefreshing = false;
		}
	}

	function timelineDotClass(state: AgentTimelineStep['state']) {
		switch (state) {
			case 'complete':
				return 'bg-emerald-400 ring-4 ring-emerald-950/60';
			case 'current':
				return 'bg-sky-400 ring-4 ring-sky-950/60';
			case 'attention':
				return 'bg-rose-400 ring-4 ring-rose-950/60';
			default:
				return 'bg-slate-700 ring-4 ring-slate-950/60';
		}
	}

	function timelineConnectorClass(state: AgentTimelineStep['state']) {
		switch (state) {
			case 'complete':
				return 'bg-emerald-900/70';
			case 'current':
				return 'bg-sky-900/70';
			case 'attention':
				return 'bg-rose-900/70';
			default:
				return 'bg-slate-800';
		}
	}

	function timelineCardClass(state: AgentTimelineStep['state']) {
		switch (state) {
			case 'complete':
				return 'border-emerald-900/60 bg-emerald-950/20';
			case 'current':
				return 'border-sky-900/60 bg-sky-950/20';
			case 'attention':
				return 'border-rose-900/60 bg-rose-950/20';
			default:
				return 'border-slate-800 bg-slate-950/60';
		}
	}

	$effect(() => {
		if (!autoRefresh || activeSessions.length === 0) {
			return;
		}

		const intervalId = window.setInterval(() => {
			void refreshDashboard();
		}, 10000);

		return () => {
			window.clearInterval(intervalId);
		};
	});
</script>

{#snippet timeline(session: AgentSessionDetail)}
	<ol class="flex flex-col gap-2 lg:flex-row lg:items-start">
		{#each session.runTimeline as step, index (step.key)}
			<li class="flex min-w-0 flex-1 items-start gap-3 lg:basis-0">
				<div class="flex min-w-0 flex-1 items-start gap-2">
					<span class={`mt-1.5 h-2.5 w-2.5 rounded-full ${timelineDotClass(step.state)}`}></span>
					<div class={`min-w-0 flex-1 rounded-lg border p-3 ${timelineCardClass(step.state)}`}>
						<p class="text-xs font-medium text-white">{step.label}</p>
						<p class="mt-0.5 text-[11px] text-slate-400">{step.detail}</p>
					</div>
				</div>

				{#if index < session.runTimeline.length - 1}
					<div
						class={`mt-5 hidden w-6 shrink-0 rounded-full lg:block lg:h-px xl:w-8 ${timelineConnectorClass(step.state)}`}
					></div>
				{/if}
			</li>
		{/each}
	</ol>
{/snippet}

{#snippet sessionCard(session: AgentSessionDetail)}
	<article class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
		<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
			<div class="min-w-0 space-y-2">
				<div class="flex flex-wrap items-center gap-2">
					<h3 class="font-medium text-white">{session.name}</h3>
					<span
						class="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 uppercase"
					>
						{session.sandbox}
					</span>
					<span
						class={[
							'rounded-full px-2 py-1 text-[11px] uppercase',
							session.status === 'running'
								? 'border border-emerald-800/70 bg-emerald-950/50 text-emerald-300'
								: session.status === 'queued'
									? 'border border-amber-800/70 bg-amber-950/50 text-amber-300'
									: session.status === 'failed' || session.status === 'canceled'
										? 'border border-rose-900/70 bg-rose-950/40 text-rose-300'
										: 'border border-sky-800/70 bg-sky-950/50 text-sky-300'
						]}
					>
						{session.status}
					</span>
				</div>
				<p class="text-sm text-slate-300">{session.statusSummary}</p>
				<p class="text-xs break-all text-slate-500">{session.cwd}</p>
			</div>

			<div class="text-left text-xs text-slate-500 sm:text-right">
				<p>Last activity</p>
				<p class="mt-1 text-sm text-white">{session.lastActivityLabel}</p>
			</div>
		</div>

		<div class="grid gap-3 sm:grid-cols-4">
			<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
				<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Thread</p>
				<p class="mt-2 text-sm font-medium text-white">{session.threadId ? 'Ready' : 'Missing'}</p>
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
				<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Resume</p>
				<p class="mt-2 text-sm font-medium text-white">
					{session.canResume ? 'Available' : 'Blocked'}
				</p>
			</div>
		</div>

		<div class="space-y-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
			<p class="text-[11px] font-medium tracking-[0.16em] text-slate-400 uppercase">Run timeline</p>
			{@render timeline(session)}
		</div>

		{#if session.latestRun?.lastMessage}
			<div class="space-y-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
				<p class="text-[11px] font-medium tracking-[0.16em] text-slate-400 uppercase">
					Last agent message
				</p>
				<p class="text-sm break-words whitespace-pre-wrap text-slate-200">
					{session.latestRun.lastMessage}
				</p>
			</div>
		{/if}
	</article>
{/snippet}

<section class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Dashboard</p>
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
					void refreshDashboard();
				}}
				disabled={isRefreshing}
			>
				{isRefreshing ? 'Refreshing...' : 'Refresh now'}
			</button>
			<a
				class="w-full rounded-2xl border border-sky-800/70 bg-sky-950/40 px-3 py-2 text-center text-sky-200 transition hover:border-sky-700 hover:text-white sm:w-auto sm:rounded-full"
				href={resolve('/app/sessions')}
			>
				Open detailed session controls
			</a>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Running</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.sessionSummary.runningCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Queued</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.sessionSummary.queuedCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Needs attention</p>
			<p class="mt-2 text-3xl font-semibold text-white">{attentionSessions.length}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Ready to resume</p>
			<p class="mt-2 text-3xl font-semibold text-white">{followUpSessions.length}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Total sessions</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.sessionSummary.totalCount}</p>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Ready tasks</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.controlSummary.readyTaskCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Blocked tasks</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.controlSummary.blockedTaskCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Review needed</p>
			<p class="mt-2 text-3xl font-semibold text-white">
				{data.controlSummary.reviewRequiredTaskCount}
			</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Dependency blocked</p>
			<p class="mt-2 text-3xl font-semibold text-white">
				{data.controlSummary.dependencyBlockedTaskCount}
			</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">High risk open</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.controlSummary.highRiskTaskCount}</p>
		</div>
	</div>

	<div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
		<div class="space-y-6">
			<section class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-xl font-semibold text-white">Live workload</h2>
						<p class="text-sm text-slate-400">Running and queued work on this laptop.</p>
					</div>
					<a class="text-sm text-sky-300 hover:text-white" href={resolve('/app/sessions')}
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
						Stopped runs and sessions that likely need a decision.
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
							Blocked work, review-required tasks, and items waiting on dependencies.
						</p>
					</div>
					<a class="text-sm text-sky-300 hover:text-white" href={resolve('/app/tasks')}
						>Open task board</a
					>
				</div>

				<div class="grid gap-3 sm:grid-cols-3">
					<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
						<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Blocked</p>
						<p class="mt-2 text-2xl font-semibold text-white">{blockedTasks.length}</p>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
						<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Needs review</p>
						<p class="mt-2 text-2xl font-semibold text-white">{reviewTasks.length}</p>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
						<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Dependencies</p>
						<p class="mt-2 text-2xl font-semibold text-white">{dependencyTasks.length}</p>
					</div>
				</div>

				{#if data.taskAttention.length === 0}
					<p class="text-sm text-slate-400">No task-level intervention points right now.</p>
				{:else}
					<div class="space-y-3">
						{#each data.taskAttention as task (task.id)}
							<article class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<p class="font-medium text-white">{task.title}</p>
											<span
												class="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 uppercase"
											>
												{task.status}
											</span>
											<span
												class={[
													'rounded-full px-2 py-1 text-[11px] uppercase',
													task.riskLevel === 'high'
														? 'border border-rose-900/70 bg-rose-950/40 text-rose-300'
														: task.riskLevel === 'medium'
															? 'border border-amber-900/70 bg-amber-950/40 text-amber-300'
															: 'border border-emerald-900/70 bg-emerald-950/40 text-emerald-300'
												]}
											>
												{task.riskLevel} risk
											</span>
											{#if task.requiresReview}
												<span
													class="rounded-full border border-sky-800/70 bg-sky-950/40 px-2 py-1 text-[11px] text-sky-200 uppercase"
												>
													review gate
												</span>
											{/if}
											{#if task.hasUnmetDependencies}
												<span
													class="rounded-full border border-violet-800/70 bg-violet-950/40 px-2 py-1 text-[11px] text-violet-200 uppercase"
												>
													waiting on dependency
												</span>
											{/if}
										</div>
										<p class="mt-2 text-sm text-slate-300">{task.summary}</p>
										<p class="mt-2 text-xs text-slate-500">
											{task.projectName !== 'No project' ? task.projectName : task.goalName} · {task.assigneeName}
											· approval {task.approvalMode}
										</p>
										{#if task.blockedReason}
											<p class="mt-2 text-sm text-rose-200">{task.blockedReason}</p>
										{/if}
										{#if task.dependencyTaskNames.length > 0}
											<p class="mt-2 text-xs text-slate-400">
												Depends on: {task.dependencyTaskNames.join(', ')}
											</p>
										{/if}
									</div>
									<a
										class="rounded-full border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:text-white"
										href={resolve('/app/tasks')}
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
				<div>
					<h2 class="text-xl font-semibold text-white">Ready for follow-up</h2>
					<p class="text-sm text-slate-400">
						Completed sessions that can take another instruction.
					</p>
				</div>

				{#if followUpSessions.length === 0}
					<p class="text-sm text-slate-400">No completed resumable sessions yet.</p>
				{:else}
					<div class="space-y-3">
						{#each followUpSessions as session (session.id)}
							<a
								class="block rounded-xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-slate-700"
								href={resolve('/app/sessions')}
							>
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div class="min-w-0">
										<p class="font-medium text-white">{session.name}</p>
										<p class="mt-1 text-sm text-slate-300">{session.statusSummary}</p>
										<p class="mt-1 text-xs break-all text-slate-500">{session.cwd}</p>
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
					<h2 class="text-xl font-semibold text-white">Recent sessions</h2>
					<p class="text-sm text-slate-400">Newest sessions across all states.</p>
				</div>

				<div class="space-y-3">
					{#each latestSessions as session (session.id)}
						<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<p class="font-medium text-white">{session.name}</p>
										<span
											class="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 uppercase"
										>
											{session.status}
										</span>
									</div>
									<p class="mt-1 text-sm text-slate-300">{session.statusSummary}</p>
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
						Use the dashboard for scan speed and the sessions page for control.
					</p>
				</div>
				<ul class="space-y-3 text-sm text-slate-300">
					<li>
						Check this page first when you are away from the laptop and want a fast status read.
					</li>
					<li>
						Open the detailed sessions page when you need to start a task, cancel a run, or send the
						next prompt.
					</li>
					<li>
						If a run fails without a thread id, treat it as a dead end and start a new session
						instead of trying to resume it.
					</li>
				</ul>
			</section>
		</div>
	</div>
</section>
