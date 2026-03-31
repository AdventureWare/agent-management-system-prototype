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

export function formatTaskStatusLabel(status: string): string {
	switch (status) {
		case 'in_draft':
			return 'In Draft';
		case 'ready':
			return 'Ready';
		case 'in_progress':
			return 'In Progress';
		case 'review':
			return 'In Review';
		case 'blocked':
			return 'Blocked';
		case 'done':
			return 'Done';
		default:
			return status.replace(/_/g, ' ');
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
	notes: string;
};

export type Role = {
	id: string;
	name: string;
	lane: Lane | 'shared';
	description: string;
};

export type Goal = {
	id: string;
	name: string;
	lane: Lane;
	status: GoalStatus;
	summary: string;
	artifactPath: string;
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
	workers: Worker[];
	tasks: Task[];
	runs: Run[];
	reviews: Review[];
	approvals: Approval[];
};
