import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
	APPROVAL_STATUS_OPTIONS,
	GOAL_STATUS_OPTIONS,
	LANE_OPTIONS,
	PROVIDER_AUTH_MODE_OPTIONS,
	PROVIDER_KIND_OPTIONS,
	PROVIDER_SETUP_STATUS_OPTIONS,
	PRIORITY_OPTIONS,
	REVIEW_STATUS_OPTIONS,
	RUN_STATUS_OPTIONS,
	TASK_APPROVAL_MODE_OPTIONS,
	TASK_RISK_LEVEL_OPTIONS,
	TASK_STATUS_OPTIONS,
	WORKER_LOCATION_OPTIONS,
	WORKER_STATUS_OPTIONS,
	type Approval,
	type ApprovalStatus,
	type ControlPlaneData,
	type Goal,
	type GoalStatus,
	type Lane,
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

function isTaskStatus(value: string): value is TaskStatus {
	return TASK_STATUS_OPTIONS.includes(value as TaskStatus);
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
		approvals: []
	};
}

type LegacyProject = Project & {
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
	notes?: unknown;
};

type LegacyTask = Partial<Task> & {
	projectId?: unknown;
};

type LegacyRun = Partial<Run> & {
	artifactPaths?: unknown;
};

type LegacyReview = Partial<Review>;

type LegacyApproval = Partial<Approval>;

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
		notes: typeof provider.notes === 'string' ? provider.notes : ''
	};
}

function normalizeProject(
	project: Partial<Project> & { defaultCoordinationFolder?: unknown }
): Project {
	const legacyProject = project as LegacyProject;

	return {
		id: typeof legacyProject.id === 'string' ? legacyProject.id : createProjectId(),
		name: typeof legacyProject.name === 'string' ? legacyProject.name : '',
		lane: isLane(legacyProject.lane) ? legacyProject.lane : 'product',
		summary: typeof legacyProject.summary === 'string' ? legacyProject.summary : '',
		projectRootFolder:
			typeof legacyProject.projectRootFolder === 'string'
				? legacyProject.projectRootFolder
				: typeof legacyProject.defaultCoordinationFolder === 'string'
					? legacyProject.defaultCoordinationFolder
					: '',
		defaultArtifactRoot:
			typeof legacyProject.defaultArtifactRoot === 'string'
				? legacyProject.defaultArtifactRoot
				: '',
		defaultRepoPath:
			typeof legacyProject.defaultRepoPath === 'string' ? legacyProject.defaultRepoPath : '',
		defaultRepoUrl:
			typeof legacyProject.defaultRepoUrl === 'string' ? legacyProject.defaultRepoUrl : '',
		defaultBranch:
			typeof legacyProject.defaultBranch === 'string' ? legacyProject.defaultBranch : ''
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
		workerId:
			typeof run.workerId === 'string' && run.workerId.trim() ? run.workerId : null,
		providerId:
			typeof run.providerId === 'string' && run.providerId.trim() ? run.providerId : null,
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
	const status: TaskStatus =
		typeof statusValue === 'string' && isTaskStatus(statusValue) ? statusValue : 'ready';
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
		status,
		riskLevel,
		approvalMode,
		requiresReview: typeof task.requiresReview === 'boolean' ? task.requiresReview : true,
		desiredRoleId: typeof task.desiredRoleId === 'string' ? task.desiredRoleId : '',
		assigneeWorkerId:
			typeof task.assigneeWorkerId === 'string' && task.assigneeWorkerId.trim()
				? task.assigneeWorkerId
				: null,
		blockedReason: typeof task.blockedReason === 'string' ? task.blockedReason : '',
		dependencyTaskIds: Array.isArray(task.dependencyTaskIds)
			? task.dependencyTaskIds.filter(
					(candidate) => typeof candidate === 'string' && candidate.trim()
				)
			: [],
		runCount:
			typeof task.runCount === 'number' && Number.isFinite(task.runCount) && task.runCount >= 0
				? task.runCount
				: taskRuns.length,
		latestRunId:
			typeof task.latestRunId === 'string' && task.latestRunId.trim()
				? task.latestRunId
				: (taskRuns[0]?.id ?? null),
		artifactPath: typeof task.artifactPath === 'string' ? task.artifactPath : '',
		createdAt: typeof task.createdAt === 'string' ? task.createdAt : new Date().toISOString(),
		updatedAt: typeof task.updatedAt === 'string' ? task.updatedAt : new Date().toISOString()
	};
}

