import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import {
	V2_CORE_DEFERRED_CONCEPTS,
	V2_CORE_DEFERRED_TABLE_NAMES,
	V2_CORE_FIRST_SLICE_ENTITIES,
	getV2CoreFirstSliceTables
} from '$lib/server/v2-core-contract';
import {
	assertV2CoreDbFileAllowed,
	getDefaultV2CoreDbFile,
	openExistingV2CoreDbForWrite,
	openV2CoreDb,
	resolveV2CoreDbFile
} from '$lib/server/v2-core-persistence';
import { readV2CoreOverview } from '$lib/server/v2-core-service';

const tempDirs: string[] = [];

function createTempDir() {
	const path = mkdtempSync(join(tmpdir(), 'ams-v2-core-db-'));
	tempDirs.push(path);
	return path;
}

function readTableNames(db: Database.Database) {
	return db
		.prepare<[], { name: string }>(
			`
				select name
				from sqlite_master
				where type = 'table'
					and name like 'v2_core_%'
				order by name
			`
		)
		.all()
		.map((row) => row.name);
}

function readTableSql(db: Database.Database, tableName: string) {
	const row = db
		.prepare<[string], { sql: string }>(
			"select sql from sqlite_master where type = 'table' and name = ?"
		)
		.get(tableName);

	return row?.sql ?? '';
}

afterEach(() => {
	while (tempDirs.length > 0) {
		const path = tempDirs.pop();

		if (path) {
			rmSync(path, { recursive: true, force: true });
		}
	}
});

