import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { listCodexStateThreadRows } from './codex-state-db';

const tempDirs: string[] = [];

function createTempDir() {
	const path = mkdtempSync(join(tmpdir(), 'ams-codex-state-db-'));
	tempDirs.push(path);
	return path;
}

afterEach(() => {
	while (tempDirs.length > 0) {
		const path = tempDirs.pop();

		if (path) {
			rmSync(path, { recursive: true, force: true });
		}
	}
});

describe('listCodexStateThreadRows', () => {
	it('returns an empty list when the database file is missing', () => {
		const root = createTempDir();

		expect(listCodexStateThreadRows(resolve(root, 'missing.sqlite'))).toEqual([]);
	});

	it('reads active codex threads from a sqlite database', () => {
		const root = createTempDir();
		const dbPath = resolve(root, 'state.sqlite');
		const db = new Database(dbPath);

		db.exec(`
			create table threads (
				id text primary key,
				title text not null,
				cwd text not null,
				sandbox_policy text not null,
				model text,
				first_user_message text,
				rollout_path text not null,
				created_at integer not null,
				updated_at integer not null,
				archived integer not null default 0
			);
		`);

		db.prepare(
			`
				insert into threads (
					id,
					title,
					cwd,
					sandbox_policy,
					model,
					first_user_message,
					rollout_path,
					created_at,
					updated_at,
					archived
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			'thread_new',
			'Newest thread',
			'/tmp/new',
			'{"type":"workspace-write"}',
			'gpt-5',
			'First prompt',
			'/tmp/new/rollout.jsonl',
			100,
			200,
			0
		);

		db.prepare(
			`
				insert into threads (
					id,
					title,
					cwd,
					sandbox_policy,
					model,
					first_user_message,
					rollout_path,
					created_at,
					updated_at,
					archived
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			'thread_old',
			'Older thread',
			'/tmp/old',
			'read-only',
			null,
			null,
			'/tmp/old/rollout.jsonl',
			10,
			20,
			0
		);

		db.prepare(
			`
				insert into threads (
					id,
					title,
					cwd,
					sandbox_policy,
					model,
					first_user_message,
					rollout_path,
					created_at,
					updated_at,
					archived
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			'thread_archived',
			'Archived thread',
			'/tmp/archived',
			'read-only',
			null,
			null,
			'/tmp/archived/rollout.jsonl',
			30,
			300,
			1
		);

		db.close();

		expect(listCodexStateThreadRows(dbPath)).toEqual([
			{
				id: 'thread_new',
				title: 'Newest thread',
				cwd: '/tmp/new',
				sandbox_policy: '{"type":"workspace-write"}',
				model: 'gpt-5',
				first_user_message: 'First prompt',
				rollout_path: '/tmp/new/rollout.jsonl',
				created_at: 100,
				updated_at: 200
			},
			{
				id: 'thread_old',
				title: 'Older thread',
				cwd: '/tmp/old',
				sandbox_policy: 'read-only',
				model: null,
				first_user_message: null,
				rollout_path: '/tmp/old/rollout.jsonl',
				created_at: 10,
				updated_at: 20
			}
		]);
	});

	it('returns an empty list when the file is not a readable sqlite database', () => {
		const root = createTempDir();
		const dbPath = resolve(root, 'not-a-database.sqlite');
		writeFileSync(dbPath, 'plain text');

		expect(listCodexStateThreadRows(dbPath)).toEqual([]);
	});
});
