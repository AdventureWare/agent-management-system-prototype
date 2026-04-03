import type { AgentSessionDetail } from '$lib/types/agent-thread';

export const ACTIVE_REFRESH_INTERVAL_MS = 4_000;
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

	switch (session.sessionState) {
		case 'starting':
			return {
				label: isLive ? 'Booting now' : 'Starting',
				detail: 'The run is queued and the local runner is warming up.',
				ageLabel,
				tone: 'progress',
				animate: true
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
					animate: false
				};
			}

			if (hasStructuredProgressEvidence(session)) {
				return {
					label: isLive ? 'Confirmed active' : 'Confirmed running',
					detail: 'Recent Codex output confirms the run is still moving.',
					ageLabel,
					tone: 'live',
					animate: true
				};
			}

			if (hasStartupEvidence(session)) {
				return {
					label: isLive ? 'Starting up' : 'Awaiting proof',
					detail: 'The run has startup output, but there is not enough work output yet to confirm progress.',
					ageLabel,
					tone: 'progress',
					animate: true
				};
			}

			return {
				label: isLive ? 'Awaiting proof' : formatSessionStateLabel(session.sessionState),
				detail: 'The run is marked active, but only minimal local runner output is visible so far.',
				ageLabel,
				tone: 'progress',
				animate: true
			};
		case 'ready':
			return {
				label: isRecent ? 'Available now' : formatSessionStateLabel(session.sessionState),
				detail: 'The thread is idle and available for the next instruction.',
				ageLabel,
				tone: 'ready',
				animate: false
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
				animate: false
			};
		case 'unavailable':
			return {
				label: formatSessionStateLabel(session.sessionState),
				detail: 'This thread finished, but it is not resumable from the manager right now.',
				ageLabel,
				tone: 'idle',
				animate: false
			};
		case 'idle':
		default:
			return {
				label: isRecent ? 'Recently active' : formatSessionStateLabel(session.sessionState),
				detail: 'No run is currently active in this thread.',
				ageLabel,
				tone: 'idle',
				animate: false
			};
	}
}
