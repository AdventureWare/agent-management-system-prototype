import { json } from '@sveltejs/kit';
import {
	listAgentSessions,
	parseAgentSandbox,
	startAgentSession
} from '$lib/server/agent-sessions';

export const GET = async ({ url }) => {
	return json({
		sessions: await listAgentSessions({
			includeArchived: url.searchParams.get('includeArchived') === '1'
		})
	});
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

	const result = await startAgentSession({
		name,
		cwd,
		prompt,
		sandbox: parseAgentSandbox(body.sandbox, 'workspace-write'),
		model: body.model?.trim() || null
	});

	return json(result, { status: 201 });
};
