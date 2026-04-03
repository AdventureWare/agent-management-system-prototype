import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createTask, loadControlPlane, updateControlPlane } from '$lib/server/control-plane';
import { listAgentSessions } from '$lib/server/agent-sessions';
import {
	isSelfImprovementSqliteEmpty,
	loadSelfImprovementFromSqlite,
	saveSelfImprovementToSqlite,
	type SelfImprovementStoreDb
} from '$lib/server/db/self-improvement-store-db';
import { getGoalScopeProjectIds, getGoalScopeTaskIds } from '$lib/server/goal-relationships';
import {
	SELF_IMPROVEMENT_SUGGESTION_POLICY_VERSION,
	rankSelfImprovementAnalysis
} from '$lib/server/self-improvement-suggestion-policy';
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
	SelfImprovementCapturedSuggestion,
	SelfImprovementDecisionReason,
	SelfImprovementDecisionType,
	SelfImprovementFeedbackSignal,
	SelfImprovementKnowledgeItem,
	SelfImprovementKnowledgeStatus,
	SelfImprovementOpportunityRecord,
	SelfImprovementSuggestionDecision,
	SelfImprovementSuggestionImpression,
	TrackedSelfImprovementOpportunity,
	TrackedSelfImprovementFeedbackSignal,
	SelfImprovementSnapshot,
	SelfImprovementStatus
} from '$lib/types/self-improvement';

const DATA_FILE = resolve(process.cwd(), 'data', 'self-improvement.json');

type SelfImprovementDb = SelfImprovementStoreDb;

function defaultDb(): SelfImprovementDb {
	return {
		records: [],
		signals: [],
		knowledgeItems: [],
		capturedSuggestions: [],
		impressions: [],
		decisions: []
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

function getSelfImprovementStorageBackend() {
	return process.env.APP_STORAGE_BACKEND?.trim() === 'json' ? 'json' : 'sqlite';
}

async function ensureSelfImprovementDb() {
	try {
		await readFile(DATA_FILE, 'utf8');
	} catch {
		await mkdir(resolve(process.cwd(), 'data'), { recursive: true });
		await writeFile(DATA_FILE, JSON.stringify(defaultDb(), null, 2));
	}
}

function normalizeSelfImprovementDb(parsed: Partial<SelfImprovementDb>): SelfImprovementDb {
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
					(item): item is SelfImprovementKnowledgeItem => Boolean(item) && typeof item === 'object'
				)
			: [],
		capturedSuggestions: Array.isArray(parsed.capturedSuggestions)
			? parsed.capturedSuggestions.filter(
					(suggestion): suggestion is SelfImprovementCapturedSuggestion =>
						Boolean(suggestion) && typeof suggestion === 'object'
				)
			: [],
		impressions: Array.isArray(parsed.impressions)
			? parsed.impressions.filter(
					(impression): impression is SelfImprovementSuggestionImpression =>
						Boolean(impression) && typeof impression === 'object'
				)
			: [],
		decisions: Array.isArray(parsed.decisions)
			? parsed.decisions.filter(
					(decision): decision is SelfImprovementSuggestionDecision =>
						Boolean(decision) && typeof decision === 'object'
				)
			: []
	};
}

function parseSelfImprovementDb(raw: string) {
	try {
		return normalizeSelfImprovementDb(JSON.parse(raw) as Partial<SelfImprovementDb>);
	} catch {
		return defaultDb();
	}
}

async function loadSelfImprovementDbFromJson() {
	await ensureSelfImprovementDb();
	return parseSelfImprovementDb(await readFile(DATA_FILE, 'utf8'));
}

async function readSelfImprovementJsonIfPresent() {
	if (!existsSync(DATA_FILE)) {
		return null;
	}

	try {
		return parseSelfImprovementDb(await readFile(DATA_FILE, 'utf8'));
	} catch {
		return defaultDb();
	}
}

async function ensureSelfImprovementSqliteSeeded() {
	if (!isSelfImprovementSqliteEmpty()) {
		return;
	}

	const seed = (await readSelfImprovementJsonIfPresent()) ?? defaultDb();
	saveSelfImprovementToSqlite(seed);
}

