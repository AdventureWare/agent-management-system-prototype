import { buildTaskThreadSuggestions } from '$lib/server/task-thread-suggestions';
import { buildTaskWorkItems } from '$lib/server/task-work-items';
import { projectMatchesPath, taskHasUnmetDependencies } from '$lib/server/control-plane';
import {
	getGoalDescendantGoalIds,
	getGoalLinkedProjectIds,
	getGoalLinkedProjects,
	getGoalLinkedTaskIds,
	getGoalLinkedTasks,
	getGoalScopeProjectIds,
	getGoalScopeTaskIds
} from '$lib/server/goal-relationships';
import type { AgentSessionDetail } from '$lib/types/agent-thread';
import type { ControlPlaneData, Goal, Project, Review, Run, Task } from '$lib/types/control-plane';
import {
	SELF_IMPROVEMENT_CATEGORY_OPTIONS,
	SELF_IMPROVEMENT_SIGNAL_TYPE_OPTIONS,
	SELF_IMPROVEMENT_SOURCE_OPTIONS,
	type SelfImprovementAnalysis,
	type SelfImprovementConfidence,
	type SelfImprovementFeedbackSignal,
	type SelfImprovementKnowledgeDraft,
	type SelfImprovementOpportunity,
	type SelfImprovementSignalSummary,
	type SelfImprovementSeverity,
	type SelfImprovementSignalType,
	type SelfImprovementSource,
	type SelfImprovementTaskDraft
} from '$lib/types/self-improvement';

const ACTIVE_TASK_STATUSES = new Set(['ready', 'in_progress', 'blocked', 'review']);
const FORWARD_PROGRESS_TASK_STATUSES = new Set(['ready', 'in_progress', 'review']);
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

function uniqueStrings(values: Iterable<string>) {
	return [...new Set([...values].filter((value) => value.trim().length > 0))];
}

function initializeCountRecord<T extends string>(values: readonly T[]) {
	return Object.fromEntries(values.map((value) => [value, 0])) as Record<T, number>;
}

function createOpportunityId(source: SelfImprovementSource, subjectId: string) {
	return `${source}:${subjectId}`;
}

