import type { AgentSessionDetail } from '$lib/types/agent-session';
import type { Approval, Review, Task } from '$lib/types/control-plane';

export type AgentSessionSummary = {
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
	workerCount: number;
	onlineWorkerCount: number;
	busyWorkerCount: number;
};

export type DashboardTaskAttentionItem = Task & {
	goalName: string;
	projectName: string;
	assigneeName: string;
	openReview: Review | null;
	pendingApproval: Approval | null;
	hasUnmetDependencies: boolean;
	dependencyTaskNames: string[];
};

export type HomeDashboardData = {
	sessions: AgentSessionDetail[];
	sessionSummary: AgentSessionSummary;
	controlSummary: ControlSummary;
	taskAttention: DashboardTaskAttentionItem[];
};
