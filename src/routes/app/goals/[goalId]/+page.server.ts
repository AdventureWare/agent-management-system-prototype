import { error, fail, redirect } from '@sveltejs/kit';
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
	suggestGoalArtifactPath,
	wouldCreateGoalCycle
} from '$lib/server/goal-relationships';
import { normalizePathInput } from '$lib/server/path-tools';
import { AREA_OPTIONS, GOAL_STATUS_OPTIONS } from '$lib/types/control-plane';
import {
	deleteGoal as removeGoalFromControlPlane,
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
		goalId: form.get('goalId')?.toString().trim() ?? '',
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

function collectDescendantGoalIds(
	data: Awaited<ReturnType<typeof loadControlPlane>>,
	goalId: string
) {
	const descendants = new Set<string>();
	const queue = [goalId];

	while (queue.length > 0) {
		const currentGoalId = queue.shift();

		if (!currentGoalId) {
			continue;
		}

		for (const childGoal of data.goals.filter((goal) => goal.parentGoalId === currentGoalId)) {
			if (descendants.has(childGoal.id)) {
				continue;
			}

			descendants.add(childGoal.id);
			queue.push(childGoal.id);
		}
	}

	return descendants;
}

function buildGoalOptions(
	data: Awaited<ReturnType<typeof loadControlPlane>>,
	currentGoalId: string
) {
	const descendantGoalIds = collectDescendantGoalIds(data, currentGoalId);
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));

	return {
		parentGoalOptions: sortGoalsByName(
			data.goals.filter((goal) => goal.id !== currentGoalId && !descendantGoalIds.has(goal.id))
		).map((goal) => ({
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
	values: ReturnType<typeof readGoalForm>,
	currentGoalId: string
) {
	const parentGoalId = values.parentGoalId || null;

	if (parentGoalId && !data.goals.some((goal) => goal.id === parentGoalId)) {
		return 'Selected parent goal was not found.';
	}

	if (wouldCreateGoalCycle(data, currentGoalId, parentGoalId)) {
		return 'This parent goal would create a cycle.';
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

export const load: PageServerLoad = async ({ params }) => {
	const data = await loadControlPlane();
	const goal = data.goals.find((candidate) => candidate.id === params.goalId);

	if (!goal) {
		throw error(404, 'Goal not found.');
	}

	const goalMap = new Map(data.goals.map((candidate) => [candidate.id, candidate]));
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const linkedTaskIds = new Set(getGoalLinkedTaskIds(data, goal));
	const linkedProjectIds = new Set(getGoalLinkedProjectIds(data, goal));
	const childGoals = sortGoalsByName(getGoalChildGoals(data, goal.id)).map((childGoal) => ({
		...childGoal,
		taskCount: getGoalLinkedTaskIds(data, childGoal).length
	}));
	const linkedProjects = sortProjectsByName(
		data.projects.filter((project) => linkedProjectIds.has(project.id))
	);
	const relatedTasks = [...data.tasks]
		.filter((task) => linkedTaskIds.has(task.id))
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
		.map((task) => ({
			...task,
			projectName: projectMap.get(task.projectId)?.name ?? 'Unknown project'
		}));

	return {
		goal: {
			...goal,
			parentGoalName: goal.parentGoalId ? (goalMap.get(goal.parentGoalId)?.name ?? '') : '',
			linkedProjectCount: linkedProjects.length,
			relatedTaskCount: relatedTasks.length,
			childGoalCount: childGoals.length
		},
		childGoals,
		linkedProjects,
		relatedTasks,
		artifactBrowser: await buildArtifactBrowser({
			rootPath: goal.artifactPath
		}),
		metrics: {
			relatedTaskCount: relatedTasks.length,
			activeTaskCount: relatedTasks.filter((task) =>
				['in_draft', 'ready', 'in_progress', 'review', 'blocked'].includes(task.status)
			).length,
			linkedProjectCount: linkedProjects.length,
			childGoalCount: childGoals.length
		},
		areaOptions: AREA_OPTIONS,
		statusOptions: GOAL_STATUS_OPTIONS,
		folderOptions: await loadFolderPickerOptions(),
		...buildGoalOptions(data, goal.id)
	};
};

export const actions: Actions = {
	updateGoal: async ({ params, request }) => {
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
		const existingGoal = current.goals.find((goal) => goal.id === params.goalId);

		if (!existingGoal) {
			return fail(404, { message: 'Goal not found.' });
		}

		const validationError = validateGoalSelections(current, values, params.goalId);

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
			}) ||
			existingGoal.artifactPath;

		if (!artifactPath) {
			return fail(400, {
				message: 'Add an artifact path or link a project or parent goal with a usable workspace.',
				values
			});
		}

		let goalUpdated = false;

		await updateControlPlane((data) => {
			const nextData = {
				...data,
				goals: data.goals.map((goal) => {
					if (goal.id !== params.goalId) {
						return goal;
					}

					goalUpdated = true;
					return {
						...goal,
						name: values.name,
						summary: values.summary,
						successSignal: values.successSignal,
						targetDate: values.targetDate || null,
						artifactPath,
						area: values.area,
						status: values.status
					};
				})
			};

			return applyGoalRelationships({
				data: nextData,
				goalId: params.goalId,
				parentGoalId,
				projectIds: values.projectIds,
				taskIds: values.taskIds
			});
		});

		if (!goalUpdated) {
			return fail(404, { message: 'Goal not found.' });
		}

		return {
			ok: true,
			successAction: 'updateGoal'
		};
	},

	deleteGoal: async ({ params }) => {
		const current = await loadControlPlane();
		const goal = current.goals.find((candidate) => candidate.id === params.goalId);

		if (!goal) {
			return fail(404, { message: 'Goal not found.' });
		}

		await updateControlPlane((data) => removeGoalFromControlPlane(data, params.goalId));

		throw redirect(303, '/app/goals?deleted=1');
	}
};
