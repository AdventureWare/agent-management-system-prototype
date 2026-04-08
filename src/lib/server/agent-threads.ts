import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { spawn } from 'node:child_process';
import { normalizePathInput } from '$lib/server/path-tools';
import { resolveTaskThreadName } from '$lib/server/task-threads';
import { deriveThreadCategorization } from '$lib/server/task-thread-topics';
import { listCodexStateThreadRows } from '$lib/server/codex-state-db';
import {
	isAgentThreadsSqliteEmpty,
	loadAgentThreadsFromSqlite,
	saveAgentThreadsToSqlite
} from '$lib/server/db/agent-threads-store';
import {
	getCodexSkillExecutionIssue,
	getWorkspaceExecutionIssue,
	normalizeAdditionalWritableRoots
} from '$lib/server/task-execution-workspace';
import {
	buildThreadAttachmentPrompt,
	persistThreadAttachments
} from '$lib/server/agent-thread-attachments';
import {
	AGENT_SANDBOX_OPTIONS,
	AGENT_THREAD_CONTACT_STATUS_OPTIONS,
	AGENT_THREAD_CONTACT_TYPE_OPTIONS,
	formatAgentThreadContactTypeLabel,
	type AgentRun,
	type AgentRunDetail,
	type AgentRunStatus,
	type AgentThreadAttachment,
	type AgentThreadContactContextItem,
	type AgentThreadTaskLink,
	type AgentThreadContactType,
	type AgentThreadState,
	type AgentRunState,
	type AgentSandbox,
	type AgentThread,
	type AgentThreadContact,
	type AgentThreadDetail,
	type AgentThreadOrigin,
	type AgentTimelineStep,
	type AgentThreadsDb
} from '$lib/types/agent-thread';
import { loadControlPlane, updateControlPlane } from '$lib/server/control-plane';
import type { Area, ControlPlaneData, RunStatus, TaskStatus } from '$lib/types/control-plane';

const AGENT_THREADS_DB_FILE = resolve(process.cwd(), 'data', 'agent-threads.json');
const AGENT_THREADS_ROOT = resolve(process.cwd(), 'data', 'agent-threads');
const THREAD_RUNNER_SCRIPT = resolve(process.cwd(), 'scripts', 'agent-thread-runner.mjs');
const CODEX_HOME = process.env.CODEX_HOME?.trim() || resolve(homedir(), '.codex');
const CODEX_STATE_DB_FILE = resolve(CODEX_HOME, 'state_5.sqlite');
const STALE_RUN_GRACE_MS = 5 * 60 * 1000;
const STARTUP_AUTH_FAILURE_GRACE_MS = 30 * 1000;
const STARTUP_STDIN_STALL_GRACE_MS = 60 * 1000;
const NATIVE_THREAD_CACHE_TTL_MS = 3_000;
const AUTH_REFRESH_FAILURE_MARKER = 'Auth(TokenRefreshFailed("Failed to parse server response"))';
const STDIN_WAIT_MARKER = 'Reading additional input from stdin...';

let nativeThreadCache: {
	expiresAt: number;
	threads: NativeCodexThread[];
} | null = null;

function defaultDb(): AgentThreadsDb {
	return {
		threads: [],
		runs: [],
		contacts: []
	};
}

function isAgentSandbox(value: string): value is AgentSandbox {
	return AGENT_SANDBOX_OPTIONS.includes(value as AgentSandbox);
}

function isAgentThreadContactType(value: string): value is AgentThreadContactType {
	return AGENT_THREAD_CONTACT_TYPE_OPTIONS.includes(value as AgentThreadContactType);
}

function isAgentThreadContactStatus(value: string): value is AgentThreadContact['status'] {
	return AGENT_THREAD_CONTACT_STATUS_OPTIONS.includes(value as AgentThreadContact['status']);
}

function normalizeAgentThreadContactContextItems(items: unknown): AgentThreadContactContextItem[] {
	if (!Array.isArray(items)) {
		return [];
	}

	return items
		.filter((item) => Boolean(item) && typeof item === 'object')
		.map((item, index) => {
			const candidate = item as Partial<AgentThreadContactContextItem>;
			const id =
				typeof candidate.id === 'string' && candidate.id.trim()
					? candidate.id.trim()
					: `context_item_${index + 1}`;
			const kind =
				candidate.kind === 'task' ||
				candidate.kind === 'run' ||
				candidate.kind === 'thread_attachment' ||
				candidate.kind === 'task_artifact'
					? candidate.kind
					: 'task_artifact';
			const label =
				typeof candidate.label === 'string' && candidate.label.trim()
					? candidate.label.trim()
					: 'Shared context';
			const detail =
				typeof candidate.detail === 'string' && candidate.detail.trim()
					? candidate.detail.trim()
					: '';
			const path =
				typeof candidate.path === 'string' && candidate.path.trim() ? candidate.path.trim() : null;
			const href =
				typeof candidate.href === 'string' && candidate.href.trim() ? candidate.href.trim() : null;

			return { id, kind, label, detail, path, href } satisfies AgentThreadContactContextItem;
		})
		.filter(
			(item, index, normalized) =>
				normalized.findIndex((candidate) => candidate.id === item.id) === index
		);
}

function getAgentThreadsStorageBackend() {
	return process.env.APP_STORAGE_BACKEND?.trim() === 'json' ? 'json' : 'sqlite';
}

async function ensureAgentThreadsDb() {
	try {
		await readFile(AGENT_THREADS_DB_FILE, 'utf8');
	} catch {
		await mkdir(resolve(process.cwd(), 'data'), { recursive: true });
		await writeFile(AGENT_THREADS_DB_FILE, JSON.stringify(defaultDb(), null, 2));
	}
}

