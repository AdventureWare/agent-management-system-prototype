import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	AREA_OPTIONS,
	PRIORITY_OPTIONS,
	TASK_APPROVAL_MODE_OPTIONS,
	TASK_RISK_LEVEL_OPTIONS,
	TASK_STATUS_OPTIONS
} from '$lib/types/control-plane';
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
import { selectProjectTaskThreadContext } from '$lib/server/task-thread-compatibility';
import { buildTaskWorkItems } from '$lib/server/task-work-items';
import { getTaskAttachmentRoot, persistTaskAttachments } from '$lib/server/task-attachments';
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import { getWorkspaceExecutionIssue } from '$lib/server/task-execution-workspace';
import {
	applyGoalRelationships,
	getGoalLinkedProjectIds,
	getGoalLinkedTaskIds
} from '$lib/server/goal-relationships';
import type { ControlPlaneData, Goal, Project, Role, Task } from '$lib/types/control-plane';

function readTaskForm(form: FormData) {
	const parseNameList = (value: FormDataEntryValue | null) => [
		...new Set(
			(value?.toString() ?? '')
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean)
		)
	];
	const parseIdList = (values: FormDataEntryValue[]) => [
		...new Set(values.map((value) => value.toString().trim()).filter(Boolean))
	];
	const parseOption = <T extends readonly string[]>(
		options: T,
		value: FormDataEntryValue | null,
		fallback: T[number]
	): T[number] => {
		const normalized = value?.toString().trim() ?? '';
		return options.includes(normalized as T[number]) ? (normalized as T[number]) : fallback;
	};
	const parseBoolean = (value: FormDataEntryValue | null, fallback: boolean) => {
		const normalized = value?.toString().trim().toLowerCase() ?? '';

		if (normalized === 'true') {
			return true;
		}

		if (normalized === 'false') {
			return false;
		}

		return fallback;
	};

	return {
		name: form.get('name')?.toString().trim() ?? '',
		instructions: form.get('instructions')?.toString().trim() ?? '',
		successCriteria: form.get('successCriteria')?.toString().trim() ?? '',
		readyCondition: form.get('readyCondition')?.toString().trim() ?? '',
		expectedOutcome: form.get('expectedOutcome')?.toString().trim() ?? '',
		projectId: form.get('projectId')?.toString().trim() ?? '',
		assigneeWorkerId: form.get('assigneeWorkerId')?.toString().trim() ?? '',
		targetDate: form.get('targetDate')?.toString().trim() ?? '',
		goalId: form.get('goalId')?.toString().trim() ?? '',
		area: parseOption(AREA_OPTIONS, form.get('area'), 'product'),
		priority: parseOption(PRIORITY_OPTIONS, form.get('priority'), 'medium'),
		riskLevel: parseOption(TASK_RISK_LEVEL_OPTIONS, form.get('riskLevel'), 'medium'),
		approvalMode: parseOption(TASK_APPROVAL_MODE_OPTIONS, form.get('approvalMode'), 'none'),
		requiresReview: parseBoolean(form.get('requiresReview'), true),
		desiredRoleId: form.get('desiredRoleId')?.toString().trim() ?? '',
		blockedReason: form.get('blockedReason')?.toString().trim() ?? '',
		dependencyTaskIds: parseIdList(form.getAll('dependencyTaskIds')),
		requiredCapabilityNames: parseNameList(form.get('requiredCapabilityNames')),
		requiredToolNames: parseNameList(form.get('requiredToolNames'))
	};
}

function isValidDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
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

function failTaskCreate(
	status: number,
	payload: {
		message: string;
		name: string;
		instructions: string;
		successCriteria: string;
		readyCondition: string;
		expectedOutcome: string;
		projectId: string;
		assigneeWorkerId: string;
		targetDate: string;
		goalId: string;
		area: string;
		priority: string;
		riskLevel: string;
		approvalMode: string;
		requiresReview: boolean;
		desiredRoleId: string;
		blockedReason: string;
		dependencyTaskIds: string[];
		requiredCapabilityNames: string[];
		requiredToolNames: string[];
		submitMode: 'create' | 'createAndRun';
	}
) {
	return fail(status, {
		formContext: 'taskCreate',
		...payload
	});
}

