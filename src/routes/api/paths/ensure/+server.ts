import { json } from '@sveltejs/kit';
import { ensurePathTarget, parsePathTarget } from '$lib/server/path-tools';

export const POST = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as {
		path?: string;
		target?: string;
	} | null;

	const path = body?.path?.trim() ?? '';
	const target = parsePathTarget(body?.target, 'folder');

	if (!path) {
		return json({ error: 'Path is required.' }, { status: 400 });
	}

	try {
		const result = await ensurePathTarget({ path, target });
		return json(result);
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Could not create the requested path.' },
			{ status: 400 }
		);
	}
};
