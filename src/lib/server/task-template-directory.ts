import { buildExecutionRequirementInventory } from '$lib/server/execution-requirement-inventory';
import { buildTaskGoalOptions } from '$lib/server/task-goal-options';
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import { loadControlPlane } from '$lib/server/control-plane';
import { decorateTaskTemplates } from '$lib/server/task-templates';
import { sortWorkflowsByName } from '$lib/server/workflows';

export async function loadTaskTemplateDirectoryData() {
	const data = await loadControlPlane();
	const projectSkillSummaries = [...data.projects]
		.map((project) => {
			const installedSkills = listInstalledCodexSkills(project.projectRootFolder);

			return {
				projectId: project.id,
				totalCount: installedSkills.length,
				globalCount: installedSkills.filter((skill) => skill.global).length,
				projectCount: installedSkills.filter((skill) => skill.project).length,
				installedSkills,
				previewSkills: installedSkills.slice(0, 8)
			};
		})
		.sort((left, right) => left.projectId.localeCompare(right.projectId));

	return {
		taskTemplates: decorateTaskTemplates(data),
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		goals: buildTaskGoalOptions(data.goals),
		workflows: sortWorkflowsByName(data.workflows ?? []).map((workflow) => ({
			...workflow,
			projectName:
				data.projects.find((project) => project.id === workflow.projectId)?.name ??
				'Unknown project'
		})),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		executionSurfaces: [...data.executionSurfaces].sort((a, b) => a.name.localeCompare(b.name)),
		projectSkillSummaries,
		executionRequirementInventory: buildExecutionRequirementInventory(data)
	};
}
