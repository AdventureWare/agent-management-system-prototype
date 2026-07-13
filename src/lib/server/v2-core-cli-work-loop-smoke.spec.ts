import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_PATH = resolve(process.cwd(), 'scripts', 'v2-core-db.ts');
const tempDirs: string[] = [];

type CliJson = Record<string, any>;

function createTempDbFile() {
	const dir = mkdtempSync(join(tmpdir(), 'ams-v2-core-cli-smoke-'));
	tempDirs.push(dir);
	return join(dir, 'v2-core-smoke.sqlite');
}

function runCoreCli(args: string[]): CliJson {
	const result = spawnSync(process.execPath, ['--experimental-strip-types', SCRIPT_PATH, ...args], {
		cwd: process.cwd(),
		encoding: 'utf8'
	});

	if (result.status !== 0) {
		throw new Error(
			[
				`v2-core-db command failed: ${args.join(' ')}`,
				`status: ${result.status}`,
				`stdout: ${result.stdout}`,
				`stderr: ${result.stderr}`
			].join('\n')
		);
	}

	return JSON.parse(result.stdout) as CliJson;
}

function runCoreCliFailure(args: string[]): { stdout: string; stderr: string } {
	const result = spawnSync(process.execPath, ['--experimental-strip-types', SCRIPT_PATH, ...args], {
		cwd: process.cwd(),
		encoding: 'utf8'
	});

	if (result.status === 0) {
		throw new Error(
			[
				`v2-core-db command unexpectedly succeeded: ${args.join(' ')}`,
				`stdout: ${result.stdout}`,
				`stderr: ${result.stderr}`
			].join('\n')
		);
	}

	return {
		stdout: result.stdout,
		stderr: result.stderr
	};
}

afterEach(() => {
	while (tempDirs.length > 0) {
		const path = tempDirs.pop();

		if (path) {
			rmSync(path, { recursive: true, force: true });
		}
	}
});

