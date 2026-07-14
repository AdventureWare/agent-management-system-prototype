<script lang="ts">
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let { data, form = null } = $props();

	let operatorConsole = $derived(data.operatorConsole);
	let overview = $derived(operatorConsole?.overview ?? null);
	let overviewProjects = $derived(overview?.projects ?? []);
	let overviewTotals = $derived({
		projects: overviewProjects.length,
		goals: overviewProjects.reduce((total, project) => total + project.goalCount, 0),
		tasks: overviewProjects.reduce((total, project) => total + project.taskCount, 0),
		runs: overviewProjects.reduce((total, project) => total + project.runCount, 0),
		artifacts: overviewProjects.reduce((total, project) => total + project.artifactCount, 0),
		memory: overviewProjects.reduce((total, project) => total + project.memoryItemCount, 0)
	});
	let goalStatusGroups = $derived(
		operatorConsole?.goalStatusGroups ?? {
			running: operatorConsole?.activeGoals ?? [],
			blocked: [],
			paused: []
		}
	);
	let goalGroupRows = $derived([
		{ key: 'running', label: 'Running', goals: goalStatusGroups.running },
		{ key: 'blocked', label: 'Blocked', goals: goalStatusGroups.blocked },
		{ key: 'paused', label: 'Paused', goals: goalStatusGroups.paused }
	]);
	let workQueueRows = $derived(operatorConsole?.workQueue ?? []);
	let goalControlCount = $derived(goalGroupRows.reduce((total, group) => total + group.goals.length, 0));
	let activeGoal = $derived(goalStatusGroups.running[0] ?? operatorConsole?.activeGoals[0] ?? null);
	let taskStatusRows = $derived(Object.entries(overview?.taskStatusCounts ?? {}));
	let reviewStatusRows = $derived(Object.entries(overview?.reviewStatusCounts ?? {}));
	let memoryStatusRows = $derived(Object.entries(overview?.memoryStatusCounts ?? {}));
	let dependencySummary = $derived(operatorConsole?.dependencyReport.summary ?? null);
	let snapshotRows = $derived(Object.entries(operatorConsole?.snapshotStatus.tableCounts ?? {}));
	let scopedGoalSummary = $derived(operatorConsole?.scopedGoalSummary ?? null);
	let scopedChildGoalRollup = $derived(operatorConsole?.scopedChildGoalRollup ?? []);
	let scopedTaskRollup = $derived(operatorConsole?.scopedTaskRollup ?? null);

	function formatCount(value: number | undefined) {
		return value ?? 0;
	}

	function taskHref(taskId: string) {
		return resolve(`/app/v2-core/tasks/${taskId}?mode=read`);
	}

	function goalHref(goalId: string, projectId: string) {
		return resolve(`/app/v2-core?project=${encodeURIComponent(projectId)}&goal=${encodeURIComponent(goalId)}`);
	}

	function projectHref(projectId: string) {
		return resolve(`/app/v2-core?project=${encodeURIComponent(projectId)}`);
	}

	function nextWorkForGoal(goalId: string) {
		return (
			operatorConsole?.nextWork.candidates.find(
				(candidate) => candidate.goalId === goalId && candidate.action === 'start_task'
			) ?? null
		);
	}

	function currentRunForGoal(goalId: string) {
		return (
			operatorConsole?.recentRuns.find((run) => run.goalId === goalId && run.endedAt === null) ?? null
		);
	}

	function packetCommand(taskId: string) {
		return `npm run v2:core-db -- agent-work-packet --task ${taskId} --json`;
	}

	function queueStateLabel(state: string) {
		switch (state) {
			case 'running':
				return 'Running';
			case 'ready_to_dispatch':
				return 'Ready';
			case 'no_dispatchable_work':
				return 'Needs selection';
			case 'no_open_work':
				return 'No open work';
			case 'blocked':
				return 'Blocked';
			case 'paused':
				return 'Paused';
			default:
				return state;
		}
	}

	function goalTransitionText(goal: {
		latestGoalStatusTransition?: { summary: string; rationale: string } | null;
	}) {
		const transition = goal.latestGoalStatusTransition;
		if (!transition) {
			return '';
		}

		return transition.rationale
			? `${transition.summary} - ${transition.rationale}`
			: transition.summary;
	}

	function goalActions(status: string) {
		switch (status) {
			case 'active':
				return [
					{ id: 'pause_goal', label: 'Pause' },
					{ id: 'block_goal', label: 'Block' }
				];
			case 'paused':
				return [
					{ id: 'resume_goal', label: 'Resume' },
					{ id: 'block_goal', label: 'Block' }
				];
			case 'blocked':
				return [
					{ id: 'resume_goal', label: 'Resume' },
					{ id: 'pause_goal', label: 'Pause' }
				];
			default:
				return [];
		}
	}

	function dispatchState(goal: { goalId: string; status: string }) {
		return {
			currentRun: currentRunForGoal(goal.goalId),
			nextWork: nextWorkForGoal(goal.goalId),
			canDispatch: goal.status === 'active'
		};
	}

	function scopedGoalActionLabel(label: string) {
		return `${label} scoped goal`;
	}
</script>

