import { buildGoalLoopWorkPacket } from '$lib/server/goal-work-packets';
import { createAgentApiTask } from '$lib/server/agent-control-plane-api';
import { applyGoalLoopActionToData } from '$lib/server/agent-goal-loop-actions';
import { loadControlPlane } from '$lib/server/control-plane';
import { buildOperatorGoalLoopConsole } from '$lib/server/operator-goal-loop-console';
import { buildTaskLoopReport } from '$lib/server/task-loop-report';
import type { ControlPlaneData } from '$lib/types/control-plane';

export const MANAGED_CONTINUATION_RUNNER_MODES = [
	'read_only',
	'preview',
	'materialize_one'
] as const;

export type ManagedContinuationRunnerMode = (typeof MANAGED_CONTINUATION_RUNNER_MODES)[number];

export type ManagedContinuationRunnerInput = {
	projectId?: string | null;
	goalId?: string | null;
	taskId?: string | null;
	mode?: ManagedContinuationRunnerMode | null;
};

function normalizeText(value: string | null | undefined) {
	return value?.trim() ?? '';
}

function normalizeMode(mode: ManagedContinuationRunnerInput['mode']): ManagedContinuationRunnerMode {
	return MANAGED_CONTINUATION_RUNNER_MODES.includes(mode as ManagedContinuationRunnerMode)
		? (mode as ManagedContinuationRunnerMode)
		: 'read_only';
}

function buildStopReason(input: ReturnType<typeof buildOperatorGoalLoopConsole>) {
	switch (input.path.kind) {
		case 'review':
			return 'review_gate';
		case 'approval':
			return 'approval_gate';
		case 'blocker':
			return 'blocked';
		case 'clarification':
			return 'clarification_required';
		case 'goal_complete':
			return 'goal_complete';
		case 'execute':
			return 'actionable_task_ready';
		case 'continue_run':
			return 'run_continuation_required';
		case 'research':
			return 'research_required';
		case 'planning':
			return input.recommendation.suggestedTaskDraft
				? 'materializable_fallback_available'
				: 'planning_required';
		case 'no_action':
			return 'no_action';
	}
}

function canPreviewMaterialization(input: ReturnType<typeof buildOperatorGoalLoopConsole>) {
	return Boolean(
		input.recommendation.suggestedTaskDraft &&
			input.path.continuationPolicy.mode === 'explicit_validate_first'
	);
}

function buildWorkPacket(data: ControlPlaneData, input: ReturnType<typeof buildOperatorGoalLoopConsole>) {
	if (input.path.kind !== 'execute' || !input.path.taskId) {
		return null;
	}

	return buildGoalLoopWorkPacket(data, {
		projectId: input.project?.id ?? null,
		goalId: input.goal?.id ?? null,
		taskId: input.path.taskId
	});
}

export function applyManagedContinuationRunnerToData(
	data: ControlPlaneData,
	input: ManagedContinuationRunnerInput = {}
) {
	const mode = normalizeMode(input.mode);
	const console = buildOperatorGoalLoopConsole(data, {
		projectId: normalizeText(input.projectId) || null,
		goalId: normalizeText(input.goalId) || null,
		taskId: normalizeText(input.taskId) || null
	});
	const actions = ['goal-loop:get_operator_console'];
	const materializationPreview = canPreviewMaterialization(console)
		? applyGoalLoopActionToData(data, {
				command: 'materialize_suggested_task',
				projectId: console.project?.id ?? null,
				goalId: console.goal?.id ?? null,
				validateOnly: true
			}).response
		: null;

	if (materializationPreview) {
		actions.push('goal-loop:materialize_suggested_task(validateOnly)');
	}

	const shouldMaterialize = mode === 'materialize_one' && Boolean(materializationPreview);
	const materialization = shouldMaterialize
		? applyGoalLoopActionToData(data, {
				command: 'materialize_suggested_task',
				projectId: console.project?.id ?? null,
				goalId: console.goal?.id ?? null
			})
		: null;
	const nextData = materialization?.data ?? data;
	const materializedTaskId = materialization?.response.resolved.taskId ?? null;
	const taskReadback = materializedTaskId ? buildTaskLoopReport(nextData, materializedTaskId) : null;

	if (materialization) {
		actions.push('goal-loop:materialize_suggested_task');
		actions.push('goal-loop:get_task_loop_report');
		actions.push('context:current');
	}

	const workPacket = buildWorkPacket(nextData, console);
	if (workPacket) {
		actions.push('work-packet:get_agent_work_packet');
	}

	return {
		data: nextData,
		response: {
			command: 'managed_continuation_runner' as const,
			mode,
			resolved: {
				projectId: console.project?.id ?? null,
				goalId: console.goal?.id ?? null,
				taskId: console.path.taskId
			},
			operatorPath: console.path,
			actions,
			materializationPreview,
			materialization: materialization?.response ?? null,
			readbacks: {
				taskLoopReport: taskReadback,
				workPacket
			},
			stop: {
				reason: buildStopReason(console),
				nextRecommendedAction:
					materialization?.response.suggestedNextCommands[0] ??
					(console.path.suggestedCommands[0] ?? 'goal-loop:get_next_recommended_action'),
				mustStop: true,
				note:
					'Managed continuation runner stops after one read, preview, or materialization cycle. It does not launch work, approve reviews, or resolve approvals.'
			},
			safety: {
				mutation:
					mode === 'materialize_one' && materialization
						? materialization.response.safety.mutation
						: 'none',
				taskStateChanged: materialization?.response.safety.taskStateChanged ?? false,
				reviewStateChanged: false,
				approvalStateChanged: false,
				autoLaunch: false,
				autoApprove: false
			}
		}
	};
}

