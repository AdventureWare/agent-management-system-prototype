import { error, json } from '@sveltejs/kit';
import { createTaskFromSelfImprovementOpportunity } from '$lib/server/self-improvement-store';

export const POST = async ({ params, request }) => {
	const opportunityId = params.opportunityId?.trim() ?? '';
	const payload = (await request.json().catch(() => ({}))) as {
		projectId?: string | null;
		goalId?: string | null;
	};

	if (!opportunityId) {
		error(400, 'Opportunity ID is required.');
	}

	const task = await createTaskFromSelfImprovementOpportunity(opportunityId, {
		projectId: payload.projectId?.trim() || null,
		goalId: payload.goalId?.trim() || null
	});

	if (!task) {
		error(
			404,
			'The suggestion could not be turned into a follow-up task yet. Narrow to a project scope or choose a suggestion with clear project context.'
		);
	}

	return json({
		taskId: task.id,
		title: task.title
	});
};
