import { describe, expect, it } from 'vitest';
import { retrieveRelevantSelfImprovementKnowledgeItems } from './self-improvement-knowledge';
import type { Project, Task } from '$lib/types/control-plane';
import type { SelfImprovementKnowledgeItem } from '$lib/types/self-improvement';

const project: Project = {
	id: 'project_1',
	name: 'Agent Management System Prototype',
	summary: 'Primary app project',
	projectRootFolder: '/tmp/project',
	defaultArtifactRoot: '/tmp/project/agent_output',
	defaultRepoPath: '',
	defaultRepoUrl: '',
	defaultBranch: ''
};

const task: Task = {
	id: 'task_1',
	title: 'Stabilize launch retry path',
	summary: 'Fix the repeated retry failure during task launch.',
	projectId: 'project_1',
	lane: 'product',
	goalId: '',
	priority: 'high',
	status: 'ready',
	riskLevel: 'high',
	approvalMode: 'none',
	requiresReview: true,
	desiredRoleId: 'role_coordinator',
	assigneeWorkerId: null,
	agentThreadId: null,
	blockedReason: '',
	dependencyTaskIds: [],
	targetDate: null,
	runCount: 2,
	latestRunId: null,
	artifactPath: '/tmp/project/agent_output',
	attachments: [],
	createdAt: '2026-03-30T11:00:00.000Z',
	updatedAt: '2026-03-30T12:00:00.000Z'
};

describe('retrieveRelevantSelfImprovementKnowledgeItems', () => {
	it('prefers published knowledge that matches the project and task language', () => {
		const knowledgeItems: SelfImprovementKnowledgeItem[] = [
			{
				id: 'knowledge_match',
				status: 'published',
				title: 'Failure recovery pattern',
				summary: 'Capture repeated retry failures as a reusable play.',
				category: 'reliability',
				projectId: 'project_1',
				projectName: 'Agent Management System Prototype',
				sourceOpportunityId: 'failed_runs:task_1',
				sourceTaskIds: ['task_1'],
				sourceRunIds: ['run_1'],
				sourceSessionIds: ['session_1'],
				sourceSignalIds: ['run_failure:run_1'],
				triggerPattern: 'Repeated launch or retry failures for the same task.',
				recommendedResponse: 'Add a preflight check before retrying the failing step.',
				applicabilityScope: ['Agent Management System Prototype', 'Launch and retry failures'],
				createdAt: '2026-03-30T12:00:00.000Z',
				updatedAt: '2026-03-31T12:00:00.000Z',
				publishedAt: '2026-03-31T12:00:00.000Z',
				archivedAt: null
			},
			{
				id: 'knowledge_other',
				status: 'published',
				title: 'Unrelated design checklist',
				summary: 'UI cleanup guidance.',
				category: 'quality',
				projectId: 'project_2',
				projectName: 'Other Project',
				sourceOpportunityId: 'review_feedback:task_2',
				sourceTaskIds: ['task_2'],
				sourceRunIds: [],
				sourceSessionIds: [],
				sourceSignalIds: ['review_feedback:review_1'],
				triggerPattern: 'Design review notes.',
				recommendedResponse: 'Tighten spacing.',
				applicabilityScope: ['Other Project'],
				createdAt: '2026-03-30T12:00:00.000Z',
				updatedAt: '2026-03-31T12:00:00.000Z',
				publishedAt: '2026-03-31T12:00:00.000Z',
				archivedAt: null
			}
		];

		const matches = retrieveRelevantSelfImprovementKnowledgeItems({
			task,
			project,
			knowledgeItems
		});

		expect(matches).toHaveLength(1);
		expect(matches[0]).toEqual(
			expect.objectContaining({
				id: 'knowledge_match',
				matchReasons: expect.arrayContaining([
					expect.stringContaining('Matches this project'),
					expect.stringContaining('Shares task language')
				])
			})
		);
	});
});
