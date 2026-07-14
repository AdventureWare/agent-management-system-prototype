#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { openExistingV2CoreDbForWrite } from '../src/lib/server/v2-core-persistence.ts';
import {
	attachV2CoreArtifact,
	createV2CoreTask,
	recordV2CoreDecision,
	recordV2CoreReview,
	recordV2CoreRun
} from '../src/lib/server/v2-core-service.ts';

const DEFAULT_SOURCE_DB = 'data/app.sqlite';
const DEFAULT_V2_DB = 'data/v2-core.sqlite';
const SILVER_OAK_PROJECT_ID = 'project_aec29994-53d4-4367-a1c1-1ea5a9c81a2c';

type Options = {
	sourceDb: string;
	dbFile: string;
	write: boolean;
	json: boolean;
	help: boolean;
};

type V1Attachment = {
	id?: string;
	path?: string;
	uri?: string;
	name?: string;
	title?: string;
	mimeType?: string;
};

type V1Record = Record<string, unknown> & {
	id: string;
	name?: string;
	title?: string;
	summary?: string;
	status?: string;
	projectId?: string;
	projectIds?: string[];
	goalId?: string;
	parentTaskId?: string | null;
	artifactPath?: string;
	successSignal?: string;
	successCriteria?: string;
	validationPlan?: string;
	attachments?: V1Attachment[];
};

type CollectionName = 'goals' | 'tasks';

function printHelp() {
	process.stdout.write(
		[
			'Usage: node --experimental-strip-types scripts/v1-silver-oak-task-evidence-import.ts [options]',
			'',
			'Options:',
			'  --source-db <path>  V1 runtime SQLite DB. Defaults to data/app.sqlite.',
			'  --db <path>         V2 core SQLite DB. Defaults to data/v2-core.sqlite.',
			'  --write             Import curated completed task evidence into v2.',
			'  --json              Print machine-readable JSON.',
			'  --help              Show this help.',
			'',
			'Without --write this command is read-only. It never writes v1 state.'
		].join('\n') + '\n'
	);
}

function parseArgs(argv: string[]): Options {
	const options: Options = {
		sourceDb: DEFAULT_SOURCE_DB,
		dbFile: DEFAULT_V2_DB,
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
		if (token === '--json') {
			options.json = true;
			continue;
		}
		if (token === '--write') {
			options.write = true;
			continue;
		}

		const next = argv[index + 1];
		if (!next || next.startsWith('--')) {
			throw new Error(`Missing value for ${token}.`);
		}

		if (token === '--source-db') {
			options.sourceDb = next;
		} else if (token === '--db') {
			options.dbFile = next;
		} else {
			throw new Error(`Unknown option: ${token}.`);
		}

		index += 1;
	}

	return options;
}

function readCollection(db: Database.Database, collection: CollectionName) {
	return db
		.prepare(
			'select id, payload from control_plane_records where collection = ? order by position'
		)
		.all(collection)
		.map((row) => JSON.parse((row as { payload: string }).payload) as V1Record);
}

