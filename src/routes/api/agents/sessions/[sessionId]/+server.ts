import { json } from '@sveltejs/kit';
import { getAgentSession } from '$lib/server/agent-sessions';

export const GET = async ({ params }) => {
	const session = await getAgentSession(params.sessionId);

	if (!session) {
		return json({ error: 'Session not found.' }, { status: 404 });
	}

	return json({ session });
};
