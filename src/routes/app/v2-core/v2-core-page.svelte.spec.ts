import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

function renderPage() {
	render(Page, {
		data: {
			status: 'ready',
			dbFile: '/tmp/ams-v2-core-ui.sqlite',
			error: null,
			scope: {
				projectId: 'project_ui',
				goalId: null
			},
			operatorConsole: {
				scope: {
					projectId: 'project_ui',
					goalId: null
				},
				overview: {
					projects: [
						{
							id: 'project_ui',
							name: 'V2 Core UI',
							summary: 'Operator console test project.',
							status: 'active',
							goalCount: 3,
							taskCount: 2,
							runCount: 1,
							artifactCount: 1,
							memoryItemCount: 1
						}
					],
					taskStatusCounts: {
						done: 1,
						ready: 1
					},
					reviewStatusCounts: {
						approved: 1
					},
					memoryStatusCounts: {
						trusted: 1
					}
				},
				activeGoals: [
					{
						goalId: 'goal_ui',
						projectId: 'project_ui',
						projectName: 'V2 Core UI',
						parentGoalId: null,
						title: 'Make v2 core inspectable',
						status: 'active',
						openTaskCount: 1,
						doneTaskCount: 1,
						latestGoalStatusTransition: null
					},
					{
						goalId: 'goal_ui_blocked',
						projectId: 'project_ui',
						projectName: 'V2 Core UI',
						parentGoalId: 'goal_ui',
						title: 'Unblock v2 operator work',
						status: 'blocked',
						openTaskCount: 0,
						doneTaskCount: 0,
						latestGoalStatusTransition: {
							decisionId: 'decision_goal_ui_blocked',
							summary: 'Blocked waiting for operator direction.',
							rationale: 'Transitioned goal from active to blocked.',
							decidedAt: '2026-07-09T00:00:00.000Z'
						}
					},
					{
						goalId: 'goal_ui_paused',
						projectId: 'project_ui',
						projectName: 'V2 Core UI',
						parentGoalId: null,
						title: 'Paused v2 track',
						status: 'paused',
						openTaskCount: 0,
						doneTaskCount: 0,
						latestGoalStatusTransition: {
							decisionId: 'decision_goal_ui_paused',
							summary: 'Paused while the running goal is prioritized.',
							rationale: 'Transitioned goal from active to paused.',
							decidedAt: '2026-07-09T00:00:00.000Z'
						}
					}
				],
				goalStatusGroups: {
					running: [
						{
							goalId: 'goal_ui',
							projectId: 'project_ui',
							projectName: 'V2 Core UI',
							parentGoalId: null,
							title: 'Make v2 core inspectable',
							status: 'active',
							openTaskCount: 1,
							doneTaskCount: 1,
							latestGoalStatusTransition: null
						}
					],
					blocked: [
						{
							goalId: 'goal_ui_blocked',
							projectId: 'project_ui',
							projectName: 'V2 Core UI',
							parentGoalId: 'goal_ui',
							title: 'Unblock v2 operator work',
							status: 'blocked',
							openTaskCount: 0,
							doneTaskCount: 0,
							latestGoalStatusTransition: {
								decisionId: 'decision_goal_ui_blocked',
								summary: 'Blocked waiting for operator direction.',
								rationale: 'Transitioned goal from active to blocked.',
								decidedAt: '2026-07-09T00:00:00.000Z'
							}
						}
					],
					paused: [
						{
							goalId: 'goal_ui_paused',
							projectId: 'project_ui',
							projectName: 'V2 Core UI',
							parentGoalId: null,
							title: 'Paused v2 track',
							status: 'paused',
							openTaskCount: 0,
							doneTaskCount: 0,
							latestGoalStatusTransition: {
								decisionId: 'decision_goal_ui_paused',
								summary: 'Paused while the running goal is prioritized.',
								rationale: 'Transitioned goal from active to paused.',
								decidedAt: '2026-07-09T00:00:00.000Z'
							}
						}
					]
				},
				nextWork: {
					candidates: [
						{
							taskId: 'task_ui_next',
							title: 'Ready next step',
							status: 'ready',
							goalId: 'goal_ui',
							goalTitle: 'Make v2 core inspectable',
							projectId: 'project_ui',
							projectName: 'V2 Core UI',
							action: 'start_task',
							reason: 'Next ready task.'
						}
					]
				},
				reviewQueue: [],
				recentRuns: [
					{
						runId: 'run_ui_done',
						taskId: 'task_ui_done',
						taskTitle: 'Ship read-only console',
						goalId: 'goal_ui',
						projectId: 'project_ui',
						status: 'completed',
						modelProviderId: 'provider_codex_ui',
						modelProviderName: 'Codex UI',
						resultSummary: 'Read-only console route is available.',
						validationSummary: 'Focused tests passed.',
						endedAt: '2026-07-09T00:00:00.000Z'
					}
				],
				recentArtifacts: [
					{
						artifactId: 'artifact_ui_page',
						taskId: 'task_ui_done',
						runId: 'run_ui_done',
						projectId: 'project_ui',
						title: 'V2 core operator console page',
						uri: 'repo://src/routes/app/v2-core/+page.svelte',
						role: 'deliverable',
						status: 'accepted'
					}
				],
				memory: {
					projectId: 'project_ui',
					taskId: null,
					items: [
						{
							id: 'memory_ui',
							title: 'Read-only v2 core console exists',
							body: 'The operator console can inspect v2 core status.',
							scope: 'project',
							status: 'trusted',
							sources: [
								{
									sourceTable: 'v2_core_reviews',
									sourceId: 'review_ui_done',
									reason: 'Approved review.'
								}
							]
						}
					]
				},
				dependencyReport: {
					scope: {
						projectId: 'project_ui',
						goalId: null,
						taskId: null
					},
					summary: {
						runCount: 1,
						providerRunCount: 1,
						toolExecutionCount: 1
					},
					modelProviders: [
						{
							providerId: 'provider_codex_ui',
							name: 'Codex UI',
							kind: 'external_ai',
							status: 'available',
							runCount: 1,
							taskIds: ['task_ui_done']
						}
					],
					toolExecutions: []
				},
				snapshotStatus: {
					format: 'ams-v2-core-snapshot-v1',
					tableCounts: {
						v2_core_projects: 1,
						v2_core_goals: 3,
						v2_core_tasks: 2,
						v2_core_runs: 1,
						v2_core_artifacts: 1,
						v2_core_reviews: 1,
						v2_core_decisions: 3,
						v2_core_memory_items: 1,
						v2_core_memory_item_sources: 1,
						v2_core_model_providers: 1,
						v2_core_tools: 1,
						v2_core_tool_executions: 1,
						v2_core_source_references: 13,
						v2_core_task_dependencies: 0
					}
				}
			}
		} as never
	});
}

