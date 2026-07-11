import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateV2ImportDraft } from '$lib/server/v2-import-draft-validator';
import { mapV1SliceToV2Draft, type V2ImportDraft } from '$lib/server/v2-import-mapper';
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

function loadDraft(): V2ImportDraft {
	const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as SeedFixture;

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

describe('validateV2ImportDraft', () => {
	it('accepts the mapped AMS seed draft as satisfying the current schema contract', () => {
		const result = validateV2ImportDraft(loadDraft());

		expect(result.valid).toBe(true);
		expect(result.issues).toEqual([]);
		expect(result.counts).toEqual({
			projects: 1,
			goals: 1,
			tasks: 34,
			taskDependencies: 10,
			workSessions: 33,
			runs: 37,
			reviews: 51,
			approvals: 8,
			decisions: 86,
			artifactCandidates: 38,
			artifactSourceReferences: 111,
			unresolvedReferences: 0
		});
	});

	it('reports missing source references', () => {
		const draft = loadDraft();
		draft.tasks[0] = {
			...draft.tasks[0],
			source: { system: 'ams-v1', collection: '', id: '' }
		};
		const result = validateV2ImportDraft(draft);

		expect(result.valid).toBe(false);
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'missing_source_reference',
					recordType: 'TaskDraft',
					recordId: draft.tasks[0].id
				})
			])
		);
	});

	it('reports broken task and run relationships', () => {
		const draft = loadDraft();
		draft.runs[0] = {
			...draft.runs[0],
			taskId: 'task_missing',
			workSessionId: 'thread_missing'
		};
		const result = validateV2ImportDraft(draft);

		expect(result.valid).toBe(false);
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'run_missing_task',
					recordType: 'RunDraft',
					recordId: draft.runs[0].id
				}),
				expect.objectContaining({
					code: 'run_missing_work_session',
					recordType: 'RunDraft',
					recordId: draft.runs[0].id
				})
			])
		);
	});

	it('reports artifact source reference count mismatches', () => {
		const draft = loadDraft();
		draft.artifactCandidates[0] = {
			...draft.artifactCandidates[0],
			sourceReferenceCount: draft.artifactCandidates[0].sourceReferences.length + 1
		};
		const result = validateV2ImportDraft(draft);

		expect(result.valid).toBe(false);
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'artifact_source_reference_count_mismatch',
					recordType: 'ArtifactCandidateDraft',
					recordId: draft.artifactCandidates[0].id
				})
			])
		);
	});
});
