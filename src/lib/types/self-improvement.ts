export const SELF_IMPROVEMENT_CATEGORY_OPTIONS = [
	'reliability',
	'coordination',
	'quality',
	'knowledge',
	'automation'
] as const;

export const SELF_IMPROVEMENT_SOURCE_OPTIONS = [
	'failed_runs',
	'blocked_tasks',
	'stale_tasks',
	'review_feedback',
	'thread_reuse_gap',
	'planning_gaps',
	'captured_suggestions'
] as const;

export const SELF_IMPROVEMENT_SEVERITY_OPTIONS = ['low', 'medium', 'high'] as const;
export const SELF_IMPROVEMENT_CONFIDENCE_OPTIONS = ['low', 'medium', 'high'] as const;
export const SELF_IMPROVEMENT_STATUS_OPTIONS = ['open', 'accepted', 'dismissed'] as const;
export const SELF_IMPROVEMENT_KNOWLEDGE_STATUS_OPTIONS = [
	'draft',
	'published',
	'archived'
] as const;
export const SELF_IMPROVEMENT_SIGNAL_TYPE_OPTIONS = [
	'run_failure',
	'task_blocked',
	'task_stale',
	'review_feedback',
	'thread_reuse_gap'
] as const;

export type SelfImprovementCategory = (typeof SELF_IMPROVEMENT_CATEGORY_OPTIONS)[number];
export type SelfImprovementSource = (typeof SELF_IMPROVEMENT_SOURCE_OPTIONS)[number];
export type SelfImprovementSeverity = (typeof SELF_IMPROVEMENT_SEVERITY_OPTIONS)[number];
export type SelfImprovementConfidence = (typeof SELF_IMPROVEMENT_CONFIDENCE_OPTIONS)[number];
export type SelfImprovementStatus = (typeof SELF_IMPROVEMENT_STATUS_OPTIONS)[number];
export type SelfImprovementKnowledgeStatus =
	(typeof SELF_IMPROVEMENT_KNOWLEDGE_STATUS_OPTIONS)[number];
export type SelfImprovementSignalType = (typeof SELF_IMPROVEMENT_SIGNAL_TYPE_OPTIONS)[number];

