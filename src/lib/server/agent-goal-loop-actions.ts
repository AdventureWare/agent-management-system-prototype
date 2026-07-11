import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { createAgentApiTask } from '$lib/server/agent-control-plane-api';
import { createTask, loadControlPlane } from '$lib/server/control-plane';
import { buildGoalWorkLoopClassification } from '$lib/server/goal-work-loop';
import {
	applyGoalRelationships,
	getGoalLinkedProjectIds,
	getGoalLinkedTaskIds
} from '$lib/server/goal-relationships';
import type { ControlPlaneData, Task } from '$lib/types/control-plane';

const MATERIALIZABLE_RECOMMENDATIONS = new Set([
	'plan_task',
	'research_task',
	'clarify_task',
	'create_planning_task'
]);

export const AGENT_GOAL_LOOP_ACTION_COMMANDS = ['materialize_suggested_task'] as const;

export type AgentGoalLoopActionCommand = (typeof AGENT_GOAL_LOOP_ACTION_COMMANDS)[number];

export type AgentGoalLoopActionInput = {
	command: string;
	projectId?: string | null;
	goalId?: string | null;
	validateOnly?: boolean;
};

function normalizeText(value: string | null | undefined) {
	return value?.trim() ?? '';
}

function normalizeTitle(value: string) {
	return value.trim().replaceAll(/\s+/g, ' ').toLowerCase();
}

function normalizeCommand(command: string): AgentGoalLoopActionCommand {
	const normalized = command.trim() as AgentGoalLoopActionCommand;

	if (!AGENT_GOAL_LOOP_ACTION_COMMANDS.includes(normalized)) {
		throw new AgentControlPlaneApiError(404, 'Unknown goal-loop action command.', {
			code: 'goal_loop_action_command_not_found',
			suggestedNextCommands: ['manifest --resource goal-loop'],
			details: { command }
		});
	}

	return normalized;
}

function findOpenDuplicateTask(data: ControlPlaneData, draft: NonNullable<ReturnType<typeof buildGoalWorkLoopClassification>['recommendation']['suggestedTaskDraft']>) {
	const title = normalizeTitle(draft.title);
	const goalId = normalizeText(draft.goalId);

	return (
		data.tasks.find((task) => {
			if (task.status === 'done' || task.status === 'canceled') {
				return false;
			}

			if (task.projectId !== draft.projectId || normalizeTitle(task.title) !== title) {
				return false;
			}

			return goalId ? task.goalId === goalId : true;
		}) ?? null
	);
}

function buildReadbackCommands(task: Task | null) {
	return [
		...(task ? ['goal-loop:get_task_loop_report'] : []),
		'goal-loop:get_next_recommended_action',
		'task:get',
		'context:current'
	];
}

