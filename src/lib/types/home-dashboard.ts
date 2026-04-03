import type { AgentThreadDetail } from '$lib/types/agent-thread';
import type {
	SelfImprovementSnapshotSummary,
	TrackedSelfImprovementOpportunity
} from '$lib/types/self-improvement';
import type { TaskFreshnessSummary, TaskWorkItem } from '$lib/types/task-work-item';

export type AgentThreadSummary = {
	totalCount: number;
	activeCount: number;
	readyCount: number;
	unavailableCount: number;
	attentionCount: number;
};
export type AgentSessionSummary = AgentThreadSummary;

export type ControlSummary = {
	taskCount: number;
	runCount: number;
	activeRunCount: number;
	blockedRunCount: number;
	openReviewCount: number;
	pendingApprovalCount: number;
	runningTaskCount: number;
	blockedTaskCount: number;
	readyTaskCount: number;
	reviewTaskCount: number;
	reviewRequiredTaskCount: number;
	dependencyBlockedTaskCount: number;
	highRiskTaskCount: number;
	projectCount: number;
	goalCount: number;
	workerCount: number;
	onlineWorkerCount: number;
	busyWorkerCount: number;
};

export type DashboardTaskAttentionItem = TaskWorkItem & {
	goalName: string;
	dependencyTaskNames: string[];
};

export type HomeDashboardData = {
	threads: AgentThreadDetail[];
	sessions?: AgentThreadDetail[];
	threadSummary: AgentThreadSummary;
	sessionSummary?: AgentThreadSummary;
	controlSummary: ControlSummary;
	taskAttention: DashboardTaskAttentionItem[];
	staleTaskSummary: TaskFreshnessSummary;
	staleTasks: DashboardTaskAttentionItem[];
	improvementSummary: SelfImprovementSnapshotSummary;
	improvementOpportunities: TrackedSelfImprovementOpportunity[];
};