function createFeedbackSignalId(signalType: SelfImprovementSignalType, subjectId: string) {
	return `${signalType}:${subjectId}`;
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

function createSuggestedKnowledgeItem(
	title: string,
	summary: string,
	triggerPattern: string,
	recommendedResponse: string,
	applicabilityScope: string[]
): SelfImprovementKnowledgeDraft {
	return {
		title,
		summary,
		triggerPattern,
		recommendedResponse,
		applicabilityScope
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
		suggestedTask: input.suggestedTask,
		suggestedKnowledgeItem: input.suggestedKnowledgeItem
	};
}

function createFeedbackSignal(input: SelfImprovementFeedbackSignal): SelfImprovementFeedbackSignal {
	return input;
}

function buildProjectContext(task: Task, data: ControlPlaneData) {
	const project = data.projects.find((candidate) => candidate.id === task.projectId) ?? null;

	return {
		projectId: project?.id ?? null,
		projectName: project?.name ?? null
	};
}

function intersectsRecordScope(recordIds: string[], scopedIds: Set<string>) {
	return recordIds.some((recordId) => scopedIds.has(recordId));
}

function buildGoalContext(data: ControlPlaneData, goalId: string) {
	const goal = data.goals.find((candidate) => candidate.id === goalId) ?? null;

	if (!goal) {
		return null;
	}

	const scopedGoalIds = new Set([goalId, ...getGoalDescendantGoalIds(data, goalId)]);

	return {
		goal,
		scopedGoals: data.goals.filter((candidate) => scopedGoalIds.has(candidate.id)),
		scopedTaskIds: new Set(getGoalScopeTaskIds(data, goalId)),
		scopedProjectIds: new Set(getGoalScopeProjectIds(data, goalId))
	};
}

function buildGoalAlignmentAction(goal: Goal) {
	const successSignal = compactText(goal.successSignal, '');

	if (successSignal) {
		return `Keep the follow-up aligned with goal "${goal.name}" and its success signal: ${successSignal}.`;
	}

	return `Keep the follow-up aligned with goal "${goal.name}" and record how the work advances that goal.`;
}

function getOpportunityMatchedGoalNames(
	opportunity: SelfImprovementOpportunity,
	data: ControlPlaneData,
	scopedGoals: Goal[]
) {
	return uniqueStrings(
		scopedGoals
			.filter((goal) => {
				const linkedTaskIds = new Set(getGoalLinkedTaskIds(data, goal));
				const linkedProjectIds = new Set(getGoalLinkedProjectIds(data, goal));

				return (
					linkedProjectIds.has(opportunity.projectId ?? '') ||
					intersectsRecordScope(opportunity.relatedTaskIds, linkedTaskIds)
				);
			})
			.map((goal) => goal.name)
	);
}

function applyGoalContextToOpportunity<T extends SelfImprovementOpportunity>(
	opportunity: T,
	data: ControlPlaneData,
	goalContext: NonNullable<ReturnType<typeof buildGoalContext>>
): T {
	const matchesGoalScope =
		goalContext.scopedProjectIds.has(opportunity.projectId ?? '') ||
		intersectsRecordScope(opportunity.relatedTaskIds, goalContext.scopedTaskIds);

	if (!matchesGoalScope) {
		return opportunity;
	}

	const matchedGoalNames = getOpportunityMatchedGoalNames(
		opportunity,
		data,
		goalContext.scopedGoals
	);
	const relatedGoalNames = matchedGoalNames.filter((name) => name !== goalContext.goal.name);
	const goalAlignmentAction = buildGoalAlignmentAction(goalContext.goal);
	const summaryNotes = uniqueStrings([
		`Goal focus: ${goalContext.goal.name}.`,
		relatedGoalNames.length > 0
			? `Matched goal context in this subtree: ${relatedGoalNames.join(', ')}.`
			: ''
	]);

	return {
		...opportunity,
		summary: [opportunity.summary, ...summaryNotes].join(' '),
		recommendedActions: uniqueStrings([goalAlignmentAction, ...opportunity.recommendedActions]),
		suggestedTask: opportunity.suggestedTask
			? {
					...opportunity.suggestedTask,
					title: `Advance ${goalContext.goal.name}: ${opportunity.suggestedTask.title}`,
					summary: [opportunity.suggestedTask.summary, goalAlignmentAction].join(' ')
				}
			: null,
		suggestedKnowledgeItem: opportunity.suggestedKnowledgeItem
			? {
					...opportunity.suggestedKnowledgeItem,
					title: `${opportunity.suggestedKnowledgeItem.title} for ${goalContext.goal.name}`,
					summary: [opportunity.suggestedKnowledgeItem.summary, goalAlignmentAction].join(' '),
					applicabilityScope: uniqueStrings([
						`Goal: ${goalContext.goal.name}`,
						...relatedGoalNames.map((name) => `Related goal: ${name}`),
						...opportunity.suggestedKnowledgeItem.applicabilityScope
					])
				}
			: null
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
				),
				suggestedKnowledgeItem: createSuggestedKnowledgeItem(
					`Failure recovery pattern for ${task.title}`,
					'Capture the repeated failure mode as durable guidance so future runs can detect or avoid it earlier.',
					[
						`${unsuccessfulRuns.length} failed or blocked run(s) were recorded for this task.`,
						`Latest failure detail: ${latestDetail}`
					].join(' '),
					[
						'Run a preflight check before retrying the same path.',
						'Document the root cause and the concrete safeguard or recovery path.',
						'Route repeated failures into a focused repair task instead of continuing blind retries.'
					].join(' '),
					[
						projectContext.projectName ?? 'Cross-project reliability work',
						'Tasks with repeated failed or blocked runs'
					]
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
				),
				suggestedKnowledgeItem: createSuggestedKnowledgeItem(
					`Blocker handling for ${task.title}`,
					'Capture how this blocker should be identified and decomposed so future tasks are prepared earlier.',
					[
						blockedReason ? `Recorded blocker reason: ${blockedReason}` : '',
						dependencyTitles.length > 0
							? `Outstanding dependencies: ${dependencyTitles.join(', ')}.`
							: ''
					]
						.filter(Boolean)
						.join(' '),
					[
						'Convert the blocker into a concrete prerequisite or remediation task.',
						'Record the blocker reason early in task setup.',
						'Escalate only after normal decomposition and routing options are exhausted.'
					].join(' '),
					[
						projectContext.projectName ?? 'Cross-project coordination work',
						'Tasks with explicit blockers or unmet dependencies'
					]
				)
			})
		];
	});
}

