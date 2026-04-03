import { json } from '@sveltejs/kit';
import { setAgentThreadsArchived } from '$lib/server/agent-threads';

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		threadIds?: unknown;
		archived?: boolean;
	};
	const threadIds = Array.isArray(body.threadIds)
		? body.threadIds.filter((threadId): threadId is string => typeof threadId === 'string')
		: [];

	if (threadIds.length === 0) {
		return json({ error: 'At least one thread id is required.' }, { status: 400 });
	}

	const updatedThreadIds = await setAgentThreadsArchived(threadIds, body.archived !== false);

	return json({ updatedThreadIds });
};
