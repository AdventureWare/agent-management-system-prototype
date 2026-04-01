import { error, json } from '@sveltejs/kit';
import { setSelfImprovementOpportunityStatus } from '$lib/server/self-improvement-store';
import {
	SELF_IMPROVEMENT_STATUS_OPTIONS,
	type SelfImprovementStatus
} from '$lib/types/self-improvement';

function parseStatus(value: string): SelfImprovementStatus | null {
	return SELF_IMPROVEMENT_STATUS_OPTIONS.includes(value as SelfImprovementStatus)
		? (value as SelfImprovementStatus)
		: null;
}

export const POST = async ({ params, request }) => {
	const opportunityId = params.opportunityId?.trim() ?? '';

	if (!opportunityId) {
		error(400, 'Opportunity ID is required.');
	}

	const body = (await request.json().catch(() => ({}))) as {
		status?: string;
		decisionSummary?: string;
	};
	const status = parseStatus(body.status ?? '');

	if (!status) {
		error(400, 'A valid self-improvement status is required.');
	}

	return json({
		record: await setSelfImprovementOpportunityStatus({
			opportunityId,
			status,
			decisionSummary: body.decisionSummary
		})
	});
};
