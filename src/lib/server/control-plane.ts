import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { normalizePathInput } from '$lib/server/path-tools';
import { AGENT_SANDBOX_OPTIONS, type AgentSandbox } from '$lib/types/agent-session';
import {
	APPROVAL_STATUS_OPTIONS,
	DECISION_TYPE_OPTIONS,
	GOAL_STATUS_OPTIONS,
	LANE_OPTIONS,
	PROVIDER_AUTH_MODE_OPTIONS,
	PROVIDER_KIND_OPTIONS,
	PROVIDER_SETUP_STATUS_OPTIONS,
	PLANNING_CONFIDENCE_OPTIONS,
	PRIORITY_OPTIONS,
	REVIEW_STATUS_OPTIONS,
	RUN_STATUS_OPTIONS,
	TASK_APPROVAL_MODE_OPTIONS,
	TASK_RISK_LEVEL_OPTIONS,
	WORKER_LOCATION_OPTIONS,
	WORKER_STATUS_OPTIONS,
	normalizeTaskStatus,
	type Approval,
	type ApprovalStatus,
	type ControlPlaneData,
	type Decision,
	type DecisionType,
	type Goal,
	type GoalStatus,
	type Lane,
	type PlanningConfidence,
	type PlanningSession,
	type Provider,
	type ProviderAuthMode,
	type ProviderKind,
	type ProviderSetupStatus,
	type Project,
	type Priority,
	type Review,
	type ReviewStatus,
	type Run,
	type RunStatus,
	type TaskApprovalMode,
	type TaskRiskLevel,
	type Task,
	type TaskAttachment,
	type TaskStatus,
	type Worker,
	type WorkerLocation,
	type WorkerStatus
} from '$lib/types/control-plane';

const DATA_FILE = resolve(process.cwd(), 'data', 'control-plane.json');

function isLane(value: string): value is Lane {
	return LANE_OPTIONS.includes(value as Lane);
}

function isPriority(value: string): value is Priority {
	return PRIORITY_OPTIONS.includes(value as Priority);
}

function isTaskRiskLevel(value: string): value is TaskRiskLevel {
	return TASK_RISK_LEVEL_OPTIONS.includes(value as TaskRiskLevel);
}

function isTaskApprovalMode(value: string): value is TaskApprovalMode {
	return TASK_APPROVAL_MODE_OPTIONS.includes(value as TaskApprovalMode);
}

function isRunStatus(value: string): value is RunStatus {
	return RUN_STATUS_OPTIONS.includes(value as RunStatus);
}

function isReviewStatus(value: string): value is ReviewStatus {
	return REVIEW_STATUS_OPTIONS.includes(value as ReviewStatus);
}

function isApprovalStatus(value: string): value is ApprovalStatus {
	return APPROVAL_STATUS_OPTIONS.includes(value as ApprovalStatus);
}

function isDecisionType(value: string): value is DecisionType {
	return DECISION_TYPE_OPTIONS.includes(value as DecisionType);
}

function isGoalStatus(value: string): value is GoalStatus {
	return GOAL_STATUS_OPTIONS.includes(value as GoalStatus);
}

function isWorkerStatus(value: string): value is WorkerStatus {
	return WORKER_STATUS_OPTIONS.includes(value as WorkerStatus);
}

function isWorkerLocation(value: string): value is WorkerLocation {
	return WORKER_LOCATION_OPTIONS.includes(value as WorkerLocation);
}

function isProviderKind(value: string): value is ProviderKind {
	return PROVIDER_KIND_OPTIONS.includes(value as ProviderKind);
}

function isProviderSetupStatus(value: string): value is ProviderSetupStatus {
	return PROVIDER_SETUP_STATUS_OPTIONS.includes(value as ProviderSetupStatus);
}

function isProviderAuthMode(value: string): value is ProviderAuthMode {
	return PROVIDER_AUTH_MODE_OPTIONS.includes(value as ProviderAuthMode);
}

function isPlanningConfidence(value: string): value is PlanningConfidence {
	return PLANNING_CONFIDENCE_OPTIONS.includes(value as PlanningConfidence);
}

function isAgentSandbox(value: string): value is AgentSandbox {
	return AGENT_SANDBOX_OPTIONS.includes(value as AgentSandbox);
}

function defaultData(): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [],
		goals: [],
		workers: [],
		tasks: [],
		runs: [],
		reviews: [],
		planningSessions: [],
		approvals: [],
		decisions: []
	};
}

type LegacyProject = Partial<Project> & {
	lane?: unknown;
	defaultCoordinationFolder?: unknown;
	projectRootFolder?: unknown;
};

type LegacyProvider = Partial<Provider> & {
	service?: unknown;
	kind?: unknown;
	description?: unknown;
	enabled?: unknown;
	setupStatus?: unknown;
	authMode?: unknown;
	defaultModel?: unknown;
	baseUrl?: unknown;
	launcher?: unknown;
	envVars?: unknown;
	capabilities?: unknown;
	defaultThreadSandbox?: unknown;
	notes?: unknown;
};

type LegacyWorker = Partial<Worker> & {
	providerId?: unknown;
	roleId?: unknown;
	location?: unknown;
	status?: unknown;
	capacity?: unknown;
	note?: unknown;
	tags?: unknown;
	skills?: unknown;
	weeklyCapacityHours?: unknown;
	focusFactor?: unknown;
	maxConcurrentRuns?: unknown;
	threadSandboxOverride?: unknown;
	authTokenHash?: unknown;
};

type LegacyGoal = Partial<Goal> & {
	successSignal?: unknown;
	parentGoalId?: unknown;
	projectIds?: unknown;
	taskIds?: unknown;
	targetDate?: unknown;
	planningPriority?: unknown;
	confidence?: unknown;
};

type LegacyTask = Partial<Task> & {
	projectId?: unknown;
	attachments?: unknown;
	estimateHours?: unknown;
	targetDate?: unknown;
};

type LegacyRun = Partial<Run> & {
	artifactPaths?: unknown;
};

type LegacyReview = Partial<Review>;

type LegacyApproval = Partial<Approval>;
type LegacyPlanningSession = Partial<PlanningSession>;
type LegacyDecision = Partial<Decision>;
type LegacyTaskAttachment = Partial<TaskAttachment>;

function inferProviderService(provider: LegacyProvider) {
	const haystack = `${provider.id ?? ''} ${provider.name ?? ''} ${provider.description ?? ''}`
		.toLowerCase()
		.trim();

	if (haystack.includes('openai') || haystack.includes('codex') || haystack.includes('chatgpt')) {
		return 'OpenAI';
	}

	if (haystack.includes('anthropic') || haystack.includes('claude')) {
		return 'Anthropic';
	}

	if (haystack.includes('google') || haystack.includes('gemini')) {
		return 'Google';
	}

	return 'Custom';
}

