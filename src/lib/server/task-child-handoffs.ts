import { createDecision, loadControlPlane } from '$lib/server/control-plane';
import { updateTaskRecord } from '$lib/server/control-plane-repository';

export class TaskChildHandoffActionError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'TaskChildHandoffActionError';
	}
}

function readChildTaskId(form: FormData) {
	return form.get('childTaskId')?.toString().trim() ?? '';
}

function resolveParentChildPair(parentTaskId: string, childTaskId: string) {
	return loadControlPlane().then((current) => {
		const parentTask = current.tasks.find((candidate) => candidate.id === parentTaskId);
		const childTask = current.tasks.find((candidate) => candidate.id === childTaskId);

		if (!parentTask) {
			throw new TaskChildHandoffActionError(404, 'Parent task not found.');
		}

		if (!childTask || childTask.parentTaskId !== parentTask.id) {
			throw new TaskChildHandoffActionError(404, 'Delegated child task not found.');
		}

		return { parentTask, childTask };
	});
}

export async function acceptTaskChildHandoff(parentTaskId: string, form: FormData) {
	const childTaskId = readChildTaskId(form);
	const { parentTask, childTask } = await resolveParentChildPair(parentTaskId, childTaskId);

	if (childTask.delegationAcceptance) {
		throw new TaskChildHandoffActionError(409, 'This child handoff has already been accepted.');
	}

	if (childTask.status !== 'done') {
		throw new TaskChildHandoffActionError(
			409,
			'Only completed child tasks can be accepted into the parent.'
		);
	}

	const now = new Date().toISOString();
	const summary =
		form.get('summary')?.toString().trim() ||
		`Accepted child handoff into parent task "${parentTask.title}".`;

	const updatedChildTask = await updateTaskRecord({
		taskId: childTask.id,
		update: (candidate) => ({
			...candidate,
			delegationAcceptance: {
				summary,
				acceptedAt: now
			},
			updatedAt: now
		}),
		prependDecisions: [
			createDecision({
				taskId: childTask.id,
				decisionType: 'delegation_handoff_accepted',
				summary,
				createdAt: now
			})
		]
	});

	if (!updatedChildTask) {
		throw new TaskChildHandoffActionError(404, 'Delegated child task not found.');
	}

	return {
		ok: true,
		successAction: 'acceptChildHandoff' as const,
		taskId: parentTaskId,
		childTaskId
	};
}

export async function requestTaskChildHandoffChanges(parentTaskId: string, form: FormData) {
	const childTaskId = readChildTaskId(form);
	const { childTask } = await resolveParentChildPair(parentTaskId, childTaskId);

	if (childTask.delegationAcceptance) {
		throw new TaskChildHandoffActionError(
			409,
			'Accepted child handoffs cannot be returned for follow-up.'
		);
	}

	if (childTask.status !== 'done') {
		throw new TaskChildHandoffActionError(
			409,
			'Only completed child tasks can be returned for follow-up.'
		);
	}

	const now = new Date().toISOString();
	const blockedReason =
		form.get('summary')?.toString().trim() ||
		'Parent task requested follow-up before accepting this child handoff.';

	const updatedChildTask = await updateTaskRecord({
		taskId: childTask.id,
		update: (candidate) => ({
			...candidate,
			status: 'blocked',
			blockedReason,
			delegationAcceptance: null,
			updatedAt: now
		}),
		prependDecisions: [
			createDecision({
				taskId: childTask.id,
				decisionType: 'delegation_handoff_changes_requested',
				summary: blockedReason,
				createdAt: now
			})
		]
	});

	if (!updatedChildTask) {
		throw new TaskChildHandoffActionError(404, 'Delegated child task not found.');
	}

	return {
		ok: true,
		successAction: 'requestChildHandoffChanges' as const,
		taskId: parentTaskId,
		childTaskId
	};
}
