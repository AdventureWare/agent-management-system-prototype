#!/usr/bin/env node

import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import {
	assertV2CoreDbFileAllowed,
	openExistingV2CoreDbForWrite,
	openV2CoreDb
} from '../src/lib/server/v2-core-persistence.ts';
import {
	attachV2CoreArtifact,
	completeV2CoreProviderRun,
	completeV2CoreManagedRunLifecycle,
	createV2CoreFollowupTask,
	createV2CoreGoal,
	createV2CoreProject,
	createV2CoreTask,
	exportV2CoreSnapshot,
	importV2CoreSnapshot,
	launchV2CoreAgentExecutionCycle,
	launchV2CoreProviderRun,
	readV2CoreAgentPreparationPacket,
	promoteV2CoreMemory,
	readV2CoreAgentWorkPacket,
	readV2CoreCloseoutPacket,
	readV2CoreDependencyReport,
	readV2CoreDependencyReductionReport,
	readV2CoreEvaluationContext,
	readV2CoreGoalContinuityAudit,
	readV2CoreGoalTriage,
	readV2CoreContextBundle,
	readV2CoreLocalRetrieval,
	readV2CoreMemoryForContext,
	readV2CoreNextWork,
	readV2CoreOperatorConsole,
	readV2CoreOverview,
	readV2CoreRouteComparisonReport,
	readV2CoreRoutingEvidence,
	readV2CoreTaskDetail,
	readV2CoreUnreviewedOutputs,
	recordV2CoreToolExecution,
	recordV2CoreDecision,
	recordV2CoreEvaluationResult,
	recordV2CoreReview,
	recordV2CoreRun,
	recordV2CoreTaskDependency,
	registerV2CoreEvaluationScenario,
	registerV2CoreModelProvider,
	registerV2CoreTool,
	transitionV2CoreGoalStatus,
	transitionV2CoreTaskStatus
} from '../src/lib/server/v2-core-service.ts';

type Command =
	| 'init'
	| 'overview'
	| 'inspect-task'
	| 'next-work'
	| 'goal-triage'
	| 'goal-continuity-audit'
	| 'context-bundle'
	| 'agent-work-packet'
	| 'agent-preparation-packet'
	| 'evaluation-context'
	| 'memory-for-context'
	| 'unreviewed-outputs'
	| 'dependency-report'
	| 'dependency-reduction-report'
	| 'operator-console'
	| 'agent-control'
	| 'agent-execution-cycle'
	| 'closeout-packet'
	| 'search-context'
	| 'route-comparison-report'
	| 'routing-evidence'
	| 'export-snapshot'
	| 'import-snapshot'
	| 'create-project'
	| 'create-goal'
	| 'create-task'
	| 'create-followup-task'
	| 'register-provider'
	| 'register-tool'
	| 'register-evaluation-scenario'
	| 'record-task-dependency'
	| 'record-evaluation-result'
	| 'launch-provider-run'
	| 'complete-provider-run'
	| 'managed-run-lifecycle'
	| 'transition-goal'
	| 'transition-task'
	| 'record-run'
	| 'record-tool-execution'
	| 'attach-artifact'
	| 'record-review'
	| 'record-decision'
	| 'promote-memory';

type Options = {
	command: Command | null;
	dbFile: string | null;
	id: string | null;
	projectId: string | null;
	goalId: string | null;
	parentGoalId: string | null;
	taskId: string | null;
	dependsOnTaskId: string | null;
	runId: string | null;
	providerId: string | null;
	scenarioId: string | null;
	modelId: string | null;
	toolId: string | null;
	toolExecutionId: string | null;
	artifactId: string | null;
	reviewId: string | null;
	name: string | null;
	title: string | null;
	summary: string | null;
	body: string | null;
	status: string | null;
	workspaceRoot: string | null;
	filePath: string | null;
	description: string | null;
	capabilityName: string | null;
	promptOrTask: string | null;
	rubric: string | null;
	version: string | null;
	kind: string | null;
	riskLevel: string | null;
	approvalRequirement: string | null;
	successCriteria: string | null;
	validationPlan: string | null;
	inputSummary: string | null;
	actionSummary: string | null;
	resultSummary: string | null;
	errorSummary: string | null;
	uri: string | null;
	role: string | null;
	decisionType: string | null;
	rationale: string | null;
	sourceTable: string | null;
	sourceId: string | null;
	sourceReason: string | null;
	query: string | null;
	score: number | null;
	limit: number;
	limitExplicit: boolean;
	compact: boolean;
	reset: boolean;
	json: boolean;
	help: boolean;
	agentControlAction: string | null;
	mode: string | null;
	decisionId: string | null;
	followupTaskId: string | null;
	followupTitle: string | null;
	followupSuccessCriteria: string | null;
	followupValidationPlan: string | null;
	followupRationale: string | null;
	dryRun: boolean;
};

