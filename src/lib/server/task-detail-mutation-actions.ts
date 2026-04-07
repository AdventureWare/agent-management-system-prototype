import { createDecision, loadControlPlane, updateControlPlane } from '$lib/server/control-plane';
import { getAgentThread } from '$lib/server/agent-threads';
import { getTaskAttachmentRoot, persistTaskAttachments } from '$lib/server/task-attachments';

export class TaskDetailMutationActionError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'TaskDetailMutationActionError';
	}
}

export async function attachTaskFile(taskId: string, form: FormData) {
	const upload = form.get('attachment');
	const current = await loadControlPlane();
	const task = current.tasks.find((candidate) => candidate.id === taskId);

	if (!task) {
		throw new TaskDetailMutationActionError(404, 'Task not found.');
	}

	if (!(upload instanceof File) || upload.size === 0) {
		throw new TaskDetailMutationActionError(400, 'Choose a file to attach.');
	}

	const project = current.projects.find((candidate) => candidate.id === task.projectId) ?? null;
	const attachmentRoot = getTaskAttachmentRoot(task, project);

	if (!attachmentRoot) {
		throw new TaskDetailMutationActionError(
			400,
			'This task needs an artifact root before files can be attached.'
		);
	}

	const [nextAttachment] = await persistTaskAttachments({
		taskId: task.id,
		attachmentRoot,
		uploads: [upload]
	});
	const now = new Date().toISOString();

	await updateControlPlane((data) => ({
		...data,
		tasks: data.tasks.map((candidate) =>
			candidate.id === taskId
				? {
						...candidate,
						attachments: [nextAttachment, ...candidate.attachments],
						updatedAt: now
					}
				: candidate
		)
	}));

	return {
		ok: true,
		successAction: 'attachTaskFile' as const,
		taskId,
		attachmentId: nextAttachment.id
	};
}

export async function removeTaskAttachment(taskId: string, form: FormData) {
	const attachmentId = form.get('attachmentId')?.toString().trim() ?? '';
	const current = await loadControlPlane();
	const task = current.tasks.find((candidate) => candidate.id === taskId);

	if (!task) {
		throw new TaskDetailMutationActionError(404, 'Task not found.');
	}

	if (!attachmentId) {
		throw new TaskDetailMutationActionError(400, 'Attachment ID is required.');
	}

	if (!task.attachments.some((attachment) => attachment.id === attachmentId)) {
		throw new TaskDetailMutationActionError(404, 'Attachment not found.');
	}

	const now = new Date().toISOString();

	await updateControlPlane((data) => ({
		...data,
		tasks: data.tasks.map((candidate) =>
			candidate.id === taskId
				? {
						...candidate,
						attachments: candidate.attachments.filter(
							(attachment) => attachment.id !== attachmentId
						),
						updatedAt: now
					}
				: candidate
		)
	}));

	return {
		ok: true,
		successAction: 'removeTaskAttachment' as const,
		taskId,
		attachmentId
	};
}

export async function updateTaskThreadAssignment(taskId: string, form: FormData) {
	const agentThreadId = form.get('agentThreadId')?.toString().trim() ?? '';
	const current = await loadControlPlane();
	const task = current.tasks.find((candidate) => candidate.id === taskId);

	if (!task) {
		throw new TaskDetailMutationActionError(404, 'Task not found.');
	}

	if (agentThreadId) {
		const session = await getAgentThread(agentThreadId);

		if (!session) {
			throw new TaskDetailMutationActionError(400, 'Selected work thread was not found.');
		}
	}

	const now = new Date().toISOString();
	const decisionSummary =
		(agentThreadId || null) === task.agentThreadId
			? null
			: agentThreadId
				? `Updated task thread assignment to ${agentThreadId}.`
				: 'Cleared the task thread assignment.';

	await updateControlPlane((data) => ({
		...data,
		tasks: data.tasks.map((candidate) =>
			candidate.id === taskId
				? {
						...candidate,
						agentThreadId: agentThreadId || null,
						updatedAt: now
					}
				: candidate
		),
		decisions: decisionSummary
			? [
					createDecision({
						taskId,
						decisionType: 'task_thread_updated',
						summary: decisionSummary,
						createdAt: now
					}),
					...(data.decisions ?? [])
				]
			: (data.decisions ?? [])
	}));

	return {
		ok: true,
		successAction: 'updateTaskThread' as const,
		taskId
	};
}
