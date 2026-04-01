import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { buildPlanningPageData } from '$lib/server/planning';
import { loadControlPlane, updateControlPlane } from '$lib/server/control-plane';
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
	const normalizedStartDate = startDate <= endDate ? startDate : endDate;
	const normalizedEndDate = startDate <= endDate ? endDate : startDate;

	return {
		...buildPlanningPageData(data, {
			startDate: normalizedStartDate,
			endDate: normalizedEndDate,
			projectId: readFilterValue(url.searchParams.get('projectId')),
			goalId: readFilterValue(url.searchParams.get('goalId')),
			workerId: readFilterValue(url.searchParams.get('workerId')),
			includeUnscheduled:
				includeUnscheduledValues.length === 0 || includeUnscheduledValues.includes('true')
		}),
		confidenceOptions: PLANNING_CONFIDENCE_OPTIONS
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
					targetDate: targetDate || null,
					planningPriority:
						Number.isFinite(planningPriority) && planningPriority >= 0 ? planningPriority : 0,
					confidence: PLANNING_CONFIDENCE_OPTIONS.includes(
						confidence as (typeof PLANNING_CONFIDENCE_OPTIONS)[number]
					)
						? (confidence as (typeof PLANNING_CONFIDENCE_OPTIONS)[number])
						: 'medium'
				};
			})
		}));

		if (!goalUpdated) {
			return fail(404, { message: 'Goal not found.' });
		}

		return {
			ok: true,
			successAction: 'updateGoalPlan'
		};
	}
};
