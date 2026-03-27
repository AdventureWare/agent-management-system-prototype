export const LANE_OPTIONS = ['product', 'growth', 'ops'] as const;
export const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const;
export const TASK_STATUS_OPTIONS = ['ready', 'running', 'review', 'blocked', 'done'] as const;
export const TASK_RISK_LEVEL_OPTIONS = ['low', 'medium', 'high'] as const;
export const TASK_APPROVAL_MODE_OPTIONS = [
	'none',
	'before_run',
	'before_apply',
	'before_complete'
] as const;
export const GOAL_STATUS_OPTIONS = ['ready', 'running', 'review', 'blocked', 'done'] as const;
export const WORKER_STATUS_OPTIONS = ['idle', 'busy', 'offline'] as const;
export const WORKER_LOCATION_OPTIONS = ['local', 'cloud'] as const;

export type Lane = (typeof LANE_OPTIONS)[number];
export type Priority = (typeof PRIORITY_OPTIONS)[number];
export type TaskStatus = (typeof TASK_STATUS_OPTIONS)[number];
export type TaskRiskLevel = (typeof TASK_RISK_LEVEL_OPTIONS)[number];
export type TaskApprovalMode = (typeof TASK_APPROVAL_MODE_OPTIONS)[number];
export type GoalStatus = (typeof GOAL_STATUS_OPTIONS)[number];
export type WorkerStatus = (typeof WORKER_STATUS_OPTIONS)[number];
export type WorkerLocation = (typeof WORKER_LOCATION_OPTIONS)[number];

export type Provider = {
	id: string;
	name: string;
	kind: 'local' | 'cloud' | 'api';
	description: string;
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
	lane: Lane;
	summary: string;
	defaultCoordinationFolder: string;
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
	lane: Lane;
	goalId: string;
	priority: Priority;
	status: TaskStatus;
	riskLevel: TaskRiskLevel;
	approvalMode: TaskApprovalMode;
	requiresReview: boolean;
	desiredRoleId: string;
	assigneeWorkerId: string | null;
	blockedReason: string;
	dependencyTaskIds: string[];
	artifactPath: string;
	createdAt: string;
	updatedAt: string;
};

export type ControlPlaneData = {
	providers: Provider[];
	roles: Role[];
	projects: Project[];
	goals: Goal[];
	workers: Worker[];
	tasks: Task[];
};
