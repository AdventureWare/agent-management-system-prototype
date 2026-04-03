import { error, json } from '@sveltejs/kit';
import { inspectArtifactPathStatus } from '$lib/server/artifact-browser';

export const GET = async ({ url }) => {
	const path = url.searchParams.get('path') ?? '';

	try {
		return json(await inspectArtifactPathStatus(path));
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : 'Artifact inspection failed.';
		const status =
			message === 'Path is required.' || message === 'Use an absolute path.' ? 400 : 500;

		throw error(status, message);
	}
};
