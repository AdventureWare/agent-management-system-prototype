import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync
} from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import type Database from 'better-sqlite3';
import {
	exportV2CoreSnapshot,
	importV2CoreSnapshot,
	readV2CoreGoalContinuityAudit,
	readV2CoreGoalTriage,
	readV2CoreNextWork,
	readV2CoreOperatorConsole,
	readV2CoreOverview,
	readV2CoreTaskDetail,
	readV2CoreUnreviewedOutputs
} from '../src/lib/server/v2-core-service.ts';
import {
	openV2CoreDb,
	openV2CoreDbReadonly,
	resolveV2CoreDbFile
} from '../src/lib/server/v2-core-persistence.ts';

const MANIFEST_FORMAT = 'ams-v2-extraction-baseline-manifest-v1';
const CLEAN_FOUNDATION_GOAL_ID = 'goal_ams_v2_clean_independent_foundation';
const DEFAULT_REPRESENTATIVE_TASK_IDS = [
	'task_ams_v2_finalize_clean_boundary_plan',
	'task_ams_v2_capture_independent_extraction_baseline',
	'task_ae273e23-869b-4c97-9897-b1cca6f18b40',
	'task_silver_oak_capture_bw08_bw09_field_measurements',
	'task_candidate_v0_38_rc_relation_bridge_extension_v0'
];

type Options = {
	dbFile?: string;
	outputDir?: string;
	goalId: string;
	taskIds: string[];
	help: boolean;
};

type FileState = {
	path: string;
	exists: boolean;
	size: number | null;
	mtimeMs: number | null;
	mtimeNs: string | null;
	sha256: string | null;
};

type SqliteProfile = {
	applicationId: number;
	userVersion: number;
	schemaCookie: number;
	sqliteVersion: string;
	journalMode: string;
	pageCount: number;
	pageSize: number;
	integrityCheck: Array<Record<string, unknown>>;
	foreignKeyViolations: Array<Record<string, unknown>>;
	schema: Array<{ type: string; name: string; tbl_name: string; sql: string | null }>;
	schemaSha256: string;
	tableCounts: Record<string, number>;
	statusDistributions: Record<string, Record<string, number>>;
};

function parseArgs(args: string[]): Options {
	const options: Options = {
		goalId: CLEAN_FOUNDATION_GOAL_ID,
		taskIds: [],
		help: false
	};

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (argument === '--help' || argument === '-h') {
			options.help = true;
			continue;
		}

		const value = args[index + 1];
		if (!value || value.startsWith('--')) {
			throw new Error(`Missing value for ${argument}.`);
		}

		switch (argument) {
			case '--db':
				options.dbFile = value;
				break;
			case '--output':
				options.outputDir = value;
				break;
			case '--goal':
				options.goalId = value;
				break;
			case '--task':
				options.taskIds.push(value);
				break;
			default:
				throw new Error(`Unknown option: ${argument}.`);
		}
		index += 1;
	}

	return options;
}

function printHelp() {
	process.stdout.write(
		[
			'Usage: npm run v2:capture-baseline -- --output <directory> [options]',
			'',
			'Creates a non-overwriting v2 extraction baseline from a read-only source database.',
			'',
			'Options:',
			'  --db <path>       Source v2 database; defaults to data/v2-core.sqlite.',
			'  --output <path>   Required new output directory.',
			`  --goal <id>       Goal used for scoped parity readbacks; defaults to ${CLEAN_FOUNDATION_GOAL_ID}.`,
			'  --task <id>       Representative task readback; repeat for more tasks.',
			'  --help             Show this help.'
		].join('\n') + '\n'
	);
}

function sha256(value: string | Buffer) {
	return createHash('sha256').update(value).digest('hex');
}

function stableValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(stableValue);
	}
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value)
				.filter(([, child]) => child !== undefined)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, child]) => [key, stableValue(child)])
		);
	}
	return value;
}

