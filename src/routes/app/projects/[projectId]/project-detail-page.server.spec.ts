import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

const deleteProjectMock = vi.hoisted(() =>
	vi.fn((data: ControlPlaneData, projectId: string) => ({
		...data,
		projects: data.projects.filter((project) => project.id !== projectId)
	}))
);
const buildProjectPermissionSurfaceMock = vi.hoisted(() =>
	vi.fn((project: { additionalWritableRoots?: string[] }) => ({
		effectiveSandbox: 'workspace-write',
		sandboxSource: 'Fallback until a worker or provider override is chosen',
		summary: {
			trackedPathCount: 3 + (project.additionalWritableRoots?.length ?? 0),
			blockerCount: 0,
			macosPromptCount: 0,
			outsideSandboxCount: 0
		},
		localPaths: [
			{
				label: 'Project root folder',
				path: '/tmp/project',
				accessStatus: 'ready',
				coverageStatus: 'project_root'
			},
			...((project.additionalWritableRoots ?? []).map((path, index) => ({
				label: `Additional writable root ${index + 1}`,
				path,
				accessStatus: 'ready',
				coverageStatus: 'project_root'
			})) ?? [])
		]
	}))
);

vi.mock('$lib/server/control-plane', () => ({
	deleteProject: deleteProjectMock,
	formatRelativeTime: vi.fn(() => 'just now'),
	goalLinksProject: vi.fn(() => false),
	getOpenReviewForTask: vi.fn(() => null),
	getPendingApprovalForTask: vi.fn(() => null),
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	resolveThreadSandbox: vi.fn(({ project, fallback }) => project?.defaultThreadSandbox ?? fallback),
	taskHasUnmetDependencies: vi.fn(() => false),
	updateControlPlane: vi.fn(async (updater: (data: ControlPlaneData) => ControlPlaneData) => {
		controlPlaneState.saved = updater(controlPlaneState.current as ControlPlaneData);
		controlPlaneState.current = controlPlaneState.saved;
		return controlPlaneState.saved;
	})
}));

vi.mock('$lib/server/project-access', () => ({
	buildProjectPermissionSurface: buildProjectPermissionSurfaceMock
}));

vi.mock('$lib/server/folder-options', () => ({
	loadFolderPickerOptions: vi.fn(async () => [])
}));

import { actions, load } from './+page.server';

describe('project detail page server actions', () => {
	beforeEach(() => {
		deleteProjectMock.mockClear();
		buildProjectPermissionSurfaceMock.mockClear();
		controlPlaneState.current = {
			providers: [],
			roles: [],
			projects: [
				{
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Prototype project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: '',
					additionalWritableRoots: []
				}
			],
			goals: [],
			executionSurfaces: [],
			tasks: [],
			runs: [],
			reviews: [],
			approvals: []
		};
		controlPlaneState.saved = null;
	});

	it('blocks project deletion while linked tasks still exist', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				{
					id: 'task_1',
					title: 'Keep project reference',
					summary: 'Task summary',
					projectId: 'project_1',
					area: 'product',
					goalId: '',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: false,
					desiredRoleId: 'role_1',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output/task_1',
					attachments: [],
					createdAt: '2026-04-03T10:00:00.000Z',
					updatedAt: '2026-04-03T10:00:00.000Z'
				}
			]
		};

		const result = await actions.deleteProject({
			params: { projectId: 'project_1' }
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Delete or move 1 linked task before deleting this project.'
			}
		});
		expect(deleteProjectMock).not.toHaveBeenCalled();
	});

	it('redirects after deleting an unlinked project', async () => {
		await expect(
			actions.deleteProject({
				params: { projectId: 'project_1' }
			} as never)
		).rejects.toMatchObject({
			status: 303,
			location: '/app/projects?deleted=1'
		});

		expect(deleteProjectMock).toHaveBeenCalledWith(
			expect.objectContaining({
				projects: expect.arrayContaining([expect.objectContaining({ id: 'project_1' })])
			}),
			'project_1'
		);
		expect(controlPlaneState.saved?.projects).toEqual([]);
	});

	it('loads a project permissions surface for local paths', async () => {
		(controlPlaneState.current as ControlPlaneData).projects[0]!.additionalWritableRoots = [
			'/tmp/project/shared'
		];

		const result = await load({
			params: { projectId: 'project_1' }
		} as never);
		const pageData = result as Exclude<typeof result, void>;

		expect(pageData.permissionSurface).toMatchObject({
			effectiveSandbox: 'workspace-write',
			summary: {
				trackedPathCount: 4,
				blockerCount: 0,
				macosPromptCount: 0
			}
		});
		expect(pageData.permissionSurface.localPaths).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					label: 'Project root folder',
					path: '/tmp/project',
					accessStatus: 'ready',
					coverageStatus: 'project_root'
				}),
				expect.objectContaining({
					label: 'Additional writable root 1',
					path: '/tmp/project/shared',
					coverageStatus: 'project_root'
				})
			])
		);
		expect(buildProjectPermissionSurfaceMock).toHaveBeenCalled();
	});
});
