import type { PageServerLoad } from './$types';
import { listAgentThreads } from '$lib/server/agent-threads';

export const load: PageServerLoad = async () => {
	const threads = await listAgentThreads({
		includeArchived: false,
		includeCategorization: false,
		includeExternal: false,
		reconcileTaskState: false
	});

	return {
		threads,
		visibleRegistryHydrated: false,
		archivedRegistryHydrated: false
	};
};
