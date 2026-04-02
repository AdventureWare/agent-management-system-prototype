import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTask, loadControlPlane, updateControlPlane } from '$lib/server/control-plane';
import { listAgentSessions } from '$lib/server/agent-sessions';
import { getGoalScopeProjectIds, getGoalScopeTaskIds } from '$lib/server/goal-relationships';
import {
	applySelfImprovementGoalContext,
	buildSelfImprovementAnalysis,
	buildSelfImprovementFeedbackSignals,
	summarizeSelfImprovementFeedbackSignals
} from '$lib/server/self-improvement';
import {
	SELF_IMPROVEMENT_CATEGORY_OPTIONS,
	SELF_IMPROVEMENT_SIGNAL_TYPE_OPTIONS,
	SELF_IMPROVEMENT_SOURCE_OPTIONS
} from '$lib/types/self-improvement';
import type { ControlPlaneData } from '$lib/types/control-plane';
import type {
	SelfImprovementAnalysis,
	SelfImprovementFeedbackSignal,
	SelfImprovementKnowledgeItem,
	SelfImprovementKnowledgeStatus,
	SelfImprovementOpportunityRecord,
	TrackedSelfImprovementFeedbackSignal,
	SelfImprovementSnapshot,
	SelfImprovementStatus
} from '$lib/types/self-improvement';

const DATA_FILE = resolve(process.cwd(), 'data', 'self-improvement.json');

type SelfImprovementDb = {
	records: SelfImprovementOpportunityRecord[];
	signals: TrackedSelfImprovementFeedbackSignal[];
	knowledgeItems: SelfImprovementKnowledgeItem[];
};

