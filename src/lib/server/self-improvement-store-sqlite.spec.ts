import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const tempDirs: string[] = [];

function createTempDir() {
	const path = mkdtempSync(join(tmpdir(), 'ams-self-improvement-sqlite-'));
	tempDirs.push(path);
	return path;
}

async function importSelfImprovementStoreModule() {
	vi.resetModules();
	return import('./self-improvement-store');
}

function writeSelfImprovementJson(root: string) {
	mkdirSync(resolve(root, 'data'), { recursive: true });
	writeFileSync(
		resolve(root, 'data', 'self-improvement.json'),
		JSON.stringify({
			records: [
				{
					id: 'opportunity_seeded',
					status: 'open',
					firstSeenAt: '2026-04-02T12:00:00.000Z',
					lastSeenAt: '2026-04-02T12:00:00.000Z',
					updatedAt: '2026-04-02T12:00:00.000Z',
					acceptedAt: null,
					dismissedAt: null,
					decisionSummary: '',
					createdTaskId: null,
					createdTaskTitle: null,
					createdKnowledgeItemId: null,
					createdKnowledgeItemTitle: null
				}
			],
			signals: [],
			knowledgeItems: []
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

describe('self-improvement sqlite backend', () => {
	it('bootstraps self-improvement data from the existing json file', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		writeSelfImprovementJson(root);

		const { loadSelfImprovementDb } = await importSelfImprovementStoreModule();
		const db = await loadSelfImprovementDb();
		const sqlite = new Database(resolve(root, 'data', 'app.sqlite'), {
			readonly: true,
			fileMustExist: true
		});
		const row = sqlite
			.prepare<[], { payload: string }>(
				`
					select payload
					from self_improvement_entries
					where collection = 'records' and id = 'opportunity_seeded'
				`
			)
			.get();
		sqlite.close();

		expect(db.records.map((record) => record.id)).toEqual(['opportunity_seeded']);
		expect(JSON.parse(row?.payload ?? '{}')).toMatchObject({
			id: 'opportunity_seeded',
			status: 'open'
		});
	});

	it('persists self-improvement status updates in sqlite', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		writeSelfImprovementJson(root);

		const { loadSelfImprovementDb, setSelfImprovementOpportunityStatus } =
			await importSelfImprovementStoreModule();

		await setSelfImprovementOpportunityStatus({
			opportunityId: 'opportunity_seeded',
			status: 'accepted',
			decisionSummary: 'Accepted into the improvement backlog.'
		});

		const db = await loadSelfImprovementDb();
		const sqlite = new Database(resolve(root, 'data', 'app.sqlite'), {
			readonly: true,
			fileMustExist: true
		});
		const row = sqlite
			.prepare<[], { payload: string }>(
				`
					select payload
					from self_improvement_entries
					where collection = 'records' and id = 'opportunity_seeded'
				`
			)
			.get();
		sqlite.close();

		expect(db.records[0]?.status).toBe('accepted');
		expect(JSON.parse(row?.payload ?? '{}')).toMatchObject({
			id: 'opportunity_seeded',
			status: 'accepted',
			decisionSummary: 'Accepted into the improvement backlog.'
		});
	});
});
