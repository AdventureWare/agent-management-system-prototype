import { describe, expect, it } from 'vitest';
import { interpretAssistantRequest } from '$lib/server/assistant/intent';
import type { AssistantContextSnapshot } from '$lib/assistant/types';
import type { ControlPlaneData } from '$lib/types/control-plane';

function baseData(): ControlPlaneData {
	return {
		providers: [
			{
				id: 'provider_local',
				name: 'Local Provider',
				service: 'local',
				kind: 'local',
				description: '',
				enabled: true,
				setupStatus: 'connected',
				authMode: 'local_cli',
				defaultModel: '',
				baseUrl: '',
				launcher: '',
				envVars: [],
				capabilities: [],
				defaultThreadSandbox: 'workspace-write',
				notes: ''
			}
		],
		roles: [
			{
				id: 'role_frontend',
				name: 'Frontend Engineer',
				area: 'product',
				description: 'Builds frontend UI'
			}
		],
		projects: [
			{
				id: 'project_onboarding',
				name: 'Onboarding Prototype',
				summary: 'Prototype onboarding',
				projectRootFolder: '/tmp/onboarding',
				defaultArtifactRoot: '/tmp/onboarding/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: 'main',
				additionalWritableRoots: [],
				defaultThreadSandbox: 'workspace-write'
			},
			{
				id: 'project_content_os',
				name: 'Content_OS',
				summary: 'Knowledge system',
				projectRootFolder: '/tmp/content-os',
				defaultArtifactRoot: '/tmp/content-os/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: 'main',
				additionalWritableRoots: [],
				defaultThreadSandbox: 'workspace-write'
			}
		],
		goals: [],
		workflows: [],
		workflowSteps: [],
		taskTemplates: [],
		executionSurfaces: [],
		tasks: [],
		runs: [],
		reviews: [],
		planningSessions: [],
		approvals: [],
		decisions: []
	};
}

function context(overrides: Partial<AssistantContextSnapshot> = {}): AssistantContextSnapshot {
	return {
		route: '/app/projects',
		pageType: 'project_list',
		currentObject: null,
		selectedObjects: [],
		breadcrumbs: [],
		visibleCapabilities: ['create_task', 'create_goal', 'create_role', 'create_agent'],
		...overrides
	};
}

describe('interpretAssistantRequest', () => {
	it('creates a task plan with project context', () => {
		expect.assertions(5);

		const result = interpretAssistantRequest({
			rawInput:
				'Create a task called Create Web Developer Role. Instructions are to create a web developer role that is an expert at web development.',
			context: context({
				pageType: 'task_list',
				currentObject: {
					type: 'project',
					id: 'project_onboarding',
					name: 'Onboarding Prototype'
				}
			}),
			data: baseData()
		});

		expect(result.kind).toBe('plan');
		if (result.kind !== 'plan') return;
		expect(result.plan.action).toBe('create_task');
		expect(result.plan.payload.title).toBe('Create Web Developer Role');
		expect(result.plan.payload.projectId).toBe('project_onboarding');
		expect(result.plan.payload.summary).toContain('create a web developer role');
	});

	it('uses current role context for agent creation', () => {
		expect.assertions(5);

		const result = interpretAssistantRequest({
			rawInput: 'Create an agent for this.',
			context: context({
				route: '/app/roles/role_frontend',
				pageType: 'role_detail',
				currentObject: {
					type: 'role',
					id: 'role_frontend',
					name: 'Frontend Engineer'
				}
			}),
			data: baseData()
		});

		expect(result.kind).toBe('plan');
		if (result.kind !== 'plan') return;
		expect(result.plan.action).toBe('create_agent');
		expect(result.plan.payload.name).toBe('Frontend Engineer Agent');
		expect(result.plan.payload.supportedRoleIds).toEqual(['role_frontend']);
		expect(result.plan.payload.providerId).toBe('provider_local');
	});

	it('creates a role plan from plain role phrasing without extra clarification', () => {
		expect.assertions(4);

		const result = interpretAssistantRequest({
			rawInput: 'Create a web developer role that is an expert in frontend development',
			context: context({
				route: '/app/roles',
				pageType: 'role_list',
				visibleCapabilities: ['create_role', 'create_agent']
			}),
			data: baseData()
		});

		expect(result.kind).toBe('plan');
		if (result.kind !== 'plan') return;
		expect(result.plan.action).toBe('create_role');
		expect(result.plan.payload.name).toBe('Web developer');
		expect(result.plan.payload.description).toContain('frontend development');
	});

	it('extracts task names from project-context phrasing', () => {
		expect.assertions(4);

		const result = interpretAssistantRequest({
			rawInput: 'Add a task under this project for redesigning the workflow page',
			context: context({
				route: '/app/projects/project_onboarding',
				pageType: 'project_detail',
				currentObject: {
					type: 'project',
					id: 'project_onboarding',
					name: 'Onboarding Prototype'
				}
			}),
			data: baseData()
		});

		expect(result.kind).toBe('plan');
		if (result.kind !== 'plan') return;
		expect(result.plan.action).toBe('create_task');
		expect(result.plan.payload.title).toBe('Redesigning the workflow page');
		expect(result.plan.payload.projectId).toBe('project_onboarding');
	});

	it('defaults ambiguous tracking phrasing to a task when the screen supports task creation', () => {
		expect.assertions(5);

		const result = interpretAssistantRequest({
			rawInput: 'I need something to track improving this page.',
			context: context({
				route: '/app/workflows/workflow_1',
				pageType: 'workflow_detail',
				breadcrumbs: [
					{
						type: 'project',
						id: 'project_onboarding',
						name: 'Onboarding Prototype'
					}
				]
			}),
			data: baseData()
		});

		expect(result.kind).toBe('plan');
		if (result.kind !== 'plan') return;
		expect(result.plan.action).toBe('create_task');
		expect(result.plan.payload.title).toBe('Track improving this page');
		expect(result.plan.payload.projectId).toBe('project_onboarding');
		expect(result.plan.contextUsed.pageType).toBe('workflow_detail');
	});

	it('resolves an explicitly mentioned project name from the prompt text', () => {
		expect.assertions(4);

		const result = interpretAssistantRequest({
			rawInput:
				'Create a task for the Content Critic role, in the Content_OS project, to review the content_units in the kwipoo folder. This belongs to the Content_OS project.',
			context: context({
				route: '/app/tasks',
				pageType: 'task_list'
			}),
			data: baseData()
		});

		expect(result.kind).toBe('plan');
		if (result.kind !== 'plan') return;
		expect(result.plan.action).toBe('create_task');
		expect(result.plan.payload.projectId).toBe('project_content_os');
		expect(result.plan.payload.title).toBe('Review the content_units in the kwipoo folder');
	});
});
