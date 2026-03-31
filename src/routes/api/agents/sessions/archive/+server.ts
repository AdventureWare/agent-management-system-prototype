import { json } from '@sveltejs/kit';
import { setAgentSessionsArchived } from '$lib/server/agent-sessions';

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		sessionIds?: unknown;
		archived?: boolean;
	};
	const sessionIds = Array.isArray(body.sessionIds)
		? body.sessionIds.filter((sessionId): sessionId is string => typeof sessionId === 'string')
		: [];

	if (sessionIds.length === 0) {
		return json({ error: 'At least one session id is required.' }, { status: 400 });
	}

	return json({
		updatedSessionIds: await setAgentSessionsArchived(sessionIds, body.archived !== false)
	});
};