function expectNoHorizontalOverflow() {
	const root = document.documentElement;
	const body = document.body;
	const rootOverflow = root.scrollWidth - root.clientWidth;
	const bodyOverflow = body.scrollWidth - body.clientWidth;

	expect(rootOverflow).toBeLessThanOrEqual(1);
	expect(bodyOverflow).toBeLessThanOrEqual(1);
}

describe('/app/v2-core/+page.svelte', () => {
	it('renders operator console sections from the v2 core read model', () => {
		renderPage();

		expect(document.body.textContent).toContain('Operator console');
		expect(document.body.textContent).toContain('V2 Core UI');
		expect(document.body.textContent).toContain('Make v2 core inspectable');
		expect(document.body.textContent).toContain('Goal control');
		expect(document.body.textContent).toContain('Unblock v2 operator work');
		expect(document.body.textContent).toContain('Blocked waiting for operator direction.');
		expect(document.body.textContent).toContain('Paused v2 track');
		expect(document.body.textContent).toContain('Ready next step');
		expect(document.body.textContent).toContain('No review items');
		expect(document.body.textContent).toContain('Codex UI');
		expect(document.body.textContent).toContain('Read-only v2 core console exists');
		expect(document.body.textContent).toContain('Snapshot');
		expect(document.body.textContent).toContain('v2_core_tasks');
		expect(
			document.querySelector('a[href="/app/v2-core/tasks/task_ui_next?mode=read"]')
		).not.toBeNull();
		expect(
			document.querySelector('a[href="/app/v2-core/tasks/task_ui_done?mode=read"]')
		).not.toBeNull();
	});

	it('keeps the read-only operator console usable in a phone viewport', async () => {
		await page.viewport(390, 844);
		renderPage();

		await expect
			.element(page.getByRole('heading', { name: 'Operator console' }))
			.toBeInTheDocument();
		await expect.element(page.getByText('Unblock v2 operator work')).toBeInTheDocument();
		await expect.element(page.getByText('Ready next step')).toBeInTheDocument();
		await expect.element(page.getByText('Read-only v2 core console exists')).toBeInTheDocument();
		await expect.element(page.getByRole('heading', { name: 'Snapshot' })).toBeInTheDocument();
		expectNoHorizontalOverflow();
	});
});