export async function loadSelfImprovementDb(): Promise<SelfImprovementDb> {
	if (getSelfImprovementStorageBackend() === 'sqlite') {
		await ensureSelfImprovementSqliteSeeded();
		return normalizeSelfImprovementDb(loadSelfImprovementFromSqlite());
	}

	return loadSelfImprovementDbFromJson();
}

async function saveSelfImprovementDb(data: SelfImprovementDb) {
	if (getSelfImprovementStorageBackend() === 'sqlite') {
		saveSelfImprovementToSqlite(data);
		return;
	}

	await mkdir(resolve(process.cwd(), 'data'), { recursive: true });
	await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function deriveCapturedSuggestionPriority(
	severity: SelfImprovementCapturedSuggestion['severity']
): 'medium' | 'high' | 'urgent' {
	switch (severity) {
		case 'high':
			return 'high';
		case 'medium':
			return 'medium';
		case 'low':
		default:
			return 'medium';
	}
}

function buildCapturedSuggestionOpportunities(
	data: ControlPlaneData,
	capturedSuggestions: SelfImprovementCapturedSuggestion[]
) {
	return capturedSuggestions.map((suggestion) => {
		const goal =
			(suggestion.goalId
				? (data.goals.find((candidate) => candidate.id === suggestion.goalId) ?? null)
				: null) ?? null;
		const goalProjectIds = goal?.projectIds ?? [];
		const project =
			(suggestion.projectId
				? (data.projects.find((candidate) => candidate.id === suggestion.projectId) ?? null)
				: null) ??
			(goalProjectIds.length === 1
				? (data.projects.find((candidate) => candidate.id === goalProjectIds[0]) ?? null)
				: null);

		return {
			id: `captured_suggestions:${suggestion.id}`,
			title: suggestion.title,
			summary: suggestion.summary,
			category: suggestion.category,
			source: 'captured_suggestions',
			severity: suggestion.severity,
			confidence: 'medium',
			projectId: project?.id ?? suggestion.projectId ?? null,
			projectName: project?.name ?? null,
			signals: [
				`Captured manually on ${suggestion.createdAt.slice(0, 10)}.`,
				project ? `Scoped to project ${project.name}.` : 'No project scope attached yet.',
				goal ? `Goal focus: ${goal.name}.` : ''
			].filter(Boolean),
			recommendedActions: [
				project || goal
					? 'Turn this suggestion into a concrete follow-up task if it should change the system.'
					: 'Add project context before turning this into a follow-up task.',
				'Dismiss it if it is no longer useful, or save a lesson if it is reusable guidance.'
			],
			relatedTaskIds: goal?.taskIds ?? [],
			relatedRunIds: [],
			relatedSessionIds: [],
			suggestedTask:
				project || goal
					? {
							title: suggestion.title,
							summary: suggestion.summary,
							priority: deriveCapturedSuggestionPriority(suggestion.severity)
						}
					: null,
			suggestedKnowledgeItem: null
		} satisfies SelfImprovementAnalysis['opportunities'][number];
	});
}

function summarizeSelfImprovementAnalysisOpportunities(
	opportunities: SelfImprovementAnalysis['opportunities']
) {
	const byCategory = initializeCountRecord(SELF_IMPROVEMENT_CATEGORY_OPTIONS);
	const bySource = initializeCountRecord(SELF_IMPROVEMENT_SOURCE_OPTIONS);

	for (const opportunity of opportunities) {
		byCategory[opportunity.category] += 1;
		bySource[opportunity.source] += 1;
	}

	return {
		totalCount: opportunities.length,
		highSeverityCount: opportunities.filter((opportunity) => opportunity.severity === 'high')
			.length,
		byCategory,
		bySource
	};
}

function applyCapturedSuggestionsToAnalysis(
	analysis: SelfImprovementAnalysis,
	data: ControlPlaneData,
	capturedSuggestions: SelfImprovementCapturedSuggestion[]
): SelfImprovementAnalysis {
	const opportunities = [
		...analysis.opportunities,
		...buildCapturedSuggestionOpportunities(data, capturedSuggestions)
	];

	return {
		generatedAt: analysis.generatedAt,
		opportunities,
		summary: summarizeSelfImprovementAnalysisOpportunities(opportunities)
	};
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
		latestImpressionId: null,
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
		knowledgeItems: current.knowledgeItems,
		capturedSuggestions: current.capturedSuggestions,
		impressions: current.impressions,
		decisions: current.decisions
	});

	return mergeSelfImprovementSnapshot(analysis, nextRecords, nextSignals, current.knowledgeItems);
}

