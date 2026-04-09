import { json } from '@sveltejs/kit';
import { loadControlPlane } from '$lib/server/control-plane';
import { listAgentThreads } from '$lib/server/agent-threads';
import { buildThreadContactTargets } from '$lib/server/thread-contact-targets';

export const GET = async ({ params }) => {
	const controlPlanePromise = loadControlPlane();
	const threads = await listAgentThreads({
		includeArchived: false,
		controlPlane: controlPlanePromise
	});

	return json({
		targets: buildThreadContactTargets(threads, {
			sourceThreadId: params.threadId
		})
	});
};
