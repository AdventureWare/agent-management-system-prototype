#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { openExistingV2CoreDbForWrite } from '../src/lib/server/v2-core-persistence.ts';
import {
	createV2CoreGoal,
	createV2CoreProject,
	createV2CoreTask
} from '../src/lib/server/v2-core-service.ts';

const DEFAULT_SOURCE_DB = 'data/app.sqlite';
const DEFAULT_V2_DB = 'data/v2-core.sqlite';
const DEFAULT_PROJECT_ID = 'project_aec29994-53d4-4367-a1c1-1ea5a9c81a2c';
const SOURCE_TRUTH_GOAL_ID = 'goal_f7801088-d145-4079-b522-cb452d8e3ef3';
const TOP_LEVEL_GOAL_ID = 'goal_ac42c3de-eafa-4a63-86c0-1d40665f147f';
const FIRST_TASK_ID = 'task_v2_silver_oak_verify_source_state';

type Options = {
	sourceDb: string;
	dbFile: string;
	projectId: string;
	write: boolean;
	json: boolean;
	limit: number;
	help: boolean;
};

type V1Record = Record<string, unknown> & {
	id: string;
	name?: string;
	title?: string;
	summary?: string;
	status?: string;
	parentGoalId?: string | null;
	projectId?: string;
	projectIds?: string[];
	goalId?: string;
	taskIds?: string[];
	artifactPath?: string;
	successSignal?: string;
	successCriteria?: string;
	validationPlan?: string;
	parentTaskId?: string | null;
	attachments?: unknown[];
};

type CollectionName = 'projects' | 'goals' | 'tasks';

