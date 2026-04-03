import { json } from '@sveltejs/kit';
import { sendAgentThreadMessage } from '$lib/server/agent-threads';

export const POST = async ({ params, request }) => {
	const contentType = request.headers.get('content-type') ?? '';
	let prompt = '';
	let attachments: File[] = [];

	if (contentType.includes('application/json')) {
		const body = (await request.json()) as {
			prompt?: string;
		};

		prompt = body.prompt?.trim() ?? '';
	} else {
		const form = await request.formData();
		prompt = form.get('prompt')?.toString().trim() ?? '';
		attachments = form
			.getAll('attachments')
			.filter((value): value is File => value instanceof File && value.size > 0);
	}

	if (!prompt && attachments.length === 0) {
		return json({ error: 'prompt or attachment is required.' }, { status: 400 });
	}

	try {
		const result = await sendAgentThreadMessage(params.sessionId, { prompt, attachments });
		return json(
			{
				...result,
				threadId: result.sessionId
			},
			{ status: 201 }
		);
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : 'Could not queue thread message.' },
			{ status: 400 }
		);
	}
};
