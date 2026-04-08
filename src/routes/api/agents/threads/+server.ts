import { json } from '@sveltejs/kit';
import {
	listAgentThreads,
	parseAgentSandbox,
	rankAgentThreadsForRouting,
	startAgentThread
} from '$lib/server/agent-threads';
import { buildThreadContactTarget } from '$lib/server/thread-contact-targets';

export const GET = async ({ url }) => {
	const limitValue = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
	const threads = rankAgentThreadsForRouting(
		await listAgentThreads({
			includeArchived: url.searchParams.get('includeArchived') === '1',
			includeCategorization: url.searchParams.get('includeCategorization') !== '0'
		}),
		{
			q: url.searchParams.get('q'),
			role: url.searchParams.get('role'),
			project: url.searchParams.get('project'),
			taskId: url.searchParams.get('taskId'),
			sourceThreadId: url.searchParams.get('sourceThreadId'),
			canContact: url.searchParams.get('canContact') === '1',
			limit: Number.isFinite(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : undefined
		}
	);

	return json({ threads, targets: threads.map(buildThreadContactTarget) });
};

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		name?: string;
		cwd?: string;
		additionalWritableRoots?: string[];
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
		additionalWritableRoots: Array.isArray(body.additionalWritableRoots)
			? body.additionalWritableRoots
			: [],
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
