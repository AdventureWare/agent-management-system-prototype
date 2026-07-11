import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapV1SliceToV2Draft } from '$lib/server/v2-import-mapper';
import type { ControlPlaneData } from '$lib/types/control-plane';

const FIXTURE_PATH = resolve(
	process.cwd(),
	'src',
	'lib',
	'server',
	'fixtures',
	'v2-ams-useful-prototype-slice.json'
);

type SeedFixture = {
	records: Pick<
		ControlPlaneData,
		'projects' | 'goals' | 'tasks' | 'runs' | 'reviews' | 'approvals' | 'decisions'
	>;
	metadata: {
		artifactPathChecks: Array<{
			sourceType: string;
			sourceId: string;
			parentId?: string;
			field: string;
			path: string;
			exists: boolean;
		}>;
	};
};

function loadFixture(): SeedFixture {
	return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as SeedFixture;
}

function mapFixtureToDraft() {
	const fixture = loadFixture();

	return mapV1SliceToV2Draft({
		projects: fixture.records.projects,
		goals: fixture.records.goals,
		tasks: fixture.records.tasks,
		runs: fixture.records.runs,
		reviews: fixture.records.reviews,
		approvals: fixture.records.approvals,
		decisions: fixture.records.decisions,
		artifactPathChecks: fixture.metadata.artifactPathChecks
	});
}

describe('v2 import mapper', () => {
	it('maps v1 project, goal, task, and dependency records into v2 draft objects', () => {
		const draft = mapFixtureToDraft();

		expect(draft.projects).toHaveLength(1);
		expect(draft.goals).toHaveLength(1);
		expect(draft.tasks).toHaveLength(34);
		expect(draft.taskDependencies).toHaveLength(10);
		expect(draft.workSessions).toHaveLength(33);
		expect(draft.runs).toHaveLength(37);
		expect(draft.reviews).toHaveLength(51);
		expect(draft.approvals).toHaveLength(8);
		expect(draft.decisions).toHaveLength(86);
		expect(draft.artifactCandidates).toHaveLength(38);
		expect(draft.unresolvedReferences).toHaveLength(0);
	});

	it('preserves v1 source references on mapped objects', () => {
		const draft = mapFixtureToDraft();

		expect(draft.projects[0]).toMatchObject({
			id: 'project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1',
			source: {
				system: 'ams-v1',
				collection: 'projects',
				id: 'project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1'
			}
		});
		expect(draft.goals[0]).toMatchObject({
			id: 'goal_26a850e3-5eac-4150-a96f-0574cd483595',
			projectId: 'project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1',
			source: {
				system: 'ams-v1',
				collection: 'goals',
				id: 'goal_26a850e3-5eac-4150-a96f-0574cd483595'
			}
		});
		expect(draft.tasks[0].source.system).toBe('ams-v1');
		expect(draft.runs[0].source.collection).toBe('runs');
		expect(draft.reviews[0].source.collection).toBe('reviews');
		expect(draft.approvals[0].source.collection).toBe('approvals');
		expect(draft.decisions[0].source.collection).toBe('decisions');
	});

	it('maps project memory and defaults without turning memory prose into accepted records', () => {
		const draft = mapFixtureToDraft();
		const project = draft.projects[0];

		expect(project.name).toBe('Agent Management System Prototype');
		expect(project.rootPaths).toContain(
			'/Users/colinfreed/Projects/Experiments/agent-management-system-prototype'
		);
		expect(project.memorySources).toEqual(
			expect.objectContaining({
				projectBrief: expect.any(String),
				currentStateMemo: expect.any(String),
				decisionLog: expect.any(String)
			})
		);
		expect(project.defaults).toEqual(
			expect.objectContaining({
				autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
				riskThreshold: 'medium',
				reviewRequirement: 'SUMMARY_REVIEW'
			})
		);
	});

	it('keeps capability, tool, skill, and artifact fields as candidates on task drafts', () => {
		const draft = mapFixtureToDraft();
		const candidateCapabilities = new Set(
			draft.tasks.flatMap((task) => task.candidateCapabilityNames)
		);
		const candidateTools = new Set(draft.tasks.flatMap((task) => task.candidateToolNames));
		const candidateSkills = new Set(draft.tasks.flatMap((task) => task.candidateSkillNames));

		expect([...candidateCapabilities]).toEqual(['research', 'analysis', 'citations', 'planning']);
		expect([...candidateTools]).toEqual(['codex']);
		expect([...candidateSkills]).toEqual(['ams-agent-interface', 'role-creator', 'architecture']);
		expect(
			draft.tasks.reduce((count, task) => count + task.artifactSourceCount, 0)
		).toBeGreaterThan(0);
	});

	it('maps run and work-session candidates without merging them into task state', () => {
		const draft = mapFixtureToDraft();
		const sessionIds = new Set(draft.workSessions.map((session) => session.id));

		expect(draft.workSessions.every((session) => session.externalThreadId === session.id)).toBe(
			true
		);
		expect(
			draft.runs.every((run) => run.workSessionId === null || sessionIds.has(run.workSessionId))
		).toBe(true);
		expect(draft.runs.some((run) => run.status === 'failed')).toBe(true);
		expect(draft.runs.some((run) => run.status === 'completed')).toBe(true);
	});

	it('maps review, approval, and decision drafts as governance/evidence records', () => {
		const draft = mapFixtureToDraft();
		const taskIds = new Set(draft.tasks.map((task) => task.id));
		const runIds = new Set(draft.runs.map((run) => run.id));
		const reviewIds = new Set(draft.reviews.map((review) => review.id));
		const approvalIds = new Set(draft.approvals.map((approval) => approval.id));

		expect(draft.reviews.every((review) => taskIds.has(review.taskId))).toBe(true);
		expect(draft.approvals.every((approval) => taskIds.has(approval.taskId))).toBe(true);
		expect(draft.reviews.some((review) => review.status === 'open')).toBe(true);
		expect(draft.approvals.some((approval) => approval.status === 'pending')).toBe(true);
		expect(
			draft.decisions.every(
				(decision) =>
					(decision.taskId !== null && taskIds.has(decision.taskId)) ||
					(decision.runId !== null && runIds.has(decision.runId)) ||
					(decision.reviewId !== null && reviewIds.has(decision.reviewId)) ||
					(decision.approvalId !== null && approvalIds.has(decision.approvalId)) ||
					decision.goalId === 'goal_26a850e3-5eac-4150-a96f-0574cd483595'
			)
		).toBe(true);
	});

	it('dedupes artifact candidates while preserving source references', () => {
		const draft = mapFixtureToDraft();
		const sourceReferenceCount = draft.artifactCandidates.reduce(
			(count, artifact) => count + artifact.sourceReferenceCount,
			0
		);

		expect(draft.artifactCandidates).toHaveLength(38);
		expect(sourceReferenceCount).toBe(111);
		expect(draft.artifactCandidates.every((artifact) => artifact.exists === true)).toBe(true);
		expect(draft.artifactCandidates.some((artifact) => artifact.role === 'task_attachment')).toBe(
			true
		);
		expect(draft.artifactCandidates.some((artifact) => artifact.role === 'run_artifact_path')).toBe(
			true
		);
	});
});
