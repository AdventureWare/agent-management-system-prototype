import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
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

export async function persistTaskAttachmentPath(input: {
	taskId: string;
	attachmentRoot: string;
	sourcePath: string;
	name?: string;
	contentType?: string;
}) {
	const attachmentFolder = join(input.attachmentRoot, 'task-attachments', input.taskId);

	await mkdir(attachmentFolder, { recursive: true });

	const sourceFile = await stat(input.sourcePath);

	if (!sourceFile.isFile()) {
		throw new Error('Attachment source path must point to a file.');
	}

	const attachmentId = createTaskAttachmentId();
	const safeName = sanitizeTaskAttachmentName(input.name || input.sourcePath);
	const attachmentPath = join(attachmentFolder, `${attachmentId}-${safeName}`);

	await copyFile(input.sourcePath, attachmentPath);

	return {
		id: attachmentId,
		name: input.name?.trim() || safeName,
		path: attachmentPath,
		contentType: input.contentType?.trim() || 'application/octet-stream',
		sizeBytes: sourceFile.size,
		attachedAt: new Date().toISOString()
	} satisfies TaskAttachment;
}
