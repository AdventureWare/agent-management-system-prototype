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
	cancelAgentSession,
	getAgentSession,
	listAgentSessions,
	sendAgentSessionMessage,
	startAgentSession
} from '$lib/server/agent-threads';
import {
	buildPromptDigest,
	buildTaskThreadName,
	buildTaskThreadPrompt
} from '$lib/server/task-threads';
import { selectProjectTaskThreadContext } from '$lib/server/task-thread-compatibility';
import { buildTaskWorkItems } from '$lib/server/task-work-items';
import {
	buildProjectTaskIdeationPrompt,
	buildProjectTaskIdeationThreadName,
	findProjectForTaskIdeationThread,
	findProjectTaskIdeationThread,
	getProjectTaskIdeationWorkspace,
	parseIdeationTaskSuggestions
} from '$lib/server/task-ideation';
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
		projectId: form.get('projectId')?.toString().trim() ?? '',
		assigneeWorkerId: form.get('assigneeWorkerId')?.toString().trim() ?? '',
		targetDate: form.get('targetDate')?.toString().trim() ?? '',
		goalId: form.get('goalId')?.toString().trim() ?? '',
		lane: parseOption(AREA_OPTIONS, form.get('area') ?? form.get('lane'), 'product'),
		priority: parseOption(PRIORITY_OPTIONS, form.get('priority'), 'medium'),
		riskLevel: parseOption(TASK_RISK_LEVEL_OPTIONS, form.get('riskLevel'), 'medium'),
		approvalMode: parseOption(TASK_APPROVAL_MODE_OPTIONS, form.get('approvalMode'), 'none'),
		requiresReview: parseBoolean(form.get('requiresReview'), true),
		desiredRoleId: form.get('desiredRoleId')?.toString().trim() ?? '',
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
		projectId: string;
		assigneeWorkerId: string;
		targetDate: string;
		goalId: string;
		lane: string;
		priority: string;
		riskLevel: string;
		approvalMode: string;
		requiresReview: boolean;
		desiredRoleId: string;
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

function parseSuggestionIndexes(form: FormData) {
	return [
		...new Set(
			form
				.getAll('suggestionIndex')
				.map((value) => Number.parseInt(value.toString(), 10))
				.filter((value) => Number.isInteger(value) && value >= 0)
		)
	];
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

	return {
		open,
		projectId: url.searchParams.get('projectId')?.trim() ?? '',
		name: url.searchParams.get('name')?.trim() ?? '',
		instructions: url.searchParams.get('instructions')?.trim() ?? '',
		assigneeWorkerId: url.searchParams.get('assigneeWorkerId')?.trim() ?? '',
		targetDate: (() => {
			const value = url.searchParams.get('targetDate')?.trim() ?? '';
			return value && isValidDate(value) ? value : '';
		})(),
		goalId: url.searchParams.get('goalId')?.trim() ?? '',
		lane: parseOption(
			AREA_OPTIONS,
			url.searchParams.get('area') ?? url.searchParams.get('lane'),
			'product'
		),
		priority: parseOption(PRIORITY_OPTIONS, url.searchParams.get('priority'), 'medium'),
		riskLevel: parseOption(TASK_RISK_LEVEL_OPTIONS, url.searchParams.get('riskLevel'), 'medium'),
		approvalMode: parseOption(
			TASK_APPROVAL_MODE_OPTIONS,
			url.searchParams.get('approvalMode'),
			'none'
		),
		requiresReview: parseBoolean(url.searchParams.get('requiresReview'), true),
		desiredRoleId: url.searchParams.get('desiredRoleId')?.trim() ?? '',
		requiredCapabilityNames: url.searchParams.get('requiredCapabilityNames')?.trim() ?? '',
		requiredToolNames: url.searchParams.get('requiredToolNames')?.trim() ?? ''
	};
}

