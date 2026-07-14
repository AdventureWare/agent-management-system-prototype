#!/usr/bin/env node

import { resolve } from 'node:path';
import {
	openExistingV2CoreDbForWrite,
	openV2CoreDbReadonly
} from '../src/lib/server/v2-core-persistence.ts';
import {
	transitionV2CoreGoalStatus,
	transitionV2CoreTaskStatus
} from '../src/lib/server/v2-core-service.ts';

type Options = {
	dbFile: string;
	write: boolean;
	json: boolean;
	help: boolean;
};

type CleanupPlan = {
	pauseHoldingGoalIds: string[];
	cancelTaskIds: string[];
	keepReadyTaskIds: string[];
};

const DEFAULT_DB = 'data/v2-core.sqlite';

function parseArgs(argv: string[]): Options {
	const options: Options = {
		dbFile: DEFAULT_DB,
		write: false,
		json: false,
		help: false
	};

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (token === '--help' || token === '-h') {
			options.help = true;
			continue;
		}
		if (token === '--write') {
			options.write = true;
			continue;
		}
		if (token === '--json') {
			options.json = true;
			continue;
		}
		const next = argv[index + 1];
		if (!next || next.startsWith('--')) {
			throw new Error(`Missing value for ${token}.`);
		}
		if (token === '--db') {
			options.dbFile = next;
		} else {
			throw new Error(`Unknown option: ${token}.`);
		}
		index += 1;
	}

	return options;
}

function printHelp() {
	process.stdout.write(
		[
			'Usage: node --experimental-strip-types scripts/v2-cleanup-imported-v1-backlog.ts [options]',
			'',
			'Options:',
			'  --db <path>  V2 core SQLite DB. Defaults to data/v2-core.sqlite.',
			'  --write      Apply cleanup. Omit for dry-run.',
			'  --json       Print JSON.',
			'  --help       Show help.'
		].join('\n') + '\n'
	);
}

function readPlan(db: ReturnType<typeof openV2CoreDbReadonly>): CleanupPlan {
	const pauseHoldingGoalIds = db
		.prepare<[], { id: string }>(
			`
				select id
				from v2_core_goals
				where id like 'goal_imported_unscoped_v1_%'
					and status = 'active'
				order by id
			`
		)
		.all()
		.map((row) => row.id);

	const cancelTaskIds = db
		.prepare<[], { id: string }>(
			`
				select id
				from v2_core_tasks
				where status = 'review'
					and exists (
						select 1
						from v2_core_source_references s
						where s.record_table = 'v2_core_tasks'
							and s.record_id = v2_core_tasks.id
							and s.source_system = 'ams-v1'
					)
				union
				select id
				from v2_core_tasks
				where id = 'task_ffbdc98c-1761-42da-ad55-6e2bbec6582b'
					and status = 'ready'
				order by id
			`
		)
		.all()
		.map((row) => row.id);

	const keepReadyTaskIds = db
		.prepare<[], { id: string }>(
			`
				select id
				from v2_core_tasks
				where status = 'ready'
					and exists (
						select 1
						from v2_core_source_references s
						where s.record_table = 'v2_core_tasks'
							and s.record_id = v2_core_tasks.id
							and s.source_system = 'ams-v1'
					)
					and id not in ('task_ffbdc98c-1761-42da-ad55-6e2bbec6582b')
				order by id
			`
		)
		.all()
		.map((row) => row.id);

	return { pauseHoldingGoalIds, cancelTaskIds, keepReadyTaskIds };
}

function counts(db: ReturnType<typeof openV2CoreDbReadonly>) {
	return {
		openTaskStatuses: Object.fromEntries(
			db
				.prepare<[], { status: string; count: number }>(
					`
						select status, count(*) as count
						from v2_core_tasks
						where status in ('draft','ready','in_progress','review','blocked')
						group by status
						order by status
					`
				)
				.all()
				.map((row) => [row.status, row.count])
		),
		activeImportedHoldingGoals: (
			db
				.prepare<[], { count: number }>(
					`
						select count(*) as count
						from v2_core_goals
						where id like 'goal_imported_unscoped_v1_%'
							and status = 'active'
					`
				)
				.get() ?? { count: 0 }
		).count
	};
}

function main() {
	let db:
		| ReturnType<typeof openExistingV2CoreDbForWrite>
		| ReturnType<typeof openV2CoreDbReadonly>
		| null = null;
	try {
		const options = parseArgs(process.argv.slice(2));
		if (options.help) {
			printHelp();
			return;
		}

		db = options.write
			? openExistingV2CoreDbForWrite({ dbFile: resolve(options.dbFile) })
			: openV2CoreDbReadonly({ dbFile: resolve(options.dbFile) });
		const before = counts(db);
		const plan = readPlan(db);

		const applied = {
			pausedHoldingGoals: [] as string[],
			canceledTasks: [] as string[]
		};

		if (options.write) {
			db.transaction(() => {
				for (const taskId of plan.cancelTaskIds) {
					transitionV2CoreTaskStatus(db!, {
						taskId,
						status: 'canceled',
						summary:
							'Imported v1 review/continuation residue canceled during backlog cleanup; evidence preserved for historical reference.'
					});
					applied.canceledTasks.push(taskId);
				}
				for (const goalId of plan.pauseHoldingGoalIds) {
					transitionV2CoreGoalStatus(db!, {
						goalId,
						status: 'paused',
						summary:
							'Generated imported-unscoped holding goal paused during backlog cleanup; it is not a real desired future state.'
					});
					applied.pausedHoldingGoals.push(goalId);
				}
			})();
		}

		const after = counts(db);
		const result = {
			mode: options.write ? 'write' : 'dry-run',
			before,
			plan,
			applied,
			after,
			notes: [
				'No rows are deleted.',
				'Concrete ready tasks remain ready unless they are stale continuation-control residue.',
				'Generated holding goals are paused so they do not drive work selection.'
			]
		};

		process.stdout.write(
			options.json ? `${JSON.stringify(result, null, 2)}\n` : `${JSON.stringify(result, null, 2)}\n`
		);
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
	} finally {
		db?.close();
	}
}

main();
