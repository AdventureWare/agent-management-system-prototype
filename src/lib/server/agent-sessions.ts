import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { normalizePathInput } from '$lib/server/path-tools';
import { resolveTaskThreadName } from '$lib/server/task-threads';
import { deriveThreadTopicLabels } from '$lib/server/task-thread-topics';
import {
	buildSessionAttachmentPrompt,
	persistSessionAttachments
} from '$lib/server/agent-session-attachments';
import {
	AGENT_SANDBOX_OPTIONS,
	type AgentRun,
	type AgentRunDetail,
	type AgentRunStatus,
	type AgentSessionAttachment,
	type AgentSessionTaskLink,
	type AgentSessionState,
	type AgentRunState,
	type AgentSandbox,
	type AgentSession,
	type AgentSessionDetail,
	type AgentSessionOrigin,
	type AgentTimelineStep,
	type AgentSessionsDb
} from '$lib/types/agent-session';
import { loadControlPlane, updateControlPlane } from '$lib/server/control-plane';
import type { ControlPlaneData, Lane, RunStatus, TaskStatus } from '$lib/types/control-plane';

const AGENT_SESSIONS_DB_FILE = resolve(process.cwd(), 'data', 'agent-sessions.json');
const AGENT_SESSIONS_ROOT = resolve(process.cwd(), 'data', 'agent-sessions');
const SESSION_RUNNER_SCRIPT = resolve(process.cwd(), 'scripts', 'agent-session-runner.mjs');
const CODEX_HOME = process.env.CODEX_HOME?.trim() || resolve(homedir(), '.codex');
const CODEX_STATE_DB_FILE = resolve(CODEX_HOME, 'state_5.sqlite');
const STALE_RUN_GRACE_MS = 5 * 60 * 1000;

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
			sessions: Array.isArray(parsed.sessions)
				? parsed.sessions
						.filter((session) => Boolean(session) && typeof session === 'object')
						.map((session) => {
							const candidate = session as Partial<AgentSession>;

							return {
								...candidate,
								id: typeof candidate.id === 'string' ? candidate.id : createSessionId(),
								name: typeof candidate.name === 'string' ? candidate.name : 'Untitled session',
								cwd: typeof candidate.cwd === 'string' ? normalizePathInput(candidate.cwd) : '',
								sandbox: parseAgentSandbox(candidate.sandbox, 'workspace-write'),
								model:
									typeof candidate.model === 'string' && candidate.model.trim()
										? candidate.model
										: null,
								threadId:
									typeof candidate.threadId === 'string' && candidate.threadId.trim()
										? candidate.threadId
										: null,
								attachments: Array.isArray(candidate.attachments)
									? candidate.attachments
											.filter((attachment) => Boolean(attachment) && typeof attachment === 'object')
											.map((attachment) => {
												const item = attachment as Partial<AgentSessionAttachment>;

												return {
													id:
														typeof item.id === 'string' && item.id.trim()
															? item.id
															: `session_attachment_${randomUUID()}`,
													name:
														typeof item.name === 'string' && item.name.trim()
															? item.name
															: 'Attachment',
													path:
														typeof item.path === 'string'
															? normalizePathInput(item.path)
															: '',
													contentType:
														typeof item.contentType === 'string' && item.contentType.trim()
															? item.contentType
															: 'application/octet-stream',
													sizeBytes:
														typeof item.sizeBytes === 'number' &&
														Number.isFinite(item.sizeBytes) &&
														item.sizeBytes >= 0
															? item.sizeBytes
															: 0,
													attachedAt:
														typeof item.attachedAt === 'string' && item.attachedAt.trim()
															? item.attachedAt
															: new Date().toISOString()
												};
											})
											.filter((attachment) => attachment.path.length > 0)
									: [],
								archivedAt:
									typeof candidate.archivedAt === 'string' && candidate.archivedAt.trim()
										? candidate.archivedAt
										: null,
								createdAt:
									typeof candidate.createdAt === 'string'
										? candidate.createdAt
										: new Date().toISOString(),
								updatedAt:
									typeof candidate.updatedAt === 'string'
										? candidate.updatedAt
										: new Date().toISOString()
							};
						})
				: [],
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

type TaskContext = {
	tasks: Array<{
		id: string;
		title: string;
		summary: string;
		lane: Lane;
		status: string;
		projectName: string | null;
		threadSessionId: string | null;
	}>;
	runs: Array<{ taskId: string; sessionId: string | null }>;
};

type NativeCodexThread = {
	id: string;
	name: string;
	cwd: string;
	sandbox: AgentSandbox;
	model: string | null;
	createdAt: string;
	updatedAt: string;
	firstUserMessage: string | null;
	rolloutPath: string;
};

type NativeRolloutRecord = {
	timestamp?: string;
	type?: string;
	payload?: Record<string, unknown>;
};

function openCodexStateDb() {
	if (!existsSync(CODEX_STATE_DB_FILE)) {
		return null;
	}

	try {
		return new DatabaseSync(CODEX_STATE_DB_FILE, { readOnly: true });
	} catch {
		return null;
	}
}

function epochSecondsToIso(value: number | null | undefined) {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return null;
	}

	return new Date(value * 1000).toISOString();
}

function parseNativeSandboxPolicy(value: string | null | undefined) {
	if (!value) {
		return 'workspace-write' as const;
	}

	try {
		const parsed = JSON.parse(value) as { type?: string } | string;

		if (typeof parsed === 'string') {
			return parseAgentSandbox(parsed, 'workspace-write');
		}

		return parseAgentSandbox(parsed.type, 'workspace-write');
	} catch {
		return parseAgentSandbox(value, 'workspace-write');
	}
}

