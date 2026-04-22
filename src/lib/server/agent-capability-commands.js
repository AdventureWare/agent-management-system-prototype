// @ts-nocheck

export const AGENT_CAPABILITY_MANIFEST_VERSION = '2026-04-21';

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
		nextCommands: ['task:get', 'thread:panel', 'task:update', 'task:launch-session']
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
			'Use when you want the review preparation playbook as a single AMS operation instead of sequencing attach and request-review manually.'
		],
		readAfter: ['context:current'],
		nextCommands: ['task:get', 'task:approve-review', 'task:request-review-changes'],
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
			'Use when you want the approval preparation playbook as a single AMS operation instead of sequencing the low-level calls yourself.'
		],
		readAfter: ['context:current'],
		nextCommands: ['task:get', 'task:approve-approval', 'task:reject-approval'],
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
			'Use when a pending approval should be rejected and you want before/after context in one response.'
		],
		readAfter: ['context:current'],
		nextCommands: ['task:get'],
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
			'Use when a delegated child task is done and the parent should accept the handoff without manually sequencing inspection and acceptance.'
		],
		readAfter: ['context:current'],
		nextCommands: ['task:get'],
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
			'Use when a delegated child handoff is not acceptable yet and should go back for follow-up in one AMS operation.'
		],
		readAfter: ['context:current'],
		nextCommands: ['task:get'],
		mcp: {
			pathArgDefaults: {
				intent: { default: 'request_child_handoff_changes' }
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
		cli: 'node scripts/ams-cli.mjs task get <taskId>',
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
		nextCommands: ['task:get', 'context:current']
	},
	{
		resource: 'task',
		command: 'update',
		summary: 'Update task planning or execution fields.',
		cli: 'node scripts/ams-cli.mjs task update <taskId> --json <payload> | --file <path>',
		method: 'PATCH',
		path: '/api/tasks/:taskId',
		payloadMode: 'json_or_file',
		whenToUse: [
			'Use to change planning, assignment, dependency, or blocked-state fields on an existing task.'
		],
		readAfter: ['task:get'],
		nextCommands: ['task:get', 'context:current']
	},
	{
		resource: 'task',
		command: 'attach',
		summary: 'Attach an existing file path to a task.',
		cli: 'node scripts/ams-cli.mjs task attach <taskId> --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/attachments',
		payloadMode: 'json_or_file'
	},
	{
		resource: 'task',
		command: 'remove-attachment',
		summary: 'Remove an attachment from a task by attachment id.',
		cli: 'node scripts/ams-cli.mjs task remove-attachment <taskId> <attachmentId>',
		method: 'DELETE',
		path: '/api/tasks/:taskId/attachments/:attachmentId',
		payloadMode: 'none'
	},
	{
		resource: 'task',
		command: 'request-review',
		summary: 'Open a review request for a task.',
		cli: 'node scripts/ams-cli.mjs task request-review <taskId> --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/review-request',
		payloadMode: 'json_or_file',
		whenToUse: ['Use when work is ready for review and no open review exists yet.'],
		readAfter: ['task:get'],
		nextCommands: ['task:get', 'task:approve-review', 'task:request-review-changes']
	},
	{
		resource: 'task',
		command: 'approve-review',
		summary: 'Approve the active review for a task.',
		cli: 'node scripts/ams-cli.mjs task approve-review <taskId>',
		method: 'POST',
		path: '/api/tasks/:taskId/review-decision',
		payloadMode: 'none',
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
		cli: 'node scripts/ams-cli.mjs task request-review-changes <taskId>',
		method: 'POST',
		path: '/api/tasks/:taskId/review-decision',
		payloadMode: 'none',
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
		cli: 'node scripts/ams-cli.mjs task request-approval <taskId> --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/approval-request',
		payloadMode: 'json_or_file',
		whenToUse: ['Use when work is ready for an approval gate and no pending approval exists.'],
		readAfter: ['task:get'],
		nextCommands: ['task:get', 'task:approve-approval', 'task:reject-approval']
	},
	{
		resource: 'task',
		command: 'approve-approval',
		summary: 'Approve the active approval request for a task.',
		cli: 'node scripts/ams-cli.mjs task approve-approval <taskId>',
		method: 'POST',
		path: '/api/tasks/:taskId/approval-decision',
		payloadMode: 'none',
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
		cli: 'node scripts/ams-cli.mjs task reject-approval <taskId>',
		method: 'POST',
		path: '/api/tasks/:taskId/approval-decision',
		payloadMode: 'none',
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
		cli: 'node scripts/ams-cli.mjs task decompose <taskId> --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/decompose',
		payloadMode: 'json_or_file'
	},
	{
		resource: 'task',
		command: 'accept-child-handoff',
		summary: 'Accept a delegated child task handoff back into the parent task.',
		cli: 'node scripts/ams-cli.mjs task accept-child-handoff <parentTaskId> --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/child-handoff',
		payloadMode: 'json_or_file',
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
		cli: 'node scripts/ams-cli.mjs task request-child-handoff-changes <parentTaskId> --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/child-handoff',
		payloadMode: 'json_or_file',
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
		cli: 'node scripts/ams-cli.mjs task launch-session <taskId>',
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
		cli: 'node scripts/ams-cli.mjs task recover-session <taskId>',
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
		nextCommands: ['thread:contacts', 'thread:panel']
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
