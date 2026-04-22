<script lang="ts">
	import { resolve } from '$app/paths';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import WorkflowStepEditor from '$lib/components/workflows/WorkflowStepEditor.svelte';
	import {
		formatTaskStatusLabel,
		formatWorkflowStatusLabel,
		taskStatusToneClass,
		workflowStatusToneClass
	} from '$lib/types/control-plane';

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
	let workflowStepDrafts = $state.raw<StepDraft[]>([]);

	let updateWorkflowSuccess = $derived(form?.ok && form?.successAction === 'updateWorkflow');
	let instantiateWorkflowSuccess = $derived(
		form?.ok && form?.successAction === 'instantiateWorkflow'
	);
	let instantiatedTaskCount = $derived(
		instantiateWorkflowSuccess ? Number(form?.createdTaskCount ?? 0) : 0
	);
	let instantiatedTaskHref = $derived(
		instantiateWorkflowSuccess && form?.parentTaskId
			? resolve(`/app/tasks/${form.parentTaskId}`)
			: ''
	);
	let generatedTasksHref = $derived(resolve(`/app/tasks?workflowId=${data.workflow.id}`));
	let formValues = $derived(
		form?.values ?? {
			name: data.workflow.name,
			summary: data.workflow.summary,
			projectId: data.workflow.projectId,
			stepFields: data.workflow.steps
		}
	);
	let canDeleteWorkflow = $derived(data.workflow.rollup.taskCount === 0);

	function createStepDraft(input?: Partial<Omit<StepDraft, 'clientId'>>) {
		stepDraftSequence += 1;

		return {
			clientId: `workflow_step_draft_${stepDraftSequence}`,
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

	function reindexStepDependencies(steps: StepDraft[], removedPosition: number) {
		return steps.map((step, index) => ({
			...step,
			dependsOnStepPositions: step.dependsOnStepPositions
				.filter((position) => position !== removedPosition)
				.map((position) => (position > removedPosition ? position - 1 : position))
				.filter((position) => position < index + 1)
		}));
	}

	$effect(() => {
		workflowStepDrafts = normalizeStepDrafts(
			Array.isArray(formValues.stepFields) ? formValues.stepFields : data.workflow.steps
		);
	});

	function updateWorkflowStepField(clientId: string, field: StepEditableField, value: string) {
		workflowStepDrafts = workflowStepDrafts.map((step) =>
			step.clientId === clientId ? { ...step, [field]: value } : step
		);
	}

	function addWorkflowStep() {
		workflowStepDrafts = [
			...workflowStepDrafts,
			createStepDraft({
				dependsOnStepPositions: workflowStepDrafts.length > 0 ? [workflowStepDrafts.length] : []
			})
		];
	}

	function removeWorkflowStep(clientId: string) {
		if (workflowStepDrafts.length === 1) {
			return;
		}

		const removedPosition =
			workflowStepDrafts.findIndex((candidate) => candidate.clientId === clientId) + 1;
		workflowStepDrafts = reindexStepDependencies(
			workflowStepDrafts.filter((step) => step.clientId !== clientId),
			removedPosition
		);
	}

	function updateWorkflowStepDependencies(clientId: string, positions: number[]) {
		workflowStepDrafts = workflowStepDrafts.map((step, index) =>
			step.clientId === clientId
				? {
						...step,
						dependsOnStepPositions: positions.filter((position) => position < index + 1)
					}
				: step
		);
	}
</script>

<AppPage width="full">
	<DetailHeader
		backHref="/app/workflows"
		backLabel="Back to workflows"
		eyebrow="Workflow"
		title={data.workflow.name}
		description="Edit the reusable sequence here. Keep the directory view for scanning and use this page when you need the full definition."
	>
		{#snippet meta()}
			<div class="flex flex-wrap gap-2">
				<span
					class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-300"
				>
					Project · {data.project?.name ?? data.workflow.projectName}
				</span>
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${workflowStatusToneClass(data.workflow.rollup.derivedStatus)}`}
				>
					{formatWorkflowStatusLabel(data.workflow.rollup.derivedStatus)}
				</span>
			</div>
		{/snippet}
		{#snippet actions()}
			<AppButton href={resolve('/app/workflows')} variant="neutral">Open directory</AppButton>
		{/snippet}
	</DetailHeader>

	{#if form?.message}
		<p aria-live="polite" class="ui-notice border border-rose-900/70 bg-rose-950/40 text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if data.createdSuccess}
		<p
			aria-live="polite"
			class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200"
		>
			Workflow template created. Keep refining the template here, then instantiate it when you are
			ready.
		</p>
	{/if}

	{#if updateWorkflowSuccess}
		<p
			aria-live="polite"
			class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200"
		>
			Workflow template updated.
		</p>
	{/if}

	{#if instantiateWorkflowSuccess}
		<p
			aria-live="polite"
			class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200"
		>
			Created {instantiatedTaskCount} task{instantiatedTaskCount === 1 ? '' : 's'} from the workflow template.
			{#if instantiatedTaskHref}
				<a class="ml-2 font-medium text-emerald-100 underline" href={instantiatedTaskHref}>
					Open parent task
				</a>
			{/if}
		</p>
	{/if}

	<div class="grid gap-4 md:grid-cols-4">
		<MetricCard
			label="Steps"
			value={data.workflow.steps.length}
			detail="Ordered template steps saved in this workflow."
		/>
		<MetricCard
			label="Generated tasks"
			value={data.workflow.rollup.taskCount}
			detail="Tasks already created from this workflow."
		/>
		<MetricCard
			label="Runnable"
			value={data.workflow.rollup.runnableTaskCount}
			detail="Generated tasks that can move now without waiting."
		/>
		<MetricCard
			label="Parallel-ready"
			value={data.workflow.parallelizableStepCount}
			detail="Later steps that can start without a dependency gate."
		/>
	</div>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.9fr)]">
		<DetailSection
			title="Template definition"
			description="Edit the common path first. Project stays fixed after creation, so use the step plan and summaries to refine the behavior over time."
		>
			<form class="space-y-5" method="POST" action="?/updateWorkflow">
				<input type="hidden" name="workflowId" value={data.workflow.id} />
				<input type="hidden" name="projectId" value={formValues.projectId} />

				<div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Template name</span>
						<input class="input text-white" name="name" required value={formValues.name} />
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Project</span>
						<input
							class="input cursor-not-allowed text-slate-400"
							disabled
							value={data.project?.name ?? data.workflow.projectName}
						/>
						<span class="mt-2 block text-xs text-slate-500">
							Project assignment is locked after the workflow is created.
						</span>
					</label>
				</div>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Template summary</span>
					<textarea class="textarea min-h-28 text-white" name="summary" required
						>{formValues.summary}</textarea
					>
				</label>

				<details class="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
					<summary class="cursor-pointer text-sm font-medium text-white">
						Show sequencing guidance
					</summary>
					<div class="mt-4 space-y-2 text-sm text-slate-400">
						<p>Use dependencies only when a step must wait on another step’s output.</p>
						<p>Leave every dependency unchecked when a step can start in parallel after launch.</p>
						<p>Prefer clear step titles that can become task titles without more editing.</p>
					</div>
				</details>

				<div class="space-y-3">
					<div class="flex flex-col gap-2">
						<span class="block text-sm font-medium text-slate-200">Step plan</span>
						<span class="block text-xs text-slate-500">
							Design the sequence from common path to edge cases. Keep optional complexity out of
							the early steps unless it is consistently needed.
						</span>
					</div>
					<WorkflowStepEditor
						steps={workflowStepDrafts}
						roles={data.roles}
						onupdate={(clientId, field, value) => updateWorkflowStepField(clientId, field, value)}
						onupdateDependencies={(clientId, positions) =>
							updateWorkflowStepDependencies(clientId, positions)}
						onadd={addWorkflowStep}
						onremove={removeWorkflowStep}
					/>
				</div>

				<details class="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
					<summary class="cursor-pointer text-sm font-medium text-white">
						Show default role options
					</summary>
					<div class="mt-4 flex flex-wrap gap-2">
						{#each data.roles as role (role.id)}
							<span
								class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-300"
							>
								{role.name}
							</span>
						{/each}
					</div>
				</details>

				<AppButton type="submit" variant="primary">Save template</AppButton>
			</form>
		</DetailSection>

		<div class="space-y-6">
			<DetailSection
				title="Instantiate template"
				description="Use this when the workflow should become a real parent task plus sequenced child tasks."
				tone="sky"
			>
				<form class="space-y-4" method="POST" action="?/instantiateWorkflow">
					<input type="hidden" name="workflowId" value={data.workflow.id} />

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Parent task name</span>
						<input
							class="input text-white"
							name="taskName"
							placeholder="Build dark mode"
							required
						/>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Parent task summary</span>
						<textarea
							class="textarea min-h-24 text-white placeholder:text-slate-500"
							name="taskSummary"
							placeholder="Ship the first dark mode version across the product."
						></textarea>
					</label>

					<AppButton type="submit" variant="primary">Create task set</AppButton>
				</form>
			</DetailSection>

			<DetailSection
				title="Recent generated work"
				description="A lightweight snapshot of tasks already created from this template. Open the task list when you need the full set."
			>
				{#snippet actions()}
					{#if data.workflow.rollup.taskCount > 0}
						<AppButton href={generatedTasksHref} variant="neutral">
							View all generated tasks
						</AppButton>
					{/if}
				{/snippet}
				{#if data.workflow.taskPreview.length === 0}
					<p class="text-sm text-slate-400">This workflow has not been instantiated yet.</p>
				{:else}
					{#if data.workflow.taskPreview.length < data.workflow.rollup.taskCount}
						<p class="mb-4 text-xs text-slate-500">
							Showing {data.workflow.taskPreview.length} of {data.workflow.rollup.taskCount}
							generated task{data.workflow.rollup.taskCount === 1 ? '' : 's'}.
						</p>
					{/if}
					<div class="space-y-3">
						{#each data.workflow.taskPreview as task (task.id)}
							<div class="rounded-2xl border border-slate-800 bg-slate-950/45 px-4 py-3">
								<div class="flex flex-wrap items-center justify-between gap-3">
									<a
										class="ui-wrap-anywhere text-sm font-medium text-white transition hover:text-sky-300"
										href={resolve(`/app/tasks/${task.id}`)}
									>
										{task.title}
									</a>
									<span
										class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${taskStatusToneClass(task.status)}`}
									>
										{formatTaskStatusLabel(task.status)}
									</span>
								</div>
								<p class="mt-2 text-xs text-slate-500">{task.projectName}</p>
							</div>
						{/each}
					</div>
				{/if}
			</DetailSection>

			<DetailSection
				title="Delete template"
				description="Only templates with no generated tasks can be deleted, so historical task links remain intact."
				tone="rose"
			>
				{#snippet actions()}
					{#if !canDeleteWorkflow}
						<AppButton href={generatedTasksHref} variant="neutral">Review linked tasks</AppButton>
					{/if}
				{/snippet}
				<form class="space-y-4" method="POST" action="?/deleteWorkflow">
					<input type="hidden" name="workflowId" value={data.workflow.id} />
					<p class="text-sm text-slate-300">
						{#if canDeleteWorkflow}
							This template can be deleted now because nothing generated from it is still linked.
						{:else}
							Delete is blocked because {data.workflow.rollup.taskCount} generated task{data
								.workflow.rollup.taskCount === 1
								? ''
								: 's'} still point at this workflow.
						{/if}
					</p>
					{#if !canDeleteWorkflow}
						<p class="text-xs text-slate-500">
							Open the linked task set, then remove or relink those tasks before deleting the
							template.
						</p>
					{/if}

					<AppButton type="submit" variant="danger" disabled={!canDeleteWorkflow}>
						Delete workflow template
					</AppButton>
				</form>
			</DetailSection>
		</div>
	</div>
</AppPage>
