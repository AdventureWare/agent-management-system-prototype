import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { TASK_STATUS_OPTIONS } from '$lib/types/control-plane';
import {
	createRun,
	createTask,
	deleteTask as removeTaskFromControlPlane,
	getPendingApprovalForTask,
	loadControlPlane,
	parseTaskStatus,
	resolveThreadSandbox,
	selectExecutionProvider,
	updateControlPlane
} from '$lib/server/control-plane';
import {
	cancelAgentThread,
	getAgentThread,
	listAgentThreads,
	sendAgentThreadMessage,
	startAgentThread
} from '$lib/server/agent-threads';
import {
	buildPromptDigest,
	buildTaskThreadName,
	buildTaskThreadPrompt
} from '$lib/server/task-threads';
import { canonicalizeExecutionRequirementNames } from '$lib/execution-requirements';
import {
	buildTaskExecutionContractStatus,
	getTaskLaunchContractBlockerMessage
} from '$lib/task-execution-contract';
import { isValidTaskDate, readCreateTaskForm, readCreateTaskPrefill } from '$lib/server/task-form';
import { selectProjectTaskThreadContext } from '$lib/server/task-thread-compatibility';
import { buildTaskWorkItems } from '$lib/server/task-work-items';
import { getTaskAttachmentRoot, persistTaskAttachments } from '$lib/server/task-attachments';
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import { getWorkspaceExecutionIssue } from '$lib/server/task-execution-workspace';
import { buildTaskGoalOptions } from '$lib/server/task-goal-options';
import { resolveTaskRolePromptContext } from '$lib/server/task-role-context';
import { assistTaskWriting } from '$lib/server/task-writing-assist';
import { buildExecutionRequirementInventory } from '$lib/server/execution-requirement-inventory';
import {
	applyGoalRelationships,
	getGoalLinkedProjectIds,
	getGoalLinkedTaskIds
} from '$lib/server/goal-relationships';
import {
	approveTaskApproval,
	approveTaskReview,
	rejectTaskApproval,
	requestTaskReviewChanges,
	TaskGovernanceActionError
} from '$lib/server/task-governance';
import type { ControlPlaneData, Role, Task } from '$lib/types/control-plane';

function readTaskId(form: FormData) {
	return form.get('taskId')?.toString().trim() ?? '';
}

function handleGovernanceActionError(caughtError: unknown) {
	if (caughtError instanceof TaskGovernanceActionError) {
		return fail(caughtError.status, { message: caughtError.message });
	}

	throw caughtError;
}

function readCreateTaskSubmitMode(form: FormData) {
	return form.get('submitMode')?.toString() === 'createAndRun' ? 'createAndRun' : 'create';
}

function readTaskAttachments(form: FormData) {
	return form
		.getAll('attachments')
		.filter((value): value is File => value instanceof File && value.size > 0);
}

function getActionErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function buildTaskCreateFormContext(
	input: ReturnType<typeof readCreateTaskForm>,
	submitMode: 'create' | 'createAndRun'
) {
	return {
		formContext: 'taskCreate' as const,
		name: input.name,
		instructions: input.instructions,
		successCriteria: input.successCriteria,
		readyCondition: input.readyCondition,
		expectedOutcome: input.expectedOutcome,
		projectId: input.projectId,
		parentTaskId: input.parentTaskId,
		delegationObjective: input.delegationObjective,
		delegationInputContext: input.delegationInputContext,
		delegationExpectedDeliverable: input.delegationExpectedDeliverable,
		delegationDoneCondition: input.delegationDoneCondition,
		delegationIntegrationNotes: input.delegationIntegrationNotes,
		assigneeExecutionSurfaceId: input.assigneeExecutionSurfaceId,
		targetDate: input.targetDate,
		goalId: input.goalId,
		area: input.area,
		priority: input.priority,
		riskLevel: input.riskLevel,
		approvalMode: input.approvalMode,
		requiredThreadSandbox: input.requiredThreadSandbox,
		requiresReview: input.requiresReview,
		desiredRoleId: input.desiredRoleId,
		blockedReason: input.blockedReason,
		dependencyTaskIds: input.dependencyTaskIds,
		requiredPromptSkillNames: input.requiredPromptSkillNames,
		requiredCapabilityNames: input.requiredCapabilityNames,
		requiredToolNames: input.requiredToolNames,
		submitMode
	};
}

