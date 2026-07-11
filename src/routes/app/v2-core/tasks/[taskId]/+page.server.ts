import { randomUUID } from 'node:crypto';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getDefaultV2CoreDbFile,
	openV2CoreDb,
	openV2CoreDbReadonly
} from '$lib/server/v2-core-persistence';
import {
	attachV2CoreArtifact,
	readV2CoreContextBundle,
	readV2CoreDependencyReport,
	readV2CoreTaskDetail,
	recordV2CoreDecision,
	recordV2CoreRun,
	transitionV2CoreTaskStatus
} from '$lib/server/v2-core-service';

type V2CoreTaskAction = {
	id: string;
	label: string;
	status: 'available' | 'blocked' | 'informational';
	reason: string;
};

const V2_CORE_EXECUTABLE_TASK_ACTIONS: Record<
	string,
	{
		status: string;
		defaultSummary: string;
	}
> = {
	start_task: {
		status: 'in_progress',
		defaultSummary: 'Started task from the v2 core task detail page.'
	},
	mark_blocked: {
		status: 'blocked',
		defaultSummary: 'Marked task blocked from the v2 core task detail page.'
	},
	resolve_blocker: {
		status: 'ready',
		defaultSummary: 'Resolved blocker from the v2 core task detail page.'
	},
	submit_for_review: {
		status: 'review',
		defaultSummary: 'Submitted captured task evidence for review from the v2 core task detail page.'
	},
	accept_output: {
		status: 'done',
		defaultSummary: 'Accepted reviewed task output from the v2 core task detail page.'
	},
	request_changes: {
		status: 'in_progress',
		defaultSummary: 'Returned reviewed task to in_progress from the v2 core task detail page.'
	}
};

const V2_CORE_ARTIFACT_ROLES = ['output', 'evidence', 'deliverable', 'context'] as const;

function hasCapturedReviewEvidence(taskDetail: NonNullable<ReturnType<typeof readV2CoreTaskDetail>>) {
	return (
		taskDetail.runs.length > 0 &&
		taskDetail.artifacts.some((artifact) => artifact.status === 'submitted')
	);
}

function getAvailableActions(
	status: string,
	hasApprovedReview: boolean,
	hasReviewEvidence = false
): V2CoreTaskAction[] {
	switch (status) {
		case 'ready':
			return [
				{
					id: 'start_task',
					label: 'Start task',
					status: 'available',
					reason: 'Task is ready and can move to in_progress.'
				},
				{
					id: 'mark_blocked',
					label: 'Mark blocked',
					status: 'available',
					reason: 'Ready work can be blocked if a missing dependency is found.'
				}
			];
		case 'in_progress':
			return [
				{
					id: 'submit_for_review',
					label: 'Submit for review',
					status: hasReviewEvidence ? 'available' : 'blocked',
					reason: hasReviewEvidence
						? 'Captured run and submitted artifact evidence can move to review.'
						: 'Submit for review requires at least one run and one submitted artifact.'
				},
				{
					id: 'mark_blocked',
					label: 'Mark blocked',
					status: 'available',
					reason: 'In-progress work can be blocked if execution cannot continue.'
				}
			];
		case 'review':
			return [
				{
					id: 'accept_output',
					label: 'Accept output',
					status: hasApprovedReview ? 'available' : 'blocked',
					reason: hasApprovedReview
						? 'Approved review evidence can be accepted to close the task.'
						: 'Closing requires an approved review plus an accept_task_output decision.'
				},
				{
					id: 'request_changes',
					label: 'Request changes',
					status: 'available',
					reason: 'Review work can return to in_progress when changes are needed.'
				}
			];
		case 'blocked':
			return [
				{
					id: 'resolve_blocker',
					label: 'Resolve blocker',
					status: 'available',
					reason: 'Blocked work can return to ready after the blocker is resolved.'
				}
			];
		case 'done':
			return [
				{
					id: 'create_followup',
					label: 'Create follow-up',
					status: 'informational',
					reason: 'Completed work can produce follow-up tasks when evidence indicates more work.'
				}
			];
		default:
			return [
				{
					id: 'no_action',
					label: 'No direct action',
					status: 'informational',
					reason: `Task status is ${status}.`
				}
			];
	}
}

