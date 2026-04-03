import type { AgentSessionDetail } from '$lib/types/agent-thread';

export const ACTIVE_REFRESH_INTERVAL_MS = 2_000;
export const ACTIVITY_CLOCK_INTERVAL_MS = 1_000;

const LIVE_ACTIVITY_WINDOW_MS = 15_000;
const RECENT_ACTIVITY_WINDOW_MS = 60_000;

export type SessionActivityTone = 'live' | 'progress' | 'ready' | 'attention' | 'idle';

export type SessionActivityMeta = {
	label: string;
	detail: string;
	ageLabel: string;
	tone: SessionActivityTone;
	animate: boolean;
	activityHeading: string | null;
	activityLabel: string | null;
	activityDetail: string | null;
};

type SessionLiveActivity = {
	label: string;
	detail: string;
};

function hasStructuredProgressEvidence(session: AgentSessionDetail) {
	if (session.latestRun?.lastMessage) {
		return true;
	}

	return (
		session.latestRun?.logTail.some(
			(line) =>
				line.startsWith('{"type":"item.started"') ||
				line.startsWith('{"type":"item.completed"') ||
				line.startsWith('{"type":"agent_message"') ||
				line.startsWith('{"type":"response_item"') ||
				line.startsWith('{"type":"event_msg"')
		) ?? false
	);
}

function hasStartupEvidence(session: AgentSessionDetail) {
	if (session.latestRun?.state?.codexThreadId) {
		return true;
	}

	return (
		session.latestRun?.logTail.some(
			(line) =>
				line.startsWith('{"type":"thread.started"') || line.startsWith('{"type":"turn.started"')
		) ?? false
	);
}

