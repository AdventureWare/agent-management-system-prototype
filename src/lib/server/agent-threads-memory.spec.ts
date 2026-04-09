import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const tempDirs: string[] = [];

function createTempDir() {
	const path = mkdtempSync(join(tmpdir(), 'ams-agent-threads-memory-'));
	tempDirs.push(path);
	return path;
}

async function importAgentThreadsModule() {
	vi.resetModules();
	return import('./agent-threads');
}

function writeControlPlane(root: string) {
	mkdirSync(resolve(root, 'data'), { recursive: true });
	writeFileSync(
		resolve(root, 'data', 'control-plane.json'),
		JSON.stringify({
			providers: [],
			roles: [],
			projects: [],
			goals: [],
			executionSurfaces: [],
			tasks: [],
			runs: [],
			reviews: [],
			planningSessions: [],
			approvals: [],
			decisions: []
		})
	);
}

function writeAgentThreads(
	root: string,
	run: {
		agentThreadId: string;
		runId: string;
		statePath: string;
		logPath: string;
		messagePath: string;
	}
) {
	mkdirSync(resolve(root, 'data'), { recursive: true });
	writeFileSync(
		resolve(root, 'data', 'agent-threads.json'),
		JSON.stringify({
			threads: [
				{
					id: run.agentThreadId,
					name: 'Managed thread',
					cwd: root,
					additionalWritableRoots: [],
					sandbox: 'workspace-write',
					model: null,
					threadId: null,
					attachments: [],
					archivedAt: null,
					createdAt: '2026-04-09T16:10:55.394Z',
					updatedAt: '2026-04-09T16:25:54.244Z'
				}
			],
			runs: [
				{
					id: run.runId,
					agentThreadId: run.agentThreadId,
					mode: 'start',
					prompt: 'Investigate crash',
					requestedThreadId: null,
					sourceAgentThreadId: null,
					sourceAgentThreadName: null,
					contactId: null,
					replyToContactId: null,
					createdAt: '2026-04-09T16:10:55.394Z',
					updatedAt: '2026-04-09T16:25:54.244Z',
					logPath: run.logPath,
					statePath: run.statePath,
					messagePath: run.messagePath,
					configPath: resolve(
						root,
						'data',
						'agent-threads',
						run.agentThreadId,
						'runs',
						run.runId,
						'config.json'
					)
				}
			],
			contacts: []
		})
	);
}

function writeCodexStateThread(
	root: string,
	input: {
		threadId: string;
		rolloutPath: string;
		firstUserMessage?: string | null;
	}
) {
	const codexHome = resolve(root, '.codex');
	const dbPath = resolve(codexHome, 'state_5.sqlite');

	mkdirSync(codexHome, { recursive: true });

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
		input.threadId,
		'Imported thread',
		root,
		'{"type":"workspace-write"}',
		null,
		input.firstUserMessage ?? null,
		input.rolloutPath,
		100,
		200,
		0
	);

	db.close();
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

