import { error, json } from '@sveltejs/kit';
import { buildArtifactDiffPreview } from '$lib/server/artifact-browser';

export const GET = async ({ url }) => {
	const path = url.searchParams.get('path') ?? '';

	try {
		return json(await buildArtifactDiffPreview({ path }));
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : 'Artifact diff failed.';
		const status =
			message === 'Path is required.' ||
			message === 'Use an absolute path.' ||
			message === 'Only files can be diffed.'
				? 400
				: message === 'Artifact file is missing from disk.'
					? 404
					: 500;

		throw error(status, message);
	}
};
