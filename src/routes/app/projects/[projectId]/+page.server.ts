import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AGENT_SANDBOX_OPTIONS } from '$lib/types/agent-thread';
import { parseAgentSandbox } from '$lib/server/agent-threads';
import { buildExecutionCapabilityCatalog } from '$lib/server/execution-capability-catalog';
import { loadFolderPickerOptions } from '$lib/server/folder-options';
import { normalizePathInput, normalizePathListInput } from '$lib/server/path-tools';
import { buildProjectPermissionSurface } from '$lib/server/project-access';
import {
	deleteProject as removeProjectFromControlPlane,
	formatRelativeTime,
	getProjectChildProjects,
	getProjectLineage,
	getProjectScopeProjectIds,
	goalLinksProject,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane,
	taskHasUnmetDependencies,
	wouldCreateProjectCycle,
	updateControlPlaneCollections
} from '$lib/server/control-plane';

function readProjectThreadSandbox(value: FormDataEntryValue | null) {
	const sandbox = value?.toString().trim() ?? '';
	return sandbox ? parseAgentSandbox(sandbox, 'workspace-write') : null;
}

function readProjectForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		summary: form.get('summary')?.toString().trim() ?? '',
		parentProjectId: form.get('parentProjectId')?.toString().trim() ?? '',
		projectRootFolder: normalizePathInput(form.get('projectRootFolder')?.toString()),
		defaultArtifactRoot: normalizePathInput(form.get('defaultArtifactRoot')?.toString()),
		defaultRepoPath: normalizePathInput(form.get('defaultRepoPath')?.toString()),
		defaultRepoUrl: form.get('defaultRepoUrl')?.toString().trim() ?? '',
		defaultBranch: form.get('defaultBranch')?.toString().trim() ?? '',
		additionalWritableRoots: normalizePathListInput(
			form.get('additionalWritableRoots')?.toString()
		),
		defaultThreadSandbox: readProjectThreadSandbox(form.get('defaultThreadSandbox'))
	};
}

