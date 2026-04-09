import { json } from '@sveltejs/kit';
import { listManagedAgentThreadStatuses } from '$lib/server/agent-threads';

export const GET = async ({ url }) => {
	return json({
		statuses: await listManagedAgentThreadStatuses(url.searchParams.getAll('threadId'))
	});
};
