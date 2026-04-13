import { describe, expect, it } from 'vitest';
import {
	reconcileControlPlaneThreadMessage,
	reconcileControlPlaneThreadState
} from './agent-threads';
import type { ControlPlaneData } from '$lib/types/control-plane';

function createControlPlaneFixture(): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [],
		goals: [],
		executionSurfaces: [],
		tasks: [
			{
				id: 'task_1',
				title: 'Investigate issue',
				summary: 'Task summary',
				projectId: '',
				area: 'product',
				goalId: '',
				parentTaskId: null,
				delegationPacket: null,
				delegationAcceptance: null,
				priority: 'medium',
				status: 'review',
				riskLevel: 'medium',
				approvalMode: 'before_complete',
				requiredThreadSandbox: null,
				requiresReview: true,
				desiredRoleId: '',
				assigneeExecutionSurfaceId: null,
				agentThreadId: 'thread_1',
				requiredPromptSkillNames: [],
				requiredCapabilityNames: [],
				requiredToolNames: [],
				blockedReason: '',
				dependencyTaskIds: [],
				estimateHours: null,
				targetDate: null,
				runCount: 1,
				latestRunId: 'run_1',
				artifactPath: '',
				attachments: [],
				createdAt: '2026-04-10T10:00:00.000Z',
				updatedAt: '2026-04-10T10:05:00.000Z'
			}
		],
		runs: [
			{
				id: 'run_1',
				taskId: 'task_1',
				executionSurfaceId: null,
				providerId: null,
				status: 'completed',
				createdAt: '2026-04-10T10:00:00.000Z',
				updatedAt: '2026-04-10T10:05:00.000Z',
				startedAt: '2026-04-10T10:00:00.000Z',
				endedAt: '2026-04-10T10:05:00.000Z',
				threadId: null,
				agentThreadId: 'thread_1',
				promptDigest: 'digest',
				artifactPaths: [],
				summary: 'Completed prior pass',
				lastHeartbeatAt: '2026-04-10T10:05:00.000Z',
				errorSummary: ''
			}
		],
		reviews: [
			{
				id: 'review_1',
				taskId: 'task_1',
				runId: 'run_1',
				status: 'open',
				createdAt: '2026-04-10T10:05:00.000Z',
				updatedAt: '2026-04-10T10:05:00.000Z',
				resolvedAt: null,
				requestedByExecutionSurfaceId: null,
				reviewerExecutionSurfaceId: null,
				summary: 'Needs review'
			}
		],
		approvals: [
			{
				id: 'approval_1',
				taskId: 'task_1',
				runId: 'run_1',
				mode: 'before_complete',
				status: 'pending',
				createdAt: '2026-04-10T10:05:00.000Z',
				updatedAt: '2026-04-10T10:05:00.000Z',
				resolvedAt: null,
				requestedByExecutionSurfaceId: null,
				approverExecutionSurfaceId: null,
				summary: 'Needs approval'
			}
		],
		decisions: [],
		planningSessions: []
	};
}

describe('agent thread control-plane reconciliation', () => {
	it('reopens linked task state when follow-up work is queued in the thread', () => {
		const reconciled = reconcileControlPlaneThreadMessage(
			createControlPlaneFixture(),
			'thread_1',
			'2026-04-10T10:10:00.000Z'
		);

		expect(reconciled.tasks[0]).toEqual(
			expect.objectContaining({
				status: 'in_progress',
				blockedReason: ''
			})
		);
		expect(reconciled.runs[0]).toEqual(
			expect.objectContaining({
				status: 'running',
				summary: 'Queued follow-up work in the linked thread.'
			})
		);
		expect(reconciled.reviews[0]).toEqual(
			expect.objectContaining({
				status: 'dismissed'
			})
		);
		expect(reconciled.approvals[0]).toEqual(
			expect.objectContaining({
				status: 'canceled'
			})
		);
	});

	it('blocks linked task state when the thread run fails', () => {
		const data = createControlPlaneFixture();
		data.tasks[0] = {
			...data.tasks[0]!,
			status: 'in_progress'
		};
		data.runs[0] = {
			...data.runs[0]!,
			status: 'running',
			endedAt: null
		};

		const reconciled = reconcileControlPlaneThreadState(data, {
			id: 'thread_1',
			hasActiveRun: false,
			canResume: true,
			latestRunStatus: 'failed',
			lastActivityAt: '2026-04-10T10:12:00.000Z',
			latestRun: {
				id: 'run_1',
				agentThreadId: 'thread_1',
				state: {
					status: 'failed',
					pid: null,
					startedAt: '2026-04-10T10:00:00.000Z',
					finishedAt: '2026-04-10T10:12:00.000Z',
					exitCode: 1,
					signal: null,
					codexThreadId: null
				},
				lastMessage: '',
				logTail: [],
				activityAt: '2026-04-10T10:12:00.000Z',
				createdAt: '2026-04-10T10:00:00.000Z',
				updatedAt: '2026-04-10T10:12:00.000Z',
				mode: 'start',
				prompt: 'Investigate issue',
				requestedThreadId: null,
				sourceAgentThreadId: null,
				sourceAgentThreadName: null,
				contactId: null,
				replyToContactId: null,
				configPath: '',
				logPath: '',
				statePath: '',
				messagePath: ''
			}
		});

		expect(reconciled.tasks[0]).toEqual(
			expect.objectContaining({
				status: 'blocked',
				blockedReason: 'The linked work thread exited with code 1.'
			})
		);
		expect(reconciled.runs[0]).toEqual(
			expect.objectContaining({
				status: 'failed',
				summary: 'Task blocked after the linked work thread failed.'
			})
		);
	});
});
