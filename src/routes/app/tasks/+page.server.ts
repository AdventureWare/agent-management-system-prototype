import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	LANE_OPTIONS,
	PRIORITY_OPTIONS,
	TASK_APPROVAL_MODE_OPTIONS,
	TASK_RISK_LEVEL_OPTIONS,
	TASK_STATUS_OPTIONS
} from '$lib/types/control-plane';
import {
	createTask,
	loadControlPlane,
	parseLane,
	parseTaskApprovalMode,
	parseTaskRiskLevel,
	parsePriority,
	parseTaskStatus,
	taskHasUnmetDependencies,
	updateControlPlane
} from '$lib/server/control-plane';

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const roleMap = new Map(data.roles.map((role) => [role.id, role]));
	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const taskMap = new Map(data.tasks.map((task) => [task.id, task]));

	return {
		laneOptions: LANE_OPTIONS,
		priorityOptions: PRIORITY_OPTIONS,
		riskLevelOptions: TASK_RISK_LEVEL_OPTIONS,
		approvalModeOptions: TASK_APPROVAL_MODE_OPTIONS,
		statusOptions: TASK_STATUS_OPTIONS,
		goals: [...data.goals].sort((a, b) => a.name.localeCompare(b.name)),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		workers: [...data.workers].sort((a, b) => a.name.localeCompare(b.name)),
		tasks: [...data.tasks]
			.map((task) => ({
				...task,
				goalName: goalMap.get(task.goalId)?.name ?? 'Unknown goal',
				roleName: roleMap.get(task.desiredRoleId)?.name ?? 'Unknown role',
				assigneeName: task.assigneeWorkerId
					? (workerMap.get(task.assigneeWorkerId)?.name ?? 'Unknown worker')
					: 'Unassigned',
				dependencyTaskNames: task.dependencyTaskIds.map(
					(dependencyTaskId) => taskMap.get(dependencyTaskId)?.title ?? dependencyTaskId
				),
				hasUnmetDependencies: taskHasUnmetDependencies(data, task)
			}))
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
	};
};

export const actions: Actions = {
	createTask: async ({ request }) => {
		const form = await request.formData();
		const title = form.get('title')?.toString().trim() ?? '';
		const summary = form.get('summary')?.toString().trim() ?? '';
		const artifactPath = form.get('artifactPath')?.toString().trim() ?? '';
		const goalId = form.get('goalId')?.toString().trim() ?? '';
		const desiredRoleId = form.get('desiredRoleId')?.toString().trim() ?? '';
		const lane = parseLane(form.get('lane')?.toString() ?? '', 'product');
		const priority = parsePriority(form.get('priority')?.toString() ?? '', 'medium');
		const riskLevel = parseTaskRiskLevel(form.get('riskLevel')?.toString() ?? '', 'medium');
		const approvalMode = parseTaskApprovalMode(form.get('approvalMode')?.toString() ?? '', 'none');
		const requiresReview = form.get('requiresReview') === 'on';
		const blockedReason = form.get('blockedReason')?.toString().trim() ?? '';
		const dependencyTaskIds = form
			.getAll('dependencyTaskIds')
			.map((value) => value.toString().trim())
			.filter(Boolean);
		const assigneeWorkerId = form.get('assigneeWorkerId')?.toString().trim() || null;

		if (!title || !summary || !artifactPath || !goalId || !desiredRoleId) {
			return fail(400, {
				message: 'Title, summary, goal, desired role, and artifact path are required.'
			});
		}

		await updateControlPlane((data) => ({
			...data,
			tasks: [
				createTask({
					title,
					summary,
					artifactPath,
					goalId,
					desiredRoleId,
					lane,
					priority,
					riskLevel,
					approvalMode,
					requiresReview,
					blockedReason,
					dependencyTaskIds,
					assigneeWorkerId
				}),
				...data.tasks
			]
		}));

		return { ok: true };
	},

	updateTask: async ({ request }) => {
		const form = await request.formData();
		const taskId = form.get('taskId')?.toString().trim() ?? '';
		const status = parseTaskStatus(form.get('status')?.toString() ?? '', 'ready');
		const riskLevel = parseTaskRiskLevel(form.get('riskLevel')?.toString() ?? '', 'medium');
		const approvalMode = parseTaskApprovalMode(form.get('approvalMode')?.toString() ?? '', 'none');
		const requiresReview = form.get('requiresReview') === 'on';
		const blockedReason = form.get('blockedReason')?.toString().trim() ?? '';
		const dependencyTaskIds = form
			.getAll('dependencyTaskIds')
			.map((value) => value.toString().trim())
			.filter(Boolean);
		const assigneeWorkerId = form.get('assigneeWorkerId')?.toString().trim() || null;

		if (!taskId) {
			return fail(400, { message: 'Task ID is required.' });
		}

		await updateControlPlane((data) => ({
			...data,
			tasks: data.tasks.map((task) =>
				task.id === taskId
					? {
							...task,
							status,
							riskLevel,
							approvalMode,
							requiresReview,
							assigneeWorkerId,
							blockedReason,
							dependencyTaskIds: dependencyTaskIds.filter(
								(dependencyTaskId) => dependencyTaskId !== taskId
							),
							updatedAt: new Date().toISOString()
						}
					: task
			)
		}));

		return { ok: true };
	}
};
