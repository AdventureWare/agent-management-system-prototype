import { error, json } from '@sveltejs/kit';
import { setSelfImprovementKnowledgeItemStatus } from '$lib/server/self-improvement-store';
import {
	SELF_IMPROVEMENT_KNOWLEDGE_STATUS_OPTIONS,
	type SelfImprovementKnowledgeStatus
} from '$lib/types/self-improvement';

function parseStatus(value: string): SelfImprovementKnowledgeStatus | null {
	return SELF_IMPROVEMENT_KNOWLEDGE_STATUS_OPTIONS.includes(value as SelfImprovementKnowledgeStatus)
		? (value as SelfImprovementKnowledgeStatus)
		: null;
}

export const POST = async ({ params, request }) => {
	const knowledgeItemId = params.knowledgeItemId?.trim() ?? '';

	if (!knowledgeItemId) {
		error(400, 'Saved lesson ID is required.');
	}

	const body = (await request.json().catch(() => ({}))) as {
		status?: string;
	};
	const status = parseStatus(body.status ?? '');

	if (!status) {
		error(400, 'A valid saved lesson status is required.');
	}

	const knowledgeItem = await setSelfImprovementKnowledgeItemStatus({
		knowledgeItemId,
		status
	});

	if (!knowledgeItem) {
		error(404, 'Saved lesson not found.');
	}

	return json({
		knowledgeItem
	});
};
