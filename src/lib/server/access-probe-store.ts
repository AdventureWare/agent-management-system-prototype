import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { AccessDashboardData } from '$lib/server/access-dashboard';

const DATA_FILE = resolve(process.cwd(), 'data', 'access-probes.json');
const MAX_ACCESS_EVENTS = 200;

export type AccessProbeStatus =
	| 'healthy'
	| 'warning'
	| 'blocked'
	| 'unknown'
	| 'disabled'
	| 'needs_setup'
	| 'offline'
	| 'provider_missing';

export type AccessProbeRecord = {
	targetKey: string;
	targetKind: 'local_path' | 'provider' | 'execution_surface';
	targetLabel: string;
	scopeLabel: string;
	scopeHref: string;
	status: AccessProbeStatus;
	summary: string;
	checkedAt: string;
};

export type AccessProbeEvent = {
	id: string;
	targetKey: string;
	targetKind: AccessProbeRecord['targetKind'];
	targetLabel: string;
	scopeLabel: string;
	scopeHref: string;
	previousStatus: AccessProbeStatus | null;
	nextStatus: AccessProbeStatus;
	summary: string;
	checkedAt: string;
};

export type AccessProbeState = {
	lastCheckedAt: string | null;
	records: AccessProbeRecord[];
	events: AccessProbeEvent[];
};

function defaultAccessProbeState(): AccessProbeState {
	return {
		lastCheckedAt: null,
		records: [],
		events: []
	};
}

function getLocalPathRecordStatus(
	item: AccessDashboardData['projects'][number]['permissionSurface']['localPaths'][number]
): AccessProbeStatus {
	if (item.accessStatus === 'missing' || item.accessStatus === 'needs_host_access') {
		return 'blocked';
	}

	if (
		item.accessStatus === 'macos_cloud_probe_blocked' ||
		item.coverageStatus === 'outside_sandbox'
	) {
		return 'warning';
	}

	if (item.accessStatus === 'not_configured') {
		return 'unknown';
	}

	return 'healthy';
}

function getProviderRecordStatus(
	provider: AccessDashboardData['providers'][number]
): AccessProbeStatus {
	if (!provider.enabled) {
		return 'disabled';
	}

	if (provider.setupStatus !== 'connected') {
		return 'needs_setup';
	}

	return 'healthy';
}

function getExecutionSurfaceRecordStatus(
	executionSurface: AccessDashboardData['executionSurfaces'][number]
): AccessProbeStatus {
	switch (executionSurface.accessState) {
		case 'provider_disabled':
			return 'disabled';
		case 'provider_needs_setup':
			return 'needs_setup';
		case 'offline':
			return 'offline';
		case 'unknown_provider':
			return 'provider_missing';
		case 'healthy':
		default:
			return 'healthy';
	}
}

export function buildAccessProbeRecords(dashboard: AccessDashboardData, checkedAt: string) {
	const localPathRecords = dashboard.projects.flatMap(
		(project) =>
			project.permissionSurface.localPaths.map((item) => ({
				targetKey: `local_path:${project.id}:${item.id}`,
				targetKind: 'local_path',
				targetLabel: item.label,
				scopeLabel: project.name,
				scopeHref: project.projectHref,
				status: getLocalPathRecordStatus(item),
				summary: item.recommendedAction ?? item.accessMessage,
				checkedAt
			})) satisfies AccessProbeRecord[]
	);
	const providerRecords = dashboard.providers.map(
		(provider) =>
			({
				targetKey: `provider:${provider.id}`,
				targetKind: 'provider',
				targetLabel: provider.name,
				scopeLabel: provider.service,
				scopeHref: provider.providerHref,
				status: getProviderRecordStatus(provider),
				summary: provider.enabled
					? `Setup status: ${provider.setupStatus}.`
					: 'Provider is disabled.',
				checkedAt
			}) satisfies AccessProbeRecord
	);
	const executionSurfaceRecords = dashboard.executionSurfaces.map(
		(executionSurface) =>
			({
				targetKey: `execution_surface:${executionSurface.id}`,
				targetKind: 'execution_surface',
				targetLabel: executionSurface.name,
				scopeLabel: executionSurface.providerName,
				scopeHref: executionSurface.executionSurfaceHref,
				status: getExecutionSurfaceRecordStatus(executionSurface),
				summary:
					executionSurface.accessState === 'healthy'
						? 'Execution surface and provider look ready.'
						: `Execution surface access state: ${executionSurface.accessState.replace(/_/g, ' ')}.`,
				checkedAt
			}) satisfies AccessProbeRecord
	);

	return [...localPathRecords, ...providerRecords, ...executionSurfaceRecords];
}

export function applyAccessProbeSnapshot(
	previous: AccessProbeState,
	records: AccessProbeRecord[],
	checkedAt: string
) {
	const previousByKey = new Map(previous.records.map((record) => [record.targetKey, record]));
	const events = [...previous.events];

	for (const record of records) {
		const prior = previousByKey.get(record.targetKey);

		if (!prior || prior.status !== record.status || prior.summary !== record.summary) {
			events.unshift({
				id: `access_event_${randomUUID()}`,
				targetKey: record.targetKey,
				targetKind: record.targetKind,
				targetLabel: record.targetLabel,
				scopeLabel: record.scopeLabel,
				scopeHref: record.scopeHref,
				previousStatus: prior?.status ?? null,
				nextStatus: record.status,
				summary: record.summary,
				checkedAt
			});
		}
	}

	return {
		lastCheckedAt: checkedAt,
		records,
		events: events.slice(0, MAX_ACCESS_EVENTS)
	} satisfies AccessProbeState;
}

export async function loadAccessProbeState(filePath = DATA_FILE) {
	try {
		const raw = await readFile(filePath, 'utf8');
		const parsed = JSON.parse(raw) as Partial<AccessProbeState>;

		return {
			lastCheckedAt: typeof parsed.lastCheckedAt === 'string' ? parsed.lastCheckedAt : null,
			records: Array.isArray(parsed.records) ? parsed.records : [],
			events: Array.isArray(parsed.events) ? parsed.events : []
		} satisfies AccessProbeState;
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			return defaultAccessProbeState();
		}

		throw error;
	}
}

export async function saveAccessProbeState(state: AccessProbeState, filePath = DATA_FILE) {
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

export async function runAndStoreAccessProbe(dashboard: AccessDashboardData, filePath = DATA_FILE) {
	const checkedAt = new Date().toISOString();
	const previous = await loadAccessProbeState(filePath);
	const records = buildAccessProbeRecords(dashboard, checkedAt);
	const next = applyAccessProbeSnapshot(previous, records, checkedAt);

	await saveAccessProbeState(next, filePath);

	return next;
}