export const load: PageServerLoad = async ({ url }) => {
	const controlPlanePromise = loadControlPlane();
	const [data, sessions] = await Promise.all([
		controlPlanePromise,
		listAgentSessions({ includeArchived: true, controlPlane: controlPlanePromise })
	]);
	const defaultDraftRole = getDefaultDraftRole(data);
	const taskWorkItems = buildTaskWorkItems(data, sessions);
	const ideationReviews = [...data.projects]
		.map((project) => {
			const ideationSession = findProjectTaskIdeationThread(project, sessions);
			if (!ideationSession) {
				return null;
			}

			const lastMessage = ideationSession.latestRun?.lastMessage ?? '';
			const suggestions = parseIdeationTaskSuggestions(lastMessage);

			return {
				projectId: project.id,
				projectName: project.name,
				sessionId: ideationSession.id,
				sessionState: ideationSession.sessionState,
				lastActivityAt: ideationSession.lastActivityAt,
				lastActivityLabel: ideationSession.lastActivityLabel,
				sessionSummary: ideationSession.sessionSummary,
				hasActiveRun: ideationSession.hasActiveRun,
				canResume: ideationSession.canResume,
				suggestionCount: suggestions.length,
				hasSavedReply: Boolean(lastMessage),
				defaultDraftRoleId: defaultDraftRole?.id ?? '',
				defaultDraftRoleName: defaultDraftRole?.name ?? 'Unassigned',
				defaultArtifactPath: getDefaultDraftArtifactPath(project),
				suggestions
			};
		})
		.filter((review): review is NonNullable<typeof review> =>
			Boolean(review && (review.suggestionCount > 0 || review.hasActiveRun || review.hasSavedReply))
		)
		.sort((left, right) => (right.lastActivityAt ?? '').localeCompare(left.lastActivityAt ?? ''));
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
		projectSkillSummaries,
		workers: [...data.workers].sort((a, b) => a.name.localeCompare(b.name)),
		defaultDraftRoleName: defaultDraftRole?.name ?? 'Unassigned',
		ideationReviews,
		tasks: taskWorkItems
	};
};

