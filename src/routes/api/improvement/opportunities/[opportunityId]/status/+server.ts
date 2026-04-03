import { error, json } from '@sveltejs/kit';
import { setSelfImprovementOpportunityStatus } from '$lib/server/self-improvement-store';
import {
	SELF_IMPROVEMENT_DECISION_REASON_OPTIONS,
	SELF_IMPROVEMENT_STATUS_OPTIONS,
	type SelfImprovementDecisionReason,
	type SelfImprovementStatus
} from '$lib/types/self-improvement';

function parseStatus(value: string): SelfImprovementStatus | null {
	return SELF_IMPROVEMENT_STATUS_OPTIONS.includes(value as SelfImprovementStatus)
		? (value as SelfImprovementStatus)
		: null;
}

function parseDecisionReason(value: string): SelfImprovementDecisionReason | null {
	return SELF_IMPROVEMENT_DECISION_REASON_OPTIONS.includes(value as SelfImprovementDecisionReason)
		? (value as SelfImprovementDecisionReason)
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
		decisionReason?: string;
		impressionId?: string | null;
	};
	const status = parseStatus(body.status ?? '');
	const decisionReason = body.decisionReason ? parseDecisionReason(body.decisionReason) : null;

	if (!status) {
		error(400, 'A valid self-improvement status is required.');
	}

	if (body.decisionReason && !decisionReason) {
		error(400, 'A valid suggestion decision reason is required.');
	}

	return json({
		record: await setSelfImprovementOpportunityStatus({
			opportunityId,
			status,
			decisionSummary: body.decisionSummary,
			decisionReason,
			impressionId: body.impressionId?.trim() || null
		})
	});
};
