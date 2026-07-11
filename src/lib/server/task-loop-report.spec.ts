import { describe, expect, it } from 'vitest';
import { buildAgentWorkPacketResponse } from './agent-work-packets';
import { buildOperatorGoalLoopConsole } from './operator-goal-loop-console';
import { buildTaskLoopReport } from './task-loop-report';
import type {
	Approval,
	ControlPlaneData,
	Decision,
	Goal,
	Project,
	Review,
	Run,
	Task
} from '$lib/types/control-plane';

const now = '2026-07-04T12:00:00.000Z';

function createProject(overrides: Partial<Project> = {}): Project {
	return {
		id: overrides.id ?? 'project_1',
		name: overrides.name ?? 'Agent Management System Prototype',
		summary: overrides.summary ?? 'Prototype owned-agent control loops.',
		projectRootFolder: overrides.projectRootFolder ?? '/tmp/ams',
		defaultArtifactRoot: overrides.defaultArtifactRoot ?? '/tmp/ams/agent_output',
		defaultRepoPath: overrides.defaultRepoPath ?? '',
		defaultRepoUrl: overrides.defaultRepoUrl ?? '',
		defaultBranch: overrides.defaultBranch ?? '',
		defaultRigorProfile: overrides.defaultRigorProfile ?? 'INTERNAL'
	};
}

function createGoal(overrides: Partial<Goal> = {}): Goal {
	return {
		id: overrides.id ?? 'goal_1',
		name: overrides.name ?? 'Owned-Agent Control Loop v0',
		area: overrides.area ?? 'product',
		status: overrides.status ?? 'running',
		summary: overrides.summary ?? 'Make AMS drive one durable agent work loop.',
		artifactPath: overrides.artifactPath ?? '',
		successSignal:
			overrides.successSignal ?? 'One task can be selected, executed, recorded, and reviewed.',
		projectIds: overrides.projectIds ?? ['project_1'],
		taskIds: overrides.taskIds ?? ['task_1'],
		planningPriority: overrides.planningPriority ?? 5
	};
}

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: overrides.id ?? 'task_1',
		title: overrides.title ?? `${overrides.id ?? 'task_1'} title`,
		summary: overrides.summary ?? 'Implement a bounded control-loop slice.',
		successCriteria: overrides.successCriteria ?? 'The slice is covered by tests.',
		readyCondition: overrides.readyCondition ?? 'The task contract is clear.',
		expectedOutcome: overrides.expectedOutcome ?? 'A read-only report exists.',
		scope: overrides.scope ?? 'Production read model only.',
		nonGoals: overrides.nonGoals ?? 'No schema or mutation changes.',
		validationSteps: overrides.validationSteps ?? 'Run the focused unit tests.',
		rigorProfile: overrides.rigorProfile ?? null,
		readinessLevel: overrides.readinessLevel ?? 'R3_EXECUTABLE',
		autonomyLevel: overrides.autonomyLevel ?? 'A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE',
		allowedActionNames: overrides.allowedActionNames ?? [],
		reviewRequirement: overrides.reviewRequirement ?? 'SUMMARY_REVIEW',
		projectId: overrides.projectId ?? 'project_1',
		area: overrides.area ?? 'product',
		goalId: overrides.goalId ?? 'goal_1',
		taskTemplateId: overrides.taskTemplateId ?? null,
		workflowId: overrides.workflowId ?? null,
		parentTaskId: overrides.parentTaskId ?? null,
		delegationPacket: overrides.delegationPacket ?? null,
		delegationAcceptance: overrides.delegationAcceptance ?? null,
		priority: overrides.priority ?? 'medium',
		status: overrides.status ?? 'ready',
		riskLevel: overrides.riskLevel ?? 'low',
		approvalMode: overrides.approvalMode ?? 'none',
		requiredThreadSandbox: overrides.requiredThreadSandbox ?? null,
		requiresReview: overrides.requiresReview ?? true,
		desiredRoleId: overrides.desiredRoleId ?? '',
		assigneeExecutionSurfaceId: overrides.assigneeExecutionSurfaceId ?? null,
		agentThreadId: overrides.agentThreadId ?? null,
		requiredPromptSkillNames: overrides.requiredPromptSkillNames ?? [],
		requiredCapabilityNames: overrides.requiredCapabilityNames ?? [],
		requiredToolNames: overrides.requiredToolNames ?? [],
		blockedReason: overrides.blockedReason ?? '',
		dependencyTaskIds: overrides.dependencyTaskIds ?? [],
		estimateHours: overrides.estimateHours ?? null,
		targetDate: overrides.targetDate ?? null,
		runCount: overrides.runCount ?? 0,
		latestRunId: overrides.latestRunId ?? null,
		closeoutState: overrides.closeoutState ?? null,
		closeoutSummary: overrides.closeoutSummary ?? '',
		closeoutChanged: overrides.closeoutChanged ?? '',
		closeoutValidation: overrides.closeoutValidation ?? '',
		closeoutRemainingIssues: overrides.closeoutRemainingIssues ?? '',
		closeoutFollowUps: overrides.closeoutFollowUps ?? [],
		closeoutShouldUpdateMemory: overrides.closeoutShouldUpdateMemory ?? false,
		closeoutRecordedAt: overrides.closeoutRecordedAt ?? null,
		artifactPath: overrides.artifactPath ?? '',
		attachments: overrides.attachments ?? [],
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now
	};
}

