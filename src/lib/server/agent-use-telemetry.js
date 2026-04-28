// @ts-nocheck

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AGENT_CAPABILITY_COMMANDS } from './agent-capability-commands.js';
import { AGENT_CAPABILITY_PLAYBOOKS } from './agent-capability-playbooks.js';

const DEFAULT_TELEMETRY_FILE = resolve(process.cwd(), 'data', 'agent-use-telemetry.json');
const MAX_TELEMETRY_EVENTS = 5000;
const DEFAULT_TELEMETRY_RETENTION_DAYS = 30;
const SUPPORTED_SINCE_WINDOWS = {
	'1h': 60 * 60 * 1000,
	'24h': 24 * 60 * 60 * 1000,
	'7d': 7 * 24 * 60 * 60 * 1000,
	'30d': 30 * 24 * 60 * 60 * 1000
};

function getTelemetryFilePath() {
	const configuredPath = process.env.AMS_AGENT_USE_TELEMETRY_FILE?.trim();
	return configuredPath ? resolve(process.cwd(), configuredPath) : DEFAULT_TELEMETRY_FILE;
}

function defaultTelemetryStore() {
	return { events: [] };
}

function getTelemetryRetentionDays() {
	const configuredDays = Number.parseInt(
		process.env.AMS_AGENT_USE_TELEMETRY_RETENTION_DAYS?.trim() ?? '',
		10
	);

	return Number.isInteger(configuredDays) && configuredDays > 0
		? configuredDays
		: DEFAULT_TELEMETRY_RETENTION_DAYS;
}

function buildRetentionPolicy() {
	const retentionDays = getTelemetryRetentionDays();
	const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

	return {
		retentionDays,
		maxEvents: MAX_TELEMETRY_EVENTS,
		cutoffAt: new Date(cutoffMs).toISOString()
	};
}

function buildToolName(resource, command) {
	return `ams_${resource}_${command.replaceAll('-', '_')}`;
}

function buildIntentToolName(intent) {
	return `ams_intent_${intent}`;
}

const TOOL_METADATA = new Map(
	AGENT_CAPABILITY_COMMANDS.map((command) => [
		buildToolName(command.resource, command.command),
		{ resource: command.resource, command: command.command }
	])
);

const PLAYBOOK_TOOL_COVERAGE = (() => {
	const coverage = new Map();

	for (const playbook of AGENT_CAPABILITY_PLAYBOOKS) {
		const directIntentEntry = coverage.get(buildIntentToolName(playbook.intent)) ?? {
			toolName: buildIntentToolName(playbook.intent),
			intents: new Set()
		};
		directIntentEntry.intents.add(playbook.intent);
		coverage.set(directIntentEntry.toolName, directIntentEntry);

		for (const step of playbook.steps) {
			const entry = coverage.get(step.tool) ?? {
				toolName: step.tool,
				intents: new Set()
			};
			entry.intents.add(playbook.intent);
			coverage.set(step.tool, entry);
		}
	}

	return coverage;
})();

async function ensureTelemetryStore() {
	const telemetryFile = getTelemetryFilePath();

	if (existsSync(telemetryFile)) {
		return;
	}

	await mkdir(dirname(telemetryFile), { recursive: true });
	await writeFile(telemetryFile, JSON.stringify(defaultTelemetryStore(), null, 2), 'utf8');
}

async function loadTelemetryStore() {
	await ensureTelemetryStore();
	const telemetryFile = getTelemetryFilePath();
	const { parsed, recovered } = parseTelemetryStoreContent(await readFile(telemetryFile, 'utf8'));
	const store = {
		events: Array.isArray(parsed.events)
			? parsed.events.filter((event) => Boolean(event) && typeof event === 'object')
			: []
	};
	const normalizedStore = pruneTelemetryStore(store);

	if (normalizedStore.didPrune || recovered) {
		await writeTelemetryStore(normalizedStore);
	}

	return normalizedStore;
}

function parseTelemetryStoreContent(content) {
	try {
		return { parsed: JSON.parse(content), recovered: false };
	} catch (error) {
		if (!(error instanceof SyntaxError)) {
			throw error;
		}

		const jsonEndIndex = findFirstJsonValueEnd(content);

		if (jsonEndIndex === -1) {
			return { parsed: defaultTelemetryStore(), recovered: true };
		}

		try {
			return { parsed: JSON.parse(content.slice(0, jsonEndIndex)), recovered: true };
		} catch {
			return { parsed: defaultTelemetryStore(), recovered: true };
		}
	}
}

function findFirstJsonValueEnd(content) {
	let depth = 0;
	let inString = false;
	let escaped = false;
	let started = false;

	for (let index = 0; index < content.length; index += 1) {
		const character = content[index];

		if (!started) {
			if (/\s/.test(character)) {
				continue;
			}

			if (character !== '{' && character !== '[') {
				return -1;
			}

			started = true;
		}

		if (inString) {
			if (escaped) {
				escaped = false;
			} else if (character === '\\') {
				escaped = true;
			} else if (character === '"') {
				inString = false;
			}
			continue;
		}

		if (character === '"') {
			inString = true;
			continue;
		}

		if (character === '{' || character === '[') {
			depth += 1;
		} else if (character === '}' || character === ']') {
			depth -= 1;

			if (depth === 0) {
				return index + 1;
			}
		}
	}

	return -1;
}

