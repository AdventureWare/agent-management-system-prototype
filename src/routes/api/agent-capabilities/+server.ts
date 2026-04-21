import { json } from '@sveltejs/kit';
import { getAgentCapabilityManifest } from '$lib/server/agent-capability-manifest';

export const GET = async ({ url }) =>
	json(
		getAgentCapabilityManifest({
			resource: url.searchParams.get('resource'),
			command: url.searchParams.get('command')
		})
	);
