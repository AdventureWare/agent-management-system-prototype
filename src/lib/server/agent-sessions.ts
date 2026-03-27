import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import {
	AGENT_SANDBOX_OPTIONS,
	type AgentRun,
	type AgentRunDetail,
	type AgentRunStatus,
	type AgentRunState,
	type AgentSandbox,
	type AgentSession,
	type AgentSessionDetail,
	type AgentTimelineStep,
	type AgentSessionsDb
} from '$lib/types/agent-session';

const AGENT_SESSIONS_DB_FILE = resolve(process.cwd(), 'data', 'agent-sessions.json');
const AGENT_SESSIONS_ROOT = resolve(process.cwd(), 'data', 'agent-sessions');
const SESSION_RUNNER_SCRIPT = resolve(process.cwd(), 'scripts', 'agent-session-runner.mjs');

function defaultDb(): AgentSessionsDb {
	return {
		sessions: [],
		runs: []
	};
}

function isAgentSandbox(value: string): value is AgentSandbox {
	return AGENT_SANDBOX_OPTIONS.includes(value as AgentSandbox);
}

async function ensureAgentSessionsDb() {
	try {
		await readFile(AGENT_SESSIONS_DB_FILE, 'utf8');
	} catch {
		await mkdir(resolve(process.cwd(), 'data'), { recursive: true });
		await writeFile(AGENT_SESSIONS_DB_FILE, JSON.stringify(defaultDb(), null, 2));
	}
}

export async function loadAgentSessionsDb(): Promise<AgentSessionsDb> {
	await ensureAgentSessionsDb();
	const raw = await readFile(AGENT_SESSIONS_DB_FILE, 'utf8');

	try {
		const parsed = JSON.parse(raw) as Partial<AgentSessionsDb>;

		return {
			sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
			runs: Array.isArray(parsed.runs) ? parsed.runs : []
		};
	} catch {
		return defaultDb();
	}
}

async function saveAgentSessionsDb(data: AgentSessionsDb) {
	await mkdir(resolve(process.cwd(), 'data'), { recursive: true });
	await writeFile(AGENT_SESSIONS_DB_FILE, JSON.stringify(data, null, 2));
}

async function updateAgentSessionsDb(
	updater: (data: AgentSessionsDb) => AgentSessionsDb | Promise<AgentSessionsDb>
) {
	const current = await loadAgentSessionsDb();
	const next = await updater(current);
	await saveAgentSessionsDb(next);
	return next;
}

function createSessionId() {
	return `session_${randomUUID()}`;
}

function createRunId() {
	return `run_${randomUUID()}`;
}

function getRunPaths(sessionId: string, runId: string) {
	const runDir = resolve(AGENT_SESSIONS_ROOT, sessionId, 'runs', runId);

	return {
		runDir,
		logPath: resolve(runDir, 'codex.log'),
		statePath: resolve(runDir, 'state.json'),
		messagePath: resolve(runDir, 'last-message.txt'),
		configPath: resolve(runDir, 'config.json')
	};
}

function getConfiguredCodexBin() {
	return process.env.CODEX_BIN?.trim() || 'codex';
}

export function parseAgentSandbox(value: string | null | undefined, fallback: AgentSandbox) {
	return value && isAgentSandbox(value) ? value : fallback;
}

async function writeRunnerConfig(input: {
	session: AgentSession;
	run: AgentRun;
	threadId: string | null;
}) {
	const config = {
		codexBin: getConfiguredCodexBin(),
		sessionId: input.session.id,
		runId: input.run.id,
		mode: input.run.mode,
		cwd: input.session.cwd,
		sandbox: input.session.sandbox,
		model: input.session.model,
		prompt: input.run.prompt,
		threadId: input.threadId,
		logPath: input.run.logPath,
		statePath: input.run.statePath,
		messagePath: input.run.messagePath
	};

	await mkdir(resolve(input.run.configPath, '..'), { recursive: true });
	await writeFile(input.run.configPath, JSON.stringify(config, null, 2));
}

function launchRunner(configPath: string) {
	const child = spawn(process.execPath, [SESSION_RUNNER_SCRIPT, configPath], {
		cwd: process.cwd(),
		detached: true,
		stdio: 'ignore'
	});

	child.unref();
}