export async function loadSelfImprovementSnapshot(input?: {
	data?: ControlPlaneData;
	sessions?: Awaited<ReturnType<typeof listAgentSessions>>;
	now?: number;
	projectId?: string | null;
	goalId?: string | null;
	trackImpression?: boolean;
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
	const current = await loadSelfImprovementDb();
	const analysisWithCapturedSuggestions = applyCapturedSuggestionsToAnalysis(
		analysis,
		data,
		current.capturedSuggestions
	);
	const rankedAnalysis = rankSelfImprovementAnalysis(analysisWithCapturedSuggestions);
	const signals = buildSelfImprovementFeedbackSignals({
		data,
		sessions,
		now: input?.now
	});
	const scopedSnapshot = applySelfImprovementGoalContext(
		filterSelfImprovementSnapshot(
			await syncSelfImprovementAnalysis(rankedAnalysis, signals),
			{
				projectId: input?.projectId ?? null,
				goalId: input?.goalId ?? null,
				data
			}
		),
		{
			data,
			goalId: input?.goalId ?? null
		}
	);

	if (!input?.trackImpression) {
		return scopedSnapshot;
	}

	const impression = await appendSelfImprovementSuggestionImpression({
		snapshot: scopedSnapshot,
		projectId: input.projectId ?? null,
		goalId: input.goalId ?? null
	});

	return {
		...scopedSnapshot,
		latestImpressionId: impression?.id ?? null
	};
}

function deriveDecisionTypeFromStatus(status: SelfImprovementStatus): SelfImprovementDecisionType {
	switch (status) {
		case 'accepted':
			return 'accepted';
		case 'dismissed':
			return 'dismissed';
		case 'open':
		default:
			return 'reopened';
	}
}

function buildDefaultDecisionSummary(input: {
	status: SelfImprovementStatus;
	decisionType: SelfImprovementDecisionType;
	reason: SelfImprovementDecisionReason | null;
}) {
	if (input.decisionType === 'task_created') {
		return 'Accepted and converted into a follow-up task.';
	}

	if (input.decisionType === 'knowledge_item_created') {
		return 'Accepted and captured as a reusable saved lesson.';
	}

	if (input.status === 'dismissed') {
		return input.reason
			? `Dismissed with reason: ${input.reason.replaceAll('_', ' ')}.`
			: 'Dismissed from the current queue.';
	}

	if (input.status === 'accepted') {
		return 'Accepted for follow-up.';
	}

	return 'Reopened for further review.';
}

async function appendSelfImprovementSuggestionDecision(input: {
	opportunityId: string;
	impressionId?: string | null;
	statusAfterDecision: SelfImprovementStatus;
	decisionType: SelfImprovementDecisionType;
	reason?: SelfImprovementDecisionReason | null;
	summary: string;
	createdAt: string;
}) {
	const current = await loadSelfImprovementDb();
	const decision: SelfImprovementSuggestionDecision = {
		id: randomUUID(),
		opportunityId: input.opportunityId,
		impressionId: input.impressionId ?? null,
		decisionType: input.decisionType,
		reason: input.reason ?? null,
		summary: input.summary,
		statusAfterDecision: input.statusAfterDecision,
		createdAt: input.createdAt
	};

	await saveSelfImprovementDb({
		records: current.records,
		signals: current.signals,
		knowledgeItems: current.knowledgeItems,
		capturedSuggestions: current.capturedSuggestions,
		impressions: current.impressions,
		decisions: [decision, ...current.decisions]
	});

	return decision;
}

async function appendSelfImprovementSuggestionImpression(input: {
	snapshot: SelfImprovementSnapshot;
	projectId?: string | null;
	goalId?: string | null;
}) {
	const openOpportunities = input.snapshot.opportunities.filter(
		(opportunity) => opportunity.status === 'open'
	);

	if (openOpportunities.length === 0) {
		return null;
	}

	const current = await loadSelfImprovementDb();
	const createdAt = new Date().toISOString();
	const impression: SelfImprovementSuggestionImpression = {
		id: randomUUID(),
		createdAt,
		projectId: input.projectId ?? null,
		goalId: input.goalId ?? null,
		policyVersion:
			openOpportunities[0]?.rankingPolicyVersion ?? SELF_IMPROVEMENT_SUGGESTION_POLICY_VERSION,
		itemCount: openOpportunities.length,
		items: openOpportunities.map((opportunity, index) => ({
			opportunityId: opportunity.id,
			rank: index + 1,
			score: opportunity.rankingScore ?? null
		}))
	};

	await saveSelfImprovementDb({
		records: current.records,
		signals: current.signals,
		knowledgeItems: current.knowledgeItems,
		capturedSuggestions: current.capturedSuggestions,
		impressions: [impression, ...current.impressions],
		decisions: current.decisions
	});

	return impression;
}

export async function setSelfImprovementOpportunityStatus(input: {
	opportunityId: string;
	status: SelfImprovementStatus;
	decisionSummary?: string;
	decisionType?: SelfImprovementDecisionType;
	decisionReason?: SelfImprovementDecisionReason | null;
	impressionId?: string | null;
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
	const decisionType = input.decisionType ?? deriveDecisionTypeFromStatus(input.status);
	const decisionSummary =
		input.decisionSummary ??
		buildDefaultDecisionSummary({
			status: input.status,
			decisionType,
			reason: input.decisionReason ?? null
		});
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
		decisionSummary,
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
		knowledgeItems: current.knowledgeItems,
		capturedSuggestions: current.capturedSuggestions,
		impressions: current.impressions,
		decisions: current.decisions
	});

	await appendSelfImprovementSuggestionDecision({
		opportunityId: input.opportunityId,
		impressionId: input.impressionId ?? null,
		statusAfterDecision: input.status,
		decisionType,
		reason: input.decisionReason ?? null,
		summary: decisionSummary,
		createdAt: now
	});

	return nextRecord;
}