function createRun(overrides: Partial<Run> = {}): Run {
	return {
		id: overrides.id ?? 'run_1',
		taskId: overrides.taskId ?? 'task_1',
		executionSurfaceId: overrides.executionSurfaceId ?? null,
		providerId: overrides.providerId ?? null,
		status: overrides.status ?? 'completed',
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
		startedAt: overrides.startedAt ?? now,
		endedAt: overrides.endedAt ?? now,
		threadId: overrides.threadId ?? null,
		agentThreadId: overrides.agentThreadId ?? null,
		promptDigest: overrides.promptDigest ?? 'digest',
		contextSummary: overrides.contextSummary ?? '',
		artifactPaths: overrides.artifactPaths ?? [],
		summary: overrides.summary ?? 'Run completed.',
		actionsTaken: overrides.actionsTaken ?? 'Implemented the slice.',
		validationSummary: overrides.validationSummary ?? 'Focused checks passed.',
		resultSummary: overrides.resultSummary ?? 'Ready for review.',
		blockersFound: overrides.blockersFound ?? [],
		followUpTaskIds: overrides.followUpTaskIds ?? [],
		lastHeartbeatAt: overrides.lastHeartbeatAt ?? null,
		errorSummary: overrides.errorSummary ?? ''
	};
}

function createReview(overrides: Partial<Review> = {}): Review {
	return {
		id: overrides.id ?? 'review_1',
		taskId: overrides.taskId ?? 'task_1',
		runId: overrides.runId ?? 'run_1',
		status: overrides.status ?? 'open',
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
		resolvedAt: overrides.resolvedAt ?? null,
		requestedByExecutionSurfaceId: overrides.requestedByExecutionSurfaceId ?? null,
		reviewerExecutionSurfaceId: overrides.reviewerExecutionSurfaceId ?? null,
		summary: overrides.summary ?? 'Review the run evidence.'
	};
}

function createApproval(overrides: Partial<Approval> = {}): Approval {
	return {
		id: overrides.id ?? 'approval_1',
		taskId: overrides.taskId ?? 'task_1',
		runId: overrides.runId ?? null,
		mode: overrides.mode ?? 'before_run',
		status: overrides.status ?? 'pending',
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
		resolvedAt: overrides.resolvedAt ?? null,
		requestedByExecutionSurfaceId: overrides.requestedByExecutionSurfaceId ?? null,
		approverExecutionSurfaceId: overrides.approverExecutionSurfaceId ?? null,
		summary: overrides.summary ?? 'Approve before running.'
	};
}

function createDecision(overrides: Partial<Decision> = {}): Decision {
	return {
		id: overrides.id ?? 'decision_1',
		taskId: overrides.taskId ?? 'task_1',
		goalId: overrides.goalId ?? 'goal_1',
		runId: overrides.runId ?? null,
		reviewId: overrides.reviewId ?? null,
		approvalId: overrides.approvalId ?? null,
		planningSessionId: overrides.planningSessionId ?? null,
		decisionType: overrides.decisionType ?? 'task_plan_updated',
		summary: overrides.summary ?? 'Keep this as a read-only report.',
		createdAt: overrides.createdAt ?? now,
		decidedByExecutionSurfaceId: overrides.decidedByExecutionSurfaceId ?? null
	};
}

