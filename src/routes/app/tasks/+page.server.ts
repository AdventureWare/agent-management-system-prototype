import { createHash } from 'node:crypto';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { TASK_STATUS_OPTIONS } from '$lib/types/control-plane';
import {
	createRun,
	createTask,
	formatRelativeTime,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane,
	parseTaskStatus,
	taskHasUnmetDependencies,
	updateControlPlane
} from '$lib/server/control-plane';
import { startAgentSession } from '$lib/server/agent-sessions';

function readTaskForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		instructions: form.get('instructions')?.toString().trim() ?? '',
		projectId: form.get('projectId')?.toString().trim() ?? '',
		assigneeWorkerId: form.get('assigneeWorkerId')?.toString().trim() ?? ''
	};
}

function buildTaskSessionPrompt(input: {
	taskName: string;
	taskInstructions: string;
	projectName: string;
	projectRootFolder: string;
	defaultArtifactRoot: string;
}) {
	const contextLines = [
		`Task: ${input.taskName}`,
		`Project: ${input.projectName}`,
		`Project root: ${input.projectRootFolder}`
	];

	if (input.defaultArtifactRoot) {
		contextLines.push(`Default artifact root: ${input.defaultArtifactRoot}`);
	}

	return [
		'You are executing a queued task from the agent management system.',
		'',
		...contextLines,
		'',
		'Instructions:',
		input.taskInstructions,
		'',
		'Work from the project root, make the requested changes, and report progress and outcomes clearly.'
	].join('\n');
}

function buildPromptDigest(prompt: string) {
	return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const runMap = new Map(data.runs.map((run) => [run.id, run]));

	return {
		statusOptions: TASK_STATUS_OPTIONS,
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		workers: [...data.workers].sort((a, b) => a.name.localeCompare(b.name)),
		tasks: [...data.tasks]
			.map((task) => ({
				...task,
				projectName: projectMap.get(task.projectId)?.name ?? 'No project',
				assigneeName: task.assigneeWorkerId
					? (workerMap.get(task.assigneeWorkerId)?.name ?? 'Unknown worker')
					: 'Unassigned',
				latestRun: task.latestRunId ? (runMap.get(task.latestRunId) ?? null) : null,
				updatedAtLabel: formatRelativeTime(task.updatedAt),
				hasUnmetDependencies: taskHasUnmetDependencies(data, task),
				openReview: getOpenReviewForTask(data, task.id),
				pendingApproval: getPendingApprovalForTask(data, task.id)
			}))
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
	};
};

export const actions: Actions = {
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
						lane: project.lane,
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
						lane: project.lane,
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
				message: 'This task cannot launch a session until its project has a root folder.'
			});
		}

		if (getPendingApprovalForTask(current, task.id)?.mode === 'before_run') {
			return fail(409, {
				message: 'This task is waiting on before-run approval before a session can start.'
			});
		}

		const prompt = buildTaskSessionPrompt({
			taskName: effectiveName,
			taskInstructions: effectiveInstructions,
			projectName: project.name,
			projectRootFolder: project.projectRootFolder,
			defaultArtifactRoot: project.defaultArtifactRoot
		});
		const session = await startAgentSession({
			name: `Task: ${effectiveName}`,
			cwd: project.projectRootFolder,
			prompt,
			sandbox: 'workspace-write',
			model: null
		});
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
			sessionId: session.sessionId,
			promptDigest: buildPromptDigest(prompt),
			artifactPaths:
				project.defaultArtifactRoot || project.projectRootFolder
					? [project.defaultArtifactRoot || project.projectRootFolder]
					: [],
			summary: 'Launched from the task board into a resumable Codex session.',
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
							lane: project.lane,
							assigneeWorkerId: assigneeWorker?.id ?? candidate.assigneeWorkerId,
							desiredRoleId: assigneeWorker?.roleId ?? candidate.desiredRoleId,
							artifactPath:
								candidate.artifactPath ||
								project.defaultArtifactRoot ||
								project.projectRootFolder ||
								'',
							runCount: candidate.runCount + 1,
							latestRunId: run.id,
							status: 'running',
							updatedAt: new Date().toISOString()
						}
					: candidate
			)
		}));

		return {
			ok: true,
			successAction: 'launchTaskSession',
			taskId,
			sessionId: session.sessionId
		};
	}
};
