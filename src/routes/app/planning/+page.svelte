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
		formatPriorityLabel,
		formatTaskRiskLevelLabel,
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

	function executionSurfaceLoadClass(remainingHours: number) {
		if (remainingHours < 0) {
			return 'text-rose-200';
		}

		if (remainingHours < 8) {
			return 'text-amber-200';
		}

		return 'text-emerald-200';
	}

	function backlogBucketClass(bucketId: 'now' | 'next' | 'later') {
		switch (bucketId) {
			case 'now':
				return 'border-rose-900/70 bg-rose-950/20';
			case 'next':
				return 'border-amber-900/70 bg-amber-950/20';
			case 'later':
			default:
				return 'border-slate-800 bg-slate-950/40';
		}
	}

	function backlogReasonClass(reason: string) {
		if (reason.startsWith('Urgency:')) {
			return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
		}

		if (reason.startsWith('Leverage:')) {
			return 'border-sky-900/70 bg-sky-950/40 text-sky-200';
		}

		if (reason.startsWith('Risk:')) {
			return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
		}

		if (reason.startsWith('Dependency order:')) {
			return 'border-violet-900/70 bg-violet-950/40 text-violet-200';
		}

		return 'border-slate-700 bg-slate-950/70 text-slate-300';
	}

	function workloadStateLabel(state: 'idle' | 'available' | 'saturated' | 'offline') {
		switch (state) {
			case 'idle':
				return 'Idle';
			case 'available':
				return 'Available';
			case 'saturated':
				return 'Saturated';
			case 'offline':
			default:
				return 'Offline';
		}
	}

	function workloadStateClass(state: 'idle' | 'available' | 'saturated' | 'offline') {
		switch (state) {
			case 'idle':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'available':
				return 'border-sky-900/70 bg-sky-950/40 text-sky-200';
			case 'saturated':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			case 'offline':
			default:
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
		}
	}

	function buildExecutionSurfaceAvailabilitySummary(task: {
		matchingExecutionSurfaceCount: number;
		eligibleExecutionSurfaceCount: number;
		idleExecutionSurfaceCount: number;
		saturatedExecutionSurfaceCount: number;
		offlineExecutionSurfaceCount: number;
		suggestedExecutionSurfaceNames: string[];
		saturatedExecutionSurfaceNames: string[];
		offlineExecutionSurfaceNames: string[];
	}) {
		if (task.eligibleExecutionSurfaceCount > 0) {
			const summary = [
				`${task.eligibleExecutionSurfaceCount} execution surface(s) can take work now`,
				task.idleExecutionSurfaceCount > 0 ? `${task.idleExecutionSurfaceCount} idle` : 'none idle'
			];

			if (task.suggestedExecutionSurfaceNames.length > 0) {
				summary.push(task.suggestedExecutionSurfaceNames.join(', '));
			}

			return {
				tone: 'ready' as const,
				text: summary.join(' · ')
			};
		}

		if (task.matchingExecutionSurfaceCount > 0) {
			const blockers: string[] = [];

			if (task.saturatedExecutionSurfaceCount > 0) {
				blockers.push(
					`${task.saturatedExecutionSurfaceCount} saturated${
						task.saturatedExecutionSurfaceNames.length > 0
							? `: ${task.saturatedExecutionSurfaceNames.join(', ')}`
							: ''
					}`
				);
			}

			if (task.offlineExecutionSurfaceCount > 0) {
				blockers.push(
					`${task.offlineExecutionSurfaceCount} offline${
						task.offlineExecutionSurfaceNames.length > 0
							? `: ${task.offlineExecutionSurfaceNames.join(', ')}`
							: ''
					}`
				);
			}

			return {
				tone: 'warning' as const,
				text: `No matching execution surfaces can take work now. ${blockers.join(' · ')}`
			};
		}

		return {
			tone: 'danger' as const,
			text: 'No execution surfaces currently match this task’s recorded routing requirements.'
		};
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
			detail={`${data.metrics.overAllocatedExecutionSurfaceCount} execution surface(s) over capacity in this window.`}
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
						<span class="mb-2 block text-sm font-medium text-slate-200">
							Execution surface scope
						</span>
						<select class="select text-white" name="executionSurfaceId">
							<option selected={data.filters.executionSurfaceId === ''} value="">
								All execution surfaces
							</option>
							{#each data.executionSurfaceOptions as executionSurface (executionSurface.id)}
								<option
									selected={data.filters.executionSurfaceId === executionSurface.id}
									value={executionSurface.id}
								>
									{executionSurface.name}
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
					<input name="executionSurfaceId" type="hidden" value={data.filters.executionSurfaceId} />
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
				eyebrow="Backlog"
				title="Now, next, later"
				description="This backlog view makes the pull order explicit. Each item carries the smallest useful reason for why it belongs in the current focus set, the follow-on queue, or a deferred lane."
				bodyClass="space-y-4"
			>
				<div class="grid gap-4 xl:grid-cols-3">
					{#each data.backlogBuckets as bucket (bucket.id)}
						<section class={`rounded-3xl border p-4 ${backlogBucketClass(bucket.id)}`}>
							<div class="flex items-start justify-between gap-3">
								<div>
									<h3 class="text-xl font-semibold text-white">{bucket.label}</h3>
									<p class="mt-1 text-sm text-slate-400">{bucket.description}</p>
								</div>
								<span
									class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] text-slate-300"
								>
									{bucket.items.length}
								</span>
							</div>

							{#if bucket.items.length === 0}
								<p class="ui-empty-state mt-4">
									No tasks currently fall into {bucket.label.toLowerCase()}.
								</p>
							{:else}
								<div class="mt-4 space-y-3">
									{#each bucket.items as task (task.id)}
										<a
											class="block rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-sky-400/40"
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
												</div>
												<div class="text-right text-xs text-slate-400">
													<p>{task.assigneeName}</p>
													<p class="mt-1">
														{task.targetDate ? formatDate(task.targetDate) : 'Undated'}
													</p>
												</div>
											</div>

											<div class="mt-3 flex flex-wrap gap-2 text-[0.7rem]">
												<span
													class="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-slate-300"
												>
													{formatPriorityLabel(task.priority)} priority
												</span>
												<span
													class="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-slate-300"
												>
													{formatTaskRiskLevelLabel(task.riskLevel)} risk
												</span>
												<span
													class="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-slate-300"
												>
													{task.estimateHours ?? 'No estimate'} hrs
												</span>
											</div>

											<div class="mt-3 flex flex-wrap gap-2">
												{#each task.priorityReasons as reason (reason)}
													<span
														class={`rounded-full border px-3 py-1 text-xs ${backlogReasonClass(reason)}`}
													>
														{reason}
													</span>
												{/each}
											</div>
										</a>
									{/each}
								</div>
							{/if}
						</section>
					{/each}
				</div>
			</DetailSection>

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
										{@const availabilitySummary = buildExecutionSurfaceAvailabilitySummary(task)}
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
													<p
														class={`text-xs ${availabilitySummary.tone === 'ready' ? 'text-slate-400' : availabilitySummary.tone === 'warning' ? 'text-amber-300' : 'text-rose-300'}`}
													>
														{availabilitySummary.text}
													</p>
													{#if task.assignedExecutionSurfaceMatchesRequirements === false}
														<p class="text-xs text-amber-300">
															The current assignee does not match the recorded routing requirements.
														</p>
													{:else if task.assignedExecutionSurfaceWorkloadState === 'saturated'}
														<p class="text-xs text-amber-300">
															The current assignee is saturated and cannot take more queued work
															right now.
														</p>
													{:else if task.assignedExecutionSurfaceWorkloadState === 'offline'}
														<p class="text-xs text-rose-300">
															The current assignee is offline right now.
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
									current planning session because of the selected goals, projects, execution
									surfaces, or due outcomes in this window.
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
										{@const availabilitySummary = buildExecutionSurfaceAvailabilitySummary(task)}
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
													<p
														class={`text-xs ${availabilitySummary.tone === 'ready' ? 'text-slate-400' : availabilitySummary.tone === 'warning' ? 'text-amber-300' : 'text-rose-300'}`}
													>
														{availabilitySummary.text}
													</p>
													{#if task.assignedExecutionSurfaceMatchesRequirements === false}
														<p class="text-xs text-amber-300">
															The current assignee does not match the recorded routing requirements.
														</p>
													{:else if task.assignedExecutionSurfaceWorkloadState === 'saturated'}
														<p class="text-xs text-amber-300">
															The current assignee is saturated and cannot take more queued work
															right now.
														</p>
													{:else if task.assignedExecutionSurfaceWorkloadState === 'offline'}
														<p class="text-xs text-rose-300">
															The current assignee is offline right now.
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
					{#each data.executionSurfaceLoads as executionSurface (executionSurface.id)}
						<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<p class="ui-wrap-anywhere font-medium text-white">{executionSurface.name}</p>
										<span
											class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${workloadStateClass(executionSurface.workloadState)}`}
										>
											{workloadStateLabel(executionSurface.workloadState)}
										</span>
									</div>
									<p class="mt-1 text-xs text-slate-500">{executionSurface.status}</p>
								</div>
								<p
									class={`text-sm font-medium ${executionSurfaceLoadClass(executionSurface.remainingHours)}`}
								>
									{executionSurface.remainingHours} hrs free
								</p>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-3">
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Capacity</p>
									<p class="mt-2 text-lg font-semibold text-white">
										{executionSurface.capacityHours}
									</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Planned</p>
									<p class="mt-2 text-lg font-semibold text-white">
										{executionSurface.plannedHours}
									</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Balance</p>
									<p
										class={`mt-2 text-lg font-semibold ${executionSurfaceLoadClass(executionSurface.remainingHours)}`}
									>
										{executionSurface.remainingHours}
									</p>
								</div>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-3">
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Open tasks</p>
									<p class="mt-2 text-lg font-semibold text-white">
										{executionSurface.assignedOpenTaskCount}/{executionSurface.assignmentLimit}
									</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Active runs</p>
									<p class="mt-2 text-lg font-semibold text-white">
										{executionSurface.activeRunCount}/{executionSurface.concurrencyLimit}
									</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Open slots</p>
									<p class="mt-2 text-lg font-semibold text-white">
										{executionSurface.availableAssignmentCapacity} task · {executionSurface.availableRunCapacity}
										run
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
