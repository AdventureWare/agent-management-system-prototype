import {
	AGENT_CAPABILITY_COMMANDS,
	AGENT_CAPABILITY_MANIFEST_VERSION
} from './agent-capability-commands.js';
import { AGENT_CAPABILITY_PLAYBOOKS } from './agent-capability-playbooks.js';

export type AgentCapabilityCommand = {
	resource: 'context' | 'intent' | 'task' | 'goal' | 'project' | 'thread';
	command: string;
	summary: string;
	cli?: string;
	method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
	path?: string;
	payloadMode?: 'none' | 'json_or_file' | 'thread_passthrough';
	whenToUse?: string[];
	readAfter?: string[];
	nextCommands?: string[];
};

export type AgentCapabilityManifest = {
	version: string;
	discovery: {
		apiPath: string;
		currentContextApiPath: string;
		cliCommand: string;
		currentContextCliCommand: string;
		docsPath: string;
	};
	guidance: {
		reliableLoop: string[];
		playbooks: Array<{
			intent: string;
			steps: Array<{
				tool: string;
				phase: 'discover' | 'inspect' | 'mutate' | 'readback';
				purpose: string;
			}>;
		}>;
	};
	environment: Array<{
		name: string;
		required: boolean;
		description: string;
	}>;
	commands: AgentCapabilityCommand[];
};

function toManifestCommand(
	command: AgentCapabilityCommand & Record<string, unknown>
): AgentCapabilityCommand {
	return {
		resource: command.resource,
		command: command.command,
		summary: command.summary,
		...(command.cli ? { cli: command.cli } : {}),
		...(command.method ? { method: command.method } : {}),
		...(command.path ? { path: command.path } : {}),
		...(command.payloadMode ? { payloadMode: command.payloadMode } : {}),
		...(command.whenToUse ? { whenToUse: command.whenToUse } : {}),
		...(command.readAfter ? { readAfter: command.readAfter } : {}),
		...(command.nextCommands ? { nextCommands: command.nextCommands } : {})
	};
}

export function getAgentCapabilityManifest(filters?: {
	resource?: string | null;
	command?: string | null;
}): AgentCapabilityManifest {
	const resourceFilter = filters?.resource?.trim().toLowerCase() ?? '';
	const commandFilter = filters?.command?.trim().toLowerCase() ?? '';
	const commands = (
		AGENT_CAPABILITY_COMMANDS as Array<AgentCapabilityCommand & Record<string, unknown>>
	)
		.filter((entry) => {
			if (resourceFilter && entry.resource !== resourceFilter) {
				return false;
			}

			if (commandFilter && entry.command !== commandFilter) {
				return false;
			}

			return true;
		})
		.map(toManifestCommand);

	return {
		version: AGENT_CAPABILITY_MANIFEST_VERSION,
		discovery: {
			apiPath: '/api/agent-capabilities',
			currentContextApiPath: '/api/agent-context/current',
			cliCommand: 'node scripts/ams-cli.mjs manifest',
			currentContextCliCommand: 'node scripts/ams-cli.mjs context current',
			docsPath: 'docs/ams-cli-reference.md'
		},
		guidance: {
			reliableLoop: [
				'Start with manifest discovery before guessing an AMS command or route.',
				'When a managed run has thread, task, or run ids available, resolve current context before making assumptions about state.',
				'Inspect current state with list/get before mutating unfamiliar tasks, goals, projects, or threads.',
				'Prefer direct task, goal, or project mutations over thread routing when state changes alone solve the request.',
				'After every mutation, read the affected state back with get/list before claiming success.'
			],
			playbooks: AGENT_CAPABILITY_PLAYBOOKS as AgentCapabilityManifest['guidance']['playbooks']
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
			},
			{
				name: 'AMS_AGENT_TASK_ID',
				required: false,
				description: 'Current control-plane task id when a managed run was launched from a task.'
			},
			{
				name: 'AMS_AGENT_RUN_ID',
				required: false,
				description: 'Current control-plane run id when a managed run was launched from a task.'
			}
		],
		commands
	};
}