function buildPlanningGapOpportunities(data: ControlPlaneData) {
	const goalOpportunities = data.goals.flatMap((goal) => {
		if (goal.status === 'done') {
			return [];
		}

		const linkedTasks = getGoalLinkedTasks(data, goal);
		const openTasks = linkedTasks.filter((task) => task.status !== 'done');
		const forwardProgressTasks = openTasks.filter((task) =>
			FORWARD_PROGRESS_TASK_STATUSES.has(task.status)
		);

		if (forwardProgressTasks.length > 0) {
			return [];
		}

		const blockedTasks = openTasks.filter((task) => task.status === 'blocked');
		const draftTasks = openTasks.filter((task) => task.status === 'in_draft');
		const linkedProjects = getGoalLinkedProjects(data, goal);
		const primaryProject =
			linkedProjects[0] ??
			(goal.projectIds ?? [])
				.map((projectId) => data.projects.find((candidate) => candidate.id === projectId) ?? null)
				.find((project): project is Project => Boolean(project)) ??
			null;
		const signals = [
			openTasks.length === 0
				? 'Goal currently has no active non-done tasks linked to it.'
				: `Open goal tasks exist, but none are ready or in progress: ${openTasks.map((task) => task.title).join(', ')}.`,
			goal.successSignal ? `Goal success signal: ${goal.successSignal}` : '',
			blockedTasks.length > 0
				? `Blocked goal tasks: ${blockedTasks.map((task) => task.title).join(', ')}.`
				: '',
			draftTasks.length > 0
				? `Draft-only goal tasks: ${draftTasks.map((task) => task.title).join(', ')}.`
				: ''
		].filter(Boolean);
		const priority: SelfImprovementTaskDraft['priority'] =
			blockedTasks.length > 0 || goal.status === 'blocked' ? 'high' : 'medium';

		return [
			createOpportunity({
				subjectId: goal.id,
				title: `Generate next steps for ${goal.name}`,
				summary:
					'This goal does not currently have an actionable next-step task. The system should generate a concrete follow-up task instead of leaving the goal without momentum.',
				category: 'coordination',
				source: 'planning_gaps',
				severity: priority === 'high' ? 'high' : 'medium',
				confidence: goal.successSignal ? 'high' : 'medium',
				projectId: primaryProject?.id ?? null,
				projectName: primaryProject?.name ?? null,
				signals,
				recommendedActions: [
					'Create the next concrete task that advances the goal instead of leaving it in a planning gap.',
					'Attach the next task to the goal and make the intended success signal explicit.',
					blockedTasks.length > 0
						? 'Turn blocked goal work into a recovery, decomposition, or prerequisite task.'
						: 'Prefer a ready task over more vague planning or passive monitoring.'
				],
				relatedTaskIds: openTasks.map((task) => task.id),
				relatedRunIds: [],
				relatedSessionIds: openTasks
					.map((task) => task.threadSessionId)
					.filter((sessionId): sessionId is string => Boolean(sessionId)),
				suggestedTask: {
					title: `Plan next step for ${goal.name}`,
					summary: [
						`Create the next highest-value task for the goal "${goal.name}".`,
						goal.summary ? `Goal summary: ${goal.summary}` : '',
						goal.successSignal ? `Success signal: ${goal.successSignal}` : '',
						openTasks.length > 0
							? `Current non-done goal tasks are not actionable yet: ${openTasks.map((task) => task.title).join(', ')}.`
							: 'There are no active non-done tasks currently linked to the goal.'
					]
						.filter(Boolean)
						.join(' '),
					priority
				},
				suggestedKnowledgeItem: createSuggestedKnowledgeItem(
					`Goal planning heuristic for ${goal.name}`,
					'Capture how to keep this goal supplied with concrete next-step tasks instead of leaving it without momentum.',
					signals.join(' '),
					[
						'Define the next concrete task before the goal loses momentum.',
						'Attach the task to the goal and record the intended success signal.',
						'When current goal tasks are blocked, decompose them into recovery or prerequisite work.'
					].join(' '),
					[primaryProject?.name ?? 'Cross-project planning work', `Goal: ${goal.name}`]
				)
			})
		];
	});

	const projectOpportunities = data.projects.flatMap((project) => {
		const projectTasks = data.tasks.filter((task) => task.projectId === project.id);
		const openTasks = projectTasks.filter((task) => task.status !== 'done');
		const forwardProgressTasks = openTasks.filter((task) =>
			FORWARD_PROGRESS_TASK_STATUSES.has(task.status)
		);
		const linkedGoals = data.goals.filter(
			(goal) => goal.status !== 'done' && getGoalLinkedProjectIds(data, goal).includes(project.id)
		);

		if (linkedGoals.length > 0 || forwardProgressTasks.length > 0) {
			return [];
		}

		if (openTasks.length === 0) {
			return [];
		}

		const blockedTasks = openTasks.filter((task) => task.status === 'blocked');
		const draftTasks = openTasks.filter((task) => task.status === 'in_draft');

		return [
			createOpportunity({
				subjectId: project.id,
				title: `Generate next project steps for ${project.name}`,
				summary:
					'This project has work in flight, but nothing currently ready to advance. The system should generate a concrete next-step task to restore momentum.',
				category: 'coordination',
				source: 'planning_gaps',
				severity: blockedTasks.length > 0 ? 'high' : 'medium',
				confidence: 'medium',
				projectId: project.id,
				projectName: project.name,
				signals: [
					`Open project tasks: ${openTasks.map((task) => task.title).join(', ')}.`,
					blockedTasks.length > 0
						? `Blocked project tasks: ${blockedTasks.map((task) => task.title).join(', ')}.`
						: '',
					draftTasks.length > 0
						? `Draft-only project tasks: ${draftTasks.map((task) => task.title).join(', ')}.`
						: '',
					'The project has no linked active goals to generate next-step work from.'
				].filter(Boolean),
				recommendedActions: [
					'Create a concrete next-step task that restores forward motion for the project.',
					'If the project should be goal-driven, attach the next task to a project goal.',
					'Convert blocked or draft-only work into a ready task with a clear owner and outcome.'
				],
				relatedTaskIds: openTasks.map((task) => task.id),
				relatedRunIds: [],
				relatedSessionIds: openTasks
					.map((task) => task.threadSessionId)
					.filter((sessionId): sessionId is string => Boolean(sessionId)),
				suggestedTask: {
					title: `Plan next project step for ${project.name}`,
					summary: [
						`Create the next concrete task for the project "${project.name}".`,
						`Current open work is not yet actionable: ${openTasks.map((task) => task.title).join(', ')}.`,
						'Prefer a ready task with a clear outcome over leaving the project in blocked or draft-only churn.'
					].join(' '),
					priority: blockedTasks.length > 0 ? 'high' : 'medium'
				},
				suggestedKnowledgeItem: createSuggestedKnowledgeItem(
					`Project planning heuristic for ${project.name}`,
					'Capture how to turn blocked or draft-only project work into concrete next-step tasks.',
					`Open project tasks are not currently actionable: ${openTasks.map((task) => task.title).join(', ')}.`,
					[
						'Create a ready task whenever project work is blocked or draft-only.',
						'Attach the next task to a goal when the project should be goal-driven.',
						'Keep at least one concrete next-step task available for the project.'
					].join(' '),
					[project.name, 'Projects without an actionable next-step task']
				)
			})
		];
	});

	return [...goalOpportunities, ...projectOpportunities];
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
				),
				suggestedKnowledgeItem: createSuggestedKnowledgeItem(
					`Stale-work recovery for ${task.title}`,
					'Turn this stale-work pattern into a documented recovery play so the system can intervene sooner next time.',
					`Observed stale signals: ${task.freshness.staleSignals.join(', ') || 'general inactivity'}.`,
					[
						'Define the first automated recovery action such as nudge, retry, reassignment, or timeout handling.',
						'Record which recovery action worked so future stale tasks can follow the same path.',
						'Escalate to a human only after the defined recovery policy is exhausted.'
					].join(' '),
					[
						task.projectName === 'No project' ? 'Cross-project automation work' : task.projectName,
						'Tasks that have gone stale based on task, run, or thread activity'
					]
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
				),
				suggestedKnowledgeItem: createSuggestedKnowledgeItem(
					`Review checklist for ${task.title}`,
					'Capture the requested review changes as reusable quality guidance for similar work.',
					`Most recent review note: ${compactText(changeRequests[0]?.summary, 'No review summary recorded.')}`,
					[
						'Turn the review feedback into a checklist or heuristic that can be applied before review.',
						'Add validation or tests when the review pattern points to a repeated correctness gap.',
						'Attach the checklist to similar future tasks before implementation starts.'
					].join(' '),
					[
						projectContext.projectName ?? 'Cross-project quality work',
						'Tasks that received changes-requested review feedback'
					]
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
				),
				suggestedKnowledgeItem: createSuggestedKnowledgeItem(
					`Thread reuse heuristic for ${task.title}`,
					'Capture why a better thread was suggested so future routing can reuse context more reliably.',
					[
						task.threadSessionId
							? `Current thread was unavailable or weakly matched: ${task.threadSessionId}.`
							: 'The task did not have an assigned thread.',
						`Suggested thread: ${suggestion.name}.`,
						`Suggestion reason: ${suggestion.suggestionReason ?? 'Relevant prior context exists.'}`
					].join(' '),
					[
						'Offer the better thread directly in the task workflow.',
						'Record accepted matches and use them to improve routing heuristics.',
						'Only auto-link when confidence is high and adaptive routing is enabled.'
					].join(' '),
					[
						projectMap.get(task.projectId)?.name ?? 'Cross-project knowledge routing',
						'Tasks where a better reusable thread is available'
					]
				)
			})
		];
	});
}

