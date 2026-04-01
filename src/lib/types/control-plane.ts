import type { AgentSandbox } from '$lib/types/agent-session';

export const LANE_OPTIONS = ['product', 'growth', 'ops'] as const;
export const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const;
export const TASK_STATUS_OPTIONS = [
	'in_draft',
	'ready',
	'in_progress',
	'review',
	'blocked',
	'done'
] as const;
export const TASK_RISK_LEVEL_OPTIONS = ['low', 'medium', 'high'] as const;
export const TASK_APPROVAL_MODE_OPTIONS = [
	'none',
	'before_run',
	'before_apply',
	'before_complete'
] as const;
export const RUN_STATUS_OPTIONS = [
	'queued',
	'starting',
	'running',
	'awaiting_approval',
	'blocked',
	'failed',
	'canceled',
	'completed'
] as const;
export const REVIEW_STATUS_OPTIONS = [
	'open',
	'approved',
	'changes_requested',
	'dismissed'
] as const;
export const APPROVAL_STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'canceled'] as const;
export const GOAL_STATUS_OPTIONS = ['ready', 'running', 'review', 'blocked', 'done'] as const;
export const WORKER_STATUS_OPTIONS = ['idle', 'busy', 'offline'] as const;
export const WORKER_LOCATION_OPTIONS = ['local', 'cloud'] as const;
export const PROVIDER_KIND_OPTIONS = ['local', 'cloud', 'api'] as const;
export const PROVIDER_SETUP_STATUS_OPTIONS = ['connected', 'needs_setup', 'planned'] as const;
export const PROVIDER_AUTH_MODE_OPTIONS = ['local_cli', 'oauth', 'api_key', 'custom'] as const;
export const PLANNING_HORIZON_KIND_OPTIONS = ['week', 'month', 'quarter', 'custom'] as const;
export const PLANNING_HORIZON_STATUS_OPTIONS = ['draft', 'active', 'closed'] as const;
export const PLANNING_CAPACITY_UNIT_OPTIONS = ['hours', 'points', 'slots'] as const;
export const PLANNING_CONFIDENCE_OPTIONS = ['low', 'medium', 'high'] as const;
export const TASK_PLANNING_SOURCE_OPTIONS = ['manual', 'ai_proposed', 'ai_accepted'] as const;

export type Lane = (typeof LANE_OPTIONS)[number];
export type Priority = (typeof PRIORITY_OPTIONS)[number];
export type TaskStatus = (typeof TASK_STATUS_OPTIONS)[number];
export type TaskRiskLevel = (typeof TASK_RISK_LEVEL_OPTIONS)[number];
export type TaskApprovalMode = (typeof TASK_APPROVAL_MODE_OPTIONS)[number];
export type RunStatus = (typeof RUN_STATUS_OPTIONS)[number];
export type ReviewStatus = (typeof REVIEW_STATUS_OPTIONS)[number];
export type ApprovalStatus = (typeof APPROVAL_STATUS_OPTIONS)[number];
export type GoalStatus = (typeof GOAL_STATUS_OPTIONS)[number];
export type WorkerStatus = (typeof WORKER_STATUS_OPTIONS)[number];
export type WorkerLocation = (typeof WORKER_LOCATION_OPTIONS)[number];
export type ProviderKind = (typeof PROVIDER_KIND_OPTIONS)[number];
export type ProviderSetupStatus = (typeof PROVIDER_SETUP_STATUS_OPTIONS)[number];
export type ProviderAuthMode = (typeof PROVIDER_AUTH_MODE_OPTIONS)[number];
export type PlanningHorizonKind = (typeof PLANNING_HORIZON_KIND_OPTIONS)[number];
export type PlanningHorizonStatus = (typeof PLANNING_HORIZON_STATUS_OPTIONS)[number];
export type PlanningCapacityUnit = (typeof PLANNING_CAPACITY_UNIT_OPTIONS)[number];
export type PlanningConfidence = (typeof PLANNING_CONFIDENCE_OPTIONS)[number];
export type TaskPlanningSource = (typeof TASK_PLANNING_SOURCE_OPTIONS)[number];

export type StatusTone = 'neutral' | 'ready' | 'progress' | 'decision' | 'success' | 'attention';

export type TaskAttachment = {
	id: string;
	name: string;
	path: string;
	contentType: string;
	sizeBytes: number;
	attachedAt: string;
};

