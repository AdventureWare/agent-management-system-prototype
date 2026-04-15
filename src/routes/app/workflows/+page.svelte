<script lang="ts">
	import { resolve } from '$app/paths';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		formatTaskStatusLabel,
		formatWorkflowStatusLabel,
		workflowStatusToneClass
	} from '$lib/types/control-plane';

	let { data, form } = $props();

	let totalLinkedTaskCount = $derived(
		data.workflows.reduce((count, workflow) => count + workflow.rollup.taskCount, 0)
	);
	let activeWorkflowCount = $derived(
		data.workflows.filter((workflow) =>
			['active', 'review', 'blocked'].includes(workflow.rollup.derivedStatus)
		).length
	);
	let repeatableWorkflowCount = $derived(
		data.workflows.filter((workflow) => workflow.kind === 'repeatable').length
	);
	let createWorkflowSuccess = $derived(form?.ok && form?.successAction === 'createWorkflow');
	let updateWorkflowSuccess = $derived(form?.ok && form?.successAction === 'updateWorkflow');
	let setWorkflowStatusSuccess = $derived(form?.ok && form?.successAction === 'setWorkflowStatus');
	let deleteWorkflowSuccess = $derived(form?.ok && form?.successAction === 'deleteWorkflow');
	let formValues = $derived(
		form?.values ?? {
			name: '',
			summary: '',
			projectId: '',
			goalId: '',
			kind: 'ad_hoc',
			targetDate: ''
		}
	);

	function formatWorkflowKindLabel(value: string) {
		return value === 'ad_hoc' ? 'Ad hoc' : 'Repeatable';
	}

	function formatDateLabel(value: string | null | undefined) {
		if (!value) {
			return 'No target date';
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

	function buildCreateTaskHref(workflow: {
		id: string;
		projectId: string;
		goalId?: string | null;
	}) {
		const params = new URLSearchParams({
			create: '1',
			projectId: workflow.projectId,
			workflowId: workflow.id
		});

		if (workflow.goalId) {
			params.set('goalId', workflow.goalId);
		}

		return resolve(`/app/tasks?${params.toString()}`);
	}

	function canMarkWorkflowDone(workflow: (typeof data.workflows)[number]) {
		return (
			workflow.rollup.taskCount === 0 || workflow.rollup.taskCount === workflow.rollup.doneCount
		);
	}

	function canDeleteWorkflow(workflow: (typeof data.workflows)[number]) {
		return workflow.rollup.taskCount === 0;
	}

	let workflowStatusActionMessage = $derived.by(() => {
		if (!setWorkflowStatusSuccess) {
			return '';
		}

		return `Workflow marked ${formatWorkflowStatusLabel(form?.status?.toString() ?? '').toLowerCase()}.`;
	});
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Workflows"
		title="Process structure above tasks"
		description="Workflows group related tasks into a process without replacing task-level routing, roles, or manual operator control."
	>
		{#snippet actions()}
			<AppButton href={resolve('/app/tasks')} variant="neutral">Open tasks</AppButton>
		{/snippet}
	</PageHeader>

	{#if form?.message}
		<p class="ui-notice border border-rose-900/70 bg-rose-950/40 text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if createWorkflowSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Workflow created.
		</p>
	{/if}

	{#if updateWorkflowSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Workflow updated.
		</p>
	{/if}

	{#if setWorkflowStatusSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			{workflowStatusActionMessage}
		</p>
	{/if}

	{#if deleteWorkflowSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Workflow deleted.
		</p>
	{/if}

	<div class="grid gap-4 md:grid-cols-3">
		<MetricCard
			label="Cataloged workflows"
			value={data.workflows.length}
			detail="Named processes coordinating related tasks across time."
		/>
		<MetricCard
			label="Active workflows"
			value={activeWorkflowCount}
			detail="Workflows with active, blocked, or review-state task activity."
		/>
		<MetricCard
			label="Linked tasks"
			value={totalLinkedTaskCount}
			detail={`${repeatableWorkflowCount} repeatable workflow${repeatableWorkflowCount === 1 ? '' : 's'} currently defined.`}
		/>
	</div>

	<section class="ui-panel space-y-5">
		<div class="max-w-3xl">
			<h2 class="text-xl font-semibold text-white">Create workflow</h2>
			<p class="mt-2 text-sm text-slate-400">
				Start with the smallest useful process wrapper: a name, one project anchor, an optional
				goal, and a workflow kind. Tasks can then opt into it individually.
			</p>
		</div>

		<form class="space-y-4" method="POST" action="?/createWorkflow">
			<div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,220px)]">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
					<input
						class="input text-white"
						name="name"
						placeholder="Release readiness"
						required
						value={formValues.name}
					/>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Project</span>
					<select class="select text-white" name="projectId" required>
						<option value="" disabled selected={!formValues.projectId}>Select a project</option>
						{#each data.projects as project (project.id)}
							<option value={project.id} selected={formValues.projectId === project.id}>
								{project.name}
							</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Kind</span>
					<select class="select text-white" name="kind">
						{#each data.workflowKindOptions as workflowKind (workflowKind)}
							<option value={workflowKind} selected={formValues.kind === workflowKind}>
								{formatWorkflowKindLabel(workflowKind)}
							</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Goal</span>
					<select class="select text-white" name="goalId">
						<option value="" selected={!formValues.goalId}>No goal linked</option>
						{#each data.goals as goal (goal.id)}
							<option value={goal.id} selected={formValues.goalId === goal.id}>{goal.name}</option>
						{/each}
					</select>
					<span class="mt-2 block text-xs text-slate-500">
						Optional. Use a goal when the workflow should anchor to one named outcome.
					</span>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Target date</span>
					<input
						class="input text-white"
						name="targetDate"
						type="date"
						value={formValues.targetDate}
					/>
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Summary</span>
				<textarea
					class="textarea min-h-28 text-white placeholder:text-slate-500"
					name="summary"
					placeholder="Coordinate the tasks required to cut, verify, and communicate a release."
					required>{formValues.summary}</textarea
				>
			</label>

			<div class="flex flex-wrap gap-3">
				<AppButton type="submit" variant="primary">Create workflow</AppButton>
			</div>
		</form>
	</section>

	<section class="ui-panel">
		<div class="flex flex-col gap-2">
			<h2 class="text-xl font-semibold text-white">Workflow registry</h2>
			<p class="max-w-3xl text-sm text-slate-400">
				Each workflow shows derived process state from its linked tasks. Tasks remain the unit of
				execution and can still be moved or reassigned manually.
			</p>
		</div>

		{#if data.workflows.length === 0}
			<div class="mt-6 rounded-2xl border border-dashed border-slate-800 bg-slate-950/35 p-6">
				<p class="text-sm text-slate-300">
					No workflows exist yet. Create one when a cluster of tasks needs shared process context.
				</p>
			</div>
		{:else}
			<div class="mt-6 space-y-4">
				{#each data.workflows as workflow (workflow.id)}
					<article class="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
						<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-3">
									<h3 class="text-xl font-semibold text-white">{workflow.name}</h3>
									<span
										class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${workflowStatusToneClass(workflow.rollup.derivedStatus)}`}
									>
										{formatWorkflowStatusLabel(workflow.rollup.derivedStatus)}
									</span>
									<span class="badge border border-slate-700 bg-slate-900/70 text-slate-300">
										{formatWorkflowKindLabel(workflow.kind)}
									</span>
								</div>
								<p class="mt-3 max-w-3xl text-sm text-slate-300">{workflow.summary}</p>
								<div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
									<span class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
										Project · {workflow.projectName}
									</span>
									{#if workflow.goalName}
										<span class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
											Goal · {workflow.goalName}
										</span>
									{/if}
									<span class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
										Target · {formatDateLabel(workflow.targetDate)}
									</span>
								</div>
							</div>

							<div class="flex flex-wrap gap-3">
								<AppButton href={buildCreateTaskHref(workflow)} variant="neutral">
									Create task in workflow
								</AppButton>
								<form method="POST" action="?/setWorkflowStatus">
									<input type="hidden" name="workflowId" value={workflow.id} />
									<input type="hidden" name="status" value="active" />
									<AppButton type="submit" variant="ghost" disabled={workflow.status === 'active'}>
										Activate workflow
									</AppButton>
								</form>
								<form method="POST" action="?/setWorkflowStatus">
									<input type="hidden" name="workflowId" value={workflow.id} />
									<input type="hidden" name="status" value="done" />
									<AppButton
										type="submit"
										variant="success"
										disabled={!canMarkWorkflowDone(workflow) || workflow.status === 'done'}
									>
										Mark done
									</AppButton>
								</form>
								<form method="POST" action="?/setWorkflowStatus">
									<input type="hidden" name="workflowId" value={workflow.id} />
									<input type="hidden" name="status" value="canceled" />
									<AppButton
										type="submit"
										variant="warning"
										disabled={workflow.status === 'canceled'}
									>
										Cancel workflow
									</AppButton>
								</form>
								<form method="POST" action="?/deleteWorkflow">
									<input type="hidden" name="workflowId" value={workflow.id} />
									<AppButton type="submit" variant="danger" disabled={!canDeleteWorkflow(workflow)}>
										Delete workflow
									</AppButton>
								</form>
							</div>
						</div>

						<div class="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
							<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Tasks</p>
								<p class="mt-2 text-sm text-white">{workflow.rollup.taskCount}</p>
							</div>
							<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Runnable</p>
								<p class="mt-2 text-sm text-white">{workflow.rollup.runnableTaskCount}</p>
							</div>
							<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Review</p>
								<p class="mt-2 text-sm text-white">
									{workflow.rollup.reviewCount + workflow.rollup.pendingAcceptanceCount}
								</p>
							</div>
							<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Blocked</p>
								<p class="mt-2 text-sm text-white">
									{workflow.rollup.blockedCount + workflow.rollup.waitingOnDependenciesCount}
								</p>
							</div>
							<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">In progress</p>
								<p class="mt-2 text-sm text-white">{workflow.rollup.inProgressCount}</p>
							</div>
							<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Done</p>
								<p class="mt-2 text-sm text-white">{workflow.rollup.doneCount}</p>
							</div>
						</div>

						{#if workflow.taskPreview.length > 0}
							<div class="mt-5 rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
								<div class="flex items-center justify-between gap-3">
									<p class="text-sm font-medium text-white">Linked tasks</p>
									<p class="text-xs text-slate-500">
										Showing {workflow.taskPreview.length} of {workflow.rollup.taskCount}
									</p>
								</div>
								<div class="mt-4 space-y-3">
									{#each workflow.taskPreview as task (task.id)}
										<div
											class="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
										>
											<div class="min-w-0">
												<a
													class="ui-wrap-anywhere text-sm font-medium text-white transition hover:text-sky-300"
													href={resolve(`/app/tasks/${task.id}`)}
												>
													{task.title}
												</a>
												<p class="mt-1 text-xs text-slate-500">{task.projectName}</p>
											</div>
											<span
												class="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
											>
												{formatTaskStatusLabel(task.status)}
											</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<div class="mt-5 flex flex-wrap gap-3 text-xs text-slate-500">
							{#if !canMarkWorkflowDone(workflow)}
								<p>Mark done stays disabled until every linked task is done.</p>
							{/if}
							{#if !canDeleteWorkflow(workflow)}
								<p>Delete stays disabled until linked tasks are moved out or removed.</p>
							{/if}
						</div>

						<form
							class="mt-5 space-y-4 border-t border-slate-800 pt-5"
							method="POST"
							action="?/updateWorkflow"
						>
							<input type="hidden" name="workflowId" value={workflow.id} />
							<input type="hidden" name="projectId" value={workflow.projectId} />

							<div class="flex flex-col gap-2">
								<h4 class="text-sm font-medium text-white">Edit workflow metadata</h4>
								<p class="text-xs text-slate-500">
									Project stays fixed after creation so linked task membership remains valid.
								</p>
							</div>

							<div class="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_200px]">
								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
									<input class="input text-white" name="name" required value={workflow.name} />
								</label>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Goal</span>
									<select class="select text-white" name="goalId">
										<option value="" selected={!workflow.goalId}>No goal linked</option>
										{#each data.goals as goal (goal.id)}
											<option value={goal.id} selected={workflow.goalId === goal.id}>
												{goal.name}
											</option>
										{/each}
									</select>
								</label>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Kind</span>
									<select class="select text-white" name="kind">
										{#each data.workflowKindOptions as workflowKind (workflowKind)}
											<option value={workflowKind} selected={workflow.kind === workflowKind}>
												{formatWorkflowKindLabel(workflowKind)}
											</option>
										{/each}
									</select>
								</label>
							</div>

							<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Summary</span>
									<textarea class="textarea min-h-24 text-white" name="summary" required
										>{workflow.summary}</textarea
									>
								</label>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Target date</span>
									<input
										class="input text-white"
										name="targetDate"
										type="date"
										value={workflow.targetDate ?? ''}
									/>
								</label>
							</div>

							<div class="flex flex-wrap gap-3">
								<AppButton type="submit" variant="neutral">Save workflow</AppButton>
							</div>
						</form>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</AppPage>
