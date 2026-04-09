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
	executionSurfaceCount: number;
	onlineExecutionSurfaceCount: number;
	busyExecutionSurfaceCount: number;
};

export type DashboardTaskAttentionItem = TaskWorkItem & {
	goalName: string;
};

export type HomeDashboardData = {
	threads: AgentThreadDetail[];
	threadSummary: AgentThreadSummary;
	controlSummary: ControlSummary;
	taskAttention: DashboardTaskAttentionItem[];
	staleTaskSummary: TaskFreshnessSummary;
	staleTasks: DashboardTaskAttentionItem[];
	improvementSummary: SelfImprovementSnapshotSummary;
	improvementOpportunities: TrackedSelfImprovementOpportunity[];
};
