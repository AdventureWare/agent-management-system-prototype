import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

const createTaskTemplateMock = vi.hoisted(() =>
	vi.fn(
		(input: {
			name: string;
			summary?: string;
			projectId: string;
			goalId?: string | null;
			workflowId?: string | null;
			taskTitle?: string;
			taskSummary?: string;
			desiredRoleId?: string;
			requiredCapabilityNames?: string[];
		}) => ({
			id: `task_template_${input.name.toLowerCase().replace(/\s+/g, '_')}`,
			name: input.name,
			summary: input.summary ?? '',
			projectId: input.projectId,
			goalId: input.goalId ?? null,
			workflowId: input.workflowId ?? null,
			taskTitle: input.taskTitle ?? '',
			taskSummary: input.taskSummary ?? '',
			successCriteria: '',
			readyCondition: '',
			expectedOutcome: '',
			area: 'product',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiredThreadSandbox: null,
			requiresReview: true,
			desiredRoleId: input.desiredRoleId ?? '',
			assigneeExecutionSurfaceId: null,
			requiredPromptSkillNames: [],
			requiredCapabilityNames: input.requiredCapabilityNames ?? [],
			requiredToolNames: [],
			createdAt: '2026-04-15T10:00:00.000Z',
			updatedAt: '2026-04-15T10:00:00.000Z'
		})
	)
);

vi.mock('$lib/server/control-plane', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/control-plane')>(
		'$lib/server/control-plane'
	);

	return {
		...actual,
		createTaskTemplate: createTaskTemplateMock,
		loadControlPlane: vi.fn(async () => controlPlaneState.current),
		updateControlPlaneCollections: vi.fn(
			async (
				updater: (
					data: ControlPlaneData
				) => { data: ControlPlaneData } | Promise<{ data: ControlPlaneData }>
			) => {
				controlPlaneState.saved = (
					await updater(controlPlaneState.current as ControlPlaneData)
				).data;
				controlPlaneState.current = controlPlaneState.saved;
				return controlPlaneState.saved;
			}
		)
	};
});

vi.mock('$lib/server/codex-skills', () => ({
	listInstalledCodexSkills: vi.fn(() => [
		{
			id: 'web-design-guidelines',
			description: 'Review UI against guidelines',
			global: false,
			project: true,
			sourceLabel: 'Project'
		}
	])
}));

import { loadTaskTemplateDirectoryData } from '$lib/server/task-template-directory';
import {
	createTaskTemplateAction,
	deleteTaskTemplateAction,
	migrateTaskTemplateReferencesAction,
	updateTaskTemplateAction
} from '$lib/server/task-template-form-actions';

