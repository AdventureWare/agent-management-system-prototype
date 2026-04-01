import {
	ACTIVE_REFRESH_INTERVAL_MS,
	ACTIVITY_CLOCK_INTERVAL_MS,
	formatActivityAge,
	formatSessionStateLabel,
	getSessionActivityMeta,
	type SessionActivityMeta,
	type SessionActivityTone
} from './session-activity';

export { ACTIVE_REFRESH_INTERVAL_MS, ACTIVITY_CLOCK_INTERVAL_MS, formatActivityAge };

export type ThreadActivityTone = SessionActivityTone;
export type ThreadActivityMeta = SessionActivityMeta;

export const formatThreadStateLabel = formatSessionStateLabel;
export const getThreadActivityMeta = getSessionActivityMeta;