describe('v2 core CLI work-loop smoke', () => {
	it('transitions a goal status through the supported CLI path', () => {
		const dbFile = createTempDbFile();
		const baseArgs = ['--db', dbFile, '--json'];

		runCoreCli(['init', ...baseArgs, '--reset']);
		runCoreCli([
			'create-project',
			...baseArgs,
			'--id',
			'project_v2_goal_transition_smoke',
			'--name',
			'AMS v2 Goal Transition Smoke',
			'--summary',
			'Temporary project for proving supported goal status transitions.'
		]);
		runCoreCli([
			'create-goal',
			...baseArgs,
			'--id',
			'goal_v2_goal_transition_smoke',
			'--project',
			'project_v2_goal_transition_smoke',
			'--title',
			'Prove v2 goal status transition',
			'--summary',
			'Use the supported CLI instead of direct SQL edits.',
			'--success',
			'The goal can move to completed with a decision audit record.'
		]);

		const transition = runCoreCli([
			'transition-goal',
			...baseArgs,
			'--id',
			'decision_v2_goal_transition_smoke',
			'--goal',
			'goal_v2_goal_transition_smoke',
			'--status',
			'completed',
			'--summary',
			'Close the smoke-test goal after proving the transition path.'
		]);

		expect(transition.result).toMatchObject({
			goal: {
				id: 'goal_v2_goal_transition_smoke',
				status: 'completed'
			},
			decision: {
				id: 'decision_v2_goal_transition_smoke',
				decision_type: 'goal_status_transition',
				summary: 'Close the smoke-test goal after proving the transition path.',
				rationale: 'Transitioned goal from active to completed.'
			}
		});

		const failure = runCoreCliFailure([
			'transition-goal',
			...baseArgs,
			'--goal',
			'goal_v2_goal_transition_smoke',
			'--status',
			'waiting_for_vibes',
			'--summary',
			'Unsupported statuses should not be accepted.'
		]);
		expect(failure.stderr).toContain('unsupported status waiting_for_vibes');
	});

	it('drives a task through the minimal agent-control surface', () => {
		const dbFile = createTempDbFile();
		const baseArgs = ['--db', dbFile, '--json'];

		runCoreCli(['init', ...baseArgs, '--reset']);
		runCoreCli([
			'create-project',
			...baseArgs,
			'--id',
			'project_v2_agent_control_smoke',
			'--name',
			'AMS v2 Agent Control Smoke',
			'--summary',
			'Temporary project for proving the v2 agent-control surface.'
		]);
		runCoreCli([
			'create-goal',
			...baseArgs,
			'--id',
			'goal_v2_agent_control_smoke',
			'--project',
			'project_v2_agent_control_smoke',
			'--title',
			'Prove v2 agent-control surface',
			'--summary',
			'Use one bounded control surface over the v2 core loop.',
			'--success',
			'Agent-control can fetch, start, record evidence, close, and create follow-up work.'
		]);
		runCoreCli([
			'create-task',
			...baseArgs,
			'--id',
			'task_v2_provider_launch_smoke',
			'--goal',
			'goal_v2_agent_control_smoke',
			'--title',
			'Launch provider run through v2 adapter',
			'--summary',
			'Prepare a provider-backed run and packet without closing the task.',
			'--success',
			'The launch adapter returns a provider-linked planned run and work packet.',
			'--validation',
			'Read back task detail, run, and packet.'
		]);
		runCoreCli([
			'create-task',
			...baseArgs,
			'--id',
			'task_v2_agent_control_smoke',
			'--goal',
			'goal_v2_agent_control_smoke',
			'--title',
			'Exercise v2 agent-control surface',
			'--summary',
			'Drive a task through the adapter without a separate schema.',
			'--success',
			'The adapter returns source-linked readbacks for work, evidence, closeout, and follow-up.',
			'--validation',
			'Run the focused CLI smoke test.'
		]);
		runCoreCli([
			'register-provider',
			...baseArgs,
			'--id',
			'provider_v2_agent_control_smoke',
			'--name',
			'Codex agent-control smoke provider',
			'--kind',
			'external_ai'
		]);
		runCoreCli([
			'register-tool',
			...baseArgs,
			'--id',
			'tool_v2_agent_control_smoke_cli',
			'--name',
			'v2 agent-control smoke CLI',
			'--description',
			'Local CLI command used by the agent-control smoke test.',
			'--kind',
			'local_cli',
			'--risk',
			'low'
		]);

		const launched = runCoreCli([
			'launch-provider-run',
			...baseArgs,
			'--run',
			'run_v2_provider_launch_smoke',
			'--task',
			'task_v2_provider_launch_smoke',
			'--provider',
			'provider_v2_agent_control_smoke',
			'--input',
			'Prepare a provider session from existing v2 task state.',
			'--action',
			'Return run id and packet; leave result recording explicit.'
		]);
		expect(launched.providerRunLaunch).toMatchObject({
			runId: 'run_v2_provider_launch_smoke',
			taskId: 'task_v2_provider_launch_smoke',
			modelProviderId: 'provider_v2_agent_control_smoke',
			taskStatusBeforeLaunch: 'ready',
			taskStatusAfterLaunch: 'in_progress',
			taskDetail: {
				task: {
					id: 'task_v2_provider_launch_smoke',
					status: 'in_progress'
				},
				runs: [
					expect.objectContaining({
						id: 'run_v2_provider_launch_smoke',
						status: 'planned',
						modelProviderId: 'provider_v2_agent_control_smoke',
						endedAt: null
					})
				]
			},
			agentWorkPacket: {
				taskContract: {
					taskId: 'task_v2_provider_launch_smoke',
					status: 'in_progress'
				},
				readiness: {
					actionable: true,
					recommendedAction: 'continue_task'
				}
			}
		});

		const completedProviderRun = runCoreCli([
			'complete-provider-run',
			...baseArgs,
			'--task',
			'task_v2_provider_launch_smoke',
			'--run',
			'run_v2_provider_launch_smoke',
			'--result',
			'Provider-backed work completed and is ready for explicit artifact/review steps.',
			'--validation',
			'Completion updated the existing launched run instead of creating a second run.'
		]);
		expect(completedProviderRun.providerRunCompletion).toMatchObject({
			runId: 'run_v2_provider_launch_smoke',
			taskId: 'task_v2_provider_launch_smoke',
			statusBeforeCompletion: 'planned',
			statusAfterCompletion: 'completed',
			taskDetail: {
				task: {
					id: 'task_v2_provider_launch_smoke',
					status: 'in_progress'
				},
				runs: [
					expect.objectContaining({
						id: 'run_v2_provider_launch_smoke',
						status: 'completed',
						modelProviderId: 'provider_v2_agent_control_smoke',
						resultSummary:
							'Provider-backed work completed and is ready for explicit artifact/review steps.',
						validationSummary:
							'Completion updated the existing launched run instead of creating a second run.'
					})
				]
			}
		});
		expect(completedProviderRun.providerRunCompletion.taskDetail.runs[0].endedAt).toEqual(
			expect.any(String)
		);

		const next = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'next',
			'--project',
			'project_v2_agent_control_smoke'
		]);
		expect(next.agentControl).toMatchObject({
			action: 'next',
			selectedTaskId: 'task_v2_agent_control_smoke',
			selectedPacket: {
				taskContract: {
					taskId: 'task_v2_agent_control_smoke',
					status: 'ready'
				},
				readiness: {
					actionable: true,
					recommendedAction: 'start_task'
				}
			}
		});
		expect(next.agentControl.nextWork.candidates).toEqual([
			expect.objectContaining({
				taskId: 'task_v2_agent_control_smoke',
				action: 'start_task'
			})
		]);

		const compactNext = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'next',
			'--project',
			'project_v2_agent_control_smoke',
			'--compact'
		]);
		expect(compactNext.agentControl).toMatchObject({
			action: 'next',
			outputMode: 'compact',
			selectedTaskId: 'task_v2_agent_control_smoke',
			selectedPacket: {
				taskContract: {
					taskId: 'task_v2_agent_control_smoke',
					status: 'ready'
				},
				readiness: {
					actionable: true,
					recommendedAction: 'start_task'
				},
				counts: expect.objectContaining({
					contextSources: expect.any(Number),
					sourceLinks: expect.any(Number)
				})
			}
		});
		expect(compactNext.agentControl.selectedPacket.renderedPrompt).toBeUndefined();
		expect(compactNext.agentControl.selectedPacket.recentEvidence).toBeUndefined();
		expect(compactNext.agentControl.selectedPacket.contextSources.length).toBeLessThanOrEqual(6);
		expect(compactNext.agentControl.selectedPacket.sourceLinks.length).toBeLessThanOrEqual(20);
		expect(JSON.stringify(compactNext).length).toBeLessThan(JSON.stringify(next).length);

		const packet = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'packet',
			'--task',
			'task_v2_agent_control_smoke'
		]);
		expect(packet.agentControl.selectedPacket.taskContract.taskId).toBe(
			'task_v2_agent_control_smoke'
		);
		expect(packet.agentControl.outputMode).toBe('full');
		expect(packet.agentControl.selectedPacket.renderedPrompt).toEqual(expect.any(String));

		const compactPacket = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'packet',
			'--task',
			'task_v2_agent_control_smoke',
			'--compact'
		]);
		expect(compactPacket.agentControl).toMatchObject({
			action: 'packet',
			outputMode: 'compact',
			selectedTaskId: 'task_v2_agent_control_smoke',
			selectedPacket: {
				taskContract: {
					taskId: 'task_v2_agent_control_smoke'
				},
				stoppingConditions: expect.arrayContaining([expect.stringContaining('Stop before schema')])
			},
			fullOutputHint: expect.stringContaining('without --compact')
		});
		expect(compactPacket.agentControl.selectedPacket.renderedPrompt).toBeUndefined();
		expect(JSON.stringify(compactPacket).length).toBeLessThan(JSON.stringify(packet).length);

		const started = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'start',
			'--id',
			'decision_v2_agent_control_smoke_start',
			'--task',
			'task_v2_agent_control_smoke'
		]);
		expect(started.agentControl.taskDetail.task.status).toBe('in_progress');

		const run = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'record-run',
			'--id',
			'run_v2_agent_control_smoke',
			'--task',
			'task_v2_agent_control_smoke',
			'--provider',
			'provider_v2_agent_control_smoke',
			'--input',
			'Used agent-control to drive the v2 core task.',
			'--action',
			'Recorded run evidence through the adapter.',
			'--result',
			'The adapter produced durable run evidence.',
			'--validation',
			'CLI command returned task detail readback.'
		]);
		expect(run.agentControl.taskDetail.runs).toEqual([
			expect.objectContaining({
				id: 'run_v2_agent_control_smoke',
				modelProviderId: 'provider_v2_agent_control_smoke'
			})
		]);

		const tool = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'record-tool',
			'--id',
			'tool_execution_v2_agent_control_smoke',
			'--task',
			'task_v2_agent_control_smoke',
			'--run',
			'run_v2_agent_control_smoke',
			'--tool',
			'tool_v2_agent_control_smoke_cli',
			'--input',
			'Ran the agent-control CLI smoke path.',
			'--result',
			'Agent-control tool evidence was recorded.'
		]);
		expect(tool.agentControl.taskDetail.toolExecutions).toEqual([
			expect.objectContaining({
				id: 'tool_execution_v2_agent_control_smoke',
				runId: 'run_v2_agent_control_smoke'
			})
		]);

		const routeDecision = runCoreCli([
			'record-decision',
			...baseArgs,
			'--id',
			'decision_v2_agent_control_smoke_route',
			'--project',
			'project_v2_agent_control_smoke',
			'--goal',
			'goal_v2_agent_control_smoke',
			'--task',
			'task_v2_agent_control_smoke',
			'--run',
			'run_v2_agent_control_smoke',
			'--type',
			'route_selection',
			'--summary',
			'Route selected: provider=provider_v2_agent_control_smoke model=codex-smoke route=external-ai capability=agent-control-surface',
			'--rationale',
			[
				'Selected provider: provider_v2_agent_control_smoke',
				'Selected model: codex-smoke',
				'Selected route: external-ai',
				'Capability: agent-control-surface',
				'Rejected alternatives: local-model unavailable; manual-only lacks agent-control coverage',
				'Evidence: run_v2_agent_control_smoke; tool_execution_v2_agent_control_smoke'
			].join('\n')
		]);
		expect(routeDecision.result.decisions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'decision_v2_agent_control_smoke_route',
					decisionType: 'route_selection'
				})
			])
		);

		const directRoutingEvidence = runCoreCli([
			'routing-evidence',
			...baseArgs,
			'--task',
			'task_v2_agent_control_smoke'
		]);
		expect(directRoutingEvidence.routingEvidence).toMatchObject({
			scope: {
				projectId: 'project_v2_agent_control_smoke',
				goalId: 'goal_v2_agent_control_smoke',
				taskId: 'task_v2_agent_control_smoke'
			},
			decisions: [
				expect.objectContaining({
					decisionId: 'decision_v2_agent_control_smoke_route',
					decisionType: 'route_selection',
					selectedProviderId: 'provider_v2_agent_control_smoke',
					selectedModelId: 'codex-smoke',
					selectedRoute: 'external-ai',
					capabilityName: 'agent-control-surface',
					rejectedAlternatives: [
						'local-model unavailable',
						'manual-only lacks agent-control coverage'
					],
					evidenceLabels: ['run_v2_agent_control_smoke', 'tool_execution_v2_agent_control_smoke']
				})
			]
		});

		const agentRoutingEvidence = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'routing-evidence',
			'--project',
			'project_v2_agent_control_smoke'
		]);
		expect(agentRoutingEvidence.agentControl).toMatchObject({
			action: 'routing-evidence',
			routingEvidence: {
				scope: {
					projectId: 'project_v2_agent_control_smoke',
					goalId: null,
					taskId: null
				},
				decisions: [
					expect.objectContaining({
						decisionId: 'decision_v2_agent_control_smoke_route',
						selectedProviderId: 'provider_v2_agent_control_smoke',
						selectedModelId: 'codex-smoke'
					})
				]
			}
		});

		const artifact = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'attach-artifact',
			'--id',
			'artifact_v2_agent_control_smoke',
			'--task',
			'task_v2_agent_control_smoke',
			'--run',
			'run_v2_agent_control_smoke',
			'--uri',
			'agent_output/v2-agent-control-smoke.md',
			'--title',
			'V2 agent-control smoke evidence',
			'--summary',
			'Artifact evidence created through the agent-control surface.'
		]);
		expect(artifact.agentControl.taskDetail.artifacts).toEqual([
			expect.objectContaining({
				id: 'artifact_v2_agent_control_smoke',
				status: 'submitted'
			})
		]);

		const submitted = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'submit-review',
			'--id',
			'decision_v2_agent_control_smoke_review',
			'--task',
			'task_v2_agent_control_smoke',
			'--run',
			'run_v2_agent_control_smoke'
		]);
		expect(submitted.agentControl.taskDetail.task.status).toBe('review');

		runCoreCli([
			'record-review',
			...baseArgs,
			'--id',
			'review_v2_agent_control_smoke',
			'--task',
			'task_v2_agent_control_smoke',
			'--run',
			'run_v2_agent_control_smoke',
			'--artifact',
			'artifact_v2_agent_control_smoke',
			'--summary',
			'Agent-control smoke evidence is sufficient.'
		]);

		const accepted = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'accept-output',
			'--id',
			'decision_v2_agent_control_smoke_accept',
			'--task',
			'task_v2_agent_control_smoke',
			'--run',
			'run_v2_agent_control_smoke',
			'--review',
			'review_v2_agent_control_smoke',
			'--summary',
			'Accept agent-control smoke output.',
			'--rationale',
			'The task has run, tool, artifact, and approved review evidence.'
		]);
		expect(accepted.agentControl.taskDetail.task.status).toBe('done');
		expect(accepted.agentControl.taskDetail.decisions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'decision_v2_agent_control_smoke_accept',
					decisionType: 'accept_task_output'
				})
			])
		);

		const followup = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'follow-up',
			'--id',
			'task_v2_agent_control_smoke_followup',
			'--task',
			'task_v2_agent_control_smoke',
			'--title',
			'Continue after agent-control smoke',
			'--summary',
			'Use the proven agent-control surface for the next task.',
			'--success',
			'The follow-up appears in next-work with source lineage.',
			'--validation',
			'Read next-work and inspect-task.',
			'--rationale',
			'The adapter successfully drove a task through the minimal loop.'
		]);
		expect(followup.agentControl.taskDetail).toMatchObject({
			task: {
				id: 'task_v2_agent_control_smoke_followup',
				status: 'ready'
			},
			lineage: {
				sourceTaskId: 'task_v2_agent_control_smoke',
				sourceTaskTitle: 'Exercise v2 agent-control surface'
			}
		});

		const directSearch = runCoreCli([
			'search-context',
			...baseArgs,
			'--project',
			'project_v2_agent_control_smoke',
			'--query',
			'agent-control',
			'--limit',
			'20'
		]);
		expect(directSearch.retrieval).toMatchObject({
			scope: {
				projectId: 'project_v2_agent_control_smoke',
				goalId: null,
				taskId: null
			},
			query: 'agent-control',
			limit: 20
		});
		expect(directSearch.retrieval.results).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					recordType: 'task',
					recordId: 'task_v2_agent_control_smoke',
					projectId: 'project_v2_agent_control_smoke',
					goalId: 'goal_v2_agent_control_smoke',
					taskId: 'task_v2_agent_control_smoke',
					inclusionReason: expect.stringContaining('agent-control')
				}),
				expect.objectContaining({
					recordType: 'artifact',
					recordId: 'artifact_v2_agent_control_smoke',
					projectId: 'project_v2_agent_control_smoke',
					taskId: 'task_v2_agent_control_smoke',
					artifactId: 'artifact_v2_agent_control_smoke'
				}),
				expect.objectContaining({
					recordType: 'run',
					recordId: 'run_v2_agent_control_smoke',
					runId: 'run_v2_agent_control_smoke'
				}),
				expect.objectContaining({
					recordType: 'decision',
					recordId: 'decision_v2_agent_control_smoke_route',
					taskId: 'task_v2_agent_control_smoke'
				})
			])
		);

		const agentSearch = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'search',
			'--project',
			'project_v2_agent_control_smoke',
			'--query',
			'follow-up',
			'--limit',
			'5'
		]);
		expect(agentSearch.agentControl).toMatchObject({
			action: 'search',
			retrieval: {
				scope: {
					projectId: 'project_v2_agent_control_smoke',
					goalId: null,
					taskId: null
				},
				query: 'follow-up',
				limit: 5
			}
		});
		expect(agentSearch.agentControl.retrieval.results).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					recordType: 'task',
					recordId: 'task_v2_agent_control_smoke_followup',
					taskId: 'task_v2_agent_control_smoke_followup',
					inclusionReason: expect.stringContaining('follow-up')
				})
			])
		);
	}, 20_000);

	it('completes a managed run lifecycle through one helper without bypassing gates', () => {
		const dbFile = createTempDbFile();
		const baseArgs = ['--db', dbFile, '--json'];
		const completeArgs = [
			'--task',
			'task_v2_lifecycle_helper_smoke',
			'--run',
			'run_v2_lifecycle_helper_smoke',
			'--artifact',
			'artifact_v2_lifecycle_helper_smoke',
			'--uri',
			'repo://docs/v2-lifecycle-helper-smoke.md',
			'--title',
			'V2 lifecycle helper smoke artifact',
			'--result',
			'Managed provider run produced a durable artifact.',
			'--validation',
			'Managed lifecycle helper smoke validation passed.',
			'--review',
			'review_v2_lifecycle_helper_smoke',
			'--decision',
			'decision_v2_lifecycle_helper_smoke_accept',
			'--tool-execution',
			'tool_execution_v2_lifecycle_helper_smoke',
			'--tool',
			'tool_v2_lifecycle_helper_cli',
			'--input',
			'Ran managed lifecycle helper smoke validation.',
			'--summary',
			'Managed lifecycle helper evidence is acceptable.',
			'--rationale',
			'The helper preserved review and acceptance gates.',
			'--followup-task',
			'task_v2_lifecycle_helper_followup',
			'--followup-title',
			'Continue after lifecycle helper smoke',
			'--followup-success',
			'Follow-up task is source-linked and ready.',
			'--followup-validation',
			'Inspect next-work and task lineage.',
			'--followup-rationale',
			'Accepted lifecycle helper output identified one continuation.'
		];

		runCoreCli(['init', ...baseArgs, '--reset']);
		runCoreCli([
			'create-project',
			...baseArgs,
			'--id',
			'project_v2_lifecycle_helper_smoke',
			'--name',
			'AMS v2 Lifecycle Helper Smoke'
		]);
		runCoreCli([
			'create-goal',
			...baseArgs,
			'--id',
			'goal_v2_lifecycle_helper_smoke',
			'--project',
			'project_v2_lifecycle_helper_smoke',
			'--title',
			'Prove managed lifecycle helper',
			'--success',
			'The helper closes a provider run through existing gates.'
		]);
		runCoreCli([
			'create-task',
			...baseArgs,
			'--id',
			'task_v2_lifecycle_helper_smoke',
			'--goal',
			'goal_v2_lifecycle_helper_smoke',
			'--title',
			'Exercise lifecycle helper',
			'--success',
			'One helper completes the managed run lifecycle.',
			'--validation',
			'Run CLI smoke assertions.'
		]);
		runCoreCli([
			'register-provider',
			...baseArgs,
			'--id',
			'provider_v2_lifecycle_helper_smoke',
			'--name',
			'Codex lifecycle helper smoke provider',
			'--kind',
			'external_ai'
		]);
		runCoreCli([
			'register-tool',
			...baseArgs,
			'--id',
			'tool_v2_lifecycle_helper_cli',
			'--name',
			'Lifecycle helper smoke CLI',
			'--description',
			'Local CLI validation for lifecycle helper smoke test.',
			'--kind',
			'local_cli',
			'--risk',
			'low'
		]);
		runCoreCli([
			'launch-provider-run',
			...baseArgs,
			'--run',
			'run_v2_lifecycle_helper_smoke',
			'--task',
			'task_v2_lifecycle_helper_smoke',
			'--provider',
			'provider_v2_lifecycle_helper_smoke'
		]);

		const dryRun = runCoreCli(['managed-run-lifecycle', ...baseArgs, '--dry-run', ...completeArgs]);
		expect(dryRun.managedRunLifecycle).toMatchObject({
			mode: 'complete',
			dryRun: true,
			preflight: {
				taskId: 'task_v2_lifecycle_helper_smoke',
				runId: 'run_v2_lifecycle_helper_smoke',
				taskStatus: 'in_progress',
				runStatus: 'planned'
			},
			plannedOperations: [
				'complete_provider_run',
				'record_tool_execution',
				'attach_artifact',
				'transition_task_to_review',
				'record_approved_review',
				'record_accept_task_output_decision',
				'transition_task_to_done',
				'create_followup_task'
			]
		});

		const afterDryRun = runCoreCli([
			'inspect-task',
			...baseArgs,
			'--task',
			'task_v2_lifecycle_helper_smoke'
		]);
		expect(afterDryRun.taskDetail).toMatchObject({
			task: {
				status: 'in_progress'
			},
			runs: [
				expect.objectContaining({
					id: 'run_v2_lifecycle_helper_smoke',
					status: 'planned'
				})
			],
			toolExecutions: [],
			artifacts: [],
			reviews: []
		});

		const agentDryRun = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'managed-run-lifecycle',
			'--dry-run',
			...completeArgs
		]);
		expect(agentDryRun.agentControl).toMatchObject({
			action: 'managed-run-lifecycle',
			managedRunLifecycle: {
				dryRun: true,
				createdRecordIds: {
					artifactId: 'artifact_v2_lifecycle_helper_smoke',
					reviewId: 'review_v2_lifecycle_helper_smoke',
					acceptDecisionId: 'decision_v2_lifecycle_helper_smoke_accept',
					followupTaskId: 'task_v2_lifecycle_helper_followup'
				}
			}
		});

		const completed = runCoreCli(['managed-run-lifecycle', ...baseArgs, ...completeArgs]);
		expect(completed.managedRunLifecycle).toMatchObject({
			mode: 'complete',
			dryRun: false,
			taskDetail: {
				task: {
					id: 'task_v2_lifecycle_helper_smoke',
					status: 'done'
				},
				runs: [
					expect.objectContaining({
						id: 'run_v2_lifecycle_helper_smoke',
						status: 'completed',
						resultSummary: 'Managed provider run produced a durable artifact.'
					})
				],
				toolExecutions: [
					expect.objectContaining({
						id: 'tool_execution_v2_lifecycle_helper_smoke',
						status: 'completed'
					})
				],
				artifacts: [
					expect.objectContaining({
						id: 'artifact_v2_lifecycle_helper_smoke',
						status: 'accepted',
						role: 'deliverable'
					})
				],
				reviews: [
					expect.objectContaining({
						id: 'review_v2_lifecycle_helper_smoke',
						status: 'approved'
					})
				],
				decisions: expect.arrayContaining([
					expect.objectContaining({
						id: 'decision_v2_lifecycle_helper_smoke_accept',
						decisionType: 'accept_task_output'
					})
				])
			},
			followupTaskDetail: {
				task: {
					id: 'task_v2_lifecycle_helper_followup',
					status: 'ready'
				},
				lineage: {
					sourceTaskId: 'task_v2_lifecycle_helper_smoke'
				}
			}
		});

		const duplicate = runCoreCliFailure(['managed-run-lifecycle', ...baseArgs, ...completeArgs]);
		expect(duplicate.stderr).toContain('cannot complete managed-run lifecycle from status done');

		runCoreCli([
			'create-task',
			...baseArgs,
			'--id',
			'task_v2_lifecycle_helper_other',
			'--goal',
			'goal_v2_lifecycle_helper_smoke',
			'--title',
			'Other lifecycle task',
			'--success',
			'Wrong-run ownership is rejected.',
			'--validation',
			'Run CLI smoke assertions.'
		]);
		runCoreCli([
			'launch-provider-run',
			...baseArgs,
			'--run',
			'run_v2_lifecycle_helper_other',
			'--task',
			'task_v2_lifecycle_helper_other',
			'--provider',
			'provider_v2_lifecycle_helper_smoke'
		]);
		const wrongTask = runCoreCliFailure([
			'managed-run-lifecycle',
			...baseArgs,
			'--task',
			'task_v2_lifecycle_helper_other',
			'--run',
			'run_v2_lifecycle_helper_smoke',
			'--artifact',
			'artifact_v2_lifecycle_helper_wrong',
			'--uri',
			'repo://docs/wrong.md',
			'--title',
			'Wrong run artifact',
			'--result',
			'Wrong run should fail.',
			'--validation',
			'Wrong run should fail.',
			'--review',
			'review_v2_lifecycle_helper_wrong',
			'--decision',
			'decision_v2_lifecycle_helper_wrong'
		]);
		expect(wrongTask.stderr).toContain('belongs to task task_v2_lifecycle_helper_smoke');
	}, 20_000);

	it('reports route-comparison evidence by capability', () => {
		const dbFile = createTempDbFile();
		const baseArgs = ['--db', dbFile, '--json'];

		runCoreCli(['init', ...baseArgs, '--reset']);
		runCoreCli([
			'create-project',
			...baseArgs,
			'--id',
			'project_v2_route_report_smoke',
			'--name',
			'AMS v2 Route Report Smoke'
		]);
		runCoreCli([
			'create-goal',
			...baseArgs,
			'--id',
			'goal_v2_route_report_smoke',
			'--project',
			'project_v2_route_report_smoke',
			'--title',
			'Compare route evidence',
			'--success',
			'Route evidence is reported by capability.'
		]);
		runCoreCli([
			'register-provider',
			...baseArgs,
			'--id',
			'provider_v2_route_report_codex',
			'--name',
			'Codex route report provider',
			'--kind',
			'external_ai'
		]);
		runCoreCli([
			'register-provider',
			...baseArgs,
			'--id',
			'provider_v2_route_report_local',
			'--name',
			'Local route report provider',
			'--kind',
			'local_model'
		]);
		runCoreCli([
			'register-tool',
			...baseArgs,
			'--id',
			'tool_v2_route_report_cli',
			'--name',
			'Route report CLI',
			'--description',
			'Local CLI evidence for route report smoke test.',
			'--kind',
			'local_cli',
			'--risk',
			'low'
		]);

		for (const taskId of ['task_v2_route_report_packet_a', 'task_v2_route_report_packet_b']) {
			runCoreCli([
				'create-task',
				...baseArgs,
				'--id',
				taskId,
				'--goal',
				'goal_v2_route_report_smoke',
				'--title',
				`Route report ${taskId}`,
				'--success',
				'Task route evidence is captured.',
				'--validation',
				'Smoke test readback.'
			]);
		}
		runCoreCli([
			'create-task',
			...baseArgs,
			'--id',
			'task_v2_route_report_retrieval',
			'--goal',
			'goal_v2_route_report_smoke',
			'--title',
			'Route report retrieval',
			'--success',
			'Retrieval evaluation exists without route evidence.',
			'--validation',
			'Smoke test readback.'
		]);
		runCoreCli([
			'create-task',
			...baseArgs,
			'--id',
			'task_v2_route_report_route_only',
			'--goal',
			'goal_v2_route_report_smoke',
			'--title',
			'Route report route only',
			'--success',
			'Route evidence exists without evaluation.',
			'--validation',
			'Smoke test readback.'
		]);

		runCoreCli([
			'record-run',
			...baseArgs,
			'--id',
			'run_v2_route_report_packet_a',
			'--task',
			'task_v2_route_report_packet_a',
			'--provider',
			'provider_v2_route_report_codex',
			'--result',
			'Packet route A ran.'
		]);
		runCoreCli([
			'record-run',
			...baseArgs,
			'--id',
			'run_v2_route_report_packet_b',
			'--task',
			'task_v2_route_report_packet_b',
			'--provider',
			'provider_v2_route_report_local',
			'--result',
			'Packet route B ran.'
		]);
		runCoreCli([
			'record-run',
			...baseArgs,
			'--id',
			'run_v2_route_report_retrieval',
			'--task',
			'task_v2_route_report_retrieval',
			'--provider',
			'provider_v2_route_report_codex',
			'--result',
			'Retrieval evaluation ran.'
		]);
		runCoreCli([
			'record-run',
			...baseArgs,
			'--id',
			'run_v2_route_report_route_only',
			'--task',
			'task_v2_route_report_route_only',
			'--provider',
			'provider_v2_route_report_codex',
			'--result',
			'Route-only run happened.'
		]);
		runCoreCli([
			'record-tool-execution',
			...baseArgs,
			'--id',
			'tool_execution_v2_route_report_packet',
			'--tool',
			'tool_v2_route_report_cli',
			'--task',
			'task_v2_route_report_packet_a',
			'--run',
			'run_v2_route_report_packet_a',
			'--input',
			'Validate packet route report.',
			'--result',
			'Packet evidence validated.'
		]);
		runCoreCli([
			'record-tool-execution',
			...baseArgs,
			'--id',
			'tool_execution_v2_route_report_retrieval',
			'--tool',
			'tool_v2_route_report_cli',
			'--task',
			'task_v2_route_report_retrieval',
			'--run',
			'run_v2_route_report_retrieval',
			'--input',
			'Validate retrieval route report.',
			'--result',
			'Retrieval evidence validated.'
		]);

		for (const [id, taskId, runId, provider, model, route, rejected] of [
			[
				'decision_v2_route_report_packet_a',
				'task_v2_route_report_packet_a',
				'run_v2_route_report_packet_a',
				'provider_v2_route_report_codex',
				'codex-smoke',
				'external-ai',
				'local-model untested'
			],
			[
				'decision_v2_route_report_packet_b',
				'task_v2_route_report_packet_b',
				'run_v2_route_report_packet_b',
				'provider_v2_route_report_local',
				'local-smoke',
				'local-model',
				'external-ai more costly'
			]
		]) {
			runCoreCli([
				'record-decision',
				...baseArgs,
				'--id',
				id,
				'--project',
				'project_v2_route_report_smoke',
				'--goal',
				'goal_v2_route_report_smoke',
				'--task',
				taskId,
				'--run',
				runId,
				'--type',
				'route_selection',
				'--summary',
				`Route selected: provider=${provider} model=${model} route=${route} capability=agent-work-packet`,
				'--rationale',
				[
					`Selected provider: ${provider}`,
					`Selected model: ${model}`,
					`Selected route: ${route}`,
					'Capability: agent-work-packet',
					`Rejected alternatives: ${rejected}`,
					`Evidence: ${runId}`
				].join('\n')
			]);
		}
		runCoreCli([
			'record-decision',
			...baseArgs,
			'--id',
			'decision_v2_route_report_route_only',
			'--project',
			'project_v2_route_report_smoke',
			'--goal',
			'goal_v2_route_report_smoke',
			'--task',
			'task_v2_route_report_route_only',
			'--run',
			'run_v2_route_report_route_only',
			'--type',
			'route_selection',
			'--summary',
			'Route selected: provider=provider_v2_route_report_codex model=codex-smoke route=external-ai capability=route-only-capability',
			'--rationale',
			[
				'Selected provider: provider_v2_route_report_codex',
				'Selected model: codex-smoke',
				'Selected route: external-ai',
				'Capability: route-only-capability',
				'Rejected alternatives: local-model unavailable',
				'Evidence: run_v2_route_report_route_only'
			].join('\n')
		]);

		runCoreCli([
			'register-evaluation-scenario',
			...baseArgs,
			'--id',
			'evaluation_scenario_v2_route_report_packet',
			'--project',
			'project_v2_route_report_smoke',
			'--title',
			'Packet route evidence',
			'--capability',
			'agent-work-packet',
			'--prompt',
			'Compare packet route evidence.',
			'--rubric',
			'Route report links evaluation and route evidence.'
		]);
		runCoreCli([
			'register-evaluation-scenario',
			...baseArgs,
			'--id',
			'evaluation_scenario_v2_route_report_retrieval',
			'--project',
			'project_v2_route_report_smoke',
			'--title',
			'Retrieval route evidence',
			'--capability',
			'local-retrieval',
			'--prompt',
			'Compare retrieval route evidence.',
			'--rubric',
			'Route report shows missing route evidence.'
		]);
		runCoreCli([
			'record-evaluation-result',
			...baseArgs,
			'--id',
			'evaluation_result_v2_route_report_packet',
			'--scenario',
			'evaluation_scenario_v2_route_report_packet',
			'--task',
			'task_v2_route_report_packet_a',
			'--run',
			'run_v2_route_report_packet_a',
			'--tool-execution',
			'tool_execution_v2_route_report_packet',
			'--provider',
			'provider_v2_route_report_codex',
			'--model',
			'codex-smoke',
			'--status',
			'passed',
			'--result',
			'Packet route evidence passed.'
		]);
		runCoreCli([
			'record-evaluation-result',
			...baseArgs,
			'--id',
			'evaluation_result_v2_route_report_retrieval',
			'--scenario',
			'evaluation_scenario_v2_route_report_retrieval',
			'--task',
			'task_v2_route_report_retrieval',
			'--run',
			'run_v2_route_report_retrieval',
			'--tool-execution',
			'tool_execution_v2_route_report_retrieval',
			'--provider',
			'provider_v2_route_report_codex',
			'--model',
			'codex-smoke',
			'--status',
			'passed',
			'--result',
			'Retrieval evidence passed.'
		]);

		const report = runCoreCli([
			'route-comparison-report',
			...baseArgs,
			'--project',
			'project_v2_route_report_smoke'
		]);
		expect(report.routeComparisonReport.summary).toMatchObject({
			capabilityCount: 3,
			comparisonReadyCount: 1,
			needsMoreRouteEvidenceCount: 1,
			deferCount: 1,
			routeSelectionDecisionCount: 3
		});
		expect(report.routeComparisonReport.capabilities).toEqual([
			expect.objectContaining({
				capabilityName: 'agent-work-packet',
				routeSelectionDecisionCount: 2,
				selectedProviderIds: ['provider_v2_route_report_codex', 'provider_v2_route_report_local'],
				selectedModelIds: ['codex-smoke', 'local-smoke'],
				selectedRoutes: ['external-ai', 'local-model'],
				evaluationResultIds: ['evaluation_result_v2_route_report_packet'],
				dependencyStatus: 'hybrid_candidate',
				evidenceGaps: [],
				recommendation: 'comparison_ready'
			}),
			expect.objectContaining({
				capabilityName: 'local-retrieval',
				routeSelectionDecisionCount: 0,
				evaluationResultIds: ['evaluation_result_v2_route_report_retrieval'],
				dependencyStatus: 'hybrid_candidate',
				evidenceGaps: expect.arrayContaining([
					'No route-selection decision is available for this capability in scope.'
				]),
				recommendation: 'needs_more_route_evidence'
			}),
			expect.objectContaining({
				capabilityName: 'route-only-capability',
				routeSelectionDecisionCount: 1,
				evaluationResultIds: [],
				dependencyStatus: null,
				evidenceGaps: expect.arrayContaining([
					'Only one route-selection decision is available; comparison needs repeated evidence.',
					'No evaluation result is available for this capability in scope.'
				]),
				recommendation: 'defer'
			})
		]);

		const agentReport = runCoreCli([
			'agent-control',
			...baseArgs,
			'--agent-action',
			'route-comparison-report',
			'--project',
			'project_v2_route_report_smoke'
		]);
		expect(agentReport.agentControl).toMatchObject({
			action: 'route-comparison-report',
			routeComparisonReport: {
				scope: {
					projectId: 'project_v2_route_report_smoke',
					goalId: null,
					taskId: null
				},
				summary: {
					comparisonReadyCount: 1,
					needsMoreRouteEvidenceCount: 1,
					deferCount: 1
				}
			}
		});
	}, 20_000);

	it('runs one minimal core task through run, artifact, review, decision, and memory evidence', () => {
		const dbFile = createTempDbFile();
		const baseArgs = ['--db', dbFile, '--json'];

		const initialized = runCoreCli(['init', ...baseArgs, '--reset']);
		expect(initialized.dbFile).toBe(dbFile);
		expect(initialized.overview.projects).toEqual([]);

		const project = runCoreCli([
			'create-project',
			...baseArgs,
			'--id',
			'project_v2_core_smoke',
			'--name',
			'AMS v2 Core Smoke',
			'--summary',
			'Temporary project for proving the v2 core loop.'
		]);
		expect(project.project).toMatchObject({
			id: 'project_v2_core_smoke',
			status: 'active'
		});

		const goal = runCoreCli([
			'create-goal',
			...baseArgs,
			'--id',
			'goal_v2_core_smoke',
			'--project',
			'project_v2_core_smoke',
			'--title',
			'Prove v2 core loop',
			'--summary',
			'Use the isolated core schema for one work loop.',
			'--success',
			'The task has run, artifact, review, decision, and memory evidence.'
		]);
		expect(goal.goal).toMatchObject({
			id: 'goal_v2_core_smoke',
			project_id: 'project_v2_core_smoke',
			status: 'active'
		});

		const task = runCoreCli([
			'create-task',
			...baseArgs,
			'--id',
			'task_v2_core_smoke',
			'--goal',
			'goal_v2_core_smoke',
			'--title',
			'Exercise v2 core CLI loop',
			'--summary',
			'Create durable evidence using only first-slice v2 core entities.',
			'--success',
			'Inspect-task returns linked run, artifact, review, decision, and memory records.',
			'--validation',
			'Run this CLI smoke test.'
		]);
		expect(task.taskDetail.task).toMatchObject({
			id: 'task_v2_core_smoke',
			status: 'ready'
		});

		const nextWork = runCoreCli(['next-work', ...baseArgs, '--goal', 'goal_v2_core_smoke']);
		expect(nextWork.candidates).toEqual([
			expect.objectContaining({
				taskId: 'task_v2_core_smoke',
				action: 'start_task'
			})
		]);

		const context = runCoreCli(['context-bundle', ...baseArgs, '--task', 'task_v2_core_smoke']);
		expect(context.context.readiness).toMatchObject({
			status: 'ready',
			canStart: true
		});
		expect(context.context.includedSources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ recordType: 'task', recordId: 'task_v2_core_smoke' }),
				expect.objectContaining({ recordType: 'goal', recordId: 'goal_v2_core_smoke' })
			])
		);

		const started = runCoreCli([
			'transition-task',
			...baseArgs,
			'--id',
			'decision_v2_core_smoke_started',
			'--task',
			'task_v2_core_smoke',
			'--status',
			'in_progress',
			'--summary',
			'Start the v2 core smoke task.'
		]);
		expect(started.taskDetail.task.status).toBe('in_progress');

		const provider = runCoreCli([
			'register-provider',
			...baseArgs,
			'--id',
			'provider_v2_core_smoke',
			'--name',
			'Codex smoke provider',
			'--kind',
			'external_ai'
		]);
		expect(provider.modelProvider).toMatchObject({
			id: 'provider_v2_core_smoke',
			kind: 'external_ai',
			status: 'available'
		});

		const tool = runCoreCli([
			'register-tool',
			...baseArgs,
			'--id',
			'tool_v2_core_smoke_cli',
			'--name',
			'v2 core CLI smoke tool',
			'--description',
			'Local CLI command used by the smoke test.',
			'--kind',
			'local_cli',
			'--risk',
			'low'
		]);
		expect(tool.tool).toMatchObject({
			id: 'tool_v2_core_smoke_cli',
			kind: 'local_cli',
			risk_level: 'low',
			approval_requirement: 'none'
		});

		const run = runCoreCli([
			'record-run',
			...baseArgs,
			'--id',
			'run_v2_core_smoke',
			'--task',
			'task_v2_core_smoke',
			'--provider',
			'provider_v2_core_smoke',
			'--action',
			'Executed the v2 core CLI smoke sequence.',
			'--result',
			'The core loop produced durable run evidence.',
			'--validation',
			'CLI commands returned JSON readbacks.'
		]);
		expect(run.taskDetail.runs).toEqual([
			expect.objectContaining({
				id: 'run_v2_core_smoke',
				status: 'completed',
				modelProviderId: 'provider_v2_core_smoke',
				modelProviderKind: 'external_ai'
			})
		]);

		const toolExecution = runCoreCli([
			'record-tool-execution',
			...baseArgs,
			'--id',
			'tool_execution_v2_core_smoke_cli',
			'--tool',
			'tool_v2_core_smoke_cli',
			'--task',
			'task_v2_core_smoke',
			'--run',
			'run_v2_core_smoke',
			'--input',
			'Ran v2 core smoke CLI commands.',
			'--result',
			'Commands produced expected JSON readbacks.'
		]);
		expect(toolExecution.taskDetail.toolExecutions).toEqual([
			expect.objectContaining({
				id: 'tool_execution_v2_core_smoke_cli',
				toolId: 'tool_v2_core_smoke_cli',
				toolName: 'v2 core CLI smoke tool',
				runId: 'run_v2_core_smoke',
				status: 'completed'
			})
		]);

		const dependencyReport = runCoreCli([
			'dependency-report',
			...baseArgs,
			'--task',
			'task_v2_core_smoke'
		]);
		expect(dependencyReport.dependencyReport.summary).toMatchObject({
			runCount: 1,
			providerRunCount: 1,
			toolExecutionCount: 1
		});
		expect(dependencyReport.dependencyReport.modelProviders).toEqual([
			expect.objectContaining({
				providerId: 'provider_v2_core_smoke',
				kind: 'external_ai',
				runCount: 1,
				taskIds: ['task_v2_core_smoke']
			})
		]);
		expect(dependencyReport.dependencyReport.toolExecutions).toEqual([
			expect.objectContaining({
				executionId: 'tool_execution_v2_core_smoke_cli',
				toolId: 'tool_v2_core_smoke_cli',
				taskId: 'task_v2_core_smoke',
				runId: 'run_v2_core_smoke'
			})
		]);

		const evaluationScenario = runCoreCli([
			'register-evaluation-scenario',
			...baseArgs,
			'--id',
			'evaluation_scenario_v2_core_smoke_packet',
			'--project',
			'project_v2_core_smoke',
			'--title',
			'V2 core smoke work packet is source-linked',
			'--capability',
			'agent-work-packet',
			'--prompt',
			'Build a bounded work packet for a ready follow-up task.',
			'--rubric',
			'Packet includes task, goal, source-linked evidence, memory, dependency, and evaluation context.',
			'--version',
			'v1'
		]);
		expect(evaluationScenario.evaluationScenario).toMatchObject({
			id: 'evaluation_scenario_v2_core_smoke_packet',
			projectId: 'project_v2_core_smoke',
			title: 'V2 core smoke work packet is source-linked',
			capabilityName: 'agent-work-packet',
			status: 'active',
			version: 'v1',
			sourceReferences: [
				expect.objectContaining({
					recordTable: 'v2_core_evaluation_scenarios',
					sourceCollection: 'v2_core_evaluation_scenarios',
					sourceId: 'evaluation_scenario_v2_core_smoke_packet'
				})
			]
		});

		const dependencyReductionBeforeResult = runCoreCli([
			'dependency-reduction-report',
			...baseArgs,
			'--project',
			'project_v2_core_smoke'
		]);
		expect(dependencyReductionBeforeResult.dependencyReductionReport.summary).toMatchObject({
			capabilityCount: 1,
			unknownCount: 1
		});
		expect(dependencyReductionBeforeResult.dependencyReductionReport.capabilities).toEqual([
			expect.objectContaining({
				capabilityName: 'agent-work-packet',
				status: 'unknown',
				scenarioIds: ['evaluation_scenario_v2_core_smoke_packet'],
				evaluationResultIds: [],
				evidenceGaps: expect.arrayContaining([
					'No evaluation result has been recorded for this capability in scope.'
				])
			})
		]);

		const evaluationResult = runCoreCli([
			'record-evaluation-result',
			...baseArgs,
			'--id',
			'evaluation_result_v2_core_smoke_packet',
			'--scenario',
			'evaluation_scenario_v2_core_smoke_packet',
			'--task',
			'task_v2_core_smoke',
			'--run',
			'run_v2_core_smoke',
			'--tool-execution',
			'tool_execution_v2_core_smoke_cli',
			'--provider',
			'provider_v2_core_smoke',
			'--model',
			'codex-smoke-model',
			'--status',
			'passed',
			'--score',
			'0.9',
			'--rubric',
			'Smoke packet evidence is source-linked and bounded.',
			'--result',
			'The v2 core smoke capability produced sufficient source-linked evidence.'
		]);
		expect(evaluationResult.result).toMatchObject({
			id: 'evaluation_result_v2_core_smoke_packet',
			scenarioId: 'evaluation_scenario_v2_core_smoke_packet',
			scenarioTitle: 'V2 core smoke work packet is source-linked',
			taskId: 'task_v2_core_smoke',
			runId: 'run_v2_core_smoke',
			toolExecutionId: 'tool_execution_v2_core_smoke_cli',
			providerId: 'provider_v2_core_smoke',
			modelId: 'codex-smoke-model',
			status: 'passed',
			score: 0.9
		});
		expect(evaluationResult.evaluationContext.results).toEqual([
			expect.objectContaining({
				id: 'evaluation_result_v2_core_smoke_packet',
				status: 'passed'
			})
		]);

		const evaluationContext = runCoreCli([
			'evaluation-context',
			...baseArgs,
			'--task',
			'task_v2_core_smoke'
		]);
		expect(evaluationContext.evaluationContext).toMatchObject({
			scope: {
				projectId: 'project_v2_core_smoke',
				taskId: 'task_v2_core_smoke'
			}
		});
		expect(evaluationContext.evaluationContext.scenarios).toEqual([
			expect.objectContaining({
				id: 'evaluation_scenario_v2_core_smoke_packet'
			})
		]);
		expect(evaluationContext.evaluationContext.results).toEqual([
			expect.objectContaining({
				id: 'evaluation_result_v2_core_smoke_packet'
			})
		]);

		const dependencyReductionReport = runCoreCli([
			'dependency-reduction-report',
			...baseArgs,
			'--project',
			'project_v2_core_smoke'
		]);
		expect(dependencyReductionReport.dependencyReductionReport.summary).toMatchObject({
			capabilityCount: 1,
			hybridCandidateCount: 1,
			unknownCount: 0
		});
		expect(dependencyReductionReport.dependencyReductionReport.capabilities).toEqual([
			expect.objectContaining({
				capabilityName: 'agent-work-packet',
				status: 'hybrid_candidate',
				scenarioIds: ['evaluation_scenario_v2_core_smoke_packet'],
				evaluationResultIds: ['evaluation_result_v2_core_smoke_packet'],
				taskIds: ['task_v2_core_smoke'],
				externalProviderIds: ['provider_v2_core_smoke'],
				localToolIds: ['tool_v2_core_smoke_cli'],
				evaluationResults: [
					expect.objectContaining({
						resultId: 'evaluation_result_v2_core_smoke_packet',
						providerId: 'provider_v2_core_smoke',
						toolExecutionId: 'tool_execution_v2_core_smoke_cli',
						status: 'passed'
					})
				]
			})
		]);

		const artifact = runCoreCli([
			'attach-artifact',
			...baseArgs,
			'--id',
			'artifact_v2_core_smoke',
			'--task',
			'task_v2_core_smoke',
			'--run',
			'run_v2_core_smoke',
			'--uri',
			'agent_output/v2-core-smoke.md',
			'--title',
			'V2 core smoke evidence',
			'--summary',
			'Placeholder artifact path proving registry behavior.'
		]);
		expect(artifact.taskDetail.artifacts).toEqual([
			expect.objectContaining({
				id: 'artifact_v2_core_smoke',
				role: 'output',
				status: 'submitted'
			})
		]);

		const sidecarArtifact = runCoreCli([
			'attach-artifact',
			...baseArgs,
			'--id',
			'artifact_v2_core_smoke_sidecar',
			'--task',
			'task_v2_core_smoke',
			'--run',
			'run_v2_core_smoke',
			'--uri',
			'agent_output/v2-core-smoke-sidecar.md',
			'--title',
			'V2 core smoke sidecar evidence',
			'--summary',
			'Additional submitted artifact that should be accepted with the task output.'
		]);
		expect(sidecarArtifact.taskDetail.artifacts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'artifact_v2_core_smoke',
					status: 'submitted'
				}),
				expect.objectContaining({
					id: 'artifact_v2_core_smoke_sidecar',
					status: 'submitted'
				})
			])
		);

		const unreviewed = runCoreCli(['unreviewed-outputs', ...baseArgs]);
		expect(unreviewed.outputs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					artifactId: 'artifact_v2_core_smoke',
					taskId: 'task_v2_core_smoke'
				}),
				expect.objectContaining({
					artifactId: 'artifact_v2_core_smoke_sidecar',
					taskId: 'task_v2_core_smoke'
				})
			])
		);

		const readyForReview = runCoreCli([
			'transition-task',
			...baseArgs,
			'--id',
			'decision_v2_core_smoke_review',
			'--task',
			'task_v2_core_smoke',
			'--run',
			'run_v2_core_smoke',
			'--status',
			'review',
			'--summary',
			'Move completed run evidence into review.'
		]);
		expect(readyForReview.taskDetail.task.status).toBe('review');

		const review = runCoreCli([
			'record-review',
			...baseArgs,
			'--id',
			'review_v2_core_smoke',
			'--task',
			'task_v2_core_smoke',
			'--run',
			'run_v2_core_smoke',
			'--artifact',
			'artifact_v2_core_smoke',
			'--summary',
			'Smoke evidence is sufficient for the minimal v2 core loop.'
		]);
		expect(review.taskDetail.reviews).toEqual([
			expect.objectContaining({
				id: 'review_v2_core_smoke',
				status: 'approved'
			})
		]);
		expect(review.taskDetail.artifacts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'artifact_v2_core_smoke',
					status: 'accepted'
				}),
				expect.objectContaining({
					id: 'artifact_v2_core_smoke_sidecar',
					status: 'submitted'
				})
			])
		);

		const doneWithoutAcceptance = runCoreCliFailure([
			'transition-task',
			...baseArgs,
			'--id',
			'decision_v2_core_smoke_done_too_early',
			'--task',
			'task_v2_core_smoke',
			'--run',
			'run_v2_core_smoke',
			'--status',
			'done',
			'--summary',
			'Try to close without acceptance.'
		]);
		expect(doneWithoutAcceptance.stderr).toContain('accept_task_output decision');

		const decision = runCoreCli([
			'record-decision',
			...baseArgs,
			'--id',
			'decision_v2_core_smoke',
			'--task',
			'task_v2_core_smoke',
			'--run',
			'run_v2_core_smoke',
			'--review',
			'review_v2_core_smoke',
			'--type',
			'accept_task_output',
			'--summary',
			'Accept the minimal v2 core smoke output.',
			'--rationale',
			'The output has run, artifact, and approved review evidence.'
		]);
		expect(decision.result.decisions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'decision_v2_core_smoke',
					decisionType: 'accept_task_output'
				})
			])
		);
		expect(decision.result.artifacts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'artifact_v2_core_smoke',
					status: 'accepted'
				}),
				expect.objectContaining({
					id: 'artifact_v2_core_smoke_sidecar',
					status: 'accepted'
				})
			])
		);

		const unreviewedAfterAcceptance = runCoreCli(['unreviewed-outputs', ...baseArgs]);
		expect(unreviewedAfterAcceptance.outputs).toEqual([]);

		const done = runCoreCli([
			'transition-task',
			...baseArgs,
			'--id',
			'decision_v2_core_smoke_done',
			'--task',
			'task_v2_core_smoke',
			'--run',
			'run_v2_core_smoke',
			'--status',
			'done',
			'--summary',
			'Close the task after accepted review evidence.'
		]);
		expect(done.taskDetail.task.status).toBe('done');

		const trustedMemoryWithoutReview = runCoreCliFailure([
			'promote-memory',
			...baseArgs,
			'--id',
			'memory_v2_core_smoke_without_review',
			'--project',
			'project_v2_core_smoke',
			'--title',
			'Invalid trusted memory',
			'--body',
			'This should not become trusted without approved review evidence.',
			'--source-table',
			'v2_core_decisions',
			'--source-id',
			'decision_v2_core_smoke',
			'--source-reason',
			'Decision alone should not be enough for trusted memory.'
		]);
		expect(trustedMemoryWithoutReview.stderr).toContain('approved review source');

		const memory = runCoreCli([
			'promote-memory',
			...baseArgs,
			'--id',
			'memory_v2_core_smoke',
			'--project',
			'project_v2_core_smoke',
			'--title',
			'V2 core loop smoke passed',
			'--body',
			'The v2 core CLI can record first-slice goal-directed work evidence.',
			'--source-table',
			'v2_core_reviews',
			'--source-id',
			'review_v2_core_smoke',
			'--source-reason',
			'Approved review is the evidence gate for memory promotion.'
		]);
		expect(memory.memoryItem).toMatchObject({
			id: 'memory_v2_core_smoke',
			status: 'trusted'
		});

		const followup = runCoreCli([
			'create-followup-task',
			...baseArgs,
			'--id',
			'task_v2_core_smoke_followup',
			'--task',
			'task_v2_core_smoke',
			'--title',
			'Continue after v2 core smoke',
			'--summary',
			'Verify continuation can use reviewed memory and next-work selection.',
			'--success',
			'The follow-up appears in next-work and can retrieve trusted project memory.',
			'--validation',
			'Run memory-for-context and next-work readbacks.',
			'--rationale',
			'The first task completed and produced trusted memory that should inform the next task.'
		]);
		expect(followup.taskDetail.task).toMatchObject({
			id: 'task_v2_core_smoke_followup',
			status: 'ready'
		});
		expect(followup.taskDetail.lineage).toMatchObject({
			sourceTaskId: 'task_v2_core_smoke',
			sourceTaskTitle: 'Exercise v2 core CLI loop'
		});

		const taskDependency = runCoreCli([
			'record-task-dependency',
			...baseArgs,
			'--id',
			'task_dependency_v2_core_smoke_followup_after_smoke',
			'--task',
			'task_v2_core_smoke_followup',
			'--depends-on',
			'task_v2_core_smoke',
			'--status',
			'resolved',
			'--rationale',
			'The follow-up depends on the completed smoke task evidence.'
		]);
		expect(taskDependency.taskDetail.dependencies).toEqual([
			expect.objectContaining({
				id: 'task_dependency_v2_core_smoke_followup_after_smoke',
				taskId: 'task_v2_core_smoke_followup',
				dependsOnTaskId: 'task_v2_core_smoke',
				dependsOnTaskTitle: 'Exercise v2 core CLI loop',
				status: 'resolved',
				reason: 'The follow-up depends on the completed smoke task evidence.'
			})
		]);
		const duplicateTaskDependency = runCoreCliFailure([
			'record-task-dependency',
			...baseArgs,
			'--task',
			'task_v2_core_smoke_followup',
			'--depends-on',
			'task_v2_core_smoke',
			'--rationale',
			'Duplicate dependency should fail.'
		]);
		expect(duplicateTaskDependency.stderr).toContain('already links');

		const wrongRunEvaluation = runCoreCliFailure([
			'record-evaluation-result',
			...baseArgs,
			'--scenario',
			'evaluation_scenario_v2_core_smoke_packet',
			'--task',
			'task_v2_core_smoke_followup',
			'--run',
			'run_v2_core_smoke',
			'--result',
			'Wrong task link should fail.'
		]);
		expect(wrongRunEvaluation.stderr).toContain('does not belong to task');

		const wrongRunArtifact = runCoreCliFailure([
			'attach-artifact',
			...baseArgs,
			'--id',
			'artifact_v2_core_smoke_wrong_run',
			'--task',
			'task_v2_core_smoke_followup',
			'--run',
			'run_v2_core_smoke',
			'--uri',
			'agent_output/v2-core-smoke-wrong-run.md',
			'--title',
			'Wrong-run artifact'
		]);
		expect(wrongRunArtifact.stderr).toContain('does not belong to task');

		const wrongRunReview = runCoreCliFailure([
			'record-review',
			...baseArgs,
			'--id',
			'review_v2_core_smoke_wrong_run',
			'--task',
			'task_v2_core_smoke_followup',
			'--run',
			'run_v2_core_smoke',
			'--summary',
			'Wrong-run review should fail.'
		]);
		expect(wrongRunReview.stderr).toContain('does not belong to task');

		const wrongArtifactReview = runCoreCliFailure([
			'record-review',
			...baseArgs,
			'--id',
			'review_v2_core_smoke_wrong_artifact',
			'--task',
			'task_v2_core_smoke_followup',
			'--artifact',
			'artifact_v2_core_smoke',
			'--summary',
			'Wrong-artifact review should fail.'
		]);
		expect(wrongArtifactReview.stderr).toContain('does not belong to task');

		const wrongRunDecision = runCoreCliFailure([
			'record-decision',
			...baseArgs,
			'--id',
			'decision_v2_core_smoke_wrong_run',
			'--task',
			'task_v2_core_smoke_followup',
			'--run',
			'run_v2_core_smoke',
			'--type',
			'implementation_decision',
			'--summary',
			'Wrong-run decision should fail.'
		]);
		expect(wrongRunDecision.stderr).toContain('does not belong to task');

		const wrongReviewDecision = runCoreCliFailure([
			'record-decision',
			...baseArgs,
			'--id',
			'decision_v2_core_smoke_wrong_review',
			'--task',
			'task_v2_core_smoke_followup',
			'--review',
			'review_v2_core_smoke',
			'--type',
			'implementation_decision',
			'--summary',
			'Wrong-review decision should fail.'
		]);
		expect(wrongReviewDecision.stderr).toContain('does not belong to task');

		const followupArtifact = runCoreCli([
			'attach-artifact',
			...baseArgs,
			'--id',
			'artifact_v2_core_smoke_followup_same_uri',
			'--task',
			'task_v2_core_smoke_followup',
			'--uri',
			'agent_output/v2-core-smoke.md',
			'--title',
			'V2 core smoke follow-up evidence',
			'--summary',
			'Same URI can appear in multiple task/run artifact records.'
		]);
		expect(followupArtifact.taskDetail.artifacts).toEqual([
			expect.objectContaining({
				id: 'artifact_v2_core_smoke_followup_same_uri',
				uri: 'agent_output/v2-core-smoke.md'
			})
		]);

		const memoryForContext = runCoreCli([
			'memory-for-context',
			...baseArgs,
			'--task',
			'task_v2_core_smoke_followup'
		]);
		expect(memoryForContext.memory.items).toEqual([
			expect.objectContaining({
				id: 'memory_v2_core_smoke',
				status: 'trusted'
			})
		]);

		const agentWorkPacket = runCoreCli([
			'agent-work-packet',
			...baseArgs,
			'--task',
			'task_v2_core_smoke_followup'
		]);
		expect(agentWorkPacket.agentWorkPacket.taskContract).toMatchObject({
			taskId: 'task_v2_core_smoke_followup',
			title: 'Continue after v2 core smoke',
			status: 'ready',
			project: {
				id: 'project_v2_core_smoke',
				name: 'AMS v2 Core Smoke'
			},
			goal: {
				id: 'goal_v2_core_smoke',
				title: 'Prove v2 core loop'
			}
		});
		expect(agentWorkPacket.agentWorkPacket.readiness).toMatchObject({
			actionable: true,
			recommendedAction: 'start_task'
		});
		expect(agentWorkPacket.agentWorkPacket.contextSources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ recordType: 'task', recordId: 'task_v2_core_smoke_followup' }),
				expect.objectContaining({ recordType: 'goal', recordId: 'goal_v2_core_smoke' }),
				expect.objectContaining({ recordType: 'memory', recordId: 'memory_v2_core_smoke' })
			])
		);
		expect(agentWorkPacket.agentWorkPacket.trustedMemory).toEqual([
			expect.objectContaining({
				id: 'memory_v2_core_smoke',
				status: 'trusted'
			})
		]);
		expect(agentWorkPacket.agentWorkPacket.recentEvidence.recentProjectRuns).toEqual([
			expect.objectContaining({
				runId: 'run_v2_core_smoke',
				taskId: 'task_v2_core_smoke'
			})
		]);
		expect(agentWorkPacket.agentWorkPacket.dependencySummary).toMatchObject({
			runCount: 1,
			providerRunCount: 1,
			toolExecutionCount: 1,
			modelProviders: [
				expect.objectContaining({
					providerId: 'provider_v2_core_smoke',
					kind: 'external_ai'
				})
			],
			toolExecutions: [
				expect.objectContaining({
					executionId: 'tool_execution_v2_core_smoke_cli'
				})
			]
		});
		expect(agentWorkPacket.agentWorkPacket.evaluationEvidence).toMatchObject({
			scenarios: [
				expect.objectContaining({
					id: 'evaluation_scenario_v2_core_smoke_packet'
				})
			],
			results: [
				expect.objectContaining({
					id: 'evaluation_result_v2_core_smoke_packet',
					status: 'passed'
				})
			]
		});
		expect(agentWorkPacket.agentWorkPacket.allowedActions).toContain(
			'implement the bounded task contract'
		);
		expect(agentWorkPacket.agentWorkPacket.stoppingConditions).toEqual(
			expect.arrayContaining([
				expect.stringContaining('schema, entity, lifecycle, or workflow expansion')
			])
		);
		expect(agentWorkPacket.agentWorkPacket.sourceLinks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ recordType: 'project', recordId: 'project_v2_core_smoke' }),
				expect.objectContaining({ recordType: 'goal', recordId: 'goal_v2_core_smoke' }),
				expect.objectContaining({ recordType: 'task', recordId: 'task_v2_core_smoke_followup' }),
				expect.objectContaining({ recordType: 'memory', recordId: 'memory_v2_core_smoke' }),
				expect.objectContaining({
					recordType: 'model_provider',
					recordId: 'provider_v2_core_smoke'
				}),
				expect.objectContaining({
					recordType: 'evaluation_scenario',
					recordId: 'evaluation_scenario_v2_core_smoke_packet'
				}),
				expect.objectContaining({
					recordType: 'evaluation_result',
					recordId: 'evaluation_result_v2_core_smoke_packet'
				})
			])
		);
		expect(agentWorkPacket.agentWorkPacket.renderedPrompt).toContain('Evaluation evidence:');
		expect(agentWorkPacket.agentWorkPacket.renderedPrompt).toContain(
			'Task: Continue after v2 core smoke'
		);
		expect(agentWorkPacket.agentWorkPacket.renderedPrompt.length).toBeLessThanOrEqual(4000);

		const nextWorkAfterFollowup = runCoreCli([
			'next-work',
			...baseArgs,
			'--goal',
			'goal_v2_core_smoke'
		]);
		expect(nextWorkAfterFollowup.candidates).toEqual([
			expect.objectContaining({
				taskId: 'task_v2_core_smoke_followup',
				action: 'start_task'
			})
		]);

		const operatorConsole = runCoreCli([
			'operator-console',
			...baseArgs,
			'--project',
			'project_v2_core_smoke'
		]);
		expect(operatorConsole.operatorConsole.scope).toEqual({
			projectId: 'project_v2_core_smoke',
			goalId: null
		});
		expect(operatorConsole.operatorConsole.activeGoals).toEqual([
			expect.objectContaining({
				goalId: 'goal_v2_core_smoke',
				openTaskCount: 1,
				doneTaskCount: 1
			})
		]);
		expect(operatorConsole.operatorConsole.nextWork.candidates).toEqual([
			expect.objectContaining({
				taskId: 'task_v2_core_smoke_followup',
				action: 'start_task'
			})
		]);
		expect(operatorConsole.operatorConsole.reviewQueue).toEqual([
			expect.objectContaining({
				artifactId: 'artifact_v2_core_smoke_followup_same_uri',
				taskId: 'task_v2_core_smoke_followup'
			})
		]);
		expect(operatorConsole.operatorConsole.memory.items).toEqual([
			expect.objectContaining({
				id: 'memory_v2_core_smoke',
				status: 'trusted'
			})
		]);
		expect(operatorConsole.operatorConsole.dependencyReport.summary).toMatchObject({
			runCount: 1,
			providerRunCount: 1,
			toolExecutionCount: 1
		});
		expect(operatorConsole.operatorConsole.evaluationContext.scenarios).toEqual([
			expect.objectContaining({
				id: 'evaluation_scenario_v2_core_smoke_packet'
			})
		]);
		expect(operatorConsole.operatorConsole.evaluationContext.results).toEqual([
			expect.objectContaining({
				id: 'evaluation_result_v2_core_smoke_packet',
				status: 'passed'
			})
		]);
		expect(operatorConsole.operatorConsole.recentRuns).toEqual([
			expect.objectContaining({
				runId: 'run_v2_core_smoke',
				taskId: 'task_v2_core_smoke',
				modelProviderId: 'provider_v2_core_smoke'
			})
		]);
		expect(operatorConsole.operatorConsole.recentArtifacts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					artifactId: 'artifact_v2_core_smoke_followup_same_uri',
					status: 'submitted'
				})
			])
		);
		expect(operatorConsole.operatorConsole.snapshotStatus).toMatchObject({
			format: 'ams-v2-core-snapshot-v1',
			tableCounts: expect.objectContaining({
				v2_core_projects: 1,
				v2_core_goals: 1,
				v2_core_tasks: 2,
				v2_core_task_dependencies: 1,
				v2_core_runs: 1,
				v2_core_artifacts: 3,
				v2_core_evaluation_scenarios: 1,
				v2_core_evaluation_results: 1
			})
		});

		const inspect = runCoreCli(['inspect-task', ...baseArgs, '--task', 'task_v2_core_smoke']);
		expect(inspect.taskDetail.task.id).toBe('task_v2_core_smoke');
		expect(inspect.taskDetail.lineage.followupTaskIds).toEqual(['task_v2_core_smoke_followup']);
		expect(inspect.taskDetail.dependencies).toEqual([]);
		expect(inspect.taskDetail.runs).toHaveLength(1);
		expect(inspect.taskDetail.toolExecutions).toHaveLength(1);
		expect(inspect.taskDetail.artifacts).toHaveLength(2);
		expect(inspect.taskDetail.reviews).toHaveLength(1);
		expect(inspect.taskDetail.decisions).toHaveLength(4);
		expect(inspect.taskDetail.memoryItems).toEqual([
			expect.objectContaining({
				id: 'memory_v2_core_smoke',
				status: 'trusted'
			})
		]);
		const inspectFollowup = runCoreCli([
			'inspect-task',
			...baseArgs,
			'--task',
			'task_v2_core_smoke_followup'
		]);
		expect(inspectFollowup.taskDetail.dependencies).toEqual([
			expect.objectContaining({
				id: 'task_dependency_v2_core_smoke_followup_after_smoke',
				dependsOnTaskId: 'task_v2_core_smoke',
				status: 'resolved'
			})
		]);

		const overview = runCoreCli(['overview', ...baseArgs]);
		expect(overview.projects).toEqual([
			expect.objectContaining({
				id: 'project_v2_core_smoke',
				goalCount: 1,
				taskCount: 2,
				runCount: 1,
				artifactCount: 3,
				memoryItemCount: 1
			})
		]);
		expect(overview.taskStatusCounts).toEqual({ done: 1, ready: 1 });
		expect(overview.reviewStatusCounts).toEqual({ approved: 1 });
		expect(overview.memoryStatusCounts).toEqual({ trusted: 1 });

		const snapshotFile = join(dirname(dbFile), 'v2-core-snapshot.json');
		const secondSnapshotFile = join(dirname(dbFile), 'v2-core-snapshot-again.json');
		const exported = runCoreCli(['export-snapshot', ...baseArgs, '--file', snapshotFile]);
		const exportedAgain = runCoreCli([
			'export-snapshot',
			...baseArgs,
			'--file',
			secondSnapshotFile
		]);
		expect(exported.format).toBe('ams-v2-core-snapshot-v1');
		expect(exported.tableCounts).toMatchObject({
			v2_core_projects: 1,
			v2_core_goals: 1,
			v2_core_tasks: 2,
			v2_core_runs: 1,
			v2_core_artifacts: 3,
			v2_core_reviews: 1,
			v2_core_decisions: 5,
			v2_core_memory_items: 1,
			v2_core_memory_item_sources: 1,
			v2_core_model_providers: 1,
			v2_core_tools: 1,
			v2_core_tool_executions: 1,
			v2_core_evaluation_scenarios: 1,
			v2_core_evaluation_results: 1
		});
		expect(exportedAgain.tableCounts).toEqual(exported.tableCounts);
		expect(readFileSync(secondSnapshotFile, 'utf8')).toBe(readFileSync(snapshotFile, 'utf8'));

		const importIntoNonEmpty = runCoreCliFailure([
			'import-snapshot',
			...baseArgs,
			'--file',
			snapshotFile
		]);
		expect(importIntoNonEmpty.stderr).toContain('not empty');

		const importedDbFile = join(dirname(dbFile), 'v2-core-imported.sqlite');
		const importedBaseArgs = ['--db', importedDbFile, '--json'];
		const imported = runCoreCli(['import-snapshot', ...importedBaseArgs, '--file', snapshotFile]);
		expect(imported.overview).toEqual(overview);

		const importedInspect = runCoreCli([
			'inspect-task',
			...importedBaseArgs,
			'--task',
			'task_v2_core_smoke'
		]);
		expect(importedInspect.taskDetail.task.status).toBe('done');
		expect(importedInspect.taskDetail.runs).toHaveLength(1);
		expect(importedInspect.taskDetail.toolExecutions).toHaveLength(1);
		expect(importedInspect.taskDetail.artifacts).toHaveLength(2);
		expect(importedInspect.taskDetail.reviews).toHaveLength(1);
		expect(importedInspect.taskDetail.dependencies).toEqual([]);
		expect(importedInspect.taskDetail.memoryItems).toEqual([
			expect.objectContaining({
				id: 'memory_v2_core_smoke',
				status: 'trusted'
			})
		]);
		const importedFollowupInspect = runCoreCli([
			'inspect-task',
			...importedBaseArgs,
			'--task',
			'task_v2_core_smoke_followup'
		]);
		expect(importedFollowupInspect.taskDetail.dependencies).toEqual([
			expect.objectContaining({
				id: 'task_dependency_v2_core_smoke_followup_after_smoke',
				dependsOnTaskId: 'task_v2_core_smoke',
				status: 'resolved'
			})
		]);
		const importedEvaluationContext = runCoreCli([
			'evaluation-context',
			...importedBaseArgs,
			'--task',
			'task_v2_core_smoke'
		]);
		expect(importedEvaluationContext.evaluationContext.results).toEqual([
			expect.objectContaining({
				id: 'evaluation_result_v2_core_smoke_packet',
				status: 'passed'
			})
		]);
	}, 15000);
});
