// @ts-nocheck

export const AGENT_CAPABILITY_MANIFEST_VERSION = '2026-04-22';

export const AGENT_CAPABILITY_COMMANDS = [
	{
		resource: 'context',
		command: 'current',
		summary:
			'Resolve the current thread, task, run, project, and goal context from explicit ids or managed-run defaults.',
		cli: 'node scripts/ams-cli.mjs context current [--thread <threadId>] [--task <taskId>] [--run <runId>]',
		method: 'GET',
		path: '/api/agent-context/current',
		payloadMode: 'none',
		whenToUse: [
			'Use first in a managed run when you need the canonical current task, run, or thread state.',
			'Use after an error when you need to re-anchor on the latest control-plane context.'
		],
		nextCommands: ['task:get', 'thread:panel', 'task:update', 'task:launch-session'],
		examples: [
			{
				title: 'Resolve current task and run from managed-run defaults',
				input: {},
				output: {
					resolved: {
						threadId: 'thread_123',
						taskId: 'task_123',
						runId: 'run_123',
						projectId: 'project_app',
						goalId: 'goal_agent'
					},
					summary: {
						currentState: 'Task "Prepare approval flow" is done with run completed.',
						recommendedNextActions: [
							{
								resource: 'task',
								command: 'approve-approval'
							}
						]
					}
				}
			}
		]
	},
	{
		resource: 'intent',
		command: 'prepare_task_for_review',
		summary:
			'Prepare a task for review by optionally attaching support material, opening the review gate, and returning readback context.',
		cli: 'node scripts/ams-cli.mjs intent prepare_task_for_review --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/agent-intents/:intent',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use when you want the review preparation playbook as a single AMS operation instead of sequencing attach and request-review manually.',
			'Set validateOnly=true first when you want a dry-run preview of the review payload and checks before opening the real review gate.'
		],
		readAfter: ['context:current'],
		nextCommands: ['task:get', 'task:approve-review', 'task:request-review-changes'],
		examples: [
			{
				title: 'Preview review preparation without mutating the task',
				input: {
					taskId: 'task_123',
					validateOnly: true,
					review: {
						summary: 'Ready for review.'
					}
				},
				output: {
					intent: 'prepare_task_for_review',
					validationOnly: true,
					valid: true,
					wouldExecuteCommands: ['context:current', 'task:request-review', 'context:current']
				}
			}
		],
		mcp: {
			pathArgDefaults: {
				intent: { default: 'prepare_task_for_review' }
			}
		}
	},
	{
		resource: 'intent',
		command: 'prepare_task_for_approval',
		summary:
			'Prepare a task for approval by optionally attaching support material, opening the approval gate, and returning readback context.',
		cli: 'node scripts/ams-cli.mjs intent prepare_task_for_approval --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/agent-intents/:intent',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use when you want the approval preparation playbook as a single AMS operation instead of sequencing the low-level calls yourself.',
			'Set validateOnly=true first when you want a dry-run preview of the approval payload and checks before opening the real gate.'
		],
		readAfter: ['context:current'],
		nextCommands: ['task:get', 'task:approve-approval', 'task:reject-approval'],
		examples: [
			{
				title: 'Open an approval gate in one intent call',
				input: {
					taskId: 'task_123',
					approval: {
						summary: 'Ready for final sign-off.',
						mode: 'before_complete'
					}
				},
				output: {
					intent: 'prepare_task_for_approval',
					executedCommands: ['context:current', 'task:request-approval', 'context:current'],
					afterContext: {
						governance: {
							pendingApproval: {
								status: 'pending',
								summary: 'Ready for final sign-off.'
							}
						}
					}
				}
			},
			{
				title: 'Preview approval preparation without mutating the task',
				input: {
					taskId: 'task_123',
					validateOnly: true,
					approval: {
						summary: 'Ready for final sign-off.',
						mode: 'before_complete'
					}
				},
				output: {
					intent: 'prepare_task_for_approval',
					validationOnly: true,
					valid: true,
					wouldExecuteCommands: ['context:current', 'task:request-approval', 'context:current'],
					preview: {
						action: 'requestApproval',
						taskId: 'task_123'
					}
				}
			}
		],
		mcp: {
			pathArgDefaults: {
				intent: { default: 'prepare_task_for_approval' }
			}
		}
	},
	{
		resource: 'intent',
		command: 'reject_task_approval',
		summary:
			'Reject an active task approval request and return readback context in one AMS operation.',
		cli: 'node scripts/ams-cli.mjs intent reject_task_approval --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/agent-intents/:intent',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use when a pending approval should be rejected and you want before/after context in one response.',
			'Set validateOnly=true first when you want to confirm that a pending approval exists before rejecting it.'
		],
		readAfter: ['context:current'],
		nextCommands: ['task:get'],
		examples: [
			{
				title: 'Preview rejection of a pending approval',
				input: {
					taskId: 'task_123',
					validateOnly: true
				},
				output: {
					intent: 'reject_task_approval',
					validationOnly: true,
					valid: true,
					wouldExecuteCommands: ['context:current', 'task:reject-approval', 'context:current']
				}
			}
		],
		mcp: {
			pathArgDefaults: {
				intent: { default: 'reject_task_approval' }
			}
		}
	},
	{
		resource: 'intent',
		command: 'accept_child_handoff',
		summary:
			'Accept a delegated child handoff into the parent task and return readback context in one AMS operation.',
		cli: 'node scripts/ams-cli.mjs intent accept_child_handoff --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/agent-intents/:intent',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use when a delegated child task is done and the parent should accept the handoff without manually sequencing inspection and acceptance.',
			'Set validateOnly=true first when you want to confirm the parent-child relationship and completion state before accepting the handoff.'
		],
		readAfter: ['context:current'],
		nextCommands: ['task:get'],
		examples: [
			{
				title: 'Preview acceptance of a completed child handoff',
				input: {
					parentTaskId: 'task_parent',
					childTaskId: 'task_child',
					validateOnly: true
				},
				output: {
					intent: 'accept_child_handoff',
					validationOnly: true,
					valid: true,
					wouldExecuteCommands: ['context:current', 'task:accept-child-handoff', 'context:current']
				}
			}
		],
		mcp: {
			pathArgDefaults: {
				intent: { default: 'accept_child_handoff' }
			}
		}
	},
	{
		resource: 'intent',
		command: 'request_child_handoff_changes',
		summary:
			'Return a delegated child handoff for follow-up work and return readback context in one AMS operation.',
		cli: 'node scripts/ams-cli.mjs intent request_child_handoff_changes --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/agent-intents/:intent',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use when a delegated child handoff is not acceptable yet and should go back for follow-up in one AMS operation.',
			'Set validateOnly=true first when you want to confirm the handoff is complete and returnable before requesting changes.'
		],
		readAfter: ['context:current'],
		nextCommands: ['task:get'],
		examples: [
			{
				title: 'Preview a child handoff follow-up request',
				input: {
					parentTaskId: 'task_parent',
					childTaskId: 'task_child',
					summary: 'Needs stronger evidence before acceptance.',
					validateOnly: true
				},
				output: {
					intent: 'request_child_handoff_changes',
					validationOnly: true,
					valid: true,
					wouldExecuteCommands: [
						'context:current',
						'task:request-child-handoff-changes',
						'context:current'
					]
				}
			}
		],
		mcp: {
			pathArgDefaults: {
				intent: { default: 'request_child_handoff_changes' }
			}
		}
	},
	{
		resource: 'intent',
		command: 'coordinate_with_another_thread',
		summary:
			'Resolve the best target thread or handle, send a cross-thread contact, and return readback contact state in one AMS operation.',
		cli: 'node scripts/ams-cli.mjs intent coordinate_with_another_thread --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/agent-intents/:intent',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use when you need another thread to help, review, or take follow-up work and want routing plus contact as a single intent.',
			'Set validateOnly=true first when you want to confirm the target thread and routing checks before sending the real contact.'
		],
		readAfter: ['thread:contacts', 'context:current'],
		nextCommands: ['thread:contacts', 'thread:panel'],
		examples: [
			{
				title: 'Route a focused question to another thread',
				input: {
					targetThreadIdOrHandle: 'researcher',
					prompt: 'Need context on the latest blocker.',
					type: 'question',
					context: 'Focus on the failing approval path.'
				},
				output: {
					intent: 'coordinate_with_another_thread',
					executedCommands: [
						'context:current',
						'thread:contact',
						'thread:contacts',
						'context:current'
					],
					result: {
						target: {
							id: 'thread_researcher',
							handle: 'researcher'
						},
						contact: {
							contactId: 'contact_123'
						}
					}
				}
			},
			{
				title: 'Preview thread coordination before sending the contact',
				input: {
					targetThreadIdOrHandle: 'researcher',
					prompt: 'Need context on the latest blocker.',
					validateOnly: true
				},
				output: {
					intent: 'coordinate_with_another_thread',
					validationOnly: true,
					valid: true,
					wouldExecuteCommands: [
						'context:current',
						'thread:contact',
						'thread:contacts',
						'context:current'
					]
				}
			}
		],
		mcp: {
			pathArgDefaults: {
				intent: { default: 'coordinate_with_another_thread' }
			}
		}
	},
	{
		resource: 'task',
		command: 'list',
		summary: 'List tasks with optional text, project, goal, status, and limit filters.',
		cli: 'node scripts/ams-cli.mjs task list [--q <text>] [--project <projectId>] [--goal <goalId>] [--status <status>] [--limit <n>]',
		method: 'GET',
		path: '/api/tasks',
		payloadMode: 'none',
		whenToUse: [
			'Use when you know project, goal, or status filters but do not have the exact task id.',
			'Use to recover from task-not-found errors before retrying a mutation.'
		],
		nextCommands: ['task:get', 'context:current']
	},
	{
		resource: 'task',
		command: 'get',
		summary: 'Fetch a single task by id.',
		cli: 'node scripts/ams-cli.mjs task get [taskId]',
		method: 'GET',
		path: '/api/tasks/:taskId',
		payloadMode: 'none',
		whenToUse: [
			'Use before mutating a task when you need the latest status, review, approval, or thread link.',
			'Use after any task mutation to read the changed state back.'
		],
		nextCommands: [
			'task:update',
			'task:request-review',
			'task:request-approval',
			'task:launch-session'
		]
	},
	{
		resource: 'task',
		command: 'create',
		summary: 'Create a task under a project, with optional goal and execution metadata.',
		cli: 'node scripts/ams-cli.mjs task create --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks',
		payloadMode: 'json_or_file',
		whenToUse: ['Use when the user asked for a new task or scoped work item to be created.'],
		readAfter: ['task:get'],
		nextCommands: ['task:get', 'context:current'],
		examples: [
			{
				title: 'Create a new task in a known project',
				input: {
					title: 'Prepare approval packet',
					summary: 'Collect the materials needed for sign-off.',
					projectId: 'project_app'
				},
				output: {
					task: {
						id: 'task_123',
						title: 'Prepare approval packet',
						status: 'in_draft',
						projectId: 'project_app'
					}
				}
			}
		]
	},
	{
		resource: 'task',
		command: 'update',
		summary: 'Update task planning or execution fields.',
		cli: 'node scripts/ams-cli.mjs task update [taskId] --json <payload> | --file <path>',
		method: 'PATCH',
		path: '/api/tasks/:taskId',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use to change planning, assignment, dependency, or blocked-state fields on an existing task.'
		],
		readAfter: ['task:get'],
		nextCommands: ['task:get', 'context:current'],
		examples: [
			{
				title: 'Mark a task blocked with an explicit reason',
				input: {
					taskId: 'task_123',
					payload: {
						status: 'blocked',
						blockedReason: 'Waiting on final approver availability.'
					}
				},
				output: {
					task: {
						id: 'task_123',
						status: 'blocked',
						blockedReason: 'Waiting on final approver availability.'
					}
				}
			}
		]
	},
	{
		resource: 'task',
		command: 'attach',
		summary: 'Attach an existing file path to a task.',
		cli: 'node scripts/ams-cli.mjs task attach [taskId] --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/attachments',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use when a managed run produced an artifact that should be preserved on the task before review, approval, or handoff.'
		],
		readAfter: ['task:get'],
		nextCommands: ['task:get', 'task:request-review', 'intent:prepare_task_for_review'],
		examples: [
			{
				title: 'Attach a generated artifact and read back the attachment count',
				input: {
					taskId: 'task_123',
					payload: {
						path: '/absolute/path/to/report.md'
					}
				},
				output: {
					taskId: 'task_123',
					attachmentId: 'attachment_123',
					attachmentCount: 1,
					attachments: [
						{
							id: 'attachment_123',
							name: 'report.md'
						}
					]
				}
			}
		]
	},
	{
		resource: 'task',
		command: 'remove-attachment',
		summary: 'Remove an attachment from a task by attachment id.',
		cli: 'node scripts/ams-cli.mjs task remove-attachment <taskId> <attachmentId>',
		method: 'DELETE',
		path: '/api/tasks/:taskId/attachments/:attachmentId',
		payloadMode: 'none',
		whenToUse: ['Use when a task attachment points to the wrong artifact or should be detached.'],
		readAfter: ['task:get'],
		nextCommands: ['task:get', 'task:attach'],
		examples: [
			{
				title: 'Remove an obsolete attachment and read back the remaining attachment count',
				input: {
					taskId: 'task_123',
					attachmentId: 'attachment_123'
				},
				output: {
					taskId: 'task_123',
					attachmentId: 'attachment_123',
					attachmentCount: 0,
					attachments: []
				}
			}
		]
	},
	{
		resource: 'task',
		command: 'request-review',
		summary: 'Open a review request for a task.',
		cli: 'node scripts/ams-cli.mjs task request-review [taskId] --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/review-request',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use when work is ready for review and no open review exists yet.',
			'Set payload.validateOnly=true first when you want to preview review checks and execution-surface resolution without opening the review.'
		],
		readAfter: ['task:get'],
		nextCommands: ['task:get', 'task:approve-review', 'task:request-review-changes'],
		examples: [
			{
				title: 'Preview a review request without creating the review record',
				input: {
					taskId: 'task_123',
					payload: {
						summary: 'Ready for review.',
						validateOnly: true
					}
				},
				output: {
					validationOnly: true,
					valid: true,
					action: 'requestReview',
					taskId: 'task_123'
				}
			}
		]
	},
	{
		resource: 'task',
		command: 'approve-review',
		summary: 'Approve the active review for a task.',
		cli: 'node scripts/ams-cli.mjs task approve-review [taskId]',
		method: 'POST',
		path: '/api/tasks/:taskId/review-decision',
		payloadMode: 'none',
		whenToUse: [
			'Use when an open review should be approved.',
			'Set validateOnly=true first when you want to preview whether approving the review would close the task or keep it open.'
		],
		examples: [
			{
				title: 'Preview review approval without resolving the review',
				input: {
					taskId: 'task_123',
					validateOnly: true
				},
				output: {
					validationOnly: true,
					valid: true,
					action: 'approveReview',
					taskId: 'task_123'
				}
			}
		],
		mcp: {
			body: {
				defaults: { decision: 'approve' }
			}
		}
	},
	{
		resource: 'task',
		command: 'request-review-changes',
		summary: 'Request changes on the active review for a task.',
		cli: 'node scripts/ams-cli.mjs task request-review-changes [taskId]',
		method: 'POST',
		path: '/api/tasks/:taskId/review-decision',
		payloadMode: 'none',
		whenToUse: [
			'Use when an open review should send the task back with changes requested.',
			'Set validateOnly=true first when you want to preview the resulting blocked state before resolving the review.'
		],
		mcp: {
			body: {
				defaults: { decision: 'changes_requested' }
			}
		}
	},
	{
		resource: 'task',
		command: 'request-approval',
		summary: 'Open an approval request for a task.',
		cli: 'node scripts/ams-cli.mjs task request-approval [taskId] --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/approval-request',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use when work is ready for an approval gate and no pending approval exists.',
			'Set payload.validateOnly=true first when you want to preview approval-mode resolution and execution-surface checks without mutating the task.'
		],
		readAfter: ['task:get'],
		nextCommands: ['task:get', 'task:approve-approval', 'task:reject-approval'],
		examples: [
			{
				title: 'Request approval on a completed task',
				input: {
					taskId: 'task_123',
					payload: {
						summary: 'Ready for approval.',
						mode: 'before_complete'
					}
				},
				output: {
					approval: {
						id: 'approval_123',
						taskId: 'task_123',
						status: 'pending',
						mode: 'before_complete'
					}
				}
			},
			{
				title: 'Preview an approval request without creating the approval record',
				input: {
					taskId: 'task_123',
					payload: {
						summary: 'Ready for approval.',
						mode: 'before_complete',
						validateOnly: true
					}
				},
				output: {
					validationOnly: true,
					valid: true,
					action: 'requestApproval',
					taskId: 'task_123'
				}
			}
		]
	},
	{
		resource: 'task',
		command: 'approve-approval',
		summary: 'Approve the active approval request for a task.',
		cli: 'node scripts/ams-cli.mjs task approve-approval [taskId]',
		method: 'POST',
		path: '/api/tasks/:taskId/approval-decision',
		payloadMode: 'none',
		whenToUse: [
			'Use when a pending approval should be approved.',
			'Set validateOnly=true first when you want to preview whether approving the gate would close the task or keep it open.'
		],
		mcp: {
			body: {
				defaults: { decision: 'approve' }
			}
		}
	},
	{
		resource: 'task',
		command: 'reject-approval',
		summary: 'Reject the active approval request for a task.',
		cli: 'node scripts/ams-cli.mjs task reject-approval [taskId]',
		method: 'POST',
		path: '/api/tasks/:taskId/approval-decision',
		payloadMode: 'none',
		whenToUse: [
			'Use when a pending approval should be rejected.',
			'Set validateOnly=true first when you want to preview the resulting blocked state before rejecting the gate.'
		],
		examples: [
			{
				title: 'Preview approval rejection without resolving the gate',
				input: {
					taskId: 'task_123',
					validateOnly: true
				},
				output: {
					validationOnly: true,
					valid: true,
					action: 'rejectApproval',
					taskId: 'task_123'
				}
			}
		],
		mcp: {
			body: {
				defaults: { decision: 'reject' }
			}
		}
	},
	{
		resource: 'task',
		command: 'decompose',
		summary: 'Create child tasks from a parent task delegation template.',
		cli: 'node scripts/ams-cli.mjs task decompose [taskId] --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/decompose',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use when a parent task should fan out into delegated child tasks with explicit done conditions.',
			'Set payload.validateOnly=true first when you want to confirm child-template validity and fan-out limits before creating child tasks.'
		],
		examples: [
			{
				title: 'Preview task decomposition without creating child tasks',
				input: {
					taskId: 'task_123',
					payload: {
						validateOnly: true,
						children: [
							{
								title: 'Implement API route',
								instructions: 'Build the machine-readable route.',
								desiredRoleId: 'role_impl',
								delegationObjective: 'Implement the route cleanly.',
								delegationDoneCondition: 'Route exists with tests.'
							}
						]
					}
				},
				output: {
					validationOnly: true,
					valid: true,
					action: 'decomposeTask',
					taskId: 'task_123'
				}
			}
		]
	},
	{
		resource: 'task',
		command: 'accept-child-handoff',
		summary: 'Accept a delegated child task handoff back into the parent task.',
		cli: 'node scripts/ams-cli.mjs task accept-child-handoff [parentTaskId] --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/child-handoff',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use when a delegated child handoff should be accepted into the parent task.',
			'Set payload.validateOnly=true first when you want to preview the parent-child eligibility checks before accepting it.'
		],
		examples: [
			{
				title: 'Preview child handoff acceptance without mutating the child task',
				input: {
					parentTaskId: 'task_parent',
					payload: {
						childTaskId: 'task_child',
						validateOnly: true
					}
				},
				output: {
					validationOnly: true,
					valid: true,
					action: 'acceptChildHandoff',
					taskId: 'task_parent'
				}
			}
		],
		mcp: {
			pathArgAliases: {
				taskId: 'parentTaskId'
			},
			body: {
				mergePayload: true,
				defaults: { decision: 'accept' }
			}
		}
	},
	{
		resource: 'task',
		command: 'request-child-handoff-changes',
		summary: 'Request follow-up changes on a delegated child handoff.',
		cli: 'node scripts/ams-cli.mjs task request-child-handoff-changes [parentTaskId] --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/child-handoff',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use when a delegated child handoff should be returned for follow-up work.',
			'Set payload.validateOnly=true first when you want to preview the return-for-follow-up checks before mutating the child task.'
		],
		mcp: {
			pathArgAliases: {
				taskId: 'parentTaskId'
			},
			body: {
				mergePayload: true,
				defaults: { decision: 'changes_requested' }
			}
		}
	},
	{
		resource: 'task',
		command: 'launch-session',
		summary: 'Launch a task session from AMS.',
		cli: 'node scripts/ams-cli.mjs task launch-session [taskId]',
		method: 'POST',
		path: '/api/tasks/:taskId/session-launch',
		payloadMode: 'none',
		whenToUse: ['Use when a task is ready to start execution in a new managed session.'],
		readAfter: ['context:current', 'task:get'],
		nextCommands: ['thread:panel', 'task:get', 'context:current']
	},
	{
		resource: 'task',
		command: 'recover-session',
		summary: 'Recover the latest launchable session for a task.',
		cli: 'node scripts/ams-cli.mjs task recover-session [taskId]',
		method: 'POST',
		path: '/api/tasks/:taskId/session-recover',
		payloadMode: 'none'
	},
	{
		resource: 'goal',
		command: 'list',
		summary: 'List goals with optional text, project, status, and limit filters.',
		cli: 'node scripts/ams-cli.mjs goal list [--q <text>] [--project <projectId>] [--status <status>] [--limit <n>]',
		method: 'GET',
		path: '/api/goals',
		payloadMode: 'none'
	},
	{
		resource: 'goal',
		command: 'get',
		summary: 'Fetch a single goal by id.',
		cli: 'node scripts/ams-cli.mjs goal get <goalId>',
		method: 'GET',
		path: '/api/goals/:goalId',
		payloadMode: 'none',
		whenToUse: ['Use before mutating a goal or when resolving a task back to its goal.'],
		nextCommands: ['goal:update', 'task:list']
	},
	{
		resource: 'goal',
		command: 'create',
		summary: 'Create a goal and link it to projects or tasks.',
		cli: 'node scripts/ams-cli.mjs goal create --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/goals',
		payloadMode: 'json_or_file'
	},
	{
		resource: 'goal',
		command: 'update',
		summary: 'Update goal planning, hierarchy, or status fields.',
		cli: 'node scripts/ams-cli.mjs goal update <goalId> --json <payload> | --file <path>',
		method: 'PATCH',
		path: '/api/goals/:goalId',
		payloadMode: 'json_or_file'
	},
	{
		resource: 'project',
		command: 'list',
		summary: 'List projects with optional text and limit filters.',
		cli: 'node scripts/ams-cli.mjs project list [--q <text>] [--limit <n>]',
		method: 'GET',
		path: '/api/projects',
		payloadMode: 'none'
	},
	{
		resource: 'project',
		command: 'get',
		summary: 'Fetch a single project by id.',
		cli: 'node scripts/ams-cli.mjs project get <projectId>',
		method: 'GET',
		path: '/api/projects/:projectId',
		payloadMode: 'none',
		whenToUse: [
			'Use before mutating project defaults or when resolving a task or goal back to its project.'
		],
		nextCommands: ['project:update', 'task:list', 'goal:list']
	},
	{
		resource: 'project',
		command: 'create',
		summary: 'Create a project with root, artifact, repo, and sandbox defaults.',
		cli: 'node scripts/ams-cli.mjs project create --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/projects',
		payloadMode: 'json_or_file'
	},
	{
		resource: 'project',
		command: 'update',
		summary: 'Update project planning and execution defaults.',
		cli: 'node scripts/ams-cli.mjs project update <projectId> --json <payload> | --file <path>',
		method: 'PATCH',
		path: '/api/projects/:projectId',
		payloadMode: 'json_or_file'
	},
	{
		resource: 'thread',
		command: 'start',
		summary: 'Start a new agent thread.',
		method: 'POST',
		path: '/api/agents/threads',
		payloadMode: 'json_or_file'
	},
	{
		resource: 'thread',
		command: 'get',
		summary: 'Fetch one thread by exact thread id.',
		method: 'GET',
		path: '/api/agents/threads/:threadId',
		payloadMode: 'none'
	},
	{
		resource: 'thread',
		command: 'panel',
		summary: 'Fetch the full thread panel payload for one thread.',
		method: 'GET',
		path: '/api/agents/threads/:threadId/panel',
		payloadMode: 'none',
		whenToUse: [
			'Use when a task is in progress and you need thread activity, contacts, or latest run details.'
		],
		nextCommands: ['thread:contact', 'thread:contacts', 'context:current']
	},
	{
		resource: 'thread',
		command: 'set-handle-alias',
		summary: 'Update a thread handle alias.',
		method: 'PATCH',
		path: '/api/agents/threads/:threadId',
		payloadMode: 'json_or_file',
		mcp: {
			body: {
				fields: {
					handleAlias: {
						arg: 'handleAlias',
						normalize: 'optionalString',
						default: null
					}
				}
			}
		}
	},
	{
		resource: 'thread',
		command: 'cancel',
		summary: 'Cancel the active run for a thread.',
		method: 'POST',
		path: '/api/agents/threads/:threadId/cancel',
		payloadMode: 'none'
	},
	{
		resource: 'thread',
		command: 'archive',
		summary: 'Archive or unarchive one or more threads.',
		method: 'POST',
		path: '/api/agents/threads/archive',
		payloadMode: 'json_or_file',
		mcp: {
			body: {
				defaults: { archived: true }
			}
		}
	},
	{
		resource: 'thread',
		command: 'status',
		summary: 'Fetch managed status rows for one or more thread ids.',
		method: 'GET',
		path: '/api/agents/threads/status',
		payloadMode: 'none',
		mcp: {
			query: {
				params: {
					threadId: {
						arg: 'threadIds',
						repeated: true
					}
				}
			}
		}
	},
	{
		resource: 'thread',
		command: 'best-target',
		summary: 'Find the best contactable thread for the current or provided source thread context.',
		cli: 'node scripts/ams-cli.mjs thread best-target [--q <text>] [--role <role>] [--project <project>] [--task-id <taskId>] [--source-thread <threadId>] [--include-unavailable] [--include-archived]',
		method: 'GET',
		path: '/api/agents/threads/best-target',
		payloadMode: 'none',
		mcp: {
			query: {
				params: {
					q: { arg: 'q' },
					role: { arg: 'role' },
					project: { arg: 'project' },
					taskId: { arg: 'taskId' },
					sourceThreadId: {
						arg: 'sourceThreadId',
						fallback: 'currentThreadId',
						required: true
					},
					includeArchived: {
						arg: 'includeArchived',
						booleanMode: 'one_zero'
					},
					canContact: {
						arg: 'includeUnavailable',
						transform: 'invert_true_missing_true',
						booleanMode: 'one_zero'
					}
				}
			},
			responseFields: ['target', 'thread']
		}
	},
	{
		resource: 'thread',
		command: 'list',
		summary: 'List candidate threads for routing or inspection.',
		cli: 'node scripts/ams-cli.mjs thread list [--q <text>] [--role <role>] [--project <project>] [--task-id <taskId>] [--source-thread <threadId>] [--can-contact] [--include-archived] [--limit <n>]',
		method: 'GET',
		path: '/api/agents/threads',
		payloadMode: 'none',
		mcp: {
			query: {
				params: {
					q: { arg: 'q' },
					role: { arg: 'role' },
					project: { arg: 'project' },
					taskId: { arg: 'taskId' },
					sourceThreadId: {
						arg: 'sourceThreadId',
						fallback: 'currentThreadId'
					},
					canContact: {
						arg: 'canContact',
						booleanMode: 'one_zero'
					},
					includeArchived: {
						arg: 'includeArchived',
						booleanMode: 'one_zero'
					},
					limit: { arg: 'limit' }
				}
			},
			responseFields: ['targets', 'threads']
		}
	},
	{
		resource: 'thread',
		command: 'resolve',
		summary: 'Resolve a fuzzy thread handle or query into ranked thread candidates.',
		cli: 'node scripts/ams-cli.mjs thread resolve <query> [--source-thread <threadId>] [--can-contact] [--include-archived] [--limit <n>]',
		method: 'GET',
		path: '/api/agents/threads',
		payloadMode: 'none'
	},
	{
		resource: 'thread',
		command: 'contact',
		summary: 'Contact another thread by exact thread id or resolvable handle.',
		cli: 'node scripts/ams-cli.mjs thread contact <targetThreadIdOrHandle> --prompt <text> [--type <kind>] [--context <text>] [--source-thread <threadId>] [--reply-to <contactId>] [--no-reply-requested]',
		method: 'POST',
		path: '/api/agents/threads/:threadId/messages',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use when another thread must answer, review, or take work that direct state mutation cannot solve alone.'
		],
		readAfter: ['thread:contacts'],
		nextCommands: ['thread:contacts', 'thread:panel'],
		examples: [
			{
				title: 'Send a review request to another thread directly',
				input: {
					threadId: 'thread_reviewer',
					sourceThreadId: 'thread_author',
					prompt: 'Please review the latest artifact for correctness.',
					contactType: 'review_request',
					contextSummary: 'Focus on edge cases in the approval flow.'
				},
				output: {
					threadId: 'thread_reviewer',
					runId: 'run_456',
					contactId: 'contact_123'
				}
			}
		]
	},
	{
		resource: 'thread',
		command: 'contacts',
		summary: 'List recent contacts for the current thread or a specific thread id or handle.',
		cli: 'node scripts/ams-cli.mjs thread contacts [threadIdOrHandle] [--limit <n>]',
		method: 'GET',
		path: '/api/agents/threads/:threadId/contacts',
		payloadMode: 'none'
	},
	{
		resource: 'thread',
		command: 'contact-targets',
		summary: 'List normalized contact targets for the current or provided source thread.',
		method: 'GET',
		path: '/api/agents/threads/:threadId/contact-targets',
		payloadMode: 'none',
		mcp: {
			pathArgDefaults: {
				threadId: {
					arg: 'sourceThreadId',
					fallback: 'currentThreadId',
					required: true
				}
			},
			responseFields: ['targets']
		}
	},
	{
		resource: 'thread',
		command: 'attachment-read',
		summary: 'Read one thread attachment by thread id and attachment id.',
		method: 'GET',
		path: '/api/agents/threads/:threadId/attachments/:attachmentId',
		payloadMode: 'none'
	}
];
