import { buildTaskThreadSuggestions } from '$lib/server/task-thread-suggestions';
import { buildTaskWorkItems } from '$lib/server/task-work-items';
import { projectMatchesPath, taskHasUnmetDependencies } from '$lib/server/control-plane';
import type { AgentSessionDetail } from '$lib/types/agent-session';
import type { ControlPlaneData, Project, Review, Run, Task } from '$lib/types/control-plane';
import {
	SELF_IMPROVEMENT_CATEGORY_OPTIONS,
	SELF_IMPROVEMENT_SOURCE_OPTIONS,
	type SelfImprovementAnalysis,
	type SelfImprovementConfidence,
	type SelfImprovementOpportunity,
	type SelfImprovementSeverity,
	type SelfImprovementSource,
	type SelfImprovementTaskDraft
} from '$lib/types/self-improvement';

const ACTIVE_TASK_STATUSES = new Set(['ready', 'in_progress', 'blocked', 'review']);
const SEVERITY_RANK: Record<SelfImprovementSeverity, number> = {
	high: 3,
	medium: 2,
	low: 1
};
const CONFIDENCE_RANK: Record<SelfImprovementConfidence, number> = {
	high: 3,
	medium: 2,
	low: 1
};

function compactText(value: string | null | undefined, fallback: string) {
	const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
	return normalized || fallback;
}

function initializeCountRecord<T extends string>(values: readonly T[]) {
	return Object.fromEntries(values.map((value) => [value, 0])) as Record<T, number>;
}

function createOpportunityId(source: SelfImprovementSource, subjectId: string) {
	return `${source}:${subjectId}`;
}

function deriveSuggestedTaskPriority(task: Task): SelfImprovementTaskDraft['priority'] {
	if (task.priority === 'low') {
		return 'medium';
	}

	return task.priority;
}

function createSuggestedTask(task: Task, title: string, summary: string): SelfImprovementTaskDraft {
	return {
		title,
		summary,
		priority: deriveSuggestedTaskPriority(task)
	};
}

function createOpportunity(
	input: Omit<SelfImprovementOpportunity, 'id'> & {
		subjectId: string;
	}
): SelfImprovementOpportunity {
	return {
		id: createOpportunityId(input.source, input.subjectId),
		title: input.title,
		summary: input.summary,
		category: input.category,
		source: input.source,
		severity: input.severity,
		confidence: input.confidence,
		projectId: input.projectId,
		projectName: input.projectName,
		signals: input.signals,
		recommendedActions: input.recommendedActions,
		relatedTaskIds: input.relatedTaskIds,
		relatedRunIds: input.relatedRunIds,
		relatedSessionIds: input.relatedSessionIds,
		suggestedTask: input.suggestedTask
	};
}

function buildProjectContext(task: Task, data: ControlPlaneData) {
	const project = data.projects.find((candidate) => candidate.id === task.projectId) ?? null;

	return {
		projectId: project?.id ?? null,
		projectName: project?.name ?? null
	};
}

function getExecutionSeverity(task: Task, unsuccessfulRunCount: number): SelfImprovementSeverity {
	if (
		unsuccessfulRunCount >= 2 ||
		task.priority === 'urgent' ||
		task.riskLevel === 'high' ||
		task.status === 'blocked'
	) {
		return 'high';
	}

	return 'medium';
}

