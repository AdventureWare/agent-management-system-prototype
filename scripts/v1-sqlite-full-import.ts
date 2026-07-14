#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import {
	openExistingV2CoreDbForWrite,
	openV2CoreDbReadonly
} from '../src/lib/server/v2-core-persistence.ts';
import {
	attachV2CoreArtifact,
	createV2CoreGoal,
	createV2CoreProject,
	createV2CoreTask,
	recordV2CoreDecision,
	recordV2CoreReview,
	recordV2CoreRun,
	recordV2CoreTaskDependency,
	registerV2CoreModelProvider
} from '../src/lib/server/v2-core-service.ts';

type Options = {
	sourceDb: string;
	dbFile: string;
	write: boolean;
	json: boolean;
	help: boolean;
};

type V1Record = Record<string, unknown> & {
	id: string;
	name?: string;
	title?: string;
	summary?: string;
	status?: string;
	projectId?: string;
	projectIds?: string[];
	goalId?: string | null;
	parentGoalId?: string | null;
	taskId?: string | null;
	runId?: string | null;
	reviewId?: string | null;
	providerId?: string | null;
	artifactPath?: string;
	artifactPaths?: string[];
	attachments?: Array<Record<string, unknown>>;
	dependencyTaskIds?: string[];
	taskIds?: string[];
	successSignal?: string;
	successCriteria?: string;
	validationSteps?: string;
	createdAt?: string;
	updatedAt?: string;
	startedAt?: string;
	endedAt?: string;
	resolvedAt?: string;
};

type Summary = {
	mode: 'dry-run' | 'write';
	sourceDb: string;
	dbFile: string;
	sourceCounts: Record<string, number>;
	created: Record<string, number>;
	skippedExisting: Record<string, number>;
	deferred: Record<string, number>;
	warnings: string[];
	samples: Record<string, Array<{ id: string; title: string; reason?: string }>>;
};

const DEFAULT_SOURCE_DB = 'data/app.sqlite';
const DEFAULT_V2_DB = 'data/v2-core.sqlite';
const UNASSIGNED_PROJECT_ID = 'project_v1_unassigned_import';

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

function printHelp() {
	process.stdout.write(
		[
			'Usage: node --experimental-strip-types scripts/v1-sqlite-full-import.ts [options]',
			'',
			'Options:',
			'  --source-db <path>  V1 runtime SQLite DB. Defaults to data/app.sqlite.',
			'  --db <path>         V2 core SQLite DB. Defaults to data/v2-core.sqlite.',
			'  --write             Write imported records. Omit for dry-run.',
			'  --json              Print machine-readable JSON.',
			'  --help              Show this help.',
			'',
			'Imports v1 projects, goals, tasks, runs, reviews, decisions, dependencies, and task/run artifact paths into accepted v2 core records.',
			'The command never mutates v1 and is idempotent by v2 id plus ams-v1 source references.'
		].join('\n') + '\n'
	);
}

function readCollection(db: Database.Database, collection: string): V1Record[] {
	return db
		.prepare('select id, payload from control_plane_records where collection = ? order by position')
		.all(collection)
		.map((row) => JSON.parse((row as { payload: string }).payload) as V1Record);
}

