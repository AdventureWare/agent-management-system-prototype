<script lang="ts">
	import { resolve } from '$app/paths';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import WorkflowStepEditor from '$lib/components/workflows/WorkflowStepEditor.svelte';
	import { formatTaskStatusLabel } from '$lib/types/control-plane';

	let { data, form } = $props();
	type StepDraft = {
		clientId: string;
		title: string;
		desiredRoleId: string;
		summary: string;
		dependsOnStepPositions: number[];
	};
	type StepEditableField = 'title' | 'desiredRoleId' | 'summary';
	let stepDraftSequence = 0;

	let totalStepCount = $derived(
		data.workflows.reduce((count, workflow) => count + workflow.steps.length, 0)
	);
	let totalGeneratedTaskCount = $derived(
		data.workflows.reduce((count, workflow) => count + workflow.rollup.taskCount, 0)
	);
	let createWorkflowSuccess = $derived(form?.ok && form?.successAction === 'createWorkflow');
	let updateWorkflowSuccess = $derived(form?.ok && form?.successAction === 'updateWorkflow');
	let instantiateWorkflowSuccess = $derived(
		form?.ok && form?.successAction === 'instantiateWorkflow'
	);
	let deleteWorkflowSuccess = $derived(form?.ok && form?.successAction === 'deleteWorkflow');
	let instantiatedTaskCount = $derived(
		instantiateWorkflowSuccess ? Number(form?.createdTaskCount ?? 0) : 0
	);
	let formValues = $derived(
		form?.values ?? {
			name: '',
			summary: '',
			projectId: '',
			stepFields: []
		}
	);
	let instantiatedTaskHref = $derived(
		instantiateWorkflowSuccess && form?.parentTaskId
			? resolve(`/app/tasks/${form.parentTaskId}`)
			: ''
	);
	let createStepDrafts = $state.raw<StepDraft[]>([]);
	let workflowStepDrafts = $state.raw<Record<string, StepDraft[]>>({});

	function createStepDraft(input?: Partial<Omit<StepDraft, 'clientId'>>) {
		stepDraftSequence += 1;

		return {
			clientId: `step_draft_${stepDraftSequence}`,
			title: input?.title ?? '',
			desiredRoleId: input?.desiredRoleId ?? '',
			summary: input?.summary ?? '',
			dependsOnStepPositions: input?.dependsOnStepPositions ?? []
		} satisfies StepDraft;
	}

	function normalizeStepDrafts(
		steps:
			| Array<{
					title?: string;
					desiredRoleId?: string;
					summary?: string;
					dependsOnStepPositions?: number[];
			  }>
			| null
			| undefined
	) {
		const normalized = (steps ?? []).map((step) =>
			createStepDraft({
				title: step.title ?? '',
				desiredRoleId: step.desiredRoleId ?? '',
				summary: step.summary ?? '',
				dependsOnStepPositions: step.dependsOnStepPositions ?? []
			})
		);

		return normalized.length > 0 ? normalized : [createStepDraft()];
	}

	function buildWorkflowStepDraftMap() {
		return Object.fromEntries(
			data.workflows.map((workflow) => {
				const pendingValues =
					form?.workflowId === workflow.id && Array.isArray(form?.values?.stepFields)
						? form.values.stepFields
						: workflow.steps;

				return [workflow.id, normalizeStepDrafts(pendingValues)];
			})
		) as Record<string, StepDraft[]>;
	}

	$effect(() => {
		createStepDrafts = normalizeStepDrafts(
			Array.isArray(formValues.stepFields) ? formValues.stepFields : []
		);
		workflowStepDrafts = buildWorkflowStepDraftMap();
	});

	function canDeleteWorkflow(workflow: (typeof data.workflows)[number]) {
		return workflow.rollup.taskCount === 0;
	}

	function reindexStepDependencies(steps: StepDraft[], removedPosition: number) {
		return steps.map((step, index) => ({
			...step,
			dependsOnStepPositions: step.dependsOnStepPositions
				.filter((position) => position !== removedPosition)
				.map((position) => (position > removedPosition ? position - 1 : position))
				.filter((position) => position < index + 1)
		}));
	}

	function updateCreateStepField(clientId: string, field: StepEditableField, value: string) {
		createStepDrafts = createStepDrafts.map((step) =>
			step.clientId === clientId ? { ...step, [field]: value } : step
		);
	}

	function addCreateStep() {
		createStepDrafts = [
			...createStepDrafts,
			createStepDraft({
				dependsOnStepPositions: createStepDrafts.length > 0 ? [createStepDrafts.length] : []
			})
		];
	}

	function removeCreateStep(clientId: string) {
		if (createStepDrafts.length === 1) {
			return;
		}

		const removedPosition = createStepDrafts.findIndex((step) => step.clientId === clientId) + 1;
		createStepDrafts = reindexStepDependencies(
			createStepDrafts.filter((step) => step.clientId !== clientId),
			removedPosition
		);
	}

	function updateWorkflowStepField(
		workflowId: string,
		clientId: string,
		field: StepEditableField,
		value: string
	) {
		const currentDrafts = workflowStepDrafts[workflowId] ?? [createStepDraft()];
		workflowStepDrafts = {
			...workflowStepDrafts,
			[workflowId]: currentDrafts.map((step) =>
				step.clientId === clientId ? { ...step, [field]: value } : step
			)
		};
	}

	function addWorkflowStep(workflowId: string) {
		const currentDrafts = workflowStepDrafts[workflowId] ?? [createStepDraft()];
		workflowStepDrafts = {
			...workflowStepDrafts,
			[workflowId]: [
				...currentDrafts,
				createStepDraft({
					dependsOnStepPositions: currentDrafts.length > 0 ? [currentDrafts.length] : []
				})
			]
		};
	}

	function removeWorkflowStep(workflowId: string, clientId: string) {
		const currentDrafts = workflowStepDrafts[workflowId] ?? [createStepDraft()];

		if (currentDrafts.length === 1) {
			return;
		}

		const removedPosition =
			currentDrafts.findIndex((candidate) => candidate.clientId === clientId) + 1;
		workflowStepDrafts = {
			...workflowStepDrafts,
			[workflowId]: reindexStepDependencies(
				currentDrafts.filter((step) => step.clientId !== clientId),
				removedPosition
			)
		};
	}

	function updateCreateStepDependencies(clientId: string, positions: number[]) {
		createStepDrafts = createStepDrafts.map((step, index) =>
			step.clientId === clientId
				? {
						...step,
						dependsOnStepPositions: positions.filter((position) => position < index + 1)
					}
				: step
		);
	}

	function updateWorkflowStepDependencies(
		workflowId: string,
		clientId: string,
		positions: number[]
	) {
		const currentDrafts = workflowStepDrafts[workflowId] ?? [createStepDraft()];
		workflowStepDrafts = {
			...workflowStepDrafts,
			[workflowId]: currentDrafts.map((step, index) =>
				step.clientId === clientId
					? {
							...step,
							dependsOnStepPositions: positions.filter((position) => position < index + 1)
						}
					: step
			)
		};
	}
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Workflows"
		title="Workflow templates"
		description="Define reusable, ordered task sequences with default roles, then instantiate them into normal tasks when a feature or larger effort needs structure."
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
			Workflow template created.
		</p>
	{/if}

	{#if updateWorkflowSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Workflow template updated.
		</p>
	{/if}

	{#if instantiateWorkflowSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Created {instantiatedTaskCount} task{instantiatedTaskCount === 1 ? '' : 's'} from the workflow template.
			{#if instantiatedTaskHref}
				<a class="ml-2 font-medium text-emerald-100 underline" href={instantiatedTaskHref}>
					Open parent task
				</a>
			{/if}
		</p>
	{/if}

	{#if deleteWorkflowSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Workflow template deleted.
		</p>
	{/if}

	<div class="grid gap-4 md:grid-cols-3">
		<MetricCard
			label="Template library"
			value={data.workflows.length}
			detail="Reusable workflow definitions available for larger work."
		/>
		<MetricCard
			label="Template steps"
			value={totalStepCount}
			detail="Ordered steps saved across all workflow templates."
		/>
		<MetricCard
			label="Generated tasks"
			value={totalGeneratedTaskCount}
			detail="Tasks created from workflow templates across the library."
		/>
	</div>

	<section class="ui-panel space-y-5">
		<div class="max-w-3xl">
			<h2 class="text-xl font-semibold text-white">Create workflow template</h2>
			<p class="mt-2 text-sm text-slate-400">
				Use workflow templates only when work is big enough to benefit from repeatable structure.
				Simple changes should still stay as ordinary tasks.
			</p>
		</div>

		<form class="space-y-4" method="POST" action="?/createWorkflow">
			<div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Template name</span>
					<input
						class="input text-white"
						name="name"
						placeholder="Feature development"
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
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Template summary</span>
				<textarea
					class="textarea min-h-24 text-white placeholder:text-slate-500"
					name="summary"
					placeholder="Reusable process for turning an idea into a shipped feature."
					required>{formValues.summary}</textarea
				>
			</label>

			<div class="space-y-3">
				<div>
					<span class="block text-sm font-medium text-slate-200">Workflow steps</span>
					<span class="mt-2 block text-xs text-slate-500">
						Define the ordered steps that should be generated when this template is instantiated.
					</span>
				</div>
				<WorkflowStepEditor
					steps={createStepDrafts}
					roles={data.roles}
					onupdate={(clientId, field, value) => updateCreateStepField(clientId, field, value)}
					onupdateDependencies={(clientId, positions) =>
						updateCreateStepDependencies(clientId, positions)}
					onadd={addCreateStep}
					onremove={removeCreateStep}
				/>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
				<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
					Available roles
				</p>
				<div class="mt-3 flex flex-wrap gap-2">
					{#each data.roles as role (role.id)}
						<span
							class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-300"
						>
							{role.id} · {role.name}
						</span>
					{/each}
				</div>
			</div>

			<div class="flex flex-wrap gap-3">
				<AppButton type="submit" variant="primary">Create workflow template</AppButton>
			</div>
		</form>
	</section>

	<section class="ui-panel">
		<div class="flex flex-col gap-2">
			<h2 class="text-xl font-semibold text-white">Template library</h2>
			<p class="max-w-3xl text-sm text-slate-400">
				Instantiate a workflow template only when work is large enough to justify several tasks. The
				generated work still becomes ordinary tasks that can be edited manually.
			</p>
		</div>

		{#if data.workflows.length === 0}
			<div class="mt-6 rounded-2xl border border-dashed border-slate-800 bg-slate-950/35 p-6">
				<p class="text-sm text-slate-300">
					No workflow templates exist yet. Create one once you see a repeatable multi-step pattern.
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
									<span class="badge border border-sky-900/70 bg-sky-950/40 text-sky-200">
										{workflow.steps.length} step{workflow.steps.length === 1 ? '' : 's'}
									</span>
								</div>
								<p class="mt-3 max-w-3xl text-sm text-slate-300">{workflow.summary}</p>
								<div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
									<span class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
										Project · {workflow.projectName}
									</span>
									<span class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
										Generated tasks · {workflow.rollup.taskCount}
									</span>
								</div>
							</div>
						</div>

						<div class="mt-5 rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm font-medium text-white">Template steps</p>
								<p class="text-xs text-slate-500">
									Instantiates into normal tasks with dependency links between steps.
								</p>
							</div>
							<div class="mt-4 space-y-3">
								{#each workflow.steps as step (step.id)}
									<div class="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
										<div class="flex flex-wrap items-center justify-between gap-3">
											<div class="min-w-0">
												<p class="ui-wrap-anywhere text-sm font-medium text-white">
													Step {step.position} · {step.title}
												</p>
												{#if step.summary}
													<p class="mt-1 text-xs text-slate-400">{step.summary}</p>
												{/if}
												{#if step.dependsOnStepTitles?.length > 0}
													<p class="mt-2 text-xs text-slate-500">
														Depends on {step.dependsOnStepTitles.join(', ')}
													</p>
												{:else if step.position > 1}
													<p class="mt-2 text-xs text-slate-500">Can start in parallel.</p>
												{/if}
											</div>
											<span
												class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-300"
											>
												{step.desiredRoleName
													? `Role · ${step.desiredRoleName}`
													: 'No default role'}
											</span>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<form
							class="mt-5 space-y-4 border-t border-slate-800 pt-5"
							method="POST"
							action="?/instantiateWorkflow"
						>
							<input type="hidden" name="workflowId" value={workflow.id} />

							<div class="flex flex-col gap-2">
								<h4 class="text-sm font-medium text-white">Instantiate template</h4>
								<p class="text-xs text-slate-500">
									Create a parent task plus one child task per workflow step.
								</p>
							</div>

							<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Parent task name</span
									>
									<input
										class="input text-white"
										name="taskName"
										placeholder="Build dark mode"
										required
									/>
								</label>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200"
										>Parent task summary</span
									>
									<input
										class="input text-white"
										name="taskSummary"
										placeholder="Ship the first dark mode version across the product."
									/>
								</label>

								<div class="flex items-end">
									<AppButton type="submit" variant="primary">Create task set</AppButton>
								</div>
							</div>
						</form>

						{#if workflow.taskPreview.length > 0}
							<div class="mt-5 rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
								<div class="flex items-center justify-between gap-3">
									<p class="text-sm font-medium text-white">Recent generated tasks</p>
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

						<form
							class="mt-5 space-y-4 border-t border-slate-800 pt-5"
							method="POST"
							action="?/updateWorkflow"
						>
							<input type="hidden" name="workflowId" value={workflow.id} />
							<input type="hidden" name="projectId" value={workflow.projectId} />

							<div class="flex flex-col gap-2">
								<h4 class="text-sm font-medium text-white">Edit template</h4>
								<p class="text-xs text-slate-500">
									Keep the template reusable. Generated tasks stay normal tasks after instantiation.
								</p>
							</div>

							<div class="grid gap-4">
								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
									<input
										class="input text-white"
										name="name"
										required
										value={form?.workflowId === workflow.id
											? (form?.values?.name ?? workflow.name)
											: workflow.name}
									/>
								</label>
							</div>

							<div class="grid gap-4">
								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Summary</span>
									<textarea class="textarea min-h-24 text-white" name="summary" required
										>{form?.workflowId === workflow.id
											? (form?.values?.summary ?? workflow.summary)
											: workflow.summary}</textarea
									>
								</label>
							</div>

							<div class="space-y-3">
								<div>
									<span class="block text-sm font-medium text-slate-200">Workflow steps</span>
									<span class="mt-2 block text-xs text-slate-500">
										Update the ordered task sequence and default roles for this template.
									</span>
								</div>
								<WorkflowStepEditor
									steps={workflowStepDrafts[workflow.id] ?? []}
									roles={data.roles}
									onupdate={(clientId, field, value) =>
										updateWorkflowStepField(workflow.id, clientId, field, value)}
									onupdateDependencies={(clientId, positions) =>
										updateWorkflowStepDependencies(workflow.id, clientId, positions)}
									onadd={() => addWorkflowStep(workflow.id)}
									onremove={(clientId) => removeWorkflowStep(workflow.id, clientId)}
								/>
							</div>

							<div class="flex flex-wrap gap-3">
								<AppButton type="submit" variant="neutral">Save template</AppButton>
								<AppButton
									type="submit"
									form={`delete-workflow-${workflow.id}`}
									variant="danger"
									disabled={!canDeleteWorkflow(workflow)}
								>
									Delete template
								</AppButton>
							</div>

							{#if !canDeleteWorkflow(workflow)}
								<p class="text-xs text-slate-500">
									Delete stays disabled until generated tasks are moved out or removed.
								</p>
							{/if}
						</form>
						<form id={`delete-workflow-${workflow.id}`} method="POST" action="?/deleteWorkflow">
							<input type="hidden" name="workflowId" value={workflow.id} />
						</form>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</AppPage>
