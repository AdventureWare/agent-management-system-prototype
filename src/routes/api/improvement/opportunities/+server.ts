import { json } from '@sveltejs/kit';
import { loadSelfImprovementSnapshot } from '$lib/server/self-improvement-store';

export const GET = async () => {
	return json(await loadSelfImprovementSnapshot());
};
