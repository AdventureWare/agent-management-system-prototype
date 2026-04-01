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

export const AGENT_SESSION_STATE_OPTIONS = [
	'idle',
	'starting',
	'waiting',
	'working',
	'ready',
	'attention',
	'unavailable'
] as const;

export type AgentSandbox = (typeof AGENT_SANDBOX_OPTIONS)[number];
export type AgentRunStatus = (typeof AGENT_RUN_STATUS_OPTIONS)[number];
export type AgentSessionState = (typeof AGENT_SESSION_STATE_OPTIONS)[number];
export type AgentSessionOrigin = 'managed' | 'external';

export type AgentSession = {
	id: string;
	name: string;
	cwd: string;
	sandbox: AgentSandbox;
	model: string | null;
	threadId: string | null;
	attachments?: AgentSessionAttachment[];
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type AgentSessionTaskLink = {
	id: string;
	title: string;
	status: string;
	isPrimary: boolean;
};

export type AgentSessionAttachment = {
	id: string;
	name: string;
	path: string;
	contentType: string;
	sizeBytes: number;
	attachedAt: string;
};

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

export type AgentSessionsDb = {
	sessions: AgentSession[];
	runs: AgentRun[];
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

export type AgentSessionDetail = AgentSession & {
	origin: AgentSessionOrigin;
	threadId: string | null;
	topicLabels?: string[];
	sessionState: AgentSessionState;
	latestRunStatus: AgentRunStatus | 'idle';
	hasActiveRun: boolean;
	canResume: boolean;
	runCount: number;
	lastActivityAt: string | null;
	lastActivityLabel: string;
	sessionSummary: string;
	lastExitCode: number | null;
	runTimeline: AgentTimelineStep[];
	relatedTasks: AgentSessionTaskLink[];
	latestRun: AgentRunDetail | null;
	runs: AgentRunDetail[];
};

export type AgentThreadState = AgentSessionState;
export type AgentThreadOrigin = AgentSessionOrigin;
export type AgentThread = AgentSession;
export type AgentThreadTaskLink = AgentSessionTaskLink;
export type AgentThreadAttachment = AgentSessionAttachment;
export type AgentThreadDetail = AgentSessionDetail;
export type AgentThreadsDb = AgentSessionsDb;