function failTaskCreate(
	status: number,
	payload: {
		formContext: 'taskCreate';
		message: string;
		name: string;
		instructions: string;
		successCriteria: string;
		readyCondition: string;
		expectedOutcome: string;
		projectId: string;
		parentTaskId: string;
		delegationObjective: string;
		delegationInputContext: string;
		delegationExpectedDeliverable: string;
		delegationDoneCondition: string;
		delegationIntegrationNotes: string;
		assigneeExecutionSurfaceId: string;
		targetDate: string;
		goalId: string;
		area: string;
		priority: string;
		riskLevel: string;
		approvalMode: string;
		requiredThreadSandbox: string | null;
		requiresReview: boolean;
		desiredRoleId: string;
		blockedReason: string;
		dependencyTaskIds: string[];
		requiredPromptSkillNames: string[];
		requiredCapabilityNames: string[];
		requiredToolNames: string[];
		submitMode: 'create' | 'createAndRun';
	}
) {
	return fail(status, payload);
}

function getDefaultDraftRole(data: ControlPlaneData): Role | null {
	return data.roles.find((role) => role.id === 'role_coordinator') ?? data.roles[0] ?? null;
}

function prependCreatedTask(data: ControlPlaneData, task: Task, goalId: string) {
	const nextData = {
		...data,
		tasks: [task, ...data.tasks]
	};

	if (!goalId) {
		return nextData;
	}

	const goal = nextData.goals.find((candidate) => candidate.id === goalId);

	if (!goal) {
		return nextData;
	}

	return applyGoalRelationships({
		data: nextData,
		goalId: goal.id,
		parentGoalId: goal.parentGoalId ?? null,
		projectIds: getGoalLinkedProjectIds(nextData, goal),
		taskIds: getGoalLinkedTaskIds(nextData, goal)
	});
}

export const load: PageServerLoad = async ({ url }) => {
	const controlPlanePromise = loadControlPlane();
	const [data, sessions] = await Promise.all([
		controlPlanePromise,
		listAgentThreads({
			includeArchived: true,
			controlPlane: controlPlanePromise,
			includeCategorization: false
		})
	]);
	const defaultDraftRole = getDefaultDraftRole(data);
	const taskWorkItems = buildTaskWorkItems(data, sessions);
	const availableDependencyTasks = [...taskWorkItems]
		.map((task) => ({
			id: task.id,
			title: task.title,
			status: task.status,
			projectId: task.projectId,
			projectName: task.projectName
		}))
		.sort((left, right) => {
			const projectComparison = left.projectName.localeCompare(right.projectName);

			return projectComparison !== 0 ? projectComparison : left.title.localeCompare(right.title);
		});
	const projectSkillSummaries = [...data.projects]
		.map((project) => {
			const installedSkills = listInstalledCodexSkills(project.projectRootFolder);

			return {
				projectId: project.id,
				totalCount: installedSkills.length,
				globalCount: installedSkills.filter((skill) => skill.global).length,
				projectCount: installedSkills.filter((skill) => skill.project).length,
				installedSkills,
				previewSkills: installedSkills.slice(0, 8)
			};
		})
		.sort((left, right) => left.projectId.localeCompare(right.projectId));
	const executionRequirementInventory = buildExecutionRequirementInventory(data);

	return {
		deleted: url.searchParams.get('deleted') === '1',
		createTaskPrefill: readCreateTaskPrefill(url),
		statusOptions: TASK_STATUS_OPTIONS,
		goals: buildTaskGoalOptions(data.goals),
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		availableDependencyTasks,
		projectSkillSummaries,
		executionRequirementInventory,
		executionSurfaces: [...data.executionSurfaces].sort((a, b) => a.name.localeCompare(b.name)),
		defaultDraftRoleName: defaultDraftRole?.name ?? 'Unassigned',
		tasks: taskWorkItems
	};
};

