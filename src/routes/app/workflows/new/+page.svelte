<script lang="ts">
	import { resolve } from '$app/paths';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import WorkflowStepEditor from '$lib/components/workflows/WorkflowStepEditor.svelte';

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
	let canCreateWorkflow = $derived(data.projects.length > 0);
	let formValues = $derived(
		form?.values ?? {
			name: '',
			summary: '',
			projectId: data.projects[0]?.id ?? '',
			stepFields: []
		}
	);

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
			Array.isArray(formValues.stepFields) ? formValues.stepFields : []
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
		title="Create workflow template"
		description="Define the reusable path here, then continue in the detail editor for instantiation and long-term maintenance."
	>
		{#snippet actions()}
			<AppButton href={resolve('/app/workflows')} variant="neutral">Open directory</AppButton>
		{/snippet}
	</DetailHeader>

	{#if form?.message}
		<p aria-live="polite" class="ui-notice border border-rose-900/70 bg-rose-950/40 text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if !canCreateWorkflow}
		<p
			aria-live="polite"
			class="ui-notice border border-amber-900/70 bg-amber-950/40 text-amber-200"
		>
			Create a project before adding workflow templates.
			<a class="ml-2 font-medium text-amber-100 underline" href={resolve('/app/projects')}>
				Open projects
			</a>
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.9fr)]">
		<DetailSection
			title="Template definition"
			description="Start with the common path and only add dependencies where one step truly needs another step’s output."
		>
			<form class="space-y-5" method="POST" action="?/createWorkflow">
				<div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Template name</span>
						<input
							class="input text-white"
							name="name"
							placeholder="App review cleanup"
							required
							value={formValues.name}
						/>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Project</span>
						<select
							class="select text-white"
							disabled={!canCreateWorkflow}
							name="projectId"
							required
						>
							<option value="" selected={!formValues.projectId}>Select a project</option>
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
						class="textarea min-h-28 text-white"
						name="summary"
						placeholder="Reusable workflow for coordinating app review fixes, retesting, and follow-up work."
						required>{formValues.summary}</textarea
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
							Lead with the common sequence. Add edge-case steps only when they matter often enough
							to belong in the reusable template.
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

				<AppButton type="submit" variant="primary" disabled={!canCreateWorkflow}>
					Create template
				</AppButton>
			</form>
		</DetailSection>

		<div class="space-y-6">
			<DetailSection
				title="What happens next"
				description="Saving creates the reusable definition first. Instantiation and generated-task history move to the detail page so this setup flow stays focused."
				tone="sky"
			>
				<div class="space-y-3 text-sm text-slate-300">
					<p>The new template opens in its dedicated detail view immediately after creation.</p>
					<p>
						Edit the sequence there over time without turning the directory into a mixed
						browse-and-edit page.
					</p>
					<p>
						When you are ready, instantiate the workflow into a parent task and sequenced child
						tasks from that detail view.
					</p>
				</div>
			</DetailSection>

			<DetailSection
				title="Directory behavior"
				description="The workflows directory stays optimized for scanning, search, and lightweight previews."
			>
				<div class="space-y-3 text-sm text-slate-300">
					<p>Search and filters help users find the right template before opening it.</p>
					<p>Only high-level summary information belongs in the directory preview.</p>
					<p>
						Detailed editing, instantiation, and destructive actions stay on the dedicated workflow
						page.
					</p>
				</div>
			</DetailSection>
		</div>
	</div>
</AppPage>
