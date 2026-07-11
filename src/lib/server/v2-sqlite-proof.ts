import type Database from 'better-sqlite3';
import {
	validateV2ImportDraft,
	type V2ImportDraftValidationResult
} from './v2-import-draft-validator.ts';
import type { V2ImportDraft, V2ImportSourceRef } from './v2-import-mapper.ts';

export type V2SqliteProofLoadResult = {
	validation: V2ImportDraftValidationResult;
	counts: Record<string, number>;
};

const V2_SCHEMA_SQL = `
create table if not exists v2_import_sources (
	record_table text not null,
	record_id text not null,
	source_system text not null,
	source_collection text not null,
	source_id text not null,
	primary key (record_table, record_id)
);

create table if not exists v2_projects (
	id text primary key,
	name text not null,
	summary text not null,
	defaults_json text not null
);

create table if not exists v2_project_root_paths (
	project_id text not null references v2_projects(id) on delete cascade,
	position integer not null,
	path text not null,
	primary key (project_id, position)
);

create table if not exists v2_project_memory_sources (
	project_id text not null references v2_projects(id) on delete cascade,
	source_kind text not null,
	content text not null,
	primary key (project_id, source_kind)
);

create table if not exists v2_goals (
	id text primary key,
	project_id text not null references v2_projects(id),
	parent_goal_id text,
	title text not null,
	summary text not null,
	success_criteria text not null,
	status text not null,
	priority integer not null,
	target_date text
);

create index if not exists idx_v2_goals_project_id on v2_goals(project_id);

create table if not exists v2_tasks (
	id text primary key,
	project_id text not null references v2_projects(id),
	goal_id text not null references v2_goals(id),
	parent_task_id text,
	title text not null,
	summary text not null,
	scope text not null,
	non_goals text not null,
	success_criteria text not null,
	ready_condition text not null,
	expected_outcome text not null,
	validation_plan text not null,
	status text not null,
	priority text not null,
	risk_level text not null,
	readiness_level text,
	autonomy_level text,
	review_requirement text,
	approval_mode text not null,
	artifact_source_count integer not null
);

create index if not exists idx_v2_tasks_goal_id on v2_tasks(goal_id);
create index if not exists idx_v2_tasks_status on v2_tasks(status);

create table if not exists v2_task_candidate_requirements (
	task_id text not null references v2_tasks(id) on delete cascade,
	requirement_type text not null,
	position integer not null,
	name text not null,
	primary key (task_id, requirement_type, position)
);

create table if not exists v2_task_dependencies (
	id text primary key,
	task_id text not null references v2_tasks(id) on delete cascade,
	depends_on_task_id text not null references v2_tasks(id),
	status text not null check (status in ('resolved', 'unresolved')),
	reason text not null
);

create table if not exists v2_work_sessions (
	id text primary key,
	project_id text not null references v2_projects(id),
	provider_id text,
	external_thread_id text not null
);

create table if not exists v2_work_session_tasks (
	work_session_id text not null references v2_work_sessions(id) on delete cascade,
	task_id text not null references v2_tasks(id) on delete cascade,
	primary key (work_session_id, task_id)
);

create table if not exists v2_runs (
	id text primary key,
	task_id text not null references v2_tasks(id),
	work_session_id text references v2_work_sessions(id),
	provider_id text,
	execution_surface_id text,
	status text not null,
	started_at text,
	ended_at text,
	input_summary text not null,
	action_summary text not null,
	result_summary text not null,
	validation_summary text not null,
	blocker_summary text not null,
	model_json text not null,
	usage_json text not null,
	artifact_path_count integer not null
);

create index if not exists idx_v2_runs_task_id on v2_runs(task_id);
create index if not exists idx_v2_runs_work_session_id on v2_runs(work_session_id);

create table if not exists v2_work_session_runs (
	work_session_id text not null references v2_work_sessions(id) on delete cascade,
	run_id text not null references v2_runs(id) on delete cascade,
	primary key (work_session_id, run_id)
);

create table if not exists v2_reviews (
	id text primary key,
	task_id text not null references v2_tasks(id),
	run_id text references v2_runs(id),
	status text not null,
	summary text not null,
	created_at text not null,
	resolved_at text
);

create table if not exists v2_approvals (
	id text primary key,
	task_id text not null references v2_tasks(id),
	run_id text references v2_runs(id),
	mode text not null,
	status text not null,
	summary text not null,
	created_at text not null,
	resolved_at text
);

create table if not exists v2_decisions (
	id text primary key,
	task_id text references v2_tasks(id),
	goal_id text references v2_goals(id),
	run_id text references v2_runs(id),
	review_id text references v2_reviews(id),
	approval_id text references v2_approvals(id),
	decision_type text not null,
	summary text not null,
	created_at text not null
);

create table if not exists v2_artifacts (
	id text primary key,
	project_id text not null references v2_projects(id),
	task_id text references v2_tasks(id),
	run_id text references v2_runs(id),
	uri text not null,
	role text not null,
	title text not null,
	content_type text,
	size_bytes integer,
	exists_flag integer,
	source_reference_count integer not null
);

create unique index if not exists idx_v2_artifacts_uri on v2_artifacts(uri);

create table if not exists v2_artifact_source_references (
	artifact_id text not null references v2_artifacts(id) on delete cascade,
	position integer not null,
	source_collection text not null,
	source_id text not null,
	field text not null,
	primary key (artifact_id, position)
);
`;