function compactText(value: string, maxLength = 140) {
	const normalized = value.replace(/\s+/g, ' ').trim();

	if (normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function extractLogJson(line: string) {
	try {
		return JSON.parse(line) as Record<string, unknown>;
	} catch {
		return null;
	}
}

function stripShellWrapper(command: string) {
	const normalized = command.trim();
	const shellMatch = normalized.match(/^\/bin\/(?:zsh|bash|sh)\s+-lc\s+(.+)$/);

	if (!shellMatch) {
		return compactText(normalized, 96);
	}

	const wrapped = shellMatch[1]?.trim() ?? '';

	if (
		(wrapped.startsWith("'") && wrapped.endsWith("'")) ||
		(wrapped.startsWith('"') && wrapped.endsWith('"'))
	) {
		return compactText(wrapped.slice(1, -1), 96);
	}

	return compactText(wrapped, 96);
}

function describePath(path: string) {
	const normalized = path.trim();

	if (!normalized) {
		return 'file';
	}

	const segments = normalized.split('/').filter(Boolean);
	return segments.at(-1) ?? normalized;
}

function describeFileChanges(changes: unknown) {
	if (!Array.isArray(changes) || changes.length === 0) {
		return 'Working tree updates';
	}

	const normalizedChanges = changes
		.filter((change): change is { path?: unknown; kind?: unknown } => Boolean(change))
		.map((change) => ({
			path: typeof change.path === 'string' ? change.path : '',
			kind: typeof change.kind === 'string' ? change.kind : 'update'
		}))
		.filter((change) => change.path.length > 0);

	if (normalizedChanges.length === 0) {
		return 'Working tree updates';
	}

	if (normalizedChanges.length === 1) {
		const change = normalizedChanges[0];
		const verb =
			change.kind === 'create' ? 'Creating' : change.kind === 'delete' ? 'Deleting' : 'Updating';

		return `${verb} ${describePath(change.path)}`;
	}

	return `${normalizedChanges.length} files touched`;
}

function extractStructuredMessageContent(content: unknown) {
	if (typeof content === 'string') {
		return compactText(content);
	}

	if (!Array.isArray(content)) {
		return null;
	}

	const text = content
		.map((part) => {
			if (!part || typeof part !== 'object') {
				return null;
			}

			const candidate = (part as { text?: unknown }).text;
			return typeof candidate === 'string' ? candidate : null;
		})
		.filter((candidate): candidate is string => Boolean(candidate))
		.join(' ')
		.trim();

	return text ? compactText(text) : null;
}

function describeItemEvent(
	type: 'item.started' | 'item.completed',
	item: Record<string, unknown>
): SessionLiveActivity | null {
	const itemType = typeof item.type === 'string' ? item.type : null;

	if (!itemType) {
		return null;
	}

	switch (itemType) {
		case 'command_execution': {
			const command =
				typeof item.command === 'string' ? stripShellWrapper(item.command) : 'Shell command';
			const exitCode =
				typeof item.exit_code === 'number' && Number.isFinite(item.exit_code)
					? item.exit_code
					: null;

			if (type === 'item.started') {
				return {
					label: 'Running command',
					detail: command
				};
			}

			return {
				label: exitCode === null || exitCode === 0 ? 'Finished command' : 'Command failed',
				detail: exitCode === null || exitCode === 0 ? command : `${command} (exit ${exitCode})`
			};
		}
		case 'file_change':
			return {
				label: type === 'item.started' ? 'Editing files' : 'Saved file changes',
				detail: describeFileChanges(item.changes)
			};
		case 'agent_message': {
			const text = typeof item.text === 'string' ? compactText(item.text) : 'Status update';

			return {
				label: type === 'item.started' ? 'Writing update' : 'Shared update',
				detail: text
			};
		}
		default:
			return {
				label: type === 'item.started' ? 'Working' : 'Finished work item',
				detail: compactText(itemType.replace(/_/g, ' '))
			};
	}
}

function parseLiveActivityFromLogLine(line: string): SessionLiveActivity | null {
	const trimmed = line.trim();

	if (!trimmed || trimmed.startsWith('===') || trimmed.startsWith('cwd=')) {
		return null;
	}

	if (trimmed.startsWith('Reasoning: ')) {
		return {
			label: 'Thinking',
			detail: compactText(trimmed.slice('Reasoning: '.length))
		};
	}

	if (trimmed.startsWith('Assistant: ')) {
		return {
			label: 'Drafted reply',
			detail: compactText(trimmed.slice('Assistant: '.length))
		};
	}

	if (trimmed.startsWith('Tool call: ')) {
		return {
			label: 'Calling tool',
			detail: compactText(trimmed.slice('Tool call: '.length))
		};
	}

	if (trimmed.startsWith('Tool output: ')) {
		return {
			label: 'Received tool output',
			detail: compactText(trimmed.slice('Tool output: '.length))
		};
	}

	if (trimmed.startsWith('RUNNER ERROR: ')) {
		return {
			label: 'Runner error',
			detail: compactText(trimmed.slice('RUNNER ERROR: '.length))
		};
	}

	if (!trimmed.startsWith('{')) {
		return {
			label: 'Log update',
			detail: compactText(trimmed)
		};
	}

	const record = extractLogJson(trimmed);

	if (!record || typeof record.type !== 'string') {
		return null;
	}

	switch (record.type) {
		case 'thread.started':
			return {
				label: 'Thread started',
				detail: 'Codex created a reusable thread for follow-up work.'
			};
		case 'turn.started':
			return {
				label: 'Turn started',
				detail: 'Codex accepted the latest instruction and began work.'
			};
		case 'event_msg': {
			const payload = record.payload;

			if (!payload || typeof payload !== 'object') {
				return null;
			}

			const payloadRecord = payload as Record<string, unknown>;
			const type = typeof payloadRecord.type === 'string' ? payloadRecord.type : null;

			if (type === 'agent_reasoning') {
				return {
					label: 'Thinking',
					detail:
						typeof payloadRecord.text === 'string'
							? compactText(payloadRecord.text)
							: 'Reasoning through the next step.'
				};
			}

			if (type === 'agent_message') {
				return {
					label: 'Shared update',
					detail:
						typeof payloadRecord.message === 'string'
							? compactText(payloadRecord.message)
							: 'Sent a status update.'
				};
			}

			return null;
		}
		case 'response_item': {
			const payload = record.payload;

			if (!payload || typeof payload !== 'object') {
				return null;
			}

			const payloadRecord = payload as Record<string, unknown>;
			const type = typeof payloadRecord.type === 'string' ? payloadRecord.type : null;

			if (type === 'function_call' || type === 'custom_tool_call') {
				return {
					label: 'Calling tool',
					detail:
						typeof payloadRecord.name === 'string'
							? compactText(payloadRecord.name)
							: 'Invoking a tool'
				};
			}

			if (type === 'function_call_output' || type === 'custom_tool_call_output') {
				return {
					label: 'Received tool output',
					detail:
						typeof payloadRecord.output === 'string'
							? compactText(payloadRecord.output)
							: 'Tool output arrived.'
				};
			}

			if (type === 'message' && payloadRecord.role === 'assistant') {
				return {
					label: 'Drafted reply',
					detail:
						extractStructuredMessageContent(payloadRecord.content) ??
						'Composing the assistant response.'
				};
			}

			return null;
		}
		case 'item.started':
		case 'item.completed': {
			const item = record.item;

			if (!item || typeof item !== 'object') {
				return null;
			}

			return describeItemEvent(record.type, item as Record<string, unknown>);
		}
		default:
			return null;
	}
}

function getLatestLiveActivity(session: AgentSessionDetail): SessionLiveActivity | null {
	const lines = session.latestRun?.logTail ?? [];

	for (const line of [...lines].reverse()) {
		const activity = parseLiveActivityFromLogLine(line);

		if (activity) {
			return activity;
		}
	}

	if (session.latestRunStatus === 'running' && session.latestRun?.lastMessage) {
		return {
			label: 'Drafted reply',
			detail: compactText(session.latestRun.lastMessage)
		};
	}

	return null;
}

function getFallbackActivity(
	session: AgentSessionDetail,
	options: {
		isLive: boolean;
		isRecent: boolean;
	}
): SessionLiveActivity | null {
	switch (session.sessionState) {
		case 'starting':
			return {
				label: 'Queueing run',
				detail: 'Waiting for the local runner process to spin up.'
			};
		case 'waiting':
		case 'working':
			if (hasStartupEvidence(session)) {
				return {
					label: options.isLive ? 'Starting up' : 'Awaiting work signal',
					detail: 'Startup output is visible, but there is no specific work item yet.'
				};
			}

			return {
				label: options.isRecent ? 'Waiting for first signal' : 'No live signal',
				detail: 'The run is marked active, but there is no structured Codex event to show yet.'
			};
		case 'attention':
			return {
				label: session.latestRunStatus === 'canceled' ? 'Run canceled' : 'Run needs attention',
				detail: 'Review the recent logs before reusing this thread.'
			};
		default:
			return null;
	}
}

export function formatSessionStateLabel(state: AgentSessionDetail['sessionState']) {
	switch (state) {
		case 'starting':
			return 'Starting';
		case 'waiting':
		case 'working':
			return 'Working';
		case 'ready':
			return 'Available';
		case 'attention':
			return 'Needs attention';
		case 'unavailable':
			return 'History only';
		case 'idle':
		default:
			return 'Idle';
	}
}

function getActivityAgeMs(iso: string | null, now = Date.now()) {
	if (!iso) {
		return null;
	}

	const timestamp = Date.parse(iso);

	if (Number.isNaN(timestamp)) {
		return null;
	}

	return Math.max(0, now - timestamp);
}

export function formatActivityAge(iso: string | null, now = Date.now()) {
	const ageMs = getActivityAgeMs(iso, now);

	if (ageMs === null) {
		return 'No activity yet';
	}

	const seconds = Math.floor(ageMs / 1000);

	if (seconds < 5) {
		return 'just now';
	}

	if (seconds < 60) {
		return `${seconds}s ago`;
	}

	const minutes = Math.floor(seconds / 60);

	if (minutes < 60) {
		return `${minutes}m ago`;
	}

	const hours = Math.floor(minutes / 60);

	if (hours < 24) {
		return `${hours}h ago`;
	}

	return `${Math.floor(hours / 24)}d ago`;
}

export function getSessionActivityMeta(
	session: AgentSessionDetail,
	now = Date.now()
): SessionActivityMeta {
	const ageMs = getActivityAgeMs(session.lastActivityAt, now);
	const ageLabel = formatActivityAge(session.lastActivityAt, now);
	const isLive = ageMs !== null && ageMs <= LIVE_ACTIVITY_WINDOW_MS;
	const isRecent = ageMs !== null && ageMs <= RECENT_ACTIVITY_WINDOW_MS;
	const activity =
		getLatestLiveActivity(session) ?? getFallbackActivity(session, { isLive, isRecent });
	const activityHeading =
		activity &&
		(session.sessionState === 'starting' ||
			session.sessionState === 'waiting' ||
			session.sessionState === 'working')
			? isRecent
				? 'Now'
				: 'Last signal'
			: activity
				? 'Status'
				: null;

	switch (session.sessionState) {
		case 'starting':
			return {
				label: isLive ? 'Booting now' : 'Starting',
				detail: 'The run is queued and the local runner is warming up.',
				ageLabel,
				tone: 'progress',
				animate: true,
				activityHeading,
				activityLabel: activity?.label ?? null,
				activityDetail: activity?.detail ?? null
			};
		case 'waiting':
		case 'working':
			if (!isRecent) {
				return {
					label: 'Suspect stalled',
					detail: hasStructuredProgressEvidence(session)
						? 'This run showed real Codex output earlier, but nothing new has landed recently.'
						: 'The run is still marked active, but there is no recent structured Codex output to prove it is moving.',
					ageLabel,
					tone: 'attention',
					animate: false,
					activityHeading,
					activityLabel: activity?.label ?? null,
					activityDetail: activity?.detail ?? null
				};
			}

			if (hasStructuredProgressEvidence(session)) {
				return {
					label: isLive ? 'Confirmed active' : 'Confirmed running',
					detail: 'Recent Codex output confirms the run is still moving.',
					ageLabel,
					tone: 'live',
					animate: true,
					activityHeading,
					activityLabel: activity?.label ?? null,
					activityDetail: activity?.detail ?? null
				};
			}

			if (hasStartupEvidence(session)) {
				return {
					label: isLive ? 'Starting up' : 'Awaiting proof',
					detail:
						'The run has startup output, but there is not enough work output yet to confirm progress.',
					ageLabel,
					tone: 'progress',
					animate: true,
					activityHeading,
					activityLabel: activity?.label ?? null,
					activityDetail: activity?.detail ?? null
				};
			}

			return {
				label: isLive ? 'Awaiting proof' : formatSessionStateLabel(session.sessionState),
				detail: 'The run is marked active, but only minimal local runner output is visible so far.',
				ageLabel,
				tone: 'progress',
				animate: true,
				activityHeading,
				activityLabel: activity?.label ?? null,
				activityDetail: activity?.detail ?? null
			};
		case 'ready':
			return {
				label: isRecent ? 'Available now' : formatSessionStateLabel(session.sessionState),
				detail: 'The thread is idle and available for the next instruction.',
				ageLabel,
				tone: 'ready',
				animate: false,
				activityHeading: null,
				activityLabel: null,
				activityDetail: null
			};
		case 'attention':
			return {
				label: formatSessionStateLabel(session.sessionState),
				detail:
					session.latestRunStatus === 'canceled'
						? 'The latest run was canceled before completion.'
						: 'The latest run stopped unexpectedly. Review the recent logs.',
				ageLabel,
				tone: 'attention',
				animate: false,
				activityHeading,
				activityLabel: activity?.label ?? null,
				activityDetail: activity?.detail ?? null
			};
		case 'unavailable':
			return {
				label: formatSessionStateLabel(session.sessionState),
				detail: 'This thread finished, but it is not resumable from the manager right now.',
				ageLabel,
				tone: 'idle',
				animate: false,
				activityHeading: null,
				activityLabel: null,
				activityDetail: null
			};
		case 'idle':
		default:
			return {
				label: isRecent ? 'Recently active' : formatSessionStateLabel(session.sessionState),
				detail: 'No run is currently active in this thread.',
				ageLabel,
				tone: 'idle',
				animate: false,
				activityHeading: null,
				activityLabel: null,
				activityDetail: null
			};
	}
}
