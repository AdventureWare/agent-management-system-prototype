import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { RUN_STATUS_OPTIONS } from '$lib/types/control-plane';
import Page from './+page.svelte';

describe('/app/runs/+page.svelte', () => {
	it('renders operator-facing run metadata on the index', async () => {
		render(Page, {
			data: {
				statusOptions: RUN_STATUS_OPTIONS,
				tasks: [{ id: 'task_1', title: 'Make runs first class' }],
				executionSurfaces: [{ id: 'worker_1', name: 'Coordinator' }],
				providers: [{ id: 'provider_1', name: 'Local Codex' }],
				models: ['gpt-5.4'],
				runs: [
					{
						id: 'run_1',
						taskId: 'task_1',
						taskTitle: 'Make runs first class',
						taskProjectId: 'project_1',
						taskProjectName: 'Agent Management System Prototype',
						executionSurfaceId: 'worker_1',
						executionSurfaceName: 'Coordinator',
						providerId: 'provider_1',
						providerName: 'Local Codex',
						status: 'running',
						createdAt: '2026-03-30T12:00:00.000Z',
						updatedAt: '2026-03-30T12:05:00.000Z',
						startedAt: '2026-03-30T12:01:00.000Z',
						endedAt: null,
						threadId: 'thread_1',
						agentThreadId: 'session_1',
						threadName: 'Task thread',
						threadState: 'working',
						threadArchivedAt: null,
						threadSummary: 'Working through the task.',
						threadCanResume: true,
						threadHasActiveRun: true,
						promptDigest: 'digest: add runs index and detail',
						artifactPaths: ['/tmp/project/agent_output/run_1'],
						summary: 'Rendering the runs index.',
						lastHeartbeatAt: '2026-03-30T12:04:30.000Z',
						heartbeatAgeLabel: '30s ago',
						isHeartbeatStale: false,
						errorSummary: '',
						modelUsed: 'gpt-5.4',
						usageSource: 'provider_reported',
						inputTokens: 120000,
						cachedInputTokens: 90000,
						outputTokens: 4500,
						uncachedInputTokens: 30000,
						usageCapturedAt: '2026-03-30T12:05:00.000Z',
						estimatedCostUsd: 0.34,
						costSource: 'configured_model_pricing',
						pricingVersion: '2026-04-10',
						totalTokens: 124500,
						cacheRatio: 0.75,
						createdAtLabel: '5m ago',
						updatedAtLabel: 'just now',
						agentGuidanceHint: {
							resource: 'intent',
							command: 'coordinate_with_another_thread',
							reason:
								'Route focused context or delegation to another thread without manually resolving and messaging it.',
							expectedOutcome:
								'Resolve a target thread, send the contact, and read back contact state in one call.',
							shouldValidateFirst: true,
							validationMode: 'validateOnly',
							validationReason:
								'Cross-thread routing is coordination-heavy. Preview target resolution and availability first.'
						}
					}
				]
			} as never
		});

		expect(document.body.textContent).toContain('Inspect execution outcomes');
		expect(document.body.textContent).toContain('digest: add runs index and detail');
		expect(document.body.textContent).toContain('Task thread');
		expect(document.body.textContent).toContain('gpt-5.4');
		expect(document.body.textContent).toContain('$0.34');
		expect(document.body.textContent).toContain('30s ago');
		expect(document.body.textContent).toContain('/tmp/project/agent_output/run_1');
		expect(document.body.textContent).toContain('Preview first');
		expect(document.body.textContent).toContain('intent:coordinate_with_another_thread');
		expect(document.body.textContent).toContain('Set up preview');
		expect(document.body.textContent).toContain('Run context');
		expect(
			Array.from(document.querySelectorAll('a')).some(
				(link) =>
					link.getAttribute('href') === '/app/tasks/task_1?panel=execution#agent-current-context'
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('a')).some(
				(link) => link.getAttribute('href') === '/app/runs/run_1#agent-current-context'
			)
		).toBe(true);
	});

	it('shows a direct queue preview button for previewable run guidance', async () => {
		render(Page, {
			data: {
				statusOptions: RUN_STATUS_OPTIONS,
				tasks: [{ id: 'task_2', title: 'Approve gate' }],
				executionSurfaces: [{ id: 'worker_1', name: 'Coordinator' }],
				providers: [{ id: 'provider_1', name: 'Local Codex' }],
				models: ['gpt-5.4'],
				runs: [
					{
						id: 'run_2',
						taskId: 'task_2',
						taskTitle: 'Approve gate',
						taskProjectId: 'project_1',
						taskProjectName: 'Agent Management System Prototype',
						executionSurfaceId: 'worker_1',
						executionSurfaceName: 'Coordinator',
						providerId: 'provider_1',
						providerName: 'Local Codex',
						status: 'awaiting_approval',
						createdAt: '2026-03-30T12:00:00.000Z',
						updatedAt: '2026-03-30T12:05:00.000Z',
						startedAt: '2026-03-30T12:01:00.000Z',
						endedAt: null,
						threadId: 'thread_2',
						agentThreadId: 'session_2',
						threadName: 'Approval thread',
						threadState: 'attention',
						threadArchivedAt: null,
						threadSummary: 'Waiting on a decision.',
						threadCanResume: true,
						threadHasActiveRun: true,
						promptDigest: 'digest',
						artifactPaths: [],
						summary: 'Waiting on approval.',
						lastHeartbeatAt: '2026-03-30T12:04:30.000Z',
						heartbeatAgeLabel: '30s ago',
						isHeartbeatStale: false,
						errorSummary: '',
						modelUsed: 'gpt-5.4',
						usageSource: 'provider_reported',
						inputTokens: 1200,
						cachedInputTokens: 900,
						outputTokens: 40,
						uncachedInputTokens: 300,
						usageCapturedAt: '2026-03-30T12:05:00.000Z',
						estimatedCostUsd: 0.03,
						costSource: 'configured_model_pricing',
						pricingVersion: '2026-04-10',
						totalTokens: 1240,
						cacheRatio: 0.75,
						createdAtLabel: '5m ago',
						updatedAtLabel: 'just now',
						agentGuidanceHint: {
							resource: 'task',
							command: 'approve-approval',
							reason: 'There is a pending approval gate on this task.',
							expectedOutcome: 'Resolve the pending approval by approving the task output.',
							shouldValidateFirst: true,
							validationMode: 'validateOnly',
							validationReason:
								'Approval resolution is high-impact. Preview whether the task would close before mutating.'
						}
					}
				]
			} as never
		});

		expect(document.body.textContent).toContain('Run preview');
	});

	it('shows child handoff previews on run rows when the parent task is known', async () => {
		render(Page, {
			data: {
				statusOptions: RUN_STATUS_OPTIONS,
				tasks: [{ id: 'task_child', title: 'Finish delegated child task' }],
				executionSurfaces: [{ id: 'worker_1', name: 'Coordinator' }],
				providers: [{ id: 'provider_1', name: 'Local Codex' }],
				models: ['gpt-5.4'],
				runs: [
					{
						id: 'run_child',
						taskId: 'task_child',
						taskParentTaskId: 'task_parent',
						taskTitle: 'Finish delegated child task',
						taskProjectId: 'project_1',
						taskProjectName: 'Agent Management System Prototype',
						executionSurfaceId: 'worker_1',
						executionSurfaceName: 'Coordinator',
						providerId: 'provider_1',
						providerName: 'Local Codex',
						status: 'running',
						createdAt: '2026-03-30T12:00:00.000Z',
						updatedAt: '2026-03-30T12:05:00.000Z',
						startedAt: '2026-03-30T12:01:00.000Z',
						endedAt: null,
						threadId: 'thread_child',
						agentThreadId: 'session_child',
						threadName: 'Child task thread',
						threadState: 'running',
						threadArchivedAt: null,
						threadSummary: 'Finishing the delegated work.',
						threadCanResume: true,
						threadHasActiveRun: true,
						promptDigest: 'digest',
						artifactPaths: [],
						summary: 'Delegated child task is complete.',
						lastHeartbeatAt: '2026-03-30T12:04:30.000Z',
						heartbeatAgeLabel: '30s ago',
						isHeartbeatStale: false,
						errorSummary: '',
						modelUsed: 'gpt-5.4',
						usageSource: 'provider_reported',
						inputTokens: 1200,
						cachedInputTokens: 900,
						outputTokens: 40,
						uncachedInputTokens: 300,
						usageCapturedAt: '2026-03-30T12:05:00.000Z',
						estimatedCostUsd: 0.03,
						costSource: 'configured_model_pricing',
						pricingVersion: '2026-04-10',
						totalTokens: 1240,
						cacheRatio: 0.75,
						createdAtLabel: '5m ago',
						updatedAtLabel: 'just now',
						agentGuidanceHint: {
							resource: 'intent',
							command: 'accept_child_handoff',
							reason: 'This delegated child task is done and waiting for parent acceptance.',
							expectedOutcome: 'Accept the child handoff into the parent task in one intent call.',
							shouldValidateFirst: true,
							validationMode: 'validateOnly',
							validationReason:
								'Child handoff acceptance changes delegated-work state. Preview eligibility before mutating.'
						}
					}
				]
			} as never
		});

		expect(document.body.textContent).toContain('Run preview');
	});
});
