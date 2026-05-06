import { parseExecutionRequirementNames } from '$lib/execution-requirements';
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import {
	applyGoalRelationships,
	suggestGoalArtifactPath,
	wouldCreateGoalCycle
} from '$lib/server/goal-relationships';
import {
	attachTaskFileFromPath,
	removeTaskAttachmentById,
	TaskDetailMutationActionError
} from '$lib/server/task-detail-mutation-actions';
import {
	acceptTaskChildHandoff,
	requestTaskChildHandoffChanges,
	TaskChildHandoffActionError
} from '$lib/server/task-child-handoffs';
import {
	createDecision,
	createGoal,
	createProject,
	createTask,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	goalLinksProject,
	loadControlPlane,
	parseArea,
	parseGoalStatus,
	parsePriority,
	parseTaskApprovalMode,
	parseTaskRiskLevel,
	parseTaskStatus,
	normalizeTaskBlockedReasonForStatus,
	updateControlPlaneCollections,
	wouldCreateProjectCycle
} from '$lib/server/control-plane';
import { createTaskRecord, updateTaskRecord } from '$lib/server/control-plane-repository';
import {
	decomposeTaskFromTemplates,
	type TaskDecompositionTemplateInput,
	TaskDecompositionActionError
} from '$lib/server/task-decomposition-action';
import { buildExecutionRequirementInventory } from '$lib/server/execution-requirement-inventory';
import { normalizePathInput, normalizePathListInput } from '$lib/server/path-tools';
import { getAgentThread, parseAgentSandbox } from '$lib/server/agent-threads';
import {
	approveTaskApproval,
	approveTaskReview,
	rejectTaskApproval,
	requestTaskReviewChanges,
	requestTaskApproval,
	requestTaskReview,
	TaskGovernanceActionError
} from '$lib/server/task-governance';
import {
	launchTaskSession,
	recoverTaskSession,
	TaskSessionActionError
} from '$lib/server/task-session-actions';
import { isValidTaskDate } from '$lib/server/task-form';
import type { AgentSandbox } from '$lib/types/agent-thread';
import type { ControlPlaneData, Goal, Project, Task } from '$lib/types/control-plane';
export { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';

export type AgentTaskListFilters = {
	q?: string | null;
	projectId?: string | null;
	goalId?: string | null;
	status?: string | null;
	limit?: number | null;
};

export type AgentGoalListFilters = {
	q?: string | null;
	projectId?: string | null;
	status?: string | null;
	limit?: number | null;
};

export type AgentProjectListFilters = {
	q?: string | null;
	limit?: number | null;
};

export type AgentCreateTaskInput = {
	title?: string;
	summary?: string;
	successCriteria?: string;
	readyCondition?: string;
	expectedOutcome?: string;
	projectId?: string;
	goalId?: string | null;
	workflowId?: string | null;
	parentTaskId?: string | null;
	priority?: string;
	status?: string;
	area?: string;
	riskLevel?: string;
	approvalMode?: string;
	requiredThreadSandbox?: AgentSandbox | string | null;
	requiresReview?: boolean;
	desiredRoleId?: string | null;
	assigneeExecutionSurfaceId?: string | null;
	agentThreadId?: string | null;
	blockedReason?: string;
	dependencyTaskIds?: string[] | string;
	targetDate?: string | null;
	artifactPath?: string | null;
	requiredPromptSkillNames?: string[] | string;
	requiredCapabilityNames?: string[] | string;
	requiredToolNames?: string[] | string;
};

export type AgentCreateGoalInput = {
	name?: string;
	summary?: string;
	successSignal?: string;
	targetDate?: string | null;
	artifactPath?: string | null;
	parentGoalId?: string | null;
	projectIds?: string[] | string;
	taskIds?: string[] | string;
	area?: string;
	status?: string;
};

export type AgentUpdateGoalInput = {
	name?: string;
	summary?: string;
	successSignal?: string;
	targetDate?: string | null;
	artifactPath?: string | null;
	parentGoalId?: string | null;
	projectIds?: string[] | string;
	taskIds?: string[] | string;
	area?: string;
	status?: string;
};

export type AgentCreateProjectInput = {
	name?: string;
	summary?: string;
	parentProjectId?: string | null;
	projectRootFolder?: string | null;
	defaultArtifactRoot?: string | null;
	defaultRepoPath?: string | null;
	defaultRepoUrl?: string;
	defaultBranch?: string;
	additionalWritableRoots?: string[] | string;
	defaultThreadSandbox?: AgentSandbox | string | null;
	defaultModel?: string | null;
};

export type AgentUpdateProjectInput = {
	name?: string;
	summary?: string;
	parentProjectId?: string | null;
	projectRootFolder?: string | null;
	defaultArtifactRoot?: string | null;
	defaultRepoPath?: string | null;
	defaultRepoUrl?: string;
	defaultBranch?: string;
	additionalWritableRoots?: string[] | string;
	defaultThreadSandbox?: AgentSandbox | string | null;
	defaultModel?: string | null;
};

export type AgentUpdateTaskInput = {
	title?: string;
	summary?: string;
	successCriteria?: string;
	readyCondition?: string;
	expectedOutcome?: string;
	priority?: string;
	status?: string;
	area?: string;
	riskLevel?: string;
	approvalMode?: string;
	requiredThreadSandbox?: AgentSandbox | string | null;
	requiresReview?: boolean;
	desiredRoleId?: string | null;
	assigneeExecutionSurfaceId?: string | null;
	agentThreadId?: string | null;
	blockedReason?: string;
	dependencyTaskIds?: string[] | string;
	targetDate?: string | null;
	artifactPath?: string | null;
	requiredPromptSkillNames?: string[] | string;
	requiredCapabilityNames?: string[] | string;
	requiredToolNames?: string[] | string;
};

export type AgentTaskAttachmentInput = {
	path?: string;
	name?: string;
	contentType?: string;
};

export type AgentTaskReviewRequestInput = {
	summary?: string;
	requestedByExecutionSurfaceId?: string | null;
	reviewerExecutionSurfaceId?: string | null;
};

export type AgentTaskApprovalRequestInput = {
	mode?: string | null;
	summary?: string;
	requestedByExecutionSurfaceId?: string | null;
	approverExecutionSurfaceId?: string | null;
};

export type AgentTaskDecomposeChildInput = {
	title?: string;
	instructions?: string;
	desiredRoleId?: string;
	delegationObjective?: string;
	delegationExpectedDeliverable?: string;
	delegationDoneCondition?: string;
};

export type AgentTaskDecomposeInput = {
	children?: AgentTaskDecomposeChildInput[];
};

export type AgentTaskChildHandoffInput = {
	childTaskId?: string;
	summary?: string;
};

function normalizeSearchValue(value: string | null | undefined) {
	return value?.trim().toLowerCase() ?? '';
}

function readTrimmedString(value: string | null | undefined) {
	return value?.trim() ?? '';
}

function readNullableString(value: string | null | undefined) {
	const normalized = readTrimmedString(value);
	return normalized.length > 0 ? normalized : null;
}

function normalizeIdList(value: string[] | string | null | undefined) {
	if (Array.isArray(value)) {
		return [...new Set(value.map((entry) => readTrimmedString(entry)).filter(Boolean))];
	}

	return parseExecutionRequirementNames(readTrimmedString(value));
}

function normalizeOptionalSandbox(value: AgentSandbox | string | null | undefined) {
	if (value === undefined) {
		return undefined;
	}

	if (value === null) {
		return null;
	}

	return parseAgentSandbox(value, 'workspace-write');
}

function normalizeAgentTaskDecomposeChildren(input: AgentTaskDecomposeInput) {
	return Array.isArray(input.children)
		? input.children.map((child) => ({
				title: readTrimmedString(child.title),
				instructions: readTrimmedString(child.instructions),
				desiredRoleId: readTrimmedString(child.desiredRoleId),
				delegationObjective: readTrimmedString(child.delegationObjective),
				delegationExpectedDeliverable: readTrimmedString(child.delegationExpectedDeliverable),
				delegationDoneCondition: readTrimmedString(child.delegationDoneCondition)
			}))
		: [];
}

function normalizeOptionalPath(value: string | null | undefined) {
	if (value === undefined) {
		return undefined;
	}

	if (value === null) {
		return null;
	}

	return normalizePathInput(value);
}

function matchesSearch(texts: Array<string | null | undefined>, query: string) {
	if (!query) {
		return true;
	}

	const haystack = texts.join(' ').toLowerCase();
	return haystack.includes(query);
}

function clampLimit(value: number | null | undefined, fallback: number) {
	if (!Number.isFinite(value) || !value || value <= 0) {
		return fallback;
	}

	return Math.min(Math.max(1, value), 200);
}

function missingIdError(label: 'task' | 'goal' | 'project') {
	return new AgentControlPlaneApiError(
		400,
		`${label[0].toUpperCase()}${label.slice(1)} id is required.`,
		{
			code: `missing_${label}_id`,
			suggestedNextCommands: [`${label}:list`, 'context:current']
		}
	);
}

function notFoundError(
	label: 'task' | 'goal' | 'project' | 'agent_thread',
	options: {
		id?: string | null;
		suggestedNextCommands?: string[];
	} = {}
) {
	const labelText =
		label === 'agent_thread' ? 'Agent thread' : label[0].toUpperCase() + label.slice(1);
	return new AgentControlPlaneApiError(404, `${labelText} not found.`, {
		code: `${label}_not_found`,
		suggestedNextCommands: options.suggestedNextCommands ?? [
			label === 'agent_thread' ? 'thread:list' : `${label}:list`,
			'context:current'
		],
		details: options.id ? { [`${label}Id`]: options.id } : undefined
	});
}

function translateTaskGovernanceError(taskId: string, error: TaskGovernanceActionError) {
	const normalizedMessage = error.message.toLowerCase();

	if (normalizedMessage.includes('open review already exists')) {
		return new AgentControlPlaneApiError(error.status, error.message, {
			code: 'review_already_open',
			suggestedNextCommands: ['task:get', 'task:approve-review', 'task:request-review-changes'],
			details: { taskId }
		});
	}

	if (normalizedMessage.includes('pending approval already exists')) {
		return new AgentControlPlaneApiError(error.status, error.message, {
			code: 'approval_already_pending',
			suggestedNextCommands: ['task:get', 'task:approve-approval', 'task:reject-approval'],
			details: { taskId }
		});
	}

	if (normalizedMessage.includes('no open review found')) {
		return new AgentControlPlaneApiError(error.status, error.message, {
			code: 'review_not_found',
			suggestedNextCommands: ['task:get', 'task:request-review'],
			details: { taskId }
		});
	}

	if (normalizedMessage.includes('no pending approval found')) {
		return new AgentControlPlaneApiError(error.status, error.message, {
			code: 'approval_not_found',
			suggestedNextCommands: ['task:get', 'task:request-approval'],
			details: { taskId }
		});
	}

	if (normalizedMessage.includes('approval mode must be set')) {
		return new AgentControlPlaneApiError(error.status, error.message, {
			code: 'approval_mode_not_configured',
			suggestedNextCommands: ['task:get', 'task:update'],
			details: { taskId }
		});
	}

	if (normalizedMessage.includes('task not found')) {
		return notFoundError('task', {
			id: taskId,
			suggestedNextCommands: ['task:list', 'context:current']
		});
	}

	return new AgentControlPlaneApiError(error.status, error.message, {
		code: 'task_governance_error',
		suggestedNextCommands: ['task:get', 'context:current'],
		details: { taskId }
	});
}

function translateTaskChildHandoffError(taskId: string, error: TaskChildHandoffActionError) {
	const normalizedMessage = error.message.toLowerCase();

	if (normalizedMessage.includes('task not found')) {
		return notFoundError('task', {
			id: taskId,
			suggestedNextCommands: ['task:list', 'context:current']
		});
	}

	if (normalizedMessage.includes('child task')) {
		return new AgentControlPlaneApiError(error.status, error.message, {
			code: 'child_handoff_invalid_child_task',
			suggestedNextCommands: ['task:get', 'task:decompose'],
			details: { taskId }
		});
	}

	return new AgentControlPlaneApiError(error.status, error.message, {
		code: 'child_handoff_error',
		suggestedNextCommands: ['task:get', 'context:current'],
		details: { taskId }
	});
}

function translateTaskSessionError(taskId: string, error: TaskSessionActionError) {
	const normalizedMessage = error.message.toLowerCase();

	if (normalizedMessage.includes('task not found')) {
		return notFoundError('task', {
			id: taskId,
			suggestedNextCommands: ['task:list', 'context:current']
		});
	}

	return new AgentControlPlaneApiError(error.status, error.message, {
		code: normalizedMessage.includes('recover')
			? 'task_session_recover_error'
			: 'task_session_launch_error',
		suggestedNextCommands: ['task:get', 'context:current'],
		details: { taskId }
	});
}

function translateTaskDetailMutationError(taskId: string, error: TaskDetailMutationActionError) {
	const normalizedMessage = error.message.toLowerCase();

	if (normalizedMessage.includes('task not found')) {
		return notFoundError('task', {
			id: taskId,
			suggestedNextCommands: ['task:list', 'context:current']
		});
	}

	if (normalizedMessage.includes('attachment')) {
		return new AgentControlPlaneApiError(error.status, error.message, {
			code: 'task_attachment_error',
			suggestedNextCommands: ['task:get'],
			details: { taskId }
		});
	}

	return new AgentControlPlaneApiError(error.status, error.message, {
		code: 'task_detail_mutation_error',
		suggestedNextCommands: ['task:get'],
		details: { taskId }
	});
}

function translateTaskDecompositionError(taskId: string, error: TaskDecompositionActionError) {
	return new AgentControlPlaneApiError(error.status, error.message, {
		code: 'task_decomposition_error',
		suggestedNextCommands: ['task:get', 'context:current'],
		details: { taskId }
	});
}

function normalizeGoalTargetDate(value: string | null | undefined) {
	if (value === undefined) {
		return undefined;
	}

	if (value === null) {
		return null;
	}

	const normalized = readTrimmedString(value);

	if (!normalized) {
		return null;
	}

	if (!isValidTaskDate(normalized)) {
		throw new AgentControlPlaneApiError(400, 'Target date must use YYYY-MM-DD format.');
	}

	return normalized;
}

function validateGoalReferences(args: {
	data: ControlPlaneData;
	goalId?: string | null;
	parentGoalId: string | null;
	projectIds: string[];
	taskIds: string[];
}) {
	const { data, goalId = null, parentGoalId, projectIds, taskIds } = args;

	if (parentGoalId && !data.goals.some((goal) => goal.id === parentGoalId)) {
		throw new AgentControlPlaneApiError(400, 'Parent goal not found.');
	}

	if (goalId && wouldCreateGoalCycle(data, goalId, parentGoalId)) {
		throw new AgentControlPlaneApiError(400, 'This parent goal would create a cycle.');
	}

	if (projectIds.some((projectId) => !data.projects.some((project) => project.id === projectId))) {
		throw new AgentControlPlaneApiError(
			400,
			'One or more selected project ids are no longer available.'
		);
	}

	if (taskIds.some((taskId) => !data.tasks.some((task) => task.id === taskId))) {
		throw new AgentControlPlaneApiError(
			400,
			'One or more selected task ids are no longer available.'
		);
	}
}

function resolveGoalArtifactPath(args: {
	data: ControlPlaneData;
	parentGoalId: string | null;
	projectIds: string[];
	taskIds: string[];
	artifactPath?: string | null;
	fallback?: string;
}) {
	return (
		normalizePathInput(args.artifactPath) ||
		suggestGoalArtifactPath({
			data: args.data,
			parentGoalId: args.parentGoalId,
			projectIds: args.projectIds,
			taskIds: args.taskIds
		}) ||
		args.fallback ||
		''
	);
}

export function listAgentApiProjects(
	data: ControlPlaneData,
	filters: AgentProjectListFilters = {}
) {
	const normalizedQuery = normalizeSearchValue(filters.q);
	const limit = clampLimit(filters.limit ?? null, 100);

	return [...data.projects]
		.filter((project) =>
			matchesSearch([project.id, project.name, project.summary], normalizedQuery)
		)
		.sort((left, right) => left.name.localeCompare(right.name))
		.slice(0, limit)
		.map((project) => ({
			...project,
			taskCount: data.tasks.filter((task) => task.projectId === project.id).length,
			goalCount: data.goals.filter((goal) => goalLinksProject(goal, project)).length
		}));
}

export function listAgentApiGoals(data: ControlPlaneData, filters: AgentGoalListFilters = {}) {
	const normalizedQuery = normalizeSearchValue(filters.q);
	const normalizedProjectId = readTrimmedString(filters.projectId ?? '');
	const normalizedStatus = readTrimmedString(filters.status ?? '');
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const limit = clampLimit(filters.limit ?? null, 100);

	return [...data.goals]
		.filter((goal) => (normalizedStatus ? goal.status === normalizedStatus : true))
		.filter((goal) =>
			normalizedProjectId
				? (goal.projectIds ?? []).includes(normalizedProjectId) ||
					data.tasks.some(
						(task) => task.goalId === goal.id && task.projectId === normalizedProjectId
					)
				: true
		)
		.filter((goal) =>
			matchesSearch(
				[goal.id, goal.name, goal.summary, goal.successSignal, ...(goal.projectIds ?? [])],
				normalizedQuery
			)
		)
		.sort((left, right) => left.name.localeCompare(right.name))
		.slice(0, limit)
		.map((goal) => ({
			...goal,
			projectNames: (goal.projectIds ?? [])
				.map((projectId) => projectMap.get(projectId)?.name ?? '')
				.filter(Boolean)
		}));
}

export function listAgentApiTasks(data: ControlPlaneData, filters: AgentTaskListFilters = {}) {
	const normalizedQuery = normalizeSearchValue(filters.q);
	const normalizedProjectId = readTrimmedString(filters.projectId ?? '');
	const normalizedGoalId = readTrimmedString(filters.goalId ?? '');
	const normalizedStatus = readTrimmedString(filters.status ?? '');
	const projectMap = new Map(data.projects.map((project) => [project.id, project.name]));
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal.name]));
	const limit = clampLimit(filters.limit ?? null, 100);

	return [...data.tasks]
		.filter((task) => (normalizedProjectId ? task.projectId === normalizedProjectId : true))
		.filter((task) => (normalizedGoalId ? task.goalId === normalizedGoalId : true))
		.filter((task) => (normalizedStatus ? task.status === normalizedStatus : true))
		.filter((task) =>
			matchesSearch(
				[
					task.id,
					task.title,
					task.summary,
					task.successCriteria,
					task.readyCondition,
					task.expectedOutcome,
					task.blockedReason
				],
				normalizedQuery
			)
		)
		.sort((left, right) => {
			if (right.updatedAt !== left.updatedAt) {
				return right.updatedAt.localeCompare(left.updatedAt);
			}

			return left.title.localeCompare(right.title);
		})
		.slice(0, limit)
		.map((task) => ({
			...task,
			projectName: projectMap.get(task.projectId) ?? '',
			goalName: task.goalId ? (goalMap.get(task.goalId) ?? '') : ''
		}));
}

