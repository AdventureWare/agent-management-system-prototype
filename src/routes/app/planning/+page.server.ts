import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { buildPlanningPageData } from '$lib/server/planning';
import {
	createPlanningHorizon,
	loadControlPlane,
	updateControlPlane
} from '$lib/server/control-plane';
import {
	PLANNING_CAPACITY_UNIT_OPTIONS,
	PLANNING_CONFIDENCE_OPTIONS,
	PLANNING_HORIZON_KIND_OPTIONS,
	PLANNING_HORIZON_STATUS_OPTIONS
} from '$lib/types/control-plane';

function isValidDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function readSelectedHorizonId(form: FormData) {
	return form.get('planningHorizonId')?.toString().trim() ?? '';
}

export const load: PageServerLoad = async ({ url }) => {
	const data = await loadControlPlane();
	const selectedHorizonId = url.searchParams.get('horizon');

	return {
		...buildPlanningPageData(data, selectedHorizonId),
		selectedHorizonId,
		horizonKindOptions: PLANNING_HORIZON_KIND_OPTIONS,
		horizonStatusOptions: PLANNING_HORIZON_STATUS_OPTIONS,
		capacityUnitOptions: PLANNING_CAPACITY_UNIT_OPTIONS,
		confidenceOptions: PLANNING_CONFIDENCE_OPTIONS
	};
};

export const actions: Actions = {
	createPlanningHorizon: async ({ request }) => {
		const form = await request.formData();
		const name = form.get('name')?.toString().trim() ?? '';
		const kind = form.get('kind')?.toString().trim() ?? 'custom';
		const status = form.get('status')?.toString().trim() ?? 'draft';
		const startDate = form.get('startDate')?.toString().trim() ?? '';
		const endDate = form.get('endDate')?.toString().trim() ?? '';
		const notes = form.get('notes')?.toString().trim() ?? '';
		const capacityUnit = form.get('capacityUnit')?.toString().trim() ?? 'hours';

		if (!name || !isValidDate(startDate) || !isValidDate(endDate)) {
			return fail(400, {
				message: 'Name, start date, and end date are required.',
				values: { name, kind, status, startDate, endDate, notes, capacityUnit }
			});
		}

		if (startDate > endDate) {
			return fail(400, {
				message: 'Start date must be before the end date.',
				values: { name, kind, status, startDate, endDate, notes, capacityUnit }
			});
		}

		const horizon = createPlanningHorizon({
			name,
			kind: PLANNING_HORIZON_KIND_OPTIONS.includes(kind as (typeof PLANNING_HORIZON_KIND_OPTIONS)[number])
				? (kind as (typeof PLANNING_HORIZON_KIND_OPTIONS)[number])
				: 'custom',
			status: PLANNING_HORIZON_STATUS_OPTIONS.includes(
				status as (typeof PLANNING_HORIZON_STATUS_OPTIONS)[number]
			)
				? (status as (typeof PLANNING_HORIZON_STATUS_OPTIONS)[number])
				: 'draft',
			startDate,
			endDate,
			notes,
			capacityUnit: PLANNING_CAPACITY_UNIT_OPTIONS.includes(
				capacityUnit as (typeof PLANNING_CAPACITY_UNIT_OPTIONS)[number]
			)
				? (capacityUnit as (typeof PLANNING_CAPACITY_UNIT_OPTIONS)[number])
				: 'hours'
		});

		await updateControlPlane((data) => ({
			...data,
			planningHorizons: [horizon, ...(data.planningHorizons ?? [])]
		}));

		return {
			ok: true,
			successAction: 'createPlanningHorizon',
			selectedHorizonId: horizon.id
		};
	},

	slotGoal: async ({ request }) => {
		const form = await request.formData();
		const planningHorizonId = readSelectedHorizonId(form);
		const goalId = form.get('goalId')?.toString().trim() ?? '';

		if (!planningHorizonId || !goalId) {
			return fail(400, { message: 'Select a horizon and a goal first.' });
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
					planningHorizonId
				};
			})
		}));

		if (!goalUpdated) {
			return fail(404, { message: 'Goal not found.' });
		}

		return {
			ok: true,
			successAction: 'slotGoal',
			selectedHorizonId: planningHorizonId
		};
	},

	unslotGoal: async ({ request }) => {
		const form = await request.formData();
		const planningHorizonId = readSelectedHorizonId(form);
		const goalId = form.get('goalId')?.toString().trim() ?? '';

		if (!goalId) {
			return fail(400, { message: 'Goal ID is required.' });
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
					planningHorizonId: null
				};
			})
		}));

		if (!goalUpdated) {
			return fail(404, { message: 'Goal not found.' });
		}

		return {
			ok: true,
			successAction: 'unslotGoal',
			selectedHorizonId: planningHorizonId
		};
	},

	updateGoalPlan: async ({ request }) => {
		const form = await request.formData();
		const planningHorizonId = readSelectedHorizonId(form);
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
				message: 'Target date must use YYYY-MM-DD format.',
				selectedHorizonId: planningHorizonId
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
			successAction: 'updateGoalPlan',
			selectedHorizonId: planningHorizonId
		};
	}
};
