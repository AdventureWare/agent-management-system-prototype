import { json } from '@sveltejs/kit';
import { contactAgentThread, sendAgentThreadMessage } from '$lib/server/agent-threads';
import type { AgentThreadContactContextItem } from '$lib/types/agent-thread';

function isAgentThreadContactContextItem(value: unknown): value is AgentThreadContactContextItem {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Partial<AgentThreadContactContextItem>;
	return (
		typeof candidate.id === 'string' &&
		typeof candidate.kind === 'string' &&
		typeof candidate.label === 'string' &&
		typeof candidate.detail === 'string' &&
		(candidate.path === null || typeof candidate.path === 'string') &&
		(candidate.href === null || typeof candidate.href === 'string')
	);
}

export const POST = async ({ params, request }) => {
	const contentType = request.headers.get('content-type') ?? '';
	let attachments: File[] = [];
	let prompt: string;
	let sourceThreadId: string;
	let contactType: string;
	let contextSummary: string;
	let contextItems: AgentThreadContactContextItem[];
	let replyRequested: boolean;
	let replyToContactId: string;

	if (contentType.includes('application/json')) {
		const body = (await request.json()) as {
			prompt?: string;
			sourceThreadId?: string;
			contactType?: string;
			contextSummary?: string;
			contextItems?: unknown[];
			replyRequested?: boolean;
			replyToContactId?: string;
		};

		prompt = body.prompt?.trim() ?? '';
		sourceThreadId = body.sourceThreadId?.trim() ?? '';
		contactType = body.contactType?.trim() ?? '';
		contextSummary = body.contextSummary?.trim() ?? '';
		contextItems = Array.isArray(body.contextItems)
			? body.contextItems.filter(isAgentThreadContactContextItem)
			: [];
		replyRequested = body.replyRequested !== false;
		replyToContactId = body.replyToContactId?.trim() ?? '';
	} else {
		const form = await request.formData();
		prompt = form.get('prompt')?.toString().trim() ?? '';
		sourceThreadId = form.get('sourceThreadId')?.toString().trim() ?? '';
		contactType = form.get('contactType')?.toString().trim() ?? '';
		contextSummary = form.get('contextSummary')?.toString().trim() ?? '';
		contextItems = form
			.getAll('contextItems')
			.map((value) => value.toString())
			.flatMap((value) => {
				try {
					const parsed = JSON.parse(value);
					return isAgentThreadContactContextItem(parsed) ? [parsed] : [];
				} catch {
					return [];
				}
			});
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
					contextItems,
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
