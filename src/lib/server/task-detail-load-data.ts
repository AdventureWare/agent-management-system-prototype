import type {
	ControlPlaneData,
	Project,
	Provider,
	Run,
	Task,
	ExecutionSurface
} from '$lib/types/control-plane';

type RelativeTimeFormatter = (value: string) => string;

export type RelatedRunView = Run & {
	executionSurfaceName: string;
	providerName: string;
	updatedAtLabel: string;
};

export type DependencyTaskView = {
	id: string;
	title: string;
	status: Task['status'];
	projectId: string;
	projectName: string;
};

export type ChildTaskView = {
	id: string;
	title: string;
	status: Task['status'];
	projectId: string;
	projectName: string;
	updatedAtLabel: string;
	delegationPacket: Task['delegationPacket'] | null;
	delegationAcceptance:
		| (NonNullable<Task['delegationAcceptance']> & { acceptedAtLabel: string })
		| null;
	integrationStatus: 'accepted' | 'pending' | 'not_ready';
};

export type ChildTaskRollup = {
	status: 'blocked' | 'review' | 'done' | 'in_progress' | 'ready';
	total: number;
	doneCount: number;
	blockedCount: number;
	reviewCount: number;
	inProgressCount: number;
	readyCount: number;
	acceptedCount: number;
	pendingIntegrationCount: number;
	summary: string;
} | null;

export type AvailableDependencyTaskView = DependencyTaskView & {
	isSelected: boolean;
};

export function buildTaskDetailCollections(input: {
	data: ControlPlaneData;
	task: Task;
	projectMap: Map<string, Project>;
	executionSurfaceMap: Map<string, ExecutionSurface>;
	providerMap: Map<string, Provider>;
	formatRelativeTime: RelativeTimeFormatter;
}) {
	const { data, task, projectMap, executionSurfaceMap, providerMap, formatRelativeTime } = input;
	const dependencyTaskIds = new Set(task.dependencyTaskIds);
	const relatedRuns: RelatedRunView[] = data.runs
		.filter((run) => run.taskId === task.id)
		.map((run) => ({
			...run,
			executionSurfaceName: run.executionSurfaceId
				? (executionSurfaceMap.get(run.executionSurfaceId)?.name ?? 'Unknown execution surface')
				: 'Unassigned',
			providerName: run.providerId
				? (providerMap.get(run.providerId)?.name ?? 'Unknown provider')
				: 'No provider',
			updatedAtLabel: formatRelativeTime(run.updatedAt)
		}))
		.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

	const dependencyTasks: DependencyTaskView[] = data.tasks
		.filter((candidate) => dependencyTaskIds.has(candidate.id))
		.map((dependency) => ({
			id: dependency.id,
			title: dependency.title,
			status: dependency.status,
			projectId: dependency.projectId,
			projectName: projectMap.get(dependency.projectId)?.name ?? 'No project'
		}))
		.sort((left, right) => left.title.localeCompare(right.title));

	const childTasks: ChildTaskView[] = data.tasks
		.filter((candidate) => candidate.parentTaskId === task.id)
		.map((childTask) => {
			const integrationStatus: ChildTaskView['integrationStatus'] = childTask.delegationAcceptance
				? 'accepted'
				: childTask.status === 'done'
					? 'pending'
					: 'not_ready';

			return {
				id: childTask.id,
				title: childTask.title,
				status: childTask.status,
				projectId: childTask.projectId,
				projectName: projectMap.get(childTask.projectId)?.name ?? 'No project',
				updatedAtLabel: formatRelativeTime(childTask.updatedAt),
				delegationPacket: childTask.delegationPacket ?? null,
				delegationAcceptance: childTask.delegationAcceptance
					? {
							...childTask.delegationAcceptance,
							acceptedAtLabel: formatRelativeTime(childTask.delegationAcceptance.acceptedAt)
						}
					: null,
				integrationStatus
			};
		})
		.sort((left, right) => left.title.localeCompare(right.title));

	const childTaskStatusCounts = childTasks.reduce(
		(counts, childTask) => {
			counts[childTask.status] += 1;
			return counts;
		},
		{
			in_draft: 0,
			ready: 0,
			in_progress: 0,
			review: 0,
			blocked: 0,
			done: 0
		}
	);

	const childTaskRollup: ChildTaskRollup =
		childTasks.length > 0
			? (() => {
					const total = childTasks.length;
					const blockedCount = childTaskStatusCounts.blocked;
					const reviewCount = childTaskStatusCounts.review;
					const doneCount = childTaskStatusCounts.done;
					const inProgressCount = childTaskStatusCounts.in_progress;
					const readyCount = childTaskStatusCounts.ready;
					const acceptedCount = childTasks.filter(
						(childTask) => childTask.integrationStatus === 'accepted'
					).length;
					const pendingIntegrationCount = childTasks.filter(
						(childTask) => childTask.integrationStatus === 'pending'
					).length;
					const status =
						blockedCount > 0
							? 'blocked'
							: reviewCount > 0 || pendingIntegrationCount > 0
								? 'review'
								: acceptedCount === total
									? 'done'
									: inProgressCount > 0
										? 'in_progress'
										: 'ready';
					const summary =
						status === 'blocked'
							? `${blockedCount} delegated ${blockedCount === 1 ? 'task is' : 'tasks are'} blocked, so parent integration is blocked.`
							: status === 'review'
								? pendingIntegrationCount > 0
									? `${pendingIntegrationCount} completed child ${pendingIntegrationCount === 1 ? 'handoff is' : 'handoffs are'} waiting on parent acceptance.`
									: `${reviewCount} delegated ${reviewCount === 1 ? 'task is' : 'tasks are'} waiting on review before integration can finish.`
								: status === 'done'
									? 'All delegated subtasks have been accepted by the parent task.'
									: status === 'in_progress'
										? `${inProgressCount} delegated ${inProgressCount === 1 ? 'task is' : 'tasks are'} actively moving.`
										: `${readyCount} delegated ${readyCount === 1 ? 'task is' : 'tasks are'} queued but not started.`;

					return {
						status,
						total,
						doneCount,
						blockedCount,
						reviewCount,
						inProgressCount,
						readyCount,
						acceptedCount,
						pendingIntegrationCount,
						summary
					};
				})()
			: null;

	const availableDependencyTasks: AvailableDependencyTaskView[] = data.tasks
		.filter((candidate) => candidate.id !== task.id)
		.map((candidate) => ({
			id: candidate.id,
			title: candidate.title,
			status: candidate.status,
			projectId: candidate.projectId,
			projectName: projectMap.get(candidate.projectId)?.name ?? 'No project',
			isSelected: dependencyTaskIds.has(candidate.id)
		}))
		.sort((left, right) => {
			if (left.isSelected !== right.isSelected) {
				return left.isSelected ? -1 : 1;
			}

			const projectComparison = left.projectName.localeCompare(right.projectName);

			return projectComparison !== 0 ? projectComparison : left.title.localeCompare(right.title);
		});

	return {
		relatedRuns,
		dependencyTasks,
		childTasks,
		childTaskRollup,
		availableDependencyTasks
	};
}