function buildExecutionFeedbackSignals(data: ControlPlaneData): SelfImprovementFeedbackSignal[] {
	const taskMap = new Map(data.tasks.map((task) => [task.id, task]));

	return data.runs
		.filter((run) => run.status === 'failed' || run.status === 'blocked')
		.map((run) => {
			const task = taskMap.get(run.taskId) ?? null;
			const projectContext = task
				? buildProjectContext(task, data)
				: { projectId: null, projectName: null };

			return createFeedbackSignal({
				id: createFeedbackSignalId('run_failure', run.id),
				signalType: 'run_failure',
				opportunityId: createOpportunityId('failed_runs', run.taskId),
				category: 'reliability',
				severity: task ? getExecutionSeverity(task, 1) : 'medium',
				confidence: 'high',
				projectId: projectContext.projectId,
				projectName: projectContext.projectName,
				taskId: run.taskId,
				runId: run.id,
				reviewId: null,
				sessionId: run.sessionId,
				title: task ? `Run failure for ${task.title}` : `Run failure for ${run.taskId}`,
				summary: compactText(
					run.errorSummary || run.summary,
					'The run failed or blocked without a detailed summary.'
				)
			});
		});
}

function buildBlockedTaskFeedbackSignals(data: ControlPlaneData): SelfImprovementFeedbackSignal[] {
	const taskMap = new Map(data.tasks.map((task) => [task.id, task]));

	return data.tasks.flatMap((task) => {
		if (task.status === 'done') {
			return [];
		}

		const dependencyIds = task.dependencyTaskIds.filter((dependencyId) => {
			const dependency = taskMap.get(dependencyId);
			return dependency?.status !== 'done';
		});
		const blockedReason = compactText(task.blockedReason, '');
		const isBlocked =
			task.status === 'blocked' || blockedReason.length > 0 || dependencyIds.length > 0;

		if (!isBlocked) {
			return [];
		}

		const projectContext = buildProjectContext(task, data);

		return [
			createFeedbackSignal({
				id: createFeedbackSignalId('task_blocked', task.id),
				signalType: 'task_blocked',
				opportunityId: createOpportunityId('blocked_tasks', task.id),
				category: 'coordination',
				severity:
					task.priority === 'urgent' || task.priority === 'high' || dependencyIds.length > 0
						? 'high'
						: 'medium',
				confidence: blockedReason ? 'high' : 'medium',
				projectId: projectContext.projectId,
				projectName: projectContext.projectName,
				taskId: task.id,
				runId: null,
				reviewId: null,
				sessionId: task.threadSessionId,
				title: `Task blocked: ${task.title}`,
				summary:
					blockedReason ||
					(dependencyIds.length > 0
						? `Waiting on dependencies: ${dependencyIds.join(', ')}.`
						: 'Task is blocked without a recorded blocker reason.')
			})
		];
	});
}

