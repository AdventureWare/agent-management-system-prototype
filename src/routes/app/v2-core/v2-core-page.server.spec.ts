import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openV2CoreDb } from '$lib/server/v2-core-persistence';
import {
	attachV2CoreArtifact,
	createV2CoreFollowupTask,
	createV2CoreGoal,
	createV2CoreProject,
	createV2CoreTask,
	promoteV2CoreMemory,
	recordV2CoreDecision,
	recordV2CoreReview,
	recordV2CoreRun,
	recordV2CoreToolExecution,
	registerV2CoreModelProvider,
	registerV2CoreTool,
	transitionV2CoreGoalStatus,
	transitionV2CoreTaskStatus
} from '$lib/server/v2-core-service';
import { _getV2CoreUiDbFile, actions, load } from './+page.server';

const tempDirs: string[] = [];
const originalV2CoreDbFile = process.env.AMS_V2_CORE_DB_FILE;

type V2CorePageData = Exclude<Awaited<ReturnType<typeof load>>, void>;

function createTempDbFile(name = 'v2-core-ui.sqlite') {
	const dir = mkdtempSync(join(tmpdir(), 'ams-v2-core-ui-'));
	tempDirs.push(dir);
	return join(dir, name);
}

function setCoreDbFile(dbFile: string) {
	process.env.AMS_V2_CORE_DB_FILE = dbFile;
}

async function loadCorePage(url: string) {
	return (await load({
		url: new URL(url)
	} as never)) as V2CorePageData;
}

async function applyGoalAction(
	goalId: string,
	actionId: string,
	summary = '',
	url = 'http://localhost/app/v2-core?project=project_ui'
) {
	const form = new FormData();
	form.set('goalId', goalId);
	form.set('actionId', actionId);
	if (summary) {
		form.set('summary', summary);
	}

	try {
		return await actions.applyGoalAction({
			request: new Request(url, {
				method: 'POST',
				body: form
			}),
			url: new URL(url)
		} as never);
	} catch (caught) {
		return caught;
	}
}

async function dispatchGoalWork(
	goalId: string,
	taskId: string,
	url = 'http://localhost/app/v2-core?project=project_ui'
) {
	const form = new FormData();
	form.set('goalId', goalId);
	form.set('taskId', taskId);

	try {
		return await actions.dispatchGoalWork({
			request: new Request(url, {
				method: 'POST',
				body: form
			}),
			url: new URL(url)
		} as never);
	} catch (caught) {
		return caught;
	}
}

async function createGoalContinuationTask(
	goalId: string,
	url = 'http://localhost/app/v2-core?project=project_ui'
) {
	const form = new FormData();
	form.set('goalId', goalId);

	try {
		return await actions.createGoalContinuationTask({
			request: new Request(url, {
				method: 'POST',
				body: form
			}),
			url: new URL(url)
		} as never);
	} catch (caught) {
		return caught;
	}
}

function readGoalStatus(dbFile: string, goalId: string) {
	const db = openV2CoreDb({ dbFile });

	try {
		return db
			.prepare<[string], { status: string }>('select status from v2_core_goals where id = ?')
			.get(goalId)?.status;
	} finally {
		db.close();
	}
}

function readGoalTransitionDecisions(dbFile: string, goalId: string) {
	const db = openV2CoreDb({ dbFile });

	try {
		return db
			.prepare<
				[string],
				{ decision_type: string; summary: string; rationale: string }
			>(
				`
					select decision_type, summary, rationale
					from v2_core_decisions
					where goal_id = ?
						and decision_type = 'goal_status_transition'
					order by decided_at desc, id desc
				`
			)
			.all(goalId);
	} finally {
		db.close();
	}
}

function readTasksForGoal(dbFile: string, goalId: string) {
	const db = openV2CoreDb({ dbFile });

	try {
		return db
			.prepare<
				[string],
				{ id: string; title: string; status: string; success_criteria: string }
			>(
				`
					select id, title, status, success_criteria
					from v2_core_tasks
					where goal_id = ?
					order by id
				`
			)
			.all(goalId);
	} finally {
		db.close();
	}
}

function readTaskStatus(dbFile: string, taskId: string) {
	const db = openV2CoreDb({ dbFile });

	try {
		return db
			.prepare<[string], { status: string }>('select status from v2_core_tasks where id = ?')
			.get(taskId)?.status;
	} finally {
		db.close();
	}
}

