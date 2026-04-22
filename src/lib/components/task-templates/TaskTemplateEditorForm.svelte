<script lang="ts">
	import AppButton from '$lib/components/AppButton.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';
	import {
		appendExecutionRequirementName,
		findUnknownExecutionRequirementNames
	} from '$lib/execution-requirements';
	import type { TaskTemplateEditorValues } from '$lib/task-templates/editor';
	import {
		AGENT_SANDBOX_OPTIONS,
		formatAgentSandboxLabel,
		type AgentSandbox
	} from '$lib/types/agent-thread';
	import {
		TASK_APPROVAL_MODE_OPTIONS,
		TASK_RISK_LEVEL_OPTIONS,
		CATALOG_LIFECYCLE_STATUS_OPTIONS,
		formatCatalogLifecycleStatusLabel,
		formatTaskApprovalModeLabel,
		formatTaskRiskLevelLabel
	} from '$lib/types/control-plane';

	type ProjectOption = {
		id: string;
		name: string;
	};

	type GoalOption = {
		id: string;
		label: string;
	};

	type WorkflowOption = {
		id: string;
		name: string;
		projectId: string;
		projectName?: string;
	};

	type RoleOption = {
		id: string;
		name: string;
		description: string;
		skillIds?: string[];
		toolIds?: string[];
		mcpIds?: string[];
		systemPrompt?: string;
		family?: string;
	};

	type ExecutionSurfaceOption = {
		id: string;
		name: string;
	};

	type TaskTemplateOption = {
		id: string;
		name: string;
		lifecycleStatus?: string;
	};

	type InstalledSkillOption = {
		id: string;
		description?: string;
		global: boolean;
		project: boolean;
		sourceLabel: string;
	};

	type ProjectSkillSummary = {
		projectId: string;
		totalCount: number;
		globalCount: number;
		projectCount: number;
		installedSkills: InstalledSkillOption[];
		previewSkills: InstalledSkillOption[];
	};

	type ExecutionRequirementInventoryEntry = {
		name: string;
		executionSurfaceCount: number;
		providerCount: number;
	};

	type ExecutionRequirementInventory = {
		capabilities: ExecutionRequirementInventoryEntry[];
		tools: ExecutionRequirementInventoryEntry[];
		capabilityNames: string[];
		toolNames: string[];
	};

	let {
		mode,
		action,
		values = $bindable<TaskTemplateEditorValues>(),
		projects,
		goals,
		workflows,
		taskTemplates,
		roles,
		executionSurfaces,
		projectSkillSummaries,
		executionRequirementInventory,
		formIdPrefix,
		projectLocked = false,
		oncancel
	}: {
		mode: 'create' | 'edit';
		action: string;
		values: TaskTemplateEditorValues;
		projects: ProjectOption[];
		goals: GoalOption[];
		workflows: WorkflowOption[];
		taskTemplates: TaskTemplateOption[];
		roles: RoleOption[];
		executionSurfaces: ExecutionSurfaceOption[];
		projectSkillSummaries: ProjectSkillSummary[];
		executionRequirementInventory: ExecutionRequirementInventory;
		formIdPrefix: string;
		projectLocked?: boolean;
		oncancel?: (() => void) | null;
	} = $props();

	let selectedProjectSkillSummary = $derived(
		projectSkillSummaries.find((summary) => summary.projectId === values.projectId) ?? null
	);
	let selectedProjectInstalledSkillNames = $derived(
		selectedProjectSkillSummary?.installedSkills.map((skill) => skill.id) ?? []
	);
	let availableWorkflows = $derived(workflows);
	let unknownPromptSkillNames = $derived(
		findUnknownExecutionRequirementNames(
			values.requiredPromptSkillNames,
			selectedProjectInstalledSkillNames
		)
	);
	let unknownCapabilityNames = $derived(
		findUnknownExecutionRequirementNames(
			values.requiredCapabilityNames,
			executionRequirementInventory.capabilityNames
		)
	);
	let unknownToolNames = $derived(
		findUnknownExecutionRequirementNames(
			values.requiredToolNames,
			executionRequirementInventory.toolNames
		)
	);
	let promptSkillInventoryId = $derived(`${formIdPrefix}-prompt-skill-inventory`);
	let capabilityInventoryId = $derived(`${formIdPrefix}-capability-inventory`);
	let toolInventoryId = $derived(`${formIdPrefix}-tool-inventory`);
</script>