function normalizeAgentThreadsDb(parsed: Partial<AgentThreadsDb>): AgentThreadsDb {
	const storedThreads = Array.isArray(parsed.threads) ? parsed.threads : [];
	const storedRuns = Array.isArray(parsed.runs) ? parsed.runs : [];
	const storedContacts = Array.isArray(parsed.contacts) ? parsed.contacts : [];

	return {
		threads: storedThreads
			.filter((session) => Boolean(session) && typeof session === 'object')
			.map((session) => {
				const candidate = session as Partial<AgentThread>;
				const cwd = typeof candidate.cwd === 'string' ? normalizePathInput(candidate.cwd) : '';

				return {
					...candidate,
					id: typeof candidate.id === 'string' ? candidate.id : createAgentThreadId(),
					name: typeof candidate.name === 'string' ? candidate.name : 'Untitled thread',
					cwd,
					handleAlias:
						typeof candidate.handleAlias === 'string' && candidate.handleAlias.trim()
							? normalizeAgentThreadHandleAlias(candidate.handleAlias)
							: null,
					additionalWritableRoots: normalizeAdditionalWritableRoots(
						cwd,
						Array.isArray(candidate.additionalWritableRoots)
							? candidate.additionalWritableRoots
							: []
					),
					sandbox: parseAgentSandbox(candidate.sandbox, 'workspace-write'),
					model:
						typeof candidate.model === 'string' && candidate.model.trim() ? candidate.model : null,
					threadId:
						typeof candidate.threadId === 'string' && candidate.threadId.trim()
							? candidate.threadId
							: null,
					attachments: Array.isArray(candidate.attachments)
						? candidate.attachments
								.filter((attachment) => Boolean(attachment) && typeof attachment === 'object')
								.map((attachment) => {
									const item = attachment as Partial<AgentThreadAttachment>;

									return {
										id:
											typeof item.id === 'string' && item.id.trim()
												? item.id
												: `thread_attachment_${randomUUID()}`,
										name:
											typeof item.name === 'string' && item.name.trim() ? item.name : 'Attachment',
										path: typeof item.path === 'string' ? normalizePathInput(item.path) : '',
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
						typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString()
				};
			}),
		runs: storedRuns
			.filter((run) => Boolean(run) && typeof run === 'object')
			.map((run) => {
				const candidate = run as Partial<AgentRun>;

				return {
					...candidate,
					id: typeof candidate.id === 'string' ? candidate.id : createRunId(),
					agentThreadId: typeof candidate.agentThreadId === 'string' ? candidate.agentThreadId : '',
					mode: candidate.mode === 'start' ? 'start' : 'message',
					prompt: typeof candidate.prompt === 'string' ? candidate.prompt : '',
					requestedThreadId:
						typeof candidate.requestedThreadId === 'string' && candidate.requestedThreadId.trim()
							? candidate.requestedThreadId
							: null,
					sourceAgentThreadId:
						typeof candidate.sourceAgentThreadId === 'string' &&
						candidate.sourceAgentThreadId.trim()
							? candidate.sourceAgentThreadId
							: null,
					sourceAgentThreadName:
						typeof candidate.sourceAgentThreadName === 'string' &&
						candidate.sourceAgentThreadName.trim()
							? candidate.sourceAgentThreadName
							: null,
					contactId:
						typeof candidate.contactId === 'string' && candidate.contactId.trim()
							? candidate.contactId
							: null,
					replyToContactId:
						typeof candidate.replyToContactId === 'string' && candidate.replyToContactId.trim()
							? candidate.replyToContactId
							: null,
					createdAt:
						typeof candidate.createdAt === 'string'
							? candidate.createdAt
							: new Date().toISOString(),
					updatedAt:
						typeof candidate.updatedAt === 'string'
							? candidate.updatedAt
							: new Date().toISOString(),
					logPath: typeof candidate.logPath === 'string' ? candidate.logPath : '',
					statePath: typeof candidate.statePath === 'string' ? candidate.statePath : '',
					messagePath: typeof candidate.messagePath === 'string' ? candidate.messagePath : '',
					configPath: typeof candidate.configPath === 'string' ? candidate.configPath : ''
				} satisfies AgentRun;
			}),
		contacts: storedContacts
			.filter((contact) => Boolean(contact) && typeof contact === 'object')
			.map((contact) => {
				const candidate = contact as Partial<AgentThreadContact>;
				const createdAt =
					typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString();

				return {
					id:
						typeof candidate.id === 'string' && candidate.id.trim()
							? candidate.id
							: createContactId(),
					sourceAgentThreadId:
						typeof candidate.sourceAgentThreadId === 'string' ? candidate.sourceAgentThreadId : '',
					sourceAgentThreadName:
						typeof candidate.sourceAgentThreadName === 'string'
							? candidate.sourceAgentThreadName
							: 'Unknown source thread',
					targetAgentThreadId:
						typeof candidate.targetAgentThreadId === 'string' ? candidate.targetAgentThreadId : '',
					targetAgentThreadName:
						typeof candidate.targetAgentThreadName === 'string'
							? candidate.targetAgentThreadName
							: 'Unknown target thread',
					contactType:
						typeof candidate.contactType === 'string' &&
						isAgentThreadContactType(candidate.contactType)
							? candidate.contactType
							: 'question',
					contextSummary:
						typeof candidate.contextSummary === 'string' && candidate.contextSummary.trim()
							? candidate.contextSummary.trim()
							: null,
					contextItems: normalizeAgentThreadContactContextItems(candidate.contextItems),
					prompt: typeof candidate.prompt === 'string' ? candidate.prompt : '',
					replyRequested: candidate.replyRequested !== false,
					replyToContactId:
						typeof candidate.replyToContactId === 'string' && candidate.replyToContactId.trim()
							? candidate.replyToContactId
							: null,
					status:
						typeof candidate.status === 'string' && isAgentThreadContactStatus(candidate.status)
							? candidate.status
							: candidate.replyRequested !== false
								? 'awaiting_reply'
								: 'sent',
					resolvedByContactId:
						typeof candidate.resolvedByContactId === 'string' &&
						candidate.resolvedByContactId.trim()
							? candidate.resolvedByContactId
							: null,
					targetRunId:
						typeof candidate.targetRunId === 'string' && candidate.targetRunId.trim()
							? candidate.targetRunId
							: null,
					createdAt,
					updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : createdAt
				} satisfies AgentThreadContact;
			})
	};
}

function parseAgentThreadsDb(raw: string) {
	try {
		return normalizeAgentThreadsDb(JSON.parse(raw) as Partial<AgentThreadsDb>);
	} catch {
		return defaultDb();
	}
}

async function loadAgentThreadsDbFromJson() {
	await ensureAgentThreadsDb();
	return parseAgentThreadsDb(await readFile(AGENT_THREADS_DB_FILE, 'utf8'));
}

async function readAgentThreadsJsonIfPresent() {
	if (!existsSync(AGENT_THREADS_DB_FILE)) {
		return null;
	}

	try {
		return parseAgentThreadsDb(await readFile(AGENT_THREADS_DB_FILE, 'utf8'));
	} catch {
		return defaultDb();
	}
}

async function ensureAgentThreadsSqliteSeeded() {
	if (!isAgentThreadsSqliteEmpty()) {
		return;
	}

	const seed = (await readAgentThreadsJsonIfPresent()) ?? defaultDb();
	saveAgentThreadsToSqlite(seed);
}

export async function loadAgentThreadsDb(): Promise<AgentThreadsDb> {
	if (getAgentThreadsStorageBackend() === 'sqlite') {
		await ensureAgentThreadsSqliteSeeded();
		return normalizeAgentThreadsDb(loadAgentThreadsFromSqlite());
	}

	return loadAgentThreadsDbFromJson();
}

async function saveAgentThreadsDb(data: AgentThreadsDb) {
	if (getAgentThreadsStorageBackend() === 'sqlite') {
		saveAgentThreadsToSqlite(data);
		return;
	}

	await mkdir(resolve(process.cwd(), 'data'), { recursive: true });
	await writeFile(AGENT_THREADS_DB_FILE, JSON.stringify(data, null, 2));
}

async function updateAgentThreadsDb(
	updater: (data: AgentThreadsDb) => AgentThreadsDb | Promise<AgentThreadsDb>
) {
	const current = await loadAgentThreadsDb();
	const next = await updater(current);
	await saveAgentThreadsDb(next);
	return next;
}

function createAgentThreadId() {
	return `thread_${randomUUID()}`;
}

function createRunId() {
	return `run_${randomUUID()}`;
}

function createContactId() {
	return `contact_${randomUUID()}`;
}

function compactThreadContactText(value: string, maxLength: number) {
	const normalized = normalizeMessageText(value);

	if (normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function summarizeSourceThreadTasks(detail: Pick<AgentThreadDetail, 'relatedTasks'>) {
	const primaryTask =
		detail.relatedTasks.find((task) => task.isPrimary) ?? detail.relatedTasks[0] ?? null;

	if (!primaryTask) {
		return '';
	}

	const otherTaskCount = Math.max(detail.relatedTasks.length - 1, 0);

	return otherTaskCount > 0
		? `${primaryTask.title} (+${otherTaskCount} more linked task${otherTaskCount === 1 ? '' : 's'})`
		: primaryTask.title;
}

export function buildAgentThreadContactPrompt(input: {
	sourceThread: Pick<
		AgentThreadDetail,
		'id' | 'name' | 'threadSummary' | 'relatedTasks' | 'latestRun'
	>;
	prompt: string;
	contactType?: AgentThreadContactType;
	contextSummary?: string | null;
	contextItems?: AgentThreadContactContextItem[];
	contactId?: string | null;
	replyRequested?: boolean;
	replyToContactId?: string | null;
}) {
	const sourceContext =
		input.sourceThread.latestRun?.lastMessage?.trim() ||
		input.sourceThread.latestRun?.prompt?.trim() ||
		'';
	const linkedTaskSummary = summarizeSourceThreadTasks(input.sourceThread);
	const contextBundleLines = (input.contextItems ?? []).map((item) =>
		[
			`- ${item.label} [${item.kind}]`,
			item.detail ? `  ${compactThreadContactText(item.detail, 220)}` : '',
			item.path ? `  Path: ${item.path}` : ''
		]
			.filter(Boolean)
			.join('\n')
	);
	const sections = [
		'Another agent thread is contacting you for coordination.',
		`Source thread: ${input.sourceThread.name} (${input.sourceThread.id})`,
		`Coordination type: ${formatAgentThreadContactTypeLabel(input.contactType ?? 'question')}`,
		linkedTaskSummary ? `Linked task context: ${linkedTaskSummary}` : '',
		input.sourceThread.threadSummary.trim()
			? `Source thread status: ${compactThreadContactText(input.sourceThread.threadSummary, 280)}`
			: '',
		input.contextSummary?.trim()
			? `Focused context note:\n${compactThreadContactText(input.contextSummary, 420)}`
			: '',
		contextBundleLines.length > 0
			? `Explicit context bundle:\n${contextBundleLines.join('\n')}`
			: '',
		sourceContext
			? `Latest saved context from the source thread:\n${compactThreadContactText(sourceContext, 900)}`
			: '',
		input.contactId ? `Contact id: ${input.contactId}` : '',
		input.replyToContactId ? `Replying to contact: ${input.replyToContactId}` : '',
		`Requested help:\n${normalizeMessageText(input.prompt)}`,
		input.replyRequested
			? `Reply in this thread with the instructions, context, assignment, or answer the source thread needs. If you need to send a message back, contact source thread ${input.sourceThread.id} and set replyToContactId=${input.contactId ?? '<contactId>'}.`
			: `Reply in this thread with the instructions, context, assignment, or answer the source thread needs. Reference source thread ${input.sourceThread.id} when that handoff context matters.`
	].filter(Boolean);

	return sections.join('\n\n');
}

function getRunPaths(agentThreadId: string, runId: string) {
	const runDir = resolve(AGENT_THREADS_ROOT, agentThreadId, 'runs', runId);

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
	tasks: TaskContextTask[];
	tasksById: Map<string, TaskContextTask>;
	relatedTaskLinksByThreadId: Map<string, AgentThreadTaskLink[]>;
};

type TaskContextTask = {
	id: string;
	title: string;
	summary: string;
	projectId: string;
	area: Area;
	goalId: string;
	goalName: string | null;
	status: TaskStatus;
	projectName: string | null;
	desiredRole: string | null;
	requiredCapabilityNames: string[];
	requiredToolNames: string[];
	agentThreadId: string | null;
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
		agentThreadId: input.thread.id,
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
	const now = Date.now();

	if (nativeThreadCache && nativeThreadCache.expiresAt > now) {
		return nativeThreadCache.threads;
	}

	const rows = listCodexStateThreadRows(CODEX_STATE_DB_FILE);
	const threads = rows
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

	nativeThreadCache = {
		expiresAt: now + NATIVE_THREAD_CACHE_TTL_MS,
		threads
	};

	return threads;
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

function materializeNativeThread(thread: NativeCodexThread): AgentThread {
	return {
		id: thread.id,
		name: thread.name,
		cwd: thread.cwd,
		additionalWritableRoots: [],
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
	session: AgentThread;
	run: AgentRun;
	threadId: string | null;
}) {
	const config = {
		codexBin: getConfiguredCodexBin(),
		agentThreadId: input.session.id,
		runId: input.run.id,
		mode: input.run.mode,
		cwd: input.session.cwd,
		additionalWritableRoots: input.session.additionalWritableRoots ?? [],
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
	const child = spawn(process.execPath, [THREAD_RUNNER_SCRIPT, configPath], {
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

function getThreadSummary(detail: {
	threadState: AgentThreadState;
	latestRunStatus: AgentRunStatus | 'idle';
	hasActiveRun: boolean;
	canResume: boolean;
	lastMessage: string | null;
	threadId: string | null;
}) {
	switch (detail.threadState) {
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

async function buildRunDetail(
	run: AgentRun,
	options: {
		includePrompt?: boolean;
		logTailLineCount?: number;
	} = {}
): Promise<AgentRunDetail> {
	const [state, lastMessage, logTail, stateUpdatedAt, messageUpdatedAt, logUpdatedAt] =
		await Promise.all([
			readRunState(run.statePath),
			readOptionalText(run.messagePath),
			readLogTail(run.logPath, options.logTailLineCount ?? 80),
			readOptionalTimestamp(run.statePath),
			readOptionalTimestamp(run.messagePath),
			readOptionalTimestamp(run.logPath)
		]);

	const detail = {
		...run,
		prompt: options.includePrompt === false ? '' : run.prompt,
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

function isActiveRunStatus(status: AgentRunStatus | null | undefined) {
	return status === 'queued' || status === 'running';
}

function getDerivedRunFinishedAt(
	run: Pick<AgentRunDetail, 'activityAt' | 'createdAt' | 'updatedAt' | 'state'>,
	now = Date.now()
) {
	return (
		latestIso([
			run.activityAt,
			run.state?.finishedAt,
			run.updatedAt,
			run.state?.startedAt,
			run.createdAt
		]) ?? new Date(now).toISOString()
	);
}

function parseExitLogLine(line: string) {
	const match = line.match(/^=== EXIT code=(.+?) signal=(.+?) ===$/);

	if (!match) {
		return null;
	}

	const [, rawCode, rawSignal] = match;
	const exitCode = rawCode === 'null' ? null : Number(rawCode);
	const signal = rawSignal === 'null' ? null : rawSignal;

	return {
		exitCode: Number.isFinite(exitCode) ? exitCode : null,
		signal
	};
}

function getRunExitInfo(run: Pick<AgentRunDetail, 'logTail'>) {
	for (const line of [...run.logTail].reverse()) {
		const parsed = parseExitLogLine(line.trim());

		if (parsed) {
			return parsed;
		}
	}

	return null;
}

function hasStructuredCodexOutput(run: Pick<AgentRunDetail, 'logTail'>) {
	return run.logTail.some((line) => line.trim().startsWith('{'));
}

function hasThreadStarted(run: Pick<AgentRunDetail, 'logTail' | 'state'>) {
	return Boolean(
		run.state?.codexThreadId ||
		run.logTail.some((line) => Boolean(extractThreadIdFromOutputLine(line.trim())))
	);
}

function hasAuthRefreshStartupFailure(run: Pick<AgentRunDetail, 'logTail'>) {
	return run.logTail.some((line) => line.includes(AUTH_REFRESH_FAILURE_MARKER));
}

function hasStartupStdinWait(run: Pick<AgentRunDetail, 'logTail'>) {
	return run.logTail.some((line) => line.includes(STDIN_WAIT_MARKER));
}

function isStartupAuthFailure(
	run: Pick<
		AgentRunDetail,
		'activityAt' | 'createdAt' | 'updatedAt' | 'state' | 'logTail' | 'lastMessage' | 'mode'
	>,
	now = Date.now()
) {
	if (run.mode !== 'start' || !hasAuthRefreshStartupFailure(run)) {
		return false;
	}

	if (run.lastMessage || hasStructuredCodexOutput(run) || hasThreadStarted(run)) {
		return false;
	}

	const hasTerminalEvidence = Boolean(run.state?.finishedAt || getRunExitInfo(run));

	if (hasTerminalEvidence) {
		return true;
	}

	const activityAt = Date.parse(getRunActivityAt(run));

	if (Number.isNaN(activityAt)) {
		return false;
	}

	return now - activityAt >= STARTUP_AUTH_FAILURE_GRACE_MS;
}

function isStartupStdinStall(
	run: Pick<
		AgentRunDetail,
		'activityAt' | 'createdAt' | 'updatedAt' | 'state' | 'logTail' | 'lastMessage'
	>,
	now = Date.now()
) {
	if (!hasStartupStdinWait(run)) {
		return false;
	}

	if (run.lastMessage || hasStructuredCodexOutput(run) || hasThreadStarted(run)) {
		return false;
	}

	const activityAt = Date.parse(getRunActivityAt(run));

	if (Number.isNaN(activityAt)) {
		return false;
	}

	return now - activityAt >= STARTUP_STDIN_STALL_GRACE_MS;
}

function isPidAlive(pid: number) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		const code = typeof error === 'object' && error && 'code' in error ? error.code : null;

		if (code === 'ESRCH') {
			return false;
		}

		return true;
	}
}

function deriveActiveRunCompletionFromEvidence(run: AgentRunDetail, now = Date.now()) {
	if (!run.state || !isActiveRunStatus(run.state.status)) {
		return null;
	}

	const finishedAt = getDerivedRunFinishedAt(run, now);
	const startupAuthFailure = isStartupAuthFailure(run, now);
	const startupStdinStall = isStartupStdinStall(run, now);
	const exitInfo = getRunExitInfo(run);
	const withinStartupGraceWindow =
		(run.mode === 'start' && hasAuthRefreshStartupFailure(run) && !startupAuthFailure) ||
		(run.mode === 'start' && hasStartupStdinWait(run) && !startupStdinStall);

	if (startupAuthFailure) {
		return {
			...run.state,
			status: 'failed',
			pid: null,
			finishedAt,
			exitCode: run.state.exitCode ?? exitInfo?.exitCode ?? -1,
			signal: exitInfo?.signal ?? null
		} satisfies AgentRunState;
	}

	if (startupStdinStall) {
		return {
			...run.state,
			status: 'failed',
			pid: null,
			finishedAt,
			exitCode: run.state.exitCode ?? exitInfo?.exitCode ?? -1,
			signal: exitInfo?.signal ?? null
		} satisfies AgentRunState;
	}

	if (exitInfo) {
		return {
			...run.state,
			status:
				exitInfo.signal === 'SIGTERM'
					? ('canceled' as const)
					: exitInfo.exitCode === 0
						? ('completed' as const)
						: ('failed' as const),
			pid: null,
			finishedAt,
			exitCode: exitInfo.exitCode,
			signal: exitInfo.signal
		} satisfies AgentRunState;
	}

	if (
		typeof run.state.pid === 'number' &&
		Number.isFinite(run.state.pid) &&
		!isPidAlive(run.state.pid) &&
		!withinStartupGraceWindow
	) {
		return {
			...run.state,
			status: run.lastMessage ? 'completed' : 'failed',
			pid: null,
			finishedAt,
			exitCode: run.state.exitCode ?? (run.lastMessage ? 0 : -1),
			signal: null
		} satisfies AgentRunState;
	}

	return null;
}

function isStaleActiveRun(run: AgentRunDetail, now = Date.now()) {
	const state = run.state;

	if (!state || !isActiveRunStatus(state.status)) {
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
	if (!run.state) {
		return run.state;
	}

	const completedFromEvidence = deriveActiveRunCompletionFromEvidence(run, now);

	if (completedFromEvidence) {
		return completedFromEvidence;
	}

	if (!isStaleActiveRun(run, now)) {
		return run.state;
	}

	return {
		...run.state,
		status: 'failed',
		finishedAt: getDerivedRunFinishedAt(run, now),
		exitCode: run.state.exitCode ?? -1,
		signal: null
	} satisfies AgentRunState;
}

function getDiscoveredThreadId(session: AgentThread, runs: AgentRunDetail[]) {
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

function getThreadState(detail: {
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
	agentThreadId: string,
	taskContext: TaskContext
): AgentThreadTaskLink[] {
	return taskContext.relatedTaskLinksByThreadId.get(agentThreadId) ?? [];
}

function buildStandardizedManagedThreadName(
	session: AgentThread,
	taskContext: TaskContext,
	relatedTasks: AgentThreadTaskLink[]
) {
	const primaryRelatedTask = relatedTasks.find((task) => task.isPrimary) ?? relatedTasks[0] ?? null;
	const primaryTask = primaryRelatedTask
		? (taskContext.tasksById.get(primaryRelatedTask.id) ?? null)
		: null;

	return resolveTaskThreadName({
		currentName: session.name,
		projectName: primaryTask?.projectName ?? null,
		taskName: primaryTask?.title ?? null,
		taskId: primaryTask?.id ?? null
	});
}

function normalizeThreadHandleSegment(value: string | null | undefined) {
	return (value ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function normalizeAgentThreadHandleAlias(value: string | null | undefined) {
	return (value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9.-]+/g, '-')
		.replace(/\.{2,}/g, '.')
		.replace(/-{2,}/g, '-')
		.replace(/\.-|-\./g, '.')
		.replace(/^[.-]+|[.-]+$/g, '');
}

function getPrimaryRelatedTask(relatedTasks: AgentThreadTaskLink[]) {
	return relatedTasks.find((task) => task.isPrimary) ?? relatedTasks[0] ?? null;
}

export function buildAgentThreadHandle(input: {
	threadId: string;
	cwd: string;
	handleAlias?: string | null;
	relatedTasks: AgentThreadTaskLink[];
	categorization: AgentThreadDetail['categorization'] | null;
}) {
	const aliasedHandle = normalizeAgentThreadHandleAlias(input.handleAlias);

	if (aliasedHandle) {
		return aliasedHandle;
	}

	const primaryTask = getPrimaryRelatedTask(input.relatedTasks);
	const roleSegment = normalizeThreadHandleSegment(
		input.categorization?.roleLabels[0] ?? 'general'
	);
	const projectSegment =
		normalizeThreadHandleSegment(input.categorization?.projectLabels[0]) ||
		normalizeThreadHandleSegment(basename(input.cwd)) ||
		'workspace';
	const taskSegment =
		normalizeThreadHandleSegment(primaryTask?.id) ||
		normalizeThreadHandleSegment(input.threadId) ||
		'thread';

	return [roleSegment || 'general', projectSegment, taskSegment].join('.');
}

export function buildAgentThreadContactLabel(input: {
	handle: string;
	threadState: AgentThreadState;
	relatedTasks: AgentThreadTaskLink[];
	categorization: AgentThreadDetail['categorization'] | null;
}) {
	const primaryTask = getPrimaryRelatedTask(input.relatedTasks);
	const roleLabel = input.categorization?.roleLabels[0]?.trim() ?? '';
	const projectLabel = input.categorization?.projectLabels[0]?.trim() ?? '';
	const parts = [roleLabel, primaryTask?.id ?? projectLabel, input.threadState].filter(Boolean);

	return parts.length > 0 ? parts.join(' · ') : input.handle;
}

function normalizeThreadRoutingTerm(value: string | null | undefined) {
	return (value ?? '').trim().toLowerCase();
}

function normalizeThreadRoutingTerms(values: Array<string | null | undefined>) {
	return [...new Set(values.map((value) => normalizeThreadRoutingTerm(value)).filter(Boolean))];
}

function buildThreadRoutingTerms(thread: AgentThreadDetail) {
	return normalizeThreadRoutingTerms([
		thread.id,
		thread.name,
		thread.handle,
		thread.contactLabel,
		thread.threadSummary,
		thread.cwd,
		basename(thread.cwd),
		...thread.relatedTasks.flatMap((task) => [task.id, task.title]),
		...(thread.categorization?.projectIds ?? []),
		...(thread.categorization?.projectLabels ?? []),
		...(thread.categorization?.goalIds ?? []),
		...(thread.categorization?.goalLabels ?? []),
		...(thread.categorization?.roleLabels ?? []),
		...(thread.categorization?.capabilityLabels ?? []),
		...(thread.categorization?.toolLabels ?? []),
		...(thread.categorization?.keywordLabels ?? [])
	]);
}

function buildThreadRoleTerms(thread: AgentThreadDetail) {
	return normalizeThreadRoutingTerms([
		...(thread.categorization?.roleLabels ?? []),
		thread.handle?.split('.')[0] ?? null
	]);
}

function buildThreadProjectTerms(thread: AgentThreadDetail) {
	return normalizeThreadRoutingTerms([
		...(thread.categorization?.projectIds ?? []),
		...(thread.categorization?.projectLabels ?? []),
		basename(thread.cwd),
		thread.handle?.split('.')[1] ?? null
	]);
}

function buildThreadGoalTerms(thread: AgentThreadDetail) {
	return normalizeThreadRoutingTerms([
		...(thread.categorization?.goalIds ?? []),
		...(thread.categorization?.goalLabels ?? [])
	]);
}

function buildThreadTaskTerms(thread: AgentThreadDetail) {
	return normalizeThreadRoutingTerms([
		...thread.relatedTasks.flatMap((task) => [task.id, task.title]),
		thread.handle?.split('.')[2] ?? null
	]);
}

function doesThreadMatchRoutingTerm(terms: string[], query: string) {
	return terms.some((term) => term === query || term.includes(query) || query.includes(term));
}

function intersectThreadRoutingTerms(left: string[], right: string[]) {
	const rightTerms = new Set(right);

	return left.filter((term) => rightTerms.has(term));
}

function canThreadAcceptContact(thread: AgentThreadDetail) {
	return !thread.archivedAt && !thread.hasActiveRun && thread.canResume;
}

export function getAgentThreadContactAvailability(thread: AgentThreadDetail) {
	if (thread.archivedAt) {
		return {
			canContact: false,
			disabledReason: 'Archived threads cannot receive cross-thread contact requests.'
		};
	}

	if (thread.hasActiveRun) {
		return {
			canContact: false,
			disabledReason: 'Wait for the active run to finish before contacting this thread.'
		};
	}

	if (!thread.canResume) {
		return {
			canContact: false,
			disabledReason: 'This thread cannot accept a follow-up right now.'
		};
	}

	return {
		canContact: true,
		disabledReason: ''
	};
}

function formatThreadRoutingValue(value: string | null | undefined) {
	const normalized = (value ?? '').trim();

	return normalized.length > 0 ? normalized : null;
}

export function rankAgentThreadsForRouting(
	threads: AgentThreadDetail[],
	options: {
		q?: string | null;
		role?: string | null;
		project?: string | null;
		taskId?: string | null;
		sourceThreadId?: string | null;
		canContact?: boolean;
		limit?: number | null;
	} = {}
): AgentThreadDetail[] {
	const normalizedQuery = normalizeThreadRoutingTerm(options.q);
	const normalizedRole = normalizeThreadRoutingTerm(options.role);
	const normalizedProject = normalizeThreadRoutingTerm(options.project);
	const normalizedTaskId = normalizeThreadRoutingTerm(options.taskId);
	const normalizedSourceThreadId = normalizeThreadRoutingTerm(options.sourceThreadId);
	const sourceThread =
		normalizedSourceThreadId.length > 0
			? (threads.find(
					(thread) => normalizeThreadRoutingTerm(thread.id) === normalizedSourceThreadId
				) ?? null)
			: null;

	const rankedThreads = threads
		.filter((thread) =>
			normalizedSourceThreadId.length > 0
				? normalizeThreadRoutingTerm(thread.id) !== normalizedSourceThreadId
				: true
		)
		.filter((thread) => (options.canContact ? canThreadAcceptContact(thread) : true))
		.flatMap((thread): AgentThreadDetail[] => {
			const roleTerms = buildThreadRoleTerms(thread);
			const projectTerms = buildThreadProjectTerms(thread);
			const goalTerms = buildThreadGoalTerms(thread);
			const taskTerms = buildThreadTaskTerms(thread);
			const searchTerms = buildThreadRoutingTerms(thread);

			if (normalizedRole && !doesThreadMatchRoutingTerm(roleTerms, normalizedRole)) {
				return [];
			}

			if (normalizedProject && !doesThreadMatchRoutingTerm(projectTerms, normalizedProject)) {
				return [];
			}

			if (normalizedTaskId && !doesThreadMatchRoutingTerm(taskTerms, normalizedTaskId)) {
				return [];
			}

			if (normalizedQuery && !doesThreadMatchRoutingTerm(searchTerms, normalizedQuery)) {
				return [];
			}

			let routingScore = 0;
			const reasons: Array<{ score: number; text: string }> = [];
			const addReason = (score: number, text: string | null | undefined) => {
				if (!text) {
					return;
				}

				routingScore += score;
				reasons.push({ score, text });
			};

			if (normalizedTaskId) {
				addReason(
					120,
					`Linked to task ${formatThreadRoutingValue(
						thread.relatedTasks.find((task) =>
							doesThreadMatchRoutingTerm(
								normalizeThreadRoutingTerms([task.id, task.title]),
								normalizedTaskId
							)
						)?.id ?? options.taskId
					)}`
				);
			}

			if (normalizedProject) {
				addReason(
					80,
					`Matches project ${formatThreadRoutingValue(
						thread.categorization?.projectLabels[0] ??
							thread.categorization?.projectIds[0] ??
							basename(thread.cwd) ??
							options.project
					)}`
				);
			}

			if (normalizedRole) {
				addReason(
					60,
					`Matches role ${formatThreadRoutingValue(
						thread.categorization?.roleLabels[0] ?? options.role
					)}`
				);
			}

			if (normalizedQuery) {
				addReason(
					30,
					`Matches search ${JSON.stringify(formatThreadRoutingValue(options.q) ?? options.q ?? '')}`
				);
			}

			if (sourceThread) {
				const sharedProject =
					intersectThreadRoutingTerms(projectTerms, buildThreadProjectTerms(sourceThread))[0] ??
					null;
				const sharedRole =
					intersectThreadRoutingTerms(roleTerms, buildThreadRoleTerms(sourceThread))[0] ?? null;
				const sharedGoal =
					intersectThreadRoutingTerms(goalTerms, buildThreadGoalTerms(sourceThread))[0] ?? null;

				if (sharedProject) {
					addReason(
						45,
						`Shares project ${formatThreadRoutingValue(
							thread.categorization?.projectLabels[0] ??
								sourceThread.categorization?.projectLabels[0] ??
								sharedProject
						)}`
					);
				}

				if (sharedRole) {
					addReason(
						30,
						`Shares role ${formatThreadRoutingValue(
							thread.categorization?.roleLabels.find(
								(label) => normalizeThreadRoutingTerm(label) === sharedRole
							) ??
								sourceThread.categorization?.roleLabels.find(
									(label) => normalizeThreadRoutingTerm(label) === sharedRole
								) ??
								sharedRole
						)}`
					);
				}

				if (sharedGoal) {
					addReason(
						20,
						`Shares goal ${formatThreadRoutingValue(
							thread.categorization?.goalLabels[0] ??
								sourceThread.categorization?.goalLabels[0] ??
								sharedGoal
						)}`
					);
				}
			}

			if (canThreadAcceptContact(thread)) {
				addReason(10, 'Can accept contact now');
			} else {
				routingScore -= 15;
			}

			const routingReason = reasons
				.sort((left, right) => right.score - left.score)
				.slice(0, 2)
				.map((reason) => reason.text)
				.join('; ');

			return [
				{
					...thread,
					routingScore,
					routingReason
				} satisfies AgentThreadDetail
			];
		})
		.sort((left, right) => {
			if ((right.routingScore ?? 0) !== (left.routingScore ?? 0)) {
				return (right.routingScore ?? 0) - (left.routingScore ?? 0);
			}

			if (canThreadAcceptContact(left) !== canThreadAcceptContact(right)) {
				return canThreadAcceptContact(left) ? -1 : 1;
			}

			const leftActivity = left.lastActivityAt ?? left.updatedAt;
			const rightActivity = right.lastActivityAt ?? right.updatedAt;

			if (rightActivity !== leftActivity) {
				return rightActivity.localeCompare(leftActivity);
			}

			return left.name.localeCompare(right.name);
		});

	if (options.limit && options.limit > 0) {
		return rankedThreads.slice(0, options.limit);
	}

	return rankedThreads;
}

function finalizeThreadDetail(input: {
	session: AgentThread;
	runDetails: AgentRunDetail[];
	runCount?: number;
	includeCategorization?: boolean;
	includeRunHistory?: boolean;
	taskContext: TaskContext;
	origin: AgentThreadOrigin;
	threadSummaryOverride?: string | null;
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
			? buildStandardizedManagedThreadName(input.session, input.taskContext, relatedTasks)
			: input.session.name;
	const threadState = getThreadState({
		latestRunStatus,
		canResume,
		hasActiveRun: hasActive,
		lastMessage: latestRun?.lastMessage ?? null,
		threadId
	});
	const threadSummary =
		input.threadSummaryOverride ??
		getThreadSummary({
			threadState,
			latestRunStatus,
			hasActiveRun: hasActive,
			canResume,
			lastMessage: latestRun?.lastMessage ?? null,
			threadId
		});
	const categorization =
		input.includeCategorization === false
			? null
			: deriveThreadCategorization({
					threadName: name,
					threadSummary: threadSummary,
					runDetails: input.runDetails.map((run) => ({
						prompt: run.prompt,
						lastMessage: run.lastMessage
					})),
					relatedTasks: relatedTasks
						.map((relatedTask) => {
							const task = input.taskContext.tasksById.get(relatedTask.id);

							if (!task) {
								return null;
							}

							return {
								title: task.title,
								summary: task.summary,
								projectId: task.projectId,
								projectName: task.projectName,
								goalId: task.goalId,
								goalName: task.goalName,
								area: task.area,
								desiredRole: task.desiredRole,
								requiredCapabilityNames: task.requiredCapabilityNames,
								requiredToolNames: task.requiredToolNames,
								isPrimary: relatedTask.isPrimary
							};
						})
						.filter((task): task is NonNullable<typeof task> => Boolean(task))
				});
	const handle = buildAgentThreadHandle({
		threadId: input.session.id,
		cwd: input.session.cwd,
		handleAlias: input.session.handleAlias,
		relatedTasks,
		categorization
	});
	const contactLabel = buildAgentThreadContactLabel({
		handle,
		threadState,
		relatedTasks,
		categorization
	});

	return {
		...input.session,
		name,
		handle,
		contactLabel,
		attachments: input.session.attachments ?? [],
		origin: input.origin,
		threadId,
		topicLabels: categorization?.labels ?? [],
		categorization: categorization ?? undefined,
		threadState,
		latestRunStatus,
		hasActiveRun: hasActive,
		canResume,
		runCount: input.runCount ?? input.runDetails.length,
		lastActivityAt,
		lastActivityLabel: formatRelativeTime(lastActivityAt),
		threadSummary,
		lastExitCode,
		runTimeline: buildRunTimeline({
			run: latestRun,
			threadId
		}),
		relatedTasks,
		latestRun,
		runs: input.includeRunHistory === false ? [] : input.runDetails
	} satisfies AgentThreadDetail;
}

export function isAbandonedThreadDetail(detail: AgentThreadDetail) {
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

async function buildLatestRunDetails(
	runs: AgentRun[],
	options: {
		includePrompt?: boolean;
		logTailLineCount?: number;
	} = {}
) {
	const latestRuns = [...runs].sort(compareByCreatedAtDesc).slice(0, 1);

	return Promise.all(latestRuns.map((run) => buildRunDetail(run, options)));
}

async function buildManagedThreadListDetail(
	session: AgentThread,
	runs: AgentRun[],
	taskContext: TaskContext,
	includeCategorization: boolean
) {
	const runDetails = await buildLatestRunDetails(runs, {
		includePrompt: false,
		logTailLineCount: 12
	});

	return finalizeThreadDetail({
		session,
		runDetails,
		runCount: runs.length,
		includeCategorization,
		includeRunHistory: false,
		taskContext,
		origin: 'managed'
	});
}

async function buildManagedThreadDetail(
	session: AgentThread,
	runs: AgentRun[],
	taskContext: TaskContext
) {
	const runDetails = await Promise.all(
		[...runs].sort(compareByCreatedAtDesc).map((run) => buildRunDetail(run))
	);

	return finalizeThreadDetail({
		session,
		runDetails,
		taskContext,
		origin: 'managed'
	});
}

async function buildExternalThreadListDetail(
	thread: NativeCodexThread,
	runs: AgentRun[],
	taskContext: TaskContext,
	includeCategorization: boolean
) {
	if (runs.length > 0) {
		const runDetails = await buildLatestRunDetails(runs, {
			includePrompt: false,
			logTailLineCount: 12
		});

		return finalizeThreadDetail({
			session: materializeNativeThread(thread),
			runDetails,
			runCount: runs.length,
			includeCategorization,
			includeRunHistory: false,
			taskContext,
			origin: 'external'
		});
	}

	const summaryRun = createNativeSummaryRun(thread);

	return finalizeThreadDetail({
		session: materializeNativeThread(thread),
		runDetails: summaryRun ? [summaryRun] : [],
		includeCategorization,
		taskContext,
		origin: 'external',
		threadSummaryOverride:
			'Imported from local Codex history. Open the thread detail page to inspect prior turns and continue the conversation here.'
	});
}

async function buildExternalThreadDetail(
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

	return finalizeThreadDetail({
		session: materializeNativeThread(thread),
		runDetails: [...localRunDetails, ...nativeRunDetails].sort(compareByCreatedAtDesc),
		taskContext,
		origin: 'external',
		threadSummaryOverride: runs.length
			? null
			: 'Imported from local Codex history. This thread was not started in the agent management system, but its saved conversation is available here and can take follow-up work.'
	});
}

function buildTaskContextFromControlPlane(controlPlane: ControlPlaneData): TaskContext {
	const projectNames = new Map(controlPlane.projects.map((project) => [project.id, project.name]));
	const goalNames = new Map(controlPlane.goals.map((goal) => [goal.id, goal.name]));
	const roleNames = new Map(controlPlane.roles.map((role) => [role.id, role.name]));
	const tasks: TaskContextTask[] = controlPlane.tasks.map((task) => ({
		id: task.id,
		title: task.title,
		summary: task.summary,
		projectId: task.projectId,
		area: task.area,
		goalId: task.goalId,
		goalName: goalNames.get(task.goalId) ?? null,
		status: task.status,
		projectName: projectNames.get(task.projectId) ?? null,
		desiredRole: roleNames.get(task.desiredRoleId) ?? task.desiredRoleId ?? null,
		requiredCapabilityNames: [...(task.requiredCapabilityNames ?? [])],
		requiredToolNames: [...(task.requiredToolNames ?? [])],
		agentThreadId: task.agentThreadId
	}));
	const tasksById = new Map<string, TaskContextTask>(tasks.map((task) => [task.id, task]));
	const relatedTaskIdsByThreadId = new Map<string, Set<string>>();

	for (const task of tasks) {
		if (!task.agentThreadId) {
			continue;
		}

		const relatedTaskIds = relatedTaskIdsByThreadId.get(task.agentThreadId) ?? new Set<string>();
		relatedTaskIds.add(task.id);
		relatedTaskIdsByThreadId.set(task.agentThreadId, relatedTaskIds);
	}

	for (const run of controlPlane.runs) {
		if (!run.agentThreadId) {
			continue;
		}

		const relatedTaskIds = relatedTaskIdsByThreadId.get(run.agentThreadId) ?? new Set<string>();
		relatedTaskIds.add(run.taskId);
		relatedTaskIdsByThreadId.set(run.agentThreadId, relatedTaskIds);
	}

	const relatedTaskLinksByThreadId = new Map<string, AgentThreadTaskLink[]>();

	for (const [agentThreadId, relatedTaskIds] of relatedTaskIdsByThreadId) {
		const links = [...relatedTaskIds]
			.map((taskId) => tasksById.get(taskId) ?? null)
			.filter((task): task is TaskContextTask => Boolean(task))
			.map((task) => ({
				id: task.id,
				title: task.title,
				status: task.status,
				isPrimary: task.agentThreadId === agentThreadId
			}))
			.sort((left, right) => {
				if (left.isPrimary !== right.isPrimary) {
					return left.isPrimary ? -1 : 1;
				}

				return left.title.localeCompare(right.title);
			});

		relatedTaskLinksByThreadId.set(agentThreadId, links);
	}

	return {
		tasks,
		tasksById,
		relatedTaskLinksByThreadId
	};
}

function groupRunsByThreadId(runs: AgentRun[]) {
	const runsBySessionId = new Map<string, AgentRun[]>();

	for (const run of runs) {
		if (!run.agentThreadId) {
			continue;
		}

		const existingRuns = runsBySessionId.get(run.agentThreadId);

		if (existingRuns) {
			existingRuns.push(run);
			continue;
		}

		runsBySessionId.set(run.agentThreadId, [run]);
	}

	return runsBySessionId;
}

type ThreadLifecycleUpdate = {
	taskStatus: TaskStatus;
	runStatus: RunStatus;
	summary: string;
	blockedReason: string;
	finishedAt: string;
};

type ThreadMessageQueueUpdate = {
	taskStatus: TaskStatus;
	runStatus: RunStatus;
	runSummary: string;
	reviewSummary: string;
	approvalSummary: string;
	queuedAt: string;
};

type ThreadActiveUpdate = {
	taskStatus: TaskStatus;
	runStatus: RunStatus;
	runSummary: string;
	activeAt: string;
};

function deriveRunFailureDetail(
	run:
		| Pick<
				AgentRunDetail,
				'activityAt' | 'createdAt' | 'updatedAt' | 'state' | 'logTail' | 'lastMessage' | 'mode'
		  >
		| null
		| undefined
) {
	if (!run) {
		return '';
	}

	if (isStartupAuthFailure(run)) {
		return 'Codex could not start the work thread because authentication refresh failed before thread startup. Re-login to Codex CLI and retry the task.';
	}

	if (isStartupStdinStall(run)) {
		return 'Codex never advanced past startup because the managed run was stuck waiting for stdin input. Restart the manager and retry the task.';
	}

	const meaningfulLogLine = [...run.logTail]
		.reverse()
		.map((line) => line.trim())
		.find(
			(line) =>
				line.length > 0 &&
				!line.startsWith('===') &&
				!line.startsWith('cwd=') &&
				!line.startsWith('RUNNER ERROR:')
		);

	if (meaningfulLogLine) {
		return meaningfulLogLine;
	}

	const exitCode = run.state?.exitCode;
	return exitCode === null || exitCode === undefined
		? ''
		: `The linked work thread exited with code ${exitCode}.`;
}

function deriveLifecycleUpdateFromThreadDetail(
	detail: Pick<
		AgentThreadDetail,
		'hasActiveRun' | 'canResume' | 'latestRunStatus' | 'lastActivityAt' | 'latestRun'
	>
): ThreadLifecycleUpdate | null {
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
		case 'failed': {
			const failedDetail =
				deriveRunFailureDetail(detail.latestRun) || 'The linked work thread failed.';

			return {
				taskStatus: 'blocked',
				runStatus: 'failed',
				summary: 'Task blocked after the linked work thread failed.',
				blockedReason: failedDetail,
				finishedAt
			};
		}
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

function createThreadMessageQueueUpdate(queuedAt: string): ThreadMessageQueueUpdate {
	return {
		taskStatus: 'in_progress',
		runStatus: 'running',
		runSummary: 'Queued follow-up work in the linked thread.',
		reviewSummary: 'Dismissed after follow-up work was queued in the linked thread.',
		approvalSummary: 'Canceled after follow-up work was queued in the linked thread.',
		queuedAt
	};
}

function createThreadActiveUpdate(activeAt: string): ThreadActiveUpdate {
	return {
		taskStatus: 'in_progress',
		runStatus: 'running',
		runSummary: 'Linked work thread is actively running.',
		activeAt
	};
}

export function reconcileControlPlaneThreadState(
	data: ControlPlaneData,
	detail: Pick<
		AgentThreadDetail,
		'id' | 'hasActiveRun' | 'canResume' | 'latestRunStatus' | 'lastActivityAt' | 'latestRun'
	>
) {
	const lifecycleUpdate = deriveLifecycleUpdateFromThreadDetail(detail);
	const activeUpdate = detail.hasActiveRun
		? createThreadActiveUpdate(detail.lastActivityAt ?? new Date().toISOString())
		: null;

	if (!lifecycleUpdate && !activeUpdate) {
		return data;
	}

	const terminalUpdate = lifecycleUpdate;

	const runIdsToUpdate = new Set<string>();
	let changed = false;

	const tasks = data.tasks.map((task) => {
		if (!activeUpdate && task.status !== 'in_progress') {
			return task;
		}

		const latestRun = task.latestRunId
			? (data.runs.find((candidate) => candidate.id === task.latestRunId) ?? null)
			: null;
		const isLinkedToSession =
			latestRun?.agentThreadId === detail.id || (!latestRun && task.agentThreadId === detail.id);

		if (!isLinkedToSession) {
			return task;
		}

		if (activeUpdate && task.status === 'done') {
			return task;
		}

		changed = true;

		if (task.latestRunId) {
			runIdsToUpdate.add(task.latestRunId);
		}

		if (activeUpdate) {
			return {
				...task,
				status: activeUpdate.taskStatus,
				blockedReason: '',
				updatedAt: activeUpdate.activeAt
			};
		}

		if (!terminalUpdate) {
			return task;
		}

		return {
			...task,
			status: terminalUpdate.taskStatus,
			blockedReason: terminalUpdate.blockedReason,
			updatedAt: terminalUpdate.finishedAt
		};
	});

	if (!changed) {
		return data;
	}

	return {
		...data,
		tasks,
		runs: data.runs.map((run) => {
			if (!runIdsToUpdate.has(run.id)) {
				return run;
			}

			if (activeUpdate) {
				return {
					...run,
					status: activeUpdate.runStatus,
					summary: activeUpdate.runSummary,
					updatedAt: activeUpdate.activeAt,
					startedAt: run.startedAt ?? activeUpdate.activeAt,
					endedAt: null,
					lastHeartbeatAt: activeUpdate.activeAt,
					errorSummary: ''
				};
			}

			if (!terminalUpdate) {
				return run;
			}

			return {
				...run,
				status: terminalUpdate.runStatus,
				summary: terminalUpdate.summary,
				updatedAt: terminalUpdate.finishedAt,
				endedAt: run.endedAt ?? terminalUpdate.finishedAt,
				errorSummary: terminalUpdate.runStatus === 'completed' ? '' : terminalUpdate.blockedReason
			};
		})
	};
}

export function reconcileControlPlaneThreadMessage(
	data: ControlPlaneData,
	agentThreadId: string,
	queuedAt = new Date().toISOString()
) {
	const queueUpdate = createThreadMessageQueueUpdate(queuedAt);
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
			latestRun?.agentThreadId === agentThreadId ||
			(!latestRun && task.agentThreadId === agentThreadId);

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
	details: AgentThreadDetail[],
	controlPlane: ControlPlaneData
) {
	let nextControlPlane = controlPlane;
	let changed = false;

	for (const detail of details) {
		const reconciled = reconcileControlPlaneThreadState(nextControlPlane, detail);

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

export async function listAgentThreads(
	options: {
		includeArchived?: boolean;
		includeCategorization?: boolean;
		controlPlane?: ControlPlaneData | Promise<ControlPlaneData>;
	} = {}
) {
	const db = await loadAgentThreadsDb();
	const controlPlanePromise = options.controlPlane
		? Promise.resolve(options.controlPlane)
		: loadControlPlane();
	const [controlPlane, nativeThreads] = await Promise.all([
		controlPlanePromise,
		listNativeCodexThreads()
	]);
	const taskContext = buildTaskContextFromControlPlane(controlPlane);
	const nativeThreadsById = new Map(nativeThreads.map((thread) => [thread.id, thread]));
	const runsBySessionId = groupRunsByThreadId(db.runs);
	const existingSessionIds = new Set(db.threads.map((session) => session.id));
	const managedThreadIds = new Set(
		db.threads
			.map((session) => session.threadId)
			.filter((threadId): threadId is string => Boolean(threadId))
	);
	const details = await Promise.all([
		...db.threads.map((session) => {
			const nativeThread = nativeThreadsById.get(session.id);
			const runs = runsBySessionId.get(session.id) ?? [];

			if (nativeThread && session.id === nativeThread.id) {
				return buildExternalThreadListDetail(
					nativeThread,
					runs,
					taskContext,
					options.includeCategorization !== false
				);
			}

			return buildManagedThreadListDetail(
				session,
				runs,
				taskContext,
				options.includeCategorization !== false
			);
		}),
		...nativeThreads
			.filter((thread) => !existingSessionIds.has(thread.id) && !managedThreadIds.has(thread.id))
			.map((thread) =>
				buildExternalThreadListDetail(
					thread,
					[],
					taskContext,
					options.includeCategorization !== false
				)
			)
	]);
	const reconciled = await reconcileTaskStateFromSessionDetails(details, controlPlane);

	return reconciled.details
		.filter((detail) => options.includeArchived || !detail.archivedAt)
		.filter((detail) => !isAbandonedThreadDetail(detail))
		.sort((left, right) =>
			(right.lastActivityAt ?? right.updatedAt).localeCompare(left.lastActivityAt ?? left.updatedAt)
		);
}

export function summarizeAgentThreads(threads: AgentThreadDetail[]) {
	const stateFor = (session: AgentThreadDetail) =>
		session.threadState ?? session.threadState ?? 'idle';

	return {
		totalCount: threads.length,
		activeCount: threads.filter((session) =>
			['starting', 'waiting', 'working'].includes(stateFor(session))
		).length,
		readyCount: threads.filter((session) => stateFor(session) === 'ready').length,
		unavailableCount: threads.filter((session) =>
			['unavailable', 'idle'].includes(stateFor(session))
		).length,
		attentionCount: threads.filter((session) => stateFor(session) === 'attention').length
	};
}

export async function getAgentThread(
	agentThreadId: string,
	options: { controlPlane?: ControlPlaneData | Promise<ControlPlaneData> } = {}
) {
	const db = await loadAgentThreadsDb();
	const session = db.threads.find((candidate) => candidate.id === agentThreadId) ?? null;
	const sessionRuns = groupRunsByThreadId(db.runs).get(agentThreadId) ?? [];
	const controlPlanePromise = options.controlPlane
		? Promise.resolve(options.controlPlane)
		: loadControlPlane();
	const [controlPlane, nativeThread] = await Promise.all([
		controlPlanePromise,
		getNativeCodexThread(agentThreadId)
	]);
	const taskContext = buildTaskContextFromControlPlane(controlPlane);
	const finalizeSingleDetail = async (detail: AgentThreadDetail | null) => {
		if (!detail) {
			return null;
		}

		const reconciled = await reconcileTaskStateFromSessionDetails([detail], controlPlane);
		const nextDetail = reconciled.details[0] ?? null;

		return nextDetail && !isAbandonedThreadDetail(nextDetail) ? nextDetail : null;
	};

	if (session && nativeThread && session.id === nativeThread.id) {
		return finalizeSingleDetail(
			await buildExternalThreadDetail(nativeThread, sessionRuns, taskContext)
		);
	}

	if (session) {
		return finalizeSingleDetail(await buildManagedThreadDetail(session, sessionRuns, taskContext));
	}

	if (!nativeThread) {
		return null;
	}

	return finalizeSingleDetail(await buildExternalThreadDetail(nativeThread, [], taskContext));
}

export async function listAgentThreadContacts(
	options: {
		threadId?: string | null;
		limit?: number | null;
	} = {}
) {
	const db = await loadAgentThreadsDb();
	const contacts = (db.contacts ?? [])
		.filter((contact) =>
			options.threadId?.trim()
				? contact.sourceAgentThreadId === options.threadId ||
					contact.targetAgentThreadId === options.threadId
				: true
		)
		.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

	if (options.limit && options.limit > 0) {
		return contacts.slice(0, options.limit);
	}

	return contacts;
}

export async function setAgentThreadsArchived(agentThreadIds: string[], archived: boolean) {
	const normalizedIds = [
		...new Set(agentThreadIds.map((agentThreadId) => agentThreadId.trim()).filter(Boolean))
	];

	if (normalizedIds.length === 0) {
		return [];
	}

	const [db, nativeThreads] = await Promise.all([loadAgentThreadsDb(), listNativeCodexThreads()]);
	const nativeThreadsById = new Map(nativeThreads.map((thread) => [thread.id, thread]));
	const existingSessionsById = new Map(db.threads.map((session) => [session.id, session]));
	const archiveTimestamp = archived ? new Date().toISOString() : null;
	const nextSessions = [...db.threads];
	const changedSessionIds: string[] = [];

	for (const agentThreadId of normalizedIds) {
		const existingSession = existingSessionsById.get(agentThreadId);

		if (existingSession) {
			const nextArchivedAt = archived ? (existingSession.archivedAt ?? archiveTimestamp) : null;

			if (existingSession.archivedAt === nextArchivedAt) {
				continue;
			}

			const updatedSession = {
				...existingSession,
				archivedAt: nextArchivedAt
			};
			const sessionIndex = nextSessions.findIndex((candidate) => candidate.id === agentThreadId);

			nextSessions[sessionIndex] = updatedSession;
			existingSessionsById.set(agentThreadId, updatedSession);
			changedSessionIds.push(agentThreadId);
			continue;
		}

		const nativeThread = nativeThreadsById.get(agentThreadId);

		if (!nativeThread) {
			continue;
		}

		const importedSession = {
			...materializeNativeThread(nativeThread),
			archivedAt: archiveTimestamp
		};

		nextSessions.unshift(importedSession);
		existingSessionsById.set(agentThreadId, importedSession);
		changedSessionIds.push(agentThreadId);
	}

	if (changedSessionIds.length === 0) {
		return [];
	}

	await saveAgentThreadsDb({
		threads: nextSessions,
		runs: db.runs,
		contacts: db.contacts ?? []
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

export async function startAgentThread(input: {
	name: string;
	cwd: string;
	additionalWritableRoots?: string[];
	prompt: string;
	sandbox: AgentSandbox;
	model: string | null;
}) {
	const additionalWritableRoots = normalizeAdditionalWritableRoots(
		input.cwd,
		input.additionalWritableRoots
	);
	const workspaceIssue = getWorkspaceExecutionIssue({
		cwd: input.cwd,
		additionalWritableRoots,
		sandbox: input.sandbox,
		scopeLabel: 'Project root'
	});

	if (workspaceIssue) {
		throw new Error(workspaceIssue);
	}

	const codexSkillIssue = getCodexSkillExecutionIssue(input.cwd);

	if (codexSkillIssue) {
		throw new Error(codexSkillIssue);
	}

	const agentThreadId = createAgentThreadId();
	const runId = createRunId();
	const now = new Date().toISOString();
	const paths = getRunPaths(agentThreadId, runId);

	const session: AgentThread = {
		id: agentThreadId,
		name: input.name,
		cwd: normalizePathInput(input.cwd),
		additionalWritableRoots,
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
		agentThreadId,
		mode: 'start',
		prompt: input.prompt,
		requestedThreadId: null,
		sourceAgentThreadId: null,
		sourceAgentThreadName: null,
		contactId: null,
		replyToContactId: null,
		createdAt: now,
		updatedAt: now,
		logPath: paths.logPath,
		statePath: paths.statePath,
		messagePath: paths.messagePath,
		configPath: paths.configPath
	};

	await writeRunnerConfig({ session, run, threadId: null });
	await updateAgentThreadsDb((db) => ({
		threads: [session, ...db.threads],
		runs: [run, ...db.runs],
		contacts: db.contacts ?? []
	}));
	launchRunner(run.configPath);

	return {
		agentThreadId,
		runId
	};
}

export async function updateAgentThreadSandbox(agentThreadId: string, sandbox: AgentSandbox) {
	const [db, nativeThread] = await Promise.all([
		loadAgentThreadsDb(),
		getNativeCodexThread(agentThreadId)
	]);
	const existingSession = db.threads.find((candidate) => candidate.id === agentThreadId) ?? null;

	if (!existingSession && !nativeThread) {
		throw new Error('Thread not found.');
	}

	const now = new Date().toISOString();
	const baseSession = existingSession ?? materializeNativeThread(nativeThread as NativeCodexThread);
	const updatedSession: AgentThread = {
		...baseSession,
		sandbox,
		updatedAt: now
	};

	await updateAgentThreadsDb((current) => {
		const existingIndex = current.threads.findIndex((candidate) => candidate.id === agentThreadId);

		if (existingIndex >= 0) {
			return {
				threads: current.threads.map((candidate) =>
					candidate.id === agentThreadId ? updatedSession : candidate
				),
				runs: current.runs,
				contacts: current.contacts ?? []
			};
		}

		return {
			threads: [updatedSession, ...current.threads],
			runs: current.runs,
			contacts: current.contacts ?? []
		};
	});

	return updatedSession;
}

export async function updateAgentThreadHandleAlias(
	agentThreadId: string,
	handleAlias: string | null | undefined
) {
	const normalizedHandleAlias = normalizeAgentThreadHandleAlias(handleAlias);

	if (handleAlias?.trim() && !normalizedHandleAlias) {
		throw new Error('Handle alias must include at least one letter or number.');
	}

	const [db, nativeThread, threads] = await Promise.all([
		loadAgentThreadsDb(),
		getNativeCodexThread(agentThreadId),
		listAgentThreads({ includeArchived: true })
	]);
	const existingSession = db.threads.find((candidate) => candidate.id === agentThreadId) ?? null;

	if (!existingSession && !nativeThread) {
		throw new Error('Thread not found.');
	}

	if (normalizedHandleAlias) {
		const conflictingThread =
			threads.find(
				(thread) => thread.id !== agentThreadId && thread.handle === normalizedHandleAlias
			) ?? null;

		if (conflictingThread) {
			throw new Error(
				`Handle alias "${normalizedHandleAlias}" is already used by "${conflictingThread.name}".`
			);
		}
	}

	const now = new Date().toISOString();
	const baseSession = existingSession ?? materializeNativeThread(nativeThread as NativeCodexThread);
	const updatedSession: AgentThread = {
		...baseSession,
		handleAlias: normalizedHandleAlias || null,
		updatedAt: now
	};

	await updateAgentThreadsDb((current) => {
		const existingIndex = current.threads.findIndex((candidate) => candidate.id === agentThreadId);

		if (existingIndex >= 0) {
			return {
				threads: current.threads.map((candidate) =>
					candidate.id === agentThreadId ? updatedSession : candidate
				),
				runs: current.runs,
				contacts: current.contacts ?? []
			};
		}

		return {
			threads: [updatedSession, ...current.threads],
			runs: current.runs,
			contacts: current.contacts ?? []
		};
	});

	return updatedSession;
}

export async function sendAgentThreadMessage(
	agentThreadId: string,
	input:
		| string
		| {
				prompt: string;
				attachments?: File[];
				sourceThread?: {
					id: string;
					name: string;
				} | null;
				contactId?: string | null;
				replyToContactId?: string | null;
		  }
) {
	const db = await loadAgentThreadsDb();
	let session = db.threads.find((candidate) => candidate.id === agentThreadId) ?? null;
	const prompt = typeof input === 'string' ? input : input.prompt;
	const uploads =
		typeof input === 'string' ? [] : (input.attachments ?? []).filter((file) => file.size > 0);
	const sourceThread = typeof input === 'string' ? null : (input.sourceThread ?? null);
	const contactId = typeof input === 'string' ? null : (input.contactId ?? null);
	const replyToContactId = typeof input === 'string' ? null : (input.replyToContactId ?? null);

	if (!session) {
		const nativeThread = await getNativeCodexThread(agentThreadId);

		if (!nativeThread) {
			throw new Error('Thread not found.');
		}

		const importedSession = materializeNativeThread(nativeThread);
		session = importedSession;
		await updateAgentThreadsDb((current) => {
			if (current.threads.some((candidate) => candidate.id === agentThreadId)) {
				return current;
			}

			return {
				threads: [importedSession, ...current.threads],
				runs: current.runs,
				contacts: current.contacts ?? []
			};
		});
	}

	const detail = await getAgentThread(agentThreadId);

	if (!detail) {
		throw new Error('Thread not found.');
	}

	if (detail.hasActiveRun) {
		throw new Error('Thread already has an active run.');
	}

	if (!detail.threadId) {
		throw new Error('Thread does not have a discovered Codex thread id yet.');
	}

	const nextSessionAttachments =
		session.attachments?.filter((attachment) => attachment.path.trim().length > 0) ?? [];
	const persistedAttachments =
		uploads.length > 0
			? await persistThreadAttachments({
					rootPath: AGENT_THREADS_ROOT,
					threadId: agentThreadId,
					uploads
				})
			: { attachments: [], inlineAttachmentContents: [] };
	const nextPrompt = buildThreadAttachmentPrompt({
		prompt,
		attachments: persistedAttachments.attachments,
		inlineAttachmentContents: persistedAttachments.inlineAttachmentContents
	});
	const workspaceIssue = getWorkspaceExecutionIssue({
		cwd: session.cwd,
		additionalWritableRoots: session.additionalWritableRoots ?? [],
		sandbox: session.sandbox,
		scopeLabel: 'Project root'
	});

	if (workspaceIssue) {
		throw new Error(workspaceIssue);
	}

	const codexSkillIssue = getCodexSkillExecutionIssue(session.cwd);

	if (codexSkillIssue) {
		throw new Error(codexSkillIssue);
	}

	const runId = createRunId();
	const now = new Date().toISOString();
	const paths = getRunPaths(agentThreadId, runId);
	const run: AgentRun = {
		id: runId,
		agentThreadId,
		mode: 'message',
		prompt: nextPrompt,
		requestedThreadId: detail.threadId,
		sourceAgentThreadId: sourceThread?.id ?? null,
		sourceAgentThreadName: sourceThread?.name ?? null,
		contactId,
		replyToContactId,
		createdAt: now,
		updatedAt: now,
		logPath: paths.logPath,
		statePath: paths.statePath,
		messagePath: paths.messagePath,
		configPath: paths.configPath
	};

	const nextSession: AgentThread = {
		...session,
		threadId: detail.threadId,
		attachments: [...persistedAttachments.attachments, ...nextSessionAttachments],
		updatedAt: now
	};

	await writeRunnerConfig({ session: nextSession, run, threadId: detail.threadId });
	await updateAgentThreadsDb((current) => ({
		threads: current.threads.map((candidate) =>
			candidate.id === agentThreadId ? nextSession : candidate
		),
		runs: [run, ...current.runs],
		contacts: current.contacts ?? []
	}));
	const controlPlane = await loadControlPlane();
	const reconciledControlPlane = reconcileControlPlaneThreadMessage(
		controlPlane,
		agentThreadId,
		now
	);

	if (reconciledControlPlane !== controlPlane) {
		await updateControlPlane(() => reconciledControlPlane);
	}
	launchRunner(run.configPath);

	return {
		agentThreadId,
		runId
	};
}

export async function contactAgentThread(
	sourceAgentThreadId: string,
	input: {
		targetAgentThreadId: string;
		prompt: string;
		attachments?: File[];
		contactType?: AgentThreadContactType | string | null;
		contextSummary?: string | null;
		contextItems?: AgentThreadContactContextItem[];
		replyRequested?: boolean;
		replyToContactId?: string | null;
	}
) {
	const targetAgentThreadId = input.targetAgentThreadId.trim();
	const prompt = input.prompt.trim();
	const contactType =
		typeof input.contactType === 'string' && isAgentThreadContactType(input.contactType)
			? input.contactType
			: 'question';
	const contextSummary = input.contextSummary?.trim() || null;
	const contextItems = normalizeAgentThreadContactContextItems(input.contextItems);
	const replyRequested = input.replyRequested !== false;
	const replyToContactId = input.replyToContactId?.trim() || null;

	if (!targetAgentThreadId) {
		throw new Error('Target thread is required.');
	}

	if (!prompt) {
		throw new Error('Prompt is required.');
	}

	if (sourceAgentThreadId === targetAgentThreadId) {
		throw new Error('A thread cannot contact itself.');
	}

	const [sourceThread, targetThread] = await Promise.all([
		getAgentThread(sourceAgentThreadId),
		getAgentThread(targetAgentThreadId)
	]);

	if (!sourceThread) {
		throw new Error('Source thread not found.');
	}

	if (!targetThread) {
		throw new Error('Target thread not found.');
	}

	if (targetThread.archivedAt) {
		throw new Error('Archived threads cannot receive cross-thread contact requests.');
	}

	if (targetThread.hasActiveRun) {
		throw new Error(`Target thread "${targetThread.name}" already has an active run.`);
	}

	if (!targetThread.canResume) {
		throw new Error(`Target thread "${targetThread.name}" cannot accept a follow-up right now.`);
	}
	const contactId = createContactId();
	const sendResult = await sendAgentThreadMessage(targetAgentThreadId, {
		prompt: buildAgentThreadContactPrompt({
			sourceThread,
			prompt,
			contactType,
			contextSummary,
			contextItems,
			contactId,
			replyRequested,
			replyToContactId
		}),
		attachments: input.attachments,
		sourceThread: {
			id: sourceThread.id,
			name: sourceThread.name
		},
		contactId,
		replyToContactId
	});

	await updateAgentThreadsDb((current) => ({
		threads: current.threads,
		runs: current.runs,
		contacts: [
			{
				id: contactId,
				sourceAgentThreadId: sourceThread.id,
				sourceAgentThreadName: sourceThread.name,
				targetAgentThreadId: targetThread.id,
				targetAgentThreadName: targetThread.name,
				contactType,
				contextSummary,
				contextItems,
				prompt,
				replyRequested,
				replyToContactId,
				status: replyRequested ? 'awaiting_reply' : 'sent',
				resolvedByContactId: null,
				targetRunId: sendResult.runId,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			},
			...(current.contacts ?? []).map((contact) =>
				replyToContactId && contact.id === replyToContactId
					? {
							...contact,
							status: 'answered' as const,
							resolvedByContactId: contactId,
							updatedAt: new Date().toISOString()
						}
					: contact
			)
		]
	}));

	return {
		...sendResult,
		contactId
	};
}

export async function recoverAgentThread(agentThreadId: string) {
	const detail = await getAgentThread(agentThreadId);

	if (!detail) {
		throw new Error('Thread not found.');
	}

	if (detail.origin !== 'managed') {
		throw new Error('Only managed threads can be recovered.');
	}

	if (!detail.latestRun || !detail.hasActiveRun) {
		throw new Error('Thread does not have an active run to recover.');
	}

	const now = new Date().toISOString();
	const pid = detail.latestRun.state?.pid ?? null;
	let signal: string | null = null;
	let status: AgentRunStatus = 'failed';

	if (typeof pid === 'number' && Number.isFinite(pid)) {
		try {
			process.kill(pid, 'SIGTERM');
			signal = 'SIGTERM';
			status = 'canceled';
		} catch {
			status = 'failed';
		}
	}

	const nextState: AgentRunState = {
		status,
		pid: null,
		startedAt: detail.latestRun.state?.startedAt ?? detail.latestRun.createdAt,
		finishedAt: now,
		exitCode: detail.latestRun.state?.exitCode ?? null,
		signal,
		codexThreadId: detail.latestRun.state?.codexThreadId ?? detail.threadId
	};

	await mkdir(dirname(detail.latestRun.statePath), { recursive: true });
	await writeFile(detail.latestRun.statePath, JSON.stringify(nextState, null, 2));

	const controlPlane = await loadControlPlane();
	const reconciledControlPlane = reconcileControlPlaneThreadState(controlPlane, {
		id: detail.id,
		hasActiveRun: false,
		canResume: Boolean(detail.threadId),
		latestRunStatus: status,
		lastActivityAt: now,
		latestRun: {
			...detail.latestRun,
			state: nextState
		}
	});

	if (reconciledControlPlane !== controlPlane) {
		await updateControlPlane(() => reconciledControlPlane);
	}

	return {
		agentThreadId,
		runId: detail.latestRun.id,
		status,
		signal,
		recoveredAt: now
	};
}

export async function cancelAgentThread(agentThreadId: string) {
	const detail = await getAgentThread(agentThreadId);

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
