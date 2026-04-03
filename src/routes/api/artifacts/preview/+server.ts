import { error } from '@sveltejs/kit';
import { createArtifactDownloadResponse } from '$lib/server/artifact-browser';

export const GET = async ({ url }) => {
	const path = url.searchParams.get('path') ?? '';

	try {
		return await createArtifactDownloadResponse({ path, disposition: 'inline' });
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : 'Artifact preview failed.';
		const status =
			message === 'Path is required.' || message === 'Use an absolute path.' ? 400 : 404;

		throw error(status, message);
	}
};