export async function runManagedContinuationRunner(input: ManagedContinuationRunnerInput = {}) {
	const mode = normalizeMode(input.mode);

	if (mode !== 'materialize_one') {
		const data = await loadControlPlane();
		return applyManagedContinuationRunnerToData(data, { ...input, mode }).response;
	}

	const before = await loadControlPlane();
	const preview = applyManagedContinuationRunnerToData(before, { ...input, mode: 'preview' }).response;

	if (!preview.materializationPreview) {
		return {
			...preview,
			mode,
			stop: {
				...preview.stop,
				note: 'No materializable fallback was available, so materialize_one stopped without mutation.'
			}
		};
	}

	const taskDraft = preview.materializationPreview.taskDraft;
	const task = preview.materializationPreview.dedupedExistingTask
		? preview.materializationPreview.task
		: await createAgentApiTask({
				title: taskDraft.title,
				summary: taskDraft.summary,
				expectedOutcome: taskDraft.expectedOutcome,
				scope: taskDraft.scope,
				nonGoals: taskDraft.nonGoals,
				successCriteria: taskDraft.successCriteria,
				validationSteps: taskDraft.validationSteps,
				readinessLevel: taskDraft.readinessLevel,
				autonomyLevel: taskDraft.autonomyLevel,
				reviewRequirement: taskDraft.reviewRequirement,
				projectId: taskDraft.projectId,
				goalId: taskDraft.goalId || null,
				priority: 'medium',
				status: 'in_draft',
				riskLevel: taskDraft.riskLevel,
				approvalMode: 'none',
				requiresReview: true,
				dependencyTaskIds: taskDraft.dependencyTaskIds
			});
	const materialization = {
		...preview.materializationPreview,
		task,
		resolved: {
			...preview.materializationPreview.resolved,
			taskId: task.id
		},
		createdTask: !preview.materializationPreview.dedupedExistingTask,
		validationOnly: false,
		safety: {
			...preview.materializationPreview.safety,
			mutation: preview.materializationPreview.dedupedExistingTask
				? 'deduped_existing_task'
				: 'goal_loop_fallback_task_created',
			taskStateChanged: !preview.materializationPreview.dedupedExistingTask
		}
	};
	const after = await loadControlPlane();
	const taskLoopReport = materialization.resolved.taskId
		? buildTaskLoopReport(after, materialization.resolved.taskId)
		: null;

	return {
		...preview,
		mode,
		actions: [
			...preview.actions,
			'goal-loop:materialize_suggested_task',
			'goal-loop:get_task_loop_report',
			'context:current'
		],
		materialization,
		readbacks: {
			...preview.readbacks,
			taskLoopReport
		},
		stop: {
			reason: preview.stop.reason,
			nextRecommendedAction:
				materialization.suggestedNextCommands[0] ?? preview.stop.nextRecommendedAction,
			mustStop: true,
			note:
				'Managed continuation runner materialized at most one fallback task and stopped before launch, review approval, or approval resolution.'
		},
		safety: {
			mutation: materialization.safety.mutation,
			taskStateChanged: materialization.safety.taskStateChanged,
			reviewStateChanged: false,
			approvalStateChanged: false,
			autoLaunch: false,
			autoApprove: false
		}
	};
}
