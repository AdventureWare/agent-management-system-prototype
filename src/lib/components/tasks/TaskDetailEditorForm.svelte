<script lang="ts">
	import DetailFactCard from '$lib/components/DetailFactCard.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';
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
		PRIORITY_OPTIONS,
		TASK_APPROVAL_MODE_OPTIONS,
		TASK_RISK_LEVEL_OPTIONS,
		formatPriorityLabel,
		formatTaskApprovalModeLabel,
		formatTaskRiskLevelLabel,
		formatTaskStatusLabel,
		type Priority,
		type TaskApprovalMode,
		type TaskRiskLevel,
		type TaskStatus
	} from '$lib/types/control-plane';
	import {
		buildTaskExecutionContractStatus,
		getTaskLaunchContractBlockerMessage,
		getTaskReviewContractGapMessage
	} from '$lib/task-execution-contract';

	type TaskDelegationPacket = {
		objective?: string | null;
		doneCondition?: string | null;
		inputContext?: string | null;
		expectedDeliverable?: string | null;
		integrationNotes?: string | null;
	};

	type TaskDelegationAcceptance = {
		summary: string;
		acceptedAtLabel: string;
	};

	type TaskEditorView = {
		title: string;
		summary: string;
		successCriteria?: string | null;
		readyCondition?: string | null;
		expectedOutcome?: string | null;
		parentTaskId?: string | null;
		workflowId?: string | null;
		delegationPacket?: TaskDelegationPacket | null;
		delegationAcceptance?: TaskDelegationAcceptance | null;
		projectId: string;
		goalId?: string | null;
		status: TaskStatus;
		targetDate?: string | null;
		assigneeExecutionSurfaceId?: string | null;
		requiredPromptSkillNames?: string[];
		requiredCapabilityNames?: string[];
		requiredToolNames?: string[];
		priority: Priority;
		riskLevel: TaskRiskLevel;
		approvalMode: TaskApprovalMode;
		requiredThreadSandbox?: AgentSandbox | null;
		requiresReview: boolean;
		desiredRoleId?: string | null;
		desiredRoleName?: string | null;
		blockedReason?: string | null;
		createdAt: string;
		artifactPath?: string | null;
	};

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
		goalId?: string | null;
	};

	type ExecutionSurfaceOption = {
		id: string;
		name: string;
	};

	type RoleOption = {
		id: string;
		name: string;
		description: string;
		skillIds?: string[];
		toolIds?: string[];
		mcpIds?: string[];
		systemPrompt?: string;
	};

	type InstalledSkillOption = {
		id: string;
		description: string;
		sourceLabel: string;
	};

	type AssignmentSuggestionView = {
		executionSurfaceId: string;
		executionSurfaceName: string;
		eligible: boolean;
		isCurrentAssignee: boolean;
		roleName: string;
		providerName: string;
		status: string;
		workloadState: 'idle' | 'available' | 'saturated' | 'offline';
		assignmentLimit: number;
		assignedOpenTaskCount: number;
		availableAssignmentCapacity: number;
		withinAssignmentLimit: boolean;
		activeRunCount: number;
		withinConcurrencyLimit: boolean;
		availableRunCapacity: number;
		missingCapabilityNames: string[];
		missingToolNames: string[];
	};

	type AvailableDependencyTaskView = {
		id: string;
		title: string;
		projectName: string;
		status: TaskStatus;
		isSelected: boolean;
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
		task,
		projects,
		goals,
		workflows,
		statusOptions,
		executionSurfaces,
		assignmentSuggestions,
		roles,
		dependencyTasksCount,
		availableDependencyTasks,
		executionRequirementInventory,
		projectInstalledSkills,
		modelOptions,
		actionBasePath = ''
	}: {
		task: TaskEditorView;
		projects: ProjectOption[];
		goals: GoalOption[];
		workflows: WorkflowOption[];
		statusOptions: TaskStatus[];
		executionSurfaces: ExecutionSurfaceOption[];
		assignmentSuggestions: AssignmentSuggestionView[];
		roles: RoleOption[];
		dependencyTasksCount: number;
		availableDependencyTasks: AvailableDependencyTaskView[];
		executionRequirementInventory: ExecutionRequirementInventory;
		projectInstalledSkills: InstalledSkillOption[];
		modelOptions: string[];
		actionBasePath?: string;
	} = $props();

	let desiredRoleIdInput = $state('');
	let visibleAssignmentSuggestions = $derived(assignmentSuggestions.slice(0, 4));
	let eligibleAssignmentSuggestionCount = $derived(
		assignmentSuggestions.filter((suggestion) => suggestion.eligible).length
	);
	let showAllPromptSkillButtons = $state(false);
	let visiblePromptSkillButtons = $derived(
		showAllPromptSkillButtons ? projectInstalledSkills : projectInstalledSkills.slice(0, 8)
	);
	let requiredPromptSkillNamesInput = $state('');
	let requiredCapabilityNamesInput = $state('');
	let requiredToolNamesInput = $state('');
	let successCriteriaInput = $state('');
	let readyConditionInput = $state('');
	let expectedOutcomeInput = $state('');
	let dependencySearchInput = $state('');
	let showAvailableDependencyOptions = $state(false);
	let showAllDependencyOptions = $state(false);
	let initializedRequirementInputTaskKey = $state('');
	let unknownPromptSkillNames = $derived(
		findUnknownExecutionRequirementNames(
			requiredPromptSkillNamesInput,
			projectInstalledSkills.map((skill) => skill.id)
		)
	);
	let unknownCapabilityNames = $derived(
		findUnknownExecutionRequirementNames(
			requiredCapabilityNamesInput,
			executionRequirementInventory.capabilityNames
		)
	);
	let unknownToolNames = $derived(
		findUnknownExecutionRequirementNames(
			requiredToolNamesInput,
			executionRequirementInventory.toolNames
		)
	);
	let taskExecutionContract = $derived(
		buildTaskExecutionContractStatus({
			successCriteria: successCriteriaInput,
			readyCondition: readyConditionInput,
			expectedOutcome: expectedOutcomeInput
		})
	);
	let taskLaunchContractBlocker = $derived(
		getTaskLaunchContractBlockerMessage(taskExecutionContract)
	);
	let taskReviewContractGap = $derived(getTaskReviewContractGapMessage(taskExecutionContract));
	let selectedDependencyTasks = $derived(
		availableDependencyTasks.filter((dependency) => dependency.isSelected)
	);
	let unselectedDependencyTasks = $derived(
		availableDependencyTasks.filter((dependency) => !dependency.isSelected)
	);
	let filteredUnselectedDependencyTasks = $derived.by(() => {
		const query = dependencySearchInput.trim().toLowerCase();

		if (!query) {
			return unselectedDependencyTasks;
		}

		return unselectedDependencyTasks.filter((dependency) =>
			`${dependency.title} ${dependency.projectName} ${formatTaskStatusLabel(dependency.status)}`
				.toLowerCase()
				.includes(query)
		);
	});
	let dependencyPickerIsOpen = $derived(
		showAvailableDependencyOptions || dependencySearchInput.trim().length > 0
	);
	let visibleUnselectedDependencyTasks = $derived(
		showAllDependencyOptions
			? filteredUnselectedDependencyTasks
			: filteredUnselectedDependencyTasks.slice(0, 8)
	);

	function assignmentSuggestionClass(eligible: boolean) {
		return eligible
			? 'border-emerald-900/70 bg-emerald-950/30'
			: 'border-slate-800 bg-slate-950/70';
	}

	function formatInventoryCoverageLabel(entry: {
		executionSurfaceCount: number;
		providerCount: number;
	}) {
		const parts: string[] = [];

		if (entry.executionSurfaceCount > 0) {
			parts.push(
				`${entry.executionSurfaceCount} execution surface${entry.executionSurfaceCount === 1 ? '' : 's'}`
			);
		}

		if (entry.providerCount > 0) {
			parts.push(`${entry.providerCount} provider${entry.providerCount === 1 ? '' : 's'}`);
		}

		return parts.join(' · ') || 'No current coverage';
	}

	function taskAction(actionName: string) {
		return actionBasePath ? `${actionBasePath}?/${actionName}` : `?/${actionName}`;
	}

	$effect(() => {
		const taskKey = `${task.createdAt}:${task.projectId}`;

		if (initializedRequirementInputTaskKey === taskKey) {
			return;
		}

		requiredPromptSkillNamesInput = (task.requiredPromptSkillNames ?? []).join(', ');
		requiredCapabilityNamesInput = (task.requiredCapabilityNames ?? []).join(', ');
		requiredToolNamesInput = (task.requiredToolNames ?? []).join(', ');
		desiredRoleIdInput = task.desiredRoleId ?? '';
		successCriteriaInput = task.successCriteria ?? '';
		readyConditionInput = task.readyCondition ?? '';
		expectedOutcomeInput = task.expectedOutcome ?? '';
		initializedRequirementInputTaskKey = taskKey;
	});
