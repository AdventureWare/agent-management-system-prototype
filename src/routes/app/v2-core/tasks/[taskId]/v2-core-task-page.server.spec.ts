import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openV2CoreDb } from '$lib/server/v2-core-persistence';
import {
	attachV2CoreArtifact,
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
	transitionV2CoreTaskStatus
} from '$lib/server/v2-core-service';
import { _getV2CoreTaskUiDbFile, actions, load } from './+page.server';

const tempDirs: string[] = [];
const originalV2CoreDbFile = process.env.AMS_V2_CORE_DB_FILE;

type V2CoreTaskPageData = Exclude<Awaited<ReturnType<typeof load>>, void>;

function createTempDbFile(name = 'v2-core-task-ui.sqlite') {
	const dir = mkdtempSync(join(tmpdir(), 'ams-v2-core-task-ui-'));
	tempDirs.push(dir);
	return join(dir, name);
}

function setCoreDbFile(dbFile: string) {
	process.env.AMS_V2_CORE_DB_FILE = dbFile;
}

async function loadTaskPage(taskId: string) {
	return (await load({
		params: { taskId },
		url: new URL(`http://localhost/app/v2-core/tasks/${taskId}`)
	} as never)) as V2CoreTaskPageData;
}

async function loadReadonlyTaskPage(taskId: string) {
	return (await load({
		params: { taskId },
		url: new URL(`http://localhost/app/v2-core/tasks/${taskId}?mode=read`)
	} as never)) as V2CoreTaskPageData;
}