function buildExecutionOpportunities(data: ControlPlaneData) {
	const runsByTaskId = new Map<string, Run[]>();

	for (const run of data.runs) {
		const runs = runsByTaskId.get(run.taskId) ?? [];
		runs.push(run);
		runsByTaskId.set(run.taskId, runs);
	}

	return data.tasks.flatMap((task) => {
		if (task.status === 'done') {
			return [];
		}

		const unsuccessfulRuns = (runsByTaskId.get(task.id) ?? [])
			.filter((run) => run.status === 'failed' || run.status === 'blocked')
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

		if (unsuccessfulRuns.length === 0) {
			return [];
		}

		const latestRun = unsuccessfulRuns[0];
		const latestDetail = compactText(
			latestRun.errorSummary || latestRun.summary,
			'No error summary was recorded.'
		);
		const projectContext = buildProjectContext(task, data);

		return [
			createOpportunity({
				subjectId: task.id,
				title: `Stabilize execution for ${task.title}`,
				summary:
					'This task has recent failed or blocked runs. The system should turn this pattern into a reliability improvement task instead of retrying blindly.',
				category: 'reliability',
				source: 'failed_runs',
				severity: getExecutionSeverity(task, unsuccessfulRuns.length),
				confidence: 'high',
				projectId: projectContext.projectId,
				projectName: projectContext.projectName,
				signals: [
					`${unsuccessfulRuns.length} unsuccessful run(s) recorded for this task.`,
					`Latest unsuccessful run status: ${latestRun.status}.`,
					`Latest failure detail: ${latestDetail}`
				],
				recommendedActions: [
					'Capture the failure mode in a durable runbook or troubleshooting note.',
					'Add a preflight or retry guard before the worker attempts the same step again.',
					'Create a focused repair task instead of leaving the task in repeated execution churn.'
				],
				relatedTaskIds: [task.id],
				relatedRunIds: unsuccessfulRuns.map((run) => run.id),
				relatedSessionIds: unsuccessfulRuns
					.map((run) => run.sessionId)
					.filter((sessionId): sessionId is string => Boolean(sessionId)),
				suggestedTask: createSuggestedTask(
					task,
					`Stabilize repeated failure path for ${task.title}`,
					[
						'Investigate the repeated failed or blocked runs for this task.',
						`Latest failure detail: ${latestDetail}`,
						'Document the root cause and add a concrete safeguard so future runs do not hit the same failure mode.'
					].join(' ')
				)
			})
		];
	});
}

function buildBlockedTaskOpportunities(data: ControlPlaneData) {
	const taskMap = new Map(data.tasks.map((task) => [task.id, task]));

	return data.tasks.flatMap((task) => {
		if (task.status === 'done') {
			return [];
		}

		const dependencyIds = task.dependencyTaskIds.filter((dependencyId) => {
			const dependency = taskMap.get(dependencyId);
			return dependency?.status !== 'done';
		});
		const hasDependencyBlock = dependencyIds.length > 0 && taskHasUnmetDependencies(data, task);
		const blockedReason = compactText(task.blockedReason, '');
		const isExplicitlyBlocked = task.status === 'blocked' || blockedReason.length > 0;

		if (!hasDependencyBlock && !isExplicitlyBlocked) {
			return [];
		}

		const dependencyTitles = dependencyIds.map(
			(dependencyId) => taskMap.get(dependencyId)?.title ?? dependencyId
		);
		const severity: SelfImprovementSeverity =
			task.priority === 'urgent' || task.priority === 'high' || hasDependencyBlock
				? 'high'
				: 'medium';
		const projectContext = buildProjectContext(task, data);
		const signals = [];

		if (blockedReason) {
			signals.push(`Blocked reason: ${blockedReason}`);
		}

		if (dependencyTitles.length > 0) {
			signals.push(`Unmet dependencies: ${dependencyTitles.join(', ')}`);
		}

		return [
			createOpportunity({
				subjectId: task.id,
				title: `Unblock ${task.title}`,
				summary:
					'The task is carrying a blocker signal. The system should convert that blocker into explicit follow-up work, routing, or prerequisite handling.',
				category: 'coordination',
				source: 'blocked_tasks',
				severity,
				confidence: blockedReason ? 'high' : 'medium',
				projectId: projectContext.projectId,
				projectName: projectContext.projectName,
				signals,
				recommendedActions: [
					'Turn the blocker into a concrete remediation task or prerequisite task.',
					'Capture the blocker reason so similar tasks can be routed earlier or prepared better.',
					'Escalate to a human only if the blocker cannot be removed through normal task decomposition.'
				],
				relatedTaskIds: [task.id, ...dependencyIds],
				relatedRunIds: [],
				relatedSessionIds: task.threadSessionId ? [task.threadSessionId] : [],
				suggestedTask: createSuggestedTask(
					task,
					`Resolve blocker for ${task.title}`,
					[
						'Investigate and remove the blocker preventing this task from moving forward.',
						blockedReason ? `Current blocker: ${blockedReason}` : '',
						dependencyTitles.length > 0
							? `Relevant unmet dependencies: ${dependencyTitles.join(', ')}.`
							: '',
						'Update routing, prerequisites, or task decomposition so the same blocker is less likely to recur.'
					]
						.filter(Boolean)
						.join(' ')
				)
			})
		];
	});
}