async function readOptionalText(path: string) {
	if (!existsSync(path)) {
		return null;
	}

	try {
		return await readFile(path, 'utf8');
	} catch {
		return null;
	}
}

async function readRunState(path: string): Promise<AgentRunState | null> {
	const raw = await readOptionalText(path);

	if (!raw) {
		return null;
	}

	try {
		return JSON.parse(raw) as AgentRunState;
	} catch {
		return null;
	}
}

async function readLogTail(path: string, lineCount = 80) {
	const raw = await readOptionalText(path);

	if (!raw) {
		return [];
	}

	return raw.split(/\r?\n/).filter(Boolean).slice(-lineCount);
}

function compareByCreatedAtDesc<T extends { createdAt: string }>(left: T, right: T) {
	return right.createdAt.localeCompare(left.createdAt);
}

function formatRelativeTime(iso: string | null) {
	if (!iso) {
		return 'No activity yet';
	}

	const deltaMs = Date.now() - new Date(iso).getTime();
	const deltaMinutes = Math.max(0, Math.round(deltaMs / 60000));

	if (deltaMinutes < 1) return 'Just now';
	if (deltaMinutes < 60) return `${deltaMinutes}m ago`;

	const deltaHours = Math.round(deltaMinutes / 60);
	if (deltaHours < 24) return `${deltaHours}h ago`;

	const deltaDays = Math.round(deltaHours / 24);
	return `${deltaDays}d ago`;
}

function getRunLastActivityAt(run: AgentRunDetail | null) {
	if (!run) {
		return null;
	}

	return (run.state?.finishedAt ?? run.state?.startedAt ?? run.lastMessage)
		? run.updatedAt
		: run.updatedAt;
}

function getStatusSummary(detail: {
	status: AgentRunStatus | 'idle';
	hasActiveRun: boolean;
	canResume: boolean;
	lastMessage: string | null;
	threadId: string | null;
}) {
	switch (detail.status) {
		case 'queued':
			return 'Queued on the laptop and waiting to start.';
		case 'running':
			return 'Codex is actively working right now.';
		case 'completed':
			return detail.canResume
				? 'Completed and ready for a follow-up instruction.'
				: 'Completed, but the thread is not ready to resume yet.';
		case 'failed':
			return 'The last run failed. Check the recent log output.';
		case 'canceled':
			return 'The run was canceled before it finished.';
		default:
			if (detail.threadId) {
				return 'Idle session with a discovered thread id.';
			}

			if (detail.lastMessage) {
				return 'Last run finished, but the thread id was not discovered.';
			}

			return 'No run activity yet.';
	}
}

function buildRunTimeline(detail: { run: AgentRunDetail | null; threadId: string | null }) {
	const run = detail.run;
	const state = run?.state;
	const status = state?.status ?? 'idle';
	const hasMessage = Boolean(run?.lastMessage);
	const hasThread = Boolean(state?.codexThreadId ?? detail.threadId);
	const startedAt = state?.startedAt ?? null;
	const finishedAt = state?.finishedAt ?? null;
	const runCreatedAt = run?.createdAt ?? null;
	const isAttentionStatus = status === 'failed' || status === 'canceled';

	const steps: AgentTimelineStep[] = [
		{
			key: 'submitted',
			label: 'Submitted',
			state: run ? 'complete' : 'pending',
			detail: run ? `Queued ${formatRelativeTime(run.createdAt)}` : 'No run queued yet.',
			timestamp: runCreatedAt
		},
		{
			key: 'running',
			label: 'Running',
			state:
				status === 'running'
					? 'current'
					: status === 'queued'
						? 'current'
						: startedAt
							? 'complete'
							: 'pending',
			detail:
				status === 'queued'
					? 'Waiting for the local runner.'
					: status === 'running'
						? 'Codex is actively working.'
						: startedAt
							? `Started ${formatRelativeTime(startedAt)}`
							: 'Not started yet.',
			timestamp: startedAt
		},
		{
			key: 'thread',
			label: 'Thread ready',
			state: hasThread
				? 'complete'
				: status === 'running'
					? 'current'
					: isAttentionStatus
						? 'attention'
						: 'pending',
			detail: hasThread
				? run?.mode === 'message'
					? 'Using the existing Codex thread.'
					: 'Thread discovered for follow-up work.'
				: status === 'running'
					? 'Waiting for a thread id from Codex.'
					: isAttentionStatus
						? 'The run stopped before a thread was confirmed.'
						: 'No thread id yet.',
			timestamp: hasThread ? (startedAt ?? runCreatedAt) : null
		},
		{
			key: 'response',
			label: 'Response captured',
			state: hasMessage
				? 'complete'
				: status === 'running'
					? 'current'
					: status === 'completed'
						? 'attention'
						: isAttentionStatus
							? 'attention'
							: 'pending',
			detail: hasMessage
				? 'The latest agent message was saved.'
				: status === 'running'
					? 'Waiting for the first saved reply.'
					: status === 'completed'
						? 'The run finished without a saved reply.'
						: isAttentionStatus
							? 'The run ended before a reply was captured.'
							: 'No saved reply yet.',
			timestamp: hasMessage ? (run?.updatedAt ?? finishedAt ?? startedAt) : null
		},
		{
			key: 'finished',
			label: status === 'failed' ? 'Failed' : status === 'canceled' ? 'Canceled' : 'Finished',
			state:
				status === 'completed'
					? 'complete'
					: isAttentionStatus
						? 'attention'
						: status === 'running' || status === 'queued'
							? 'current'
							: 'pending',
			detail:
				status === 'completed'
					? `Finished ${formatRelativeTime(finishedAt)}`
					: status === 'failed'
						? `Exited with code ${state?.exitCode ?? 'unknown'}.`
						: status === 'canceled'
							? 'Canceled before completion.'
							: status === 'running'
								? 'Still in progress.'
								: status === 'queued'
									? 'Waiting to begin.'
									: 'Not finished yet.',
			timestamp: finishedAt
		}
	];

	return steps;
}

