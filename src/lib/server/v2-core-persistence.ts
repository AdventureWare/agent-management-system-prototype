import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { getAppDbFile } from './db/connection.ts';
import {
	V2_CORE_ARTIFACT_STATUSES,
	V2_CORE_EVALUATION_RESULT_STATUSES,
	V2_CORE_EVALUATION_SCENARIO_STATUSES,
	V2_CORE_GOAL_STATUSES,
	V2_CORE_MEMORY_STATUSES,
	V2_CORE_MODEL_PROVIDER_STATUSES,
	V2_CORE_REVIEW_STATUSES,
	V2_CORE_RUN_STATUSES,
	V2_CORE_TASK_STATUSES,
	V2_CORE_TOOL_STATUSES
} from './v2-core-contract.ts';

export type V2CoreDbOptions = {
	dbFile?: string;
	appDbFile?: string;
};

function sqlStringList(values: readonly string[]) {
	return values.map((value) => `'${value}'`).join(', ');
}

export function getDefaultV2CoreDbFile() {
	return resolve(process.cwd(), 'data', 'v2-core.sqlite');
}

export function resolveV2CoreDbFile(options: V2CoreDbOptions = {}) {
	return resolve(options.dbFile ?? getDefaultV2CoreDbFile());
}

export function assertV2CoreDbFileAllowed(options: V2CoreDbOptions = {}) {
	const coreDbFile = resolveV2CoreDbFile(options);
	const appDbFile = resolve(options.appDbFile ?? getAppDbFile());

	if (coreDbFile === appDbFile || coreDbFile.endsWith('/data/app.sqlite')) {
		throw new Error(`Refusing to use the v1 runtime app database as a v2 core database: ${coreDbFile}`);
	}

	if (coreDbFile.endsWith('/data/v2-preview.sqlite')) {
		throw new Error(`Refusing to use the v2 preview database as a v2 core database: ${coreDbFile}`);
	}

	return coreDbFile;
}

