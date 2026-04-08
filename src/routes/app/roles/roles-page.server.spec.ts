import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData, Role } from '$lib/types/control-plane';

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

const createRoleMock = vi.hoisted(() =>
	vi.fn(
		(input: {
			name: string;
			area?: Role['area'];
			description: string;
			skillIds?: string[];
			toolIds?: string[];
			mcpIds?: string[];
			systemPrompt?: string;
			qualityChecklist?: string[];
			approvalPolicy?: string;
			escalationPolicy?: string;
		}) =>
			({
				id: 'role_created',
				name: input.name,
				area: input.area ?? 'shared',
				description: input.description,
				skillIds: input.skillIds,
				toolIds: input.toolIds,
				mcpIds: input.mcpIds,
				systemPrompt: input.systemPrompt,
				qualityChecklist: input.qualityChecklist,
				approvalPolicy: input.approvalPolicy,
				escalationPolicy: input.escalationPolicy
			}) satisfies Role
	)
);

vi.mock('$lib/server/control-plane', () => ({
	createRole: createRoleMock,
	getExecutionSurfaces: vi.fn(
		(data: ControlPlaneData) => data.executionSurfaces ?? data.executionSurfaces
	),
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	updateControlPlane: vi.fn(async (updater: (data: ControlPlaneData) => ControlPlaneData) => {
		controlPlaneState.saved = updater(controlPlaneState.current as ControlPlaneData);
		controlPlaneState.current = controlPlaneState.saved;
		return controlPlaneState.saved;
	})
}));

import { actions, load } from './+page.server';

describe('roles page server', () => {
	beforeEach(() => {
		createRoleMock.mockClear();
		controlPlaneState.current = {
			providers: [],
			roles: [
				{
					id: 'role_writer',
					name: 'Technical Writer',
					area: 'product',
					description: 'Produces docs.',
					skillIds: ['documentation-writing'],
					toolIds: ['codex'],
					mcpIds: ['github'],
					systemPrompt: 'Write clearly.',
					qualityChecklist: ['accurate'],
					approvalPolicy: 'Require review.',
					escalationPolicy: 'Escalate conflicts.'
				}
			],
			projects: [],
			goals: [],
			executionSurfaces: [
				{
					id: 'worker_local',
					name: 'Local surface',
					providerId: 'provider_local',
					supportedRoleIds: ['role_writer'],
					location: 'local',
					status: 'idle',
					capacity: 1,
					registeredAt: '2026-04-08T10:00:00.000Z',
					lastSeenAt: '2026-04-08T10:00:00.000Z',
					note: '',
					tags: [],
					skills: ['documentation-writing'],
					threadSandboxOverride: null,
					authTokenHash: ''
				}
			],
			tasks: [
				{
					id: 'task_1',
					title: 'Write release notes',
					summary: 'Summarize user-facing changes.',
					projectId: 'project_docs',
					area: 'product',
					goalId: 'goal_docs',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'low',
					approvalMode: 'none',
					requiredThreadSandbox: null,
					requiresReview: true,
					desiredRoleId: 'role_writer',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output/tasks/task_1',
					attachments: [],
					createdAt: '2026-04-08T10:00:00.000Z',
					updatedAt: '2026-04-08T10:00:00.000Z'
				}
			],
			runs: [],
			reviews: [],
			approvals: []
		};
		controlPlaneState.saved = null;
	});

	it('loads role demand and staffing counts', async () => {
		const result = (await load({} as never)) as {
			roleAreaOptions: string[];
			roles: Array<{ id: string; taskCount: number; workerCount: number }>;
		};

		expect(result.roleAreaOptions).toEqual(['shared', 'product', 'growth', 'ops']);
		expect(result.roles).toEqual([
			expect.objectContaining({
				id: 'role_writer',
				taskCount: 1,
				workerCount: 1
			})
		]);
	});

	it('creates a role with specialization fields', async () => {
		const form = new FormData();
		form.set('name', 'Doctor');
		form.set('area', 'shared');
		form.set('description', 'Assesses health-related tasks.');
		form.set('skillIds', 'medical-reasoning, triage');
		form.set('toolIds', 'codex, web');
		form.set('mcpIds', 'pubmed');
		form.set('systemPrompt', 'Reason carefully and cite uncertainty.');
		form.set('qualityChecklist', 'safe, cautious, explicit uncertainty');
		form.set('approvalPolicy', 'Require human review for diagnoses.');
		form.set('escalationPolicy', 'Escalate emergencies immediately.');

		const result = await actions.createRole({
			request: new Request('http://localhost/app/roles', { method: 'POST', body: form })
		} as never);

		expect(result).toMatchObject({
			ok: true,
			successAction: 'createRole'
		});
		expect(createRoleMock).toHaveBeenCalledWith({
			name: 'Doctor',
			area: 'shared',
			description: 'Assesses health-related tasks.',
			skillIds: ['medical-reasoning', 'triage'],
			toolIds: ['codex', 'web'],
			mcpIds: ['pubmed'],
			systemPrompt: 'Reason carefully and cite uncertainty.',
			qualityChecklist: ['safe', 'cautious', 'explicit uncertainty'],
			approvalPolicy: 'Require human review for diagnoses.',
			escalationPolicy: 'Escalate emergencies immediately.'
		});
		expect(controlPlaneState.saved?.roles[0]).toMatchObject({
			id: 'role_created',
			name: 'Doctor'
		});
	});

	it('updates an existing role', async () => {
		const form = new FormData();
		form.set('roleId', 'role_writer');
		form.set('name', 'Senior Technical Writer');
		form.set('area', 'product');
		form.set('description', 'Owns high-stakes documentation.');
		form.set('skillIds', 'documentation-writing, writing');
		form.set('toolIds', 'codex');
		form.set('mcpIds', 'github');
		form.set('systemPrompt', 'Optimize for clarity and accuracy.');
		form.set('qualityChecklist', 'accurate, concise');
		form.set('approvalPolicy', 'Require review before publish.');
		form.set('escalationPolicy', 'Escalate policy conflicts.');

		const result = await actions.updateRole({
			request: new Request('http://localhost/app/roles', { method: 'POST', body: form })
		} as never);

		expect(result).toMatchObject({
			ok: true,
			successAction: 'updateRole',
			roleId: 'role_writer'
		});
		expect(controlPlaneState.saved?.roles[0]).toMatchObject({
			id: 'role_writer',
			name: 'Senior Technical Writer',
			description: 'Owns high-stakes documentation.',
			skillIds: ['documentation-writing', 'writing'],
			qualityChecklist: ['accurate', 'concise']
		});
	});
});
