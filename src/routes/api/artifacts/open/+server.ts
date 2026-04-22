import { error, json } from '@sveltejs/kit';
import { openArtifactInEditor } from '$lib/server/artifact-browser';

export const POST = async ({ request }) => {
	const payload = await request.json().catch(() => null);
	const path = typeof payload?.path === 'string' ? payload.path : '';
	const editor = typeof payload?.editor === 'string' ? payload.editor : null;
	const line = Number.parseInt(String(payload?.line ?? ''), 10);
	const column = Number.parseInt(String(payload?.column ?? ''), 10);

	try {
		return json(
			await openArtifactInEditor({
				path,
				line: Number.isFinite(line) && line > 0 ? line : null,
				column: Number.isFinite(column) && column > 0 ? column : null,
				preferredEditor: editor
			})
		);
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : 'Artifact open failed.';
		const status =
			message === 'Path is required.' ||
			message === 'Use an absolute path.' ||
			message === 'Only files can be opened in the editor.'
				? 400
				: message === 'Artifact file is missing from disk.'
					? 404
					: 500;

		throw error(status, {
			message
		});
	}
};