export function _getV2CoreTaskUiDbFile() {
	return process.env.AMS_V2_CORE_DB_FILE?.trim() || getDefaultV2CoreDbFile();
}

function readActionId(form: FormData) {
	return form.get('actionId')?.toString().trim() ?? '';
}

function readActionSummary(form: FormData, actionId: string) {
	const summary = form.get('summary')?.toString().trim() ?? '';
	return summary || V2_CORE_EXECUTABLE_TASK_ACTIONS[actionId]?.defaultSummary || '';
}

function readActionRationale(form: FormData, actionId: string) {
	const summary = readActionSummary(form, actionId);
	return actionId === 'accept_output'
		? summary || 'Approved review evidence was accepted from the v2 core task detail page.'
		: summary;
}

function readOptionalFormText(form: FormData, field: string) {
	return form.get(field)?.toString().trim() ?? '';
}

function readRequiredFormText(form: FormData, field: string, label: string) {
	const value = readOptionalFormText(form, field);
	if (!value) {
		throw new Error(`${label} is required.`);
	}

	return value;
}

function readArtifactRole(form: FormData) {
	const role = readOptionalFormText(form, 'artifactRole') || 'output';

	if (!V2_CORE_ARTIFACT_ROLES.includes(role as (typeof V2_CORE_ARTIFACT_ROLES)[number])) {
		throw new Error(`Artifact role must be one of ${V2_CORE_ARTIFACT_ROLES.join(', ')}.`);
	}

	return role;
}

function createUiRecordId(prefix: string) {
	return `${prefix}_${randomUUID().replaceAll('-', '_')}`;
}

export const load: PageServerLoad = async ({ params }) => {
	const dbFile = _getV2CoreTaskUiDbFile();
	let db: ReturnType<typeof openV2CoreDbReadonly> | null = null;

	try {
		db = openV2CoreDbReadonly({ dbFile });
		const taskDetail = readV2CoreTaskDetail(db, params.taskId);

		if (!taskDetail) {
			throw error(404, 'V2 core task not found.');
		}

		const contextBundle = readV2CoreContextBundle(db, params.taskId);
		const dependencyReport = readV2CoreDependencyReport(db, {
			taskId: params.taskId
		});
			const hasApprovedReview = taskDetail.reviews.some((review) => review.status === 'approved');
			const hasReviewEvidence = hasCapturedReviewEvidence(taskDetail);

			return {
				dbFile,
				taskDetail,
				contextBundle,
				dependencyReport,
				artifactRoles: V2_CORE_ARTIFACT_ROLES,
				availableActions: getAvailableActions(
					taskDetail.task.status,
					hasApprovedReview,
					hasReviewEvidence
				)
			};
	} finally {
		db?.close();
	}
};

