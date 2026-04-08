import { canonicalizeExecutionRequirementNames } from '$lib/execution-requirements';
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import type { Role } from '$lib/types/control-plane';

export type TaskRolePromptContext = {
	id: string;
	name: string;
	description: string;
	skillIds: string[];
	toolIds: string[];
	mcpIds: string[];
	systemPrompt: string;
} | null;

export function resolveTaskRolePromptContext(input: {
	roles: Role[];
	desiredRoleId: string | null | undefined;
	projectRootFolder: string | null | undefined;
	taskPromptSkillNames?: string[];
}) {
	const role = input.desiredRoleId?.trim()
		? (input.roles.find((candidate) => candidate.id === input.desiredRoleId) ?? null)
		: null;
	const installedSkillNames = listInstalledCodexSkills(input.projectRootFolder).map(
		(skill) => skill.id
	);
	const effectivePromptSkillNames = canonicalizeExecutionRequirementNames(
		[...(input.taskPromptSkillNames ?? []), ...(role?.skillIds ?? [])],
		installedSkillNames
	);

	return {
		role: role
			? {
					id: role.id,
					name: role.name,
					description: role.description,
					skillIds: [...(role.skillIds ?? [])],
					toolIds: [...(role.toolIds ?? [])],
					mcpIds: [...(role.mcpIds ?? [])],
					systemPrompt: role.systemPrompt ?? ''
				}
			: null,
		effectivePromptSkillNames
	};
}