function taskNeedsApproval(task: Task) {
	switch (task.approvalMode) {
		case 'before_run':
			return task.runCount === 0 && task.status === 'ready';
		case 'before_apply':
			return task.status === 'running';
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
	return sortNewestFirst(
		data.reviews.filter((review) => review.taskId === taskId && review.status === 'open')
	)[0] ?? null;
}

export function getPendingApprovalForTask(data: ControlPlaneData, taskId: string) {
	return sortNewestFirst(
		data.approvals.filter((approval) => approval.taskId === taskId && approval.status === 'pending')
	)[0] ?? null;
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
		const approvals = Array.isArray(parsed.approvals)
			? parsed.approvals.map((approval) => normalizeApproval(approval as LegacyApproval))
			: [];

		return syncGovernanceQueues({
			providers,
			roles: Array.isArray(parsed.roles) ? parsed.roles : [],
			projects,
			goals: Array.isArray(parsed.goals) ? parsed.goals : [],
			workers: Array.isArray(parsed.workers) ? parsed.workers : [],
			tasks: Array.isArray(parsed.tasks)
				? parsed.tasks.map((task) => normalizeTask(task as LegacyTask, projects, runs))
				: [],
			runs,
			reviews,
			approvals
		});
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
	const next = syncGovernanceQueues(await updater(current));
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
	const runningTasks = data.tasks.filter((task) => task.status === 'running');
	const blockedTasks = data.tasks.filter((task) => task.status === 'blocked');
	const readyTasks = data.tasks.filter((task) => task.status === 'ready');
	const reviewTasks = data.tasks.filter((task) => task.status === 'review');
	const dependencyBlockedTasks = data.tasks.filter((task) => taskHasUnmetDependencies(data, task));
	const reviewRequiredTasks = reviewTasks.filter((task) => task.requiresReview);
	const highRiskTasks = data.tasks.filter(
		(task) => task.riskLevel === 'high' && task.status !== 'done'
	);
	const activeRuns = data.runs.filter((run) => run.status === 'starting' || run.status === 'running');
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

export function createRunId() {
	return `run_${randomUUID()}`;
}

export function createReviewId() {
	return `review_${randomUUID()}`;
}

export function createApprovalId() {
	return `approval_${randomUUID()}`;
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
	return isTaskStatus(value) ? value : fallback;
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
		notes: input.notes ?? ''
	};
}

export function createGoal(input: {
	name: string;
	summary: string;
	lane: Lane;
	status: GoalStatus;
	artifactPath: string;
}): Goal {
	return {
		id: createGoalId(),
		name: input.name,
		summary: input.summary,
		lane: input.lane,
		status: input.status,
		artifactPath: input.artifactPath
	};
}

export function createProject(input: {
	name: string;
	summary: string;
	lane: Lane;
	projectRootFolder?: string;
	defaultArtifactRoot?: string;
	defaultRepoPath?: string;
	defaultRepoUrl?: string;
	defaultBranch?: string;
}): Project {
	return {
		id: createProjectId(),
		name: input.name,
		summary: input.summary,
		lane: input.lane,
		projectRootFolder: input.projectRootFolder ?? '',
		defaultArtifactRoot: input.defaultArtifactRoot ?? '',
		defaultRepoPath: input.defaultRepoPath ?? '',
		defaultRepoUrl: input.defaultRepoUrl ?? '',
		defaultBranch: input.defaultBranch ?? ''
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
	blockedReason?: string;
	dependencyTaskIds?: string[];
	assigneeWorkerId?: string | null;
	status?: TaskStatus;
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
		blockedReason: input.blockedReason ?? '',
		dependencyTaskIds: input.dependencyTaskIds ?? [],
		runCount: 0,
		latestRunId: null,
		artifactPath: input.artifactPath,
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

export function taskHasUnmetDependencies(data: ControlPlaneData, task: Task) {
	if (task.dependencyTaskIds.length === 0) {
		return false;
	}

	const doneTaskIds = new Set(
		data.tasks.filter((candidate) => candidate.status === 'done').map((candidate) => candidate.id)
	);

	return task.dependencyTaskIds.some((dependencyTaskId) => !doneTaskIds.has(dependencyTaskId));
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
		authTokenHash: ''
	};
}