function createControlPlane(input: {
	tasks?: Task[];
	runs?: Run[];
	reviews?: Review[];
	approvals?: Approval[];
	decisions?: Decision[];
}): ControlPlaneData {
	const tasks = input.tasks ?? [createTask()];

	return {
		providers: [],
		roles: [],
		projects: [createProject()],
		goals: [createGoal({ taskIds: tasks.map((task) => task.id) })],
		workflows: [],
		workflowSteps: [],
		taskTemplates: [],
		executionSurfaces: [],
		tasks,
		runs: input.runs ?? [],
		reviews: input.reviews ?? [],
		approvals: input.approvals ?? [],
		planningSessions: [],
		decisions: input.decisions ?? []
	};
}

describe('buildTaskLoopReport', () => {
	it('reports ready actionable work with a work-packet pointer', () => {
		const task = createTask({ id: 'task_ready' });
		const report = buildTaskLoopReport(createControlPlane({ tasks: [task] }), 'task_ready');

		expect(report?.classification.value).toBe('actionable_now');
		expect(report?.classification.actionable).toBe(true);
		expect(report?.nextAction.action).toBe('execute_task');
		expect(report?.workPacket).toMatchObject({
			mode: 'executor',
			command: 'work-packet:get_agent_work_packet --task task_ready'
		});
		expect(report?.source.readOnly).toBe(true);
	});

	it('keeps task-only readback scoped to the selected task project and goal across control-loop surfaces', () => {
		const defaultTask = createTask({
			id: 'task_default',
			projectId: 'project_default',
			goalId: 'goal_default',
			title: 'Default project task'
		});
		const selectedTask = createTask({
			id: 'task_selected',
			projectId: 'project_selected',
			goalId: 'goal_selected',
			title: 'Selected project task'
		});
		const data = createControlPlane({ tasks: [defaultTask, selectedTask] });
		data.projects = [
			createProject({ id: 'project_default', name: 'Default project' }),
			createProject({ id: 'project_selected', name: 'Selected project' })
		];
		data.goals = [
			createGoal({
				id: 'goal_default',
				name: 'Default goal',
				projectIds: ['project_default'],
				taskIds: ['task_default']
			}),
			createGoal({
				id: 'goal_selected',
				name: 'Selected goal',
				projectIds: ['project_selected'],
				taskIds: ['task_selected']
			})
		];

		const console = buildOperatorGoalLoopConsole(data, { taskId: selectedTask.id });
		const report = buildTaskLoopReport(data, selectedTask.id);
		const packet = buildAgentWorkPacketResponse(data, {
			command: 'get_agent_work_packet',
			taskId: selectedTask.id
		});

		expect(console.project?.id).toBe('project_selected');
		expect(console.goal?.id).toBe('goal_selected');
		expect(console.selectedTask?.id).toBe('task_selected');
		expect(console.recommendation.taskIds).toEqual(['task_selected']);
		expect(console.path.taskId).toBe('task_selected');

		expect(report?.project?.id).toBe('project_selected');
		expect(report?.goal?.id).toBe('goal_selected');
		expect(report?.task.id).toBe('task_selected');
		expect(report?.workPacket).toMatchObject({
			includedTaskIds: ['task_selected'],
			command: 'work-packet:get_agent_work_packet --task task_selected'
		});

		expect(packet.resolved).toEqual({
			projectId: 'project_selected',
			goalId: 'goal_selected',
			taskId: 'task_selected'
		});
		expect(packet.packet).toMatchObject({
			projectId: 'project_selected',
			goalId: 'goal_selected',
			taskId: 'task_selected',
			includedTaskIds: ['task_selected']
		});
		expect(packet.structuredSections.context.project).toMatchObject({ id: 'project_selected' });
		expect(packet.structuredSections.context.goal).toMatchObject({ id: 'goal_selected' });
		expect(packet.structuredSections.context.task).toMatchObject({ id: 'task_selected' });
	});

	it('reports in-progress work with latest run evidence', () => {
		const task = createTask({
			id: 'task_running',
			status: 'in_progress',
			latestRunId: 'run_running',
			runCount: 1
		});
		const run = createRun({
			id: 'run_running',
			taskId: 'task_running',
			status: 'running',
			promptDigest: 'digest_running',
			contextSummary:
				'Structured launch context:\n- work-packet get_agent_work_packet --task task_running',
			resultSummary: 'Work is underway.'
		});
		const report = buildTaskLoopReport(
			createControlPlane({ tasks: [task], runs: [run] }),
			'task_running'
		);

		expect(report?.classification.value).toBe('in_progress');
		expect(report?.latestRun).toMatchObject({
			id: 'run_running',
			status: 'running',
			promptDigest: 'digest_running',
			contextSummary:
				'Structured launch context:\n- work-packet get_agent_work_packet --task task_running',
			resultSummary: 'Work is underway.'
		});
		expect(report?.nextAction.action).toBe('continue_run');
	});

	it('reports open review state before execution', () => {
		const task = createTask({
			id: 'task_review',
			status: 'review',
			latestRunId: 'run_review',
			runCount: 1
		});
		const run = createRun({ id: 'run_review', taskId: 'task_review', status: 'completed' });
		const review = createReview({ id: 'review_open', taskId: 'task_review', runId: 'run_review' });
		const report = buildTaskLoopReport(
			createControlPlane({ tasks: [task], runs: [run], reviews: [review] }),
			'task_review'
		);

		expect(report?.classification.value).toBe('awaiting_review');
		expect(report?.openReview).toMatchObject({ id: 'review_open', status: 'open' });
		expect(report?.readiness.hasOpenReview).toBe(true);
		expect(report?.nextAction.action).toBe('review_result');
	});

	it('reports blockers and open dependencies', () => {
		const dependency = createTask({
			id: 'task_dependency',
			title: 'Dependency',
			status: 'in_progress'
		});
		const task = createTask({
			id: 'task_blocked',
			status: 'blocked',
			blockedReason: 'Waiting for dependency.',
			dependencyTaskIds: ['task_dependency', 'missing_dependency']
		});
		const report = buildTaskLoopReport(
			createControlPlane({ tasks: [dependency, task] }),
			'task_blocked'
		);

		expect(report?.task.status).toBe('blocked');
		expect(report?.readiness.hasUnmetDependencies).toBe(true);
		expect(report?.dependencies.open.map((item) => item.id)).toEqual(['task_dependency']);
		expect(report?.dependencies.missingTaskIds).toEqual(['missing_dependency']);
		expect(report?.nextAction.action).toBe('resolve_blocker');
	});

	it('reports done work, artifacts, decisions, and linked follow-ups', () => {
		const followUp = createTask({ id: 'task_follow_up', title: 'Follow up', status: 'ready' });
		const task = createTask({
			id: 'task_done',
			status: 'done',
			closeoutState: 'accepted',
			latestRunId: 'run_done',
			runCount: 1,
			artifactPath: 'docs/report.md',
			attachments: [
				{
					id: 'attachment_1',
					name: 'Evidence',
					path: 'docs/evidence.md',
					contentType: 'text/markdown',
					sizeBytes: 42,
					attachedAt: now
				}
			]
		});
		const run = createRun({
			id: 'run_done',
			taskId: 'task_done',
			status: 'completed',
			followUpTaskIds: ['task_follow_up'],
			artifactPaths: ['docs/run-output.md']
		});
		const decision = createDecision({
			id: 'decision_done',
			taskId: 'task_done',
			runId: 'run_done'
		});
		const report = buildTaskLoopReport(
			createControlPlane({ tasks: [task, followUp], runs: [run], decisions: [decision] }),
			'task_done'
		);

		expect(report?.classification.value).toBe('accepted_done');
		expect(report?.readiness.isTerminal).toBe(true);
		expect(report?.artifacts.allPaths).toEqual([
			'docs/report.md',
			'docs/evidence.md',
			'docs/run-output.md'
		]);
		expect(report?.decisions.map((item) => item.id)).toEqual(['decision_done']);
		expect(report?.followUps.tasks.map((item) => item.id)).toEqual(['task_follow_up']);
		expect(report?.nextAction.action).toBe('create_follow_up');
	});

	it('reports pending approval gates', () => {
		const task = createTask({ id: 'task_approval', approvalMode: 'before_run' });
		const approval = createApproval({ id: 'approval_pending', taskId: 'task_approval' });
		const report = buildTaskLoopReport(
			createControlPlane({ tasks: [task], approvals: [approval] }),
			'task_approval'
		);

		expect(report?.classification.value).toBe('approval_required');
		expect(report?.pendingApproval).toMatchObject({ id: 'approval_pending', status: 'pending' });
		expect(report?.nextAction.action).toBe('resolve_approval');
	});
});