function buildStaleFeedbackSignals(
	data: ControlPlaneData,
	sessions: AgentSessionDetail[],
	now?: number
): SelfImprovementFeedbackSignal[] {
	return buildTaskWorkItems(data, sessions, { now })
		.filter((task) => task.status !== 'done' && task.freshness.isStale)
		.map((task) =>
			createFeedbackSignal({
				id: createFeedbackSignalId('task_stale', task.id),
				signalType: 'task_stale',
				opportunityId: createOpportunityId('stale_tasks', task.id),
				category: 'automation',
				severity:
					task.priority === 'urgent' || task.freshness.staleSignals.length >= 2 ? 'high' : 'medium',
				confidence: 'high',
				projectId: task.projectId,
				projectName: task.projectName === 'No project' ? null : task.projectName,
				taskId: task.id,
				runId: task.latestRun?.id ?? null,
				reviewId: null,
				sessionId: task.statusThread?.id ?? null,
				title: `Stale work on ${task.title}`,
				summary:
					task.freshness.staleSignals.length > 0
						? `Observed stale signals: ${task.freshness.staleSignals.join(', ')}.`
						: 'Task is stale without a classified stale signal.'
			})
		);
}

function buildReviewFeedbackSignals(data: ControlPlaneData): SelfImprovementFeedbackSignal[] {
	const taskMap = new Map(data.tasks.map((task) => [task.id, task]));

	return data.reviews
		.filter((review) => review.status === 'changes_requested')
		.map((review) => {
			const task = taskMap.get(review.taskId) ?? null;
			const projectContext = task
				? buildProjectContext(task, data)
				: { projectId: null, projectName: null };

			return createFeedbackSignal({
				id: createFeedbackSignalId('review_feedback', review.id),
				signalType: 'review_feedback',
				opportunityId: createOpportunityId('review_feedback', review.taskId),
				category: 'quality',
				severity: task && (task.runCount >= 2 || task.priority !== 'medium') ? 'high' : 'medium',
				confidence: 'medium',
				projectId: projectContext.projectId,
				projectName: projectContext.projectName,
				taskId: review.taskId,
				runId: review.runId,
				reviewId: review.id,
				sessionId: task?.threadSessionId ?? null,
				title: task ? `Review feedback for ${task.title}` : `Review feedback for ${review.taskId}`,
				summary: compactText(review.summary, 'Changes were requested without a detailed summary.')
			});
		});
}