export const actions: Actions = {
	runTaskIdeationAssistant: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';

		if (!projectId) {
			return fail(400, { message: 'Select a project before running task ideation.' });
		}

		const [current, sessions] = await Promise.all([loadControlPlane(), listAgentSessions()]);
		const project = current.projects.find((candidate) => candidate.id === projectId);

		if (!project) {
			return fail(404, { message: 'Project not found.' });
		}

		const workspace = getProjectTaskIdeationWorkspace(project);

		if (!workspace) {
			return fail(400, {
				message:
					'Configure a project root folder or default repo path before running task ideation.'
			});
		}

		const prompt = buildProjectTaskIdeationPrompt({
			data: current,
			project
		});
		const ideationThread = findProjectTaskIdeationThread(project, sessions);

		if (ideationThread?.hasActiveRun) {
			return fail(409, {
				message:
					'The task ideation assistant is already running for this project. Open the existing thread instead of starting another run.'
			});
		}

		let sessionId = ideationThread?.id ?? null;
		let reusedThread = false;
		const ideationProvider = selectExecutionProvider(current);
		const ideationSandbox = resolveThreadSandbox({ project, provider: ideationProvider });
		const workspaceIssue = getWorkspaceExecutionIssue({
			cwd: workspace,
			sandbox: ideationSandbox,
			scopeLabel: 'Ideation workspace'
		});

		if (workspaceIssue) {
			return fail(400, { message: workspaceIssue });
		}

		if (ideationThread?.canResume) {
			try {
				await sendAgentSessionMessage(ideationThread.id, prompt);
			} catch (error) {
				return fail(400, {
					message: getActionErrorMessage(
						error,
						'Could not queue work in the project ideation thread.'
					)
				});
			}

			reusedThread = true;
		} else {
			let session;

			try {
				session = await startAgentSession({
					name: buildProjectTaskIdeationThreadName(project.name),
					cwd: workspace,
					prompt,
					sandbox: ideationSandbox,
					model: null
				});
			} catch (error) {
				return fail(400, {
					message: getActionErrorMessage(error, 'Could not start the project ideation thread.')
				});
			}

			sessionId = session.sessionId;
		}

		return {
			ok: true,
			successAction: 'runTaskIdeationAssistant',
			projectId: project.id,
			projectName: project.name,
			sessionId,
			reusedThread
		};
	},

	createTask: async ({ request }) => {
		const form = await request.formData();
		const {
			name,
			instructions,
			projectId,
			assigneeWorkerId,
			targetDate,
			goalId,
			lane,
			priority,
			riskLevel,
			approvalMode,
			requiresReview,
			desiredRoleId,
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
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				lane,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
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
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				lane,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
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
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				lane,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
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
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				lane,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
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
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				lane,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
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
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				lane,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
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
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				lane,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
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
			projectId: project.id,
			lane,
			goalId: nextGoalId,
			priority,
			riskLevel,
			approvalMode,
			requiresReview,
			desiredRoleId: nextDesiredRoleId,
			assigneeWorkerId: assigneeWorker?.id ?? null,
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
			projectName: project.name,
			projectRootFolder: project.projectRootFolder ?? '',
			defaultArtifactRoot: project.defaultArtifactRoot,
			availableSkillNames: listInstalledCodexSkills(project.projectRootFolder)
				.slice(0, 12)
				.map((skill) => skill.id)
		});
		const provider = selectExecutionProvider(current, assigneeWorker);
		const sandbox = resolveThreadSandbox({ worker: assigneeWorker, project, provider });
		const workspaceIssue = getWorkspaceExecutionIssue({
			cwd: project.projectRootFolder ?? '',
			sandbox,
			scopeLabel: 'Project root'
		});

		if (workspaceIssue) {
			return failTaskCreate(400, {
				message: workspaceIssue,
				name,
				instructions,
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				lane,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
				requiredCapabilityNames,
				requiredToolNames,
				submitMode
			});
		}

		let session;

		try {
			session = await startAgentSession({
				name: buildTaskThreadName({
					projectName: project.name,
					taskName: createdTask.title,
					taskId: createdTask.id
				}),
				cwd: project.projectRootFolder ?? '',
				prompt,
				sandbox,
				model: null
			});
		} catch (error) {
			return failTaskCreate(400, {
				message: getActionErrorMessage(error, 'Could not start a work thread for this task.'),
				name,
				instructions,
				projectId,
				assigneeWorkerId,
				targetDate,
				goalId,
				lane,
				priority,
				riskLevel,
				approvalMode,
				requiresReview,
				desiredRoleId,
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
			sessionId: session.sessionId,
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
				threadSessionId: session.sessionId,
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
			sessionId: session.sessionId,
			attachmentCount: attachments.length
		};
	},

	createDraftTasksFromIdeation: async ({ request }) => {
		const form = await request.formData();
		const sessionId = form.get('sessionId')?.toString().trim() ?? '';
		const selectedIndexes = parseSuggestionIndexes(form);

		if (!sessionId) {
			return fail(400, { message: 'Ideation session is required.' });
		}

		if (selectedIndexes.length === 0) {
			return fail(400, { message: 'Select at least one suggested task to create.' });
		}

		const [current, session] = await Promise.all([loadControlPlane(), getAgentSession(sessionId)]);

		if (!session) {
			return fail(404, { message: 'Ideation session not found.' });
		}

		const project = findProjectForTaskIdeationThread(session, current.projects);

		if (!project) {
			return fail(400, { message: 'Could not match the ideation session to a project.' });
		}

		const suggestions = parseIdeationTaskSuggestions(session.latestRun?.lastMessage ?? '');
		const selectedSuggestions = selectedIndexes
			.map((index) => suggestions[index] ?? null)
			.filter((suggestion): suggestion is NonNullable<typeof suggestion> => Boolean(suggestion));

		if (selectedSuggestions.length === 0) {
			return fail(400, { message: 'The selected suggestions are no longer available.' });
		}

		const defaultDraftRole = getDefaultDraftRole(current);
		const existingTitleKeys = new Set(
			current.tasks
				.filter((task) => task.projectId === project.id)
				.map((task) => task.title.trim().toLowerCase())
		);
		const tasksToCreate = selectedSuggestions.filter((suggestion) => {
			const titleKey = suggestion.title.trim().toLowerCase();
			if (!titleKey || existingTitleKeys.has(titleKey)) {
				return false;
			}

			existingTitleKeys.add(titleKey);
			return true;
		});

		if (tasksToCreate.length === 0) {
			return fail(409, {
				message: 'Selected suggestions already exist as tasks for this project.'
			});
		}

		await updateControlPlane((data) => ({
			...data,
			tasks: [
				...tasksToCreate.map((suggestion) =>
					createTask({
						title: suggestion.title,
						summary: suggestion.suggestedInstructions,
						projectId: project.id,
						lane: 'product',
						goalId: '',
						priority: 'medium',
						riskLevel: 'medium',
						approvalMode: 'none',
						requiresReview: true,
						desiredRoleId: defaultDraftRole?.id ?? '',
						assigneeWorkerId: null,
						artifactPath: getDefaultDraftArtifactPath(project),
						status: 'in_draft'
					})
				),
				...data.tasks
			]
		}));

		return {
			ok: true,
			successAction: 'createDraftTasksFromIdeation',
			projectName: project.name,
			sessionId,
			createdCount: tasksToCreate.length,
			skippedCount: selectedSuggestions.length - tasksToCreate.length
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
			projectName: project.name,
			projectRootFolder: project.projectRootFolder,
			defaultArtifactRoot: project.defaultArtifactRoot,
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
		const assignedThread = task.threadSessionId
			? await getAgentSession(task.threadSessionId)
			: null;
		const latestRun = task.latestRunId
			? (current.runs.find((run) => run.id === task.latestRunId) ?? null)
			: null;
		const latestRunThread =
			latestRun?.sessionId && latestRun.sessionId !== task.threadSessionId
				? await getAgentSession(latestRun.sessionId)
				: null;
		const threadContext = selectProjectTaskThreadContext(project, {
			assignedThread,
			latestRunThread
		});
		const compatibleAssignedThread = threadContext.assignedThread;
		const compatibleLatestRunThread = threadContext.latestRunThread;
		let sessionId = compatibleAssignedThread?.id ?? compatibleLatestRunThread?.id ?? null;
		let threadId = (compatibleAssignedThread ?? compatibleLatestRunThread)?.threadId ?? null;
		let reusedThreadMode: 'assigned' | 'latest' | null = null;

		if (compatibleAssignedThread?.hasActiveRun) {
			return fail(409, {
				message:
					'This task is assigned to a busy work thread. Wait for that run to finish or change the thread assignment first.'
			});
		}

		const workspaceIssue = getWorkspaceExecutionIssue({
			cwd: project.projectRootFolder,
			sandbox,
			scopeLabel: 'Project root'
		});

		if (workspaceIssue) {
			return fail(400, { message: workspaceIssue });
		}

		if (compatibleAssignedThread?.canResume) {
			try {
				await sendAgentSessionMessage(compatibleAssignedThread.id, prompt);
			} catch (error) {
				return fail(400, {
					message: getActionErrorMessage(error, 'Could not queue work in the linked thread.')
				});
			}

			sessionId = compatibleAssignedThread.id;
			threadId = compatibleAssignedThread.threadId;
			reusedThreadMode = 'assigned';
		} else if (!compatibleAssignedThread && compatibleLatestRunThread?.canResume) {
			try {
				await sendAgentSessionMessage(compatibleLatestRunThread.id, prompt);
			} catch (error) {
				return fail(400, {
					message: getActionErrorMessage(error, 'Could not queue work in the latest thread.')
				});
			}

			sessionId = compatibleLatestRunThread.id;
			threadId = compatibleLatestRunThread.threadId;
			reusedThreadMode = 'latest';
		} else {
			let session;

			try {
				session = await startAgentSession({
					name: buildTaskThreadName({
						projectName: project.name,
						taskName: effectiveName,
						taskId: task.id
					}),
					cwd: project.projectRootFolder,
					prompt,
					sandbox,
					model: null
				});
			} catch (error) {
				return fail(400, {
					message: getActionErrorMessage(error, 'Could not start a work thread for this task.')
				});
			}

			sessionId = session.sessionId;
			threadId = null;
		}

		const providerId = provider?.id ?? null;
		const run = createRun({
			taskId,
			workerId: effectiveWorker?.id ?? null,
			providerId,
			status: 'running',
			startedAt: new Date().toISOString(),
			threadId,
			sessionId,
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
							threadSessionId: sessionId,
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
			sessionId
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

		const relatedSessionIds = [
			...new Set(
				current.runs
					.filter((run) => deletableTaskIds.includes(run.taskId))
					.map((run) => run.sessionId)
					.filter((sessionId): sessionId is string => Boolean(sessionId))
			)
		];

		await Promise.all(relatedSessionIds.map((sessionId) => cancelAgentSession(sessionId)));
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
