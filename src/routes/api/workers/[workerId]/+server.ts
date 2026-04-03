import { json } from '@sveltejs/kit';
import { load as loadWorkerDetailPageData } from '../../../app/workers/[workerId]/+page.server';

export const GET = async ({ params }) => {
	return json(await loadWorkerDetailPageData({ params } as never));
};
