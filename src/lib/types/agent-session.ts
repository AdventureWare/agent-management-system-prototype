import type { ThreadCategorization } from '$lib/types/thread-categorization';

export const AGENT_SANDBOX_OPTIONS = [
	'read-only',
	'workspace-write',
	'danger-full-access'
] as const;

export const AGENT_RUN_STATUS_OPTIONS = [
	'queued',
	'running',
	'completed',
	'failed',
	'canceled'
] as const;

export const AGENT_THREAD_STATE_OPTIONS = [
	'idle',
	'starting',
	'waiting',
	'working',
	'ready',
	'attention',
	'unavailable'
] as const;
export const AGENT_SESSION_STATE_OPTIONS = AGENT_THREAD_STATE_OPTIONS;

export type AgentSandbox = (typeof AGENT_SANDBOX_OPTIONS)[number];
export type AgentRunStatus = (typeof AGENT_RUN_STATUS_OPTIONS)[number];
export type AgentThreadState = (typeof AGENT_THREAD_STATE_OPTIONS)[number];
export type AgentThreadOrigin = 'managed' | 'external';
export type AgentSessionState = AgentThreadState;
export type AgentSessionOrigin = AgentThreadOrigin;

export type AgentThread = {
	id: string;
	name: string;
	cwd: string;
	sandbox: AgentSandbox;
	model: string | null;
	threadId: string | null;
	attachments?: AgentThreadAttachment[];
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
};
export type AgentSession = AgentThread;

export type AgentThreadTaskLink = {
	id: string;
	title: string;
	status: string;
	isPrimary: boolean;
};
export type AgentSessionTaskLink = AgentThreadTaskLink;

export type AgentThreadAttachment = {
	id: string;
	name: string;
	path: string;
	contentType: string;
	sizeBytes: number;
	attachedAt: string;
};
export type AgentSessionAttachment = AgentThreadAttachment;

export type AgentRun = {
	id: string;
	sessionId: string;
	mode: 'start' | 'message';
	prompt: string;
	requestedThreadId: string | null;
	createdAt: string;
	updatedAt: string;
	logPath: string;
	statePath: string;
	messagePath: string;
	configPath: string;
};

export type AgentRunState = {
	status: AgentRunStatus;
	pid: number | null;
	startedAt: string | null;
	finishedAt: string | null;
	exitCode: number | null;
	signal: string | null;
	codexThreadId: string | null;
};

export type AgentThreadsDb = {
	threads?: AgentThread[];
	runs: AgentRun[];
};
export type AgentSessionsDb = AgentThreadsDb & {
	sessions: AgentThread[];
};

export type AgentRunDetail = AgentRun & {
	state: AgentRunState | null;
	lastMessage: string | null;
	logTail: string[];
	activityAt: string | null;
};

export type AgentTimelineStep = {
	key: 'submitted' | 'running' | 'thread' | 'response' | 'finished';
	label: string;
	state: 'complete' | 'current' | 'pending' | 'attention';
	detail: string;
	timestamp: string | null;
};

export type AgentThreadDetail = AgentThread & {
	origin: AgentThreadOrigin;
	threadId: string | null;
	topicLabels?: string[];
	categorization?: ThreadCategorization;
	threadState?: AgentThreadState;
	sessionState?: AgentThreadState;
	latestRunStatus: AgentRunStatus | 'idle';
	hasActiveRun: boolean;
	canResume: boolean;
	runCount: number;
	lastActivityAt: string | null;
	lastActivityLabel: string;
	threadSummary?: string;
	sessionSummary?: string;
	lastExitCode: number | null;
	runTimeline: AgentTimelineStep[];
	relatedTasks: AgentThreadTaskLink[];
	latestRun: AgentRunDetail | null;
	runs: AgentRunDetail[];
};
export type AgentSessionDetail = AgentThreadDetail;