export const actions: Actions = {
	createTask: async ({ request }) => {
		const form = await request.formData();
		const createTaskInput = readCreateTaskForm(form);
		const {
			name,
			instructions,
			successCriteria,
			readyCondition,
			expectedOutcome,
			projectId,
			parentTaskId,
			delegationObjective,
			delegationInputContext,
			delegationExpectedDeliverable,
			delegationDoneCondition,
			delegationIntegrationNotes,
			assigneeExecutionSurfaceId,
			targetDate,
			goalId,
			area,
			priority,
			riskLevel,
			approvalMode,
			requiredThreadSandbox,
			requiresReview,
			desiredRoleId,
			blockedReason,
			dependencyTaskIds,
			requiredPromptSkillNames,
			requiredCapabilityNames,
			requiredToolNames
		} = createTaskInput;
		const submitMode = readCreateTaskSubmitMode(form);
		const uploads = readTaskAttachments(form);
		const failureContext: Omit<Parameters<typeof failTaskCreate>[1], 'message'> =
			buildTaskCreateFormContext(createTaskInput, submitMode);

		if (!name || !instructions || !projectId) {
			return failTaskCreate(400, {
				message: 'Name, instructions, and project are required.',
				...failureContext
			});
		}

		if (targetDate && !isValidTaskDate(targetDate)) {
			return failTaskCreate(400, {
				message: 'Target date must use YYYY-MM-DD format.',
				...failureContext
			});
		}

		const current = await loadControlPlane();
		const executionRequirementInventory = buildExecutionRequirementInventory(current);
		const projectInstalledSkills = listInstalledCodexSkills(
			projectId
				? (current.projects.find((candidate) => candidate.id === projectId)?.projectRootFolder ??
						'')
				: ''
		);
		const normalizedRequiredPromptSkillNames = canonicalizeExecutionRequirementNames(
			requiredPromptSkillNames,
			projectInstalledSkills.map((skill) => skill.id)
		);
		const normalizedRequiredCapabilityNames = canonicalizeExecutionRequirementNames(
			requiredCapabilityNames,
			executionRequirementInventory.capabilityNames
		);
		const normalizedRequiredToolNames = canonicalizeExecutionRequirementNames(
			requiredToolNames,
			executionRequirementInventory.toolNames
		);
		const project = current.projects.find((candidate) => candidate.id === projectId);
		const goal = goalId ? current.goals.find((candidate) => candidate.id === goalId) : null;
		const parentTask = parentTaskId
			? current.tasks.find((candidate) => candidate.id === parentTaskId)
			: null;
		const assignedExecutionSurface = assigneeExecutionSurfaceId
			? current.executionSurfaces.find((candidate) => candidate.id === assigneeExecutionSurfaceId)
			: null;

		if (!project) {
			return failTaskCreate(400, {
				message: 'Project not found.',
				...failureContext
			});
		}

		if (goalId && !goal) {
			return failTaskCreate(400, {
				message: 'Goal not found.',
				...failureContext
			});
		}

		if (parentTaskId && !parentTask) {
			return failTaskCreate(400, {
				message: 'Parent task not found.',
				...failureContext
			});
		}

		if (parentTaskId && !delegationObjective.trim()) {
			return failTaskCreate(400, {
				message: 'Delegated child tasks need a clear delegation objective.',
				...failureContext
			});
		}

		if (parentTaskId && !delegationDoneCondition.trim()) {
			return failTaskCreate(400, {
				message: 'Delegated child tasks need a done condition for handoff.',
				...failureContext
			});
		}

		if (assigneeExecutionSurfaceId && !assignedExecutionSurface) {
			return failTaskCreate(400, {
				message: 'Execution surface not found.',
				...failureContext
			});
		}

		if (submitMode === 'createAndRun' && !project.projectRootFolder) {
			return failTaskCreate(400, {
				message: 'This task cannot launch a work thread until its project has a root folder.',
				...failureContext
			});
		}

		if (submitMode === 'createAndRun') {
			const launchContractBlocker = getTaskLaunchContractBlockerMessage(
				buildTaskExecutionContractStatus({
					successCriteria,
					readyCondition,
					expectedOutcome
				})
			);

			if (launchContractBlocker) {
				return failTaskCreate(400, {
					message: launchContractBlocker,
					...failureContext
				});
			}
		}

		const invalidDependencyTaskIds = dependencyTaskIds.filter(
			(dependencyTaskId) =>
				!current.tasks.some((candidateTask) => candidateTask.id === dependencyTaskId)
		);

		if (invalidDependencyTaskIds.length > 0) {
			return failTaskCreate(400, {
				message: 'One or more selected dependencies are no longer available.',
				...failureContext
			});
		}

		const attachmentRoot = getTaskAttachmentRoot(
			{
				artifactPath: project.defaultArtifactRoot || project.projectRootFolder || ''
			},
			project
		);

		if (uploads.length > 0 && !attachmentRoot) {
			return failTaskCreate(400, {
				message:
					'This project needs an artifact root before files can be attached during creation.',
				...failureContext
			});
		}

		const nextGoalId = goal?.id ?? '';
		const nextDesiredRoleId = current.roles.some((role) => role.id === desiredRoleId)
			? desiredRoleId
			: '';
		const baseTask = createTask({
			title: name,
			summary: instructions,
			successCriteria,
			readyCondition,
			expectedOutcome,
			projectId: project.id,
			area,
			goalId: nextGoalId,
			parentTaskId: parentTask?.id ?? null,
			delegationPacket: parentTask
				? {
						objective: delegationObjective,
						inputContext: delegationInputContext,
						expectedDeliverable: delegationExpectedDeliverable,
						doneCondition: delegationDoneCondition,
						integrationNotes: delegationIntegrationNotes
					}
				: null,
			priority,
			riskLevel,
			approvalMode,
			requiredThreadSandbox,
			requiresReview,
			desiredRoleId: nextDesiredRoleId,
			assigneeExecutionSurfaceId: assignedExecutionSurface?.id ?? null,
			blockedReason,
			dependencyTaskIds,
			targetDate: targetDate || null,
			requiredPromptSkillNames: normalizedRequiredPromptSkillNames,
			requiredCapabilityNames: normalizedRequiredCapabilityNames,
			requiredToolNames: normalizedRequiredToolNames,
			artifactPath: project.defaultArtifactRoot || project.projectRootFolder || ''
		});
		const attachments =
			uploads.length > 0
				? await persistTaskAttachments({
						taskId: baseTask.id,
						attachmentRoot,
						uploads
					})
				: [];
		const createdTask = attachments.length > 0 ? { ...baseTask, attachments } : baseTask;

		if (submitMode !== 'createAndRun') {
			await updateControlPlane((data) => prependCreatedTask(data, createdTask, nextGoalId));

			return {
				ok: true,
				successAction: 'createTask',
				attachmentCount: attachments.length
			};
		}

		const { role: preferredRole, effectivePromptSkillNames } = resolveTaskRolePromptContext({
			roles: current.roles,
			desiredRoleId: createdTask.desiredRoleId,
			projectRootFolder: project.projectRootFolder,
			taskPromptSkillNames: createdTask.requiredPromptSkillNames ?? []
		});
		const prompt = buildTaskThreadPrompt({
			taskName: name,
			taskInstructions: instructions,
			successCriteria,
			readyCondition,
			expectedOutcome,
			delegationPacket: createdTask.delegationPacket ?? null,
			projectName: project.name,
			projectRootFolder: project.projectRootFolder ?? '',
			defaultArtifactRoot: project.defaultArtifactRoot,
			additionalWritableRoots: project.additionalWritableRoots ?? [],
			availableSkillNames: projectInstalledSkills.slice(0, 12).map((skill) => skill.id),
			requiredPromptSkillNames: effectivePromptSkillNames,
			preferredRole
		});
		const provider = selectExecutionProvider(current, assignedExecutionSurface);
		const sandbox = resolveThreadSandbox({
			task: createdTask,
			executionSurface: assignedExecutionSurface,
			project,
			provider
		});
		const workspaceIssue = getWorkspaceExecutionIssue({
			cwd: project.projectRootFolder ?? '',
			additionalWritableRoots: project.additionalWritableRoots ?? [],
			sandbox,
			scopeLabel: 'Project root'
		});

		if (workspaceIssue) {
			return failTaskCreate(400, {
				message: workspaceIssue,
				...failureContext
			});
		}

		let session;

		try {
			session = await startAgentThread({
				name: buildTaskThreadName({
					projectName: project.name,
					taskName: createdTask.title,
					taskId: createdTask.id
				}),
				cwd: project.projectRootFolder ?? '',
				additionalWritableRoots: project.additionalWritableRoots ?? [],
				prompt,
				sandbox,
				model: null
			});
		} catch (error) {
			return failTaskCreate(400, {
				message: getActionErrorMessage(error, 'Could not start a work thread for this task.'),
				...failureContext
			});
		}
		const providerId = provider?.id ?? null;
		const now = new Date().toISOString();
		const run = createRun({
			taskId: createdTask.id,
			executionSurfaceId: assignedExecutionSurface?.id ?? null,
			assumedRoleId: createdTask.desiredRoleId || null,
			providerId,
			status: 'running',
			startedAt: now,
			threadId: null,
			agentThreadId: session.agentThreadId,
			promptDigest: buildPromptDigest(prompt),
			artifactPaths:
				project.defaultArtifactRoot || project.projectRootFolder
					? [project.defaultArtifactRoot || project.projectRootFolder]
					: [],
			summary: 'Started a new work thread during task creation.',
			lastHeartbeatAt: now
		});

		await updateControlPlane((data) => {
			const nextTask: Task = {
				...createdTask,
				agentThreadId: session.agentThreadId,
				status: 'in_progress',
				updatedAt: now
			};
			const nextData = prependCreatedTask(data, nextTask, nextGoalId);

			return {
				...nextData,
				runs: [run, ...data.runs]
			};
		});

		return {
			ok: true,
			successAction: 'createTaskAndRun',
			taskId: createdTask.id,
			threadId: session.agentThreadId,
			attachmentCount: attachments.length
		};
	},

	assistTaskWriting: async ({ request }) => {
		const form = await request.formData();
		const createTaskInput = readCreateTaskForm(form);
		const submitMode = readCreateTaskSubmitMode(form);
		const failureContext: Omit<Parameters<typeof failTaskCreate>[1], 'message'> =
			buildTaskCreateFormContext(createTaskInput, submitMode);

		if (!createTaskInput.instructions) {
			return failTaskCreate(400, {
				message: 'Add draft instructions before requesting writing assist.',
				...failureContext
			});
		}

		const current = await loadControlPlane();
		const project =
			current.projects.find((candidate) => candidate.id === createTaskInput.projectId) ?? null;
		const goal = current.goals.find((candidate) => candidate.id === createTaskInput.goalId) ?? null;
		const parentTask =
			current.tasks.find((candidate) => candidate.id === createTaskInput.parentTaskId) ?? null;

		try {
			const result = await assistTaskWriting({
				cwd: project?.projectRootFolder || process.cwd(),
				projectName: project?.name ?? null,
				taskName: createTaskInput.name,
				goalLabel: goal?.name ?? null,
				parentTaskTitle: parentTask?.title ?? null,
				existingInstructions: createTaskInput.instructions,
				successCriteria: createTaskInput.successCriteria,
				readyCondition: createTaskInput.readyCondition,
				expectedOutcome: createTaskInput.expectedOutcome,
				delegationObjective: createTaskInput.delegationObjective,
				delegationInputContext: createTaskInput.delegationInputContext,
				delegationExpectedDeliverable: createTaskInput.delegationExpectedDeliverable,
				delegationDoneCondition: createTaskInput.delegationDoneCondition,
				delegationIntegrationNotes: createTaskInput.delegationIntegrationNotes,
				blockedReason: createTaskInput.blockedReason,
				requiredCapabilityNames: createTaskInput.requiredCapabilityNames,
				requiredToolNames: createTaskInput.requiredToolNames,
				requiredPromptSkillNames: createTaskInput.requiredPromptSkillNames,
				availableSkillNames: listInstalledCodexSkills(project?.projectRootFolder ?? '')
					.slice(0, 12)
					.map((skill) => skill.id)
			});

			return {
				ok: true,
				successAction: 'assistTaskWriting',
				reopenCreateModal: true,
				assistChangeSummary: result.changeSummary,
				...buildTaskCreateFormContext(
					{
						...createTaskInput,
						instructions: result.instructions
					},
					submitMode
				)
			};
		} catch (error) {
			return failTaskCreate(400, {
				message: getActionErrorMessage(error, 'Could not rewrite the task instructions.'),
				...failureContext
			});
		}
	},

	updateTask: async ({ request }) => {
		const form = await request.formData();
		const taskId = form.get('taskId')?.toString().trim() ?? '';
		const status = parseTaskStatus(form.get('status')?.toString() ?? '', 'ready');
		const {
			name,
			instructions,
			projectId,
			assigneeExecutionSurfaceId,
			targetDate,
			requiredThreadSandbox
		} = readCreateTaskForm(form);

		if (!taskId) {
			return fail(400, { message: 'Task ID is required.' });
		}

		if (!name || !instructions || !projectId) {
			return fail(400, {
				message: 'Name, instructions, and project are required.'
			});
		}

		if (targetDate && !isValidTaskDate(targetDate)) {
			return fail(400, { message: 'Target date must use YYYY-MM-DD format.' });
		}

		let taskUpdated = false;

		const current = await loadControlPlane();
		const project = current.projects.find((candidate) => candidate.id === projectId);
		const assignedExecutionSurface = assigneeExecutionSurfaceId
			? current.executionSurfaces.find((candidate) => candidate.id === assigneeExecutionSurfaceId)
			: null;

		if (!project) {
			return fail(400, { message: 'Project not found.' });
		}

		if (assigneeExecutionSurfaceId && !assignedExecutionSurface) {
			return fail(400, { message: 'Execution surface not found.' });
		}

		await updateControlPlane((data) => {
			return {
				...data,
				tasks: data.tasks.map((task) => {
					if (task.id !== taskId) {
						return task;
					}

					taskUpdated = true;

					return {
						...task,
						title: name,
						summary: instructions,
						projectId: project.id,
						status,
						requiredThreadSandbox,
						assigneeExecutionSurfaceId: assignedExecutionSurface?.id ?? null,
						targetDate: targetDate || null,
						delegationAcceptance: task.parentTaskId ? null : (task.delegationAcceptance ?? null),
						artifactPath:
							task.artifactPath || project.defaultArtifactRoot || project.projectRootFolder || '',
						updatedAt: new Date().toISOString()
					};
				})
			};
		});

		if (!taskUpdated) {
			return fail(404, { message: 'Task not found.' });
		}

		return {
			ok: true,
			successAction: 'updateTask',
			taskId
		};
	},

	launchTaskSession: async ({ request }) => {
		const form = await request.formData();
		const taskId = form.get('taskId')?.toString().trim() ?? '';
		const { name, instructions, projectId, assigneeExecutionSurfaceId } = readCreateTaskForm(form);

		if (!taskId) {
			return fail(400, { message: 'Task ID is required.' });
		}

		const current = await loadControlPlane();
		const task = current.tasks.find((candidate) => candidate.id === taskId);

		if (!task) {
			return fail(404, { message: 'Task not found.' });
		}

		const effectiveName = name || task.title;
		const effectiveInstructions = instructions || task.summary;
		const effectiveSuccessCriteria = task.successCriteria ?? '';
		const effectiveReadyCondition = task.readyCondition ?? '';
		const effectiveExpectedOutcome = task.expectedOutcome ?? '';
		const effectiveProjectId = projectId || task.projectId;
		const assignedExecutionSurface = assigneeExecutionSurfaceId
			? current.executionSurfaces.find((candidate) => candidate.id === assigneeExecutionSurfaceId)
			: null;
		const effectiveExecutionSurface =
			assignedExecutionSurface ??
			(task.assigneeExecutionSurfaceId
				? (current.executionSurfaces.find(
						(candidate) => candidate.id === task.assigneeExecutionSurfaceId
					) ?? null)
				: null);
		const project = current.projects.find((candidate) => candidate.id === effectiveProjectId);

		if (!project) {
			return fail(400, { message: 'Task project not found.' });
		}

		if (assigneeExecutionSurfaceId && !assignedExecutionSurface) {
			return fail(400, { message: 'Execution surface not found.' });
		}

		if (!project.projectRootFolder) {
			return fail(400, {
				message: 'This task cannot launch a work thread until its project has a root folder.'
			});
		}

		if (getPendingApprovalForTask(current, task.id)?.mode === 'before_run') {
			return fail(409, {
				message: 'This task is waiting on before-run approval before a work thread can start.'
			});
		}

		const { role: preferredRole, effectivePromptSkillNames } = resolveTaskRolePromptContext({
			roles: current.roles,
			desiredRoleId: task.desiredRoleId,
			projectRootFolder: project.projectRootFolder,
			taskPromptSkillNames: task.requiredPromptSkillNames ?? []
		});
		const prompt = buildTaskThreadPrompt({
			taskName: effectiveName,
			taskInstructions: effectiveInstructions,
			successCriteria: effectiveSuccessCriteria,
			readyCondition: effectiveReadyCondition,
			expectedOutcome: effectiveExpectedOutcome,
			delegationPacket: task.delegationPacket ?? null,
			projectName: project.name,
			projectRootFolder: project.projectRootFolder,
			defaultArtifactRoot: project.defaultArtifactRoot,
			additionalWritableRoots: project.additionalWritableRoots ?? [],
			availableSkillNames: listInstalledCodexSkills(project.projectRootFolder)
				.slice(0, 12)
				.map((skill) => skill.id),
			requiredPromptSkillNames: effectivePromptSkillNames,
			preferredRole
		});
		const provider = selectExecutionProvider(current, effectiveExecutionSurface);
		const sandbox = resolveThreadSandbox({
			task,
			executionSurface: effectiveExecutionSurface,
			project,
			provider
		});
		const assignedThread = task.agentThreadId ? await getAgentThread(task.agentThreadId) : null;
		const latestRun = task.latestRunId
			? (current.runs.find((run) => run.id === task.latestRunId) ?? null)
			: null;
		const latestRunThread =
			latestRun?.agentThreadId && latestRun.agentThreadId !== task.agentThreadId
				? await getAgentThread(latestRun.agentThreadId)
				: null;
		const threadContext = selectProjectTaskThreadContext(project, {
			assignedThread,
			latestRunThread
		});
		const compatibleAssignedThread = threadContext.assignedThread;
		const compatibleLatestRunThread = threadContext.latestRunThread;
		let agentThreadId = compatibleAssignedThread?.id ?? compatibleLatestRunThread?.id ?? null;
		let codexThreadId!: string | null;
		let reusedThreadMode: 'assigned' | 'latest' | null = null;

		if (compatibleAssignedThread?.hasActiveRun) {
			return fail(409, {
				message:
					'This task is assigned to a busy work thread. Wait for that run to finish or change the thread assignment first.'
			});
		}

		const workspaceIssue = getWorkspaceExecutionIssue({
			cwd: project.projectRootFolder,
			additionalWritableRoots: project.additionalWritableRoots ?? [],
			sandbox,
			scopeLabel: 'Project root'
		});

		if (workspaceIssue) {
			return fail(400, { message: workspaceIssue });
		}

		if (compatibleAssignedThread?.canResume) {
			try {
				await sendAgentThreadMessage(compatibleAssignedThread.id, prompt);
			} catch (error) {
				return fail(400, {
					message: getActionErrorMessage(error, 'Could not queue work in the linked thread.')
				});
			}

			agentThreadId = compatibleAssignedThread.id;
			codexThreadId = compatibleAssignedThread.threadId;
			reusedThreadMode = 'assigned';
		} else if (!compatibleAssignedThread && compatibleLatestRunThread?.canResume) {
			try {
				await sendAgentThreadMessage(compatibleLatestRunThread.id, prompt);
			} catch (error) {
				return fail(400, {
					message: getActionErrorMessage(error, 'Could not queue work in the latest thread.')
				});
			}

			agentThreadId = compatibleLatestRunThread.id;
			codexThreadId = compatibleLatestRunThread.threadId;
			reusedThreadMode = 'latest';
		} else {
			let session;

			try {
				session = await startAgentThread({
					name: buildTaskThreadName({
						projectName: project.name,
						taskName: effectiveName,
						taskId: task.id
					}),
					cwd: project.projectRootFolder,
					additionalWritableRoots: project.additionalWritableRoots ?? [],
					prompt,
					sandbox,
					model: null
				});
			} catch (error) {
				return fail(400, {
					message: getActionErrorMessage(error, 'Could not start a work thread for this task.')
				});
			}

			agentThreadId = session.agentThreadId;
			codexThreadId = null;
		}

		const providerId = provider?.id ?? null;
		const run = createRun({
			taskId,
			executionSurfaceId: effectiveExecutionSurface?.id ?? null,
			assumedRoleId: task.desiredRoleId || null,
			providerId,
			status: 'running',
			startedAt: new Date().toISOString(),
			threadId: codexThreadId,
			agentThreadId,
			promptDigest: buildPromptDigest(prompt),
			artifactPaths:
				project.defaultArtifactRoot || project.projectRootFolder
					? [project.defaultArtifactRoot || project.projectRootFolder]
					: [],
			summary:
				reusedThreadMode === 'assigned'
					? 'Queued in the task’s assigned work thread.'
					: reusedThreadMode === 'latest'
						? 'Queued in the task’s latest compatible work thread.'
						: 'Started a new work thread from the task board.',
			lastHeartbeatAt: new Date().toISOString()
		});

		await updateControlPlane((data) => ({
			...data,
			runs: [run, ...data.runs],
			tasks: data.tasks.map((candidate) =>
				candidate.id === taskId
					? {
							...candidate,
							title: effectiveName,
							summary: effectiveInstructions,
							projectId: project.id,
							assigneeExecutionSurfaceId:
								assignedExecutionSurface?.id ?? candidate.assigneeExecutionSurfaceId,
							agentThreadId,
							delegationAcceptance: null,
							artifactPath:
								candidate.artifactPath ||
								project.defaultArtifactRoot ||
								project.projectRootFolder ||
								'',
							status: 'in_progress',
							updatedAt: new Date().toISOString()
						}
					: candidate
			)
		}));

		return {
			ok: true,
			successAction: 'launchTaskSession',
			taskId,
			threadId: agentThreadId
		};
	},

	approveReview: async ({ request }) => {
		const taskId = readTaskId(await request.formData());

		if (!taskId) {
			return fail(400, { message: 'Task ID is required.' });
		}

		try {
			return await approveTaskReview(taskId, 'task queue');
		} catch (caughtError) {
			return handleGovernanceActionError(caughtError);
		}
	},

	requestChanges: async ({ request }) => {
		const taskId = readTaskId(await request.formData());

		if (!taskId) {
			return fail(400, { message: 'Task ID is required.' });
		}

		try {
			return await requestTaskReviewChanges(taskId, 'task queue');
		} catch (caughtError) {
			return handleGovernanceActionError(caughtError);
		}
	},

	approveApproval: async ({ request }) => {
		const taskId = readTaskId(await request.formData());

		if (!taskId) {
			return fail(400, { message: 'Task ID is required.' });
		}

		try {
			return await approveTaskApproval(taskId, 'task queue');
		} catch (caughtError) {
			return handleGovernanceActionError(caughtError);
		}
	},

	rejectApproval: async ({ request }) => {
		const taskId = readTaskId(await request.formData());

		if (!taskId) {
			return fail(400, { message: 'Task ID is required.' });
		}

		try {
			return await rejectTaskApproval(taskId);
		} catch (caughtError) {
			return handleGovernanceActionError(caughtError);
		}
	},

	deleteTasks: async ({ request }) => {
		const form = await request.formData();
		const taskIds = [
			...new Set(
				form
					.getAll('taskId')
					.map((value) => value.toString().trim())
					.filter(Boolean)
			)
		];

		if (taskIds.length === 0) {
			return fail(400, { message: 'Select at least one task to delete.' });
		}

		const current = await loadControlPlane();
		const existingTaskIds = new Set(current.tasks.map((task) => task.id));
		const deletableTaskIds = taskIds.filter((taskId) => existingTaskIds.has(taskId));

		if (deletableTaskIds.length === 0) {
			return fail(404, { message: 'Selected tasks were not found.' });
		}

		const relatedThreadIds = [
			...new Set(
				current.runs
					.filter((run) => deletableTaskIds.includes(run.taskId))
					.map((run) => run.agentThreadId)
					.filter((threadId): threadId is string => Boolean(threadId))
			)
		];

		await Promise.all(relatedThreadIds.map((threadId) => cancelAgentThread(threadId)));
		await updateControlPlane((data) =>
			deletableTaskIds.reduce(
				(currentData, taskId) => removeTaskFromControlPlane(currentData, taskId),
				data
			)
		);

		return {
			ok: true,
			successAction: 'deleteTasks',
			deletedCount: deletableTaskIds.length
		};
	}
};
