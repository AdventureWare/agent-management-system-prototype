import { error, json } from '@sveltejs/kit';
import { createTaskFromSelfImprovementOpportunity } from '$lib/server/self-improvement-store';

export const POST = async ({ params, request }) => {
	const opportunityId = params.opportunityId?.trim() ?? '';
	const payload = (await request.json().catch(() => ({}))) as {
		goalId?: string | null;
	};

	if (!opportunityId) {
		error(400, 'Opportunity ID is required.');
	}

	const task = await createTaskFromSelfImprovementOpportunity(opportunityId, {
		goalId: payload.goalId?.trim() || null
	});

	if (!task) {
		error(
			404,
			'The opportunity could not be found or does not contain enough project context to create a task.'
		);
	}

	return json({
		taskId: task.id,
		title: task.title
	});
};
