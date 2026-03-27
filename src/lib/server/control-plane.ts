import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
	GOAL_STATUS_OPTIONS,
	LANE_OPTIONS,
	PRIORITY_OPTIONS,
	TASK_APPROVAL_MODE_OPTIONS,
	TASK_RISK_LEVEL_OPTIONS,
	TASK_STATUS_OPTIONS,
	WORKER_LOCATION_OPTIONS,
	WORKER_STATUS_OPTIONS,
	type ControlPlaneData,
	type Goal,
	type GoalStatus,
	type Lane,
	type Project,
	type Priority,
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

function isGoalStatus(value: string): value is GoalStatus {
	return GOAL_STATUS_OPTIONS.includes(value as GoalStatus);
}

function isWorkerStatus(value: string): value is WorkerStatus {
	return WORKER_STATUS_OPTIONS.includes(value as WorkerStatus);
}

function isWorkerLocation(value: string): value is WorkerLocation {
	return WORKER_LOCATION_OPTIONS.includes(value as WorkerLocation);
}

function defaultData(): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [],
		goals: [],
		workers: [],
		tasks: []
	};
}

function normalizeProject(project: Project): Project {
	return {
		...project,
		lane: isLane(project.lane) ? project.lane : 'product',
		summary: typeof project.summary === 'string' ? project.summary : '',
		defaultCoordinationFolder:
			typeof project.defaultCoordinationFolder === 'string'
				? project.defaultCoordinationFolder
				: '',
		defaultArtifactRoot:
			typeof project.defaultArtifactRoot === 'string' ? project.defaultArtifactRoot : '',
		defaultRepoPath: typeof project.defaultRepoPath === 'string' ? project.defaultRepoPath : '',
		defaultRepoUrl: typeof project.defaultRepoUrl === 'string' ? project.defaultRepoUrl : '',
		defaultBranch: typeof project.defaultBranch === 'string' ? project.defaultBranch : ''
	};
}

function normalizeTask(task: Task): Task {
	return {
		...task,
		riskLevel: isTaskRiskLevel(task.riskLevel) ? task.riskLevel : 'medium',
		approvalMode: isTaskApprovalMode(task.approvalMode) ? task.approvalMode : 'none',
		requiresReview: typeof task.requiresReview === 'boolean' ? task.requiresReview : true,
		blockedReason: typeof task.blockedReason === 'string' ? task.blockedReason : '',
		dependencyTaskIds: Array.isArray(task.dependencyTaskIds)
			? task.dependencyTaskIds.filter(
					(candidate) => typeof candidate === 'string' && candidate.trim()
				)
			: []
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
		return {
			providers: Array.isArray(parsed.providers) ? parsed.providers : [],
			roles: Array.isArray(parsed.roles) ? parsed.roles : [],
			projects: Array.isArray(parsed.projects)
				? parsed.projects.map((project) => normalizeProject(project as Project))
				: [],
			goals: Array.isArray(parsed.goals) ? parsed.goals : [],
			workers: Array.isArray(parsed.workers) ? parsed.workers : [],
			tasks: Array.isArray(parsed.tasks)
				? parsed.tasks.map((task) => normalizeTask(task as Task))
				: []
		};
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
	const next = await updater(current);
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
	const onlineWorkers = data.workers.filter((worker) => worker.status !== 'offline');
	const busyWorkers = data.workers.filter((worker) => worker.status === 'busy');

	return {
		taskCount: data.tasks.length,
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

export function createProjectId() {
	return `project_${randomUUID()}`;
}

export function createTaskId() {
	return `task_${randomUUID()}`;
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

export function parseGoalStatus(value: string, fallback: GoalStatus): GoalStatus {
	return isGoalStatus(value) ? value : fallback;
}

export function parseWorkerStatus(value: string, fallback: WorkerStatus): WorkerStatus {
	return isWorkerStatus(value) ? value : fallback;
}

export function parseWorkerLocation(value: string, fallback: WorkerLocation): WorkerLocation {
	return isWorkerLocation(value) ? value : fallback;
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
	defaultCoordinationFolder?: string;
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
		defaultCoordinationFolder: input.defaultCoordinationFolder ?? '',
		defaultArtifactRoot: input.defaultArtifactRoot ?? '',
		defaultRepoPath: input.defaultRepoPath ?? '',
		defaultRepoUrl: input.defaultRepoUrl ?? '',
		defaultBranch: input.defaultBranch ?? ''
	};
}

export function createTask(input: {
	title: string;
	summary: string;
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
		artifactPath: input.artifactPath,
		createdAt: now,
		updatedAt: now
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
