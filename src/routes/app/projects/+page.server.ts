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
		const name = form.get('name')?.toString().trim() ?? '';
		const summary = form.get('summary')?.toString().trim() ?? '';
		const lane = parseLane(form.get('lane')?.toString() ?? '', 'product');
		const defaultCoordinationFolder =
			form.get('defaultCoordinationFolder')?.toString().trim() ?? '';
		const defaultArtifactRoot = form.get('defaultArtifactRoot')?.toString().trim() ?? '';
		const defaultRepoPath = form.get('defaultRepoPath')?.toString().trim() ?? '';
		const defaultRepoUrl = form.get('defaultRepoUrl')?.toString().trim() ?? '';
		const defaultBranch = form.get('defaultBranch')?.toString().trim() ?? '';

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
					defaultCoordinationFolder,
					defaultArtifactRoot,
					defaultRepoPath,
					defaultRepoUrl,
					defaultBranch
				}),
				...data.projects
			]
		}));

		return { ok: true };
	}
};
