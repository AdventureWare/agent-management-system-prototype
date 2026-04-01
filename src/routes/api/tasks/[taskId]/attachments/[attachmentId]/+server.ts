import { error } from '@sveltejs/kit';
import { createArtifactDownloadResponse } from '$lib/server/artifact-browser';
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
		return await createArtifactDownloadResponse({
			path: attachment.path,
			name: attachment.name,
			contentType: attachment.contentType
		});
	} catch {
		throw error(404, 'Attached file is missing from disk.');
	}
};
