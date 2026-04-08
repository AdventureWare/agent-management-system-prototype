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
	projectLabel: string;
	roleLabel: string;
	primaryTaskTitle: string;
	relatedTaskCount: number;
	lastActivityLabel: string;
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
		projectLabel: thread.categorization?.projectLabels[0]?.trim() ?? '',
		roleLabel: thread.categorization?.roleLabels[0]?.trim() ?? '',
		primaryTaskTitle:
			thread.relatedTasks.find((task) => task.isPrimary)?.title ?? thread.relatedTasks[0]?.title ?? '',
		relatedTaskCount: thread.relatedTasks.length,
		lastActivityLabel: thread.lastActivityLabel,
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
