<script lang="ts">
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		formatGoalStatusLabel,
		formatTaskStatusLabel,
		goalStatusToneClass,
		taskStatusToneClass
	} from '$lib/types/control-plane';

	let { data, form } = $props();

	let updateGoalPlanSuccess = $derived(form?.ok && form?.successAction === 'updateGoalPlan');

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

<AppPage>
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

	<div class="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
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

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
		<div class="space-y-6">
			<section class="ui-panel space-y-4">
				<div>
					<h2 class="text-xl font-semibold text-white">Planning window</h2>
					<p class="mt-1 text-sm text-slate-400">
						Planning here works over the current plan. Choose the date range and scope you want to
						inspect, then review what is scheduled, what remains undated, and what needs to change.
					</p>
				</div>

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
						<button class="btn preset-filled-primary-500 font-semibold" type="submit">
							Apply window
						</button>
						<a
							class="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:text-white"
							href={resolve('/app/planning')}
						>
							Reset
						</a>
					</div>
				</form>
			</section>

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
										<button
											class="btn w-full preset-filled-primary-500 font-semibold"
											type="submit"
										>
											Save
										</button>
									</div>
								</form>
							</article>
						{/each}
					</div>
				{/if}
			</section>

			<section class="ui-panel space-y-4">
				<div>
					<h2 class="text-xl font-semibold text-white">Scheduled work in window</h2>
					<p class="mt-1 text-sm text-slate-400">
						These tasks already carry a target date inside the selected window. This is the part of
						the current plan that is most concretely committed.
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
										<p class="text-xs text-slate-400">{task.goalName} · {task.projectName}</p>
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
			</section>

			<section class="ui-panel space-y-4">
				<div>
					<h2 class="text-xl font-semibold text-white">Undated work pulled into scope</h2>
					<p class="mt-1 text-sm text-slate-400">
						These tasks do not yet have a target date, but they are still relevant to the current
						planning session because of the selected goals, projects, workers, or due outcomes in
						this window.
					</p>
				</div>

				{#if data.unscheduledTasks.length === 0}
					<p class="ui-empty-state">
						No undated tasks were pulled into this session. Either the current scope is already
						dated or the filter excludes undated work.
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
										<p class="text-xs text-slate-400">{task.goalName} · {task.projectName}</p>
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
			</section>
		</div>

		<div class="space-y-6">
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
