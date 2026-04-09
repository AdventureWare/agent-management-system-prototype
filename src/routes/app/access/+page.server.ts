import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadAccessDashboardData } from '$lib/server/access-dashboard';
import { loadAccessProbeState, runAndStoreAccessProbe } from '$lib/server/access-probe-store';
import {
	createProjectCodexSkill,
	getProjectCodexSkillFilePath,
	listInstalledCodexSkills,
	readProjectCodexSkill,
	updateProjectCodexSkill,
	writeProjectCodexSkill
} from '$lib/server/codex-skills';
import { installExternalSkillToProject, searchExternalSkills } from '$lib/server/external-skills';
import { generateProjectSkillDraft } from '$lib/server/skill-draft-generator';
import { refineProjectSkill } from '$lib/server/skill-refinement';
import {
	loadControlPlane,
	parseProviderSetupStatus,
	parseExecutionSurfaceStatus,
	updateControlPlane
} from '$lib/server/control-plane';
import {
	PROVIDER_SETUP_STATUS_OPTIONS,
	EXECUTION_SURFACE_STATUS_OPTIONS
} from '$lib/types/control-plane';
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
	const dashboard = await loadAccessDashboardData();

	return {
		...dashboard,
		probeState: await loadAccessProbeState(),
		providerSetupStatusOptions: PROVIDER_SETUP_STATUS_OPTIONS,
		executionSurfaceStatusOptions: EXECUTION_SURFACE_STATUS_OPTIONS
	};
};

