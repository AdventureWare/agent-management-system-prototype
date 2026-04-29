import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createProjectCodexSkill,
	getProjectCodexSkillFilePath,
	listInstalledCodexSkills,
	readProjectCodexSkill,
	updateProjectCodexSkill,
	writeProjectCodexSkill
} from '$lib/server/codex-skills';
import { loadControlPlane } from '$lib/server/control-plane';
import { buildExecutionCapabilityCatalog } from '$lib/server/execution-capability-catalog';
import { installExternalSkillToProject, searchExternalSkills } from '$lib/server/external-skills';
import {
	parseProjectSkillAvailability,
	updateProjectSkillAvailabilityPolicy
} from '$lib/server/skill-management';
import { generateProjectSkillDraft } from '$lib/server/skill-draft-generator';
import { refineProjectSkill } from '$lib/server/skill-refinement';
import type { ControlPlaneData } from '$lib/types/control-plane';

function tokenizeSkillIntent(value: string) {
	return value
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.map((token) => token.trim())
		.filter((token) => token.length >= 3);
}

function scoreTaskForSkillDraft(
	task: ControlPlaneData['tasks'][number],
	tokens: string[],
	skillId: string
) {
	const searchableText = [
		task.title,
		task.summary,
		...(task.requiredPromptSkillNames ?? []),
		...(task.requiredToolNames ?? [])
	]
		.join(' ')
		.toLowerCase();
	let score = 0;

	for (const token of tokens) {
		if (searchableText.includes(token)) {
			score += 1;
		}
	}

	if (
		(task.requiredPromptSkillNames ?? []).some(
			(name) => name.toLowerCase() === skillId.toLowerCase()
		)
	) {
		score += 4;
	}

	return score;
}

function selectRelatedTasksForSkillDraft(
	data: ControlPlaneData,
	projectId: string,
	skillId: string,
	intendedUse: string
) {
	const tokens = Array.from(new Set([skillId, ...tokenizeSkillIntent(intendedUse)]));

	return data.tasks
		.filter((task) => task.projectId === projectId)
		.map((task) => ({
			task,
			score: scoreTaskForSkillDraft(task, tokens, skillId)
		}))
		.sort(
			(left, right) =>
				right.score - left.score ||
				right.task.updatedAt.localeCompare(left.task.updatedAt) ||
				left.task.title.localeCompare(right.task.title)
		)
		.slice(0, 3)
		.map(({ task }) => ({
			title: task.title,
			summary: task.summary,
			requiredPromptSkillNames: task.requiredPromptSkillNames ?? [],
			requiredToolNames: task.requiredToolNames ?? []
		}));
}

function buildSkillDraftPreviewPayload(input: {
	successAction: 'previewProjectSkill' | 'previewRefinedProjectSkill' | 'saveProjectSkillDraft';
	projectId: string;
	skillId: string;
	description: string;
	bodyMarkdown: string;
	changeSummary: string;
	relatedTaskCount: number;
	skillFilePath: string;
	saveMode: 'create' | 'update';
	referenceFiles?: Array<{
		path: string;
		content: string;
	}>;
	scriptFiles?: Array<{
		path: string;
		content: string;
	}>;
}) {
	return {
		ok: true,
		successAction: input.successAction,
		projectId: input.projectId,
		createdSkillId: input.skillId,
		assistChangeSummary: input.changeSummary,
		generatedSkillDescription: input.description,
		generatedSkillBody: input.bodyMarkdown,
		generatedSkillFilePath: input.skillFilePath,
		generatedRelatedTaskCount: input.relatedTaskCount,
		previewSkillSaveMode: input.saveMode,
		generatedReferenceFiles: input.referenceFiles ?? [],
		generatedScriptFiles: input.scriptFiles ?? []
	};
}

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();

	return {
		executionCatalog: buildExecutionCapabilityCatalog(data),
		projects: [...data.projects].sort((left, right) => left.name.localeCompare(right.name))
	};
};

