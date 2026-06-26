import { describe, expect, it } from 'vitest';
import { AMS_CLI_DOCS_PATH, buildAmsCliCommand } from './ams-cli-paths';
import { getAgentCapabilityManifest } from './agent-capability-manifest';

describe('agent-capability-manifest', () => {
	it('returns the full discovery manifest with task coverage', () => {
		const manifest = getAgentCapabilityManifest();

		expect(manifest.discovery.apiPath).toBe('/api/agent-capabilities');
		expect(manifest.discovery.currentContextApiPath).toBe('/api/agent-context/current');
		expect(manifest.discovery.cliCommand).toBe(buildAmsCliCommand('manifest'));
		expect(manifest.discovery.currentContextCliCommand).toBe(buildAmsCliCommand('context current'));
		expect(manifest.discovery.docsPath).toBe(AMS_CLI_DOCS_PATH);
		expect(manifest.guidance.reliableLoop).toEqual(
			expect.arrayContaining([
				expect.stringContaining('manifest discovery'),
				expect.stringContaining('resolve current context'),
				expect.stringContaining('After every mutation')
			])
		);
		expect(manifest.guidance.playbooks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					intent: 'create_task'
				}),
				expect.objectContaining({
					intent: 'prepare_task_for_approval'
				}),
				expect.objectContaining({
					intent: 'accept_child_handoff'
				}),
				expect.objectContaining({
					intent: 'reject_task_approval'
				}),
				expect.objectContaining({
					intent: 'request_child_handoff_changes'
				}),
				expect.objectContaining({
					intent: 'coordinate_with_another_thread'
				})
			])
		);
		expect(
			manifest.commands.find(
				(command) => command.resource === 'context' && command.command === 'current'
			)?.cli
		).toBe(
			buildAmsCliCommand('context current [--thread <threadId>] [--task <taskId>] [--run <runId>]')
		);
		expect(manifest.commands).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					resource: 'context',
					command: 'current',
					path: '/api/agent-context/current',
					whenToUse: expect.any(Array),
					nextCommands: expect.arrayContaining(['task:get', 'thread:panel']),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('Resolve current task and run'),
							input: expect.any(Object),
							output: expect.any(Object)
						})
					])
				}),
				expect.objectContaining({
					resource: 'context',
					command: 'get_relevant_prior_runs',
					path: '/api/agent-context/relevant-prior-runs',
					method: 'GET',
					payloadMode: 'none',
					whenToUse: expect.arrayContaining([expect.stringContaining('durable run evidence')]),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('prior runs')
						})
					])
				}),
				expect.objectContaining({
					resource: 'intent',
					command: 'prepare_task_for_review',
					whenToUse: expect.arrayContaining([expect.stringContaining('validateOnly=true')]),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('Preview review preparation'),
							input: expect.objectContaining({
								validateOnly: true
							})
						})
					])
				}),
				expect.objectContaining({
					resource: 'intent',
					command: 'prepare_task_for_approval',
					path: '/api/agent-intents/:intent',
					readAfter: expect.arrayContaining(['context:current']),
					whenToUse: expect.arrayContaining([expect.stringContaining('validateOnly=true')]),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('Open an approval gate')
						}),
						expect.objectContaining({
							title: expect.stringContaining('Preview approval preparation'),
							input: expect.objectContaining({
								validateOnly: true
							})
						})
					])
				}),
				expect.objectContaining({
					resource: 'intent',
					command: 'coordinate_with_another_thread',
					path: '/api/agent-intents/:intent',
					readAfter: expect.arrayContaining(['thread:contacts', 'context:current']),
					whenToUse: expect.arrayContaining([expect.stringContaining('validateOnly=true')]),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('Route a focused question')
						}),
						expect.objectContaining({
							title: expect.stringContaining('Preview thread coordination'),
							input: expect.objectContaining({
								validateOnly: true
							})
						})
					])
				}),
				expect.objectContaining({
					resource: 'goal-loop',
					command: 'get_next_recommended_action',
					path: '/api/agent-goal-loop/get_next_recommended_action',
					payloadMode: 'none',
					whenToUse: expect.arrayContaining([expect.stringContaining('single best next action')])
				}),
				expect.objectContaining({
					resource: 'goal-loop',
					command: 'explain_task_eligibility',
					path: '/api/agent-goal-loop/explain_task_eligibility',
					nextCommands: expect.arrayContaining(['task:get'])
				}),
				expect.objectContaining({
					resource: 'work-packet',
					command: 'get_agent_work_packet',
					path: '/api/agent-work-packets/get_agent_work_packet',
					payloadMode: 'none',
					whenToUse: expect.arrayContaining([expect.stringContaining('bounded packet')])
				}),
				expect.objectContaining({
					resource: 'run-result',
					command: 'record_run_result',
					path: '/api/agent-run-results/record_run_result',
					payloadMode: 'json_or_file',
					whenToUse: expect.arrayContaining([expect.stringContaining('run produced')]),
					nextCommands: expect.arrayContaining(['task:request-review'])
				}),
				expect.objectContaining({
					resource: 'run-result',
					command: 'record_blocker',
					path: '/api/agent-run-results/record_blocker',
					nextCommands: expect.arrayContaining(['task:update'])
				}),
				expect.objectContaining({
					resource: 'run-result',
					command: 'create_followup_task',
					path: '/api/agent-run-results/create_followup_task',
					whenToUse: expect.arrayContaining([expect.stringContaining('dedupes')]),
					nextCommands: expect.arrayContaining(['task:get'])
				}),
				expect.objectContaining({
					resource: 'run-result',
					command: 'request_review_from_run',
					path: '/api/agent-run-results/request_review_from_run',
					whenToUse: expect.arrayContaining([expect.stringContaining('validateOnly=true')]),
					nextCommands: expect.arrayContaining(['context:current'])
				}),
				expect.objectContaining({
					resource: 'run-result',
					command: 'mark_task_blocked_from_run',
					path: '/api/agent-run-results/mark_task_blocked_from_run',
					whenToUse: expect.arrayContaining([expect.stringContaining('blocker')]),
					nextCommands: expect.arrayContaining(['goal-loop:get_goal_blockers'])
				}),
				expect.objectContaining({
					resource: 'review',
					command: 'get_review_status',
					path: '/api/agent-reviews/get_review_status',
					payloadMode: 'none',
					whenToUse: expect.arrayContaining([expect.stringContaining('approve')]),
					nextCommands: expect.arrayContaining(['task:approve-review'])
				}),
				expect.objectContaining({
					resource: 'task',
					command: 'create',
					readAfter: expect.arrayContaining(['task:get'])
				}),
				expect.objectContaining({
					resource: 'intent',
					command: 'accept_child_handoff',
					whenToUse: expect.arrayContaining([expect.stringContaining('validateOnly=true')]),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('Preview acceptance')
						})
					])
				}),
				expect.objectContaining({
					resource: 'intent',
					command: 'request_child_handoff_changes',
					whenToUse: expect.arrayContaining([expect.stringContaining('validateOnly=true')]),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('Preview a child handoff')
						})
					])
				}),
				expect.objectContaining({
					resource: 'intent',
					command: 'reject_task_approval',
					whenToUse: expect.arrayContaining([expect.stringContaining('validateOnly=true')]),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('Preview rejection')
						})
					])
				}),
				expect.objectContaining({
					resource: 'task',
					command: 'launch-session',
					path: '/api/tasks/:taskId/session-launch'
				}),
				expect.objectContaining({
					resource: 'task',
					command: 'request-review',
					whenToUse: expect.arrayContaining([expect.stringContaining('payload.validateOnly=true')]),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('Preview a review request'),
							input: expect.objectContaining({
								payload: expect.objectContaining({
									validateOnly: true
								})
							})
						})
					])
				}),
				expect.objectContaining({
					resource: 'task',
					command: 'approve-review',
					whenToUse: expect.arrayContaining([expect.stringContaining('validateOnly=true')]),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('Preview review approval')
						})
					])
				}),
				expect.objectContaining({
					resource: 'task',
					command: 'request-approval',
					whenToUse: expect.arrayContaining([expect.stringContaining('payload.validateOnly=true')]),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('Preview an approval request'),
							input: expect.objectContaining({
								payload: expect.objectContaining({
									validateOnly: true
								})
							})
						})
					])
				}),
				expect.objectContaining({
					resource: 'task',
					command: 'reject-approval',
					whenToUse: expect.arrayContaining([expect.stringContaining('validateOnly=true')]),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('Preview approval rejection')
						})
					])
				}),
				expect.objectContaining({
					resource: 'task',
					command: 'accept-child-handoff',
					whenToUse: expect.arrayContaining([expect.stringContaining('payload.validateOnly=true')]),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('Preview child handoff acceptance')
						})
					])
				}),
				expect.objectContaining({
					resource: 'task',
					command: 'decompose',
					whenToUse: expect.arrayContaining([expect.stringContaining('payload.validateOnly=true')]),
					examples: expect.arrayContaining([
						expect.objectContaining({
							title: expect.stringContaining('Preview task decomposition'),
							input: expect.objectContaining({
								payload: expect.objectContaining({
									validateOnly: true
								})
							})
						})
					])
				}),
				expect.objectContaining({
					resource: 'thread',
					command: 'panel',
					path: '/api/agents/threads/:threadId/panel',
					whenToUse: expect.any(Array)
				})
			])
		);
		expect(manifest.environment).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'AMS_AGENT_THREAD_ID' }),
				expect.objectContaining({ name: 'AMS_AGENT_TASK_ID' }),
				expect.objectContaining({ name: 'AMS_AGENT_RUN_ID' })
			])
		);
	});

	it('filters commands by resource and command name', () => {
		const taskManifest = getAgentCapabilityManifest({ resource: 'task', command: 'decompose' });
		const goalLoopManifest = getAgentCapabilityManifest({
			resource: 'goal-loop',
			command: 'get_actionable_work'
		});
		const priorRunsManifest = getAgentCapabilityManifest({
			resource: 'context',
			command: 'get_relevant_prior_runs'
		});
		const workPacketManifest = getAgentCapabilityManifest({
			resource: 'work-packet',
			command: 'get_agent_work_packet'
		});
		const runResultManifest = getAgentCapabilityManifest({
			resource: 'run-result',
			command: 'record_run_result'
		});
		const reviewManifest = getAgentCapabilityManifest({
			resource: 'review',
			command: 'get_review_status'
		});

		expect(taskManifest.commands).toEqual([
			expect.objectContaining({
				resource: 'task',
				command: 'decompose',
				path: '/api/tasks/:taskId/decompose'
			})
		]);
		expect(taskManifest.commands[0]).not.toHaveProperty('mcp');
		expect(goalLoopManifest.commands).toEqual([
			expect.objectContaining({
				resource: 'goal-loop',
				command: 'get_actionable_work',
				method: 'GET'
			})
		]);
		expect(priorRunsManifest.commands).toEqual([
			expect.objectContaining({
				resource: 'context',
				command: 'get_relevant_prior_runs',
				method: 'GET',
				path: '/api/agent-context/relevant-prior-runs'
			})
		]);
		expect(workPacketManifest.commands).toEqual([
			expect.objectContaining({
				resource: 'work-packet',
				command: 'get_agent_work_packet',
				method: 'GET'
			})
		]);
		expect(runResultManifest.commands).toEqual([
			expect.objectContaining({
				resource: 'run-result',
				command: 'record_run_result',
				method: 'POST'
			})
		]);
		expect(reviewManifest.commands).toEqual([
			expect.objectContaining({
				resource: 'review',
				command: 'get_review_status',
				method: 'GET'
			})
		]);
	});
});