export const actions: Actions = {
	runProbe: async () => {
		const dashboard = await loadAccessDashboardData();
		const probeState = await runAndStoreAccessProbe(dashboard);

		return {
			ok: true,
			successAction: 'runProbe',
			probeState
		};
	},

	updateProviderAvailability: async ({ request }) => {
		const form = await request.formData();
		const providerId = form.get('providerId')?.toString().trim() ?? '';
		const enabled = form.get('enabled')?.toString() === 'on';
		const setupStatus = parseProviderSetupStatus(
			form.get('setupStatus')?.toString() ?? '',
			'planned'
		);

		if (!providerId) {
			return fail(400, { message: 'Provider ID is required.' });
		}

		let providerUpdated = false;

		await updateControlPlane((data) => ({
			...data,
			providers: data.providers.map((provider) => {
				if (provider.id !== providerId) {
					return provider;
				}

				providerUpdated = true;

				return {
					...provider,
					enabled,
					setupStatus
				};
			})
		}));

		if (!providerUpdated) {
			return fail(404, { message: 'Provider not found.' });
		}

		return {
			ok: true,
			successAction: 'updateProviderAvailability',
			providerId
		};
	},

	updateExecutionSurfaceAvailability: async ({ request }) => {
		const form = await request.formData();
		const executionSurfaceId = form.get('executionSurfaceId')?.toString().trim() ?? '';
		const status = parseExecutionSurfaceStatus(form.get('status')?.toString() ?? '', 'idle');

		if (!executionSurfaceId) {
			return fail(400, { message: 'Execution surface ID is required.' });
		}

		let executionSurfaceUpdated = false;

		await updateControlPlane((data) => ({
			...data,
			executionSurfaces: data.executionSurfaces.map((executionSurface) => {
				if (executionSurface.id !== executionSurfaceId) {
					return executionSurface;
				}

				executionSurfaceUpdated = true;

				return {
					...executionSurface,
					status
				};
			})
		}));

		if (!executionSurfaceUpdated) {
			return fail(404, { message: 'Execution surface not found.' });
		}

		return {
			ok: true,
			successAction: 'updateExecutionSurfaceAvailability',
			executionSurfaceId
		};
	},

	createProjectSkill: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const skillId = form.get('skillId')?.toString().trim() ?? '';
		const description = form.get('description')?.toString().trim() ?? '';

		if (!projectId) {
			return fail(400, { message: 'Project is required.' });
		}

		if (!skillId) {
			return fail(400, { message: 'Skill ID is required.' });
		}

		if (!description) {
			return fail(400, { message: 'Skill description is required.' });
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project) {
			return fail(404, { message: 'Project not found.' });
		}

		if (!project.projectRootFolder) {
			return fail(400, {
				message: 'This project needs a root folder before a project-local skill can be created.'
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

		if (!projectId) {
			return fail(400, { message: 'Project is required.' });
		}

		if (!skillId) {
			return fail(400, { message: 'Skill ID is required.', projectId, intendedUse });
		}

		if (!intendedUse) {
			return fail(400, { message: 'Intended use is required.', projectId, skillId });
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project) {
			return fail(404, { message: 'Project not found.', projectId, skillId, intendedUse });
		}

		if (!project.projectRootFolder) {
			return fail(400, {
				message: 'This project needs a root folder before a generated skill can be previewed.',
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

	generateProjectSkill: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const skillId = form.get('skillId')?.toString().trim() ?? '';
		const intendedUse = form.get('intendedUse')?.toString().trim() ?? '';

		if (!projectId) {
			return fail(400, { message: 'Project is required.' });
		}

		if (!skillId) {
			return fail(400, { message: 'Skill ID is required.', projectId, intendedUse });
		}

		if (!intendedUse) {
			return fail(400, { message: 'Intended use is required.', projectId, skillId });
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project) {
			return fail(404, { message: 'Project not found.', projectId, skillId, intendedUse });
		}

		if (!project.projectRootFolder) {
			return fail(400, {
				message: 'This project needs a root folder before a generated skill can be created.',
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
			const createdSkill = writeProjectCodexSkill({
				projectRootFolder: project.projectRootFolder,
				skillId,
				description: result.description,
				bodyMarkdown: result.bodyMarkdown,
				referenceFiles: result.referenceFiles,
				scriptFiles: result.scriptFiles
			});

			return {
				ok: true,
				successAction: 'generateProjectSkill',
				projectId,
				createdSkillId: createdSkill.skillId,
				intendedUse,
				assistChangeSummary: result.changeSummary,
				generatedSkillDescription: result.description,
				generatedSkillBody: result.bodyMarkdown,
				generatedSkillFilePath: createdSkill.skillFilePath,
				generatedRelatedTaskCount: relatedTasks.length,
				generatedReferenceFiles: result.referenceFiles,
				generatedScriptFiles: result.scriptFiles
			};
		} catch (error) {
			return fail(400, {
				message:
					error instanceof Error ? error.message : 'Could not generate the project skill draft.',
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

		if (!projectId) {
			return fail(400, { message: 'Project is required.' });
		}

		if (!skillId) {
			return fail(400, { message: 'Skill ID is required.', projectId, improvementGoal });
		}

		if (!improvementGoal) {
			return fail(400, { message: 'Improvement goal is required.', projectId, skillId });
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project) {
			return fail(404, { message: 'Project not found.', projectId, skillId, improvementGoal });
		}

		if (!project.projectRootFolder) {
			return fail(400, {
				message: 'This project needs a root folder before an existing skill can be previewed.',
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

	refineProjectSkill: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const skillId = form.get('skillId')?.toString().trim() ?? '';
		const improvementGoal = form.get('improvementGoal')?.toString().trim() ?? '';

		if (!projectId) {
			return fail(400, { message: 'Project is required.' });
		}

		if (!skillId) {
			return fail(400, { message: 'Skill ID is required.', projectId, improvementGoal });
		}

		if (!improvementGoal) {
			return fail(400, { message: 'Improvement goal is required.', projectId, skillId });
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project) {
			return fail(404, { message: 'Project not found.', projectId, skillId, improvementGoal });
		}

		if (!project.projectRootFolder) {
			return fail(400, {
				message: 'This project needs a root folder before an existing skill can be refined.',
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
			const updatedSkill = updateProjectCodexSkill({
				projectRootFolder: project.projectRootFolder,
				skillId,
				description: result.description,
				bodyMarkdown: result.bodyMarkdown,
				referenceFiles: result.referenceFiles,
				scriptFiles: result.scriptFiles
			});

			return {
				ok: true,
				successAction: 'refineProjectSkill',
				projectId,
				createdSkillId: updatedSkill.skillId,
				improvementGoal,
				assistChangeSummary: result.changeSummary,
				generatedSkillDescription: result.description,
				generatedSkillBody: result.bodyMarkdown,
				generatedSkillFilePath: updatedSkill.skillFilePath,
				generatedRelatedTaskCount: relatedTasks.length,
				generatedReferenceFiles: result.referenceFiles,
				generatedScriptFiles: result.scriptFiles
			};
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Could not refine the existing skill.',
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
		const assistChangeSummary = form.get('assistChangeSummary')?.toString().trim() ?? '';
		const relatedTaskCount = Number(form.get('relatedTaskCount')?.toString() ?? '0');
		const rawReferenceFiles = form.get('referenceFilesJson')?.toString().trim() ?? '[]';
		const rawScriptFiles = form.get('scriptFilesJson')?.toString().trim() ?? '[]';
		const referenceFilePaths = form
			.getAll('referenceFilePath')
			.map((value) => value.toString().trim());
		const referenceFileContents = form
			.getAll('referenceFileContent')
			.map((value) => value.toString().trim());
		const scriptFilePaths = form.getAll('scriptFilePath').map((value) => value.toString().trim());
		const scriptFileContents = form
			.getAll('scriptFileContent')
			.map((value) => value.toString().trim());

		if (!projectId) {
			return fail(400, { message: 'Project is required.' });
		}

		if (!skillId) {
			return fail(400, { message: 'Skill ID is required.', projectId });
		}

		if (!description) {
			return fail(400, { message: 'Skill description is required.', projectId, skillId });
		}

		if (!bodyMarkdown) {
			return fail(400, { message: 'Skill body is required.', projectId, skillId });
		}

		let referenceFiles: Array<{ path: string; content: string }> = [];
		let scriptFiles: Array<{ path: string; content: string }> = [];

		if (referenceFilePaths.length > 0 || referenceFileContents.length > 0) {
			referenceFiles = referenceFilePaths
				.map((path, index) => ({
					path,
					content: referenceFileContents[index] ?? ''
				}))
				.filter((referenceFile) => referenceFile.path && referenceFile.content);
		} else {
			try {
				const parsed = JSON.parse(rawReferenceFiles) as unknown;
				if (Array.isArray(parsed)) {
					referenceFiles = parsed
						.filter(
							(referenceFile): referenceFile is { path: string; content: string } =>
								Boolean(referenceFile) &&
								typeof referenceFile === 'object' &&
								'path' in referenceFile &&
								typeof referenceFile.path === 'string' &&
								'content' in referenceFile &&
								typeof referenceFile.content === 'string'
						)
						.map((referenceFile) => ({
							path: referenceFile.path.trim(),
							content: referenceFile.content.trim()
						}));
				}
			} catch {
				return fail(400, { message: 'Reference files payload is invalid.', projectId, skillId });
			}
		}

		if (scriptFilePaths.length > 0 || scriptFileContents.length > 0) {
			scriptFiles = scriptFilePaths
				.map((path, index) => ({
					path,
					content: scriptFileContents[index] ?? ''
				}))
				.filter((scriptFile) => scriptFile.path && scriptFile.content)
				.slice(0, 1);
		} else {
			try {
				const parsed = JSON.parse(rawScriptFiles) as unknown;
				if (Array.isArray(parsed)) {
					scriptFiles = parsed
						.filter(
							(scriptFile): scriptFile is { path: string; content: string } =>
								Boolean(scriptFile) &&
								typeof scriptFile === 'object' &&
								'path' in scriptFile &&
								typeof scriptFile.path === 'string' &&
								'content' in scriptFile &&
								typeof scriptFile.content === 'string'
						)
						.map((scriptFile) => ({
							path: scriptFile.path.trim(),
							content: scriptFile.content.trim()
						}))
						.slice(0, 1);
				}
			} catch {
				return fail(400, { message: 'Script files payload is invalid.', projectId, skillId });
			}
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project) {
			return fail(404, { message: 'Project not found.', projectId, skillId });
		}

		if (!project.projectRootFolder) {
			return fail(400, {
				message: 'This project needs a root folder before a skill draft can be saved.',
				projectId,
				skillId
			});
		}

		try {
			const savedSkill =
				saveMode === 'update'
					? updateProjectCodexSkill({
							projectRootFolder: project.projectRootFolder,
							skillId,
							description,
							bodyMarkdown,
							referenceFiles,
							scriptFiles
						})
					: writeProjectCodexSkill({
							projectRootFolder: project.projectRootFolder,
							skillId,
							description,
							bodyMarkdown,
							referenceFiles,
							scriptFiles
						});

			return buildSkillDraftPreviewPayload({
				successAction: 'saveProjectSkillDraft',
				projectId,
				skillId: savedSkill.skillId,
				description,
				bodyMarkdown,
				changeSummary: assistChangeSummary || 'Skill draft saved.',
				relatedTaskCount: Number.isFinite(relatedTaskCount) ? Math.max(0, relatedTaskCount) : 0,
				skillFilePath: savedSkill.skillFilePath,
				saveMode,
				referenceFiles,
				scriptFiles
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

	searchExternalSkills: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const query = form.get('query')?.toString().trim() ?? '';

		if (!projectId) {
			return fail(400, { message: 'Project is required.', projectId, query });
		}

		if (!query) {
			return fail(400, { message: 'Search query is required.', projectId, query });
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project) {
			return fail(404, { message: 'Project not found.', projectId, query });
		}

		if (!project.projectRootFolder) {
			return fail(400, {
				message: 'This project needs a root folder before external skill search can run.',
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

		if (!projectId) {
			return fail(400, { message: 'Project is required.' });
		}

		if (!packageSpec) {
			return fail(400, { message: 'Package spec is required.', projectId, query });
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project) {
			return fail(404, { message: 'Project not found.', projectId, packageSpec, query });
		}

		if (!project.projectRootFolder) {
			return fail(400, {
				message: 'This project needs a root folder before external skills can be installed.',
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
