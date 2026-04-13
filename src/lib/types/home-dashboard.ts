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

export type RunSpendRollupItem = {
	key: string;
	label: string;
	runCount: number;
	totalCostUsd: number;
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	attentionRunCount: number;
};

export type RunUsageCostSummary = {
	spendLast24hUsd: number;
	spendLast7dUsd: number;
	failedOrCanceledSpendLast7dRatio: number | null;
	highCostRuns: Array<{
		runId: string;
		taskId: string;
		taskTitle: string;
		providerName: string;
		modelUsed: string | null;
		status: string;
		estimatedCostUsd: number;
	}>;
	rollups: {
		byProvider: RunSpendRollupItem[];
		byActor: RunSpendRollupItem[];
		byProject: RunSpendRollupItem[];
		byGoal: RunSpendRollupItem[];
	};
};

export type HomeDashboardData = {
	threads: AgentThreadDetail[];
	threadSummary: AgentThreadSummary;
	controlSummary: ControlSummary;
	taskAttention: DashboardTaskAttentionItem[];
	staleTaskSummary: TaskFreshnessSummary;
	staleTasks: DashboardTaskAttentionItem[];
	runUsageCost: RunUsageCostSummary;
	improvementSummary: SelfImprovementSnapshotSummary;
	improvementOpportunities: TrackedSelfImprovementOpportunity[];
};