function inferProviderAuthMode(provider: LegacyProvider, kind: ProviderKind): ProviderAuthMode {
	const haystack = `${provider.id ?? ''} ${provider.name ?? ''}`.toLowerCase();

	if (haystack.includes('codex') && kind === 'local') {
		return 'local_cli';
	}

	if (haystack.includes('chatgpt')) {
		return 'oauth';
	}

	if (kind === 'api') {
		return 'api_key';
	}

	return 'custom';
}

function normalizeProviderList(value: unknown) {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter(
			(candidate): candidate is string =>
				typeof candidate === 'string' && candidate.trim().length > 0
		)
		.map((candidate) => candidate.trim());
}

function normalizeOptionalAgentSandbox(value: unknown): AgentSandbox | null {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	return isAgentSandbox(normalized) ? normalized : null;
}

function normalizeAgentSandbox(value: unknown, fallback: AgentSandbox): AgentSandbox {
	return normalizeOptionalAgentSandbox(value) ?? fallback;
}

function normalizeIdList(value: unknown) {
	if (!Array.isArray(value)) {
		return [];
	}

	return [
		...new Set(
			value
				.filter(
					(candidate): candidate is string =>
						typeof candidate === 'string' && candidate.trim().length > 0
				)
				.map((candidate) => candidate.trim())
		)
	];
}

function normalizeStringList(value: unknown) {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter((candidate): candidate is string => typeof candidate === 'string')
		.map((candidate) => candidate.trim())
		.filter(Boolean);
}

function normalizeOptionalDate(value: unknown) {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	return normalized ? normalized : null;
}

function normalizePositiveNumber(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeNonNegativeInteger(value: unknown, fallback = 0) {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
		return fallback;
	}

	return Math.round(value);
}

function normalizeProvider(provider: LegacyProvider): Provider {
	const providerKindValue = typeof provider.kind === 'string' ? provider.kind : '';
	const kind: ProviderKind = isProviderKind(providerKindValue) ? providerKindValue : 'cloud';
	const providerAuthModeValue = typeof provider.authMode === 'string' ? provider.authMode : '';
	const authMode: ProviderAuthMode = isProviderAuthMode(providerAuthModeValue)
		? providerAuthModeValue
		: inferProviderAuthMode(provider, kind);
	const providerSetupStatusValue =
		typeof provider.setupStatus === 'string' ? provider.setupStatus : '';
	const setupStatus: ProviderSetupStatus = isProviderSetupStatus(providerSetupStatusValue)
		? providerSetupStatusValue
		: 'connected';

	return {
		id: typeof provider.id === 'string' ? provider.id : createProviderId(),
		name: typeof provider.name === 'string' ? provider.name : '',
		service:
			typeof provider.service === 'string' && provider.service.trim()
				? provider.service
				: inferProviderService(provider),
		kind,
		description: typeof provider.description === 'string' ? provider.description : '',
		enabled: typeof provider.enabled === 'boolean' ? provider.enabled : true,
		setupStatus,
		authMode,
		defaultModel: typeof provider.defaultModel === 'string' ? provider.defaultModel : '',
		baseUrl: typeof provider.baseUrl === 'string' ? provider.baseUrl : '',
		launcher:
			typeof provider.launcher === 'string'
				? provider.launcher
				: authMode === 'local_cli' && typeof provider.name === 'string'
					? provider.name.toLowerCase().includes('codex')
						? 'codex'
						: ''
					: '',
		envVars: normalizeProviderList(provider.envVars),
		capabilities: normalizeProviderList(provider.capabilities),
		defaultThreadSandbox: normalizeAgentSandbox(provider.defaultThreadSandbox, 'workspace-write'),
		notes: typeof provider.notes === 'string' ? provider.notes : ''
	};
}

function normalizeWorker(worker: LegacyWorker): Worker {
	const locationValue = typeof worker.location === 'string' ? worker.location : '';
	const statusValue = typeof worker.status === 'string' ? worker.status : '';
	const tags = Array.isArray(worker.tags)
		? worker.tags
				.filter((tag): tag is string => typeof tag === 'string')
				.map((tag) => tag.trim())
				.filter(Boolean)
		: [];
	const skills = normalizeStringList(worker.skills);
	const focusFactor =
		typeof worker.focusFactor === 'number' &&
		Number.isFinite(worker.focusFactor) &&
		worker.focusFactor > 0 &&
		worker.focusFactor <= 1
			? worker.focusFactor
			: 1;

	return {
		id: typeof worker.id === 'string' ? worker.id : createWorkerId(),
		name: typeof worker.name === 'string' ? worker.name : '',
		providerId: typeof worker.providerId === 'string' ? worker.providerId : '',
		roleId: typeof worker.roleId === 'string' ? worker.roleId : '',
		location: isWorkerLocation(locationValue) ? locationValue : 'cloud',
		status: isWorkerStatus(statusValue) ? statusValue : 'idle',
		capacity:
			typeof worker.capacity === 'number' && Number.isFinite(worker.capacity) && worker.capacity > 0
				? worker.capacity
				: 1,
		registeredAt:
			typeof worker.registeredAt === 'string' ? worker.registeredAt : new Date().toISOString(),
		lastSeenAt:
			typeof worker.lastSeenAt === 'string' ? worker.lastSeenAt : new Date().toISOString(),
		note: typeof worker.note === 'string' ? worker.note : '',
		tags,
		skills,
		weeklyCapacityHours: normalizePositiveNumber(worker.weeklyCapacityHours),
		focusFactor,
		maxConcurrentRuns: normalizePositiveNumber(worker.maxConcurrentRuns),
		threadSandboxOverride: normalizeOptionalAgentSandbox(worker.threadSandboxOverride),
		authTokenHash: typeof worker.authTokenHash === 'string' ? worker.authTokenHash : ''
	};
}