export async function createAgentApiGoal(input: AgentCreateGoalInput): Promise<Goal> {
	const current = await loadControlPlane();
	const name = readTrimmedString(input.name);
	const summary = readTrimmedString(input.summary);
	const parentGoalId = readNullableString(input.parentGoalId ?? null);
	const projectIds = normalizeIdList(input.projectIds);
	const taskIds = normalizeIdList(input.taskIds);
	const targetDate = normalizeGoalTargetDate(input.targetDate);

	if (!name || !summary) {
		throw new AgentControlPlaneApiError(400, 'name and summary are required.', {
			code: 'missing_goal_fields',
			suggestedNextCommands: ['goal:list', 'goal:create']
		});
	}

	validateGoalReferences({
		data: current,
		parentGoalId,
		projectIds,
		taskIds
	});

	const artifactPath = resolveGoalArtifactPath({
		data: current,
		parentGoalId,
		projectIds,
		taskIds,
		artifactPath: input.artifactPath
	});
	let createdGoal: Goal | null = null;

	await updateControlPlaneCollections((data) => {
		const goal = createGoal({
			name,
			summary,
			successSignal: readTrimmedString(input.successSignal),
			targetDate,
			artifactPath,
			parentGoalId,
			projectIds,
			taskIds,
			area: parseArea(readTrimmedString(input.area), 'product'),
			status: parseGoalStatus(readTrimmedString(input.status), 'ready')
		});
		const nextData = applyGoalRelationships({
			data: {
				...data,
				goals: [goal, ...data.goals]
			},
			goalId: goal.id,
			parentGoalId,
			projectIds,
			taskIds
		});

		createdGoal = nextData.goals.find((candidate) => candidate.id === goal.id) ?? null;

		return {
			data: nextData,
			changedCollections: ['goals', 'tasks']
		};
	});

	if (!createdGoal) {
		throw new AgentControlPlaneApiError(500, 'Goal could not be created.');
	}

	return createdGoal;
}

