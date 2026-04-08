import { json } from '@sveltejs/kit';
import type { AgentSandbox } from '$lib/types/agent-thread';
import {
	createExecutionSurface,
	loadControlPlane,
	parseExecutionSurfaceLocation,
	parseExecutionSurfaceStatus,
	updateControlPlane
} from '$lib/server/control-plane';
import {
	assertBootstrapToken,
	createExecutionSurfaceAuthToken,
	hashExecutionSurfaceToken,
	toPublicExecutionSurface
} from '$lib/server/execution-surface-api';
import { parseAgentSandbox } from '$lib/server/agent-threads';

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		bootstrapToken?: string;
		name?: string;
		providerId?: string;
		supportedRoleIds?: string[];
		location?: string;
		status?: string;
		capacity?: number;
		note?: string;
		tags?: string[];
		skills?: string[];
		maxConcurrentRuns?: number | null;
		threadSandboxOverride?: string | null;
	};

	assertBootstrapToken(body.bootstrapToken);

	const name = body.name?.trim() ?? '';
	const providerId = body.providerId?.trim() ?? '';
	const supportedRoleIds = Array.from(
		new Set(
			Array.isArray(body.supportedRoleIds)
				? body.supportedRoleIds.map((candidateRoleId) => candidateRoleId.trim()).filter(Boolean)
				: []
		)
	);

	if (!name || !providerId || supportedRoleIds.length === 0) {
		return json(
			{ error: 'name, providerId, and at least one supported role are required.' },
			{ status: 400 }
		);
	}

	const data = await loadControlPlane();
	const provider = data.providers.find((candidate) => candidate.id === providerId);
	const missingRoleId = supportedRoleIds.find(
		(supportedRoleId) => !data.roles.some((candidate) => candidate.id === supportedRoleId)
	);

	if (!provider) {
		return json({ error: 'Unknown providerId.' }, { status: 400 });
	}

	if (missingRoleId) {
		return json({ error: `Unknown supportedRoleId: ${missingRoleId}.` }, { status: 400 });
	}

	const executionSurfaceToken = createExecutionSurfaceAuthToken();
	let createdExecutionSurfaceId = '';

	await updateControlPlane((current) => {
		const executionSurface = createExecutionSurface({
			name,
			providerId,
			supportedRoleIds,
			location: parseExecutionSurfaceLocation(body.location ?? '', 'cloud'),
			status: parseExecutionSurfaceStatus(body.status ?? '', 'idle'),
			capacity:
				typeof body.capacity === 'number' && Number.isFinite(body.capacity) && body.capacity > 0
					? body.capacity
					: 1,
			note: body.note?.trim() ?? '',
			tags: Array.isArray(body.tags) ? body.tags.map((tag) => tag.trim()).filter(Boolean) : [],
			skills: Array.isArray(body.skills)
				? body.skills.map((skill) => skill.trim()).filter(Boolean)
				: [],
			maxConcurrentRuns:
				typeof body.maxConcurrentRuns === 'number' &&
				Number.isFinite(body.maxConcurrentRuns) &&
				body.maxConcurrentRuns > 0
					? body.maxConcurrentRuns
					: null,
			threadSandboxOverride:
				typeof body.threadSandboxOverride === 'string' &&
				body.threadSandboxOverride.trim().length > 0
					? parseAgentSandbox(body.threadSandboxOverride, 'workspace-write')
					: (null as AgentSandbox | null)
		});

		executionSurface.authTokenHash = hashExecutionSurfaceToken(executionSurfaceToken);
		createdExecutionSurfaceId = executionSurface.id;

		return {
			...current,
			executionSurfaces: [executionSurface, ...current.executionSurfaces]
		};
	});

	const nextData = await loadControlPlane();
	const createdExecutionSurface = nextData.executionSurfaces.find(
		(candidate) => candidate.id === createdExecutionSurfaceId
	);

	return json(
		{
			executionSurface: createdExecutionSurface
				? toPublicExecutionSurface(createdExecutionSurface)
				: null,
			executionSurfaceToken
		},
		{ status: 201 }
	);
};