function normalizeGoal(goal: LegacyGoal): Goal {
	const laneValue = typeof goal.lane === 'string' ? goal.lane : '';
	const statusValue = typeof goal.status === 'string' ? goal.status : '';

	return {
		id: typeof goal.id === 'string' ? goal.id : createGoalId(),
		name: typeof goal.name === 'string' ? goal.name : '',
		summary: typeof goal.summary === 'string' ? goal.summary : '',
		lane: isLane(laneValue) ? laneValue : 'product',
		status: isGoalStatus(statusValue) ? statusValue : 'ready',
		artifactPath: normalizePathInput(
			typeof goal.artifactPath === 'string' ? goal.artifactPath : ''
		),
		successSignal: typeof goal.successSignal === 'string' ? goal.successSignal : '',
		parentGoalId:
			typeof goal.parentGoalId === 'string' && goal.parentGoalId.trim()
				? goal.parentGoalId.trim()
				: null,
		projectIds: normalizeIdList(goal.projectIds),
		taskIds: normalizeIdList(goal.taskIds),
		targetDate: normalizeOptionalDate(goal.targetDate),
		planningPriority:
			typeof goal.planningPriority === 'number' &&
			Number.isFinite(goal.planningPriority) &&
			goal.planningPriority >= 0
				? Math.round(goal.planningPriority)
				: 0,
		confidence:
			typeof goal.confidence === 'string' && isPlanningConfidence(goal.confidence)
				? goal.confidence
				: 'medium'
	};
}

function normalizeProject(
	project: Partial<Project> & { defaultCoordinationFolder?: unknown }
): Project {
	const legacyProject = project as LegacyProject;
	const projectRootFolder =
		typeof legacyProject.projectRootFolder === 'string'
			? legacyProject.projectRootFolder
			: typeof legacyProject.defaultCoordinationFolder === 'string'
				? legacyProject.defaultCoordinationFolder
				: '';
	const defaultArtifactRoot =
		typeof legacyProject.defaultArtifactRoot === 'string' ? legacyProject.defaultArtifactRoot : '';
	const defaultRepoPath =
		typeof legacyProject.defaultRepoPath === 'string' ? legacyProject.defaultRepoPath : '';

	return {
		id: typeof legacyProject.id === 'string' ? legacyProject.id : createProjectId(),
		name: typeof legacyProject.name === 'string' ? legacyProject.name : '',
		summary: typeof legacyProject.summary === 'string' ? legacyProject.summary : '',
		projectRootFolder: normalizePathInput(projectRootFolder),
		defaultArtifactRoot: normalizePathInput(defaultArtifactRoot),
		defaultRepoPath: normalizePathInput(defaultRepoPath),
		defaultRepoUrl:
			typeof legacyProject.defaultRepoUrl === 'string' ? legacyProject.defaultRepoUrl : '',
		defaultBranch:
			typeof legacyProject.defaultBranch === 'string' ? legacyProject.defaultBranch : '',
		defaultThreadSandbox: normalizeOptionalAgentSandbox(legacyProject.defaultThreadSandbox)
	};
}

function inferTaskProjectId(task: LegacyTask, projects: Project[]) {
	if (typeof task.projectId === 'string' && task.projectId.trim()) {
		return task.projectId;
	}

	const artifactPath = typeof task.artifactPath === 'string' ? task.artifactPath : '';

	if (!artifactPath) {
		return '';
	}

	const matches = projects
		.flatMap((project) =>
			[project.projectRootFolder, project.defaultArtifactRoot, project.defaultRepoPath]
				.filter((candidate) => candidate && artifactPath.startsWith(candidate))
				.map((candidate) => ({
					projectId: project.id,
					matchLength: candidate.length
				}))
		)
		.sort((a, b) => b.matchLength - a.matchLength);

	return matches[0]?.projectId ?? '';
}

function normalizeRun(run: LegacyRun): Run {
	const now = new Date().toISOString();
	const statusValue = typeof run.status === 'string' ? run.status : '';

	return {
		id: typeof run.id === 'string' ? run.id : createRunId(),
		taskId: typeof run.taskId === 'string' ? run.taskId : '',
		workerId: typeof run.workerId === 'string' && run.workerId.trim() ? run.workerId : null,
		providerId: typeof run.providerId === 'string' && run.providerId.trim() ? run.providerId : null,
		status: isRunStatus(statusValue) ? statusValue : 'queued',
		createdAt: typeof run.createdAt === 'string' ? run.createdAt : now,
		updatedAt: typeof run.updatedAt === 'string' ? run.updatedAt : now,
		startedAt: typeof run.startedAt === 'string' ? run.startedAt : null,
		endedAt: typeof run.endedAt === 'string' ? run.endedAt : null,
		threadId: typeof run.threadId === 'string' && run.threadId.trim() ? run.threadId : null,
		sessionId: typeof run.sessionId === 'string' && run.sessionId.trim() ? run.sessionId : null,
		promptDigest: typeof run.promptDigest === 'string' ? run.promptDigest : '',
		artifactPaths: Array.isArray(run.artifactPaths)
			? run.artifactPaths.filter((candidate): candidate is string => typeof candidate === 'string')
			: [],
		summary: typeof run.summary === 'string' ? run.summary : '',
		lastHeartbeatAt: typeof run.lastHeartbeatAt === 'string' ? run.lastHeartbeatAt : null,
		errorSummary: typeof run.errorSummary === 'string' ? run.errorSummary : ''
	};
}

function normalizeReview(review: LegacyReview): Review {
	const now = new Date().toISOString();
	const statusValue = typeof review.status === 'string' ? review.status : '';

	return {
		id: typeof review.id === 'string' ? review.id : createReviewId(),
		taskId: typeof review.taskId === 'string' ? review.taskId : '',
		runId: typeof review.runId === 'string' && review.runId.trim() ? review.runId : null,
		status: isReviewStatus(statusValue) ? statusValue : 'open',
		createdAt: typeof review.createdAt === 'string' ? review.createdAt : now,
		updatedAt: typeof review.updatedAt === 'string' ? review.updatedAt : now,
		resolvedAt: typeof review.resolvedAt === 'string' ? review.resolvedAt : null,
		requestedByWorkerId:
			typeof review.requestedByWorkerId === 'string' && review.requestedByWorkerId.trim()
				? review.requestedByWorkerId
				: null,
		reviewerWorkerId:
			typeof review.reviewerWorkerId === 'string' && review.reviewerWorkerId.trim()
				? review.reviewerWorkerId
				: null,
		summary: typeof review.summary === 'string' ? review.summary : ''
	};
}

function normalizeApproval(approval: LegacyApproval): Approval {
	const now = new Date().toISOString();
	const statusValue = typeof approval.status === 'string' ? approval.status : '';
	const modeValue = typeof approval.mode === 'string' ? approval.mode : '';

	return {
		id: typeof approval.id === 'string' ? approval.id : createApprovalId(),
		taskId: typeof approval.taskId === 'string' ? approval.taskId : '',
		runId: typeof approval.runId === 'string' && approval.runId.trim() ? approval.runId : null,
		mode: isTaskApprovalMode(modeValue) ? modeValue : 'none',
		status: isApprovalStatus(statusValue) ? statusValue : 'pending',
		createdAt: typeof approval.createdAt === 'string' ? approval.createdAt : now,
		updatedAt: typeof approval.updatedAt === 'string' ? approval.updatedAt : now,
		resolvedAt: typeof approval.resolvedAt === 'string' ? approval.resolvedAt : null,
		requestedByWorkerId:
			typeof approval.requestedByWorkerId === 'string' && approval.requestedByWorkerId.trim()
				? approval.requestedByWorkerId
				: null,
		approverWorkerId:
			typeof approval.approverWorkerId === 'string' && approval.approverWorkerId.trim()
				? approval.approverWorkerId
				: null,
		summary: typeof approval.summary === 'string' ? approval.summary : ''
	};
}

