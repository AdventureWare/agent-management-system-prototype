<script lang="ts">
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import TaskTemplateEditorForm from '$lib/components/task-templates/TaskTemplateEditorForm.svelte';
	import { buildDefaultTaskTemplateEditorValues } from '$lib/task-templates/editor';
	import {
		formatCatalogLifecycleStatusLabel,
		formatPriorityLabel,
		formatTaskApprovalModeLabel,
		formatTaskRiskLevelLabel
	} from '$lib/types/control-plane';
	import { formatAgentSandboxLabel } from '$lib/types/agent-thread';
	import type { PageData } from './$types';

	type TaskTemplateDraftSource = {
		taskTemplateId?: string;
		taskTemplateName?: string;
		taskTemplateSummary?: string;
		projectId?: string;
		goalId?: string;
		workflowId?: string;
		name?: string;
		instructions?: string;
		successCriteria?: string;
		readyCondition?: string;
		expectedOutcome?: string;
		area?: string;
		priority?: string;
		riskLevel?: string;
		approvalMode?: string;
		requiredThreadSandbox?: string | null;
		requiresReview?: boolean;
		desiredRoleId?: string;
		assigneeExecutionSurfaceId?: string;
		lifecycleStatus?: string;
		sourceTaskTemplateId?: string;
		forkReason?: string;
		supersededByTaskTemplateId?: string;
		requiredPromptSkillNames?: string[] | string;
		requiredCapabilityNames?: string[] | string;
		requiredToolNames?: string[] | string;
	};

	type TaskTemplateFormState = {
		ok?: boolean;
		successAction?: string;
		formContext?: 'updateTaskTemplate';
		taskTemplateId?: string;
		values?: TaskTemplateDraftSource;
		message?: string;
	};

	let { data, form }: { data: PageData; form: TaskTemplateFormState | null } = $props();

	function hasDraftValues(value: TaskTemplateFormState | null): value is TaskTemplateFormState & {
		formContext: 'updateTaskTemplate';
		taskTemplateId: string;
		values: TaskTemplateDraftSource;
	} {
		return Boolean(
			value && typeof value === 'object' && 'formContext' in value && 'values' in value
		);
	}

	let taskTemplate = $derived(data.taskTemplate);
	let editPanelOpen = $state(false);
	let compareTaskTemplateId = $state('');
	let editorValues = $state(buildDefaultTaskTemplateEditorValues());
	let updateTaskTemplateSuccess = $derived(
		form?.ok && form?.successAction === 'updateTaskTemplate'
	);
	let migrateTaskTemplateReferencesSuccess = $derived(
		form?.ok && form?.successAction === 'migrateTaskTemplateReferences'
	);
	let routingDefaultsCount = $derived(
		[
			taskTemplate.goalId,
			taskTemplate.workflowId,
			taskTemplate.desiredRoleId,
			taskTemplate.assigneeExecutionSurfaceId
		].filter(Boolean).length
	);
	let contractDefaultsCount = $derived(
		[
			taskTemplate.successCriteria?.trim(),
			taskTemplate.readyCondition?.trim(),
			taskTemplate.expectedOutcome?.trim()
		].filter(Boolean).length
	);
	let requirementDefaultsCount = $derived(
		taskTemplate.requiredPromptSkillNames.length +
			taskTemplate.requiredCapabilityNames.length +
			taskTemplate.requiredToolNames.length
	);
	let createdTaskCount = $derived(taskTemplate.createdTaskCount ?? 0);
	let compareTaskTemplateOptions = $derived(
		data.taskTemplates.filter((entry) => entry.id !== taskTemplate.id)
	);
	let compareTaskTemplate = $derived(
		compareTaskTemplateOptions.find((entry) => entry.id === compareTaskTemplateId) ??
			(taskTemplate.sourceTaskTemplateId
				? (compareTaskTemplateOptions.find(
						(entry) => entry.id === taskTemplate.sourceTaskTemplateId
					) ?? null)
				: null) ??
			(taskTemplate.supersededByTaskTemplateId
				? (compareTaskTemplateOptions.find(
						(entry) => entry.id === taskTemplate.supersededByTaskTemplateId
					) ?? null)
				: null) ??
			compareTaskTemplateOptions[0] ??
			null
	);

	$effect(() => {
		if (updateTaskTemplateSuccess || form?.formContext === 'updateTaskTemplate') {
			editPanelOpen = true;
		}
	});

	$effect(() => {
		if (
			hasDraftValues(form) &&
			form.formContext === 'updateTaskTemplate' &&
			form.taskTemplateId === taskTemplate.id
		) {
			editorValues = buildDefaultTaskTemplateEditorValues(form.values, taskTemplate.projectId);
			return;
		}

		editorValues = buildDefaultTaskTemplateEditorValues(
			{
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
			},
			taskTemplate.projectId
		);
	});

	$effect(() => {
		if (!compareTaskTemplateOptions.some((entry) => entry.id === compareTaskTemplateId)) {
			compareTaskTemplateId =
				taskTemplate.sourceTaskTemplateId ||
				taskTemplate.supersededByTaskTemplateId ||
				compareTaskTemplateOptions[0]?.id ||
				'';
		}
	});

	function formatListField(values?: string[]) {
		return values?.join(', ') ?? '';
	}

	function formatTemplateRoutingSummary(template: typeof taskTemplate) {
		return [
			template.goal?.name ?? 'No goal linked',
			template.workflow?.name ?? 'No workflow',
			template.desiredRole?.name ?? 'No role preference'
		].join(' · ');
	}

	function describeTemplateContrast(
		currentTemplate: typeof taskTemplate,
		otherTemplate: typeof taskTemplate
	) {
		const contrasts: string[] = [];

		if ((currentTemplate.workflow?.id ?? '') !== (otherTemplate.workflow?.id ?? '')) {
			contrasts.push(
				currentTemplate.workflow && !otherTemplate.workflow
					? `${currentTemplate.name} carries a workflow; ${otherTemplate.name} stays single-task.`
					: !currentTemplate.workflow && otherTemplate.workflow
						? `${otherTemplate.name} carries a workflow; ${currentTemplate.name} stays single-task.`
						: 'They route through different workflows.'
			);
		}

		if ((currentTemplate.desiredRole?.id ?? '') !== (otherTemplate.desiredRole?.id ?? '')) {
			contrasts.push(
				`They default to different roles: ${currentTemplate.desiredRole?.name ?? 'none'} vs ${otherTemplate.desiredRole?.name ?? 'none'}.`
			);
		}

		if ((currentTemplate.createdTaskCount ?? 0) !== (otherTemplate.createdTaskCount ?? 0)) {
			contrasts.push(
				currentTemplate.createdTaskCount > otherTemplate.createdTaskCount
					? `${currentTemplate.name} has more recorded downstream use.`
					: `${otherTemplate.name} has more recorded downstream use.`
			);
		}

		return (
			contrasts[0] ??
			'The clearest difference is in the summary, instructions, and reusable defaults.'
		);
	}
