import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
	isControlPlaneSqliteEmpty,
	loadControlPlaneFromSqlite,
	saveControlPlaneToSqlite
} from '$lib/server/db/control-plane-store';
import { normalizePathInput, normalizePathListInput } from '$lib/server/path-tools';
import { AGENT_SANDBOX_OPTIONS, type AgentSandbox } from '$lib/types/agent-thread';
import {
	APPROVAL_STATUS_OPTIONS,
	AREA_OPTIONS,
	DECISION_TYPE_OPTIONS,
	GOAL_STATUS_OPTIONS,
	PROVIDER_AUTH_MODE_OPTIONS,
	PROVIDER_KIND_OPTIONS,
	PROVIDER_SETUP_STATUS_OPTIONS,
	PLANNING_CONFIDENCE_OPTIONS,
	PRIORITY_OPTIONS,
	REVIEW_STATUS_OPTIONS,
	RUN_STATUS_OPTIONS,
	TASK_APPROVAL_MODE_OPTIONS,
	TASK_RISK_LEVEL_OPTIONS,
	EXECUTION_SURFACE_LOCATION_OPTIONS,
	EXECUTION_SURFACE_STATUS_OPTIONS,
	normalizeTaskStatus,
	type Approval,
	type ApprovalStatus,
	type Area,
	type ControlPlaneData,
	type Decision,
	type DecisionType,
	type DelegationAcceptance,
	type DelegationPacket,
	type Goal,
	type GoalStatus,
	type PlanningConfidence,
	type PlanningSession,
	type Provider,
	type ProviderAuthMode,
	type ProviderKind,
	type ProviderSetupStatus,
	type Project,
	type Priority,
	type Role,
	type Review,
	type ReviewStatus,
	type Run,
	type RunStatus,
	type TaskApprovalMode,
	type TaskRiskLevel,
	type Task,
	type TaskAttachment,
	type TaskStatus,
	type ExecutionSurface,
	type ExecutionSurfaceLocation,
	type ExecutionSurfaceStatus
} from '$lib/types/control-plane';

const DATA_FILE = resolve(process.cwd(), 'data', 'control-plane.json');

function isArea(value: string): value is Area {
	return AREA_OPTIONS.includes(value as Area);
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

function isExecutionSurfaceStatus(value: string): value is ExecutionSurfaceStatus {
	return EXECUTION_SURFACE_STATUS_OPTIONS.includes(value as ExecutionSurfaceStatus);
}

function isExecutionSurfaceLocation(value: string): value is ExecutionSurfaceLocation {
	return EXECUTION_SURFACE_LOCATION_OPTIONS.includes(value as ExecutionSurfaceLocation);
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
		executionSurfaces: [],
		tasks: [],
		runs: [],
		reviews: [],
		planningSessions: [],
		approvals: [],
		decisions: []
	};
}

export function getExecutionSurfaces(data: Pick<ControlPlaneData, 'executionSurfaces'>) {
	return data.executionSurfaces;
}

