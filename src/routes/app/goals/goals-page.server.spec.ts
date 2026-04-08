import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

const assistGoalWritingMock = vi.hoisted(() =>
	vi.fn(async () => ({
		name: 'Help operators define goals clearly before linking work',
		summary:
			'This goal improves the goal-writing flow so operators can describe the outcome before managing structure. It matters because weak goal framing makes linked execution harder to trust.',
		successSignal:
			'Most new goals include a concrete outcome and a visible proof point before execution work is linked.',
		changeSummary:
			'Rewrote the goal draft into a clearer outcome, summary, and observable success signal.'
	}))
);

const updateControlPlaneMock = vi.hoisted(() =>
	vi.fn(async (updater: (data: ControlPlaneData) => ControlPlaneData) => {
		controlPlaneState.saved = updater(controlPlaneState.current as ControlPlaneData);
		controlPlaneState.current = controlPlaneState.saved;
		return controlPlaneState.saved;
	})
);

vi.mock('$lib/server/artifact-browser', () => ({
	buildArtifactBrowser: vi.fn(async () => ({
		rootPath: '',
		rootKind: 'directory',
		browsePath: '',
		inspectingParentDirectory: false,
		directoryEntries: [],
		directoryEntriesTruncated: false,
		knownOutputs: [],
		errorMessage: ''
	}))
}));

vi.mock('$lib/server/folder-options', () => ({
	loadFolderPickerOptions: vi.fn(async () => [])
}));

vi.mock('$lib/server/goal-relationships', () => ({
	applyGoalRelationships: vi.fn((input: { data: ControlPlaneData }) => input.data),
	getGoalChildGoals: vi.fn(() => []),
	getGoalLinkedProjectIds: vi.fn(() => []),
	getGoalLinkedTaskIds: vi.fn(() => []),
	sortGoalsByName: vi.fn((goals: unknown[]) => goals),
	sortProjectsByName: vi.fn((projects: unknown[]) => projects),
	sortTasksByTitle: vi.fn((tasks: unknown[]) => tasks),
	suggestGoalArtifactPath: vi.fn(() => '/tmp/project/agent_output/goals/intake-quality')
}));

vi.mock('$lib/server/control-plane', () => ({
	createGoal: vi.fn(),
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	parseArea: vi.fn((_value: string, fallback: string) => fallback),
	parseGoalStatus: vi.fn((_value: string, fallback: string) => fallback),
	updateControlPlane: updateControlPlaneMock
}));

vi.mock('$lib/server/goal-writing-assist', () => ({
	assistGoalWriting: assistGoalWritingMock
}));

import { actions } from './+page.server';

describe('goals page server actions', () => {
	beforeEach(() => {
		assistGoalWritingMock.mockClear();
		updateControlPlaneMock.mockClear();
		controlPlaneState.current = {
			providers: [],
			roles: [],
			projects: [
				{
					id: 'project_ams',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				}
			],
			goals: [
				{
					id: 'goal_parent',
					name: 'Strengthen planning quality',
					area: 'product',
					status: 'running',
					summary: 'Make planning records easier to trust.',
					artifactPath: '/tmp/project/agent_output/goals/planning-quality',
					successSignal: 'Operators can structure work without cleanup.',
					parentGoalId: null,
					projectIds: ['project_ams'],
					taskIds: ['task_1']
				}
			],
			executionSurfaces: [],
			tasks: [
				{
					id: 'task_1',
					title: 'Map goal creation friction',
					summary: 'Inspect where goal setup breaks down.',
					projectId: 'project_ams',
					area: 'product',
					goalId: 'goal_parent',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: '',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-04-01T09:00:00.000Z',
					updatedAt: '2026-04-01T09:00:00.000Z'
				}
			],
			runs: [],
			reviews: [],
			approvals: []
		};
		controlPlaneState.saved = null;
	});

	it('rewrites goal fields in place without creating a goal', async () => {
		const form = new FormData();
		form.set('name', 'make this goal clearer');
		form.set('summary', 'help operators define the goal better');
		form.set('successSignal', 'clearer goal drafts');
		form.set('parentGoalId', 'goal_parent');
		form.set('projectIds', 'project_ams');
		form.set('taskIds', 'task_1');

		const result = await actions.assistGoalWriting({
			request: new Request('http://localhost/app/goals', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(assistGoalWritingMock).toHaveBeenCalledWith({
			cwd: '/tmp/project',
			name: 'make this goal clearer',
			summary: 'help operators define the goal better',
			successSignal: 'clearer goal drafts',
			area: 'product',
			status: 'ready',
			targetDate: '',
			parentGoalName: 'Strengthen planning quality',
			artifactPath: '',
			linkedProjectNames: ['Agent Management System Prototype'],
			linkedTaskTitles: ['Map goal creation friction']
		});
		expect(result).toEqual({
			ok: true,
			successAction: 'assistGoalWriting',
			reopenCreateModal: true,
			assistChangeSummary:
				'Rewrote the goal draft into a clearer outcome, summary, and observable success signal.',
			values: {
				name: 'Help operators define goals clearly before linking work',
				summary:
					'This goal improves the goal-writing flow so operators can describe the outcome before managing structure. It matters because weak goal framing makes linked execution harder to trust.',
				successSignal:
					'Most new goals include a concrete outcome and a visible proof point before execution work is linked.',
				targetDate: '',
				artifactPath: '',
				parentGoalId: 'goal_parent',
				projectIds: ['project_ams'],
				taskIds: ['task_1'],
				area: 'product',
				status: 'ready'
			}
		});
		expect(updateControlPlaneMock).not.toHaveBeenCalled();
		expect(controlPlaneState.saved).toBeNull();
	});

	it('rejects goal-writing assist requests without draft content', async () => {
		const result = await actions.assistGoalWriting({
			request: new Request('http://localhost/app/goals', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				message:
					'Add a draft goal name, summary, or success signal before requesting writing assist.',
				values: {
					name: '',
					summary: '',
					successSignal: '',
					targetDate: '',
					artifactPath: '',
					parentGoalId: '',
					projectIds: [],
					taskIds: [],
					area: 'product',
					status: 'ready'
				}
			}
		});
		expect(assistGoalWritingMock).not.toHaveBeenCalled();
	});
});