export async function updateAgentApiGoal(
	goalId: string,
	input: AgentUpdateGoalInput
): Promise<Goal> {
	const normalizedGoalId = readTrimmedString(goalId);

	if (!normalizedGoalId) {
		throw missingIdError('goal');
	}

	const current = await loadControlPlane();
	const existingGoal = current.goals.find((candidate) => candidate.id === normalizedGoalId) ?? null;

	if (!existingGoal) {
		throw notFoundError('goal', { id: normalizedGoalId });
	}

	const name = input.name === undefined ? existingGoal.name : readTrimmedString(input.name);
	const summary =
		input.summary === undefined ? existingGoal.summary : readTrimmedString(input.summary);

	if (!name || !summary) {
		throw new AgentControlPlaneApiError(400, 'name and summary are required.', {
			code: 'missing_goal_fields',
			suggestedNextCommands: ['goal:get', 'goal:update']
		});
	}

	const parentGoalId =
		input.parentGoalId === undefined
			? (existingGoal.parentGoalId ?? null)
			: readNullableString(input.parentGoalId ?? null);
	const projectIds =
		input.projectIds === undefined
			? [...(existingGoal.projectIds ?? [])]
			: normalizeIdList(input.projectIds);
	const taskIds =
		input.taskIds === undefined
			? [...(existingGoal.taskIds ?? [])]
			: normalizeIdList(input.taskIds);
	const targetDate =
		input.targetDate === undefined
			? (existingGoal.targetDate ?? null)
			: normalizeGoalTargetDate(input.targetDate);

	validateGoalReferences({
		data: current,
		goalId: normalizedGoalId,
		parentGoalId,
		projectIds,
		taskIds
	});

	const artifactPath =
		input.artifactPath === undefined
			? existingGoal.artifactPath
			: resolveGoalArtifactPath({
					data: current,
					parentGoalId,
					projectIds,
					taskIds,
					artifactPath: input.artifactPath,
					fallback: existingGoal.artifactPath
				});
	const requestedFields = (
		[
			'name',
			'summary',
			'successSignal',
			'targetDate',
			'artifactPath',
			'parentGoalId',
			'projectIds',
			'taskIds',
			'area',
			'status'
		] as const
	).filter((field) => input[field] !== undefined);
	const now = new Date().toISOString();
	let updatedGoal: Goal | null = null;

	await updateControlPlaneCollections((data) => {
		let nextData = {
			...data,
			goals: data.goals.map((goal) => {
				if (goal.id !== normalizedGoalId) {
					return goal;
				}

				return {
					...goal,
					name,
					summary,
					successSignal:
						input.successSignal !== undefined
							? readTrimmedString(input.successSignal)
							: (existingGoal.successSignal ?? ''),
					targetDate,
					artifactPath,
					area:
						input.area !== undefined
							? parseArea(readTrimmedString(input.area), goal.area)
							: goal.area,
					status:
						input.status !== undefined
							? parseGoalStatus(readTrimmedString(input.status), goal.status)
							: goal.status
				};
			})
		};

		nextData = applyGoalRelationships({
			data: nextData,
			goalId: normalizedGoalId,
			parentGoalId,
			projectIds,
			taskIds
		});
		updatedGoal = nextData.goals.find((candidate) => candidate.id === normalizedGoalId) ?? null;

		if (requestedFields.length > 0) {
			nextData = {
				...nextData,
				decisions: [
					createDecision({
						goalId: normalizedGoalId,
						decisionType: 'goal_plan_updated',
						summary: `Updated goal via agent API: ${requestedFields.join(', ')}.`,
						createdAt: now
					}),
					...(nextData.decisions ?? [])
				]
			};
		}

		return {
			data: nextData,
			changedCollections:
				requestedFields.length > 0 ? ['goals', 'tasks', 'decisions'] : ['goals', 'tasks']
		};
	});

	if (!updatedGoal) {
		throw notFoundError('goal', { id: normalizedGoalId });
	}

	return updatedGoal;
}

