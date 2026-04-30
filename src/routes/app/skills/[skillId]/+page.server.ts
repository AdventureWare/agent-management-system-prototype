import { error, redirect } from '@sveltejs/kit';
import { readFileSync } from 'node:fs';
import { normalizeExecutionRequirementName } from '$lib/execution-requirements';
import {
	archiveProjectCodexSkill,
	listInstalledCodexSkillInstallations,
	readProjectCodexSkill,
	updateProjectCodexSkill
} from '$lib/server/codex-skills';
import { loadControlPlane } from '$lib/server/control-plane';
import { buildExecutionCapabilityCatalog } from '$lib/server/execution-capability-catalog';
import {
	parseProjectSkillAvailability,
	updateProjectSkillAvailabilityPolicy
} from '$lib/server/skill-management';
import type { Actions, PageServerLoad } from './$types';

function decodeSkillId(value: string) {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function readSkillFileContent(skillFilePath: string) {
	try {
		return readFileSync(skillFilePath, 'utf8');
	} catch {
		return '';
	}
}

function stripSkillFrontmatter(content: string) {
	return content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').trim();
}

export const load: PageServerLoad = async ({ params, url }) => {
	const requestedSkillId = decodeSkillId(params.skillId);
	const normalizedSkillId = normalizeExecutionRequirementName(requestedSkillId);
	const requestedSource = url.searchParams.get('source') ?? '';

	if (!normalizedSkillId) {
		error(404, 'Skill not found.');
	}

	const data = await loadControlPlane();
	const executionCatalog = buildExecutionCapabilityCatalog(data);
	const skill =
		executionCatalog.skills.find(
			(candidate) => normalizeExecutionRequirementName(candidate.id) === normalizedSkillId
		) ?? null;

	if (!skill) {
		error(404, 'Skill not found.');
	}

	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const installationByFilePath = new Map<
		string,
		{
			id: string;
			description: string;
			sourceLabel: string;
			global: boolean;
			project: boolean;
			projectId: string;
			projectName: string;
			projectHref: string;
			skillDirectory: string;
			skillFilePath: string;
			content: string;
			bodyMarkdown: string;
		}
	>();

	for (const project of data.projects) {
		for (const installation of listInstalledCodexSkillInstallations(project.projectRootFolder)) {
			if (normalizeExecutionRequirementName(installation.id) !== normalizedSkillId) {
				continue;
			}

			if (installationByFilePath.has(installation.skillFilePath)) {
				continue;
			}

			const content = readSkillFileContent(installation.skillFilePath);
			installationByFilePath.set(installation.skillFilePath, {
				id: installation.id,
				description: installation.description,
				sourceLabel: installation.sourceLabel,
				global: installation.global,
				project: installation.project,
				projectId: project.id,
				projectName: project.name,
				projectHref: `/app/projects/${project.id}`,
				skillDirectory: installation.skillDirectory,
				skillFilePath: installation.skillFilePath,
				content,
				bodyMarkdown: stripSkillFrontmatter(content)
			});
		}
	}

	const requestingTasks = data.tasks
		.filter((task) =>
			(task.requiredPromptSkillNames ?? []).some(
				(skillName) => normalizeExecutionRequirementName(skillName) === normalizedSkillId
			)
		)
		.map((task) => {
			const project = projectMap.get(task.projectId) ?? null;

			return {
				id: task.id,
				title: task.title,
				status: task.status,
				projectId: task.projectId,
				projectName: project?.name ?? 'Unknown project',
				taskHref: `/app/tasks/${task.id}`,
				projectHref: project ? `/app/projects/${project.id}` : ''
			};
		})
		.sort(
			(left, right) =>
				left.projectName.localeCompare(right.projectName) || left.title.localeCompare(right.title)
		);
	const availabilityEvents = data.projects
		.flatMap((project) =>
			(project.skillAvailabilityPolicyEvents ?? [])
				.filter((event) => normalizeExecutionRequirementName(event.skillId) === normalizedSkillId)
				.map((event) => ({
					id: event.id,
					projectId: project.id,
					projectName: project.name,
					projectHref: `/app/projects/${project.id}`,
					skillId: event.skillId,
					availability: event.availability,
					availabilityLabel:
						event.availability === 'enabled'
							? 'Enabled for project'
							: event.availability === 'disabled'
								? 'Disabled for project'
								: 'Default',
					notes: event.notes,
					changedAt: event.changedAt
				}))
		)
		.sort((left, right) => right.changedAt.localeCompare(left.changedAt))
		.slice(0, 12);

	return {
		skill,
		installations: [...installationByFilePath.values()].sort(
			(left, right) =>
				Number(right.project) - Number(left.project) ||
				left.projectName.localeCompare(right.projectName) ||
				left.skillFilePath.localeCompare(right.skillFilePath)
		),
		selectedSkillFilePath: installationByFilePath.has(requestedSource) ? requestedSource : '',
		requestingTasks,
		availabilityEvents,
		projects: data.projects
	};
};

export const actions: Actions = {
	updateProjectSkill: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const skillId = form.get('skillId')?.toString().trim() ?? '';
		const description = form.get('description')?.toString().trim() ?? '';
		const bodyMarkdown = form.get('bodyMarkdown')?.toString().trim() ?? '';

		if (!projectId || !skillId || !description || !bodyMarkdown) {
			return {
				ok: false,
				message: 'Project, skill, description, and body are required.'
			};
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project?.projectRootFolder) {
			return {
				ok: false,
				message: 'Project root folder is required before a project-local skill can be updated.'
			};
		}

		try {
			const currentSkill = readProjectCodexSkill({
				projectRootFolder: project.projectRootFolder,
				skillId
			});
			const updatedSkill = updateProjectCodexSkill({
				projectRootFolder: project.projectRootFolder,
				skillId,
				description,
				bodyMarkdown
			});

			return {
				ok: true,
				successAction: 'updateProjectSkill',
				skillId: updatedSkill.skillId,
				projectId,
				skillFilePath: updatedSkill.skillFilePath,
				previousSkillFilePath: currentSkill.skillFilePath
			};
		} catch (caughtError) {
			return {
				ok: false,
				message: caughtError instanceof Error ? caughtError.message : 'Could not update the skill.'
			};
		}
	},

	updateSkillAvailabilityPolicy: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const skillId = form.get('skillId')?.toString().trim() ?? '';
		const availability = parseProjectSkillAvailability(form.get('availability')?.toString() ?? '');
		const notes = form.get('notes')?.toString().trim() ?? '';

		if (!projectId || !skillId) {
			return {
				ok: false,
				message: 'Project and skill ID are required.'
			};
		}

		try {
			await updateProjectSkillAvailabilityPolicy({
				projectId,
				skillId,
				availability,
				notes
			});
		} catch {
			return {
				ok: false,
				message: 'Project not found.'
			};
		}

		return {
			ok: true,
			successAction: 'updateSkillAvailabilityPolicy',
			projectId,
			skillId,
			availability
		};
	},

	archiveProjectSkill: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const skillId = form.get('skillId')?.toString().trim() ?? '';

		if (!projectId || !skillId) {
			return {
				ok: false,
				message: 'Project and skill ID are required.'
			};
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project?.projectRootFolder) {
			return {
				ok: false,
				message: 'Project root folder is required before a project-local skill can be archived.'
			};
		}

		try {
			archiveProjectCodexSkill({
				projectRootFolder: project.projectRootFolder,
				skillId
			});
		} catch (caughtError) {
			return {
				ok: false,
				message:
					caughtError instanceof Error
						? caughtError.message
						: 'Could not archive the project skill.'
			};
		}

		throw redirect(303, `/app/skills?archivedSkill=${encodeURIComponent(skillId)}`);
	}
};