function text(value: unknown, fallback = '') {
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function title(record: V1Record) {
	return text(record.title) || text(record.name) || record.id;
}

function attachments(record: V1Record) {
	return Array.isArray(record.attachments) ? record.attachments : [];
}

function isContinuationTask(record: V1Record) {
	return title(record).toLowerCase().startsWith('continue goal:');
}

function rowExists(db: Database.Database, table: string, id: string) {
	return Boolean(db.prepare(`select id from ${table} where id = ?`).get(id));
}

function truncateText(value: string, maxLength: number) {
	if (value.length <= maxLength) {
		return value;
	}

	return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function artifactUri(attachment: V1Attachment, task: V1Record) {
	return text(attachment.path) || text(attachment.uri) || text(task.artifactPath);
}

function artifactTitle(attachment: V1Attachment, task: V1Record, index: number) {
	return (
		text(attachment.title) ||
		text(attachment.name) ||
		(text(attachment.path).split('/').filter(Boolean).at(-1) ?? '') ||
		`${title(task)} attachment ${index + 1}`
	);
}

function buildPreview(options: Options) {
	const sourceDb = resolve(options.sourceDb);
	const db = new Database(sourceDb, { readonly: true, fileMustExist: true });

	try {
		const goals = readCollection(db, 'goals');
		const tasks = readCollection(db, 'tasks');
		const silverOakGoalIds = new Set(
			goals
				.filter((goal) => (goal.projectIds ?? []).includes(SILVER_OAK_PROJECT_ID))
				.map((goal) => goal.id)
		);
		const projectTasks = tasks.filter(
			(task) =>
				silverOakGoalIds.has(text(task.goalId)) ||
				task.projectId === SILVER_OAK_PROJECT_ID ||
				(task.projectIds ?? []).includes(SILVER_OAK_PROJECT_ID)
		);
		const doneTasks = projectTasks.filter((task) => text(task.status) === 'done');
		const importCandidates = doneTasks.filter(
			(task) => silverOakGoalIds.has(text(task.goalId)) && !isContinuationTask(task)
		);
		const skipped = {
			doneContinuation: doneTasks.filter((task) => isContinuationTask(task)).map((task) => task.id),
			doneUnscoped: doneTasks.filter((task) => !text(task.goalId)).map((task) => task.id),
			openOrReview: projectTasks
				.filter((task) => ['ready', 'review', 'in_progress'].includes(text(task.status)))
				.map((task) => task.id),
			canceled: projectTasks.filter((task) => text(task.status) === 'canceled').map((task) => task.id)
		};

		return {
			mode: options.write ? 'write' : 'dry-run',
			writesDatabase: options.write,
			source: {
				system: 'ams-v1-runtime-sqlite',
				dbFile: sourceDb,
				table: 'control_plane_records',
				projectId: SILVER_OAK_PROJECT_ID
			},
			counts: {
				projectTasks: projectTasks.length,
				doneTasks: doneTasks.length,
				importCandidates: importCandidates.length,
				attachmentArtifacts: importCandidates.reduce(
					(count, task) => count + attachments(task).filter((attachment) => artifactUri(attachment, task)).length,
					0
				),
				skippedDoneContinuation: skipped.doneContinuation.length,
				skippedDoneUnscoped: skipped.doneUnscoped.length,
				skippedOpenOrReview: skipped.openOrReview.length,
				skippedCanceled: skipped.canceled.length
			},
			importCandidates: importCandidates.map((task) => ({
				id: task.id,
				title: title(task),
				goalId: text(task.goalId),
				attachmentCount: attachments(task).length,
				artifactPath: text(task.artifactPath) || null,
				artifactPathExists: text(task.artifactPath) ? existsSync(text(task.artifactPath)) : null
			})),
			skipped,
			warnings: [
				'Imports only completed, goal-linked, non-continuation Silver Oak tasks.',
				'Open, review, canceled, unscoped, and continuation-control tasks are not imported.',
				'Imported tasks are historical evidence records with accepted artifact provenance; they are not new executable work.'
			]
		};
	} finally {
		db.close();
	}
}

function writeImport(options: Options, preview: ReturnType<typeof buildPreview>) {
	const sourceDb = new Database(resolve(options.sourceDb), { readonly: true, fileMustExist: true });
	const v2Db = openExistingV2CoreDbForWrite({ dbFile: resolve(options.dbFile) });
	const created: string[] = [];
	const skippedExisting: string[] = [];

	try {
		const tasks = readCollection(sourceDb, 'tasks');
		const candidatesById = new Set(preview.importCandidates.map((task) => task.id));
		const candidates = tasks.filter((task) => candidatesById.has(task.id));

		v2Db.transaction(() => {
			for (const task of candidates) {
				if (rowExists(v2Db, 'v2_core_tasks', task.id)) {
					skippedExisting.push(task.id);
					continue;
				}

				createV2CoreTask(v2Db, {
					id: task.id,
					goalId: text(task.goalId),
					title: title(task),
					summary: truncateText(
						[
							'Imported as historical Silver Oak v1 completed-task evidence.',
							text(task.summary),
							text(task.artifactPath) ? `V1 artifact path: ${text(task.artifactPath)}.` : ''
						]
							.filter(Boolean)
							.join(' '),
						3000
					),
					successCriteria:
						text(task.successCriteria) ||
						text(task.successSignal) ||
						'Preserve completed v1 task evidence and attachment provenance in v2.',
					validationPlan:
						text(task.validationPlan) ||
						'Historical import only: preserve v1 task status, goal link, source ID, and attachment provenance without re-running the original work.',
					status: 'done',
					source: {
						sourceSystem: 'ams-v1',
						sourceCollection: 'tasks',
						sourceId: task.id,
						field: 'record',
						note: 'Imported by Silver Oak completed task evidence importer.'
					}
				});
				created.push(task.id);

				const runId = `run_v1_import_${task.id}`;
				recordV2CoreRun(v2Db, {
					id: runId,
					taskId: task.id,
					status: 'completed',
					inputSummary: 'Historical v1 completed-task import.',
					actionSummary: 'Imported completed task metadata and attachment provenance from AMS v1.',
					resultSummary: `Preserved completed v1 task evidence for ${title(task)}.`,
					validationSummary:
						'Importer classified this as completed, goal-linked, and non-continuation; no original domain work was re-run.',
					source: {
						sourceSystem: 'ams-v1',
						sourceCollection: 'tasks',
						sourceId: task.id,
						field: 'status',
						note: 'Synthetic v2 run representing historical v1 completed-task evidence import.'
					}
				});
				created.push(runId);

				attachments(task).forEach((attachment, index) => {
					const uri = artifactUri(attachment, task);
					if (!uri) {
						return;
					}

					const artifactId = `artifact_v1_import_${task.id}_${index + 1}`;
					attachV2CoreArtifact(v2Db, {
						id: artifactId,
						taskId: task.id,
						runId,
						uri,
						role: 'evidence',
						title: artifactTitle(attachment, task, index),
						summary: `Imported v1 task attachment evidence for ${title(task)}.`,
						status: 'accepted',
						source: {
							sourceSystem: 'ams-v1',
							sourceCollection: 'tasks.attachments',
							sourceId: text(attachment.id) || `${task.id}:${index + 1}`,
							field: 'path',
							note: `Attachment imported from v1 task ${task.id}.`
						}
					});
					created.push(artifactId);
				});

				const reviewId = `review_v1_import_${task.id}`;
				recordV2CoreReview(v2Db, {
					id: reviewId,
					taskId: task.id,
					runId,
					status: 'approved',
					summary:
						'Historical import approved because the source task was completed, goal-linked, and non-continuation in AMS v1.',
					source: {
						sourceSystem: 'ams-v1-migration',
						sourceCollection: 'tasks',
						sourceId: task.id,
						field: 'classification',
						note: 'Curated Silver Oak task-evidence import.'
					}
				});
				created.push(reviewId);

				const decisionId = `decision_v1_import_${task.id}`;
				recordV2CoreDecision(v2Db, {
					id: decisionId,
					projectId: SILVER_OAK_PROJECT_ID,
					goalId: text(task.goalId),
					taskId: task.id,
					runId,
					reviewId,
					decisionType: 'import_historical_task_evidence',
					summary: `Imported completed v1 Silver Oak task evidence: ${title(task)}.`,
					rationale:
						'The task is completed, linked to an imported Silver Oak goal, and is not continuation-control residue. It is imported as historical evidence, not active work.',
					source: {
						sourceSystem: 'ams-v1',
						sourceCollection: 'tasks',
						sourceId: task.id,
						field: 'record',
						note: 'Decision created by curated Silver Oak task-evidence import.'
					}
				});
				created.push(decisionId);
			}
		})();

		return {
			dbFile: resolve(options.dbFile),
			created,
			skippedExisting,
			createdCounts: {
				total: created.length,
				tasks: created.filter((id) => id.startsWith('task_')).length,
				runs: created.filter((id) => id.startsWith('run_')).length,
				artifacts: created.filter((id) => id.startsWith('artifact_')).length,
				reviews: created.filter((id) => id.startsWith('review_')).length,
				decisions: created.filter((id) => id.startsWith('decision_')).length
			},
			skippedExistingCount: skippedExisting.length
		};
	} finally {
		sourceDb.close();
		v2Db.close();
	}
}

function main() {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		printHelp();
		return;
	}

	const preview = buildPreview(options);
	const writeResult = options.write ? writeImport(options, preview) : null;

	if (options.json) {
		process.stdout.write(
			`${JSON.stringify({ silverOakTaskEvidenceImport: preview, writeResult }, null, 2)}\n`
		);
		return;
	}

	process.stdout.write(
		[
			'# Silver Oak Completed Task Evidence Import',
			'',
			`Mode: ${preview.mode}`,
			`Writes database: ${preview.writesDatabase ? 'yes' : 'no'}`,
			`Import candidates: ${preview.counts.importCandidates}`,
			`Attachment artifacts: ${preview.counts.attachmentArtifacts}`,
			'',
			'## Warnings',
			'',
			...preview.warnings.map((warning) => `- ${warning}`),
			'',
			...(writeResult ? ['## Write Result', '', JSON.stringify(writeResult, null, 2)] : [])
		].join('\n') + '\n'
	);
}

try {
	main();
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exitCode = 1;
}