export function normalizeTaskStatus(value: string): TaskStatus | null {
	const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');

	switch (normalized) {
		case 'draft':
			return 'in_draft';
		case 'running':
			return 'in_progress';
		default:
			return TASK_STATUS_OPTIONS.includes(normalized as TaskStatus)
				? (normalized as TaskStatus)
				: null;
	}
}

function formatEnumLabel(value: string): string {
	return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusToneClass(tone: StatusTone): string {
	switch (tone) {
		case 'ready':
			return 'border-sky-800/70 bg-sky-950/40 text-sky-200';
		case 'progress':
			return 'border-violet-900/70 bg-violet-950/40 text-violet-300';
		case 'decision':
			return 'border-amber-900/70 bg-amber-950/40 text-amber-300';
		case 'success':
			return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-300';
		case 'attention':
			return 'border-rose-900/70 bg-rose-950/40 text-rose-300';
		case 'neutral':
		default:
			return 'border-slate-700 bg-slate-950/70 text-slate-300';
	}
}

export function formatTaskStatusLabel(status: string): string {
	switch (status) {
		case 'in_draft':
			return 'In Draft';
		case 'ready':
			return 'Ready';
		case 'in_progress':
			return 'In Progress';
		case 'review':
			return 'Awaiting Review';
		case 'blocked':
			return 'Blocked';
		case 'done':
			return 'Done';
		default:
			return status.replace(/_/g, ' ');
	}
}

export function taskStatusToneClass(status: string): string {
	switch (status) {
		case 'ready':
			return statusToneClass('ready');
		case 'in_progress':
			return statusToneClass('progress');
		case 'review':
			return statusToneClass('decision');
		case 'blocked':
			return statusToneClass('attention');
		case 'done':
			return statusToneClass('success');
		case 'in_draft':
		default:
			return statusToneClass('neutral');
	}
}

export function formatTaskApprovalModeLabel(mode: string): string {
	switch (mode) {
		case 'none':
			return 'No Approval';
		default:
			return formatEnumLabel(mode);
	}
}

export function formatRunStatusLabel(status: string): string {
	return formatEnumLabel(status);
}

export function runStatusToneClass(status: string): string {
	switch (status) {
		case 'queued':
			return statusToneClass('ready');
		case 'starting':
		case 'running':
			return statusToneClass('progress');
		case 'awaiting_approval':
			return statusToneClass('decision');
		case 'blocked':
		case 'failed':
		case 'canceled':
			return statusToneClass('attention');
		case 'completed':
			return statusToneClass('success');
		default:
			return statusToneClass('neutral');
	}
}

export function formatReviewStatusLabel(status: string): string {
	return formatEnumLabel(status);
}

export function reviewStatusToneClass(status: string): string {
	switch (status) {
		case 'open':
			return statusToneClass('decision');
		case 'approved':
			return statusToneClass('success');
		case 'changes_requested':
			return statusToneClass('attention');
		case 'dismissed':
		default:
			return statusToneClass('neutral');
	}
}

export function formatApprovalStatusLabel(status: string): string {
	return formatEnumLabel(status);
}

export function approvalStatusToneClass(status: string): string {
	switch (status) {
		case 'pending':
			return statusToneClass('decision');
		case 'approved':
			return statusToneClass('success');
		case 'rejected':
			return statusToneClass('attention');
		case 'canceled':
		default:
			return statusToneClass('neutral');
	}
}

export function formatGoalStatusLabel(status: string): string {
	return formatEnumLabel(status);
}

export function goalStatusToneClass(status: string): string {
	switch (status) {
		case 'ready':
			return statusToneClass('ready');
		case 'running':
			return statusToneClass('progress');
		case 'review':
			return statusToneClass('decision');
		case 'blocked':
			return statusToneClass('attention');
		case 'done':
			return statusToneClass('success');
		default:
			return statusToneClass('neutral');
	}
}

export function formatWorkerStatusLabel(status: string): string {
	return formatEnumLabel(status);
}

export function workerStatusToneClass(status: string): string {
	switch (status) {
		case 'idle':
			return statusToneClass('ready');
		case 'busy':
			return statusToneClass('progress');
		case 'offline':
			return statusToneClass('attention');
		default:
			return statusToneClass('neutral');
	}
}

export function formatProviderSetupStatusLabel(status: string): string {
	return formatEnumLabel(status);
}

export function providerSetupStatusToneClass(status: string): string {
	switch (status) {
		case 'connected':
			return statusToneClass('ready');
		case 'needs_setup':
			return statusToneClass('decision');
		case 'planned':
		default:
			return statusToneClass('neutral');
	}
}

export function formatPlanningHorizonKindLabel(kind: string): string {
	return formatEnumLabel(kind);
}

export function formatPlanningHorizonStatusLabel(status: string): string {
	return formatEnumLabel(status);
}

export function planningHorizonStatusToneClass(status: string): string {
	switch (status) {
		case 'active':
			return statusToneClass('ready');
		case 'closed':
			return statusToneClass('success');
		case 'draft':
		default:
			return statusToneClass('neutral');
	}
}

export type Provider = {
	id: string;
	name: string;
	service: string;
	kind: ProviderKind;
	description: string;
	enabled: boolean;
	setupStatus: ProviderSetupStatus;
	authMode: ProviderAuthMode;
	defaultModel: string;
	baseUrl: string;
	launcher: string;
	envVars: string[];
	capabilities: string[];
	defaultThreadSandbox: AgentSandbox;
	notes: string;
};

export type Role = {
	id: string;
	name: string;
	lane: Lane | 'shared';
	description: string;
};

export type PlanningHorizon = {
	id: string;
	name: string;
	kind: PlanningHorizonKind;
	status: PlanningHorizonStatus;
	startDate: string;
	endDate: string;
	notes: string;
	capacityUnit: PlanningCapacityUnit;
	createdAt: string;
	updatedAt: string;
};

export type Goal = {
	id: string;
	name: string;
	lane: Lane;
	status: GoalStatus;
	summary: string;
	artifactPath: string;
	horizon?: string;
	successSignal?: string;
	parentGoalId?: string | null;
	projectIds?: string[];
	taskIds?: string[];
	planningHorizonId?: string | null;
	targetDate?: string | null;
	planningPriority?: number;
	confidence?: PlanningConfidence;
};

export type Project = {
	id: string;
	name: string;
	summary: string;
	projectRootFolder: string;
	defaultArtifactRoot: string;
	defaultRepoPath: string;
	defaultRepoUrl: string;
	defaultBranch: string;
};

export type Worker = {
	id: string;
	name: string;
	providerId: string;
	roleId: string;
	location: WorkerLocation;
	status: WorkerStatus;
	capacity: number;
	registeredAt: string;
	lastSeenAt: string;
	note: string;
	tags: string[];
	skills?: string[];
	weeklyCapacityHours?: number | null;
	focusFactor?: number;
	maxConcurrentRuns?: number | null;
	threadSandboxOverride: AgentSandbox | null;
	authTokenHash: string;
};

export type Task = {
	id: string;
	title: string;
	summary: string;
	projectId: string;
	lane: Lane;
	goalId: string;
	priority: Priority;
	status: TaskStatus;
	riskLevel: TaskRiskLevel;
	approvalMode: TaskApprovalMode;
	requiresReview: boolean;
	desiredRoleId: string;
	assigneeWorkerId: string | null;
	threadSessionId: string | null;
	blockedReason: string;
	dependencyTaskIds: string[];
	parentTaskId?: string | null;
	planningHorizonId?: string | null;
	estimateHours?: number | null;
	targetDate?: string | null;
	planningOrder?: number;
	source?: TaskPlanningSource;
	runCount: number;
	latestRunId: string | null;
	artifactPath: string;
	attachments: TaskAttachment[];
	createdAt: string;
	updatedAt: string;
};

export type Run = {
	id: string;
	taskId: string;
	workerId: string | null;
	providerId: string | null;
	status: RunStatus;
	createdAt: string;
	updatedAt: string;
	startedAt: string | null;
	endedAt: string | null;
	threadId: string | null;
	sessionId: string | null;
	promptDigest: string;
	artifactPaths: string[];
	summary: string;
	lastHeartbeatAt: string | null;
	errorSummary: string;
};

export type Review = {
	id: string;
	taskId: string;
	runId: string | null;
	status: ReviewStatus;
	createdAt: string;
	updatedAt: string;
	resolvedAt: string | null;
	requestedByWorkerId: string | null;
	reviewerWorkerId: string | null;
	summary: string;
};

export type Approval = {
	id: string;
	taskId: string;
	runId: string | null;
	mode: TaskApprovalMode;
	status: ApprovalStatus;
	createdAt: string;
	updatedAt: string;
	resolvedAt: string | null;
	requestedByWorkerId: string | null;
	approverWorkerId: string | null;
	summary: string;
};

export type ControlPlaneData = {
	providers: Provider[];
	roles: Role[];
	projects: Project[];
	goals: Goal[];
	planningHorizons?: PlanningHorizon[];
	workers: Worker[];
	tasks: Task[];
	runs: Run[];
	reviews: Review[];
	approvals: Approval[];
};
