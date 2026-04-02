import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { buildPlanningPageData } from '$lib/server/planning';
import {
	createDecision,
	createPlanningSession,
	formatRelativeTime,
	loadControlPlane,
	updateControlPlane
} from '$lib/server/control-plane';
import { PLANNING_CONFIDENCE_OPTIONS } from '$lib/types/control-plane';

function isValidDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatDateInput(date: Date) {
	return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function readFilterValue(value: string | null) {
	const trimmed = value?.trim() ?? '';
	return trimmed.length > 0 ? trimmed : '';
}

function normalizeWindowDates(startDate: string, endDate: string) {
	return startDate <= endDate ? { startDate, endDate } : { startDate: endDate, endDate: startDate };
}

function buildGoalPlanDecisionSummary(input: {
	goal: {
		name: string;
		targetDate?: string | null;
		planningPriority?: number;
		confidence?: string | null;
	};
	targetDate: string | null;
	planningPriority: number;
	confidence: string;
}) {
	const changes: string[] = [];

	if ((input.targetDate ?? null) !== (input.goal.targetDate ?? null)) {
		changes.push(
			input.targetDate ? `set target date to ${input.targetDate}` : 'cleared target date'
		);
	}

	if (input.planningPriority !== (input.goal.planningPriority ?? 0)) {
		changes.push(`set planning priority to ${input.planningPriority}`);
	}

	if (input.confidence !== (input.goal.confidence ?? 'medium')) {
		changes.push(`set confidence to ${input.confidence}`);
	}

	return changes.length > 0
		? `Updated goal plan for ${input.goal.name}: ${changes.join('; ')}.`
		: null;
}

export const load: PageServerLoad = async ({ url }) => {
	const data = await loadControlPlane();
	const includeUnscheduledValues = url.searchParams.getAll('includeUnscheduled');
	const today = new Date();
	const defaultStartDate = formatDateInput(today);
	const defaultEndDate = formatDateInput(addDays(today, 13));
	const rawStartDate = readFilterValue(url.searchParams.get('startDate'));
	const rawEndDate = readFilterValue(url.searchParams.get('endDate'));
	const startDate = (isValidDate(rawStartDate) && rawStartDate) || defaultStartDate;
	const endDate = (isValidDate(rawEndDate) && rawEndDate) || defaultEndDate;
	const { startDate: normalizedStartDate, endDate: normalizedEndDate } = normalizeWindowDates(
		startDate,
		endDate
	);
	const planningData = buildPlanningPageData(data, {
		startDate: normalizedStartDate,
		endDate: normalizedEndDate,
		projectId: readFilterValue(url.searchParams.get('projectId')),
		goalId: readFilterValue(url.searchParams.get('goalId')),
		workerId: readFilterValue(url.searchParams.get('workerId')),
		includeUnscheduled:
			includeUnscheduledValues.length === 0 || includeUnscheduledValues.includes('true')
	});
	const recentPlanningSessions = [...(data.planningSessions ?? [])]
		.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
		.slice(0, 8)
		.map((session) => ({
			...session,
			createdAtLabel: formatRelativeTime(session.createdAt)
		}));

	return {
		...planningData,
		confidenceOptions: PLANNING_CONFIDENCE_OPTIONS,
		recentPlanningSessions
	};
};

export const actions: Actions = {
	updateGoalPlan: async ({ request }) => {
		const form = await request.formData();
		const goalId = form.get('goalId')?.toString().trim() ?? '';
		const targetDate = form.get('targetDate')?.toString().trim() ?? '';
		const planningPriority = Number.parseInt(
			form.get('planningPriority')?.toString().trim() ?? '0',
			10
		);
		const confidence = form.get('confidence')?.toString().trim() ?? 'medium';

		if (!goalId) {
			return fail(400, { message: 'Goal ID is required.' });
		}

		if (targetDate && !isValidDate(targetDate)) {
			return fail(400, {
				message: 'Target date must use YYYY-MM-DD format.'
			});
		}

		const current = await loadControlPlane();
		const goal = current.goals.find((candidate) => candidate.id === goalId);

		if (!goal) {
			return fail(404, { message: 'Goal not found.' });
		}

		const nextPlanningPriority =
			Number.isFinite(planningPriority) && planningPriority >= 0 ? planningPriority : 0;
		const nextConfidence = PLANNING_CONFIDENCE_OPTIONS.includes(
			confidence as (typeof PLANNING_CONFIDENCE_OPTIONS)[number]
		)
			? (confidence as (typeof PLANNING_CONFIDENCE_OPTIONS)[number])
			: 'medium';
		const nextTargetDate = targetDate || null;
		const now = new Date().toISOString();
		const decisionSummary = buildGoalPlanDecisionSummary({
			goal,
			targetDate: nextTargetDate,
			planningPriority: nextPlanningPriority,
			confidence: nextConfidence
		});
		let goalUpdated = false;

		await updateControlPlane((data) => ({
			...data,
			goals: data.goals.map((goal) => {
				if (goal.id !== goalId) {
					return goal;
				}

				goalUpdated = true;
				return {
					...goal,
					targetDate: nextTargetDate,
					planningPriority: nextPlanningPriority,
					confidence: nextConfidence
				};
			}),
			decisions: decisionSummary
				? [
						createDecision({
							goalId,
							decisionType: 'goal_plan_updated',
							summary: decisionSummary,
							createdAt: now
						}),
						...(data.decisions ?? [])
					]
				: (data.decisions ?? [])
		}));

		if (!goalUpdated) {
			return fail(404, { message: 'Goal not found.' });
		}

		return {
			ok: true,
			successAction: 'updateGoalPlan'
		};
	},

	capturePlanningSession: async ({ request }) => {
		const form = await request.formData();
		const rawStartDate = readFilterValue(form.get('startDate')?.toString() ?? '');
		const rawEndDate = readFilterValue(form.get('endDate')?.toString() ?? '');
		const projectId = readFilterValue(form.get('projectId')?.toString() ?? '');
		const goalId = readFilterValue(form.get('goalId')?.toString() ?? '');
		const workerId = readFilterValue(form.get('workerId')?.toString() ?? '');
		const includeUnscheduledValues = form
			.getAll('includeUnscheduled')
			.map((value) => value.toString());

		if (!isValidDate(rawStartDate) || !isValidDate(rawEndDate)) {
			return fail(400, { message: 'Start and end dates must use YYYY-MM-DD format.' });
		}

		const { startDate, endDate } = normalizeWindowDates(rawStartDate, rawEndDate);
		const includeUnscheduled =
			includeUnscheduledValues.length === 0 || includeUnscheduledValues.includes('true');
		const current = await loadControlPlane();
		const planningData = buildPlanningPageData(current, {
			startDate,
			endDate,
			projectId,
			goalId,
			workerId,
			includeUnscheduled
		});
		const goalIds = planningData.goalsInScope.map((goal) => goal.id);
		const taskIds = planningData.scheduledTasks
			.concat(planningData.unscheduledTasks)
			.map((task) => task.id);
		const taskIdSet = new Set(taskIds);
		const goalIdSet = new Set(goalIds);
		const decisionIds = (current.decisions ?? [])
			.filter(
				(decision) =>
					(decision.taskId && taskIdSet.has(decision.taskId)) ||
					(decision.goalId && goalIdSet.has(decision.goalId))
			)
			.map((decision) => decision.id);
		const createdAt = new Date().toISOString();
		const session = createPlanningSession({
			windowStart: startDate,
			windowEnd: endDate,
			projectId: projectId || null,
			goalId: goalId || null,
			workerId: workerId || null,
			includeUnscheduled,
			goalIds,
			taskIds,
			decisionIds,
			summary: `Reviewed ${goalIds.length} goal(s), ${taskIds.length} task(s), and ${decisionIds.length} linked decision(s) for ${startDate} to ${endDate}.`,
			createdAt
		});

		await updateControlPlane((data) => ({
			...data,
			planningSessions: [session, ...(data.planningSessions ?? [])]
		}));

		return {
			ok: true,
			successAction: 'capturePlanningSession',
			planningSessionId: session.id
		};
	}
};
