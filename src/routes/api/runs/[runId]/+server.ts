import { json } from '@sveltejs/kit';
import { load as loadRunDetailPageData } from '../../../app/runs/[runId]/+page.server';

export const GET = async ({ params }) => {
	return json(await loadRunDetailPageData({ params } as never));
};