function stableJson(value: unknown) {
	return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function displayPath(repositoryRoot: string, filePath: string) {
	const localPath = relative(repositoryRoot, filePath);
	return localPath.startsWith('..') ? filePath : localPath || '.';
}

function fileState(repositoryRoot: string, filePath: string): FileState {
	if (!existsSync(filePath)) {
		return {
			path: displayPath(repositoryRoot, filePath),
			exists: false,
			size: null,
			mtimeMs: null,
			mtimeNs: null,
			sha256: null
		};
	}

	const stats = statSync(filePath);
	const preciseStats = statSync(filePath, { bigint: true });
	return {
		path: displayPath(repositoryRoot, filePath),
		exists: true,
		size: stats.size,
		mtimeMs: stats.mtimeMs,
		mtimeNs: preciseStats.mtimeNs.toString(),
		sha256: sha256(readFileSync(filePath))
	};
}

function readDurableSourceFileStates(repositoryRoot: string, dbFile: string) {
	return [dbFile, `${dbFile}-wal`].map((filePath) => fileState(repositoryRoot, filePath));
}

function sourceFilesMatch(before: FileState[], after: FileState[]) {
	const [databaseBefore, walBefore] = before;
	const [databaseAfter, walAfter] = after;
	const databaseMatches =
		databaseBefore.exists === databaseAfter.exists &&
		databaseBefore.size === databaseAfter.size &&
		databaseBefore.sha256 === databaseAfter.sha256;
	const normalizeWal = (state: FileState) =>
		!state.exists || state.size === 0
			? { size: 0, sha256: sha256(Buffer.alloc(0)) }
			: { size: state.size, sha256: state.sha256 };

	return (
		databaseMatches && stableJson(normalizeWal(walBefore)) === stableJson(normalizeWal(walAfter))
	);
}

function pragmaNumber(db: Database.Database, pragmaName: string) {
	const result = db.pragma(pragmaName, { simple: true });
	if (typeof result !== 'number') {
		throw new Error(`Expected numeric PRAGMA ${pragmaName}; received ${String(result)}.`);
	}
	return result;
}

function pragmaString(db: Database.Database, pragmaName: string) {
	const result = db.pragma(pragmaName, { simple: true });
	if (typeof result !== 'string') {
		throw new Error(`Expected string PRAGMA ${pragmaName}; received ${String(result)}.`);
	}
	return result;
}

function readTotalChanges(db: Database.Database) {
	return (
		db.prepare<[], { totalChanges: number }>('select total_changes() as totalChanges').get()
			?.totalChanges ?? 0
	);
}

function quoteSqlIdentifier(value: string) {
	return `"${value.replaceAll('"', '""')}"`;
}

function readSqliteProfile(db: Database.Database): SqliteProfile {
	const schema = db
		.prepare<[], { type: string; name: string; tbl_name: string; sql: string | null }>(
			`select type, name, tbl_name, sql
			 from sqlite_schema
			 where name not like 'sqlite_%'
			 order by type, name`
		)
		.all();
	const tableNames = schema.filter((row) => row.type === 'table').map((row) => row.name);
	const tableCounts = Object.fromEntries(
		tableNames.map((tableName) => {
			const row = db
				.prepare<
					[],
					{ count: number }
				>(`select count(*) as count from ${quoteSqlIdentifier(tableName)}`)
				.get();
			return [tableName, row?.count ?? 0];
		})
	);
	const statusTables = {
		goals: 'v2_core_goals',
		tasks: 'v2_core_tasks',
		runs: 'v2_core_runs',
		artifacts: 'v2_core_artifacts',
		reviews: 'v2_core_reviews',
		memoryItems: 'v2_core_memory_items'
	};
	const statusDistributions = Object.fromEntries(
		Object.entries(statusTables).map(([label, tableName]) => {
			if (!tableNames.includes(tableName)) {
				return [label, {}];
			}
			const counts = db
				.prepare<[], { status: string; count: number }>(
					`select status, count(*) as count
					 from ${quoteSqlIdentifier(tableName)}
					 group by status
					 order by status`
				)
				.all();
			return [label, Object.fromEntries(counts.map((row) => [row.status, row.count]))];
		})
	);
	const sqliteVersionRow = db
		.prepare<[], { version: string }>('select sqlite_version() as version')
		.get();

	return {
		applicationId: pragmaNumber(db, 'application_id'),
		userVersion: pragmaNumber(db, 'user_version'),
		schemaCookie: pragmaNumber(db, 'schema_version'),
		sqliteVersion: sqliteVersionRow?.version ?? 'unknown',
		journalMode: pragmaString(db, 'journal_mode'),
		pageCount: pragmaNumber(db, 'page_count'),
		pageSize: pragmaNumber(db, 'page_size'),
		integrityCheck: db.pragma('integrity_check') as Array<Record<string, unknown>>,
		foreignKeyViolations: db.pragma('foreign_key_check') as Array<Record<string, unknown>>,
		schema,
		schemaSha256: sha256(stableJson(schema)),
		tableCounts,
		statusDistributions
	};
}

function sortById<T extends { id: string }>(items: T[]) {
	return items.toSorted((left, right) => left.id.localeCompare(right.id));
}

function readParityReadbacks(db: Database.Database, goalId: string, taskIds: string[]) {
	const taskDetails = taskIds.map((taskId) => {
		const taskDetail = readV2CoreTaskDetail(db, taskId);
		if (!taskDetail) {
			throw new Error(`Representative task ${taskId} does not exist.`);
		}
		return taskDetail;
	});
	const tasks = Object.fromEntries(
		taskDetails.map((detail) => {
			return [
				detail.task.id,
				{
					task: {
						id: detail.task.id,
						projectId: detail.task.projectId,
						goalId: detail.task.goalId,
						status: detail.task.status
					},
					project: { id: detail.project.id },
					goal: { id: detail.goal.id, status: detail.goal.status },
					dependencies: sortById(
						detail.dependencies.map((dependency) => ({
							id: dependency.id,
							dependsOnTaskId: dependency.dependsOnTaskId,
							status: dependency.status
						}))
					),
					runs: sortById(
						detail.runs.map((run) => ({
							id: run.id,
							status: run.status,
							modelProviderId: run.modelProviderId
						}))
					),
					toolExecutions: sortById(
						detail.toolExecutions.map((execution) => ({
							id: execution.id,
							toolId: execution.toolId,
							runId: execution.runId,
							status: execution.status
						}))
					),
					artifacts: sortById(
						detail.artifacts.map((artifact) => ({
							id: artifact.id,
							runId: artifact.runId,
							role: artifact.role,
							status: artifact.status
						}))
					),
					reviews: sortById(
						detail.reviews.map((review) => ({
							id: review.id,
							runId: review.runId,
							artifactId: review.artifactId,
							status: review.status
						}))
					),
					decisions: sortById(
						detail.decisions.map((decision) => ({
							id: decision.id,
							decisionType: decision.decisionType
						}))
					),
					memoryItems: sortById(
						detail.memoryItems.map((memory) => ({
							id: memory.id,
							status: memory.status,
							scope: memory.scope
						}))
					),
					lineage: {
						sourceTaskId: detail.lineage.sourceTaskId,
						followupTaskIds: detail.lineage.followupTaskIds
					}
				}
			];
		})
	);
	const goalIds = [...new Set([goalId, ...taskDetails.map((detail) => detail.goal.id)])].sort();
	const nextWorkByGoal = Object.fromEntries(
		goalIds.map((candidateGoalId) => [
			candidateGoalId,
			readV2CoreNextWork(db, { goalId: candidateGoalId, limit: 20 }).candidates.map(
				(candidate) => ({
					taskId: candidate.taskId,
					status: candidate.status,
					goalId: candidate.goalId,
					projectId: candidate.projectId,
					action: candidate.action
				})
			)
		])
	);
	const overview = readV2CoreOverview(db);
	const triage = readV2CoreGoalTriage(db, { goalId, limit: 20 });
	const continuity = readV2CoreGoalContinuityAudit(db);
	const crossProjectAttention = readV2CoreOperatorConsole(db, { limit: 25 }).crossProjectAttention;

	return {
		overview: {
			projects: overview.projects
				.map((project) => ({
					id: project.id,
					status: project.status,
					goalCount: project.goalCount,
					taskCount: project.taskCount,
					runCount: project.runCount,
					artifactCount: project.artifactCount,
					memoryItemCount: project.memoryItemCount
				}))
				.toSorted((left, right) => left.id.localeCompare(right.id)),
			taskStatusCounts: overview.taskStatusCounts,
			reviewStatusCounts: overview.reviewStatusCounts,
			memoryStatusCounts: overview.memoryStatusCounts
		},
		nextWorkByGoal,
		goalTriage: {
			scope: triage.scope,
			summary: triage.summary,
			goals: triage.goals.map((goal) => ({
				goalId: goal.goalId,
				projectId: goal.projectId,
				parentGoalId: goal.parentGoalId,
				status: goal.status,
				taskCounts: goal.taskCounts,
				childGoalCounts: goal.childGoalCounts,
				currentRun: goal.currentRun
					? {
							runId: goal.currentRun.runId,
							taskId: goal.currentRun.taskId,
							status: goal.currentRun.status,
							modelProviderId: goal.currentRun.modelProviderId
						}
					: null,
				suggestedAction: goal.suggestedAction
			}))
		},
		unreviewedOutputs: readV2CoreUnreviewedOutputs(db)
			.map((output) => ({
				artifactId: output.artifactId,
				taskId: output.taskId,
				runId: output.runId,
				status: output.status
			}))
			.toSorted((left, right) => left.artifactId.localeCompare(right.artifactId)),
		goalContinuityAudit: {
			summary: continuity.summary,
			emptyActiveProjectIds: continuity.emptyActiveProjects
				.map((project) => project.projectId)
				.toSorted(),
			activeProjectIdsWithoutOpenGoalPath: continuity.activeProjectsWithoutOpenGoalPath
				.map((project) => project.projectId)
				.toSorted(),
			idleActiveGoalIds: continuity.idleActiveGoals.map((goal) => goal.goalId).toSorted(),
			staleCurrentRunIds: continuity.staleCurrentRuns.map((run) => run.runId).toSorted(),
			classifiedStaleRunIds: continuity.classifiedStaleRuns.map((run) => run.runId).toSorted(),
			closureContinuityGoalIds: continuity.closureContinuityWarnings
				.map((goal) => goal.goalId)
				.toSorted(),
			classifiedClosureGoalIds: continuity.classifiedClosureGoals
				.map((goal) => goal.goalId)
				.toSorted()
		},
		crossProjectAttention: crossProjectAttention.map((row) => ({
			projectId: row.projectId,
			counts: row.counts,
			topAction: row.topAction,
			target: row.target
				? {
						kind: row.target.kind,
						id: row.target.id,
						projectId: row.target.projectId,
						goalId: row.target.goalId,
						taskId: row.target.taskId
					}
				: null
		})),
		representativeTasks: tasks
	};
}

function gitOutput(repositoryRoot: string, args: string[]) {
	return execFileSync('git', args, {
		cwd: repositoryRoot,
		encoding: 'utf8'
	}).trim();
}

function assertHealthyProfile(label: string, profile: SqliteProfile) {
	const integrityValues = profile.integrityCheck.flatMap((row) => Object.values(row));
	if (integrityValues.length !== 1 || integrityValues[0] !== 'ok') {
		throw new Error(`${label} integrity_check failed: ${JSON.stringify(profile.integrityCheck)}.`);
	}
	if (profile.foreignKeyViolations.length > 0) {
		throw new Error(
			`${label} has ${profile.foreignKeyViolations.length} foreign-key violation(s).`
		);
	}
}

function assertParity(label: string, expected: unknown, actual: unknown) {
	const expectedJson = stableJson(expected);
	const actualJson = stableJson(actual);
	if (expectedJson !== actualJson) {
		throw new Error(
			`${label} parity failed: expected ${sha256(expectedJson)}, received ${sha256(actualJson)}.`
		);
	}
}

async function capture(options: Options) {
	const repositoryRoot = resolve(process.cwd());
	const dbFile = resolveV2CoreDbFile({ dbFile: options.dbFile });
	const outputDir = resolve(options.outputDir ?? '');
	if (!options.outputDir) {
		throw new Error('--output <path> is required.');
	}
	if (existsSync(outputDir)) {
		throw new Error(`Refusing to overwrite existing baseline directory: ${outputDir}`);
	}

	const taskIds = options.taskIds.length > 0 ? options.taskIds : DEFAULT_REPRESENTATIVE_TASK_IDS;
	mkdirSync(outputDir, { recursive: true });

	const sqliteBackupFile = resolve(outputDir, 'v2-core.sqlite');
	const snapshotFile = resolve(outputDir, 'v2-core-snapshot.json');
	const readbacksFile = resolve(outputDir, 'parity-readbacks.json');
	const schemaFile = resolve(outputDir, 'sqlite-schema.json');
	const manifestFile = resolve(outputDir, 'manifest.json');
	const restoreDbFile = resolve(outputDir, '.restore-validation.sqlite');
	const sourceFilesBefore = readDurableSourceFileStates(repositoryRoot, dbFile);

	const sourceDb = openV2CoreDbReadonly({ dbFile });
	let sourceProfile: SqliteProfile;
	let sourceReadbacks: ReturnType<typeof readParityReadbacks>;
	let sourceSnapshot: ReturnType<typeof exportV2CoreSnapshot>;
	let sourceDataVersionBefore: number;
	let sourceDataVersionAfter: number;
	let sourceTotalChangesBefore: number;
	let sourceTotalChangesAfter: number;
	try {
		if (!sourceDb.readonly) {
			throw new Error('Source database connection is not read-only.');
		}
		sourceDb.pragma('query_only = ON');
		sourceDataVersionBefore = pragmaNumber(sourceDb, 'data_version');
		sourceTotalChangesBefore = readTotalChanges(sourceDb);
		sourceProfile = readSqliteProfile(sourceDb);
		assertHealthyProfile('Source database', sourceProfile);
		sourceReadbacks = readParityReadbacks(sourceDb, options.goalId, taskIds);
		sourceSnapshot = exportV2CoreSnapshot(sourceDb);
		await sourceDb.backup(sqliteBackupFile);
		sourceDataVersionAfter = pragmaNumber(sourceDb, 'data_version');
		sourceTotalChangesAfter = readTotalChanges(sourceDb);
	} finally {
		sourceDb.close();
	}

	const sourceFilesAfter = readDurableSourceFileStates(repositoryRoot, dbFile);
	if (!sourceFilesMatch(sourceFilesBefore, sourceFilesAfter)) {
		throw new Error(
			`The source database or WAL content changed during capture; baseline was not stable. Before: ${JSON.stringify(sourceFilesBefore)} After: ${JSON.stringify(sourceFilesAfter)}`
		);
	}
	if (sourceDataVersionBefore !== sourceDataVersionAfter) {
		throw new Error('The source database data_version changed during capture.');
	}
	if (sourceTotalChangesBefore !== 0 || sourceTotalChangesAfter !== 0) {
		throw new Error('The read-only source connection reported local changes during capture.');
	}

	const backupDb = openV2CoreDbReadonly({ dbFile: sqliteBackupFile });
	let backupProfile: SqliteProfile;
	let backupReadbacks: ReturnType<typeof readParityReadbacks>;
	let snapshot: ReturnType<typeof exportV2CoreSnapshot>;
	try {
		if (!backupDb.readonly) {
			throw new Error('Backup verification connection is not read-only.');
		}
		backupDb.pragma('query_only = ON');
		backupProfile = readSqliteProfile(backupDb);
		assertHealthyProfile('SQLite backup', backupProfile);
		backupReadbacks = readParityReadbacks(backupDb, options.goalId, taskIds);
		snapshot = exportV2CoreSnapshot(backupDb);
	} finally {
		backupDb.close();
	}
	for (const suffix of ['-wal', '-shm']) {
		rmSync(`${sqliteBackupFile}${suffix}`, { force: true });
	}

	assertParity('Source-to-backup readback', sourceReadbacks, backupReadbacks);
	assertParity(
		'Source-to-backup table count',
		sourceProfile.tableCounts,
		backupProfile.tableCounts
	);
	assertParity('Source-to-backup exact snapshot', sourceSnapshot, snapshot);
	if (sourceProfile.schemaSha256 !== backupProfile.schemaSha256) {
		throw new Error('Source-to-backup schema hash parity failed.');
	}

	writeFileSync(snapshotFile, stableJson(snapshot), 'utf8');
	writeFileSync(readbacksFile, stableJson(backupReadbacks), 'utf8');
	writeFileSync(schemaFile, stableJson(backupProfile.schema), 'utf8');

	const restoreDb = openV2CoreDb({ dbFile: restoreDbFile });
	try {
		importV2CoreSnapshot(restoreDb, snapshot);
	} finally {
		restoreDb.close();
	}

	const restoredReadonlyDb = openV2CoreDbReadonly({ dbFile: restoreDbFile });
	let restoreProfile: SqliteProfile;
	let restoreReadbacks: ReturnType<typeof readParityReadbacks>;
	let restoredSnapshot: ReturnType<typeof exportV2CoreSnapshot>;
	try {
		if (!restoredReadonlyDb.readonly) {
			throw new Error('Restored-database verification connection is not read-only.');
		}
		restoredReadonlyDb.pragma('query_only = ON');
		restoreProfile = readSqliteProfile(restoredReadonlyDb);
		assertHealthyProfile('Logical snapshot restore', restoreProfile);
		restoreReadbacks = readParityReadbacks(restoredReadonlyDb, options.goalId, taskIds);
		restoredSnapshot = exportV2CoreSnapshot(restoredReadonlyDb);
	} finally {
		restoredReadonlyDb.close();
	}

	assertParity('Snapshot-restore readback', backupReadbacks, restoreReadbacks);
	assertParity(
		'Snapshot-restore table count',
		backupProfile.tableCounts,
		restoreProfile.tableCounts
	);
	assertParity('Snapshot re-export', snapshot, restoredSnapshot);
	if (backupProfile.schemaSha256 !== restoreProfile.schemaSha256) {
		throw new Error('Snapshot-restore schema hash parity failed.');
	}

	for (const suffix of ['', '-wal', '-shm']) {
		rmSync(`${restoreDbFile}${suffix}`, { force: true });
	}

	const snapshotState = fileState(repositoryRoot, snapshotFile);
	const backupState = fileState(repositoryRoot, sqliteBackupFile);
	const readbacksState = fileState(repositoryRoot, readbacksFile);
	const schemaState = fileState(repositoryRoot, schemaFile);
	const toolScriptState = fileState(
		repositoryRoot,
		resolve(repositoryRoot, 'scripts/capture-v2-extraction-baseline.ts')
	);
	const sourceCommit = gitOutput(repositoryRoot, ['rev-parse', 'HEAD']);
	const worktreeStatus = gitOutput(repositoryRoot, [
		'status',
		'--porcelain',
		'--untracked-files=normal'
	]);
	const captureTime = new Date().toISOString();
	const expectedSnapshotTables = new Set(Object.keys(snapshot.tables));
	const unexpectedTables = Object.keys(backupProfile.tableCounts).filter(
		(tableName) => !expectedSnapshotTables.has(tableName)
	);
	const snapshotTableSha256 = Object.fromEntries(
		Object.entries(snapshot.tables).map(([tableName, rows]) => [
			tableName,
			sha256(stableJson(rows))
		])
	);
	const readbackFixtureSha256 = Object.fromEntries(
		Object.entries(backupReadbacks).map(([fixtureName, fixture]) => [
			fixtureName,
			sha256(stableJson(fixture))
		])
	);
	const betterSqlitePackageFile = resolve(
		repositoryRoot,
		'node_modules/better-sqlite3/package.json'
	);
	const betterSqliteVersion = existsSync(betterSqlitePackageFile)
		? ((JSON.parse(readFileSync(betterSqlitePackageFile, 'utf8')) as { version?: string })
				.version ?? 'unknown')
		: 'unknown';
	const manifest = {
		format: MANIFEST_FORMAT,
		baselineId: basename(outputDir),
		capturedAt: captureTime,
		source: {
			repositoryRoot,
			commit: sourceCommit,
			worktreeClean: worktreeStatus.length === 0,
			worktreeStatus: worktreeStatus ? worktreeStatus.split('\n') : [],
			runtimeAuthority: 'data/v2-core.sqlite',
			databaseFile: displayPath(repositoryRoot, dbFile),
			durableFilesBefore: sourceFilesBefore,
			durableFilesAfter: sourceFilesAfter,
			durableSourceMutationDetected: false
		},
		tool: {
			script: toolScriptState,
			nodeVersion: process.version,
			betterSqlite3Version: betterSqliteVersion,
			sqliteVersion: backupProfile.sqliteVersion
		},
		scope: {
			goalId: options.goalId,
			representativeTaskIds: taskIds
		},
		schema: {
			applicationId: backupProfile.applicationId,
			userVersion: backupProfile.userVersion,
			schemaCookie: backupProfile.schemaCookie,
			schemaSha256: backupProfile.schemaSha256,
			tableCounts: backupProfile.tableCounts,
			snapshotTableSha256,
			statusDistributions: backupProfile.statusDistributions,
			unexpectedTables
		},
		artifacts: {
			sqliteBackup: backupState,
			deterministicSnapshot: snapshotState,
			parityReadbacks: readbacksState,
			sqliteSchema: schemaState
		},
		verification: {
			passed: true,
			sourceIntegrityCheck: sourceProfile.integrityCheck,
			sourceForeignKeyViolationCount: sourceProfile.foreignKeyViolations.length,
			sourceConnectionReadonly: true,
			sourceQueryOnly: true,
			sourceDataVersionBefore,
			sourceDataVersionAfter,
			sourceTotalChangesBefore,
			sourceTotalChangesAfter,
			backupIntegrityCheck: backupProfile.integrityCheck,
			backupForeignKeyViolationCount: backupProfile.foreignKeyViolations.length,
			restoreIntegrityCheck: restoreProfile.integrityCheck,
			restoreForeignKeyViolationCount: restoreProfile.foreignKeyViolations.length,
			sourceToBackupTableCountParity: true,
			sourceToBackupReadbackParity: true,
			sourceToBackupExactSnapshotParity: true,
			snapshotRestoreTableCountParity: true,
			snapshotRestoreReadbackParity: true,
			snapshotRestoreExactReexportParity: true,
			readbacksSha256: readbacksState.sha256,
			readbackFixtureSha256,
			readbackParameters: {
				nextWorkLimitPerGoal: 20,
				goalTriageLimit: 20,
				crossProjectAttentionLimit: 25,
				preservedSemanticOrder: ['nextWorkByGoal.*', 'crossProjectAttention']
			}
		},
		knownLimitations: [
			'PRAGMA user_version is captured but the prototype currently reports 0; schemaSha256 is the operative schema fingerprint.',
			'The backup preserves all current v2 tables, including concepts deferred from the clean v2 foundation domain.',
			'The logical snapshot stores artifact URI records but does not embed the files referenced by those URIs.',
			'Opening a SQLite WAL database read-only can create or touch empty WAL/SHM coordination files; durable mutation checks compare main-database and nonempty-WAL content. SHM metadata is transient and intentionally omitted.',
			'Dependency relation status is preserved literally; eligibility is computed from both relation and predecessor task state.',
			'Task/run closeout records created after this capture are intentionally outside this immutable baseline.'
		]
	};

	writeFileSync(manifestFile, stableJson(manifest), 'utf8');
	for (const generatedFile of [
		sqliteBackupFile,
		snapshotFile,
		readbacksFile,
		schemaFile,
		manifestFile
	]) {
		chmodSync(generatedFile, 0o444);
	}
	process.stdout.write(
		stableJson({
			manifestFile: displayPath(repositoryRoot, manifestFile),
			baselineId: manifest.baselineId,
			sourceCommit,
			worktreeClean: manifest.source.worktreeClean,
			schemaSha256: manifest.schema.schemaSha256,
			tableCounts: manifest.schema.tableCounts,
			artifactHashes: {
				sqliteBackup: backupState.sha256,
				deterministicSnapshot: snapshotState.sha256,
				parityReadbacks: readbacksState.sha256
			},
			verification: manifest.verification
		})
	);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
	printHelp();
} else {
	await capture(options);
}
