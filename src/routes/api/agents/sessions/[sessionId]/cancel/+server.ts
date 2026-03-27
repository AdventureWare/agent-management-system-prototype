import { json } from '@sveltejs/kit';
import { cancelAgentSession } from '$lib/server/agent-sessions';

export const POST = async ({ params }) => {
	const canceled = await cancelAgentSession(params.sessionId);

	if (!canceled) {
		return json({ error: 'No active run was available to cancel.' }, { status: 400 });
	}

	return json({ canceled: true });
};
