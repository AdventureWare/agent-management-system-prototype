import { json } from '@sveltejs/kit';
import { loadSelfImprovementSnapshot } from '$lib/server/self-improvement-store';

export const GET = async ({ url }) => {
	const projectId = url.searchParams.get('projectId')?.trim() || null;
	const goalId = url.searchParams.get('goalId')?.trim() || null;

	return json(
		await loadSelfImprovementSnapshot({
			projectId,
			goalId
		})
	);
};