const COUNT_QUERIES = {
	projects: 'select count(*) as count from v2_projects',
	goals: 'select count(*) as count from v2_goals',
	tasks: 'select count(*) as count from v2_tasks',
	taskDependencies: 'select count(*) as count from v2_task_dependencies',
	workSessions: 'select count(*) as count from v2_work_sessions',
	runs: 'select count(*) as count from v2_runs',
	workSessionRuns: 'select count(*) as count from v2_work_session_runs',
	reviews: 'select count(*) as count from v2_reviews',
	approvals: 'select count(*) as count from v2_approvals',
	decisions: 'select count(*) as count from v2_decisions',
	artifactCandidates: 'select count(*) as count from v2_artifacts',
	artifactSourceReferences: 'select count(*) as count from v2_artifact_source_references',
	importSources: 'select count(*) as count from v2_import_sources',
	candidateRequirements: 'select count(*) as count from v2_task_candidate_requirements',
	projectRootPaths: 'select count(*) as count from v2_project_root_paths',
	projectMemorySources: 'select count(*) as count from v2_project_memory_sources'
} as const;

export function applyV2SqliteProofSchema(db: Database.Database) {
	db.pragma('foreign_keys = ON');
	db.exec(V2_SCHEMA_SQL);
}

function insertSource(
	db: Database.Database,
	recordTable: string,
	recordId: string,
	source: V2ImportSourceRef
) {
	db.prepare(
		`
			insert into v2_import_sources (
				record_table,
				record_id,
				source_system,
				source_collection,
				source_id
			) values (?, ?, ?, ?, ?)
		`
	).run(recordTable, recordId, source.system, source.collection, source.id);
}

function insertPositionedValues(
	db: Database.Database,
	sql: string,
	parentId: string,
	values: string[]
) {
	const statement = db.prepare(sql);

	values.forEach((value, index) => {
		statement.run(parentId, index, value);
	});
}

function insertTaskCandidateRequirements(
	db: Database.Database,
	taskId: string,
	requirementType: 'capability' | 'tool' | 'skill',
	names: string[]
) {
	const statement = db.prepare(
		`
			insert into v2_task_candidate_requirements (
				task_id,
				requirement_type,
				position,
				name
			) values (?, ?, ?, ?)
		`
	);

	names.forEach((name, index) => {
		statement.run(taskId, requirementType, index, name);
	});
}