function buildThreadReuseFeedbackSignals(
	data: ControlPlaneData,
	sessions: AgentSessionDetail[]
): SelfImprovementFeedbackSignal[] {
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
			createFeedbackSignal({
				id: createFeedbackSignalId('thread_reuse_gap', task.id),
				signalType: 'thread_reuse_gap',
				opportunityId: createOpportunityId('thread_reuse_gap', task.id),
				category: 'knowledge',
				severity: task.priority === 'high' || task.priority === 'urgent' ? 'medium' : 'low',
				confidence: task.threadSessionId ? 'medium' : 'high',
				projectId: task.projectId,
				projectName: projectMap.get(task.projectId)?.name ?? null,
				taskId: task.id,
				runId: null,
				reviewId: null,
				sessionId: suggestion.id,
				title: `Thread reuse gap for ${task.title}`,
				summary:
					suggestion.suggestionReason ?? 'A better reusable thread is available for this task.'
			})
		];
	});
}

export function buildSelfImprovementFeedbackSignals(input: {
	data: ControlPlaneData;
	sessions: AgentSessionDetail[];
	now?: number;
}): SelfImprovementFeedbackSignal[] {
	return [
		...buildExecutionFeedbackSignals(input.data),
		...buildBlockedTaskFeedbackSignals(input.data),
		...buildStaleFeedbackSignals(input.data, input.sessions, input.now),
		...buildReviewFeedbackSignals(input.data),
		...buildThreadReuseFeedbackSignals(input.data, input.sessions)
	].sort((left, right) => {
		if (SEVERITY_RANK[left.severity] !== SEVERITY_RANK[right.severity]) {
			return SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity];
		}

		return left.title.localeCompare(right.title);
	});
}

