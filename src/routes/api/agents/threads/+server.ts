import { json } from '@sveltejs/kit';
import { listAgentThreads, parseAgentSandbox, startAgentThread } from '$lib/server/agent-threads';

export const GET = async ({ url }) => {
	const threads = await listAgentThreads({
		includeArchived: url.searchParams.get('includeArchived') === '1'
	});

	return json({ threads });
};

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		name?: string;
		cwd?: string;
		prompt?: string;
		model?: string;
		sandbox?: string;
	};

	const name = body.name?.trim() ?? '';
	const cwd = body.cwd?.trim() ?? '';
	const prompt = body.prompt?.trim() ?? '';

	if (!name || !cwd || !prompt) {
		return json({ error: 'name, cwd, and prompt are required.' }, { status: 400 });
	}

	const result = await startAgentThread({
		name,
		cwd,
		prompt,
		sandbox: parseAgentSandbox(body.sandbox, 'workspace-write'),
		model: body.model?.trim() || null
	});

	return json(
		{
			...result,
			threadId: result.agentThreadId
		},
		{ status: 201 }
	);
};
