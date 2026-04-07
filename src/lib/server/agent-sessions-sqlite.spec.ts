import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const tempDirs: string[] = [];

function createTempDir() {
	const path = mkdtempSync(join(tmpdir(), 'ams-agent-threads-sqlite-'));
	tempDirs.push(path);
	return path;
}

async function importAgentThreadsModule() {
	vi.resetModules();
	return import('./agent-threads');
}

function writeAgentThreadsJson(root: string) {
	mkdirSync(resolve(root, 'data'), { recursive: true });
	writeFileSync(
		resolve(root, 'data', 'agent-threads.json'),
		JSON.stringify({
			threads: [
				{
					id: 'thread_seeded',
					name: 'Seeded session',
					cwd: '/tmp/project',
					sandbox: 'workspace-write',
					model: 'gpt-5',
					threadId: null,
					attachments: [],
					archivedAt: null,
					createdAt: '2026-04-02T12:00:00.000Z',
					updatedAt: '2026-04-02T12:00:00.000Z'
				}
			],
			runs: []
		})
	);
}

afterEach(() => {
	process.chdir(originalCwd);
	vi.unstubAllEnvs();
	vi.resetModules();

	while (tempDirs.length > 0) {
		const path = tempDirs.pop();

		if (path) {
			rmSync(path, { recursive: true, force: true });
		}
	}
});

describe('agent sessions sqlite backend', () => {
	it('bootstraps managed sessions from the existing json file', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		vi.stubEnv('CODEX_HOME', resolve(root, '.codex'));
		writeAgentThreadsJson(root);

		const { loadAgentThreadsDb } = await importAgentThreadsModule();
		const db = await loadAgentThreadsDb();
		const sqlite = new Database(resolve(root, 'data', 'app.sqlite'), {
			readonly: true,
			fileMustExist: true
		});
		const row = sqlite
			.prepare<[], { payload: string }>(
				`
						select payload
						from agent_thread_records
						where collection = 'threads' and id = 'thread_seeded'
					`
			)
			.get();
		sqlite.close();

		expect(db.threads.map((session) => session.id)).toEqual(['thread_seeded']);
		expect(JSON.parse(row?.payload ?? '{}')).toMatchObject({
			id: 'thread_seeded',
			name: 'Seeded session'
		});
	});

	it('persists session updates in sqlite when the sqlite backend is enabled', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		vi.stubEnv('CODEX_HOME', resolve(root, '.codex'));
		writeAgentThreadsJson(root);

		const { loadAgentThreadsDb, setAgentThreadsArchived } = await importAgentThreadsModule();

		await setAgentThreadsArchived(['thread_seeded'], true);

		const db = await loadAgentThreadsDb();
		const sqlite = new Database(resolve(root, 'data', 'app.sqlite'), {
			readonly: true,
			fileMustExist: true
		});
		const row = sqlite
			.prepare<[], { payload: string }>(
				`
						select payload
						from agent_thread_records
						where collection = 'threads' and id = 'thread_seeded'
					`
			)
			.get();
		sqlite.close();

		expect(db.threads[0]?.archivedAt).toBeTypeOf('string');
		expect(JSON.parse(row?.payload ?? '{}').archivedAt).toBeTypeOf('string');
	});
});
