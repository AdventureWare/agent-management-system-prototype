import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const tempDirs: string[] = [];

function createTempDir() {
	const path = mkdtempSync(join(tmpdir(), 'ams-agent-sessions-sqlite-'));
	tempDirs.push(path);
	return path;
}

async function importAgentSessionsModule() {
	vi.resetModules();
	return import('./agent-sessions');
}

function writeAgentSessionsJson(root: string) {
	mkdirSync(resolve(root, 'data'), { recursive: true });
	writeFileSync(
		resolve(root, 'data', 'agent-sessions.json'),
		JSON.stringify({
			sessions: [
				{
					id: 'session_seeded',
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
		writeAgentSessionsJson(root);

		const { loadAgentSessionsDb } = await importAgentSessionsModule();
		const db = await loadAgentSessionsDb();
		const sqlite = new Database(resolve(root, 'data', 'app.sqlite'), {
			readonly: true,
			fileMustExist: true
		});
		const row = sqlite
			.prepare<[], { payload: string }>(
				`
					select payload
					from agent_session_records
					where collection = 'sessions' and id = 'session_seeded'
				`
			)
			.get();
		sqlite.close();

		expect(db.sessions.map((session) => session.id)).toEqual(['session_seeded']);
		expect(JSON.parse(row?.payload ?? '{}')).toMatchObject({
			id: 'session_seeded',
			name: 'Seeded session'
		});
	});

	it('persists session updates in sqlite when the sqlite backend is enabled', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		vi.stubEnv('CODEX_HOME', resolve(root, '.codex'));
		writeAgentSessionsJson(root);

		const { loadAgentSessionsDb, setAgentSessionsArchived } = await importAgentSessionsModule();

		await setAgentSessionsArchived(['session_seeded'], true);

		const db = await loadAgentSessionsDb();
		const sqlite = new Database(resolve(root, 'data', 'app.sqlite'), {
			readonly: true,
			fileMustExist: true
		});
		const row = sqlite
			.prepare<[], { payload: string }>(
				`
					select payload
					from agent_session_records
					where collection = 'sessions' and id = 'session_seeded'
				`
			)
			.get();
		sqlite.close();

		expect(db.sessions[0]?.archivedAt).toBeTypeOf('string');
		expect(JSON.parse(row?.payload ?? '{}').archivedAt).toBeTypeOf('string');
	});
});