function buildStaleTaskOpportunities(
	data: ControlPlaneData,
	sessions: AgentSessionDetail[],
	now?: number
) {
	return buildTaskWorkItems(data, sessions, { now })
		.filter((task) => task.status !== 'done' && task.freshness.isStale)
		.map((task) => {
			const staleSignals = [];

			if (task.freshness.staleInProgress) {
				staleSignals.push('Task has stayed in progress without updates for too long.');
			}

			if (task.freshness.noRecentRunActivity) {
				staleSignals.push('Active run heartbeat is stale.');
			}

			if (task.freshness.activeThreadNoRecentOutput) {
				staleSignals.push('Assigned thread has gone quiet while still looking active.');
			}

			return createOpportunity({
				subjectId: task.id,
				title: `Recover stalled work on ${task.title}`,
				summary:
					'This task is stale based on run, task, or thread activity. The system should treat this as a recovery opportunity instead of waiting indefinitely.',
				category: 'automation',
				source: 'stale_tasks',
				severity:
					task.priority === 'urgent' || task.freshness.staleSignals.length >= 2 ? 'high' : 'medium',
				confidence: 'high',
				projectId: task.projectId,
				projectName: task.projectName === 'No project' ? null : task.projectName,
				signals: [
					...staleSignals,
					`Task activity: ${task.freshness.taskAgeLabel}.`,
					`Run activity: ${task.freshness.runActivityAgeLabel}.`,
					`Thread activity: ${task.freshness.threadActivityAgeLabel}.`
				],
				recommendedActions: [
					'Add an automated stale-work watchdog that nudges, retries, or reassigns based on the signal.',
					'Record the recovery action taken so the system can learn which interventions are effective.',
					'Escalate only after an automated recovery attempt or explicit timeout policy is exhausted.'
				],
				relatedTaskIds: [task.id],
				relatedRunIds: task.latestRun ? [task.latestRun.id] : [],
				relatedSessionIds: task.statusThread ? [task.statusThread.id] : [],
				suggestedTask: createSuggestedTask(
					task,
					`Add stale-work recovery for ${task.title}`,
					[
						'Analyze why this task went stale and define the correct automated recovery path.',
						`Observed stale signals: ${task.freshness.staleSignals.join(', ') || 'general inactivity'}.`,
						'Implement or refine watchdog behavior so similar tasks recover faster next time.'
					].join(' ')
				)
			});
		});
}

function buildReviewFeedbackOpportunities(data: ControlPlaneData) {
	const reviewsByTaskId = new Map<string, Review[]>();

	for (const review of data.reviews) {
		if (review.status !== 'changes_requested') {
			continue;
		}

		const reviews = reviewsByTaskId.get(review.taskId) ?? [];
		reviews.push(review);
		reviewsByTaskId.set(review.taskId, reviews);
	}

	return data.tasks.flatMap((task) => {
		if (task.status === 'done') {
			return [];
		}

		const changeRequests = (reviewsByTaskId.get(task.id) ?? []).sort((left, right) =>
			right.updatedAt.localeCompare(left.updatedAt)
		);

		if (changeRequests.length === 0) {
			return [];
		}

		const projectContext = buildProjectContext(task, data);

		return [
			createOpportunity({
				subjectId: task.id,
				title: `Capture review lessons from ${task.title}`,
				summary:
					'Review feedback has already exposed a quality gap on this task. The system should distill that feedback into reusable guidance, checks, or skills.',
				category: 'quality',
				source: 'review_feedback',
				severity:
					changeRequests.length >= 2 || task.runCount >= 2 || task.priority !== 'medium'
						? 'high'
						: 'medium',
				confidence: 'medium',
				projectId: projectContext.projectId,
				projectName: projectContext.projectName,
				signals: [
					`${changeRequests.length} review item(s) requested changes on this task.`,
					`Most recent review note: ${compactText(changeRequests[0]?.summary, 'No review summary recorded.')}`
				],
				recommendedActions: [
					'Extract the recurring review feedback into a checklist, heuristic, or skill note.',
					'Tie future similar tasks to that checklist before work starts.',
					'Add validation or tests when the review pattern points to a repeated correctness gap.'
				],
				relatedTaskIds: [task.id],
				relatedRunIds: changeRequests
					.map((review) => review.runId)
					.filter((runId): runId is string => Boolean(runId)),
				relatedSessionIds: task.threadSessionId ? [task.threadSessionId] : [],
				suggestedTask: createSuggestedTask(
					task,
					`Codify review feedback for ${task.title}`,
					[
						'Review the requested changes on this task and distill them into reusable guidance.',
						'If the issue is recurring, convert the guidance into a skill, checklist, or validation step.'
					].join(' ')
				)
			})
		];
	});
}

function selectProjectSessions(project: Project | undefined, sessions: AgentSessionDetail[]) {
	if (!project) {
		return [];
	}

	return sessions.filter((session) => projectMatchesPath(project, session.cwd));
}

