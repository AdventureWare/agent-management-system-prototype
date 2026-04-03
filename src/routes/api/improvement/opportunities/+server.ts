import { error, json } from '@sveltejs/kit';
import {
	createCapturedSelfImprovementSuggestion,
	loadSelfImprovementSnapshot
} from '$lib/server/self-improvement-store';
import {
	SELF_IMPROVEMENT_CATEGORY_OPTIONS,
	SELF_IMPROVEMENT_SEVERITY_OPTIONS,
	type SelfImprovementCategory,
	type SelfImprovementSeverity
} from '$lib/types/self-improvement';

export const GET = async ({ url }) => {
	const projectId = url.searchParams.get('projectId')?.trim() || null;
	const goalId = url.searchParams.get('goalId')?.trim() || null;

	return json(
		await loadSelfImprovementSnapshot({
			projectId,
			goalId,
			trackImpression: true
		})
	);
};

export const POST = async ({ request }) => {
	const payload = (await request.json().catch(() => ({}))) as {
		title?: string;
		summary?: string;
		category?: string;
		severity?: string;
		projectId?: string | null;
		goalId?: string | null;
	};
	const title = payload.title?.trim() ?? '';
	const summary = payload.summary?.trim() ?? '';

	if (!title || !summary) {
		error(400, 'A title and summary are required to capture a suggestion.');
	}

	if (!SELF_IMPROVEMENT_CATEGORY_OPTIONS.includes(payload.category as SelfImprovementCategory)) {
		error(400, 'A valid suggestion category is required.');
	}

	if (!SELF_IMPROVEMENT_SEVERITY_OPTIONS.includes(payload.severity as SelfImprovementSeverity)) {
		error(400, 'A valid suggestion severity is required.');
	}

	const suggestion = await createCapturedSelfImprovementSuggestion({
		title,
		summary,
		category: payload.category as SelfImprovementCategory,
		severity: payload.severity as SelfImprovementSeverity,
		projectId: payload.projectId?.trim() || null,
		goalId: payload.goalId?.trim() || null
	});

	return json({
		suggestionId: suggestion.id
	});
};
