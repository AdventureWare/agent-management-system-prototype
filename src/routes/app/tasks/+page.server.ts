import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { TASK_STATUS_OPTIONS } from '$lib/types/control-plane';
import {
	createRun,
	createTask,
	deleteTask as removeTaskFromControlPlane,
	formatRelativeTime,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane,
	parseTaskStatus,
	taskHasUnmetDependencies,
	updateControlPlane
} from '$lib/server/control-plane';
import {
	cancelAgentSession,
	getAgentSession,
	listAgentSessions,
	sendAgentSessionMessage,
	startAgentSession
} from '$lib/server/agent-sessions';
import { selectTaskThreadContext } from '$lib/task-thread-context';
import {
	buildPromptDigest,
	buildTaskThreadName,
	buildTaskThreadPrompt
} from '$lib/server/task-threads';
import {
	buildProjectTaskIdeationPrompt,
	buildProjectTaskIdeationThreadName,
	findProjectForTaskIdeationThread,
	findProjectTaskIdeationThread,
	getProjectTaskIdeationWorkspace,
	parseIdeationTaskSuggestions
} from '$lib/server/task-ideation';
import type { ControlPlaneData, Project, Role } from '$lib/types/control-plane';

function readTaskForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		instructions: form.get('instructions')?.toString().trim() ?? '',
		projectId: form.get('projectId')?.toString().trim() ?? '',
		assigneeWorkerId: form.get('assigneeWorkerId')?.toString().trim() ?? ''
	};
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

export const load: PageServerLoad = async ({ url }) => {
	const sessions = await listAgentSessions({ includeArchived: true });
	const data = await loadControlPlane();
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const runMap = new Map(data.runs.map((run) => [run.id, run]));
	const sessionMap = new Map(sessions.map((session) => [session.id, session]));
	const defaultDraftRole = getDefaultDraftRole(data);
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

	return {
		deleted: url.searchParams.get('deleted') === '1',
		statusOptions: TASK_STATUS_OPTIONS,
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		workers: [...data.workers].sort((a, b) => a.name.localeCompare(b.name)),
		defaultDraftRoleName: defaultDraftRole?.name ?? 'Unassigned',
		ideationReviews,
		tasks: [...data.tasks]
			.map((task) => {
				const latestRun = task.latestRunId ? (runMap.get(task.latestRunId) ?? null) : null;
				const assignedThread = task.threadSessionId
					? (sessionMap.get(task.threadSessionId) ?? null)
					: null;
				const latestRunThread = latestRun?.sessionId
					? (sessionMap.get(latestRun.sessionId) ?? null)
					: null;

				return {
					...task,
					projectName: projectMap.get(task.projectId)?.name ?? 'No project',
					assigneeName: task.assigneeWorkerId
						? (workerMap.get(task.assigneeWorkerId)?.name ?? 'Unknown worker')
						: 'Unassigned',
					latestRun,
					...selectTaskThreadContext({
						assignedThread,
						latestRunThread
					}),
					updatedAtLabel: formatRelativeTime(task.updatedAt),
					hasUnmetDependencies: taskHasUnmetDependencies(data, task),
					openReview: getOpenReviewForTask(data, task.id),
					pendingApproval: getPendingApprovalForTask(data, task.id)
				};
			})
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
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

		if (ideationThread?.canResume) {
			await sendAgentSessionMessage(ideationThread.id, prompt);
			reusedThread = true;
		} else {
			const session = await startAgentSession({
				name: buildProjectTaskIdeationThreadName(project.name),
				cwd: workspace,
				prompt,
				sandbox: 'workspace-write',
				model: null
			});
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
		const { name, instructions, projectId, assigneeWorkerId } = readTaskForm(form);

		if (!name || !instructions || !projectId) {
			return fail(400, {
				message: 'Name, instructions, and project are required.'
			});
		}

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

		const coordinatorRoleId =
			current.roles.find((role) => role.id === 'role_coordinator')?.id ??
			current.roles[0]?.id ??
			'';

		await updateControlPlane((data) => {
			return {
				...data,
				tasks: [
					createTask({
						title: name,
						summary: instructions,
						projectId: project.id,
						lane: 'product',
						goalId: '',
						priority: 'medium',
						riskLevel: 'medium',
						approvalMode: 'none',
						requiresReview: true,
						desiredRoleId: assigneeWorker?.roleId ?? coordinatorRoleId,
						assigneeWorkerId: assigneeWorker?.id ?? null,
						artifactPath: project.defaultArtifactRoot || project.projectRootFolder || ''
					}),
					...data.tasks
				]
			};
		});

		return { ok: true, successAction: 'createTask' };
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
		const { name, instructions, projectId, assigneeWorkerId } = readTaskForm(form);

		if (!taskId) {
			return fail(400, { message: 'Task ID is required.' });
		}

		if (!name || !instructions || !projectId) {
			return fail(400, {
				message: 'Name, instructions, and project are required.'
			});
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
			defaultArtifactRoot: project.defaultArtifactRoot
		});
		const assignedThread = task.threadSessionId
			? await getAgentSession(task.threadSessionId)
			: null;
		let sessionId = task.threadSessionId;
		let threadId = assignedThread?.threadId ?? null;
		let reusedAssignedThread = false;

		if (assignedThread?.hasActiveRun) {
			return fail(409, {
				message:
					'This task is assigned to a busy work thread. Wait for that run to finish or change the thread assignment first.'
			});
		}

		if (assignedThread?.canResume) {
			await sendAgentSessionMessage(assignedThread.id, prompt);
			sessionId = assignedThread.id;
			threadId = assignedThread.threadId;
			reusedAssignedThread = true;
		} else {
			const session = await startAgentSession({
				name: buildTaskThreadName(project.name),
				cwd: project.projectRootFolder,
				prompt,
				sandbox: 'workspace-write',
				model: null
			});
			sessionId = session.sessionId;
			threadId = null;
		}

		const providerId =
			assigneeWorker?.providerId ??
			current.providers.find((provider) => provider.kind === 'local' && provider.enabled)?.id ??
			current.providers[0]?.id ??
			null;
		const run = createRun({
			taskId,
			workerId: assigneeWorker?.id ?? task.assigneeWorkerId ?? null,
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
			summary: reusedAssignedThread
				? 'Queued in the task’s assigned work thread.'
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
							runCount: candidate.runCount + 1,
							latestRunId: run.id,
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
