export type AgentCapabilityCommand = {
	resource: 'task' | 'goal' | 'project' | 'thread';
	command: string;
	summary: string;
	cli: string;
	method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
	path?: string;
	payloadMode?: 'none' | 'json_or_file' | 'thread_passthrough';
};

export type AgentCapabilityManifest = {
	version: string;
	discovery: {
		apiPath: string;
		cliCommand: string;
		docsPath: string;
	};
	environment: Array<{
		name: string;
		required: boolean;
		description: string;
	}>;
	commands: AgentCapabilityCommand[];
};

const COMMANDS: AgentCapabilityCommand[] = [
	{
		resource: 'task',
		command: 'list',
		summary: 'List tasks with optional text, project, goal, status, and limit filters.',
		cli: 'node scripts/ams-cli.mjs task list [--q <text>] [--project <projectId>] [--goal <goalId>] [--status <status>] [--limit <n>]',
		method: 'GET',
		path: '/api/tasks',
		payloadMode: 'none'
	},
	{
		resource: 'task',
		command: 'get',
		summary: 'Fetch a single task by id.',
		cli: 'node scripts/ams-cli.mjs task get <taskId>',
		method: 'GET',
		path: '/api/tasks/:taskId',
		payloadMode: 'none'
	},
	{
		resource: 'task',
		command: 'create',
		summary: 'Create a task under a project, with optional goal and execution metadata.',
		cli: 'node scripts/ams-cli.mjs task create --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks',
		payloadMode: 'json_or_file'
	},
	{
		resource: 'task',
		command: 'update',
		summary: 'Update task planning or execution fields.',
		cli: 'node scripts/ams-cli.mjs task update <taskId> --json <payload> | --file <path>',
		method: 'PATCH',
		path: '/api/tasks/:taskId',
		payloadMode: 'json_or_file'
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
		payloadMode: 'json_or_file'
	},
	{
		resource: 'task',
		command: 'approve-review',
		summary: 'Approve the active review for a task.',
		cli: 'node scripts/ams-cli.mjs task approve-review <taskId>',
		method: 'POST',
		path: '/api/tasks/:taskId/review-decision',
		payloadMode: 'none'
	},
	{
		resource: 'task',
		command: 'request-review-changes',
		summary: 'Request changes on the active review for a task.',
		cli: 'node scripts/ams-cli.mjs task request-review-changes <taskId>',
		method: 'POST',
		path: '/api/tasks/:taskId/review-decision',
		payloadMode: 'none'
	},
	{
		resource: 'task',
		command: 'request-approval',
		summary: 'Open an approval request for a task.',
		cli: 'node scripts/ams-cli.mjs task request-approval <taskId> --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/approval-request',
		payloadMode: 'json_or_file'
	},
	{
		resource: 'task',
		command: 'approve-approval',
		summary: 'Approve the active approval request for a task.',
		cli: 'node scripts/ams-cli.mjs task approve-approval <taskId>',
		method: 'POST',
		path: '/api/tasks/:taskId/approval-decision',
		payloadMode: 'none'
	},
	{
		resource: 'task',
		command: 'reject-approval',
		summary: 'Reject the active approval request for a task.',
		cli: 'node scripts/ams-cli.mjs task reject-approval <taskId>',
		method: 'POST',
		path: '/api/tasks/:taskId/approval-decision',
		payloadMode: 'none'
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
		payloadMode: 'json_or_file'
	},
	{
		resource: 'task',
		command: 'request-child-handoff-changes',
		summary: 'Request follow-up changes on a delegated child handoff.',
		cli: 'node scripts/ams-cli.mjs task request-child-handoff-changes <parentTaskId> --json <payload> | --file <path>',
		method: 'POST',
		path: '/api/tasks/:taskId/child-handoff',
		payloadMode: 'json_or_file'
	},
	{
		resource: 'task',
		command: 'launch-session',
		summary: 'Launch a task session from AMS.',
		cli: 'node scripts/ams-cli.mjs task launch-session <taskId>',
		method: 'POST',
		path: '/api/tasks/:taskId/session-launch',
		payloadMode: 'none'
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
		payloadMode: 'none'
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
		payloadMode: 'none'
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
		command: 'passthrough',
		summary: 'Forward thread coordination commands to the dedicated thread CLI.',
		cli: 'node scripts/ams-cli.mjs thread <existing agent-thread-cli args...>',
		payloadMode: 'thread_passthrough'
	}
];

export function getAgentCapabilityManifest(filters?: {
	resource?: string | null;
	command?: string | null;
}): AgentCapabilityManifest {
	const resourceFilter = filters?.resource?.trim().toLowerCase() ?? '';
	const commandFilter = filters?.command?.trim().toLowerCase() ?? '';
	const commands = COMMANDS.filter((entry) => {
		if (resourceFilter && entry.resource !== resourceFilter) {
			return false;
		}

		if (commandFilter && entry.command !== commandFilter) {
			return false;
		}

		return true;
	});

	return {
		version: '2026-04-20',
		discovery: {
			apiPath: '/api/agent-capabilities',
			cliCommand: 'node scripts/ams-cli.mjs manifest',
			docsPath: 'docs/ams-cli-reference.md'
		},
		environment: [
			{
				name: 'AMS_AGENT_API_BASE_URL',
				required: false,
				description:
					'Operator API base URL. Defaults to http://127.0.0.1:$AMS_APP_PORT or port 3000.'
			},
			{
				name: 'AMS_AGENT_API_TOKEN',
				required: true,
				description: 'Bearer token for the AMS task, goal, project, and capability APIs.'
			},
			{
				name: 'AMS_AGENT_THREAD_ID',
				required: false,
				description: 'Current thread id for cross-thread coordination and reply routing.'
			}
		],
		commands
	};
}