export const load: PageServerLoad = async ({ params }) => {
	const data = await loadControlPlane();
	const project = data.projects.find((candidate) => candidate.id === params.projectId);

	if (!project) {
		throw error(404, 'Project not found.');
	}

	const executionSurfaceMap = new Map(
		data.executionSurfaces.map((executionSurface) => [executionSurface.id, executionSurface])
	);
	const projectMap = new Map(data.projects.map((candidate) => [candidate.id, candidate]));
	const scopedProjectIds = new Set(getProjectScopeProjectIds(data.projects, project.id));
	const scopedProjects = data.projects.filter((candidate) => scopedProjectIds.has(candidate.id));
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const relatedTasks = data.tasks
		.filter((task) => scopedProjectIds.has(task.projectId))
		.map((task) => ({
			...task,
			projectName: projectMap.get(task.projectId)?.name ?? 'Unknown project',
			goalName: task.goalId ? (goalMap.get(task.goalId)?.name ?? 'Unknown goal') : 'No goal',
			assigneeName: task.assigneeExecutionSurfaceId
				? (executionSurfaceMap.get(task.assigneeExecutionSurfaceId)?.name ??
					'Unknown execution surface')
				: 'Unassigned',
			openReview: getOpenReviewForTask(data, task.id),
			pendingApproval: getPendingApprovalForTask(data, task.id),
			hasUnmetDependencies: taskHasUnmetDependencies(data, task),
			updatedAtLabel: formatRelativeTime(task.updatedAt)
		}))
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	const directTaskCount = relatedTasks.filter((task) => task.projectId === project.id).length;
	const relatedGoalIds = new Set(
		relatedTasks.map((task) => task.goalId).filter((goalId) => goalId.length > 0)
	);
	const relatedGoals = data.goals
		.filter(
			(goal) =>
				relatedGoalIds.has(goal.id) ||
				scopedProjects.some((candidate) => goalLinksProject(goal, candidate))
		)
		.map((goal) => ({
			...goal,
			taskCount: relatedTasks.filter((task) => task.goalId === goal.id).length
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
	const childProjects = getProjectChildProjects(data.projects, project.id)
		.map((childProject) => ({
			...childProject,
			taskCount: data.tasks.filter((task) => task.projectId === childProject.id).length,
			goalCount: data.goals.filter((goal) => goalLinksProject(goal, childProject)).length
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
	const parentProject = project.parentProjectId
		? (projectMap.get(project.parentProjectId) ?? null)
		: null;
	const skillCatalog = buildExecutionCapabilityCatalog(data);
	const projectSkillInventory =
		skillCatalog.projectSkills.find((candidate) => candidate.projectId === project.id) ?? null;

	return {
		project,
		parentProject,
		projectLineage: getProjectLineage(data.projects, project.id),
		parentProjectOptions: data.projects
			.filter((candidate) => candidate.id !== project.id)
			.sort((a, b) => a.name.localeCompare(b.name))
			.map((candidate) => ({
				id: candidate.id,
				label: getProjectLineage(data.projects, candidate.id)
					.map((lineageProject) => lineageProject.name)
					.join(' / ')
			})),
		childProjects,
		projectSkillInventory,
		permissionSurface: buildProjectPermissionSurface(project),
		relatedGoals,
		relatedTasks,
		contextScope: {
			projectIds: [...scopedProjectIds],
			directTaskCount,
			rolledUpTaskCount: relatedTasks.length - directTaskCount,
			childProjectCount: childProjects.length
		},
		folderOptions: await loadFolderPickerOptions(),
		sandboxOptions: AGENT_SANDBOX_OPTIONS,
		metrics: {
			totalTasks: relatedTasks.length,
			activeTasks: relatedTasks.filter((task) =>
				['in_draft', 'ready', 'in_progress', 'review', 'blocked'].includes(task.status)
			).length,
			reviewTasks: relatedTasks.filter((task) => task.openReview).length,
			pendingApprovals: relatedTasks.filter((task) => task.pendingApproval).length,
			blockedTasks: relatedTasks.filter(
				(task) => task.status === 'blocked' || task.hasUnmetDependencies
			).length,
			goalCount: relatedGoals.length,
			childProjectCount: childProjects.length
		}
	};
};

export const actions: Actions = {
	updateProject: async ({ params, request }) => {
		const form = await request.formData();
		const projectUpdates = readProjectForm(form);
		const current = await loadControlPlane();

		if (!projectUpdates.name || !projectUpdates.summary) {
			return fail(400, { message: 'Name and summary are required.' });
		}

		if (
			projectUpdates.parentProjectId &&
			!current.projects.some((project) => project.id === projectUpdates.parentProjectId)
		) {
			return fail(400, { message: 'Selected parent project was not found.' });
		}

		if (
			wouldCreateProjectCycle(current.projects, params.projectId, projectUpdates.parentProjectId)
		) {
			return fail(400, { message: 'This parent project would create a cycle.' });
		}

		let projectUpdated = false;

		await updateControlPlaneCollections((data) => ({
			data: {
				...data,
				projects: data.projects.map((project) => {
					if (project.id !== params.projectId) {
						return project;
					}

					projectUpdated = true;
					return {
						...project,
						...projectUpdates,
						parentProjectId: projectUpdates.parentProjectId || null
					};
				})
			},
			changedCollections: ['projects']
		}));

		if (!projectUpdated) {
			return fail(404, { message: 'Project not found.' });
		}

		return {
			ok: true,
			successAction: 'updateProject',
			projectId: params.projectId
		};
	},

	deleteProject: async ({ params }) => {
		const current = await loadControlPlane();
		const project = current.projects.find((candidate) => candidate.id === params.projectId);

		if (!project) {
			return fail(404, { message: 'Project not found.' });
		}

		const linkedTaskCount = current.tasks.filter(
			(task) => task.projectId === params.projectId
		).length;

		if (linkedTaskCount > 0) {
			return fail(400, {
				message: `Delete or move ${linkedTaskCount} linked task${linkedTaskCount === 1 ? '' : 's'} before deleting this project.`
			});
		}

		await updateControlPlaneCollections((data) => ({
			data: removeProjectFromControlPlane(data, params.projectId),
			changedCollections: ['projects', 'goals', 'planningSessions']
		}));

		throw redirect(303, '/app/projects?deleted=1');
	}
};
