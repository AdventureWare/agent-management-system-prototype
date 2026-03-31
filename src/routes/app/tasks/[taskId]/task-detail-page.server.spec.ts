import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const { mkdir, writeFile } = vi.hoisted(() => ({
	mkdir: vi.fn(),
	writeFile: vi.fn()
}));

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

vi.mock('node:fs/promises', () => ({
	mkdir,
	writeFile
}));

vi.mock('$lib/server/control-plane', () => ({
	createTaskAttachmentId: vi.fn(() => 'attachment_test'),
	createRun: vi.fn(),
	deleteTask: vi.fn(),
	formatRelativeTime: vi.fn(() => 'just now'),
	getOpenReviewForTask: vi.fn(() => null),
	getPendingApprovalForTask: vi.fn(() => null),
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	parseTaskStatus: vi.fn((_value: string, fallback: string) => fallback),
	projectMatchesPath: vi.fn(() => false),
	updateControlPlane: vi.fn(async (updater: (data: ControlPlaneData) => ControlPlaneData) => {
		controlPlaneState.saved = updater(controlPlaneState.current as ControlPlaneData);
		controlPlaneState.current = controlPlaneState.saved;
		return controlPlaneState.saved;
	})
}));

vi.mock('$lib/server/agent-sessions', () => ({
	cancelAgentSession: vi.fn(),
	getAgentSession: vi.fn(),
	listAgentSessions: vi.fn(async () => []),
	sendAgentSessionMessage: vi.fn(),
	startAgentSession: vi.fn()
}));

vi.mock('$lib/server/task-threads', () => ({
	buildPromptDigest: vi.fn(),
	buildTaskThreadName: vi.fn(),
	buildTaskThreadPrompt: vi.fn()
}));

vi.mock('$lib/task-thread-context', () => ({
	selectTaskThreadContext: vi.fn(() => ({
		linkThread: null,
		linkThreadKind: 'assigned',
		statusThread: null
	}))
}));

import { actions } from './+page.server';

describe('task detail page server actions', () => {
	beforeEach(() => {
		mkdir.mockReset();
		writeFile.mockReset();
		controlPlaneState.current = {
			providers: [],
			roles: [],
			projects: [
				{
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				}
			],
			goals: [],
			workers: [],
			tasks: [
				{
					id: 'task_1',
					title: 'Attach a brief',
					summary: 'Need source documents',
					projectId: 'project_1',
					lane: 'product',
					goalId: '',
					priority: 'medium',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					threadSessionId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 1,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				}
			],
			runs: [],
			reviews: [],
			approvals: []
		};
		controlPlaneState.saved = null;
	});

	it('attaches an uploaded file to the task artifact area', async () => {
		const form = new FormData();
		form.set('attachment', new File(['hello task'], 'brief.md', { type: 'text/markdown' }));

		const result = await actions.attachTaskFile({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'attachTaskFile',
				taskId: 'task_1',
				attachmentId: 'attachment_test'
			})
		);
		expect(mkdir).toHaveBeenCalledWith('/tmp/project/agent_output/task-attachments/task_1', {
			recursive: true
		});
		expect(writeFile).toHaveBeenCalledWith(
			'/tmp/project/agent_output/task-attachments/task_1/attachment_test-brief.md',
			expect.any(Buffer)
		);
		expect(controlPlaneState.saved?.tasks[0]?.attachments).toEqual([
			expect.objectContaining({
				id: 'attachment_test',
				name: 'brief.md',
				path: '/tmp/project/agent_output/task-attachments/task_1/attachment_test-brief.md',
				contentType: 'text/markdown',
				sizeBytes: 10
			})
		]);
	});
});