export function applyV2CoreSchema(db: Database.Database) {
	db.pragma('foreign_keys = ON');
	db.exec(`
create table if not exists v2_core_projects (
	id text primary key,
	name text not null,
	summary text not null,
	status text not null check (status in ('active', 'paused', 'archived')),
	workspace_root text not null
);

create table if not exists v2_core_goals (
	id text primary key,
	project_id text not null references v2_core_projects(id),
	parent_goal_id text references v2_core_goals(id),
	title text not null,
	summary text not null,
	success_criteria text not null,
	status text not null check (status in (${sqlStringList(V2_CORE_GOAL_STATUSES)}))
);

create index if not exists idx_v2_core_goals_project_id on v2_core_goals(project_id);
create index if not exists idx_v2_core_goals_status on v2_core_goals(status);

create table if not exists v2_core_tasks (
	id text primary key,
	project_id text not null references v2_core_projects(id),
	goal_id text not null references v2_core_goals(id),
	title text not null,
	summary text not null,
	success_criteria text not null,
	validation_plan text not null,
	status text not null check (status in (${sqlStringList(V2_CORE_TASK_STATUSES)}))
);

create index if not exists idx_v2_core_tasks_goal_id on v2_core_tasks(goal_id);
create index if not exists idx_v2_core_tasks_status on v2_core_tasks(status);

create table if not exists v2_core_task_dependencies (
	id text primary key,
	task_id text not null references v2_core_tasks(id) on delete cascade,
	depends_on_task_id text not null references v2_core_tasks(id),
	status text not null check (status in ('resolved', 'unresolved')),
	reason text not null
);

create table if not exists v2_core_model_providers (
	id text primary key,
	name text not null,
	kind text not null,
	status text not null check (status in (${sqlStringList(V2_CORE_MODEL_PROVIDER_STATUSES)}))
);

create table if not exists v2_core_runs (
	id text primary key,
	task_id text not null references v2_core_tasks(id),
	model_provider_id text references v2_core_model_providers(id),
	status text not null check (status in (${sqlStringList(V2_CORE_RUN_STATUSES)})),
	input_summary text not null,
	action_summary text not null,
	result_summary text not null,
	validation_summary text not null,
	started_at text,
	ended_at text
);

create index if not exists idx_v2_core_runs_task_id on v2_core_runs(task_id);

create table if not exists v2_core_artifacts (
	id text primary key,
	project_id text not null references v2_core_projects(id),
	task_id text references v2_core_tasks(id),
	run_id text references v2_core_runs(id),
	uri text not null,
	role text not null check (role in ('context', 'evidence', 'output', 'deliverable')),
	title text not null,
	summary text not null,
	status text not null check (status in (${sqlStringList(V2_CORE_ARTIFACT_STATUSES)}))
);

drop index if exists idx_v2_core_artifacts_uri;
create index if not exists idx_v2_core_artifacts_uri on v2_core_artifacts(uri);

create table if not exists v2_core_reviews (
	id text primary key,
	task_id text not null references v2_core_tasks(id),
	run_id text references v2_core_runs(id),
	artifact_id text references v2_core_artifacts(id),
	status text not null check (status in (${sqlStringList(V2_CORE_REVIEW_STATUSES)})),
	summary text not null,
	created_at text not null,
	resolved_at text
);

create table if not exists v2_core_decisions (
	id text primary key,
	project_id text not null references v2_core_projects(id),
	goal_id text references v2_core_goals(id),
	task_id text references v2_core_tasks(id),
	run_id text references v2_core_runs(id),
	review_id text references v2_core_reviews(id),
	supersedes_decision_id text references v2_core_decisions(id),
	decision_type text not null,
	summary text not null,
	rationale text not null,
	decided_at text not null
);

create table if not exists v2_core_memory_items (
	id text primary key,
	project_id text not null references v2_core_projects(id),
	title text not null,
	body text not null,
	scope text not null check (scope in ('project', 'goal', 'task')),
	status text not null check (status in (${sqlStringList(V2_CORE_MEMORY_STATUSES)})),
	created_at text not null
);

create table if not exists v2_core_memory_item_sources (
	memory_item_id text not null references v2_core_memory_items(id) on delete cascade,
	source_table text not null,
	source_id text not null,
	reason text not null,
	primary key (memory_item_id, source_table, source_id)
);

create table if not exists v2_core_tools (
	id text primary key,
	name text not null unique,
	description text not null,
	kind text not null,
	risk_level text not null check (risk_level in ('low', 'medium', 'high')),
	approval_requirement text not null check (approval_requirement in ('none', 'before_execute')),
	status text not null check (status in (${sqlStringList(V2_CORE_TOOL_STATUSES)}))
);

create table if not exists v2_core_tool_executions (
	id text primary key,
	tool_id text not null references v2_core_tools(id),
	task_id text not null references v2_core_tasks(id),
	run_id text references v2_core_runs(id),
	status text not null check (status in ('planned', 'completed', 'failed', 'canceled')),
	input_summary text not null,
	result_summary text not null,
	error_summary text not null,
	started_at text,
	ended_at text
);

create index if not exists idx_v2_core_tool_executions_task_id on v2_core_tool_executions(task_id);
create index if not exists idx_v2_core_tool_executions_tool_id on v2_core_tool_executions(tool_id);

create table if not exists v2_core_evaluation_scenarios (
	id text primary key,
	project_id text references v2_core_projects(id),
	title text not null,
	capability_name text not null,
	prompt_or_task text not null,
	rubric text not null,
	status text not null check (status in (${sqlStringList(V2_CORE_EVALUATION_SCENARIO_STATUSES)})),
	version text not null
);

create index if not exists idx_v2_core_evaluation_scenarios_project_id
	on v2_core_evaluation_scenarios(project_id);

create table if not exists v2_core_evaluation_results (
	id text primary key,
	scenario_id text not null references v2_core_evaluation_scenarios(id),
	task_id text not null references v2_core_tasks(id),
	run_id text references v2_core_runs(id),
	tool_execution_id text references v2_core_tool_executions(id),
	provider_id text references v2_core_model_providers(id),
	model_id text,
	status text not null check (status in (${sqlStringList(V2_CORE_EVALUATION_RESULT_STATUSES)})),
	score real,
	rubric_summary text not null,
	result_summary text not null,
	failure_summary text not null,
	created_at text not null
);

create index if not exists idx_v2_core_evaluation_results_task_id
	on v2_core_evaluation_results(task_id);
create index if not exists idx_v2_core_evaluation_results_scenario_id
	on v2_core_evaluation_results(scenario_id);

create table if not exists v2_core_source_references (
	record_table text not null,
	record_id text not null,
	source_system text not null,
	source_collection text not null,
	source_id text not null,
	field text not null,
	note text not null,
	primary key (record_table, record_id, source_system, source_collection, source_id, field)
);
`);
}

export function openV2CoreDb(options: V2CoreDbOptions = {}) {
	const coreDbFile = assertV2CoreDbFileAllowed(options);
	mkdirSync(dirname(coreDbFile), { recursive: true });

	const db = new Database(coreDbFile);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	db.pragma('busy_timeout = 5000');
	db.pragma('synchronous = NORMAL');
	applyV2CoreSchema(db);

	return db;
}

export function openExistingV2CoreDbForWrite(options: V2CoreDbOptions = {}) {
	const coreDbFile = assertV2CoreDbFileAllowed(options);

	if (!existsSync(coreDbFile)) {
		throw new Error(`V2 core database does not exist: ${coreDbFile}`);
	}

	const db = new Database(coreDbFile, { fileMustExist: true });
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	db.pragma('busy_timeout = 5000');
	db.pragma('synchronous = NORMAL');
	applyV2CoreSchema(db);

	return db;
}

export function openV2CoreDbReadonly(options: V2CoreDbOptions = {}) {
	const coreDbFile = assertV2CoreDbFileAllowed(options);

	if (!existsSync(coreDbFile)) {
		throw new Error(`V2 core database does not exist: ${coreDbFile}`);
	}

	const db = new Database(coreDbFile, {
		readonly: true,
		fileMustExist: true
	});
	db.pragma('foreign_keys = ON');
	db.pragma('busy_timeout = 5000');

	return db;
}