function printHelp() {
	process.stdout.write(
		[
			'Usage: node --experimental-strip-types scripts/v2-core-db.ts <command> [options]',
			'',
			'Commands:',
			'  init                 Create the isolated v2 core database and schema.',
			'  overview             Read project/status counts.',
			'  inspect-task         Read one task with run/artifact/review/decision/memory evidence.',
			'  next-work            Read ready/review/blocked task candidates.',
			'  goal-triage          Read goal dispatch hygiene and suggested next action.',
			'  goal-continuity-audit Read read-only project/goal continuity risks.',
			'  context-bundle       Build a computed source-linked context bundle for a task.',
			'  agent-work-packet    Build a bounded source-linked agent handoff packet for a task.',
			'  agent-preparation-packet Build a relevance-controlled agent preparation packet for a task.',
			'  evaluation-context   Read evaluation scenarios/results for a project or task.',
			'  memory-for-context   Read governed memory for a project or task context.',
			'  unreviewed-outputs   List submitted artifacts without approved/rejected review.',
			'  dependency-report    Read model-provider and tool usage for a project/goal/task.',
			'  dependency-reduction-report Read capability-level external-AI dependency status.',
			'  operator-console     Read consolidated operator state from existing v2 core records.',
			'  agent-control        Thin agent-facing surface over the v2 core work loop.',
			'  agent-execution-cycle Select active-goal work, launch a provider run, and return closeout guidance.',
			'  closeout-packet      Build deterministic managed-run closeout inputs for a task/run.',
			'  search-context       Search existing v2 core records with source-linked results.',
			'  route-comparison-report Read capability-level route comparison evidence.',
			'  routing-evidence     Read route-selection Decision evidence.',
			'  export-snapshot      Export deterministic v2 core JSON snapshot.',
			'  import-snapshot      Import snapshot into an empty v2 core database.',
			'  create-project       Create a v2 core project.',
			'  create-goal          Create a v2 core goal.',
			'  create-task          Create a v2 core task.',
			'  create-followup-task Create a task linked to a source task and decision.',
			'  register-provider    Register a model provider used by runs.',
			'  register-tool        Register an executable tool affordance.',
			'  register-evaluation-scenario Register a reusable evaluation scenario.',
			'  record-task-dependency Record one task prerequisite relation.',
			'  launch-provider-run Launch a provider-backed run and return its work packet.',
			'  complete-provider-run Complete or fail an existing planned provider run.',
			'  managed-run-lifecycle Complete a managed provider run through existing review/acceptance operations.',
			'  transition-goal     Move a goal through the accepted lifecycle statuses.',
			'  transition-task      Move a task through the constrained lifecycle.',
			'  record-run           Record a task run.',
			'  record-tool-execution Record tool usage for a task/run.',
			'  record-evaluation-result Record scenario-linked evaluation evidence.',
			'  attach-artifact      Attach an artifact to a task/run.',
			'  record-review        Record review evidence.',
			'  record-decision      Record a decision.',
			'  promote-memory       Promote reviewed evidence to memory.',
			'',
			'Options:',
			'  --db <path>          Defaults to data/v2-core.sqlite.',
			'  --id <id>            Explicit id for the created record.',
			'  --project <id>       Project id.',
			'  --goal <id>          Goal id.',
			'  --parent-goal <id>   Parent goal id for create-goal.',
			'  --task <id>          Task id.',
			'  --depends-on <id>    Dependency task id for record-task-dependency.',
			'  --run <id>           Run id.',
			'  --provider <id>      Model provider id.',
			'  --scenario <id>      Evaluation scenario id.',
			'  --model <id>         Model label/id for evaluation evidence.',
			'  --tool <id>          Tool id.',
			'  --tool-execution <id> Tool execution id for evaluation evidence.',
			'  --artifact <id>      Artifact id.',
			'  --review <id>        Review id.',
			'  --name <text>        Project/provider/tool name.',
			'  --title <text>       Goal/task/artifact/memory title.',
			'  --summary <text>     Summary text.',
			'  --body <text>        Memory body.',
			'  --status <text>      Lifecycle status.',
			'  --workspace-root <path> Project workspace root.',
			'  --file <path>        Snapshot input/output file.',
			'  --description <text> Tool description.',
			'  --capability <text>  Evaluation capability name.',
			'  --prompt <text>      Evaluation prompt/task.',
			'  --rubric <text>      Evaluation rubric.',
			'  --version <text>     Evaluation scenario version.',
			'  --kind <text>        Provider/tool kind.',
			'  --risk <text>        Tool risk level. Default: medium.',
			'  --approval <text>    Tool approval requirement. Default: none.',
			'  --success <text>     Success criteria.',
			'  --validation <text>  Validation plan or validation summary.',
			'  --input <text>       Run/tool input summary.',
			'  --action <text>      Run action summary.',
			'  --result <text>      Run result summary.',
			'  --error <text>       Tool error summary.',
			'  --uri <text>         Artifact URI/path.',
			'  --role <text>        Artifact role. Default: output.',
			'  --type <text>        Decision type.',
			'  --rationale <text>   Decision rationale.',
			'  --source-table <name> Memory source table.',
			'  --source-id <id>     Memory source id.',
			'  --source-reason <text> Memory source reason.',
			'  --query <text>       Local retrieval query.',
			'  --score <number>     Scenario-scoped evaluation score.',
			'  --limit <number>     Result limit for next-work. Default: 10.',
			'  --compact            Return compact agent-control next/packet readbacks.',
			'  --mode <text>        Lifecycle helper mode. Currently: complete.',
			'  --decision <id>      Explicit decision id when --id is used for another record.',
			'  --followup-task <id> Optional follow-up task id for lifecycle closeout.',
			'  --followup-title <text> Optional follow-up task title.',
			'  --followup-success <text> Optional follow-up success criteria.',
			'  --followup-validation <text> Optional follow-up validation plan.',
			'  --followup-rationale <text> Optional follow-up source reason.',
			'  --agent-action <text> Agent-control action: next, packet, closeout-packet, search, route-comparison-report, routing-evidence, execution-cycle, start, launch-provider-run, complete-provider-run, managed-run-lifecycle, record-run, record-tool, attach-artifact, submit-review, accept-output, follow-up.',
			'  --dry-run            Validate lifecycle helper inputs and return planned writes without mutating state.',
			'  --reset              Delete an existing DB before init.',
			'  --json               Print machine-readable JSON.',
			'  --help               Show this help.',
			'',
			'This command is v2 core storage only. It refuses data/app.sqlite and data/v2-preview.sqlite.'
		].join('\n') + '\n'
	);
}

