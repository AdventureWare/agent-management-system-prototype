import { json } from '@sveltejs/kit';
import { cancelAgentThread } from '$lib/server/agent-threads';

export const POST = async ({ params }) => {
	const canceled = await cancelAgentThread(params.sessionId);

	if (!canceled) {
		return json({ error: 'No active run was available to cancel.' }, { status: 400 });
	}

	return json({ canceled: true });
};
