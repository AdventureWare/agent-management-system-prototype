import { describe, expect, it } from 'vitest';
import { buildTaskGuidancePreviewRequest } from './agent-guidance-preview';

describe('agent-guidance-preview', () => {
	it('builds approval preview requests for preview-first approval hints', () => {
		expect(
			buildTaskGuidancePreviewRequest('task_1', {
				resource: 'task',
				command: 'approve-approval',
				reason: 'Pending approval exists.',
				expectedOutcome: 'Approve the gate.',
				shouldValidateFirst: true,
				validationMode: 'validateOnly',
				validationReason: 'Preview before approving.'
			})
		).toEqual({
			label: 'Run preview',
			title: 'Preview approval gate approval',
			description: 'Validate the approval gate outcome before approving the task output.',
			path: '/api/tasks/task_1/approval-decision',
			body: {
				decision: 'approve',
				validateOnly: true
			}
		});
	});

	it('returns null for hints without direct queue-preview support', () => {
		expect(
			buildTaskGuidancePreviewRequest('task_1', {
				resource: 'intent',
				command: 'coordinate_with_another_thread',
				reason: 'Coordinate with another thread.',
				expectedOutcome: 'Send contact.',
				shouldValidateFirst: true,
				validationMode: 'validateOnly',
				validationReason: 'Preview before routing.'
			})
		).toBeNull();
	});

	it('builds child handoff preview requests when parent context is available', () => {
		expect(
			buildTaskGuidancePreviewRequest(
				'task_child',
				{
					resource: 'intent',
					command: 'accept_child_handoff',
					reason: 'Accept the child handoff.',
					expectedOutcome: 'Accept delegated work.',
					shouldValidateFirst: true,
					validationMode: 'validateOnly',
					validationReason: 'Preview before accepting.'
				},
				{
					parentTaskId: 'task_parent'
				}
			)
		).toEqual({
			label: 'Run preview',
			title: 'Preview child handoff acceptance',
			description: 'Validate the parent-child handoff checks before accepting the delegated work.',
			path: '/api/agent-intents/accept_child_handoff',
			body: {
				parentTaskId: 'task_parent',
				childTaskId: 'task_child',
				validateOnly: true
			}
		});
	});
});