function readTaskRuns(dbFile: string, taskId: string) {
	const db = openV2CoreDb({ dbFile });

	try {
		return db
			.prepare<
				[string],
				{ id: string; status: string; model_provider_id: string | null; action_summary: string }
			>(
				`
					select id, status, model_provider_id, action_summary
					from v2_core_runs
					where task_id = ?
					order by started_at desc, id desc
				`
			)
			.all(taskId);
	} finally {
		db.close();
	}
}

function seedCoreDb(dbFile: string) {
	const db = openV2CoreDb({ dbFile });

	try {
		createV2CoreProject(db, {
			id: 'project_ui',
			name: 'V2 Core UI',
			summary: 'Operator console test project.',
			workspaceRoot: '/tmp/ams-v2-core-ui'
		});
		createV2CoreGoal(db, {
			id: 'goal_ui',
			projectId: 'project_ui',
			title: 'Make v2 core inspectable',
			summary: 'Expose governed state through a small read model.',
			successCriteria: 'Operator can inspect next work and evidence.'
		});
		createV2CoreGoal(db, {
			id: 'goal_ui_blocked',
			projectId: 'project_ui',
			parentGoalId: 'goal_ui',
			title: 'Unblock v2 operator work',
			summary: 'Blocked child goal for read-model coverage.',
			successCriteria: 'Operator can see why the goal is blocked.'
		});
		transitionV2CoreGoalStatus(db, {
			goalId: 'goal_ui_blocked',
			status: 'blocked',
			summary: 'Blocked waiting for operator direction.'
		});
		createV2CoreGoal(db, {
			id: 'goal_ui_paused',
			projectId: 'project_ui',
			title: 'Paused v2 track',
			summary: 'Paused goal for read-model coverage.',
			successCriteria: 'Operator can see paused work separately.'
		});
		transitionV2CoreGoalStatus(db, {
			goalId: 'goal_ui_paused',
			status: 'paused',
			summary: 'Paused while the running goal is prioritized.'
		});
		createV2CoreGoal(db, {
			id: 'goal_ui_child_running',
			projectId: 'project_ui',
			parentGoalId: 'goal_ui',
			title: 'Run child goal work',
			summary: 'Active child goal with current provider work.',
			successCriteria: 'Operator can see current child-goal work.'
		});
		createV2CoreGoal(db, {
			id: 'goal_ui_empty',
			projectId: 'project_ui',
			title: 'Keep empty running goal visible',
			summary: 'Active goal with no open tasks.',
			successCriteria: 'Operator can see there is no open work.'
		});
		createV2CoreTask(db, {
			id: 'task_ui_done',
			goalId: 'goal_ui',
			title: 'Ship read-only console',
			summary: 'Create the page and tests.',
			successCriteria: 'The route renders the operator console.',
			validationPlan: 'Run page and server tests.'
		});
		registerV2CoreModelProvider(db, {
			id: 'provider_codex_ui',
			name: 'Codex UI',
			kind: 'external_ai'
		});
		registerV2CoreTool(db, {
			id: 'tool_vitest_ui',
			name: 'Vitest',
			kind: 'local_cli',
			riskLevel: 'low',
			approvalRequirement: 'none'
		});
		transitionV2CoreTaskStatus(db, {
			taskId: 'task_ui_done',
			status: 'in_progress',
			summary: 'Started read-only console task.'
		});
		recordV2CoreRun(db, {
			id: 'run_ui_done',
			taskId: 'task_ui_done',
			modelProviderId: 'provider_codex_ui',
			status: 'completed',
			inputSummary: 'Build a read-only console.',
			actionSummary: 'Implemented server route, page, and tests.',
			resultSummary: 'Read-only console route is available.',
			validationSummary: 'Focused tests passed.'
		});
		recordV2CoreToolExecution(db, {
			id: 'tool_execution_ui',
			toolId: 'tool_vitest_ui',
			taskId: 'task_ui_done',
			runId: 'run_ui_done',
			inputSummary: 'Run focused v2 core UI tests.',
			resultSummary: 'Tests passed.'
		});
		attachV2CoreArtifact(db, {
			id: 'artifact_ui_page',
			taskId: 'task_ui_done',
			runId: 'run_ui_done',
			uri: 'repo://src/routes/app/v2-core/+page.svelte',
			role: 'deliverable',
			title: 'V2 core operator console page',
			summary: 'Read-only operator console UI.',
			status: 'submitted'
		});
		createV2CoreTask(db, {
			id: 'task_ui_review',
			goalId: 'goal_ui',
			title: 'Review submitted operator output',
			summary: 'Submitted artifact needs operator review.',
			successCriteria: 'Review queue links back to this task.',
			validationPlan: 'Load operator console review queue.'
		});
		transitionV2CoreTaskStatus(db, {
			taskId: 'task_ui_review',
			status: 'in_progress',
			summary: 'Started review queue fixture task.'
		});
		recordV2CoreRun(db, {
			id: 'run_ui_review',
			taskId: 'task_ui_review',
			modelProviderId: 'provider_codex_ui',
			status: 'completed',
			inputSummary: 'Produce a reviewable artifact.',
			actionSummary: 'Generated submitted operator output.',
			resultSummary: 'Reviewable output is ready.',
			validationSummary: 'Fixture validation passed.'
		});
		attachV2CoreArtifact(db, {
			id: 'artifact_ui_review',
			taskId: 'task_ui_review',
			runId: 'run_ui_review',
			uri: 'repo://docs/reviewable-output.md',
			role: 'deliverable',
			title: 'Reviewable operator output',
			summary: 'Artifact awaiting operator review.',
			status: 'submitted'
		});
		transitionV2CoreTaskStatus(db, {
			taskId: 'task_ui_review',
			status: 'review',
			runId: 'run_ui_review',
			summary: 'Reviewable operator output is submitted.'
		});
		createV2CoreTask(db, {
			id: 'task_ui_child_current',
			goalId: 'goal_ui_child_running',
			title: 'Current child goal run',
			summary: 'Current child-goal provider work.',
			successCriteria: 'Provider run is visible on the child goal.',
			validationPlan: 'Load operator console queue.'
		});
		transitionV2CoreTaskStatus(db, {
			taskId: 'task_ui_child_current',
			status: 'in_progress',
			summary: 'Started child goal provider work.'
		});
		recordV2CoreRun(db, {
			id: 'run_ui_child_current',
			taskId: 'task_ui_child_current',
			modelProviderId: 'provider_codex_ui',
			status: 'planned',
			inputSummary: 'Continue child goal work.',
			actionSummary: 'Provider is working on the child goal.'
		});
		transitionV2CoreTaskStatus(db, {
			taskId: 'task_ui_done',
			status: 'review',
			runId: 'run_ui_done',
			summary: 'Console page is ready for review.'
		});
		recordV2CoreReview(db, {
			id: 'review_ui_done',
			taskId: 'task_ui_done',
			runId: 'run_ui_done',
			artifactId: 'artifact_ui_page',
			status: 'approved',
			summary: 'Console page meets the read-only slice.'
		});
		recordV2CoreDecision(db, {
			id: 'decision_ui_accept',
			projectId: 'project_ui',
			goalId: 'goal_ui',
			taskId: 'task_ui_done',
			runId: 'run_ui_done',
			reviewId: 'review_ui_done',
			decisionType: 'accept_task_output',
			summary: 'Accept read-only console output.',
			rationale: 'It exposes existing v2 core read-model state without schema changes.'
		});
		transitionV2CoreTaskStatus(db, {
			taskId: 'task_ui_done',
			status: 'done',
			runId: 'run_ui_done',
			summary: 'Read-only console task accepted.'
		});
		promoteV2CoreMemory(db, {
			id: 'memory_ui',
			projectId: 'project_ui',
			title: 'Read-only v2 core console exists',
			body: 'The operator console can inspect v2 core status from the governed read model.',
			scope: 'project',
			status: 'trusted',
			sources: [
				{
					sourceTable: 'v2_core_reviews',
					sourceId: 'review_ui_done',
					reason: 'Approved review for the console artifact.'
				}
			]
		});
		createV2CoreFollowupTask(db, {
			id: 'task_ui_next',
			sourceTaskId: 'task_ui_done',
			title: 'Ready next step',
			summary: 'Add the next useful v2 core surface.',
			successCriteria: 'A follow-up slice is selected from durable state.',
			validationPlan: 'Load next-work query.',
			reason: 'The console needs a next actionable item to display.'
		});
	} finally {
		db.close();
	}
}

