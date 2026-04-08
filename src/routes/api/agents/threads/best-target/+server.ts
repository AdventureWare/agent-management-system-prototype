import { json } from '@sveltejs/kit';
import { listAgentThreads, rankAgentThreadsForRouting } from '$lib/server/agent-threads';
import { buildThreadContactTarget } from '$lib/server/thread-contact-targets';

export const GET = async ({ url }) => {
	const thread =
		rankAgentThreadsForRouting(
			await listAgentThreads({
				includeArchived: url.searchParams.get('includeArchived') === '1'
			}),
			{
				q: url.searchParams.get('q'),
				role: url.searchParams.get('role'),
				project: url.searchParams.get('project'),
				taskId: url.searchParams.get('taskId'),
				sourceThreadId: url.searchParams.get('sourceThreadId'),
				canContact: url.searchParams.get('canContact') !== '0',
				limit: 1
			}
		)[0] ?? null;

	return json({ thread, target: thread ? buildThreadContactTarget(thread) : null });
};
