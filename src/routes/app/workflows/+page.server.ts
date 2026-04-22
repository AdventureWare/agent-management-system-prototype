import { loadControlPlane } from '$lib/server/control-plane';
import { buildWorkflowDisplayRecords, type WorkflowDisplayRecord } from '$lib/server/workflows';
import type { ControlPlaneData } from '$lib/types/control-plane';

type WorkflowsPageServerData = {
	deleteSuccess: boolean;
	projects: ControlPlaneData['projects'];
	roles: ControlPlaneData['roles'];
	workflows: WorkflowDisplayRecord[];
};

export const load = async ({ url }: { url: URL }): Promise<WorkflowsPageServerData> => {
	const data = await loadControlPlane();

	return {
		deleteSuccess: url.searchParams.get('deleted') === '1',
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		workflows: buildWorkflowDisplayRecords(data)
	};
};