export function loadV2ImportDraftIntoSqliteProof(
	db: Database.Database,
	draft: V2ImportDraft
): V2SqliteProofLoadResult {
	const validation = validateV2ImportDraft(draft);
	if (!validation.valid) {
		return {
			validation,
			counts: {}
		};
	}

	applyV2SqliteProofSchema(db);

	const load = db.transaction(() => {
		for (const project of draft.projects) {
			db.prepare(
				`
					insert into v2_projects (id, name, summary, defaults_json)
					values (?, ?, ?, ?)
				`
			).run(project.id, project.name, project.summary, JSON.stringify(project.defaults));
			insertSource(db, 'v2_projects', project.id, project.source);
			insertPositionedValues(
				db,
				`
					insert into v2_project_root_paths (project_id, position, path)
					values (?, ?, ?)
				`,
				project.id,
				project.rootPaths
			);

			const memoryStatement = db.prepare(
				`
					insert into v2_project_memory_sources (project_id, source_kind, content)
					values (?, ?, ?)
				`
			);
			for (const [sourceKind, content] of Object.entries(project.memorySources)) {
				memoryStatement.run(project.id, sourceKind, content);
			}
		}

		for (const goal of draft.goals) {
			db.prepare(
				`
					insert into v2_goals (
						id,
						project_id,
						parent_goal_id,
						title,
						summary,
						success_criteria,
						status,
						priority,
						target_date
					) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`
			).run(
				goal.id,
				goal.projectId,
				goal.parentGoalId,
				goal.title,
				goal.summary,
				goal.successCriteria,
				goal.status,
				goal.priority,
				goal.targetDate
			);
			insertSource(db, 'v2_goals', goal.id, goal.source);
		}

		for (const task of draft.tasks) {
			db.prepare(
				`
					insert into v2_tasks (
						id,
						project_id,
						goal_id,
						parent_task_id,
						title,
						summary,
						scope,
						non_goals,
						success_criteria,
						ready_condition,
						expected_outcome,
						validation_plan,
						status,
						priority,
						risk_level,
						readiness_level,
						autonomy_level,
						review_requirement,
						approval_mode,
						artifact_source_count
					) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`
			).run(
				task.id,
				task.projectId,
				task.goalId,
				task.parentTaskId,
				task.title,
				task.summary,
				task.scope,
				task.nonGoals,
				task.successCriteria,
				task.readyCondition,
				task.expectedOutcome,
				task.validationPlan,
				task.status,
				task.priority,
				task.riskLevel,
				task.readinessLevel,
				task.autonomyLevel,
				task.reviewRequirement,
				task.approvalMode,
				task.artifactSourceCount
			);
			insertSource(db, 'v2_tasks', task.id, task.source);
			insertTaskCandidateRequirements(db, task.id, 'capability', task.candidateCapabilityNames);
			insertTaskCandidateRequirements(db, task.id, 'tool', task.candidateToolNames);
			insertTaskCandidateRequirements(db, task.id, 'skill', task.candidateSkillNames);
		}

		for (const dependency of draft.taskDependencies) {
			db.prepare(
				`
					insert into v2_task_dependencies (
						id,
						task_id,
						depends_on_task_id,
						status,
						reason
					) values (?, ?, ?, ?, ?)
				`
			).run(
				dependency.id,
				dependency.taskId,
				dependency.dependsOnTaskId,
				dependency.status,
				dependency.reason
			);
			insertSource(db, 'v2_task_dependencies', dependency.id, dependency.source);
		}

		for (const session of draft.workSessions) {
			db.prepare(
				`
					insert into v2_work_sessions (
						id,
						project_id,
						provider_id,
						external_thread_id
					) values (?, ?, ?, ?)
				`
			).run(session.id, session.projectId, session.providerId, session.externalThreadId);
			insertSource(db, 'v2_work_sessions', session.id, session.source);

			const sessionTaskStatement = db.prepare(
				`
					insert into v2_work_session_tasks (work_session_id, task_id)
					values (?, ?)
				`
			);
			for (const taskId of session.taskIds) {
				sessionTaskStatement.run(session.id, taskId);
			}
		}

		for (const run of draft.runs) {
			db.prepare(
				`
					insert into v2_runs (
						id,
						task_id,
						work_session_id,
						provider_id,
						execution_surface_id,
						status,
						started_at,
						ended_at,
						input_summary,
						action_summary,
						result_summary,
						validation_summary,
						blocker_summary,
						model_json,
						usage_json,
						artifact_path_count
					) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`
			).run(
				run.id,
				run.taskId,
				run.workSessionId,
				run.providerId,
				run.executionSurfaceId,
				run.status,
				run.startedAt,
				run.endedAt,
				run.inputSummary,
				run.actionSummary,
				run.resultSummary,
				run.validationSummary,
				run.blockerSummary,
				JSON.stringify(run.model),
				JSON.stringify(run.usage),
				run.artifactPathCount
			);
			insertSource(db, 'v2_runs', run.id, run.source);
		}

		for (const session of draft.workSessions) {
			const statement = db.prepare(
				`
					insert into v2_work_session_runs (work_session_id, run_id)
					values (?, ?)
				`
			);
			for (const runId of session.runIds) {
				statement.run(session.id, runId);
			}
		}

		for (const review of draft.reviews) {
			db.prepare(
				`
					insert into v2_reviews (
						id,
						task_id,
						run_id,
						status,
						summary,
						created_at,
						resolved_at
					) values (?, ?, ?, ?, ?, ?, ?)
				`
			).run(
				review.id,
				review.taskId,
				review.runId,
				review.status,
				review.summary,
				review.createdAt,
				review.resolvedAt
			);
			insertSource(db, 'v2_reviews', review.id, review.source);
		}

		for (const approval of draft.approvals) {
			db.prepare(
				`
					insert into v2_approvals (
						id,
						task_id,
						run_id,
						mode,
						status,
						summary,
						created_at,
						resolved_at
					) values (?, ?, ?, ?, ?, ?, ?, ?)
				`
			).run(
				approval.id,
				approval.taskId,
				approval.runId,
				approval.mode,
				approval.status,
				approval.summary,
				approval.createdAt,
				approval.resolvedAt
			);
			insertSource(db, 'v2_approvals', approval.id, approval.source);
		}

		for (const decision of draft.decisions) {
			db.prepare(
				`
					insert into v2_decisions (
						id,
						task_id,
						goal_id,
						run_id,
						review_id,
						approval_id,
						decision_type,
						summary,
						created_at
					) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`
			).run(
				decision.id,
				decision.taskId,
				decision.goalId,
				decision.runId,
				decision.reviewId,
				decision.approvalId,
				decision.decisionType,
				decision.summary,
				decision.createdAt
			);
			insertSource(db, 'v2_decisions', decision.id, decision.source);
		}

		for (const artifact of draft.artifactCandidates) {
			db.prepare(
				`
					insert into v2_artifacts (
						id,
						project_id,
						task_id,
						run_id,
						uri,
						role,
						title,
						content_type,
						size_bytes,
						exists_flag,
						source_reference_count
					) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`
			).run(
				artifact.id,
				artifact.projectId,
				artifact.taskId,
				artifact.runId,
				artifact.uri,
				artifact.role,
				artifact.title,
				artifact.contentType,
				artifact.sizeBytes,
				artifact.exists === null ? null : Number(artifact.exists),
				artifact.sourceReferenceCount
			);
			insertSource(db, 'v2_artifacts', artifact.id, artifact.source);

			const sourceReferenceStatement = db.prepare(
				`
					insert into v2_artifact_source_references (
						artifact_id,
						position,
						source_collection,
						source_id,
						field
					) values (?, ?, ?, ?, ?)
				`
			);
			artifact.sourceReferences.forEach((sourceReference, index) => {
				sourceReferenceStatement.run(
					artifact.id,
					index,
					sourceReference.collection,
					sourceReference.id,
					sourceReference.field
				);
			});
		}
	});

	load();

	return {
		validation,
		counts: readV2SqliteProofCounts(db)
	};
}

export function readV2SqliteProofCounts(db: Database.Database): Record<string, number> {
	return Object.fromEntries(
		Object.entries(COUNT_QUERIES).map(([name, query]) => {
			const row = db.prepare<[], { count: number }>(query).get();
			return [name, row?.count ?? 0];
		})
	);
}
