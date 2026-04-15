import { describe, expect, it } from 'vitest';
import {
	isValidTaskDate,
	readCreateTaskForm,
	readCreateTaskPrefill,
	readTaskDetailForm
} from './task-form';

describe('task-form', () => {
	it('parses create-task form values with trimming, fallbacks, and deduped lists', () => {
		const form = new FormData();
		form.set('name', '  Plan cleanup pass  ');
		form.set('instructions', '  Tighten the task surfaces  ');
		form.set('successCriteria', '  Fewer duplicate parsers  ');
		form.set('readyCondition', '  Spec is approved  ');
		form.set('expectedOutcome', '  Shared server helpers  ');
		form.set('projectId', '  project_1  ');
		form.set('parentTaskId', '  task_parent  ');
		form.set('delegationObjective', '  Extract shared form readers  ');
		form.set('delegationInputContext', '  Two task routes duplicate coercion  ');
		form.set('delegationExpectedDeliverable', '  Shared task-form module  ');
		form.set('delegationDoneCondition', '  Routes import the new helpers  ');
		form.set('delegationIntegrationNotes', '  Keep route behavior unchanged  ');
		form.set('assigneeExecutionSurfaceId', '  worker_1  ');
		form.set('targetDate', ' 2026-04-10 ');
		form.set('goalId', '  goal_cleanup ');
		form.set('workflowId', '  workflow_release ');
		form.set('area', 'invalid');
		form.set('priority', 'high');
		form.set('riskLevel', 'invalid');
		form.set('approvalMode', 'invalid');
		form.set('requiredThreadSandbox', 'workspace-write');
		form.set('requiresReview', 'false');
		form.set('desiredRoleId', '  role_reviewer ');
		form.set('blockedReason', '  Waiting on cleanup window ');
		form.append('dependencyTaskIds', ' task_a ');
		form.append('dependencyTaskIds', 'task_b');
		form.append('dependencyTaskIds', 'task_a');
		form.set('requiredPromptSkillNames', 'frontend-sveltekit, docs-writer, frontend-sveltekit');
		form.set('requiredCapabilityNames', 'planning, citations, planning');
		form.set('requiredToolNames', 'codex, playwright, codex');

		expect(readCreateTaskForm(form)).toEqual({
			name: 'Plan cleanup pass',
			instructions: 'Tighten the task surfaces',
			successCriteria: 'Fewer duplicate parsers',
			readyCondition: 'Spec is approved',
			expectedOutcome: 'Shared server helpers',
			projectId: 'project_1',
			parentTaskId: 'task_parent',
			delegationObjective: 'Extract shared form readers',
			delegationInputContext: 'Two task routes duplicate coercion',
			delegationExpectedDeliverable: 'Shared task-form module',
			delegationDoneCondition: 'Routes import the new helpers',
			delegationIntegrationNotes: 'Keep route behavior unchanged',
			assigneeExecutionSurfaceId: 'worker_1',
			targetDate: '2026-04-10',
			goalId: 'goal_cleanup',
			workflowId: 'workflow_release',
			area: 'product',
			priority: 'high',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiredThreadSandbox: 'workspace-write',
			requiresReview: false,
			desiredRoleId: 'role_reviewer',
			blockedReason: 'Waiting on cleanup window',
			dependencyTaskIds: ['task_a', 'task_b'],
			requiredPromptSkillNames: ['frontend-sveltekit', 'docs-writer'],
			requiredCapabilityNames: ['planning', 'citations'],
			requiredToolNames: ['codex', 'playwright']
		});
	});

	it('tracks task-detail field presence separately from parsed values', () => {
		const form = new FormData();
		form.set('name', 'Task title');
		form.set('instructions', 'Task instructions');
		form.set('projectId', 'project_1');
		form.set('goalId', '');
		form.set('workflowId', '');
		form.set('assigneeExecutionSurfaceId', '');
		form.set('priority', 'medium');
		form.set('requiredThreadSandbox', '');
		form.set('requiresReview', 'true');
		form.set('desiredRoleId', '');
		form.set('requiredCapabilityNames', '');
		form.set('blockedReason', '');
		form.set('targetDate', '');
		form.set('delegationObjective', '');
		form.set('dependencyTaskSelection', 'manual');

		expect(readTaskDetailForm(form)).toMatchObject({
			name: 'Task title',
			instructions: 'Task instructions',
			projectId: 'project_1',
			hasDelegationPacketFields: true,
			hasGoalId: true,
			hasWorkflowId: true,
			hasAssigneeExecutionSurfaceId: true,
			hasPriority: true,
			hasRiskLevel: false,
			hasApprovalMode: false,
			hasRequiredThreadSandbox: true,
			hasRequiresReview: true,
			hasDesiredRoleId: true,
			hasRequiredPromptSkillNames: false,
			hasRequiredCapabilityNames: true,
			hasRequiredToolNames: false,
			hasBlockedReason: true,
			hasDependencyTaskSelection: true,
			hasTargetDate: true
		});
	});

	it('parses create-task prefill values from the query string', () => {
		const url = new URL('https://example.test/app/tasks');
		url.searchParams.set('create', '1');
		url.searchParams.set('projectId', ' project_1 ');
		url.searchParams.set('targetDate', 'not-a-date');
		url.searchParams.set('area', 'invalid');
		url.searchParams.set('priority', 'high');
		url.searchParams.set('workflowId', ' workflow_release ');
		url.searchParams.set('requiresReview', 'false');
		url.searchParams.set('dependencyTaskIds', 'task_a, task_b, task_a');
		url.searchParams.set('requiredPromptSkillNames', 'frontend-sveltekit, docs-writer');
		url.searchParams.set('requiredCapabilityNames', 'planning, citations');
		url.searchParams.set('requiredToolNames', 'codex, playwright');

		expect(readCreateTaskPrefill(url)).toMatchObject({
			open: true,
			projectId: 'project_1',
			targetDate: '',
			workflowId: 'workflow_release',
			area: 'product',
			priority: 'high',
			requiresReview: false,
			dependencyTaskIds: ['task_a', 'task_b'],
			requiredPromptSkillNames: 'frontend-sveltekit, docs-writer',
			requiredCapabilityNames: 'planning, citations',
			requiredToolNames: 'codex, playwright'
		});
	});

	it('validates task dates with YYYY-MM-DD format', () => {
		expect(isValidTaskDate('2026-04-07')).toBe(true);
		expect(isValidTaskDate('2026-4-7')).toBe(false);
		expect(isValidTaskDate('04-07-2026')).toBe(false);
	});
});
