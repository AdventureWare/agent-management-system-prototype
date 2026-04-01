import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createTaskAttachmentId } from '$lib/server/control-plane';
import type { Project, Task, TaskAttachment } from '$lib/types/control-plane';

export function getTaskAttachmentRoot(task: Pick<Task, 'artifactPath'>, project: Project | null) {
	return task.artifactPath || project?.defaultArtifactRoot || project?.projectRootFolder || '';
}

export function sanitizeTaskAttachmentName(name: string) {
	const basename =
		name
			.split(/[/\\]+/)
			.at(-1)
			?.trim() ?? '';
	const normalized = basename
		.replace(/[^A-Za-z0-9._-]+/g, '-')
		.replace(/^\.+/, '')
		.replace(/-+/g, '-')
		.replace(/^[-_.]+|[-_.]+$/g, '');

	return normalized || 'attachment';
}

export async function persistTaskAttachments(input: {
	taskId: string;
	attachmentRoot: string;
	uploads: File[];
}) {
	const attachmentFolder = join(input.attachmentRoot, 'task-attachments', input.taskId);

	await mkdir(attachmentFolder, { recursive: true });

	return Promise.all(
		input.uploads.map(async (upload): Promise<TaskAttachment> => {
			const attachmentId = createTaskAttachmentId();
			const safeName = sanitizeTaskAttachmentName(upload.name);
			const attachmentPath = join(attachmentFolder, `${attachmentId}-${safeName}`);

			await writeFile(attachmentPath, Buffer.from(await upload.arrayBuffer()));

			return {
				id: attachmentId,
				name: upload.name.trim() || safeName,
				path: attachmentPath,
				contentType: upload.type || 'application/octet-stream',
				sizeBytes: upload.size,
				attachedAt: new Date().toISOString()
			};
		})
	);
}
