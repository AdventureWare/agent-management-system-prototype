import type { AgentSessionDetail } from '$lib/types/agent-session';

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
			return {
				label: isLive ? 'Live activity' : formatSessionStateLabel(session.sessionState),
				detail: 'The agent is still working, but no saved reply has landed yet.',
				ageLabel,
				tone: 'live',
				animate: true
			};
		case 'working':
			return {
				label: isLive ? 'Live activity' : formatSessionStateLabel(session.sessionState),
				detail: 'The latest run is still in progress and has already emitted thread output.',
				ageLabel,
				tone: 'live',
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
