import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadFolderPickerOptions } from '$lib/server/folder-options';
import { GOAL_STATUS_OPTIONS, LANE_OPTIONS } from '$lib/types/control-plane';
import {
	createGoal,
	loadControlPlane,
	parseGoalStatus,
	parseLane,
	updateControlPlane
} from '$lib/server/control-plane';

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();

	return {
		goals: [...data.goals].sort((a, b) => a.name.localeCompare(b.name)),
		laneOptions: LANE_OPTIONS,
		statusOptions: GOAL_STATUS_OPTIONS,
		folderOptions: await loadFolderPickerOptions()
	};
};

export const actions: Actions = {
	createGoal: async ({ request }) => {
		const form = await request.formData();
		const name = form.get('name')?.toString().trim() ?? '';
		const summary = form.get('summary')?.toString().trim() ?? '';
		const artifactPath = form.get('artifactPath')?.toString().trim() ?? '';
		const lane = parseLane(form.get('lane')?.toString() ?? '', 'product');
		const status = parseGoalStatus(form.get('status')?.toString() ?? '', 'ready');

		if (!name || !summary || !artifactPath) {
			return fail(400, { message: 'Name, summary, and artifact path are required.' });
		}

		await updateControlPlane((data) => ({
			...data,
			goals: [createGoal({ name, summary, artifactPath, lane, status }), ...data.goals]
		}));

		return { ok: true };
	}
};
