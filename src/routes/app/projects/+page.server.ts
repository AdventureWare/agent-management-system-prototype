import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadFolderPickerOptions } from '$lib/server/folder-options';
import { LANE_OPTIONS } from '$lib/types/control-plane';
import {
	createProject,
	loadControlPlane,
	parseLane,
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

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();

	return {
		laneOptions: LANE_OPTIONS,
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		folderOptions: await loadFolderPickerOptions()
	};
};

export const actions: Actions = {
	createProject: async ({ request }) => {
		const form = await request.formData();
		const {
			name,
			summary,
			lane,
			projectRootFolder,
			defaultArtifactRoot,
			defaultRepoPath,
			defaultRepoUrl,
			defaultBranch
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
					lane,
					projectRootFolder,
					defaultArtifactRoot,
					defaultRepoPath,
					defaultRepoUrl,
					defaultBranch
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
