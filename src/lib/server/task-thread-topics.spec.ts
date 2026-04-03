import { describe, expect, it } from 'vitest';
import {
	deriveTaskCategorization,
	deriveTaskTopicLabels,
	deriveThreadCategorization,
	deriveThreadTopicLabels
} from './task-thread-topics';

describe('task thread topics', () => {
	it('derives stable topic labels from task content', () => {
		expect(
			deriveTaskTopicLabels({
				title: 'Add attachment browser coverage',
				summary: 'Expand task attachment tests and improve artifact browser validation.',
				area: 'product'
			})
		).toEqual(expect.arrayContaining(['Product', 'Testing', 'Attachment']));
	});

	it('derives structured task categories for matching and discovery', () => {
		expect(
			deriveTaskCategorization({
				title: 'Improve thread assignment suggestions',
				summary: 'Match new tasks to reusable work threads and surface better context.',
				area: 'product',
				desiredRoleId: 'role_coordinator',
				requiredCapabilityNames: ['assignment'],
				requiredToolNames: ['context']
			})
		).toMatchObject({
			areaLabels: ['Product'],
			focusLabels: expect.arrayContaining(['Coordination']),
			entityLabels: expect.arrayContaining(['Thread']),
			roleLabels: expect.arrayContaining(['Coordinator']),
			capabilityLabels: expect.arrayContaining(['Assignment']),
			toolLabels: expect.arrayContaining(['Context']),
			keywordLabels: expect.arrayContaining(['Suggestion'])
		});
	});

	it('derives thread topic labels from related tasks and recent thread content', () => {
		expect(
			deriveThreadTopicLabels({
				threadName: 'Artifact browser follow-up',
				threadSummary: 'Continue validating attachments and browser output.',
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
						area: 'product',
						isPrimary: true
					}
				]
			})
		).toEqual(expect.arrayContaining(['Product', 'Testing', 'Attachment']));
	});

	it('derives structured thread categories from task and run context', () => {
		expect(
			deriveThreadCategorization({
				threadName: 'Thread assignment follow-up',
				threadSummary: 'Continue matching tasks to reusable threads.',
				runDetails: [
					{
						prompt: 'Review the thread reuse rules and improve context discovery.',
						lastMessage: 'Categorized the thread by lane, focus, and context.'
					}
				],
				relatedTasks: [
					{
						title: 'Improve thread assignment suggestions',
						summary: 'Match new tasks to reusable work threads.',
						projectId: 'project_ams',
						projectName: 'Agent Management System Prototype',
						goalId: 'goal_threads',
						goalName: 'Improve Thread Reuse',
						area: 'product',
						desiredRole: 'Coordinator',
						requiredCapabilityNames: ['assignment'],
						requiredToolNames: ['context'],
						isPrimary: true
					}
				]
			})
		).toMatchObject({
			projectIds: ['project_ams'],
			projectLabels: ['Agent Management System Prototype'],
			goalIds: ['goal_threads'],
			goalLabels: ['Improve Thread Reuse'],
			areaLabels: ['Product'],
			focusLabels: expect.arrayContaining(['Coordination']),
			entityLabels: expect.arrayContaining(['Thread']),
			roleLabels: expect.arrayContaining(['Coordinator']),
			capabilityLabels: expect.arrayContaining(['Assignment']),
			toolLabels: expect.arrayContaining(['Context']),
			keywordLabels: expect.arrayContaining(['Suggestion'])
		});
	});
});