<AppPage>
	<div class="v2-core-page">
		<PageHeader
			eyebrow="AMS v2 core"
			title="Operator console"
			description={data.dbFile}
			density="compact"
		/>

		{#if data.status === 'unavailable'}
			<section class="v2-core-alert" aria-label="V2 core unavailable">
				<p class="v2-core-alert-title">V2 core database unavailable</p>
				<p>{data.error}</p>
			</section>
		{:else if operatorConsole && overview}
			{#if form?.message}
				<p class={['v2-core-form-message', form.ok === false && 'v2-core-form-message-error']}>
					{form.message}
				</p>
			{/if}

			<section class="v2-core-metrics" aria-label="V2 core overview">
				<MetricCard label="Projects" value={overviewTotals.projects} density="compact" />
				<MetricCard label="Goals" value={overviewTotals.goals} density="compact" />
				<MetricCard label="Tasks" value={overviewTotals.tasks} density="compact" />
				<MetricCard label="Runs" value={overviewTotals.runs} density="compact" />
				<MetricCard label="Artifacts" value={overviewTotals.artifacts} density="compact" />
				<MetricCard label="Memory" value={overviewTotals.memory} density="compact" />
				<MetricCard
					label="Review queue"
					value={operatorConsole.reviewQueue.length}
					density="compact"
				/>
				<MetricCard
					label="Next work"
					value={operatorConsole.nextWork.candidates.length}
					density="compact"
				/>
			</section>

			{#if operatorConsole.scope.goalId && operatorConsole.scope.projectId}
				<section class="v2-core-scope" aria-label="V2 core current scope">
					<div>
						<span>Scoped to goal</span>
						<strong>{operatorConsole.scope.goalId}</strong>
					</div>
					<a href={projectHref(operatorConsole.scope.projectId)}>Show project scope</a>
				</section>
			{/if}

			{#if scopedGoalSummary}
				<section class="v2-core-scoped-summary" aria-labelledby="v2-core-scoped-summary">
					<header>
						<div>
							<span>Goal summary</span>
							<h2 id="v2-core-scoped-summary">{scopedGoalSummary.goal.title}</h2>
							<p>
								{scopedGoalSummary.goal.goalId}{scopedGoalSummary.goal.parentGoalId
									? ` · parent ${scopedGoalSummary.goal.parentGoalId}`
									: ''}
							</p>
						</div>
						<div class="v2-core-scoped-summary-state">
							<span class="v2-core-badge">{scopedGoalSummary.goal.status}</span>
							{#if scopedGoalSummary.queueState}
								<span>{queueStateLabel(scopedGoalSummary.queueState)}</span>
							{/if}
						</div>
					</header>
					<div class="v2-core-scoped-summary-grid">
						<div>
							<span>Tasks</span>
							<strong>
								{scopedGoalSummary.goal.openTaskCount} open / {scopedGoalSummary.goal.doneTaskCount} done
							</strong>
						</div>
						<div>
							<span>Readiness</span>
							<strong>{scopedGoalSummary.readiness.label}</strong>
							<p>{scopedGoalSummary.readiness.summary}</p>
						</div>
						<div>
							<span>Current run</span>
							{#if scopedGoalSummary.currentRun}
								<a href={taskHref(scopedGoalSummary.currentRun.taskId)}>
									{scopedGoalSummary.currentRun.runId}
								</a>
							{:else}
								<strong>None</strong>
							{/if}
						</div>
						<div>
							<span>Next work</span>
							{#if scopedGoalSummary.selectedTask}
								<a href={taskHref(scopedGoalSummary.selectedTask.taskId)}>
									{scopedGoalSummary.selectedTask.title}
								</a>
							{:else}
								<strong>None selected</strong>
							{/if}
						</div>
						<div>
							<span>Accepted output</span>
							{#if scopedGoalSummary.recentAcceptedArtifact}
								<strong>{scopedGoalSummary.recentAcceptedArtifact.title}</strong>
							{:else}
								<strong>None recent</strong>
							{/if}
						</div>
						<div>
							<span>Trusted memory</span>
							{#if scopedGoalSummary.trustedMemory}
								<strong>{scopedGoalSummary.trustedMemory.title}</strong>
							{:else}
								<strong>None available</strong>
							{/if}
						</div>
					</div>
					<div class="v2-core-scoped-actions" aria-label={`${scopedGoalSummary.goal.title} scoped actions`}>
						{#if goalActions(scopedGoalSummary.goal.status).length}
							<div class="v2-core-scoped-action-group" aria-label="Scoped goal state actions">
								{#each goalActions(scopedGoalSummary.goal.status) as action (action.id)}
									<form method="POST" action="?/applyGoalAction" class="v2-core-goal-form">
										<input type="hidden" name="goalId" value={scopedGoalSummary.goal.goalId} />
										<input type="hidden" name="actionId" value={action.id} />
										<input
											name="summary"
											type="text"
											placeholder={`${action.label} reason`}
											aria-label={`${action.label} ${scopedGoalSummary.goal.title} reason`}
										/>
										<button type="submit">{scopedGoalActionLabel(action.label)}</button>
									</form>
								{/each}
							</div>
						{/if}
						{#if scopedGoalSummary.currentRun}
							<div class="v2-core-handoff" aria-label={`${scopedGoalSummary.goal.title} scoped current run`}>
								<div>
									<span>Current run</span>
									<strong>{scopedGoalSummary.currentRun.runId}</strong>
									<p>{scopedGoalSummary.currentRun.status} · {scopedGoalSummary.currentRun.modelProviderName ?? 'No provider'}</p>
								</div>
								<a href={taskHref(scopedGoalSummary.currentRun.taskId)}>Open scoped current-run task</a>
							</div>
						{:else if scopedGoalSummary.goal.status === 'active' && scopedGoalSummary.selectedTask}
							<form method="POST" action="?/dispatchGoalWork" class="v2-core-dispatch-form">
								<input type="hidden" name="goalId" value={scopedGoalSummary.goal.goalId} />
								<input type="hidden" name="taskId" value={scopedGoalSummary.selectedTask.taskId} />
								<div>
									<span>Selected task</span>
									<a href={taskHref(scopedGoalSummary.selectedTask.taskId)}>
										{scopedGoalSummary.selectedTask.title}
									</a>
								</div>
								<button type="submit">Launch scoped goal work</button>
							</form>
						{:else if scopedGoalSummary.goal.status === 'active' && scopedGoalSummary.queueState === 'no_open_work'}
							<form
								method="POST"
								action="?/createGoalContinuationTask"
								class="v2-core-dispatch-form"
							>
								<input type="hidden" name="goalId" value={scopedGoalSummary.goal.goalId} />
								<div>
									<span>No open work</span>
									<p>Create a continuation planning task</p>
								</div>
								<button type="submit">Plan scoped next work</button>
							</form>
						{/if}
					</div>
				</section>
			{/if}

			{#if scopedChildGoalRollup.length}
				<section class="v2-core-panel" aria-labelledby="v2-core-child-goal-rollup">
					<header class="v2-core-panel-header">
						<h2 id="v2-core-child-goal-rollup">Child goals</h2>
						<span>{scopedChildGoalRollup.length} immediate</span>
					</header>
					<div class="v2-core-list">
						{#each scopedChildGoalRollup as childGoal (childGoal.goalId)}
							<article class="v2-core-row v2-core-queue-row">
								<div>
									<a
										class="v2-core-row-title v2-core-row-link"
										href={goalHref(childGoal.goalId, childGoal.projectId)}
									>
										{childGoal.title}
									</a>
									<p class="v2-core-row-meta">
										{childGoal.goalId} · {childGoal.openTaskCount} open / {childGoal.doneTaskCount} done
									</p>
								</div>
								<div class="v2-core-row-side">
									<span class={['v2-core-badge', `v2-core-badge-${childGoal.queueState}`]}>
										{queueStateLabel(childGoal.queueState)}
									</span>
									<span>{childGoal.status}</span>
									{#if goalActions(childGoal.status).length}
										<div class="v2-core-goal-actions" aria-label={`${childGoal.title} child-goal actions`}>
											{#each goalActions(childGoal.status) as action (action.id)}
												<form method="POST" action="?/applyGoalAction" class="v2-core-goal-form">
													<input type="hidden" name="goalId" value={childGoal.goalId} />
													<input type="hidden" name="actionId" value={action.id} />
													<input
														name="summary"
														type="text"
														placeholder={`${action.label} reason`}
														aria-label={`${action.label} ${childGoal.title} reason`}
													/>
													<button type="submit">{action.label} child goal</button>
												</form>
											{/each}
										</div>
									{/if}
									{#if childGoal.currentRun}
										<div class="v2-core-handoff" aria-label={`${childGoal.title} child-goal current run`}>
											<div>
												<span>Current run</span>
												<strong>{childGoal.currentRun.runId}</strong>
												<p>{childGoal.currentRun.status} · {childGoal.currentRun.modelProviderName ?? 'No provider'}</p>
											</div>
											<a href={taskHref(childGoal.currentRun.taskId)}>Open child current-run task</a>
										</div>
									{:else if childGoal.status === 'active' && childGoal.selectedTask}
										<form method="POST" action="?/dispatchGoalWork" class="v2-core-dispatch-form">
											<input type="hidden" name="goalId" value={childGoal.goalId} />
											<input type="hidden" name="taskId" value={childGoal.selectedTask.taskId} />
											<div>
												<span>Selected task</span>
												<a href={taskHref(childGoal.selectedTask.taskId)}>
													{childGoal.selectedTask.title}
												</a>
											</div>
											<button type="submit">Launch child goal work</button>
										</form>
									{:else if childGoal.status === 'active' && childGoal.queueState === 'no_open_work'}
										<form
											method="POST"
											action="?/createGoalContinuationTask"
											class="v2-core-dispatch-form"
										>
											<input type="hidden" name="goalId" value={childGoal.goalId} />
											<div>
												<span>No open work</span>
												<p>Create a continuation planning task</p>
											</div>
											<button type="submit">Plan child next work</button>
										</form>
									{:else if childGoal.queueState === 'blocked' || childGoal.queueState === 'paused'}
										<p class="v2-core-row-meta">Dispatch suppressed while {childGoal.queueState}</p>
									{:else}
										<span>No selected work</span>
									{/if}
								</div>
							</article>
						{/each}
					</div>
				</section>
			{/if}

			{#if scopedTaskRollup}
				<section class="v2-core-panel" aria-labelledby="v2-core-task-rollup">
					<header class="v2-core-panel-header">
						<h2 id="v2-core-task-rollup">Tasks in scope</h2>
						<span>{scopedTaskRollup.counts.open} open / {scopedTaskRollup.counts.review} review / {scopedTaskRollup.counts.done} done</span>
					</header>
					{#if scopedTaskRollup.tasks.length}
						<div class="v2-core-list">
							{#each scopedTaskRollup.tasks as task (task.taskId)}
								<article class="v2-core-row">
									<div>
										<a class="v2-core-row-title v2-core-row-link" href={taskHref(task.taskId)}>
											{task.title}
										</a>
										<p class="v2-core-row-meta">{task.taskId}</p>
									</div>
									<div class="v2-core-row-side">
										<span class="v2-core-badge">{task.status}</span>
										{#if task.selectedNextWork}
											<span>Selected next work</span>
										{/if}
										{#if task.currentRun}
											<div class="v2-core-handoff" aria-label={`${task.title} current run`}>
												<div>
													<span>Current run</span>
													<strong>{task.currentRun.runId}</strong>
													<p>{task.currentRun.status} · {task.currentRun.modelProviderName ?? 'No provider'}</p>
												</div>
												<a href={taskHref(task.taskId)}>Open current-run task</a>
											</div>
										{:else if task.reviewArtifact}
											<div class="v2-core-handoff" aria-label={`${task.title} review handoff`}>
												<div>
													<span>Review {task.reviewArtifact.artifactId}</span>
													<strong>{task.reviewArtifact.title}</strong>
													<p>{task.reviewArtifact.status}</p>
												</div>
												<a href={taskHref(task.taskId)}>Review scoped output</a>
											</div>
										{:else if task.selectedNextWork && operatorConsole.scope.goalId}
											<form method="POST" action="?/dispatchGoalWork" class="v2-core-dispatch-form">
												<input type="hidden" name="goalId" value={operatorConsole.scope.goalId} />
												<input type="hidden" name="taskId" value={task.taskId} />
												<div>
													<span>Selected task</span>
													<a href={taskHref(task.taskId)}>{task.title}</a>
												</div>
												<button type="submit">Launch scoped task</button>
											</form>
										{:else}
											<a href={taskHref(task.taskId)}>Open task detail</a>
										{/if}
									</div>
								</article>
							{/each}
						</div>
					{:else}
						<p class="v2-core-empty">No tasks for selected goal</p>
					{/if}
				</section>
			{/if}

			<section class="v2-core-grid">
				<section class="v2-core-panel" aria-labelledby="v2-core-work-queue">
					<header class="v2-core-panel-header">
						<h2 id="v2-core-work-queue">Work queue</h2>
						<span>{workQueueRows.length} goals</span>
					</header>
					{#if workQueueRows.length}
						<div class="v2-core-list">
							{#each workQueueRows as item (item.goalId)}
								<article class="v2-core-row v2-core-queue-row">
									<div>
										<a class="v2-core-row-title v2-core-row-link" href={goalHref(item.goalId, item.projectId)}>
											{item.title}
										</a>
										<p class="v2-core-row-meta">
											{item.goalId}{item.parentGoalId ? ` · parent ${item.parentGoalId}` : ''}
										</p>
										<p class="v2-core-row-meta">
											{item.openTaskCount} open / {item.doneTaskCount} done
										</p>
									</div>
									<div class="v2-core-row-side">
										<span class={['v2-core-badge', `v2-core-badge-${item.queueState}`]}>
											{queueStateLabel(item.queueState)}
										</span>
										{#if item.currentRun}
											<div class="v2-core-handoff" aria-label={`${item.title} queue current run`}>
												<div>
													<span>Current run</span>
													<strong>{item.currentRun.runId}</strong>
													<p>{item.currentRun.status} · {item.currentRun.modelProviderName ?? 'No provider'}</p>
												</div>
												<a href={taskHref(item.currentRun.taskId)}>Open task</a>
											</div>
										{:else if item.selectedTask}
											<form method="POST" action="?/dispatchGoalWork" class="v2-core-dispatch-form">
												<input type="hidden" name="goalId" value={item.goalId} />
												<input type="hidden" name="taskId" value={item.selectedTask.taskId} />
												<div>
													<span>Selected task</span>
													<a href={taskHref(item.selectedTask.taskId)}>{item.selectedTask.title}</a>
												</div>
												<button type="submit">Launch task</button>
											</form>
										{:else if item.queueState === 'blocked' || item.queueState === 'paused'}
											<p class="v2-core-row-meta">Dispatch suppressed while {item.queueState}</p>
										{:else if item.queueState === 'no_open_work'}
											<form
												method="POST"
												action="?/createGoalContinuationTask"
												class="v2-core-dispatch-form"
											>
												<input type="hidden" name="goalId" value={item.goalId} />
												<div>
													<span>No open work</span>
													<p>Create a continuation planning task</p>
												</div>
												<button type="submit">Plan next work</button>
											</form>
										{:else}
											<p class="v2-core-row-meta">No dispatchable next work</p>
										{/if}
									</div>
								</article>
							{/each}
						</div>
					{:else}
						<p class="v2-core-empty">No work queue rows</p>
					{/if}
				</section>

				<section class="v2-core-panel" aria-labelledby="v2-core-goal-control">
					<header class="v2-core-panel-header">
						<h2 id="v2-core-goal-control">Goal control</h2>
						{#if activeGoal}
							<span>{activeGoal.projectName}</span>
						{/if}
					</header>
					{#if goalControlCount}
						<div class="v2-core-list">
							{#each goalGroupRows as group (group.key)}
								{#if group.goals.length}
									<div class="v2-core-group-label">
										<span>{group.label}</span>
										<strong>{group.goals.length}</strong>
									</div>
									{#each group.goals as goal (goal.goalId)}
										{@const dispatch = dispatchState(goal)}
										<article class="v2-core-row">
											<div>
												<a class="v2-core-row-title v2-core-row-link" href={goalHref(goal.goalId, goal.projectId)}>
													{goal.title}
												</a>
												<p class="v2-core-row-meta">
													{goal.goalId}{goal.parentGoalId ? ` · parent ${goal.parentGoalId}` : ''}
												</p>
												{#if goalTransitionText(goal)}
													<p class="v2-core-row-meta">{goalTransitionText(goal)}</p>
												{/if}
											</div>
											<div class="v2-core-row-side">
												<span class="v2-core-badge">{goal.status}</span>
												<span>{goal.openTaskCount} open / {goal.doneTaskCount} done</span>
												{#if goalActions(goal.status).length}
													<div class="v2-core-goal-actions" aria-label={`${goal.title} goal actions`}>
														{#each goalActions(goal.status) as action (action.id)}
															<form method="POST" action="?/applyGoalAction" class="v2-core-goal-form">
																<input type="hidden" name="goalId" value={goal.goalId} />
																<input type="hidden" name="actionId" value={action.id} />
																<input
																	name="summary"
																	type="text"
																	placeholder={`${action.label} reason`}
																	aria-label={`${action.label} ${goal.title} reason`}
																/>
																<button type="submit">{action.label}</button>
															</form>
														{/each}
													</div>
												{/if}
												{#if dispatch.currentRun}
													<div class="v2-core-handoff" aria-label={`${goal.title} current run handoff`}>
														<div>
															<span>Current run</span>
															<strong>{dispatch.currentRun.runId}</strong>
															<p>{dispatch.currentRun.status} · {dispatch.currentRun.modelProviderName ?? 'No provider'}</p>
														</div>
														<a href={taskHref(dispatch.currentRun.taskId)}>Open task</a>
														<code>{packetCommand(dispatch.currentRun.taskId)}</code>
													</div>
												{/if}
												{#if dispatch.canDispatch && dispatch.nextWork}
													<form method="POST" action="?/dispatchGoalWork" class="v2-core-dispatch-form">
														<input type="hidden" name="goalId" value={goal.goalId} />
														<input type="hidden" name="taskId" value={dispatch.nextWork.taskId} />
														<div>
															<span>Selected task</span>
															<a href={taskHref(dispatch.nextWork.taskId)}>
																{dispatch.nextWork.title}
															</a>
														</div>
														<button type="submit">Launch</button>
													</form>
												{:else if dispatch.canDispatch}
													<p class="v2-core-row-meta">No dispatchable next work</p>
												{/if}
											</div>
										</article>
									{/each}
								{/if}
							{/each}
						</div>
					{:else}
						<p class="v2-core-empty">No running, blocked, or paused goals</p>
					{/if}
				</section>

				<section class="v2-core-panel" aria-labelledby="v2-core-next-work">
					<header class="v2-core-panel-header">
						<h2 id="v2-core-next-work">Next work</h2>
						<span>{operatorConsole.nextWork.candidates.length} tasks</span>
					</header>
					{#if operatorConsole.nextWork.candidates.length}
						<div class="v2-core-list">
							{#each operatorConsole.nextWork.candidates as task (task.taskId)}
								<article class="v2-core-row">
									<div>
										<a class="v2-core-row-title v2-core-row-link" href={taskHref(task.taskId)}>
											{task.title}
										</a>
										<p class="v2-core-row-meta">{task.taskId} · {task.goalTitle}</p>
									</div>
									<div class="v2-core-row-side">
										<span class="v2-core-badge">{task.status}</span>
										<span>{task.projectName}</span>
									</div>
								</article>
							{/each}
						</div>
					{:else}
						<p class="v2-core-empty">No next work</p>
					{/if}
				</section>

				<section class="v2-core-panel" aria-labelledby="v2-core-review-queue">
					<header class="v2-core-panel-header">
						<h2 id="v2-core-review-queue">Review queue</h2>
						<span>{operatorConsole.reviewQueue.length} artifacts</span>
					</header>
					{#if operatorConsole.reviewQueue.length}
						<div class="v2-core-list">
							{#each operatorConsole.reviewQueue as artifact (artifact.artifactId)}
								<article class="v2-core-row">
									<div>
										<a class="v2-core-row-title v2-core-row-link" href={taskHref(artifact.taskId)}>
											{artifact.taskTitle}
										</a>
										<p class="v2-core-row-meta">{artifact.title} · {artifact.goalTitle}</p>
										<p class="v2-core-row-meta">{artifact.uri}</p>
									</div>
									<div class="v2-core-row-side">
										<span class="v2-core-badge">{artifact.status}</span>
										<span>{artifact.runStatus ?? 'no run'}</span>
										<a href={taskHref(artifact.taskId)}>Review task</a>
									</div>
								</article>
							{/each}
						</div>
					{:else}
						<p class="v2-core-empty">No review items</p>
					{/if}
				</section>

				<section class="v2-core-panel" aria-labelledby="v2-core-memory">
					<header class="v2-core-panel-header">
						<h2 id="v2-core-memory">Trusted memory</h2>
						<span>{formatCount(operatorConsole.memory?.items.length)} items</span>
					</header>
					{#if operatorConsole.memory?.items.length}
						<div class="v2-core-list">
							{#each operatorConsole.memory.items as memory (memory.id)}
								<article class="v2-core-row">
									<div>
										<p class="v2-core-row-title">{memory.title}</p>
										<p class="v2-core-row-meta">{memory.body}</p>
									</div>
									<div class="v2-core-row-side">
										<span class="v2-core-badge">{memory.status}</span>
										<span>{memory.scope}</span>
									</div>
								</article>
							{/each}
						</div>
					{:else}
						<p class="v2-core-empty">No trusted memory for current scope</p>
					{/if}
				</section>

				<section class="v2-core-panel" aria-labelledby="v2-core-recent-runs">
					<header class="v2-core-panel-header">
						<h2 id="v2-core-recent-runs">Recent runs</h2>
						<span>{operatorConsole.recentRuns.length} runs</span>
					</header>
					{#if operatorConsole.recentRuns.length}
						<div class="v2-core-list">
							{#each operatorConsole.recentRuns as run (run.runId)}
								<article class="v2-core-row">
									<div>
										<a class="v2-core-row-title v2-core-row-link" href={taskHref(run.taskId)}>
											{run.taskTitle}
										</a>
										<p class="v2-core-row-meta">{run.resultSummary}</p>
									</div>
									<div class="v2-core-row-side">
										<span class="v2-core-badge">{run.status}</span>
										<span>{run.modelProviderName ?? 'No provider'}</span>
									</div>
								</article>
							{/each}
						</div>
					{:else}
						<p class="v2-core-empty">No recent runs</p>
					{/if}
				</section>

				<section class="v2-core-panel" aria-labelledby="v2-core-artifacts">
					<header class="v2-core-panel-header">
						<h2 id="v2-core-artifacts">Recent artifacts</h2>
						<span>{operatorConsole.recentArtifacts.length} artifacts</span>
					</header>
					{#if operatorConsole.recentArtifacts.length}
						<div class="v2-core-list">
							{#each operatorConsole.recentArtifacts as artifact (artifact.artifactId)}
								<article class="v2-core-row">
									<div>
										<p class="v2-core-row-title">{artifact.title}</p>
										<p class="v2-core-row-meta">{artifact.uri}</p>
									</div>
									<div class="v2-core-row-side">
										<span class="v2-core-badge">{artifact.status}</span>
										<span>{artifact.role}</span>
									</div>
								</article>
							{/each}
						</div>
					{:else}
						<p class="v2-core-empty">No recent artifacts</p>
					{/if}
				</section>
			</section>

			<section class="v2-core-grid v2-core-grid-compact">
				<section class="v2-core-panel" aria-labelledby="v2-core-status-counts">
					<header class="v2-core-panel-header">
						<h2 id="v2-core-status-counts">State counts</h2>
					</header>
					<div class="v2-core-count-grid">
						{#each reviewStatusRows as [status, count] (status)}
							<div>
								<span>Review {status}</span>
								<strong>{count}</strong>
							</div>
						{/each}
						{#each memoryStatusRows as [status, count] (status)}
							<div>
								<span>Memory {status}</span>
								<strong>{count}</strong>
							</div>
						{/each}
						{#each taskStatusRows as [status, count] (status)}
							<div>
								<span>Task {status}</span>
								<strong>{count}</strong>
							</div>
						{/each}
					</div>
				</section>

				<section class="v2-core-panel" aria-labelledby="v2-core-dependencies">
					<header class="v2-core-panel-header">
						<h2 id="v2-core-dependencies">Dependencies</h2>
						<span>{operatorConsole.dependencyReport.modelProviders.length} providers</span>
					</header>
					<div class="v2-core-count-grid">
						<div>
							<span>Provider runs</span>
							<strong>{dependencySummary?.providerRunCount ?? 0}</strong>
						</div>
						<div>
							<span>Tool executions</span>
							<strong>{dependencySummary?.toolExecutionCount ?? 0}</strong>
						</div>
					</div>
					{#if operatorConsole.dependencyReport.modelProviders.length}
						<div class="v2-core-list v2-core-list-tight">
							{#each operatorConsole.dependencyReport.modelProviders as provider (provider.providerId)}
								<div class="v2-core-mini-row">
									<span>{provider.name}</span>
									<strong>{provider.runCount}</strong>
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<section class="v2-core-panel" aria-labelledby="v2-core-snapshot">
					<header class="v2-core-panel-header">
						<h2 id="v2-core-snapshot">Snapshot</h2>
						<span>{operatorConsole.snapshotStatus.format}</span>
					</header>
					<div class="v2-core-count-grid">
						{#each snapshotRows as [table, count] (table)}
							<div>
								<span>{table}</span>
								<strong>{count}</strong>
							</div>
						{/each}
					</div>
				</section>
			</section>
		{/if}
	</div>
</AppPage>

<style>
	.v2-core-page {
		display: grid;
		gap: 1rem;
	}

	.v2-core-alert,
	.v2-core-panel {
		border: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 18%);
		border-radius: 0.5rem;
		background: var(--color-surface-50);
	}

	.v2-core-alert {
		padding: 1rem;
		color: var(--color-error-700);
	}

	.v2-core-alert-title {
		margin: 0 0 0.25rem;
		font-weight: 700;
	}

	.v2-core-form-message {
		margin: 0;
		border: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 20%);
		border-radius: 0.5rem;
		padding: 0.75rem 0.875rem;
		background: var(--color-surface-50);
		color: var(--color-surface-900);
		font-size: 0.84rem;
	}

	.v2-core-form-message-error {
		border-color: color-mix(in srgb, var(--color-error-700), transparent 35%);
		color: var(--color-error-700);
	}

	.v2-core-metrics {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
		gap: 0.75rem;
	}

	.v2-core-scope {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--color-primary-300), transparent 25%);
		border-radius: 0.5rem;
		padding: 0.75rem 0.875rem;
		background: var(--color-primary-50);
		color: var(--color-surface-900);
	}

	.v2-core-scope div {
		display: grid;
		gap: 0.15rem;
		min-width: 0;
	}

	.v2-core-scope span {
		color: var(--color-surface-700);
		font-size: 0.76rem;
	}

	.v2-core-scope strong {
		overflow-wrap: anywhere;
		font-size: 0.86rem;
	}

	.v2-core-scope a {
		flex: 0 0 auto;
		color: var(--color-primary-800);
		font-size: 0.82rem;
		font-weight: 700;
		text-decoration: none;
	}

	.v2-core-scope a:hover {
		text-decoration: underline;
	}

	.v2-core-scoped-summary {
		display: grid;
		gap: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 18%);
		border-radius: 0.5rem;
		padding: 0.875rem;
		background: var(--color-surface-50);
		color: var(--color-surface-950);
	}

	.v2-core-scoped-summary header {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 0.875rem;
	}

	.v2-core-scoped-summary header div:first-child {
		min-width: 0;
	}

	.v2-core-scoped-summary span,
	.v2-core-scoped-summary p {
		color: var(--color-surface-700);
		font-size: 0.78rem;
	}

	.v2-core-scoped-summary h2 {
		margin: 0.12rem 0 0;
		font-size: 1rem;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}

	.v2-core-scoped-summary p {
		margin: 0.25rem 0 0;
		overflow-wrap: anywhere;
	}

	.v2-core-scoped-summary-state {
		display: grid;
		justify-items: end;
		gap: 0.3rem;
		text-align: right;
	}

	.v2-core-scoped-summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
		gap: 0.6rem;
	}

	.v2-core-scoped-summary-grid div {
		display: grid;
		gap: 0.18rem;
		min-width: 0;
		border: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 35%);
		border-radius: 0.45rem;
		padding: 0.55rem 0.65rem;
		background: var(--color-surface-0);
	}

	.v2-core-scoped-summary-grid strong,
	.v2-core-scoped-summary-grid a {
		color: var(--color-surface-950);
		font-size: 0.84rem;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}

	.v2-core-scoped-summary-grid a {
		color: var(--color-primary-700);
		font-weight: 700;
		text-decoration: none;
	}

	.v2-core-scoped-summary-grid a:hover {
		text-decoration: underline;
	}

	.v2-core-scoped-actions {
		display: grid;
		gap: 0.6rem;
		border-top: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 45%);
		padding-top: 0.7rem;
	}

	.v2-core-scoped-action-group {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
		gap: 0.45rem;
	}

	.v2-core-scoped-actions .v2-core-goal-form,
	.v2-core-scoped-actions .v2-core-dispatch-form,
	.v2-core-scoped-actions .v2-core-handoff {
		margin-top: 0;
	}

	.v2-core-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
		gap: 1rem;
		align-items: start;
	}

	.v2-core-grid-compact {
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
	}

	.v2-core-panel {
		min-width: 0;
		overflow: hidden;
	}

	.v2-core-panel-header {
		display: flex;
		min-height: 3.25rem;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 35%);
		padding: 0.75rem 0.875rem;
	}

	.v2-core-panel-header h2 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
	}

	.v2-core-panel-header span,
	.v2-core-row-meta,
	.v2-core-row-side,
	.v2-core-empty,
	.v2-core-count-grid span,
	.v2-core-mini-row {
		color: var(--color-surface-700);
		font-size: 0.78rem;
	}

	.v2-core-list {
		display: grid;
	}

	.v2-core-list-tight {
		border-top: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 35%);
	}

	.v2-core-group-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 50%);
		padding: 0.55rem 0.875rem;
		background: var(--color-surface-100);
		color: var(--color-surface-800);
		font-size: 0.76rem;
		font-weight: 700;
	}

	.v2-core-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.75rem;
		align-items: center;
		min-height: 4.25rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 45%);
		padding: 0.75rem 0.875rem;
	}

	.v2-core-row:last-child {
		border-bottom: 0;
	}

	.v2-core-row-title {
		display: block;
		margin: 0;
		font-size: 0.9rem;
		font-weight: 650;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}

	.v2-core-row-link {
		color: var(--color-primary-700);
		text-decoration: none;
	}

	.v2-core-row-link:hover {
		text-decoration: underline;
	}

	.v2-core-row-meta {
		margin: 0.25rem 0 0;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}

	.v2-core-row-side {
		display: grid;
		justify-items: end;
		gap: 0.25rem;
		text-align: right;
	}

	.v2-core-row-side a {
		color: var(--color-primary-700);
		font-size: 0.78rem;
		font-weight: 700;
		text-decoration: none;
		overflow-wrap: anywhere;
	}

	.v2-core-row-side a:hover {
		text-decoration: underline;
	}

	.v2-core-queue-row {
		align-items: start;
	}

	.v2-core-goal-actions {
		display: grid;
		gap: 0.35rem;
		margin-top: 0.25rem;
	}

	.v2-core-goal-form {
		display: grid;
		grid-template-columns: minmax(8rem, 1fr) auto;
		gap: 0.35rem;
		align-items: center;
	}

	.v2-core-goal-form input {
		min-width: 0;
		border: 1px solid color-mix(in srgb, var(--color-surface-400), transparent 35%);
		border-radius: 0.35rem;
		padding: 0.35rem 0.45rem;
		background: var(--color-surface-0);
		color: var(--color-surface-950);
		font: inherit;
	}

	.v2-core-goal-form button {
		border: 1px solid color-mix(in srgb, var(--color-primary-500), transparent 25%);
		border-radius: 0.35rem;
		padding: 0.35rem 0.55rem;
		background: var(--color-primary-50);
		color: var(--color-primary-800);
		font-size: 0.76rem;
		font-weight: 700;
		cursor: pointer;
	}

	.v2-core-goal-form button:hover {
		background: var(--color-primary-100);
	}

	.v2-core-dispatch-form {
		display: grid;
		grid-template-columns: minmax(10rem, 1fr) auto;
		gap: 0.45rem;
		align-items: center;
		margin-top: 0.35rem;
		border-top: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 45%);
		padding-top: 0.45rem;
	}

	.v2-core-dispatch-form div {
		display: grid;
		gap: 0.1rem;
	}

	.v2-core-dispatch-form span {
		color: var(--color-surface-700);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.v2-core-dispatch-form a {
		color: var(--color-primary-700);
		font-size: 0.8rem;
		font-weight: 700;
		text-decoration: none;
		overflow-wrap: anywhere;
	}

	.v2-core-dispatch-form a:hover {
		text-decoration: underline;
	}

	.v2-core-dispatch-form button {
		border: 1px solid color-mix(in srgb, var(--color-primary-500), transparent 20%);
		border-radius: 0.35rem;
		padding: 0.4rem 0.65rem;
		background: var(--color-primary-600);
		color: white;
		font-size: 0.76rem;
		font-weight: 750;
		cursor: pointer;
	}

	.v2-core-dispatch-form button:hover {
		background: var(--color-primary-700);
	}

	.v2-core-handoff {
		display: grid;
		justify-items: stretch;
		gap: 0.35rem;
		width: min(100%, 28rem);
		margin-top: 0.35rem;
		border-top: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 45%);
		padding-top: 0.45rem;
		text-align: left;
	}

	.v2-core-handoff div {
		display: grid;
		gap: 0.12rem;
	}

	.v2-core-handoff span {
		color: var(--color-surface-700);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.v2-core-handoff strong,
	.v2-core-handoff p,
	.v2-core-handoff code {
		overflow-wrap: anywhere;
	}

	.v2-core-handoff strong {
		color: var(--color-surface-950);
		font-size: 0.78rem;
	}

	.v2-core-handoff p {
		margin: 0;
		color: var(--color-surface-700);
		font-size: 0.76rem;
	}

	.v2-core-handoff a {
		color: var(--color-primary-700);
		font-size: 0.78rem;
		font-weight: 700;
		text-decoration: none;
	}

	.v2-core-handoff a:hover {
		text-decoration: underline;
	}

	.v2-core-handoff code {
		border-radius: 0.35rem;
		background: var(--color-surface-100);
		padding: 0.35rem 0.45rem;
		color: var(--color-surface-900);
		font-size: 0.72rem;
		line-height: 1.35;
		white-space: normal;
	}

	.v2-core-badge {
		display: inline-flex;
		max-width: 10rem;
		align-items: center;
		justify-content: center;
		border: 1px solid color-mix(in srgb, var(--color-surface-400), transparent 35%);
		border-radius: 999px;
		padding: 0.1rem 0.45rem;
		background: var(--color-surface-100);
		color: var(--color-surface-900);
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}

	.v2-core-badge-running,
	.v2-core-badge-ready_to_dispatch {
		border-color: color-mix(in srgb, var(--color-success-500), transparent 45%);
		background: color-mix(in srgb, var(--color-success-100), white 35%);
	}

	.v2-core-badge-blocked,
	.v2-core-badge-no_dispatchable_work {
		border-color: color-mix(in srgb, var(--color-warning-500), transparent 40%);
		background: color-mix(in srgb, var(--color-warning-100), white 35%);
	}

	.v2-core-badge-paused,
	.v2-core-badge-no_open_work {
		border-color: color-mix(in srgb, var(--color-surface-400), transparent 35%);
		background: var(--color-surface-100);
	}

	.v2-core-empty {
		margin: 0;
		padding: 1rem 0.875rem;
	}

	.v2-core-count-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: 0.5rem;
		padding: 0.875rem;
	}

	.v2-core-count-grid div,
	.v2-core-mini-row {
		display: flex;
		min-width: 0;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.v2-core-count-grid span,
	.v2-core-mini-row span {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.v2-core-count-grid strong,
	.v2-core-mini-row strong {
		color: var(--color-surface-950);
		font-size: 0.9rem;
	}

	.v2-core-mini-row {
		min-height: 2.25rem;
		padding: 0.4rem 0.875rem;
	}

	@media (max-width: 44rem) {
		.v2-core-row {
			grid-template-columns: 1fr;
		}

		.v2-core-row-side {
			justify-items: start;
			text-align: left;
		}

		.v2-core-goal-form {
			grid-template-columns: 1fr;
			width: 100%;
		}

		.v2-core-dispatch-form {
			grid-template-columns: 1fr;
			width: 100%;
		}
	}
</style>
