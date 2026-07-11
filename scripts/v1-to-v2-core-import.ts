#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
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

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const DEFAULT_SOURCE = resolve(REPO_ROOT, 'data', 'control-plane.json');
const DEFAULT_V2_CORE_DB = resolve(REPO_ROOT, 'data', 'v2-core.sqlite');

type Options = {
	source: string;
	dbFile: string;
	projectId: string;
	projectName: string;
	goalId: string;
	write: boolean;
	json: boolean;
	limit: number;
	help: boolean;
};

type ImportRecord = Record<string, any>;

type ImportSelection = {
	project: ImportRecord;
	goals: ImportRecord[];
	tasks: ImportRecord[];
	runs: ImportRecord[];
	reviews: ImportRecord[];
	approvals: ImportRecord[];
	decisions: ImportRecord[];
	providers: ImportRecord[];
	artifactChecks: ArtifactCheck[];
};

type ArtifactCheck = {
	sourceType: string;
	sourceId: string;
	parentId?: string;
	field: string;
	path: string;
	exists: boolean;
};

type ImportSummary = {
	mode: 'dry-run' | 'write';
	source: string;
	dbFile: string;
	selection: {
		projectId: string;
		projectName: string;
		goalId: string | null;
		goals: number;
		tasks: number;
	};
	created: Record<string, number>;
	skippedExisting: Record<string, number>;
	deferred: Record<string, number>;
	notes: string[];
	samples: Record<string, Array<{ id: string; title: string; reason?: string }>>;
};

function printHelp() {
	process.stdout.write(
		[
			'Usage: node --experimental-strip-types scripts/v1-to-v2-core-import.ts [options]',
			'',
			'Options:',
			'  --source <path>          V1 control-plane JSON export. Defaults to data/control-plane.json.',
			'  --db <path>              V2 core database. Defaults to data/v2-core.sqlite.',
			'  --project <id>           Project id to import.',
			'  --project-name <text>    Project name to import when id is not known.',
			'  --goal <id>              Optional goal id to narrow task/run/review/decision scope.',
			'  --write                  Actually create v2 core records. Omit for dry-run.',
			'  --limit <n>              Limit samples per collection. Default: 5.',
			'  --json                   Print JSON instead of markdown.',
			'  --help                   Show this help.',
			'',
			'This command never mutates v1. It only writes v2 core records when --write is present.',
			'It imports only accepted v2 core entities and reports deferred concepts instead of creating schema.'
		].join('\n') + '\n'
	);
}

function parseArgs(argv: string[]): Options {
	const options: Options = {
		source: DEFAULT_SOURCE,
		dbFile: DEFAULT_V2_CORE_DB,
		projectId: '',
		projectName: '',
		goalId: '',
		write: false,
		json: false,
		limit: 5,
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

		switch (token) {
			case '--source':
				options.source = resolve(process.cwd(), next);
				break;
			case '--db':
				options.dbFile = resolve(process.cwd(), next);
				break;
			case '--project':
				options.projectId = next;
				break;
			case '--project-name':
				options.projectName = next;
				break;
			case '--goal':
				options.goalId = next;
				break;
			case '--limit': {
				const parsedLimit = Number.parseInt(next, 10);
				if (!Number.isInteger(parsedLimit) || parsedLimit < 0) {
					throw new Error('--limit must be a non-negative integer.');
				}
				options.limit = parsedLimit;
				break;
			}
			default:
				throw new Error(`Unknown option: ${token}.`);
		}

		index += 1;
	}

	return options;
}

