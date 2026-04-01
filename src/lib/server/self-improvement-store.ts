import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTask, loadControlPlane, updateControlPlane } from '$lib/server/control-plane';
import { listAgentSessions } from '$lib/server/agent-sessions';
import { buildSelfImprovementAnalysis } from '$lib/server/self-improvement';
import type { ControlPlaneData } from '$lib/types/control-plane';
import type {
	SelfImprovementAnalysis,
	SelfImprovementOpportunityRecord,
	SelfImprovementSnapshot,
	SelfImprovementStatus
} from '$lib/types/self-improvement';

const DATA_FILE = resolve(process.cwd(), 'data', 'self-improvement.json');

type SelfImprovementDb = {
	records: SelfImprovementOpportunityRecord[];
};

function defaultDb(): SelfImprovementDb {
	return {
		records: []
	};
}

function createDefaultRecord(
	opportunityId: string,
	timestamp: string
): SelfImprovementOpportunityRecord {
	return {
		id: opportunityId,
		status: 'open',
		firstSeenAt: timestamp,
		lastSeenAt: timestamp,
		updatedAt: timestamp,
		acceptedAt: null,
		dismissedAt: null,
		decisionSummary: '',
		createdTaskId: null,
		createdTaskTitle: null
	};
}

async function ensureSelfImprovementDb() {
	try {
		await readFile(DATA_FILE, 'utf8');
	} catch {
		await mkdir(resolve(process.cwd(), 'data'), { recursive: true });
		await writeFile(DATA_FILE, JSON.stringify(defaultDb(), null, 2));
	}
}

export async function loadSelfImprovementDb(): Promise<SelfImprovementDb> {
	await ensureSelfImprovementDb();
	const raw = await readFile(DATA_FILE, 'utf8');

	try {
		const parsed = JSON.parse(raw) as Partial<SelfImprovementDb>;

		return {
			records: Array.isArray(parsed.records)
				? parsed.records.filter(
						(record): record is SelfImprovementOpportunityRecord =>
							Boolean(record) && typeof record === 'object'
					)
				: []
		};
	} catch {
		return defaultDb();
	}
}

