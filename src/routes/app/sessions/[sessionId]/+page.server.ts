import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAgentSession } from '$lib/server/agent-sessions';

export const load: PageServerLoad = async ({ params }) => {
	const session = await getAgentSession(params.sessionId);

	if (!session) {
		throw error(404, 'Session not found.');
	}

	return {
		session
	};
};