</script>

<AppPage width="full">
	<DetailHeader
		backHref="/app/task-templates"
		backLabel="Back to task templates"
		eyebrow="Task template"
		title={taskTemplate.name}
		description={taskTemplate.summary ||
			'Review the reusable task setup here, then edit the defaults when this template needs to change.'}
	>
		{#snippet meta()}
			<div class="flex flex-wrap gap-2">
				<span
					class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-300"
				>
					Project · {taskTemplate.projectName}
				</span>
				{#if (taskTemplate.lifecycleStatus ?? 'active') !== 'active'}
					<span
						class="rounded-full border border-amber-900/60 bg-amber-950/30 px-3 py-1 text-xs text-amber-200"
					>
						{formatCatalogLifecycleStatusLabel(taskTemplate.lifecycleStatus ?? 'active')}
					</span>
				{/if}
				{#if taskTemplate.workflowId}
					<span
						class="rounded-full border border-sky-900/60 bg-sky-950/30 px-3 py-1 text-xs text-sky-200"
					>
						Workflow linked
					</span>
				{/if}
			</div>
		{/snippet}
		{#snippet actions()}
			<AppButton href="/app/task-templates" variant="neutral">Open directory</AppButton>
			<AppButton href={`/app/task-templates?fork=${taskTemplate.id}`} variant="ghost">
				Fork from library
			</AppButton>
			<AppButton type="button" variant="ghost" onclick={() => (editPanelOpen = true)}>
				Edit here
			</AppButton>
		{/snippet}
	</DetailHeader>

	{#if form?.message && !form?.ok}
		<p class="ui-notice border border-rose-900/70 bg-rose-950/40 text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if updateTaskTemplateSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Task template updated.
		</p>
	{/if}

	{#if migrateTaskTemplateReferencesSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			{form?.message || 'Task references migrated.'}
		</p>
	{/if}

	<div class="grid gap-4 md:grid-cols-4">
		<MetricCard
			label="Routing defaults"
			value={routingDefaultsCount}
			detail="Linked goal, workflow, role, and execution-surface defaults saved here."
		/>
		<MetricCard
			label="Contract defaults"
			value={contractDefaultsCount}
			detail="Success, readiness, and outcome guidance already defined."
		/>
		<MetricCard
			label="Execution requirements"
			value={requirementDefaultsCount}
			detail="Prompt skills, capabilities, and tools this template asks for."
		/>
		<MetricCard
			label="Created tasks"
			value={createdTaskCount}
			detail="Tasks currently recorded as having started from this template."
		/>
		<MetricCard
			label="Review mode"
			value={taskTemplate.requiresReview ? 'Review' : 'No review'}
			detail="Whether tasks created from this template should route through review."
		/>
	</div>

	<div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.95fr)]">
		<DetailSection
			title="Template purpose and defaults"
			description="Use this page to understand the default task shape first, then edit only when the reusable setup itself should change."
		>
			<div class="space-y-5">
				{#if taskTemplate.supersededByTaskTemplate && createdTaskCount > 0}
					<div class="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="max-w-2xl">
								<p class="text-sm font-medium text-white">Migrate downstream tasks</p>
								<p class="mt-2 text-sm text-slate-300">
									This superseded template still owns {createdTaskCount} recorded task{createdTaskCount ===
									1
										? ''
										: 's'}. Move that provenance to
									<a
										class="underline decoration-amber-700 underline-offset-4 hover:text-white"
										href={`/app/task-templates/${taskTemplate.supersededByTaskTemplate.id}`}
									>
										{taskTemplate.supersededByTaskTemplate.name}
									</a>
									when the replacement becomes the new source of truth.
								</p>
							</div>

							<form
								method="POST"
								action="?/migrateTaskTemplateReferences"
								data-persist-scope="manual"
							>
								<input type="hidden" name="taskTemplateId" value={taskTemplate.id} />
								<AppButton
									type="submit"
									variant="warning"
									onclick={(event) => {
										if (
											!window.confirm(
												`Move all recorded tasks from "${taskTemplate.name}" to "${taskTemplate.supersededByTaskTemplate?.name}"?`
											)
										) {
											event.preventDefault();
										}
									}}
								>
									Migrate tasks
								</AppButton>
							</form>
						</div>
					</div>
				{/if}

				<div class="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
					<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Default task title
					</p>
					<p class="mt-2 text-sm text-white">{taskTemplate.taskTitle}</p>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
					<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Default instructions
					</p>
					<p class="mt-3 text-sm whitespace-pre-wrap text-slate-300">{taskTemplate.taskSummary}</p>
				</div>

				<div class="grid gap-4 lg:grid-cols-3">
					<div class="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Success criteria
						</p>
						<p class="mt-2 text-sm text-slate-300">
							{taskTemplate.successCriteria || 'No success criteria default saved.'}
						</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Ready condition
						</p>
						<p class="mt-2 text-sm text-slate-300">
							{taskTemplate.readyCondition || 'No readiness gate saved.'}
						</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Expected outcome
						</p>
						<p class="mt-2 text-sm text-slate-300">
							{taskTemplate.expectedOutcome || 'No outcome default saved.'}
						</p>
					</div>
				</div>
			</div>
		</DetailSection>

		<div class="space-y-6">
			<DetailSection
				title="Linked context"
				description="These defaults decide where the template routes and which adjacent objects it points to."
			>
				<div class="space-y-4">
					<div>
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Catalog state
						</p>
						<p class="mt-2 text-sm text-white">
							{formatCatalogLifecycleStatusLabel(taskTemplate.lifecycleStatus ?? 'active')}
						</p>
					</div>

					<div>
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Project
						</p>
						<p class="mt-2 text-sm text-white">
							<a
								class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
								href={`/app/projects/${taskTemplate.projectId}`}
							>
								{taskTemplate.projectName}
							</a>
						</p>
					</div>

					<div>
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">Goal</p>
						<p class="mt-2 text-sm text-white">
							{#if taskTemplate.goal}
								<a
									class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
									href={`/app/goals/${taskTemplate.goal.id}`}
								>
									{taskTemplate.goal.name}
								</a>
							{:else}
								No goal linked
							{/if}
						</p>
					</div>

					<div>
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Workflow
						</p>
						<p class="mt-2 text-sm text-white">
							{#if taskTemplate.workflow}
								<a
									class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
									href={`/app/workflows/${taskTemplate.workflow.id}`}
								>
									{taskTemplate.workflow.name}
								</a>
							{:else}
								No workflow
							{/if}
						</p>
					</div>

					<div>
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Desired role
						</p>
						<p class="mt-2 text-sm text-white">
							{#if taskTemplate.desiredRole}
								<a
									class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
									href={`/app/roles/${taskTemplate.desiredRole.id}`}
								>
									{taskTemplate.desiredRole.name}
								</a>
							{:else}
								No role preference
							{/if}
						</p>
					</div>

					<div>
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Execution surface
						</p>
						<p class="mt-2 text-sm text-white">
							{#if taskTemplate.assigneeExecutionSurface}
								<a
									class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
									href={`/app/execution-surfaces/${taskTemplate.assigneeExecutionSurface.id}`}
								>
									{taskTemplate.assigneeExecutionSurface.name}
								</a>
							{:else}
								Leave unassigned
							{/if}
						</p>
					</div>

					<div>
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Forked from
						</p>
						<p class="mt-2 text-sm text-white">
							{#if taskTemplate.sourceTaskTemplate}
								<a
									class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
									href={`/app/task-templates/${taskTemplate.sourceTaskTemplate.id}`}
								>
									{taskTemplate.sourceTaskTemplate.name}
								</a>
							{:else}
								No source template
							{/if}
						</p>
					</div>

					<div>
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							How this differs
						</p>
						<p class="mt-2 text-sm text-slate-300">
							{taskTemplate.forkReason || 'No fork reason recorded.'}
						</p>
					</div>

					<div>
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Successor template
						</p>
						<p class="mt-2 text-sm text-white">
							{#if taskTemplate.supersededByTaskTemplate}
								<a
									class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
									href={`/app/task-templates/${taskTemplate.supersededByTaskTemplate.id}`}
								>
									{taskTemplate.supersededByTaskTemplate.name}
								</a>
							{:else}
								No successor
							{/if}
						</p>
					</div>
				</div>
			</DetailSection>

			<DetailSection
				title="Execution defaults"
				description="These settings prefill the actor, constraints, and execution requirements when the template is applied."
			>
				<div class="space-y-4">
					<div class="grid gap-4 lg:grid-cols-2">
						<div>
							<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Priority
							</p>
							<p class="mt-2 text-sm text-white">{formatPriorityLabel(taskTemplate.priority)}</p>
						</div>
						<div>
							<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Risk level
							</p>
							<p class="mt-2 text-sm text-white">
								{formatTaskRiskLevelLabel(taskTemplate.riskLevel)}
							</p>
						</div>
						<div>
							<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Approval mode
							</p>
							<p class="mt-2 text-sm text-white">
								{formatTaskApprovalModeLabel(taskTemplate.approvalMode)}
							</p>
						</div>
						<div>
							<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Sandbox
							</p>
							<p class="mt-2 text-sm text-white">
								{taskTemplate.requiredThreadSandbox
									? formatAgentSandboxLabel(taskTemplate.requiredThreadSandbox)
									: 'Inherit defaults'}
							</p>
						</div>
					</div>

					<div>
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Prompt skills
						</p>
						<p class="mt-2 text-sm text-slate-300">
							{formatListField(taskTemplate.requiredPromptSkillNames) || 'None'}
						</p>
					</div>
					<div>
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Capabilities
						</p>
						<p class="mt-2 text-sm text-slate-300">
							{formatListField(taskTemplate.requiredCapabilityNames) || 'None'}
						</p>
					</div>
					<div>
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Tools
						</p>
						<p class="mt-2 text-sm text-slate-300">
							{formatListField(taskTemplate.requiredToolNames) || 'None'}
						</p>
					</div>
				</div>
			</DetailSection>

			<DetailSection
				title="How to use this template"
				description="Task templates should save repeated intake setup. Apply one when the same task shape comes up often, then still adjust the live task if this instance needs exceptions."
				tone="sky"
			>
				<ul class="space-y-2 text-sm text-slate-300">
					<li>Use the library page to compare templates quickly.</li>
					<li>Use this page when you need the full definition and linked context.</li>
					<li>
						Prefer editing the template only when the reusable default should change for future
						tasks.
					</li>
				</ul>
			</DetailSection>

			{#if compareTaskTemplate}
				<DetailSection
					title="Compare templates"
					description="Use this view to decide whether this template should stay distinct from a nearby variant or successor."
				>
					<div class="space-y-4">
						<label class="block max-w-sm">
							<span
								class="mb-2 block text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase"
							>
								Compare against
							</span>
							<select class="select text-white" bind:value={compareTaskTemplateId}>
								{#each compareTaskTemplateOptions as taskTemplateOption (taskTemplateOption.id)}
									<option value={taskTemplateOption.id}>{taskTemplateOption.name}</option>
								{/each}
							</select>
						</label>

						<div class="grid gap-4 xl:grid-cols-2">
							<div class="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
								<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Current template
								</p>
								<h3 class="mt-2 text-lg font-semibold text-white">{taskTemplate.name}</h3>
								<p class="mt-2 text-sm text-slate-300">
									{taskTemplate.summary || 'No summary saved.'}
								</p>
								<div class="mt-4 space-y-2 text-sm text-slate-300">
									<p>
										State · {formatCatalogLifecycleStatusLabel(
											taskTemplate.lifecycleStatus ?? 'active'
										)}
									</p>
									<p>Routing · {formatTemplateRoutingSummary(taskTemplate)}</p>
									<p>Created tasks · {taskTemplate.createdTaskCount ?? 0}</p>
								</div>
							</div>

							<div class="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
								<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Compared template
								</p>
								<h3 class="mt-2 text-lg font-semibold text-white">{compareTaskTemplate.name}</h3>
								<p class="mt-2 text-sm text-slate-300">
									{compareTaskTemplate.summary || 'No summary saved.'}
								</p>
								<div class="mt-4 space-y-2 text-sm text-slate-300">
									<p>
										State · {formatCatalogLifecycleStatusLabel(
											compareTaskTemplate.lifecycleStatus ?? 'active'
										)}
									</p>
									<p>Routing · {formatTemplateRoutingSummary(compareTaskTemplate)}</p>
									<p>Created tasks · {compareTaskTemplate.createdTaskCount ?? 0}</p>
								</div>
							</div>
						</div>

						<div class="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
							<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Key contrast
							</p>
							<p class="mt-2 text-sm text-slate-300">
								{describeTemplateContrast(taskTemplate, compareTaskTemplate)}
							</p>
						</div>
					</div>
				</DetailSection>
			{/if}

			<DetailSection
				title="Downstream usage"
				description="These are the recorded tasks that were started from this template, which helps show whether the template is actually being reused."
			>
				{#if (taskTemplate.createdTasks ?? []).length > 0}
					<ul class="space-y-2">
						{#each taskTemplate.createdTasks ?? [] as task (task.id)}
							<li class="rounded-2xl border border-slate-800 bg-slate-900/45 px-3 py-3">
								<div class="flex items-center justify-between gap-3">
									<a
										class="text-sm font-medium text-white underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
										href={`/app/tasks/${task.id}`}
									>
										{task.title}
									</a>
									<span class="text-xs text-slate-500 uppercase">{task.status}</span>
								</div>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-slate-400">
						No tasks are recorded as having started from this template yet.
					</p>
				{/if}
			</DetailSection>
		</div>
	</div>

	<div class="mt-6">
		<details
			class="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"
			bind:open={editPanelOpen}
		>
			<summary class="cursor-pointer text-sm font-medium text-white">
				Edit template defaults
			</summary>

			<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
				<p class="text-sm font-medium text-white">Change impact</p>
				<p class="mt-2 text-sm text-slate-400">
					Updating this template changes the defaults future task intake will receive when the
					template is applied. Existing tasks are not retroactively changed.
				</p>
			</div>

			<div class="mt-5">
				<TaskTemplateEditorForm
					mode="edit"
					action="?/updateTaskTemplate"
					bind:values={editorValues}
					projects={data.projects}
					goals={data.goals}
					workflows={data.workflows}
					taskTemplates={data.taskTemplates}
					roles={data.roles}
					executionSurfaces={data.executionSurfaces}
					projectSkillSummaries={data.projectSkillSummaries}
					executionRequirementInventory={data.executionRequirementInventory}
					formIdPrefix="task-template-detail"
					oncancel={() => {
						editPanelOpen = false;
					}}
				/>
			</div>
		</details>
	</div>
</AppPage>