describe('/app/v2-core page server', () => {
	beforeEach(() => {
		process.env.AMS_V2_CORE_DB_FILE = originalV2CoreDbFile;
	});

	afterEach(() => {
		process.env.AMS_V2_CORE_DB_FILE = originalV2CoreDbFile;

		while (tempDirs.length > 0) {
			const path = tempDirs.pop();

			if (path) {
				rmSync(path, { recursive: true, force: true });
			}
		}
	});

	it('reports an unavailable state when the configured v2 core DB is absent', async () => {
		const dbFile = createTempDbFile('missing.sqlite');
		setCoreDbFile(dbFile);

		const result = await loadCorePage('http://localhost/app/v2-core');

		expect(_getV2CoreUiDbFile()).toBe(dbFile);
		expect(result).toEqual(
			expect.objectContaining({
				status: 'unavailable',
				dbFile,
				scope: {
					projectId: null,
					goalId: null
				},
				operatorConsole: null
			})
		);
		expect(result.error).toContain('V2 core database does not exist');
	});

	it('loads the operator console read model from a seeded v2 core DB', async () => {
		const dbFile = createTempDbFile();
		seedCoreDb(dbFile);
		setCoreDbFile(dbFile);

		const result = await loadCorePage('http://localhost/app/v2-core?project=project_ui');

		expect(result.status).toBe('ready');
		expect(result.dbFile).toBe(dbFile);
		expect(result.scope.projectId).toBe('project_ui');
		expect(result.operatorConsole?.activeGoals).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					goalId: 'goal_ui',
					title: 'Make v2 core inspectable'
				})
			])
		);
		expect(result.operatorConsole?.goalStatusGroups.running).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					goalId: 'goal_ui'
				}),
				expect.objectContaining({
					goalId: 'goal_ui_child_running',
					parentGoalId: 'goal_ui'
				})
			])
		);
		expect(result.operatorConsole?.workQueue).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					goalId: 'goal_ui',
					queueState: 'ready_to_dispatch',
					selectedTask: expect.objectContaining({
						taskId: 'task_ui_next'
					}),
					currentRun: null
				}),
				expect.objectContaining({
					goalId: 'goal_ui_child_running',
					parentGoalId: 'goal_ui',
					queueState: 'running',
					currentRun: expect.objectContaining({
						runId: 'run_ui_child_current',
						taskId: 'task_ui_child_current',
						modelProviderName: 'Codex UI'
					}),
					selectedTask: null
				}),
				expect.objectContaining({
					goalId: 'goal_ui_empty',
					queueState: 'no_open_work',
					currentRun: null,
					selectedTask: null
				}),
				expect.objectContaining({
					goalId: 'goal_ui_blocked',
					queueState: 'blocked',
					currentRun: null,
					selectedTask: null
				}),
				expect.objectContaining({
					goalId: 'goal_ui_paused',
					queueState: 'paused',
					currentRun: null,
					selectedTask: null
				})
			])
		);
		expect(result.operatorConsole?.goalStatusGroups.blocked[0]).toMatchObject({
			goalId: 'goal_ui_blocked',
			parentGoalId: 'goal_ui',
			latestGoalStatusTransition: expect.objectContaining({
				summary: 'Blocked waiting for operator direction.',
				rationale: 'Transitioned goal from active to blocked.'
			})
		});
		expect(result.operatorConsole?.goalStatusGroups.paused[0]).toMatchObject({
			goalId: 'goal_ui_paused',
			parentGoalId: null,
			latestGoalStatusTransition: expect.objectContaining({
				summary: 'Paused while the running goal is prioritized.',
				rationale: 'Transitioned goal from active to paused.'
			})
		});
		expect(result.operatorConsole?.nextWork.candidates).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					taskId: 'task_ui_next'
				})
			])
		);
		expect(result.operatorConsole?.reviewQueue).toEqual([
			expect.objectContaining({
				artifactId: 'artifact_ui_review',
				taskId: 'task_ui_review',
				taskTitle: 'Review submitted operator output',
				goalId: 'goal_ui',
				goalTitle: 'Make v2 core inspectable',
				runId: 'run_ui_review',
				runStatus: 'completed',
				title: 'Reviewable operator output',
				status: 'submitted'
			})
		]);
		expect(result.operatorConsole?.recentRuns[0]?.modelProviderName).toBe('Codex UI');
		expect(result.operatorConsole?.memory?.items[0]?.title).toBe(
			'Read-only v2 core console exists'
		);
		expect(result.operatorConsole?.scopedGoalSummary).toBeNull();
		expect(result.operatorConsole?.scopedChildGoalRollup).toEqual([]);
		expect(result.operatorConsole?.dependencyReport.summary.providerRunCount).toBe(3);
		expect(result.operatorConsole?.dependencyReport.summary.toolExecutionCount).toBe(1);
		expect(result.operatorConsole?.snapshotStatus.tableCounts.v2_core_tasks).toBe(4);
	});

	it('loads immediate child-goal rollup for a parent goal scope', async () => {
		const dbFile = createTempDbFile();
		seedCoreDb(dbFile);
		setCoreDbFile(dbFile);

		const result = await loadCorePage('http://localhost/app/v2-core?project=project_ui&goal=goal_ui');

		expect(result.status).toBe('ready');
		expect(result.operatorConsole?.scopedGoalSummary).toMatchObject({
			goal: expect.objectContaining({
				goalId: 'goal_ui',
				title: 'Make v2 core inspectable'
			}),
			queueState: 'ready_to_dispatch',
			selectedTask: expect.objectContaining({
				taskId: 'task_ui_next'
			})
		});
		expect(result.operatorConsole?.scopedChildGoalRollup).toEqual([
			expect.objectContaining({
				goalId: 'goal_ui_child_running',
				parentGoalId: 'goal_ui',
				queueState: 'running',
				openTaskCount: 1,
				doneTaskCount: 0,
				currentRun: expect.objectContaining({
					runId: 'run_ui_child_current',
					taskId: 'task_ui_child_current'
				}),
				selectedTask: null
			}),
			expect.objectContaining({
				goalId: 'goal_ui_blocked',
				parentGoalId: 'goal_ui',
				queueState: 'blocked',
				currentRun: null,
				selectedTask: null
			})
		]);
	});

	it('loads a goal-scoped operator console read model', async () => {
		const dbFile = createTempDbFile();
		seedCoreDb(dbFile);
		setCoreDbFile(dbFile);

		const result = await loadCorePage(
			'http://localhost/app/v2-core?project=project_ui&goal=goal_ui_child_running'
		);

		expect(result.status).toBe('ready');
		expect(result.scope).toEqual({
			projectId: 'project_ui',
			goalId: 'goal_ui_child_running'
		});
		expect(result.operatorConsole?.scope).toEqual({
			projectId: 'project_ui',
			goalId: 'goal_ui_child_running'
		});
		expect(result.operatorConsole?.scopedGoalSummary).toMatchObject({
			goal: expect.objectContaining({
				goalId: 'goal_ui_child_running',
				title: 'Run child goal work',
				parentGoalId: 'goal_ui',
				openTaskCount: 1,
				doneTaskCount: 0
			}),
			queueState: 'running',
			currentRun: expect.objectContaining({
				runId: 'run_ui_child_current',
				taskId: 'task_ui_child_current'
			}),
			selectedTask: null,
			trustedMemory: expect.objectContaining({
				id: 'memory_ui',
				status: 'trusted'
			})
		});
		expect(result.operatorConsole?.workQueue).toEqual([
			expect.objectContaining({
				goalId: 'goal_ui_child_running',
				parentGoalId: 'goal_ui',
				queueState: 'running',
				currentRun: expect.objectContaining({
					runId: 'run_ui_child_current',
					taskId: 'task_ui_child_current'
				})
			})
		]);
		expect(result.operatorConsole?.goalStatusGroups.running).toEqual([
			expect.objectContaining({
				goalId: 'goal_ui_child_running'
			})
		]);
		expect(result.operatorConsole?.goalStatusGroups.blocked).toEqual([]);
		expect(result.operatorConsole?.goalStatusGroups.paused).toEqual([]);
		expect(result.operatorConsole?.nextWork.candidates).toEqual([]);
		expect(result.operatorConsole?.reviewQueue).toEqual([]);
		expect(result.operatorConsole?.recentRuns).toEqual([
			expect.objectContaining({
				runId: 'run_ui_child_current',
				taskId: 'task_ui_child_current',
				goalId: 'goal_ui_child_running'
			})
		]);
		expect(result.operatorConsole?.recentArtifacts).toEqual([]);
		expect(result.operatorConsole?.scopedChildGoalRollup).toEqual([]);
	});

	it('loads a scoped summary for blocked and paused goals without runnable work', async () => {
		const dbFile = createTempDbFile();
		seedCoreDb(dbFile);
		setCoreDbFile(dbFile);

		const blocked = await loadCorePage(
			'http://localhost/app/v2-core?project=project_ui&goal=goal_ui_blocked'
		);
		const paused = await loadCorePage(
			'http://localhost/app/v2-core?project=project_ui&goal=goal_ui_paused'
		);

		expect(blocked.operatorConsole?.scopedGoalSummary).toMatchObject({
			goal: expect.objectContaining({
				goalId: 'goal_ui_blocked',
				status: 'blocked',
				parentGoalId: 'goal_ui'
			}),
			queueState: 'blocked',
			currentRun: null,
			selectedTask: null
		});
		expect(paused.operatorConsole?.scopedGoalSummary).toMatchObject({
			goal: expect.objectContaining({
				goalId: 'goal_ui_paused',
				status: 'paused',
				parentGoalId: null
			}),
			queueState: 'paused',
			currentRun: null,
			selectedTask: null
		});
	});

	it('applies bounded goal control actions through existing goal transitions', async () => {
		const dbFile = createTempDbFile();
		seedCoreDb(dbFile);
		setCoreDbFile(dbFile);

		const pauseResult = await applyGoalAction(
			'goal_ui',
			'pause_goal',
			'Pause while blocked child work is clarified.'
		);
		expect(pauseResult).toMatchObject({
			status: 303,
			location: '/app/v2-core?project=project_ui'
		});
		expect(readGoalStatus(dbFile, 'goal_ui')).toBe('paused');
		expect(readGoalTransitionDecisions(dbFile, 'goal_ui')[0]).toMatchObject({
			decision_type: 'goal_status_transition',
			summary: 'Pause while blocked child work is clarified.',
			rationale: 'Transitioned goal from active to paused.'
		});

		const resumeResult = await applyGoalAction(
			'goal_ui_paused',
			'resume_goal',
			'Resume paused track from the operator console.'
		);
		expect(resumeResult).toMatchObject({
			status: 303,
			location: '/app/v2-core?project=project_ui'
		});
		expect(readGoalStatus(dbFile, 'goal_ui_paused')).toBe('active');
		expect(readGoalTransitionDecisions(dbFile, 'goal_ui_paused')[0]).toMatchObject({
			summary: 'Resume paused track from the operator console.',
			rationale: 'Transitioned goal from paused to active.'
		});
	});

	it('rejects unsupported and no-op goal control actions', async () => {
		const dbFile = createTempDbFile();
		seedCoreDb(dbFile);
		setCoreDbFile(dbFile);

		const unsupported = await applyGoalAction('goal_ui', 'complete_goal');
		expect(unsupported).toMatchObject({
			status: 400,
			data: {
				action: 'applyGoalAction',
				message: 'Unsupported v2 core goal action.'
			}
		});

		const noOp = await applyGoalAction('goal_ui_paused', 'pause_goal');
		expect(noOp).toMatchObject({
			status: 400,
			data: {
				action: 'applyGoalAction',
				message: 'Goal goal_ui_paused is already paused.'
			}
		});
		expect(readGoalStatus(dbFile, 'goal_ui_paused')).toBe('paused');
	});

	it('dispatches selected next work for a running goal through provider-run launch', async () => {
		const dbFile = createTempDbFile();
		seedCoreDb(dbFile);
		setCoreDbFile(dbFile);

		const result = await dispatchGoalWork('goal_ui', 'task_ui_next');

		expect(result).toMatchObject({
			status: 303,
			location: '/app/v2-core?project=project_ui'
		});
		expect(readTaskStatus(dbFile, 'task_ui_next')).toBe('in_progress');
		expect(readTaskRuns(dbFile, 'task_ui_next')[0]).toMatchObject({
			status: 'planned',
			model_provider_id: 'provider_codex_ui',
			action_summary:
				'Launch selected next-work task through the existing provider-run path; execution result, artifacts, review, and acceptance remain explicit follow-up actions.'
		});

		const reloaded = await loadCorePage('http://localhost/app/v2-core?project=project_ui');
		expect(
			reloaded.operatorConsole?.recentRuns.find(
				(run: { taskId: string }) => run.taskId === 'task_ui_next'
			)
		).toMatchObject({
			taskId: 'task_ui_next',
			status: 'planned',
			endedAt: null
		});
	});

	it('rejects dispatch for paused, blocked, missing, and already-dispatched work', async () => {
		const dbFile = createTempDbFile();
		seedCoreDb(dbFile);
		setCoreDbFile(dbFile);

		const paused = await dispatchGoalWork('goal_ui_paused', 'task_ui_next');
		expect(paused).toMatchObject({
			status: 400,
			data: {
				action: 'dispatchGoalWork',
				message: 'Goal goal_ui_paused is paused; only running goals can dispatch work.'
			}
		});

		const blocked = await dispatchGoalWork('goal_ui_blocked', 'task_ui_next');
		expect(blocked).toMatchObject({
			status: 400,
			data: {
				action: 'dispatchGoalWork',
				message: 'Goal goal_ui_blocked is blocked; only running goals can dispatch work.'
			}
		});

		const missingNextWork = await dispatchGoalWork('goal_ui', 'task_not_next');
		expect(missingNextWork).toMatchObject({
			status: 400,
			data: {
				action: 'dispatchGoalWork',
				message: 'Task task_not_next is not dispatchable next work for goal goal_ui.'
			}
		});

		await dispatchGoalWork('goal_ui', 'task_ui_next');
		const alreadyInProgress = await dispatchGoalWork('goal_ui', 'task_ui_next');
		expect(alreadyInProgress).toMatchObject({
			status: 400,
			data: {
				action: 'dispatchGoalWork',
				message: 'Task task_ui_next is not dispatchable next work for goal goal_ui.'
			}
		});
		expect(readTaskRuns(dbFile, 'task_ui_next')).toHaveLength(1);
	});

	it('creates a continuation-planning task for an idle running goal', async () => {
		const dbFile = createTempDbFile();
		seedCoreDb(dbFile);
		setCoreDbFile(dbFile);

		const result = await createGoalContinuationTask('goal_ui_empty');

		expect(result).toMatchObject({
			status: 303,
			location: '/app/v2-core?project=project_ui'
		});
		const tasks = readTasksForGoal(dbFile, 'goal_ui_empty');
		expect(tasks).toHaveLength(1);
		expect(tasks[0]).toMatchObject({
			title: 'Plan next work for Keep empty running goal visible',
			status: 'ready',
			success_criteria:
				'Define the next concrete executable task or mark the goal blocked, paused, or complete with evidence.'
		});

		const reloaded = await loadCorePage('http://localhost/app/v2-core?project=project_ui');
		expect(
			reloaded.operatorConsole?.workQueue.find(
				(item: { goalId: string }) => item.goalId === 'goal_ui_empty'
			)
		).toMatchObject({
			queueState: 'ready_to_dispatch',
			selectedTask: expect.objectContaining({
				title: 'Plan next work for Keep empty running goal visible'
			})
		});
	});

	it('rejects continuation planning unless the goal is active and idle', async () => {
		const dbFile = createTempDbFile();
		seedCoreDb(dbFile);
		setCoreDbFile(dbFile);

		const blocked = await createGoalContinuationTask('goal_ui_blocked');
		expect(blocked).toMatchObject({
			status: 400,
			data: {
				action: 'createGoalContinuationTask',
				message:
					'Goal goal_ui_blocked is blocked; only running idle goals can create continuation work.'
			}
		});

		const paused = await createGoalContinuationTask('goal_ui_paused');
		expect(paused).toMatchObject({
			status: 400,
			data: {
				action: 'createGoalContinuationTask',
				message:
					'Goal goal_ui_paused is paused; only running idle goals can create continuation work.'
			}
		});

		const ready = await createGoalContinuationTask('goal_ui');
		expect(ready).toMatchObject({
			status: 400,
			data: {
				action: 'createGoalContinuationTask',
				message:
					'Goal goal_ui is not idle; continuation planning is only available when a running goal has no open work and no current run.'
			}
		});

		const running = await createGoalContinuationTask('goal_ui_child_running');
		expect(running).toMatchObject({
			status: 400,
			data: {
				action: 'createGoalContinuationTask',
				message:
					'Goal goal_ui_child_running is not idle; continuation planning is only available when a running goal has no open work and no current run.'
			}
		});

		await createGoalContinuationTask('goal_ui_empty');
		const duplicate = await createGoalContinuationTask('goal_ui_empty');
		expect(duplicate).toMatchObject({
			status: 400,
			data: {
				action: 'createGoalContinuationTask',
				message:
					'Goal goal_ui_empty is not idle; continuation planning is only available when a running goal has no open work and no current run.'
			}
		});
		expect(readTasksForGoal(dbFile, 'goal_ui_empty')).toHaveLength(1);
	});
});