function parseArgs(argv: string[]): Options {
	const options: Options = {
		command: null,
		dbFile: null,
		id: null,
		projectId: null,
		goalId: null,
		parentGoalId: null,
		taskId: null,
		dependsOnTaskId: null,
		runId: null,
		providerId: null,
		scenarioId: null,
		modelId: null,
		toolId: null,
		toolExecutionId: null,
		artifactId: null,
		reviewId: null,
		name: null,
		title: null,
		summary: null,
		body: null,
		status: null,
		workspaceRoot: null,
		filePath: null,
		description: null,
		capabilityName: null,
		promptOrTask: null,
		rubric: null,
		version: null,
		kind: null,
		riskLevel: null,
		approvalRequirement: null,
		successCriteria: null,
		validationPlan: null,
		inputSummary: null,
		actionSummary: null,
		resultSummary: null,
		errorSummary: null,
		uri: null,
		role: null,
		decisionType: null,
		rationale: null,
		sourceTable: null,
		sourceId: null,
		sourceReason: null,
		query: null,
		score: null,
		limit: 10,
		limitExplicit: false,
		compact: false,
		reset: false,
		json: false,
		help: false,
		agentControlAction: null,
		mode: null,
		decisionId: null,
		followupTaskId: null,
		followupTitle: null,
		followupSuccessCriteria: null,
		followupValidationPlan: null,
		followupRationale: null,
		dryRun: false
	};

	const args = [...argv];
	const command = args.shift();
	if (command && !command.startsWith('--')) {
		options.command = command as Command;
	} else if (command) {
		args.unshift(command);
	}

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		const next = () => {
			const value = args[index + 1];
			if (!value || value.startsWith('--')) {
				throw new Error(`Missing value for ${arg}.`);
			}
			index += 1;
			return value;
		};

		switch (arg) {
			case '--db':
				options.dbFile = next();
				break;
			case '--id':
				options.id = next();
				break;
			case '--project':
				options.projectId = next();
				break;
			case '--goal':
				options.goalId = next();
				break;
			case '--parent-goal':
				options.parentGoalId = next();
				break;
			case '--task':
				options.taskId = next();
				break;
			case '--depends-on':
				options.dependsOnTaskId = next();
				break;
			case '--run':
				options.runId = next();
				break;
			case '--provider':
				options.providerId = next();
				break;
			case '--scenario':
				options.scenarioId = next();
				break;
			case '--model':
				options.modelId = next();
				break;
			case '--tool':
				options.toolId = next();
				break;
			case '--tool-execution':
				options.toolExecutionId = next();
				break;
			case '--artifact':
				options.artifactId = next();
				break;
			case '--review':
				options.reviewId = next();
				break;
			case '--name':
				options.name = next();
				break;
			case '--title':
				options.title = next();
				break;
			case '--summary':
				options.summary = next();
				break;
			case '--body':
				options.body = next();
				break;
			case '--status':
				options.status = next();
				break;
			case '--workspace-root':
				options.workspaceRoot = next();
				break;
			case '--file':
				options.filePath = next();
				break;
			case '--description':
				options.description = next();
				break;
			case '--capability':
				options.capabilityName = next();
				break;
			case '--prompt':
				options.promptOrTask = next();
				break;
			case '--rubric':
				options.rubric = next();
				break;
			case '--version':
				options.version = next();
				break;
			case '--kind':
				options.kind = next();
				break;
			case '--risk':
				options.riskLevel = next();
				break;
			case '--approval':
				options.approvalRequirement = next();
				break;
			case '--success':
				options.successCriteria = next();
				break;
			case '--validation':
				options.validationPlan = next();
				break;
			case '--input':
				options.inputSummary = next();
				break;
			case '--action':
				options.actionSummary = next();
				break;
			case '--result':
				options.resultSummary = next();
				break;
			case '--error':
				options.errorSummary = next();
				break;
			case '--uri':
				options.uri = next();
				break;
			case '--role':
				options.role = next();
				break;
			case '--type':
				options.decisionType = next();
				break;
			case '--rationale':
				options.rationale = next();
				break;
			case '--source-table':
				options.sourceTable = next();
				break;
			case '--source-id':
				options.sourceId = next();
				break;
			case '--source-reason':
				options.sourceReason = next();
				break;
			case '--query':
				options.query = next();
				break;
			case '--score':
				options.score = Number.parseFloat(next());
				break;
			case '--limit':
				options.limit = Number.parseInt(next(), 10);
				options.limitExplicit = true;
				break;
			case '--compact':
				options.compact = true;
				break;
			case '--agent-action':
				options.agentControlAction = next();
				break;
			case '--mode':
				options.mode = next();
				break;
			case '--decision':
				options.decisionId = next();
				break;
			case '--followup-task':
				options.followupTaskId = next();
				break;
			case '--followup-title':
				options.followupTitle = next();
				break;
			case '--followup-success':
				options.followupSuccessCriteria = next();
				break;
			case '--followup-validation':
				options.followupValidationPlan = next();
				break;
			case '--followup-rationale':
				options.followupRationale = next();
				break;
			case '--dry-run':
				options.dryRun = true;
				break;
			case '--reset':
				options.reset = true;
				break;
			case '--json':
				options.json = true;
				break;
			case '--help':
				options.help = true;
				break;
			default:
				throw new Error(`Unknown option: ${arg}`);
		}
	}

	return options;
}

function requireOption(value: string | null, name: string) {
	if (!value) {
		throw new Error(`Missing ${name}.`);
	}

	return value;
}

function managedRunLifecycleCompleteInput(options: Options) {
	return {
		taskId: requireOption(options.taskId, '--task <id>'),
		runId: requireOption(options.runId, '--run <id>'),
		artifactId: requireOption(options.artifactId, '--artifact <id>'),
		artifactUri: requireOption(options.uri, '--uri <text>'),
		artifactTitle: requireOption(options.title, '--title <text>'),
		resultSummary: requireOption(options.resultSummary ?? options.summary, '--result <text>'),
		validationSummary: requireOption(options.validationPlan, '--validation <text>'),
		reviewId: requireOption(options.reviewId, '--review <id>'),
		acceptDecisionId: requireOption(options.decisionId ?? options.id, '--decision <id>'),
		toolExecutionId: options.toolExecutionId,
		toolId: options.toolId,
		toolInputSummary: options.inputSummary,
		artifactSummary: options.summary,
		reviewSummary: options.summary,
		acceptanceRationale: options.rationale,
		artifactRole: options.role,
		followupTaskId: options.followupTaskId,
		followupTitle: options.followupTitle,
		followupSuccessCriteria: options.followupSuccessCriteria,
		followupValidationPlan: options.followupValidationPlan,
		followupRationale: options.followupRationale,
		dryRun: options.dryRun
	};
}

function printResult(value: unknown, json: boolean) {
	if (json) {
		process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
		return;
	}

	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function openForCommand(options: Options) {
	return openExistingV2CoreDbForWrite({ dbFile: options.dbFile ?? undefined });
}

function init(options: Options) {
	const dbFile = assertV2CoreDbFileAllowed({ dbFile: options.dbFile ?? undefined });

	if (options.reset) {
		rmSync(dbFile, { force: true });
		rmSync(`${dbFile}-shm`, { force: true });
		rmSync(`${dbFile}-wal`, { force: true });
	}

	const db = openV2CoreDb({ dbFile });
	try {
		printResult({ dbFile, overview: readV2CoreOverview(db) }, options.json);
	} finally {
		db.close();
	}
}

function overview(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(readV2CoreOverview(db), options.json);
	} finally {
		db.close();
	}
}

