import { json } from '@sveltejs/kit';
import { load as loadThreadDetailPageData } from '../../../../../app/threads/[threadId]/+page.server';

export const GET = async ({ params }) => {
	return json(await loadThreadDetailPageData({ params } as never));
};