export async function createAgentApiProject(input: AgentCreateProjectInput): Promise<Project> {
	const current = await loadControlPlane();
	const name = readTrimmedString(input.name);
	const summary = readTrimmedString(input.summary);
	const parentProjectId = readNullableString(input.parentProjectId ?? null);

	if (!name || !summary) {
		throw new AgentControlPlaneApiError(400, 'name and summary are required.', {
			code: 'missing_project_fields',
			suggestedNextCommands: ['project:list', 'project:create']
		});
	}

	if (parentProjectId && !current.projects.some((project) => project.id === parentProjectId)) {
		throw new AgentControlPlaneApiError(400, 'Parent project not found.', {
			code: 'parent_project_not_found',
			suggestedNextCommands: ['project:list', 'project:get']
		});
	}

	const project = createProject({
		name,
		summary,
		parentProjectId,
		projectRootFolder: normalizePathInput(input.projectRootFolder),
		defaultArtifactRoot: normalizePathInput(input.defaultArtifactRoot),
		defaultRepoPath: normalizePathInput(input.defaultRepoPath),
		defaultRepoUrl: readTrimmedString(input.defaultRepoUrl),
		defaultBranch: readTrimmedString(input.defaultBranch),
		additionalWritableRoots: normalizePathListInput(input.additionalWritableRoots),
		defaultThreadSandbox: normalizeOptionalSandbox(input.defaultThreadSandbox) ?? null,
		defaultModel: readNullableString(input.defaultModel ?? null)
	});

	await updateControlPlaneCollections((data) => ({
		data: {
			...data,
			projects: [project, ...data.projects]
		},
		changedCollections: ['projects']
	}));

	return project;
}

export async function updateAgentApiProject(
	projectId: string,
	input: AgentUpdateProjectInput
): Promise<Project> {
	const normalizedProjectId = readTrimmedString(projectId);

	if (!normalizedProjectId) {
		throw missingIdError('project');
	}

	const current = await loadControlPlane();
	const existingProject =
		current.projects.find((candidate) => candidate.id === normalizedProjectId) ?? null;

	if (!existingProject) {
		throw notFoundError('project', { id: normalizedProjectId });
	}

	const name = input.name === undefined ? existingProject.name : readTrimmedString(input.name);
	const summary =
		input.summary === undefined ? existingProject.summary : readTrimmedString(input.summary);

	if (!name || !summary) {
		throw new AgentControlPlaneApiError(400, 'name and summary are required.', {
			code: 'missing_project_fields',
			suggestedNextCommands: ['project:get', 'project:update']
		});
	}

	const parentProjectId =
		input.parentProjectId === undefined
			? (existingProject.parentProjectId ?? null)
			: readNullableString(input.parentProjectId ?? null);

	if (parentProjectId && !current.projects.some((project) => project.id === parentProjectId)) {
		throw new AgentControlPlaneApiError(400, 'Parent project not found.', {
			code: 'parent_project_not_found',
			suggestedNextCommands: ['project:list', 'project:get']
		});
	}

	if (wouldCreateProjectCycle(current.projects, normalizedProjectId, parentProjectId)) {
		throw new AgentControlPlaneApiError(400, 'This parent project would create a cycle.');
	}

	let updatedProject: Project | null = null;

	await updateControlPlaneCollections((data) => ({
		data: {
			...data,
			projects: data.projects.map((project) => {
				if (project.id !== normalizedProjectId) {
					return project;
				}

				updatedProject = {
					...project,
					name,
					summary,
					parentProjectId,
					projectRootFolder:
						input.projectRootFolder !== undefined
							? (normalizeOptionalPath(input.projectRootFolder) ?? '')
							: project.projectRootFolder,
					defaultArtifactRoot:
						input.defaultArtifactRoot !== undefined
							? (normalizeOptionalPath(input.defaultArtifactRoot) ?? '')
							: project.defaultArtifactRoot,
					defaultRepoPath:
						input.defaultRepoPath !== undefined
							? (normalizeOptionalPath(input.defaultRepoPath) ?? '')
							: project.defaultRepoPath,
					defaultRepoUrl:
						input.defaultRepoUrl !== undefined
							? readTrimmedString(input.defaultRepoUrl)
							: project.defaultRepoUrl,
					defaultBranch:
						input.defaultBranch !== undefined
							? readTrimmedString(input.defaultBranch)
							: project.defaultBranch,
					additionalWritableRoots:
						input.additionalWritableRoots !== undefined
							? normalizePathListInput(input.additionalWritableRoots)
							: project.additionalWritableRoots,
					defaultThreadSandbox:
						input.defaultThreadSandbox !== undefined
							? (normalizeOptionalSandbox(input.defaultThreadSandbox) ?? null)
							: project.defaultThreadSandbox,
					defaultModel:
						input.defaultModel !== undefined
							? readNullableString(input.defaultModel)
							: project.defaultModel
				};

				return updatedProject;
			})
		},
		changedCollections: ['projects']
	}));

	if (!updatedProject) {
		throw notFoundError('project', { id: normalizedProjectId });
	}

	return updatedProject;
}

export async function attachAgentApiTaskFile(taskId: string, input: AgentTaskAttachmentInput) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	const sourcePath = readTrimmedString(input.path);

	if (!sourcePath) {
		throw new AgentControlPlaneApiError(400, 'path is required.');
	}

	try {
		return await attachTaskFileFromPath({
			taskId: normalizedTaskId,
			sourcePath,
			name: readTrimmedString(input.name) || undefined,
			contentType: readTrimmedString(input.contentType) || undefined
		});
	} catch (error) {
		if (error instanceof TaskDetailMutationActionError) {
			throw translateTaskDetailMutationError(normalizedTaskId, error);
		}

		throw error;
	}
}

export async function removeAgentApiTaskAttachment(taskId: string, attachmentId: string) {
	const normalizedTaskId = readTrimmedString(taskId);
	const normalizedAttachmentId = readTrimmedString(attachmentId);

	if (!normalizedTaskId || !normalizedAttachmentId) {
		throw new AgentControlPlaneApiError(400, 'Task id and attachment id are required.');
	}

	try {
		return await removeTaskAttachmentById(normalizedTaskId, normalizedAttachmentId);
	} catch (error) {
		if (error instanceof TaskDetailMutationActionError) {
			throw translateTaskDetailMutationError(normalizedTaskId, error);
		}

		throw error;
	}
}

export async function requestAgentApiTaskReview(
	taskId: string,
	input: AgentTaskReviewRequestInput
) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	try {
		return await requestTaskReview({
			taskId: normalizedTaskId,
			sourceLabel: 'agent API',
			summary: readTrimmedString(input.summary) || undefined,
			requestedByExecutionSurfaceId: readNullableString(
				input.requestedByExecutionSurfaceId ?? null
			),
			reviewerExecutionSurfaceId: readNullableString(input.reviewerExecutionSurfaceId ?? null)
		});
	} catch (error) {
		if (error instanceof TaskGovernanceActionError) {
			throw translateTaskGovernanceError(normalizedTaskId, error);
		}

		throw error;
	}
}

