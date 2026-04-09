import type {
	ApprovalStatus,
	GoalStatus,
	Priority,
	ReviewStatus,
	RunStatus,
	TaskApprovalMode,
	TaskRiskLevel,
	TaskStatus,
	ExecutionSurfaceStatus
} from '$lib/types/control-plane';
import type { AgentSandbox, AgentThreadState } from '$lib/types/agent-thread';

export type OntologyActorKind = 'human' | 'ai' | 'unknown';
export type OntologyWorkAttemptKind = 'run' | 'human_work_session';
export type OntologyCapabilitySource = 'execution_surface_skill' | 'provider_capability' | 'manual';
export type OntologyToolSource = 'provider_launcher' | 'manual';
export type OntologyArtifactSource = 'run_artifact_path';
export type OntologyContextSource = 'task_attachment' | 'thread_attachment';

export type OntologyGoal = {
	id: string;
	name: string;
	summary: string;
	status: GoalStatus;
	targetDate: string | null;
	parentGoalId: string | null;
	projectIds: string[];
	taskIds: string[];
	subgoalIds: string[];
	successSignal: string | null;
};

export type OntologyTask = {
	id: string;
	title: string;
	summary: string;
	status: TaskStatus;
	priority: Priority;
	riskLevel: TaskRiskLevel;
	approvalMode: TaskApprovalMode;
	projectId: string | null;
	goalId: string | null;
	dependencyTaskIds: string[];
	desiredRoleId: string | null;
	assignedActorId: string | null;
	primaryThreadId: string | null;
	workAttemptIds: string[];
	contextResourceIds: string[];
	artifactIds: string[];
	requiredCapabilityNames: string[];
	requiredToolNames: string[];
	targetDate: string | null;
	estimateHours: number | null;
	blockedReason: string | null;
};

export type OntologyWorkAttempt = {
	id: string;
	kind: OntologyWorkAttemptKind;
	taskId: string | null;
	performedByActorId: string | null;
	executionSurfaceId: string | null;
	providerId: string | null;
	threadId: string | null;
	status: RunStatus;
	startedAt: string | null;
	endedAt: string | null;
	summary: string;
	errorSummary: string | null;
	artifactIds: string[];
};

export type OntologyThread = {
	id: string;
	name: string;
	externalThreadId: string | null;
	state: AgentThreadState | 'unknown';
	sandbox: AgentSandbox | null;
	threadSummary: string;
	taskIds: string[];
	workAttemptIds: string[];
	contextResourceIds: string[];
};

export type OntologyArtifact = {
	id: string;
	path: string;
	source: OntologyArtifactSource;
	producedByWorkAttemptId: string | null;
	taskId: string | null;
	threadId: string | null;
};

export type OntologyContextResource = {
	id: string;
	name: string;
	path: string;
	contentType: string | null;
	source: OntologyContextSource;
	taskId: string | null;
	threadId: string | null;
};

export type OntologyActor = {
	id: string;
	name: string;
	kind: OntologyActorKind;
	roleIds: string[];
	capabilityNames: string[];
	executionSurfaceIds: string[];
};

export type OntologyExecutionSurface = {
	id: string;
	name: string;
	status: ExecutionSurfaceStatus | 'unknown';
	providerId: string | null;
	roleIds: string[];
	capabilityNames: string[];
	toolNames: string[];
	sandbox: AgentSandbox | null;
};

export type OntologyRole = {
	id: string;
	name: string;
	description: string;
	area: string;
};

export type OntologyCapability = {
	id: string;
	name: string;
	source: OntologyCapabilitySource;
};

export type OntologyTool = {
	id: string;
	name: string;
	source: OntologyToolSource;
};

export type OntologyProject = {
	id: string;
	name: string;
	summary: string;
	projectRootFolder: string;
	defaultArtifactRoot: string;
	defaultRepoPath: string;
	defaultRepoUrl: string;
	defaultBranch: string;
	additionalWritableRoots?: string[];
};

export type OntologyReview = {
	id: string;
	taskId: string;
	workAttemptId: string | null;
	status: ReviewStatus;
	reviewerActorId: string | null;
	summary: string;
};

export type OntologyApproval = {
	id: string;
	taskId: string;
	workAttemptId: string | null;
	status: ApprovalStatus;
	mode: TaskApprovalMode;
	approverActorId: string | null;
	summary: string;
};

export type OntologyPlanningSession = {
	id: string;
	windowStart: string;
	windowEnd: string;
	goalIds: string[];
	taskIds: string[];
	decisionIds: string[];
};

export type OntologyDecision = {
	id: string;
	planningSessionId: string | null;
	taskId: string | null;
	goalId: string | null;
	decisionType: string;
	summary: string;
};

export type OntologyGapSummary = {
	goalCount: number;
	taskCount: number;
	workAttemptCount: number;
	threadCount: number;
	actorCount: number;
	humanActorCount: number;
	planningSessionCount: number;
	decisionCount: number;
	goalsWithoutTasksCount: number;
	tasksWithoutGoalCount: number;
	tasksWithoutAssignedActorCount: number;
	tasksWithoutPrimaryThreadCount: number;
	tasksWithoutContextCount: number;
	tasksWithoutCapabilityRequirementsCount: number;
	workAttemptsWithoutThreadCount: number;
};

export type OntologyV1Snapshot = {
	goals: OntologyGoal[];
	tasks: OntologyTask[];
	workAttempts: OntologyWorkAttempt[];
	threads: OntologyThread[];
	artifacts: OntologyArtifact[];
	contextResources: OntologyContextResource[];
	actors: OntologyActor[];
	executionSurfaces: OntologyExecutionSurface[];
	roles: OntologyRole[];
	capabilities: OntologyCapability[];
	tools: OntologyTool[];
	projects: OntologyProject[];
	reviews: OntologyReview[];
	approvals: OntologyApproval[];
	planningSessions: OntologyPlanningSession[];
	decisions: OntologyDecision[];
	gaps: OntologyGapSummary;
	limitations: string[];
};