type LegacyProject = Partial<Project> & {
	defaultCoordinationFolder?: unknown;
	projectRootFolder?: unknown;
	additionalWritableRoots?: unknown;
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

type LegacyExecutionSurface = Partial<ExecutionSurface> & {
	providerId?: unknown;
	roleId?: unknown;
	supportedRoleIds?: unknown;
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
	area?: unknown;
	successSignal?: unknown;
	parentGoalId?: unknown;
	projectIds?: unknown;
	taskIds?: unknown;
	targetDate?: unknown;
	planningPriority?: unknown;
	confidence?: unknown;
};

type LegacyTask = Partial<Task> & {
	area?: unknown;
	agentThreadId?: unknown;
	projectId?: unknown;
	attachments?: unknown;
	estimateHours?: unknown;
	targetDate?: unknown;
	successCriteria?: unknown;
	readyCondition?: unknown;
	expectedOutcome?: unknown;
	parentTaskId?: unknown;
	delegationPacket?: unknown;
	delegationAcceptance?: unknown;
};

type LegacyRole = Partial<Role> & {
	area?: unknown;
};

function normalizeRole(role: LegacyRole): Role {
	const areaValue = typeof role.area === 'string' ? role.area : '';
	const area: Role['area'] = areaValue === 'shared' || isArea(areaValue) ? areaValue : 'shared';

	return {
		id: typeof role.id === 'string' ? role.id : `role_${randomUUID()}`,
		name: typeof role.name === 'string' ? role.name : '',
		area,
		description: typeof role.description === 'string' ? role.description : '',
		skillIds: normalizeStringList(role.skillIds).length
			? normalizeStringList(role.skillIds)
			: undefined,
		toolIds: normalizeStringList(role.toolIds).length
			? normalizeStringList(role.toolIds)
			: undefined,
		mcpIds: normalizeStringList(role.mcpIds).length ? normalizeStringList(role.mcpIds) : undefined,
		systemPrompt:
			typeof role.systemPrompt === 'string' && role.systemPrompt.trim().length > 0
				? role.systemPrompt
				: undefined,
		qualityChecklist: normalizeStringList(role.qualityChecklist).length
			? normalizeStringList(role.qualityChecklist)
			: undefined,
		approvalPolicy:
			typeof role.approvalPolicy === 'string' && role.approvalPolicy.trim().length > 0
				? role.approvalPolicy
				: undefined,
		escalationPolicy:
			typeof role.escalationPolicy === 'string' && role.escalationPolicy.trim().length > 0
				? role.escalationPolicy
				: undefined
	};
}

type LegacyRun = Partial<Run> & {
	artifactPaths?: unknown;
};

type LegacyReview = Partial<Review>;

type LegacyApproval = Partial<Approval>;
type LegacyPlanningSession = Partial<PlanningSession>;
type LegacyDecision = Partial<Decision>;
type LegacyTaskAttachment = Partial<TaskAttachment>;

function normalizeDelegationPacket(packet: unknown): DelegationPacket | null {
	if (!packet || typeof packet !== 'object') {
		return null;
	}

	const candidate = packet as Record<string, unknown>;
	const normalized = {
		objective: typeof candidate.objective === 'string' ? candidate.objective.trim() : '',
		inputContext: typeof candidate.inputContext === 'string' ? candidate.inputContext.trim() : '',
		expectedDeliverable:
			typeof candidate.expectedDeliverable === 'string' ? candidate.expectedDeliverable.trim() : '',
		doneCondition:
			typeof candidate.doneCondition === 'string' ? candidate.doneCondition.trim() : '',
		integrationNotes:
			typeof candidate.integrationNotes === 'string' ? candidate.integrationNotes.trim() : ''
	} satisfies DelegationPacket;

	return Object.values(normalized).some(Boolean) ? normalized : null;
}

function normalizeDelegationAcceptance(acceptance: unknown): DelegationAcceptance | null {
	if (!acceptance || typeof acceptance !== 'object') {
		return null;
	}

	const candidate = acceptance as Record<string, unknown>;
	const summary = typeof candidate.summary === 'string' ? candidate.summary.trim() : '';
	const acceptedAt =
		typeof candidate.acceptedAt === 'string' && candidate.acceptedAt.trim()
			? candidate.acceptedAt
			: '';

	return acceptedAt
		? {
				summary,
				acceptedAt
			}
		: null;
}

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

function normalizeExecutionSurface(surface: LegacyExecutionSurface): ExecutionSurface {
	const locationValue = typeof surface.location === 'string' ? surface.location : '';
	const statusValue = typeof surface.status === 'string' ? surface.status : '';
	const tags = Array.isArray(surface.tags)
		? surface.tags
				.filter((tag): tag is string => typeof tag === 'string')
				.map((tag) => tag.trim())
				.filter(Boolean)
		: [];
	const skills = normalizeStringList(surface.skills);
	const supportedRoleIds = Array.from(
		new Set(
			[
				...normalizeStringList(surface.supportedRoleIds),
				typeof surface.roleId === 'string' && surface.roleId.trim() ? surface.roleId.trim() : ''
			].filter(Boolean)
		)
	);
	const focusFactor =
		typeof surface.focusFactor === 'number' &&
		Number.isFinite(surface.focusFactor) &&
		surface.focusFactor > 0 &&
		surface.focusFactor <= 1
			? surface.focusFactor
			: 1;

	return {
		id: typeof surface.id === 'string' ? surface.id : createExecutionSurfaceId(),
		name: typeof surface.name === 'string' ? surface.name : '',
		providerId: typeof surface.providerId === 'string' ? surface.providerId : '',
		supportedRoleIds,
		location: isExecutionSurfaceLocation(locationValue) ? locationValue : 'cloud',
		status: isExecutionSurfaceStatus(statusValue) ? statusValue : 'idle',
		capacity:
			typeof surface.capacity === 'number' &&
			Number.isFinite(surface.capacity) &&
			surface.capacity > 0
				? surface.capacity
				: 1,
		registeredAt:
			typeof surface.registeredAt === 'string' ? surface.registeredAt : new Date().toISOString(),
		lastSeenAt:
			typeof surface.lastSeenAt === 'string' ? surface.lastSeenAt : new Date().toISOString(),
		note: typeof surface.note === 'string' ? surface.note : '',
		tags,
		skills,
		weeklyCapacityHours: normalizePositiveNumber(surface.weeklyCapacityHours),
		focusFactor,
		maxConcurrentRuns: normalizePositiveNumber(surface.maxConcurrentRuns),
		threadSandboxOverride: normalizeOptionalAgentSandbox(surface.threadSandboxOverride),
		authTokenHash: typeof surface.authTokenHash === 'string' ? surface.authTokenHash : ''
	};
}

function normalizeGoal(goal: LegacyGoal): Goal {
	const area = typeof goal.area === 'string' && isArea(goal.area) ? goal.area : 'product';
	const statusValue = typeof goal.status === 'string' ? goal.status : '';

	return {
		id: typeof goal.id === 'string' ? goal.id : createGoalId(),
		name: typeof goal.name === 'string' ? goal.name : '',
		summary: typeof goal.summary === 'string' ? goal.summary : '',
		area,
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
	const additionalWritableRoots = normalizePathListInput(legacyProject.additionalWritableRoots);

	return {
		id: typeof legacyProject.id === 'string' ? legacyProject.id : createProjectId(),
		name: typeof legacyProject.name === 'string' ? legacyProject.name : '',
		summary: typeof legacyProject.summary === 'string' ? legacyProject.summary : '',
		parentProjectId:
			typeof legacyProject.parentProjectId === 'string' && legacyProject.parentProjectId.trim()
				? legacyProject.parentProjectId.trim()
				: null,
		projectRootFolder: normalizePathInput(projectRootFolder),
		defaultArtifactRoot: normalizePathInput(defaultArtifactRoot),
		defaultRepoPath: normalizePathInput(defaultRepoPath),
		defaultRepoUrl:
			typeof legacyProject.defaultRepoUrl === 'string' ? legacyProject.defaultRepoUrl : '',
		defaultBranch:
			typeof legacyProject.defaultBranch === 'string' ? legacyProject.defaultBranch : '',
		additionalWritableRoots,
		defaultThreadSandbox: normalizeOptionalAgentSandbox(legacyProject.defaultThreadSandbox)
	};
}

function normalizeProjectHierarchy(projects: Project[]) {
	const projectIds = new Set(projects.map((project) => project.id));

	return projects.map((project) => {
		const parentProjectId = project.parentProjectId?.trim() ?? '';

		if (
			!parentProjectId ||
			!projectIds.has(parentProjectId) ||
			parentProjectId === project.id ||
			wouldCreateProjectCycle(projects, project.id, parentProjectId)
		) {
			return {
				...project,
				parentProjectId: null
			};
		}

		return {
			...project,
			parentProjectId
		};
	});
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
			[
				project.projectRootFolder,
				project.defaultArtifactRoot,
				project.defaultRepoPath,
				...(project.additionalWritableRoots ?? [])
			]
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
		executionSurfaceId:
			typeof run.executionSurfaceId === 'string' && run.executionSurfaceId.trim()
				? run.executionSurfaceId
				: null,
		...(typeof run.assumedRoleId === 'string'
			? {
					assumedRoleId: run.assumedRoleId.trim() ? run.assumedRoleId : null
				}
			: {}),
		providerId: typeof run.providerId === 'string' && run.providerId.trim() ? run.providerId : null,
		status: isRunStatus(statusValue) ? statusValue : 'queued',
		createdAt: typeof run.createdAt === 'string' ? run.createdAt : now,
		updatedAt: typeof run.updatedAt === 'string' ? run.updatedAt : now,
		startedAt: typeof run.startedAt === 'string' ? run.startedAt : null,
		endedAt: typeof run.endedAt === 'string' ? run.endedAt : null,
		threadId: typeof run.threadId === 'string' && run.threadId.trim() ? run.threadId : null,
		agentThreadId:
			typeof run.agentThreadId === 'string' && run.agentThreadId.trim() ? run.agentThreadId : null,
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
		requestedByExecutionSurfaceId:
			typeof review.requestedByExecutionSurfaceId === 'string' &&
			review.requestedByExecutionSurfaceId.trim()
				? review.requestedByExecutionSurfaceId
				: null,
		reviewerExecutionSurfaceId:
			typeof review.reviewerExecutionSurfaceId === 'string' &&
			review.reviewerExecutionSurfaceId.trim()
				? review.reviewerExecutionSurfaceId
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
		requestedByExecutionSurfaceId:
			typeof approval.requestedByExecutionSurfaceId === 'string' &&
			approval.requestedByExecutionSurfaceId.trim()
				? approval.requestedByExecutionSurfaceId
				: null,
		approverExecutionSurfaceId:
			typeof approval.approverExecutionSurfaceId === 'string' &&
			approval.approverExecutionSurfaceId.trim()
				? approval.approverExecutionSurfaceId
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
		decidedByExecutionSurfaceId:
			typeof decision.decidedByExecutionSurfaceId === 'string' &&
			decision.decidedByExecutionSurfaceId.trim()
				? decision.decidedByExecutionSurfaceId
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
		executionSurfaceId:
			typeof session.executionSurfaceId === 'string' && session.executionSurfaceId.trim()
				? session.executionSurfaceId
				: null,
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
	const priorityValue = task.priority;
	const statusValue = task.status;
	const riskLevelValue = task.riskLevel;
	const approvalModeValue = task.approvalMode;
	const requiredThreadSandbox = normalizeOptionalAgentSandbox(task.requiredThreadSandbox);
	const taskRuns = runs
		.filter((run) => run.taskId === task.id)
		.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

	const area = typeof task.area === 'string' && isArea(task.area) ? task.area : 'product';
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
		successCriteria: typeof task.successCriteria === 'string' ? task.successCriteria : '',
		readyCondition: typeof task.readyCondition === 'string' ? task.readyCondition : '',
		expectedOutcome: typeof task.expectedOutcome === 'string' ? task.expectedOutcome : '',
		projectId: inferTaskProjectId(task, projects),
		area,
		goalId: typeof task.goalId === 'string' ? task.goalId : '',
		parentTaskId:
			typeof task.parentTaskId === 'string' && task.parentTaskId.trim() ? task.parentTaskId : null,
		delegationPacket: normalizeDelegationPacket(task.delegationPacket),
		delegationAcceptance: normalizeDelegationAcceptance(task.delegationAcceptance),
		priority,
		status: status ?? 'ready',
		riskLevel,
		approvalMode,
		requiredThreadSandbox,
		requiresReview: typeof task.requiresReview === 'boolean' ? task.requiresReview : true,
		desiredRoleId: typeof task.desiredRoleId === 'string' ? task.desiredRoleId : '',
		assigneeExecutionSurfaceId:
			typeof task.assigneeExecutionSurfaceId === 'string' && task.assigneeExecutionSurfaceId.trim()
				? task.assigneeExecutionSurfaceId
				: null,
		agentThreadId:
			typeof task.agentThreadId === 'string' && task.agentThreadId.trim()
				? task.agentThreadId
				: typeof task.agentThreadId === 'string' && task.agentThreadId.trim()
					? task.agentThreadId
					: null,
		requiredPromptSkillNames: normalizeStringList(task.requiredPromptSkillNames),
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
				agentThreadId: task.agentThreadId,
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

function getControlPlaneStorageBackend() {
	return process.env.APP_STORAGE_BACKEND?.trim() === 'json' ? 'json' : 'sqlite';
}

function normalizeControlPlaneData(parsed: Partial<ControlPlaneData>): ControlPlaneData {
	const providers = Array.isArray(parsed.providers)
		? parsed.providers.map((provider) => normalizeProvider(provider as LegacyProvider))
		: [];
	const rawExecutionSurfaces = Array.isArray(parsed.executionSurfaces)
		? parsed.executionSurfaces
		: [];
	const projects = Array.isArray(parsed.projects)
		? normalizeProjectHierarchy(
				parsed.projects.map((project) => normalizeProject(project as Project))
			)
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
			roles: Array.isArray(parsed.roles)
				? parsed.roles.map((role) => normalizeRole(role as LegacyRole))
				: [],
			projects,
			goals: Array.isArray(parsed.goals)
				? parsed.goals.map((goal) => normalizeGoal(goal as LegacyGoal))
				: [],
			executionSurfaces: rawExecutionSurfaces.map((surface) =>
				normalizeExecutionSurface(surface as LegacyExecutionSurface)
			),
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
}

function parseControlPlaneData(raw: string) {
	try {
		return normalizeControlPlaneData(JSON.parse(raw) as Partial<ControlPlaneData>);
	} catch {
		return defaultData();
	}
}

async function loadControlPlaneFromJson() {
	await ensureDataFile();
	return parseControlPlaneData(await readFile(DATA_FILE, 'utf8'));
}

async function readControlPlaneJsonIfPresent() {
	if (!existsSync(DATA_FILE)) {
		return null;
	}

	try {
		return parseControlPlaneData(await readFile(DATA_FILE, 'utf8'));
	} catch {
		return defaultData();
	}
}

async function ensureControlPlaneSqliteSeeded() {
	if (!isControlPlaneSqliteEmpty()) {
		return;
	}

	const seed = (await readControlPlaneJsonIfPresent()) ?? defaultData();
	saveControlPlaneToSqlite(seed);
}

export async function loadControlPlane(): Promise<ControlPlaneData> {
	if (getControlPlaneStorageBackend() === 'sqlite') {
		await ensureControlPlaneSqliteSeeded();
		return normalizeControlPlaneData(loadControlPlaneFromSqlite());
	}

	return await loadControlPlaneFromJson();
}

async function saveControlPlane(data: ControlPlaneData) {
	if (getControlPlaneStorageBackend() === 'sqlite') {
		saveControlPlaneToSqlite(data);
		return;
	}

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
	const onlineExecutionSurfaces = data.executionSurfaces.filter(
		(executionSurface) => executionSurface.status !== 'offline'
	);
	const busyExecutionSurfaces = data.executionSurfaces.filter(
		(executionSurface) => executionSurface.status === 'busy'
	);

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
		executionSurfaceCount: data.executionSurfaces.length,
		onlineExecutionSurfaceCount: onlineExecutionSurfaces.length,
		busyExecutionSurfaceCount: busyExecutionSurfaces.length
	};
}

export function createGoalId() {
	return `goal_${randomUUID()}`;
}

export function createProviderId() {
	return `provider_${randomUUID()}`;
}

export function createRoleId() {
	return `role_${randomUUID()}`;
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

export function createExecutionSurfaceId() {
	return `surface_${randomUUID()}`;
}

export function parseArea(value: string, fallback: Area): Area {
	return isArea(value) ? value : fallback;
}

export function parseLane(value: string, fallback: Area): Area {
	return parseArea(value, fallback);
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

export function parseExecutionSurfaceStatus(
	value: string,
	fallback: ExecutionSurfaceStatus
): ExecutionSurfaceStatus {
	return isExecutionSurfaceStatus(value) ? value : fallback;
}

export function parseExecutionSurfaceLocation(
	value: string,
	fallback: ExecutionSurfaceLocation
): ExecutionSurfaceLocation {
	return isExecutionSurfaceLocation(value) ? value : fallback;
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

export function createRole(input: {
	name: string;
	area?: Role['area'];
	description: string;
	skillIds?: string[];
	toolIds?: string[];
	mcpIds?: string[];
	systemPrompt?: string;
	qualityChecklist?: string[];
	approvalPolicy?: string;
	escalationPolicy?: string;
}): Role {
	return {
		id: createRoleId(),
		name: input.name,
		area: input.area ?? 'shared',
		description: input.description,
		skillIds: normalizeStringList(input.skillIds).length
			? normalizeStringList(input.skillIds)
			: undefined,
		toolIds: normalizeStringList(input.toolIds).length
			? normalizeStringList(input.toolIds)
			: undefined,
		mcpIds: normalizeStringList(input.mcpIds).length
			? normalizeStringList(input.mcpIds)
			: undefined,
		systemPrompt: input.systemPrompt?.trim() ? input.systemPrompt.trim() : undefined,
		qualityChecklist: normalizeStringList(input.qualityChecklist).length
			? normalizeStringList(input.qualityChecklist)
			: undefined,
		approvalPolicy: input.approvalPolicy?.trim() ? input.approvalPolicy.trim() : undefined,
		escalationPolicy: input.escalationPolicy?.trim() ? input.escalationPolicy.trim() : undefined
	};
}

export function createGoal(input: {
	name: string;
	summary: string;
	area?: Area;
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
	const area = input.area ?? 'product';

	return {
		id: createGoalId(),
		name: input.name,
		summary: input.summary,
		area,
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
	parentProjectId?: string | null;
	projectRootFolder?: string;
	defaultArtifactRoot?: string;
	defaultRepoPath?: string;
	defaultRepoUrl?: string;
	defaultBranch?: string;
	additionalWritableRoots?: string[];
	defaultThreadSandbox?: AgentSandbox | null;
}): Project {
	return {
		id: createProjectId(),
		name: input.name,
		summary: input.summary,
		parentProjectId: input.parentProjectId?.trim() || null,
		projectRootFolder: normalizePathInput(input.projectRootFolder),
		defaultArtifactRoot: normalizePathInput(input.defaultArtifactRoot),
		defaultRepoPath: normalizePathInput(input.defaultRepoPath),
		defaultRepoUrl: input.defaultRepoUrl ?? '',
		defaultBranch: input.defaultBranch ?? '',
		additionalWritableRoots: normalizePathListInput(input.additionalWritableRoots),
		defaultThreadSandbox: input.defaultThreadSandbox ?? null
	};
}

export function getProjectChildProjects(projects: Project[], projectId: string) {
	return projects.filter((project) => project.parentProjectId === projectId);
}

export function getProjectDescendantProjectIds(projects: Project[], projectId: string) {
	const descendantIds: string[] = [];
	const queue = getProjectChildProjects(projects, projectId).map((project) => project.id);
	const seen = new Set(queue);

	while (queue.length > 0) {
		const currentProjectId = queue.shift();

		if (!currentProjectId) {
			continue;
		}

		descendantIds.push(currentProjectId);

		for (const childProject of getProjectChildProjects(projects, currentProjectId)) {
			if (seen.has(childProject.id)) {
				continue;
			}

			seen.add(childProject.id);
			queue.push(childProject.id);
		}
	}

	return descendantIds;
}

export function getProjectScopeProjectIds(projects: Project[], projectId: string) {
	if (!projects.some((project) => project.id === projectId)) {
		return [];
	}

	return [projectId, ...getProjectDescendantProjectIds(projects, projectId)];
}

export function getProjectLineage(projects: Project[], projectId: string) {
	const projectById = new Map(projects.map((project) => [project.id, project]));
	const lineage: Project[] = [];
	const seen = new Set<string>();
	let currentProject = projectById.get(projectId) ?? null;

	while (currentProject && !seen.has(currentProject.id)) {
		lineage.unshift(currentProject);
		seen.add(currentProject.id);
		currentProject = currentProject.parentProjectId
			? (projectById.get(currentProject.parentProjectId) ?? null)
			: null;
	}

	return lineage;
}

export function wouldCreateProjectCycle(
	projects: Project[],
	projectId: string,
	parentProjectId: string | null | undefined
) {
	const normalizedParentProjectId = parentProjectId?.trim() ?? '';

	if (!normalizedParentProjectId) {
		return false;
	}

	if (normalizedParentProjectId === projectId) {
		return true;
	}

	const projectById = new Map(projects.map((project) => [project.id, project]));
	const seen = new Set<string>();
	let currentProjectId = normalizedParentProjectId;

	while (currentProjectId) {
		if (currentProjectId === projectId) {
			return true;
		}

		if (seen.has(currentProjectId)) {
			return false;
		}

		seen.add(currentProjectId);
		currentProjectId = projectById.get(currentProjectId)?.parentProjectId?.trim() ?? '';
	}

	return false;
}

export function projectMatchesPath(project: Project, path: string) {
	if (!path) {
		return false;
	}

	const projectPaths = [
		project.projectRootFolder,
		project.defaultArtifactRoot,
		project.defaultRepoPath,
		...(project.additionalWritableRoots ?? [])
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

export function deleteGoal(data: ControlPlaneData, goalId: string): ControlPlaneData {
	const deletedGoal = data.goals.find((goal) => goal.id === goalId);

	if (!deletedGoal) {
		return data;
	}

	const nextParentGoalId = deletedGoal.parentGoalId ?? null;
	const now = new Date().toISOString();

	return {
		...data,
		goals: data.goals
			.filter((goal) => goal.id !== goalId)
			.map((goal) =>
				goal.parentGoalId === goalId ? { ...goal, parentGoalId: nextParentGoalId } : goal
			),
		tasks: data.tasks.map((task) =>
			task.goalId === goalId
				? {
						...task,
						goalId: '',
						updatedAt: now
					}
				: task
		),
		planningSessions: (data.planningSessions ?? []).map((session) => ({
			...session,
			goalId: session.goalId === goalId ? null : session.goalId,
			goalIds: session.goalIds.filter((candidateGoalId) => candidateGoalId !== goalId)
		})),
		decisions: (data.decisions ?? []).map((decision) =>
			decision.goalId === goalId ? { ...decision, goalId: null } : decision
		)
	};
}

export function deleteProject(data: ControlPlaneData, projectId: string): ControlPlaneData {
	const deletedProject = data.projects.find((project) => project.id === projectId);

	if (!deletedProject) {
		return data;
	}

	return {
		...data,
		projects: data.projects
			.filter((project) => project.id !== projectId)
			.map((project) =>
				project.parentProjectId === projectId
					? {
							...project,
							parentProjectId: deletedProject.parentProjectId ?? null
						}
					: project
			),
		goals: data.goals.map((goal) => ({
			...goal,
			projectIds: (goal.projectIds ?? []).filter(
				(candidateProjectId) => candidateProjectId !== projectId
			)
		})),
		planningSessions: (data.planningSessions ?? []).map((session) => ({
			...session,
			projectId: session.projectId === projectId ? null : session.projectId
		}))
	};
}

export function createTask(input: {
	title: string;
	summary: string;
	successCriteria?: string;
	readyCondition?: string;
	expectedOutcome?: string;
	projectId: string;
	area?: Area;
	goalId: string;
	parentTaskId?: string | null;
	delegationPacket?: DelegationPacket | null;
	delegationAcceptance?: DelegationAcceptance | null;
	priority: Priority;
	riskLevel: TaskRiskLevel;
	approvalMode: TaskApprovalMode;
	requiredThreadSandbox?: AgentSandbox | null;
	requiresReview: boolean;
	desiredRoleId: string;
	artifactPath: string;
	requiredPromptSkillNames?: string[];
	requiredCapabilityNames?: string[];
	requiredToolNames?: string[];
	blockedReason?: string;
	dependencyTaskIds?: string[];
	estimateHours?: number | null;
	targetDate?: string | null;
	assigneeExecutionSurfaceId?: string | null;
	agentThreadId?: string | null;
	status?: TaskStatus;
	attachments?: TaskAttachment[];
}): Task {
	const now = new Date().toISOString();
	const area = input.area ?? 'product';

	return {
		id: createTaskId(),
		title: input.title,
		summary: input.summary,
		successCriteria: input.successCriteria ?? '',
		readyCondition: input.readyCondition ?? '',
		expectedOutcome: input.expectedOutcome ?? '',
		projectId: input.projectId,
		area,
		goalId: input.goalId,
		parentTaskId: input.parentTaskId?.trim() ? input.parentTaskId : null,
		delegationPacket: normalizeDelegationPacket(input.delegationPacket ?? null),
		delegationAcceptance: normalizeDelegationAcceptance(input.delegationAcceptance ?? null),
		priority: input.priority,
		status: input.status ?? 'ready',
		riskLevel: input.riskLevel,
		approvalMode: input.approvalMode,
		requiredThreadSandbox: input.requiredThreadSandbox ?? null,
		requiresReview: input.requiresReview,
		desiredRoleId: input.desiredRoleId,
		assigneeExecutionSurfaceId: input.assigneeExecutionSurfaceId ?? null,
		agentThreadId: input.agentThreadId ?? null,
		requiredPromptSkillNames: input.requiredPromptSkillNames ?? [],
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
	executionSurfaceId?: string | null;
	assumedRoleId?: string | null;
	providerId?: string | null;
	status?: RunStatus;
	startedAt?: string | null;
	endedAt?: string | null;
	threadId?: string | null;
	agentThreadId?: string | null;
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
		executionSurfaceId: input.executionSurfaceId ?? null,
		...(input.assumedRoleId !== undefined ? { assumedRoleId: input.assumedRoleId ?? null } : {}),
		providerId: input.providerId ?? null,
		status: input.status ?? 'queued',
		createdAt: now,
		updatedAt: now,
		startedAt: input.startedAt ?? null,
		endedAt: input.endedAt ?? null,
		threadId: input.threadId ?? null,
		agentThreadId: input.agentThreadId ?? null,
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
	requestedByExecutionSurfaceId?: string | null;
	reviewerExecutionSurfaceId?: string | null;
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
		requestedByExecutionSurfaceId: input.requestedByExecutionSurfaceId ?? null,
		reviewerExecutionSurfaceId: input.reviewerExecutionSurfaceId ?? null,
		summary: input.summary ?? ''
	};
}

export function createApproval(input: {
	taskId: string;
	runId?: string | null;
	mode: TaskApprovalMode;
	status?: ApprovalStatus;
	requestedByExecutionSurfaceId?: string | null;
	approverExecutionSurfaceId?: string | null;
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
		requestedByExecutionSurfaceId: input.requestedByExecutionSurfaceId ?? null,
		approverExecutionSurfaceId: input.approverExecutionSurfaceId ?? null,
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
	decidedByExecutionSurfaceId?: string | null;
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
		decidedByExecutionSurfaceId: input.decidedByExecutionSurfaceId ?? null
	};
}

export function createPlanningSession(input: {
	windowStart: string;
	windowEnd: string;
	projectId?: string | null;
	goalId?: string | null;
	executionSurfaceId?: string | null;
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
		executionSurfaceId: input.executionSurfaceId ?? null,
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
			.map((task) => {
				let nextTask = task;

				if (task.dependencyTaskIds.includes(taskId)) {
					nextTask = {
						...nextTask,
						dependencyTaskIds: nextTask.dependencyTaskIds.filter(
							(dependencyTaskId) => dependencyTaskId !== taskId
						),
						updatedAt: now
					};
				}

				if (nextTask.parentTaskId === taskId) {
					nextTask = {
						...nextTask,
						parentTaskId: null,
						updatedAt: now
					};
				}

				return nextTask;
			}),
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

export function createExecutionSurface(input: {
	name: string;
	providerId: string;
	supportedRoleIds?: string[];
	location: ExecutionSurfaceLocation;
	status: ExecutionSurfaceStatus;
	capacity: number;
	note: string;
	tags: string[];
	skills?: string[];
	weeklyCapacityHours?: number | null;
	focusFactor?: number;
	maxConcurrentRuns?: number | null;
	threadSandboxOverride?: AgentSandbox | null;
}): ExecutionSurface {
	const supportedRoleIds = Array.from(
		new Set(normalizeStringList(input.supportedRoleIds).filter(Boolean))
	);

	return {
		id: createExecutionSurfaceId(),
		name: input.name,
		providerId: input.providerId,
		supportedRoleIds,
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
	task?: Pick<Task, 'requiredThreadSandbox'> | null;
	executionSurface?: Pick<ExecutionSurface, 'threadSandboxOverride'> | null;
	project?: Pick<Project, 'defaultThreadSandbox'> | null;
	provider?: Pick<Provider, 'defaultThreadSandbox'> | null;
	fallback?: AgentSandbox;
}) {
	return (
		input.task?.requiredThreadSandbox ??
		input.executionSurface?.threadSandboxOverride ??
		input.project?.defaultThreadSandbox ??
		input.provider?.defaultThreadSandbox ??
		input.fallback ??
		'workspace-write'
	);
}

export function selectExecutionProvider(
	data: Pick<ControlPlaneData, 'providers'>,
	executionSurface?: Pick<ExecutionSurface, 'providerId'> | null
) {
	return (
		(executionSurface?.providerId
			? data.providers.find((provider) => provider.id === executionSurface.providerId)
			: null) ??
		data.providers.find((provider) => provider.kind === 'local' && provider.enabled) ??
		data.providers[0] ??
		null
	);
}