export async function previewAgentApiTaskReviewRequest(
	taskId: string,
	input: AgentTaskReviewRequestInput
) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	const current = await loadControlPlane();
	const task = current.tasks.find((candidate) => candidate.id === normalizedTaskId) ?? null;

	if (!task) {
		throw missingIdError('task');
	}

	if (getOpenReviewForTask(current, normalizedTaskId)) {
		throw new AgentControlPlaneApiError(409, 'An open review already exists for this task.', {
			code: 'task_review_already_open',
			suggestedNextCommands: ['task:get', 'context:current'],
			details: { taskId: normalizedTaskId }
		});
	}

	const requestedByExecutionSurfaceId = readNullableString(
		input.requestedByExecutionSurfaceId ?? null
	);
	const reviewerExecutionSurfaceId = readNullableString(input.reviewerExecutionSurfaceId ?? null);

	if (
		requestedByExecutionSurfaceId &&
		!current.executionSurfaces.some((surface) => surface.id === requestedByExecutionSurfaceId)
	) {
		throw new AgentControlPlaneApiError(400, 'Requesting execution surface was not found.', {
			code: 'execution_surface_not_found',
			suggestedNextCommands: ['context:current'],
			details: { executionSurfaceId: requestedByExecutionSurfaceId }
		});
	}

	if (
		reviewerExecutionSurfaceId &&
		!current.executionSurfaces.some((surface) => surface.id === reviewerExecutionSurfaceId)
	) {
		throw new AgentControlPlaneApiError(400, 'Reviewer execution surface was not found.', {
			code: 'execution_surface_not_found',
			suggestedNextCommands: ['context:current'],
			details: { executionSurfaceId: reviewerExecutionSurfaceId }
		});
	}

	return {
		validationOnly: true,
		valid: true,
		action: 'requestReview' as const,
		taskId: normalizedTaskId,
		checks: [
			`Task ${normalizedTaskId} exists.`,
			`No open review currently exists for task ${normalizedTaskId}.`
		],
		preview: {
			summary: readTrimmedString(input.summary) || 'Review requested from the agent API.',
			requestedByExecutionSurfaceId,
			reviewerExecutionSurfaceId
		},
		suggestedNextCommands: ['task:request-review', 'task:get', 'context:current']
	};
}

export async function requestAgentApiTaskApproval(
	taskId: string,
	input: AgentTaskApprovalRequestInput
) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	try {
		return await requestTaskApproval({
			taskId: normalizedTaskId,
			sourceLabel: 'agent API',
			mode: readNullableString(input.mode ?? null),
			summary: readTrimmedString(input.summary) || undefined,
			requestedByExecutionSurfaceId: readNullableString(
				input.requestedByExecutionSurfaceId ?? null
			),
			approverExecutionSurfaceId: readNullableString(input.approverExecutionSurfaceId ?? null)
		});
	} catch (error) {
		if (error instanceof TaskGovernanceActionError) {
			throw translateTaskGovernanceError(normalizedTaskId, error);
		}

		throw error;
	}
}

export async function previewAgentApiTaskApprovalRequest(
	taskId: string,
	input: AgentTaskApprovalRequestInput
) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	const current = await loadControlPlane();
	const task = current.tasks.find((candidate) => candidate.id === normalizedTaskId) ?? null;

	if (!task) {
		throw missingIdError('task');
	}

	if (getPendingApprovalForTask(current, normalizedTaskId)) {
		throw new AgentControlPlaneApiError(409, 'A pending approval already exists for this task.', {
			code: 'task_approval_already_pending',
			suggestedNextCommands: ['task:get', 'context:current'],
			details: { taskId: normalizedTaskId }
		});
	}

	const requestedByExecutionSurfaceId = readNullableString(
		input.requestedByExecutionSurfaceId ?? null
	);
	const approverExecutionSurfaceId = readNullableString(input.approverExecutionSurfaceId ?? null);

	if (
		requestedByExecutionSurfaceId &&
		!current.executionSurfaces.some((surface) => surface.id === requestedByExecutionSurfaceId)
	) {
		throw new AgentControlPlaneApiError(400, 'Requesting execution surface was not found.', {
			code: 'execution_surface_not_found',
			suggestedNextCommands: ['context:current'],
			details: { executionSurfaceId: requestedByExecutionSurfaceId }
		});
	}

	if (
		approverExecutionSurfaceId &&
		!current.executionSurfaces.some((surface) => surface.id === approverExecutionSurfaceId)
	) {
		throw new AgentControlPlaneApiError(400, 'Approver execution surface was not found.', {
			code: 'execution_surface_not_found',
			suggestedNextCommands: ['context:current'],
			details: { executionSurfaceId: approverExecutionSurfaceId }
		});
	}

	const mode = parseTaskApprovalMode(readTrimmedString(input.mode ?? ''), task.approvalMode);

	if (mode === 'none') {
		throw new AgentControlPlaneApiError(
			400,
			'Task approval mode must be set before requesting approval.',
			{
				code: 'task_approval_mode_required',
				suggestedNextCommands: ['task:update', 'context:current'],
				details: { taskId: normalizedTaskId }
			}
		);
	}

	return {
		validationOnly: true,
		valid: true,
		action: 'requestApproval' as const,
		taskId: normalizedTaskId,
		checks: [
			`Task ${normalizedTaskId} exists.`,
			`No pending approval currently exists for task ${normalizedTaskId}.`,
			`Approval mode resolves to ${mode}.`
		],
		preview: {
			mode,
			summary: readTrimmedString(input.summary) || 'Approval requested from the agent API.',
			requestedByExecutionSurfaceId,
			approverExecutionSurfaceId
		},
		suggestedNextCommands: ['task:request-approval', 'task:get', 'context:current']
	};
}

export async function previewAgentApiTaskReviewDecision(
	taskId: string,
	decision: 'approve' | 'changes_requested'
) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	const current = await loadControlPlane();
	const task = current.tasks.find((candidate) => candidate.id === normalizedTaskId) ?? null;
	const openReview = getOpenReviewForTask(current, normalizedTaskId);
	const pendingApproval = getPendingApprovalForTask(current, normalizedTaskId);

	if (!task || !openReview) {
		throw new AgentControlPlaneApiError(404, 'No open review found for this task.', {
			code: 'review_not_found',
			suggestedNextCommands: ['task:get', 'task:request-review'],
			details: { taskId: normalizedTaskId }
		});
	}

	if (decision === 'approve') {
		const shouldCloseTask = !pendingApproval;

		return {
			validationOnly: true,
			valid: true,
			action: 'approveReview' as const,
			taskId: normalizedTaskId,
			checks: [
				`Task ${normalizedTaskId} exists.`,
				`Open review ${openReview.id} can be approved now.`,
				shouldCloseTask
					? 'Approving this review would close the task because no pending approval remains.'
					: 'Approving this review would keep the task open because a pending approval still exists.'
			],
			preview: {
				reviewId: openReview.id,
				resultingTaskStatus: shouldCloseTask ? 'done' : task.status,
				pendingApprovalId: pendingApproval?.id ?? null
			},
			suggestedNextCommands: ['task:approve-review', 'task:get', 'context:current']
		};
	}

	return {
		validationOnly: true,
		valid: true,
		action: 'requestReviewChanges' as const,
		taskId: normalizedTaskId,
		checks: [
			`Task ${normalizedTaskId} exists.`,
			`Open review ${openReview.id} can be returned with changes requested.`
		],
		preview: {
			reviewId: openReview.id,
			resultingTaskStatus: 'blocked',
			blockedReason: 'Changes requested during review.'
		},
		suggestedNextCommands: ['task:request-review-changes', 'task:get', 'context:current']
	};
}

export async function previewAgentApiTaskApprovalDecision(
	taskId: string,
	decision: 'approve' | 'reject'
) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	const current = await loadControlPlane();
	const task = current.tasks.find((candidate) => candidate.id === normalizedTaskId) ?? null;
	const pendingApproval = getPendingApprovalForTask(current, normalizedTaskId);
	const openReview = getOpenReviewForTask(current, normalizedTaskId);

	if (!task || !pendingApproval) {
		throw new AgentControlPlaneApiError(404, 'No pending approval found for this task.', {
			code: 'approval_not_found',
			suggestedNextCommands: ['task:get', 'task:request-approval'],
			details: { taskId: normalizedTaskId }
		});
	}

	if (decision === 'approve') {
		const shouldCloseTask = pendingApproval.mode === 'before_complete' && !openReview;

		return {
			validationOnly: true,
			valid: true,
			action: 'approveApproval' as const,
			taskId: normalizedTaskId,
			checks: [
				`Task ${normalizedTaskId} exists.`,
				`Pending approval ${pendingApproval.id} can be approved now.`,
				shouldCloseTask
					? `Approving the ${pendingApproval.mode} gate would close the task.`
					: `Approving the ${pendingApproval.mode} gate would keep the task open.`
			],
			preview: {
				approvalId: pendingApproval.id,
				mode: pendingApproval.mode,
				resultingTaskStatus: shouldCloseTask ? 'done' : task.status,
				openReviewId: openReview?.id ?? null
			},
			suggestedNextCommands: ['task:approve-approval', 'task:get', 'context:current']
		};
	}

	return {
		validationOnly: true,
		valid: true,
		action: 'rejectApproval' as const,
		taskId: normalizedTaskId,
		checks: [
			`Task ${normalizedTaskId} exists.`,
			`Pending approval ${pendingApproval.id} can be rejected now.`
		],
		preview: {
			approvalId: pendingApproval.id,
			mode: pendingApproval.mode,
			resultingTaskStatus: 'blocked',
			blockedReason: `${pendingApproval.mode} approval rejected.`
		},
		suggestedNextCommands: ['task:reject-approval', 'task:get', 'context:current']
	};
}