export function applyGoalLoopActionToData(data: ControlPlaneData, input: AgentGoalLoopActionInput) {
	const command = normalizeCommand(input.command);
	const goalLoop = buildGoalWorkLoopClassification(data, {
		projectId: normalizeText(input.projectId) || null,
		goalId: normalizeText(input.goalId) || null
	});
	const recommendation = goalLoop.recommendation;
	const draft = recommendation.suggestedTaskDraft;

	if (!goalLoop.project) {
		throw new AgentControlPlaneApiError(404, 'Project could not be resolved for goal-loop action.', {
			code: 'goal_loop_project_not_found',
			suggestedNextCommands: ['project:list', 'goal-loop:list_active_goals'],
			details: { projectId: input.projectId ?? null, goalId: input.goalId ?? null }
		});
	}

	if (!draft || !MATERIALIZABLE_RECOMMENDATIONS.has(recommendation.kind)) {
		throw new AgentControlPlaneApiError(
			409,
			'Current goal-loop recommendation does not contain a materializable suggested task draft.',
			{
				code: 'goal_loop_no_materializable_task_draft',
				suggestedNextCommands: [
					'goal-loop:get_next_recommended_action',
					'goal-loop:get_actionable_work',
					'goal-loop:get_blocked_work'
				],
				details: {
					recommendationKind: recommendation.kind,
					projectId: goalLoop.project.id,
					goalId: goalLoop.goal?.id ?? null
				}
			}
		);
	}

	const existingTask = findOpenDuplicateTask(data, draft);
	const task =
		existingTask ??
		createTask({
			title: draft.title,
			summary: draft.summary,
			expectedOutcome: draft.expectedOutcome,
			scope: draft.scope,
			nonGoals: draft.nonGoals,
			successCriteria: draft.successCriteria,
			validationSteps: draft.validationSteps,
			readinessLevel: draft.readinessLevel,
			autonomyLevel: draft.autonomyLevel,
			reviewRequirement: draft.reviewRequirement,
			projectId: draft.projectId,
			goalId: draft.goalId,
			priority: 'medium',
			status: 'in_draft',
			riskLevel: draft.riskLevel,
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: '',
			artifactPath: goalLoop.project.defaultArtifactRoot || goalLoop.project.projectRootFolder,
			dependencyTaskIds: draft.dependencyTaskIds
		});

	let nextData = data;

	if (!existingTask && input.validateOnly !== true) {
		nextData = {
			...data,
			tasks: [task, ...data.tasks]
		};

		if (draft.goalId) {
			const goal = nextData.goals.find((candidate) => candidate.id === draft.goalId);

			if (goal) {
				nextData = applyGoalRelationships({
					data: nextData,
					goalId: goal.id,
					parentGoalId: goal.parentGoalId ?? null,
					projectIds: getGoalLinkedProjectIds(nextData, goal),
					taskIds: getGoalLinkedTaskIds(nextData, goal)
				});
			}
		}
	}

	return {
		data: nextData,
		response: {
			command,
			resolved: {
				projectId: draft.projectId,
				goalId: draft.goalId || goalLoop.goal?.id || null,
				taskId: task.id
			},
			recommendation: {
				kind: recommendation.kind,
				reason: recommendation.reason,
				sourceTaskIds: recommendation.taskIds,
				parallelTaskIds: recommendation.parallelTaskIds
			},
			task,
			taskDraft: draft,
			createdTask: !existingTask && input.validateOnly !== true,
			wouldCreateTask: !existingTask,
			dedupedExistingTask: Boolean(existingTask),
			validationOnly: input.validateOnly === true,
			safety: {
				mutation:
					input.validateOnly === true
						? 'validation_only'
						: existingTask
							? 'deduped_existing_task'
							: 'goal_loop_fallback_task_created',
				taskStateChanged: !existingTask && input.validateOnly !== true,
				reviewStateChanged: false,
				approvalStateChanged: false,
				note: 'This command materializes only the current goal-loop suggestedTaskDraft. It does not launch execution or mutate the source task.'
			},
			suggestedNextCommands: buildReadbackCommands(task)
		}
	};
}

export async function runAgentGoalLoopAction(input: AgentGoalLoopActionInput) {
	const command = normalizeCommand(input.command);

	if (command !== 'materialize_suggested_task') {
		throw new AgentControlPlaneApiError(404, 'Unknown goal-loop action command.', {
			code: 'goal_loop_action_command_not_found',
			suggestedNextCommands: ['manifest --resource goal-loop']
		});
	}

	const current = await loadControlPlane();
	const preview = applyGoalLoopActionToData(current, input).response;

	if (preview.validationOnly || !preview.wouldCreateTask || preview.dedupedExistingTask) {
		return preview;
	}

	const task = await createAgentApiTask({
		title: preview.taskDraft.title,
		summary: preview.taskDraft.summary,
		expectedOutcome: preview.taskDraft.expectedOutcome,
		scope: preview.taskDraft.scope,
		nonGoals: preview.taskDraft.nonGoals,
		successCriteria: preview.taskDraft.successCriteria,
		validationSteps: preview.taskDraft.validationSteps,
		readinessLevel: preview.taskDraft.readinessLevel,
		autonomyLevel: preview.taskDraft.autonomyLevel,
		reviewRequirement: preview.taskDraft.reviewRequirement,
		projectId: preview.taskDraft.projectId,
		goalId: preview.taskDraft.goalId || null,
		priority: 'medium',
		status: 'in_draft',
		riskLevel: preview.taskDraft.riskLevel,
		approvalMode: 'none',
		requiresReview: true,
		dependencyTaskIds: preview.taskDraft.dependencyTaskIds
	});

	return {
		...preview,
		task,
		resolved: {
			...preview.resolved,
			taskId: task.id
		},
		createdTask: true,
		wouldCreateTask: true,
		dedupedExistingTask: false,
		validationOnly: false,
		safety: {
			...preview.safety,
			mutation: 'goal_loop_fallback_task_created',
			taskStateChanged: true
		},
		suggestedNextCommands: buildReadbackCommands(task)
	};
}
