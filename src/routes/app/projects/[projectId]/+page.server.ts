import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadFolderPickerOptions } from '$lib/server/folder-options';
import { LANE_OPTIONS } from '$lib/types/control-plane';
import {
	formatRelativeTime,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane,
	parseLane,
	projectMatchesPath,
	taskHasUnmetDependencies,
	updateControlPlane
} from '$lib/server/control-plane';

function readProjectForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		summary: form.get('summary')?.toString().trim() ?? '',
		lane: parseLane(form.get('lane')?.toString() ?? '', 'product'),
		projectRootFolder: form.get('projectRootFolder')?.toString().trim() ?? '',
		defaultArtifactRoot: form.get('defaultArtifactRoot')?.toString().trim() ?? '',
		defaultRepoPath: form.get('defaultRepoPath')?.toString().trim() ?? '',
		defaultRepoUrl: form.get('defaultRepoUrl')?.toString().trim() ?? '',
		defaultBranch: form.get('defaultBranch')?.toString().trim() ?? ''
	};
}

export const load: PageServerLoad = async ({ params }) => {
	const data = await loadControlPlane();
	const project = data.projects.find((candidate) => candidate.id === params.projectId);

	if (!project) {
		throw error(404, 'Project not found.');
	}

	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const relatedTasks = data.tasks
		.filter((task) => task.projectId === project.id)
		.map((task) => ({
			...task,
			goalName: task.goalId ? (goalMap.get(task.goalId)?.name ?? 'Unknown goal') : 'No goal',
			assigneeName: task.assigneeWorkerId
				? (workerMap.get(task.assigneeWorkerId)?.name ?? 'Unknown worker')
				: 'Unassigned',
			openReview: getOpenReviewForTask(data, task.id),
			pendingApproval: getPendingApprovalForTask(data, task.id),
			hasUnmetDependencies: taskHasUnmetDependencies(data, task),
			updatedAtLabel: formatRelativeTime(task.updatedAt)
		}))
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	const relatedGoalIds = new Set(
		relatedTasks.map((task) => task.goalId).filter((goalId) => goalId.length > 0)
	);
	const relatedGoals = data.goals
		.filter((goal) => relatedGoalIds.has(goal.id) || projectMatchesPath(project, goal.artifactPath))
		.map((goal) => ({
			...goal,
			taskCount: relatedTasks.filter((task) => task.goalId === goal.id).length
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		project,
		relatedGoals,
		relatedTasks,
		laneOptions: LANE_OPTIONS,
		folderOptions: await loadFolderPickerOptions(),
		metrics: {
			totalTasks: relatedTasks.length,
			activeTasks: relatedTasks.filter((task) =>
				['ready', 'running', 'review', 'blocked'].includes(task.status)
			).length,
			reviewTasks: relatedTasks.filter((task) => task.openReview).length,
			pendingApprovals: relatedTasks.filter((task) => task.pendingApproval).length,
			blockedTasks: relatedTasks.filter(
				(task) => task.status === 'blocked' || task.hasUnmetDependencies
			).length,
			goalCount: relatedGoals.length
		}
	};
};

export const actions: Actions = {
	updateProject: async ({ params, request }) => {
		const form = await request.formData();
		const projectUpdates = readProjectForm(form);

		if (!projectUpdates.name || !projectUpdates.summary) {
			return fail(400, { message: 'Name and summary are required.' });
		}

		let projectUpdated = false;

		await updateControlPlane((data) => ({
			...data,
			projects: data.projects.map((project) => {
				if (project.id !== params.projectId) {
					return project;
				}

				projectUpdated = true;
				return {
					...project,
					...projectUpdates
				};
			})
		}));

		if (!projectUpdated) {
			return fail(404, { message: 'Project not found.' });
		}

		return {
			ok: true,
			successAction: 'updateProject',
			projectId: params.projectId
		};
	}
};