function normalizeDecision(decision: LegacyDecision): Decision {
	const now = new Date().toISOString();
	const decisionTypeValue = typeof decision.decisionType === 'string' ? decision.decisionType : '';

	return {
		id: typeof decision.id === 'string' ? decision.id : createDecisionId(),
		taskId: typeof decision.taskId === 'string' && decision.taskId.trim() ? decision.taskId : null,
		goalId: typeof decision.goalId === 'string' && decision.goalId.trim() ? decision.goalId : null,
		runId: typeof decision.runId === 'string' && decision.runId.trim() ? decision.runId : null,
		reviewId:
			typeof decision.reviewId === 'string' && decision.reviewId.trim() ? decision.reviewId : null,
		approvalId:
			typeof decision.approvalId === 'string' && decision.approvalId.trim()
				? decision.approvalId
				: null,
		planningSessionId:
			typeof decision.planningSessionId === 'string' && decision.planningSessionId.trim()
				? decision.planningSessionId
				: null,
		decisionType: isDecisionType(decisionTypeValue) ? decisionTypeValue : 'task_plan_updated',
		summary: typeof decision.summary === 'string' ? decision.summary : '',
		createdAt: typeof decision.createdAt === 'string' ? decision.createdAt : now,
		decidedByWorkerId:
			typeof decision.decidedByWorkerId === 'string' && decision.decidedByWorkerId.trim()
				? decision.decidedByWorkerId
				: null
	};
}

function normalizePlanningSession(session: LegacyPlanningSession): PlanningSession {
	const now = new Date().toISOString();

	return {
		id: typeof session.id === 'string' ? session.id : `planning_session_${randomUUID()}`,
		windowStart:
			typeof session.windowStart === 'string' && session.windowStart.trim()
				? session.windowStart
				: now.slice(0, 10),
		windowEnd:
			typeof session.windowEnd === 'string' && session.windowEnd.trim()
				? session.windowEnd
				: now.slice(0, 10),
		projectId:
			typeof session.projectId === 'string' && session.projectId.trim() ? session.projectId : null,
		goalId: typeof session.goalId === 'string' && session.goalId.trim() ? session.goalId : null,
		workerId:
			typeof session.workerId === 'string' && session.workerId.trim() ? session.workerId : null,
		includeUnscheduled:
			typeof session.includeUnscheduled === 'boolean' ? session.includeUnscheduled : true,
		goalIds: Array.isArray(session.goalIds)
			? session.goalIds.filter(
					(value): value is string => typeof value === 'string' && value.trim().length > 0
				)
			: [],
		taskIds: Array.isArray(session.taskIds)
			? session.taskIds.filter(
					(value): value is string => typeof value === 'string' && value.trim().length > 0
				)
			: [],
		decisionIds: Array.isArray(session.decisionIds)
			? session.decisionIds.filter(
					(value): value is string => typeof value === 'string' && value.trim().length > 0
				)
			: [],
		summary: typeof session.summary === 'string' ? session.summary : '',
		createdAt: typeof session.createdAt === 'string' ? session.createdAt : now
	};
}

function normalizeTaskAttachment(attachment: LegacyTaskAttachment): TaskAttachment | null {
	if (typeof attachment.path !== 'string' || !attachment.path.trim()) {
		return null;
	}

	const attachedAt =
		typeof attachment.attachedAt === 'string' && attachment.attachedAt.trim()
			? attachment.attachedAt
			: new Date().toISOString();

	return {
		id:
			typeof attachment.id === 'string' && attachment.id.trim()
				? attachment.id
				: createTaskAttachmentId(),
		name:
			typeof attachment.name === 'string' && attachment.name.trim()
				? attachment.name
				: attachment.path.trim().split('/').pop() || 'Attachment',
		path: normalizePathInput(attachment.path),
		contentType:
			typeof attachment.contentType === 'string' && attachment.contentType.trim()
				? attachment.contentType
				: 'application/octet-stream',
		sizeBytes:
			typeof attachment.sizeBytes === 'number' &&
			Number.isFinite(attachment.sizeBytes) &&
			attachment.sizeBytes >= 0
				? attachment.sizeBytes
				: 0,
		attachedAt
	};
}

function normalizeTask(task: LegacyTask, projects: Project[], runs: Run[]): Task {
	const laneValue = task.lane;
	const priorityValue = task.priority;
	const statusValue = task.status;
	const riskLevelValue = task.riskLevel;
	const approvalModeValue = task.approvalMode;
	const taskRuns = runs
		.filter((run) => run.taskId === task.id)
		.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

	const lane: Lane = typeof laneValue === 'string' && isLane(laneValue) ? laneValue : 'product';
	const priority: Priority =
		typeof priorityValue === 'string' && isPriority(priorityValue) ? priorityValue : 'medium';
	const status = typeof statusValue === 'string' ? normalizeTaskStatus(statusValue) : null;
	const riskLevel: TaskRiskLevel =
		typeof riskLevelValue === 'string' && isTaskRiskLevel(riskLevelValue)
			? riskLevelValue
			: 'medium';
	const approvalMode: TaskApprovalMode =
		typeof approvalModeValue === 'string' && isTaskApprovalMode(approvalModeValue)
			? approvalModeValue
			: 'none';
	return {
		id: typeof task.id === 'string' ? task.id : createTaskId(),
		title: typeof task.title === 'string' ? task.title : '',
		summary: typeof task.summary === 'string' ? task.summary : '',
		projectId: inferTaskProjectId(task, projects),
		lane,
		goalId: typeof task.goalId === 'string' ? task.goalId : '',
		priority,
		status: status ?? 'ready',
		riskLevel,
		approvalMode,
		requiresReview: typeof task.requiresReview === 'boolean' ? task.requiresReview : true,
		desiredRoleId: typeof task.desiredRoleId === 'string' ? task.desiredRoleId : '',
		assigneeWorkerId:
			typeof task.assigneeWorkerId === 'string' && task.assigneeWorkerId.trim()
				? task.assigneeWorkerId
				: null,
		threadSessionId:
			typeof task.threadSessionId === 'string' && task.threadSessionId.trim()
				? task.threadSessionId
				: null,
		requiredCapabilityNames: normalizeStringList(task.requiredCapabilityNames),
		requiredToolNames: normalizeStringList(task.requiredToolNames),
		blockedReason: typeof task.blockedReason === 'string' ? task.blockedReason : '',
		dependencyTaskIds: Array.isArray(task.dependencyTaskIds)
			? task.dependencyTaskIds.filter(
					(candidate) => typeof candidate === 'string' && candidate.trim()
				)
			: [],
		estimateHours: normalizePositiveNumber(task.estimateHours),
		targetDate: normalizeOptionalDate(task.targetDate),
		runCount: taskRuns.length,
		latestRunId: taskRuns[0]?.id ?? null,
		artifactPath: typeof task.artifactPath === 'string' ? task.artifactPath : '',
		attachments: Array.isArray(task.attachments)
			? task.attachments
					.map((attachment) => normalizeTaskAttachment(attachment as LegacyTaskAttachment))
					.filter((attachment): attachment is TaskAttachment => attachment !== null)
					.sort((left, right) => right.attachedAt.localeCompare(left.attachedAt))
			: [],
		createdAt: typeof task.createdAt === 'string' ? task.createdAt : new Date().toISOString(),
		updatedAt: typeof task.updatedAt === 'string' ? task.updatedAt : new Date().toISOString()
	};
}