async function writeTelemetryStore(store) {
	const telemetryFile = getTelemetryFilePath();
	await mkdir(dirname(telemetryFile), { recursive: true });
	await writeFile(
		telemetryFile,
		JSON.stringify(
			{
				events: store.events
			},
			null,
			2
		),
		'utf8'
	);
}

function normalizeThreadId(value) {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeOptionalId(value) {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeArgKeys(args) {
	if (!args || typeof args !== 'object' || Array.isArray(args)) {
		return [];
	}

	return Object.keys(args).sort();
}

function resolveSinceCutoff(since) {
	if (typeof since !== 'string') {
		return null;
	}

	const normalized = since.trim();
	const windowMs = SUPPORTED_SINCE_WINDOWS[normalized];

	return typeof windowMs === 'number' ? Date.now() - windowMs : null;
}

function pruneTelemetryStore(store) {
	const retentionPolicy = buildRetentionPolicy();
	let droppedInvalidCount = 0;
	let droppedExpiredCount = 0;
	const retainedEvents = [];

	for (const event of store.events) {
		if (!event || typeof event !== 'object') {
			droppedInvalidCount += 1;
			continue;
		}

		const recordedAtMs = Date.parse(event.recordedAt);

		if (!Number.isFinite(recordedAtMs)) {
			droppedInvalidCount += 1;
			continue;
		}

		if (recordedAtMs < Date.parse(retentionPolicy.cutoffAt)) {
			droppedExpiredCount += 1;
			continue;
		}

		retainedEvents.push(event);
	}

	retainedEvents.sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
	const droppedOverflowCount = Math.max(0, retainedEvents.length - retentionPolicy.maxEvents);
	const events = retainedEvents.slice(0, retentionPolicy.maxEvents);

	return {
		events,
		retentionPolicy,
		droppedInvalidCount,
		droppedExpiredCount,
		droppedOverflowCount,
		didPrune: droppedInvalidCount > 0 || droppedExpiredCount > 0 || droppedOverflowCount > 0
	};
}

function buildPlaybookMatches(events) {
	const successfulEvents = events.filter((event) => event.outcome === 'success');
	const eventsByThread = new Map();

	for (const event of successfulEvents) {
		const threadKey = event.threadId ?? 'unknown';
		const current = eventsByThread.get(threadKey) ?? [];
		current.push(event);
		eventsByThread.set(threadKey, current);
	}

	const matches = [];

	for (const playbook of AGENT_CAPABILITY_PLAYBOOKS) {
		let count = 0;
		const matchedThreadIds = new Set();
		const playbookTools = playbook.steps.map((step) => step.tool);
		const directIntentToolName = buildIntentToolName(playbook.intent);

		for (const [threadId, threadEvents] of eventsByThread.entries()) {
			const orderedToolNames = [...threadEvents].sort((left, right) =>
				left.recordedAt.localeCompare(right.recordedAt)
			);

			count += orderedToolNames.filter((event) => event.toolName === directIntentToolName).length;

			if (
				orderedToolNames.some((event) => event.toolName === directIntentToolName) &&
				threadId !== 'unknown'
			) {
				matchedThreadIds.add(threadId);
			}

			const orderedStepToolNames = orderedToolNames.map((event) => event.toolName);

			for (let index = 0; index <= orderedStepToolNames.length - playbookTools.length; index += 1) {
				const candidate = orderedStepToolNames.slice(index, index + playbookTools.length);

				if (candidate.every((toolName, offset) => toolName === playbookTools[offset])) {
					count += 1;
					if (threadId !== 'unknown') {
						matchedThreadIds.add(threadId);
					}
				}
			}
		}

		matches.push({
			intent: playbook.intent,
			count,
			threadIds: [...matchedThreadIds].sort()
		});
	}

	return matches.sort(
		(left, right) => right.count - left.count || left.intent.localeCompare(right.intent)
	);
}

export async function recordAgentToolUse(input) {
	const store = await loadTelemetryStore();
	const metadata = TOOL_METADATA.get(input.toolName) ?? null;
	const runId = normalizeOptionalId(input.runId ?? process.env.AMS_AGENT_RUN_ID);
	const taskId = normalizeOptionalId(input.taskId ?? process.env.AMS_AGENT_TASK_ID);
	const event = {
		id: `agent_tool_use_${randomUUID()}`,
		recordedAt: new Date().toISOString(),
		threadId: normalizeThreadId(input.threadId),
		runId,
		taskId,
		toolName: input.toolName,
		resource: metadata?.resource ?? (input.toolName === 'ams_manifest' ? 'manifest' : null),
		command: metadata?.command ?? (input.toolName === 'ams_manifest' ? 'manifest' : null),
		outcome: input.outcome === 'error' ? 'error' : 'success',
		argKeys: normalizeArgKeys(input.args),
		errorMessage:
			input.outcome === 'error' && typeof input.errorMessage === 'string'
				? input.errorMessage
				: null
	};

	store.events.unshift(event);
	await writeTelemetryStore(pruneTelemetryStore(store));
	return event;
}

export async function recordAgentToolUseBestEffort(input) {
	try {
		await recordAgentToolUse(input);
	} catch {
		// Telemetry must never block the MCP tool path.
	}
}

export async function summarizeAgentToolUse(filters = {}) {
	const store = await loadTelemetryStore();
	const sinceCutoff = resolveSinceCutoff(filters.since);
	const filteredEvents = store.events.filter((event) => {
		if (filters.threadId && event.threadId !== filters.threadId) {
			return false;
		}

		if (filters.runId && event.runId !== filters.runId) {
			return false;
		}

		if (filters.taskId && event.taskId !== filters.taskId) {
			return false;
		}

		if (filters.toolName && event.toolName !== filters.toolName) {
			return false;
		}

		if (filters.outcome && event.outcome !== filters.outcome) {
			return false;
		}

		if (sinceCutoff !== null) {
			const recordedAtMs = Date.parse(event.recordedAt);

			if (Number.isFinite(recordedAtMs) && recordedAtMs < sinceCutoff) {
				return false;
			}
		}

		return true;
	});

	const toolCounts = new Map();
	const threadCounts = new Map();
	const runCounts = new Map();
	const taskCounts = new Map();

	for (const event of filteredEvents) {
		const toolCount = toolCounts.get(event.toolName) ?? {
			toolName: event.toolName,
			count: 0,
			successCount: 0,
			errorCount: 0
		};
		toolCount.count += 1;
		toolCount.successCount += event.outcome === 'success' ? 1 : 0;
		toolCount.errorCount += event.outcome === 'error' ? 1 : 0;
		toolCounts.set(event.toolName, toolCount);

		if (event.threadId) {
			threadCounts.set(event.threadId, (threadCounts.get(event.threadId) ?? 0) + 1);
		}

		if (event.runId) {
			runCounts.set(event.runId, (runCounts.get(event.runId) ?? 0) + 1);
		}

		if (event.taskId) {
			taskCounts.set(event.taskId, (taskCounts.get(event.taskId) ?? 0) + 1);
		}
	}

	const playbookMatches = buildPlaybookMatches(filteredEvents);
	const sortedToolCounts = [...toolCounts.values()].sort(
		(left, right) => right.count - left.count || left.toolName.localeCompare(right.toolName)
	);
	const uncoveredToolCounts = sortedToolCounts
		.filter((tool) => !PLAYBOOK_TOOL_COVERAGE.has(tool.toolName))
		.map((tool) => ({
			...tool,
			intents: []
		}));
	const observedToolNames = new Set(sortedToolCounts.map((tool) => tool.toolName));
	const unobservedPlaybookTools = [...PLAYBOOK_TOOL_COVERAGE.values()]
		.filter((entry) => !observedToolNames.has(entry.toolName))
		.map((entry) => ({
			toolName: entry.toolName,
			intents: [...entry.intents].sort()
		}))
		.sort((left, right) => left.toolName.localeCompare(right.toolName));

	return {
		totalEvents: filteredEvents.length,
		successfulEvents: filteredEvents.filter((event) => event.outcome === 'success').length,
		failedEvents: filteredEvents.filter((event) => event.outcome === 'error').length,
		lastRecordedAt: filteredEvents[0]?.recordedAt ?? null,
		retention: {
			...store.retentionPolicy,
			retainedEventCount: store.events.length,
			oldestRetainedAt: store.events.at(-1)?.recordedAt ?? null,
			newestRetainedAt: store.events[0]?.recordedAt ?? null
		},
		recentEvents: filteredEvents.slice(0, 20),
		toolCounts: sortedToolCounts,
		threadCounts: [...threadCounts.entries()]
			.map(([threadId, count]) => ({ threadId, count }))
			.sort(
				(left, right) => right.count - left.count || left.threadId.localeCompare(right.threadId)
			),
		runCounts: [...runCounts.entries()]
			.map(([runId, count]) => ({ runId, count }))
			.sort((left, right) => right.count - left.count || left.runId.localeCompare(right.runId)),
		taskCounts: [...taskCounts.entries()]
			.map(([taskId, count]) => ({ taskId, count }))
			.sort((left, right) => right.count - left.count || left.taskId.localeCompare(right.taskId)),
		playbookMatches,
		unusedPlaybooks: playbookMatches
			.filter((entry) => entry.count === 0)
			.map((entry) => entry.intent),
		uncoveredToolCounts,
		unobservedPlaybookTools
	};
}
