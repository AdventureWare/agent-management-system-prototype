import { chmodSync, copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyAgentRunResultToData } from '$lib/server/agent-run-results';

const originalCwd = process.cwd();
const tempDirs: string[] = [];

const ALL_CONTROL_PLANE_COLLECTIONS = [
	'providers',
	'roles',
	'projects',
	'goals',
	'executionSurfaces',
	'tasks',
	'runs',
	'reviews',
	'planningSessions',
	'approvals',
	'decisions'
] as const;

function createTempDir() {
	const path = mkdtempSync(join(tmpdir(), 'ams-autonomous-goal-'));
	tempDirs.push(path);
	return path;
}

async function importControlPlaneModule() {
	vi.resetModules();
	return import('./control-plane');
}

async function importAgentApiModule() {
	return import('./agent-control-plane-api');
}

async function importAgentGoalLoopModule() {
	return import('./agent-goal-loop');
}

async function importTaskGovernanceModule() {
	return import('./task-governance');
}

async function importTaskSessionActionsModule() {
	return import('./task-session-actions');
}

async function importAgentThreadsModule() {
	return import('./agent-threads');
}

function recommendationFrom(response: unknown) {
	if (!response || typeof response !== 'object' || !('recommendation' in response)) {
		throw new Error('Expected a goal-loop recommendation response.');
	}

	return (response as { recommendation: unknown }).recommendation;
}

async function applyControlPlaneUpdate(
	controlPlaneModule: Awaited<ReturnType<typeof importControlPlaneModule>>,
	updater: (
		data: Awaited<ReturnType<typeof controlPlaneModule.loadControlPlane>>
	) => unknown | Promise<unknown>
) {
	return controlPlaneModule.updateControlPlaneCollections(async (data) => ({
		data: (await updater(data)) as typeof data,
		changedCollections: [...ALL_CONTROL_PLANE_COLLECTIONS]
	}));
}

function installFakeCodexBin(root: string) {
	const binDir = resolve(root, 'bin');
	const codexBin = resolve(binDir, 'codex');
	mkdirSync(binDir, { recursive: true });
	writeFileSync(
		codexBin,
		`#!/usr/bin/env node
const { writeFileSync, mkdirSync } = require('node:fs');
const { dirname } = require('node:path');
const args = process.argv.slice(2);
const outputIndex = args.indexOf('-o');
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;
if (outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, 'Fake Codex completed the managed AMS task.\\n');
}
console.log(JSON.stringify({ type: 'thread.started', thread_id: 'fake_codex_thread_1' }));
console.log(JSON.stringify({
  type: 'item.completed',
  item: {
    id: 'item_fake_message',
    type: 'agent_message',
    text: 'Fake Codex completed the managed AMS task.'
  }
}));
console.log(JSON.stringify({
  type: 'turn.completed',
  usage: {
    input_tokens: 12,
    cached_input_tokens: 0,
    output_tokens: 6
  }
}));
`,
		'utf8'
	);
	chmodSync(codexBin, 0o755);
	return codexBin;
}

function installRunnerScripts(root: string) {
	const scriptsDir = resolve(root, 'scripts');
	mkdirSync(scriptsDir, { recursive: true });
	copyFileSync(
		resolve(originalCwd, 'scripts', 'agent-thread-runner.mjs'),
		resolve(scriptsDir, 'agent-thread-runner.mjs')
	);
	copyFileSync(
		resolve(originalCwd, 'scripts', 'agent-thread-runner-args.mjs'),
		resolve(scriptsDir, 'agent-thread-runner-args.mjs')
	);
}

async function waitFor<T>(
	read: () => Promise<T>,
	predicate: (value: T) => boolean,
	message: string,
	timeoutMs = 5000
) {
	const startedAt = Date.now();
	let latest: T;

	do {
		latest = await read();

		if (predicate(latest)) {
			return latest;
		}

		await sleep(50);
	} while (Date.now() - startedAt < timeoutMs);

	throw new Error(`${message}: ${JSON.stringify(latest)}`);
}

afterEach(() => {
	process.chdir(originalCwd);
	vi.unstubAllEnvs();
	vi.resetModules();

	while (tempDirs.length > 0) {
		const path = tempDirs.pop();

		if (path) {
			rmSync(path, { recursive: true, force: true });
		}
	}
});

