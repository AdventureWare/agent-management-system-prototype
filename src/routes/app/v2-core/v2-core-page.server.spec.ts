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
	transitionV2CoreTaskStatus
} from '$lib/server/v2-core-service';
import { _getV2CoreUiDbFile, load } from './+page.server';

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
		expect(result.operatorConsole?.activeGoals[0]?.title).toBe('Make v2 core inspectable');
		expect(result.operatorConsole?.nextWork.candidates[0]?.taskId).toBe('task_ui_next');
		expect(result.operatorConsole?.reviewQueue).toEqual([]);
		expect(result.operatorConsole?.recentRuns[0]?.modelProviderName).toBe('Codex UI');
		expect(result.operatorConsole?.memory?.items[0]?.title).toBe(
			'Read-only v2 core console exists'
		);
		expect(result.operatorConsole?.dependencyReport.summary.providerRunCount).toBe(1);
		expect(result.operatorConsole?.dependencyReport.summary.toolExecutionCount).toBe(1);
		expect(result.operatorConsole?.snapshotStatus.tableCounts.v2_core_tasks).toBe(2);
	});
});