function formatEnumLabel(value: string) {
	return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatSelfImprovementCategoryLabel(category: string) {
	return formatEnumLabel(category);
}

export function formatSelfImprovementStatusLabel(status: string) {
	return formatEnumLabel(status);
}

export function formatSelfImprovementKnowledgeStatusLabel(status: string) {
	return formatEnumLabel(status);
}

export function formatSelfImprovementSignalTypeLabel(signalType: string) {
	return formatEnumLabel(signalType);
}

export function selfImprovementSeverityToneClass(severity: string) {
	switch (severity) {
		case 'high':
			return 'border border-rose-900/70 bg-rose-950/40 text-rose-300';
		case 'medium':
			return 'border border-amber-900/70 bg-amber-950/40 text-amber-300';
		case 'low':
		default:
			return 'border border-emerald-900/70 bg-emerald-950/40 text-emerald-300';
	}
}

export function selfImprovementStatusToneClass(status: string) {
	switch (status) {
		case 'accepted':
			return 'border border-sky-800/70 bg-sky-950/40 text-sky-300';
		case 'dismissed':
			return 'border border-slate-700 bg-slate-950/70 text-slate-300';
		case 'open':
		default:
			return 'border border-violet-800/70 bg-violet-950/40 text-violet-300';
	}
}

export function selfImprovementKnowledgeStatusToneClass(status: string) {
	switch (status) {
		case 'published':
			return 'border border-emerald-900/70 bg-emerald-950/40 text-emerald-300';
		case 'archived':
			return 'border border-slate-700 bg-slate-950/70 text-slate-300';
		case 'draft':
		default:
			return 'border border-sky-800/70 bg-sky-950/40 text-sky-300';
	}
}

export type SelfImprovementTaskDraft = {
	title: string;
	summary: string;
	priority: 'medium' | 'high' | 'urgent';
};

export type SelfImprovementKnowledgeDraft = {
	title: string;
	summary: string;
	triggerPattern: string;
	recommendedResponse: string;
	applicabilityScope: string[];
};

export type SelfImprovementOpportunity = {
	id: string;
	title: string;
	summary: string;
	category: SelfImprovementCategory;
	source: SelfImprovementSource;
	severity: SelfImprovementSeverity;
	confidence: SelfImprovementConfidence;
	projectId: string | null;
	projectName: string | null;
	signals: string[];
	recommendedActions: string[];
	relatedTaskIds: string[];
	relatedRunIds: string[];
	relatedSessionIds: string[];
	suggestedTask: SelfImprovementTaskDraft | null;
	suggestedKnowledgeItem: SelfImprovementKnowledgeDraft | null;
};

export type SelfImprovementSummary = {
	totalCount: number;
	highSeverityCount: number;
	byCategory: Record<SelfImprovementCategory, number>;
	bySource: Record<SelfImprovementSource, number>;
};

export type SelfImprovementAnalysis = {
	generatedAt: string;
	summary: SelfImprovementSummary;
	opportunities: SelfImprovementOpportunity[];
};

export type SelfImprovementOpportunityRecord = {
	id: string;
	status: SelfImprovementStatus;
	firstSeenAt: string;
	lastSeenAt: string;
	updatedAt: string;
	acceptedAt: string | null;
	dismissedAt: string | null;
	decisionSummary: string;
	createdTaskId: string | null;
	createdTaskTitle: string | null;
	createdKnowledgeItemId: string | null;
	createdKnowledgeItemTitle: string | null;
};

export type TrackedSelfImprovementOpportunity = SelfImprovementOpportunity &
	SelfImprovementOpportunityRecord;

export type SelfImprovementCapturedSuggestion = {
	id: string;
	title: string;
	summary: string;
	category: SelfImprovementCategory;
	severity: SelfImprovementSeverity;
	projectId: string | null;
	goalId: string | null;
	createdAt: string;
	updatedAt: string;
};

export type SelfImprovementFeedbackSignal = {
	id: string;
	signalType: SelfImprovementSignalType;
	opportunityId: string;
	category: SelfImprovementCategory;
	severity: SelfImprovementSeverity;
	confidence: SelfImprovementConfidence;
	projectId: string | null;
	projectName: string | null;
	taskId: string | null;
	runId: string | null;
	reviewId: string | null;
	sessionId: string | null;
	title: string;
	summary: string;
};

export type TrackedSelfImprovementFeedbackSignal = SelfImprovementFeedbackSignal & {
	firstSeenAt: string;
	lastSeenAt: string;
};

export type SelfImprovementKnowledgeItem = {
	id: string;
	status: SelfImprovementKnowledgeStatus;
	title: string;
	summary: string;
	category: SelfImprovementCategory;
	projectId: string | null;
	projectName: string | null;
	sourceOpportunityId: string;
	sourceTaskIds: string[];
	sourceRunIds: string[];
	sourceSessionIds: string[];
	sourceSignalIds: string[];
	triggerPattern: string;
	recommendedResponse: string;
	applicabilityScope: string[];
	createdAt: string;
	updatedAt: string;
	publishedAt: string | null;
	archivedAt: string | null;
};

export type RetrievedSelfImprovementKnowledgeItem = SelfImprovementKnowledgeItem & {
	matchScore: number;
	matchReasons: string[];
};

export type SelfImprovementSnapshotSummary = SelfImprovementSummary & {
	openCount: number;
	acceptedCount: number;
	dismissedCount: number;
};

export type SelfImprovementSignalSummary = {
	totalCount: number;
	highSeverityCount: number;
	byType: Record<SelfImprovementSignalType, number>;
};

export type SelfImprovementKnowledgeSummary = {
	totalCount: number;
	draftCount: number;
	publishedCount: number;
	archivedCount: number;
	byCategory: Record<SelfImprovementCategory, number>;
};

export type SelfImprovementSnapshot = {
	generatedAt: string;
	summary: SelfImprovementSnapshotSummary;
	opportunities: TrackedSelfImprovementOpportunity[];
	signalSummary: SelfImprovementSignalSummary;
	signals: TrackedSelfImprovementFeedbackSignal[];
	knowledgeSummary: SelfImprovementKnowledgeSummary;
	knowledgeItems: SelfImprovementKnowledgeItem[];
};
