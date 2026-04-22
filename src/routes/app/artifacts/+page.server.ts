import type { PageServerLoad } from './$types';
import { buildArtifactBrowser } from '$lib/server/artifact-browser';

export const load: PageServerLoad = async ({ url }) => {
	const path = url.searchParams.get('path')?.trim() ?? '';
	const line = Number.parseInt(url.searchParams.get('line') ?? '', 10);
	const column = Number.parseInt(url.searchParams.get('column') ?? '', 10);

	return {
		path,
		line: Number.isFinite(line) && line > 0 ? line : null,
		column: Number.isFinite(column) && column > 0 ? column : null,
		artifactBrowser: path
			? await buildArtifactBrowser({
					rootPath: path,
					rootFileLabel: 'Recorded output'
				})
			: null
	};
};