function text(value: unknown, fallback = '') {
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function array(value: unknown): V1Record[] {
	return Array.isArray(value) ? (value as V1Record[]) : [];
}

function strings(value: unknown): string[] {
	return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

function title(record: V1Record) {
	return text(record.title) || text(record.name) || record.id;
}

function source(
	collection: string,
	id: string,
	field = 'record',
	note = 'Imported from AMS v1 runtime SQLite.'
) {
	return {
		sourceSystem: 'ams-v1',
		sourceCollection: collection,
		sourceId: id,
		field,
		note
	};
}

function mapGoalStatus(status: unknown) {
	switch (status) {
		case 'done':
			return 'completed';
		case 'blocked':
			return 'blocked';
		case 'paused':
			return 'paused';
		case 'canceled':
			return 'canceled';
		case 'superseded':
			return 'superseded';
		default:
			return 'active';
	}
}

function mapTaskStatus(status: unknown) {
	switch (status) {
		case 'done':
		case 'ready':
		case 'blocked':
		case 'review':
		case 'draft':
		case 'canceled':
			return status;
		case 'running':
		case 'in_progress':
			return 'in_progress';
		default:
			return 'ready';
	}
}

function mapRunStatus(status: unknown) {
	switch (status) {
		case 'completed':
		case 'failed':
		case 'planned':
		case 'running':
		case 'canceled':
			return status;
		default:
			return 'completed';
	}
}

function mapReviewStatus(status: unknown) {
	switch (status) {
		case 'open':
		case 'approved':
		case 'changes_requested':
		case 'rejected':
		case 'canceled':
			return status;
		case 'dismissed':
			return 'canceled';
		default:
			return 'approved';
	}
}

function rowExists(db: Database.Database, table: string, id: string) {
	return Boolean(db.prepare(`select id from ${table} where id = ?`).get(id));
}

function sourceExists(
	db: Database.Database,
	table: string,
	collection: string,
	sourceId: string,
	field = 'record'
) {
	return Boolean(
		db
			.prepare(
				`
					select record_id
					from v2_core_source_references
					where record_table = ?
						and source_system = 'ams-v1'
						and source_collection = ?
						and source_id = ?
						and field = ?
					limit 1
				`
			)
			.get(table, collection, sourceId, field)
	);
}

function alreadyExists(
	db: Database.Database,
	table: string,
	id: string,
	collection: string,
	sourceId = id,
	field = 'record'
) {
	return rowExists(db, table, id) || sourceExists(db, table, collection, sourceId, field);
}

function inc(record: Record<string, number>, key: string) {
	record[key] = (record[key] ?? 0) + 1;
}

function sample(
	summary: Summary,
	key: string,
	entry: { id: string; title: string; reason?: string }
) {
	if (!summary.samples[key]) {
		summary.samples[key] = [];
	}
	if (summary.samples[key].length < 8) {
		summary.samples[key].push(entry);
	}
}

function maybeCreate(
	db: Database.Database,
	options: Options,
	summary: Summary,
	key: string,
	table: string,
	id: string,
	collection: string,
	create: () => void,
	entry: { id: string; title: string; reason?: string },
	sourceId = id,
	field = 'record'
) {
	if (alreadyExists(db, table, id, collection, sourceId, field)) {
		inc(summary.skippedExisting, key);
		sample(summary, `skipped_${key}`, entry);
		return false;
	}
	if (options.write) {
		create();
	}
	inc(summary.created, key);
	sample(summary, `created_${key}`, entry);
	return true;
}

function projectIdForGoal(goal: V1Record) {
	return strings(goal.projectIds)[0] || text(goal.projectId) || UNASSIGNED_PROJECT_ID;
}

function unscopedGoalId(projectId: string) {
	return `goal_imported_unscoped_v1_${projectId.replace(/[^a-zA-Z0-9_]+/g, '_')}`;
}

function artifactUri(attachment: Record<string, unknown>, task: V1Record) {
	return text(attachment.path) || text(attachment.uri) || text(task.artifactPath);
}

function artifactTitle(uri: string, fallback: string) {
	return uri.split('/').filter(Boolean).at(-1) || fallback;
}

function render(summary: Summary) {
	const lines = [
		'# V1 SQLite Full Import',
		'',
		`Mode: ${summary.mode}`,
		`Source: \`${summary.sourceDb}\``,
		`V2 DB: \`${summary.dbFile}\``,
		'',
		'## Source Counts',
		...Object.entries(summary.sourceCounts).map(([key, value]) => `- ${key}: ${value}`),
		'',
		'## Created Or Would Create',
		...(Object.entries(summary.created).length
			? Object.entries(summary.created).map(([key, value]) => `- ${key}: ${value}`)
			: ['- none']),
		'',
		'## Skipped Existing',
		...(Object.entries(summary.skippedExisting).length
			? Object.entries(summary.skippedExisting).map(([key, value]) => `- ${key}: ${value}`)
			: ['- none']),
		'',
		'## Deferred',
		...(Object.entries(summary.deferred).length
			? Object.entries(summary.deferred).map(([key, value]) => `- ${key}: ${value}`)
			: ['- none']),
		'',
		'## Warnings',
		...summary.warnings.map((warning) => `- ${warning}`),
		'',
		'## Samples'
	];
	for (const [key, entries] of Object.entries(summary.samples)) {
		lines.push('', `### ${key}`);
		for (const entry of entries) {
			lines.push(`- \`${entry.id}\`: ${entry.title}${entry.reason ? ` (${entry.reason})` : ''}`);
		}
	}
	return `${lines.join('\n')}\n`;
}

function main() {
	let v1Db: Database.Database | null = null;
	let v2Db: Database.Database | null = null;
	try {
		const options = parseArgs(process.argv.slice(2));
		if (options.help) {
			printHelp();
			return;
		}

		const sourceDb = resolve(options.sourceDb);
		const dbFile = resolve(options.dbFile);
		v1Db = new Database(sourceDb, { readonly: true, fileMustExist: true });
		v2Db = options.write
			? openExistingV2CoreDbForWrite({ dbFile })
			: openV2CoreDbReadonly({ dbFile });

		const projects = readCollection(v1Db, 'projects');
		const goals = readCollection(v1Db, 'goals');
		const tasks = readCollection(v1Db, 'tasks');
		const runs = readCollection(v1Db, 'runs');
		const reviews = readCollection(v1Db, 'reviews');
		const decisions = readCollection(v1Db, 'decisions');
		const providers = readCollection(v1Db, 'providers');

		const summary: Summary = {
			mode: options.write ? 'write' : 'dry-run',
			sourceDb,
			dbFile,
			sourceCounts: {
				projects: projects.length,
				goals: goals.length,
				tasks: tasks.length,
				runs: runs.length,
				reviews: reviews.length,
				decisions: decisions.length,
				providers: providers.length
			},
			created: {},
			skippedExisting: {},
			deferred: {},
			warnings: [
				'V1 remains untouched.',
				'V1 tasks without a selected goal are imported under a generated per-project unscoped-work goal.',
				'V1 goals linked to multiple projects are imported once under their first v1 project; additional project membership remains source provenance/cleanup work.',
				'Roles, workflows, workflow steps, task templates, approvals, execution surfaces, and thread/session records are not new v2 entities in this import.'
			],
			samples: {}
		};

		const projectIds = new Set(projects.map((project) => project.id));
		const goalById = new Map(goals.map((goal) => [goal.id, goal]));
		const taskById = new Map(tasks.map((task) => [task.id, task]));
		const runById = new Map(runs.map((run) => [run.id, run]));
		const reviewById = new Map(reviews.map((review) => [review.id, review]));

		v2Db.transaction(() => {
			maybeCreate(
				v2Db!,
				options,
				summary,
				'projects',
				'v2_core_projects',
				UNASSIGNED_PROJECT_ID,
				'projects',
				() =>
					createV2CoreProject(v2Db!, {
						id: UNASSIGNED_PROJECT_ID,
						name: 'Imported v1 unassigned work',
						summary:
							'Generated container for v1 records that did not carry a usable project reference.',
						status: 'active',
						workspaceRoot: process.cwd(),
						source: source(
							'projects',
							UNASSIGNED_PROJECT_ID,
							'generated',
							'Generated during full v1 import for unassigned records.'
						)
					}),
				{ id: UNASSIGNED_PROJECT_ID, title: 'Imported v1 unassigned work' },
				UNASSIGNED_PROJECT_ID,
				'generated'
			);

			for (const provider of providers) {
				maybeCreate(
					v2Db!,
					options,
					summary,
					'providers',
					'v2_core_model_providers',
					provider.id,
					'providers',
					() =>
						registerV2CoreModelProvider(v2Db!, {
							id: provider.id,
							name: text(provider.name, provider.id),
							kind: 'external_ai',
							status: 'available',
							source: source('providers', provider.id)
						}),
					{ id: provider.id, title: text(provider.name, provider.id) }
				);
			}

			for (const project of projects) {
				maybeCreate(
					v2Db!,
					options,
					summary,
					'projects',
					'v2_core_projects',
					project.id,
					'projects',
					() =>
						createV2CoreProject(v2Db!, {
							id: project.id,
							name: text(project.name, project.id),
							summary: text(project.summary),
							status: 'active',
							workspaceRoot:
								text(project.projectRootFolder) || text(project.defaultRepoPath) || process.cwd(),
							source: source('projects', project.id)
						}),
					{ id: project.id, title: text(project.name, project.id) }
				);
			}

			const visitedGoalIds = new Set<string>();
			const visitingGoalIds = new Set<string>();
			const importGoal = (goal: V1Record) => {
				if (visitedGoalIds.has(goal.id)) {
					return;
				}
				if (visitingGoalIds.has(goal.id)) {
					inc(summary.deferred, 'cyclicGoalParents');
					sample(summary, 'deferred_cyclicGoalParents', {
						id: goal.id,
						title: text(goal.name, goal.id),
						reason: 'Goal parent chain is cyclic.'
					});
					return;
				}
				visitingGoalIds.add(goal.id);
				const parent = goalById.get(text(goal.parentGoalId));
				if (parent) {
					importGoal(parent);
				}
				const projectId = projectIds.has(projectIdForGoal(goal))
					? projectIdForGoal(goal)
					: UNASSIGNED_PROJECT_ID;
				const parentGoalId = goalById.has(text(goal.parentGoalId)) ? text(goal.parentGoalId) : null;
				maybeCreate(
					v2Db!,
					options,
					summary,
					'goals',
					'v2_core_goals',
					goal.id,
					'goals',
					() =>
						createV2CoreGoal(v2Db!, {
							id: goal.id,
							projectId,
							parentGoalId,
							title: text(goal.name, goal.id),
							summary: text(goal.summary),
							successCriteria: text(
								goal.successSignal,
								'Imported v1 goal has no explicit success signal.'
							),
							status: mapGoalStatus(goal.status),
							source: source('goals', goal.id)
						}),
					{ id: goal.id, title: text(goal.name, goal.id) }
				);
				visitingGoalIds.delete(goal.id);
				visitedGoalIds.add(goal.id);
			};

			for (const goal of goals) {
				importGoal(goal);
			}

			const taskProjectIdsNeedingUnscopedGoals = new Set<string>();
			for (const task of tasks) {
				const goal = goalById.get(text(task.goalId));
				if (goal) {
					continue;
				}
				const projectId =
					text(task.projectId) ||
					strings(task.projectIds)[0] ||
					strings(goal?.projectIds)[0] ||
					UNASSIGNED_PROJECT_ID;
				taskProjectIdsNeedingUnscopedGoals.add(
					projectIds.has(projectId) ? projectId : UNASSIGNED_PROJECT_ID
				);
			}

			for (const projectId of taskProjectIdsNeedingUnscopedGoals) {
				const goalId = unscopedGoalId(projectId);
				maybeCreate(
					v2Db!,
					options,
					summary,
					'unscopedGoals',
					'v2_core_goals',
					goalId,
					'goals',
					() =>
						createV2CoreGoal(v2Db!, {
							id: goalId,
							projectId,
							title: 'Imported unscoped v1 work',
							summary:
								'Generated during full v1 import for tasks that did not have a usable v1 goal link. Clean these up by assigning, archiving, merging, or deleting after review.',
							successCriteria:
								'Every imported task under this holding goal is later assigned to a real goal, archived as historical evidence, or marked stale.',
							status: 'active',
							source: source(
								'goals',
								goalId,
								'generated',
								`Generated unscoped-work holding goal for project ${projectId}.`
							)
						}),
					{ id: goalId, title: `Imported unscoped v1 work for ${projectId}` },
					goalId,
					'generated'
				);
			}

			for (const task of tasks) {
				const sourceGoal = goalById.get(text(task.goalId));
				const goalProject = sourceGoal
					? (v2Db!
							.prepare('select project_id from v2_core_goals where id = ?')
							.get(sourceGoal.id) as { project_id: string } | undefined)
					: undefined;
				const projectId =
					goalProject?.project_id ||
					(sourceGoal
						? projectIdForGoal(sourceGoal)
						: text(task.projectId) || strings(task.projectIds)[0] || UNASSIGNED_PROJECT_ID);
				const normalizedProjectId = projectIds.has(projectId) ? projectId : UNASSIGNED_PROJECT_ID;
				const goalId = sourceGoal ? sourceGoal.id : unscopedGoalId(normalizedProjectId);

				maybeCreate(
					v2Db!,
					options,
					summary,
					'tasks',
					'v2_core_tasks',
					task.id,
					'tasks',
					() =>
						createV2CoreTask(v2Db!, {
							id: task.id,
							projectId: normalizedProjectId,
							goalId,
							title: title(task),
							summary: text(task.summary),
							successCriteria: text(
								task.successCriteria,
								'Imported v1 task has no explicit success criteria.'
							),
							validationPlan: text(task.validationSteps, 'No explicit v1 validation plan.'),
							status: mapTaskStatus(task.status),
							source: source('tasks', task.id)
						}),
					{
						id: task.id,
						title: title(task),
						reason: sourceGoal ? undefined : `Placed under ${goalId}.`
					}
				);
			}

			for (const task of tasks) {
				for (const dependencyTaskId of strings(task.dependencyTaskIds)) {
					if (!taskById.has(dependencyTaskId)) {
						inc(summary.deferred, 'dependenciesMissingV1Task');
						sample(summary, 'deferred_dependenciesMissingV1Task', {
							id: `${task.id}__depends_on__${dependencyTaskId}`,
							title: `${title(task)} depends on ${dependencyTaskId}`,
							reason: 'Dependency task was not present in v1 task records.'
						});
						continue;
					}
					const taskProject = v2Db!
						.prepare('select project_id from v2_core_tasks where id = ?')
						.get(task.id) as { project_id: string } | undefined;
					const dependencyProject = v2Db!
						.prepare('select project_id from v2_core_tasks where id = ?')
						.get(dependencyTaskId) as { project_id: string } | undefined;
					if (
						!taskProject ||
						!dependencyProject ||
						taskProject.project_id !== dependencyProject.project_id
					) {
						inc(summary.deferred, 'dependenciesAcrossProjectsOrMissingRows');
						sample(summary, 'deferred_dependenciesAcrossProjectsOrMissingRows', {
							id: `${task.id}__depends_on__${dependencyTaskId}`,
							title: `${title(task)} depends on ${dependencyTaskId}`,
							reason: 'V2 task dependencies require both tasks in the same project.'
						});
						continue;
					}
					const dependencyId = `${task.id}__depends_on__${dependencyTaskId}`;
					maybeCreate(
						v2Db!,
						options,
						summary,
						'taskDependencies',
						'v2_core_task_dependencies',
						dependencyId,
						'tasks.dependencyTaskIds',
						() =>
							recordV2CoreTaskDependency(v2Db!, {
								id: dependencyId,
								taskId: task.id,
								dependsOnTaskId: dependencyTaskId,
								status: 'resolved',
								reason: 'Imported v1 task dependency.',
								source: source('tasks.dependencyTaskIds', task.id, 'dependencyTaskIds')
							}),
						{ id: dependencyId, title: `${title(task)} depends on ${dependencyTaskId}` },
						task.id,
						'dependencyTaskIds'
					);
				}
			}

			for (const run of runs) {
				if (!taskById.has(text(run.taskId))) {
					inc(summary.deferred, 'runsMissingTask');
					sample(summary, 'deferred_runsMissingTask', {
						id: run.id,
						title: text(run.summary, run.id),
						reason: `Task ${text(run.taskId)} was not present in v1 task records.`
					});
					continue;
				}
				const providerId = text(run.providerId);
				const providerExists =
					providerId && rowExists(v2Db!, 'v2_core_model_providers', providerId);
				maybeCreate(
					v2Db!,
					options,
					summary,
					'runs',
					'v2_core_runs',
					run.id,
					'runs',
					() =>
						recordV2CoreRun(v2Db!, {
							id: run.id,
							taskId: text(run.taskId),
							modelProviderId: providerExists ? providerId : null,
							status: mapRunStatus(run.status),
							inputSummary: text(run.contextSummary) || text(run.inputPrompt),
							actionSummary: text(run.actionsTaken),
							resultSummary: text(run.resultSummary) || text(run.summary),
							validationSummary: text(run.validationSummary),
							startedAt: text(run.startedAt) || null,
							endedAt: text(run.endedAt) || null,
							source: source('runs', run.id)
						}),
					{ id: run.id, title: text(run.summary, run.id) }
				);
			}

			for (const task of tasks) {
				if (!rowExists(v2Db!, 'v2_core_tasks', task.id)) {
					continue;
				}
				const artifactPath = text(task.artifactPath);
				if (artifactPath) {
					const artifactId = `artifact_v1_task_path_${task.id}`;
					maybeCreate(
						v2Db!,
						options,
						summary,
						'artifacts',
						'v2_core_artifacts',
						artifactId,
						'tasks',
						() =>
							attachV2CoreArtifact(v2Db!, {
								id: artifactId,
								taskId: task.id,
								uri: artifactPath,
								role: 'evidence',
								title: artifactTitle(artifactPath, `${title(task)} artifact path`),
								summary: `Imported v1 task artifactPath. Exists locally: ${existsSync(artifactPath) ? 'yes' : 'no'}.`,
								status: mapTaskStatus(task.status) === 'done' ? 'accepted' : 'submitted',
								source: source('tasks', task.id, 'artifactPath')
							}),
						{ id: artifactId, title: artifactPath },
						task.id,
						'artifactPath'
					);
				}

				for (const [index, attachment] of array(task.attachments).entries()) {
					const uri = artifactUri(attachment, task);
					if (!uri) {
						continue;
					}
					const sourceId = text(attachment.id) || `${task.id}_attachment_${index + 1}`;
					const artifactId = `artifact_v1_task_attachment_${sourceId.replace(/[^a-zA-Z0-9_]+/g, '_')}`;
					maybeCreate(
						v2Db!,
						options,
						summary,
						'artifacts',
						'v2_core_artifacts',
						artifactId,
						'tasks.attachments',
						() =>
							attachV2CoreArtifact(v2Db!, {
								id: artifactId,
								taskId: task.id,
								uri,
								role: 'evidence',
								title:
									text(attachment.title) ||
									text(attachment.name) ||
									artifactTitle(uri, `${title(task)} attachment`),
								summary: `Imported v1 task attachment. Exists locally: ${existsSync(uri) ? 'yes' : 'no'}.`,
								status: mapTaskStatus(task.status) === 'done' ? 'accepted' : 'submitted',
								source: source(
									'tasks.attachments',
									sourceId,
									'record',
									`Imported attachment from v1 task ${task.id}.`
								)
							}),
						{ id: artifactId, title: uri },
						sourceId
					);
				}
			}

			for (const run of runs) {
				if (!rowExists(v2Db!, 'v2_core_runs', run.id)) {
					continue;
				}
				for (const [index, artifactPath] of strings(run.artifactPaths).entries()) {
					const artifactId = `artifact_v1_run_path_${run.id}_${index + 1}`;
					maybeCreate(
						v2Db!,
						options,
						summary,
						'artifacts',
						'v2_core_artifacts',
						artifactId,
						'runs',
						() =>
							attachV2CoreArtifact(v2Db!, {
								id: artifactId,
								taskId: text(run.taskId),
								runId: run.id,
								uri: artifactPath,
								role: 'evidence',
								title: artifactTitle(artifactPath, `${run.id} artifact ${index + 1}`),
								summary: `Imported v1 run artifact path. Exists locally: ${existsSync(artifactPath) ? 'yes' : 'no'}.`,
								status: mapRunStatus(run.status) === 'completed' ? 'accepted' : 'submitted',
								source: source('runs', run.id, 'artifactPaths')
							}),
						{ id: artifactId, title: artifactPath },
						run.id,
						'artifactPaths'
					);
				}
			}

			for (const review of reviews) {
				const run = runById.get(text(review.runId));
				const taskId = text(review.taskId) || text(run?.taskId);
				if (!taskId || !rowExists(v2Db!, 'v2_core_tasks', taskId)) {
					inc(summary.deferred, 'reviewsMissingTask');
					sample(summary, 'deferred_reviewsMissingTask', {
						id: review.id,
						title: text(review.summary, review.id),
						reason: 'Review had no materialized task.'
					});
					continue;
				}
				const runId = rowExists(v2Db!, 'v2_core_runs', text(review.runId))
					? text(review.runId)
					: null;
				maybeCreate(
					v2Db!,
					options,
					summary,
					'reviews',
					'v2_core_reviews',
					review.id,
					'reviews',
					() =>
						recordV2CoreReview(v2Db!, {
							id: review.id,
							taskId,
							runId,
							status: mapReviewStatus(review.status),
							summary: text(review.summary, review.id),
							createdAt: text(review.createdAt) || new Date().toISOString(),
							resolvedAt:
								mapReviewStatus(review.status) === 'open'
									? null
									: text(review.resolvedAt) || text(review.updatedAt) || new Date().toISOString(),
							source: source('reviews', review.id)
						}),
					{ id: review.id, title: text(review.summary, review.id) }
				);
			}

			for (const decision of decisions) {
				const taskId = rowExists(v2Db!, 'v2_core_tasks', text(decision.taskId))
					? text(decision.taskId)
					: null;
				const goalId = rowExists(v2Db!, 'v2_core_goals', text(decision.goalId))
					? text(decision.goalId)
					: null;
				const runId =
					taskId && rowExists(v2Db!, 'v2_core_runs', text(decision.runId))
						? text(decision.runId)
						: null;
				const reviewId =
					taskId && rowExists(v2Db!, 'v2_core_reviews', text(decision.reviewId))
						? text(decision.reviewId)
						: null;
				const run = runById.get(text(decision.runId));
				const review = reviewById.get(text(decision.reviewId));
				const inferredTask = taskId || text(run?.taskId) || text(review?.taskId);
				const inferredGoal = goalId || text(taskById.get(inferredTask)?.goalId);
				const inferredProject =
					text(decision.projectId) ||
					(inferredGoal && projectIdForGoal(goalById.get(inferredGoal) ?? ({} as V1Record))) ||
					text(taskById.get(inferredTask)?.projectId) ||
					UNASSIGNED_PROJECT_ID;
				const projectId = projectIds.has(inferredProject) ? inferredProject : UNASSIGNED_PROJECT_ID;

				maybeCreate(
					v2Db!,
					options,
					summary,
					'decisions',
					'v2_core_decisions',
					decision.id,
					'decisions',
					() =>
						recordV2CoreDecision(v2Db!, {
							id: decision.id,
							projectId,
							goalId,
							taskId,
							runId,
							reviewId,
							decisionType: text(decision.decisionType, 'imported_v1_decision'),
							summary: text(decision.summary, decision.id),
							rationale: 'Imported from AMS v1 runtime SQLite decision record.',
							decidedAt: text(decision.createdAt) || new Date().toISOString(),
							source: source('decisions', decision.id)
						}),
					{ id: decision.id, title: text(decision.summary, decision.id) }
				);
			}
		})();

		for (const collection of [
			'approvals',
			'roles',
			'workflows',
			'workflowSteps',
			'taskTemplates',
			'executionSurfaces'
		]) {
			const count = Number(
				(
					v1Db
						.prepare('select count(*) as count from control_plane_records where collection = ?')
						.get(collection) as {
						count: number;
					}
				).count
			);
			if (count > 0) {
				summary.deferred[collection] = count;
			}
		}

		process.stdout.write(options.json ? `${JSON.stringify(summary, null, 2)}\n` : render(summary));
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
	} finally {
		v1Db?.close();
		v2Db?.close();
	}
}

main();