describe('agent-threads memory-safe detail loading', () => {
	it('prefers persisted run summaries over rereading raw logs', async () => {
		const root = createTempDir();
		const agentThreadId = 'thread_managed';
		const runId = 'run_summary';
		const runDir = resolve(root, 'data', 'agent-threads', agentThreadId, 'runs', runId);
		const statePath = resolve(runDir, 'state.json');
		const logPath = resolve(runDir, 'codex.log');
		const messagePath = resolve(runDir, 'last-message.txt');
		const summaryPath = resolve(runDir, 'summary.json');

		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'json');
		vi.stubEnv('CODEX_HOME', resolve(root, '.codex'));
		mkdirSync(runDir, { recursive: true });
		writeControlPlane(root);
		writeAgentThreads(root, { agentThreadId, runId, statePath, logPath, messagePath });
		writeFileSync(
			statePath,
			JSON.stringify({
				status: 'completed',
				pid: null,
				startedAt: '2026-04-09T16:10:55.582Z',
				finishedAt: '2026-04-09T16:25:56.186Z',
				exitCode: 0,
				signal: null,
				codexThreadId: 'codex_thread_1'
			})
		);
		writeFileSync(logPath, 'raw log line 1\nraw log line 2\n');
		writeFileSync(
			summaryPath,
			JSON.stringify({
				state: {
					status: 'completed',
					pid: null,
					startedAt: '2026-04-09T16:10:55.582Z',
					finishedAt: '2026-04-09T16:25:56.186Z',
					exitCode: 0,
					signal: null,
					codexThreadId: 'codex_thread_1'
				},
				lastMessage: 'Persisted summary message',
				logTail: ['summary line 1', 'summary line 2'],
				activityAt: '2026-04-09T16:25:56.186Z'
			})
		);

		const { getAgentThread } = await importAgentThreadsModule();
		const detail = await getAgentThread(agentThreadId);

		expect(detail?.latestRun?.lastMessage).toBe('Persisted summary message');
		expect(detail?.latestRun?.logTail).toEqual(['summary line 1', 'summary line 2']);
	});

	it('bounds raw log tail reads when summaries are unavailable', async () => {
		const root = createTempDir();
		const agentThreadId = 'thread_managed';
		const runId = 'run_large_log';
		const runDir = resolve(root, 'data', 'agent-threads', agentThreadId, 'runs', runId);
		const statePath = resolve(runDir, 'state.json');
		const logPath = resolve(runDir, 'codex.log');
		const messagePath = resolve(runDir, 'last-message.txt');

		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'json');
		vi.stubEnv('CODEX_HOME', resolve(root, '.codex'));
		mkdirSync(runDir, { recursive: true });
		writeControlPlane(root);
		writeAgentThreads(root, { agentThreadId, runId, statePath, logPath, messagePath });
		writeFileSync(
			statePath,
			JSON.stringify({
				status: 'completed',
				pid: null,
				startedAt: '2026-04-09T16:10:55.582Z',
				finishedAt: '2026-04-09T16:25:56.186Z',
				exitCode: 0,
				signal: null,
				codexThreadId: 'codex_thread_1'
			})
		);
		writeFileSync(logPath, `${'x'.repeat(300_000)}\nolder line\nrecent line\nlast line\n`);

		const { getAgentThread } = await importAgentThreadsModule();
		const detail = await getAgentThread(agentThreadId);

		expect(detail?.latestRun?.logTail).toEqual(['older line', 'recent line', 'last line']);
	});

	it('streams imported native rollout logs instead of loading the full file into memory', async () => {
		const root = createTempDir();
		const rolloutPath = resolve(root, 'native-rollout.jsonl');
		const threadId = 'native_thread';

		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'json');
		vi.stubEnv('CODEX_HOME', resolve(root, '.codex'));
		writeControlPlane(root);
		writeAgentThreads(root, {
			agentThreadId: 'thread_other',
			runId: 'run_other',
			statePath: resolve(
				root,
				'data',
				'agent-threads',
				'thread_other',
				'runs',
				'run_other',
				'state.json'
			),
			logPath: resolve(
				root,
				'data',
				'agent-threads',
				'thread_other',
				'runs',
				'run_other',
				'codex.log'
			),
			messagePath: resolve(
				root,
				'data',
				'agent-threads',
				'thread_other',
				'runs',
				'run_other',
				'last-message.txt'
			)
		});
		writeFileSync(
			rolloutPath,
			[
				JSON.stringify({
					type: 'event_msg',
					timestamp: '2026-04-09T16:10:55.582Z',
					payload: {
						type: 'user_message',
						kind: 'message',
						message: 'Investigate crash'
					}
				}),
				`${'x'.repeat(300_000)}`,
				JSON.stringify({
					type: 'event_msg',
					timestamp: '2026-04-09T16:25:56.186Z',
					payload: {
						type: 'agent_message',
						message: 'Imported native reply'
					}
				})
			].join('\n')
		);
		writeCodexStateThread(root, {
			threadId,
			rolloutPath,
			firstUserMessage: 'Investigate crash'
		});

		const { getAgentThread } = await importAgentThreadsModule();
		const detail = await getAgentThread(threadId);

		expect(detail?.latestRun?.prompt).toBe('Investigate crash');
		expect(detail?.latestRun?.lastMessage).toBe('Imported native reply');
	});
});
