import { json } from '@sveltejs/kit';
import { load as loadExecutionSurfaceDetailPageData } from '../../../app/execution-surfaces/[executionSurfaceId]/+page.server';

export const GET = async ({ params }) => {
	return json(await loadExecutionSurfaceDetailPageData({ params } as never));
};