async function buildRunDetail(run: AgentRun): Promise<AgentRunDetail> {
	const [state, lastMessage, logTail] = await Promise.all([
		readRunState(run.statePath),
		readOptionalText(run.messagePath),
		readLogTail(run.logPath)
	]);

	return {
		...run,
		state,
		lastMessage: lastMessage?.trim() || null,
		logTail
	};
}

function getDiscoveredThreadId(session: AgentSession, runs: AgentRunDetail[]) {
	if (session.threadId) {
		return session.threadId;
	}

	for (const run of runs) {
		if (run.state?.codexThreadId) {
			return run.state.codexThreadId;
		}
	}

	return null;
}

function getSessionStatus(runs: AgentRunDetail[]) {
	const latestRun = runs[0] ?? null;

	if (!latestRun?.state) {
		return 'idle' as const;
	}

	return latestRun.state.status;
}

function hasActiveRun(runs: AgentRunDetail[]) {
	return runs.some((run) => run.state?.status === 'queued' || run.state?.status === 'running');
}

async function buildSessionDetail(session: AgentSession, runs: AgentRun[]) {
	const runDetails = await Promise.all(
		[...runs].sort(compareByCreatedAtDesc).map((run) => buildRunDetail(run))
	);
	const threadId = getDiscoveredThreadId(session, runDetails);
	const status = getSessionStatus(runDetails);
	const latestRun = runDetails[0] ?? null;
	const lastActivityAt = getRunLastActivityAt(latestRun);
	const lastExitCode = latestRun?.state?.exitCode ?? null;

	return {
		...session,
		threadId,
		status,
		hasActiveRun: hasActiveRun(runDetails),
		canResume: Boolean(threadId) && !hasActiveRun(runDetails),
		runCount: runDetails.length,
		lastActivityAt,
		lastActivityLabel: formatRelativeTime(lastActivityAt),
		statusSummary: getStatusSummary({
			status,
			hasActiveRun: hasActiveRun(runDetails),
			canResume: Boolean(threadId) && !hasActiveRun(runDetails),
			lastMessage: latestRun?.lastMessage ?? null,
			threadId
		}),
		lastExitCode,
		runTimeline: buildRunTimeline({
			run: latestRun,
			threadId
		}),
		latestRun,
		runs: runDetails
	} satisfies AgentSessionDetail;
}

export async function listAgentSessions() {
	const db = await loadAgentSessionsDb();

	return Promise.all(
		[...db.sessions].sort(compareByCreatedAtDesc).map((session) =>
			buildSessionDetail(
				session,
				db.runs.filter((run) => run.sessionId === session.id)
			)
		)
	);
}

