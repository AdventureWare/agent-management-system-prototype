import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const tempDirs: string[] = [];

function createTempDir() {
	const path = mkdtempSync(join(tmpdir(), 'ams-control-plane-sqlite-'));
	tempDirs.push(path);
	return path;
}

async function importControlPlaneModule() {
	vi.resetModules();
	return import('./control-plane');
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

describe('control-plane sqlite backend', () => {
	it('persists control-plane updates in sqlite when the sqlite backend is enabled', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');

		const { loadControlPlane, updateControlPlane } = await importControlPlaneModule();

		await updateControlPlane((data) => ({
			...data,
			roles: [
				{
					id: 'role_coordinator',
					name: 'Coordinator',
					area: 'shared',
					description: 'Coordinates queued work'
				}
			]
		}));

		const loaded = await loadControlPlane();
		const dbPath = resolve(root, 'data', 'app.sqlite');

		expect(loaded.roles).toEqual([
			{
				id: 'role_coordinator',
				name: 'Coordinator',
				area: 'shared',
				description: 'Coordinates queued work'
			}
		]);
		expect(existsSync(dbPath)).toBe(true);

		const db = new Database(dbPath, { readonly: true, fileMustExist: true });
		const row = db
			.prepare<
				[],
				{ count: number }
			>("select count(*) as count from control_plane_records where collection = 'roles'")
			.get();
		db.close();

		expect(row?.count).toBe(1);
	});

	it('bootstraps the sqlite backend from the existing control-plane json file', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');

		mkdirSync(resolve(root, 'data'), { recursive: true });
		writeFileSync(
			resolve(root, 'data', 'control-plane.json'),
			JSON.stringify({
				providers: [],
				roles: [
					{
						id: 'role_seeded',
						name: 'Seeded role',
						area: 'shared',
						description: 'Loaded from json'
					}
				],
				projects: [],
				goals: [],
				workers: [],
				tasks: [],
				runs: [],
				reviews: [],
				approvals: [],
				decisions: [],
				planningSessions: []
			})
		);

		const { loadControlPlane } = await importControlPlaneModule();
		const loaded = await loadControlPlane();
		const db = new Database(resolve(root, 'data', 'app.sqlite'), {
			readonly: true,
			fileMustExist: true
		});
		const row = db
			.prepare<[], { payload: string }>(
				`
					select payload
					from control_plane_records
					where collection = 'roles' and id = 'role_seeded'
				`
			)
			.get();
		db.close();

		expect(loaded.roles.map((role) => role.id)).toEqual(['role_seeded']);
		expect(JSON.parse(row?.payload ?? '{}')).toMatchObject({
			id: 'role_seeded',
			name: 'Seeded role'
		});
	});
});
