import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

function renderPage({
	taskStatus = 'review',
	readinessStatus = 'review',
	readinessReason = 'Task status is review.',
	availableActions = [
		{
			id: 'accept_output',
			label: 'Accept output',
			status: 'informational',
			reason: 'Acceptance is deferred in the UI until run/artifact capture is stronger.'
		},
		{
			id: 'request_changes',
			label: 'Request changes',
			status: 'available',
			reason: 'Review work can return to in_progress when changes are needed.'
		}
	]
} = {}) {
	render(Page, {
		form: {} as never,
		data: {
			dbFile: '/tmp/ams-v2-core-task-ui.sqlite',
			taskDetail: {
				task: {
					id: 'task_detail_ui',
					projectId: 'project_task_ui',
					goalId: 'goal_task_ui',
					title: 'Review task detail page',
					summary: 'Build a task detail read surface.',
					successCriteria: 'Task detail shows evidence and actions.',
					validationPlan: 'Run focused task page tests.',
					status: taskStatus
				},
				project: {
					id: 'project_task_ui',
					name: 'V2 Task UI'
				},
				goal: {
					id: 'goal_task_ui',
					title: 'Inspect task evidence',
					status: 'active'
				},
				runs: [
					{
						id: 'run_task_ui',
						status: 'completed',
						modelProviderId: 'provider_task_ui',
						modelProviderName: 'Codex Task UI',
						modelProviderKind: 'external_ai',
						resultSummary: 'Task evidence is visible.',
						validationSummary: 'Focused tests passed.',
						startedAt: '2026-07-09T00:00:00.000Z',
						endedAt: '2026-07-09T00:00:00.000Z'
					}
				],
				toolExecutions: [
					{
						id: 'tool_execution_task_ui',
						toolId: 'tool_task_ui',
						toolName: 'Vitest Task UI',
						runId: 'run_task_ui',
						status: 'completed',
						inputSummary: 'Run task detail tests.',
						resultSummary: 'Tests passed.',
						errorSummary: ''
					}
				],
				artifacts: [
					{
						id: 'artifact_task_ui',
						runId: 'run_task_ui',
						uri: 'repo://src/routes/app/v2-core/tasks/[taskId]/+page.svelte',
						role: 'deliverable',
						title: 'Task detail page',
						status: 'accepted'
					}
				],
				reviews: [
					{
						id: 'review_task_ui',
						runId: 'run_task_ui',
						artifactId: 'artifact_task_ui',
						status: 'approved',
						summary: 'Task detail UI is acceptable.'
					}
				],
				decisions: [
					{
						id: 'decision_task_ui',
						decisionType: 'review_decision',
						summary: 'Keep task detail page.',
						rationale: 'It exposes existing evidence without schema change.'
					}
				],
				memoryItems: [
					{
						id: 'memory_task_ui',
						title: 'Task detail evidence is useful',
						status: 'trusted',
						scope: 'project'
					}
				],
				lineage: {
					sourceTaskId: 'task_source',
					sourceTaskTitle: 'Source task',
					sourceReason: 'Follow-up reason.',
					followupTaskIds: ['task_followup']
				},
				sourceReferences: [
					{
						recordTable: 'v2_core_tasks',
						recordId: 'task_detail_ui',
						sourceSystem: 'ams-v2-core',
						sourceCollection: 'followup_tasks',
						sourceId: 'task_source',
						field: 'sourceTaskId',
						note: 'Follow-up reason.'
					}
				]
			},
			contextBundle: {
				task: {
					id: 'task_detail_ui',
					projectId: 'project_task_ui',
					goalId: 'goal_task_ui',
					title: 'Review task detail page',
					summary: 'Build a task detail read surface.',
					successCriteria: 'Task detail shows evidence and actions.',
					validationPlan: 'Run focused task page tests.',
					status: taskStatus
				},
				project: {
					id: 'project_task_ui',
					name: 'V2 Task UI'
				},
				goal: {
					id: 'goal_task_ui',
					title: 'Inspect task evidence',
					status: 'active'
				},
				includedSources: [
					{
						recordType: 'task',
						recordId: 'task_detail_ui',
						title: 'Review task detail page',
						reason: 'Selected task contract.'
					},
					{
						recordType: 'memory',
						recordId: 'memory_task_ui',
						title: 'Task detail evidence is useful',
						reason: 'Project memory with status trusted.'
					}
				],
				readiness: {
					status: readinessStatus,
					canStart: false,
					reason: readinessReason
				}
			},
			dependencyReport: {
				scope: {
					projectId: null,
					goalId: null,
					taskId: 'task_detail_ui'
				},
				summary: {
					runCount: 1,
					providerRunCount: 1,
					toolExecutionCount: 1
				},
				modelProviders: [
					{
						providerId: 'provider_task_ui',
						name: 'Codex Task UI',
						kind: 'external_ai',
						status: 'available',
						runCount: 1,
						taskIds: ['task_detail_ui']
					}
				],
				toolExecutions: [
					{
						executionId: 'tool_execution_task_ui',
						toolId: 'tool_task_ui',
						toolName: 'Vitest Task UI',
						toolKind: 'local_cli',
						riskLevel: 'low',
						approvalRequirement: 'none',
						status: 'completed',
						taskId: 'task_detail_ui',
						runId: 'run_task_ui',
						inputSummary: 'Run task detail tests.',
						resultSummary: 'Tests passed.',
						errorSummary: ''
					}
				]
			},
			artifactRoles: ['output', 'evidence', 'deliverable', 'context'],
			availableActions
		} as never
	});
}

