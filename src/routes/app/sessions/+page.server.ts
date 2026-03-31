import type { PageServerLoad } from './$types';
import { listAgentSessions } from '$lib/server/agent-sessions';

export const load: PageServerLoad = async () => {
	return {
		sessions: await listAgentSessions({ includeArchived: true })
	};
};