export async function approveAgentApiTaskReview(taskId: string) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	try {
		return await approveTaskReview(normalizedTaskId, 'agent API');
	} catch (error) {
		if (error instanceof TaskGovernanceActionError) {
			throw translateTaskGovernanceError(normalizedTaskId, error);
		}

		throw error;
	}
}

export async function requestAgentApiTaskReviewChanges(taskId: string) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	try {
		return await requestTaskReviewChanges(normalizedTaskId, 'agent API');
	} catch (error) {
		if (error instanceof TaskGovernanceActionError) {
			throw translateTaskGovernanceError(normalizedTaskId, error);
		}

		throw error;
	}
}

export async function approveAgentApiTaskApproval(taskId: string) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	try {
		return await approveTaskApproval(normalizedTaskId, 'agent API');
	} catch (error) {
		if (error instanceof TaskGovernanceActionError) {
			throw translateTaskGovernanceError(normalizedTaskId, error);
		}

		throw error;
	}
}

export async function rejectAgentApiTaskApproval(taskId: string) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	try {
		return await rejectTaskApproval(normalizedTaskId);
	} catch (error) {
		if (error instanceof TaskGovernanceActionError) {
			throw translateTaskGovernanceError(normalizedTaskId, error);
		}

		throw error;
	}
}

function buildChildHandoffForm(input: AgentTaskChildHandoffInput) {
	const form = new FormData();
	const childTaskId = readTrimmedString(input.childTaskId);
	const summary = readTrimmedString(input.summary);

	if (childTaskId) {
		form.set('childTaskId', childTaskId);
	}

	if (summary) {
		form.set('summary', summary);
	}

	return form;
}

export async function previewAgentApiTaskChildHandoffDecision(
	parentTaskId: string,
	input: AgentTaskChildHandoffInput,
	decision: 'accept' | 'changes_requested'
) {
	const normalizedTaskId = readTrimmedString(parentTaskId);
	const childTaskId = readTrimmedString(input.childTaskId ?? '');

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	if (!childTaskId) {
		throw new AgentControlPlaneApiError(400, 'childTaskId is required.', {
			code: 'missing_childTaskId',
			suggestedNextCommands: [
				'task:get',
				decision === 'accept' ? 'task:accept-child-handoff' : 'task:request-child-handoff-changes'
			],
			details: { taskId: normalizedTaskId }
		});
	}

	const current = await loadControlPlane();
	const parentTask = current.tasks.find((candidate) => candidate.id === normalizedTaskId) ?? null;
	const childTask = current.tasks.find((candidate) => candidate.id === childTaskId) ?? null;

	if (!parentTask) {
		throw missingIdError('task');
	}

	if (!childTask || childTask.parentTaskId !== parentTask.id) {
		throw new AgentControlPlaneApiError(404, 'Delegated child task not found.', {
			code: 'child_handoff_invalid_child_task',
			suggestedNextCommands: ['task:get', 'task:decompose'],
			details: { taskId: normalizedTaskId, childTaskId }
		});
	}

	if (childTask.delegationAcceptance) {
		throw new AgentControlPlaneApiError(
			409,
			decision === 'accept'
				? 'This child handoff has already been accepted.'
				: 'Accepted child handoffs cannot be returned for follow-up.',
			{
				code: 'child_handoff_already_accepted',
				suggestedNextCommands: ['task:get', 'context:current'],
				details: { taskId: normalizedTaskId, childTaskId }
			}
		);
	}

	if (childTask.status !== 'done') {
		throw new AgentControlPlaneApiError(
			409,
			decision === 'accept'
				? 'Only completed child tasks can be accepted into the parent.'
				: 'Only completed child tasks can be returned for follow-up.',
			{
				code: 'child_handoff_task_not_done',
				suggestedNextCommands: ['task:get', 'context:current'],
				details: { taskId: normalizedTaskId, childTaskId, status: childTask.status }
			}
		);
	}

	const summary =
		readTrimmedString(input.summary) ||
		(decision === 'accept'
			? `Accepted child handoff into parent task "${parentTask.title}".`
			: 'Parent task requested follow-up before accepting this child handoff.');

	return {
		validationOnly: true,
		valid: true,
		action:
			decision === 'accept'
				? ('acceptChildHandoff' as const)
				: ('requestChildHandoffChanges' as const),
		taskId: normalizedTaskId,
		checks: [
			`Parent task ${parentTask.id} exists.`,
			`Child task ${childTask.id} belongs to parent task ${parentTask.id}.`,
			`Child task ${childTask.id} is complete and eligible for ${decision === 'accept' ? 'acceptance' : 'follow-up request'}.`
		],
		preview: {
			childTaskId,
			decision,
			summary,
			resultingChildStatus: decision === 'accept' ? childTask.status : 'blocked'
		},
		suggestedNextCommands: [
			decision === 'accept' ? 'task:accept-child-handoff' : 'task:request-child-handoff-changes',
			'task:get',
			'context:current'
		]
	};
}

export async function acceptAgentApiTaskChildHandoff(
	parentTaskId: string,
	input: AgentTaskChildHandoffInput
) {
	const normalizedTaskId = readTrimmedString(parentTaskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	try {
		return await acceptTaskChildHandoff(normalizedTaskId, buildChildHandoffForm(input));
	} catch (error) {
		if (error instanceof TaskChildHandoffActionError) {
			throw translateTaskChildHandoffError(normalizedTaskId, error);
		}

		throw error;
	}
}

export async function requestAgentApiTaskChildHandoffChanges(
	parentTaskId: string,
	input: AgentTaskChildHandoffInput
) {
	const normalizedTaskId = readTrimmedString(parentTaskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	try {
		return await requestTaskChildHandoffChanges(normalizedTaskId, buildChildHandoffForm(input));
	} catch (error) {
		if (error instanceof TaskChildHandoffActionError) {
			throw translateTaskChildHandoffError(normalizedTaskId, error);
		}

		throw error;
	}
}

export async function launchAgentApiTaskSession(taskId: string) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	try {
		return await launchTaskSession(normalizedTaskId, new FormData());
	} catch (error) {
		if (error instanceof TaskSessionActionError) {
			throw translateTaskSessionError(normalizedTaskId, error);
		}

		throw error;
	}
}

export async function recoverAgentApiTaskSession(taskId: string) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	try {
		return await recoverTaskSession(normalizedTaskId, new FormData());
	} catch (error) {
		if (error instanceof TaskSessionActionError) {
			throw translateTaskSessionError(normalizedTaskId, error);
		}

		throw error;
	}
}

export async function decomposeAgentApiTask(taskId: string, input: AgentTaskDecomposeInput) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	const children: TaskDecompositionTemplateInput[] = normalizeAgentTaskDecomposeChildren(input);

	try {
		return await decomposeTaskFromTemplates(normalizedTaskId, children);
	} catch (error) {
		if (error instanceof TaskDecompositionActionError) {
			throw translateTaskDecompositionError(normalizedTaskId, error);
		}

		throw error;
	}
}

