import type { InstalledCodexSkill } from '$lib/server/codex-skills';
import type {
	Approval,
	Decision,
	Project,
	Provider,
	Review,
	Role,
	Task,
	ExecutionSurface
} from '$lib/types/control-plane';
import type {
	ChildTaskRollup,
	DependencyTaskView,
	RelatedRunView,
	AvailableDependencyTaskView,
	ChildTaskView
} from './task-detail-load-data';

type RelativeTimeFormatter = (value: string) => string;

type ThreadContextView = {
	assignedThread: unknown | null;
	latestRunThread: unknown | null;
	statusThread: unknown | null;
	linkThread: unknown | null;
	linkThreadKind: string | null;
};

export function buildRecentTaskDecisionViews(
	decisions: Decision[],
	taskId: string,
	formatRelativeTime: RelativeTimeFormatter
) {
	return decisions
		.filter((decision) => decision.taskId === taskId)
		.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
		.slice(0, 8)
		.map((decision) => ({
			...decision,
			createdAtLabel: formatRelativeTime(decision.createdAt)
		}));
}

export function summarizeInstalledSkills(skills: InstalledCodexSkill[]) {
	return {
		totalCount: skills.length,
		globalCount: skills.filter((skill) => skill.global).length,
		projectCount: skills.filter((skill) => skill.project).length,
		previewSkills: skills.slice(0, 8)
	};
}

export function buildAssignmentSuggestionViews<
	T extends { roleId: string; providerId: string; executionSurfaceId: string | null }
>(
	suggestions: T[],
	roles: Role[],
	providers: Provider[],
	currentAssigneeId: string | null
): Array<T & { roleName: string; providerName: string; isCurrentAssignee: boolean }> {
	return suggestions.map((suggestion) => ({
		...suggestion,
		roleName: roles.find((role) => role.id === suggestion.roleId)?.name ?? suggestion.roleId,
		providerName:
			providers.find((provider) => provider.id === suggestion.providerId)?.name ??
			suggestion.providerId,
		isCurrentAssignee: suggestion.executionSurfaceId === currentAssigneeId
	}));
}

export function buildTaskDetailTaskView(input: {
	task: Task;
	projectMap: Map<string, Project>;
	goalMap: Map<string, { name: string }>;
	roleMap: Map<string, { name: string }>;
	workerMap: Map<string, ExecutionSurface>;
	latestRun: RelatedRunView | null;
	activeRun: RelatedRunView | null;
	threadContext: ThreadContextView;
	openReview: Review | null;
	pendingApproval: Approval | null;
	formatRelativeTime: RelativeTimeFormatter;
}) {
	const {
		task,
		projectMap,
		goalMap,
		roleMap,
		workerMap,
		latestRun,
		activeRun,
		threadContext,
		openReview,
		pendingApproval,
		formatRelativeTime
	} = input;

	return {
		...task,
		delegationAcceptance: task.delegationAcceptance
			? {
					...task.delegationAcceptance,
					acceptedAtLabel: formatRelativeTime(task.delegationAcceptance.acceptedAt)
				}
			: null,
		projectName: projectMap.get(task.projectId)?.name ?? 'No project',
		goalName: task.goalId ? (goalMap.get(task.goalId)?.name ?? 'Unknown goal') : '',
		desiredRoleName: task.desiredRoleId
			? (roleMap.get(task.desiredRoleId)?.name ?? task.desiredRoleId)
			: '',
		assigneeName: task.assigneeExecutionSurfaceId
			? (workerMap.get(task.assigneeExecutionSurfaceId)?.name ?? 'Unknown worker')
			: 'Unassigned',
		latestRun,
		activeRun,
		hasActiveRun: Boolean(activeRun),
		...threadContext,
		updatedAtLabel: formatRelativeTime(task.updatedAt),
		openReview,
		pendingApproval
	};
}

export function buildParentTaskView(parentTask: Task | null, projectMap: Map<string, Project>) {
	return parentTask
		? {
				id: parentTask.id,
				title: parentTask.title,
				status: parentTask.status,
				projectId: parentTask.projectId,
				projectName: projectMap.get(parentTask.projectId)?.name ?? 'No project'
			}
		: null;
}

export type TaskDetailDisplayData = {
	task: ReturnType<typeof buildTaskDetailTaskView>;
	parentTask: ReturnType<typeof buildParentTaskView>;
	availableSkills: ReturnType<typeof summarizeInstalledSkills>;
	recentDecisions: ReturnType<typeof buildRecentTaskDecisionViews>;
	assignmentSuggestions: ReturnType<typeof buildAssignmentSuggestionViews>;
	childTasks: ChildTaskView[];
	childTaskRollup: ChildTaskRollup;
	relatedRuns: RelatedRunView[];
	dependencyTasks: DependencyTaskView[];
	availableDependencyTasks: AvailableDependencyTaskView[];
};