</script>

<form id="task-update-form" method="POST" action={taskAction('updateTask')}>
	<DetailSection
		id="task-configuration"
		eyebrow="Task details"
		title="Edit task brief and execution settings"
		description="Keep the collection page lightweight. Use this page to edit the task itself."
		bodyClass="space-y-6"
	>
		<section class="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5">
			<div class="space-y-2">
				<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">Task brief</p>
				<h3 class="text-lg font-semibold text-white">Core task definition</h3>
				<p class="text-sm text-slate-400">
					Set the title and execution-facing instructions that define the task itself.
				</p>
			</div>

			<div class="mt-5 space-y-4">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
					<input class="input text-white" name="name" required value={task.title} />
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Instructions</span>
					<textarea class="textarea min-h-40 text-white" name="instructions" required
						>{task.summary}</textarea
					>
				</label>

				<div class="grid gap-4 lg:grid-cols-3">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Success criteria</span>
						<textarea
							class="textarea min-h-28 text-white"
							name="successCriteria"
							bind:value={successCriteriaInput}
							placeholder="Describe how a reviewer should judge this task as complete."
						></textarea>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Ready condition</span>
						<textarea
							class="textarea min-h-28 text-white"
							name="readyCondition"
							bind:value={readyConditionInput}
							placeholder="Describe what must already be true before this task should run."
						></textarea>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Expected outcome</span>
						<textarea
							class="textarea min-h-28 text-white"
							name="expectedOutcome"
							bind:value={expectedOutcomeInput}
							placeholder="Describe the desired end state or deliverable."
						></textarea>
					</label>
				</div>

				<div
					class={`rounded-2xl border p-4 ${taskLaunchContractBlocker ? 'border-amber-900/50 bg-amber-950/15' : 'border-emerald-900/40 bg-emerald-950/15'}`}
				>
					<p
						class={`text-xs font-semibold tracking-[0.16em] uppercase ${taskLaunchContractBlocker ? 'text-amber-300' : 'text-emerald-300'}`}
					>
						Execution contract
					</p>
					<p
						class={`mt-2 text-sm ${taskLaunchContractBlocker ? 'text-amber-100' : 'text-emerald-100'}`}
					>
						{taskLaunchContractBlocker ||
							'This task can launch with an explicit ready condition, expected outcome, and acceptance standard.'}
					</p>
					<p class="mt-2 text-sm text-slate-300">
						{taskReviewContractGap ||
							'Reviews can validate this task against the recorded success criteria and expected outcome.'}
					</p>
				</div>

				{#if task.parentTaskId || task.delegationPacket}
					<section class="rounded-2xl border border-sky-900/50 bg-sky-950/15 p-4">
						<div class="space-y-2">
							<p class="text-xs font-semibold tracking-[0.16em] text-sky-300 uppercase">
								Delegation packet
							</p>
							<p class="text-sm text-slate-300">
								Make the child contract explicit so the parent task can integrate the result without
								guessing.
							</p>
						</div>

						<div class="mt-4 grid gap-4 lg:grid-cols-2">
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Delegation objective
								</span>
								<textarea
									class="textarea min-h-28 text-white"
									name="delegationObjective"
									placeholder="Describe the exact slice of work this child task owns."
									>{task.delegationPacket?.objective ?? ''}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Done condition</span>
								<textarea
									class="textarea min-h-28 text-white"
									name="delegationDoneCondition"
									placeholder="Describe what must be true before the parent can accept this handoff."
									>{task.delegationPacket?.doneCondition ?? ''}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Input context</span>
								<textarea
									class="textarea min-h-28 text-white"
									name="delegationInputContext"
									placeholder="Capture upstream constraints, source material, or context the child needs."
									>{task.delegationPacket?.inputContext ?? ''}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Expected deliverable
								</span>
								<textarea
									class="textarea min-h-28 text-white"
									name="delegationExpectedDeliverable"
									placeholder="Name the artifact, format, or concrete output expected from this child."
									>{task.delegationPacket?.expectedDeliverable ?? ''}</textarea
								>
							</label>
						</div>

						<label class="mt-4 block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Integration notes</span>
							<textarea
								class="textarea min-h-24 text-white"
								name="delegationIntegrationNotes"
								placeholder="Describe how the parent task should verify or integrate this child output."
								>{task.delegationPacket?.integrationNotes ?? ''}</textarea
							>
						</label>
					</section>
				{/if}
			</div>
		</section>

		<section class="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5">
			<input type="hidden" name="dependencyTaskSelection" value="true" />

			<div class="space-y-2">
				<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
					Routing and governance
				</p>
				<h3 class="text-lg font-semibold text-white">Queue priority, gates, and blockers</h3>
				<p class="text-sm text-slate-400">
					Use the detail page to manage the full task model without bloating the quick-create flow.
				</p>
			</div>

			<div
				class="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.2fr)]"
			>
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Priority</span>
					<select class="select text-white" name="priority">
						{#each PRIORITY_OPTIONS as priority (priority)}
							<option value={priority} selected={task.priority === priority}>
								{formatPriorityLabel(priority)}
							</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Risk level</span>
					<select class="select text-white" name="riskLevel">
						{#each TASK_RISK_LEVEL_OPTIONS as riskLevel (riskLevel)}
							<option value={riskLevel} selected={task.riskLevel === riskLevel}>
								{formatTaskRiskLevelLabel(riskLevel)}
							</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Approval mode</span>
					<select class="select text-white" name="approvalMode">
						{#each TASK_APPROVAL_MODE_OPTIONS as approvalMode (approvalMode)}
							<option value={approvalMode} selected={task.approvalMode === approvalMode}>
								{formatTaskApprovalModeLabel(approvalMode)}
							</option>
						{/each}
					</select>
				</label>
			</div>

			<div
				class="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_220px]"
			>
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Required sandbox</span>
					<select class="select text-white" name="requiredThreadSandbox">
						<option value="" selected={!task.requiredThreadSandbox}>
							Inherit execution-surface and project defaults
						</option>
						{#each AGENT_SANDBOX_OPTIONS as sandbox (sandbox)}
							<option value={sandbox} selected={task.requiredThreadSandbox === sandbox}>
								{formatAgentSandboxLabel(sandbox)}
							</option>
						{/each}
					</select>
					<p class="mt-2 text-xs text-slate-500">
						New work threads for this task will use this sandbox when set here.
					</p>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Requires review</span>
					<select class="select text-white" name="requiresReview">
						<option value="true" selected={task.requiresReview}>Yes</option>
						<option value="false" selected={!task.requiresReview}>No</option>
					</select>
				</label>
				<RolePicker
					label="Desired role"
					name="desiredRoleId"
					inputId="task-detail-desired-role"
					bind:value={desiredRoleIdInput}
					helperText="Optional. When set, launch uses the role for routing, prompt instructions, and any role-declared skills."
					missingValueLabel={task.desiredRoleName || `${desiredRoleIdInput} (missing role)`}
					{roles}
				/>
			</div>

			<label class="mt-4 block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Blocked reason</span>
				<textarea
					class="textarea min-h-28 text-white"
					name="blockedReason"
					placeholder="Document the blocker, missing approval, or dependency holding this task."
					>{task.blockedReason ?? ''}</textarea
				>
				<p class="mt-2 text-xs text-slate-500">
					Record the current blocker explicitly instead of relying on status alone.
				</p>
			</label>

			<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Dependencies
						</p>
						<p class="mt-2 text-sm text-slate-400">
							Select the tasks that must be unblocked or completed before this one can move.
						</p>
					</div>
					<span
						class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
					>
						{dependencyTasksCount} selected
					</span>
				</div>

				{#if availableDependencyTasks.length === 0}
					<p class="mt-4 text-sm text-slate-500">
						No other tasks are available to use as dependencies yet.
					</p>
				{:else}
					{#if selectedDependencyTasks.length > 0}
						<div class="mt-4">
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Selected dependencies
							</p>
							<div class="mt-3 grid gap-3 xl:grid-cols-2">
								{#each selectedDependencyTasks as dependency (dependency.id)}
									<label class="rounded-2xl border border-sky-800/70 bg-sky-950/20 p-3 transition">
										<div class="flex items-start gap-3">
											<input
												checked={dependency.isSelected}
												class="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
												name="dependencyTaskIds"
												type="checkbox"
												value={dependency.id}
											/>
											<div class="min-w-0">
												<p class="ui-wrap-anywhere text-sm font-medium text-white">
													{dependency.title}
												</p>
												<p class="mt-1 text-xs text-slate-400">
													{dependency.projectName} · {formatTaskStatusLabel(dependency.status)}
												</p>
											</div>
										</div>
									</label>
								{/each}
							</div>
						</div>
					{/if}

					<div class="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4">
						<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
							<label class="block min-w-0 flex-1">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Find available tasks
								</span>
								<input
									bind:value={dependencySearchInput}
									class="input text-white"
									placeholder="Search by task title, project, or status"
									type="search"
								/>
							</label>
							<div class="flex flex-wrap items-center gap-3">
								<p class="text-xs text-slate-500">
									{filteredUnselectedDependencyTasks.length} available match{filteredUnselectedDependencyTasks.length ===
									1
										? ''
										: 'es'}
								</p>
								{#if !dependencyPickerIsOpen && unselectedDependencyTasks.length > 0}
									<button
										type="button"
										class="btn border border-slate-700 bg-slate-950/70 text-sm text-slate-100"
										onclick={() => {
											showAvailableDependencyOptions = true;
										}}
									>
										Browse available tasks
									</button>
								{/if}
							</div>
						</div>

						{#if !dependencyPickerIsOpen}
							<p class="mt-4 text-sm text-slate-500">
								Search or browse to add another dependency without expanding the whole task list.
							</p>
						{:else if filteredUnselectedDependencyTasks.length === 0}
							<p class="mt-4 text-sm text-slate-500">
								No additional tasks match the current filter.
							</p>
						{:else}
							<div class="mt-4 grid gap-3 xl:grid-cols-2">
								{#each visibleUnselectedDependencyTasks as dependency (dependency.id)}
									<label class="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 transition">
										<div class="flex items-start gap-3">
											<input
												checked={dependency.isSelected}
												class="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
												name="dependencyTaskIds"
												type="checkbox"
												value={dependency.id}
											/>
											<div class="min-w-0">
												<p class="ui-wrap-anywhere text-sm font-medium text-white">
													{dependency.title}
												</p>
												<p class="mt-1 text-xs text-slate-400">
													{dependency.projectName} · {formatTaskStatusLabel(dependency.status)}
												</p>
											</div>
										</div>
									</label>
								{/each}
							</div>
							{#if filteredUnselectedDependencyTasks.length > visibleUnselectedDependencyTasks.length}
								<div class="mt-4">
									<button
										type="button"
										class="btn border border-slate-700 bg-slate-950/70 text-sm text-slate-100"
										onclick={() => {
											showAllDependencyOptions = true;
										}}
									>
										Show {filteredUnselectedDependencyTasks.length -
											visibleUnselectedDependencyTasks.length}
										more available tasks
									</button>
								</div>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
		</section>

		<section class="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5">
			<div class="space-y-2">
				<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
					Execution settings
				</p>
				<h3 class="text-lg font-semibold text-white">Project, assignment, and launch inputs</h3>
				<p class="text-sm text-slate-400">
					Choose where the task belongs, who should own it, and what launch metadata should travel
					with the prompt.
				</p>
			</div>

			<div class="mt-5 grid gap-4 xl:grid-cols-3">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Project</span>
					<select class="select text-white" name="projectId" required>
						{#each projects as project (project.id)}
							<option value={project.id} selected={task.projectId === project.id}>
								{project.name}
							</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Goal</span>
					<select class="select text-white" name="goalId">
						<option value="" selected={!task.goalId}>No goal linked</option>
						{#each goals as goal (goal.id)}
							<option value={goal.id} selected={task.goalId === goal.id}>
								{goal.label}
							</option>
						{/each}
					</select>
					<p class="mt-2 text-xs text-slate-500">
						{#if goals.length === 0}
							Create a goal first if this task should roll up to a broader outcome.
						{:else}
							This is the canonical task-to-goal link used by goal detail and hierarchy views.
						{/if}
					</p>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Workflow</span>
					<select class="select text-white" name="workflowId">
						<option value="" selected={!task.workflowId}>No workflow linked</option>
						{#each workflows as workflow (workflow.id)}
							<option value={workflow.id} selected={task.workflowId === workflow.id}>
								{workflow.name}
							</option>
						{/each}
					</select>
					<p class="mt-2 text-xs text-slate-500">
						Group this task into a reusable or ad hoc process without changing its task-level role
						and assignment.
					</p>
				</label>
			</div>

			<div
				class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.2fr)]"
			>
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
					<select class="select text-white" name="status">
						{#each statusOptions as status (status)}
							<option value={status} selected={task.status === status}>
								{formatTaskStatusLabel(status)}
							</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Target date</span>
					<input
						class="input text-white"
						name="targetDate"
						type="date"
						value={task.targetDate ?? ''}
					/>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Launch model</span>
					<select class="select text-white" name="launchModel">
						<option value="">Resolved default</option>
						{#each modelOptions as model (model)}
							<option value={model}>{model}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200"
						>Assigned execution surface</span
					>
					<select class="select text-white" name="assigneeExecutionSurfaceId">
						<option value="" selected={!task.assigneeExecutionSurfaceId}>Unassigned</option>
						{#each executionSurfaces as executionSurface (executionSurface.id)}
							<option
								value={executionSurface.id}
								selected={task.assigneeExecutionSurfaceId === executionSurface.id}
							>
								{executionSurface.name}
							</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Assignment suggestions
						</p>
						<p class="mt-2 text-sm text-slate-400">
							Execution surfaces are ranked by requirement fit, role match, current status, and open
							assigned load.
						</p>
					</div>
					<p class="text-xs text-slate-500">
						{eligibleAssignmentSuggestionCount} fit current requirements
					</p>
				</div>

				<div class="mt-4 space-y-3">
					{#each visibleAssignmentSuggestions as suggestion (suggestion.executionSurfaceId)}
						<div class={`rounded-2xl border p-3 ${assignmentSuggestionClass(suggestion.eligible)}`}>
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<p class="font-medium text-white">{suggestion.executionSurfaceName}</p>
										{#if suggestion.eligible}
											<span
												class="rounded-full border border-emerald-900/70 bg-emerald-950/40 px-2 py-1 text-[0.7rem] text-emerald-200"
											>
												Matches requirements
											</span>
										{:else}
											<span
												class="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[0.7rem] text-slate-300"
											>
												Needs adjustment
											</span>
										{/if}
										{#if suggestion.isCurrentAssignee}
											<span
												class="rounded-full border border-sky-900/70 bg-sky-950/40 px-2 py-1 text-[0.7rem] text-sky-200"
											>
												Current assignee
											</span>
										{/if}
									</div>
									<p class="mt-1 text-xs text-slate-400">
										{suggestion.roleName} · {suggestion.providerName} · {suggestion.status}
									</p>
								</div>
								<p class="text-xs text-slate-500">
									{suggestion.assignedOpenTaskCount}/{suggestion.assignmentLimit} task slot(s) ·
									{suggestion.activeRunCount} active run(s) · {suggestion.workloadState}
								</p>
							</div>

							{#if !suggestion.withinAssignmentLimit || !suggestion.withinConcurrencyLimit || suggestion.missingCapabilityNames.length > 0 || suggestion.missingToolNames.length > 0}
								<div class="mt-3 space-y-2 text-xs text-slate-300">
									{#if !suggestion.withinAssignmentLimit}
										<p>
											At task capacity: {suggestion.assignedOpenTaskCount} open task(s),
											{suggestion.availableAssignmentCapacity} slot(s) open.
										</p>
									{/if}
									{#if !suggestion.withinConcurrencyLimit}
										<p>
											At concurrency limit: {suggestion.activeRunCount} active run(s),
											{suggestion.availableRunCapacity} slot(s) open.
										</p>
									{/if}
									{#if suggestion.missingCapabilityNames.length > 0}
										<p>Missing capabilities: {suggestion.missingCapabilityNames.join(', ')}</p>
									{/if}
									{#if suggestion.missingToolNames.length > 0}
										<p>Missing tools: {suggestion.missingToolNames.join(', ')}</p>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Requested prompt skills</span>
					<input
						bind:value={requiredPromptSkillNamesInput}
						class="input text-white"
						list="task-detail-prompt-skill-inventory"
						name="requiredPromptSkillNames"
						placeholder="frontend-sveltekit, docs-writer"
					/>
					<p class="mt-2 text-xs text-slate-500">
						Use a comma-separated list for installed Codex skills this task should prefer in its
						thread prompt.
					</p>
					{#if projectInstalledSkills.length === 0}
						<p class="mt-2 text-xs text-slate-500">
							No installed project skills are registered for this workspace yet. These labels stay
							advisory for now.
						</p>
					{:else}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each visiblePromptSkillButtons as skill (skill.id)}
								<button
									type="button"
									class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-700 hover:text-white"
									title={skill.description || skill.sourceLabel}
									onclick={() => {
										requiredPromptSkillNamesInput = appendExecutionRequirementName(
											requiredPromptSkillNamesInput,
											skill.id
										);
									}}
								>
									{skill.id}
								</button>
							{/each}
						</div>
						<div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
							<p>Select a known installed skill to append it from the current project workspace.</p>
							{#if projectInstalledSkills.length > visiblePromptSkillButtons.length}
								<button
									type="button"
									class="font-medium text-sky-300 transition hover:text-sky-200"
									onclick={() => {
										showAllPromptSkillButtons = true;
									}}
								>
									Show {projectInstalledSkills.length - visiblePromptSkillButtons.length} more skills
								</button>
							{/if}
						</div>
					{/if}
					{#if projectInstalledSkills.length > 0 && unknownPromptSkillNames.length > 0}
						<p class="mt-2 text-xs text-amber-300">
							Not installed in this project workspace: {unknownPromptSkillNames.join(', ')}
						</p>
					{/if}
				</label>
			</div>

			<div class="mt-4 grid gap-4 xl:grid-cols-2">
				<label class="block rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<span class="mb-2 block text-sm font-medium text-slate-200">Required capabilities</span>
					<input
						bind:value={requiredCapabilityNamesInput}
						class="input text-white"
						list="task-detail-capability-inventory"
						name="requiredCapabilityNames"
						placeholder="research, svelte, ios"
					/>
					<p class="mt-2 text-xs text-slate-500">
						Use a comma-separated list for capabilities or skills the task needs.
					</p>
					{#if executionRequirementInventory.capabilities.length === 0}
						<p class="mt-2 text-xs text-slate-500">
							No execution-surface or provider capability inventory is registered yet. These labels
							stay free-form for now.
						</p>
					{:else}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each executionRequirementInventory.capabilities as capability (capability.name)}
								<button
									type="button"
									class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-700 hover:text-white"
									title={formatInventoryCoverageLabel(capability)}
									onclick={() => {
										requiredCapabilityNamesInput = appendExecutionRequirementName(
											requiredCapabilityNamesInput,
											capability.name
										);
									}}
								>
									{capability.name}
								</button>
							{/each}
						</div>
						<p class="mt-2 text-xs text-slate-500">
							Select a known label to append it from the current execution-surface and provider
							inventory.
						</p>
					{/if}
					{#if executionRequirementInventory.capabilities.length > 0 && unknownCapabilityNames.length > 0}
						<p class="mt-2 text-xs text-amber-300">
							Not in the current inventory: {unknownCapabilityNames.join(', ')}
						</p>
					{/if}
				</label>

				<label class="block rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<span class="mb-2 block text-sm font-medium text-slate-200">Required tools</span>
					<input
						bind:value={requiredToolNamesInput}
						class="input text-white"
						list="task-detail-tool-inventory"
						name="requiredToolNames"
						placeholder="codex, xcodebuild"
					/>
					<p class="mt-2 text-xs text-slate-500">
						Use a comma-separated list for tools or runtimes the task must use.
					</p>
					{#if executionRequirementInventory.tools.length === 0}
						<p class="mt-2 text-xs text-slate-500">
							No provider launcher inventory is registered yet. These labels stay free-form for now.
						</p>
					{:else}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each executionRequirementInventory.tools as tool (tool.name)}
								<button
									type="button"
									class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-700 hover:text-white"
									title={formatInventoryCoverageLabel(tool)}
									onclick={() => {
										requiredToolNamesInput = appendExecutionRequirementName(
											requiredToolNamesInput,
											tool.name
										);
									}}
								>
									{tool.name}
								</button>
							{/each}
						</div>
						<p class="mt-2 text-xs text-slate-500">
							Select a known launcher label to append it from the current provider inventory.
						</p>
					{/if}
					{#if executionRequirementInventory.tools.length > 0 && unknownToolNames.length > 0}
						<p class="mt-2 text-xs text-amber-300">
							Not in the current inventory: {unknownToolNames.join(', ')}
						</p>
					{/if}
				</label>
			</div>

			<datalist id="task-detail-prompt-skill-inventory">
				{#each projectInstalledSkills as skill (skill.id)}
					<option value={skill.id}></option>
				{/each}
			</datalist>

			<datalist id="task-detail-capability-inventory">
				{#each executionRequirementInventory.capabilityNames as capabilityName (capabilityName)}
					<option value={capabilityName}></option>
				{/each}
			</datalist>

			<datalist id="task-detail-tool-inventory">
				{#each executionRequirementInventory.toolNames as toolName (toolName)}
					<option value={toolName}></option>
				{/each}
			</datalist>
		</section>

		<section class="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5">
			<div class="space-y-2">
				<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">Task metadata</p>
				<h3 class="text-lg font-semibold text-white">Reference information</h3>
				<p class="text-sm text-slate-400">
					Keep this context visible while editing without mixing it into the main form fields.
				</p>
			</div>

			<div class="mt-5 grid gap-4 sm:grid-cols-2">
				<DetailFactCard
					label="Created"
					value={new Date(task.createdAt).toLocaleString()}
					class="rounded-2xl p-4 text-sm text-slate-300"
					valueClass="mt-2 text-sm text-slate-300"
				/>
				<DetailFactCard
					label="Artifact path"
					value={task.artifactPath || 'Not set'}
					class="rounded-2xl p-4 text-sm text-slate-300"
					valueClass="ui-wrap-anywhere mt-2 text-sm text-slate-300"
				/>
			</div>

			<div class="mt-4 grid gap-4 sm:grid-cols-2">
				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Routing summary
					</p>
					<div class="mt-3 space-y-2 text-sm text-slate-300">
						<p>Priority: {formatPriorityLabel(task.priority)}</p>
						<p>Risk level: {formatTaskRiskLevelLabel(task.riskLevel)}</p>
						<p>Approval mode: {formatTaskApprovalModeLabel(task.approvalMode)}</p>
						<p>
							Required sandbox:
							{task.requiredThreadSandbox
								? formatAgentSandboxLabel(task.requiredThreadSandbox)
								: 'Inherit defaults'}
						</p>
						<p>Requires review: {task.requiresReview ? 'Yes' : 'No'}</p>
					</div>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Desired role
					</p>
					<p class="mt-2 text-sm text-slate-300">
						{task.desiredRoleName || task.desiredRoleId || 'No role preference'}
					</p>
				</div>
			</div>

			<div class="mt-4 grid gap-4 lg:grid-cols-3">
				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Success criteria
					</p>
					<p class="mt-2 text-sm text-slate-300">
						{task.successCriteria || 'No success criteria recorded.'}
					</p>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Ready condition
					</p>
					<p class="mt-2 text-sm text-slate-300">
						{task.readyCondition || 'No ready condition recorded.'}
					</p>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Expected outcome
					</p>
					<p class="mt-2 text-sm text-slate-300">
						{task.expectedOutcome || 'No expected outcome recorded.'}
					</p>
				</div>
			</div>

			{#if task.parentTaskId || task.delegationPacket}
				<div class="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
					<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Delegation objective
						</p>
						<p class="mt-2 text-sm text-slate-300">
							{task.delegationPacket?.objective || 'No delegation objective recorded.'}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Done condition
						</p>
						<p class="mt-2 text-sm text-slate-300">
							{task.delegationPacket?.doneCondition || 'No done condition recorded.'}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Expected deliverable
						</p>
						<p class="mt-2 text-sm text-slate-300">
							{task.delegationPacket?.expectedDeliverable || 'No expected deliverable recorded.'}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Input context
						</p>
						<p class="mt-2 text-sm text-slate-300">
							{task.delegationPacket?.inputContext || 'No input context recorded.'}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 xl:col-span-2">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Integration notes
						</p>
						<p class="mt-2 text-sm text-slate-300">
							{task.delegationPacket?.integrationNotes || 'No integration notes recorded.'}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 xl:col-span-3">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Parent acceptance
						</p>
						<p class="mt-2 text-sm text-slate-300">
							{task.delegationAcceptance
								? `${task.delegationAcceptance.summary} · ${task.delegationAcceptance.acceptedAtLabel}`
								: 'This child handoff has not been accepted by the parent task yet.'}
						</p>
					</div>
				</div>
			{/if}

			<div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Requested prompt skills
					</p>
					{#if (task.requiredPromptSkillNames ?? []).length === 0}
						<p class="mt-2 text-sm text-slate-400">No prompt skills requested.</p>
					{:else}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each task.requiredPromptSkillNames ?? [] as skillName (skillName)}
								<span
									class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
								>
									{skillName}
								</span>
							{/each}
						</div>
					{/if}
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Required capabilities
					</p>
					{#if (task.requiredCapabilityNames ?? []).length === 0}
						<p class="mt-2 text-sm text-slate-400">No capability requirements recorded.</p>
					{:else}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each task.requiredCapabilityNames ?? [] as capability (capability)}
								<span
									class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
								>
									{capability}
								</span>
							{/each}
						</div>
					{/if}
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Required tools
					</p>
					{#if (task.requiredToolNames ?? []).length === 0}
						<p class="mt-2 text-sm text-slate-400">No tool requirements recorded.</p>
					{:else}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each task.requiredToolNames ?? [] as tool (tool)}
								<span
									class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
								>
									{tool}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</section>

		<div class="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5">
			<div class="space-y-2">
				<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">Save behavior</p>
				<h3 class="text-lg font-semibold text-white">Actions stay in the page header</h3>
				<p class="text-sm text-slate-400">
					Save changes or run the task from the top of the page so you do not need to scroll back to
					find the primary controls after editing.
				</p>
			</div>
		</div>
	</DetailSection>
</form>
