import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const FIXTURE_PATH = resolve(
	process.cwd(),
	'src',
	'lib',
	'server',
	'fixtures',
	'v2-ams-useful-prototype-slice.json'
);

type SeedFixture = {
	fixtureVersion: string;
	readOnlySource: boolean;
	selection: {
		projectId: string;
		projectName: string;
		goalId: string;
		goalName: string;
	};
	records: {
		projects: Array<{ id: string }>;
		goals: Array<{ id: string; projectIds?: string[]; taskIds?: string[] }>;
		tasks: Array<{
			id: string;
			projectId: string;
			goalId: string;
			dependencyTaskIds?: string[];
		}>;
		runs: Array<{ id: string; taskId: string }>;
		reviews: Array<{ id: string; taskId: string; runId: string | null }>;
		approvals: Array<{ id: string; taskId: string; runId: string | null }>;
		decisions: Array<{
			id: string;
			taskId: string | null;
			goalId: string | null;
			runId: string | null;
			reviewId: string | null;
			approvalId: string | null;
		}>;
	};
	metadata: {
		counts: Record<string, number>;
		candidates: {
			capabilities: string[];
			tools: string[];
			skills: string[];
			providerIds: string[];
			threadIds: string[];
		};
		artifactPathChecks: Array<{ path: string; exists: boolean }>;
	};
};

function loadFixture(): SeedFixture {
	return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as SeedFixture;
}

describe('v2 AMS seed slice fixture', () => {
	it('captures the selected AMS project and goal as a stable read-only fixture', () => {
		const fixture = loadFixture();

		expect(fixture.fixtureVersion).toBe('v2-import-seed-slice-v0.1');
		expect(fixture.readOnlySource).toBe(true);
		expect(fixture.selection).toEqual({
			projectId: 'project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1',
			projectName: 'Agent Management System Prototype',
			goalId: 'goal_26a850e3-5eac-4150-a96f-0574cd483595',
			goalName: 'AMS useful prototype milestone'
		});
	});

	it('preserves the expected record counts for the first v2 import test slice', () => {
		const fixture = loadFixture();

		expect(fixture.metadata.counts).toEqual({
			projects: 1,
			goals: 1,
			tasks: 34,
			taskDependencies: 10,
			runs: 37,
			reviews: 51,
			approvals: 8,
			decisions: 86,
			artifactPathReferences: 111,
			uniqueArtifactPathReferences: 38,
			missingArtifactPathReferences: 0,
			threadReferences: 33
		});
		expect(fixture.records.projects).toHaveLength(1);
		expect(fixture.records.goals).toHaveLength(1);
		expect(fixture.records.tasks).toHaveLength(34);
		expect(fixture.records.runs).toHaveLength(37);
		expect(fixture.records.reviews).toHaveLength(51);
		expect(fixture.records.approvals).toHaveLength(8);
		expect(fixture.records.decisions).toHaveLength(86);
	});

	it('keeps relationship references inside the selected slice or the selected goal', () => {
		const fixture = loadFixture();
		const projectIds = new Set(fixture.records.projects.map((project) => project.id));
		const goalIds = new Set(fixture.records.goals.map((goal) => goal.id));
		const taskIds = new Set(fixture.records.tasks.map((task) => task.id));
		const runIds = new Set(fixture.records.runs.map((run) => run.id));
		const reviewIds = new Set(fixture.records.reviews.map((review) => review.id));
		const approvalIds = new Set(fixture.records.approvals.map((approval) => approval.id));

		for (const goal of fixture.records.goals) {
			expect(goal.projectIds?.some((projectId) => projectIds.has(projectId))).toBe(true);
		}

		for (const task of fixture.records.tasks) {
			expect(projectIds.has(task.projectId)).toBe(true);
			expect(goalIds.has(task.goalId)).toBe(true);
			expect(
				(task.dependencyTaskIds ?? []).every((dependencyId) => taskIds.has(dependencyId))
			).toBe(true);
		}

		for (const run of fixture.records.runs) {
			expect(taskIds.has(run.taskId)).toBe(true);
		}

		for (const review of fixture.records.reviews) {
			expect(taskIds.has(review.taskId)).toBe(true);
			expect(review.runId === null || runIds.has(review.runId)).toBe(true);
		}

		for (const approval of fixture.records.approvals) {
			expect(taskIds.has(approval.taskId)).toBe(true);
			expect(approval.runId === null || runIds.has(approval.runId)).toBe(true);
		}

		for (const decision of fixture.records.decisions) {
			expect(
				(decision.taskId !== null && taskIds.has(decision.taskId)) ||
					(decision.goalId !== null && goalIds.has(decision.goalId)) ||
					(decision.runId !== null && runIds.has(decision.runId)) ||
					(decision.reviewId !== null && reviewIds.has(decision.reviewId)) ||
					(decision.approvalId !== null && approvalIds.has(decision.approvalId))
			).toBe(true);
		}
	});

	it('records candidate registries and artifact path checks without accepting v2 model concepts', () => {
		const fixture = loadFixture();

		expect(fixture.metadata.candidates.capabilities).toEqual([
			'research',
			'analysis',
			'citations',
			'planning'
		]);
		expect(fixture.metadata.candidates.tools).toEqual(['codex']);
		expect(fixture.metadata.candidates.skills).toEqual([
			'ams-agent-interface',
			'role-creator',
			'architecture'
		]);
		expect(fixture.metadata.candidates.providerIds).toEqual(['provider_local_codex']);
		expect(fixture.metadata.candidates.threadIds).toHaveLength(33);
		expect(fixture.metadata.artifactPathChecks).toHaveLength(111);
		expect(fixture.metadata.artifactPathChecks.every((check) => check.exists)).toBe(true);
	});
});