describe('/app/v2-core/tasks/[taskId]/+page.svelte', () => {
	it('renders task contract, context, evidence, decisions, and actions', () => {
		renderPage();

		expect(document.body.textContent).toContain('Review task detail page');
		expect(document.body.textContent).toContain('Task contract');
		expect(document.body.textContent).toContain('Available actions');
		expect(document.body.textContent).toContain('Accept output');
		expect(document.body.textContent).toContain('Context bundle');
		expect(document.body.textContent).toContain('Record run evidence');
		expect(document.body.textContent).toContain('Action summary');
		expect(document.body.textContent).toContain('Result summary');
		expect(document.body.textContent).toContain('Artifact title');
		expect(document.body.textContent).toContain('Artifact URI');
		expect(document.body.textContent).toContain('Artifact role');
		expect(document.body.textContent).toContain('Task detail evidence is useful');
		expect(document.body.textContent).toContain('Codex Task UI');
		expect(document.body.textContent).toContain('Vitest Task UI');
		expect(document.body.textContent).toContain('Keep task detail page');
		expect(document.body.textContent).toContain('Lineage and sources');
		const buttonLabels = Array.from(document.querySelectorAll('button')).map((button) =>
			button.textContent?.trim()
		);
		expect(buttonLabels).toContain('Request changes');
		expect(buttonLabels).toContain('Record evidence');
		expect(buttonLabels).not.toContain('Accept output');
		const artifactRoleOptions = Array.from(
			document.querySelectorAll('select[name="artifactRole"] option')
		).map((option) => option.textContent?.trim());
		expect(artifactRoleOptions).toEqual(['output', 'evidence', 'deliverable', 'context']);
	});

	it('renders submit for review as an action form when available', () => {
		renderPage({
			taskStatus: 'in_progress',
			readinessStatus: 'in_progress',
			readinessReason: 'Task is in progress.',
			availableActions: [
				{
					id: 'submit_for_review',
					label: 'Submit for review',
					status: 'available',
					reason: 'Captured run and submitted artifact evidence can move to review.'
				},
				{
					id: 'mark_blocked',
					label: 'Mark blocked',
					status: 'available',
					reason: 'In-progress work can be blocked if execution cannot continue.'
				}
			]
		});

		const buttonLabels = Array.from(document.querySelectorAll('button')).map((button) =>
			button.textContent?.trim()
		);
		expect(document.body.textContent).toContain('Captured run and submitted artifact evidence');
		expect(buttonLabels).toContain('Submit for review');
		expect(buttonLabels).toContain('Mark blocked');
	});

	it('renders accept output as an action form when approved review makes it available', () => {
		renderPage({
			taskStatus: 'review',
			readinessStatus: 'review',
			readinessReason: 'Task is ready for review decision.',
			availableActions: [
				{
					id: 'accept_output',
					label: 'Accept output',
					status: 'available',
					reason: 'Approved review evidence can be accepted to close the task.'
				},
				{
					id: 'request_changes',
					label: 'Request changes',
					status: 'available',
					reason: 'Review work can return to in_progress when changes are needed.'
				}
			]
		});

		const buttonLabels = Array.from(document.querySelectorAll('button')).map((button) =>
			button.textContent?.trim()
		);
		expect(document.body.textContent).toContain('Approved review evidence can be accepted');
		expect(buttonLabels).toContain('Accept output');
		expect(buttonLabels).toContain('Request changes');
	});
});
