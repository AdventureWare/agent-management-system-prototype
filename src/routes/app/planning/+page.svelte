<script lang="ts">
	import { resolve } from '$app/paths';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageTabs from '$lib/components/PageTabs.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		formatGoalStatusLabel,
		formatTaskStatusLabel,
		goalStatusToneClass,
		taskStatusToneClass
	} from '$lib/types/control-plane';

	let { data, form } = $props();

	let updateGoalPlanSuccess = $derived(form?.ok && form?.successAction === 'updateGoalPlan');
	let capturePlanningSessionSuccess = $derived(
		form?.ok && form?.successAction === 'capturePlanningSession'
	);
	let selectedPlanningTaskView = $state<'scheduled' | 'undated'>('scheduled');

	$effect(() => {
		if (data.scheduledTasks.length === 0 && data.unscheduledTasks.length > 0) {
			selectedPlanningTaskView = 'undated';
		}
	});

	function formatDate(value: string | null) {
		if (!value) {
			return 'Unset';
		}

		return new Date(`${value}T12:00:00`).toLocaleDateString();
	}

	function confidenceClass(confidence: string) {
		switch (confidence) {
			case 'high':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'low':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
			case 'medium':
			default:
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
		}
	}

	function workerLoadClass(remainingHours: number) {
		if (remainingHours < 0) {
			return 'text-rose-200';
		}

		if (remainingHours < 8) {
			return 'text-amber-200';
		}

		return 'text-emerald-200';
	}
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Planning"
		title="Review and revise the current plan"
		description="Choose a date window and scope, inspect what is currently planned in that frame, and adjust commitments before work is dispatched."
	>
		{#snippet meta()}
			<div class="flex flex-wrap gap-2">
				<span class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] text-slate-300">
					{formatDate(data.filters.startDate)} to {formatDate(data.filters.endDate)}
				</span>
				<span class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] text-slate-300">
					{data.metrics.goalCount} goal(s) in scope
				</span>
				<span class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] text-slate-300">
					{data.metrics.taskCount} task(s) under review
				</span>
			</div>
		{/snippet}
	</PageHeader>

	{#if form?.message}
		<p class="ui-notice border border-rose-900/70 bg-rose-950/40 text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if updateGoalPlanSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Goal planning fields saved.
		</p>
	{/if}

	{#if capturePlanningSessionSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Planning session captured.
		</p>
	{/if}

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
		<MetricCard
			label="Goals in scope"
			value={data.metrics.goalCount}
			detail="Goals due in this window or supported by work under review."
		/>
		<MetricCard
			label="Scheduled tasks"
			value={data.metrics.scheduledTaskCount}
			detail={`${data.metrics.unscheduledTaskCount} undated task(s) also need attention.`}
		/>
		<MetricCard
			label="Planned hours"
			value={data.metrics.plannedHours}
			detail={`${data.metrics.unestimatedTaskCount} scheduled task(s) still have no estimate.`}
		/>
		<MetricCard
			label="Capacity hours"
			value={data.metrics.totalCapacityHours}
			detail={`${data.metrics.overAllocatedWorkerCount} worker(s) over capacity in this window.`}
		/>
		<MetricCard
			label="Slack"
			value={data.metrics.remainingCapacityHours}
			detail="Remaining scheduled capacity in the current planning window."
		/>
	</div>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)]">
		<div class="space-y-6">
			<DetailSection
				eyebrow="Planning window"
				title="Choose the review frame"
				description="Planning here works over the current plan. Choose the date range and scope you want to inspect, then review what is scheduled, what remains undated, and what needs to change."
				bodyClass="space-y-6"
			>
				<form class="grid gap-4 lg:grid-cols-2" method="GET">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Start date</span>
						<input
							class="input text-white"
							name="startDate"
							required
							type="date"
							value={data.filters.startDate}
						/>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">End date</span>
						<input
							class="input text-white"
							name="endDate"
							required
							type="date"
							value={data.filters.endDate}
						/>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Project scope</span>
						<select class="select text-white" name="projectId">
							<option selected={data.filters.projectId === ''} value="">All projects</option>
							{#each data.projectOptions as project (project.id)}
								<option selected={data.filters.projectId === project.id} value={project.id}>
									{project.name}
								</option>
							{/each}
						</select>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Goal scope</span>
						<select class="select text-white" name="goalId">
							<option selected={data.filters.goalId === ''} value="">All goals</option>
							{#each data.goalOptions as goal (goal.id)}
								<option selected={data.filters.goalId === goal.id} value={goal.id}>
									{goal.name}
								</option>
							{/each}
						</select>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Worker scope</span>
						<select class="select text-white" name="workerId">
							<option selected={data.filters.workerId === ''} value="">All workers</option>
							{#each data.workerOptions as worker (worker.id)}
								<option selected={data.filters.workerId === worker.id} value={worker.id}>
									{worker.name}
								</option>
							{/each}
						</select>
					</label>

					<label
						class="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 lg:col-span-2"
					>
						<input name="includeUnscheduled" type="hidden" value="false" />
						<input
							checked={data.filters.includeUnscheduled}
							class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400"
							name="includeUnscheduled"
							type="checkbox"
							value="true"
						/>
						<div>
							<p class="text-sm font-medium text-white">Include undated work</p>
							<p class="text-xs text-slate-400">
								Pull open work without target dates into the session when it is relevant to the
								selected scope.
							</p>
						</div>
					</label>

					<div class="flex flex-wrap gap-3 lg:col-span-2">
						<AppButton type="submit" variant="primary">Apply window</AppButton>
						<AppButton href={resolve('/app/planning')} variant="neutral">Reset</AppButton>
					</div>
				</form>

				<form class="flex flex-wrap gap-3" method="POST" action="?/capturePlanningSession">
					<input name="startDate" type="hidden" value={data.filters.startDate} />
					<input name="endDate" type="hidden" value={data.filters.endDate} />
					<input name="projectId" type="hidden" value={data.filters.projectId} />
					<input name="goalId" type="hidden" value={data.filters.goalId} />
					<input name="workerId" type="hidden" value={data.filters.workerId} />
					<input
						name="includeUnscheduled"
						type="hidden"
						value={data.filters.includeUnscheduled ? 'true' : 'false'}
					/>
					<AppButton type="submit" variant="warning">Capture planning session</AppButton>
					<p class="self-center text-xs text-slate-400">
						Save this planning window as a session record with the goals, tasks, and linked
						decisions currently in scope.
					</p>
				</form>
			</DetailSection>

			<section class="ui-panel space-y-4">
				<div>
					<h2 class="text-xl font-semibold text-white">Goals in scope</h2>
					<p class="mt-1 text-sm text-slate-400">
						These are the goals due in this window or actively served by work under review. This is
						the outcome-level view of the current plan.
					</p>
				</div>

				{#if data.goalsInScope.length === 0}
					<p class="ui-empty-state">
						No goals are currently in scope for this window. Try widening the date range or
						adjusting the filters.
					</p>
				{:else}
					<div class="space-y-4">
						{#each data.goalsInScope as goal (goal.id)}
							<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
								<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
									<div class="min-w-0 flex-1 space-y-3">
										<div class="flex flex-wrap items-center gap-2">
											<a
												class="ui-wrap-anywhere text-lg font-semibold text-white transition hover:text-sky-300"
												href={resolve(`/app/goals/${goal.id}`)}
											>
												{goal.name}
											</a>
											<span
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${goalStatusToneClass(goal.status)}`}
											>
												{formatGoalStatusLabel(goal.status)}
											</span>
											<span
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${confidenceClass(goal.confidence)}`}
											>
												{goal.confidence} confidence
											</span>
										</div>

										<p class="ui-clamp-3 text-sm text-slate-300">{goal.summary}</p>

										<div class="flex flex-wrap gap-3 text-xs text-slate-400">
											<span>Target {formatDate(goal.targetDate)}</span>
											<span>{goal.taskCount} task(s)</span>
											<span>{goal.scheduledTaskCount} scheduled</span>
											<span>{goal.unscheduledTaskCount} undated</span>
											<span>{goal.plannedHours} planned hrs</span>
											<span>{goal.unestimatedTaskCount} unestimated</span>
											<span>Priority {goal.planningPriority}</span>
										</div>

										{#if goal.linkedProjectNames.length > 0}
											<div class="flex flex-wrap gap-2">
												{#each goal.linkedProjectNames as projectName (projectName)}
													<span
														class="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs text-slate-300"
													>
														{projectName}
													</span>
												{/each}
											</div>
										{/if}
									</div>
								</div>

								<form
									class="mt-5 grid gap-4 md:grid-cols-4"
									method="POST"
									action="?/updateGoalPlan"
								>
									<input type="hidden" name="goalId" value={goal.id} />

									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">Target date</span>
										<input
											class="input text-white"
											name="targetDate"
											type="date"
											value={goal.targetDate ?? ''}
										/>
									</label>

									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">Priority</span>
										<input
											class="input text-white"
											min="0"
											name="planningPriority"
											type="number"
											value={goal.planningPriority}
										/>
									</label>

									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">Confidence</span>
										<select class="select text-white" name="confidence">
											{#each data.confidenceOptions as confidence (confidence)}
												<option selected={confidence === goal.confidence} value={confidence}>
													{confidence}
												</option>
											{/each}
										</select>
									</label>

									<div class="flex items-end">
										<AppButton class="w-full" type="submit" variant="primary">Save</AppButton>
									</div>
								</form>
							</article>
						{/each}
					</div>
				{/if}
			</section>

			<DetailSection
				eyebrow="Task queues"
				title="Work under planning review"
				description="Switch between already scheduled commitments and undated work that has been pulled into this review frame."
				bodyClass="space-y-4"
			>
				<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
					<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
								Queue views
							</p>
							<p class="mt-2 text-sm text-slate-400">
								Review one planning queue at a time instead of scanning two long lists in sequence.
							</p>
						</div>
						<PageTabs
							ariaLabel="Planning task queue views"
							bind:value={selectedPlanningTaskView}
							items={[
								{ id: 'scheduled', label: 'Scheduled work', badge: data.scheduledTasks.length },
								{
									id: 'undated',
									label: 'Undated work',
									badge: data.unscheduledTasks.length
								}
							]}
							panelIdPrefix="planning-task-queues"
						/>
					</div>
				</div>

				<div
					id={`planning-task-queues-panel-${selectedPlanningTaskView}`}
					role="tabpanel"
					aria-labelledby={`planning-task-queues-tab-${selectedPlanningTaskView}`}
				>
					{#if selectedPlanningTaskView === 'scheduled'}
						<div class="space-y-4">
							<div>
								<h3 class="text-xl font-semibold text-white">Scheduled work in window</h3>
								<p class="mt-1 text-sm text-slate-400">
									These tasks already carry a target date inside the selected window. This is the
									part of the current plan that is most concretely committed.
								</p>
							</div>

							{#if data.scheduledTasks.length === 0}
								<p class="ui-empty-state">No tasks are currently scheduled in this window.</p>
							{:else}
								<div class="space-y-3">
									{#each data.scheduledTasks as task (task.id)}
										<a
											class="block rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-sky-400/40"
											href={resolve(`/app/tasks/${task.id}`)}
										>
											<div class="flex flex-wrap items-start justify-between gap-3">
												<div class="min-w-0 space-y-2">
													<div class="flex flex-wrap items-center gap-2">
														<p class="ui-wrap-anywhere font-medium text-white">{task.title}</p>
														<span
															class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(task.status)}`}
														>
															{formatTaskStatusLabel(task.status)}
														</span>
													</div>
													<p class="text-xs text-slate-400">
														{task.goalName} · {task.projectName}
													</p>
													{#if task.requiredCapabilityNames.length > 0 || task.requiredToolNames.length > 0}
														<div class="flex flex-wrap gap-2">
															{#each task.requiredCapabilityNames as capability (capability)}
																<span
																	class="rounded-full border border-emerald-900/70 bg-emerald-950/40 px-2 py-1 text-[0.7rem] text-emerald-200"
																>
																	Capability: {capability}
																</span>
															{/each}
															{#each task.requiredToolNames as tool (tool)}
																<span
																	class="rounded-full border border-sky-900/70 bg-sky-950/40 px-2 py-1 text-[0.7rem] text-sky-200"
																>
																	Tool: {tool}
																</span>
															{/each}
														</div>
													{/if}
													{#if task.eligibleWorkerCount > 0}
														<p class="text-xs text-slate-400">
															{task.eligibleWorkerCount} matching worker(s)
															{#if task.suggestedWorkerNames.length > 0}
																: {task.suggestedWorkerNames.join(', ')}
															{/if}
														</p>
													{:else if task.requiredCapabilityNames.length > 0 || task.requiredToolNames.length > 0}
														<p class="text-xs text-rose-300">
															No workers currently match this task’s recorded requirements.
														</p>
													{/if}
													{#if task.assignedWorkerEligible === false}
														<p class="text-xs text-amber-300">
															The current assignee does not match the recorded requirements.
														</p>
													{/if}
													{#if task.blockedReason}
														<p class="text-xs text-rose-300">Blocked: {task.blockedReason}</p>
													{/if}
												</div>
												<div class="text-right text-xs text-slate-400">
													<p>{task.assigneeName}</p>
													<p class="mt-1">{task.estimateHours ?? 'No estimate'} hrs</p>
													<p class="mt-1">{formatDate(task.targetDate)}</p>
												</div>
											</div>
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<div class="space-y-4">
							<div>
								<h3 class="text-xl font-semibold text-white">Undated work pulled into scope</h3>
								<p class="mt-1 text-sm text-slate-400">
									These tasks do not yet have a target date, but they are still relevant to the
									current planning session because of the selected goals, projects, workers, or due
									outcomes in this window.
								</p>
							</div>

							{#if data.unscheduledTasks.length === 0}
								<p class="ui-empty-state">
									No undated tasks were pulled into this session. Either the current scope is
									already dated or the filter excludes undated work.
								</p>
							{:else}
								<div class="space-y-3">
									{#each data.unscheduledTasks as task (task.id)}
										<a
											class="block rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-sky-400/40"
											href={resolve(`/app/tasks/${task.id}`)}
										>
											<div class="flex flex-wrap items-start justify-between gap-3">
												<div class="min-w-0 space-y-2">
													<div class="flex flex-wrap items-center gap-2">
														<p class="ui-wrap-anywhere font-medium text-white">{task.title}</p>
														<span
															class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(task.status)}`}
														>
															{formatTaskStatusLabel(task.status)}
														</span>
														<span
															class="badge border border-amber-900/70 bg-amber-950/40 text-[0.7rem] text-amber-200"
														>
															Undated
														</span>
													</div>
													<p class="text-xs text-slate-400">
														{task.goalName} · {task.projectName}
													</p>
													{#if task.requiredCapabilityNames.length > 0 || task.requiredToolNames.length > 0}
														<div class="flex flex-wrap gap-2">
															{#each task.requiredCapabilityNames as capability (capability)}
																<span
																	class="rounded-full border border-emerald-900/70 bg-emerald-950/40 px-2 py-1 text-[0.7rem] text-emerald-200"
																>
																	Capability: {capability}
																</span>
															{/each}
															{#each task.requiredToolNames as tool (tool)}
																<span
																	class="rounded-full border border-sky-900/70 bg-sky-950/40 px-2 py-1 text-[0.7rem] text-sky-200"
																>
																	Tool: {tool}
																</span>
															{/each}
														</div>
													{/if}
													{#if task.eligibleWorkerCount > 0}
														<p class="text-xs text-slate-400">
															{task.eligibleWorkerCount} matching worker(s)
															{#if task.suggestedWorkerNames.length > 0}
																: {task.suggestedWorkerNames.join(', ')}
															{/if}
														</p>
													{:else if task.requiredCapabilityNames.length > 0 || task.requiredToolNames.length > 0}
														<p class="text-xs text-rose-300">
															No workers currently match this task’s recorded requirements.
														</p>
													{/if}
													{#if task.assignedWorkerEligible === false}
														<p class="text-xs text-amber-300">
															The current assignee does not match the recorded requirements.
														</p>
													{/if}
													{#if task.blockedReason}
														<p class="text-xs text-rose-300">Blocked: {task.blockedReason}</p>
													{/if}
												</div>
												<div class="text-right text-xs text-slate-400">
													<p>{task.assigneeName}</p>
													<p class="mt-1">{task.estimateHours ?? 'No estimate'} hrs</p>
												</div>
											</div>
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</DetailSection>
		</div>

		<div class="space-y-6">
			<section class="ui-panel space-y-4">
				<div>
					<h2 class="text-xl font-semibold text-white">Recent planning sessions</h2>
					<p class="mt-1 text-sm text-slate-400">
						Captured planning windows show what scope was reviewed and how many linked decisions
						came out of that review.
					</p>
				</div>

				{#if data.recentPlanningSessions.length === 0}
					<p class="ui-empty-state">
						No planning sessions have been captured yet for this prototype.
					</p>
				{:else}
					<div class="space-y-3">
						{#each data.recentPlanningSessions as session (session.id)}
							<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 space-y-2">
										<p class="font-medium text-white">{session.summary}</p>
										<p class="text-xs text-slate-400">
											Window {formatDate(session.windowStart)} to {formatDate(session.windowEnd)}
										</p>
									</div>
									<p class="text-xs text-slate-500">{session.createdAtLabel}</p>
								</div>

								<div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
									<span class="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1">
										{session.goalIds.length} goal(s)
									</span>
									<span class="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1">
										{session.taskIds.length} task(s)
									</span>
									<span class="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1">
										{session.decisionIds.length} decision(s)
									</span>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>

			<section class="ui-panel space-y-4">
				<div>
					<h2 class="text-xl font-semibold text-white">Capacity view</h2>
					<p class="mt-1 text-sm text-slate-400">
						Capacity is shown against currently scheduled work in the selected window. This keeps
						the planning view tied to actual commitments rather than abstract backlog size.
					</p>
				</div>

				<div class="space-y-3">
					{#each data.workerLoads as worker (worker.id)}
						<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="ui-wrap-anywhere font-medium text-white">{worker.name}</p>
									<p class="mt-1 text-xs text-slate-500">{worker.status}</p>
								</div>
								<p class={`text-sm font-medium ${workerLoadClass(worker.remainingHours)}`}>
									{worker.remainingHours} hrs free
								</p>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-3">
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Capacity</p>
									<p class="mt-2 text-lg font-semibold text-white">{worker.capacityHours}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Planned</p>
									<p class="mt-2 text-lg font-semibold text-white">{worker.plannedHours}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Balance</p>
									<p class={`mt-2 text-lg font-semibold ${workerLoadClass(worker.remainingHours)}`}>
										{worker.remainingHours}
									</p>
								</div>
							</div>
						</article>
					{/each}
				</div>
			</section>
		</div>
	</div>
</AppPage>