async function saveSelfImprovementDb(data: SelfImprovementDb) {
	await mkdir(resolve(process.cwd(), 'data'), { recursive: true });
	await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export function mergeSelfImprovementSnapshot(
	analysis: SelfImprovementAnalysis,
	records: SelfImprovementOpportunityRecord[]
): SelfImprovementSnapshot {
	const recordMap = new Map(records.map((record) => [record.id, record]));
	const trackedOpportunities = analysis.opportunities.map((opportunity) => {
		const existingRecord = recordMap.get(opportunity.id);
		const record = existingRecord ?? createDefaultRecord(opportunity.id, analysis.generatedAt);

		return {
			...opportunity,
			...record
		};
	});
	const openCount = trackedOpportunities.filter(
		(opportunity) => opportunity.status === 'open'
	).length;
	const acceptedCount = trackedOpportunities.filter(
		(opportunity) => opportunity.status === 'accepted'
	).length;
	const dismissedCount = trackedOpportunities.filter(
		(opportunity) => opportunity.status === 'dismissed'
	).length;

	return {
		generatedAt: analysis.generatedAt,
		summary: {
			...analysis.summary,
			openCount,
			acceptedCount,
			dismissedCount
		},
		opportunities: trackedOpportunities
	};
}

export async function syncSelfImprovementAnalysis(
	analysis: SelfImprovementAnalysis
): Promise<SelfImprovementSnapshot> {
	const current = await loadSelfImprovementDb();
	const recordMap = new Map(current.records.map((record) => [record.id, record]));
	const nextRecords = [...current.records];

	for (const opportunity of analysis.opportunities) {
		const existingRecord = recordMap.get(opportunity.id);

		if (existingRecord) {
			const nextRecord = {
				...existingRecord,
				lastSeenAt: analysis.generatedAt
			};
			recordMap.set(opportunity.id, nextRecord);
			const index = nextRecords.findIndex((record) => record.id === opportunity.id);
			nextRecords[index] = nextRecord;
			continue;
		}

		const newRecord = createDefaultRecord(opportunity.id, analysis.generatedAt);
		recordMap.set(opportunity.id, newRecord);
		nextRecords.push(newRecord);
	}

	await saveSelfImprovementDb({
		records: nextRecords
	});

	return mergeSelfImprovementSnapshot(analysis, nextRecords);
}

export async function loadSelfImprovementSnapshot(input?: {
	data?: ControlPlaneData;
	sessions?: Awaited<ReturnType<typeof listAgentSessions>>;
	now?: number;
}): Promise<SelfImprovementSnapshot> {
	const [data, sessions] = await Promise.all([
		input?.data ? Promise.resolve(input.data) : loadControlPlane(),
		input?.sessions ? Promise.resolve(input.sessions) : listAgentSessions()
	]);
	const analysis = buildSelfImprovementAnalysis({
		data,
		sessions,
		now: input?.now
	});

	return syncSelfImprovementAnalysis(analysis);
}

export async function setSelfImprovementOpportunityStatus(input: {
	opportunityId: string;
	status: SelfImprovementStatus;
	decisionSummary?: string;
	createdTaskId?: string | null;
	createdTaskTitle?: string | null;
}) {
	const current = await loadSelfImprovementDb();
	const now = new Date().toISOString();
	const existingRecord =
		current.records.find((record) => record.id === input.opportunityId) ??
		createDefaultRecord(input.opportunityId, now);
	const nextRecord: SelfImprovementOpportunityRecord = {
		...existingRecord,
		status: input.status,
		updatedAt: now,
		acceptedAt:
			input.status === 'accepted' ? (existingRecord.acceptedAt ?? now) : existingRecord.acceptedAt,
		dismissedAt:
			input.status === 'dismissed'
				? (existingRecord.dismissedAt ?? now)
				: existingRecord.dismissedAt,
		decisionSummary: input.decisionSummary ?? existingRecord.decisionSummary,
		createdTaskId:
			input.createdTaskId === undefined ? existingRecord.createdTaskId : input.createdTaskId,
		createdTaskTitle:
			input.createdTaskTitle === undefined
				? existingRecord.createdTaskTitle
				: input.createdTaskTitle
	};
	const nextRecords = current.records.some((record) => record.id === input.opportunityId)
		? current.records.map((record) => (record.id === input.opportunityId ? nextRecord : record))
		: [...current.records, nextRecord];

	await saveSelfImprovementDb({
		records: nextRecords
	});

	return nextRecord;
}

function getDefaultImprovementRoleId(data: ControlPlaneData) {
	return data.roles.find((role) => role.id === 'role_coordinator')?.id ?? data.roles[0]?.id ?? '';
}

export async function createTaskFromSelfImprovementOpportunity(opportunityId: string) {
	const [data, snapshot, db] = await Promise.all([
		loadControlPlane(),
		loadSelfImprovementSnapshot(),
		loadSelfImprovementDb()
	]);
	const opportunity = snapshot.opportunities.find((candidate) => candidate.id === opportunityId);

	if (!opportunity || !opportunity.projectId || !opportunity.suggestedTask) {
		return null;
	}

	if (db.records.some((record) => record.id === opportunityId && Boolean(record.createdTaskId))) {
		const record = db.records.find((candidate) => candidate.id === opportunityId) ?? null;
		const existingTask = data.tasks.find((task) => task.id === record?.createdTaskId) ?? null;

		if (existingTask) {
			return existingTask;
		}
	}

	const project = data.projects.find((candidate) => candidate.id === opportunity.projectId);

	if (!project) {
		return null;
	}

	const createdTask = createTask({
		title: opportunity.suggestedTask.title,
		summary: opportunity.suggestedTask.summary,
		projectId: opportunity.projectId,
		lane: 'ops',
		goalId: '',
		priority: opportunity.suggestedTask.priority,
		riskLevel: 'medium',
		approvalMode: 'none',
		requiresReview: true,
		desiredRoleId: getDefaultImprovementRoleId(data),
		artifactPath: project.defaultArtifactRoot || project.projectRootFolder || '',
		status: 'in_draft'
	});

	await updateControlPlane((current) => ({
		...current,
		tasks: [createdTask, ...current.tasks]
	}));

	await setSelfImprovementOpportunityStatus({
		opportunityId,
		status: 'accepted',
		decisionSummary:
			opportunity.decisionSummary || 'Accepted and converted into a draft self-improvement task.',
		createdTaskId: createdTask.id,
		createdTaskTitle: createdTask.title
	});

	return createdTask;
}
