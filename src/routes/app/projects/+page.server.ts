import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AGENT_SANDBOX_OPTIONS } from '$lib/types/agent-thread';
import { parseAgentSandbox } from '$lib/server/agent-threads';
import { loadFolderPickerOptions } from '$lib/server/folder-options';
import { normalizePathInput, normalizePathListInput } from '$lib/server/path-tools';
import {
	createProject,
	getProjectChildProjects,
	getProjectLineage,
	goalLinksProject,
	loadControlPlane,
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

export const load: PageServerLoad = async ({ url }) => {
	const data = await loadControlPlane();
	const taskCounts = new Map<string, number>();
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));

	for (const task of data.tasks) {
		taskCounts.set(task.projectId, (taskCounts.get(task.projectId) ?? 0) + 1);
	}

	return {
		deleted: url.searchParams.get('deleted') === '1',
		projects: [...data.projects]
			.map((project) => {
				const relatedTaskGoalIds = new Set(
					data.tasks
						.filter((task) => task.projectId === project.id && task.goalId)
						.map((task) => task.goalId)
				);
				const goalCount = data.goals.filter(
					(goal) => relatedTaskGoalIds.has(goal.id) || goalLinksProject(goal, project)
				).length;

				return {
					...project,
					parentProjectName: project.parentProjectId
						? (projectMap.get(project.parentProjectId)?.name ?? '')
						: '',
					childProjectCount: getProjectChildProjects(data.projects, project.id).length,
					lineageLabel: getProjectLineage(data.projects, project.id)
						.map((candidate) => candidate.name)
						.join(' / '),
					taskCount: taskCounts.get(project.id) ?? 0,
					goalCount,
					readinessCount: [
						project.projectRootFolder,
						project.defaultArtifactRoot,
						project.defaultRepoPath || project.defaultRepoUrl,
						project.defaultBranch
					].filter(Boolean).length
				};
			})
			.sort((a, b) => a.name.localeCompare(b.name)),
		parentProjectOptions: [...data.projects]
			.sort((a, b) => a.name.localeCompare(b.name))
			.map((project) => ({
				id: project.id,
				label: getProjectLineage(data.projects, project.id)
					.map((candidate) => candidate.name)
					.join(' / ')
			})),
		folderOptions: await loadFolderPickerOptions(),
		sandboxOptions: AGENT_SANDBOX_OPTIONS
	};
};

export const actions: Actions = {
	createProject: async ({ request }) => {
		const form = await request.formData();
		const {
			name,
			summary,
			parentProjectId,
			projectRootFolder,
			defaultArtifactRoot,
			defaultRepoPath,
			defaultRepoUrl,
			defaultBranch,
			additionalWritableRoots,
			defaultThreadSandbox
		} = readProjectForm(form);

		if (!name || !summary) {
			return fail(400, { message: 'Name and summary are required.' });
		}

		if (parentProjectId) {
			const current = await loadControlPlane();

			if (!current.projects.some((project) => project.id === parentProjectId)) {
				return fail(400, { message: 'Selected parent project was not found.' });
			}
		}

		await updateControlPlaneCollections((data) => ({
			data: {
				...data,
				projects: [
					createProject({
						name,
						summary,
						parentProjectId: parentProjectId || null,
						projectRootFolder,
						defaultArtifactRoot,
						defaultRepoPath,
						defaultRepoUrl,
						defaultBranch,
						additionalWritableRoots,
						defaultThreadSandbox
					}),
					...data.projects
				]
			},
			changedCollections: ['projects']
		}));

		return { ok: true, successAction: 'createProject' };
	},

	updateProject: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const projectUpdates = readProjectForm(form);
		const current = await loadControlPlane();

		if (!projectId) {
			return fail(400, { message: 'Project ID is required.' });
		}

		if (!projectUpdates.name || !projectUpdates.summary) {
			return fail(400, { message: 'Name and summary are required.' });
		}

		if (
			projectUpdates.parentProjectId &&
			!current.projects.some((project) => project.id === projectUpdates.parentProjectId)
		) {
			return fail(400, { message: 'Selected parent project was not found.' });
		}

		if (wouldCreateProjectCycle(current.projects, projectId, projectUpdates.parentProjectId)) {
			return fail(400, { message: 'This parent project would create a cycle.' });
		}

		let projectUpdated = false;

		await updateControlPlaneCollections((data) => ({
			data: {
				...data,
				projects: data.projects.map((project) => {
					if (project.id !== projectId) {
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
			projectId
		};
	}
};
