import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { buildArtifactBrowser } from '$lib/server/artifact-browser';
import { loadFolderPickerOptions } from '$lib/server/folder-options';
import {
	applyGoalRelationships,
	getGoalChildGoals,
	getGoalLinkedProjectIds,
	getGoalLinkedTaskIds,
	sortGoalsByName,
	sortProjectsByName,
	sortTasksByTitle,
	suggestGoalArtifactPath
} from '$lib/server/goal-relationships';
import { normalizePathInput } from '$lib/server/path-tools';
import { AREA_OPTIONS, GOAL_STATUS_OPTIONS } from '$lib/types/control-plane';
import {
	createGoal,
	loadControlPlane,
	parseArea,
	parseGoalStatus,
	updateControlPlane
} from '$lib/server/control-plane';

function isValidDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseSelectedIds(form: FormData, key: string) {
	return [
		...new Set(
			form
				.getAll(key)
				.map((value) => value.toString().trim())
				.filter((value) => value.length > 0)
		)
	];
}

function readGoalForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		summary: form.get('summary')?.toString().trim() ?? '',
		successSignal: form.get('successSignal')?.toString().trim() ?? '',
		targetDate: form.get('targetDate')?.toString().trim() ?? '',
		artifactPath: normalizePathInput(form.get('artifactPath')?.toString()),
		parentGoalId: form.get('parentGoalId')?.toString().trim() ?? '',
		projectIds: parseSelectedIds(form, 'projectIds'),
		taskIds: parseSelectedIds(form, 'taskIds'),
		area: parseArea(form.get('area')?.toString() ?? '', 'product'),
		status: parseGoalStatus(form.get('status')?.toString() ?? '', 'ready')
	};
}

function buildGoalOptions(data: Awaited<ReturnType<typeof loadControlPlane>>) {
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));

	return {
		parentGoalOptions: sortGoalsByName(data.goals).map((goal) => ({
			id: goal.id,
			name: goal.name,
			status: goal.status,
			artifactPath: goal.artifactPath
		})),
		projectOptions: sortProjectsByName(data.projects).map((project) => ({
			id: project.id,
			name: project.name,
			summary: project.summary,
			defaultArtifactRoot: project.defaultArtifactRoot,
			projectRootFolder: project.projectRootFolder
		})),
		taskOptions: sortTasksByTitle(data.tasks).map((task) => ({
			id: task.id,
			title: task.title,
			status: task.status,
			projectId: task.projectId,
			projectName: projectMap.get(task.projectId)?.name ?? 'Unknown project',
			currentGoalId: task.goalId,
			currentGoalName: task.goalId ? (goalMap.get(task.goalId)?.name ?? '') : ''
		}))
	};
}

function validateGoalSelections(
	data: Awaited<ReturnType<typeof loadControlPlane>>,
	values: ReturnType<typeof readGoalForm>
) {
	const parentGoalId = values.parentGoalId || null;

	if (parentGoalId && !data.goals.some((goal) => goal.id === parentGoalId)) {
		return 'Selected parent goal was not found.';
	}

	const validProjectIds = values.projectIds.filter((projectId) =>
		data.projects.some((project) => project.id === projectId)
	);

	if (validProjectIds.length !== values.projectIds.length) {
		return 'One or more selected projects are no longer available.';
	}

	const selectedTasks = values.taskIds.map((taskId) =>
		data.tasks.find((task) => task.id === taskId)
	);

	if (selectedTasks.some((task) => !task)) {
		return 'One or more selected tasks are no longer available.';
	}

	return null;
}

export const load: PageServerLoad = async ({ url }) => {
	const data = await loadControlPlane();
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const goals = await Promise.all(
		sortGoalsByName(data.goals).map(async (goal) => {
			const linkedTaskIds = new Set(getGoalLinkedTaskIds(data, goal));
			const linkedProjectIds = new Set(getGoalLinkedProjectIds(data, goal));
			const childGoals = sortGoalsByName(getGoalChildGoals(data, goal.id)).map((childGoal) => ({
				id: childGoal.id,
				name: childGoal.name,
				status: childGoal.status
			}));
			const linkedTasks = sortTasksByTitle(
				data.tasks.filter((task) => linkedTaskIds.has(task.id))
			).map((task) => ({
				id: task.id,
				title: task.title,
				status: task.status,
				projectName: projectMap.get(task.projectId)?.name ?? 'Unknown project'
			}));
			const linkedProjects = sortProjectsByName(
				data.projects.filter((project) => linkedProjectIds.has(project.id))
			).map((project) => ({
				id: project.id,
				name: project.name
			}));

			return {
				...goal,
				parentGoalName: goal.parentGoalId ? (goalMap.get(goal.parentGoalId)?.name ?? '') : '',
				childGoals,
				childGoalCount: childGoals.length,
				linkedProjects,
				linkedTasks,
				relatedTaskCount: linkedTasks.length,
				artifactBrowser: await buildArtifactBrowser({
					rootPath: goal.artifactPath
				})
			};
		})
	);

	return {
		deleted: url.searchParams.get('deleted') === '1',
		goals,
		areaOptions: AREA_OPTIONS,
		statusOptions: GOAL_STATUS_OPTIONS,
		folderOptions: await loadFolderPickerOptions(),
		...buildGoalOptions(data)
	};
};

export const actions: Actions = {
	createGoal: async ({ request }) => {
		const form = await request.formData();
		const values = readGoalForm(form);

		if (!values.name || !values.summary) {
			return fail(400, {
				message: 'Name and summary are required.',
				values
			});
		}

		if (values.targetDate && !isValidDate(values.targetDate)) {
			return fail(400, {
				message: 'Target date must use YYYY-MM-DD.',
				values
			});
		}

		const current = await loadControlPlane();
		const validationError = validateGoalSelections(current, values);

		if (validationError) {
			return fail(400, {
				message: validationError,
				values
			});
		}

		const parentGoalId = values.parentGoalId || null;
		const artifactPath =
			values.artifactPath ||
			suggestGoalArtifactPath({
				data: current,
				parentGoalId,
				projectIds: values.projectIds,
				taskIds: values.taskIds
			});

		if (!artifactPath) {
			return fail(400, {
				message: 'Add an artifact path or link a project or parent goal with a usable workspace.',
				values
			});
		}

		await updateControlPlane((data) => {
			const goal = createGoal({
				name: values.name,
				summary: values.summary,
				successSignal: values.successSignal,
				artifactPath,
				parentGoalId,
				projectIds: values.projectIds,
				taskIds: values.taskIds,
				targetDate: values.targetDate || null,
				area: values.area,
				status: values.status
			});

			return applyGoalRelationships({
				data: {
					...data,
					goals: [goal, ...data.goals]
				},
				goalId: goal.id,
				parentGoalId,
				projectIds: values.projectIds,
				taskIds: values.taskIds
			});
		});

		return { ok: true, successAction: 'createGoal' };
	}
};