<form class="space-y-5" method="POST" {action} data-persist-scope="manual">
	{#if mode === 'edit'}
		<input type="hidden" name="taskTemplateId" value={values.taskTemplateId} />
	{/if}
	<input type="hidden" name="area" value={values.area} />

	<div class="grid gap-4 md:grid-cols-2">
		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Template name</span>
			<input
				bind:value={values.taskTemplateName}
				class="input text-white placeholder:text-slate-500"
				name="taskTemplateName"
				placeholder="Research Brief"
				required
			/>
		</label>

		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Project</span>
			{#if projectLocked}
				<input
					class="input cursor-not-allowed text-slate-400"
					disabled
					value={projects.find((project) => project.id === values.projectId)?.name ??
						'Unknown project'}
				/>
				<input type="hidden" name="projectId" value={values.projectId} />
				<span class="mt-2 block text-xs text-slate-500">
					Project assignment is locked in this editing flow.
				</span>
			{:else}
				<select bind:value={values.projectId} class="select text-white" name="projectId" required>
					<option value="" disabled>Select a project</option>
					{#each projects as project (project.id)}
						<option value={project.id}>{project.name}</option>
					{/each}
				</select>
			{/if}
		</label>
	</div>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Catalog state</span>
			<select bind:value={values.lifecycleStatus} class="select text-white" name="lifecycleStatus">
				{#each CATALOG_LIFECYCLE_STATUS_OPTIONS as lifecycleStatus (lifecycleStatus)}
					<option value={lifecycleStatus}>
						{formatCatalogLifecycleStatusLabel(lifecycleStatus)}
					</option>
				{/each}
			</select>
		</label>

		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Forked from</span>
			<select
				bind:value={values.sourceTaskTemplateId}
				class="select text-white"
				name="sourceTaskTemplateId"
			>
				<option value="">No source template</option>
				{#each taskTemplates.filter((taskTemplate) => taskTemplate.id !== values.taskTemplateId) as taskTemplate (taskTemplate.id)}
					<option value={taskTemplate.id}>{taskTemplate.name}</option>
				{/each}
			</select>
		</label>

		<label class="block xl:col-span-2">
			<span class="mb-2 block text-sm font-medium text-slate-200">How this differs</span>
			<textarea
				bind:value={values.forkReason}
				class="textarea min-h-24 text-white placeholder:text-slate-500"
				name="forkReason"
				placeholder="Explain why this template should exist separately from its source."
			></textarea>
		</label>
	</div>

	<label class="block">
		<span class="mb-2 block text-sm font-medium text-slate-200">Successor template</span>
		<select
			bind:value={values.supersededByTaskTemplateId}
			class="select text-white"
			name="supersededByTaskTemplateId"
		>
			<option value="">No successor</option>
			{#each taskTemplates.filter((taskTemplate) => taskTemplate.id !== values.taskTemplateId) as taskTemplate (taskTemplate.id)}
				<option value={taskTemplate.id}>{taskTemplate.name}</option>
			{/each}
		</select>
	</label>

	<label class="block">
		<span class="mb-2 block text-sm font-medium text-slate-200">Template summary</span>
		<textarea
			bind:value={values.taskTemplateSummary}
			class="textarea min-h-24 text-white placeholder:text-slate-500"
			name="taskTemplateSummary"
			placeholder="Use this when repeated marketplace research requests need the same defaults."
		></textarea>
	</label>

	<div class="grid gap-4 md:grid-cols-2">
		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Goal</span>
			<select bind:value={values.goalId} class="select text-white" name="goalId">
				<option value="">No goal linked</option>
				{#each goals as goal (goal.id)}
					<option value={goal.id}>{goal.label}</option>
				{/each}
			</select>
		</label>

		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Apply workflow</span>
			<select bind:value={values.workflowId} class="select text-white" name="workflowId">
				<option value="">No workflow</option>
				{#each availableWorkflows as workflow (workflow.id)}
					<option value={workflow.id}>
						{workflow.name}{workflow.projectName ? ` · ${workflow.projectName}` : ''}
					</option>
				{/each}
			</select>
			{#if availableWorkflows.length === 0}
				<span class="mt-2 block text-xs text-slate-500">No workflows are available yet.</span>
			{/if}
		</label>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Default task title</span>
			<input
				bind:value={values.name}
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
				bind:value={values.assigneeExecutionSurfaceId}
				class="select text-white"
				name="assigneeExecutionSurfaceId"
			>
				<option value="">Leave unassigned</option>
				{#each executionSurfaces as executionSurface (executionSurface.id)}
					<option value={executionSurface.id}>{executionSurface.name}</option>
				{/each}
			</select>
		</label>
	</div>

	<label class="block">
		<span class="mb-2 block text-sm font-medium text-slate-200">Default instructions</span>
		<textarea
			bind:value={values.instructions}
			class="textarea min-h-36 text-white placeholder:text-slate-500"
			name="instructions"
			placeholder="Describe the repeated task setup, expected output, and constraints."
			required
		></textarea>
	</label>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
		<RolePicker
			label="Desired role"
			name="desiredRoleId"
			inputId={`${formIdPrefix}-desired-role`}
			bind:value={values.desiredRoleId}
			helperText="Optional. Sets the default specialization bundle this template should ask for."
			{roles}
		/>

		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Priority</span>
			<select bind:value={values.priority} class="select text-white" name="priority">
				<option value="low">Low</option>
				<option value="medium">Medium</option>
				<option value="high">High</option>
			</select>
		</label>

		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Risk level</span>
			<select bind:value={values.riskLevel} class="select text-white" name="riskLevel">
				{#each TASK_RISK_LEVEL_OPTIONS as riskLevel (riskLevel)}
					<option value={riskLevel}>{formatTaskRiskLevelLabel(riskLevel)}</option>
				{/each}
			</select>
		</label>

		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Approval mode</span>
			<select bind:value={values.approvalMode} class="select text-white" name="approvalMode">
				{#each TASK_APPROVAL_MODE_OPTIONS as approvalMode (approvalMode)}
					<option value={approvalMode}>{formatTaskApprovalModeLabel(approvalMode)}</option>
				{/each}
			</select>
		</label>

		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Requires review</span>
			<select bind:value={values.requiresReview} class="select text-white" name="requiresReview">
				<option value={true}>Yes</option>
				<option value={false}>No</option>
			</select>
		</label>
	</div>

	<label class="block">
		<span class="mb-2 block text-sm font-medium text-slate-200">Required sandbox</span>
		<select
			bind:value={values.requiredThreadSandbox}
			class="select text-white"
			name="requiredThreadSandbox"
		>
			<option value="">Inherit defaults</option>
			{#each AGENT_SANDBOX_OPTIONS as sandbox (sandbox)}
				<option value={sandbox}>{formatAgentSandboxLabel(sandbox as AgentSandbox)}</option>
			{/each}
		</select>
	</label>

	<div class="grid gap-4 lg:grid-cols-3">
		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Success criteria</span>
			<textarea
				bind:value={values.successCriteria}
				class="textarea min-h-28 text-white placeholder:text-slate-500"
				name="successCriteria"
				placeholder="Describe how a reviewer should judge this task as complete."
			></textarea>
		</label>

		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Ready condition</span>
			<textarea
				bind:value={values.readyCondition}
				class="textarea min-h-28 text-white placeholder:text-slate-500"
				name="readyCondition"
				placeholder="Describe what must already be true before this task should run."
			></textarea>
		</label>

		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Expected outcome</span>
			<textarea
				bind:value={values.expectedOutcome}
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
				bind:value={values.requiredPromptSkillNames}
				class="input text-white placeholder:text-slate-500"
				name="requiredPromptSkillNames"
				placeholder="frontend-sveltekit, docs-writer"
				list={promptSkillInventoryId}
			/>
			{#if selectedProjectInstalledSkillNames.length > 0}
				<div class="mt-3 flex flex-wrap gap-2">
					{#each selectedProjectSkillSummary?.installedSkills ?? [] as skill (skill.id)}
						<button
							type="button"
							class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-700 hover:text-white"
							title={skill.description || skill.sourceLabel}
							onclick={() => {
								values.requiredPromptSkillNames = appendExecutionRequirementName(
									values.requiredPromptSkillNames,
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
				bind:value={values.requiredCapabilityNames}
				class="input text-white placeholder:text-slate-500"
				name="requiredCapabilityNames"
				placeholder="planning, citations"
				list={capabilityInventoryId}
			/>
			<div class="mt-3 flex flex-wrap gap-2">
				{#each executionRequirementInventory.capabilities as capability (capability.name)}
					<button
						type="button"
						class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-700 hover:text-white"
						onclick={() => {
							values.requiredCapabilityNames = appendExecutionRequirementName(
								values.requiredCapabilityNames,
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
				bind:value={values.requiredToolNames}
				class="input text-white placeholder:text-slate-500"
				name="requiredToolNames"
				placeholder="codex, playwright"
				list={toolInventoryId}
			/>
			<div class="mt-3 flex flex-wrap gap-2">
				{#each executionRequirementInventory.tools as tool (tool.name)}
					<button
						type="button"
						class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-700 hover:text-white"
						onclick={() => {
							values.requiredToolNames = appendExecutionRequirementName(
								values.requiredToolNames,
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

	<datalist id={promptSkillInventoryId}>
		{#each selectedProjectSkillSummary?.installedSkills ?? [] as skill (skill.id)}
			<option value={skill.id}></option>
		{/each}
	</datalist>

	<datalist id={capabilityInventoryId}>
		{#each executionRequirementInventory.capabilityNames as capabilityName (capabilityName)}
			<option value={capabilityName}></option>
		{/each}
	</datalist>

	<datalist id={toolInventoryId}>
		{#each executionRequirementInventory.toolNames as toolName (toolName)}
			<option value={toolName}></option>
		{/each}
	</datalist>

	<div class="flex flex-wrap items-center gap-3">
		<AppButton type="submit" variant="primary">
			{mode === 'edit' ? 'Update template' : 'Create template'}
		</AppButton>
		{#if oncancel}
			<AppButton type="button" variant="ghost" onclick={oncancel}>Cancel</AppButton>
		{/if}
	</div>
</form>