function normalizeMessageText(value: string) {
	return value.replace(/\r\n/g, '\n').trim();
}

function extractRolloutContentText(content: unknown) {
	if (typeof content === 'string') {
		return normalizeMessageText(content);
	}

	if (!Array.isArray(content)) {
		return null;
	}

	const text = content
		.map((item) => {
			if (!item || typeof item !== 'object') {
				return null;
			}

			const candidate = (item as { text?: unknown }).text;
			return typeof candidate === 'string' ? candidate : null;
		})
		.filter((candidate): candidate is string => Boolean(candidate))
		.join('\n\n')
		.trim();

	return text ? normalizeMessageText(text) : null;
}

function compactLogLine(value: string, maxLength = 220) {
	const normalized = value.replace(/\s+/g, ' ').trim();

	if (normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function latestIso(values: Array<string | null | undefined>) {
	return (
		values
			.filter((value): value is string => Boolean(value))
			.sort((left, right) => left.localeCompare(right))
			.at(-1) ?? null
	);
}

function pushRunLog(run: AgentRunDetail, label: string, value: string | null) {
	if (!value) {
		return;
	}

	run.logTail = [...run.logTail, `${label}: ${compactLogLine(value)}`].slice(-80);
}

function createSyntheticNativeRun(input: {
	thread: NativeCodexThread;
	index: number;
	prompt: string;
	createdAt: string;
}) {
	const requestedThreadId = input.index === 0 ? null : input.thread.id;

	return {
		id: `native_${input.thread.id}_${input.index + 1}`,
		sessionId: input.thread.id,
		mode: input.index === 0 ? ('start' as const) : ('message' as const),
		prompt: normalizeMessageText(input.prompt),
		requestedThreadId,
		createdAt: input.createdAt,
		updatedAt: input.createdAt,
		logPath: input.thread.rolloutPath,
		statePath: input.thread.rolloutPath,
		messagePath: input.thread.rolloutPath,
		configPath: input.thread.rolloutPath,
		state: {
			status: 'completed',
			pid: null,
			startedAt: input.createdAt,
			finishedAt: input.createdAt,
			exitCode: 0,
			signal: null,
			codexThreadId: input.thread.id
		},
		lastMessage: null,
		logTail: [],
		activityAt: input.createdAt
	} satisfies AgentRunDetail;
}

function createNativeSummaryRun(thread: NativeCodexThread) {
	if (!thread.firstUserMessage) {
		return null;
	}

	const run = createSyntheticNativeRun({
		thread,
		index: 0,
		prompt: thread.firstUserMessage,
		createdAt: thread.createdAt
	});

	run.updatedAt = thread.updatedAt;
	run.activityAt = thread.updatedAt;
	run.state = {
		...run.state,
		finishedAt: thread.updatedAt
	};

	return run;
}

function parseNativeRolloutRecord(line: string): NativeRolloutRecord | null {
	try {
		return JSON.parse(line) as NativeRolloutRecord;
	} catch {
		return null;
	}
}

async function listNativeCodexThreads() {
	const db = openCodexStateDb();

	if (!db) {
		return [];
	}

	try {
		const rows = db
			.prepare(
				`
					select
						id,
						title,
						cwd,
						sandbox_policy,
						model,
						first_user_message,
						rollout_path,
						created_at,
						updated_at
					from threads
					where archived = 0
					order by updated_at desc
				`
			)
			.all() as Array<{
			id: string;
			title: string;
			cwd: string;
			sandbox_policy: string;
			model: string | null;
			first_user_message: string | null;
			rollout_path: string;
			created_at: number;
			updated_at: number;
		}>;

		return rows
			.map((row) => {
				const createdAt = epochSecondsToIso(row.created_at);
				const updatedAt = epochSecondsToIso(row.updated_at);

				if (!createdAt || !updatedAt) {
					return null;
				}

				return {
					id: row.id,
					name: row.title.trim() || `Codex thread ${row.id.slice(0, 8)}`,
					cwd: row.cwd,
					sandbox: parseNativeSandboxPolicy(row.sandbox_policy),
					model: row.model?.trim() || null,
					createdAt,
					updatedAt,
					firstUserMessage: row.first_user_message?.trim() || null,
					rolloutPath: row.rollout_path
				} satisfies NativeCodexThread;
			})
			.filter((thread): thread is NativeCodexThread => Boolean(thread));
	} finally {
		db.close();
	}
}

async function getNativeCodexThread(threadId: string) {
	const threads = await listNativeCodexThreads();
	return threads.find((thread) => thread.id === threadId) ?? null;
}

async function buildNativeRunDetails(
	thread: NativeCodexThread,
	options: { beforeIso?: string | null } = {}
) {
	const raw = await readOptionalText(thread.rolloutPath);

	if (!raw) {
		const fallbackRun = createNativeSummaryRun(thread);
		return fallbackRun ? [fallbackRun] : [];
	}

	const cutoff = options.beforeIso ?? null;
	const lines = raw.split(/\r?\n/).filter(Boolean);
	const runs: AgentRunDetail[] = [];
	let currentRun: AgentRunDetail | null = null;

	for (const line of lines) {
		const record = parseNativeRolloutRecord(line);

		if (!record?.type) {
			continue;
		}

		const timestamp = typeof record.timestamp === 'string' ? record.timestamp : null;
		const payload = record.payload ?? {};

		if (
			record.type === 'event_msg' &&
			payload.type === 'user_message' &&
			payload.kind !== 'environment_context' &&
			typeof payload.message === 'string'
		) {
			if (cutoff && timestamp && timestamp >= cutoff) {
				break;
			}

			currentRun = createSyntheticNativeRun({
				thread,
				index: runs.length,
				prompt: payload.message,
				createdAt: timestamp ?? thread.createdAt
			});
			runs.push(currentRun);
			continue;
		}

		if (!currentRun) {
			continue;
		}

		if (record.type === 'event_msg' && payload.type === 'agent_reasoning') {
			pushRunLog(currentRun, 'Reasoning', typeof payload.text === 'string' ? payload.text : null);
			continue;
		}

		if (record.type === 'event_msg' && payload.type === 'agent_message') {
			const message =
				typeof payload.message === 'string' ? normalizeMessageText(payload.message) : null;

			if (message) {
				const currentState = currentRun.state ?? {
					status: 'completed',
					pid: null,
					startedAt: currentRun.createdAt,
					finishedAt: currentRun.createdAt,
					exitCode: 0,
					signal: null,
					codexThreadId: thread.id
				};
				currentRun.lastMessage = message;
				currentRun.updatedAt = timestamp ?? currentRun.updatedAt;
				currentRun.activityAt = latestIso([currentRun.activityAt, timestamp, currentRun.updatedAt]);
				currentRun.state = {
					...currentState,
					finishedAt: timestamp ?? currentRun.state?.finishedAt ?? currentRun.createdAt
				};
				pushRunLog(currentRun, 'Assistant', message);
			}

			continue;
		}

		if (record.type !== 'response_item') {
			continue;
		}

		if (payload.type === 'message' && payload.role === 'assistant') {
			const message = extractRolloutContentText(payload.content);

			if (message) {
				const currentState = currentRun.state ?? {
					status: 'completed',
					pid: null,
					startedAt: currentRun.createdAt,
					finishedAt: currentRun.createdAt,
					exitCode: 0,
					signal: null,
					codexThreadId: thread.id
				};
				currentRun.lastMessage = message;
				currentRun.updatedAt = timestamp ?? currentRun.updatedAt;
				currentRun.activityAt = latestIso([currentRun.activityAt, timestamp, currentRun.updatedAt]);
				currentRun.state = {
					...currentState,
					finishedAt: timestamp ?? currentRun.state?.finishedAt ?? currentRun.createdAt
				};
			}

			continue;
		}

		if (payload.type === 'function_call' || payload.type === 'custom_tool_call') {
			currentRun.activityAt = latestIso([currentRun.activityAt, timestamp, currentRun.updatedAt]);
			pushRunLog(currentRun, 'Tool call', typeof payload.name === 'string' ? payload.name : null);
			continue;
		}

		if (payload.type === 'function_call_output' || payload.type === 'custom_tool_call_output') {
			currentRun.activityAt = latestIso([currentRun.activityAt, timestamp, currentRun.updatedAt]);
			pushRunLog(
				currentRun,
				'Tool output',
				typeof payload.output === 'string' ? payload.output : null
			);
		}
	}

	if (runs.length === 0) {
		const fallbackRun = createNativeSummaryRun(thread);
		return fallbackRun ? [fallbackRun] : [];
	}

	return [...runs].sort(compareByCreatedAtDesc);
}

function materializeNativeSession(thread: NativeCodexThread): AgentSession {
	return {
		id: thread.id,
		name: thread.name,
		cwd: thread.cwd,
		sandbox: thread.sandbox,
		model: thread.model,
		threadId: thread.id,
		attachments: [],
		archivedAt: null,
		createdAt: thread.createdAt,
		updatedAt: thread.updatedAt
	};
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

	const deltaMs = Math.max(0, Date.now() - new Date(iso).getTime());
	const deltaSeconds = Math.floor(deltaMs / 1000);

	if (deltaSeconds < 5) return 'Just now';
	if (deltaSeconds < 60) return `${deltaSeconds}s ago`;

	const deltaMinutes = Math.floor(deltaSeconds / 60);
	if (deltaMinutes < 60) return `${deltaMinutes}m ago`;

	const deltaHours = Math.floor(deltaMinutes / 60);
	if (deltaHours < 24) return `${deltaHours}h ago`;

	const deltaDays = Math.floor(deltaHours / 24);
	return `${deltaDays}d ago`;
}

function getRunLastActivityAt(run: AgentRunDetail | null) {
	if (!run) {
		return null;
	}

	return latestIso([
		run.activityAt,
		run.updatedAt,
		run.state?.finishedAt,
		run.state?.startedAt,
		run.createdAt
	]);
}

async function readOptionalTimestamp(path: string) {
	if (!existsSync(path)) {
		return null;
	}

	try {
		return (await stat(path)).mtime.toISOString();
	} catch {
		return null;
	}
}

function getSessionSummary(detail: {
	sessionState: AgentSessionState;
	latestRunStatus: AgentRunStatus | 'idle';
	hasActiveRun: boolean;
	canResume: boolean;
	lastMessage: string | null;
	threadId: string | null;
}) {
	switch (detail.sessionState) {
		case 'starting':
			return 'The latest run is queued locally and has not started yet.';
		case 'waiting':
			return 'Codex is still working, but no saved reply has been captured yet.';
		case 'working':
			return 'Codex is still working and has already produced thread output.';
		case 'ready':
			return 'The thread is idle and available for the next instruction.';
		case 'attention':
			return detail.latestRunStatus === 'canceled'
				? 'The latest run was canceled before it finished.'
				: 'The latest run failed. Check the recent log output.';
		case 'unavailable':
			return 'The latest run finished, but this thread is not currently resumable.';
		case 'idle':
		default:
			if (detail.threadId) {
				return 'The thread has reusable context and is currently idle.';
			}

			if (detail.lastMessage) {
				return 'The last run finished, but no reusable thread was discovered.';
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
			label: 'Thread available',
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
	const [state, lastMessage, logTail, stateUpdatedAt, messageUpdatedAt, logUpdatedAt] =
		await Promise.all([
			readRunState(run.statePath),
			readOptionalText(run.messagePath),
			readLogTail(run.logPath),
			readOptionalTimestamp(run.statePath),
			readOptionalTimestamp(run.messagePath),
			readOptionalTimestamp(run.logPath)
		]);

	const detail = {
		...run,
		state,
		lastMessage: lastMessage?.trim() || null,
		logTail,
		activityAt: latestIso([
			run.updatedAt,
			run.createdAt,
			state?.startedAt,
			state?.finishedAt,
			stateUpdatedAt,
			messageUpdatedAt,
			logUpdatedAt
		])
	} satisfies AgentRunDetail;

	return {
		...detail,
		state: deriveRunState(detail)
	};
}

function getRunActivityAt(
	run: Pick<AgentRunDetail, 'activityAt' | 'createdAt' | 'updatedAt' | 'state'>
) {
	return run.activityAt ?? run.state?.startedAt ?? run.updatedAt ?? run.createdAt;
}

function isStaleActiveRun(run: AgentRunDetail, now = Date.now()) {
	const state = run.state;

	if (!state || (state.status !== 'queued' && state.status !== 'running')) {
		return false;
	}

	if (state.finishedAt || state.pid || run.lastMessage || run.logTail.length > 0) {
		return false;
	}

	const activityAt = Date.parse(getRunActivityAt(run));

	if (Number.isNaN(activityAt)) {
		return false;
	}

	return now - activityAt >= STALE_RUN_GRACE_MS;
}

export function deriveRunState(run: AgentRunDetail, now = Date.now()) {
	if (!isStaleActiveRun(run, now) || !run.state) {
		return run.state;
	}

	return {
		...run.state,
		status: 'failed',
		finishedAt: run.state.startedAt ?? run.updatedAt ?? new Date(now).toISOString(),
		exitCode: run.state.exitCode ?? -1,
		signal: null
	} satisfies AgentRunState;
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

function getLatestRunStatus(runs: AgentRunDetail[]) {
	const latestRun = runs[0] ?? null;

	if (!latestRun?.state) {
		return 'idle' as const;
	}

	return latestRun.state.status;
}

function hasActiveRun(runs: AgentRunDetail[]) {
	return runs.some((run) => run.state?.status === 'queued' || run.state?.status === 'running');
}

function getSessionState(detail: {
	latestRunStatus: AgentRunStatus | 'idle';
	canResume: boolean;
	hasActiveRun: boolean;
	lastMessage: string | null;
	threadId: string | null;
}) {
	switch (detail.latestRunStatus) {
		case 'queued':
			return 'starting' as const;
		case 'running':
			return detail.lastMessage ? ('working' as const) : ('waiting' as const);
		case 'failed':
		case 'canceled':
			return 'attention' as const;
		case 'completed':
			return detail.canResume ? ('ready' as const) : ('unavailable' as const);
		default:
			if (detail.canResume || detail.threadId) {
				return 'ready' as const;
			}

			if (detail.lastMessage) {
				return 'unavailable' as const;
			}

			return detail.hasActiveRun ? ('starting' as const) : ('idle' as const);
	}
}

function buildRelatedTaskLinks(
	sessionId: string,
	taskContext: TaskContext
): AgentSessionTaskLink[] {
	const relatedTaskIds = new Set(
		taskContext.runs
			.filter((run) => run.sessionId === sessionId)
			.map((run) => run.taskId)
			.filter(Boolean)
	);
	const links = taskContext.tasks
		.filter((task) => task.threadSessionId === sessionId || relatedTaskIds.has(task.id))
		.map((task) => ({
			id: task.id,
			title: task.title,
			status: task.status,
			isPrimary: task.threadSessionId === sessionId
		}))
		.sort((left, right) => {
			if (left.isPrimary !== right.isPrimary) {
				return left.isPrimary ? -1 : 1;
			}

			return left.title.localeCompare(right.title);
		});

	return links;
}

function buildStandardizedManagedSessionName(
	session: AgentSession,
	taskContext: TaskContext,
	relatedTasks: AgentSessionTaskLink[]
) {
	const primaryTask =
		taskContext.tasks.find((task) => task.threadSessionId === session.id) ??
		(relatedTasks[0]
			? (taskContext.tasks.find((task) => task.id === relatedTasks[0]?.id) ?? null)
			: null);

	return resolveTaskThreadName({
		currentName: session.name,
		projectName: primaryTask?.projectName ?? null,
		taskName: primaryTask?.title ?? null,
		taskId: primaryTask?.id ?? null
	});
}

function finalizeSessionDetail(input: {
	session: AgentSession;
	runDetails: AgentRunDetail[];
	taskContext: TaskContext;
	origin: AgentSessionOrigin;
	sessionSummaryOverride?: string | null;
}) {
	const threadId = getDiscoveredThreadId(input.session, input.runDetails);
	const latestRunStatus = getLatestRunStatus(input.runDetails);
	const latestRun = input.runDetails[0] ?? null;
	const lastActivityAt = getRunLastActivityAt(latestRun) ?? input.session.updatedAt;
	const lastExitCode = latestRun?.state?.exitCode ?? null;
	const hasActive = hasActiveRun(input.runDetails);
	const canResume = Boolean(threadId) && !hasActive;
	const relatedTasks = buildRelatedTaskLinks(input.session.id, input.taskContext);
	const name =
		input.origin === 'managed'
			? buildStandardizedManagedSessionName(input.session, input.taskContext, relatedTasks)
			: input.session.name;
	const relatedTaskDetails = input.taskContext.tasks
		.filter((task) => relatedTasks.some((relatedTask) => relatedTask.id === task.id))
		.map((task) => ({
			title: task.title,
			summary: task.summary,
			lane: task.lane,
			isPrimary: task.threadSessionId === input.session.id
		}));
	const sessionState = getSessionState({
		latestRunStatus,
		canResume,
		hasActiveRun: hasActive,
		lastMessage: latestRun?.lastMessage ?? null,
		threadId
	});
	const sessionSummary =
		input.sessionSummaryOverride ??
		getSessionSummary({
			sessionState,
			latestRunStatus,
			hasActiveRun: hasActive,
			canResume,
			lastMessage: latestRun?.lastMessage ?? null,
			threadId
		});
	const topicLabels = deriveThreadTopicLabels({
		sessionName: name,
		sessionSummary,
		runDetails: input.runDetails.map((run) => ({
			prompt: run.prompt,
			lastMessage: run.lastMessage
		})),
		relatedTasks: relatedTaskDetails
	});

	return {
		...input.session,
		name,
		attachments: input.session.attachments ?? [],
		origin: input.origin,
		threadId,
		topicLabels,
		sessionState,
		latestRunStatus,
		hasActiveRun: hasActive,
		canResume,
		runCount: input.runDetails.length,
		lastActivityAt,
		lastActivityLabel: formatRelativeTime(lastActivityAt),
		sessionSummary,
		lastExitCode,
		runTimeline: buildRunTimeline({
			run: latestRun,
			threadId
		}),
		relatedTasks,
		latestRun,
		runs: input.runDetails
	} satisfies AgentSessionDetail;
}

export function isAbandonedSessionDetail(detail: AgentSessionDetail) {
	if (detail.origin !== 'managed' || detail.threadId || detail.relatedTasks.length > 0) {
		return false;
	}

	if (
		detail.hasActiveRun ||
		detail.canResume ||
		detail.latestRunStatus !== 'failed' ||
		detail.runCount !== 1
	) {
		return false;
	}

	const latestRun = detail.latestRun;

	if (!latestRun || latestRun.mode !== 'start' || latestRun.requestedThreadId) {
		return false;
	}

	if (latestRun.lastMessage || latestRun.logTail.length > 0) {
		return false;
	}

	return !latestRun.state?.codexThreadId;
}

async function buildSessionDetail(
	session: AgentSession,
	runs: AgentRun[],
	taskContext: TaskContext
) {
	const runDetails = await Promise.all(
		[...runs].sort(compareByCreatedAtDesc).map((run) => buildRunDetail(run))
	);

	return finalizeSessionDetail({
		session,
		runDetails,
		taskContext,
		origin: 'managed'
	});
}

async function buildExternalSessionListDetail(
	thread: NativeCodexThread,
	runs: AgentRun[],
	taskContext: TaskContext
) {
	if (runs.length > 0) {
		const runDetails = await Promise.all(
			[...runs].sort(compareByCreatedAtDesc).map((run) => buildRunDetail(run))
		);

		return finalizeSessionDetail({
			session: materializeNativeSession(thread),
			runDetails,
			taskContext,
			origin: 'external'
		});
	}

	const summaryRun = createNativeSummaryRun(thread);

	return finalizeSessionDetail({
		session: materializeNativeSession(thread),
		runDetails: summaryRun ? [summaryRun] : [],
		taskContext,
		origin: 'external',
		sessionSummaryOverride:
			'Imported from local Codex history. Open the thread detail page to inspect prior turns and continue the conversation here.'
	});
}

async function buildExternalSessionDetail(
	thread: NativeCodexThread,
	runs: AgentRun[],
	taskContext: TaskContext
) {
	const localRunDetails = await Promise.all(
		[...runs].sort(compareByCreatedAtDesc).map((run) => buildRunDetail(run))
	);
	const earliestLocalRunAt =
		[...runs].map((run) => run.createdAt).sort((left, right) => left.localeCompare(right))[0] ??
		null;
	const nativeRunDetails = await buildNativeRunDetails(thread, {
		beforeIso: earliestLocalRunAt
	});

	return finalizeSessionDetail({
		session: materializeNativeSession(thread),
		runDetails: [...localRunDetails, ...nativeRunDetails].sort(compareByCreatedAtDesc),
		taskContext,
		origin: 'external',
		sessionSummaryOverride: runs.length
			? null
			: 'Imported from local Codex history. This thread was not started in the agent management system, but its saved conversation is available here and can take follow-up work.'
	});
}

function buildTaskContextFromControlPlane(controlPlane: ControlPlaneData): TaskContext {
	const projectNames = new Map(controlPlane.projects.map((project) => [project.id, project.name]));

	return {
		tasks: controlPlane.tasks.map((task) => ({
			id: task.id,
			title: task.title,
			summary: task.summary,
			lane: task.lane,
			status: task.status,
			projectName: projectNames.get(task.projectId) ?? null,
			threadSessionId: task.threadSessionId
		})),
		runs: controlPlane.runs.map((run) => ({
			taskId: run.taskId,
			sessionId: run.sessionId
		}))
	};
}

type SessionLifecycleUpdate = {
	taskStatus: TaskStatus;
	runStatus: RunStatus;
	summary: string;
	blockedReason: string;
	finishedAt: string;
};

type SessionMessageQueueUpdate = {
	taskStatus: TaskStatus;
	runStatus: RunStatus;
	runSummary: string;
	reviewSummary: string;
	approvalSummary: string;
	queuedAt: string;
};

function deriveLifecycleUpdateFromSessionDetail(
	detail: Pick<
		AgentSessionDetail,
		'hasActiveRun' | 'canResume' | 'latestRunStatus' | 'lastActivityAt'
	>
): SessionLifecycleUpdate | null {
	if (detail.hasActiveRun) {
		return null;
	}

	const finishedAt = detail.lastActivityAt ?? new Date().toISOString();

	switch (detail.latestRunStatus) {
		case 'completed':
			if (!detail.canResume) {
				return null;
			}

			return {
				taskStatus: 'review',
				runStatus: 'completed',
				summary: 'Task run finished and is ready for review.',
				blockedReason: '',
				finishedAt
			};
		case 'failed':
			return {
				taskStatus: 'blocked',
				runStatus: 'failed',
				summary: 'Task blocked after the linked work thread failed.',
				blockedReason: 'The linked work thread failed.',
				finishedAt
			};
		case 'canceled':
			return {
				taskStatus: 'blocked',
				runStatus: 'canceled',
				summary: 'Task blocked after the linked work thread was canceled.',
				blockedReason: 'The linked work thread was canceled.',
				finishedAt
			};
		default:
			return null;
	}
}

function createSessionMessageQueueUpdate(queuedAt: string): SessionMessageQueueUpdate {
	return {
		taskStatus: 'in_progress',
		runStatus: 'running',
		runSummary: 'Queued follow-up work in the linked thread.',
		reviewSummary: 'Dismissed after follow-up work was queued in the linked thread.',
		approvalSummary: 'Canceled after follow-up work was queued in the linked thread.',
		queuedAt
	};
}

export function reconcileControlPlaneSessionState(
	data: ControlPlaneData,
	detail: Pick<
		AgentSessionDetail,
		'id' | 'hasActiveRun' | 'canResume' | 'latestRunStatus' | 'lastActivityAt'
	>
) {
	const lifecycleUpdate = deriveLifecycleUpdateFromSessionDetail(detail);

	if (!lifecycleUpdate) {
		return data;
	}

	const runIdsToUpdate = new Set<string>();
	let changed = false;

	const tasks = data.tasks.map((task) => {
		if (task.status !== 'in_progress') {
			return task;
		}

		const latestRun = task.latestRunId
			? (data.runs.find((candidate) => candidate.id === task.latestRunId) ?? null)
			: null;
		const isLinkedToSession =
			latestRun?.sessionId === detail.id || (!latestRun && task.threadSessionId === detail.id);

		if (!isLinkedToSession) {
			return task;
		}

		changed = true;

		if (task.latestRunId) {
			runIdsToUpdate.add(task.latestRunId);
		}

		return {
			...task,
			status: lifecycleUpdate.taskStatus,
			blockedReason: lifecycleUpdate.blockedReason,
			updatedAt: lifecycleUpdate.finishedAt
		};
	});

	if (!changed) {
		return data;
	}

	return {
		...data,
		tasks,
		runs: data.runs.map((run) =>
			runIdsToUpdate.has(run.id)
				? {
						...run,
						status: lifecycleUpdate.runStatus,
						summary: lifecycleUpdate.summary,
						updatedAt: lifecycleUpdate.finishedAt,
						endedAt: run.endedAt ?? lifecycleUpdate.finishedAt,
						errorSummary:
							lifecycleUpdate.runStatus === 'completed' ? '' : lifecycleUpdate.blockedReason
					}
				: run
		)
	};
}

export function reconcileControlPlaneSessionMessage(
	data: ControlPlaneData,
	sessionId: string,
	queuedAt = new Date().toISOString()
) {
	const queueUpdate = createSessionMessageQueueUpdate(queuedAt);
	const runIdsToUpdate = new Set<string>();
	const taskIdsToReopen = new Set<string>();
	let changed = false;

	const tasks = data.tasks.map((task) => {
		if (task.status !== 'review') {
			return task;
		}

		const latestRun = task.latestRunId
			? (data.runs.find((candidate) => candidate.id === task.latestRunId) ?? null)
			: null;
		const isLinkedToSession =
			latestRun?.sessionId === sessionId || (!latestRun && task.threadSessionId === sessionId);

		if (!isLinkedToSession) {
			return task;
		}

		changed = true;
		taskIdsToReopen.add(task.id);

		if (task.latestRunId) {
			runIdsToUpdate.add(task.latestRunId);
		}

		return {
			...task,
			status: queueUpdate.taskStatus,
			blockedReason: '',
			updatedAt: queueUpdate.queuedAt
		};
	});

	if (!changed) {
		return data;
	}

	return {
		...data,
		tasks,
		runs: data.runs.map((run) =>
			runIdsToUpdate.has(run.id)
				? {
						...run,
						status: queueUpdate.runStatus,
						summary: queueUpdate.runSummary,
						updatedAt: queueUpdate.queuedAt,
						startedAt: run.startedAt ?? queueUpdate.queuedAt,
						endedAt: null,
						lastHeartbeatAt: queueUpdate.queuedAt,
						errorSummary: ''
					}
				: run
		),
		reviews: data.reviews.map((review) =>
			taskIdsToReopen.has(review.taskId) && review.status === 'open'
				? {
						...review,
						status: 'dismissed' as const,
						updatedAt: queueUpdate.queuedAt,
						resolvedAt: queueUpdate.queuedAt,
						summary: queueUpdate.reviewSummary
					}
				: review
		),
		approvals: data.approvals.map((approval) =>
			taskIdsToReopen.has(approval.taskId) &&
			approval.mode === 'before_complete' &&
			approval.status === 'pending'
				? {
						...approval,
						status: 'canceled' as const,
						updatedAt: queueUpdate.queuedAt,
						resolvedAt: queueUpdate.queuedAt,
						summary: queueUpdate.approvalSummary
					}
				: approval
		)
	};
}

async function reconcileTaskStateFromSessionDetails(
	details: AgentSessionDetail[],
	controlPlane: ControlPlaneData
) {
	let nextControlPlane = controlPlane;
	let changed = false;

	for (const detail of details) {
		const reconciled = reconcileControlPlaneSessionState(nextControlPlane, detail);

		if (reconciled !== nextControlPlane) {
			nextControlPlane = reconciled;
			changed = true;
		}
	}

	if (!changed) {
		return {
			controlPlane,
			details
		};
	}

	await updateControlPlane(() => nextControlPlane);
	const taskContext = buildTaskContextFromControlPlane(nextControlPlane);

	return {
		controlPlane: nextControlPlane,
		details: details.map((detail) => ({
			...detail,
			relatedTasks: buildRelatedTaskLinks(detail.id, taskContext)
		}))
	};
}

export async function listAgentSessions(options: { includeArchived?: boolean } = {}) {
	const db = await loadAgentSessionsDb();
	const [controlPlane, nativeThreads] = await Promise.all([
		loadControlPlane(),
		listNativeCodexThreads()
	]);
	const taskContext = buildTaskContextFromControlPlane(controlPlane);
	const nativeThreadsById = new Map(nativeThreads.map((thread) => [thread.id, thread]));
	const managedThreadIds = new Set(
		db.sessions
			.map((session) => session.threadId)
			.filter((threadId): threadId is string => Boolean(threadId))
	);
	const details = await Promise.all([
		...db.sessions.map((session) => {
			const nativeThread = nativeThreadsById.get(session.id);
			const runs = db.runs.filter((run) => run.sessionId === session.id);

			if (nativeThread && session.id === nativeThread.id) {
				return buildExternalSessionListDetail(nativeThread, runs, taskContext);
			}

			return buildSessionDetail(session, runs, taskContext);
		}),
		...nativeThreads
			.filter(
				(thread) =>
					!db.sessions.some((session) => session.id === thread.id) &&
					!managedThreadIds.has(thread.id)
			)
			.map((thread) => buildExternalSessionListDetail(thread, [], taskContext))
	]);
	const reconciled = await reconcileTaskStateFromSessionDetails(details, controlPlane);

	return reconciled.details
		.filter((detail) => options.includeArchived || !detail.archivedAt)
		.filter((detail) => !isAbandonedSessionDetail(detail))
		.sort((left, right) =>
			(right.lastActivityAt ?? right.updatedAt).localeCompare(left.lastActivityAt ?? left.updatedAt)
		);
}

export function summarizeAgentSessions(sessions: AgentSessionDetail[]) {
	return {
		totalCount: sessions.length,
		activeCount: sessions.filter((session) =>
			['starting', 'waiting', 'working'].includes(session.sessionState)
		).length,
		readyCount: sessions.filter((session) => session.sessionState === 'ready').length,
		unavailableCount: sessions.filter((session) =>
			['unavailable', 'idle'].includes(session.sessionState)
		).length,
		attentionCount: sessions.filter((session) => session.sessionState === 'attention').length
	};
}

export async function getAgentSession(sessionId: string) {
	const db = await loadAgentSessionsDb();
	const session = db.sessions.find((candidate) => candidate.id === sessionId) ?? null;
	const [controlPlane, nativeThread] = await Promise.all([
		loadControlPlane(),
		getNativeCodexThread(sessionId)
	]);
	const taskContext = buildTaskContextFromControlPlane(controlPlane);
	const finalizeSingleDetail = async (detail: AgentSessionDetail | null) => {
		if (!detail) {
			return null;
		}

		const reconciled = await reconcileTaskStateFromSessionDetails([detail], controlPlane);
		const nextDetail = reconciled.details[0] ?? null;

		return nextDetail && !isAbandonedSessionDetail(nextDetail) ? nextDetail : null;
	};

	if (session && nativeThread && session.id === nativeThread.id) {
		return finalizeSingleDetail(
			await buildExternalSessionDetail(
				nativeThread,
				db.runs.filter((run) => run.sessionId === session.id),
				taskContext
			)
		);
	}

	if (session) {
		return finalizeSingleDetail(
			await buildSessionDetail(
				session,
				db.runs.filter((run) => run.sessionId === session.id),
				taskContext
			)
		);
	}

	if (!nativeThread) {
		return null;
	}

	return finalizeSingleDetail(await buildExternalSessionDetail(nativeThread, [], taskContext));
}

export async function setAgentSessionsArchived(sessionIds: string[], archived: boolean) {
	const normalizedIds = [
		...new Set(sessionIds.map((sessionId) => sessionId.trim()).filter(Boolean))
	];

	if (normalizedIds.length === 0) {
		return [];
	}

	const [db, nativeThreads] = await Promise.all([loadAgentSessionsDb(), listNativeCodexThreads()]);
	const nativeThreadsById = new Map(nativeThreads.map((thread) => [thread.id, thread]));
	const existingSessionsById = new Map(db.sessions.map((session) => [session.id, session]));
	const archiveTimestamp = archived ? new Date().toISOString() : null;
	const nextSessions = [...db.sessions];
	const changedSessionIds: string[] = [];

	for (const sessionId of normalizedIds) {
		const existingSession = existingSessionsById.get(sessionId);

		if (existingSession) {
			const nextArchivedAt = archived ? (existingSession.archivedAt ?? archiveTimestamp) : null;

			if (existingSession.archivedAt === nextArchivedAt) {
				continue;
			}

			const updatedSession = {
				...existingSession,
				archivedAt: nextArchivedAt
			};
			const sessionIndex = nextSessions.findIndex((candidate) => candidate.id === sessionId);

			nextSessions[sessionIndex] = updatedSession;
			existingSessionsById.set(sessionId, updatedSession);
			changedSessionIds.push(sessionId);
			continue;
		}

		const nativeThread = nativeThreadsById.get(sessionId);

		if (!nativeThread) {
			continue;
		}

		const importedSession = {
			...materializeNativeSession(nativeThread),
			archivedAt: archiveTimestamp
		};

		nextSessions.unshift(importedSession);
		existingSessionsById.set(sessionId, importedSession);
		changedSessionIds.push(sessionId);
	}

	if (changedSessionIds.length === 0) {
		return [];
	}

	await saveAgentSessionsDb({
		sessions: nextSessions,
		runs: db.runs
	});

	return changedSessionIds;
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
		cwd: normalizePathInput(input.cwd),
		sandbox: input.sandbox,
		model: input.model,
		threadId: null,
		attachments: [],
		archivedAt: null,
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

export async function updateAgentSessionSandbox(sessionId: string, sandbox: AgentSandbox) {
	const [db, nativeThread] = await Promise.all([
		loadAgentSessionsDb(),
		getNativeCodexThread(sessionId)
	]);
	const existingSession = db.sessions.find((candidate) => candidate.id === sessionId) ?? null;

	if (!existingSession && !nativeThread) {
		throw new Error('Session not found.');
	}

	const now = new Date().toISOString();
	const baseSession = existingSession ?? materializeNativeSession(nativeThread as NativeCodexThread);
	const updatedSession: AgentSession = {
		...baseSession,
		sandbox,
		updatedAt: now
	};

	await updateAgentSessionsDb((current) => {
		const existingIndex = current.sessions.findIndex((candidate) => candidate.id === sessionId);

		if (existingIndex >= 0) {
			return {
				sessions: current.sessions.map((candidate) =>
					candidate.id === sessionId ? updatedSession : candidate
				),
				runs: current.runs
			};
		}

		return {
			sessions: [updatedSession, ...current.sessions],
			runs: current.runs
		};
	});

	return updatedSession;
}

export async function sendAgentSessionMessage(
	sessionId: string,
	input:
		| string
		| {
				prompt: string;
				attachments?: File[];
		  }
) {
	const db = await loadAgentSessionsDb();
	let session = db.sessions.find((candidate) => candidate.id === sessionId) ?? null;
	const prompt = typeof input === 'string' ? input : input.prompt;
	const uploads =
		typeof input === 'string' ? [] : (input.attachments ?? []).filter((file) => file.size > 0);

	if (!session) {
		const nativeThread = await getNativeCodexThread(sessionId);

		if (!nativeThread) {
			throw new Error('Session not found.');
		}

		const importedSession = materializeNativeSession(nativeThread);
		session = importedSession;
		await updateAgentSessionsDb((current) => {
			if (current.sessions.some((candidate) => candidate.id === sessionId)) {
				return current;
			}

			return {
				sessions: [importedSession, ...current.sessions],
				runs: current.runs
			};
		});
	}

	const detail = await getAgentSession(sessionId);

	if (!detail) {
		throw new Error('Session not found.');
	}

	if (detail.hasActiveRun) {
		throw new Error('Session already has an active run.');
	}

	if (!detail.threadId) {
		throw new Error('Session does not have a discovered Codex thread id yet.');
	}

	const nextSessionAttachments =
		session.attachments?.filter((attachment) => attachment.path.trim().length > 0) ?? [];
	const persistedAttachments =
		uploads.length > 0
			? await persistSessionAttachments({
					rootPath: AGENT_SESSIONS_ROOT,
					sessionId,
					uploads
				})
			: { attachments: [], inlineAttachmentContents: [] };
	const nextPrompt = buildSessionAttachmentPrompt({
		prompt,
		attachments: persistedAttachments.attachments,
		inlineAttachmentContents: persistedAttachments.inlineAttachmentContents
	});

	const runId = createRunId();
	const now = new Date().toISOString();
	const paths = getRunPaths(sessionId, runId);
	const run: AgentRun = {
		id: runId,
		sessionId,
		mode: 'message',
		prompt: nextPrompt,
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
		attachments: [...persistedAttachments.attachments, ...nextSessionAttachments],
		updatedAt: now
	};

	await writeRunnerConfig({ session: nextSession, run, threadId: detail.threadId });
	await updateAgentSessionsDb((current) => ({
		sessions: current.sessions.map((candidate) =>
			candidate.id === sessionId ? nextSession : candidate
		),
		runs: [run, ...current.runs]
	}));
	const controlPlane = await loadControlPlane();
	const reconciledControlPlane = reconcileControlPlaneSessionMessage(controlPlane, sessionId, now);

	if (reconciledControlPlane !== controlPlane) {
		await updateControlPlane(() => reconciledControlPlane);
	}
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