function readJson(path: string) {
	try {
		return JSON.parse(readFileSync(path, 'utf8'));
	} catch (error) {
		throw new Error(
			`Failed to read ${path}: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error }
		);
	}
}

function ensureArray(value: unknown): ImportRecord[] {
	return Array.isArray(value) ? (value as ImportRecord[]) : [];
}

function text(value: unknown, fallback = '') {
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function unique(values: Array<string | null | undefined>) {
	return [...new Set(values.map((value) => text(value)).filter(Boolean))];
}

function source(collection: string, id: string, field = 'record', note = 'Imported from AMS v1.') {
	return {
		sourceSystem: 'ams-v1',
		sourceCollection: collection,
		sourceId: id,
		field,
		note
	};
}

function resolveProject(data: ImportRecord, options: Options) {
	const projects = ensureArray(data.projects);
	if (options.projectId) {
		return projects.find((project) => project.id === options.projectId) ?? null;
	}
	if (options.projectName) {
		const normalizedName = options.projectName.trim().toLowerCase();
		return projects.find((project) => text(project.name).toLowerCase() === normalizedName) ?? null;
	}
	return projects[0] ?? null;
}

function pathStatus(path: unknown): ArtifactCheck | null {
	if (typeof path !== 'string' || !path.trim()) {
		return null;
	}
	return {
		sourceType: '',
		sourceId: '',
		field: '',
		path,
		exists: existsSync(path)
	};
}

function collectArtifactChecks(input: {
	project: ImportRecord;
	goals: ImportRecord[];
	tasks: ImportRecord[];
	runs: ImportRecord[];
}) {
	const checks: ArtifactCheck[] = [];

	for (const projectPath of [
		input.project.defaultArtifactRoot,
		input.project.projectRootFolder,
		input.project.defaultRepoPath
	]) {
		const status = pathStatus(projectPath);
		if (status) {
			checks.push({
				...status,
				sourceType: 'Project',
				sourceId: input.project.id,
				field: 'root'
			});
		}
	}

	for (const goal of input.goals) {
		const status = pathStatus(goal.artifactPath);
		if (status) {
			checks.push({ ...status, sourceType: 'Goal', sourceId: goal.id, field: 'artifactPath' });
		}
	}

	for (const task of input.tasks) {
		const taskArtifact = pathStatus(task.artifactPath);
		if (taskArtifact) {
			checks.push({
				...taskArtifact,
				sourceType: 'Task',
				sourceId: task.id,
				field: 'artifactPath'
			});
		}

		for (const attachment of ensureArray(task.attachments)) {
			const attachmentStatus = pathStatus(attachment.path);
			if (attachmentStatus) {
				checks.push({
					...attachmentStatus,
					sourceType: 'TaskAttachment',
					sourceId: attachment.id,
					parentId: task.id,
					field: 'path'
				});
			}
		}
	}

	for (const run of input.runs) {
		for (const artifactPath of ensureArray(run.artifactPaths)) {
			const status = pathStatus(artifactPath);
			if (status) {
				checks.push({
					...status,
					sourceType: 'Run',
					sourceId: run.id,
					field: 'artifactPaths'
				});
			}
		}
	}

	return checks;
}

function buildSelection(data: ImportRecord, options: Options): ImportSelection {
	const project = resolveProject(data, options);
	if (!project) {
		throw new Error('No project matched the requested selector.');
	}

	const projectGoals = ensureArray(data.goals).filter((goal) =>
		ensureArray(goal.projectIds)
			.map((projectId) => text(projectId))
			.includes(project.id)
	);
	const goals = options.goalId
		? projectGoals.filter((goal) => goal.id === options.goalId)
		: projectGoals;
	if (options.goalId && goals.length === 0) {
		throw new Error(`Goal ${options.goalId} was not found for project ${project.id}.`);
	}

	const selectedGoalIds = new Set(goals.map((goal) => goal.id));
	const goalTaskIds = new Set(
		goals.flatMap((goal) => ensureArray(goal.taskIds).map((task) => task))
	);
	const allTasks = ensureArray(data.tasks);
	const tasks = allTasks.filter((task) => {
		if (task.projectId !== project.id) {
			return false;
		}
		if (selectedGoalIds.size === 0) {
			return true;
		}
		return selectedGoalIds.has(task.goalId) || goalTaskIds.has(task.id);
	});
	const taskIds = new Set(tasks.map((task) => task.id));
	const runs = ensureArray(data.runs).filter((run) => taskIds.has(run.taskId));
	const runIds = new Set(runs.map((run) => run.id));
	const reviews = ensureArray(data.reviews).filter(
		(review) => taskIds.has(review.taskId) || (review.runId && runIds.has(review.runId))
	);
	const reviewIds = new Set(reviews.map((review) => review.id));
	const approvals = ensureArray(data.approvals).filter(
		(approval) => taskIds.has(approval.taskId) || (approval.runId && runIds.has(approval.runId))
	);
	const approvalIds = new Set(approvals.map((approval) => approval.id));
	const decisions = ensureArray(data.decisions).filter(
		(decision) =>
			(decision.taskId && taskIds.has(decision.taskId)) ||
			(decision.goalId && selectedGoalIds.has(decision.goalId)) ||
			(decision.runId && runIds.has(decision.runId)) ||
			(decision.reviewId && reviewIds.has(decision.reviewId)) ||
			(decision.approvalId && approvalIds.has(decision.approvalId))
	);
	const providerIds = new Set(runs.map((run) => text(run.providerId)).filter(Boolean));
	const providers = ensureArray(data.providers).filter((provider) => providerIds.has(provider.id));

	return {
		project,
		goals,
		tasks,
		runs,
		reviews,
		approvals,
		decisions,
		providers,
		artifactChecks: collectArtifactChecks({ project, goals, tasks, runs })
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
		case 'running':
		case 'ready':
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
	const row = db.prepare(`select id from ${table} where id = ?`).get(id);
	return Boolean(row);
}

function sourceExists(db: Database.Database, table: string, collection: string, sourceId: string) {
	const row = db
		.prepare(
			`
				select record_id
				from v2_core_source_references
				where record_table = ?
					and source_system = 'ams-v1'
					and source_collection = ?
					and source_id = ?
				limit 1
			`
		)
		.get(table, collection, sourceId);
	return Boolean(row);
}

function alreadyExists(
	db: Database.Database,
	table: string,
	id: string,
	collection: string = table
) {
	return rowExists(db, table, id) || sourceExists(db, table, collection, id);
}

function increment(record: Record<string, number>, key: string) {
	record[key] = (record[key] ?? 0) + 1;
}

function addSample(
	samples: ImportSummary['samples'],
	key: string,
	limit: number,
	entry: { id: string; title: string; reason?: string }
) {
	if (!samples[key]) {
		samples[key] = [];
	}
	if (samples[key].length < limit) {
		samples[key].push(entry);
	}
}

function artifactTitle(path: string) {
	return path.split('/').at(-1) || path;
}

function materializableArtifacts(selection: ImportSelection) {
	const taskIds = new Set(selection.tasks.map((task) => task.id));
	const runTaskIds = new Map(selection.runs.map((run) => [run.id, run.taskId]));
	const byPath = new Map<string, ArtifactCheck & { taskId: string; runId: string | null }>();

	for (const check of selection.artifactChecks) {
		let taskId: string | null = null;
		let runId: string | null = null;

		if (check.sourceType === 'Task') {
			taskId = check.sourceId;
		} else if (check.sourceType === 'TaskAttachment') {
			taskId = check.parentId ?? null;
		} else if (check.sourceType === 'Run') {
			runId = check.sourceId;
			taskId = runTaskIds.get(runId) ?? null;
		}

		if (!taskId || !taskIds.has(taskId) || byPath.has(check.path)) {
			continue;
		}

		byPath.set(check.path, { ...check, taskId, runId });
	}

	return [...byPath.values()];
}

function buildSummary(options: Options, selection: ImportSelection): ImportSummary {
	return {
		mode: options.write ? 'write' : 'dry-run',
		source: options.source,
		dbFile: options.dbFile,
		selection: {
			projectId: selection.project.id,
			projectName: text(selection.project.name),
			goalId: options.goalId || null,
			goals: selection.goals.length,
			tasks: selection.tasks.length
		},
		created: {},
		skippedExisting: {},
		deferred: {},
		notes: [
			'Dry-run is the default. Records are created only when --write is present.',
			'V1 ready/running goals map to v2 active goals; v1 done goals map to v2 completed goals.',
			'Approvals, WorkSessions, Capability, Skill, and full provider/session metadata remain deferred v2 concepts.',
			'Project/goal artifact paths are not imported as artifacts because v2 core artifacts require task scope.'
		],
		samples: {}
	};
}

function applyImport(db: Database.Database, options: Options, selection: ImportSelection) {
	const summary = buildSummary(options, selection);
	const selectedGoalIds = new Set(selection.goals.map((goal) => goal.id));
	const selectedTaskIds = new Set(selection.tasks.map((task) => task.id));
	const selectedRunIds = new Set(selection.runs.map((run) => run.id));
	const selectedReviewIds = new Set(selection.reviews.map((review) => review.id));
	const materializedReviewIds = new Set<string>();

	function maybeCreate(
		key: string,
		exists: boolean,
		create: () => void,
		sample: { id: string; title: string }
	) {
		if (exists) {
			increment(summary.skippedExisting, key);
			addSample(summary.samples, `skipped_${key}`, options.limit, sample);
			return;
		}
		if (options.write) {
			create();
		}
		increment(summary.created, key);
		addSample(summary.samples, `created_${key}`, options.limit, sample);
	}

	for (const provider of selection.providers) {
		const providerId = text(provider.id);
		maybeCreate(
			'modelProviders',
			alreadyExists(db, 'v2_core_model_providers', providerId, 'providers'),
			() =>
				registerV2CoreModelProvider(db, {
					id: providerId,
					name: text(provider.name, providerId),
					kind: 'external_ai',
					status: 'available',
					source: source('providers', providerId)
				}),
			{ id: providerId, title: text(provider.name, providerId) }
		);
	}

	maybeCreate(
		'projects',
		alreadyExists(db, 'v2_core_projects', selection.project.id, 'projects'),
		() =>
			createV2CoreProject(db, {
				id: selection.project.id,
				name: text(selection.project.name, selection.project.id),
				summary: text(selection.project.summary),
				status: 'active',
				workspaceRoot:
					text(selection.project.projectRootFolder) ||
					text(selection.project.defaultRepoPath) ||
					process.cwd(),
				source: source('projects', selection.project.id)
			}),
		{ id: selection.project.id, title: text(selection.project.name, selection.project.id) }
	);

	for (const goal of selection.goals) {
		const parentGoalId = selectedGoalIds.has(goal.parentGoalId) ? text(goal.parentGoalId) : null;
		maybeCreate(
			'goals',
			alreadyExists(db, 'v2_core_goals', goal.id, 'goals'),
			() =>
				createV2CoreGoal(db, {
					id: goal.id,
					projectId: selection.project.id,
					parentGoalId,
					title: text(goal.name, goal.id),
					summary: text(goal.summary),
					successCriteria: text(goal.successSignal, 'Imported v1 goal has no success signal.'),
					status: mapGoalStatus(goal.status),
					source: source('goals', goal.id)
				}),
			{ id: goal.id, title: text(goal.name, goal.id) }
		);
	}

	for (const task of selection.tasks) {
		if (!selectedGoalIds.has(task.goalId)) {
			increment(summary.deferred, 'tasksMissingSelectedGoal');
			addSample(summary.samples, 'deferred_tasksMissingSelectedGoal', options.limit, {
				id: task.id,
				title: text(task.title, task.id),
				reason: `Goal ${text(task.goalId)} is not in the selected import scope.`
			});
			continue;
		}

		maybeCreate(
			'tasks',
			alreadyExists(db, 'v2_core_tasks', task.id, 'tasks'),
			() =>
				createV2CoreTask(db, {
					id: task.id,
					projectId: selection.project.id,
					goalId: task.goalId,
					title: text(task.title, task.id),
					summary: text(task.summary),
					successCriteria: text(task.successCriteria, 'Imported v1 task has no success criteria.'),
					validationPlan: text(task.validationSteps, 'No explicit v1 validation plan.'),
					status: mapTaskStatus(task.status),
					source: source('tasks', task.id)
				}),
			{ id: task.id, title: text(task.title, task.id) }
		);
	}

	for (const task of selection.tasks) {
		for (const dependencyTaskId of ensureArray(task.dependencyTaskIds).map((id) => text(id))) {
			if (!dependencyTaskId) {
				continue;
			}
			const dependencyId = `${task.id}__depends_on__${dependencyTaskId}`;
			if (!selectedTaskIds.has(dependencyTaskId)) {
				increment(summary.deferred, 'taskDependenciesOutsideSelection');
				addSample(summary.samples, 'deferred_taskDependenciesOutsideSelection', options.limit, {
					id: dependencyId,
					title: `${task.id} depends on ${dependencyTaskId}`,
					reason: 'Dependency task is outside the selected import scope.'
				});
				continue;
			}
			maybeCreate(
				'taskDependencies',
				alreadyExists(db, 'v2_core_task_dependencies', dependencyId, 'tasks.dependencyTaskIds'),
				() =>
					recordV2CoreTaskDependency(db, {
						id: dependencyId,
						taskId: task.id,
						dependsOnTaskId: dependencyTaskId,
						status: 'resolved',
						reason: 'Imported v1 task dependency.',
						source: source('tasks.dependencyTaskIds', task.id, 'dependencyTaskIds')
					}),
				{ id: dependencyId, title: `${task.id} depends on ${dependencyTaskId}` }
			);
		}
	}

	for (const run of selection.runs) {
		const providerId = text(run.providerId) || null;
		maybeCreate(
			'runs',
			alreadyExists(db, 'v2_core_runs', run.id, 'runs'),
			() =>
				recordV2CoreRun(db, {
					id: run.id,
					taskId: run.taskId,
					modelProviderId: providerId,
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

	const artifacts = materializableArtifacts(selection);
	for (const [index, artifact] of artifacts.entries()) {
		const artifactId = `artifact_import_${selection.project.id}_${index + 1}`;
		maybeCreate(
			'artifacts',
			alreadyExists(db, 'v2_core_artifacts', artifactId, artifact.sourceType.toLowerCase()),
			() =>
				attachV2CoreArtifact(db, {
					id: artifactId,
					projectId: selection.project.id,
					taskId: artifact.taskId,
					runId: artifact.runId,
					uri: artifact.path,
					role: 'evidence',
					title: artifactTitle(artifact.path),
					summary: `Imported v1 ${artifact.sourceType} ${artifact.field} path.`,
					status: 'submitted',
					source: source(
						artifact.sourceType === 'TaskAttachment'
							? 'tasks.attachments'
							: artifact.sourceType.toLowerCase(),
						artifact.parentId ?? artifact.sourceId,
						artifact.field,
						`Imported artifact path from v1 ${artifact.sourceType}.`
					)
				}),
			{ id: artifactId, title: artifact.path }
		);
	}

	for (const review of selection.reviews) {
		const reviewStatus = mapReviewStatus(review.status);
		maybeCreate(
			'reviews',
			alreadyExists(db, 'v2_core_reviews', review.id, 'reviews'),
			() => {
				recordV2CoreReview(db, {
					id: review.id,
					taskId: review.taskId,
					runId: selectedRunIds.has(review.runId) ? review.runId : null,
					status: reviewStatus,
					summary: text(review.summary, review.id),
					createdAt: text(review.createdAt) || new Date().toISOString(),
					resolvedAt:
						reviewStatus === 'open'
							? null
							: text(review.resolvedAt) || text(review.updatedAt) || new Date().toISOString(),
					source: source('reviews', review.id)
				});
				materializedReviewIds.add(review.id);
			},
			{ id: review.id, title: text(review.summary, review.id) }
		);
		if (!alreadyExists(db, 'v2_core_reviews', review.id, 'reviews')) {
			materializedReviewIds.add(review.id);
		}
	}

	for (const approval of selection.approvals) {
		increment(summary.deferred, 'approvals');
		addSample(summary.samples, 'deferred_approvals', options.limit, {
			id: approval.id,
			title: text(approval.summary, approval.id),
			reason: 'Approval is deferred in the accepted v2 core first-slice model.'
		});
	}

	for (const decision of selection.decisions) {
		const taskId = selectedTaskIds.has(decision.taskId) ? text(decision.taskId) : null;
		const goalId = selectedGoalIds.has(decision.goalId) ? text(decision.goalId) : null;
		const runId = selectedRunIds.has(decision.runId) ? text(decision.runId) : null;
		const reviewId = materializedReviewIds.has(decision.reviewId) ? text(decision.reviewId) : null;
		if (!taskId && !goalId && !runId && !reviewId) {
			increment(summary.deferred, 'decisionsWithoutMaterializedReference');
			addSample(summary.samples, 'deferred_decisionsWithoutMaterializedReference', options.limit, {
				id: decision.id,
				title: text(decision.summary, decision.id),
				reason: 'Decision only references deferred or unselected records.'
			});
			continue;
		}
		maybeCreate(
			'decisions',
			alreadyExists(db, 'v2_core_decisions', decision.id, 'decisions'),
			() =>
				recordV2CoreDecision(db, {
					id: decision.id,
					projectId: selection.project.id,
					goalId,
					taskId,
					runId,
					reviewId,
					decisionType: text(decision.decisionType, 'imported_v1_decision'),
					summary: text(decision.summary, decision.id),
					rationale: 'Imported from AMS v1 decision record.',
					decidedAt: text(decision.createdAt) || new Date().toISOString(),
					source: source('decisions', decision.id)
				}),
			{ id: decision.id, title: text(decision.summary, decision.id) }
		);
	}

	const projectRootArtifacts = selection.artifactChecks.filter(
		(check) => check.sourceType === 'Project' || check.sourceType === 'Goal'
	).length;
	if (projectRootArtifacts > 0) {
		summary.deferred.projectOrGoalArtifactPaths = projectRootArtifacts;
	}

	const threadIds = unique([
		...selection.tasks.map((task) => text(task.agentThreadId)),
		...selection.runs.flatMap((run) => [text(run.threadId), text(run.agentThreadId)])
	]);
	if (threadIds.length > 0) {
		summary.deferred.workSessions = threadIds.length;
	}

	const capabilities = unique(
		selection.tasks.flatMap((task) => ensureArray(task.requiredCapabilityNames).map(text))
	);
	const skills = unique(
		selection.tasks.flatMap((task) => ensureArray(task.requiredPromptSkillNames).map(text))
	);
	const tools = unique(
		selection.tasks.flatMap((task) => ensureArray(task.requiredToolNames).map(text))
	);
	if (capabilities.length > 0) {
		summary.deferred.capabilityCandidates = capabilities.length;
	}
	if (skills.length > 0) {
		summary.deferred.skillCandidates = skills.length;
	}
	if (tools.length > 0) {
		summary.deferred.toolCandidates = tools.length;
	}

	return summary;
}

function renderSummary(summary: ImportSummary) {
	const lines = [
		'# V1 To V2 Core Import',
		'',
		`Mode: ${summary.mode}`,
		`Source: \`${summary.source}\``,
		`V2 DB: \`${summary.dbFile}\``,
		'',
		'## Selection',
		'',
		`- Project: ${summary.selection.projectName} (\`${summary.selection.projectId}\`)`,
		`- Goal filter: ${summary.selection.goalId ? `\`${summary.selection.goalId}\`` : 'none'}`,
		`- Goals: ${summary.selection.goals}`,
		`- Tasks: ${summary.selection.tasks}`,
		'',
		'## Created Or Would Create',
		''
	];

	for (const [key, value] of Object.entries(summary.created)) {
		lines.push(`- ${key}: ${value}`);
	}
	if (Object.keys(summary.created).length === 0) {
		lines.push('- none');
	}

	lines.push('', '## Skipped Existing', '');
	for (const [key, value] of Object.entries(summary.skippedExisting)) {
		lines.push(`- ${key}: ${value}`);
	}
	if (Object.keys(summary.skippedExisting).length === 0) {
		lines.push('- none');
	}

	lines.push('', '## Deferred', '');
	for (const [key, value] of Object.entries(summary.deferred)) {
		lines.push(`- ${key}: ${value}`);
	}
	if (Object.keys(summary.deferred).length === 0) {
		lines.push('- none');
	}

	lines.push('', '## Samples', '');
	for (const [key, samples] of Object.entries(summary.samples)) {
		lines.push(`### ${key}`);
		if (samples.length === 0) {
			lines.push('- none');
		} else {
			for (const sample of samples) {
				lines.push(
					`- \`${sample.id}\`: ${sample.title}${sample.reason ? ` (${sample.reason})` : ''}`
				);
			}
		}
		lines.push('');
	}

	lines.push('## Notes', '');
	for (const note of summary.notes) {
		lines.push(`- ${note}`);
	}

	return lines.join('\n');
}

function main() {
	let db: Database.Database | null = null;
	try {
		const options = parseArgs(process.argv.slice(2));
		if (options.help) {
			printHelp();
			return;
		}

		const data = readJson(options.source);
		const selection = buildSelection(data, options);
		db = options.write
			? openExistingV2CoreDbForWrite({ dbFile: options.dbFile })
			: openV2CoreDbReadonly({ dbFile: options.dbFile });
		const summary = applyImport(db, options, selection);
		process.stdout.write(
			options.json ? `${JSON.stringify(summary, null, 2)}\n` : `${renderSummary(summary)}\n`
		);
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
	} finally {
		db?.close();
	}
}

main();
