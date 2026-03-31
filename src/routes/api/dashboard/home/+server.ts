import { json } from '@sveltejs/kit';
import { loadHomeDashboardData } from '$lib/server/home-dashboard';

export const GET = async () => {
	return json(await loadHomeDashboardData());
};
