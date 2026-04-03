import { error } from '@sveltejs/kit';
import { createArtifactDownloadResponse } from '$lib/server/artifact-browser';
import { getAgentThread } from '$lib/server/agent-threads';

export const GET = async ({ params }) => {
	const session = await getAgentThread(params.sessionId);

	if (!session) {
		throw error(404, 'Thread not found.');
	}

	const attachment = (session.attachments ?? []).find(
		(candidate) => candidate.id === params.attachmentId
	);

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