export async function createCapturedSelfImprovementSuggestion(input: {
	title: string;
	summary: string;
	category: SelfImprovementCapturedSuggestion['category'];
	severity: SelfImprovementCapturedSuggestion['severity'];
	projectId?: string | null;
	goalId?: string | null;
}) {
	const current = await loadSelfImprovementDb();
	const now = new Date().toISOString();
	const nextSuggestion: SelfImprovementCapturedSuggestion = {
		id: randomUUID(),
		title: input.title.trim(),
		summary: input.summary.trim(),
		category: input.category,
		severity: input.severity,
		projectId: input.projectId ?? null,
		goalId: input.goalId ?? null,
		createdAt: now,
		updatedAt: now
	};

	await saveSelfImprovementDb({
		records: current.records,
		signals: current.signals,
		knowledgeItems: current.knowledgeItems,
		capturedSuggestions: [nextSuggestion, ...current.capturedSuggestions],
		impressions: current.impressions,
		decisions: current.decisions
	});

	return nextSuggestion;
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
		latestImpressionId: snapshot.latestImpressionId,
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

function uniqueNonEmptyValues(values: Array<string | null | undefined>) {
	return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
}

export function resolveSelfImprovementOpportunityTaskContext(input: {
	data: ControlPlaneData;
	opportunity: Pick<TrackedSelfImprovementOpportunity, 'projectId' | 'relatedTaskIds'>;
	projectId?: string | null;
	goalId?: string | null;
}) {
	const projectIds = new Set(input.data.projects.map((project) => project.id));
	const goalIds = new Set(input.data.goals.map((goal) => goal.id));
	const taskMap = new Map(input.data.tasks.map((task) => [task.id, task]));
	const goal = input.goalId
		? (input.data.goals.find((candidate) => candidate.id === input.goalId) ?? null)
		: null;
	const relatedTasks = input.opportunity.relatedTaskIds
		.map((taskId) => taskMap.get(taskId) ?? null)
		.filter((task): task is ControlPlaneData['tasks'][number] => Boolean(task));
	const relatedTaskProjectIds = uniqueNonEmptyValues(relatedTasks.map((task) => task.projectId));
	const relatedTaskGoalIds = uniqueNonEmptyValues(relatedTasks.map((task) => task.goalId));
	const scopedGoalProjectIds = uniqueNonEmptyValues(goal?.projectIds ?? []);

	const resolvedProjectId =
		(input.opportunity.projectId && projectIds.has(input.opportunity.projectId)
			? input.opportunity.projectId
			: null) ??
		(input.projectId && projectIds.has(input.projectId) ? input.projectId : null) ??
		(scopedGoalProjectIds.length === 1 ? scopedGoalProjectIds[0] : null) ??
		(relatedTaskProjectIds.length === 1 ? relatedTaskProjectIds[0] : null);
	const resolvedGoalId =
		(input.goalId && goalIds.has(input.goalId) ? input.goalId : null) ??
		(relatedTaskGoalIds.length === 1 ? relatedTaskGoalIds[0] : '');

	return {
		projectId: resolvedProjectId,
		goalId: resolvedGoalId
	};
}

export async function createTaskFromSelfImprovementOpportunity(
	opportunityId: string,
	options: {
		projectId?: string | null;
		goalId?: string | null;
		impressionId?: string | null;
	} = {}
) {
	const [data, db] = await Promise.all([loadControlPlane(), loadSelfImprovementDb()]);
	const snapshot = await loadSelfImprovementSnapshot({
		data,
		goalId: options.goalId ?? null
	});
	const opportunity = snapshot.opportunities.find((candidate) => candidate.id === opportunityId);

	if (!opportunity || !opportunity.suggestedTask) {
		return null;
	}

	if (db.records.some((record) => record.id === opportunityId && Boolean(record.createdTaskId))) {
		const record = db.records.find((candidate) => candidate.id === opportunityId) ?? null;
		const existingTask = data.tasks.find((task) => task.id === record?.createdTaskId) ?? null;

		if (existingTask) {
			return existingTask;
		}
	}

	const taskContext = resolveSelfImprovementOpportunityTaskContext({
		data,
		opportunity,
		projectId: options.projectId ?? null,
		goalId: options.goalId ?? null
	});

	if (!taskContext.projectId) {
		return null;
	}

	const project = data.projects.find((candidate) => candidate.id === taskContext.projectId);

	if (!project) {
		return null;
	}

	const createdTask = createTask({
		title: opportunity.suggestedTask.title,
		summary: opportunity.suggestedTask.summary,
		projectId: taskContext.projectId,
		lane: 'ops',
		goalId: taskContext.goalId,
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
		decisionType: 'task_created',
		decisionReason: 'accepted_for_follow_up',
		decisionSummary: opportunity.decisionSummary || 'Accepted and converted into a follow-up task.',
		impressionId: options.impressionId ?? null,
		createdTaskId: createdTask.id,
		createdTaskTitle: createdTask.title
	});

	return createdTask;
}

export async function createKnowledgeItemFromSelfImprovementOpportunity(
	opportunityId: string,
	options: {
		goalId?: string | null;
		impressionId?: string | null;
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
		knowledgeItems: [knowledgeItem, ...db.knowledgeItems],
		capturedSuggestions: db.capturedSuggestions,
		impressions: db.impressions,
		decisions: db.decisions
	});

	await setSelfImprovementOpportunityStatus({
		opportunityId,
		status: 'accepted',
		decisionType: 'knowledge_item_created',
		decisionReason: 'accepted_for_knowledge',
		decisionSummary:
			opportunity.decisionSummary || 'Accepted and captured as a reusable saved lesson.',
		impressionId: options.impressionId ?? null,
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
		knowledgeItems: nextKnowledgeItems,
		capturedSuggestions: current.capturedSuggestions,
		impressions: current.impressions,
		decisions: current.decisions
	});

	return nextItem;
}