function createBaseTask(dbFile: string, taskId: string, status = 'ready') {
	const db = openV2CoreDb({ dbFile });

	try {
		createV2CoreProject(db, {
			id: `project_${taskId}`,
			name: `Project ${taskId}`,
			summary: 'Work-state action test project.',
			workspaceRoot: '/tmp/ams-v2-task-action-ui'
		});
		createV2CoreGoal(db, {
			id: `goal_${taskId}`,
			projectId: `project_${taskId}`,
			title: `Goal ${taskId}`,
			summary: 'Work-state action test goal.',
			successCriteria: 'Task state can change through the page action.'
		});
		createV2CoreTask(db, {
			id: taskId,
			goalId: `goal_${taskId}`,
			title: `Task ${taskId}`,
			summary: 'Task used by action tests.',
			successCriteria: 'Task status changes as expected.',
			validationPlan: 'Invoke page action.'
		});

		if (status === 'in_progress') {
			transitionV2CoreTaskStatus(db, {
				taskId,
				status: 'in_progress',
				summary: 'Seeded in-progress task.'
			});
		}
		if (status === 'blocked') {
			transitionV2CoreTaskStatus(db, {
				taskId,
				status: 'blocked',
				summary: 'Seeded blocked task.'
			});
		}
		if (status === 'review') {
			transitionV2CoreTaskStatus(db, {
				taskId,
				status: 'in_progress',
				summary: 'Seeded in-progress task before review.'
			});
			transitionV2CoreTaskStatus(db, {
				taskId,
				status: 'review',
				summary: 'Seeded review task.'
			});
		}
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

async function applyTaskAction(taskId: string, actionId: string, summary = '') {
	const form = new FormData();
	form.set('actionId', actionId);
	if (summary) {
		form.set('summary', summary);
	}

	return actions.applyTaskAction({
		params: { taskId },
		request: new Request(`http://localhost/app/v2-core/tasks/${taskId}`, {
			method: 'POST',
			body: form
		})
	} as never);
}

function createRunEvidenceForm(overrides: Record<string, string> = {}) {
	const form = new FormData();
	const values = {
		inputSummary: 'Inspect task context.',
		actionSummary: 'Implemented the requested task slice.',
		resultSummary: 'The task produced one durable artifact.',
		validationSummary: 'Focused tests passed.',
		artifactTitle: 'Task evidence artifact',
		artifactUri: 'repo://docs/task-evidence.md',
		artifactSummary: 'Evidence captured from task execution.',
		artifactRole: 'evidence',
		...overrides
	};

	for (const [key, value] of Object.entries(values)) {
		form.set(key, value);
	}

	return form;
}

async function recordRunEvidence(taskId: string, overrides: Record<string, string> = {}) {
	return actions.recordRunEvidence({
		params: { taskId },
		request: new Request(`http://localhost/app/v2-core/tasks/${taskId}`, {
			method: 'POST',
			body: createRunEvidenceForm(overrides)
		})
	} as never);
}

function readTaskRuns(dbFile: string, taskId: string) {
	const db = openV2CoreDb({ dbFile });

	try {
		return db
			.prepare<
				[string],
				{ id: string; status: string; action_summary: string; result_summary: string }
			>(
				`
					select id, status, action_summary, result_summary
					from v2_core_runs
					where task_id = ?
					order by started_at
				`
			)
			.all(taskId);
	} finally {
		db.close();
	}
}

function readTaskArtifacts(dbFile: string, taskId: string) {
	const db = openV2CoreDb({ dbFile });

	try {
		return db
			.prepare<
				[string],
				{
					id: string;
					run_id: string;
					uri: string;
					role: string;
					title: string;
					summary: string;
					status: string;
				}
			>(
				`
					select id, run_id, uri, role, title, summary, status
					from v2_core_artifacts
					where task_id = ?
					order by id
				`
			)
			.all(taskId);
	} finally {
		db.close();
	}
}

function readTaskDecisions(dbFile: string, taskId: string) {
	const db = openV2CoreDb({ dbFile });

	try {
		return db
			.prepare<
				[string],
				{
					id: string;
					decision_type: string;
					summary: string;
					rationale: string;
					review_id: string | null;
				}
			>(
				`
					select id, decision_type, summary, rationale, review_id
					from v2_core_decisions
					where task_id = ?
					order by decided_at
				`
			)
			.all(taskId);
	} finally {
		db.close();
	}
}

function seedCapturedReviewEvidence(dbFile: string, taskId: string) {
	const db = openV2CoreDb({ dbFile });

	try {
		recordV2CoreRun(db, {
			id: `run_${taskId}`,
			taskId,
			status: 'completed',
			inputSummary: 'Seeded execution context.',
			actionSummary: 'Seeded task execution.',
			resultSummary: 'Seeded output was produced.',
			validationSummary: 'Seeded validation passed.'
		});
		attachV2CoreArtifact(db, {
			id: `artifact_${taskId}`,
			taskId,
			runId: `run_${taskId}`,
			uri: `repo://artifacts/${taskId}.md`,
			role: 'output',
			title: `Artifact ${taskId}`,
			status: 'submitted'
		});
	} finally {
		db.close();
	}
}

function seedApprovedReview(dbFile: string, taskId: string) {
	const db = openV2CoreDb({ dbFile });

	try {
		recordV2CoreReview(db, {
			id: `review_${taskId}`,
			taskId,
			runId: `run_${taskId}`,
			artifactId: `artifact_${taskId}`,
			status: 'approved',
			summary: 'Seeded approved review.'
		});
	} finally {
		db.close();
	}
}

function seedTaskDb(dbFile: string) {
	const db = openV2CoreDb({ dbFile });

	try {
		createV2CoreProject(db, {
			id: 'project_task_ui',
			name: 'V2 Task UI',
			summary: 'Task detail test project.',
			workspaceRoot: '/tmp/ams-v2-task-ui'
		});
		createV2CoreGoal(db, {
			id: 'goal_task_ui',
			projectId: 'project_task_ui',
			title: 'Inspect task evidence',
			summary: 'Make task evidence visible.',
			successCriteria: 'Operator can inspect task context and evidence.'
		});
		createV2CoreTask(db, {
			id: 'task_detail_ui',
			goalId: 'goal_task_ui',
			title: 'Review task detail page',
			summary: 'Build a task detail read surface.',
			successCriteria: 'Task detail shows evidence and actions.',
			validationPlan: 'Run focused task page tests.'
		});
		registerV2CoreModelProvider(db, {
			id: 'provider_task_ui',
			name: 'Codex Task UI',
			kind: 'external_ai'
		});
		registerV2CoreTool(db, {
			id: 'tool_task_ui',
			name: 'Vitest Task UI',
			kind: 'local_cli',
			riskLevel: 'low',
			approvalRequirement: 'none'
		});
		transitionV2CoreTaskStatus(db, {
			taskId: 'task_detail_ui',
			status: 'in_progress',
			summary: 'Started task detail UI.'
		});
		recordV2CoreRun(db, {
			id: 'run_task_ui',
			taskId: 'task_detail_ui',
			modelProviderId: 'provider_task_ui',
			status: 'completed',
			inputSummary: 'Build task detail route.',
			actionSummary: 'Created read-only task detail surface.',
			resultSummary: 'Task evidence is visible.',
			validationSummary: 'Focused tests passed.'
		});
		recordV2CoreToolExecution(db, {
			id: 'tool_execution_task_ui',
			toolId: 'tool_task_ui',
			taskId: 'task_detail_ui',
			runId: 'run_task_ui',
			inputSummary: 'Run task detail tests.',
			resultSummary: 'Tests passed.'
		});
		attachV2CoreArtifact(db, {
			id: 'artifact_task_ui',
			taskId: 'task_detail_ui',
			runId: 'run_task_ui',
			uri: 'repo://src/routes/app/v2-core/tasks/[taskId]/+page.svelte',
			role: 'deliverable',
			title: 'Task detail page',
			summary: 'Read-only v2 task detail UI.',
			status: 'submitted'
		});
		transitionV2CoreTaskStatus(db, {
			taskId: 'task_detail_ui',
			status: 'review',
			runId: 'run_task_ui',
			summary: 'Task detail UI is ready for review.'
		});
		recordV2CoreReview(db, {
			id: 'review_task_ui',
			taskId: 'task_detail_ui',
			runId: 'run_task_ui',
			artifactId: 'artifact_task_ui',
			status: 'approved',
			summary: 'Task detail UI is acceptable.'
		});
		recordV2CoreDecision(db, {
			id: 'decision_task_ui',
			projectId: 'project_task_ui',
			goalId: 'goal_task_ui',
			taskId: 'task_detail_ui',
			runId: 'run_task_ui',
			reviewId: 'review_task_ui',
			decisionType: 'review_decision',
			summary: 'Keep task detail page.',
			rationale: 'It exposes existing evidence without schema change.'
		});
		promoteV2CoreMemory(db, {
			id: 'memory_task_ui',
			projectId: 'project_task_ui',
			title: 'Task detail evidence is useful',
			body: 'Task-level evidence helps operator review.',
			scope: 'project',
			status: 'trusted',
			sources: [
				{
					sourceTable: 'v2_core_reviews',
					sourceId: 'review_task_ui',
					reason: 'Approved task detail review.'
				}
			]
		});
	} finally {
		db.close();
	}
}

describe('/app/v2-core/tasks/[taskId] page server', () => {
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

	it('loads task detail, context bundle, dependency report, and permitted actions', async () => {
		const dbFile = createTempDbFile();
		seedTaskDb(dbFile);
		setCoreDbFile(dbFile);

		const result = await loadTaskPage('task_detail_ui');

		expect(_getV2CoreTaskUiDbFile()).toBe(dbFile);
		expect(result.dbFile).toBe(dbFile);
		expect(result.mode).toBe('action');
		expect(result.taskDetail.task.title).toBe('Review task detail page');
		expect(result.contextBundle?.readiness).toMatchObject({
			status: 'review',
			canStart: false
		});
		const contextSourceTypes =
			result.contextBundle?.includedSources.map(
				(source: { recordType: string }) => source.recordType
			) ?? [];
		expect(contextSourceTypes).toContain('memory');
		expect(result.dependencyReport.summary.providerRunCount).toBe(1);
		expect(result.dependencyReport.summary.toolExecutionCount).toBe(1);
		expect(result.artifactRoles).toEqual(['output', 'evidence', 'deliverable', 'context']);
		expect(result.availableActions).toContainEqual(
			expect.objectContaining({
				id: 'accept_output',
				status: 'available',
				reason: 'Approved review evidence can be accepted to close the task.'
			})
		);
	});

	it('loads read-only mode from the task detail query string', async () => {
		const dbFile = createTempDbFile();
		seedTaskDb(dbFile);
		setCoreDbFile(dbFile);

		const result = await loadReadonlyTaskPage('task_detail_ui');

		expect(result.mode).toBe('read');
		expect(result.taskDetail.task.title).toBe('Review task detail page');
		expect(result.availableActions.length).toBeGreaterThan(0);
	});

	it('marks submit for review available only after captured run and artifact evidence exists', async () => {
		const dbFile = createTempDbFile();
		createBaseTask(dbFile, 'task_no_submit_evidence', 'in_progress');
		createBaseTask(dbFile, 'task_with_submit_evidence', 'in_progress');
		seedCapturedReviewEvidence(dbFile, 'task_with_submit_evidence');
		setCoreDbFile(dbFile);

		const withoutEvidence = await loadTaskPage('task_no_submit_evidence');
		const withEvidence = await loadTaskPage('task_with_submit_evidence');

		expect(withoutEvidence.availableActions).toContainEqual(
			expect.objectContaining({
				id: 'submit_for_review',
				status: 'blocked',
				reason: 'Submit for review requires at least one run and one submitted artifact.'
			})
		);
		expect(withEvidence.availableActions).toContainEqual(
			expect.objectContaining({
				id: 'submit_for_review',
				status: 'available',
				reason: 'Captured run and submitted artifact evidence can move to review.'
			})
		);
	});

	it('starts a ready task and redirects back to the task detail page', async () => {
		const dbFile = createTempDbFile();
		createBaseTask(dbFile, 'task_ready_start');
		setCoreDbFile(dbFile);

		await expect(applyTaskAction('task_ready_start', 'start_task')).rejects.toMatchObject({
			status: 303,
			location: '/app/v2-core/tasks/task_ready_start'
		});

		expect(readTaskStatus(dbFile, 'task_ready_start')).toBe('in_progress');
	});

	it('marks ready and in-progress tasks blocked', async () => {
		const dbFile = createTempDbFile();
		createBaseTask(dbFile, 'task_ready_block');
		createBaseTask(dbFile, 'task_progress_block', 'in_progress');
		setCoreDbFile(dbFile);

		await expect(applyTaskAction('task_ready_block', 'mark_blocked')).rejects.toMatchObject({
			status: 303,
			location: '/app/v2-core/tasks/task_ready_block'
		});
		await expect(applyTaskAction('task_progress_block', 'mark_blocked')).rejects.toMatchObject({
			status: 303,
			location: '/app/v2-core/tasks/task_progress_block'
		});

		expect(readTaskStatus(dbFile, 'task_ready_block')).toBe('blocked');
		expect(readTaskStatus(dbFile, 'task_progress_block')).toBe('blocked');
	});

	it('resolves a blocked task back to ready', async () => {
		const dbFile = createTempDbFile();
		createBaseTask(dbFile, 'task_blocked_ready', 'blocked');
		setCoreDbFile(dbFile);

		await expect(applyTaskAction('task_blocked_ready', 'resolve_blocker')).rejects.toMatchObject({
			status: 303,
			location: '/app/v2-core/tasks/task_blocked_ready'
		});

		expect(readTaskStatus(dbFile, 'task_blocked_ready')).toBe('ready');
	});

	it('returns review work to in-progress for changes', async () => {
		const dbFile = createTempDbFile();
		createBaseTask(dbFile, 'task_review_changes', 'review');
		setCoreDbFile(dbFile);

		await expect(applyTaskAction('task_review_changes', 'request_changes')).rejects.toMatchObject({
			status: 303,
			location: '/app/v2-core/tasks/task_review_changes'
		});

		expect(readTaskStatus(dbFile, 'task_review_changes')).toBe('in_progress');
	});

	it('submits in-progress work with captured evidence for review', async () => {
		const dbFile = createTempDbFile();
		createBaseTask(dbFile, 'task_submit_evidence', 'in_progress');
		seedCapturedReviewEvidence(dbFile, 'task_submit_evidence');
		setCoreDbFile(dbFile);

		await expect(
			applyTaskAction('task_submit_evidence', 'submit_for_review', 'Evidence ready for review.')
		).rejects.toMatchObject({
			status: 303,
			location: '/app/v2-core/tasks/task_submit_evidence'
		});

		expect(readTaskStatus(dbFile, 'task_submit_evidence')).toBe('review');
	});

	it('blocks review submission when captured evidence is missing', async () => {
		const dbFile = createTempDbFile();
		createBaseTask(dbFile, 'task_submit_missing_evidence', 'in_progress');
		setCoreDbFile(dbFile);

		const result = await applyTaskAction('task_submit_missing_evidence', 'submit_for_review');

		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Action submit_for_review is not available while task status is in_progress.'
			}
		});
		expect(readTaskStatus(dbFile, 'task_submit_missing_evidence')).toBe('in_progress');
	});

	it('accepts reviewed output and closes the task after approved review', async () => {
		const dbFile = createTempDbFile();
		createBaseTask(dbFile, 'task_accept_reviewed_output', 'in_progress');
		seedCapturedReviewEvidence(dbFile, 'task_accept_reviewed_output');
		setCoreDbFile(dbFile);

		await expect(
			applyTaskAction('task_accept_reviewed_output', 'submit_for_review')
		).rejects.toMatchObject({
			status: 303,
			location: '/app/v2-core/tasks/task_accept_reviewed_output'
		});
		seedApprovedReview(dbFile, 'task_accept_reviewed_output');

		await expect(
			applyTaskAction(
				'task_accept_reviewed_output',
				'accept_output',
				'Approved review evidence satisfies the task contract.'
			)
		).rejects.toMatchObject({
			status: 303,
			location: '/app/v2-core/tasks/task_accept_reviewed_output'
		});

		const decisions = readTaskDecisions(dbFile, 'task_accept_reviewed_output');
		const artifacts = readTaskArtifacts(dbFile, 'task_accept_reviewed_output');

		expect(readTaskStatus(dbFile, 'task_accept_reviewed_output')).toBe('done');
		expect(decisions).toContainEqual(
			expect.objectContaining({
				decision_type: 'accept_task_output',
				review_id: 'review_task_accept_reviewed_output',
				rationale: 'Approved review evidence satisfies the task contract.'
			})
		);
		expect(artifacts[0]).toMatchObject({
			status: 'accepted'
		});
	});

	it('blocks accepting review work without approved review', async () => {
		const dbFile = createTempDbFile();
		createBaseTask(dbFile, 'task_accept_without_review', 'review');
		setCoreDbFile(dbFile);

		const result = await applyTaskAction('task_accept_without_review', 'accept_output');

		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Action accept_output is not available while task status is review.'
			}
		});
		expect(readTaskStatus(dbFile, 'task_accept_without_review')).toBe('review');
		expect(readTaskDecisions(dbFile, 'task_accept_without_review')).not.toContainEqual(
			expect.objectContaining({
				decision_type: 'accept_task_output'
			})
		);
	});

	it('records completed run evidence and a submitted artifact', async () => {
		const dbFile = createTempDbFile();
		createBaseTask(dbFile, 'task_record_evidence', 'in_progress');
		setCoreDbFile(dbFile);

		await expect(
			recordRunEvidence('task_record_evidence', {
				actionSummary: 'Captured the run result from the task page.',
				resultSummary: 'One run and one artifact were written.',
				artifactTitle: 'Evidence capture patch',
				artifactUri: 'repo://src/routes/app/v2-core/tasks/[taskId]/+page.server.ts',
				artifactRole: 'output'
			})
		).rejects.toMatchObject({
			status: 303,
			location: '/app/v2-core/tasks/task_record_evidence'
		});

		const runs = readTaskRuns(dbFile, 'task_record_evidence');
		const artifacts = readTaskArtifacts(dbFile, 'task_record_evidence');

		expect(runs).toHaveLength(1);
		expect(runs[0]).toMatchObject({
			status: 'completed',
			action_summary: 'Captured the run result from the task page.',
			result_summary: 'One run and one artifact were written.'
		});
		expect(artifacts).toHaveLength(1);
		expect(artifacts[0]).toMatchObject({
			run_id: runs[0].id,
			uri: 'repo://src/routes/app/v2-core/tasks/[taskId]/+page.server.ts',
			role: 'output',
			title: 'Evidence capture patch',
			status: 'submitted'
		});
	});

	it.each([
		['actionSummary', 'Action summary is required.'],
		['resultSummary', 'Result summary is required.'],
		['artifactTitle', 'Artifact title is required.'],
		['artifactUri', 'Artifact URI is required.']
	])('rejects missing required run evidence field %s', async (field, message) => {
		const dbFile = createTempDbFile();
		const taskId = `task_missing_${field}`;
		createBaseTask(dbFile, taskId, 'in_progress');
		setCoreDbFile(dbFile);

		const result = await recordRunEvidence(taskId, { [field]: '' });

		expect(result).toMatchObject({
			status: 400,
			data: {
				action: 'recordRunEvidence',
				message
			}
		});
		expect(readTaskRuns(dbFile, taskId)).toHaveLength(0);
		expect(readTaskArtifacts(dbFile, taskId)).toHaveLength(0);
	});

	it('rejects unsupported artifact roles without recording evidence', async () => {
		const dbFile = createTempDbFile();
		createBaseTask(dbFile, 'task_invalid_artifact_role', 'in_progress');
		setCoreDbFile(dbFile);

		const result = await recordRunEvidence('task_invalid_artifact_role', {
			artifactRole: 'review'
		});

		expect(result).toMatchObject({
			status: 400,
			data: {
				action: 'recordRunEvidence',
				message: 'Artifact role must be one of output, evidence, deliverable, context.'
			}
		});
		expect(readTaskRuns(dbFile, 'task_invalid_artifact_role')).toHaveLength(0);
		expect(readTaskArtifacts(dbFile, 'task_invalid_artifact_role')).toHaveLength(0);
	});

	it('rejects unsupported and unavailable task actions without changing status', async () => {
		const dbFile = createTempDbFile();
		createBaseTask(dbFile, 'task_ready_reject');
		setCoreDbFile(dbFile);

		const unavailableAccept = await applyTaskAction('task_ready_reject', 'accept_output');
		expect(unavailableAccept).toMatchObject({
			status: 400,
			data: {
				message: 'Action accept_output is not available while task status is ready.'
			}
		});

		const unavailable = await applyTaskAction('task_ready_reject', 'request_changes');
		expect(unavailable).toMatchObject({
			status: 400,
			data: {
				message: 'Action request_changes is not available while task status is ready.'
			}
		});
		expect(readTaskStatus(dbFile, 'task_ready_reject')).toBe('ready');
	});
});