describe('autonomous goal execution proof', () => {
	it('creates a goal, executes its recommended task, resolves review, and closes the goal', async () => {
		const root = createTempDir();
		const projectRoot = resolve(root, 'app');
		const artifactRoot = resolve(projectRoot, 'agent_output');
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(artifactRoot, { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const goalLoopModule = await importAgentGoalLoopModule();
		const taskGovernanceModule = await importTaskGovernanceModule();

		const project = {
			...controlPlaneModule.createProject({
				name: 'Autonomous Goal Proof Project',
				summary: 'Temporary project for proving autonomous goal execution.',
				projectRootFolder: projectRoot,
				defaultArtifactRoot: artifactRoot
			}),
			id: 'project_autonomous_goal_proof'
		};

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project]
		}));

		const goal = await agentApiModule.createAgentApiGoal({
			name: 'Autonomous goal execution acceptance proof',
			summary:
				'Prove that AMS can select, execute, review, and complete a bounded goal without unrelated task drift.',
			successSignal: 'The goal-loop returns goal_complete and the goal is marked done.',
			projectIds: [project.id],
			status: 'running'
		});
		const task = await agentApiModule.createAgentApiTask({
			title: 'Produce deterministic proof artifact',
			summary: 'Create a small proof artifact and report validation evidence.',
			successCriteria: 'A proof artifact exists and validation evidence is recorded on the run.',
			readyCondition: 'Temporary project and artifact root exist.',
			expectedOutcome: 'A completed reviewed task linked to this goal.',
			scope: 'Use a deterministic fake execution result inside the test.',
			validationSteps: 'Assert goal-loop recommendation transitions to goal_complete.',
			readinessLevel: 'R3_EXECUTABLE',
			autonomyLevel: 'A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE',
			reviewRequirement: 'SUMMARY_REVIEW',
			projectId: project.id,
			goalId: goal.id,
			status: 'ready',
			riskLevel: 'low',
			approvalMode: 'none',
			requiresReview: true
		});

		let data = await controlPlaneModule.loadControlPlane();
		let next = goalLoopModule.buildAgentGoalLoopResponse(data, {
			command: 'get_next_recommended_action',
			goalId: goal.id
		});

		expect(recommendationFrom(next)).toEqual(
			expect.objectContaining({
				kind: 'execute_task',
				taskIds: [task.id]
			})
		);

		const run = controlPlaneModule.createRun({
			id: 'run_autonomous_goal_proof',
			taskId: task.id,
			status: 'running',
			startedAt: '2026-06-26T12:00:00.000Z',
			summary: 'Autonomous proof run is executing.'
		});
		await applyControlPlaneUpdate(controlPlaneModule, (current) => ({
			...current,
			runs: [run, ...current.runs],
			tasks: current.tasks.map((candidate) =>
				candidate.id === task.id
					? {
							...candidate,
							status: 'in_progress',
							runCount: candidate.runCount + 1,
							latestRunId: run.id
						}
					: candidate
			)
		}));

		data = await controlPlaneModule.loadControlPlane();
		let result = applyAgentRunResultToData(data, {
			command: 'record_run_result',
			runId: run.id,
			status: 'completed',
			summary: 'Autonomous proof run completed.',
			resultSummary: 'Created the proof artifact and satisfied the bounded task outcome.',
			actionsTaken: 'Selected the goal-linked task and executed deterministic test work.',
			validationSummary: 'Goal-loop transition assertions passed.',
			artifactPaths: [join(artifactRoot, 'autonomous-goal-proof.md')]
		});
		await applyControlPlaneUpdate(controlPlaneModule, () => result.data);

		data = await controlPlaneModule.loadControlPlane();
		result = applyAgentRunResultToData(data, {
			command: 'request_review_from_run',
			runId: run.id,
			summary: 'Autonomous proof run is ready for summary review.'
		});
		await applyControlPlaneUpdate(controlPlaneModule, () => result.data);

		data = await controlPlaneModule.loadControlPlane();
		next = goalLoopModule.buildAgentGoalLoopResponse(data, {
			command: 'get_next_recommended_action',
			goalId: goal.id
		});

		expect(recommendationFrom(next)).toEqual(
			expect.objectContaining({
				kind: 'review_result',
				taskIds: [task.id]
			})
		);

		await taskGovernanceModule.approveTaskReview(task.id, 'autonomous goal proof test');

		data = await controlPlaneModule.loadControlPlane();
		next = goalLoopModule.buildAgentGoalLoopResponse(data, {
			command: 'get_next_recommended_action',
			goalId: goal.id
		});

		expect(data.tasks.find((candidate) => candidate.id === task.id)).toEqual(
			expect.objectContaining({
				status: 'done'
			})
		);
		const continuationTask = data.tasks.find(
			(candidate) => candidate.title === 'Continue goal: assess remaining gap and create next work'
		);

		expect(continuationTask).toEqual(
			expect.objectContaining({
				goalId: goal.id,
				status: 'ready'
			})
		);
		const continuationTaskId = continuationTask?.id ?? '';
		expect(recommendationFrom(next)).toEqual(
			expect.objectContaining({
				kind: 'execute_task',
				taskIds: [continuationTaskId]
			})
		);

		const closedGoal = await agentApiModule.updateAgentApiGoal(goal.id, { status: 'done' });
		data = await controlPlaneModule.loadControlPlane();

		expect(closedGoal.status).toBe('done');
		expect(data.goals.find((candidate) => candidate.id === goal.id)).toEqual(
			expect.objectContaining({
				status: 'done',
				taskIds: expect.arrayContaining([task.id, continuationTaskId])
			})
		);
		expect(data.reviews.find((review) => review.taskId === task.id)).toEqual(
			expect.objectContaining({
				status: 'approved'
			})
		);
	});

	it('launches a real managed runner process for goal work before closing the goal', async () => {
		const root = createTempDir();
		const projectRoot = resolve(root, 'app');
		const artifactRoot = resolve(projectRoot, 'agent_output');
		const codexBin = installFakeCodexBin(root);
		installRunnerScripts(root);
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'json');
		vi.stubEnv('CODEX_BIN', codexBin);
		mkdirSync(artifactRoot, { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const goalLoopModule = await importAgentGoalLoopModule();
		const taskGovernanceModule = await importTaskGovernanceModule();
		const taskSessionActionsModule = await importTaskSessionActionsModule();
		const agentThreadsModule = await importAgentThreadsModule();

		const project = {
			...controlPlaneModule.createProject({
				name: 'Managed Runner Proof Project',
				summary: 'Temporary project for proving real managed runner execution.',
				projectRootFolder: projectRoot,
				defaultArtifactRoot: artifactRoot
			}),
			id: 'project_managed_runner_proof'
		};

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project]
		}));

		const goal = await agentApiModule.createAgentApiGoal({
			name: 'Managed runner autonomous goal acceptance proof',
			summary:
				'Prove that AMS can launch a managed worker for goal-linked work and close the goal after review.',
			successSignal:
				'The task is launched through the managed runner, reconciled from runner files, reviewed, and the goal is marked done.',
			projectIds: [project.id],
			status: 'running'
		});
		const task = await agentApiModule.createAgentApiTask({
			title: 'Run fake managed worker proof',
			summary: 'Launch through the same managed runner path used by AMS task execution.',
			successCriteria: 'The detached runner writes completion state and AMS reconciles it.',
			readyCondition: 'A deterministic fake Codex executable is configured.',
			expectedOutcome: 'A reviewed completed task linked to this goal.',
			scope: 'Exercise managed launch orchestration without calling an external model.',
			validationSteps: 'Poll the linked agent thread until runner completion is reconciled.',
			readinessLevel: 'R3_EXECUTABLE',
			autonomyLevel: 'A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE',
			reviewRequirement: 'SUMMARY_REVIEW',
			projectId: project.id,
			goalId: goal.id,
			status: 'ready',
			riskLevel: 'low',
			approvalMode: 'none',
			requiredThreadSandbox: 'danger-full-access',
			requiresReview: true
		});

		let data = await controlPlaneModule.loadControlPlane();
		let next = goalLoopModule.buildAgentGoalLoopResponse(data, {
			command: 'get_next_recommended_action',
			goalId: goal.id
		});

		expect(recommendationFrom(next)).toEqual(
			expect.objectContaining({
				kind: 'execute_task',
				taskIds: [task.id]
			})
		);

		const launch = await taskSessionActionsModule.launchTaskSession(task.id, new FormData());
		expect(launch.threadId).toEqual(expect.any(String));

		await waitFor(
			async () => {
				const thread = await agentThreadsModule.getAgentThread(launch.threadId!);
				const controlPlane = await controlPlaneModule.loadControlPlane();
				return {
					thread,
					task: controlPlane.tasks.find((candidate) => candidate.id === task.id) ?? null,
					run: controlPlane.runs.find((candidate) => candidate.taskId === task.id) ?? null
				};
			},
			(snapshot) =>
				snapshot.thread?.latestRunStatus === 'completed' &&
				snapshot.task?.status === 'review' &&
				snapshot.run?.status === 'completed',
			'managed runner did not complete and reconcile task state'
		);

		data = await controlPlaneModule.loadControlPlane();
		next = goalLoopModule.buildAgentGoalLoopResponse(data, {
			command: 'get_next_recommended_action',
			goalId: goal.id
		});
		expect(recommendationFrom(next)).toEqual(
			expect.objectContaining({
				kind: 'review_result',
				taskIds: [task.id]
			})
		);

		expect(
			data.reviews.find((review) => review.taskId === task.id && review.status === 'open')
		).toEqual(
			expect.objectContaining({
				taskId: task.id,
				status: 'open'
			})
		);
		await taskGovernanceModule.approveTaskReview(task.id, 'managed runner proof test');

		data = await controlPlaneModule.loadControlPlane();
		next = goalLoopModule.buildAgentGoalLoopResponse(data, {
			command: 'get_next_recommended_action',
			goalId: goal.id
		});

		expect(data.tasks.find((candidate) => candidate.id === task.id)).toEqual(
			expect.objectContaining({ status: 'done' })
		);
		const continuationTask = data.tasks.find(
			(candidate) => candidate.title === 'Continue goal: assess remaining gap and create next work'
		);

		expect(continuationTask).toEqual(
			expect.objectContaining({
				goalId: goal.id,
				status: 'ready'
			})
		);
		expect(recommendationFrom(next)).toEqual(
			expect.objectContaining({
				kind: 'execute_task',
				taskIds: [continuationTask?.id ?? '']
			})
		);

		const closedGoal = await agentApiModule.updateAgentApiGoal(goal.id, { status: 'done' });
		expect(closedGoal.status).toBe('done');
	}, 15_000);
});
