import { describe, expect, it } from 'vitest';
import { deriveTaskTopicLabels, deriveThreadTopicLabels } from './task-thread-topics';

describe('task thread topics', () => {
	it('derives stable topic labels from task content', () => {
		expect(
			deriveTaskTopicLabels({
				title: 'Add attachment browser coverage',
				summary: 'Expand task attachment tests and improve artifact browser validation.',
				lane: 'product'
			})
		).toEqual(expect.arrayContaining(['Product', 'Testing', 'Attachment']));
	});

	it('derives thread topic labels from related tasks and recent thread content', () => {
		expect(
			deriveThreadTopicLabels({
				sessionName: 'Artifact browser follow-up',
				sessionSummary: 'Continue validating attachments and browser output.',
				runDetails: [
					{
						prompt: 'Add browser specs for attachment flows and artifact output.',
						lastMessage: 'Coverage now includes attachment browser edge cases.'
					}
				],
				relatedTasks: [
					{
						title: 'Expand attachment browser coverage',
						summary: 'Add tests for task attachments and artifact output.',
						lane: 'product',
						isPrimary: true
					}
				]
			})
		).toEqual(expect.arrayContaining(['Product', 'Testing', 'Attachment']));
	});
});
