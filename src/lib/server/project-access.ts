import type { AgentSandbox } from '$lib/types/agent-thread';
import type { Project } from '$lib/types/control-plane';
import { resolveThreadSandbox } from '$lib/server/control-plane';
import {
	getLocalPathSandboxCoverage,
	probeLocalPathAccess,
	type LocalPathSandboxCoverage,
	type LocalPathAccessStatus
} from '$lib/server/task-execution-workspace';

export type ProjectPermissionItem = {
	id: string;
	label: string;
	path: string;
	kind:
		| 'project_root_folder'
		| 'default_artifact_root'
		| 'default_repo_path'
		| 'additional_writable_root';
	importance: string;
	requiredForLaunch: boolean;
	accessStatus: LocalPathAccessStatus;
	accessMessage: string;
	accessGuidance: string | null;
	coverageStatus: LocalPathSandboxCoverage;
	coverageLabel: string;
	coverageMessage: string;
	recommendedAction: string | null;
};

export type ProjectPermissionSurface = {
	checkedAt: string;
	effectiveSandbox: AgentSandbox;
	sandboxSource: string;
	localPaths: ProjectPermissionItem[];
	summary: {
		trackedPathCount: number;
		blockerCount: number;
		macosPromptCount: number;
		outsideSandboxCount: number;
	};
};

function describeSandboxCoverage(status: LocalPathSandboxCoverage, sandbox: AgentSandbox) {
	switch (status) {
		case 'project_root':
			return {
				label: 'Inside project root',
				message: 'Covered because the path lives under the thread workspace root.'
			};
		case 'additional_writable_root':
			return {
				label: 'Extra writable root',
				message: 'Covered because the path lives under Additional writable roots.'
			};
		case 'danger_full_access':
			return {
				label: 'Danger full access',
				message: `Covered because the default thread sandbox is ${sandbox}.`
			};
		case 'outside_sandbox':
			return {
				label: 'Outside sandbox',
				message:
					'Not automatically writable from a standard thread launch. Move it under the project root, add it as an additional writable root, or use danger-full-access.'
			};
		case 'not_configured':
		default:
			return {
				label: 'Not configured',
				message: 'No path is configured for this slot yet.'
			};
	}
}

function buildPermissionItem(input: {
	id: string;
	label: string;
	path: string;
	kind: ProjectPermissionItem['kind'];
	importance: string;
	requiredForLaunch: boolean;
	projectRootFolder: string;
	additionalWritableRoots: string[];
	sandbox: AgentSandbox;
}) {
	const accessReport = probeLocalPathAccess({
		path: input.path,
		mode: input.sandbox === 'danger-full-access' ? 'read' : 'read_write',
		allowMacCloudProbeFailure: input.sandbox === 'danger-full-access'
	});
	const coverageStatus = getLocalPathSandboxCoverage({
		cwd: input.projectRootFolder,
		path: input.path,
		sandbox: input.sandbox,
		additionalWritableRoots: input.additionalWritableRoots
	});
	const coverage = describeSandboxCoverage(coverageStatus, input.sandbox);

	let recommendedAction: string | null = null;

	if (accessReport.status === 'missing') {
		recommendedAction = 'Create the folder or update the project path before retrying the run.';
	} else if (accessReport.status === 'needs_host_access') {
		recommendedAction = accessReport.guidance;
	} else if (accessReport.status === 'macos_cloud_probe_blocked') {
		recommendedAction =
			'Retry the task first. If the run still fails, grant Files and Folders or iCloud Drive access to the app or terminal running AMS.';
	} else if (coverageStatus === 'outside_sandbox') {
		recommendedAction =
			'Move this path under the project root, add it under Additional writable roots, or switch the relevant threads to danger-full-access.';
	}

	return {
		id: input.id,
		label: input.label,
		path: input.path,
		kind: input.kind,
		importance: input.importance,
		requiredForLaunch: input.requiredForLaunch,
		accessStatus: accessReport.status,
		accessMessage: accessReport.message,
		accessGuidance: accessReport.guidance,
		coverageStatus,
		coverageLabel: coverage.label,
		coverageMessage: coverage.message,
		recommendedAction
	} satisfies ProjectPermissionItem;
}

export function buildProjectPermissionSurface(project: Project): ProjectPermissionSurface {
	const effectiveSandbox = resolveThreadSandbox({
		project,
		fallback: 'workspace-write'
	});
	const additionalWritableRoots = project.additionalWritableRoots ?? [];
	const localPaths = [
		buildPermissionItem({
			id: 'project-root-folder',
			label: 'Project root folder',
			path: project.projectRootFolder,
			kind: 'project_root_folder',
			importance: 'Required for every thread start.',
			requiredForLaunch: true,
			projectRootFolder: project.projectRootFolder,
			additionalWritableRoots,
			sandbox: effectiveSandbox
		}),
		buildPermissionItem({
			id: 'default-artifact-root',
			label: 'Default artifact root',
			path: project.defaultArtifactRoot,
			kind: 'default_artifact_root',
			importance: 'Used when task outputs land outside the thread workspace.',
			requiredForLaunch: false,
			projectRootFolder: project.projectRootFolder,
			additionalWritableRoots,
			sandbox: effectiveSandbox
		}),
		buildPermissionItem({
			id: 'default-repo-path',
			label: 'Default repo path',
			path: project.defaultRepoPath,
			kind: 'default_repo_path',
			importance: 'Used when tasks clone or edit a repository outside the project root.',
			requiredForLaunch: false,
			projectRootFolder: project.projectRootFolder,
			additionalWritableRoots,
			sandbox: effectiveSandbox
		}),
		...additionalWritableRoots.map((path, index) =>
			buildPermissionItem({
				id: `additional-writable-root-${index}`,
				label: `Additional writable root ${index + 1}`,
				path,
				kind: 'additional_writable_root',
				importance: 'Required when work needs to read or write outside the project root.',
				requiredForLaunch: true,
				projectRootFolder: project.projectRootFolder,
				additionalWritableRoots,
				sandbox: effectiveSandbox
			})
		)
	];

	const blockerCount = localPaths.filter(
		(item) =>
			item.requiredForLaunch &&
			(item.accessStatus === 'missing' || item.accessStatus === 'needs_host_access')
	).length;
	const macosPromptCount = localPaths.filter(
		(item) => item.accessStatus === 'macos_cloud_probe_blocked'
	).length;
	const outsideSandboxCount = localPaths.filter(
		(item) => item.accessStatus !== 'not_configured' && item.coverageStatus === 'outside_sandbox'
	).length;

	return {
		checkedAt: new Date().toISOString(),
		effectiveSandbox,
		sandboxSource: project.defaultThreadSandbox
			? 'Project default'
			: 'Fallback until an execution surface or provider override is chosen',
		localPaths,
		summary: {
			trackedPathCount: localPaths.length,
			blockerCount,
			macosPromptCount,
			outsideSandboxCount
		}
	};
}
