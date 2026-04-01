<script lang="ts">
	import AppPage from '$lib/components/AppPage.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		formatGoalStatusLabel,
		formatPlanningHorizonKindLabel,
		formatPlanningHorizonStatusLabel,
		formatTaskStatusLabel,
		goalStatusToneClass,
		planningHorizonStatusToneClass,
		taskStatusToneClass
	} from '$lib/types/control-plane';

	let { data, form } = $props();

	let createSuccess = $derived(form?.ok && form?.successAction === 'createPlanningHorizon');
	let slotSuccess = $derived(form?.ok && form?.successAction === 'slotGoal');
	let updateGoalPlanSuccess = $derived(form?.ok && form?.successAction === 'updateGoalPlan');
	let activeHorizonId = $derived(
		(form?.selectedHorizonId as string | undefined) ??
			data.selectedHorizonId ??
			data.selectedHorizon?.id ??
			''
	);

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
		title="Plan the horizon before dispatching work"
		description="Pick a planning window, slot goals into it, and compare planned work against available worker capacity. This first slice keeps planning explicit without collapsing strategy, projects, and tasks into one screen."
	>
		{#snippet meta()}
			<div class="flex flex-wrap gap-2">
				{#if data.selectedHorizon}
					<span
						class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${planningHorizonStatusToneClass(data.selectedHorizon.status)}`}
					>
						{formatPlanningHorizonStatusLabel(data.selectedHorizon.status)}
					</span>
					<span class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] text-slate-300">
						{formatPlanningHorizonKindLabel(data.selectedHorizon.kind)}
					</span>
					<span class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] text-slate-300">
						{formatDate(data.selectedHorizon.startDate)} to {formatDate(data.selectedHorizon.endDate)}
					</span>
				{:else}
					<span class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] text-slate-300">
						No horizon selected
					</span>
				{/if}
			</div>
		{/snippet}
	</PageHeader>

	{#if form?.message}
		<p class="ui-notice border border-rose-900/70 bg-rose-950/40 text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if createSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Planning horizon created.
		</p>
	{/if}

	{#if slotSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Goal added to the selected planning horizon.
		</p>
	{/if}

	{#if updateGoalPlanSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Goal planning fields saved.
		</p>
	{/if}

	<div class="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
		<MetricCard label="Horizons" value={data.metrics.horizonCount} detail="Saved planning windows." />
		<MetricCard
			label="Goals in scope"
			value={data.metrics.goalCount}
			detail="Goals currently committed to the selected horizon."
		/>
		<MetricCard
			label="Tasks in scope"
			value={data.metrics.taskCount}
			detail="Tasks linked directly or indirectly to this horizon."
		/>
		<MetricCard
			label="Planned hours"
			value={data.metrics.plannedHours}
			detail={`${data.metrics.unestimatedTaskCount} task(s) still have no estimate.`}
		/>
		<MetricCard
			label="Capacity hours"
			value={data.metrics.totalCapacityHours}
			detail={`${data.metrics.overAllocatedWorkerCount} worker(s) over capacity.`}
		/>
		<MetricCard
			label="Slack"
			value={data.metrics.remainingCapacityHours}
			detail={`${data.unassignedTaskCount} task(s) in this horizon are still unassigned.`}
		/>
	</div>

	<section class="ui-panel space-y-4">
		<div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
			<div>
				<h2 class="text-xl font-semibold text-white">Planning horizons</h2>
				<p class="mt-1 text-sm text-slate-400">
					Switch between time windows to see which goals are committed and whether the current
					capacity can absorb them.
				</p>
			</div>
		</div>

		{#if data.horizons.length === 0}
			<p class="ui-empty-state">
				No planning horizons exist yet. Create the first horizon to start slotting goals.
			</p>
		{:else}
			<div class="flex flex-wrap gap-3">
				{#each data.horizons as horizon (horizon.id)}
					<a
						class={[
							'rounded-2xl border px-4 py-3 transition',
							activeHorizonId === horizon.id
								? 'border-sky-500/60 bg-sky-950/30'
								: 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
						]}
						href={`/app/planning?horizon=${horizon.id}`}
					>
						<div class="flex flex-wrap items-center gap-2">
							<p class="font-medium text-white">{horizon.name}</p>
							<span
								class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${planningHorizonStatusToneClass(horizon.status)}`}
							>
								{formatPlanningHorizonStatusLabel(horizon.status)}
							</span>
						</div>
						<p class="mt-2 text-xs text-slate-400">
							{formatPlanningHorizonKindLabel(horizon.kind)} · {formatDate(horizon.startDate)} to
							{formatDate(horizon.endDate)}
						</p>
						<p class="mt-2 text-xs text-slate-500">
							{horizon.goalCount} goal(s) · {horizon.taskCount} task(s) · {horizon.estimatedHours}
							{' '}estimated hours
						</p>
					</a>
				{/each}
			</div>
		{/if}
	</section>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
		<div class="space-y-6">
			<section class="ui-panel space-y-4">
				<div>
					<h2 class="text-xl font-semibold text-white">Goals in the selected horizon</h2>
					<p class="mt-1 text-sm text-slate-400">
						This is the first planning surface. Slot goals here, set a target date and priority,
						then use the task and goal surfaces to deepen execution detail.
					</p>
				</div>

				{#if !data.selectedHorizon}
					<p class="ui-empty-state">Create or select a planning horizon to begin.</p>
				{:else if data.horizonGoals.length === 0}
					<p class="ui-empty-state">No goals are committed to this horizon yet.</p>
				{:else}
					<div class="space-y-4">
						{#each data.horizonGoals as goal (goal.id)}
							<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
								<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
									<div class="min-w-0 flex-1 space-y-3">
										<div class="flex flex-wrap items-center gap-2">
											<h3 class="ui-wrap-anywhere text-lg font-semibold text-white">{goal.name}</h3>
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
											<span>{goal.taskCount} task(s)</span>
											<span>{goal.estimatedHours} estimated hours</span>
											<span>{goal.unestimatedTaskCount} unestimated task(s)</span>
											<span>Priority {goal.planningPriority}</span>
											<span>{goal.lane}</span>
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

									<form class="flex-shrink-0" method="POST" action="?/unslotGoal">
										<input type="hidden" name="planningHorizonId" value={activeHorizonId} />
										<input type="hidden" name="goalId" value={goal.id} />
										<button
											class="rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:text-white"
											type="submit"
										>
											Remove
										</button>
									</form>
								</div>

								<form class="mt-5 grid gap-4 md:grid-cols-4" method="POST" action="?/updateGoalPlan">
									<input type="hidden" name="planningHorizonId" value={activeHorizonId} />
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
											class="btn preset-filled-primary-500 w-full font-semibold"
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
					<h2 class="text-xl font-semibold text-white">Task rollup</h2>
					<p class="mt-1 text-sm text-slate-400">
						Tasks already tied to this horizon through direct planning fields or the goal they serve.
					</p>
				</div>

				{#if data.horizonTasks.length === 0}
					<p class="ui-empty-state">No tasks are linked to this horizon yet.</p>
				{:else}
					<div class="space-y-3">
						{#each data.horizonTasks as task (task.id)}
							<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
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
									</div>
									<div class="text-right text-xs text-slate-400">
										<p>{task.assigneeName}</p>
										<p class="mt-1">{task.estimateHours ?? 'No estimate'} hrs</p>
										<p class="mt-1">{formatDate(task.targetDate)}</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<section class="ui-panel space-y-4">
				<div>
					<h2 class="text-xl font-semibold text-white">Available goals</h2>
					<p class="mt-1 text-sm text-slate-400">
						These goals are not committed to any horizon yet. Add them once the current window can
						realistically absorb them.
					</p>
				</div>

				{#if data.availableGoals.length === 0}
					<p class="ui-empty-state">Every goal is already assigned to a planning horizon.</p>
				{:else if !activeHorizonId}
					<p class="ui-empty-state">Create or select a horizon before slotting goals.</p>
				{:else}
					<div class="space-y-3">
						{#each data.availableGoals as goal (goal.id)}
							<form
								class="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:flex-row lg:items-start lg:justify-between"
								method="POST"
								action="?/slotGoal"
							>
								<input type="hidden" name="planningHorizonId" value={activeHorizonId} />
								<input type="hidden" name="goalId" value={goal.id} />

								<div class="min-w-0 flex-1 space-y-2">
									<div class="flex flex-wrap items-center gap-2">
										<p class="ui-wrap-anywhere font-medium text-white">{goal.name}</p>
										<span
											class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${goalStatusToneClass(goal.status)}`}
										>
											{formatGoalStatusLabel(goal.status)}
										</span>
									</div>
									<p class="ui-clamp-2 text-sm text-slate-300">{goal.summary}</p>
									<p class="text-xs text-slate-500">
										{goal.linkedProjectNames.join(', ') || 'No linked projects'} ·
										{' '}{goal.existingTaskCount} existing task(s)
									</p>
								</div>

								<button
									class="btn preset-filled-primary-500 font-semibold"
									type="submit"
								>
									Add to horizon
								</button>
							</form>
						{/each}
					</div>
				{/if}
			</section>
		</div>

		<div class="space-y-6">
			<form class="ui-panel space-y-4" method="POST" action="?/createPlanningHorizon">
				<div class="space-y-2">
					<h2 class="text-xl font-semibold text-white">Create planning horizon</h2>
					<p class="text-sm text-slate-400">
						Start with a concrete timebox. Goals and tasks can then inherit that planning context.
					</p>
				</div>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
					<input
						class="input text-white placeholder:text-slate-500"
						name="name"
						placeholder="Q2 2026"
						required
						value={form?.values?.name ?? ''}
					/>
				</label>

				<div class="grid gap-4 sm:grid-cols-2">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Kind</span>
						<select class="select text-white" name="kind">
							{#each data.horizonKindOptions as kind (kind)}
								<option selected={(form?.values?.kind ?? 'quarter') === kind} value={kind}>
									{formatPlanningHorizonKindLabel(kind)}
								</option>
							{/each}
						</select>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
						<select class="select text-white" name="status">
							{#each data.horizonStatusOptions as status (status)}
								<option selected={(form?.values?.status ?? 'draft') === status} value={status}>
									{formatPlanningHorizonStatusLabel(status)}
								</option>
							{/each}
						</select>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Start date</span>
						<input
							class="input text-white"
							name="startDate"
							required
							type="date"
							value={form?.values?.startDate ?? ''}
						/>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">End date</span>
						<input
							class="input text-white"
							name="endDate"
							required
							type="date"
							value={form?.values?.endDate ?? ''}
						/>
					</label>
				</div>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Capacity unit</span>
					<select class="select text-white" name="capacityUnit">
						{#each data.capacityUnitOptions as capacityUnit (capacityUnit)}
							<option
								selected={(form?.values?.capacityUnit ?? 'hours') === capacityUnit}
								value={capacityUnit}
							>
								{capacityUnit}
							</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Notes</span>
					<textarea
						class="textarea min-h-24 text-white placeholder:text-slate-500"
						name="notes"
						placeholder="What this horizon is trying to accomplish and what constraints matter."
					>{form?.values?.notes ?? ''}</textarea>
				</label>

				<button class="btn preset-filled-primary-500 w-full font-semibold" type="submit">
					Create horizon
				</button>
			</form>

			<section class="ui-panel space-y-4">
				<div>
					<h2 class="text-xl font-semibold text-white">Capacity view</h2>
					<p class="mt-1 text-sm text-slate-400">
						Capacity uses `weeklyCapacityHours` when present and falls back to a coarse estimate from
						execution slot count. This keeps the first slice useful without requiring a full staffing
						model first.
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