function printHelp() {
	process.stdout.write(
		[
			'Usage: node --experimental-strip-types scripts/v1-silver-oak-import-preview.ts [options]',
			'',
			'Options:',
			'  --source-db <path>  V1 runtime SQLite DB. Defaults to data/app.sqlite.',
			'  --db <path>         V2 core SQLite DB. Defaults to data/v2-core.sqlite.',
			'  --project <id>      V1 project id. Defaults to the Silver Oak project.',
			'  --write             Import the previewed project/goals/first task into v2.',
			'  --limit <number>    Number of task samples per section. Default: 8.',
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
		projectId: DEFAULT_PROJECT_ID,
		write: false,
		json: false,
		limit: 8,
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
		} else if (token === '--project') {
			options.projectId = next;
		} else if (token === '--limit') {
			const limit = Number.parseInt(next, 10);
			if (!Number.isInteger(limit) || limit < 0) {
				throw new Error('--limit must be a non-negative integer.');
			}
			options.limit = limit;
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
		.map((row) => {
			const typedRow = row as { id: string; payload: string };
			return JSON.parse(typedRow.payload) as V1Record;
		});
}

function text(value: unknown, fallback = '') {
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function array(value: unknown) {
	return Array.isArray(value) ? value : [];
}

function title(record: V1Record) {
	return text(record.name) || text(record.title) || record.id;
}

function artifactExists(path: string | undefined) {
	if (!path) {
		return null;
	}

	try {
		return existsSync(path);
	} catch {
		return null;
	}
}

function statusCounts(records: V1Record[]) {
	return records.reduce<Record<string, number>>((counts, record) => {
		const status = text(record.status, 'unknown');
		counts[status] = (counts[status] ?? 0) + 1;
		return counts;
	}, {});
}

function proposedGoalStatus(goal: V1Record) {
	if (goal.id === TOP_LEVEL_GOAL_ID || goal.id === SOURCE_TRUTH_GOAL_ID) {
		return 'active_after_operator_approval';
	}
	if (goal.status === 'done') {
		return 'completed_evidence';
	}
	return 'paused_or_deferred';
}

function proposedGoalRationale(goal: V1Record) {
	if (goal.id === TOP_LEVEL_GOAL_ID) {
		return 'Top-level Silver Oak desired future state; import candidate but should not start runs until approved.';
	}
	if (goal.id === SOURCE_TRUTH_GOAL_ID) {
		return 'Smallest useful first subgoal because source-of-truth organization reduces repeated agent confusion.';
	}
	if (goal.status === 'done') {
		return 'Completed v1 work should be preserved as evidence, not reopened by default.';
	}
	return 'Useful decomposition, but activating every subgoal at import time would recreate backlog bloat.';
}

function taskSamples(tasks: V1Record[], limit: number) {
	return tasks.slice(0, limit).map((task) => ({
		id: task.id,
		title: title(task),
		status: text(task.status, 'unknown'),
		goalId: text(task.goalId, ''),
		parentTaskId: task.parentTaskId ?? null,
		attachmentCount: array(task.attachments).length,
		hasArtifactPath: Boolean(text(task.artifactPath))
	}));
}

type SilverOakPreview = ReturnType<typeof buildPreview>;

type PreviewGoal = SilverOakPreview['proposedV2Mapping']['goals'][number];

function rowExists(db: Database.Database, table: string, id: string) {
	return Boolean(db.prepare(`select id from ${table} where id = ?`).get(id));
}

function truncateText(value: string, maxLength: number) {
	if (value.length <= maxLength) {
		return value;
	}

	return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildPreview(options: Options) {
	const sourceDb = resolve(options.sourceDb);
	const db = new Database(sourceDb, { readonly: true, fileMustExist: true });

	try {
		const projects = readCollection(db, 'projects');
		const goals = readCollection(db, 'goals');
		const tasks = readCollection(db, 'tasks');
		const project = projects.find((candidate) => candidate.id === options.projectId);

		if (!project) {
			throw new Error(`Project ${options.projectId} was not found in ${sourceDb}.`);
		}

		const projectGoals = goals.filter((goal) =>
			(goal.projectIds ?? []).includes(options.projectId)
		);
		const projectGoalIds = new Set(projectGoals.map((goal) => goal.id));
		const projectTasks = tasks.filter(
			(task) =>
				projectGoalIds.has(text(task.goalId)) ||
				task.projectId === options.projectId ||
				(task.projectIds ?? []).includes(options.projectId)
		);
		const goalTaskCounts = new Map<string, number>();
		for (const task of projectTasks) {
			const goalId = text(task.goalId);
			if (goalId) {
				goalTaskCounts.set(goalId, (goalTaskCounts.get(goalId) ?? 0) + 1);
			}
		}

		const unscopedProjectTasks = projectTasks.filter((task) => !text(task.goalId));
		const canceledContinuationTasks = projectTasks.filter(
			(task) =>
				text(task.status) === 'canceled' &&
				title(task).toLowerCase().startsWith('continue goal:')
		);

		return {
			mode: 'dry-run',
			writesDatabase: false,
			source: {
				system: 'ams-v1-runtime-sqlite',
				dbFile: sourceDb,
				table: 'control_plane_records'
			},
			selection: {
				projectId: project.id,
				projectName: title(project),
				projectGoalCount: projectGoals.length,
				projectTaskCount: projectTasks.length
			},
			counts: {
				goalsByStatus: statusCounts(projectGoals),
				tasksByStatus: statusCounts(projectTasks),
				unscopedProjectTasks: unscopedProjectTasks.length,
				canceledContinuationTasks: canceledContinuationTasks.length
			},
			proposedV2Mapping: {
				project: {
					id: project.id,
					name: title(project),
					status: 'paused_until_operator_approval',
					workspaceRoot:
						text(project.projectRootFolder) ||
						text(project.defaultRepoPath) ||
						text(project.defaultArtifactRoot),
					source: {
						collection: 'projects',
						id: project.id
					}
				},
				goals: projectGoals.map((goal) => ({
					id: goal.id,
					title: title(goal),
					v1Status: text(goal.status, 'unknown'),
					proposedStatus: proposedGoalStatus(goal),
					parentGoalId: goal.parentGoalId ?? null,
					taskCount: goalTaskCounts.get(goal.id) ?? 0,
					artifactPath: text(goal.artifactPath) || null,
					artifactPathExists: artifactExists(text(goal.artifactPath) || undefined),
					successCriteria: text(goal.successSignal) || text(goal.successCriteria),
					source: {
						collection: 'goals',
						id: goal.id
					},
					rationale: proposedGoalRationale(goal)
				})),
				deferredTasks: {
					reason: 'This preview intentionally maps project/goals first. Task body import should be a separate approved batch after goal import shape is accepted.',
					count: projectTasks.length,
					byStatus: statusCounts(projectTasks),
					samples: taskSamples(projectTasks, options.limit)
				}
			},
			validationWarnings: [
				...(projectGoals.length === 12
					? []
					: [`Expected 12 Silver Oak goals, found ${projectGoals.length}.`]),
				...(unscopedProjectTasks.length
					? [
							`${unscopedProjectTasks.length} project tasks have no goalId and need manual mapping before task import.`
						]
					: []),
				...(canceledContinuationTasks.length
					? [
							`${canceledContinuationTasks.length} canceled continuation tasks look like control-loop residue and should not be imported as active work.`
						]
					: []),
				'V1 ready/running statuses are not treated as automatic v2 active work.',
				'Project and goal artifact paths are provenance inputs; importing them as v2 artifacts should wait for task/run scope.'
			],
			selectedFirstExecutableWork: {
				goalId: SOURCE_TRUTH_GOAL_ID,
				goalTitle: title(projectGoals.find((goal) => goal.id === SOURCE_TRUTH_GOAL_ID) ?? projectGoals[0]),
				taskSource: 'new_v2_task_after_import_approval',
				title: 'Verify Silver Oak source artifacts and current desired state',
				successCriteria:
					'Confirm the project root, project_goal_audit.md, source-of-truth rules, current authoritative artifacts, and the next runnable Silver Oak task without activating unrelated subgoals.',
				validationPlan:
					'Read the imported project/goal state, inspect the referenced artifact paths, and produce an agent-preparation packet for the selected first task.'
			},
			nextStep:
				'Review this preview. If accepted, implement a write path that imports only the Silver Oak project and 12 goals with provenance, then creates one source-of-truth verification task.'
		};
	} finally {
		db.close();
	}
}

function printMarkdown(preview: ReturnType<typeof buildPreview>) {
	const lines = [
		'# Silver Oak V1 to V2 Import Preview',
		'',
		`Mode: ${preview.mode}`,
		`Writes database: ${preview.writesDatabase ? 'yes' : 'no'}`,
		`Source DB: \`${preview.source.dbFile}\``,
		'',
		'## Selection',
		'',
		`- Project: ${preview.selection.projectName} (${preview.selection.projectId})`,
		`- Goals: ${preview.selection.projectGoalCount}`,
		`- Tasks in source project scope: ${preview.selection.projectTaskCount}`,
		'',
		'## Proposed Goal Mapping',
		'',
		'| Goal | V1 status | Proposed status | Parent | Tasks |',
		'| --- | --- | --- | --- | ---: |',
		...preview.proposedV2Mapping.goals.map(
			(goal) =>
				`| \`${goal.id}\` - ${goal.title} | ${goal.v1Status} | ${goal.proposedStatus} | ${goal.parentGoalId ?? 'none'} | ${goal.taskCount} |`
		),
		'',
		'## Warnings',
		'',
		...preview.validationWarnings.map((warning) => `- ${warning}`),
		'',
		'## First Executable Work After Approval',
		'',
		`- Goal: \`${preview.selectedFirstExecutableWork.goalId}\` - ${preview.selectedFirstExecutableWork.goalTitle}`,
		`- Task: ${preview.selectedFirstExecutableWork.title}`,
		`- Success: ${preview.selectedFirstExecutableWork.successCriteria}`,
		`- Validation: ${preview.selectedFirstExecutableWork.validationPlan}`,
		'',
		'## Next Step',
		'',
		preview.nextStep
	];

	process.stdout.write(`${lines.join('\n')}\n`);
}

function sortedGoalsForWrite(goals: PreviewGoal[]) {
	const topGoal = goals.find((goal) => goal.id === TOP_LEVEL_GOAL_ID);
	if (!topGoal) {
		throw new Error(`Top-level Silver Oak goal ${TOP_LEVEL_GOAL_ID} was not found in preview.`);
	}

	return [topGoal, ...goals.filter((goal) => goal.id !== TOP_LEVEL_GOAL_ID)];
}

function writePreviewToV2(options: Options, preview: SilverOakPreview) {
	const db = openExistingV2CoreDbForWrite({ dbFile: resolve(options.dbFile) });
	const created: string[] = [];
	const skippedExisting: string[] = [];
	const sourceTruthGoal = preview.proposedV2Mapping.goals.find(
		(goal) => goal.id === SOURCE_TRUTH_GOAL_ID
	);

	if (!sourceTruthGoal) {
		throw new Error(`Source-of-truth Silver Oak goal ${SOURCE_TRUTH_GOAL_ID} was not found.`);
	}

	try {
		db.transaction(() => {
			if (rowExists(db, 'v2_core_projects', preview.proposedV2Mapping.project.id)) {
				skippedExisting.push(preview.proposedV2Mapping.project.id);
			} else {
				createV2CoreProject(db, {
					id: preview.proposedV2Mapping.project.id,
					name: preview.proposedV2Mapping.project.name,
					summary:
						'Imported Silver Oak property modeling project from AMS v1 after reconciliation preview. Initial v2 import keeps goal state narrow and defers historical task import.',
					status: 'active',
					workspaceRoot: preview.proposedV2Mapping.project.workspaceRoot,
					source: {
						sourceSystem: 'ams-v1',
						sourceCollection: 'projects',
						sourceId: preview.proposedV2Mapping.project.id,
						field: 'record',
						note: 'Imported by Silver Oak v1-to-v2 preview write path.'
					}
				});
				created.push(preview.proposedV2Mapping.project.id);
			}

			for (const goal of sortedGoalsForWrite(preview.proposedV2Mapping.goals)) {
				if (rowExists(db, 'v2_core_goals', goal.id)) {
					skippedExisting.push(goal.id);
					continue;
				}

				createV2CoreGoal(db, {
					id: goal.id,
					projectId: preview.proposedV2Mapping.project.id,
					parentGoalId: goal.parentGoalId,
					title: goal.title,
					summary: truncateText(
						[
							`V1 status: ${goal.v1Status}.`,
							goal.rationale,
							goal.artifactPath ? `V1 artifact path: ${goal.artifactPath}` : ''
						]
							.filter(Boolean)
							.join(' '),
						2000
					),
					successCriteria:
						goal.successCriteria ||
						goal.rationale ||
						'Preserve this Silver Oak subgoal as imported v1 decomposition until operator review selects it for active work.',
					status: goal.proposedStatus === 'active_after_operator_approval' ? 'active' : 'paused',
					source: {
						sourceSystem: 'ams-v1',
						sourceCollection: 'goals',
						sourceId: goal.id,
						field: 'record',
						note: 'Imported by Silver Oak v1-to-v2 preview write path.'
					}
				});
				created.push(goal.id);
			}

			if (rowExists(db, 'v2_core_tasks', FIRST_TASK_ID)) {
				skippedExisting.push(FIRST_TASK_ID);
			} else {
				createV2CoreTask(db, {
					id: FIRST_TASK_ID,
					goalId: SOURCE_TRUTH_GOAL_ID,
					title: preview.selectedFirstExecutableWork.title,
					summary:
						'First v2 Silver Oak task after project/goal import. Verify current project artifacts and source-of-truth state before activating broader imported subgoals or historical tasks.',
					successCriteria: preview.selectedFirstExecutableWork.successCriteria,
					validationPlan: preview.selectedFirstExecutableWork.validationPlan,
					status: 'ready',
					source: {
						sourceSystem: 'ams-v1-migration',
						sourceCollection: 'goals',
						sourceId: SOURCE_TRUTH_GOAL_ID,
						field: 'first_executable_work',
						note: 'Created from Silver Oak import preview as the first narrow v2 verification task.'
					}
				});
				created.push(FIRST_TASK_ID);
			}
		})();

		return {
			mode: 'write',
			dbFile: resolve(options.dbFile),
			created,
			skippedExisting,
			createdCounts: {
				total: created.length,
				projects: created.filter((id) => id.startsWith('project_')).length,
				goals: created.filter((id) => id.startsWith('goal_')).length,
				tasks: created.filter((id) => id.startsWith('task_')).length
			},
			skippedExistingCount: skippedExisting.length,
			firstTaskId: FIRST_TASK_ID
		};
	} finally {
		db.close();
	}
}

function main() {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		printHelp();
		return;
	}

	const preview = buildPreview(options);
	if (options.write) {
		const writeResult = writePreviewToV2(options, preview);
		if (options.json) {
			process.stdout.write(
				`${JSON.stringify({ silverOakImportPreview: preview, writeResult }, null, 2)}\n`
			);
			return;
		}

		printMarkdown(preview);
		process.stdout.write(`\n## Write Result\n\n${JSON.stringify(writeResult, null, 2)}\n`);
		return;
	}

	if (options.json) {
		process.stdout.write(`${JSON.stringify({ silverOakImportPreview: preview }, null, 2)}\n`);
		return;
	}

	printMarkdown(preview);
}

try {
	main();
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exitCode = 1;
}