function defaultDb(): SelfImprovementDb {
	return {
		records: [],
		signals: [],
		knowledgeItems: []
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
		createdTaskTitle: null,
		createdKnowledgeItemId: null,
		createdKnowledgeItemTitle: null
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
				: [],
			signals: Array.isArray(parsed.signals)
				? parsed.signals.filter(
						(signal): signal is TrackedSelfImprovementFeedbackSignal =>
							Boolean(signal) && typeof signal === 'object'
					)
				: [],
			knowledgeItems: Array.isArray(parsed.knowledgeItems)
				? parsed.knowledgeItems.filter(
						(item): item is SelfImprovementKnowledgeItem =>
							Boolean(item) && typeof item === 'object'
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
	records: SelfImprovementOpportunityRecord[],
	signals: TrackedSelfImprovementFeedbackSignal[],
	knowledgeItems: SelfImprovementKnowledgeItem[] = []
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
	const sortedKnowledgeItems = [...knowledgeItems].sort((left, right) =>
		right.updatedAt.localeCompare(left.updatedAt)
	);

	return {
		generatedAt: analysis.generatedAt,
		summary: {
			...analysis.summary,
			openCount,
			acceptedCount,
			dismissedCount
		},
		opportunities: trackedOpportunities,
		signalSummary: summarizeSelfImprovementFeedbackSignals(signals),
		signals,
		knowledgeSummary: summarizeSelfImprovementKnowledgeItems(sortedKnowledgeItems),
		knowledgeItems: sortedKnowledgeItems
	};
}

export async function syncSelfImprovementAnalysis(
	analysis: SelfImprovementAnalysis,
	signals: SelfImprovementFeedbackSignal[]
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

	const signalMap = new Map(current.signals.map((signal) => [signal.id, signal]));
	const nextSignals = signals.map((signal) => {
		const existingSignal = signalMap.get(signal.id);

		return {
			...signal,
			firstSeenAt: existingSignal?.firstSeenAt ?? analysis.generatedAt,
			lastSeenAt: analysis.generatedAt
		};
	});

	await saveSelfImprovementDb({
		records: nextRecords,
		signals: nextSignals,
		knowledgeItems: current.knowledgeItems
	});

	return mergeSelfImprovementSnapshot(analysis, nextRecords, nextSignals, current.knowledgeItems);
}

export async function loadSelfImprovementSnapshot(input?: {
	data?: ControlPlaneData;
	sessions?: Awaited<ReturnType<typeof listAgentSessions>>;
	now?: number;
	projectId?: string | null;
	goalId?: string | null;
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
	const signals = buildSelfImprovementFeedbackSignals({
		data,
		sessions,
		now: input?.now
	});

	return applySelfImprovementGoalContext(
		filterSelfImprovementSnapshot(await syncSelfImprovementAnalysis(analysis, signals), {
			projectId: input?.projectId ?? null,
			goalId: input?.goalId ?? null,
			data
		}),
		{
			data,
			goalId: input?.goalId ?? null
		}
	);
}

export async function setSelfImprovementOpportunityStatus(input: {
	opportunityId: string;
	status: SelfImprovementStatus;
	decisionSummary?: string;
	createdTaskId?: string | null;
	createdTaskTitle?: string | null;
	createdKnowledgeItemId?: string | null;
	createdKnowledgeItemTitle?: string | null;
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
				: input.createdTaskTitle,
		createdKnowledgeItemId:
			input.createdKnowledgeItemId === undefined
				? existingRecord.createdKnowledgeItemId
				: input.createdKnowledgeItemId,
		createdKnowledgeItemTitle:
			input.createdKnowledgeItemTitle === undefined
				? existingRecord.createdKnowledgeItemTitle
				: input.createdKnowledgeItemTitle
	};
	const nextRecords = current.records.some((record) => record.id === input.opportunityId)
		? current.records.map((record) => (record.id === input.opportunityId ? nextRecord : record))
		: [...current.records, nextRecord];

	await saveSelfImprovementDb({
		records: nextRecords,
		signals: current.signals,
		knowledgeItems: current.knowledgeItems
	});

	return nextRecord;
}

function initializeCountRecord<T extends string>(values: readonly T[]) {
	return Object.fromEntries(values.map((value) => [value, 0])) as Record<T, number>;
}

function matchesProjectScope(recordProjectId: string | null, projectId: string | null | undefined) {
	return !projectId || recordProjectId === projectId;
}

function intersectsRecordScope(recordIds: string[], scopedIds: Set<string>) {
	return recordIds.some((recordId) => scopedIds.has(recordId));
}

export function filterSelfImprovementSnapshot(
	snapshot: SelfImprovementSnapshot,
	input: {
		projectId?: string | null;
		goalId?: string | null;
		data?: ControlPlaneData;
	}
): SelfImprovementSnapshot {
	if (!input.projectId && !input.goalId) {
		return snapshot;
	}

	const scopedTaskIds =
		input.goalId && input.data ? new Set(getGoalScopeTaskIds(input.data, input.goalId)) : null;
	const scopedProjectIds =
		input.goalId && input.data ? new Set(getGoalScopeProjectIds(input.data, input.goalId)) : null;
	const matchesGoalScope = (projectId: string | null, taskIds: string[]) => {
		if (!input.goalId || !scopedTaskIds || !scopedProjectIds) {
			return true;
		}

		return scopedProjectIds.has(projectId ?? '') || intersectsRecordScope(taskIds, scopedTaskIds);
	};
	const opportunities = snapshot.opportunities.filter(
		(opportunity) =>
			matchesProjectScope(opportunity.projectId, input.projectId) &&
			matchesGoalScope(opportunity.projectId, opportunity.relatedTaskIds)
	);
	const signals = snapshot.signals.filter(
		(signal) =>
			matchesProjectScope(signal.projectId, input.projectId) &&
			matchesGoalScope(signal.projectId, signal.taskId ? [signal.taskId] : [])
	);
	const knowledgeItems = snapshot.knowledgeItems.filter(
		(knowledgeItem) =>
			matchesProjectScope(knowledgeItem.projectId, input.projectId) &&
			matchesGoalScope(knowledgeItem.projectId, knowledgeItem.sourceTaskIds)
	);
	const byCategory = initializeCountRecord(SELF_IMPROVEMENT_CATEGORY_OPTIONS);
	const bySource = initializeCountRecord(SELF_IMPROVEMENT_SOURCE_OPTIONS);
	const byType = initializeCountRecord(SELF_IMPROVEMENT_SIGNAL_TYPE_OPTIONS);

	for (const opportunity of opportunities) {
		byCategory[opportunity.category] += 1;
		bySource[opportunity.source] += 1;
	}

	for (const signal of signals) {
		byType[signal.signalType] += 1;
	}

	return {
		...snapshot,
		summary: {
			totalCount: opportunities.length,
			highSeverityCount: opportunities.filter((opportunity) => opportunity.severity === 'high')
				.length,
			openCount: opportunities.filter((opportunity) => opportunity.status === 'open').length,
			acceptedCount: opportunities.filter((opportunity) => opportunity.status === 'accepted')
				.length,
			dismissedCount: opportunities.filter((opportunity) => opportunity.status === 'dismissed')
				.length,
			byCategory,
			bySource
		},
		opportunities,
		signalSummary: {
			totalCount: signals.length,
			highSeverityCount: signals.filter((signal) => signal.severity === 'high').length,
			byType
		},
		signals,
		knowledgeSummary: summarizeSelfImprovementKnowledgeItems(knowledgeItems),
		knowledgeItems
	};
}

function summarizeSelfImprovementKnowledgeItems(knowledgeItems: SelfImprovementKnowledgeItem[]) {
	const byCategory = initializeCountRecord(SELF_IMPROVEMENT_CATEGORY_OPTIONS);

	for (const knowledgeItem of knowledgeItems) {
		byCategory[knowledgeItem.category] += 1;
	}

	return {
		totalCount: knowledgeItems.length,
		draftCount: knowledgeItems.filter((item) => item.status === 'draft').length,
		publishedCount: knowledgeItems.filter((item) => item.status === 'published').length,
		archivedCount: knowledgeItems.filter((item) => item.status === 'archived').length,
		byCategory
	};
}

function createKnowledgeItemId() {
	return `knowledge_${randomUUID()}`;
}

function buildKnowledgeItemFromOpportunity(input: {
	opportunity: SelfImprovementSnapshot['opportunities'][number];
	signals: TrackedSelfImprovementFeedbackSignal[];
	now: string;
}): SelfImprovementKnowledgeItem | null {
	const suggestedKnowledgeItem = input.opportunity.suggestedKnowledgeItem;

	if (!suggestedKnowledgeItem) {
		return null;
	}

	return {
		id: createKnowledgeItemId(),
		status: 'draft',
		title: suggestedKnowledgeItem.title,
		summary: suggestedKnowledgeItem.summary,
		category: input.opportunity.category,
		projectId: input.opportunity.projectId,
		projectName: input.opportunity.projectName,
		sourceOpportunityId: input.opportunity.id,
		sourceTaskIds: input.opportunity.relatedTaskIds,
		sourceRunIds: input.opportunity.relatedRunIds,
		sourceSessionIds: input.opportunity.relatedSessionIds,
		sourceSignalIds: input.signals.map((signal) => signal.id),
		triggerPattern: suggestedKnowledgeItem.triggerPattern,
		recommendedResponse: suggestedKnowledgeItem.recommendedResponse,
		applicabilityScope: suggestedKnowledgeItem.applicabilityScope,
		createdAt: input.now,
		updatedAt: input.now,
		publishedAt: null,
		archivedAt: null
	};
}

function getDefaultImprovementRoleId(data: ControlPlaneData) {
	return data.roles.find((role) => role.id === 'role_coordinator')?.id ?? data.roles[0]?.id ?? '';
}

export async function createTaskFromSelfImprovementOpportunity(
	opportunityId: string,
	options: {
		goalId?: string | null;
	} = {}
) {
	const [data, db] = await Promise.all([loadControlPlane(), loadSelfImprovementDb()]);
	const snapshot = await loadSelfImprovementSnapshot({
		data,
		goalId: options.goalId ?? null
	});
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

export async function createKnowledgeItemFromSelfImprovementOpportunity(
	opportunityId: string,
	options: {
		goalId?: string | null;
	} = {}
) {
	const [data, db] = await Promise.all([loadControlPlane(), loadSelfImprovementDb()]);
	const snapshot = await loadSelfImprovementSnapshot({
		data,
		goalId: options.goalId ?? null
	});
	const opportunity = snapshot.opportunities.find((candidate) => candidate.id === opportunityId);

	if (!opportunity || !opportunity.suggestedKnowledgeItem) {
		return null;
	}

	if (opportunity.createdKnowledgeItemId) {
		return db.knowledgeItems.find((item) => item.id === opportunity.createdKnowledgeItemId) ?? null;
	}

	const now = new Date().toISOString();
	const knowledgeItem = buildKnowledgeItemFromOpportunity({
		opportunity,
		signals: snapshot.signals.filter((signal) => signal.opportunityId === opportunity.id),
		now
	});

	if (!knowledgeItem) {
		return null;
	}

	await saveSelfImprovementDb({
		records: db.records,
		signals: db.signals,
		knowledgeItems: [knowledgeItem, ...db.knowledgeItems]
	});

	await setSelfImprovementOpportunityStatus({
		opportunityId,
		status: 'accepted',
		decisionSummary:
			opportunity.decisionSummary || 'Accepted and converted into a draft knowledge item.',
		createdKnowledgeItemId: knowledgeItem.id,
		createdKnowledgeItemTitle: knowledgeItem.title
	});

	return knowledgeItem;
}

export async function setSelfImprovementKnowledgeItemStatus(input: {
	knowledgeItemId: string;
	status: SelfImprovementKnowledgeStatus;
}) {
	const current = await loadSelfImprovementDb();
	const existingItem =
		current.knowledgeItems.find((item) => item.id === input.knowledgeItemId) ?? null;

	if (!existingItem) {
		return null;
	}

	const now = new Date().toISOString();
	const nextItem: SelfImprovementKnowledgeItem = {
		...existingItem,
		status: input.status,
		updatedAt: now,
		publishedAt:
			input.status === 'published' ? (existingItem.publishedAt ?? now) : existingItem.publishedAt,
		archivedAt:
			input.status === 'archived' ? now : input.status === 'draft' ? null : existingItem.archivedAt
	};
	const nextKnowledgeItems = current.knowledgeItems.map((item) =>
		item.id === input.knowledgeItemId ? nextItem : item
	);

	await saveSelfImprovementDb({
		records: current.records,
		signals: current.signals,
		knowledgeItems: nextKnowledgeItems
	});

	return nextItem;
}