export const actions: Actions = {
	applyTaskAction: async ({ params, request }) => {
		const dbFile = _getV2CoreTaskUiDbFile();
		const form = await request.formData();
		const actionId = readActionId(form);
		const actionDefinition = V2_CORE_EXECUTABLE_TASK_ACTIONS[actionId];

		if (!actionDefinition) {
			return fail(400, {
				ok: false,
				action: 'applyTaskAction',
				message: 'Unsupported v2 core task action.'
			});
		}

		const db = openV2CoreDb({ dbFile });
		try {
			const taskDetail = readV2CoreTaskDetail(db, params.taskId);
			if (!taskDetail) {
				throw error(404, 'V2 core task not found.');
			}

			const hasApprovedReview = taskDetail.reviews.some((review) => review.status === 'approved');
			const hasReviewEvidence = hasCapturedReviewEvidence(taskDetail);
			const availableAction = getAvailableActions(
				taskDetail.task.status,
				hasApprovedReview,
				hasReviewEvidence
			).find((action) => action.id === actionId);
			if (availableAction?.status !== 'available') {
				return fail(400, {
					ok: false,
					action: 'applyTaskAction',
					message: `Action ${actionId} is not available while task status is ${taskDetail.task.status}.`
				});
			}

			if (actionId === 'accept_output') {
				const approvedReview = taskDetail.reviews.find((review) => review.status === 'approved');
				if (!approvedReview) {
					return fail(400, {
						ok: false,
						action: 'applyTaskAction',
						message: 'Accept output requires an approved review.'
					});
				}
				recordV2CoreDecision(db, {
					projectId: taskDetail.project.id,
					goalId: taskDetail.goal.id,
					taskId: params.taskId,
					runId: approvedReview.runId ?? undefined,
					reviewId: approvedReview.id,
					decisionType: 'accept_task_output',
					summary: 'Accepted reviewed task output.',
					rationale: readActionRationale(form, actionId)
				});
			}

			transitionV2CoreTaskStatus(db, {
				taskId: params.taskId,
				status: actionDefinition.status,
				summary: readActionSummary(form, actionId)
			});
		} catch (caught) {
			if (caught && typeof caught === 'object' && 'status' in caught && 'body' in caught) {
				throw caught;
			}

			return fail(400, {
				ok: false,
				action: 'applyTaskAction',
				message: caught instanceof Error ? caught.message : String(caught)
			});
		} finally {
			db.close();
		}

		throw redirect(303, `/app/v2-core/tasks/${params.taskId}`);
	},
	recordRunEvidence: async ({ params, request }) => {
		const dbFile = _getV2CoreTaskUiDbFile();
		const form = await request.formData();

		let inputSummary = '';
		let actionSummary = '';
		let resultSummary = '';
		let validationSummary = '';
		let artifactTitle = '';
		let artifactUri = '';
		let artifactSummary = '';
		let artifactRole = '';

		try {
			inputSummary = readOptionalFormText(form, 'inputSummary');
			actionSummary = readRequiredFormText(form, 'actionSummary', 'Action summary');
			resultSummary = readRequiredFormText(form, 'resultSummary', 'Result summary');
			validationSummary = readOptionalFormText(form, 'validationSummary');
			artifactTitle = readRequiredFormText(form, 'artifactTitle', 'Artifact title');
			artifactUri = readRequiredFormText(form, 'artifactUri', 'Artifact URI');
			artifactSummary = readOptionalFormText(form, 'artifactSummary');
			artifactRole = readArtifactRole(form);
		} catch (caught) {
			return fail(400, {
				ok: false,
				action: 'recordRunEvidence',
				message: caught instanceof Error ? caught.message : String(caught)
			});
		}

		const db = openV2CoreDb({ dbFile });
		try {
			const taskDetail = readV2CoreTaskDetail(db, params.taskId);
			if (!taskDetail) {
				throw error(404, 'V2 core task not found.');
			}

			const runId = createUiRecordId('run');
			recordV2CoreRun(db, {
				id: runId,
				taskId: params.taskId,
				status: 'completed',
				inputSummary,
				actionSummary,
				resultSummary,
				validationSummary
			});
			attachV2CoreArtifact(db, {
				taskId: params.taskId,
				runId,
				uri: artifactUri,
				role: artifactRole,
				title: artifactTitle,
				summary: artifactSummary,
				status: 'submitted'
			});
		} catch (caught) {
			if (caught && typeof caught === 'object' && 'status' in caught && 'body' in caught) {
				throw caught;
			}

			return fail(400, {
				ok: false,
				action: 'recordRunEvidence',
				message: caught instanceof Error ? caught.message : String(caught)
			});
		} finally {
			db.close();
		}

		throw redirect(303, `/app/v2-core/tasks/${params.taskId}`);
	}
};