export async function previewAgentApiTaskDecomposition(
	taskId: string,
	input: AgentTaskDecomposeInput
) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	const current = await loadControlPlane();
	const parentTask = current.tasks.find((candidate) => candidate.id === normalizedTaskId) ?? null;

	if (!parentTask) {
		throw missingIdError('task');
	}

	const children: TaskDecompositionTemplateInput[] = normalizeAgentTaskDecomposeChildren(input);

	if (children.length === 0) {
		throw new AgentControlPlaneApiError(
			400,
			'Select at least one child template before decomposing this task.',
			{
				code: 'task_decomposition_requires_children',
				suggestedNextCommands: ['task:get'],
				details: { taskId: normalizedTaskId }
			}
		);
	}

	if (children.length > 3) {
		throw new AgentControlPlaneApiError(
			400,
			'A task can only decompose into 3 child templates at once.',
			{
				code: 'task_decomposition_too_many_children',
				suggestedNextCommands: ['task:get'],
				details: { taskId: normalizedTaskId, childCount: children.length }
			}
		);
	}

	if (parentTask.status === 'done') {
		throw new AgentControlPlaneApiError(
			409,
			'Completed tasks cannot create new delegated child tasks.',
			{
				code: 'task_decomposition_parent_done',
				suggestedNextCommands: ['task:get', 'task:update'],
				details: { taskId: normalizedTaskId }
			}
		);
	}

	const existingChildCount = current.tasks.filter(
		(candidate) => candidate.parentTaskId === parentTask.id
	).length;

	if (existingChildCount + children.length > 3) {
		throw new AgentControlPlaneApiError(
			409,
			`This task already has ${existingChildCount} delegated child task${existingChildCount === 1 ? '' : 's'}. The current fan-out limit is 3.`,
			{
				code: 'task_decomposition_fanout_limit',
				suggestedNextCommands: ['task:get'],
				details: {
					taskId: normalizedTaskId,
					existingChildCount,
					requestedChildCount: children.length
				}
			}
		);
	}

	for (const [index, child] of children.entries()) {
		if (!child.title || !child.instructions) {
			throw new AgentControlPlaneApiError(
				400,
				`Child template ${index + 1} needs both a title and a work brief.`,
				{
					code: 'task_decomposition_invalid_child',
					suggestedNextCommands: ['task:get'],
					details: { taskId: normalizedTaskId, childIndex: index + 1 }
				}
			);
		}

		if (!child.delegationObjective) {
			throw new AgentControlPlaneApiError(
				400,
				`Child template ${index + 1} needs a delegation objective.`,
				{
					code: 'task_decomposition_invalid_child',
					suggestedNextCommands: ['task:get'],
					details: { taskId: normalizedTaskId, childIndex: index + 1 }
				}
			);
		}

		if (!child.delegationDoneCondition) {
			throw new AgentControlPlaneApiError(
				400,
				`Child template ${index + 1} needs a done condition.`,
				{
					code: 'task_decomposition_invalid_child',
					suggestedNextCommands: ['task:get'],
					details: { taskId: normalizedTaskId, childIndex: index + 1 }
				}
			);
		}

		if (!child.desiredRoleId || !current.roles.some((role) => role.id === child.desiredRoleId)) {
			throw new AgentControlPlaneApiError(
				400,
				`Child template ${index + 1} needs a valid desired role.`,
				{
					code: 'task_decomposition_invalid_child_role',
					suggestedNextCommands: ['task:get'],
					details: {
						taskId: normalizedTaskId,
						childIndex: index + 1,
						desiredRoleId: child.desiredRoleId || null
					}
				}
			);
		}
	}

	return {
		validationOnly: true,
		valid: true,
		action: 'decomposeTask' as const,
		taskId: normalizedTaskId,
		checks: [
			`Parent task ${normalizedTaskId} exists and is not done.`,
			`${existingChildCount} delegated child task${existingChildCount === 1 ? '' : 's'} already exist.`,
			`${children.length} child template${children.length === 1 ? '' : 's'} passed structural validation.`
		],
		preview: {
			createdChildCount: children.length,
			children: children.map((child) => ({
				title: child.title,
				desiredRoleId: child.desiredRoleId,
				delegationObjective: child.delegationObjective,
				delegationDoneCondition: child.delegationDoneCondition
			}))
		},
		suggestedNextCommands: ['task:decompose', 'task:get', 'context:current']
	};
}

async function validateCommonTaskReferences(
	data: ControlPlaneData,
	input: {
		desiredRoleId?: string | null;
		assigneeExecutionSurfaceId?: string | null;
		agentThreadId?: string | null;
		dependencyTaskIds?: string[];
		targetDate?: string | null;
	}
) {
	if (
		input.desiredRoleId &&
		!data.roles.some((candidate) => candidate.id === input.desiredRoleId)
	) {
		throw new AgentControlPlaneApiError(400, 'Desired role not found.');
	}

	if (
		input.assigneeExecutionSurfaceId &&
		!data.executionSurfaces.some((candidate) => candidate.id === input.assigneeExecutionSurfaceId)
	) {
		throw new AgentControlPlaneApiError(400, 'Execution surface not found.');
	}

	if (input.agentThreadId) {
		const thread = await getAgentThread(input.agentThreadId);

		if (!thread) {
			throw new AgentControlPlaneApiError(400, 'Agent thread not found.');
		}
	}

	if (
		input.dependencyTaskIds &&
		input.dependencyTaskIds.some(
			(dependencyTaskId) => !data.tasks.some((candidate) => candidate.id === dependencyTaskId)
		)
	) {
		throw new AgentControlPlaneApiError(
			400,
			'One or more dependency task ids are no longer available.'
		);
	}

	if (input.targetDate && !isValidTaskDate(input.targetDate)) {
		throw new AgentControlPlaneApiError(400, 'Target date must use YYYY-MM-DD format.');
	}
}

export async function createAgentApiTask(input: AgentCreateTaskInput) {
	const current = await loadControlPlane();
	const title = readTrimmedString(input.title);
	const summary = readTrimmedString(input.summary);
	const projectId = readTrimmedString(input.projectId);
	const goalId = readTrimmedString(input.goalId ?? '');
	const workflowId = readNullableString(input.workflowId ?? null);
	const parentTaskId = readNullableString(input.parentTaskId ?? null);
	const desiredRoleId = readNullableString(input.desiredRoleId ?? null);
	const assigneeExecutionSurfaceId = readNullableString(input.assigneeExecutionSurfaceId ?? null);
	const agentThreadId = readNullableString(input.agentThreadId ?? null);
	const dependencyTaskIds = normalizeIdList(input.dependencyTaskIds);
	const targetDate = readNullableString(input.targetDate ?? null);

	if (!title || !summary || !projectId) {
		throw new AgentControlPlaneApiError(400, 'title, summary, and projectId are required.', {
			code: 'missing_task_fields',
			suggestedNextCommands: ['project:list', 'context:current']
		});
	}

	const project = current.projects.find((candidate) => candidate.id === projectId) ?? null;

	if (!project) {
		throw notFoundError('project', {
			id: projectId,
			suggestedNextCommands: ['project:list', 'context:current']
		});
	}

	if (goalId && !current.goals.some((candidate) => candidate.id === goalId)) {
		throw notFoundError('goal', {
			id: goalId,
			suggestedNextCommands: ['goal:list', 'context:current']
		});
	}

	if (workflowId && !(current.workflows ?? []).some((candidate) => candidate.id === workflowId)) {
		throw new AgentControlPlaneApiError(400, 'Workflow not found.');
	}

	if (parentTaskId && !current.tasks.some((candidate) => candidate.id === parentTaskId)) {
		throw new AgentControlPlaneApiError(400, 'Parent task not found.');
	}

	await validateCommonTaskReferences(current, {
		desiredRoleId,
		assigneeExecutionSurfaceId,
		agentThreadId,
		dependencyTaskIds,
		targetDate
	});

	const executionRequirementInventory = buildExecutionRequirementInventory(current);
	const installedPromptSkills = listInstalledCodexSkills(project.projectRootFolder);
	const status = parseTaskStatus(readTrimmedString(input.status), 'ready');
	const task = createTask({
		title,
		summary,
		successCriteria: readTrimmedString(input.successCriteria),
		readyCondition: readTrimmedString(input.readyCondition),
		expectedOutcome: readTrimmedString(input.expectedOutcome),
		projectId: project.id,
		goalId,
		workflowId,
		parentTaskId,
		area: parseArea(readTrimmedString(input.area), 'product'),
		priority: parsePriority(readTrimmedString(input.priority), 'medium'),
		status,
		riskLevel: parseTaskRiskLevel(readTrimmedString(input.riskLevel), 'medium'),
		approvalMode: parseTaskApprovalMode(readTrimmedString(input.approvalMode), 'none'),
		requiredThreadSandbox: normalizeOptionalSandbox(input.requiredThreadSandbox) ?? null,
		requiresReview: typeof input.requiresReview === 'boolean' ? input.requiresReview : true,
		desiredRoleId: desiredRoleId ?? '',
		assigneeExecutionSurfaceId,
		agentThreadId,
		blockedReason: normalizeTaskBlockedReasonForStatus(
			status,
			readTrimmedString(input.blockedReason)
		),
		dependencyTaskIds,
		targetDate,
		artifactPath:
			normalizePathInput(input.artifactPath) ||
			project.defaultArtifactRoot ||
			project.projectRootFolder,
		requiredPromptSkillNames: parseExecutionRequirementNames(
			Array.isArray(input.requiredPromptSkillNames)
				? input.requiredPromptSkillNames.join(',')
				: (input.requiredPromptSkillNames ?? '')
		).filter((skillId) => installedPromptSkills.some((skill) => skill.id === skillId)),
		requiredCapabilityNames: parseExecutionRequirementNames(
			Array.isArray(input.requiredCapabilityNames)
				? input.requiredCapabilityNames.join(',')
				: (input.requiredCapabilityNames ?? '')
		).filter((name) => executionRequirementInventory.capabilityNames.includes(name)),
		requiredToolNames: parseExecutionRequirementNames(
			Array.isArray(input.requiredToolNames)
				? input.requiredToolNames.join(',')
				: (input.requiredToolNames ?? '')
		).filter((name) => executionRequirementInventory.toolNames.includes(name))
	});

	await createTaskRecord({
		task,
		goalId
	});

	return task;
}

