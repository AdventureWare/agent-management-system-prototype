import { json } from '@sveltejs/kit';
import { load as loadTaskDetailPageData } from '../../../app/tasks/[taskId]/+page.server';

export const GET = async ({ params }) => {
	return json(await loadTaskDetailPageData({ params } as never));
};