export function summarizeSelfImprovementFeedbackSignals(
	signals: SelfImprovementFeedbackSignal[]
): SelfImprovementSignalSummary {
	const byType = initializeCountRecord(SELF_IMPROVEMENT_SIGNAL_TYPE_OPTIONS);

	for (const signal of signals) {
		byType[signal.signalType] += 1;
	}

	return {
		totalCount: signals.length,
		highSeverityCount: signals.filter((signal) => signal.severity === 'high').length,
		byType
	};
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

export function applySelfImprovementGoalContext<
	T extends {
		opportunities: SelfImprovementOpportunity[];
	}
>(
	snapshot: T,
	input: {
		data: ControlPlaneData;
		goalId?: string | null;
	}
): T {
	const goalId = input.goalId?.trim() ?? '';

	if (!goalId) {
		return snapshot;
	}

	const goalContext = buildGoalContext(input.data, goalId);

	if (!goalContext) {
		return snapshot;
	}

	return {
		...snapshot,
		opportunities: snapshot.opportunities.map((opportunity) =>
			applyGoalContextToOpportunity(opportunity, input.data, goalContext)
		)
	};
}

export function buildSelfImprovementAnalysis(input: {
	data: ControlPlaneData;
	sessions: AgentSessionDetail[];
	now?: number;
}): SelfImprovementAnalysis {
	const opportunities = [
		...buildExecutionOpportunities(input.data),
		...buildBlockedTaskOpportunities(input.data),
		...buildPlanningGapOpportunities(input.data),
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
