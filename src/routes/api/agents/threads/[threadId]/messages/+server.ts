import { json } from '@sveltejs/kit';
import { contactAgentThread, sendAgentThreadMessage } from '$lib/server/agent-threads';

export const POST = async ({ params, request }) => {
	const contentType = request.headers.get('content-type') ?? '';
	let prompt = '';
	let attachments: File[] = [];
	let sourceThreadId = '';

	if (contentType.includes('application/json')) {
		const body = (await request.json()) as {
			prompt?: string;
			sourceThreadId?: string;
		};

		prompt = body.prompt?.trim() ?? '';
		sourceThreadId = body.sourceThreadId?.trim() ?? '';
	} else {
		const form = await request.formData();
		prompt = form.get('prompt')?.toString().trim() ?? '';
		sourceThreadId = form.get('sourceThreadId')?.toString().trim() ?? '';
		attachments = form
			.getAll('attachments')
			.filter((value): value is File => value instanceof File && value.size > 0);
	}

	if (sourceThreadId && !prompt) {
		return json({ error: 'prompt is required when contacting another thread.' }, { status: 400 });
	}

	if (!prompt && attachments.length === 0) {
		return json({ error: 'prompt or attachment is required.' }, { status: 400 });
	}

	try {
		const result = sourceThreadId
			? await contactAgentThread(sourceThreadId, {
					targetAgentThreadId: params.threadId,
					prompt,
					attachments
				})
			: await sendAgentThreadMessage(params.threadId, { prompt, attachments });
		return json(
			{
				...result,
				threadId: result.agentThreadId
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
