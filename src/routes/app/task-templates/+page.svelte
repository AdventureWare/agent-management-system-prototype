<script lang="ts">
	import { resolve } from '$app/paths';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		appendExecutionRequirementName,
		findUnknownExecutionRequirementNames
	} from '$lib/execution-requirements';
	import {
		AGENT_SANDBOX_OPTIONS,
		formatAgentSandboxLabel,
		type AgentSandbox
	} from '$lib/types/agent-thread';
	import {
		TASK_APPROVAL_MODE_OPTIONS,
		TASK_RISK_LEVEL_OPTIONS,
		formatTaskApprovalModeLabel,
		formatTaskRiskLevelLabel
	} from '$lib/types/control-plane';

	let { data, form } = $props();

	type TaskTemplateEditorValues = {
		taskTemplateId: string;
		taskTemplateName: string;
		taskTemplateSummary: string;
		projectId: string;
		goalId: string;
		workflowId: string;
		name: string;
		instructions: string;
		successCriteria: string;
		readyCondition: string;
		expectedOutcome: string;
		area: string;
		priority: string;
		riskLevel: string;
		approvalMode: string;
		requiredThreadSandbox: '' | AgentSandbox;
		requiresReview: boolean;
		desiredRoleId: string;
		assigneeExecutionSurfaceId: string;
		requiredPromptSkillNames: string;
		requiredCapabilityNames: string;
		requiredToolNames: string;
	};

	function buildDefaultEditorValues(
		values?: Partial<Record<keyof TaskTemplateEditorValues, unknown>>
	): TaskTemplateEditorValues {
		const defaultProjectId =
			typeof values?.projectId === 'string'
				? values.projectId
				: data.projects.length === 1
					? (data.projects[0]?.id ?? '')
					: '';

		return {
			taskTemplateId: typeof values?.taskTemplateId === 'string' ? values.taskTemplateId : '',
			taskTemplateName: typeof values?.taskTemplateName === 'string' ? values.taskTemplateName : '',
			taskTemplateSummary:
				typeof values?.taskTemplateSummary === 'string' ? values.taskTemplateSummary : '',
			projectId: defaultProjectId,
			goalId: typeof values?.goalId === 'string' ? values.goalId : '',
			workflowId: typeof values?.workflowId === 'string' ? values.workflowId : '',
			name: typeof values?.name === 'string' ? values.name : '',
			instructions: typeof values?.instructions === 'string' ? values.instructions : '',
			successCriteria: typeof values?.successCriteria === 'string' ? values.successCriteria : '',
			readyCondition: typeof values?.readyCondition === 'string' ? values.readyCondition : '',
			expectedOutcome: typeof values?.expectedOutcome === 'string' ? values.expectedOutcome : '',
			area: typeof values?.area === 'string' ? values.area : 'product',
			priority: typeof values?.priority === 'string' ? values.priority : 'medium',
			riskLevel: typeof values?.riskLevel === 'string' ? values.riskLevel : 'medium',
			approvalMode: typeof values?.approvalMode === 'string' ? values.approvalMode : 'none',
			requiredThreadSandbox:
				typeof values?.requiredThreadSandbox === 'string' &&
				AGENT_SANDBOX_OPTIONS.includes(values.requiredThreadSandbox as AgentSandbox)
					? (values.requiredThreadSandbox as AgentSandbox)
					: '',
			requiresReview: typeof values?.requiresReview === 'boolean' ? values.requiresReview : true,
			desiredRoleId: typeof values?.desiredRoleId === 'string' ? values.desiredRoleId : '',
			assigneeExecutionSurfaceId:
				typeof values?.assigneeExecutionSurfaceId === 'string'
					? values.assigneeExecutionSurfaceId
					: '',
			requiredPromptSkillNames: Array.isArray(values?.requiredPromptSkillNames)
				? values.requiredPromptSkillNames.join(', ')
				: typeof values?.requiredPromptSkillNames === 'string'
					? values.requiredPromptSkillNames
					: '',
			requiredCapabilityNames: Array.isArray(values?.requiredCapabilityNames)
				? values.requiredCapabilityNames.join(', ')
				: typeof values?.requiredCapabilityNames === 'string'
					? values.requiredCapabilityNames
					: '',
			requiredToolNames: Array.isArray(values?.requiredToolNames)
				? values.requiredToolNames.join(', ')
				: typeof values?.requiredToolNames === 'string'
					? values.requiredToolNames
					: ''
		};
	}

	let isEditorOpen = $state(false);
	let editorMode = $state<'create' | 'edit'>('create');
	let editorValues = $state(buildDefaultEditorValues());

	let createTaskTemplateSuccess = $derived(
		form?.ok && form?.successAction === 'createTaskTemplate'
	);
	let updateTaskTemplateSuccess = $derived(
		form?.ok && form?.successAction === 'updateTaskTemplate'
	);
	let deleteTaskTemplateSuccess = $derived(
		form?.ok && form?.successAction === 'deleteTaskTemplate'
	);
	let workflowLinkedTemplateCount = $derived(
		data.taskTemplates.filter((taskTemplate) => Boolean(taskTemplate.workflowId)).length
	);
	let projectCoverageCount = $derived(
		new Set(data.taskTemplates.map((taskTemplate) => taskTemplate.projectId)).size
	);
	let selectedProjectSkillSummary = $derived(
		data.projectSkillSummaries.find((summary) => summary.projectId === editorValues.projectId) ??
			null
	);
	let availableWorkflows = $derived(data.workflows);
	let selectedProjectInstalledSkillNames = $derived(
		selectedProjectSkillSummary?.installedSkills.map((skill) => skill.id) ?? []
	);
	let unknownPromptSkillNames = $derived(
		findUnknownExecutionRequirementNames(
			editorValues.requiredPromptSkillNames,
			selectedProjectInstalledSkillNames
		)
	);
	let unknownCapabilityNames = $derived(
		findUnknownExecutionRequirementNames(
			editorValues.requiredCapabilityNames,
			data.executionRequirementInventory.capabilityNames
		)
	);
	let unknownToolNames = $derived(
		findUnknownExecutionRequirementNames(
			editorValues.requiredToolNames,
			data.executionRequirementInventory.toolNames
		)
	);

	function openCreateEditor() {
		editorMode = 'create';
		editorValues = buildDefaultEditorValues();
		isEditorOpen = true;
	}

	function openEditEditor(taskTemplate: (typeof data.taskTemplates)[number]) {
		editorMode = 'edit';
		editorValues = buildDefaultEditorValues({
			taskTemplateId: taskTemplate.id,
			taskTemplateName: taskTemplate.name,
			taskTemplateSummary: taskTemplate.summary,
			projectId: taskTemplate.projectId,
			goalId: taskTemplate.goalId ?? '',
			workflowId: taskTemplate.workflowId ?? '',
			name: taskTemplate.taskTitle,
			instructions: taskTemplate.taskSummary,
			successCriteria: taskTemplate.successCriteria,
			readyCondition: taskTemplate.readyCondition,
			expectedOutcome: taskTemplate.expectedOutcome,
			area: taskTemplate.area,
			priority: taskTemplate.priority,
			riskLevel: taskTemplate.riskLevel,
			approvalMode: taskTemplate.approvalMode,
			requiredThreadSandbox: taskTemplate.requiredThreadSandbox ?? '',
			requiresReview: taskTemplate.requiresReview,
			desiredRoleId: taskTemplate.desiredRoleId,
			assigneeExecutionSurfaceId: taskTemplate.assigneeExecutionSurfaceId ?? '',
			requiredPromptSkillNames: taskTemplate.requiredPromptSkillNames,
			requiredCapabilityNames: taskTemplate.requiredCapabilityNames,
			requiredToolNames: taskTemplate.requiredToolNames
		});
		isEditorOpen = true;
	}

	function closeEditor() {
		isEditorOpen = false;
		editorMode = 'create';
	}

	$effect(() => {
		if (form?.reopenEditor && form?.values) {
			editorMode = form.editorMode === 'edit' ? 'edit' : 'create';
			editorValues = buildDefaultEditorValues(form.values);
			isEditorOpen = true;
			return;
		}

		if (createTaskTemplateSuccess || updateTaskTemplateSuccess) {
			closeEditor();
		}
	});
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Task Templates"
		title="Task template library"
		description="Store reusable task defaults for repeated work, then apply them from task intake when you do not want to re-enter the same project, goal, workflow, role, and instruction setup."
	>
		{#snippet actions()}
			<div class="flex flex-wrap gap-3">
				<AppButton onclick={openCreateEditor}>New template</AppButton>
				<AppButton href={resolve('/app/tasks')} variant="neutral">Open tasks</AppButton>
			</div>
		{/snippet}
	</PageHeader>

	{#if form?.message}
		<p class="ui-notice border border-rose-900/70 bg-rose-950/40 text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if createTaskTemplateSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Task template created.
		</p>
	{/if}

	{#if updateTaskTemplateSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Task template updated.
		</p>
	{/if}

	{#if deleteTaskTemplateSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Task template deleted.
		</p>
	{/if}

	<div class="grid gap-4 md:grid-cols-3">
		<MetricCard
			label="Templates"
			value={data.taskTemplates.length}
			detail="Saved repeated task setups available from task intake."
		/>
		<MetricCard
			label="Workflow-backed"
			value={workflowLinkedTemplateCount}
			detail="Templates that also apply a workflow when used."
		/>
		<MetricCard
			label="Projects covered"
			value={projectCoverageCount}
			detail="Projects that already have reusable task templates."
		/>
	</div>

	<div class="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="max-w-3xl">
				<p class="text-sm font-medium text-white">How this page is meant to work</p>
				<p class="mt-2 text-sm text-slate-400">
					Use task templates for repeated single-task setups. Use workflows when a parent task
					should expand into a standard multi-step plan. A task template can include a workflow when
					that repeated task type usually needs one.
				</p>
			</div>
			<button
				class="rounded-full border border-slate-700 px-4 py-2 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white"
				type="button"
				onclick={openCreateEditor}
			>
				Create template
			</button>
		</div>
	</div>

	{#if data.taskTemplates.length === 0}
		<div
			class="rounded-3xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-16 text-center"
		>
			<p class="text-lg font-medium text-white">No task templates yet</p>
			<p class="mt-3 text-sm text-slate-400">
				Create the first reusable task setup here, then apply it from the task intake flow.
			</p>
			<div class="mt-6 flex justify-center">
				<AppButton onclick={openCreateEditor}>Create first template</AppButton>
			</div>
		</div>
	{:else}
		<div class="grid gap-4 xl:grid-cols-2">
			{#each data.taskTemplates as taskTemplate (taskTemplate.id)}
				<section class="rounded-3xl border border-slate-800 bg-slate-900/40 p-5">
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<h2 class="text-lg font-semibold text-white">{taskTemplate.name}</h2>
								<span
									class="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-1 text-[11px] text-slate-300 uppercase"
								>
									{taskTemplate.projectName}
								</span>
								{#if taskTemplate.workflowId}
									<span
										class="rounded-full border border-sky-800/60 bg-slate-950/80 px-2 py-1 text-[11px] text-sky-200 uppercase"
									>
										Workflow linked
									</span>
								{/if}
							</div>
							{#if taskTemplate.summary}
								<p class="mt-2 text-sm text-slate-300">{taskTemplate.summary}</p>
							{/if}
						</div>
						<div class="flex flex-wrap gap-2">
							<button
								class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white"
								type="button"
								onclick={() => {
									openEditEditor(taskTemplate);
								}}
							>
								Edit
							</button>
							<form method="POST" action="?/deleteTaskTemplate" data-persist-scope="manual">
								<input type="hidden" name="taskTemplateId" value={taskTemplate.id} />
								<button
									class="rounded-full border border-rose-900/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-rose-200 uppercase transition hover:border-rose-700 hover:text-white"
									type="submit"
									onclick={(event) => {
										if (!window.confirm(`Delete task template "${taskTemplate.name}"?`)) {
											event.preventDefault();
										}
									}}
								>
									Delete
								</button>
							</form>
						</div>
					</div>

					<div class="mt-5 grid gap-3 md:grid-cols-2">
						<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
							<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Default task title
							</p>
							<p class="mt-2 text-sm text-white">{taskTemplate.taskTitle}</p>
						</div>
						<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
							<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Routing
							</p>
							<p class="mt-2 text-sm text-white">
								{taskTemplate.desiredRoleName}
								<span class="text-slate-500"> · {taskTemplate.assigneeExecutionSurfaceName}</span>
							</p>
						</div>
						<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
							<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Goal
							</p>
							<p class="mt-2 text-sm text-white">{taskTemplate.goalLabel}</p>
						</div>
						<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
							<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Workflow
							</p>
							<p class="mt-2 text-sm text-white">{taskTemplate.workflowName}</p>
						</div>
					</div>

					<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Default instructions
						</p>
						<p class="mt-2 text-sm whitespace-pre-wrap text-slate-300">
							{taskTemplate.taskSummary}
						</p>
					</div>

					<div class="mt-4 grid gap-3 md:grid-cols-3">
						<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
							<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Prompt skills
							</p>
							<p class="mt-2 text-sm text-slate-300">
								{taskTemplate.requiredPromptSkillNames.length > 0
									? taskTemplate.requiredPromptSkillNames.join(', ')
									: 'None'}
							</p>
						</div>
						<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
							<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Capabilities
							</p>
							<p class="mt-2 text-sm text-slate-300">
								{taskTemplate.requiredCapabilityNames.length > 0
									? taskTemplate.requiredCapabilityNames.join(', ')
									: 'None'}
							</p>
						</div>
						<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
							<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Tools
							</p>
							<p class="mt-2 text-sm text-slate-300">
								{taskTemplate.requiredToolNames.length > 0
									? taskTemplate.requiredToolNames.join(', ')
									: 'None'}
							</p>
						</div>
					</div>
				</section>
			{/each}
		</div>
	{/if}

	<AppDialog
		bind:open={isEditorOpen}
		title={editorMode === 'edit' ? 'Edit task template' : 'New task template'}
		description={editorMode === 'edit'
			? 'Update the reusable defaults for this repeated task type.'
			: 'Create a reusable task setup so future intake does not require re-entering the same defaults.'}
		closeLabel={editorMode === 'edit'
			? 'Close edit task template dialog'
			: 'Close create task template dialog'}
	>
		<form
			class="space-y-5"
			method="POST"
			action={editorMode === 'edit' ? '?/updateTaskTemplate' : '?/createTaskTemplate'}
			data-persist-scope="manual"
		>
			{#if editorMode === 'edit'}
				<input type="hidden" name="taskTemplateId" value={editorValues.taskTemplateId} />
			{/if}
			<input type="hidden" name="area" value={editorValues.area} />

			<div class="grid gap-4 md:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Template name</span>
					<input
						bind:value={editorValues.taskTemplateName}
						class="input text-white placeholder:text-slate-500"
						name="taskTemplateName"
						placeholder="Research Brief"
						required
					/>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Project</span>
					<select
						bind:value={editorValues.projectId}
						class="select text-white"
						name="projectId"
						required
					>
						<option value="" disabled>Select a project</option>
						{#each data.projects as project (project.id)}
							<option value={project.id}>{project.name}</option>
						{/each}
					</select>
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Template summary</span>
				<textarea
					bind:value={editorValues.taskTemplateSummary}
					class="textarea min-h-24 text-white placeholder:text-slate-500"
					name="taskTemplateSummary"
					placeholder="Use this when repeated marketplace research requests need the same defaults."
				></textarea>
			</label>

			<div class="grid gap-4 md:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Goal</span>
					<select bind:value={editorValues.goalId} class="select text-white" name="goalId">
						<option value="">No goal linked</option>
						{#each data.goals as goal (goal.id)}
							<option value={goal.id}>{goal.label}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Apply workflow</span>
					<select bind:value={editorValues.workflowId} class="select text-white" name="workflowId">
						<option value="">No workflow</option>
						{#each availableWorkflows as workflow (workflow.id)}
							<option value={workflow.id}>{workflow.name}</option>
						{/each}
					</select>
					{#if availableWorkflows.length === 0}
						<span class="mt-2 block text-xs text-slate-500"> No workflows are available yet. </span>
					{/if}
				</label>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Default task title</span>
					<input
						bind:value={editorValues.name}
						class="input text-white placeholder:text-slate-500"
						name="name"
						placeholder="Research [topic]"
						required
					/>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">
						Assign to execution surface
					</span>
					<select
						bind:value={editorValues.assigneeExecutionSurfaceId}
						class="select text-white"
						name="assigneeExecutionSurfaceId"
					>
						<option value="">Leave unassigned</option>
						{#each data.executionSurfaces as executionSurface (executionSurface.id)}
							<option value={executionSurface.id}>{executionSurface.name}</option>
						{/each}
					</select>
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Default instructions</span>
				<textarea
					bind:value={editorValues.instructions}
					class="textarea min-h-36 text-white placeholder:text-slate-500"
					name="instructions"
					placeholder="Describe the repeated task setup, expected output, and constraints."
					required
				></textarea>
			</label>

			<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Desired role</span>
					<select
						bind:value={editorValues.desiredRoleId}
						class="select text-white"
						name="desiredRoleId"
					>
						<option value="">No role preference</option>
						{#each data.roles as role (role.id)}
							<option value={role.id}>{role.name}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Priority</span>
					<select bind:value={editorValues.priority} class="select text-white" name="priority">
						<option value="low">Low</option>
						<option value="medium">Medium</option>
						<option value="high">High</option>
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Risk level</span>
					<select bind:value={editorValues.riskLevel} class="select text-white" name="riskLevel">
						{#each TASK_RISK_LEVEL_OPTIONS as riskLevel (riskLevel)}
							<option value={riskLevel}>{formatTaskRiskLevelLabel(riskLevel)}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Approval mode</span>
					<select
						bind:value={editorValues.approvalMode}
						class="select text-white"
						name="approvalMode"
					>
						{#each TASK_APPROVAL_MODE_OPTIONS as approvalMode (approvalMode)}
							<option value={approvalMode}>{formatTaskApprovalModeLabel(approvalMode)}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Requires review</span>
					<select
						bind:value={editorValues.requiresReview}
						class="select text-white"
						name="requiresReview"
					>
						<option value={true}>Yes</option>
						<option value={false}>No</option>
					</select>
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Required sandbox</span>
				<select
					bind:value={editorValues.requiredThreadSandbox}
					class="select text-white"
					name="requiredThreadSandbox"
				>
					<option value="">Inherit defaults</option>
					{#each AGENT_SANDBOX_OPTIONS as sandbox (sandbox)}
						<option value={sandbox}>{formatAgentSandboxLabel(sandbox)}</option>
					{/each}
				</select>
			</label>

			<div class="grid gap-4 lg:grid-cols-3">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Success criteria</span>
					<textarea
						bind:value={editorValues.successCriteria}
						class="textarea min-h-28 text-white placeholder:text-slate-500"
						name="successCriteria"
						placeholder="Describe how a reviewer should judge this task as complete."
					></textarea>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Ready condition</span>
					<textarea
						bind:value={editorValues.readyCondition}
						class="textarea min-h-28 text-white placeholder:text-slate-500"
						name="readyCondition"
						placeholder="Describe what must already be true before this task should run."
					></textarea>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Expected outcome</span>
					<textarea
						bind:value={editorValues.expectedOutcome}
						class="textarea min-h-28 text-white placeholder:text-slate-500"
						name="expectedOutcome"
						placeholder="Describe the desired end state or deliverable."
					></textarea>
				</label>
			</div>

			<div class="grid gap-4 md:grid-cols-1">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Requested prompt skills</span>
					<input
						bind:value={editorValues.requiredPromptSkillNames}
						class="input text-white placeholder:text-slate-500"
						name="requiredPromptSkillNames"
						placeholder="frontend-sveltekit, docs-writer"
						list="task-template-prompt-skill-inventory"
					/>
					{#if selectedProjectInstalledSkillNames.length > 0}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each selectedProjectSkillSummary?.installedSkills ?? [] as skill (skill.id)}
								<button
									type="button"
									class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-700 hover:text-white"
									title={skill.description || skill.sourceLabel}
									onclick={() => {
										editorValues.requiredPromptSkillNames = appendExecutionRequirementName(
											editorValues.requiredPromptSkillNames,
											skill.id
										);
									}}
								>
									{skill.id}
								</button>
							{/each}
						</div>
					{/if}
					{#if unknownPromptSkillNames.length > 0}
						<span class="mt-2 block text-xs text-amber-300">
							Not installed in this project workspace: {unknownPromptSkillNames.join(', ')}
						</span>
					{/if}
				</label>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Required capabilities</span>
					<input
						bind:value={editorValues.requiredCapabilityNames}
						class="input text-white placeholder:text-slate-500"
						name="requiredCapabilityNames"
						placeholder="planning, citations"
						list="task-template-capability-inventory"
					/>
					<div class="mt-3 flex flex-wrap gap-2">
						{#each data.executionRequirementInventory.capabilities as capability (capability.name)}
							<button
								type="button"
								class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-700 hover:text-white"
								onclick={() => {
									editorValues.requiredCapabilityNames = appendExecutionRequirementName(
										editorValues.requiredCapabilityNames,
										capability.name
									);
								}}
							>
								{capability.name}
							</button>
						{/each}
					</div>
					{#if unknownCapabilityNames.length > 0}
						<span class="mt-2 block text-xs text-amber-300">
							Not in the current inventory: {unknownCapabilityNames.join(', ')}
						</span>
					{/if}
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Required tools</span>
					<input
						bind:value={editorValues.requiredToolNames}
						class="input text-white placeholder:text-slate-500"
						name="requiredToolNames"
						placeholder="codex, playwright"
						list="task-template-tool-inventory"
					/>
					<div class="mt-3 flex flex-wrap gap-2">
						{#each data.executionRequirementInventory.tools as tool (tool.name)}
							<button
								type="button"
								class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-700 hover:text-white"
								onclick={() => {
									editorValues.requiredToolNames = appendExecutionRequirementName(
										editorValues.requiredToolNames,
										tool.name
									);
								}}
							>
								{tool.name}
							</button>
						{/each}
					</div>
					{#if unknownToolNames.length > 0}
						<span class="mt-2 block text-xs text-amber-300">
							Not in the current inventory: {unknownToolNames.join(', ')}
						</span>
					{/if}
				</label>
			</div>

			<datalist id="task-template-prompt-skill-inventory">
				{#each selectedProjectSkillSummary?.installedSkills ?? [] as skill (skill.id)}
					<option value={skill.id}></option>
				{/each}
			</datalist>

			<datalist id="task-template-capability-inventory">
				{#each data.executionRequirementInventory.capabilityNames as capabilityName (capabilityName)}
					<option value={capabilityName}></option>
				{/each}
			</datalist>

			<datalist id="task-template-tool-inventory">
				{#each data.executionRequirementInventory.toolNames as toolName (toolName)}
					<option value={toolName}></option>
				{/each}
			</datalist>

			<div class="flex flex-wrap items-center gap-3">
				<button class="btn preset-filled-primary-500 font-semibold" type="submit">
					{editorMode === 'edit' ? 'Update template' : 'Create template'}
				</button>
				<button
					class="btn border border-slate-700 font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
					type="button"
					onclick={closeEditor}
				>
					Cancel
				</button>
			</div>
		</form>
	</AppDialog>
</AppPage>
