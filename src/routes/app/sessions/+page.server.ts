import type { PageServerLoad } from './$types';
import { listAgentThreads } from '$lib/server/agent-threads';

export const load: PageServerLoad = async () => {
	return {
		sessions: await listAgentThreads({ includeArchived: true })
	};
};
