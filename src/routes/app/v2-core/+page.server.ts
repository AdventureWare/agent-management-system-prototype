import { randomUUID } from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getDefaultV2CoreDbFile,
	openV2CoreDb,
	openV2CoreDbReadonly
} from '$lib/server/v2-core-persistence';
import {
	launchV2CoreProviderRun,
	readV2CoreNextWork,
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

function createUiRecordId(prefix: string) {
	return `${prefix}_${randomUUID().replaceAll('-', '_')}`;
}

function readDispatchProviderId(db: ReturnType<typeof openV2CoreDb>, form: FormData) {
	const explicitProviderId = form.get('providerId')?.toString().trim() ?? '';
	if (explicitProviderId) {
		return explicitProviderId;
	}

	return (
		db
			.prepare<[], { id: string }>(
				`
					select id
					from v2_core_model_providers
					where status = 'available'
					order by
						case kind
							when 'external_ai' then 0
							when 'local_model' then 1
							else 2
						end,
						id
					limit 1
				`
			)
			.get()?.id ?? ''
	);
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
	},
	dispatchGoalWork: async ({ request, url }) => {
		const dbFile = _getV2CoreUiDbFile();
		const form = await request.formData();
		const goalId = readRequiredFormText(form, 'goalId', 'Goal');
		const taskId = readRequiredFormText(form, 'taskId', 'Task');

		const db = openV2CoreDb({ dbFile });
		try {
			const goal = db
				.prepare<[string], { id: string; status: string }>(
					'select id, status from v2_core_goals where id = ?'
				)
				.get(goalId);
			if (!goal) {
				return fail(404, {
					ok: false,
					action: 'dispatchGoalWork',
					message: 'V2 core goal not found.'
				});
			}
			if (goal.status !== 'active') {
				return fail(400, {
					ok: false,
					action: 'dispatchGoalWork',
					message: `Goal ${goalId} is ${goal.status}; only running goals can dispatch work.`
				});
			}

			const selectedCandidate = readV2CoreNextWork(db, { goalId, limit: 10 }).candidates.find(
				(candidate) => candidate.taskId === taskId
			);
			if (!selectedCandidate || selectedCandidate.action !== 'start_task') {
				return fail(400, {
					ok: false,
					action: 'dispatchGoalWork',
					message: `Task ${taskId} is not dispatchable next work for goal ${goalId}.`
				});
			}

			const modelProviderId = readDispatchProviderId(db, form);
			if (!modelProviderId) {
				return fail(400, {
					ok: false,
					action: 'dispatchGoalWork',
					message: 'No available model provider is registered for dispatch.'
				});
			}

			launchV2CoreProviderRun(db, {
				runId: createUiRecordId('run_ui_goal_dispatch'),
				taskId,
				modelProviderId,
				inputSummary: `Dispatch next work for goal ${goalId} from the v2 core operator console.`,
				actionSummary:
					'Launch selected next-work task through the existing provider-run path; execution result, artifacts, review, and acceptance remain explicit follow-up actions.'
			});
		} catch (caught) {
			return fail(400, {
				ok: false,
				action: 'dispatchGoalWork',
				message: caught instanceof Error ? caught.message : String(caught)
			});
		} finally {
			db.close();
		}

		const redirectUrl = new URL(url);
		throw redirect(303, `${redirectUrl.pathname}${redirectUrl.search}`);
	}
};
