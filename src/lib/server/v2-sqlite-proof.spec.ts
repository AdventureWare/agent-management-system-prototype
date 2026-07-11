import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { mapV1SliceToV2Draft, type V2ImportDraft } from '$lib/server/v2-import-mapper';
import {
	applyV2SqliteProofSchema,
	loadV2ImportDraftIntoSqliteProof
} from '$lib/server/v2-sqlite-proof';
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

function withInMemoryDb<T>(callback: (db: Database.Database) => T): T {
	const db = new Database(':memory:');
	try {
		db.pragma('foreign_keys = ON');
		return callback(db);
	} finally {
		db.close();
	}
}

describe('v2 sqlite proof schema', () => {
	it('loads the validated AMS seed draft into an isolated sqlite schema', () => {
		withInMemoryDb((db) => {
			const result = loadV2ImportDraftIntoSqliteProof(db, loadDraft());

			expect(result.validation.valid).toBe(true);
			expect(result.counts).toEqual(
				expect.objectContaining({
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
					importSources: 299,
					workSessionRuns: 42
				})
			);
		});
	});

	it('preserves v1 source references outside domain rows', () => {
		withInMemoryDb((db) => {
			loadV2ImportDraftIntoSqliteProof(db, loadDraft());

			const rows = db
				.prepare<[], { record_table: string; source_collection: string; source_id: string }>(
					`
						select record_table, source_collection, source_id
						from v2_import_sources
						where source_system = 'ams-v1'
						order by record_table, source_id
					`
				)
				.all();

			expect(rows).toHaveLength(299);
			expect(rows).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						record_table: 'v2_projects',
						source_collection: 'projects',
						source_id: 'project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1'
					}),
					expect.objectContaining({
						record_table: 'v2_goals',
						source_collection: 'goals',
						source_id: 'goal_26a850e3-5eac-4150-a96f-0574cd483595'
					})
				])
			);
		});
	});

	it('normalizes candidate task requirements without creating accepted capability records', () => {
		withInMemoryDb((db) => {
			loadV2ImportDraftIntoSqliteProof(db, loadDraft());

			const rows = db
				.prepare<[], { requirement_type: string; name: string }>(
					`
						select distinct requirement_type, name
						from v2_task_candidate_requirements
						order by requirement_type, name
					`
				)
				.all();

			expect(rows).toEqual([
				{ requirement_type: 'capability', name: 'analysis' },
				{ requirement_type: 'capability', name: 'citations' },
				{ requirement_type: 'capability', name: 'planning' },
				{ requirement_type: 'capability', name: 'research' },
				{ requirement_type: 'skill', name: 'ams-agent-interface' },
				{ requirement_type: 'skill', name: 'architecture' },
				{ requirement_type: 'skill', name: 'role-creator' },
				{ requirement_type: 'tool', name: 'codex' }
			]);
		});
	});

	it('enforces relationships through sqlite foreign keys', () => {
		withInMemoryDb((db) => {
			applyV2SqliteProofSchema(db);

			expect(() => {
				db.prepare(
					`
						insert into v2_tasks (
							id,
							project_id,
							goal_id,
							parent_task_id,
							title,
							summary,
							scope,
							non_goals,
							success_criteria,
							ready_condition,
							expected_outcome,
							validation_plan,
							status,
							priority,
							risk_level,
							readiness_level,
							autonomy_level,
							review_requirement,
							approval_mode,
							artifact_source_count
						) values (
							'task_missing_refs',
							'project_missing',
							'goal_missing',
							null,
							'Broken task',
							'',
							'',
							'',
							'',
							'',
							'',
							'',
							'open',
							'P1',
							'low',
							null,
							null,
							null,
							'automatic',
							0
						)
					`
				).run();
			}).toThrow(/FOREIGN KEY constraint failed/);
		});
	});

	it('does not load invalid drafts into sqlite', () => {
		withInMemoryDb((db) => {
			const draft = loadDraft();
			draft.runs[0] = {
				...draft.runs[0],
				taskId: 'task_missing'
			};
			const result = loadV2ImportDraftIntoSqliteProof(db, draft);

			expect(result.validation.valid).toBe(false);
			expect(result.counts).toEqual({});
			expect(() => db.prepare('select count(*) as count from v2_projects').get()).toThrow(
				/no such table: v2_projects/
			);
		});
	});
});