export function syncTaskExecutionState(data: ControlPlaneData): ControlPlaneData {
	const runsByTaskId = new Map<string, Run[]>();

	for (const run of data.runs) {
		const taskRuns = runsByTaskId.get(run.taskId) ?? [];
		taskRuns.push(run);
		runsByTaskId.set(run.taskId, taskRuns);
	}

	return {
		...data,
		tasks: data.tasks.map((task) => {
			const taskRuns = [...(runsByTaskId.get(task.id) ?? [])].sort((left, right) =>
				right.createdAt.localeCompare(left.createdAt)
			);

			return {
				...task,
				threadSessionId: task.threadSessionId,
				runCount: taskRuns.length,
				latestRunId: taskRuns[0]?.id ?? null
			};
		})
	};
}

function taskNeedsApproval(task: Task) {
	switch (task.approvalMode) {
		case 'before_run':
			return task.runCount === 0 && task.status === 'ready';
		case 'before_apply':
			return task.status === 'in_progress';
		case 'before_complete':
			return task.status === 'review' || task.status === 'done';
		default:
			return false;
	}
}

function sortNewestFirst<T extends { createdAt: string }>(items: T[]) {
	return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getOpenReviewForTask(data: ControlPlaneData, taskId: string) {
	return (
		sortNewestFirst(
			data.reviews.filter((review) => review.taskId === taskId && review.status === 'open')
		)[0] ?? null
	);
}

export function getPendingApprovalForTask(data: ControlPlaneData, taskId: string) {
	return (
		sortNewestFirst(
			data.approvals.filter(
				(approval) => approval.taskId === taskId && approval.status === 'pending'
			)
		)[0] ?? null
	);
}

export function syncGovernanceQueues(data: ControlPlaneData): ControlPlaneData {
	const reviews = [...data.reviews];
	const approvals = [...data.approvals];

	for (const task of data.tasks) {
		const openReview = getOpenReviewForTask(
			{
				...data,
				reviews,
				approvals
			},
			task.id
		);
		const existingReviewForStage = reviews.find(
			(review) => review.taskId === task.id && review.runId === task.latestRunId
		);
		const pendingApproval = getPendingApprovalForTask(
			{
				...data,
				reviews,
				approvals
			},
			task.id
		);
		const existingApprovalForStage = approvals.find(
			(approval) =>
				approval.taskId === task.id &&
				approval.mode === task.approvalMode &&
				approval.runId === task.latestRunId
		);

		if (task.requiresReview && task.status === 'review' && !openReview && !existingReviewForStage) {
			reviews.unshift(
				createReview({
					taskId: task.id,
					runId: task.latestRunId,
					summary: 'Task entered the review queue.'
				})
			);
		}

		if (
			task.approvalMode !== 'none' &&
			taskNeedsApproval(task) &&
			!pendingApproval &&
			!existingApprovalForStage
		) {
			approvals.unshift(
				createApproval({
					taskId: task.id,
					runId: task.latestRunId,
					mode: task.approvalMode,
					summary:
						task.approvalMode === 'before_run'
							? 'Task requires approval before the first run can start.'
							: task.approvalMode === 'before_apply'
								? 'Run is waiting on approval before changes should be applied.'
								: 'Task requires approval before it can be closed out.'
				})
			);
		}
	}

	return {
		...data,
		reviews,
		approvals
	};
}

async function ensureDataFile() {
	try {
		await readFile(DATA_FILE, 'utf8');
	} catch {
		await mkdir(resolve(process.cwd(), 'data'), { recursive: true });
		await writeFile(DATA_FILE, JSON.stringify(defaultData(), null, 2));
	}
}

export async function loadControlPlane(): Promise<ControlPlaneData> {
	await ensureDataFile();
	const raw = await readFile(DATA_FILE, 'utf8');

	try {
		const parsed = JSON.parse(raw) as Partial<ControlPlaneData>;
		const providers = Array.isArray(parsed.providers)
			? parsed.providers.map((provider) => normalizeProvider(provider as LegacyProvider))
			: [];
		const projects = Array.isArray(parsed.projects)
			? parsed.projects.map((project) => normalizeProject(project as Project))
			: [];
		const runs = Array.isArray(parsed.runs)
			? parsed.runs.map((run) => normalizeRun(run as LegacyRun))
			: [];
		const reviews = Array.isArray(parsed.reviews)
			? parsed.reviews.map((review) => normalizeReview(review as LegacyReview))
			: [];
		const planningSessions = Array.isArray(parsed.planningSessions)
			? parsed.planningSessions.map((session) =>
					normalizePlanningSession(session as LegacyPlanningSession)
				)
			: [];
		const approvals = Array.isArray(parsed.approvals)
			? parsed.approvals.map((approval) => normalizeApproval(approval as LegacyApproval))
			: [];
		const decisions = Array.isArray(parsed.decisions)
			? parsed.decisions.map((decision) => normalizeDecision(decision as LegacyDecision))
			: [];

		return syncGovernanceQueues(
			syncTaskExecutionState({
				providers,
				roles: Array.isArray(parsed.roles) ? parsed.roles : [],
				projects,
				goals: Array.isArray(parsed.goals)
					? parsed.goals.map((goal) => normalizeGoal(goal as LegacyGoal))
					: [],
				workers: Array.isArray(parsed.workers)
					? parsed.workers.map((worker) => normalizeWorker(worker as LegacyWorker))
					: [],
				tasks: Array.isArray(parsed.tasks)
					? parsed.tasks.map((task) => normalizeTask(task as LegacyTask, projects, runs))
					: [],
				runs,
				reviews,
				planningSessions,
				approvals,
				decisions
			})
		);
	} catch {
		return defaultData();
	}
}

async function saveControlPlane(data: ControlPlaneData) {
	await mkdir(resolve(process.cwd(), 'data'), { recursive: true });
	await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function updateControlPlane(
	updater: (data: ControlPlaneData) => ControlPlaneData | Promise<ControlPlaneData>
) {
	const current = await loadControlPlane();
	const next = syncGovernanceQueues(syncTaskExecutionState(await updater(current)));
	await saveControlPlane(next);
	return next;
}

export function formatRelativeTime(iso: string) {
	const deltaMs = Date.now() - new Date(iso).getTime();
	const deltaMinutes = Math.max(0, Math.round(deltaMs / 60000));

	if (deltaMinutes < 1) return 'just now';
	if (deltaMinutes < 60) return `${deltaMinutes}m ago`;

	const deltaHours = Math.round(deltaMinutes / 60);
	if (deltaHours < 24) return `${deltaHours}h ago`;

	const deltaDays = Math.round(deltaHours / 24);
	return `${deltaDays}d ago`;
}

export function summarizeControlPlane(data: ControlPlaneData) {
	const runningTasks = data.tasks.filter((task) => task.status === 'in_progress');
	const blockedTasks = data.tasks.filter((task) => task.status === 'blocked');
	const readyTasks = data.tasks.filter((task) => task.status === 'ready');
	const reviewTasks = data.tasks.filter((task) => task.status === 'review');
	const dependencyBlockedTasks = data.tasks.filter((task) => taskHasUnmetDependencies(data, task));
	const reviewRequiredTasks = reviewTasks.filter((task) => task.requiresReview);
	const highRiskTasks = data.tasks.filter(
		(task) => task.riskLevel === 'high' && task.status !== 'done'
	);
	const activeRuns = data.runs.filter(
		(run) => run.status === 'starting' || run.status === 'running'
	);
	const blockedRuns = data.runs.filter((run) => run.status === 'blocked');
	const openReviews = data.reviews.filter((review) => review.status === 'open');
	const pendingApprovals = data.approvals.filter((approval) => approval.status === 'pending');
	const onlineWorkers = data.workers.filter((worker) => worker.status !== 'offline');
	const busyWorkers = data.workers.filter((worker) => worker.status === 'busy');

	return {
		taskCount: data.tasks.length,
		runCount: data.runs.length,
		activeRunCount: activeRuns.length,
		blockedRunCount: blockedRuns.length,
		openReviewCount: openReviews.length,
		pendingApprovalCount: pendingApprovals.length,
		runningTaskCount: runningTasks.length,
		blockedTaskCount: blockedTasks.length,
		readyTaskCount: readyTasks.length,
		reviewTaskCount: reviewTasks.length,
		reviewRequiredTaskCount: reviewRequiredTasks.length,
		dependencyBlockedTaskCount: dependencyBlockedTasks.length,
		highRiskTaskCount: highRiskTasks.length,
		projectCount: data.projects.length,
		goalCount: data.goals.length,
		workerCount: data.workers.length,
		onlineWorkerCount: onlineWorkers.length,
		busyWorkerCount: busyWorkers.length
	};
}

export function createGoalId() {
	return `goal_${randomUUID()}`;
}

export function createProviderId() {
	return `provider_${randomUUID()}`;
}

export function createProjectId() {
	return `project_${randomUUID()}`;
}

export function createTaskId() {
	return `task_${randomUUID()}`;
}

export function createTaskAttachmentId() {
	return `attachment_${randomUUID()}`;
}

export function createRunId() {
	return `run_${randomUUID()}`;
}

export function createReviewId() {
	return `review_${randomUUID()}`;
}

export function createApprovalId() {
	return `approval_${randomUUID()}`;
}

export function createPlanningSessionId() {
	return `planning_session_${randomUUID()}`;
}

export function createDecisionId() {
	return `decision_${randomUUID()}`;
}

export function createWorkerId() {
	return `worker_${randomUUID()}`;
}

export function parseLane(value: string, fallback: Lane): Lane {
	return isLane(value) ? value : fallback;
}

export function parsePriority(value: string, fallback: Priority): Priority {
	return isPriority(value) ? value : fallback;
}

export function parseTaskStatus(value: string, fallback: TaskStatus): TaskStatus {
	return normalizeTaskStatus(value) ?? fallback;
}

export function parseTaskRiskLevel(value: string, fallback: TaskRiskLevel): TaskRiskLevel {
	return isTaskRiskLevel(value) ? value : fallback;
}

export function parseTaskApprovalMode(value: string, fallback: TaskApprovalMode): TaskApprovalMode {
	return isTaskApprovalMode(value) ? value : fallback;
}

export function parseRunStatus(value: string, fallback: RunStatus): RunStatus {
	return isRunStatus(value) ? value : fallback;
}

export function parseReviewStatus(value: string, fallback: ReviewStatus): ReviewStatus {
	return isReviewStatus(value) ? value : fallback;
}

export function parseApprovalStatus(value: string, fallback: ApprovalStatus): ApprovalStatus {
	return isApprovalStatus(value) ? value : fallback;
}

export function parseGoalStatus(value: string, fallback: GoalStatus): GoalStatus {
	return isGoalStatus(value) ? value : fallback;
}

export function parseWorkerStatus(value: string, fallback: WorkerStatus): WorkerStatus {
	return isWorkerStatus(value) ? value : fallback;
}

export function parseWorkerLocation(value: string, fallback: WorkerLocation): WorkerLocation {
	return isWorkerLocation(value) ? value : fallback;
}

export function parseProviderKind(value: string, fallback: ProviderKind): ProviderKind {
	return isProviderKind(value) ? value : fallback;
}

export function parseProviderSetupStatus(
	value: string,
	fallback: ProviderSetupStatus
): ProviderSetupStatus {
	return isProviderSetupStatus(value) ? value : fallback;
}

export function parseProviderAuthMode(value: string, fallback: ProviderAuthMode): ProviderAuthMode {
	return isProviderAuthMode(value) ? value : fallback;
}

export function createProvider(input: {
	name: string;
	service: string;
	kind: ProviderKind;
	description: string;
	enabled: boolean;
	setupStatus: ProviderSetupStatus;
	authMode: ProviderAuthMode;
	defaultModel?: string;
	baseUrl?: string;
	launcher?: string;
	envVars?: string[];
	capabilities?: string[];
	defaultThreadSandbox?: AgentSandbox;
	notes?: string;
}): Provider {
	return {
		id: createProviderId(),
		name: input.name,
		service: input.service,
		kind: input.kind,
		description: input.description,
		enabled: input.enabled,
		setupStatus: input.setupStatus,
		authMode: input.authMode,
		defaultModel: input.defaultModel ?? '',
		baseUrl: input.baseUrl ?? '',
		launcher: input.launcher ?? '',
		envVars: input.envVars ?? [],
		capabilities: input.capabilities ?? [],
		defaultThreadSandbox: input.defaultThreadSandbox ?? 'workspace-write',
		notes: input.notes ?? ''
	};
}

export function createGoal(input: {
	name: string;
	summary: string;
	lane: Lane;
	status: GoalStatus;
	artifactPath: string;
	successSignal?: string;
	parentGoalId?: string | null;
	projectIds?: string[];
	taskIds?: string[];
	targetDate?: string | null;
	planningPriority?: number;
	confidence?: PlanningConfidence;
}): Goal {
	return {
		id: createGoalId(),
		name: input.name,
		summary: input.summary,
		lane: input.lane,
		status: input.status,
		artifactPath: normalizePathInput(input.artifactPath),
		successSignal: input.successSignal ?? '',
		parentGoalId: input.parentGoalId ?? null,
		projectIds: input.projectIds ?? [],
		taskIds: input.taskIds ?? [],
		targetDate: input.targetDate ?? null,
		planningPriority: input.planningPriority ?? 0,
		confidence: input.confidence ?? 'medium'
	};
}

export function createProject(input: {
	name: string;
	summary: string;
	projectRootFolder?: string;
	defaultArtifactRoot?: string;
	defaultRepoPath?: string;
	defaultRepoUrl?: string;
	defaultBranch?: string;
	defaultThreadSandbox?: AgentSandbox | null;
}): Project {
	return {
		id: createProjectId(),
		name: input.name,
		summary: input.summary,
		projectRootFolder: normalizePathInput(input.projectRootFolder),
		defaultArtifactRoot: normalizePathInput(input.defaultArtifactRoot),
		defaultRepoPath: normalizePathInput(input.defaultRepoPath),
		defaultRepoUrl: input.defaultRepoUrl ?? '',
		defaultBranch: input.defaultBranch ?? '',
		defaultThreadSandbox: input.defaultThreadSandbox ?? null
	};
}

export function projectMatchesPath(project: Project, path: string) {
	if (!path) {
		return false;
	}

	const projectPaths = [
		project.projectRootFolder,
		project.defaultArtifactRoot,
		project.defaultRepoPath
	].filter((candidate): candidate is string => Boolean(candidate));

	return projectPaths.some((projectPath) => {
		if (path === projectPath) {
			return true;
		}

		const prefix = projectPath.endsWith('/') ? projectPath : `${projectPath}/`;
		return path.startsWith(prefix);
	});
}

export function goalLinksProject(goal: Goal, project: Project) {
	return (
		(goal.projectIds ?? []).includes(project.id) || projectMatchesPath(project, goal.artifactPath)
	);
}

export function createTask(input: {
	title: string;
	summary: string;
	projectId: string;
	lane: Lane;
	goalId: string;
	priority: Priority;
	riskLevel: TaskRiskLevel;
	approvalMode: TaskApprovalMode;
	requiresReview: boolean;
	desiredRoleId: string;
	artifactPath: string;
	requiredCapabilityNames?: string[];
	requiredToolNames?: string[];
	blockedReason?: string;
	dependencyTaskIds?: string[];
	estimateHours?: number | null;
	targetDate?: string | null;
	assigneeWorkerId?: string | null;
	threadSessionId?: string | null;
	status?: TaskStatus;
	attachments?: TaskAttachment[];
}): Task {
	const now = new Date().toISOString();

	return {
		id: createTaskId(),
		title: input.title,
		summary: input.summary,
		projectId: input.projectId,
		lane: input.lane,
		goalId: input.goalId,
		priority: input.priority,
		status: input.status ?? 'ready',
		riskLevel: input.riskLevel,
		approvalMode: input.approvalMode,
		requiresReview: input.requiresReview,
		desiredRoleId: input.desiredRoleId,
		assigneeWorkerId: input.assigneeWorkerId ?? null,
		threadSessionId: input.threadSessionId ?? null,
		requiredCapabilityNames: input.requiredCapabilityNames ?? [],
		requiredToolNames: input.requiredToolNames ?? [],
		blockedReason: input.blockedReason ?? '',
		dependencyTaskIds: input.dependencyTaskIds ?? [],
		estimateHours: input.estimateHours ?? null,
		targetDate: input.targetDate ?? null,
		runCount: 0,
		latestRunId: null,
		artifactPath: input.artifactPath,
		attachments: input.attachments ?? [],
		createdAt: now,
		updatedAt: now
	};
}

export function createRun(input: {
	taskId: string;
	workerId?: string | null;
	providerId?: string | null;
	status?: RunStatus;
	startedAt?: string | null;
	endedAt?: string | null;
	threadId?: string | null;
	sessionId?: string | null;
	promptDigest?: string;
	artifactPaths?: string[];
	summary?: string;
	lastHeartbeatAt?: string | null;
	errorSummary?: string;
}): Run {
	const now = new Date().toISOString();

	return {
		id: createRunId(),
		taskId: input.taskId,
		workerId: input.workerId ?? null,
		providerId: input.providerId ?? null,
		status: input.status ?? 'queued',
		createdAt: now,
		updatedAt: now,
		startedAt: input.startedAt ?? null,
		endedAt: input.endedAt ?? null,
		threadId: input.threadId ?? null,
		sessionId: input.sessionId ?? null,
		promptDigest: input.promptDigest ?? '',
		artifactPaths: input.artifactPaths ?? [],
		summary: input.summary ?? '',
		lastHeartbeatAt: input.lastHeartbeatAt ?? null,
		errorSummary: input.errorSummary ?? ''
	};
}

export function createReview(input: {
	taskId: string;
	runId?: string | null;
	status?: ReviewStatus;
	requestedByWorkerId?: string | null;
	reviewerWorkerId?: string | null;
	resolvedAt?: string | null;
	summary?: string;
}): Review {
	const now = new Date().toISOString();

	return {
		id: createReviewId(),
		taskId: input.taskId,
		runId: input.runId ?? null,
		status: input.status ?? 'open',
		createdAt: now,
		updatedAt: now,
		resolvedAt: input.resolvedAt ?? null,
		requestedByWorkerId: input.requestedByWorkerId ?? null,
		reviewerWorkerId: input.reviewerWorkerId ?? null,
		summary: input.summary ?? ''
	};
}

export function createApproval(input: {
	taskId: string;
	runId?: string | null;
	mode: TaskApprovalMode;
	status?: ApprovalStatus;
	requestedByWorkerId?: string | null;
	approverWorkerId?: string | null;
	resolvedAt?: string | null;
	summary?: string;
}): Approval {
	const now = new Date().toISOString();

	return {
		id: createApprovalId(),
		taskId: input.taskId,
		runId: input.runId ?? null,
		mode: input.mode,
		status: input.status ?? 'pending',
		createdAt: now,
		updatedAt: now,
		resolvedAt: input.resolvedAt ?? null,
		requestedByWorkerId: input.requestedByWorkerId ?? null,
		approverWorkerId: input.approverWorkerId ?? null,
		summary: input.summary ?? ''
	};
}

export function createDecision(input: {
	taskId?: string | null;
	goalId?: string | null;
	runId?: string | null;
	reviewId?: string | null;
	approvalId?: string | null;
	planningSessionId?: string | null;
	decisionType: DecisionType;
	summary: string;
	createdAt?: string;
	decidedByWorkerId?: string | null;
}): Decision {
	return {
		id: createDecisionId(),
		taskId: input.taskId ?? null,
		goalId: input.goalId ?? null,
		runId: input.runId ?? null,
		reviewId: input.reviewId ?? null,
		approvalId: input.approvalId ?? null,
		planningSessionId: input.planningSessionId ?? null,
		decisionType: input.decisionType,
		summary: input.summary,
		createdAt: input.createdAt ?? new Date().toISOString(),
		decidedByWorkerId: input.decidedByWorkerId ?? null
	};
}

export function createPlanningSession(input: {
	windowStart: string;
	windowEnd: string;
	projectId?: string | null;
	goalId?: string | null;
	workerId?: string | null;
	includeUnscheduled: boolean;
	goalIds?: string[];
	taskIds?: string[];
	decisionIds?: string[];
	summary: string;
	createdAt?: string;
}): PlanningSession {
	return {
		id: createPlanningSessionId(),
		windowStart: input.windowStart,
		windowEnd: input.windowEnd,
		projectId: input.projectId ?? null,
		goalId: input.goalId ?? null,
		workerId: input.workerId ?? null,
		includeUnscheduled: input.includeUnscheduled,
		goalIds: input.goalIds ?? [],
		taskIds: input.taskIds ?? [],
		decisionIds: input.decisionIds ?? [],
		summary: input.summary,
		createdAt: input.createdAt ?? new Date().toISOString()
	};
}

export function taskHasUnmetDependencies(data: ControlPlaneData, task: Task) {
	if (task.dependencyTaskIds.length === 0) {
		return false;
	}

	const doneTaskIds = new Set(
		data.tasks.filter((candidate) => candidate.status === 'done').map((candidate) => candidate.id)
	);

	return task.dependencyTaskIds.some((dependencyTaskId) => !doneTaskIds.has(dependencyTaskId));
}

export function deleteTask(data: ControlPlaneData, taskId: string): ControlPlaneData {
	const relatedRunIds = new Set(
		data.runs.filter((candidate) => candidate.taskId === taskId).map((candidate) => candidate.id)
	);
	const now = new Date().toISOString();

	return {
		...data,
		tasks: data.tasks
			.filter((task) => task.id !== taskId)
			.map((task) =>
				task.dependencyTaskIds.includes(taskId)
					? {
							...task,
							dependencyTaskIds: task.dependencyTaskIds.filter(
								(dependencyTaskId) => dependencyTaskId !== taskId
							),
							updatedAt: now
						}
					: task
			),
		runs: data.runs.filter((run) => run.taskId !== taskId),
		reviews: data.reviews.filter(
			(review) => review.taskId !== taskId && !(review.runId && relatedRunIds.has(review.runId))
		),
		planningSessions: (data.planningSessions ?? []).map((session) => ({
			...session,
			taskIds: session.taskIds.filter((candidateTaskId) => candidateTaskId !== taskId),
			decisionIds: session.decisionIds.filter((decisionId) =>
				(data.decisions ?? []).some(
					(decision) =>
						decision.id === decisionId &&
						decision.taskId !== taskId &&
						!(decision.runId && relatedRunIds.has(decision.runId))
				)
			)
		})),
		approvals: data.approvals.filter(
			(approval) =>
				approval.taskId !== taskId && !(approval.runId && relatedRunIds.has(approval.runId))
		),
		decisions: (data.decisions ?? []).filter(
			(decision) =>
				decision.taskId !== taskId && !(decision.runId && relatedRunIds.has(decision.runId))
		)
	};
}

export function createWorker(input: {
	name: string;
	providerId: string;
	roleId: string;
	location: WorkerLocation;
	status: WorkerStatus;
	capacity: number;
	note: string;
	tags: string[];
	skills?: string[];
	weeklyCapacityHours?: number | null;
	focusFactor?: number;
	maxConcurrentRuns?: number | null;
	threadSandboxOverride?: AgentSandbox | null;
}): Worker {
	return {
		id: createWorkerId(),
		name: input.name,
		providerId: input.providerId,
		roleId: input.roleId,
		location: input.location,
		status: input.status,
		capacity: input.capacity,
		registeredAt: new Date().toISOString(),
		lastSeenAt: new Date().toISOString(),
		note: input.note,
		tags: input.tags,
		skills: input.skills ?? [],
		weeklyCapacityHours: input.weeklyCapacityHours ?? null,
		focusFactor: input.focusFactor ?? 1,
		maxConcurrentRuns: input.maxConcurrentRuns ?? null,
		threadSandboxOverride: input.threadSandboxOverride ?? null,
		authTokenHash: ''
	};
}

export function resolveThreadSandbox(input: {
	worker?: Pick<Worker, 'threadSandboxOverride'> | null;
	project?: Pick<Project, 'defaultThreadSandbox'> | null;
	provider?: Pick<Provider, 'defaultThreadSandbox'> | null;
	fallback?: AgentSandbox;
}) {
	return (
		input.worker?.threadSandboxOverride ??
		input.project?.defaultThreadSandbox ??
		input.provider?.defaultThreadSandbox ??
		input.fallback ??
		'workspace-write'
	);
}

export function selectExecutionProvider(
	data: Pick<ControlPlaneData, 'providers'>,
	worker?: Pick<Worker, 'providerId'> | null
) {
	return (
		(worker?.providerId
			? data.providers.find((provider) => provider.id === worker.providerId)
			: null) ??
		data.providers.find((provider) => provider.kind === 'local' && provider.enabled) ??
		data.providers[0] ??
		null
	);
}
