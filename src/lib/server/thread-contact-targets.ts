import type { AgentThreadDetail } from '$lib/types/agent-thread';
import {
	getAgentThreadContactAvailability,
	rankAgentThreadsForRouting
} from '$lib/server/agent-threads';

export type ThreadContactTargetView = {
	id: string;
	name: string;
	handle: string;
	contactLabel: string;
	threadState: AgentThreadDetail['threadState'];
	latestRunStatus: AgentThreadDetail['latestRunStatus'];
	threadSummary: string;
	relatedTaskTitles: string[];
	canContact: boolean;
	disabledReason: string;
	routingReason: string;
};

export function buildThreadContactTarget(thread: AgentThreadDetail): ThreadContactTargetView {
	const availability = getAgentThreadContactAvailability(thread);

	return {
		id: thread.id,
		name: thread.name,
		handle: thread.handle ?? thread.id,
		contactLabel: thread.contactLabel ?? thread.name,
		threadState: thread.threadState,
		latestRunStatus: thread.latestRunStatus,
		threadSummary: thread.threadSummary,
		relatedTaskTitles: thread.relatedTasks.map((task) => task.title),
		canContact: availability.canContact,
		disabledReason: availability.disabledReason,
		routingReason: thread.routingReason ?? ''
	};
}

export function buildThreadContactTargets(
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
) {
	return rankAgentThreadsForRouting(threads, options).map(buildThreadContactTarget);
}
