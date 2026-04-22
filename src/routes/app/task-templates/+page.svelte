<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import TaskTemplateEditorForm from '$lib/components/task-templates/TaskTemplateEditorForm.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		buildDefaultTaskTemplateEditorValues,
		type TaskTemplateEditorValues
	} from '$lib/task-templates/editor';
	import { formatCatalogLifecycleStatusLabel } from '$lib/types/control-plane';

	let { data, form } = $props();

	function defaultProjectId() {
		return data.projects.length === 1 ? (data.projects[0]?.id ?? '') : '';
	}

	let isEditorOpen = $state(false);
	let editorMode = $state<'create' | 'edit'>('create');
	let editorValues = $state(buildDefaultTaskTemplateEditorValues());
	let consumedForkTemplateId = $state('');

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
	let activeTemplateCount = $derived(
		data.taskTemplates.filter(
			(taskTemplate) => (taskTemplate.lifecycleStatus ?? 'active') === 'active'
		).length
	);
	let projectCoverageCount = $derived(
		new Set(data.taskTemplates.map((taskTemplate) => taskTemplate.projectId)).size
	);
	function openCreateEditor() {
		editorMode = 'create';
		editorValues = buildDefaultTaskTemplateEditorValues(undefined, defaultProjectId());
		isEditorOpen = true;
	}

	function openEditEditor(taskTemplate: (typeof data.taskTemplates)[number]) {
		editorMode = 'edit';
		editorValues = buildDefaultTaskTemplateEditorValues({
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
			lifecycleStatus: taskTemplate.lifecycleStatus ?? 'active',
			sourceTaskTemplateId: taskTemplate.sourceTaskTemplateId ?? '',
			forkReason: taskTemplate.forkReason ?? '',
			supersededByTaskTemplateId: taskTemplate.supersededByTaskTemplateId ?? '',
			requiredPromptSkillNames: taskTemplate.requiredPromptSkillNames,
			requiredCapabilityNames: taskTemplate.requiredCapabilityNames,
			requiredToolNames: taskTemplate.requiredToolNames
		});
		isEditorOpen = true;
	}

	function openCreateFromTemplate(taskTemplate: (typeof data.taskTemplates)[number]) {
		editorMode = 'create';
		editorValues = buildDefaultTaskTemplateEditorValues(
			{
				taskTemplateName: `${taskTemplate.name} variant`,
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
				lifecycleStatus: 'active',
				sourceTaskTemplateId: taskTemplate.id,
				forkReason: '',
				supersededByTaskTemplateId: '',
				requiredPromptSkillNames: taskTemplate.requiredPromptSkillNames,
				requiredCapabilityNames: taskTemplate.requiredCapabilityNames,
				requiredToolNames: taskTemplate.requiredToolNames
			},
			taskTemplate.projectId
		);
		isEditorOpen = true;
	}

	function closeEditor() {
		isEditorOpen = false;
		editorMode = 'create';
	}

	$effect(() => {
		if (form?.reopenEditor && form?.values) {
			editorMode = form.editorMode === 'edit' ? 'edit' : 'create';
			editorValues = buildDefaultTaskTemplateEditorValues(form.values, defaultProjectId());
			isEditorOpen = true;
			return;
		}

		if (createTaskTemplateSuccess || updateTaskTemplateSuccess) {
			closeEditor();
		}
	});

	$effect(() => {
		const requestedTemplateId = page.url.searchParams.get('fork')?.trim() ?? '';

		if (!requestedTemplateId || requestedTemplateId === consumedForkTemplateId || isEditorOpen) {
			return;
		}

		const sourceTemplate = data.taskTemplates.find(
			(taskTemplate) => taskTemplate.id === requestedTemplateId
		);

		if (!sourceTemplate) {
			consumedForkTemplateId = requestedTemplateId;
			return;
		}

		openCreateFromTemplate(sourceTemplate);
		consumedForkTemplateId = requestedTemplateId;
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

	<div class="grid gap-4 md:grid-cols-4">
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
			label="Active templates"
			value={activeTemplateCount}
			detail="Templates currently recommended for new task intake."
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
								<h2 class="text-lg font-semibold text-white">
									<a
										class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
										href={resolve(`/app/task-templates/${taskTemplate.id}`)}
									>
										{taskTemplate.name}
									</a>
								</h2>
								<span
									class="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-1 text-[11px] text-slate-300 uppercase"
								>
									{taskTemplate.projectName}
								</span>
								{#if (taskTemplate.lifecycleStatus ?? 'active') !== 'active'}
									<span
										class="rounded-full border border-amber-900/60 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-200 uppercase"
									>
										{formatCatalogLifecycleStatusLabel(taskTemplate.lifecycleStatus ?? 'active')}
									</span>
								{/if}
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
							<a
								class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white"
								href={resolve(`/app/task-templates/${taskTemplate.id}`)}
							>
								Open detail
							</a>
							<button
								class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white"
								type="button"
								onclick={() => {
									openEditEditor(taskTemplate);
								}}
							>
								Edit
							</button>
							<button
								class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white"
								type="button"
								onclick={() => {
									openCreateFromTemplate(taskTemplate);
								}}
							>
								Fork
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
								{taskTemplate.desiredRole
									? taskTemplate.desiredRole.name
									: taskTemplate.desiredRoleName}
								<span class="text-slate-500">
									{' '}
									·{' '}
									{taskTemplate.assigneeExecutionSurface
										? taskTemplate.assigneeExecutionSurface.name
										: taskTemplate.assigneeExecutionSurfaceName}
								</span>
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

					{#if taskTemplate.sourceTaskTemplate || taskTemplate.forkReason || taskTemplate.supersededByTaskTemplate}
						<div class="mt-4 grid gap-3 md:grid-cols-3">
							<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
								<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Forked from
								</p>
								<p class="mt-2 text-sm text-white">
									{#if taskTemplate.sourceTaskTemplate}
										<a
											class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
											href={resolve(`/app/task-templates/${taskTemplate.sourceTaskTemplate.id}`)}
										>
											{taskTemplate.sourceTaskTemplate.name}
										</a>
									{:else}
										No source template
									{/if}
								</p>
							</div>
							<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
								<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
									How this differs
								</p>
								<p class="mt-2 text-sm text-slate-300">
									{taskTemplate.forkReason || 'No fork reason recorded.'}
								</p>
							</div>
							<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
								<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Successor template
								</p>
								<p class="mt-2 text-sm text-white">
									{#if taskTemplate.supersededByTaskTemplate}
										<a
											class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
											href={resolve(
												`/app/task-templates/${taskTemplate.supersededByTaskTemplate.id}`
											)}
										>
											{taskTemplate.supersededByTaskTemplate.name}
										</a>
									{:else}
										No successor
									{/if}
								</p>
							</div>
						</div>
					{/if}

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
		<TaskTemplateEditorForm
			mode={editorMode}
			action={editorMode === 'edit' ? '?/updateTaskTemplate' : '?/createTaskTemplate'}
			bind:values={editorValues}
			projects={data.projects}
			goals={data.goals}
			workflows={data.workflows}
			taskTemplates={data.taskTemplates}
			roles={data.roles}
			executionSurfaces={data.executionSurfaces}
			projectSkillSummaries={data.projectSkillSummaries}
			executionRequirementInventory={data.executionRequirementInventory}
			formIdPrefix="task-template-library"
			oncancel={closeEditor}
		/>
	</AppDialog>
</AppPage>