function getDefaultDraftRole(data: ControlPlaneData): Role | null {
	return data.roles.find((role) => role.id === 'role_coordinator') ?? data.roles[0] ?? null;
}

function getDefaultDraftArtifactPath(project: Project) {
	return project.defaultArtifactRoot || project.projectRootFolder || '';
}

const ROOT_GOAL_PARENT_KEY = '__root__';

function buildTaskGoalOptions(goals: Goal[]) {
	const goalIds = new Set(goals.map((goal) => goal.id));
	const childrenByParent = new Map<string, Goal[]>();

	for (const goal of goals) {
		const parentKey =
			goal.parentGoalId && goalIds.has(goal.parentGoalId)
				? goal.parentGoalId
				: ROOT_GOAL_PARENT_KEY;
		const siblings = childrenByParent.get(parentKey) ?? [];
		siblings.push(goal);
		childrenByParent.set(parentKey, siblings);
	}

	for (const siblings of childrenByParent.values()) {
		siblings.sort((left, right) => left.name.localeCompare(right.name));
	}

	const orderedGoals: Array<{
		id: string;
		name: string;
		label: string;
		depth: number;
		parentGoalId: string | null;
		status: Goal['status'];
		area: Goal['area'];
	}> = [];
	const visitedGoalIds = new Set<string>();

	function visitChildren(parentKey: string, depth: number) {
		for (const goal of childrenByParent.get(parentKey) ?? []) {
			if (visitedGoalIds.has(goal.id)) {
				continue;
			}

			visitedGoalIds.add(goal.id);
			orderedGoals.push({
				id: goal.id,
				name: goal.name,
				label: `${depth > 0 ? `${'  '.repeat(depth)}- ` : ''}${goal.name}`,
				depth,
				parentGoalId: goal.parentGoalId ?? null,
				status: goal.status,
				area: goal.area
			});
			visitChildren(goal.id, depth + 1);
		}
	}

	visitChildren(ROOT_GOAL_PARENT_KEY, 0);

	for (const goal of [...goals].sort((left, right) => left.name.localeCompare(right.name))) {
		if (visitedGoalIds.has(goal.id)) {
			continue;
		}

		orderedGoals.push({
			id: goal.id,
			name: goal.name,
			label: goal.name,
			depth: 0,
			parentGoalId: goal.parentGoalId ?? null,
			status: goal.status,
			area: goal.area
		});
		visitChildren(goal.id, 1);
	}

	return orderedGoals;
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

function readCreateTaskPrefill(url: URL) {
	const open = url.searchParams.get('create') === '1';
	const parseOption = <T extends readonly string[]>(
		options: T,
		value: string | null,
		fallback: T[number]
	): T[number] => {
		const normalized = value?.trim() ?? '';
		return options.includes(normalized as T[number]) ? (normalized as T[number]) : fallback;
	};
	const parseBoolean = (value: string | null, fallback: boolean) => {
		const normalized = value?.trim().toLowerCase() ?? '';

		if (normalized === 'true') {
			return true;
		}

		if (normalized === 'false') {
			return false;
		}

		return fallback;
	};
	const parseQueryIdList = (value: string | null) => [
		...new Set(
			(value?.trim() ?? '')
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean)
		)
	];

	return {
		open,
		projectId: url.searchParams.get('projectId')?.trim() ?? '',
		name: url.searchParams.get('name')?.trim() ?? '',
		instructions: url.searchParams.get('instructions')?.trim() ?? '',
		successCriteria: url.searchParams.get('successCriteria')?.trim() ?? '',
		readyCondition: url.searchParams.get('readyCondition')?.trim() ?? '',
		expectedOutcome: url.searchParams.get('expectedOutcome')?.trim() ?? '',
		assigneeWorkerId: url.searchParams.get('assigneeWorkerId')?.trim() ?? '',
		targetDate: (() => {
			const value = url.searchParams.get('targetDate')?.trim() ?? '';
			return value && isValidDate(value) ? value : '';
		})(),
		goalId: url.searchParams.get('goalId')?.trim() ?? '',
		area: parseOption(AREA_OPTIONS, url.searchParams.get('area'), 'product'),
		priority: parseOption(PRIORITY_OPTIONS, url.searchParams.get('priority'), 'medium'),
		riskLevel: parseOption(TASK_RISK_LEVEL_OPTIONS, url.searchParams.get('riskLevel'), 'medium'),
		approvalMode: parseOption(
			TASK_APPROVAL_MODE_OPTIONS,
			url.searchParams.get('approvalMode'),
			'none'
		),
		requiresReview: parseBoolean(url.searchParams.get('requiresReview'), true),
		desiredRoleId: url.searchParams.get('desiredRoleId')?.trim() ?? '',
		blockedReason: url.searchParams.get('blockedReason')?.trim() ?? '',
		dependencyTaskIds: parseQueryIdList(url.searchParams.get('dependencyTaskIds')),
		requiredCapabilityNames: url.searchParams.get('requiredCapabilityNames')?.trim() ?? '',
		requiredToolNames: url.searchParams.get('requiredToolNames')?.trim() ?? ''
	};
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
				previewSkills: installedSkills.slice(0, 8)
			};
		})
		.sort((left, right) => left.projectId.localeCompare(right.projectId));

	return {
		deleted: url.searchParams.get('deleted') === '1',
		createTaskPrefill: readCreateTaskPrefill(url),
		statusOptions: TASK_STATUS_OPTIONS,
		goals: buildTaskGoalOptions(data.goals),
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		availableDependencyTasks,
		projectSkillSummaries,
		workers: [...data.workers].sort((a, b) => a.name.localeCompare(b.name)),
		defaultDraftRoleName: defaultDraftRole?.name ?? 'Unassigned',
		tasks: taskWorkItems
	};
};