function inspectTask(options: Options) {
	const taskId = requireOption(options.taskId, '--task <id>');
	const db = openForCommand(options);
	try {
		const taskDetail = readV2CoreTaskDetail(db, taskId);
		if (!taskDetail) {
			throw new Error(`Task ${taskId} was not found in the v2 core database.`);
		}
		printResult({ taskDetail }, options.json);
	} finally {
		db.close();
	}
}

function nextWork(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			readV2CoreNextWork(db, {
				goalId: options.goalId,
				projectId: options.projectId,
				limit: Number.isFinite(options.limit) ? options.limit : 10
			}),
			options.json
		);
	} finally {
		db.close();
	}
}

function goalTriage(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				goalTriage: readV2CoreGoalTriage(db, {
					goalId: options.goalId,
					projectId: options.projectId,
					limit: options.limitExplicit && Number.isFinite(options.limit) ? options.limit : 50
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function goalContinuityAudit(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				goalContinuityAudit: readV2CoreGoalContinuityAudit(db, {
					projectId: options.projectId
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function contextBundle(options: Options) {
	const taskId = requireOption(options.taskId, '--task <id>');
	const db = openForCommand(options);
	try {
		const context = readV2CoreContextBundle(db, taskId);
		if (!context) {
			throw new Error(`Task ${taskId} was not found in the v2 core database.`);
		}
		printResult({ context }, options.json);
	} finally {
		db.close();
	}
}

function agentWorkPacket(options: Options) {
	const taskId = requireOption(options.taskId, '--task <id>');
	const db = openForCommand(options);
	try {
		const packet = readV2CoreAgentWorkPacket(db, taskId);
		if (!packet) {
			throw new Error(`Task ${taskId} was not found in the v2 core database.`);
		}
		printResult({ agentWorkPacket: packet }, options.json);
	} finally {
		db.close();
	}
}

function agentPreparationPacket(options: Options) {
	const taskId = requireOption(options.taskId, '--task <id>');
	const db = openForCommand(options);
	try {
		const packet = readV2CoreAgentPreparationPacket(db, taskId);
		if (!packet) {
			throw new Error(`Task ${taskId} was not found in the v2 core database.`);
		}
		printResult({ agentPreparationPacket: packet }, options.json);
	} finally {
		db.close();
	}
}

function evaluationContext(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				evaluationContext: readV2CoreEvaluationContext(db, {
					projectId: options.projectId,
					taskId: options.taskId
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function memoryForContext(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				memory: readV2CoreMemoryForContext(db, {
					projectId: options.projectId,
					taskId: options.taskId
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function unreviewedOutputs(options: Options) {
	const db = openForCommand(options);
	try {
		printResult({ outputs: readV2CoreUnreviewedOutputs(db) }, options.json);
	} finally {
		db.close();
	}
}

function dependencyReport(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				dependencyReport: readV2CoreDependencyReport(db, {
					projectId: options.projectId,
					goalId: options.goalId,
					taskId: options.taskId
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function dependencyReductionReport(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				dependencyReductionReport: readV2CoreDependencyReductionReport(db, {
					projectId: options.projectId,
					goalId: options.goalId,
					taskId: options.taskId
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function operatorConsole(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				operatorConsole: readV2CoreOperatorConsole(db, {
					projectId: options.projectId,
					goalId: options.goalId,
					limit: Number.isFinite(options.limit) ? options.limit : 5
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function searchContext(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				retrieval: readV2CoreLocalRetrieval(db, {
					query: requireOption(options.query, '--query <text>'),
					projectId: options.projectId,
					goalId: options.goalId,
					taskId: options.taskId,
					limit: Number.isFinite(options.limit) ? options.limit : 10
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function routeComparisonReport(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				routeComparisonReport: readV2CoreRouteComparisonReport(db, {
					projectId: options.projectId,
					goalId: options.goalId,
					taskId: options.taskId
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function routingEvidence(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				routingEvidence: readV2CoreRoutingEvidence(db, {
					projectId: options.projectId,
					goalId: options.goalId,
					taskId: options.taskId,
					limit: Number.isFinite(options.limit) ? options.limit : 10
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function firstNextWorkTaskId(nextWorkResult: ReturnType<typeof readV2CoreNextWork>) {
	const candidate = nextWorkResult.candidates[0];

	if (!candidate) {
		return null;
	}

	return candidate.taskId;
}

type V2CoreAgentPacket = NonNullable<ReturnType<typeof readV2CoreAgentWorkPacket>>;

function compactAgentControlPacket(packet: V2CoreAgentPacket) {
	return {
		taskContract: packet.taskContract,
		readiness: packet.readiness,
		contextSources: packet.contextSources.slice(0, 6),
		currentRunState: packet.recentEvidence.currentTaskRuns.slice(0, 3),
		trustedMemory: packet.trustedMemory.slice(0, 5).map((item) => ({
			id: item.id,
			title: item.title,
			status: item.status,
			scope: item.scope
		})),
		sourceLinks: packet.sourceLinks.slice(0, 20),
		stoppingConditions: packet.stoppingConditions,
		counts: {
			contextSources: packet.contextSources.length,
			currentTaskRuns: packet.recentEvidence.currentTaskRuns.length,
			currentTaskArtifacts: packet.recentEvidence.currentTaskArtifacts.length,
			currentTaskReviews: packet.recentEvidence.currentTaskReviews.length,
			relevantDecisions: packet.relevantDecisions.length,
			trustedMemory: packet.trustedMemory.length,
			sourceLinks: packet.sourceLinks.length
		}
	};
}

type V2CoreAgentExecutionCycleResult = ReturnType<typeof launchV2CoreAgentExecutionCycle>;

function compactAgentExecutionCycle(cycle: V2CoreAgentExecutionCycleResult) {
	if (cycle.status !== 'launched') {
		return cycle;
	}

	return {
		...cycle,
		providerRunLaunch: {
			...cycle.providerRunLaunch,
			agentWorkPacket: compactAgentControlPacket(cycle.providerRunLaunch.agentWorkPacket)
		},
		fullOutputHint: 'Run the same command without --compact for the full work packet.'
	};
}

type V2CoreCloseoutPacketResult = NonNullable<ReturnType<typeof readV2CoreCloseoutPacket>>;

function compactCloseoutPacket(packet: V2CoreCloseoutPacketResult) {
	return {
		task: {
			id: packet.task.id,
			title: packet.task.title,
			status: packet.task.status
		},
		run: packet.run
			? {
					id: packet.run.id,
					status: packet.run.status,
					modelProviderId: packet.run.modelProviderId
				}
			: null,
		eligible: packet.eligible,
		blockers: packet.blockers,
		requiredInputs: packet.requiredInputs,
		humanAuthoredInputs: packet.humanAuthoredInputs,
		suggestedRecordIds: packet.suggestedRecordIds,
		gateState: packet.gateState,
		command: packet.command,
		validationChecklist: packet.validationChecklist,
		sourceLinks: packet.sourceLinks,
		fullOutputHint: 'Run the same command without --compact for full task/project/goal context.'
	};
}

function closeoutPacket(options: Options) {
	const taskId = requireOption(options.taskId, '--task <id>');
	const runId = requireOption(options.runId, '--run <id>');
	const db = openForCommand(options);
	try {
		const packet = readV2CoreCloseoutPacket(db, { taskId, runId });
		if (!packet) {
			throw new Error(`Task ${taskId} was not found in the v2 core database.`);
		}
		printResult(
			{
				closeoutPacket: options.compact ? compactCloseoutPacket(packet) : packet
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function launchAgentExecutionCycle(options: Options) {
	const db = openForCommand(options);
	try {
		const cycle = launchV2CoreAgentExecutionCycle(db, {
			runId: options.runId ?? options.id ?? undefined,
			decisionId: options.id && options.runId ? options.id : undefined,
			projectId: options.projectId,
			goalId: options.goalId,
			modelProviderId: requireOption(options.providerId, '--provider <id>'),
			inputSummary: options.inputSummary ?? undefined,
			actionSummary: options.actionSummary ?? undefined,
			limit: Number.isFinite(options.limit) ? options.limit : 10
		});
		printResult(
			{
				agentExecutionCycle: options.compact ? compactAgentExecutionCycle(cycle) : cycle
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function agentControl(options: Options) {
	const action = requireOption(options.agentControlAction, '--agent-action <text>');
	const db = openForCommand(options);
	try {
		if (action === 'next') {
			const nextWorkResult = readV2CoreNextWork(db, {
				goalId: options.goalId,
				projectId: options.projectId,
				limit: Number.isFinite(options.limit) ? options.limit : 10
			});
			const selectedTaskId = options.taskId ?? firstNextWorkTaskId(nextWorkResult);
			const selectedPacket = selectedTaskId ? readV2CoreAgentWorkPacket(db, selectedTaskId) : null;
			printResult(
				{
					agentControl: {
						action,
						outputMode: options.compact ? 'compact' : 'full',
						nextWork: nextWorkResult,
						selectedTaskId,
						selectedPacket:
							options.compact && selectedPacket
								? compactAgentControlPacket(selectedPacket)
								: selectedPacket,
						...(options.compact
							? { fullOutputHint: 'Run the same command without --compact for full packet output.' }
							: {})
					}
				},
				options.json
			);
			return;
		}

		if (action === 'packet') {
			const taskId = requireOption(options.taskId, '--task <id>');
			const selectedPacket = readV2CoreAgentWorkPacket(db, taskId);
			if (!selectedPacket) {
				throw new Error(`Task ${taskId} was not found in the v2 core database.`);
			}
			printResult(
				{
					agentControl: {
						action,
						outputMode: options.compact ? 'compact' : 'full',
						selectedTaskId: taskId,
						selectedPacket: options.compact
							? compactAgentControlPacket(selectedPacket)
							: selectedPacket,
						...(options.compact
							? { fullOutputHint: 'Run the same command without --compact for full packet output.' }
							: {})
					}
				},
				options.json
			);
			return;
		}

		if (action === 'closeout-packet') {
			const taskId = requireOption(options.taskId, '--task <id>');
			const runId = requireOption(options.runId, '--run <id>');
			const packet = readV2CoreCloseoutPacket(db, { taskId, runId });
			if (!packet) {
				throw new Error(`Task ${taskId} was not found in the v2 core database.`);
			}
			printResult(
				{
					agentControl: {
						action,
						outputMode: options.compact ? 'compact' : 'full',
						closeoutPacket: options.compact ? compactCloseoutPacket(packet) : packet
					}
				},
				options.json
			);
			return;
		}

		if (action === 'search') {
			printResult(
				{
					agentControl: {
						action,
						retrieval: readV2CoreLocalRetrieval(db, {
							query: requireOption(options.query, '--query <text>'),
							projectId: options.projectId,
							goalId: options.goalId,
							taskId: options.taskId,
							limit: Number.isFinite(options.limit) ? options.limit : 10
						})
					}
				},
				options.json
			);
			return;
		}

		if (action === 'route-comparison-report') {
			printResult(
				{
					agentControl: {
						action,
						routeComparisonReport: readV2CoreRouteComparisonReport(db, {
							projectId: options.projectId,
							goalId: options.goalId,
							taskId: options.taskId
						})
					}
				},
				options.json
			);
			return;
		}

		if (action === 'routing-evidence') {
			printResult(
				{
					agentControl: {
						action,
						routingEvidence: readV2CoreRoutingEvidence(db, {
							projectId: options.projectId,
							goalId: options.goalId,
							taskId: options.taskId,
							limit: Number.isFinite(options.limit) ? options.limit : 10
						})
					}
				},
				options.json
			);
			return;
		}

		if (action === 'execution-cycle') {
			const cycle = launchV2CoreAgentExecutionCycle(db, {
				runId: options.runId ?? options.id ?? undefined,
				decisionId: options.id && options.runId ? options.id : undefined,
				projectId: options.projectId,
				goalId: options.goalId,
				modelProviderId: requireOption(options.providerId, '--provider <id>'),
				inputSummary: options.inputSummary ?? undefined,
				actionSummary: options.actionSummary ?? undefined,
				limit: Number.isFinite(options.limit) ? options.limit : 10
			});
			printResult(
				{
					agentControl: {
						action,
						agentExecutionCycle: options.compact ? compactAgentExecutionCycle(cycle) : cycle
					}
				},
				options.json
			);
			return;
		}

		if (action === 'start') {
			const taskId = requireOption(options.taskId, '--task <id>');
			printResult(
				{
					agentControl: {
						action,
						taskDetail: transitionV2CoreTaskStatus(db, {
							decisionId: options.id ?? undefined,
							taskId,
							status: 'in_progress',
							summary: options.summary ?? 'Start task through v2 agent-control surface.'
						})
					}
				},
				options.json
			);
			return;
		}

		if (action === 'launch-provider-run') {
			const taskId = requireOption(options.taskId, '--task <id>');
			const launched = launchV2CoreProviderRun(db, {
				runId: options.runId ?? options.id ?? undefined,
				decisionId: options.id && options.runId ? options.id : undefined,
				taskId,
				modelProviderId: requireOption(options.providerId, '--provider <id>'),
				inputSummary: options.inputSummary ?? undefined,
				actionSummary: options.actionSummary ?? undefined
			});
			printResult(
				{
					agentControl: {
						action,
						...launched
					}
				},
				options.json
			);
			return;
		}

		if (action === 'complete-provider-run') {
			const taskId = requireOption(options.taskId, '--task <id>');
			const completed = completeV2CoreProviderRun(db, {
				runId: requireOption(options.runId, '--run <id>'),
				taskId,
				status: (options.status ?? 'completed') as 'completed' | 'failed',
				resultSummary: requireOption(options.resultSummary ?? options.summary, '--result <text>'),
				validationSummary: options.validationPlan ?? undefined
			});
			printResult(
				{
					agentControl: {
						action,
						...completed
					}
				},
				options.json
			);
			return;
		}

		if (action === 'managed-run-lifecycle') {
			const mode = options.mode ?? 'complete';
			if (mode !== 'complete') {
				throw new Error(`Unknown managed-run-lifecycle mode: ${mode}`);
			}
			printResult(
				{
					agentControl: {
						action,
						managedRunLifecycle: completeV2CoreManagedRunLifecycle(
							db,
							managedRunLifecycleCompleteInput(options)
						)
					}
				},
				options.json
			);
			return;
		}

		if (action === 'record-run') {
			const taskId = requireOption(options.taskId, '--task <id>');
			printResult(
				{
					agentControl: {
						action,
						taskDetail: recordV2CoreRun(db, {
							id: options.id ?? undefined,
							taskId,
							modelProviderId: options.providerId ?? undefined,
							status: options.status ?? undefined,
							inputSummary: options.inputSummary ?? undefined,
							actionSummary: options.actionSummary ?? undefined,
							resultSummary: options.resultSummary ?? undefined,
							validationSummary: options.validationPlan ?? undefined
						})
					}
				},
				options.json
			);
			return;
		}

		if (action === 'record-tool') {
			const taskId = requireOption(options.taskId, '--task <id>');
			printResult(
				{
					agentControl: {
						action,
						taskDetail: recordV2CoreToolExecution(db, {
							id: options.id ?? undefined,
							toolId: requireOption(options.toolId, '--tool <id>'),
							taskId,
							runId: options.runId ?? undefined,
							status: options.status ?? undefined,
							inputSummary: requireOption(
								options.inputSummary ?? options.summary,
								'--input <text>'
							),
							resultSummary: options.resultSummary ?? undefined,
							errorSummary: options.errorSummary ?? undefined
						})
					}
				},
				options.json
			);
			return;
		}

		if (action === 'attach-artifact') {
			const taskId = requireOption(options.taskId, '--task <id>');
			printResult(
				{
					agentControl: {
						action,
						taskDetail: attachV2CoreArtifact(db, {
							id: options.id ?? undefined,
							taskId,
							runId: options.runId ?? undefined,
							uri: requireOption(options.uri, '--uri <text>'),
							role: options.role ?? undefined,
							title: requireOption(options.title, '--title <text>'),
							summary: options.summary ?? undefined,
							status: options.status ?? undefined
						})
					}
				},
				options.json
			);
			return;
		}

		if (action === 'submit-review') {
			const taskId = requireOption(options.taskId, '--task <id>');
			printResult(
				{
					agentControl: {
						action,
						taskDetail: transitionV2CoreTaskStatus(db, {
							decisionId: options.id ?? undefined,
							taskId,
							status: 'review',
							summary: options.summary ?? 'Submit agent-control task evidence for review.',
							runId: options.runId ?? undefined
						})
					}
				},
				options.json
			);
			return;
		}

		if (action === 'accept-output') {
			const taskId = requireOption(options.taskId, '--task <id>');
			recordV2CoreDecision(db, {
				id: options.id ?? undefined,
				taskId,
				runId: options.runId ?? undefined,
				reviewId: options.reviewId ?? undefined,
				decisionType: 'accept_task_output',
				summary: options.summary ?? 'Accept reviewed task output through v2 agent-control surface.',
				rationale: options.rationale ?? undefined
			});
			printResult(
				{
					agentControl: {
						action,
						taskDetail: transitionV2CoreTaskStatus(db, {
							decisionId: undefined,
							taskId,
							status: 'done',
							summary: 'Close task after accepted agent-control output.',
							runId: options.runId ?? undefined
						})
					}
				},
				options.json
			);
			return;
		}

		if (action === 'follow-up') {
			printResult(
				{
					agentControl: {
						action,
						taskDetail: createV2CoreFollowupTask(db, {
							id: options.id ?? undefined,
							sourceTaskId: requireOption(options.taskId, '--task <sourceTaskId>'),
							goalId: options.goalId ?? undefined,
							title: requireOption(options.title, '--title <text>'),
							summary: options.summary ?? undefined,
							successCriteria: requireOption(options.successCriteria, '--success <text>'),
							validationPlan: requireOption(options.validationPlan, '--validation <text>'),
							status: options.status ?? undefined,
							reason: requireOption(options.rationale ?? options.sourceReason, '--rationale <text>')
						})
					}
				},
				options.json
			);
			return;
		}

		throw new Error(`Unknown agent-control action: ${action}`);
	} finally {
		db.close();
	}
}

function exportSnapshot(options: Options) {
	const db = openForCommand(options);
	try {
		const snapshot = exportV2CoreSnapshot(db);
		if (options.filePath) {
			writeFileSync(options.filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
			printResult(
				{
					file: options.filePath,
					format: snapshot.format,
					tableCounts: Object.fromEntries(
						Object.entries(snapshot.tables).map(([table, rows]) => [table, rows.length])
					)
				},
				options.json
			);
			return;
		}

		printResult({ snapshot }, options.json);
	} finally {
		db.close();
	}
}

function importSnapshot(options: Options) {
	const filePath = requireOption(options.filePath, '--file <path>');
	const snapshot = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
	const db = openV2CoreDb({ dbFile: options.dbFile ?? undefined });
	try {
		printResult(
			{
				file: filePath,
				overview: importV2CoreSnapshot(db, snapshot)
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function createProject(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				project: createV2CoreProject(db, {
					id: options.id ?? undefined,
					name: requireOption(options.name, '--name <text>'),
					summary: options.summary ?? undefined,
					status: options.status ?? undefined,
					workspaceRoot: options.workspaceRoot ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function createGoal(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				goal: createV2CoreGoal(db, {
					id: options.id ?? undefined,
					projectId: requireOption(options.projectId, '--project <id>'),
					title: requireOption(options.title, '--title <text>'),
					summary: options.summary ?? undefined,
					successCriteria: requireOption(options.successCriteria, '--success <text>'),
					status: options.status ?? undefined,
					parentGoalId: options.parentGoalId ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function transitionGoal(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				result: transitionV2CoreGoalStatus(db, {
					decisionId: options.id ?? undefined,
					goalId: requireOption(options.goalId, '--goal <id>'),
					status: requireOption(options.status, '--status <text>'),
					summary: requireOption(options.summary, '--summary <text>'),
					taskId: options.taskId ?? undefined,
					runId: options.runId ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function createTask(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				taskDetail: createV2CoreTask(db, {
					id: options.id ?? undefined,
					goalId: requireOption(options.goalId, '--goal <id>'),
					title: requireOption(options.title, '--title <text>'),
					summary: options.summary ?? undefined,
					successCriteria: requireOption(options.successCriteria, '--success <text>'),
					validationPlan: requireOption(options.validationPlan, '--validation <text>'),
					status: options.status ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function createFollowupTask(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				taskDetail: createV2CoreFollowupTask(db, {
					id: options.id ?? undefined,
					sourceTaskId: requireOption(options.taskId, '--task <sourceTaskId>'),
					goalId: options.goalId ?? undefined,
					title: requireOption(options.title, '--title <text>'),
					summary: options.summary ?? undefined,
					successCriteria: requireOption(options.successCriteria, '--success <text>'),
					validationPlan: requireOption(options.validationPlan, '--validation <text>'),
					status: options.status ?? undefined,
					reason: requireOption(options.rationale ?? options.sourceReason, '--rationale <text>')
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function recordTaskDependency(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				taskDetail: recordV2CoreTaskDependency(db, {
					id: options.id ?? undefined,
					taskId: requireOption(options.taskId, '--task <id>'),
					dependsOnTaskId: requireOption(options.dependsOnTaskId, '--depends-on <id>'),
					status: options.status ?? undefined,
					reason: requireOption(options.rationale ?? options.summary, '--rationale <text>')
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function launchProviderRun(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				providerRunLaunch: launchV2CoreProviderRun(db, {
					runId: options.runId ?? options.id ?? undefined,
					decisionId: options.id && options.runId ? options.id : undefined,
					taskId: requireOption(options.taskId, '--task <id>'),
					modelProviderId: requireOption(options.providerId, '--provider <id>'),
					inputSummary: options.inputSummary ?? undefined,
					actionSummary: options.actionSummary ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function completeProviderRun(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				providerRunCompletion: completeV2CoreProviderRun(db, {
					runId: requireOption(options.runId, '--run <id>'),
					taskId: requireOption(options.taskId, '--task <id>'),
					status: (options.status ?? 'completed') as 'completed' | 'failed',
					resultSummary: requireOption(options.resultSummary ?? options.summary, '--result <text>'),
					validationSummary: options.validationPlan ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function managedRunLifecycle(options: Options) {
	const mode = options.mode ?? 'complete';
	if (mode !== 'complete') {
		throw new Error(`Unknown managed-run-lifecycle mode: ${mode}`);
	}

	const db = openForCommand(options);
	try {
		printResult(
			{
				managedRunLifecycle: completeV2CoreManagedRunLifecycle(
					db,
					managedRunLifecycleCompleteInput(options)
				)
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function registerProvider(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				modelProvider: registerV2CoreModelProvider(db, {
					id: options.id ?? undefined,
					name: requireOption(options.name, '--name <text>'),
					kind: options.kind ?? undefined,
					status: options.status ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function registerTool(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				tool: registerV2CoreTool(db, {
					id: options.id ?? undefined,
					name: requireOption(options.name, '--name <text>'),
					description: options.description ?? options.summary ?? undefined,
					kind: options.kind ?? undefined,
					riskLevel: options.riskLevel ?? undefined,
					approvalRequirement: options.approvalRequirement ?? undefined,
					status: options.status ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function registerEvaluationScenario(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				evaluationScenario: registerV2CoreEvaluationScenario(db, {
					id: options.id ?? undefined,
					projectId: options.projectId ?? undefined,
					title: requireOption(options.title, '--title <text>'),
					capabilityName: options.capabilityName ?? undefined,
					promptOrTask: options.promptOrTask ?? options.inputSummary ?? undefined,
					rubric: options.rubric ?? options.validationPlan ?? undefined,
					status: options.status ?? undefined,
					version: options.version ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function transitionTask(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				taskDetail: transitionV2CoreTaskStatus(db, {
					decisionId: options.id ?? undefined,
					taskId: requireOption(options.taskId, '--task <id>'),
					status: requireOption(options.status, '--status <text>'),
					summary: requireOption(options.summary, '--summary <text>'),
					runId: options.runId ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function recordRun(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				taskDetail: recordV2CoreRun(db, {
					id: options.id ?? undefined,
					taskId: requireOption(options.taskId, '--task <id>'),
					modelProviderId: options.providerId ?? undefined,
					status: options.status ?? undefined,
					inputSummary: options.inputSummary ?? undefined,
					actionSummary: options.actionSummary ?? undefined,
					resultSummary: options.resultSummary ?? undefined,
					validationSummary: options.validationPlan ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function recordToolExecution(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				taskDetail: recordV2CoreToolExecution(db, {
					id: options.id ?? undefined,
					toolId: requireOption(options.toolId, '--tool <id>'),
					taskId: requireOption(options.taskId, '--task <id>'),
					runId: options.runId ?? undefined,
					status: options.status ?? undefined,
					inputSummary: requireOption(options.inputSummary ?? options.summary, '--input <text>'),
					resultSummary: options.resultSummary ?? undefined,
					errorSummary: options.errorSummary ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function recordEvaluationResult(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			recordV2CoreEvaluationResult(db, {
				id: options.id ?? undefined,
				scenarioId: requireOption(options.scenarioId, '--scenario <id>'),
				taskId: requireOption(options.taskId, '--task <id>'),
				runId: options.runId ?? undefined,
				toolExecutionId: options.toolExecutionId ?? undefined,
				providerId: options.providerId ?? undefined,
				modelId: options.modelId ?? undefined,
				status: options.status ?? undefined,
				score: Number.isFinite(options.score) ? options.score : undefined,
				rubricSummary: options.rubric ?? options.validationPlan ?? undefined,
				resultSummary: requireOption(options.resultSummary ?? options.summary, '--result <text>'),
				failureSummary: options.errorSummary ?? undefined
			}),
			options.json
		);
	} finally {
		db.close();
	}
}

function attachArtifact(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				taskDetail: attachV2CoreArtifact(db, {
					id: options.id ?? undefined,
					taskId: requireOption(options.taskId, '--task <id>'),
					runId: options.runId ?? undefined,
					uri: requireOption(options.uri, '--uri <text>'),
					role: options.role ?? undefined,
					title: requireOption(options.title, '--title <text>'),
					summary: options.summary ?? undefined,
					status: options.status ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function recordReview(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				taskDetail: recordV2CoreReview(db, {
					id: options.id ?? undefined,
					taskId: requireOption(options.taskId, '--task <id>'),
					runId: options.runId ?? undefined,
					artifactId: options.artifactId ?? undefined,
					status: options.status ?? undefined,
					summary: requireOption(options.summary, '--summary <text>')
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function recordDecision(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				result: recordV2CoreDecision(db, {
					id: options.id ?? undefined,
					projectId: options.projectId ?? undefined,
					goalId: options.goalId ?? undefined,
					taskId: options.taskId ?? undefined,
					runId: options.runId ?? undefined,
					reviewId: options.reviewId ?? undefined,
					decisionType: options.decisionType ?? undefined,
					summary: requireOption(options.summary, '--summary <text>'),
					rationale: options.rationale ?? undefined
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function promoteMemory(options: Options) {
	const db = openForCommand(options);
	try {
		printResult(
			{
				memoryItem: promoteV2CoreMemory(db, {
					id: options.id ?? undefined,
					projectId: requireOption(options.projectId, '--project <id>'),
					title: requireOption(options.title, '--title <text>'),
					body: requireOption(options.body ?? options.summary, '--body <text> or --summary <text>'),
					status: options.status ?? undefined,
					sources: [
						{
							sourceTable: requireOption(options.sourceTable, '--source-table <name>'),
							sourceId: requireOption(options.sourceId, '--source-id <id>'),
							reason: requireOption(options.sourceReason, '--source-reason <text>')
						}
					]
				})
			},
			options.json
		);
	} finally {
		db.close();
	}
}

function main() {
	const options = parseArgs(process.argv.slice(2));

	if (options.help || !options.command) {
		printHelp();
		return;
	}

	switch (options.command) {
		case 'init':
			init(options);
			break;
		case 'overview':
			overview(options);
			break;
		case 'inspect-task':
			inspectTask(options);
			break;
		case 'next-work':
			nextWork(options);
			break;
		case 'goal-triage':
			goalTriage(options);
			break;
		case 'goal-continuity-audit':
			goalContinuityAudit(options);
			break;
		case 'context-bundle':
			contextBundle(options);
			break;
		case 'agent-work-packet':
			agentWorkPacket(options);
			break;
		case 'agent-preparation-packet':
			agentPreparationPacket(options);
			break;
		case 'evaluation-context':
			evaluationContext(options);
			break;
		case 'memory-for-context':
			memoryForContext(options);
			break;
		case 'unreviewed-outputs':
			unreviewedOutputs(options);
			break;
		case 'dependency-report':
			dependencyReport(options);
			break;
		case 'dependency-reduction-report':
			dependencyReductionReport(options);
			break;
		case 'operator-console':
			operatorConsole(options);
			break;
		case 'agent-control':
			agentControl(options);
			break;
		case 'agent-execution-cycle':
			launchAgentExecutionCycle(options);
			break;
		case 'closeout-packet':
			closeoutPacket(options);
			break;
		case 'search-context':
			searchContext(options);
			break;
		case 'route-comparison-report':
			routeComparisonReport(options);
			break;
		case 'routing-evidence':
			routingEvidence(options);
			break;
		case 'export-snapshot':
			exportSnapshot(options);
			break;
		case 'import-snapshot':
			importSnapshot(options);
			break;
		case 'create-project':
			createProject(options);
			break;
		case 'create-goal':
			createGoal(options);
			break;
		case 'create-task':
			createTask(options);
			break;
		case 'create-followup-task':
			createFollowupTask(options);
			break;
		case 'record-task-dependency':
			recordTaskDependency(options);
			break;
		case 'launch-provider-run':
			launchProviderRun(options);
			break;
		case 'complete-provider-run':
			completeProviderRun(options);
			break;
		case 'managed-run-lifecycle':
			managedRunLifecycle(options);
			break;
		case 'transition-goal':
			transitionGoal(options);
			break;
		case 'register-provider':
			registerProvider(options);
			break;
		case 'register-tool':
			registerTool(options);
			break;
		case 'register-evaluation-scenario':
			registerEvaluationScenario(options);
			break;
		case 'transition-task':
			transitionTask(options);
			break;
		case 'record-run':
			recordRun(options);
			break;
		case 'record-tool-execution':
			recordToolExecution(options);
			break;
		case 'record-evaluation-result':
			recordEvaluationResult(options);
			break;
		case 'attach-artifact':
			attachArtifact(options);
			break;
		case 'record-review':
			recordReview(options);
			break;
		case 'record-decision':
			recordDecision(options);
			break;
		case 'promote-memory':
			promoteMemory(options);
			break;
		default:
			throw new Error(`Unknown command: ${options.command}`);
	}
}

try {
	main();
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exitCode = 1;
}
