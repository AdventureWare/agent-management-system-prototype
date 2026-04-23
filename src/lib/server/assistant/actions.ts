import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { createAgentApiGoal, createAgentApiTask } from '$lib/server/agent-control-plane-api';
import {
	createExecutionSurface,
	createRole,
	loadControlPlane,
	parseExecutionSurfaceLocation,
	parseExecutionSurfaceStatus,
	updateControlPlaneCollections
} from '$lib/server/control-plane';
import type { AssistantActionPlan, AssistantExecuteResponse } from '$lib/assistant/types';
import type { ExecutionSurface, Role } from '$lib/types/control-plane';

function readText(value: unknown) {
	return typeof value === 'string' ? value.trim() : '';
}

function readStringList(value: unknown) {
	if (Array.isArray(value)) {
		return value.map((entry) => readText(entry)).filter(Boolean);
	}

	return typeof value === 'string'
		? value
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean)
		: [];
}

function createMissingFieldError(message: string, code: string) {
	return new AgentControlPlaneApiError(400, message, {
		code,
		suggestedNextCommands: ['context:current']
	});
}

async function executeCreateRole(plan: AssistantActionPlan): Promise<AssistantExecuteResponse> {
	const current = await loadControlPlane();
	const name = readText(plan.payload.name);
	const description = readText(plan.payload.description) || readText(plan.payload.instructions);
	const systemPrompt = readText(plan.payload.systemPrompt) || description;

	if (!name || !description) {
		throw createMissingFieldError('Role name and description are required.', 'missing_role_fields');
	}

	if (current.roles.some((role) => role.name.trim().toLowerCase() === name.toLowerCase())) {
		throw new AgentControlPlaneApiError(400, 'A role with that name already exists.', {
			code: 'duplicate_role_name',
			suggestedNextCommands: ['role:list']
		});
	}

	let createdRole: Role | null = null;

	await updateControlPlaneCollections((data) => {
		const role = createRole({
			name,
			description,
			systemPrompt,
			lifecycleStatus: 'active',
			area: 'shared'
		});
		createdRole = role;

		return {
			data: {
				...data,
				roles: [role, ...data.roles]
			},
			changedCollections: ['roles']
		};
	});

	const createdRoleResult = createdRole as Role | null;

	if (!createdRoleResult) {
		throw new AgentControlPlaneApiError(500, 'Role could not be created.');
	}

	return {
		ok: true,
		action: plan.action,
		objectType: plan.objectType,
		record: {
			id: createdRoleResult.id,
			name: createdRoleResult.name,
			href: `/app/roles/${createdRoleResult.id}`
		}
	};
}

async function executeCreateAgent(plan: AssistantActionPlan): Promise<AssistantExecuteResponse> {
	const current = await loadControlPlane();
	const name = readText(plan.payload.name);
	const providerId = readText(plan.payload.providerId);
	const supportedRoleIds = readStringList(plan.payload.supportedRoleIds);
	const provider = current.providers.find((candidate) => candidate.id === providerId) ?? null;
	const note = readText(plan.payload.note);

	if (!name || !providerId || supportedRoleIds.length === 0) {
		throw createMissingFieldError(
			'Agent name, provider, and at least one supported role are required.',
			'missing_agent_fields'
		);
	}

	if (!provider) {
		throw new AgentControlPlaneApiError(400, 'Selected provider was not found.', {
			code: 'provider_not_found',
			suggestedNextCommands: ['project:list']
		});
	}

	const invalidRoleIds = supportedRoleIds.filter(
		(roleId) => !current.roles.some((role) => role.id === roleId)
	);

	if (invalidRoleIds.length > 0) {
		throw new AgentControlPlaneApiError(400, 'One or more supported roles were not found.', {
			code: 'role_not_found',
			details: { invalidRoleIds },
			suggestedNextCommands: ['role:list']
		});
	}

	let createdAgent: ExecutionSurface | null = null;

	await updateControlPlaneCollections((data) => {
		const executionSurface = createExecutionSurface({
			name,
			providerId,
			supportedRoleIds,
			location: parseExecutionSurfaceLocation(
				provider.kind === 'local' ? 'local' : 'cloud',
				'cloud'
			),
			status: parseExecutionSurfaceStatus('idle', 'idle'),
			capacity: 1,
			note,
			tags: readStringList(plan.payload.tags)
		});
		createdAgent = executionSurface;

		return {
			data: {
				...data,
				executionSurfaces: [executionSurface, ...data.executionSurfaces]
			},
			changedCollections: ['executionSurfaces']
		};
	});

	const createdAgentResult = createdAgent as ExecutionSurface | null;

	if (!createdAgentResult) {
		throw new AgentControlPlaneApiError(500, 'Agent could not be created.');
	}

	return {
		ok: true,
		action: plan.action,
		objectType: plan.objectType,
		record: {
			id: createdAgentResult.id,
			name: createdAgentResult.name,
			href: `/app/execution-surfaces/${createdAgentResult.id}`
		}
	};
}

export async function executeAssistantPlan(
	plan: AssistantActionPlan
): Promise<AssistantExecuteResponse> {
	switch (plan.action) {
		case 'create_task': {
			const task = await createAgentApiTask({
				title: readText(plan.payload.title),
				summary: readText(plan.payload.summary) || readText(plan.payload.instructions),
				projectId: readText(plan.payload.projectId),
				goalId: readText(plan.payload.goalId) || null,
				parentTaskId: readText(plan.payload.parentTaskId) || null
			});

			return {
				ok: true,
				action: plan.action,
				objectType: plan.objectType,
				record: {
					id: task.id,
					name: task.title,
					href: `/app/tasks/${task.id}`
				}
			};
		}
		case 'create_goal': {
			const projectId = readText(plan.payload.projectId);
			const goal = await createAgentApiGoal({
				name: readText(plan.payload.name),
				summary: readText(plan.payload.summary) || readText(plan.payload.description),
				parentGoalId: readText(plan.payload.parentGoalId) || null,
				projectIds: projectId ? [projectId] : []
			});

			return {
				ok: true,
				action: plan.action,
				objectType: plan.objectType,
				record: {
					id: goal.id,
					name: goal.name,
					href: `/app/goals/${goal.id}`
				}
			};
		}
		case 'create_role':
			return executeCreateRole(plan);
		case 'create_agent':
			return executeCreateAgent(plan);
	}
}