export const actions: Actions = {
	createProjectSkill: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const skillId = form.get('skillId')?.toString().trim() ?? '';
		const description = form.get('description')?.toString().trim() ?? '';

		if (!projectId || !skillId || !description) {
			return fail(400, {
				message: 'Project, skill ID, and description are required.',
				projectId,
				skillId,
				description
			});
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project?.projectRootFolder) {
			return fail(400, {
				message: project
					? 'This project needs a root folder before a project-local skill can be created.'
					: 'Project not found.',
				projectId,
				skillId,
				description
			});
		}

		try {
			const createdSkill = createProjectCodexSkill({
				projectRootFolder: project.projectRootFolder,
				skillId,
				description
			});

			return {
				ok: true,
				successAction: 'createProjectSkill',
				projectId,
				createdSkillId: createdSkill.skillId
			};
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Could not create the project skill.',
				projectId,
				skillId,
				description
			});
		}
	},

	previewProjectSkill: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const skillId = form.get('skillId')?.toString().trim() ?? '';
		const intendedUse = form.get('intendedUse')?.toString().trim() ?? '';

		if (!projectId || !skillId || !intendedUse) {
			return fail(400, {
				message: 'Project, skill ID, and intended use are required.',
				projectId,
				skillId,
				intendedUse
			});
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project?.projectRootFolder) {
			return fail(400, {
				message: project
					? 'This project needs a root folder before a generated skill can be previewed.'
					: 'Project not found.',
				projectId,
				skillId,
				intendedUse
			});
		}

		try {
			const relatedTasks = selectRelatedTasksForSkillDraft(data, project.id, skillId, intendedUse);
			const result = await generateProjectSkillDraft({
				cwd: project.projectRootFolder,
				projectName: project.name,
				projectSummary: project.summary,
				skillId,
				intendedUse,
				installedSkillNames: listInstalledCodexSkills(project.projectRootFolder)
					.slice(0, 12)
					.map((skill) => skill.id),
				relatedTasks
			});

			return {
				...buildSkillDraftPreviewPayload({
					successAction: 'previewProjectSkill',
					projectId,
					skillId,
					description: result.description,
					bodyMarkdown: result.bodyMarkdown,
					changeSummary: result.changeSummary,
					relatedTaskCount: relatedTasks.length,
					skillFilePath: getProjectCodexSkillFilePath(project.projectRootFolder, skillId),
					saveMode: 'create',
					referenceFiles: result.referenceFiles,
					scriptFiles: result.scriptFiles
				}),
				intendedUse
			};
		} catch (error) {
			return fail(400, {
				message:
					error instanceof Error ? error.message : 'Could not preview the project skill draft.',
				projectId,
				skillId,
				intendedUse
			});
		}
	},

	previewRefinedProjectSkill: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const skillId = form.get('skillId')?.toString().trim() ?? '';
		const improvementGoal = form.get('improvementGoal')?.toString().trim() ?? '';

		if (!projectId || !skillId || !improvementGoal) {
			return fail(400, {
				message: 'Project, skill ID, and improvement goal are required.',
				projectId,
				skillId,
				improvementGoal
			});
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project?.projectRootFolder) {
			return fail(400, {
				message: project
					? 'This project needs a root folder before an existing skill can be previewed.'
					: 'Project not found.',
				projectId,
				skillId,
				improvementGoal
			});
		}

		try {
			const existingSkill = readProjectCodexSkill({
				projectRootFolder: project.projectRootFolder,
				skillId
			});
			const relatedTasks = selectRelatedTasksForSkillDraft(
				data,
				project.id,
				skillId,
				improvementGoal
			);
			const result = await refineProjectSkill({
				cwd: project.projectRootFolder,
				projectName: project.name,
				projectSummary: project.summary,
				skillId,
				currentSkillContent: existingSkill.content,
				improvementGoal,
				installedSkillNames: listInstalledCodexSkills(project.projectRootFolder)
					.slice(0, 12)
					.map((skill) => skill.id),
				relatedTasks
			});

			return {
				...buildSkillDraftPreviewPayload({
					successAction: 'previewRefinedProjectSkill',
					projectId,
					skillId,
					description: result.description,
					bodyMarkdown: result.bodyMarkdown,
					changeSummary: result.changeSummary,
					relatedTaskCount: relatedTasks.length,
					skillFilePath: existingSkill.skillFilePath,
					saveMode: 'update',
					referenceFiles: result.referenceFiles,
					scriptFiles: result.scriptFiles
				}),
				currentSkillContent: existingSkill.content,
				improvementGoal
			};
		} catch (error) {
			return fail(400, {
				message:
					error instanceof Error ? error.message : 'Could not preview the refined skill draft.',
				projectId,
				skillId,
				improvementGoal
			});
		}
	},

	saveProjectSkillDraft: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const skillId = form.get('skillId')?.toString().trim() ?? '';
		const description = form.get('description')?.toString().trim() ?? '';
		const bodyMarkdown = form.get('bodyMarkdown')?.toString().trim() ?? '';
		const saveMode = form.get('saveMode')?.toString().trim() === 'update' ? 'update' : 'create';

		if (!projectId || !skillId || !description || !bodyMarkdown) {
			return fail(400, {
				message: 'Project, skill ID, description, and body are required.',
				projectId,
				skillId,
				description
			});
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project?.projectRootFolder) {
			return fail(400, {
				message: project
					? 'This project needs a root folder before a skill draft can be saved.'
					: 'Project not found.',
				projectId,
				skillId,
				description
			});
		}

		try {
			const savedSkill =
				saveMode === 'update'
					? updateProjectCodexSkill({
							projectRootFolder: project.projectRootFolder,
							skillId,
							description,
							bodyMarkdown
						})
					: writeProjectCodexSkill({
							projectRootFolder: project.projectRootFolder,
							skillId,
							description,
							bodyMarkdown
						});

			return buildSkillDraftPreviewPayload({
				successAction: 'saveProjectSkillDraft',
				projectId,
				skillId: savedSkill.skillId,
				description,
				bodyMarkdown,
				changeSummary: 'Skill draft saved.',
				relatedTaskCount: 0,
				skillFilePath: savedSkill.skillFilePath,
				saveMode
			});
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Could not save the skill draft.',
				projectId,
				skillId,
				description
			});
		}
	},

	updateSkillAvailabilityPolicy: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const skillId = form.get('skillId')?.toString().trim() ?? '';
		const availability = parseProjectSkillAvailability(form.get('availability')?.toString() ?? '');
		const notes = form.get('notes')?.toString().trim() ?? '';

		if (!projectId || !skillId) {
			return fail(400, { message: 'Project and skill ID are required.', projectId, skillId });
		}

		try {
			await updateProjectSkillAvailabilityPolicy({
				projectId,
				skillId,
				availability,
				notes
			});
		} catch (error) {
			return fail(404, { message: 'Project not found.', projectId, skillId });
		}

		return {
			ok: true,
			successAction: 'updateSkillAvailabilityPolicy',
			projectId,
			skillId,
			availability
		};
	},

	searchExternalSkills: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const query = form.get('query')?.toString().trim() ?? '';

		if (!projectId || !query) {
			return fail(400, {
				message: 'Project and search query are required.',
				projectId,
				query
			});
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project?.projectRootFolder) {
			return fail(400, {
				message: project
					? 'This project needs a root folder before external skill search can run.'
					: 'Project not found.',
				projectId,
				query
			});
		}

		try {
			const searchResult = await searchExternalSkills(query, project.projectRootFolder);

			return {
				ok: true,
				successAction: 'searchExternalSkills',
				projectId,
				query,
				results: searchResult.results,
				rawOutput: searchResult.rawOutput
			};
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Could not search for external skills.',
				projectId,
				query
			});
		}
	},

	installExternalSkill: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const packageSpec = form.get('packageSpec')?.toString().trim() ?? '';
		const query = form.get('query')?.toString().trim() ?? '';

		if (!projectId || !packageSpec) {
			return fail(400, {
				message: 'Project and package spec are required.',
				projectId,
				packageSpec,
				query
			});
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project?.projectRootFolder) {
			return fail(400, {
				message: project
					? 'This project needs a root folder before external skills can be installed.'
					: 'Project not found.',
				projectId,
				packageSpec,
				query
			});
		}

		try {
			const installResult = await installExternalSkillToProject({
				projectRootFolder: project.projectRootFolder,
				packageSpec
			});
			let searchResults: Awaited<ReturnType<typeof searchExternalSkills>> | null = null;

			if (query) {
				try {
					searchResults = await searchExternalSkills(query, project.projectRootFolder);
				} catch {
					searchResults = null;
				}
			}

			return {
				ok: true,
				successAction: 'installExternalSkill',
				projectId,
				packageSpec,
				query,
				installedSkillIds: installResult.installedSkillIds,
				installedSkills: installResult.installedSkills,
				results: searchResults?.results ?? [],
				rawOutput: searchResults?.rawOutput ?? ''
			};
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Could not install the external skill.',
				projectId,
				packageSpec,
				query
			});
		}
	}
};
