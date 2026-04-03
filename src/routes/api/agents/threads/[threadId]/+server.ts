import { json } from '@sveltejs/kit';
import { getAgentThread } from '$lib/server/agent-threads';

export const GET = async ({ params }) => {
	const thread = await getAgentThread(params.threadId);

	if (!thread) {
		return json({ error: 'Thread not found.' }, { status: 404 });
	}

	return json({ thread });
};
