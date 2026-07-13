import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getDefaultV2CoreDbFile,
	openV2CoreDb,
	openV2CoreDbReadonly
} from '$lib/server/v2-core-persistence';
import {
	readV2CoreOperatorConsole,
	transitionV2CoreGoalStatus
} from '$lib/server/v2-core-service';

const V2_CORE_GOAL_CONTROL_ACTIONS: Record<
	string,
	{
		status: 'active' | 'paused' | 'blocked';
		label: string;
		defaultSummary: string;
	}
> = {
	pause_goal: {
		status: 'paused',
		label: 'Pause goal',
		defaultSummary: 'Paused goal from the v2 core operator console.'
	},
	resume_goal: {
		status: 'active',
		label: 'Resume goal',
		defaultSummary: 'Resumed goal from the v2 core operator console.'
	},
	block_goal: {
		status: 'blocked',
		label: 'Block goal',
		defaultSummary: 'Blocked goal from the v2 core operator console.'
	}
};

function parseLimit(value: string | null) {
	const parsed = Number.parseInt(value ?? '', 10);

	if (!Number.isFinite(parsed)) {
		return 8;
	}

	return Math.min(Math.max(parsed, 1), 25);
}

export function _getV2CoreUiDbFile() {
	return process.env.AMS_V2_CORE_DB_FILE?.trim() || getDefaultV2CoreDbFile();
}

function readRequiredFormText(form: FormData, field: string, label: string) {
	const value = form.get(field)?.toString().trim() ?? '';
	if (!value) {
		throw new Error(`${label} is required.`);
	}

	return value;
}

function readGoalControlSummary(form: FormData, actionId: string) {
	const summary = form.get('summary')?.toString().trim() ?? '';
	return summary || V2_CORE_GOAL_CONTROL_ACTIONS[actionId]?.defaultSummary || '';
}

export const load: PageServerLoad = async ({ url }) => {
	const dbFile = _getV2CoreUiDbFile();
	const projectId = url.searchParams.get('project')?.trim() || null;
	const goalId = url.searchParams.get('goal')?.trim() || null;
	const limit = parseLimit(url.searchParams.get('limit'));
	let db: ReturnType<typeof openV2CoreDbReadonly> | null = null;

	try {
		db = openV2CoreDbReadonly({ dbFile });
		const operatorConsole = readV2CoreOperatorConsole(db, {
			projectId,
			goalId,
			limit
		});

		return {
			status: 'ready' as const,
			dbFile,
			error: null,
			scope: operatorConsole.scope,
			operatorConsole
		};
	} catch (error) {
		return {
			status: 'unavailable' as const,
			dbFile,
			error: error instanceof Error ? error.message : String(error),
			scope: {
				projectId,
				goalId
			},
			operatorConsole: null
		};
	} finally {
		db?.close();
	}
};

export const actions: Actions = {
	applyGoalAction: async ({ request, url }) => {
		const dbFile = _getV2CoreUiDbFile();
		const form = await request.formData();
		const actionId = readRequiredFormText(form, 'actionId', 'Action');
		const goalId = readRequiredFormText(form, 'goalId', 'Goal');
		const actionDefinition = V2_CORE_GOAL_CONTROL_ACTIONS[actionId];

		if (!actionDefinition) {
			return fail(400, {
				ok: false,
				action: 'applyGoalAction',
				message: 'Unsupported v2 core goal action.'
			});
		}

		const db = openV2CoreDb({ dbFile });
		try {
			const currentGoal = db
				.prepare<[string], { id: string; status: string }>(
					'select id, status from v2_core_goals where id = ?'
				)
				.get(goalId);
			if (!currentGoal) {
				return fail(404, {
					ok: false,
					action: 'applyGoalAction',
					message: 'V2 core goal not found.'
				});
			}

			if (currentGoal.status === actionDefinition.status) {
				return fail(400, {
					ok: false,
					action: 'applyGoalAction',
					message: `Goal ${goalId} is already ${actionDefinition.status}.`
				});
			}

			transitionV2CoreGoalStatus(db, {
				goalId,
				status: actionDefinition.status,
				summary: readGoalControlSummary(form, actionId)
			});
		} catch (caught) {
			return fail(400, {
				ok: false,
				action: 'applyGoalAction',
				message: caught instanceof Error ? caught.message : String(caught)
			});
		} finally {
			db.close();
		}

		const redirectUrl = new URL(url);
		throw redirect(303, `${redirectUrl.pathname}${redirectUrl.search}`);
	}
};
