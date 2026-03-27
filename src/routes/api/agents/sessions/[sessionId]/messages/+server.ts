import { json } from '@sveltejs/kit';
import { sendAgentSessionMessage } from '$lib/server/agent-sessions';

export const POST = async ({ params, request }) => {
	const body = (await request.json()) as {
		prompt?: string;
	};

	const prompt = body.prompt?.trim() ?? '';

	if (!prompt) {
		return json({ error: 'prompt is required.' }, { status: 400 });
	}

	try {
		const result = await sendAgentSessionMessage(params.sessionId, prompt);
		return json(result, { status: 201 });
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : 'Could not queue session message.' },
			{ status: 400 }
		);
	}
};