export function summarizeAgentSessions(sessions: AgentSessionDetail[]) {
	return {
		totalCount: sessions.length,
		runningCount: sessions.filter((session) => session.status === 'running').length,
		queuedCount: sessions.filter((session) => session.status === 'queued').length,
		completedCount: sessions.filter((session) => session.status === 'completed').length,
		failedCount: sessions.filter(
			(session) => session.status === 'failed' || session.status === 'canceled'
		).length
	};
}

export async function getAgentSession(sessionId: string) {
	const db = await loadAgentSessionsDb();
	const session = db.sessions.find((candidate) => candidate.id === sessionId) ?? null;

	if (!session) {
		return null;
	}

	return buildSessionDetail(
		session,
		db.runs.filter((run) => run.sessionId === session.id)
	);
}

export function extractThreadIdFromOutputLine(line: string) {
	try {
		const parsed = JSON.parse(line) as { type?: string; thread_id?: string };
		return parsed.type === 'thread.started' ? (parsed.thread_id ?? null) : null;
	} catch {
		return null;
	}
}

export async function startAgentSession(input: {
	name: string;
	cwd: string;
	prompt: string;
	sandbox: AgentSandbox;
	model: string | null;
}) {
	const sessionId = createSessionId();
	const runId = createRunId();
	const now = new Date().toISOString();
	const paths = getRunPaths(sessionId, runId);

	const session: AgentSession = {
		id: sessionId,
		name: input.name,
		cwd: input.cwd,
		sandbox: input.sandbox,
		model: input.model,
		threadId: null,
		createdAt: now,
		updatedAt: now
	};

	const run: AgentRun = {
		id: runId,
		sessionId,
		mode: 'start',
		prompt: input.prompt,
		requestedThreadId: null,
		createdAt: now,
		updatedAt: now,
		logPath: paths.logPath,
		statePath: paths.statePath,
		messagePath: paths.messagePath,
		configPath: paths.configPath
	};

	await writeRunnerConfig({ session, run, threadId: null });
	await updateAgentSessionsDb((db) => ({
		sessions: [session, ...db.sessions],
		runs: [run, ...db.runs]
	}));
	launchRunner(run.configPath);

	return {
		sessionId,
		runId
	};
}

export async function sendAgentSessionMessage(sessionId: string, prompt: string) {
	const db = await loadAgentSessionsDb();
	const session = db.sessions.find((candidate) => candidate.id === sessionId);

	if (!session) {
		throw new Error('Session not found.');
	}

	const detail = await buildSessionDetail(
		session,
		db.runs.filter((run) => run.sessionId === sessionId)
	);

	if (detail.hasActiveRun) {
		throw new Error('Session already has an active run.');
	}

	if (!detail.threadId) {
		throw new Error('Session does not have a discovered Codex thread id yet.');
	}

	const runId = createRunId();
	const now = new Date().toISOString();
	const paths = getRunPaths(sessionId, runId);
	const run: AgentRun = {
		id: runId,
		sessionId,
		mode: 'message',
		prompt,
		requestedThreadId: detail.threadId,
		createdAt: now,
		updatedAt: now,
		logPath: paths.logPath,
		statePath: paths.statePath,
		messagePath: paths.messagePath,
		configPath: paths.configPath
	};

	const nextSession: AgentSession = {
		...session,
		threadId: detail.threadId,
		updatedAt: now
	};

	await writeRunnerConfig({ session: nextSession, run, threadId: detail.threadId });
	await updateAgentSessionsDb((current) => ({
		sessions: current.sessions.map((candidate) =>
			candidate.id === sessionId ? nextSession : candidate
		),
		runs: [run, ...current.runs]
	}));
	launchRunner(run.configPath);

	return {
		sessionId,
		runId
	};
}

export async function cancelAgentSession(sessionId: string) {
	const detail = await getAgentSession(sessionId);

	if (!detail?.latestRun?.state?.pid || !detail.hasActiveRun) {
		return false;
	}

	try {
		process.kill(detail.latestRun.state.pid, 'SIGTERM');

		const nextState: AgentRunState = {
			...detail.latestRun.state,
			status: 'canceled',
			finishedAt: new Date().toISOString(),
			signal: 'SIGTERM'
		};

		await writeFile(detail.latestRun.statePath, JSON.stringify(nextState, null, 2));
		return true;
	} catch {
		return false;
	}
}