describe('v2 core persistence boundary', () => {
	it('defaults to a separate core sqlite file', () => {
		expect.assertions(2);

		expect(getDefaultV2CoreDbFile()).toBe(resolve(process.cwd(), 'data', 'v2-core.sqlite'));
		expect(resolveV2CoreDbFile()).toBe(resolve(process.cwd(), 'data', 'v2-core.sqlite'));
	});

	it('refuses the v1 runtime database and the v2 preview database', () => {
		expect.assertions(3);

		const root = createTempDir();
		const appDbFile = resolve(root, 'data', 'app.sqlite');

		expect(() =>
			assertV2CoreDbFileAllowed({
				dbFile: appDbFile,
				appDbFile
			})
		).toThrow(/Refusing to use the v1 runtime app database/);
		expect(() =>
			assertV2CoreDbFileAllowed({
				dbFile: resolve(root, 'data', 'app.sqlite'),
				appDbFile: resolve(root, 'other', 'app.sqlite')
			})
		).toThrow(/Refusing to use the v1 runtime app database/);
		expect(() =>
			assertV2CoreDbFileAllowed({
				dbFile: resolve(root, 'data', 'v2-preview.sqlite'),
				appDbFile
			})
		).toThrow(/Refusing to use the v2 preview database/);
	});

	it('applies only the first-slice core tables', () => {
		expect.assertions(5);

		const root = createTempDir();
		const coreDbFile = resolve(root, 'data', 'v2-core.sqlite');
		const db = openV2CoreDb({
			dbFile: coreDbFile,
			appDbFile: resolve(root, 'data', 'app.sqlite')
		});

		try {
			expect(existsSync(coreDbFile)).toBe(true);
			const tableNames = readTableNames(db);
			const expectedTables = getV2CoreFirstSliceTables().toSorted();

			expect(tableNames).toEqual(expectedTables);
			expect(tableNames).not.toEqual(expect.arrayContaining([...V2_CORE_DEFERRED_TABLE_NAMES]));
			expect(V2_CORE_FIRST_SLICE_ENTITIES).not.toEqual(
				expect.arrayContaining([...V2_CORE_DEFERRED_CONCEPTS])
			);
			expect(tableNames).toEqual(
				expect.arrayContaining([
					'v2_core_source_references',
					'v2_core_memory_item_sources',
					'v2_core_tool_executions'
				])
			);
		} finally {
			db.close();
		}
	});

	it('reads overview counts without multiplying one-to-many relationships', () => {
		expect.assertions(6);

		const root = createTempDir();
		const coreDbFile = resolve(root, 'data', 'v2-core.sqlite');
		const db = openV2CoreDb({
			dbFile: coreDbFile,
			appDbFile: resolve(root, 'data', 'app.sqlite')
		});

		try {
			db.prepare(
				`
					insert into v2_core_projects (id, name, summary, status, workspace_root)
					values ('project_overview_counts', 'Overview Counts', 'Count regression fixture.', 'active', '')
				`
			).run();
			db.prepare(
				`
					insert into v2_core_goals
						(id, project_id, parent_goal_id, title, summary, success_criteria, status)
					values ('goal_overview_counts', 'project_overview_counts', null, 'Overview counts', '', 'Counts are exact.', 'active')
				`
			).run();
			db.prepare(
				`
					insert into v2_core_model_providers (id, name, kind, status)
					values ('provider_overview_counts', 'Overview provider', 'external_ai', 'available')
				`
			).run();

			const insertTask = db.prepare(
				`
					insert into v2_core_tasks
						(id, project_id, goal_id, title, summary, success_criteria, validation_plan, status)
					values (?, 'project_overview_counts', 'goal_overview_counts', ?, '', 'Task is counted.', 'Read overview.', ?)
				`
			);
			const insertRun = db.prepare(
				`
					insert into v2_core_runs
						(id, task_id, model_provider_id, status, input_summary, action_summary, result_summary, validation_summary, started_at, ended_at)
					values (?, ?, 'provider_overview_counts', 'completed', '', '', 'done', 'valid', '2026-07-14T00:00:00.000Z', '2026-07-14T00:01:00.000Z')
				`
			);
			const insertArtifact = db.prepare(
				`
					insert into v2_core_artifacts
						(id, project_id, task_id, run_id, uri, role, title, summary, status)
					values (?, 'project_overview_counts', ?, ?, ?, 'deliverable', ?, '', 'accepted')
				`
			);
			const insertMemory = db.prepare(
				`
					insert into v2_core_memory_items
						(id, project_id, title, body, scope, status, created_at)
					values (?, 'project_overview_counts', ?, 'Trusted memory.', 'project', 'trusted', '2026-07-14T00:00:00.000Z')
				`
			);

			for (let index = 0; index < 12; index += 1) {
				const taskId = `task_overview_counts_${index}`;
				const runId = `run_overview_counts_${index}`;
				insertTask.run(taskId, `Task ${index}`, index === 0 ? 'ready' : 'done');
				insertRun.run(runId, taskId);
				insertArtifact.run(
					`artifact_overview_counts_${index}`,
					taskId,
					runId,
					`repo://artifact-${index}`,
					`Artifact ${index}`
				);
				insertMemory.run(`memory_overview_counts_${index}`, `Memory ${index}`);
			}

			const startedAt = performance.now();
			const overview = readV2CoreOverview(db);
			const durationMs = performance.now() - startedAt;
			const project = overview.projects.find((item) => item.id === 'project_overview_counts');

			expect(project).toMatchObject({
				goalCount: 1,
				taskCount: 12,
				runCount: 12,
				artifactCount: 12,
				memoryItemCount: 12
			});
			expect(durationMs).toBeLessThan(1000);
			expect(overview.taskStatusCounts).toMatchObject({ done: 11, ready: 1 });
			expect(overview.memoryStatusCounts).toMatchObject({ trusted: 12 });
			expect(overview.reviewStatusCounts).toEqual({});
			expect(overview.projects).toHaveLength(1);
		} finally {
			db.close();
		}
	});

	it('requires an existing core database for write updates', () => {
		expect.assertions(2);

		const root = createTempDir();
		const coreDbFile = resolve(root, 'data', 'v2-core.sqlite');

		expect(() =>
			openExistingV2CoreDbForWrite({
				dbFile: coreDbFile,
				appDbFile: resolve(root, 'data', 'app.sqlite')
			})
		).toThrow(/V2 core database does not exist/);

		const created = openV2CoreDb({
			dbFile: coreDbFile,
			appDbFile: resolve(root, 'data', 'app.sqlite')
		});
		created.close();

		const existing = openExistingV2CoreDbForWrite({
			dbFile: coreDbFile,
			appDbFile: resolve(root, 'data', 'app.sqlite')
		});
		try {
			expect(readTableNames(existing)).toContain('v2_core_tasks');
		} finally {
			existing.close();
		}
	});

	it('keeps review and memory promotion evidence relational instead of prose-only', () => {
		expect.assertions(4);

		const root = createTempDir();
		const db = openV2CoreDb({
			dbFile: resolve(root, 'data', 'v2-core.sqlite'),
			appDbFile: resolve(root, 'data', 'app.sqlite')
		});

		try {
			expect(readTableSql(db, 'v2_core_memory_item_sources')).toContain(
				'references v2_core_memory_items'
			);
			expect(readTableSql(db, 'v2_core_reviews')).toContain('artifact_id text references');
			expect(readTableSql(db, 'v2_core_reviews')).toContain('run_id text references');
			expect(readTableSql(db, 'v2_core_source_references')).toContain('source_system text not null');
		} finally {
			db.close();
		}
	});
});
