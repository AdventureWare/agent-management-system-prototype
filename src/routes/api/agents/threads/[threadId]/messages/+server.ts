import { json } from '@sveltejs/kit';
import { contactAgentThread, sendAgentThreadMessage } from '$lib/server/agent-threads';

export const POST = async ({ params, request }) => {
	const contentType = request.headers.get('content-type') ?? '';
	let prompt = '';
	let attachments: File[] = [];
	let sourceThreadId = '';
	let contactType = '';
	let contextSummary = '';
	let replyRequested = true;
	let replyToContactId = '';

	if (contentType.includes('application/json')) {
		const body = (await request.json()) as {
			prompt?: string;
			sourceThreadId?: string;
			contactType?: string;
			contextSummary?: string;
			replyRequested?: boolean;
			replyToContactId?: string;
		};

		prompt = body.prompt?.trim() ?? '';
		sourceThreadId = body.sourceThreadId?.trim() ?? '';
		contactType = body.contactType?.trim() ?? '';
		contextSummary = body.contextSummary?.trim() ?? '';
		replyRequested = body.replyRequested !== false;
		replyToContactId = body.replyToContactId?.trim() ?? '';
	} else {
		const form = await request.formData();
		prompt = form.get('prompt')?.toString().trim() ?? '';
		sourceThreadId = form.get('sourceThreadId')?.toString().trim() ?? '';
		contactType = form.get('contactType')?.toString().trim() ?? '';
		contextSummary = form.get('contextSummary')?.toString().trim() ?? '';
		replyRequested = form.get('replyRequested')?.toString().trim() !== 'false';
		replyToContactId = form.get('replyToContactId')?.toString().trim() ?? '';
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
					attachments,
					contactType: contactType || 'question',
					contextSummary: contextSummary || null,
					replyRequested,
					replyToContactId: replyToContactId || null
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
