import { json } from '@sveltejs/kit';
import type { AgentSandbox } from '$lib/types/agent-thread';
import {
	createWorker,
	loadControlPlane,
	parseWorkerLocation,
	parseWorkerStatus,
	updateControlPlane
} from '$lib/server/control-plane';
import {
	assertBootstrapToken,
	createWorkerAuthToken,
	hashWorkerToken,
	toPublicWorker
} from '$lib/server/worker-api';
import { parseAgentSandbox } from '$lib/server/agent-threads';

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		bootstrapToken?: string;
		name?: string;
		providerId?: string;
		roleId?: string;
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
			[
				...(Array.isArray(body.supportedRoleIds)
					? body.supportedRoleIds.map((candidateRoleId) => candidateRoleId.trim()).filter(Boolean)
					: []),
				body.roleId?.trim() ?? ''
			].filter(Boolean)
		)
	);
	const roleId = supportedRoleIds[0] ?? '';

	if (!name || !providerId || !roleId) {
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
		return json({ error: `Unknown roleId: ${missingRoleId}.` }, { status: 400 });
	}

	const workerToken = createWorkerAuthToken();
	let createdWorkerId = '';

	await updateControlPlane((current) => {
		const worker = createWorker({
			name,
			providerId,
			roleId,
			supportedRoleIds,
			location: parseWorkerLocation(body.location ?? '', 'cloud'),
			status: parseWorkerStatus(body.status ?? '', 'idle'),
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

		worker.authTokenHash = hashWorkerToken(workerToken);
		createdWorkerId = worker.id;

		return {
			...current,
			workers: [worker, ...current.workers]
		};
	});

	const nextData = await loadControlPlane();
	const createdWorker = nextData.workers.find((worker) => worker.id === createdWorkerId);

	return json(
		{
			worker: createdWorker ? toPublicWorker(createdWorker) : null,
			workerToken
		},
		{ status: 201 }
	);
};