export async function updateAgentApiTask(taskId: string, input: AgentUpdateTaskInput) {
	const normalizedTaskId = readTrimmedString(taskId);

	if (!normalizedTaskId) {
		throw missingIdError('task');
	}

	const current = await loadControlPlane();
	const existingTask = current.tasks.find((candidate) => candidate.id === normalizedTaskId) ?? null;

	if (!existingTask) {
		throw notFoundError('task', { id: normalizedTaskId });
	}

	const desiredRoleId = input.desiredRoleId === null ? '' : readTrimmedString(input.desiredRoleId);
	const assigneeExecutionSurfaceId =
		input.assigneeExecutionSurfaceId === null
			? ''
			: readTrimmedString(input.assigneeExecutionSurfaceId);
	const agentThreadId = input.agentThreadId === null ? '' : readTrimmedString(input.agentThreadId);
	const dependencyTaskIds =
		input.dependencyTaskIds === undefined
			? undefined
			: normalizeIdList(input.dependencyTaskIds).filter(
					(dependencyTaskId) => dependencyTaskId !== normalizedTaskId
				);
	const targetDate =
		input.targetDate === undefined
			? undefined
			: input.targetDate === null
				? null
				: readTrimmedString(input.targetDate);

	await validateCommonTaskReferences(current, {
		desiredRoleId: input.desiredRoleId === undefined ? undefined : desiredRoleId || null,
		assigneeExecutionSurfaceId:
			input.assigneeExecutionSurfaceId === undefined
				? undefined
				: assigneeExecutionSurfaceId || null,
		agentThreadId: input.agentThreadId === undefined ? undefined : agentThreadId || null,
		dependencyTaskIds,
		targetDate: targetDate ?? null
	});

	const executionRequirementInventory = buildExecutionRequirementInventory(current);
	const project =
		current.projects.find((candidate) => candidate.id === existingTask.projectId) ?? null;
	const installedPromptSkills = project ? listInstalledCodexSkills(project.projectRootFolder) : [];
	const requestedFields = (
		[
			'title',
			'summary',
			'successCriteria',
			'readyCondition',
			'expectedOutcome',
			'priority',
			'status',
			'area',
			'riskLevel',
			'approvalMode',
			'requiredThreadSandbox',
			'requiresReview',
			'desiredRoleId',
			'assigneeExecutionSurfaceId',
			'agentThreadId',
			'blockedReason',
			'dependencyTaskIds',
			'targetDate',
			'artifactPath',
			'requiredPromptSkillNames',
			'requiredCapabilityNames',
			'requiredToolNames'
		] as const
	).filter((field) => input[field] !== undefined);
	const now = new Date().toISOString();

	const updatedTask = await updateTaskRecord({
		taskId: normalizedTaskId,
		update: (task) => {
			const status =
				input.status !== undefined
					? parseTaskStatus(readTrimmedString(input.status), task.status)
					: task.status;
			const requestedBlockedReason =
				input.blockedReason !== undefined
					? readTrimmedString(input.blockedReason)
					: task.blockedReason;
			const nextTask: Task = {
				...task,
				title:
					input.title !== undefined ? readTrimmedString(input.title) || task.title : task.title,
				summary:
					input.summary !== undefined
						? readTrimmedString(input.summary) || task.summary
						: task.summary,
				successCriteria:
					input.successCriteria !== undefined
						? readTrimmedString(input.successCriteria)
						: task.successCriteria,
				readyCondition:
					input.readyCondition !== undefined
						? readTrimmedString(input.readyCondition)
						: task.readyCondition,
				expectedOutcome:
					input.expectedOutcome !== undefined
						? readTrimmedString(input.expectedOutcome)
						: task.expectedOutcome,
				priority:
					input.priority !== undefined
						? parsePriority(readTrimmedString(input.priority), task.priority)
						: task.priority,
				status,
				area:
					input.area !== undefined
						? parseArea(readTrimmedString(input.area), task.area)
						: task.area,
				riskLevel:
					input.riskLevel !== undefined
						? parseTaskRiskLevel(readTrimmedString(input.riskLevel), task.riskLevel)
						: task.riskLevel,
				approvalMode:
					input.approvalMode !== undefined
						? parseTaskApprovalMode(readTrimmedString(input.approvalMode), task.approvalMode)
						: task.approvalMode,
				requiredThreadSandbox:
					input.requiredThreadSandbox !== undefined
						? (normalizeOptionalSandbox(input.requiredThreadSandbox) ?? null)
						: task.requiredThreadSandbox,
				requiresReview:
					typeof input.requiresReview === 'boolean' ? input.requiresReview : task.requiresReview,
				desiredRoleId:
					input.desiredRoleId !== undefined ? desiredRoleId : (task.desiredRoleId ?? ''),
				assigneeExecutionSurfaceId:
					input.assigneeExecutionSurfaceId !== undefined
						? assigneeExecutionSurfaceId || null
						: task.assigneeExecutionSurfaceId,
				agentThreadId:
					input.agentThreadId !== undefined ? agentThreadId || null : task.agentThreadId,
				blockedReason: normalizeTaskBlockedReasonForStatus(status, requestedBlockedReason),
				dependencyTaskIds:
					dependencyTaskIds !== undefined ? dependencyTaskIds : task.dependencyTaskIds,
				targetDate: targetDate !== undefined ? targetDate : task.targetDate,
				artifactPath:
					input.artifactPath !== undefined
						? normalizePathInput(input.artifactPath) ||
							project?.defaultArtifactRoot ||
							project?.projectRootFolder ||
							''
						: task.artifactPath,
				requiredPromptSkillNames:
					input.requiredPromptSkillNames !== undefined
						? parseExecutionRequirementNames(
								Array.isArray(input.requiredPromptSkillNames)
									? input.requiredPromptSkillNames.join(',')
									: input.requiredPromptSkillNames
							).filter((skillId) => installedPromptSkills.some((skill) => skill.id === skillId))
						: task.requiredPromptSkillNames,
				requiredCapabilityNames:
					input.requiredCapabilityNames !== undefined
						? parseExecutionRequirementNames(
								Array.isArray(input.requiredCapabilityNames)
									? input.requiredCapabilityNames.join(',')
									: input.requiredCapabilityNames
							).filter((name) => executionRequirementInventory.capabilityNames.includes(name))
						: task.requiredCapabilityNames,
				requiredToolNames:
					input.requiredToolNames !== undefined
						? parseExecutionRequirementNames(
								Array.isArray(input.requiredToolNames)
									? input.requiredToolNames.join(',')
									: input.requiredToolNames
							).filter((name) => executionRequirementInventory.toolNames.includes(name))
						: task.requiredToolNames,
				updatedAt: now
			};

			return nextTask;
		},
		prependDecisions:
			requestedFields.length > 0
				? [
						createDecision({
							taskId: normalizedTaskId,
							decisionType: 'task_plan_updated',
							summary: `Updated task via agent API: ${requestedFields.join(', ')}.`,
							createdAt: now
						})
					]
				: undefined
	});

	if (!updatedTask) {
		throw notFoundError('task', { id: normalizedTaskId });
	}

	return updatedTask;
}
