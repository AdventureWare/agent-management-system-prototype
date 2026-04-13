import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

const buildPlanningPageData = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/planning', () => ({
	buildPlanningPageData
}));

vi.mock('$lib/server/control-plane', () => ({
	createDecision: vi.fn(
		(input: {
			goalId?: string | null;
			decisionType: string;
			summary: string;
			createdAt?: string;
		}) => ({
			id: 'decision_created',
			taskId: null,
			goalId: input.goalId ?? null,
			runId: null,
			reviewId: null,
			approvalId: null,
			planningSessionId: null,
			decisionType: input.decisionType,
			summary: input.summary,
			createdAt: input.createdAt ?? '2026-04-01T12:00:00.000Z',
			decidedByExecutionSurfaceId: null
		})
	),
	createPlanningSession: vi.fn(
		(input: {
			windowStart: string;
			windowEnd: string;
			projectId?: string | null;
			goalId?: string | null;
			executionSurfaceId?: string | null;
			includeUnscheduled: boolean;
			goalIds?: string[];
			taskIds?: string[];
			decisionIds?: string[];
			summary: string;
			createdAt?: string;
		}) => ({
			id: 'planning_session_created',
			windowStart: input.windowStart,
			windowEnd: input.windowEnd,
			projectId: input.projectId ?? null,
			goalId: input.goalId ?? null,
			executionSurfaceId: input.executionSurfaceId ?? null,
			includeUnscheduled: input.includeUnscheduled,
			goalIds: input.goalIds ?? [],
			taskIds: input.taskIds ?? [],
			decisionIds: input.decisionIds ?? [],
			summary: input.summary,
			createdAt: input.createdAt ?? '2026-04-01T12:00:00.000Z'
		})
	),
	formatRelativeTime: vi.fn(() => 'just now'),
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	updateControlPlaneCollections: vi.fn(
		async (updater: (data: ControlPlaneData) => { data: ControlPlaneData }) => {
			controlPlaneState.saved = updater(controlPlaneState.current as ControlPlaneData).data;
			controlPlaneState.current = controlPlaneState.saved;
			return controlPlaneState.saved;
		}
	)
}));

import { actions } from './+page.server';

describe('planning page server actions', () => {
	beforeEach(() => {
		controlPlaneState.current = {
			providers: [],
			roles: [],
			projects: [
				{
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Prototype',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				}
			],
			goals: [
				{
					id: 'goal_1',
					name: 'Tighten planning',
					area: 'product',
					status: 'running',
					summary: 'Reduce planning noise.',
					artifactPath: '/tmp/project/agent_output',
					projectIds: ['project_1'],
					taskIds: [],
					targetDate: null,
					planningPriority: 1,
					confidence: 'medium'
				}
			],
			executionSurfaces: [],
			tasks: [],
			runs: [],
			reviews: [],
			approvals: [],
			planningSessions: [],
			decisions: [
				{
					id: 'decision_existing',
					taskId: null,
					goalId: 'goal_1',
					runId: null,
					reviewId: null,
					approvalId: null,
					planningSessionId: null,
					decisionType: 'goal_plan_updated',
					summary: 'Existing goal decision.',
					createdAt: '2026-04-01T11:00:00.000Z',
					decidedByExecutionSurfaceId: null
				}
			]
		};
		controlPlaneState.saved = null;
		buildPlanningPageData.mockReset();
		buildPlanningPageData.mockReturnValue({
			goalsInScope: [{ id: 'goal_1' }],
			scheduledTasks: [{ id: 'task_1' }],
			unscheduledTasks: [{ id: 'task_2' }]
		});
	});

	it('records a goal planning decision when goal plan fields change', async () => {
		const form = new FormData();
		form.set('goalId', 'goal_1');
		form.set('targetDate', '2026-04-10');
		form.set('planningPriority', '4');
		form.set('confidence', 'high');

		const result = await actions.updateGoalPlan({
			request: new Request('http://localhost/app/planning', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'updateGoalPlan'
			})
		);
		expect(controlPlaneState.saved?.goals[0]).toEqual(
			expect.objectContaining({
				targetDate: '2026-04-10',
				planningPriority: 4,
				confidence: 'high'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				goalId: 'goal_1',
				decisionType: 'goal_plan_updated'
			})
		);
	});

	it('captures a planning session snapshot for the current window', async () => {
		const form = new FormData();
		form.set('startDate', '2026-04-01');
		form.set('endDate', '2026-04-14');
		form.set('projectId', 'project_1');
		form.set('goalId', '');
		form.set('executionSurfaceId', '');
		form.set('includeUnscheduled', 'true');

		const result = await actions.capturePlanningSession({
			request: new Request('http://localhost/app/planning', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(buildPlanningPageData).toHaveBeenCalled();
		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'capturePlanningSession',
				planningSessionId: 'planning_session_created'
			})
		);
		expect(controlPlaneState.saved?.planningSessions?.[0]).toEqual(
			expect.objectContaining({
				id: 'planning_session_created',
				windowStart: '2026-04-01',
				windowEnd: '2026-04-14',
				projectId: 'project_1',
				goalIds: ['goal_1'],
				taskIds: ['task_1', 'task_2'],
				decisionIds: ['decision_existing']
			})
		);
	});
});
