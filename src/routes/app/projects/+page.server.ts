import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AGENT_SANDBOX_OPTIONS } from '$lib/types/agent-thread';
import { parseAgentSandbox } from '$lib/server/agent-threads';
import { loadFolderPickerOptions } from '$lib/server/folder-options';
import { normalizePathInput, normalizePathListInput } from '$lib/server/path-tools';
import {
	createProject,
	goalLinksProject,
	loadControlPlane,
	updateControlPlane
} from '$lib/server/control-plane';

function readProjectThreadSandbox(value: FormDataEntryValue | null) {
	const sandbox = value?.toString().trim() ?? '';
	return sandbox ? parseAgentSandbox(sandbox, 'workspace-write') : null;
}

function readProjectForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		summary: form.get('summary')?.toString().trim() ?? '',
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
			projectRootFolder,
			defaultArtifactRoot,
			defaultRepoPath,
			defaultRepoUrl,
			defaultBranch,
			additionalWritableRoots
		} = readProjectForm(form);

		if (!name || !summary) {
			return fail(400, { message: 'Name and summary are required.' });
		}

		await updateControlPlane((data) => ({
			...data,
			projects: [
				createProject({
					name,
					summary,
					projectRootFolder,
					defaultArtifactRoot,
					defaultRepoPath,
					defaultRepoUrl,
					defaultBranch,
					additionalWritableRoots
				}),
				...data.projects
			]
		}));

		return { ok: true, successAction: 'createProject' };
	},

	updateProject: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const projectUpdates = readProjectForm(form);

		if (!projectId) {
			return fail(400, { message: 'Project ID is required.' });
		}

		if (!projectUpdates.name || !projectUpdates.summary) {
			return fail(400, { message: 'Name and summary are required.' });
		}

		let projectUpdated = false;

		await updateControlPlane((data) => ({
			...data,
			projects: data.projects.map((project) => {
				if (project.id !== projectId) {
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
			projectId
		};
	}
};
