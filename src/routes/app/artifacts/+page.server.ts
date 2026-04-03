import type { PageServerLoad } from './$types';
import { buildArtifactBrowser } from '$lib/server/artifact-browser';

export const load: PageServerLoad = async ({ url }) => {
	const path = url.searchParams.get('path')?.trim() ?? '';

	return {
		path,
		artifactBrowser: path
			? await buildArtifactBrowser({
					rootPath: path,
					rootFileLabel: 'Recorded output'
				})
			: null
	};
};