function buildThreadReuseOpportunities(data: ControlPlaneData, sessions: AgentSessionDetail[]) {
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const sessionMap = new Map(sessions.map((session) => [session.id, session]));

	return data.tasks.flatMap((task) => {
		if (!ACTIVE_TASK_STATUSES.has(task.status) || task.status === 'blocked') {
			return [];
		}

		const projectSessions = selectProjectSessions(projectMap.get(task.projectId), sessions);

		if (projectSessions.length === 0) {
			return [];
		}

		const suggestion = buildTaskThreadSuggestions({
			task,
			assignedThreadId: task.threadSessionId,
			sessions: projectSessions
		}).suggestedThread;

		if (!suggestion || suggestion.id === task.threadSessionId) {
			return [];
		}

		const assignedThread = task.threadSessionId
			? (sessionMap.get(task.threadSessionId) ?? null)
			: null;
		const assignedThreadIsUnavailable = assignedThread
			? !assignedThread.canResume || assignedThread.hasActiveRun
			: false;

		if (assignedThread && !assignedThreadIsUnavailable) {
			return [];
		}

		return [
			createOpportunity({
				subjectId: task.id,
				title: `Reuse better context for ${task.title}`,
				summary:
					'The system found a more relevant available thread for this task than the one currently linked. This is a lightweight opportunity to improve continuity and reduce re-explaining work.',
				category: 'knowledge',
				source: 'thread_reuse_gap',
				severity: task.priority === 'high' || task.priority === 'urgent' ? 'medium' : 'low',
				confidence: task.threadSessionId ? 'medium' : 'high',
				projectId: task.projectId,
				projectName: projectMap.get(task.projectId)?.name ?? null,
				signals: [
					task.threadSessionId
						? `Assigned thread is not currently reusable: ${task.threadSessionId}.`
						: 'Task has no assigned thread.',
					`Suggested thread: ${suggestion.name}.`,
					`Why it fits: ${suggestion.suggestionReason ?? 'Relevant prior context exists.'}`
				],
				recommendedActions: [
					'Offer the suggested thread directly in the task workflow and capture whether the operator accepts it.',
					'Promote accepted matches into better thread-assignment heuristics.',
					'Auto-link only when confidence is high and the operator has opted into adaptive routing.'
				],
				relatedTaskIds: [task.id],
				relatedRunIds: [],
				relatedSessionIds: [suggestion.id, ...(task.threadSessionId ? [task.threadSessionId] : [])],
				suggestedTask: createSuggestedTask(
					task,
					`Improve thread reuse for ${task.title}`,
					[
						'Review why the system identified a better reusable thread for this task.',
						`Suggested thread: ${suggestion.name}.`,
						'Refine the thread-assignment rules so similar tasks inherit stronger context automatically.'
					].join(' ')
				)
			})
		];
	});
}

function compareOpportunities(left: SelfImprovementOpportunity, right: SelfImprovementOpportunity) {
	if (SEVERITY_RANK[left.severity] !== SEVERITY_RANK[right.severity]) {
		return SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity];
	}

	if (CONFIDENCE_RANK[left.confidence] !== CONFIDENCE_RANK[right.confidence]) {
		return CONFIDENCE_RANK[right.confidence] - CONFIDENCE_RANK[left.confidence];
	}

	return left.title.localeCompare(right.title);
}

export function buildSelfImprovementAnalysis(input: {
	data: ControlPlaneData;
	sessions: AgentSessionDetail[];
	now?: number;
}): SelfImprovementAnalysis {
	const opportunities = [
		...buildExecutionOpportunities(input.data),
		...buildBlockedTaskOpportunities(input.data),
		...buildStaleTaskOpportunities(input.data, input.sessions, input.now),
		...buildReviewFeedbackOpportunities(input.data),
		...buildThreadReuseOpportunities(input.data, input.sessions)
	].sort(compareOpportunities);
	const byCategory = initializeCountRecord(SELF_IMPROVEMENT_CATEGORY_OPTIONS);
	const bySource = initializeCountRecord(SELF_IMPROVEMENT_SOURCE_OPTIONS);

	for (const opportunity of opportunities) {
		byCategory[opportunity.category] += 1;
		bySource[opportunity.source] += 1;
	}

	return {
		generatedAt: new Date(input.now ?? Date.now()).toISOString(),
		summary: {
			totalCount: opportunities.length,
			highSeverityCount: opportunities.filter((opportunity) => opportunity.severity === 'high')
				.length,
			byCategory,
			bySource
		},
		opportunities
	};
}
