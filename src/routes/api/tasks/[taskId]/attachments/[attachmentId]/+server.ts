import { readFile } from 'node:fs/promises';
import { error } from '@sveltejs/kit';
import { loadControlPlane } from '$lib/server/control-plane';

export const GET = async ({ params }) => {
	const data = await loadControlPlane();
	const task = data.tasks.find((candidate) => candidate.id === params.taskId);

	if (!task) {
		throw error(404, 'Task not found.');
	}

	const attachment = task.attachments.find((candidate) => candidate.id === params.attachmentId);

	if (!attachment) {
		throw error(404, 'Attachment not found.');
	}

	try {
		const payload = await readFile(attachment.path);
		const encodedName = encodeURIComponent(attachment.name);

		return new Response(payload, {
			headers: {
				'content-type': attachment.contentType || 'application/octet-stream',
				'content-length': String(payload.byteLength),
				'content-disposition': `attachment; filename*=UTF-8''${encodedName}`
			}
		});
	} catch {
		throw error(404, 'Attached file is missing from disk.');
	}
};