export const actions: Actions = {
	createTask: async ({ request }) => {
		const form = await request.formData();
		const {
			name,
			instructions,
			successCriteria,
			readyCondition,
			expectedOutcome,
			projectId,
			assigneeWorkerId,
			targetDate,
			goalId,
			area,
			priority,
			riskLevel,
			approvalMode,
			requiresReview,
			desiredRoleId,
			blockedReason,
			dependencyTaskIds,
			requiredCapabilityNames,
			requiredToolNames
		} = readTaskForm(form);
		const submitMode = readCreateTaskSubmitMode(form);
		const uploads = readTaskAttachments(form);

		if (!name || !instructions || !projectId) {
			return failTaskCreate(400, {
				message: 'Name, instructions, and project are required.',
				name,
				instructions,
				successCriteria,
				readyCondition,
				expectedOutcome,
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				area,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
				blockedReason,
				dependencyTaskIds,
				requiredCapabilityNames,
				requiredToolNames,
				submitMode
			});
		}

		if (targetDate && !isValidDate(targetDate)) {
			return failTaskCreate(400, {
				message: 'Target date must use YYYY-MM-DD format.',
				name,
				instructions,
				successCriteria,
				readyCondition,
				expectedOutcome,
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				area,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
				blockedReason,
				dependencyTaskIds,
				requiredCapabilityNames,
				requiredToolNames,
				submitMode
			});
		}

		const current = await loadControlPlane();
		const project = current.projects.find((candidate) => candidate.id === projectId);
		const goal = goalId ? current.goals.find((candidate) => candidate.id === goalId) : null;
		const assigneeWorker = assigneeWorkerId
			? current.workers.find((candidate) => candidate.id === assigneeWorkerId)
			: null;

		if (!project) {
			return failTaskCreate(400, {
				message: 'Project not found.',
				name,
				instructions,
				successCriteria,
				readyCondition,
				expectedOutcome,
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				area,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
				blockedReason,
				dependencyTaskIds,
				requiredCapabilityNames,
				requiredToolNames,
				submitMode
			});
		}

		if (goalId && !goal) {
			return failTaskCreate(400, {
				message: 'Goal not found.',
				name,
				instructions,
				successCriteria,
				readyCondition,
				expectedOutcome,
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				area,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
				blockedReason,
				dependencyTaskIds,
				requiredCapabilityNames,
				requiredToolNames,
				submitMode
			});
		}

		if (assigneeWorkerId && !assigneeWorker) {
			return failTaskCreate(400, {
				message: 'Worker not found.',
				name,
				instructions,
				successCriteria,
				readyCondition,
				expectedOutcome,
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				area,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
				blockedReason,
				dependencyTaskIds,
				requiredCapabilityNames,
				requiredToolNames,
				submitMode
			});
		}

		if (submitMode === 'createAndRun' && !project.projectRootFolder) {
			return failTaskCreate(400, {
				message: 'This task cannot launch a work thread until its project has a root folder.',
				name,
				instructions,
				successCriteria,
				readyCondition,
				expectedOutcome,
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				area,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
				blockedReason,
				dependencyTaskIds,
				requiredCapabilityNames,
				requiredToolNames,
				submitMode
			});
		}

		const invalidDependencyTaskIds = dependencyTaskIds.filter(
			(dependencyTaskId) =>
				!current.tasks.some((candidateTask) => candidateTask.id === dependencyTaskId)
		);

		if (invalidDependencyTaskIds.length > 0) {
			return failTaskCreate(400, {
				message: 'One or more selected dependencies are no longer available.',
				name,
				instructions,
				successCriteria,
				readyCondition,
				expectedOutcome,
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				area,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
				blockedReason,
				dependencyTaskIds,
				requiredCapabilityNames,
				requiredToolNames,
				submitMode
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
				name,
				instructions,
				successCriteria,
				readyCondition,
				expectedOutcome,
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				area,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
				blockedReason,
				dependencyTaskIds,
				requiredCapabilityNames,
				requiredToolNames,
				submitMode
			});
		}

		const coordinatorRoleId =
			current.roles.find((role) => role.id === 'role_coordinator')?.id ??
			current.roles[0]?.id ??
			'';
		const nextGoalId = goal?.id ?? '';
		const nextDesiredRoleId = current.roles.some((role) => role.id === desiredRoleId)
			? desiredRoleId
			: (assigneeWorker?.roleId ?? coordinatorRoleId);
		const baseTask = createTask({
			title: name,
			summary: instructions,
			successCriteria,
			readyCondition,
			expectedOutcome,
			projectId: project.id,
			area,
			goalId: nextGoalId,
			priority,
			riskLevel,
			approvalMode,
			requiresReview,
			desiredRoleId: nextDesiredRoleId,
			assigneeWorkerId: assigneeWorker?.id ?? null,
			blockedReason,
			dependencyTaskIds,
			targetDate: targetDate || null,
			requiredCapabilityNames,
			requiredToolNames,
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

		const prompt = buildTaskThreadPrompt({
			taskName: name,
			taskInstructions: instructions,
			successCriteria,
			readyCondition,
			expectedOutcome,
			projectName: project.name,
			projectRootFolder: project.projectRootFolder ?? '',
			defaultArtifactRoot: project.defaultArtifactRoot,
			additionalWritableRoots: project.additionalWritableRoots ?? [],
			availableSkillNames: listInstalledCodexSkills(project.projectRootFolder)
				.slice(0, 12)
				.map((skill) => skill.id)
		});
		const provider = selectExecutionProvider(current, assigneeWorker);
		const sandbox = resolveThreadSandbox({ worker: assigneeWorker, project, provider });
		const workspaceIssue = getWorkspaceExecutionIssue({
			cwd: project.projectRootFolder ?? '',
			additionalWritableRoots: project.additionalWritableRoots ?? [],
			sandbox,
			scopeLabel: 'Project root'
		});

		if (workspaceIssue) {
			return failTaskCreate(400, {
				message: workspaceIssue,
				name,
				instructions,
				successCriteria,
				readyCondition,
				expectedOutcome,
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				area,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
				blockedReason,
				dependencyTaskIds,
				requiredCapabilityNames,
				requiredToolNames,
				submitMode
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
				name,
				instructions,
				successCriteria,
				readyCondition,
				expectedOutcome,
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				area,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
				blockedReason,
				dependencyTaskIds,
				requiredCapabilityNames,
				requiredToolNames,
				submitMode
			});
		}
		const providerId = provider?.id ?? null;
		const now = new Date().toISOString();
		const run = createRun({
			taskId: createdTask.id,
			workerId: assigneeWorker?.id ?? null,
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

	updateTask: async ({ request }) => {
		const form = await request.formData();
		const taskId = form.get('taskId')?.toString().trim() ?? '';
		const status = parseTaskStatus(form.get('status')?.toString() ?? '', 'ready');
		const { name, instructions, projectId, assigneeWorkerId, targetDate } = readTaskForm(form);

		if (!taskId) {
			return fail(400, { message: 'Task ID is required.' });
		}

		if (!name || !instructions || !projectId) {
			return fail(400, {
				message: 'Name, instructions, and project are required.'
			});
		}

		if (targetDate && !isValidDate(targetDate)) {
			return fail(400, { message: 'Target date must use YYYY-MM-DD format.' });
		}

		let taskUpdated = false;

		const current = await loadControlPlane();
		const project = current.projects.find((candidate) => candidate.id === projectId);
		const assigneeWorker = assigneeWorkerId
			? current.workers.find((candidate) => candidate.id === assigneeWorkerId)
			: null;

		if (!project) {
			return fail(400, { message: 'Project not found.' });
		}

		if (assigneeWorkerId && !assigneeWorker) {
			return fail(400, { message: 'Worker not found.' });
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
						assigneeWorkerId: assigneeWorker?.id ?? null,
						desiredRoleId: assigneeWorker?.roleId ?? task.desiredRoleId,
						targetDate: targetDate || null,
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
		const { name, instructions, projectId, assigneeWorkerId } = readTaskForm(form);

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
		const assigneeWorker = assigneeWorkerId
			? current.workers.find((candidate) => candidate.id === assigneeWorkerId)
			: null;
		const effectiveWorker =
			assigneeWorker ??
			(task.assigneeWorkerId
				? (current.workers.find((candidate) => candidate.id === task.assigneeWorkerId) ?? null)
				: null);
		const project = current.projects.find((candidate) => candidate.id === effectiveProjectId);

		if (!project) {
			return fail(400, { message: 'Task project not found.' });
		}

		if (assigneeWorkerId && !assigneeWorker) {
			return fail(400, { message: 'Worker not found.' });
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

		const prompt = buildTaskThreadPrompt({
			taskName: effectiveName,
			taskInstructions: effectiveInstructions,
			successCriteria: effectiveSuccessCriteria,
			readyCondition: effectiveReadyCondition,
			expectedOutcome: effectiveExpectedOutcome,
			projectName: project.name,
			projectRootFolder: project.projectRootFolder,
			defaultArtifactRoot: project.defaultArtifactRoot,
			additionalWritableRoots: project.additionalWritableRoots ?? [],
			availableSkillNames: listInstalledCodexSkills(project.projectRootFolder)
				.slice(0, 12)
				.map((skill) => skill.id)
		});
		const provider = selectExecutionProvider(current, effectiveWorker);
		const sandbox = resolveThreadSandbox({
			worker: effectiveWorker,
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
		let codexThreadId = (compatibleAssignedThread ?? compatibleLatestRunThread)?.threadId ?? null;
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
			workerId: effectiveWorker?.id ?? null,
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
							assigneeWorkerId: assigneeWorker?.id ?? candidate.assigneeWorkerId,
							desiredRoleId: assigneeWorker?.roleId ?? candidate.desiredRoleId,
							agentThreadId,
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
