import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

function scopedGoalSummaryFor(scopedGoalId: string | null) {
	if (!scopedGoalId) {
		return null;
	}

	const trustedMemory = {
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
	};

	if (scopedGoalId === 'goal_ui_blocked') {
		return {
			goal: {
				goalId: 'goal_ui_blocked',
				projectId: 'project_ui',
				projectName: 'V2 Core UI',
				parentGoalId: 'goal_ui',
				title: 'Unblock v2 operator work',
				status: 'blocked',
				openTaskCount: 0,
				doneTaskCount: 0,
				latestGoalStatusTransition: null
			},
			queueState: 'blocked',
			currentRun: null,
			selectedTask: null,
			recentAcceptedArtifact: null,
			trustedMemory
		};
	}

	if (scopedGoalId === 'goal_ui_paused') {
		return {
			goal: {
				goalId: 'goal_ui_paused',
				projectId: 'project_ui',
				projectName: 'V2 Core UI',
				parentGoalId: null,
				title: 'Paused v2 track',
				status: 'paused',
				openTaskCount: 0,
				doneTaskCount: 0,
				latestGoalStatusTransition: null
			},
			queueState: 'paused',
			currentRun: null,
			selectedTask: null,
			recentAcceptedArtifact: null,
			trustedMemory
		};
	}

	if (scopedGoalId === 'goal_ui') {
		return {
			goal: {
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
			queueState: 'ready_to_dispatch',
			currentRun: null,
			selectedTask: {
				taskId: 'task_ui_next',
				title: 'Ready next step',
				status: 'ready',
				goalId: 'goal_ui',
				goalTitle: 'Make v2 core inspectable',
				projectId: 'project_ui',
				projectName: 'V2 Core UI',
				action: 'start_task',
				reason: 'Next ready task.'
			},
			recentAcceptedArtifact: null,
			trustedMemory
		};
	}

	if (scopedGoalId === 'goal_ui_empty') {
		return {
			goal: {
				goalId: 'goal_ui_empty',
				projectId: 'project_ui',
				projectName: 'V2 Core UI',
				parentGoalId: null,
				title: 'Keep empty running goal visible',
				status: 'active',
				openTaskCount: 0,
				doneTaskCount: 0,
				latestGoalStatusTransition: null
			},
			queueState: 'no_open_work',
			currentRun: null,
			selectedTask: null,
			recentAcceptedArtifact: null,
			trustedMemory
		};
	}

	return {
		goal: {
			goalId: 'goal_ui_child_running',
			projectId: 'project_ui',
			projectName: 'V2 Core UI',
			parentGoalId: 'goal_ui',
			title: 'Run child goal work',
			status: 'active',
			openTaskCount: 1,
			doneTaskCount: 0,
			latestGoalStatusTransition: null
		},
		queueState: 'running',
		currentRun: {
			runId: 'run_ui_child_current',
			taskId: 'task_ui_child_current',
			taskTitle: 'Current child goal run',
			status: 'planned',
			modelProviderId: 'provider_codex_ui',
			modelProviderName: 'Codex UI'
		},
		selectedTask: null,
		recentAcceptedArtifact: null,
		trustedMemory
	};
}

function scopedChildGoalRollupFor(scopedGoalId: string | null) {
	if (scopedGoalId !== 'goal_ui') {
		return [];
	}

	return [
		{
			goalId: 'goal_ui_child_running',
			projectId: 'project_ui',
			projectName: 'V2 Core UI',
			parentGoalId: 'goal_ui',
			title: 'Run child goal work',
			status: 'active',
			openTaskCount: 1,
			doneTaskCount: 0,
			queueState: 'running',
			currentRun: {
				runId: 'run_ui_child_current',
				taskId: 'task_ui_child_current',
				taskTitle: 'Current child goal run',
				status: 'planned',
				modelProviderId: 'provider_codex_ui',
				modelProviderName: 'Codex UI'
			},
			selectedTask: null
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
			queueState: 'blocked',
			currentRun: null,
			selectedTask: null
		}
	];
}

function scopedTaskRollupFor(scopedGoalId: string | null) {
	if (!scopedGoalId) {
		return null;
	}

	if (scopedGoalId === 'goal_ui_empty') {
		return {
			counts: {
				open: 0,
				review: 0,
				done: 0
			},
			tasks: []
		};
	}

	if (scopedGoalId === 'goal_ui_child_running') {
		return {
			counts: {
				open: 1,
				review: 0,
				done: 0
			},
			tasks: [
				{
					taskId: 'task_ui_child_current',
					title: 'Current child goal run',
					status: 'in_progress',
					currentRun: {
						runId: 'run_ui_child_current',
						status: 'planned',
						modelProviderName: 'Codex UI'
					},
					reviewArtifact: null,
					selectedNextWork: false
				}
			]
		};
	}

	return {
		counts: {
			open: 2,
			review: 1,
			done: 1
		},
		tasks: [
			{
				taskId: 'task_ui_review',
				title: 'Review submitted operator output',
				status: 'review',
				currentRun: null,
				reviewArtifact: {
					artifactId: 'artifact_ui_review',
					title: 'Reviewable operator output',
					status: 'submitted'
				},
				selectedNextWork: false
			},
			{
				taskId: 'task_ui_next',
				title: 'Ready next step',
				status: 'ready',
				currentRun: null,
				reviewArtifact: null,
				selectedNextWork: true
			},
			{
				taskId: 'task_ui_done',
				title: 'Ship read-only console',
				status: 'done',
				currentRun: null,
				reviewArtifact: null,
				selectedNextWork: false
			}
		]
	};
}

function renderPage(options: { scopedGoalId?: string | null } = {}) {
	const scopedGoalId = options.scopedGoalId ?? null;

	render(Page, {
		form: null,
		data: {
			status: 'ready',
			dbFile: '/tmp/ams-v2-core-ui.sqlite',
			error: null,
			scope: {
				projectId: 'project_ui',
				goalId: scopedGoalId
			},
			operatorConsole: {
				scope: {
					projectId: 'project_ui',
					goalId: scopedGoalId
				},
				overview: {
					projects: [
						{
							id: 'project_ui',
							name: 'V2 Core UI',
							summary: 'Operator console test project.',
							status: 'active',
							goalCount: 5,
							taskCount: 4,
							runCount: 2,
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
						goalId: 'goal_ui_child_running',
						projectId: 'project_ui',
						projectName: 'V2 Core UI',
						parentGoalId: 'goal_ui',
						title: 'Run child goal work',
						status: 'active',
						openTaskCount: 1,
						doneTaskCount: 0,
						latestGoalStatusTransition: null
					},
					{
						goalId: 'goal_ui_empty',
						projectId: 'project_ui',
						projectName: 'V2 Core UI',
						parentGoalId: null,
						title: 'Keep empty running goal visible',
						status: 'active',
						openTaskCount: 0,
						doneTaskCount: 0,
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
						},
						{
							goalId: 'goal_ui_child_running',
							projectId: 'project_ui',
							projectName: 'V2 Core UI',
							parentGoalId: 'goal_ui',
							title: 'Run child goal work',
							status: 'active',
							openTaskCount: 1,
							doneTaskCount: 0,
							latestGoalStatusTransition: null
						},
						{
							goalId: 'goal_ui_empty',
							projectId: 'project_ui',
							projectName: 'V2 Core UI',
							parentGoalId: null,
							title: 'Keep empty running goal visible',
							status: 'active',
							openTaskCount: 0,
							doneTaskCount: 0,
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
				scopedGoalSummary: scopedGoalSummaryFor(scopedGoalId),
				scopedChildGoalRollup: scopedChildGoalRollupFor(scopedGoalId),
				scopedTaskRollup: scopedTaskRollupFor(scopedGoalId),
				workQueue: [
					{
						goalId: 'goal_ui',
						projectId: 'project_ui',
						projectName: 'V2 Core UI',
						parentGoalId: null,
						title: 'Make v2 core inspectable',
						status: 'active',
						openTaskCount: 1,
						doneTaskCount: 1,
						queueState: 'ready_to_dispatch',
						currentRun: null,
						selectedTask: {
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
					},
					{
						goalId: 'goal_ui_child_running',
						projectId: 'project_ui',
						projectName: 'V2 Core UI',
						parentGoalId: 'goal_ui',
						title: 'Run child goal work',
						status: 'active',
						openTaskCount: 1,
						doneTaskCount: 0,
						queueState: 'running',
						currentRun: {
							runId: 'run_ui_child_current',
							taskId: 'task_ui_child_current',
							taskTitle: 'Current child goal run',
							status: 'planned',
							modelProviderId: 'provider_codex_ui',
							modelProviderName: 'Codex UI'
						},
						selectedTask: null
					},
					{
						goalId: 'goal_ui_empty',
						projectId: 'project_ui',
						projectName: 'V2 Core UI',
						parentGoalId: null,
						title: 'Keep empty running goal visible',
						status: 'active',
						openTaskCount: 0,
						doneTaskCount: 0,
						queueState: 'no_open_work',
						currentRun: null,
						selectedTask: null
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
						queueState: 'blocked',
						currentRun: null,
						selectedTask: null
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
						queueState: 'paused',
						currentRun: null,
						selectedTask: null
					}
				],
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
				reviewQueue: [
					{
						artifactId: 'artifact_ui_review',
						taskId: 'task_ui_review',
						taskTitle: 'Review submitted operator output',
						goalId: 'goal_ui',
						goalTitle: 'Make v2 core inspectable',
						runId: 'run_ui_review',
						runStatus: 'completed',
						title: 'Reviewable operator output',
						uri: 'repo://docs/reviewable-output.md',
						status: 'submitted'
					}
				],
				recentRuns: [
					{
						runId: 'run_ui_current',
						taskId: 'task_ui_current',
						taskTitle: 'Continue dispatched work',
						goalId: 'goal_ui',
						projectId: 'project_ui',
						status: 'planned',
						modelProviderId: 'provider_codex_ui',
						modelProviderName: 'Codex UI',
						resultSummary: '',
						validationSummary: 'Provider run launched; validation is pending.',
						endedAt: null
					},
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

function taskRollupSection() {
	const section = document.querySelector('section[aria-labelledby="v2-core-task-rollup"]');
	expect(section).not.toBeNull();
	return section as HTMLElement;
}

function scopedSummarySection() {
	const section = document.querySelector('section[aria-labelledby="v2-core-scoped-summary"]');
	expect(section).not.toBeNull();
	return section as HTMLElement;
}

function hasTaskRollupLink(section: HTMLElement, taskId: string, label: string) {
	return Array.from(
		section.querySelectorAll(`a[href="/app/v2-core/tasks/${taskId}?mode=read"]`)
	).some((link) => link.textContent === label);
}

function hasScopedSummaryLink(section: HTMLElement, taskId: string, label: string) {
	return Array.from(
		section.querySelectorAll(`a[href="/app/v2-core/tasks/${taskId}?mode=read"]`)
	).some((link) => link.textContent === label);
}

describe('/app/v2-core/+page.svelte', () => {
	it('renders operator console sections from the v2 core read model', () => {
		renderPage();

		expect(document.body.textContent).toContain('Operator console');
		expect(document.body.textContent).toContain('V2 Core UI');
		expect(document.body.textContent).toContain('Make v2 core inspectable');
		expect(document.body.textContent).toContain('Work queue');
		expect(document.body.textContent).toContain('Run child goal work');
		expect(document.body.textContent).toContain('Keep empty running goal visible');
		expect(document.body.textContent).toContain('Ready');
		expect(document.body.textContent).toContain('Running');
		expect(document.body.textContent).toContain('No open work');
		expect(document.body.textContent).toContain('Create a continuation planning task');
		expect(document.body.textContent).toContain('Plan next work');
		expect(document.body.textContent).toContain('Dispatch suppressed while blocked');
		expect(document.body.textContent).toContain('Dispatch suppressed while paused');
		expect(document.body.textContent).toContain('run_ui_child_current');
		expect(document.body.textContent).toContain('Launch task');
		expect(document.body.textContent).toContain('Goal control');
		expect(document.body.textContent).toContain('Unblock v2 operator work');
		expect(document.body.textContent).toContain('Blocked waiting for operator direction.');
		expect(document.body.textContent).toContain('Paused v2 track');
		expect(document.body.textContent).toContain('Pause');
		expect(document.body.textContent).toContain('Resume');
		expect(document.body.textContent).toContain('Block');
		expect(document.body.textContent).toContain('Selected task');
		expect(document.body.textContent).toContain('Launch');
		expect(document.body.textContent).toContain('Current run');
		expect(document.body.textContent).toContain('run_ui_current');
		expect(document.body.textContent).toContain(
			'npm run v2:core-db -- agent-work-packet --task task_ui_current --json'
		);
		expect(document.body.textContent).toContain('Ready next step');
		expect(document.body.textContent).toContain('Review submitted operator output');
		expect(document.body.textContent).toContain('Reviewable operator output');
		expect(document.body.textContent).toContain('Review task');
		expect(document.body.textContent).toContain('completed');
		expect(document.body.textContent).toContain('Codex UI');
		expect(document.body.textContent).toContain('Read-only v2 core console exists');
		expect(document.body.textContent).toContain('Snapshot');
		expect(document.body.textContent).toContain('v2_core_tasks');
		expect(
			document.querySelector('a[href="/app/v2-core/tasks/task_ui_next?mode=read"]')
		).not.toBeNull();
		expect(
			document.querySelector('a[href="/app/v2-core/tasks/task_ui_current?mode=read"]')
		).not.toBeNull();
		expect(
			document.querySelector('a[href="/app/v2-core/tasks/task_ui_child_current?mode=read"]')
		).not.toBeNull();
		expect(
			document.querySelector('a[href="/app/v2-core/tasks/task_ui_done?mode=read"]')
		).not.toBeNull();
		expect(
			document.querySelector('a[href="/app/v2-core/tasks/task_ui_review?mode=read"]')
		).not.toBeNull();
		expect(
			document.querySelector('a[href="/app/v2-core?project=project_ui&goal=goal_ui"]')
		).not.toBeNull();
		expect(
			document.querySelector(
				'a[href="/app/v2-core?project=project_ui&goal=goal_ui_child_running"]'
			)
		).not.toBeNull();
		expect(document.body.textContent).not.toContain('Scoped to goal');
		expect(document.body.textContent).not.toContain('Goal summary');
		expect(document.body.textContent).not.toContain('Child goals');
		expect(document.body.textContent).not.toContain('Tasks in scope');
	});

	it('renders immediate child-goal rollup for a parent goal scope', () => {
		renderPage({ scopedGoalId: 'goal_ui' });

		const childRollup = document.querySelector('section[aria-labelledby="v2-core-child-goal-rollup"]');
		expect(childRollup).not.toBeNull();
		expect(childRollup?.textContent).toContain('Child goals');
		expect(childRollup?.textContent).toContain('Run child goal work');
		expect(childRollup?.textContent).toContain('Unblock v2 operator work');
		expect(childRollup?.textContent).toContain('Running');
		expect(childRollup?.textContent).toContain('Blocked');
		expect(childRollup?.textContent).toContain('1 open / 0 done');
		expect(childRollup?.textContent).toContain('run_ui_child_current');
		expect(document.body.textContent).toContain('Tasks in scope');
		expect(document.body.textContent).toContain('2 open / 1 review / 1 done');
		expect(document.body.textContent).toContain('Review artifact_ui_review');
		expect(document.body.textContent).toContain('Selected next work');
		const scopedSummary = scopedSummarySection();
		expect(
			scopedSummary.querySelector(
				'form[action="?/applyGoalAction"] input[name="goalId"][value="goal_ui"]'
			)
		).not.toBeNull();
		expect(
			scopedSummary.querySelector(
				'form[action="?/applyGoalAction"] input[name="actionId"][value="pause_goal"]'
			)
		).not.toBeNull();
		expect(
			scopedSummary.querySelector(
				'form[action="?/applyGoalAction"] input[name="actionId"][value="block_goal"]'
			)
		).not.toBeNull();
		expect(scopedSummary.textContent).toContain('Pause scoped goal');
		expect(scopedSummary.textContent).toContain('Block scoped goal');
		expect(
			scopedSummary.querySelector(
				'form[action="?/dispatchGoalWork"] input[name="taskId"][value="task_ui_next"]'
			)
		).not.toBeNull();
		expect(scopedSummary.textContent).toContain('Launch scoped goal work');
		const taskRollup = taskRollupSection();
		expect(
			hasTaskRollupLink(taskRollup, 'task_ui_review', 'Review scoped output')
		).toBe(true);
		expect(
			taskRollup.querySelector(
				'form[action="?/dispatchGoalWork"] input[name="goalId"][value="goal_ui"]'
			)
		).not.toBeNull();
		expect(
			taskRollup.querySelector(
				'form[action="?/dispatchGoalWork"] input[name="taskId"][value="task_ui_next"]'
			)
		).not.toBeNull();
		expect(
			Array.from(taskRollup.querySelectorAll('button')).some(
				(button) => button.textContent === 'Launch scoped task'
			)
		).toBe(true);
		expect(
			hasTaskRollupLink(taskRollup, 'task_ui_done', 'Open task detail')
		).toBe(true);
		expect(
			childRollup?.querySelector(
				'a[href="/app/v2-core?project=project_ui&goal=goal_ui_child_running"]'
			)
		).not.toBeNull();
		expect(
			childRollup?.querySelector(
				'a[href="/app/v2-core?project=project_ui&goal=goal_ui_blocked"]'
			)
		).not.toBeNull();
		expect(
			childRollup?.querySelector('a[href="/app/v2-core/tasks/task_ui_child_current?mode=read"]')
		).not.toBeNull();
	});

	it('renders scoped goal state and project-scope return link', () => {
		renderPage({ scopedGoalId: 'goal_ui_child_running' });

		expect(document.body.textContent).toContain('Scoped to goal');
		expect(document.body.textContent).toContain('goal_ui_child_running');
		expect(document.body.textContent).toContain('Goal summary');
		expect(document.body.textContent).toContain('Run child goal work');
		expect(document.body.textContent).toContain('1 open / 0 done');
		expect(document.body.textContent).toContain('run_ui_child_current');
		expect(document.body.textContent).toContain('None selected');
		expect(document.body.textContent).toContain('None recent');
		expect(document.body.textContent).toContain('Read-only v2 core console exists');
		expect(document.body.textContent).toContain('Tasks in scope');
		expect(document.body.textContent).toContain('1 open / 0 review / 0 done');
		expect(document.body.textContent).toContain('Current child goal run');
		expect(document.body.textContent).toContain('run_ui_child_current');
		const scopedSummary = scopedSummarySection();
		expect(scopedSummary.textContent).toContain('Pause scoped goal');
		expect(scopedSummary.textContent).toContain('Block scoped goal');
		expect(scopedSummary.textContent).toContain('Open scoped current-run task');
		expect(
			hasScopedSummaryLink(scopedSummary, 'task_ui_child_current', 'Open scoped current-run task')
		).toBe(true);
		const taskRollup = taskRollupSection();
		expect(taskRollup.textContent).toContain('Current run');
		expect(taskRollup.textContent).toContain('planned · Codex UI');
		expect(
			hasTaskRollupLink(taskRollup, 'task_ui_child_current', 'Open current-run task')
		).toBe(true);
		expect(
			document.querySelector('a[href="/app/v2-core?project=project_ui"]')
		).not.toBeNull();
		expect(
			document.querySelector('a[href="/app/v2-core/tasks/task_ui_child_current?mode=read"]')
		).not.toBeNull();
		expect(
			document.querySelector(
				'a[href="/app/v2-core?project=project_ui&goal=goal_ui_child_running"]'
			)
		).not.toBeNull();
		expect(document.querySelector('section[aria-labelledby="v2-core-child-goal-rollup"]')).toBeNull();
	});

	it('renders blocked and paused scoped goal summaries without current work', () => {
		renderPage({ scopedGoalId: 'goal_ui_blocked' });

		expect(document.body.textContent).toContain('Goal summary');
		expect(document.body.textContent).toContain('Unblock v2 operator work');
		expect(document.body.textContent).toContain('blocked');
		expect(document.body.textContent).toContain('Blocked');
		expect(document.body.textContent).toContain('None');
		expect(document.body.textContent).toContain('None selected');
		let scopedSummary = scopedSummarySection();
		expect(scopedSummary.textContent).toContain('Resume scoped goal');
		expect(scopedSummary.textContent).toContain('Pause scoped goal');
		expect(scopedSummary.textContent).not.toContain('Launch scoped goal work');
		expect(scopedSummary.textContent).not.toContain('Plan scoped next work');

		document.body.innerHTML = '';
		renderPage({ scopedGoalId: 'goal_ui_paused' });

		expect(document.body.textContent).toContain('Goal summary');
		expect(document.body.textContent).toContain('Paused v2 track');
		expect(document.body.textContent).toContain('paused');
		expect(document.body.textContent).toContain('Paused');
		expect(document.body.textContent).toContain('None');
		expect(document.body.textContent).toContain('None selected');
		scopedSummary = scopedSummarySection();
		expect(scopedSummary.textContent).toContain('Resume scoped goal');
		expect(scopedSummary.textContent).toContain('Block scoped goal');
		expect(scopedSummary.textContent).not.toContain('Launch scoped goal work');
		expect(scopedSummary.textContent).not.toContain('Plan scoped next work');
	});

	it('renders empty scoped task rollup state', () => {
		renderPage({ scopedGoalId: 'goal_ui_empty' });

		const scopedSummary = scopedSummarySection();
		expect(scopedSummary.textContent).toContain('Pause scoped goal');
		expect(scopedSummary.textContent).toContain('Block scoped goal');
		expect(
			scopedSummary.querySelector(
				'form[action="?/createGoalContinuationTask"] input[name="goalId"][value="goal_ui_empty"]'
			)
		).not.toBeNull();
		expect(scopedSummary.textContent).toContain('Plan scoped next work');
		expect(document.body.textContent).toContain('Tasks in scope');
		expect(document.body.textContent).toContain('0 open / 0 review / 0 done');
		expect(document.body.textContent).toContain('No tasks for selected goal');
		const taskRollup = taskRollupSection();
		expect(taskRollup.querySelector('button')).toBeNull();
		expect(taskRollup.querySelector('a')).toBeNull();
	});

	it('keeps the read-only operator console usable in a phone viewport', async () => {
		await page.viewport(390, 844);
		renderPage({ scopedGoalId: 'goal_ui' });

		await expect
			.element(page.getByRole('heading', { name: 'Operator console' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Make v2 core inspectable' }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('heading', { name: 'Child goals' })).toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Tasks in scope' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'Show project scope' }))
			.toBeInTheDocument();
		const scopedSummary = scopedSummarySection();
		expect(scopedSummary.textContent).toContain('Launch scoped goal work');
		expect(scopedSummary.textContent).toContain('Pause scoped goal');
		expect(scopedSummary.textContent).toContain('Block scoped goal');
		await expect.element(page.getByRole('heading', { name: 'Work queue' })).toBeInTheDocument();
		expect(document.body.textContent).toContain('Run child goal work');
		expect(document.body.textContent).toContain('Unblock v2 operator work');
		await expect
			.element(page.getByRole('button', { name: 'Launch', exact: true }))
			.toBeInTheDocument();
		const taskRollup = taskRollupSection();
		expect(
			Array.from(taskRollup.querySelectorAll('button')).some(
				(button) => button.textContent === 'Launch scoped task'
			)
		).toBe(true);
		expect(
			hasTaskRollupLink(taskRollup, 'task_ui_review', 'Review scoped output')
		).toBe(true);
		expect(
			hasTaskRollupLink(taskRollup, 'task_ui_done', 'Open task detail')
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('button')).filter(
				(button) => button.textContent === 'Launch task'
			)
		).toHaveLength(1);
		expect(
			Array.from(document.querySelectorAll('button')).filter(
				(button) => button.textContent === 'Launch scoped goal work'
			)
		).toHaveLength(1);
		expect(
			Array.from(document.querySelectorAll('a')).filter((link) => link.textContent === 'Review task')
		).toHaveLength(1);
		await expect.element(page.getByRole('button', { name: 'Plan next work' })).toBeInTheDocument();
		await expect.element(page.getByText('run_ui_current')).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'run_ui_child_current' }))
			.toBeInTheDocument();
		expect(
			document.querySelector('a[href="/app/v2-core/tasks/task_ui_next?mode=read"]')
		).not.toBeNull();
		expect(
			document.querySelector(
				'a[href="/app/v2-core?project=project_ui&goal=goal_ui_child_running"]'
			)
		).not.toBeNull();
		expect(document.body.textContent).toContain('Read-only v2 core console exists');
		await expect.element(page.getByRole('heading', { name: 'Snapshot' })).toBeInTheDocument();
		expectNoHorizontalOverflow();
	});

	it('keeps current-run goal scope usable in a phone viewport', async () => {
		await page.viewport(390, 844);
		renderPage({ scopedGoalId: 'goal_ui_child_running' });

		await expect
			.element(page.getByRole('heading', { name: 'Run child goal work' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'Show project scope' }))
			.toBeInTheDocument();
		const scopedSummary = scopedSummarySection();
		expect(scopedSummary.textContent).toContain('Open scoped current-run task');
		const taskRollup = taskRollupSection();
		expect(taskRollup.textContent).toContain('Current run');
		expect(
			hasTaskRollupLink(taskRollup, 'task_ui_child_current', 'Open current-run task')
		).toBe(true);
		expectNoHorizontalOverflow();
	});
});
