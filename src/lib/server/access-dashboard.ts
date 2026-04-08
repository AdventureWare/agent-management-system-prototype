import { loadControlPlane } from '$lib/server/control-plane';
import { buildExecutionCapabilityCatalog } from '$lib/server/execution-capability-catalog';
import { buildProjectPermissionSurface } from '$lib/server/project-access';
import type { ControlPlaneData } from '$lib/types/control-plane';

type AttentionPath = {
	id: string;
	projectId: string;
	projectName: string;
	projectHref: string;
	label: string;
	path: string;
	accessStatus: ReturnType<
		typeof buildProjectPermissionSurface
	>['localPaths'][number]['accessStatus'];
	coverageStatus: ReturnType<
		typeof buildProjectPermissionSurface
	>['localPaths'][number]['coverageStatus'];
	accessMessage: string;
	coverageMessage: string;
	recommendedAction: string | null;
	requiredForLaunch: boolean;
	severity: 'high' | 'medium' | 'low';
};

type ProjectAccessEntry = ControlPlaneData['projects'][number] & {
	permissionSurface: ReturnType<typeof buildProjectPermissionSurface>;
	projectHref: string;
};

function getAttentionSeverity(
	item: ReturnType<typeof buildProjectPermissionSurface>['localPaths'][number]
) {
	if (
		item.requiredForLaunch &&
		(item.accessStatus === 'missing' || item.accessStatus === 'needs_host_access')
	) {
		return 'high';
	}

	if (
		item.coverageStatus === 'outside_sandbox' ||
		item.accessStatus === 'macos_cloud_probe_blocked'
	) {
		return 'medium';
	}

	return 'low';
}

function toAttentionPath(project: ProjectAccessEntry) {
	return project.permissionSurface.localPaths
		.filter((item) => item.accessStatus !== 'ready' || item.coverageStatus === 'outside_sandbox')
		.map(
			(item) =>
				({
					id: `${project.id}:${item.id}`,
					projectId: project.id,
					projectName: project.name,
					projectHref: project.projectHref,
					label: item.label,
					path: item.path,
					accessStatus: item.accessStatus,
					coverageStatus: item.coverageStatus,
					accessMessage: item.accessMessage,
					coverageMessage: item.coverageMessage,
					recommendedAction: item.recommendedAction,
					requiredForLaunch: item.requiredForLaunch,
					severity: getAttentionSeverity(item)
				}) satisfies AttentionPath
		);
}

function buildAccessDashboardData(data: ControlPlaneData) {
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const roleMap = new Map(data.roles.map((role) => [role.id, role]));
	const workerCounts = new Map<string, number>();

	for (const worker of data.workers) {
		workerCounts.set(worker.providerId, (workerCounts.get(worker.providerId) ?? 0) + 1);
	}

	const projects = [...data.projects]
		.map((project) => {
			const permissionSurface = buildProjectPermissionSurface(project);
			return {
				...project,
				permissionSurface,
				projectHref: `/app/projects/${project.id}`
			};
		})
		.sort(
			(a, b) =>
				b.permissionSurface.summary.blockerCount - a.permissionSurface.summary.blockerCount ||
				b.permissionSurface.summary.outsideSandboxCount -
					a.permissionSurface.summary.outsideSandboxCount ||
				a.name.localeCompare(b.name)
		);

	const attentionPaths = projects
		.flatMap((project) => toAttentionPath(project))
		.sort((a, b) => {
			const severityRank = { high: 0, medium: 1, low: 2 };
			return (
				severityRank[a.severity] - severityRank[b.severity] ||
				a.projectName.localeCompare(b.projectName)
			);
		});

	const providers = [...data.providers]
		.map((provider) => ({
			...provider,
			workerCount: workerCounts.get(provider.id) ?? 0,
			providerHref: `/app/providers/${provider.id}`
		}))
		.sort(
			(a, b) =>
				Number(b.setupStatus !== 'connected') - Number(a.setupStatus !== 'connected') ||
				Number(!b.enabled) - Number(!a.enabled) ||
				a.name.localeCompare(b.name)
		);

	const workers = [...data.workers]
		.map((worker) => {
			const provider = providerMap.get(worker.providerId) ?? null;
			let accessState:
				| 'healthy'
				| 'provider_disabled'
				| 'provider_needs_setup'
				| 'offline'
				| 'unknown_provider' = 'healthy';

			if (!provider) {
				accessState = 'unknown_provider';
			} else if (!provider.enabled) {
				accessState = 'provider_disabled';
			} else if (provider.setupStatus !== 'connected') {
				accessState = 'provider_needs_setup';
			} else if (worker.status === 'offline') {
				accessState = 'offline';
			}

			return {
				...worker,
				providerName: provider?.name ?? 'Unknown provider',
				roleName: roleMap.get(worker.roleId)?.name ?? 'Unknown role',
				workerHref: `/app/workers/${worker.id}`,
				accessState
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		summary: {
			projectBlockerCount: projects.filter(
				(project) => project.permissionSurface.summary.blockerCount > 0
			).length,
			attentionPathCount: attentionPaths.length,
			macosPromptCount: attentionPaths.filter(
				(item) => item.accessStatus === 'macos_cloud_probe_blocked'
			).length,
			providerNeedsSetupCount: providers.filter((provider) => provider.setupStatus !== 'connected')
				.length,
			workerAccessIssueCount: workers.filter((worker) => worker.accessState !== 'healthy').length
		},
		executionCatalog: buildExecutionCapabilityCatalog(data),
		projects,
		attentionPaths,
		providers,
		workers
	};
}

export type AccessDashboardData = ReturnType<typeof buildAccessDashboardData>;

export async function loadAccessDashboardData() {
	return buildAccessDashboardData(await loadControlPlane());
}

export { buildAccessDashboardData };
