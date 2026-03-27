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

export type AgentSandbox = (typeof AGENT_SANDBOX_OPTIONS)[number];
export type AgentRunStatus = (typeof AGENT_RUN_STATUS_OPTIONS)[number];

export type AgentSession = {
	id: string;
	name: string;
	cwd: string;
	sandbox: AgentSandbox;
	model: string | null;
	threadId: string | null;
	createdAt: string;
	updatedAt: string;
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
};

export type AgentTimelineStep = {
	key: 'submitted' | 'running' | 'thread' | 'response' | 'finished';
	label: string;
	state: 'complete' | 'current' | 'pending' | 'attention';
	detail: string;
	timestamp: string | null;
};

export type AgentSessionDetail = AgentSession & {
	threadId: string | null;
	status: AgentRunStatus | 'idle';
	hasActiveRun: boolean;
	canResume: boolean;
	runCount: number;
	lastActivityAt: string | null;
	lastActivityLabel: string;
	statusSummary: string;
	lastExitCode: number | null;
	runTimeline: AgentTimelineStep[];
	latestRun: AgentRunDetail | null;
	runs: AgentRunDetail[];
};
