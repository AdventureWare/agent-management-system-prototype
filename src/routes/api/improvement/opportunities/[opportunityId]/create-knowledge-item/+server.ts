import { error, json } from '@sveltejs/kit';
import { createKnowledgeItemFromSelfImprovementOpportunity } from '$lib/server/self-improvement-store';

export const POST = async ({ params, request }) => {
	const opportunityId = params.opportunityId?.trim() ?? '';
	const payload = (await request.json().catch(() => ({}))) as {
		goalId?: string | null;
		impressionId?: string | null;
	};

	if (!opportunityId) {
		error(400, 'Opportunity ID is required.');
	}

	const knowledgeItem = await createKnowledgeItemFromSelfImprovementOpportunity(opportunityId, {
		goalId: payload.goalId?.trim() || null,
		impressionId: payload.impressionId?.trim() || null
	});

	if (!knowledgeItem) {
		error(
			404,
			'The opportunity could not be found or does not contain enough evidence to capture a saved lesson.'
		);
	}

	return json({
		knowledgeItemId: knowledgeItem.id,
		title: knowledgeItem.title
	});
};
