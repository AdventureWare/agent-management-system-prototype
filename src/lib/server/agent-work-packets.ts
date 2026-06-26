import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { buildGoalLoopWorkPacket } from '$lib/server/goal-work-packets';
import type { ControlPlaneData, Goal, Project, Run, Task } from '$lib/types/control-plane';

export const AGENT_WORK_PACKET_COMMANDS = ['get_agent_work_packet'] as const;

export type AgentWorkPacketCommand = (typeof AGENT_WORK_PACKET_COMMANDS)[number];

export type AgentWorkPacketInput = {
	command: string;
	projectId?: string | null;
	goalId?: string | null;
	taskId?: string | null;
};

function normalizeText(value: string | null | undefined) {
	return value?.trim() ?? '';
}

function normalizeCommand(command: string): AgentWorkPacketCommand {
	const normalized = command.trim() as AgentWorkPacketCommand;

	if (!AGENT_WORK_PACKET_COMMANDS.includes(normalized)) {
		throw new AgentControlPlaneApiError(404, 'Unknown work-packet command.', {
			code: 'work_packet_command_not_found',
			suggestedNextCommands: ['manifest --resource work-packet'],
			details: { command }
		});
	}

	return normalized;
}

function summarizeProject(project: Project | null) {
	return project
		? {
				id: project.id,
				name: project.name,
				summary: project.summary,
				projectBrief: project.projectBrief ?? '',
				currentStateMemo: project.currentStateMemo ?? '',
				agentInstructionsPath: project.agentInstructionsPath ?? '',
				validationCommands: project.validationCommands ?? [],
				defaultReviewRequirement: project.defaultReviewRequirement ?? null,
				defaultRigorProfile: project.defaultRigorProfile ?? null,
				constraints: project.constraints ?? '',
				nonGoals: project.nonGoals ?? '',
				projectRootFolder: project.projectRootFolder ?? '',
				defaultArtifactRoot: project.defaultArtifactRoot ?? ''
			}
		: null;
}

function summarizeGoal(goal: Goal | null) {
	return goal
		? {
				id: goal.id,
				name: goal.name,
				status: goal.status,
				summary: goal.summary,
				successSignal: goal.successSignal ?? '',
				projectIds: goal.projectIds ?? [],
				taskIds: goal.taskIds ?? []
			}
		: null;
}

function summarizeTask(task: Task | null) {
	return task
		? {
				id: task.id,
				title: task.title,
				summary: task.summary,
				status: task.status,
				projectId: task.projectId,
				goalId: task.goalId,
				expectedOutcome: task.expectedOutcome ?? '',
				successCriteria: task.successCriteria ?? '',
				readyCondition: task.readyCondition ?? '',
				scope: task.scope ?? '',
				nonGoals: task.nonGoals ?? '',
				validationSteps: task.validationSteps ?? '',
				readinessLevel: task.readinessLevel,
				autonomyLevel: task.autonomyLevel,
				riskLevel: task.riskLevel,
				reviewRequirement: task.reviewRequirement,
				approvalMode: task.approvalMode,
				blockedReason: task.blockedReason,
				dependencyTaskIds: task.dependencyTaskIds,
				requiredPromptSkillNames: task.requiredPromptSkillNames ?? [],
				requiredCapabilityNames: task.requiredCapabilityNames ?? [],
				requiredToolNames: task.requiredToolNames ?? []
			}
		: null;
}

function summarizeRun(run: Run) {
	return {
		id: run.id,
		taskId: run.taskId,
		status: run.status,
		summary: run.summary,
		resultSummary: run.resultSummary ?? '',
		validationSummary: run.validationSummary ?? '',
		errorSummary: run.errorSummary,
		artifactPaths: run.artifactPaths ?? [],
		updatedAt: run.updatedAt
	};
}

function resolveProject(data: ControlPlaneData, projectId: string, task: Task | null) {
	if (projectId) {
		return data.projects.find((project) => project.id === projectId) ?? null;
	}

	if (task) {
		return data.projects.find((project) => project.id === task.projectId) ?? null;
	}

	return null;
}

function resolveGoal(data: ControlPlaneData, goalId: string, task: Task | null) {
	if (goalId) {
		return data.goals.find((goal) => goal.id === goalId) ?? null;
	}

	if (task?.goalId) {
		return data.goals.find((goal) => goal.id === task.goalId) ?? null;
	}

	return null;
}

export function buildAgentWorkPacketResponse(data: ControlPlaneData, input: AgentWorkPacketInput) {
	const command = normalizeCommand(input.command);
	const projectId = normalizeText(input.projectId);
	const goalId = normalizeText(input.goalId);
	const taskId = normalizeText(input.taskId);
	const packet = buildGoalLoopWorkPacket(data, {
		projectId: projectId || null,
		goalId: goalId || null,
		taskId: taskId || null
	});

	if (!packet) {
		throw new AgentControlPlaneApiError(404, 'No agent work packet could be built.', {
			code: 'work_packet_not_available',
			suggestedNextCommands: [
				'goal-loop:get_next_recommended_action',
				'goal-loop:get_actionable_work'
			],
			details: { projectId: projectId || null, goalId: goalId || null, taskId: taskId || null }
		});
	}

	const task = packet.taskId
		? (data.tasks.find((candidate) => candidate.id === packet.taskId) ?? null)
		: null;
	const project = resolveProject(data, packet.projectId, task);
	const goal = resolveGoal(data, packet.goalId, task);
	const relevantRuns = data.runs
		.filter((run) => packet.relevantRunIds.includes(run.id))
		.map(summarizeRun);

	return {
		command,
		resolved: {
			projectId: packet.projectId || project?.id || null,
			goalId: packet.goalId || goal?.id || null,
			taskId: packet.taskId
		},
		source: {
			domainHelper: 'src/lib/server/goal-work-packets.ts',
			route: `/api/agent-work-packets/${command}`
		},
		safety: {
			readOnly: true,
			note: 'This endpoint renders a selective work packet from structured AMS state. It does not mutate tasks, runs, reviews, approvals, projects, or goals.'
		},
		packet,
		structuredSections: {
			selection: {
				mode: packet.mode,
				recommendationKind: packet.recommendationKind,
				selectionReason: packet.selectionReason,
				includedTaskIds: packet.includedTaskIds,
				relevantRunIds: packet.relevantRunIds
			},
			context: {
				project: summarizeProject(project),
				goal: summarizeGoal(goal),
				task: summarizeTask(task),
				relevantRuns
			},
			guardrails: {
				stoppingConditions: packet.stoppingConditions,
				validationExpectations: packet.validationExpectations
			},
			expectedResult: {
				shape: packet.expectedResultShape,
				recordingHint:
					'Record the result through structured run/task/review operations; do not treat the rendered prompt as durable state.'
			}
		},
		suggestedReadbackCommands: [
			'goal-loop:get_next_recommended_action',
			...(packet.taskId ? ['goal-loop:explain_task_eligibility'] : [])
		]
	};
}
