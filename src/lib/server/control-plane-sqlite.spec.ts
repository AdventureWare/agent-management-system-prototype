import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
				executionSurfaces: [],
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

	it('keeps sqlite as the runtime backend outside tests even when APP_STORAGE_BACKEND=json', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('NODE_ENV', 'development');
		vi.stubEnv('APP_STORAGE_BACKEND', 'json');

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
				executionSurfaces: [],
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

		expect(loaded.roles.map((role) => role.id)).toEqual(['role_seeded']);
		expect(existsSync(resolve(root, 'data', 'app.sqlite'))).toBe(true);
	});

	it('ignores stale sqlite rows with unknown collections while loading', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

		const db = new Database(resolve(root, 'data', 'app.sqlite'));
		db.prepare(
			`
				insert into control_plane_records (collection, id, position, payload)
				values (?, ?, ?, ?)
			`
		).run('legacyRecords', 'legacy_record', 999, JSON.stringify({ id: 'legacy_record' }));
		db.close();

		const loaded = await loadControlPlane();

		expect(loaded.roles.map((role) => role.id)).toEqual(['role_coordinator']);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('Ignoring unknown sqlite collection "legacyRecords"')
		);
	});

	it('repairs dangling sqlite task references during load and persists clean follow-up updates', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');

		const { loadControlPlane, updateControlPlane } = await importControlPlaneModule();

		await updateControlPlane((data) => ({
			...data,
			tasks: [
				{
					id: 'task_kept',
					title: 'Kept task',
					summary: 'Still valid',
					projectId: '',
					area: 'product',
					goalId: '',
					parentTaskId: null,
					delegationPacket: null,
					delegationAcceptance: null,
					priority: 'medium',
					status: 'review',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiredThreadSandbox: null,
					requiresReview: true,
					desiredRoleId: '',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					requiredPromptSkillNames: [],
					requiredCapabilityNames: [],
					requiredToolNames: [],
					blockedReason: '',
					dependencyTaskIds: [],
					estimateHours: null,
					targetDate: null,
					runCount: 1,
					latestRunId: 'run_kept',
					artifactPath: '',
					attachments: [],
					createdAt: '2026-04-01T00:00:00.000Z',
					updatedAt: '2026-04-01T00:00:00.000Z'
				}
			],
			runs: [
				{
					id: 'run_kept',
					taskId: 'task_kept',
					executionSurfaceId: null,
					providerId: null,
					status: 'completed',
					createdAt: '2026-04-01T00:00:00.000Z',
					updatedAt: '2026-04-01T00:05:00.000Z',
					startedAt: '2026-04-01T00:00:00.000Z',
					endedAt: '2026-04-01T00:05:00.000Z',
					threadId: null,
					agentThreadId: null,
					promptDigest: '',
					artifactPaths: [],
					summary: 'Completed work',
					lastHeartbeatAt: null,
					errorSummary: ''
				}
			],
			reviews: [
				{
					id: 'review_kept',
					taskId: 'task_kept',
					runId: 'run_kept',
					status: 'open',
					createdAt: '2026-04-01T00:05:00.000Z',
					updatedAt: '2026-04-01T00:05:00.000Z',
					resolvedAt: null,
					requestedByExecutionSurfaceId: null,
					reviewerExecutionSurfaceId: null,
					summary: 'Needs review'
				}
			]
		}));

		const dbPath = resolve(root, 'data', 'app.sqlite');
		const db = new Database(dbPath);
		db.prepare(
			`
				insert into control_plane_records (collection, id, position, payload)
				values (?, ?, ?, ?)
			`
		).run(
			'runs',
			'run_orphan',
			99,
			JSON.stringify({
				id: 'run_orphan',
				taskId: 'task_missing',
				executionSurfaceId: null,
				providerId: null,
				status: 'completed',
				createdAt: '2026-04-01T00:10:00.000Z',
				updatedAt: '2026-04-01T00:10:00.000Z',
				startedAt: '2026-04-01T00:10:00.000Z',
				endedAt: '2026-04-01T00:10:00.000Z',
				threadId: null,
				agentThreadId: null,
				promptDigest: '',
				artifactPaths: [],
				summary: 'Orphaned run',
				lastHeartbeatAt: null,
				errorSummary: ''
			})
		);
		db.prepare(
			`
				insert into control_plane_records (collection, id, position, payload)
				values (?, ?, ?, ?)
			`
		).run(
			'reviews',
			'review_orphan',
			99,
			JSON.stringify({
				id: 'review_orphan',
				taskId: 'task_missing',
				runId: 'run_orphan',
				status: 'open',
				createdAt: '2026-04-01T00:10:00.000Z',
				updatedAt: '2026-04-01T00:10:00.000Z',
				resolvedAt: null,
				requestedByExecutionSurfaceId: null,
				reviewerExecutionSurfaceId: null,
				summary: 'Orphaned review'
			})
		);
		db.close();

		const loaded = await loadControlPlane();

		expect(loaded.runs.map((run) => run.id)).toEqual(['run_kept']);
		expect(loaded.reviews.map((review) => review.id)).toEqual(['review_kept']);

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

		const reloaded = await loadControlPlane();

		expect(reloaded.runs.map((run) => run.id)).toEqual(['run_kept']);
		expect(reloaded.reviews.map((review) => review.id)).toEqual(['review_kept']);

		const verifyDb = new Database(dbPath, { readonly: true, fileMustExist: true });
		const orphanRunRow = verifyDb
			.prepare<
				[],
				{ count: number }
			>("select count(*) as count from control_plane_records where collection = 'runs' and id = 'run_orphan'")
			.get();
		const orphanReviewRow = verifyDb
			.prepare<
				[],
				{ count: number }
			>("select count(*) as count from control_plane_records where collection = 'reviews' and id = 'review_orphan'")
			.get();
		verifyDb.close();

		expect(orphanRunRow?.count).toBe(0);
		expect(orphanReviewRow?.count).toBe(0);
	});

	it('serializes concurrent updates so they do not drop newer records', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');

		const { loadControlPlane, updateControlPlane } = await importControlPlaneModule();
		let releaseFirstUpdate!: () => void;
		const firstUpdateReady = new Promise<void>((resolve) => {
			releaseFirstUpdate = resolve;
		});
		let firstUpdateLoaded = false;

		const firstUpdate = updateControlPlane(async (data) => {
			firstUpdateLoaded = true;
			await firstUpdateReady;

			return {
				...data,
				roles: [
					{
						id: 'role_serialized',
						name: 'Serialized role',
						area: 'shared',
						description: 'Created by the first update'
					}
				]
			};
		});

		while (!firstUpdateLoaded) {
			await Promise.resolve();
		}

		const secondUpdate = updateControlPlane((data) => ({
			...data,
			projects: [
				{
					id: 'project_serialized',
					name: 'Serialized project',
					summary: 'Created by the second update',
					parentProjectId: null,
					projectRootFolder: '/tmp/project_serialized',
					defaultArtifactRoot: '/tmp/project_serialized/artifacts',
					defaultRepoPath: '/tmp/project_serialized',
					defaultRepoUrl: '',
					defaultBranch: '',
					additionalWritableRoots: [],
					defaultThreadSandbox: null
				}
			]
		}));

		releaseFirstUpdate();
		await Promise.all([firstUpdate, secondUpdate]);

		const loaded = await loadControlPlane();

		expect(loaded.roles.map((role) => role.id)).toEqual(['role_serialized']);
		expect(loaded.projects.map((project) => project.id)).toEqual(['project_serialized']);
	});

	it('preserves task writes across independent module instances and refreshes the json mirror', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');

		const firstModule = await importControlPlaneModule();
		let releaseFirstUpdate!: () => void;
		const firstUpdateReady = new Promise<void>((resolve) => {
			releaseFirstUpdate = resolve;
		});
		let firstUpdateLoaded = false;

		const createdTask = firstModule.createTask({
			title: 'Recovered task',
			summary: 'Should survive concurrent writes',
			projectId: '',
			goalId: '',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: '',
			artifactPath: ''
		});

		const firstUpdate = firstModule.updateControlPlane(async (data) => {
			firstUpdateLoaded = true;
			await firstUpdateReady;

			return {
				...data,
				tasks: [createdTask, ...data.tasks]
			};
		});

		while (!firstUpdateLoaded) {
			await Promise.resolve();
		}

		const secondModule = await importControlPlaneModule();
		await secondModule.updateControlPlane((data) => ({
			...data,
			roles: [
				{
					id: 'role_parallel',
					name: 'Parallel writer',
					area: 'shared',
					description: 'Created by a separate module instance'
				}
			]
		}));

		releaseFirstUpdate();
		await firstUpdate;

		const loaded = await secondModule.loadControlPlane();
		const jsonMirror = JSON.parse(
			readFileSync(resolve(root, 'data', 'control-plane.json'), 'utf8')
		);

		expect(loaded.tasks.map((task) => task.id)).toContain(createdTask.id);
		expect(loaded.roles.map((role) => role.id)).toContain('role_parallel');
		expect(jsonMirror.tasks.map((task: { id: string }) => task.id)).toContain(createdTask.id);
		expect(jsonMirror.roles.map((role: { id: string }) => role.id)).toContain('role_parallel');
	});
});
