import { loadHomeDashboardData } from '$lib/server/home-dashboard';

export const load = async () => {
	return loadHomeDashboardData();
};
