import { json } from '@sveltejs/kit';
import { getAgentThread, updateAgentThreadHandleAlias } from '$lib/server/agent-threads';

export const GET = async ({ params }) => {
	const thread = await getAgentThread(params.threadId);

	if (!thread) {
		return json({ error: 'Thread not found.' }, { status: 404 });
	}

	return json({ thread });
};

export const PATCH = async ({ params, request }) => {
	const body = (await request.json()) as {
		handleAlias?: string | null;
	};

	try {
		await updateAgentThreadHandleAlias(params.threadId, body.handleAlias);
		const thread = await getAgentThread(params.threadId);

		if (!thread) {
			return json({ error: 'Thread not found.' }, { status: 404 });
		}

		return json({ thread });
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : 'Could not update the thread handle alias.' },
			{ status: 400 }
		);
	}
};