describe('task template server helpers', () => {
	beforeEach(() => {
		createTaskTemplateMock.mockClear();
		controlPlaneState.current = {
			providers: [],
			roles: [
				{
					id: 'role_research',
					name: 'Research assistant',
					area: 'shared',
					description: 'Runs research tasks'
				}
			],
			projects: [
				{
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				{
					id: 'project_2',
					name: 'Documentation Site',
					summary: 'Docs project',
					projectRootFolder: '/tmp/docs',
					defaultArtifactRoot: '/tmp/docs/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				}
			],
			goals: [
				{
					id: 'goal_1',
					name: 'Reduce task intake friction',
					summary: 'Improve task intake speed.',
					status: 'running',
					artifactPath: '/tmp/project/goals/task-intake',
					parentGoalId: null,
					projectIds: ['project_1'],
					taskIds: [],
					area: 'product',
					targetDate: null
				}
			],
			workflows: [
				{
					id: 'workflow_1',
					name: 'Feature development',
					summary: 'Reusable feature delivery process.',
					projectId: 'project_1',
					status: 'active',
					templateKey: null,
					createdAt: '2026-04-15T09:00:00.000Z',
					updatedAt: '2026-04-15T09:00:00.000Z'
				},
				{
					id: 'workflow_2',
					name: 'Docs review',
					summary: 'Reusable documentation review process.',
					projectId: 'project_2',
					status: 'active',
					templateKey: null,
					createdAt: '2026-04-15T09:00:00.000Z',
					updatedAt: '2026-04-15T09:00:00.000Z'
				}
			],
			workflowSteps: [],
			taskTemplates: [
				{
					id: 'task_template_research',
					name: 'Research Brief',
					summary: 'Reusable research setup.',
					projectId: 'project_1',
					goalId: 'goal_1',
					workflowId: null,
					taskTitle: 'Research [topic]',
					taskSummary: 'Investigate the topic and summarize the findings.',
					successCriteria: '',
					readyCondition: '',
					expectedOutcome: '',
					area: 'product',
					priority: 'medium',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiredThreadSandbox: null,
					requiresReview: true,
					desiredRoleId: 'role_research',
					assigneeExecutionSurfaceId: null,
					requiredPromptSkillNames: ['web-design-guidelines'],
					requiredCapabilityNames: ['planning'],
					requiredToolNames: ['codex'],
					createdAt: '2026-04-15T09:00:00.000Z',
					updatedAt: '2026-04-15T09:00:00.000Z'
				}
			],
			executionSurfaces: [],
			tasks: [
				{
					id: 'task_from_template',
					title: 'Research onboarding',
					summary: 'Kick off research',
					projectId: 'project_1',
					area: 'product',
					goalId: 'goal_1',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiredThreadSandbox: null,
					requiresReview: true,
					desiredRoleId: 'role_research',
					assigneeExecutionSurfaceId: null,
					taskTemplateId: 'task_template_research',
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output/tasks/task_from_template',
					attachments: [],
					createdAt: '2026-04-15T09:00:00.000Z',
					updatedAt: '2026-04-15T09:00:00.000Z'
				}
			],
			runs: [],
			decisions: [],
			reviews: [],
			approvals: []
		};
		controlPlaneState.saved = null;
	});

	it('loads decorated task templates for the library page', async () => {
		const result = await loadTaskTemplateDirectoryData();

		expect(result.taskTemplates).toEqual([
			expect.objectContaining({
				id: 'task_template_research',
				name: 'Research Brief',
				projectName: 'Agent Management System Prototype',
				goalLabel: 'Reduce task intake friction',
				desiredRoleName: 'Research assistant'
			})
		]);
	});

	it('creates a task template from the library form', async () => {
		const form = new FormData();
		form.set('taskTemplateName', 'Report Draft');
		form.set('taskTemplateSummary', 'Reusable report-writing defaults.');
		form.set('projectId', 'project_1');
		form.set('goalId', 'goal_1');
		form.set('workflowId', 'workflow_1');
		form.set('name', 'Draft report for [topic]');
		form.set('instructions', 'Write a concise report with citations.');
		form.set('desiredRoleId', 'role_research');
		form.set('requiredCapabilityNames', 'planning, citations');

		const result = await createTaskTemplateAction(
			new Request('http://localhost/app/task-templates', {
				method: 'POST',
				body: form
			})
		);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTaskTemplate',
				taskTemplateName: 'Report Draft'
			})
		);
		expect(createTaskTemplateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Report Draft',
				projectId: 'project_1',
				workflowId: 'workflow_1',
				taskTitle: 'Draft report for [topic]',
				desiredRoleId: 'role_research',
				requiredCapabilityNames: ['planning', 'citations']
			})
		);
	});

	it('allows task templates to reference workflows from another project', async () => {
		const form = new FormData();
		form.set('taskTemplateName', 'Docs review request');
		form.set('taskTemplateSummary', 'Reusable documentation review defaults.');
		form.set('projectId', 'project_1');
		form.set('workflowId', 'workflow_2');
		form.set('name', 'Review docs for [topic]');
		form.set('instructions', 'Review the documentation draft and leave revision notes.');

		const result = await createTaskTemplateAction(
			new Request('http://localhost/app/task-templates', {
				method: 'POST',
				body: form
			})
		);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTaskTemplate',
				taskTemplateName: 'Docs review request'
			})
		);
		expect(createTaskTemplateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				projectId: 'project_1',
				workflowId: 'workflow_2'
			})
		);
	});

	it('updates an existing task template from the library form', async () => {
		const form = new FormData();
		form.set('taskTemplateId', 'task_template_research');
		form.set('taskTemplateName', 'Research Brief');
		form.set('taskTemplateSummary', 'Updated reusable research setup.');
		form.set('projectId', 'project_1');
		form.set('goalId', 'goal_1');
		form.set('name', 'Research [topic]');
		form.set('instructions', 'Investigate the topic, then summarize the findings clearly.');
		form.set('desiredRoleId', 'role_research');
		form.set('requiredCapabilityNames', 'planning');

		const result = await updateTaskTemplateAction(
			new Request('http://localhost/app/task-templates', {
				method: 'POST',
				body: form
			})
		);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'updateTaskTemplate',
				taskTemplateId: 'task_template_research'
			})
		);
		expect(controlPlaneState.saved?.taskTemplates).toEqual([
			expect.objectContaining({
				id: 'task_template_research',
				summary: 'Updated reusable research setup.',
				taskSummary: 'Investigate the topic, then summarize the findings clearly.'
			})
		]);
	});

	it('requires a successor before marking a template as superseded', async () => {
		const form = new FormData();
		form.set('taskTemplateId', 'task_template_research');
		form.set('taskTemplateName', 'Research Brief');
		form.set('taskTemplateSummary', 'Updated reusable research setup.');
		form.set('projectId', 'project_1');
		form.set('goalId', 'goal_1');
		form.set('name', 'Research [topic]');
		form.set('instructions', 'Investigate the topic, then summarize the findings clearly.');
		form.set('lifecycleStatus', 'superseded');

		const result = await updateTaskTemplateAction(
			new Request('http://localhost/app/task-templates', {
				method: 'POST',
				body: form
			})
		);

		expect(result).toMatchObject({
			status: 400,
			data: expect.objectContaining({
				message: 'Select the successor template before marking this template as superseded.'
			})
		});
	});

	it('migrates downstream task references to a superseding template', async () => {
		const existingTemplate = (controlPlaneState.current as ControlPlaneData).taskTemplates?.[0];

		if (!existingTemplate) {
			throw new Error('Expected seed template in test fixture.');
		}

		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			taskTemplates: [
				{
					...existingTemplate,
					lifecycleStatus: 'superseded',
					supersededByTaskTemplateId: 'task_template_review'
				},
				{
					id: 'task_template_review',
					name: 'Review Brief',
					summary: 'Successor template',
					projectId: 'project_1',
					goalId: 'goal_1',
					workflowId: null,
					taskTitle: 'Review [topic]',
					taskSummary: 'Review the topic.',
					successCriteria: '',
					readyCondition: '',
					expectedOutcome: '',
					area: 'product',
					priority: 'medium',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiredThreadSandbox: null,
					requiresReview: true,
					desiredRoleId: 'role_research',
					assigneeExecutionSurfaceId: null,
					requiredPromptSkillNames: [],
					requiredCapabilityNames: [],
					requiredToolNames: [],
					createdAt: '2026-04-15T09:00:00.000Z',
					updatedAt: '2026-04-15T09:00:00.000Z'
				}
			]
		};

		const form = new FormData();
		form.set('taskTemplateId', 'task_template_research');

		const result = await migrateTaskTemplateReferencesAction(
			new Request('http://localhost/app/task-templates', {
				method: 'POST',
				body: form
			})
		);

		expect(result).toMatchObject({
			ok: true,
			taskTemplateId: 'task_template_research',
			successAction: 'migrateTaskTemplateReferences'
		});
		expect(controlPlaneState.saved?.tasks[0]?.taskTemplateId).toBe('task_template_review');
	});

	it('deletes an existing task template', async () => {
		const form = new FormData();
		form.set('taskTemplateId', 'task_template_research');

		const result = await deleteTaskTemplateAction(
			new Request('http://localhost/app/task-templates', {
				method: 'POST',
				body: form
			})
		);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'deleteTaskTemplate',
				taskTemplateId: 'task_template_research'
			})
		);
		expect(controlPlaneState.saved?.taskTemplates).toEqual([]);
	});
});
