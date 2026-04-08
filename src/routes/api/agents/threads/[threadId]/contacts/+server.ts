import { json } from '@sveltejs/kit';
import { getAgentThread, listAgentThreadContacts } from '$lib/server/agent-threads';

export const GET = async ({ params, url }) => {
	const thread = await getAgentThread(params.threadId);

	if (!thread) {
		return json({ error: 'Thread not found.' }, { status: 404 });
	}

	const limitValue = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
	const contacts = await listAgentThreadContacts({
		threadId: params.threadId,
		limit: Number.isFinite(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : undefined
	});

	return json({ contacts });
};
