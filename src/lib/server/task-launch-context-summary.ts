import { resolveThreadSandbox, selectExecutionProvider } from '$lib/server/control-plane';
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import { resolveTaskRolePromptContext } from '$lib/server/task-role-context';
import type { AgentSandbox } from '$lib/types/agent-thread';
import type { ControlPlaneData, Project, Task, ExecutionSurface } from '$lib/types/control-plane';

export type TaskLaunchContextSummary = {
	role: {
		id: string;
		name: string;
		description: string;
		skillIds: string[];
		toolIds: string[];
		mcpIds: string[];
		hasSystemPrompt: boolean;
	} | null;
	assignedExecutionSurface: {
		id: string;
		name: string;
		status: ExecutionSurface['status'];
		skillNames: string[];
	} | null;
	provider: {
		id: string;
		name: string;
		launcher: string;
		capabilityNames: string[];
	} | null;
	sandbox: {
		effective: AgentSandbox;
		taskRequirement: AgentSandbox | null;
		executionSurfaceOverride: AgentSandbox | null;
		projectDefault: AgentSandbox | null;
		providerDefault: AgentSandbox | null;
	};
	project: {
		rootFolder: string;
		defaultArtifactRoot: string;
		additionalWritableRoots: string[];
		totalInstalledSkillCount: number;
		promptSkillNames: string[];
	};
	promptInputs: {
		includesSuccessCriteria: boolean;
		includesReadyCondition: boolean;
		includesExpectedOutcome: boolean;
		includesDelegationPacket: boolean;
		publishedKnowledgeCount: number;
		requiredPromptSkillNames: string[];
		missingPromptSkillNames: string[];
	};
	requirements: {
		capabilityNames: string[];
		toolNames: string[];
	};
};

export function buildTaskLaunchContextSummary(
	data: Pick<ControlPlaneData, 'providers' | 'roles'>,
	input: {
		task: Task;
		project: Project | null;
		executionSurface: ExecutionSurface | null;
		publishedKnowledgeCount: number;
	}
): TaskLaunchContextSummary {
	const provider = selectExecutionProvider(data, input.executionSurface);
	const installedSkills = input.project
		? listInstalledCodexSkills(input.project.projectRootFolder)
		: [];
	const installedSkillNames = installedSkills.map((skill) => skill.id);
	const { role, effectivePromptSkillNames: requiredPromptSkillNames } =
		resolveTaskRolePromptContext({
			roles: data.roles,
			desiredRoleId: input.task.desiredRoleId,
			projectRootFolder: input.project?.projectRootFolder ?? '',
			taskPromptSkillNames: input.task.requiredPromptSkillNames ?? []
		});

	return {
		role: role
			? {
					id: role.id,
					name: role.name,
					description: role.description,
					skillIds: role.skillIds,
					toolIds: role.toolIds,
					mcpIds: role.mcpIds,
					hasSystemPrompt: Boolean(role.systemPrompt.trim())
				}
			: null,
		assignedExecutionSurface: input.executionSurface
			? {
					id: input.executionSurface.id,
					name: input.executionSurface.name,
					status: input.executionSurface.status,
					skillNames: [...(input.executionSurface.skills ?? [])]
				}
			: null,
		provider: provider
			? {
					id: provider.id,
					name: provider.name,
					launcher: provider.launcher,
					capabilityNames: [...(provider.capabilities ?? [])]
				}
			: null,
		sandbox: {
			effective: resolveThreadSandbox({
				task: input.task,
				executionSurface: input.executionSurface,
				project: input.project,
				provider
			}),
			taskRequirement: input.task.requiredThreadSandbox ?? null,
			executionSurfaceOverride: input.executionSurface?.threadSandboxOverride ?? null,
			projectDefault: input.project?.defaultThreadSandbox ?? null,
			providerDefault: provider?.defaultThreadSandbox ?? null
		},
		project: {
			rootFolder: input.project?.projectRootFolder ?? '',
			defaultArtifactRoot: input.project?.defaultArtifactRoot ?? '',
			additionalWritableRoots: [...(input.project?.additionalWritableRoots ?? [])],
			totalInstalledSkillCount: installedSkills.length,
			promptSkillNames: installedSkills.slice(0, 12).map((skill) => skill.id)
		},
		promptInputs: {
			includesSuccessCriteria: Boolean(input.task.successCriteria?.trim()),
			includesReadyCondition: Boolean(input.task.readyCondition?.trim()),
			includesExpectedOutcome: Boolean(input.task.expectedOutcome?.trim()),
			includesDelegationPacket: Boolean(input.task.delegationPacket),
			publishedKnowledgeCount: input.publishedKnowledgeCount,
			requiredPromptSkillNames,
			missingPromptSkillNames: requiredPromptSkillNames.filter(
				(skillName) => !installedSkillNames.includes(skillName)
			)
		},
		requirements: {
			capabilityNames: [...(input.task.requiredCapabilityNames ?? [])],
			toolNames: [...(input.task.requiredToolNames ?? [])]
		}
	};
}
