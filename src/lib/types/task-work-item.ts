import type { AgentThreadDetail } from '$lib/types/agent-thread';
import type { Approval, Review, Run, Task } from '$lib/types/control-plane';

export const TASK_STALE_SIGNAL_KEYS = [
	'staleInProgress',
	'noRecentRunActivity',
	'activeThreadNoRecentOutput'
] as const;

export type TaskStaleSignalKey = (typeof TASK_STALE_SIGNAL_KEYS)[number];

export type TaskFreshness = {
	isStale: boolean;
	staleSignals: TaskStaleSignalKey[];
	staleInProgress: boolean;
	noRecentRunActivity: boolean;
	activeThreadNoRecentOutput: boolean;
	taskAgeMs: number | null;
	taskAgeLabel: string;
	runActivityAgeMs: number | null;
	runActivityAgeLabel: string;
	threadActivityAgeMs: number | null;
	threadActivityAgeLabel: string;
};

export type TaskFreshnessSummary = {
	totalCount: number;
	staleInProgressCount: number;
	noRecentRunActivityCount: number;
	activeThreadNoRecentOutputCount: number;
};

export type TaskWorkItem = Task & {
	projectName: string;
	assigneeName: string;
	latestRun: Run | null;
	assignedThread: AgentThreadDetail | null;
	latestRunThread: AgentThreadDetail | null;
	statusThread: AgentThreadDetail | null;
	linkThread: AgentThreadDetail | null;
	linkThreadKind: 'assigned' | 'latest' | null;
	updatedAtLabel: string;
	hasUnmetDependencies: boolean;
	openReview: Review | null;
	pendingApproval: Approval | null;
	freshness: TaskFreshness;
};
