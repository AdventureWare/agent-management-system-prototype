import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

export type V2CoreSourceReferenceInput = {
	sourceSystem?: string;
	sourceCollection?: string;
	sourceId?: string;
	field?: string;
	note?: string;
};

export type V2CoreProjectInput = {
	id?: string;
	name: string;
	summary?: string;
	status?: string;
	workspaceRoot?: string;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreGoalInput = {
	id?: string;
	projectId: string;
	parentGoalId?: string | null;
	title: string;
	summary?: string;
	successCriteria: string;
	status?: string;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreTaskInput = {
	id?: string;
	projectId?: string;
	goalId: string;
	title: string;
	summary?: string;
	successCriteria: string;
	validationPlan: string;
	status?: string;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreFollowupTaskInput = Omit<V2CoreTaskInput, 'goalId'> & {
	goalId?: string;
	sourceTaskId: string;
	decisionId?: string;
	reason: string;
};

export type V2CoreRunInput = {
	id?: string;
	taskId: string;
	modelProviderId?: string | null;
	status?: string;
	inputSummary?: string;
	actionSummary?: string;
	resultSummary?: string;
	validationSummary?: string;
	startedAt?: string | null;
	endedAt?: string | null;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreProviderRunLaunchInput = {
	runId?: string;
	decisionId?: string;
	taskId: string;
	modelProviderId: string;
	inputSummary?: string;
	actionSummary?: string;
};

export type V2CoreAgentExecutionCycleInput = {
	runId?: string;
	decisionId?: string;
	projectId?: string | null;
	goalId?: string | null;
	modelProviderId: string;
	inputSummary?: string;
	actionSummary?: string;
	limit?: number;
};

export type V2CoreProviderRunCompletionInput = {
	runId: string;
	taskId: string;
	status: 'completed' | 'failed';
	resultSummary: string;
	validationSummary?: string;
};

export type V2CoreManagedRunLifecycleCompleteInput = {
	taskId: string;
	runId: string;
	artifactId: string;
	artifactUri: string;
	artifactTitle: string;
	resultSummary: string;
	validationSummary: string;
	reviewId: string;
	acceptDecisionId: string;
	toolExecutionId?: string | null;
	toolId?: string | null;
	toolInputSummary?: string | null;
	artifactSummary?: string | null;
	reviewSummary?: string | null;
	acceptanceRationale?: string | null;
	artifactRole?: string | null;
	followupTaskId?: string | null;
	followupTitle?: string | null;
	followupSuccessCriteria?: string | null;
	followupValidationPlan?: string | null;
	followupRationale?: string | null;
	dryRun?: boolean;
};

export type V2CoreManagedRunLifecycleCompleteResult = {
	mode: 'complete';
	dryRun: boolean;
	preflight: {
		taskId: string;
		runId: string;
		taskStatus: string;
		runStatus: string;
	};
	plannedOperations: string[];
	createdRecordIds: {
		runId: string;
		artifactId: string;
		reviewId: string;
		acceptDecisionId: string;
		toolExecutionId: string | null;
		followupTaskId: string | null;
	};
	taskDetail: V2CoreTaskDetail | null;
	followupTaskDetail: V2CoreTaskDetail | null;
};

export type V2CoreModelProviderInput = {
	id?: string;
	name: string;
	kind?: string;
	status?: string;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreToolInput = {
	id?: string;
	name: string;
	description?: string;
	kind?: string;
	riskLevel?: string;
	approvalRequirement?: string;
	status?: string;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreToolExecutionInput = {
	id?: string;
	toolId: string;
	taskId: string;
	runId?: string | null;
	status?: string;
	inputSummary: string;
	resultSummary?: string;
	errorSummary?: string;
	startedAt?: string | null;
	endedAt?: string | null;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreTaskDependencyInput = {
	id?: string;
	taskId: string;
	dependsOnTaskId: string;
	status?: string;
	reason: string;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreArtifactInput = {
	id?: string;
	projectId?: string;
	taskId: string;
	runId?: string | null;
	uri: string;
	role?: string;
	title: string;
	summary?: string;
	status?: string;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreReviewInput = {
	id?: string;
	taskId: string;
	runId?: string | null;
	artifactId?: string | null;
	status?: string;
	summary: string;
	createdAt?: string;
	resolvedAt?: string | null;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreDecisionInput = {
	id?: string;
	projectId?: string;
	goalId?: string | null;
	taskId?: string | null;
	runId?: string | null;
	reviewId?: string | null;
	supersedesDecisionId?: string | null;
	decisionType?: string;
	summary: string;
	rationale?: string;
	decidedAt?: string;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreMemoryInput = {
	id?: string;
	projectId: string;
	title: string;
	body: string;
	scope?: string;
	status?: string;
	createdAt?: string;
	sources: Array<{
		sourceTable: string;
		sourceId: string;
		reason: string;
	}>;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreEvaluationScenarioInput = {
	id?: string;
	projectId?: string | null;
	title: string;
	capabilityName?: string;
	promptOrTask?: string;
	rubric?: string;
	status?: string;
	version?: string;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreEvaluationResultInput = {
	id?: string;
	scenarioId: string;
	taskId: string;
	runId?: string | null;
	toolExecutionId?: string | null;
	providerId?: string | null;
	modelId?: string | null;
	status?: string;
	score?: number | null;
	rubricSummary?: string;
	resultSummary: string;
	failureSummary?: string;
	createdAt?: string;
	source?: V2CoreSourceReferenceInput;
};

export type V2CoreTransitionTaskInput = {
	taskId: string;
	status: string;
	summary: string;
	decisionId?: string;
	runId?: string | null;
};

export type V2CoreTransitionGoalInput = {
	goalId: string;
	status: string;
	summary: string;
	decisionId?: string;
	taskId?: string | null;
	runId?: string | null;
};

export type V2CoreOverview = {
	projects: Array<{
		id: string;
		name: string;
		summary: string;
		status: string;
		goalCount: number;
		taskCount: number;
		runCount: number;
		artifactCount: number;
		memoryItemCount: number;
	}>;
	taskStatusCounts: Record<string, number>;
	reviewStatusCounts: Record<string, number>;
	memoryStatusCounts: Record<string, number>;
};

export type V2CoreTaskDetail = {
	task: {
		id: string;
		projectId: string;
		goalId: string;
		title: string;
		summary: string;
		successCriteria: string;
		validationPlan: string;
		status: string;
	};
	project: {
		id: string;
		name: string;
	};
	goal: {
		id: string;
		title: string;
		status: string;
	};
	dependencies: Array<{
		id: string;
		taskId: string;
		dependsOnTaskId: string;
		dependsOnTaskTitle: string;
		status: string;
		reason: string;
	}>;
	runs: Array<{
		id: string;
		status: string;
		modelProviderId: string | null;
		modelProviderName: string | null;
		modelProviderKind: string | null;
		resultSummary: string;
		validationSummary: string;
		startedAt: string | null;
		endedAt: string | null;
	}>;
	toolExecutions: Array<{
		id: string;
		toolId: string;
		toolName: string;
		runId: string | null;
		status: string;
		inputSummary: string;
		resultSummary: string;
		errorSummary: string;
	}>;
	artifacts: Array<{
		id: string;
		runId: string | null;
		uri: string;
		role: string;
		title: string;
		status: string;
	}>;
	reviews: Array<{
		id: string;
		runId: string | null;
		artifactId: string | null;
		status: string;
		summary: string;
	}>;
	decisions: Array<{
		id: string;
		decisionType: string;
		summary: string;
		rationale: string;
	}>;
	memoryItems: Array<{
		id: string;
		title: string;
		status: string;
		scope: string;
	}>;
	lineage: {
		sourceTaskId: string | null;
		sourceTaskTitle: string | null;
		sourceReason: string | null;
		followupTaskIds: string[];
	};
	sourceReferences: Array<{
		recordTable: string;
		recordId: string;
		sourceSystem: string;
		sourceCollection: string;
		sourceId: string;
		field: string;
		note: string;
	}>;
};

export type V2CoreNextWork = {
	candidates: Array<{
		taskId: string;
		title: string;
		status: string;
		goalId: string;
		goalTitle: string;
		projectId: string;
		projectName: string;
		action: 'start_task' | 'review_output' | 'resolve_blocker';
		reason: string;
	}>;
};

export type V2CoreGoalTriageAction =
	| 'start_ready_task'
	| 'monitor_in_progress'
	| 'create_next_task'
	| 'review_or_close'
	| 'pause_candidate'
	| 'blocked_needs_decision';

export type V2CoreGoalTriage = {
	scope: {
		projectId: string | null;
		goalId: string | null;
	};
	summary: Record<V2CoreGoalTriageAction, number>;
	goals: Array<{
		goalId: string;
		projectId: string;
		projectName: string;
		parentGoalId: string | null;
		title: string;
		status: string;
		sourceFlags: {
			importedFromV1: boolean;
			generatedHoldingGoal: boolean;
		};
		taskCounts: {
			ready: number;
			inProgress: number;
			review: number;
			blocked: number;
			done: number;
			canceled: number;
			open: number;
			total: number;
		};
		childGoalCounts: {
			active: number;
			openTasks: number;
		};
		currentRun: {
			runId: string;
			taskId: string;
			taskTitle: string;
			status: string;
			modelProviderId: string | null;
			modelProviderName: string | null;
		} | null;
		suggestedAction: V2CoreGoalTriageAction;
		reason: string;
	}>;
};

export type V2CoreContextBundle = {
	task: V2CoreTaskDetail['task'];
	project: V2CoreTaskDetail['project'];
	goal: V2CoreTaskDetail['goal'];
	includedSources: Array<{
		recordType: string;
		recordId: string;
		title: string;
		reason: string;
	}>;
	readiness: {
		status: string;
		canStart: boolean;
		reason: string;
	};
};

export type V2CoreMemoryForContext = {
	projectId: string;
	taskId: string | null;
	items: Array<{
		id: string;
		title: string;
		body: string;
		scope: string;
		status: string;
		sources: Array<{
			sourceTable: string;
			sourceId: string;
			reason: string;
		}>;
	}>;
};

export type V2CoreDependencyReport = {
	scope: {
		projectId: string | null;
		goalId: string | null;
		taskId: string | null;
	};
	summary: {
		runCount: number;
		providerRunCount: number;
		toolExecutionCount: number;
	};
	modelProviders: Array<{
		providerId: string;
		name: string;
		kind: string;
		status: string;
		runCount: number;
		taskIds: string[];
	}>;
	toolExecutions: Array<{
		executionId: string;
		toolId: string;
		toolName: string;
		toolKind: string;
		riskLevel: string;
		approvalRequirement: string;
		status: string;
		taskId: string;
		runId: string | null;
		inputSummary: string;
		resultSummary: string;
		errorSummary: string;
	}>;
};

export type V2CoreDependencyReductionStatus =
	| 'external_only'
	| 'hybrid_candidate'
	| 'locally_supported'
	| 'retirement_candidate'
	| 'unknown';

export type V2CoreDependencyReductionReport = {
	scope: {
		projectId: string | null;
		goalId: string | null;
		taskId: string | null;
	};
	summary: {
		capabilityCount: number;
		externalOnlyCount: number;
		hybridCandidateCount: number;
		locallySupportedCount: number;
		retirementCandidateCount: number;
		unknownCount: number;
	};
	capabilities: Array<{
		capabilityName: string;
		status: V2CoreDependencyReductionStatus;
		localReplacementStatus: V2CoreDependencyReductionStatus;
		rationale: string;
		evidenceGaps: string[];
		localReplacementEvidenceGaps: string[];
		scenarioIds: string[];
		evaluationResultIds: string[];
		providerlessLocalToolEvaluationResultIds: string[];
		providerlessPassingLocalToolEvaluationResultIds: string[];
		taskIds: string[];
		externalProviderIds: string[];
		localToolIds: string[];
		evaluationResults: Array<{
			resultId: string;
			scenarioId: string;
			taskId: string;
			status: string;
			score: number | null;
			providerId: string | null;
			toolExecutionId: string | null;
			resultSummary: string;
		}>;
	}>;
};

export type V2CoreEvaluationScenario = {
	id: string;
	projectId: string | null;
	title: string;
	capabilityName: string;
	promptOrTask: string;
	rubric: string;
	status: string;
	version: string;
	sourceReferences: V2CoreTaskDetail['sourceReferences'];
};

export type V2CoreEvaluationResult = {
	id: string;
	scenarioId: string;
	scenarioTitle: string;
	taskId: string;
	runId: string | null;
	toolExecutionId: string | null;
	providerId: string | null;
	modelId: string | null;
	status: string;
	score: number | null;
	rubricSummary: string;
	resultSummary: string;
	failureSummary: string;
	createdAt: string;
	sourceReferences: V2CoreTaskDetail['sourceReferences'];
};

export type V2CoreEvaluationContext = {
	scope: {
		projectId: string | null;
		taskId: string | null;
	};
	scenarios: V2CoreEvaluationScenario[];
	results: V2CoreEvaluationResult[];
};

export type V2CoreLocalRetrieval = {
	scope: {
		projectId: string | null;
		goalId: string | null;
		taskId: string | null;
	};
	query: string;
	limit: number;
	results: Array<{
		recordType: string;
		recordId: string;
		title: string;
		snippet: string;
		projectId: string | null;
		goalId: string | null;
		taskId: string | null;
		runId: string | null;
		artifactId: string | null;
		inclusionReason: string;
		matchedFields: string[];
		score: number;
	}>;
};

export type V2CoreRoutingEvidence = {
	scope: {
		projectId: string | null;
		goalId: string | null;
		taskId: string | null;
	};
	limit: number;
	decisions: Array<{
		decisionId: string;
		decisionType: string;
		projectId: string;
		goalId: string | null;
		taskId: string | null;
		runId: string | null;
		summary: string;
		rationale: string;
		selectedProviderId: string | null;
		selectedModelId: string | null;
		selectedRoute: string | null;
		capabilityName: string | null;
		rejectedAlternatives: string[];
		evidenceLabels: string[];
		decidedAt: string;
	}>;
};

export type V2CoreRouteComparisonReport = {
	scope: {
		projectId: string | null;
		goalId: string | null;
		taskId: string | null;
	};
	summary: {
		capabilityCount: number;
		comparisonReadyCount: number;
		needsMoreRouteEvidenceCount: number;
		deferCount: number;
		routeSelectionDecisionCount: number;
	};
	capabilities: Array<{
		capabilityName: string;
		routeSelectionDecisionCount: number;
		routeDecisionIds: string[];
		selectedProviderIds: string[];
		selectedModelIds: string[];
		selectedRoutes: string[];
		rejectedAlternatives: string[];
		evaluationResultIds: string[];
		evaluationStatuses: string[];
		dependencyStatus: V2CoreDependencyReductionStatus | null;
		evidenceGaps: string[];
		recommendation: 'needs_more_route_evidence' | 'comparison_ready' | 'defer';
	}>;
};

export type V2CoreOperatorConsoleGoal = {
	goalId: string;
	projectId: string;
	projectName: string;
	parentGoalId: string | null;
	title: string;
	status: string;
	openTaskCount: number;
	doneTaskCount: number;
	latestGoalStatusTransition: {
		decisionId: string;
		summary: string;
		rationale: string;
		decidedAt: string;
	} | null;
};

export type V2CoreOperatorConsoleWorkQueueItem = {
	goalId: string;
	projectId: string;
	projectName: string;
	parentGoalId: string | null;
	title: string;
	status: string;
	openTaskCount: number;
	doneTaskCount: number;
	queueState:
		| 'running'
		| 'ready_to_dispatch'
		| 'no_dispatchable_work'
		| 'no_open_work'
		| 'blocked'
		| 'paused';
	currentRun: {
		runId: string;
		taskId: string;
		taskTitle: string;
		status: string;
		modelProviderId: string | null;
		modelProviderName: string | null;
	} | null;
	selectedTask: V2CoreNextWork['candidates'][number] | null;
};

export type V2CoreOperatorConsoleRecentArtifact = {
	artifactId: string;
	taskId: string | null;
	runId: string | null;
	projectId: string;
	title: string;
	uri: string;
	role: string;
	status: string;
};

export type V2CoreOperatorConsoleScopedGoalSummary = {
	goal: V2CoreOperatorConsoleGoal;
	queueState: V2CoreOperatorConsoleWorkQueueItem['queueState'] | null;
	readiness: {
		state:
			| 'running_work'
			| 'review_required'
			| 'ready_to_dispatch'
			| 'blocked'
			| 'paused'
			| 'needs_next_work'
			| 'ready_for_completion_assessment';
		label: string;
		summary: string;
	};
	currentRun: V2CoreOperatorConsoleWorkQueueItem['currentRun'];
	selectedTask: V2CoreNextWork['candidates'][number] | null;
	recentAcceptedArtifact: V2CoreOperatorConsoleRecentArtifact | null;
	trustedMemory: V2CoreMemoryForContext['items'][number] | null;
};

export type V2CoreOperatorConsoleScopedTaskRollup = {
	counts: {
		open: number;
		review: number;
		done: number;
	};
	tasks: Array<{
		taskId: string;
		title: string;
		status: string;
		currentRun: {
			runId: string;
			status: string;
			modelProviderName: string | null;
		} | null;
		reviewArtifact: {
			artifactId: string;
			title: string;
			status: string;
		} | null;
		selectedNextWork: boolean;
	}>;
};

export type V2CoreOperatorConsole = {
	scope: {
		projectId: string | null;
		goalId: string | null;
	};
	overview: V2CoreOverview;
	activeGoals: V2CoreOperatorConsoleGoal[];
	goalStatusGroups: {
		running: V2CoreOperatorConsoleGoal[];
		blocked: V2CoreOperatorConsoleGoal[];
		paused: V2CoreOperatorConsoleGoal[];
	};
	workQueue: V2CoreOperatorConsoleWorkQueueItem[];
	scopedGoalSummary: V2CoreOperatorConsoleScopedGoalSummary | null;
	scopedChildGoalRollup: V2CoreOperatorConsoleWorkQueueItem[];
	scopedTaskRollup: V2CoreOperatorConsoleScopedTaskRollup | null;
	nextWork: V2CoreNextWork;
	reviewQueue: Array<{
		artifactId: string;
		taskId: string;
		taskTitle: string;
		goalId: string;
		goalTitle: string;
		runId: string | null;
		runStatus: string | null;
		title: string;
		uri: string;
		status: string;
	}>;
	recentRuns: Array<{
		runId: string;
		taskId: string;
		taskTitle: string;
		goalId: string;
		projectId: string;
		status: string;
		modelProviderId: string | null;
		modelProviderName: string | null;
		resultSummary: string;
		validationSummary: string;
		endedAt: string | null;
	}>;
	recentArtifacts: V2CoreOperatorConsoleRecentArtifact[];
	memory: V2CoreMemoryForContext | null;
	dependencyReport: V2CoreDependencyReport;
	evaluationContext: V2CoreEvaluationContext;
	snapshotStatus: {
		format: typeof V2_CORE_SNAPSHOT_FORMAT;
		tableCounts: Record<V2CoreSnapshotTableName, number>;
	};
};

export type V2CoreAgentWorkPacket = {
	taskContract: {
		taskId: string;
		title: string;
		summary: string;
		status: string;
		successCriteria: string;
		validationPlan: string;
		project: V2CoreTaskDetail['project'];
		goal: V2CoreTaskDetail['goal'];
	};
	readiness: {
		status: string;
		actionable: boolean;
		reason: string;
		recommendedAction:
			| 'start_task'
			| 'review_output'
			| 'resolve_blocker'
			| 'continue_task'
			| 'stop';
	};
	contextSources: V2CoreContextBundle['includedSources'];
	recentEvidence: {
		currentTaskRuns: V2CoreTaskDetail['runs'];
		currentTaskArtifacts: V2CoreTaskDetail['artifacts'];
		currentTaskReviews: V2CoreTaskDetail['reviews'];
		recentProjectRuns: V2CoreOperatorConsole['recentRuns'];
		recentProjectArtifacts: V2CoreOperatorConsole['recentArtifacts'];
	};
	relevantDecisions: V2CoreTaskDetail['decisions'];
	trustedMemory: V2CoreMemoryForContext['items'];
	dependencySummary: V2CoreDependencyReport['summary'] & {
		modelProviders: V2CoreDependencyReport['modelProviders'];
		toolExecutions: V2CoreDependencyReport['toolExecutions'];
	};
	evaluationEvidence: {
		scenarios: V2CoreEvaluationScenario[];
		results: V2CoreEvaluationResult[];
	};
	validationExpectations: {
		successCriteria: string;
		validationPlan: string;
		reviewRequiredBeforeDone: boolean;
		acceptanceDecisionRequiredBeforeDone: boolean;
	};
	allowedActions: string[];
	stoppingConditions: string[];
	sourceLinks: Array<{
		recordType: string;
		recordId: string;
		reason: string;
	}>;
	renderedPrompt: string;
};

export type V2CoreAgentPreparationGapClass =
	| 'blocking'
	| 'helpful_non_blocking'
	| 'discoverable_during_execution'
	| 'deferred_or_irrelevant';

export type V2CoreAgentPreparationPacket = {
	taskContract: V2CoreAgentWorkPacket['taskContract'];
	readiness: V2CoreAgentWorkPacket['readiness'];
	requirementsAssessment: {
		knowledge: string[];
		skillsOrWorkflows: string[];
		tools: string[];
		sourceContext: string[];
		constraints: string[];
		verification: string[];
	};
	selectedResources: Array<{
		recordType: string;
		recordId: string;
		title: string;
		inclusionReason: string;
		source:
			| 'work_packet'
			| 'local_retrieval'
			| 'trusted_memory'
			| 'tool_evidence'
			| 'evaluation_evidence'
			| 'skill_file';
	}>;
	gapAssessment: Array<{
		classification: V2CoreAgentPreparationGapClass;
		summary: string;
		source: string;
	}>;
	executionPackage: {
		goal: V2CoreTaskDetail['goal'];
		expectedOutputs: string[];
		allowedActions: string[];
		constraints: string[];
		verificationChecklist: string[];
		selectedResourceCount: number;
	};
	preparationReview: {
		questions: string[];
		acceptanceChecks: string[];
	};
	sourceLinks: V2CoreAgentWorkPacket['sourceLinks'];
};

export type V2CoreProviderRunLaunch = {
	taskDetail: V2CoreTaskDetail;
	runId: string;
	taskId: string;
	modelProviderId: string;
	taskStatusBeforeLaunch: string;
	taskStatusAfterLaunch: string;
	agentWorkPacket: V2CoreAgentWorkPacket;
};

export type V2CoreAgentExecutionCycle =
	| {
			status: 'no_work';
			reason: string;
			nextWork: V2CoreNextWork;
			selectedCandidate: null;
			providerRunLaunch: null;
			closeout: null;
	  }
	| {
			status: 'not_dispatchable';
			reason: string;
			nextWork: V2CoreNextWork;
			selectedCandidate: V2CoreNextWork['candidates'][number];
			providerRunLaunch: null;
			closeout: null;
	  }
	| {
			status: 'launched';
			reason: string;
			nextWork: V2CoreNextWork;
			selectedCandidate: V2CoreNextWork['candidates'][number];
			providerRunLaunch: V2CoreProviderRunLaunch;
			closeout: {
				command: string;
				requiredInputs: string[];
				reviewRequiredBeforeDone: true;
				acceptanceDecisionRequiredBeforeDone: true;
			};
	  };

export type V2CoreCloseoutPacket = {
	task: V2CoreTaskDetail['task'];
	project: V2CoreTaskDetail['project'];
	goal: V2CoreTaskDetail['goal'];
	run: V2CoreTaskDetail['runs'][number] | null;
	eligible: boolean;
	blockers: string[];
	requiredInputs: string[];
	humanAuthoredInputs: string[];
	suggestedRecordIds: {
		artifactId: string;
		reviewId: string;
		acceptDecisionId: string;
	};
	gateState: {
		reviewRequiredBeforeDone: true;
		acceptanceDecisionRequiredBeforeDone: true;
		taskStatus: string;
		runStatus: string | null;
		existingRunArtifactIds: string[];
		existingRunReviewIds: string[];
		acceptedOutputDecisionIds: string[];
	};
	validationChecklist: string[];
	command: {
		dryRun: string;
		template: string;
	};
	sourceLinks: Array<{
		recordType: string;
		recordId: string;
		reason: string;
	}>;
};

export type V2CoreProviderRunCompletion = {
	taskDetail: V2CoreTaskDetail;
	runId: string;
	taskId: string;
	statusBeforeCompletion: string;
	statusAfterCompletion: 'completed' | 'failed';
};

const V2_CORE_SNAPSHOT_FORMAT = 'ams-v2-core-snapshot-v1';

const V2_CORE_SNAPSHOT_TABLES = [
	{
		name: 'v2_core_projects',
		columns: ['id', 'name', 'summary', 'status', 'workspace_root'],
		orderBy: ['id']
	},
	{
		name: 'v2_core_goals',
		columns: [
			'id',
			'project_id',
			'parent_goal_id',
			'title',
			'summary',
			'success_criteria',
			'status'
		],
		orderBy: ['id']
	},
	{
		name: 'v2_core_tasks',
		columns: [
			'id',
			'project_id',
			'goal_id',
			'title',
			'summary',
			'success_criteria',
			'validation_plan',
			'status'
		],
		orderBy: ['id']
	},
	{
		name: 'v2_core_task_dependencies',
		columns: ['id', 'task_id', 'depends_on_task_id', 'status', 'reason'],
		orderBy: ['id']
	},
	{
		name: 'v2_core_model_providers',
		columns: ['id', 'name', 'kind', 'status'],
		orderBy: ['id']
	},
	{
		name: 'v2_core_runs',
		columns: [
			'id',
			'task_id',
			'model_provider_id',
			'status',
			'input_summary',
			'action_summary',
			'result_summary',
			'validation_summary',
			'started_at',
			'ended_at'
		],
		orderBy: ['id']
	},
	{
		name: 'v2_core_artifacts',
		columns: ['id', 'project_id', 'task_id', 'run_id', 'uri', 'role', 'title', 'summary', 'status'],
		orderBy: ['id']
	},
	{
		name: 'v2_core_reviews',
		columns: [
			'id',
			'task_id',
			'run_id',
			'artifact_id',
			'status',
			'summary',
			'created_at',
			'resolved_at'
		],
		orderBy: ['id']
	},
	{
		name: 'v2_core_decisions',
		columns: [
			'id',
			'project_id',
			'goal_id',
			'task_id',
			'run_id',
			'review_id',
			'supersedes_decision_id',
			'decision_type',
			'summary',
			'rationale',
			'decided_at'
		],
		orderBy: ['id']
	},
	{
		name: 'v2_core_memory_items',
		columns: ['id', 'project_id', 'title', 'body', 'scope', 'status', 'created_at'],
		orderBy: ['id']
	},
	{
		name: 'v2_core_memory_item_sources',
		columns: ['memory_item_id', 'source_table', 'source_id', 'reason'],
		orderBy: ['memory_item_id', 'source_table', 'source_id']
	},
	{
		name: 'v2_core_tools',
		columns: ['id', 'name', 'description', 'kind', 'risk_level', 'approval_requirement', 'status'],
		orderBy: ['id']
	},
	{
		name: 'v2_core_tool_executions',
		columns: [
			'id',
			'tool_id',
			'task_id',
			'run_id',
			'status',
			'input_summary',
			'result_summary',
			'error_summary',
			'started_at',
			'ended_at'
		],
		orderBy: ['id']
	},
	{
		name: 'v2_core_evaluation_scenarios',
		columns: [
			'id',
			'project_id',
			'title',
			'capability_name',
			'prompt_or_task',
			'rubric',
			'status',
			'version'
		],
		orderBy: ['id']
	},
	{
		name: 'v2_core_evaluation_results',
		columns: [
			'id',
			'scenario_id',
			'task_id',
			'run_id',
			'tool_execution_id',
			'provider_id',
			'model_id',
			'status',
			'score',
			'rubric_summary',
			'result_summary',
			'failure_summary',
			'created_at'
		],
		orderBy: ['id']
	},
	{
		name: 'v2_core_source_references',
		columns: [
			'record_table',
			'record_id',
			'source_system',
			'source_collection',
			'source_id',
			'field',
			'note'
		],
		orderBy: [
			'record_table',
			'record_id',
			'source_system',
			'source_collection',
			'source_id',
			'field'
		]
	}
] as const;

type V2CoreSnapshotTableName = (typeof V2_CORE_SNAPSHOT_TABLES)[number]['name'];
type V2CoreSnapshotRow = Record<string, string | number | null>;

export type V2CoreSnapshot = {
	format: typeof V2_CORE_SNAPSHOT_FORMAT;
	tables: Record<V2CoreSnapshotTableName, V2CoreSnapshotRow[]>;
};

const ALLOWED_TASK_TRANSITIONS: Record<string, string[]> = {
	draft: ['ready', 'blocked', 'canceled'],
	ready: ['in_progress', 'blocked', 'canceled'],
	in_progress: ['review', 'blocked', 'done', 'canceled'],
	review: ['in_progress', 'done', 'blocked', 'canceled'],
	blocked: ['ready', 'canceled'],
	done: [],
	canceled: []
};

const ALLOWED_GOAL_STATUSES = new Set([
	'draft',
	'active',
	'blocked',
	'paused',
	'completed',
	'superseded',
	'canceled'
]);

type CountRow = {
	value: string;
	count: number;
};

function createId(prefix: string) {
	return `${prefix}_${randomUUID()}`;
}

function requiredText(value: string | undefined | null, field: string) {
	const normalized = value?.trim() ?? '';

	if (!normalized) {
		throw new Error(`Missing required ${field}.`);
	}

	return normalized;
}

function optionalText(value: string | undefined | null) {
	const normalized = value?.trim() ?? '';
	return normalized ? normalized : null;
}

function optionalTextWithDefault(value: string | undefined | null) {
	return value?.trim() ?? '';
}

function ensureRow(db: Database.Database, table: string, id: string, label: string) {
	const row = db.prepare<[string], { id: string }>(`select id from ${table} where id = ?`).get(id);

	if (!row) {
		throw new Error(`${label} ${id} was not found in the v2 core database.`);
	}

	return row;
}

function ensureNoRow(db: Database.Database, table: string, id: string, label: string) {
	const row = db.prepare<[string], { id: string }>(`select id from ${table} where id = ?`).get(id);

	if (row) {
		throw new Error(`${label} ${id} already exists in the v2 core database.`);
	}
}

function assertRunBelongsToTask(db: Database.Database, runId: string, taskId: string) {
	const run = db
		.prepare<[string], { task_id: string }>('select task_id from v2_core_runs where id = ?')
		.get(runId);

	if (!run) {
		throw new Error(`Run ${runId} was not found in the v2 core database.`);
	}

	if (run.task_id !== taskId) {
		throw new Error(`Run ${runId} does not belong to task ${taskId}.`);
	}
}

function assertArtifactBelongsToTask(db: Database.Database, artifactId: string, taskId: string) {
	const artifact = db
		.prepare<[string], { task_id: string }>('select task_id from v2_core_artifacts where id = ?')
		.get(artifactId);

	if (!artifact) {
		throw new Error(`Artifact ${artifactId} was not found in the v2 core database.`);
	}

	if (artifact.task_id !== taskId) {
		throw new Error(`Artifact ${artifactId} does not belong to task ${taskId}.`);
	}
}

function assertReviewBelongsToTask(db: Database.Database, reviewId: string, taskId: string) {
	const review = db
		.prepare<[string], { task_id: string }>('select task_id from v2_core_reviews where id = ?')
		.get(reviewId);

	if (!review) {
		throw new Error(`Review ${reviewId} was not found in the v2 core database.`);
	}

	if (review.task_id !== taskId) {
		throw new Error(`Review ${reviewId} does not belong to task ${taskId}.`);
	}
}

function hasApprovedReviewForTask(db: Database.Database, taskId: string) {
	const row = db
		.prepare<[string], { id: string }>(
			`
				select id
				from v2_core_reviews
				where task_id = ? and status = 'approved'
				limit 1
			`
		)
		.get(taskId);

	return Boolean(row);
}

function hasAcceptanceDecisionForTask(db: Database.Database, taskId: string) {
	const row = db
		.prepare<[string], { id: string }>(
			`
				select id
				from v2_core_decisions
				where task_id = ? and decision_type = 'accept_task_output'
				limit 1
			`
		)
		.get(taskId);

	return Boolean(row);
}

function assertTaskCanCloseDone(db: Database.Database, taskId: string) {
	if (!hasApprovedReviewForTask(db, taskId)) {
		throw new Error(`Task ${taskId} cannot move to done without an approved review.`);
	}

	if (!hasAcceptanceDecisionForTask(db, taskId)) {
		throw new Error(`Task ${taskId} cannot move to done without an accept_task_output decision.`);
	}
}

function sourceIsApprovedReview(
	db: Database.Database,
	source: V2CoreMemoryInput['sources'][number]
) {
	if (source.sourceTable !== 'v2_core_reviews') {
		return false;
	}

	const row = db
		.prepare<[string], { id: string }>(
			`
				select id
				from v2_core_reviews
				where id = ? and status = 'approved'
			`
		)
		.get(source.sourceId);

	return Boolean(row);
}

function assertTrustedMemoryHasApprovedReviewSource(
	db: Database.Database,
	sources: V2CoreMemoryInput['sources']
) {
	if (sources.some((source) => sourceIsApprovedReview(db, source))) {
		return;
	}

	throw new Error('Trusted memory promotion requires at least one approved review source.');
}

function markReviewedArtifactStatus(
	db: Database.Database,
	artifactId: string | null,
	reviewStatus: string
) {
	if (!artifactId) {
		return;
	}

	if (reviewStatus === 'approved') {
		db.prepare("update v2_core_artifacts set status = 'accepted' where id = ?").run(artifactId);
		return;
	}

	if (reviewStatus === 'rejected') {
		db.prepare("update v2_core_artifacts set status = 'rejected' where id = ?").run(artifactId);
	}
}

function markAcceptedTaskArtifacts(
	db: Database.Database,
	taskId: string | null,
	runId: string | null
) {
	if (!taskId) {
		return;
	}

	if (runId) {
		db.prepare(
			`
				update v2_core_artifacts
				set status = 'accepted'
				where task_id = ?
					and run_id = ?
					and status = 'submitted'
			`
		).run(taskId, runId);
		return;
	}

	db.prepare(
		`
			update v2_core_artifacts
			set status = 'accepted'
			where task_id = ?
				and status = 'submitted'
		`
	).run(taskId);
}

function recordSourceReference(
	db: Database.Database,
	recordTable: string,
	recordId: string,
	source: V2CoreSourceReferenceInput | undefined
) {
	db.prepare(
		`
			insert into v2_core_source_references (
				record_table,
				record_id,
				source_system,
				source_collection,
				source_id,
				field,
				note
			) values (?, ?, ?, ?, ?, ?, ?)
		`
	).run(
		recordTable,
		recordId,
		source?.sourceSystem?.trim() || 'ams-v2-core',
		source?.sourceCollection?.trim() || recordTable,
		source?.sourceId?.trim() || recordId,
		source?.field?.trim() || 'record',
		source?.note?.trim() || ''
	);
}

function sourceReferencesFor(db: Database.Database, recordTable: string, recordId: string) {
	return db
		.prepare<
			[string, string],
			{
				record_table: string;
				record_id: string;
				source_system: string;
				source_collection: string;
				source_id: string;
				field: string;
				note: string;
			}
		>(
			`
				select record_table, record_id, source_system, source_collection, source_id, field, note
				from v2_core_source_references
				where record_table = ? and record_id = ?
				order by source_system, source_collection, source_id, field
			`
		)
		.all(recordTable, recordId)
		.map((source) => ({
			recordTable: source.record_table,
			recordId: source.record_id,
			sourceSystem: source.source_system,
			sourceCollection: source.source_collection,
			sourceId: source.source_id,
			field: source.field,
			note: source.note
		}));
}

function groupedCounts(db: Database.Database, sql: string): Record<string, number> {
	return Object.fromEntries(
		db
			.prepare<[], CountRow>(sql)
			.all()
			.map((row) => [row.value, row.count])
	);
}

export function createV2CoreProject(db: Database.Database, input: V2CoreProjectInput) {
	const projectId = input.id?.trim() || createId('project');
	const name = requiredText(input.name, 'name');

	ensureNoRow(db, 'v2_core_projects', projectId, 'Project');

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_projects (
					id,
					name,
					summary,
					status,
					workspace_root
				) values (?, ?, ?, ?, ?)
			`
		).run(
			projectId,
			name,
			optionalTextWithDefault(input.summary),
			input.status?.trim() || 'active',
			input.workspaceRoot?.trim() || process.cwd()
		);
		recordSourceReference(db, 'v2_core_projects', projectId, input.source);
	})();

	return readV2CoreProject(db, projectId);
}

export function createV2CoreGoal(db: Database.Database, input: V2CoreGoalInput) {
	const goalId = input.id?.trim() || createId('goal');
	const projectId = requiredText(input.projectId, 'projectId');
	const title = requiredText(input.title, 'title');
	const successCriteria = requiredText(input.successCriteria, 'successCriteria');

	ensureRow(db, 'v2_core_projects', projectId, 'Project');
	ensureNoRow(db, 'v2_core_goals', goalId, 'Goal');

	const parentGoalId = optionalText(input.parentGoalId);
	if (parentGoalId) {
		ensureRow(db, 'v2_core_goals', parentGoalId, 'Parent goal');
	}

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_goals (
					id,
					project_id,
					parent_goal_id,
					title,
					summary,
					success_criteria,
					status
				) values (?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			goalId,
			projectId,
			parentGoalId,
			title,
			optionalTextWithDefault(input.summary),
			successCriteria,
			input.status?.trim() || 'active'
		);
		recordSourceReference(db, 'v2_core_goals', goalId, input.source);
	})();

	return readV2CoreGoal(db, goalId);
}

export function createV2CoreTask(db: Database.Database, input: V2CoreTaskInput) {
	const taskId = input.id?.trim() || createId('task');
	const goalId = requiredText(input.goalId, 'goalId');
	const title = requiredText(input.title, 'title');
	const successCriteria = requiredText(input.successCriteria, 'successCriteria');
	const validationPlan = requiredText(input.validationPlan, 'validationPlan');
	const goal = db
		.prepare<
			[string],
			{ id: string; project_id: string }
		>('select id, project_id from v2_core_goals where id = ?')
		.get(goalId);

	if (!goal) {
		throw new Error(`Goal ${goalId} was not found in the v2 core database.`);
	}

	const projectId = input.projectId?.trim() || goal.project_id;
	if (projectId !== goal.project_id) {
		throw new Error(`Goal ${goalId} does not belong to project ${projectId}.`);
	}

	ensureNoRow(db, 'v2_core_tasks', taskId, 'Task');

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_tasks (
					id,
					project_id,
					goal_id,
					title,
					summary,
					success_criteria,
					validation_plan,
					status
				) values (?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			taskId,
			projectId,
			goalId,
			title,
			optionalTextWithDefault(input.summary),
			successCriteria,
			validationPlan,
			input.status?.trim() || 'ready'
		);
		recordSourceReference(db, 'v2_core_tasks', taskId, input.source);
	})();

	return readV2CoreTaskDetail(db, taskId);
}

export function createV2CoreFollowupTask(db: Database.Database, input: V2CoreFollowupTaskInput) {
	const sourceTaskId = requiredText(input.sourceTaskId, 'sourceTaskId');
	const reason = requiredText(input.reason, 'reason');
	const sourceTask = db
		.prepare<
			[string],
			{ id: string; project_id: string; goal_id: string }
		>('select id, project_id, goal_id from v2_core_tasks where id = ?')
		.get(sourceTaskId);

	if (!sourceTask) {
		throw new Error(`Source task ${sourceTaskId} was not found in the v2 core database.`);
	}

	const goalId = input.goalId?.trim() || sourceTask.goal_id;
	const result = createV2CoreTask(db, {
		...input,
		goalId,
		projectId: sourceTask.project_id,
		source: {
			sourceSystem: 'ams-v2-core',
			sourceCollection: 'followup_tasks',
			sourceId: sourceTaskId,
			field: 'sourceTaskId',
			note: reason
		}
	});
	const followupTaskId = result?.task.id;

	if (!followupTaskId) {
		throw new Error('Follow-up task was created, but readback failed.');
	}

	const decisionId = input.decisionId?.trim() || createId('decision');
	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_decisions (
					id,
					project_id,
					goal_id,
					task_id,
					run_id,
					review_id,
					supersedes_decision_id,
					decision_type,
					summary,
					rationale,
					decided_at
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			decisionId,
			sourceTask.project_id,
			goalId,
			followupTaskId,
			null,
			null,
			null,
			'create_followup_task',
			`Created follow-up task from ${sourceTaskId}.`,
			reason,
			new Date().toISOString()
		);
		recordSourceReference(db, 'v2_core_decisions', decisionId, {
			sourceCollection: 'followup_tasks',
			sourceId: sourceTaskId,
			field: 'sourceTaskId',
			note: reason
		});
	})();

	return readV2CoreTaskDetail(db, followupTaskId);
}

export function recordV2CoreTaskDependency(
	db: Database.Database,
	input: V2CoreTaskDependencyInput
) {
	const dependencyId = input.id?.trim() || createId('task_dependency');
	const taskId = requiredText(input.taskId, 'taskId');
	const dependsOnTaskId = requiredText(input.dependsOnTaskId, 'dependsOnTaskId');
	const reason = requiredText(input.reason, 'reason');
	const status = input.status?.trim() || 'unresolved';

	if (!['resolved', 'unresolved'].includes(status)) {
		throw new Error(`Task dependency status ${status} is not allowed.`);
	}
	if (taskId === dependsOnTaskId) {
		throw new Error('A task cannot depend on itself.');
	}

	const task = db
		.prepare<
			[string],
			{ id: string; project_id: string }
		>('select id, project_id from v2_core_tasks where id = ?')
		.get(taskId);
	if (!task) {
		throw new Error(`Task ${taskId} was not found in the v2 core database.`);
	}
	const dependsOnTask = db
		.prepare<
			[string],
			{ id: string; project_id: string }
		>('select id, project_id from v2_core_tasks where id = ?')
		.get(dependsOnTaskId);
	if (!dependsOnTask) {
		throw new Error(`Dependency task ${dependsOnTaskId} was not found in the v2 core database.`);
	}
	if (task.project_id !== dependsOnTask.project_id) {
		throw new Error(
			`Task ${taskId} and dependency task ${dependsOnTaskId} must belong to the same project.`
		);
	}

	ensureNoRow(db, 'v2_core_task_dependencies', dependencyId, 'Task dependency');
	const existing = db
		.prepare<[string, string], { id: string }>(
			`
				select id
				from v2_core_task_dependencies
				where task_id = ? and depends_on_task_id = ?
			`
		)
		.get(taskId, dependsOnTaskId);
	if (existing) {
		throw new Error(
			`Task dependency ${existing.id} already links ${taskId} to ${dependsOnTaskId}.`
		);
	}

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_task_dependencies (
					id,
					task_id,
					depends_on_task_id,
					status,
					reason
				) values (?, ?, ?, ?, ?)
			`
		).run(dependencyId, taskId, dependsOnTaskId, status, reason);
		recordSourceReference(db, 'v2_core_task_dependencies', dependencyId, input.source);
	})();

	return readV2CoreTaskDetail(db, taskId);
}

export function recordV2CoreRun(db: Database.Database, input: V2CoreRunInput) {
	const runId = input.id?.trim() || createId('run');
	const taskId = requiredText(input.taskId, 'taskId');
	const now = new Date().toISOString();

	ensureRow(db, 'v2_core_tasks', taskId, 'Task');
	ensureNoRow(db, 'v2_core_runs', runId, 'Run');

	const modelProviderId = optionalText(input.modelProviderId);
	if (modelProviderId) {
		ensureRow(db, 'v2_core_model_providers', modelProviderId, 'Model provider');
	}

	const status = input.status?.trim() || 'completed';
	const endedAt =
		optionalText(input.endedAt) ??
		(['completed', 'failed', 'canceled'].includes(status) ? now : null);

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_runs (
					id,
					task_id,
					model_provider_id,
					status,
					input_summary,
					action_summary,
					result_summary,
					validation_summary,
					started_at,
					ended_at
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			runId,
			taskId,
			modelProviderId,
			status,
			optionalTextWithDefault(input.inputSummary),
			optionalTextWithDefault(input.actionSummary),
			optionalTextWithDefault(input.resultSummary),
			optionalTextWithDefault(input.validationSummary),
			optionalText(input.startedAt) ?? now,
			endedAt
		);
		recordSourceReference(db, 'v2_core_runs', runId, input.source);
	})();

	return readV2CoreTaskDetail(db, taskId);
}

export function launchV2CoreAgentExecutionCycle(
	db: Database.Database,
	input: V2CoreAgentExecutionCycleInput
): V2CoreAgentExecutionCycle {
	const nextWork = readV2CoreNextWork(db, {
		projectId: input.projectId,
		goalId: input.goalId,
		limit: input.limit
	});
	const selectedCandidate = nextWork.candidates[0] ?? null;

	if (!selectedCandidate) {
		return {
			status: 'no_work',
			reason: 'No eligible work exists for the current project or goal scope.',
			nextWork,
			selectedCandidate: null,
			providerRunLaunch: null,
			closeout: null
		};
	}

	if (selectedCandidate.action !== 'start_task') {
		return {
			status: 'not_dispatchable',
			reason:
				selectedCandidate.action === 'review_output'
					? 'The next eligible item is awaiting review; review output before dispatching more work.'
					: 'The next eligible item is blocked; resolve the blocker before dispatching more work.',
			nextWork,
			selectedCandidate,
			providerRunLaunch: null,
			closeout: null
		};
	}

	const providerRunLaunch = launchV2CoreProviderRun(db, {
		runId: input.runId,
		decisionId: input.decisionId,
		taskId: selectedCandidate.taskId,
		modelProviderId: input.modelProviderId,
		inputSummary:
			input.inputSummary ??
			`Execute selected next work ${selectedCandidate.taskId} through the owned agent execution cycle.`,
		actionSummary:
			input.actionSummary ??
			'Launch a provider-linked run from existing next-work and bounded agent-work-packet state; result, artifacts, review, and acceptance remain explicit closeout actions.'
	});

	return {
		status: 'launched',
		reason: 'Selected ready active-goal work and launched a provider-linked run.',
		nextWork,
		selectedCandidate,
		providerRunLaunch,
		closeout: {
			command: `npm run v2:core-db -- managed-run-lifecycle --task ${providerRunLaunch.taskId} --run ${providerRunLaunch.runId}`,
			requiredInputs: [
				'--artifact <id>',
				'--uri <artifact-uri>',
				'--title <artifact-title>',
				'--result <summary>',
				'--validation <summary>',
				'--review <id>',
				'--decision <id>'
			],
			reviewRequiredBeforeDone: true,
			acceptanceDecisionRequiredBeforeDone: true
		}
	};
}

export function readV2CoreCloseoutPacket(
	db: Database.Database,
	input: { taskId: string; runId: string }
): V2CoreCloseoutPacket | null {
	const taskId = requiredText(input.taskId, 'taskId');
	const runId = requiredText(input.runId, 'runId');
	const detail = readV2CoreTaskDetail(db, taskId);

	if (!detail) {
		return null;
	}

	const run = detail.runs.find((candidate) => candidate.id === runId) ?? null;
	const existingRunArtifacts = detail.artifacts.filter((artifact) => artifact.runId === runId);
	const existingRunReviews = detail.reviews.filter((review) => review.runId === runId);
	const acceptedOutputDecisions = detail.decisions.filter(
		(decision) => decision.decisionType === 'accept_task_output'
	);
	const suggestedRecordIds = {
		artifactId: `artifact_${taskId}_closeout`,
		reviewId: `review_${taskId}_closeout`,
		acceptDecisionId: `decision_${taskId}_closeout_acceptance`
	};
	const blockers = [
		...(run ? [] : [`Run ${runId} is not a current run for task ${taskId}.`]),
		...(detail.task.status === 'in_progress'
			? []
			: [`Task ${taskId} has status ${detail.task.status}; expected in_progress.`]),
		...(run && run.status === 'planned'
			? []
			: run
				? [`Run ${runId} has status ${run.status}; expected planned.`]
				: []),
		...(run && run.modelProviderId
			? []
			: run
				? [`Run ${runId} is not linked to a model provider.`]
				: []),
		...(existingRunReviews.some((review) => review.status === 'approved')
			? [`Run ${runId} already has an approved review; inspect before drafting a new closeout.`]
			: []),
		...(acceptedOutputDecisions.length > 0
			? [`Task ${taskId} already has an accept_task_output decision.`]
			: [])
	];
	const baseCommand =
		`npm run v2:core-db -- managed-run-lifecycle --task ${taskId} --run ${runId}` +
		` --artifact ${suggestedRecordIds.artifactId}` +
		" --uri '<artifact-uri>'" +
		" --title '<artifact-title>'" +
		" --result '<human-authored-result-summary>'" +
		" --validation '<validation-summary>'" +
		` --review ${suggestedRecordIds.reviewId}` +
		` --decision ${suggestedRecordIds.acceptDecisionId}`;

	return {
		task: detail.task,
		project: detail.project,
		goal: detail.goal,
		run,
		eligible: blockers.length === 0,
		blockers,
		requiredInputs: [
			'--artifact <id>',
			'--uri <artifact-uri>',
			'--title <artifact-title>',
			'--result <summary>',
			'--validation <summary>',
			'--review <id>',
			'--decision <id>'
		],
		humanAuthoredInputs: [
			'--uri <artifact-uri>',
			'--title <artifact-title>',
			'--result <human-authored-result-summary>',
			'--validation <validation-summary>'
		],
		suggestedRecordIds,
		gateState: {
			reviewRequiredBeforeDone: true,
			acceptanceDecisionRequiredBeforeDone: true,
			taskStatus: detail.task.status,
			runStatus: run?.status ?? null,
			existingRunArtifactIds: existingRunArtifacts.map((artifact) => artifact.id),
			existingRunReviewIds: existingRunReviews.map((review) => review.id),
			acceptedOutputDecisionIds: acceptedOutputDecisions.map((decision) => decision.id)
		},
		validationChecklist: [
			`Run task validation plan: ${detail.task.validationPlan}`,
			`Inspect task state: npm run v2:core-db -- inspect-task --task ${taskId} --json`,
			`Preview closeout writes: ${baseCommand} --dry-run --json`,
			'Confirm artifact URI points to the durable output being reviewed.',
			'Keep result and validation summaries human/agent-authored from actual work evidence.',
			'After closeout, read back inspect-task and next-work before treating the task as done.'
		],
		command: {
			dryRun: `${baseCommand} --dry-run`,
			template: baseCommand
		},
		sourceLinks: [
			{ recordType: 'task', recordId: taskId, reason: 'Task being closed out.' },
			{ recordType: 'run', recordId: runId, reason: 'Provider run being closed out.' },
			{ recordType: 'goal', recordId: detail.goal.id, reason: 'Goal advanced by the task.' },
			{ recordType: 'project', recordId: detail.project.id, reason: 'Project containing the task.' }
		]
	};
}

export function launchV2CoreProviderRun(
	db: Database.Database,
	input: V2CoreProviderRunLaunchInput
): V2CoreProviderRunLaunch {
	const taskId = requiredText(input.taskId, 'taskId');
	const modelProviderId = requiredText(input.modelProviderId, 'modelProviderId');
	const runId = input.runId?.trim() || createId('run');
	const task = db
		.prepare<
			[string],
			{ id: string; status: string; title: string; project_id: string; goal_id: string }
		>('select id, status, title, project_id, goal_id from v2_core_tasks where id = ?')
		.get(taskId);

	if (!task) {
		throw new Error(`Task ${taskId} was not found in the v2 core database.`);
	}
	if (!['ready', 'in_progress'].includes(task.status)) {
		throw new Error(
			`Task ${taskId} cannot launch a provider run from status ${task.status}; expected ready or in_progress.`
		);
	}
	if (task.status === 'ready') {
		const unmetDependencies = readUnmetV2CoreTaskDependencies(db, taskId);
		if (unmetDependencies.length > 0) {
			throw new Error(
				`Task ${taskId} cannot launch a provider run before dependencies are done: ${unmetDependencies
					.map((dependency) => `${dependency.task_id} (${dependency.status})`)
					.join(', ')}.`
			);
		}
	}
	ensureRow(db, 'v2_core_model_providers', modelProviderId, 'Model provider');
	ensureNoRow(db, 'v2_core_runs', runId, 'Run');

	recordV2CoreRun(db, {
		id: runId,
		taskId,
		modelProviderId,
		status: 'planned',
		inputSummary:
			input.inputSummary ??
			`Launch provider-backed run for task ${taskId} using existing v2 agent-work-packet context.`,
		actionSummary:
			input.actionSummary ??
			'Prepare provider run packet; execution result, artifacts, review, and acceptance remain explicit follow-up actions.',
		resultSummary: '',
		validationSummary: 'Provider run launched; result validation is pending provider execution.',
		source: {
			sourceCollection: 'provider_run_launches',
			sourceId: taskId,
			field: 'runId',
			note: `Launched provider run ${runId} for task ${taskId}.`
		}
	});

	if (task.status === 'ready') {
		transitionV2CoreTaskStatus(db, {
			decisionId: input.decisionId,
			taskId,
			status: 'in_progress',
			summary: `Launch provider-backed run ${runId}.`,
			runId
		});
	}

	const taskDetail = readV2CoreTaskDetail(db, taskId);
	const agentWorkPacket = readV2CoreAgentWorkPacket(db, taskId);
	if (!taskDetail || !agentWorkPacket) {
		throw new Error(`Provider run ${runId} launched, but readback failed for task ${taskId}.`);
	}

	return {
		taskDetail,
		runId,
		taskId,
		modelProviderId,
		taskStatusBeforeLaunch: task.status,
		taskStatusAfterLaunch: taskDetail.task.status,
		agentWorkPacket
	};
}

export function completeV2CoreProviderRun(
	db: Database.Database,
	input: V2CoreProviderRunCompletionInput
): V2CoreProviderRunCompletion {
	const runId = requiredText(input.runId, 'runId');
	const taskId = requiredText(input.taskId, 'taskId');
	const status = requiredText(input.status, 'status') as 'completed' | 'failed';
	const resultSummary = requiredText(input.resultSummary, 'resultSummary');

	if (!['completed', 'failed'].includes(status)) {
		throw new Error(`Provider run completion status ${status} is not allowed.`);
	}

	const run = db
		.prepare<
			[string],
			{
				id: string;
				task_id: string;
				status: string;
			}
		>('select id, task_id, status from v2_core_runs where id = ?')
		.get(runId);

	if (!run) {
		throw new Error(`Run ${runId} was not found in the v2 core database.`);
	}
	if (run.task_id !== taskId) {
		throw new Error(`Run ${runId} belongs to task ${run.task_id}, not ${taskId}.`);
	}
	if (run.status !== 'planned') {
		throw new Error(
			`Run ${runId} cannot be completed from status ${run.status}; expected planned.`
		);
	}

	ensureRow(db, 'v2_core_tasks', taskId, 'Task');

	db.transaction(() => {
		db.prepare(
			`
				update v2_core_runs
				set
					status = ?,
					result_summary = ?,
					validation_summary = ?,
					ended_at = ?
				where id = ?
			`
		).run(
			status,
			resultSummary,
			optionalTextWithDefault(input.validationSummary),
			new Date().toISOString(),
			runId
		);
		recordSourceReference(db, 'v2_core_runs', runId, {
			sourceCollection: 'provider_run_completions',
			sourceId: taskId,
			field: 'status',
			note: `Completed provider run ${runId} with status ${status}.`
		});
	})();

	const taskDetail = readV2CoreTaskDetail(db, taskId);
	if (!taskDetail) {
		throw new Error(`Provider run ${runId} completed, but readback failed for task ${taskId}.`);
	}

	return {
		taskDetail,
		runId,
		taskId,
		statusBeforeCompletion: run.status,
		statusAfterCompletion: status
	};
}

function requireManagedRunFollowupInput(input: V2CoreManagedRunLifecycleCompleteInput) {
	const values = [
		input.followupTaskId,
		input.followupTitle,
		input.followupSuccessCriteria,
		input.followupValidationPlan,
		input.followupRationale
	];
	const hasAny = values.some((value) => Boolean(optionalText(value)));

	if (!hasAny) {
		return null;
	}

	return {
		id: requiredText(input.followupTaskId, 'followupTaskId'),
		title: requiredText(input.followupTitle, 'followupTitle'),
		successCriteria: requiredText(input.followupSuccessCriteria, 'followupSuccessCriteria'),
		validationPlan: requiredText(input.followupValidationPlan, 'followupValidationPlan'),
		rationale: requiredText(input.followupRationale, 'followupRationale')
	};
}

function readManagedRunLifecyclePreflight(
	db: Database.Database,
	input: V2CoreManagedRunLifecycleCompleteInput
) {
	const taskId = requiredText(input.taskId, 'taskId');
	const runId = requiredText(input.runId, 'runId');
	const artifactId = requiredText(input.artifactId, 'artifactId');
	const reviewId = requiredText(input.reviewId, 'reviewId');
	const acceptDecisionId = requiredText(input.acceptDecisionId, 'acceptDecisionId');
	const task = db
		.prepare<
			[string],
			{ id: string; status: string; project_id: string; goal_id: string }
		>('select id, status, project_id, goal_id from v2_core_tasks where id = ?')
		.get(taskId);

	if (!task) {
		throw new Error(`Task ${taskId} was not found in the v2 core database.`);
	}
	if (task.status !== 'in_progress') {
		throw new Error(
			`Task ${taskId} cannot complete managed-run lifecycle from status ${task.status}; expected in_progress.`
		);
	}

	const run = db
		.prepare<
			[string],
			{ id: string; task_id: string; status: string }
		>('select id, task_id, status from v2_core_runs where id = ?')
		.get(runId);

	if (!run) {
		throw new Error(`Run ${runId} was not found in the v2 core database.`);
	}
	if (run.task_id !== taskId) {
		throw new Error(`Run ${runId} belongs to task ${run.task_id}, not ${taskId}.`);
	}
	if (run.status !== 'planned') {
		throw new Error(
			`Run ${runId} cannot complete managed-run lifecycle from status ${run.status}; expected planned.`
		);
	}

	ensureNoRow(db, 'v2_core_artifacts', artifactId, 'Artifact');
	ensureNoRow(db, 'v2_core_reviews', reviewId, 'Review');
	ensureNoRow(db, 'v2_core_decisions', acceptDecisionId, 'Decision');

	const toolExecutionId = optionalText(input.toolExecutionId);
	const toolId = optionalText(input.toolId);
	const toolInputSummary = optionalText(input.toolInputSummary);
	if (toolExecutionId) {
		if (!toolId) {
			throw new Error('Missing required toolId when toolExecutionId is provided.');
		}
		if (!toolInputSummary) {
			throw new Error('Missing required toolInputSummary when toolExecutionId is provided.');
		}
		ensureRow(db, 'v2_core_tools', toolId, 'Tool');
		ensureNoRow(db, 'v2_core_tool_executions', toolExecutionId, 'Tool execution');
	}

	const followup = requireManagedRunFollowupInput(input);
	if (followup) {
		ensureNoRow(db, 'v2_core_tasks', followup.id, 'Task');
	}

	return { task, run, followup };
}

export function completeV2CoreManagedRunLifecycle(
	db: Database.Database,
	input: V2CoreManagedRunLifecycleCompleteInput
): V2CoreManagedRunLifecycleCompleteResult {
	const taskId = requiredText(input.taskId, 'taskId');
	const runId = requiredText(input.runId, 'runId');
	const artifactId = requiredText(input.artifactId, 'artifactId');
	const artifactUri = requiredText(input.artifactUri, 'artifactUri');
	const artifactTitle = requiredText(input.artifactTitle, 'artifactTitle');
	const resultSummary = requiredText(input.resultSummary, 'resultSummary');
	const validationSummary = requiredText(input.validationSummary, 'validationSummary');
	const reviewId = requiredText(input.reviewId, 'reviewId');
	const acceptDecisionId = requiredText(input.acceptDecisionId, 'acceptDecisionId');
	const preflight = readManagedRunLifecyclePreflight(db, input);
	const toolExecutionId = optionalText(input.toolExecutionId);
	const followup = preflight.followup;
	const plannedOperations = [
		'complete_provider_run',
		...(toolExecutionId ? ['record_tool_execution'] : []),
		'attach_artifact',
		'transition_task_to_review',
		'record_approved_review',
		'record_accept_task_output_decision',
		'transition_task_to_done',
		...(followup ? ['create_followup_task'] : [])
	];
	const createdRecordIds = {
		runId,
		artifactId,
		reviewId,
		acceptDecisionId,
		toolExecutionId,
		followupTaskId: followup?.id ?? null
	};

	if (input.dryRun) {
		return {
			mode: 'complete',
			dryRun: true,
			preflight: {
				taskId,
				runId,
				taskStatus: preflight.task.status,
				runStatus: preflight.run.status
			},
			plannedOperations,
			createdRecordIds,
			taskDetail: readV2CoreTaskDetail(db, taskId),
			followupTaskDetail: null
		};
	}

	let followupTaskDetail: V2CoreTaskDetail | null = null;
	db.transaction(() => {
		completeV2CoreProviderRun(db, {
			taskId,
			runId,
			status: 'completed',
			resultSummary,
			validationSummary
		});

		if (toolExecutionId) {
			recordV2CoreToolExecution(db, {
				id: toolExecutionId,
				taskId,
				runId,
				toolId: requiredText(input.toolId, 'toolId'),
				status: 'completed',
				inputSummary: requiredText(input.toolInputSummary, 'toolInputSummary'),
				resultSummary: validationSummary,
				source: {
					sourceCollection: 'managed_run_lifecycle',
					sourceId: taskId,
					field: 'toolExecutionId',
					note: `Recorded tool validation during managed-run lifecycle completion for ${taskId}.`
				}
			});
		}

		attachV2CoreArtifact(db, {
			id: artifactId,
			taskId,
			runId,
			uri: artifactUri,
			role: input.artifactRole?.trim() || 'deliverable',
			title: artifactTitle,
			summary: input.artifactSummary ?? input.reviewSummary ?? undefined,
			status: 'submitted',
			source: {
				sourceCollection: 'managed_run_lifecycle',
				sourceId: taskId,
				field: 'artifactId',
				note: `Attached lifecycle artifact ${artifactId} for task ${taskId}.`
			}
		});

		transitionV2CoreTaskStatus(db, {
			taskId,
			runId,
			status: 'review',
			summary: `Submit managed-run lifecycle output ${artifactId} for review.`
		});

		recordV2CoreReview(db, {
			id: reviewId,
			taskId,
			runId,
			artifactId,
			status: 'approved',
			summary:
				input.reviewSummary?.trim() || `Approved managed-run lifecycle output for task ${taskId}.`,
			source: {
				sourceCollection: 'managed_run_lifecycle',
				sourceId: taskId,
				field: 'reviewId',
				note: `Recorded lifecycle review ${reviewId} for task ${taskId}.`
			}
		});

		recordV2CoreDecision(db, {
			id: acceptDecisionId,
			taskId,
			runId,
			reviewId,
			decisionType: 'accept_task_output',
			summary: `Accept managed-run lifecycle output for task ${taskId}.`,
			rationale:
				input.acceptanceRationale?.trim() ||
				'Accepted through the managed-run lifecycle complete helper after approved review.',
			source: {
				sourceCollection: 'managed_run_lifecycle',
				sourceId: taskId,
				field: 'acceptDecisionId',
				note: `Recorded lifecycle acceptance ${acceptDecisionId} for task ${taskId}.`
			}
		});

		transitionV2CoreTaskStatus(db, {
			taskId,
			runId,
			status: 'done',
			summary: 'Close task after managed-run lifecycle acceptance.'
		});

		if (followup) {
			followupTaskDetail = createV2CoreFollowupTask(db, {
				id: followup.id,
				sourceTaskId: taskId,
				title: followup.title,
				successCriteria: followup.successCriteria,
				validationPlan: followup.validationPlan,
				reason: followup.rationale,
				status: 'ready'
			});
		}
	})();

	return {
		mode: 'complete',
		dryRun: false,
		preflight: {
			taskId,
			runId,
			taskStatus: preflight.task.status,
			runStatus: preflight.run.status
		},
		plannedOperations,
		createdRecordIds,
		taskDetail: readV2CoreTaskDetail(db, taskId),
		followupTaskDetail
	};
}

export function registerV2CoreModelProvider(
	db: Database.Database,
	input: V2CoreModelProviderInput
) {
	const providerId = input.id?.trim() || createId('provider');
	const name = requiredText(input.name, 'name');

	ensureNoRow(db, 'v2_core_model_providers', providerId, 'Model provider');

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_model_providers (
					id,
					name,
					kind,
					status
				) values (?, ?, ?, ?)
			`
		).run(
			providerId,
			name,
			input.kind?.trim() || 'external_ai',
			input.status?.trim() || 'available'
		);
		recordSourceReference(db, 'v2_core_model_providers', providerId, input.source);
	})();

	return readV2CoreModelProvider(db, providerId);
}

export function registerV2CoreTool(db: Database.Database, input: V2CoreToolInput) {
	const toolId = input.id?.trim() || createId('tool');
	const name = requiredText(input.name, 'name');

	ensureNoRow(db, 'v2_core_tools', toolId, 'Tool');

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_tools (
					id,
					name,
					description,
					kind,
					risk_level,
					approval_requirement,
					status
				) values (?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			toolId,
			name,
			optionalTextWithDefault(input.description),
			input.kind?.trim() || 'local_cli',
			input.riskLevel?.trim() || 'medium',
			input.approvalRequirement?.trim() || 'none',
			input.status?.trim() || 'available'
		);
		recordSourceReference(db, 'v2_core_tools', toolId, input.source);
	})();

	return readV2CoreTool(db, toolId);
}

export function recordV2CoreToolExecution(db: Database.Database, input: V2CoreToolExecutionInput) {
	const executionId = input.id?.trim() || createId('tool_execution');
	const toolId = requiredText(input.toolId, 'toolId');
	const taskId = requiredText(input.taskId, 'taskId');
	const inputSummary = requiredText(input.inputSummary, 'inputSummary');
	const now = new Date().toISOString();

	ensureRow(db, 'v2_core_tools', toolId, 'Tool');
	ensureRow(db, 'v2_core_tasks', taskId, 'Task');
	ensureNoRow(db, 'v2_core_tool_executions', executionId, 'Tool execution');

	const runId = optionalText(input.runId);
	if (runId) {
		assertRunBelongsToTask(db, runId, taskId);
	}

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_tool_executions (
					id,
					tool_id,
					task_id,
					run_id,
					status,
					input_summary,
					result_summary,
					error_summary,
					started_at,
					ended_at
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			executionId,
			toolId,
			taskId,
			runId,
			input.status?.trim() || 'completed',
			inputSummary,
			optionalTextWithDefault(input.resultSummary),
			optionalTextWithDefault(input.errorSummary),
			optionalText(input.startedAt) ?? now,
			optionalText(input.endedAt) ?? now
		);
		recordSourceReference(db, 'v2_core_tool_executions', executionId, input.source);
	})();

	return readV2CoreTaskDetail(db, taskId);
}

export function attachV2CoreArtifact(db: Database.Database, input: V2CoreArtifactInput) {
	const artifactId = input.id?.trim() || createId('artifact');
	const taskId = requiredText(input.taskId, 'taskId');
	const uri = requiredText(input.uri, 'uri');
	const title = requiredText(input.title, 'title');
	const task = db
		.prepare<
			[string],
			{ id: string; project_id: string }
		>('select id, project_id from v2_core_tasks where id = ?')
		.get(taskId);

	if (!task) {
		throw new Error(`Task ${taskId} was not found in the v2 core database.`);
	}

	const projectId = input.projectId?.trim() || task.project_id;
	if (projectId !== task.project_id) {
		throw new Error(`Task ${taskId} does not belong to project ${projectId}.`);
	}

	const runId = optionalText(input.runId);
	if (runId) {
		assertRunBelongsToTask(db, runId, taskId);
	}

	ensureNoRow(db, 'v2_core_artifacts', artifactId, 'Artifact');

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_artifacts (
					id,
					project_id,
					task_id,
					run_id,
					uri,
					role,
					title,
					summary,
					status
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			artifactId,
			projectId,
			taskId,
			runId,
			uri,
			input.role?.trim() || 'output',
			title,
			optionalTextWithDefault(input.summary),
			input.status?.trim() || 'submitted'
		);
		recordSourceReference(db, 'v2_core_artifacts', artifactId, input.source);
	})();

	return readV2CoreTaskDetail(db, taskId);
}

export function recordV2CoreReview(db: Database.Database, input: V2CoreReviewInput) {
	const reviewId = input.id?.trim() || createId('review');
	const taskId = requiredText(input.taskId, 'taskId');
	const summary = requiredText(input.summary, 'summary');
	const now = new Date().toISOString();

	ensureRow(db, 'v2_core_tasks', taskId, 'Task');
	ensureNoRow(db, 'v2_core_reviews', reviewId, 'Review');

	const runId = optionalText(input.runId);
	if (runId) {
		assertRunBelongsToTask(db, runId, taskId);
	}

	const artifactId = optionalText(input.artifactId);
	if (artifactId) {
		assertArtifactBelongsToTask(db, artifactId, taskId);
	}
	const reviewStatus = input.status?.trim() || 'approved';
	const resolvedAt =
		reviewStatus === 'open'
			? optionalText(input.resolvedAt)
			: (optionalText(input.resolvedAt) ?? now);

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_reviews (
					id,
					task_id,
					run_id,
					artifact_id,
					status,
					summary,
					created_at,
					resolved_at
				) values (?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			reviewId,
			taskId,
			runId,
			artifactId,
			reviewStatus,
			summary,
			input.createdAt?.trim() || now,
			resolvedAt
		);
		markReviewedArtifactStatus(db, artifactId, reviewStatus);
		recordSourceReference(db, 'v2_core_reviews', reviewId, input.source);
	})();

	return readV2CoreTaskDetail(db, taskId);
}

export function recordV2CoreDecision(db: Database.Database, input: V2CoreDecisionInput) {
	const decisionId = input.id?.trim() || createId('decision');
	const summary = requiredText(input.summary, 'summary');
	const projectId = input.projectId?.trim() || inferProjectIdForDecision(db, input);
	const decisionType = input.decisionType?.trim() || 'implementation_decision';
	const taskId = optionalText(input.taskId);
	const runId = optionalText(input.runId);
	const reviewId = optionalText(input.reviewId);

	ensureRow(db, 'v2_core_projects', projectId, 'Project');
	ensureNoRow(db, 'v2_core_decisions', decisionId, 'Decision');
	if (taskId) {
		if (runId) {
			assertRunBelongsToTask(db, runId, taskId);
		}
		if (reviewId) {
			assertReviewBelongsToTask(db, reviewId, taskId);
		}
	}

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_decisions (
					id,
					project_id,
					goal_id,
					task_id,
					run_id,
					review_id,
					supersedes_decision_id,
					decision_type,
					summary,
					rationale,
					decided_at
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			decisionId,
			projectId,
			optionalText(input.goalId),
			taskId,
			runId,
			reviewId,
			optionalText(input.supersedesDecisionId),
			decisionType,
			summary,
			optionalTextWithDefault(input.rationale),
			input.decidedAt?.trim() || new Date().toISOString()
		);
		if (decisionType === 'accept_task_output') {
			markAcceptedTaskArtifacts(db, taskId, runId);
		}
		recordSourceReference(db, 'v2_core_decisions', decisionId, input.source);
	})();

	return taskId ? readV2CoreTaskDetail(db, taskId) : readV2CoreDecision(db, decisionId);
}

export function promoteV2CoreMemory(db: Database.Database, input: V2CoreMemoryInput) {
	const memoryId = input.id?.trim() || createId('memory_item');
	const projectId = requiredText(input.projectId, 'projectId');
	const title = requiredText(input.title, 'title');
	const body = requiredText(input.body, 'body');

	ensureRow(db, 'v2_core_projects', projectId, 'Project');
	ensureNoRow(db, 'v2_core_memory_items', memoryId, 'Memory item');

	if (input.sources.length === 0) {
		throw new Error('Memory promotion requires at least one source.');
	}
	const status = input.status?.trim() || 'trusted';
	if (status === 'trusted') {
		assertTrustedMemoryHasApprovedReviewSource(db, input.sources);
	}

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_memory_items (
					id,
					project_id,
					title,
					body,
					scope,
					status,
					created_at
				) values (?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			memoryId,
			projectId,
			title,
			body,
			input.scope?.trim() || 'project',
			status,
			input.createdAt?.trim() || new Date().toISOString()
		);

		const sourceStatement = db.prepare(
			`
				insert into v2_core_memory_item_sources (
					memory_item_id,
					source_table,
					source_id,
					reason
				) values (?, ?, ?, ?)
			`
		);
		for (const source of input.sources) {
			sourceStatement.run(
				memoryId,
				requiredText(source.sourceTable, 'sourceTable'),
				requiredText(source.sourceId, 'sourceId'),
				requiredText(source.reason, 'source reason')
			);
		}
		recordSourceReference(db, 'v2_core_memory_items', memoryId, input.source);
	})();

	return readV2CoreMemoryItem(db, memoryId);
}

export function registerV2CoreEvaluationScenario(
	db: Database.Database,
	input: V2CoreEvaluationScenarioInput
) {
	const scenarioId = input.id?.trim() || createId('evaluation_scenario');
	const title = requiredText(input.title, 'title');
	const projectId = optionalText(input.projectId);

	if (projectId) {
		ensureRow(db, 'v2_core_projects', projectId, 'Project');
	}
	ensureNoRow(db, 'v2_core_evaluation_scenarios', scenarioId, 'Evaluation scenario');

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_evaluation_scenarios (
					id,
					project_id,
					title,
					capability_name,
					prompt_or_task,
					rubric,
					status,
					version
				) values (?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			scenarioId,
			projectId,
			title,
			input.capabilityName?.trim() || 'general',
			input.promptOrTask?.trim() || title,
			input.rubric?.trim() || 'Record whether the capability satisfied the task success criteria.',
			input.status?.trim() || 'active',
			input.version?.trim() || 'v1'
		);
		recordSourceReference(db, 'v2_core_evaluation_scenarios', scenarioId, input.source);
	})();

	return readV2CoreEvaluationScenario(db, scenarioId);
}

export function recordV2CoreEvaluationResult(
	db: Database.Database,
	input: V2CoreEvaluationResultInput
) {
	const resultId = input.id?.trim() || createId('evaluation_result');
	const scenarioId = requiredText(input.scenarioId, 'scenarioId');
	const taskId = requiredText(input.taskId, 'taskId');
	const resultSummary = requiredText(input.resultSummary, 'resultSummary');

	ensureRow(db, 'v2_core_evaluation_scenarios', scenarioId, 'Evaluation scenario');
	ensureRow(db, 'v2_core_tasks', taskId, 'Task');
	ensureNoRow(db, 'v2_core_evaluation_results', resultId, 'Evaluation result');

	const runId = optionalText(input.runId);
	if (runId) {
		const run = db
			.prepare<[string], { task_id: string }>('select task_id from v2_core_runs where id = ?')
			.get(runId);
		if (!run) {
			throw new Error(`Run ${runId} was not found in the v2 core database.`);
		}
		if (run.task_id !== taskId) {
			throw new Error(`Run ${runId} does not belong to task ${taskId}.`);
		}
	}

	const toolExecutionId = optionalText(input.toolExecutionId);
	if (toolExecutionId) {
		const execution = db
			.prepare<
				[string],
				{ task_id: string; run_id: string | null }
			>('select task_id, run_id from v2_core_tool_executions where id = ?')
			.get(toolExecutionId);
		if (!execution) {
			throw new Error(`Tool execution ${toolExecutionId} was not found in the v2 core database.`);
		}
		if (execution.task_id !== taskId) {
			throw new Error(`Tool execution ${toolExecutionId} does not belong to task ${taskId}.`);
		}
		if (runId && execution.run_id && execution.run_id !== runId) {
			throw new Error(`Tool execution ${toolExecutionId} does not belong to run ${runId}.`);
		}
	}

	const providerId = optionalText(input.providerId);
	if (providerId) {
		ensureRow(db, 'v2_core_model_providers', providerId, 'Model provider');
	}

	db.transaction(() => {
		db.prepare(
			`
				insert into v2_core_evaluation_results (
					id,
					scenario_id,
					task_id,
					run_id,
					tool_execution_id,
					provider_id,
					model_id,
					status,
					score,
					rubric_summary,
					result_summary,
					failure_summary,
					created_at
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			resultId,
			scenarioId,
			taskId,
			runId,
			toolExecutionId,
			providerId,
			optionalText(input.modelId),
			input.status?.trim() || 'inconclusive',
			input.score ?? null,
			input.rubricSummary?.trim() || '',
			resultSummary,
			input.failureSummary?.trim() || '',
			input.createdAt?.trim() || new Date().toISOString()
		);
		recordSourceReference(db, 'v2_core_evaluation_results', resultId, input.source);
	})();

	return {
		result: readV2CoreEvaluationResult(db, resultId),
		evaluationContext: readV2CoreEvaluationContext(db, { taskId })
	};
}

export function transitionV2CoreTaskStatus(
	db: Database.Database,
	input: V2CoreTransitionTaskInput
) {
	const taskId = requiredText(input.taskId, 'taskId');
	const toStatus = requiredText(input.status, 'status');
	const summary = requiredText(input.summary, 'summary');
	const task = db
		.prepare<
			[string],
			{ id: string; status: string; project_id: string; goal_id: string }
		>('select id, status, project_id, goal_id from v2_core_tasks where id = ?')
		.get(taskId);

	if (!task) {
		throw new Error(`Task ${taskId} was not found in the v2 core database.`);
	}

	const allowed = ALLOWED_TASK_TRANSITIONS[task.status] ?? [];
	if (!allowed.includes(toStatus)) {
		throw new Error(`Cannot transition task ${taskId} from ${task.status} to ${toStatus}.`);
	}
	if (toStatus === 'done') {
		assertTaskCanCloseDone(db, taskId);
	}

	const decisionId = input.decisionId?.trim() || createId('decision');
	const runId = optionalText(input.runId);
	if (runId) {
		ensureRow(db, 'v2_core_runs', runId, 'Run');
	}

	db.transaction(() => {
		db.prepare('update v2_core_tasks set status = ? where id = ?').run(toStatus, taskId);
		db.prepare(
			`
				insert into v2_core_decisions (
					id,
					project_id,
					goal_id,
					task_id,
					run_id,
					review_id,
					supersedes_decision_id,
					decision_type,
					summary,
					rationale,
					decided_at
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			decisionId,
			task.project_id,
			task.goal_id,
			taskId,
			runId,
			null,
			null,
			'task_status_transition',
			summary,
			`Transitioned task from ${task.status} to ${toStatus}.`,
			new Date().toISOString()
		);
		recordSourceReference(db, 'v2_core_decisions', decisionId, {
			sourceCollection: 'task_status_transitions',
			sourceId: taskId,
			note: summary
		});
	})();

	return readV2CoreTaskDetail(db, taskId);
}

export function transitionV2CoreGoalStatus(
	db: Database.Database,
	input: V2CoreTransitionGoalInput
) {
	const goalId = requiredText(input.goalId, 'goalId');
	const toStatus = requiredText(input.status, 'status');
	const summary = requiredText(input.summary, 'summary');

	if (!ALLOWED_GOAL_STATUSES.has(toStatus)) {
		throw new Error(
			`Cannot transition goal ${goalId} to unsupported status ${toStatus}; expected one of ${[
				...ALLOWED_GOAL_STATUSES
			].join(', ')}.`
		);
	}

	const goal = db
		.prepare<
			[string],
			{ id: string; status: string; project_id: string }
		>('select id, status, project_id from v2_core_goals where id = ?')
		.get(goalId);

	if (!goal) {
		throw new Error(`Goal ${goalId} was not found in the v2 core database.`);
	}

	const decisionId = input.decisionId?.trim() || createId('decision');
	const taskId = optionalText(input.taskId);
	const runId = optionalText(input.runId);
	if (taskId) {
		ensureRow(db, 'v2_core_tasks', taskId, 'Task');
	}
	if (runId) {
		ensureRow(db, 'v2_core_runs', runId, 'Run');
	}

	db.transaction(() => {
		db.prepare('update v2_core_goals set status = ? where id = ?').run(toStatus, goalId);
		db.prepare(
			`
				insert into v2_core_decisions (
					id,
					project_id,
					goal_id,
					task_id,
					run_id,
					review_id,
					supersedes_decision_id,
					decision_type,
					summary,
					rationale,
					decided_at
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`
		).run(
			decisionId,
			goal.project_id,
			goalId,
			taskId,
			runId,
			null,
			null,
			'goal_status_transition',
			summary,
			`Transitioned goal from ${goal.status} to ${toStatus}.`,
			new Date().toISOString()
		);
		recordSourceReference(db, 'v2_core_decisions', decisionId, {
			sourceCollection: 'goal_status_transitions',
			sourceId: goalId,
			note: summary
		});
	})();

	return {
		goal: readV2CoreGoal(db, goalId),
		decision: readV2CoreDecision(db, decisionId)
	};
}

export function readV2CoreNextWork(
	db: Database.Database,
	options: { goalId?: string | null; projectId?: string | null; limit?: number } = {}
): V2CoreNextWork {
	const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
	const conditions: string[] = [
		"task.status in ('ready', 'review', 'blocked')",
		"goal.status = 'active'",
		`(
			task.status != 'ready'
			or not exists (
				select 1
				from v2_core_task_dependencies dependency
				join v2_core_tasks depends_on_task
					on depends_on_task.id = dependency.depends_on_task_id
				where dependency.task_id = task.id
					and dependency.status = 'unresolved'
					and depends_on_task.status != 'done'
			)
		)`
	];
	const params: string[] = [];

	if (options.goalId?.trim()) {
		conditions.push('task.goal_id = ?');
		params.push(options.goalId.trim());
	}

	if (options.projectId?.trim()) {
		conditions.push('task.project_id = ?');
		params.push(options.projectId.trim());
	}

	const rows = db
		.prepare<
			[...string[], number],
			{
				task_id: string;
				task_title: string;
				task_status: string;
				goal_id: string;
				goal_title: string;
				project_id: string;
				project_name: string;
			}
		>(
			`
				select
					task.id as task_id,
					task.title as task_title,
					task.status as task_status,
					goal.id as goal_id,
					goal.title as goal_title,
					project.id as project_id,
					project.name as project_name
				from v2_core_tasks task
				join v2_core_goals goal on goal.id = task.goal_id
				join v2_core_projects project on project.id = task.project_id
				where ${conditions.join(' and ')}
				order by
					case task.status
						when 'review' then 0
						when 'ready' then 1
						when 'blocked' then 2
						else 3
					end,
					task.id
				limit ?
			`
		)
		.all(...params, limit);

	return {
		candidates: rows.map((row) => {
			if (row.task_status === 'review') {
				return {
					taskId: row.task_id,
					title: row.task_title,
					status: row.task_status,
					goalId: row.goal_id,
					goalTitle: row.goal_title,
					projectId: row.project_id,
					projectName: row.project_name,
					action: 'review_output',
					reason: 'Task is waiting for output review.'
				};
			}

			if (row.task_status === 'blocked') {
				return {
					taskId: row.task_id,
					title: row.task_title,
					status: row.task_status,
					goalId: row.goal_id,
					goalTitle: row.goal_title,
					projectId: row.project_id,
					projectName: row.project_name,
					action: 'resolve_blocker',
					reason: 'Task is blocked and needs an unblock decision.'
				};
			}

			return {
				taskId: row.task_id,
				title: row.task_title,
				status: row.task_status,
				goalId: row.goal_id,
				goalTitle: row.goal_title,
				projectId: row.project_id,
				projectName: row.project_name,
				action: 'start_task',
				reason: 'Task is ready and linked to a goal.'
			};
		})
	};
}

function readUnmetV2CoreTaskDependencies(db: Database.Database, taskId: string) {
	return db
		.prepare<[string], { task_id: string; title: string; status: string }>(
			`
				select depends_on_task.id as task_id, depends_on_task.title, depends_on_task.status
				from v2_core_task_dependencies dependency
				join v2_core_tasks depends_on_task
					on depends_on_task.id = dependency.depends_on_task_id
				where dependency.task_id = ?
					and dependency.status = 'unresolved'
					and depends_on_task.status != 'done'
				order by depends_on_task.id
			`
		)
		.all(taskId);
}

type V2CoreGoalTriageRow = {
	goal_id: string;
	project_id: string;
	project_name: string;
	parent_goal_id: string | null;
	title: string;
	status: string;
	ready_count: number;
	in_progress_count: number;
	review_count: number;
	blocked_count: number;
	done_count: number;
	canceled_count: number;
	total_count: number;
	imported_source_count: number;
	holding_source_count: number;
	active_child_goal_count: number;
	active_child_open_task_count: number;
	current_run_id: string | null;
	current_run_task_id: string | null;
	current_run_task_title: string | null;
	current_run_status: string | null;
	current_run_model_provider_id: string | null;
	current_run_model_provider_name: string | null;
};

export function readV2CoreGoalTriage(
	db: Database.Database,
	options: { goalId?: string | null; projectId?: string | null; limit?: number } = {}
): V2CoreGoalTriage {
	const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
	const conditions: string[] = ["goal.status in ('active', 'blocked', 'paused')"];
	const params: string[] = [];

	if (options.goalId?.trim()) {
		conditions.push('goal.id = ?');
		params.push(options.goalId.trim());
	}

	if (options.projectId?.trim()) {
		conditions.push('goal.project_id = ?');
		params.push(options.projectId.trim());
	}

	const rows = db
		.prepare<[...string[], number], V2CoreGoalTriageRow>(
			`
				select
					goal.id as goal_id,
					goal.project_id,
					project.name as project_name,
					goal.parent_goal_id,
					goal.title,
					goal.status,
					count(distinct case when task.status = 'ready' then task.id end) as ready_count,
					count(distinct case when task.status = 'in_progress' then task.id end) as in_progress_count,
					count(distinct case when task.status = 'review' then task.id end) as review_count,
					count(distinct case when task.status = 'blocked' then task.id end) as blocked_count,
					count(distinct case when task.status = 'done' then task.id end) as done_count,
					count(distinct case when task.status = 'canceled' then task.id end) as canceled_count,
					count(distinct task.id) as total_count,
					count(distinct case when goal_source.source_system = 'ams-v1' then goal_source.source_id end) as imported_source_count,
					count(distinct case
						when goal_source.source_collection in ('holding_goals', 'generated_holding_goals')
							or goal.title like 'Imported holding:%'
							or goal.title like 'Imported unscoped:%'
						then coalesce(goal_source.source_id, goal.id)
					end) as holding_source_count,
					count(distinct active_child_goal.id) as active_child_goal_count,
					count(distinct case
						when active_child_task.status in ('ready', 'in_progress', 'review', 'blocked')
						then active_child_task.id
					end) as active_child_open_task_count,
					current_run.id as current_run_id,
					current_run.task_id as current_run_task_id,
					current_task.title as current_run_task_title,
					current_run.status as current_run_status,
					current_run.model_provider_id as current_run_model_provider_id,
					provider.name as current_run_model_provider_name
				from v2_core_goals goal
				join v2_core_projects project on project.id = goal.project_id
				left join v2_core_tasks task on task.goal_id = goal.id
				left join v2_core_source_references goal_source
					on goal_source.record_table = 'v2_core_goals'
					and goal_source.record_id = goal.id
				left join v2_core_goals active_child_goal
					on active_child_goal.parent_goal_id = goal.id
					and active_child_goal.status = 'active'
				left join v2_core_tasks active_child_task
					on active_child_task.goal_id = active_child_goal.id
				left join v2_core_runs current_run on current_run.id = (
					select run.id
					from v2_core_runs run
					join v2_core_tasks run_task on run_task.id = run.task_id
					where run_task.goal_id = goal.id
						and run.ended_at is null
					order by run.started_at desc, run.id desc
					limit 1
				)
				left join v2_core_tasks current_task on current_task.id = current_run.task_id
				left join v2_core_model_providers provider on provider.id = current_run.model_provider_id
				where ${conditions.join(' and ')}
				group by goal.id
				order by
					case goal.status
						when 'active' then 0
						when 'blocked' then 1
						when 'paused' then 2
						else 3
					end,
					case
						when current_run.id is not null then 0
						when count(distinct case when task.status = 'review' then task.id end) > 0 then 1
						when count(distinct case when task.status = 'ready' then task.id end) > 0 then 2
						when count(distinct case when task.status = 'blocked' then task.id end) > 0 then 3
						else 4
					end,
					project.name,
					goal.title
				limit ?
			`
		)
		.all(...params, limit);

	function classify(row: V2CoreGoalTriageRow): { action: V2CoreGoalTriageAction; reason: string } {
		const openCount =
			row.ready_count + row.in_progress_count + row.review_count + row.blocked_count;

		if (row.status === 'blocked') {
			return {
				action: 'blocked_needs_decision',
				reason: 'Goal status is blocked; unblock, revise, or pause before dispatching more work.'
			};
		}

		if (row.status === 'paused') {
			return {
				action: 'pause_candidate',
				reason: 'Goal is already paused; leave it paused unless the operator intentionally resumes it.'
			};
		}

		if (row.current_run_id || row.in_progress_count > 0) {
			return {
				action: 'monitor_in_progress',
				reason: 'Goal has an open run or in-progress task; monitor/close that work before selecting more.'
			};
		}

		if (row.review_count > 0) {
			return {
				action: 'review_or_close',
				reason: 'Goal has task output awaiting review; evaluate that output before dispatching more work.'
			};
		}

		if (row.ready_count > 0) {
			return {
				action: 'start_ready_task',
				reason: 'Goal has ready tasks linked to it; dispatch the next ready task.'
			};
		}

		if (row.blocked_count > 0) {
			return {
				action: 'blocked_needs_decision',
				reason: 'Goal has blocked tasks and no ready/review/running work; resolve or revise blockers.'
			};
		}

		if (row.active_child_open_task_count > 0) {
			return {
				action: 'start_ready_task',
				reason:
					'Goal has active child goals with open work; dispatch or monitor the child goal work before pausing the parent.'
			};
		}

		if (openCount === 0 && row.imported_source_count > 0) {
			return {
				action: 'pause_candidate',
				reason:
					'Imported active goal has no open actionable work; review whether to pause, close, or create fresh continuation work.'
			};
		}

		if (openCount === 0 && row.done_count > 0) {
			return {
				action: 'review_or_close',
				reason:
					'Goal has completed work but no open work; assess whether the desired state is met before creating more tasks.'
			};
		}

		return {
			action: 'create_next_task',
			reason:
				'Goal is active but has no dispatchable task; define the next executable task or pause the goal.'
		};
	}

	const summary: Record<V2CoreGoalTriageAction, number> = {
		start_ready_task: 0,
		monitor_in_progress: 0,
		create_next_task: 0,
		review_or_close: 0,
		pause_candidate: 0,
		blocked_needs_decision: 0
	};

	const goals = rows.map((row) => {
		const classification = classify(row);
		summary[classification.action] += 1;

		return {
			goalId: row.goal_id,
			projectId: row.project_id,
			projectName: row.project_name,
			parentGoalId: row.parent_goal_id,
			title: row.title,
			status: row.status,
			sourceFlags: {
				importedFromV1: row.imported_source_count > 0,
				generatedHoldingGoal: row.holding_source_count > 0
			},
			taskCounts: {
				ready: row.ready_count,
				inProgress: row.in_progress_count,
				review: row.review_count,
				blocked: row.blocked_count,
				done: row.done_count,
				canceled: row.canceled_count,
				open:
					row.ready_count + row.in_progress_count + row.review_count + row.blocked_count,
				total: row.total_count
			},
			childGoalCounts: {
				active: row.active_child_goal_count,
				openTasks: row.active_child_open_task_count
			},
			currentRun: row.current_run_id
				? {
						runId: row.current_run_id,
						taskId: row.current_run_task_id ?? '',
						taskTitle: row.current_run_task_title ?? '',
						status: row.current_run_status ?? '',
						modelProviderId: row.current_run_model_provider_id,
						modelProviderName: row.current_run_model_provider_name
					}
				: null,
			suggestedAction: classification.action,
			reason: classification.reason
		};
	});

	return {
		scope: {
			projectId: options.projectId?.trim() || null,
			goalId: options.goalId?.trim() || null
		},
		summary,
		goals
	};
}

export function readV2CoreContextBundle(
	db: Database.Database,
	taskId: string
): V2CoreContextBundle | null {
	const detail = readV2CoreTaskDetail(db, taskId);
	if (!detail) {
		return null;
	}

	const memoryRows = db
		.prepare<[string], { id: string; title: string; status: string }>(
			`
				select id, title, status
				from v2_core_memory_items
				where project_id = ? and status in ('trusted', 'proposed')
				order by
					case status when 'trusted' then 0 else 1 end,
					created_at,
					id
				limit 20
			`
		)
		.all(detail.project.id);

	const artifactRows = db
		.prepare<[string], { id: string; title: string; status: string }>(
			`
				select id, title, status
				from v2_core_artifacts
				where task_id = ?
				order by id
				limit 20
			`
		)
		.all(taskId);

	const canStart = detail.task.status === 'ready';

	return {
		task: detail.task,
		project: detail.project,
		goal: detail.goal,
		includedSources: [
			{
				recordType: 'task',
				recordId: detail.task.id,
				title: detail.task.title,
				reason: 'Selected task contract.'
			},
			{
				recordType: 'goal',
				recordId: detail.goal.id,
				title: detail.goal.title,
				reason: 'Goal the task advances.'
			},
			...artifactRows.map((artifact) => ({
				recordType: 'artifact',
				recordId: artifact.id,
				title: artifact.title,
				reason: `Task artifact with status ${artifact.status}.`
			})),
			...memoryRows.map((memory) => ({
				recordType: 'memory',
				recordId: memory.id,
				title: memory.title,
				reason: `Project memory with status ${memory.status}.`
			}))
		],
		readiness: {
			status: detail.task.status,
			canStart,
			reason: canStart ? 'Task is ready to start.' : `Task status is ${detail.task.status}.`
		}
	};
}

export function readV2CoreMemoryForContext(
	db: Database.Database,
	options: { projectId?: string | null; taskId?: string | null } = {}
): V2CoreMemoryForContext {
	const taskId = optionalText(options.taskId);
	let projectId = optionalText(options.projectId);

	if (taskId) {
		const task = db
			.prepare<
				[string],
				{ project_id: string }
			>('select project_id from v2_core_tasks where id = ?')
			.get(taskId);

		if (!task) {
			throw new Error(`Task ${taskId} was not found in the v2 core database.`);
		}

		projectId = projectId ?? task.project_id;
	}

	if (!projectId) {
		throw new Error('Missing projectId. Provide --project or --task.');
	}

	ensureRow(db, 'v2_core_projects', projectId, 'Project');

	const items = db
		.prepare<
			[string],
			{
				id: string;
				title: string;
				body: string;
				scope: string;
				status: string;
			}
		>(
			`
				select id, title, body, scope, status
				from v2_core_memory_items
				where project_id = ? and status in ('trusted', 'proposed')
				order by
					case status when 'trusted' then 0 else 1 end,
					created_at,
					id
			`
		)
		.all(projectId)
		.map((item) => ({
			id: item.id,
			title: item.title,
			body: item.body,
			scope: item.scope,
			status: item.status,
			sources: db
				.prepare<
					[string],
					{
						source_table: string;
						source_id: string;
						reason: string;
					}
				>(
					`
						select source_table, source_id, reason
						from v2_core_memory_item_sources
						where memory_item_id = ?
						order by source_table, source_id
					`
				)
				.all(item.id)
				.map((source) => ({
					sourceTable: source.source_table,
					sourceId: source.source_id,
					reason: source.reason
				}))
		}));

	return {
		projectId,
		taskId,
		items
	};
}

export function readV2CoreUnreviewedOutputs(db: Database.Database) {
	return db
		.prepare<
			[],
			{
				artifact_id: string;
				task_id: string;
				task_title: string;
				goal_id: string;
				goal_title: string;
				run_id: string | null;
				run_status: string | null;
				title: string;
				uri: string;
				status: string;
			}
		>(
			`
				select artifact.id as artifact_id, artifact.task_id, artifact.run_id, artifact.title, artifact.uri, artifact.status
				from v2_core_artifacts artifact
				left join v2_core_reviews review on review.artifact_id = artifact.id
					and review.status in ('approved', 'rejected')
				where artifact.status = 'submitted'
					and review.id is null
					and not exists (
						select 1
						from v2_core_decisions decision
						where decision.task_id = artifact.task_id
							and decision.decision_type = 'accept_task_output'
					)
				order by artifact.id
			`
		)
		.all()
		.map((row) => ({
			artifactId: row.artifact_id,
			taskId: row.task_id,
			runId: row.run_id,
			title: row.title,
			uri: row.uri,
			status: row.status
		}));
}

export function readV2CoreDependencyReport(
	db: Database.Database,
	options: { projectId?: string | null; goalId?: string | null; taskId?: string | null } = {}
): V2CoreDependencyReport {
	const projectId = optionalText(options.projectId);
	const goalId = optionalText(options.goalId);
	const taskId = optionalText(options.taskId);
	const conditions: string[] = ['1 = 1'];
	const params: string[] = [];

	if (projectId) {
		ensureRow(db, 'v2_core_projects', projectId, 'Project');
		conditions.push('task.project_id = ?');
		params.push(projectId);
	}

	if (goalId) {
		ensureRow(db, 'v2_core_goals', goalId, 'Goal');
		conditions.push('task.goal_id = ?');
		params.push(goalId);
	}

	if (taskId) {
		ensureRow(db, 'v2_core_tasks', taskId, 'Task');
		conditions.push('task.id = ?');
		params.push(taskId);
	}

	const whereClause = conditions.join(' and ');
	const summary = db
		.prepare<
			string[],
			{ run_count: number; provider_run_count: number; tool_execution_count: number }
		>(
			`
				select
					count(distinct run.id) as run_count,
					count(distinct case when run.model_provider_id is not null then run.id end) as provider_run_count,
					count(distinct tool_execution.id) as tool_execution_count
				from v2_core_tasks task
				left join v2_core_runs run on run.task_id = task.id
				left join v2_core_tool_executions tool_execution on tool_execution.task_id = task.id
				where ${whereClause}
			`
		)
		.get(...params) ?? { run_count: 0, provider_run_count: 0, tool_execution_count: 0 };
	const providerRows = db
		.prepare<
			string[],
			{
				provider_id: string;
				name: string;
				kind: string;
				status: string;
				run_count: number;
				task_ids: string;
			}
		>(
			`
				select
					provider.id as provider_id,
					provider.name,
					provider.kind,
					provider.status,
					count(distinct run.id) as run_count,
					group_concat(distinct task.id) as task_ids
				from v2_core_tasks task
				join v2_core_runs run on run.task_id = task.id
				join v2_core_model_providers provider on provider.id = run.model_provider_id
				where ${whereClause}
				group by provider.id
				order by provider.kind, provider.name
			`
		)
		.all(...params);
	const toolRows = db
		.prepare<
			string[],
			{
				execution_id: string;
				tool_id: string;
				tool_name: string;
				tool_kind: string;
				risk_level: string;
				approval_requirement: string;
				status: string;
				task_id: string;
				run_id: string | null;
				input_summary: string;
				result_summary: string;
				error_summary: string;
			}
		>(
			`
				select
					tool_execution.id as execution_id,
					tool.id as tool_id,
					tool.name as tool_name,
					tool.kind as tool_kind,
					tool.risk_level,
					tool.approval_requirement,
					tool_execution.status,
					tool_execution.task_id,
					tool_execution.run_id,
					tool_execution.input_summary,
					tool_execution.result_summary,
					tool_execution.error_summary
				from v2_core_tasks task
				join v2_core_tool_executions tool_execution on tool_execution.task_id = task.id
				join v2_core_tools tool on tool.id = tool_execution.tool_id
				where ${whereClause}
				order by tool_execution.started_at, tool_execution.id
			`
		)
		.all(...params);

	return {
		scope: {
			projectId,
			goalId,
			taskId
		},
		summary: {
			runCount: summary.run_count,
			providerRunCount: summary.provider_run_count,
			toolExecutionCount: summary.tool_execution_count
		},
		modelProviders: providerRows.map((provider) => ({
			providerId: provider.provider_id,
			name: provider.name,
			kind: provider.kind,
			status: provider.status,
			runCount: provider.run_count,
			taskIds: provider.task_ids ? provider.task_ids.split(',') : []
		})),
		toolExecutions: toolRows.map((execution) => ({
			executionId: execution.execution_id,
			toolId: execution.tool_id,
			toolName: execution.tool_name,
			toolKind: execution.tool_kind,
			riskLevel: execution.risk_level,
			approvalRequirement: execution.approval_requirement,
			status: execution.status,
			taskId: execution.task_id,
			runId: execution.run_id,
			inputSummary: execution.input_summary,
			resultSummary: execution.result_summary,
			errorSummary: execution.error_summary
		}))
	};
}

export function readV2CoreDependencyReductionReport(
	db: Database.Database,
	options: { projectId?: string | null; goalId?: string | null; taskId?: string | null } = {}
): V2CoreDependencyReductionReport {
	const projectId = optionalText(options.projectId);
	const goalId = optionalText(options.goalId);
	const taskId = optionalText(options.taskId);

	if (projectId) {
		ensureRow(db, 'v2_core_projects', projectId, 'Project');
	}
	if (goalId) {
		ensureRow(db, 'v2_core_goals', goalId, 'Goal');
	}
	if (taskId) {
		ensureRow(db, 'v2_core_tasks', taskId, 'Task');
	}

	const scenarioConditions: string[] = ['1 = 1'];
	const scenarioParams: string[] = [];
	if (projectId) {
		scenarioConditions.push('(scenario.project_id = ? or scenario.project_id is null)');
		scenarioParams.push(projectId);
	}
	if (taskId) {
		scenarioConditions.push(
			`exists (
				select 1
				from v2_core_evaluation_results scoped_result
				where scoped_result.scenario_id = scenario.id
					and scoped_result.task_id = ?
			)`
		);
		scenarioParams.push(taskId);
	}
	if (goalId) {
		scenarioConditions.push(
			`exists (
				select 1
				from v2_core_evaluation_results scoped_result
				join v2_core_tasks scoped_task on scoped_task.id = scoped_result.task_id
				where scoped_result.scenario_id = scenario.id
					and scoped_task.goal_id = ?
			)`
		);
		scenarioParams.push(goalId);
	}

	const resultConditions: string[] = ['1 = 1'];
	const resultParams: string[] = [];
	if (projectId) {
		resultConditions.push('task.project_id = ?');
		resultParams.push(projectId);
	}
	if (goalId) {
		resultConditions.push('task.goal_id = ?');
		resultParams.push(goalId);
	}
	if (taskId) {
		resultConditions.push('task.id = ?');
		resultParams.push(taskId);
	}

	type CapabilityAccumulator = {
		capabilityName: string;
		scenarioIds: Set<string>;
		evaluationResultIds: Set<string>;
		taskIds: Set<string>;
		externalProviderIds: Set<string>;
		localToolIds: Set<string>;
		evaluationResults: V2CoreDependencyReductionReport['capabilities'][number]['evaluationResults'];
		hasPassingEvaluation: boolean;
		hasEvaluationResult: boolean;
		hasExternalProvider: boolean;
		hasLocalTool: boolean;
		hasProviderlessLocalToolEvaluation: boolean;
		hasProviderlessPassingLocalToolEvaluation: boolean;
		providerlessLocalToolEvaluationResultIds: Set<string>;
		providerlessPassingLocalToolEvaluationResultIds: Set<string>;
	};

	const capabilities = new Map<string, CapabilityAccumulator>();
	const getCapability = (capabilityName: string): CapabilityAccumulator => {
		const normalizedName = capabilityName.trim() || 'uncategorized';
		const existing = capabilities.get(normalizedName);
		if (existing) {
			return existing;
		}
		const created: CapabilityAccumulator = {
			capabilityName: normalizedName,
			scenarioIds: new Set(),
			evaluationResultIds: new Set(),
			taskIds: new Set(),
			externalProviderIds: new Set(),
			localToolIds: new Set(),
			evaluationResults: [],
			hasPassingEvaluation: false,
			hasEvaluationResult: false,
			hasExternalProvider: false,
			hasLocalTool: false,
			hasProviderlessLocalToolEvaluation: false,
			hasProviderlessPassingLocalToolEvaluation: false,
			providerlessLocalToolEvaluationResultIds: new Set(),
			providerlessPassingLocalToolEvaluationResultIds: new Set()
		};
		capabilities.set(normalizedName, created);
		return created;
	};

	const scenarioRows = db
		.prepare<string[], { id: string; capability_name: string }>(
			`
				select scenario.id, scenario.capability_name
				from v2_core_evaluation_scenarios scenario
				where ${scenarioConditions.join(' and ')}
				order by scenario.capability_name, scenario.id
			`
		)
		.all(...scenarioParams);
	for (const scenario of scenarioRows) {
		getCapability(scenario.capability_name).scenarioIds.add(scenario.id);
	}

	const resultRows = db
		.prepare<
			string[],
			{
				result_id: string;
				scenario_id: string;
				capability_name: string;
				task_id: string;
				status: string;
				score: number | null;
				result_summary: string;
				provider_id: string | null;
				provider_kind: string | null;
				tool_execution_id: string | null;
				tool_id: string | null;
				tool_kind: string | null;
			}
		>(
			`
				select
					result.id as result_id,
					scenario.id as scenario_id,
					scenario.capability_name,
					result.task_id,
					result.status,
					result.score,
					result.result_summary,
					coalesce(result.provider_id, run.model_provider_id) as provider_id,
					provider.kind as provider_kind,
					result.tool_execution_id,
					tool.id as tool_id,
					tool.kind as tool_kind
				from v2_core_evaluation_results result
				join v2_core_evaluation_scenarios scenario on scenario.id = result.scenario_id
				join v2_core_tasks task on task.id = result.task_id
				left join v2_core_runs run on run.id = result.run_id
				left join v2_core_model_providers provider
					on provider.id = coalesce(result.provider_id, run.model_provider_id)
				left join v2_core_tool_executions tool_execution on tool_execution.id = result.tool_execution_id
				left join v2_core_tools tool on tool.id = tool_execution.tool_id
				where ${resultConditions.join(' and ')}
				order by scenario.capability_name, result.created_at, result.id
			`
		)
		.all(...resultParams);

	for (const result of resultRows) {
		const capability = getCapability(result.capability_name);
		capability.scenarioIds.add(result.scenario_id);
		capability.evaluationResultIds.add(result.result_id);
		capability.taskIds.add(result.task_id);
		capability.hasEvaluationResult = true;
		capability.hasPassingEvaluation = capability.hasPassingEvaluation || result.status === 'passed';
		if (result.provider_id && result.provider_kind === 'external_ai') {
			capability.externalProviderIds.add(result.provider_id);
			capability.hasExternalProvider = true;
		}
		if (result.tool_id && result.tool_kind?.startsWith('local')) {
			capability.localToolIds.add(result.tool_id);
			capability.hasLocalTool = true;
		}
		if (!result.provider_id && result.tool_id && result.tool_kind?.startsWith('local')) {
			capability.providerlessLocalToolEvaluationResultIds.add(result.result_id);
			capability.hasProviderlessLocalToolEvaluation = true;
			if (result.status === 'passed') {
				capability.providerlessPassingLocalToolEvaluationResultIds.add(result.result_id);
				capability.hasProviderlessPassingLocalToolEvaluation = true;
			}
		}
		capability.evaluationResults.push({
			resultId: result.result_id,
			scenarioId: result.scenario_id,
			taskId: result.task_id,
			status: result.status,
			score: result.score,
			providerId: result.provider_id,
			toolExecutionId: result.tool_execution_id,
			resultSummary: result.result_summary
		});
	}

	const capabilityRows = Array.from(capabilities.values())
		.map((capability) => {
			const evidenceGaps: string[] = [];
			if (!capability.hasEvaluationResult) {
				evidenceGaps.push('No evaluation result has been recorded for this capability in scope.');
			}
			if (!capability.hasPassingEvaluation) {
				evidenceGaps.push('No passing evaluation result is available in scope.');
			}
			if (!capability.hasExternalProvider) {
				evidenceGaps.push('No linked external AI provider usage is available in scope.');
			}
			if (!capability.hasLocalTool) {
				evidenceGaps.push('No linked local tool execution evidence is available in scope.');
			}
			const localReplacementEvidenceGaps: string[] = [];
			if (!capability.hasProviderlessLocalToolEvaluation) {
				localReplacementEvidenceGaps.push(
					'No providerless local tool evaluation result is available in scope.'
				);
			}
			if (!capability.hasProviderlessPassingLocalToolEvaluation) {
				localReplacementEvidenceGaps.push(
					'No passing providerless local tool evaluation result is available in scope.'
				);
			}

			let status: V2CoreDependencyReductionStatus = 'unknown';
			if (capability.hasExternalProvider && capability.hasPassingEvaluation) {
				status = 'hybrid_candidate';
			} else if (capability.hasExternalProvider) {
				status = 'external_only';
			} else if (capability.hasLocalTool && capability.hasPassingEvaluation) {
				status = 'retirement_candidate';
			} else if (capability.hasLocalTool) {
				status = 'locally_supported';
			}

			let localReplacementStatus: V2CoreDependencyReductionStatus = 'unknown';
			if (capability.hasProviderlessPassingLocalToolEvaluation) {
				localReplacementStatus = 'retirement_candidate';
			} else if (capability.hasProviderlessLocalToolEvaluation) {
				localReplacementStatus = 'locally_supported';
			}

			const rationaleParts: string[] = [];
			if (capability.hasExternalProvider) {
				rationaleParts.push('linked evaluation evidence used an external AI provider');
			}
			if (capability.hasLocalTool) {
				rationaleParts.push('linked evaluation evidence includes local tool execution');
			}
			if (capability.hasPassingEvaluation) {
				rationaleParts.push('at least one scenario-linked evaluation passed');
			}
			const rationale =
				rationaleParts.length > 0
					? `${rationaleParts.join('; ')}.`
					: 'Insufficient linked evaluation, provider, or tool evidence to classify dependency reduction.';

			return {
				capabilityName: capability.capabilityName,
				status,
				localReplacementStatus,
				rationale,
				evidenceGaps,
				localReplacementEvidenceGaps,
				scenarioIds: Array.from(capability.scenarioIds).sort(),
				evaluationResultIds: Array.from(capability.evaluationResultIds).sort(),
				providerlessLocalToolEvaluationResultIds: Array.from(
					capability.providerlessLocalToolEvaluationResultIds
				).sort(),
				providerlessPassingLocalToolEvaluationResultIds: Array.from(
					capability.providerlessPassingLocalToolEvaluationResultIds
				).sort(),
				taskIds: Array.from(capability.taskIds).sort(),
				externalProviderIds: Array.from(capability.externalProviderIds).sort(),
				localToolIds: Array.from(capability.localToolIds).sort(),
				evaluationResults: capability.evaluationResults
			};
		})
		.sort((left, right) => left.capabilityName.localeCompare(right.capabilityName));

	return {
		scope: {
			projectId,
			goalId,
			taskId
		},
		summary: {
			capabilityCount: capabilityRows.length,
			externalOnlyCount: capabilityRows.filter(
				(capability) => capability.status === 'external_only'
			).length,
			hybridCandidateCount: capabilityRows.filter(
				(capability) => capability.status === 'hybrid_candidate'
			).length,
			locallySupportedCount: capabilityRows.filter(
				(capability) => capability.status === 'locally_supported'
			).length,
			retirementCandidateCount: capabilityRows.filter(
				(capability) => capability.status === 'retirement_candidate'
			).length,
			unknownCount: capabilityRows.filter((capability) => capability.status === 'unknown').length
		},
		capabilities: capabilityRows
	};
}

export function readV2CoreEvaluationContext(
	db: Database.Database,
	options: { projectId?: string | null; taskId?: string | null } = {}
): V2CoreEvaluationContext {
	const taskId = optionalText(options.taskId);
	let projectId = optionalText(options.projectId);

	if (taskId) {
		const task = db
			.prepare<
				[string],
				{ project_id: string }
			>('select project_id from v2_core_tasks where id = ?')
			.get(taskId);
		if (!task) {
			throw new Error(`Task ${taskId} was not found in the v2 core database.`);
		}
		projectId = projectId ?? task.project_id;
	}

	if (projectId) {
		ensureRow(db, 'v2_core_projects', projectId, 'Project');
	}

	const scenarioConditions: string[] = ['1 = 1'];
	const scenarioParams: string[] = [];
	if (projectId) {
		scenarioConditions.push('(project_id = ? or project_id is null)');
		scenarioParams.push(projectId);
	}

	const resultConditions: string[] = ['1 = 1'];
	const resultParams: string[] = [];
	if (taskId) {
		resultConditions.push('result.task_id = ?');
		resultParams.push(taskId);
	} else if (projectId) {
		resultConditions.push('task.project_id = ?');
		resultParams.push(projectId);
	}

	const scenarios = db
		.prepare<
			string[],
			{
				id: string;
				project_id: string | null;
				title: string;
				capability_name: string;
				prompt_or_task: string;
				rubric: string;
				status: string;
				version: string;
			}
		>(
			`
				select id, project_id, title, capability_name, prompt_or_task, rubric, status, version
				from v2_core_evaluation_scenarios
				where ${scenarioConditions.join(' and ')}
				order by status, title, version, id
			`
		)
		.all(...scenarioParams)
		.map((scenario) => ({
			id: scenario.id,
			projectId: scenario.project_id,
			title: scenario.title,
			capabilityName: scenario.capability_name,
			promptOrTask: scenario.prompt_or_task,
			rubric: scenario.rubric,
			status: scenario.status,
			version: scenario.version,
			sourceReferences: sourceReferencesFor(db, 'v2_core_evaluation_scenarios', scenario.id)
		}));
	const results = db
		.prepare<
			string[],
			{
				id: string;
				scenario_id: string;
				scenario_title: string;
				task_id: string;
				run_id: string | null;
				tool_execution_id: string | null;
				provider_id: string | null;
				model_id: string | null;
				status: string;
				score: number | null;
				rubric_summary: string;
				result_summary: string;
				failure_summary: string;
				created_at: string;
			}
		>(
			`
				select
					result.id,
					result.scenario_id,
					scenario.title as scenario_title,
					result.task_id,
					result.run_id,
					result.tool_execution_id,
					result.provider_id,
					result.model_id,
					result.status,
					result.score,
					result.rubric_summary,
					result.result_summary,
					result.failure_summary,
					result.created_at
				from v2_core_evaluation_results result
				join v2_core_evaluation_scenarios scenario on scenario.id = result.scenario_id
				join v2_core_tasks task on task.id = result.task_id
				where ${resultConditions.join(' and ')}
				order by result.created_at, result.id
			`
		)
		.all(...resultParams)
		.map((result) => ({
			id: result.id,
			scenarioId: result.scenario_id,
			scenarioTitle: result.scenario_title,
			taskId: result.task_id,
			runId: result.run_id,
			toolExecutionId: result.tool_execution_id,
			providerId: result.provider_id,
			modelId: result.model_id,
			status: result.status,
			score: result.score,
			rubricSummary: result.rubric_summary,
			resultSummary: result.result_summary,
			failureSummary: result.failure_summary,
			createdAt: result.created_at,
			sourceReferences: sourceReferencesFor(db, 'v2_core_evaluation_results', result.id)
		}));

	return {
		scope: {
			projectId,
			taskId
		},
		scenarios,
		results
	};
}

type V2CoreRetrievalCandidate = {
	recordType: string;
	recordId: string;
	title: string;
	projectId: string | null;
	goalId: string | null;
	taskId: string | null;
	runId: string | null;
	artifactId: string | null;
	fields: Record<string, string>;
};

export function readV2CoreLocalRetrieval(
	db: Database.Database,
	options: {
		query: string;
		projectId?: string | null;
		goalId?: string | null;
		taskId?: string | null;
		limit?: number;
	}
): V2CoreLocalRetrieval {
	const query = requiredText(options.query, 'query');
	const limit = Math.min(Math.max(options.limit ?? 10, 1), 25);
	const scope = resolveV2CoreRetrievalScope(db, options);
	const terms = Array.from(
		new Set(
			query
				.toLowerCase()
				.split(/\s+/)
				.map((term) => term.trim())
				.filter(Boolean)
		)
	);

	const candidates = collectV2CoreRetrievalCandidates(db, scope);
	const results = candidates
		.map((candidate) => scoreV2CoreRetrievalCandidate(candidate, query, terms))
		.filter((result): result is NonNullable<typeof result> => Boolean(result))
		.sort((left, right) => {
			if (right.score !== left.score) {
				return right.score - left.score;
			}
			if (left.recordType !== right.recordType) {
				return left.recordType.localeCompare(right.recordType);
			}
			return left.recordId.localeCompare(right.recordId);
		})
		.slice(0, limit);

	return {
		scope,
		query,
		limit,
		results
	};
}

export function readV2CoreRoutingEvidence(
	db: Database.Database,
	options: {
		projectId?: string | null;
		goalId?: string | null;
		taskId?: string | null;
		limit?: number;
	}
): V2CoreRoutingEvidence {
	const limit = Math.min(Math.max(options.limit ?? 10, 1), 25);
	const scope = resolveV2CoreRetrievalScope(db, {
		projectId: options.projectId,
		goalId: options.goalId,
		taskId: options.taskId
	});
	const conditions = ['decision.decision_type = ?'];
	const params: string[] = ['route_selection'];

	if (scope.projectId) {
		conditions.push('decision.project_id = ?');
		params.push(scope.projectId);
	}
	if (scope.goalId) {
		conditions.push('decision.goal_id = ?');
		params.push(scope.goalId);
	}
	if (scope.taskId) {
		conditions.push('decision.task_id = ?');
		params.push(scope.taskId);
	}

	const rows = db
		.prepare<
			string[],
			{
				id: string;
				decision_type: string;
				project_id: string;
				goal_id: string | null;
				task_id: string | null;
				run_id: string | null;
				summary: string;
				rationale: string;
				decided_at: string;
			}
		>(
			`
				select
					decision.id,
					decision.decision_type,
					decision.project_id,
					decision.goal_id,
					decision.task_id,
					decision.run_id,
					decision.summary,
					decision.rationale,
					decision.decided_at
				from v2_core_decisions decision
				where ${conditions.join(' and ')}
				order by decision.decided_at desc, decision.id
				limit ${limit}
			`
		)
		.all(...params);

	return {
		scope,
		limit,
		decisions: rows.map((row) => {
			const parsed = parseV2CoreRouteSelectionDecision(row.summary, row.rationale);
			return {
				decisionId: row.id,
				decisionType: row.decision_type,
				projectId: row.project_id,
				goalId: row.goal_id,
				taskId: row.task_id,
				runId: row.run_id,
				summary: row.summary,
				rationale: row.rationale,
				...parsed,
				decidedAt: row.decided_at
			};
		})
	};
}

export function readV2CoreRouteComparisonReport(
	db: Database.Database,
	options: { projectId?: string | null; goalId?: string | null; taskId?: string | null } = {}
): V2CoreRouteComparisonReport {
	const scope = resolveV2CoreRetrievalScope(db, {
		projectId: options.projectId,
		goalId: options.goalId,
		taskId: options.taskId
	});
	const dependencyReductionReport = readV2CoreDependencyReductionReport(db, scope);
	const routingEvidence = readV2CoreRoutingEvidence(db, { ...scope, limit: 25 });

	type CapabilityAccumulator = {
		capabilityName: string;
		routeDecisionIds: Set<string>;
		selectedProviderIds: Set<string>;
		selectedModelIds: Set<string>;
		selectedRoutes: Set<string>;
		rejectedAlternatives: Set<string>;
		evaluationResultIds: Set<string>;
		evaluationStatuses: Set<string>;
		dependencyStatus: V2CoreDependencyReductionStatus | null;
	};

	const capabilities = new Map<string, CapabilityAccumulator>();
	const getCapability = (name: string | null | undefined): CapabilityAccumulator => {
		const capabilityName = name?.trim() || 'uncategorized';
		const existing = capabilities.get(capabilityName);
		if (existing) {
			return existing;
		}
		const created: CapabilityAccumulator = {
			capabilityName,
			routeDecisionIds: new Set(),
			selectedProviderIds: new Set(),
			selectedModelIds: new Set(),
			selectedRoutes: new Set(),
			rejectedAlternatives: new Set(),
			evaluationResultIds: new Set(),
			evaluationStatuses: new Set(),
			dependencyStatus: null
		};
		capabilities.set(capabilityName, created);
		return created;
	};

	for (const capability of dependencyReductionReport.capabilities) {
		const row = getCapability(capability.capabilityName);
		row.dependencyStatus = capability.status;
		for (const resultId of capability.evaluationResultIds) {
			row.evaluationResultIds.add(resultId);
		}
		for (const result of capability.evaluationResults) {
			row.evaluationStatuses.add(result.status);
		}
	}

	for (const decision of routingEvidence.decisions) {
		const row = getCapability(decision.capabilityName);
		row.routeDecisionIds.add(decision.decisionId);
		if (decision.selectedProviderId) {
			row.selectedProviderIds.add(decision.selectedProviderId);
		}
		if (decision.selectedModelId) {
			row.selectedModelIds.add(decision.selectedModelId);
		}
		if (decision.selectedRoute) {
			row.selectedRoutes.add(decision.selectedRoute);
		}
		for (const alternative of decision.rejectedAlternatives) {
			row.rejectedAlternatives.add(alternative);
		}
	}

	const capabilityRows = Array.from(capabilities.values())
		.map((capability) => {
			const routeDecisionIds = Array.from(capability.routeDecisionIds).sort();
			const evaluationResultIds = Array.from(capability.evaluationResultIds).sort();
			const evidenceGaps: string[] = [];

			if (routeDecisionIds.length === 0) {
				evidenceGaps.push('No route-selection decision is available for this capability in scope.');
			} else if (routeDecisionIds.length < 2) {
				evidenceGaps.push(
					'Only one route-selection decision is available; comparison needs repeated evidence.'
				);
			}
			if (evaluationResultIds.length === 0) {
				evidenceGaps.push('No evaluation result is available for this capability in scope.');
			}
			if (!capability.dependencyStatus || capability.dependencyStatus === 'unknown') {
				evidenceGaps.push(
					'No classified dependency-reduction status is available for this capability.'
				);
			}

			let recommendation: V2CoreRouteComparisonReport['capabilities'][number]['recommendation'] =
				'needs_more_route_evidence';
			if (evaluationResultIds.length === 0 || !capability.dependencyStatus) {
				recommendation = 'defer';
			} else if (routeDecisionIds.length >= 2) {
				recommendation = 'comparison_ready';
			}

			return {
				capabilityName: capability.capabilityName,
				routeSelectionDecisionCount: routeDecisionIds.length,
				routeDecisionIds,
				selectedProviderIds: Array.from(capability.selectedProviderIds).sort(),
				selectedModelIds: Array.from(capability.selectedModelIds).sort(),
				selectedRoutes: Array.from(capability.selectedRoutes).sort(),
				rejectedAlternatives: Array.from(capability.rejectedAlternatives).sort(),
				evaluationResultIds,
				evaluationStatuses: Array.from(capability.evaluationStatuses).sort(),
				dependencyStatus: capability.dependencyStatus,
				evidenceGaps,
				recommendation
			};
		})
		.sort((left, right) => left.capabilityName.localeCompare(right.capabilityName));

	return {
		scope,
		summary: {
			capabilityCount: capabilityRows.length,
			comparisonReadyCount: capabilityRows.filter(
				(capability) => capability.recommendation === 'comparison_ready'
			).length,
			needsMoreRouteEvidenceCount: capabilityRows.filter(
				(capability) => capability.recommendation === 'needs_more_route_evidence'
			).length,
			deferCount: capabilityRows.filter((capability) => capability.recommendation === 'defer')
				.length,
			routeSelectionDecisionCount: capabilityRows.reduce(
				(total, capability) => total + capability.routeSelectionDecisionCount,
				0
			)
		},
		capabilities: capabilityRows
	};
}

function parseV2CoreRouteSelectionDecision(summary: string, rationale: string) {
	const text = `${summary}\n${rationale}`;

	return {
		selectedProviderId:
			readRouteSelectionValue(text, 'Selected provider') ??
			readRouteSelectionToken(text, 'provider'),
		selectedModelId:
			readRouteSelectionValue(text, 'Selected model') ?? readRouteSelectionToken(text, 'model'),
		selectedRoute:
			readRouteSelectionValue(text, 'Selected route') ?? readRouteSelectionToken(text, 'route'),
		capabilityName:
			readRouteSelectionValue(text, 'Capability') ?? readRouteSelectionToken(text, 'capability'),
		rejectedAlternatives: splitRouteSelectionList(
			readRouteSelectionValue(text, 'Rejected alternatives')
		),
		evidenceLabels: splitRouteSelectionList(readRouteSelectionValue(text, 'Evidence'))
	};
}

function readRouteSelectionValue(text: string, label: string) {
	const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const match = text.match(new RegExp(`^${escapedLabel}:\\s*(.+)$`, 'im'));
	return match?.[1]?.trim() || null;
}

function readRouteSelectionToken(text: string, token: string) {
	const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const match = text.match(new RegExp(`\\b${escapedToken}=([^\\s;]+)`, 'i'));
	return match?.[1]?.trim() || null;
}

function splitRouteSelectionList(value: string | null) {
	if (!value) {
		return [];
	}
	return value
		.split(';')
		.map((entry) => entry.trim())
		.filter(Boolean);
}

function resolveV2CoreRetrievalScope(
	db: Database.Database,
	options: { projectId?: string | null; goalId?: string | null; taskId?: string | null }
) {
	const taskId = optionalText(options.taskId);
	let projectId = optionalText(options.projectId);
	let goalId = optionalText(options.goalId);

	if (taskId) {
		const task = db
			.prepare<
				[string],
				{ project_id: string; goal_id: string }
			>('select project_id, goal_id from v2_core_tasks where id = ?')
			.get(taskId);
		if (!task) {
			throw new Error(`Task ${taskId} was not found in the v2 core database.`);
		}
		projectId = projectId ?? task.project_id;
		goalId = goalId ?? task.goal_id;
	}

	if (goalId) {
		const goal = db
			.prepare<
				[string],
				{ project_id: string }
			>('select project_id from v2_core_goals where id = ?')
			.get(goalId);
		if (!goal) {
			throw new Error(`Goal ${goalId} was not found in the v2 core database.`);
		}
		projectId = projectId ?? goal.project_id;
	}

	if (projectId) {
		ensureRow(db, 'v2_core_projects', projectId, 'Project');
	}

	return { projectId, goalId, taskId };
}

function collectV2CoreRetrievalCandidates(
	db: Database.Database,
	scope: V2CoreLocalRetrieval['scope']
): V2CoreRetrievalCandidate[] {
	const candidates: V2CoreRetrievalCandidate[] = [];
	const inScope = (row: {
		project_id?: string | null;
		goal_id?: string | null;
		task_id?: string | null;
	}) => {
		if (scope.projectId && row.project_id !== scope.projectId) {
			return false;
		}
		if (scope.goalId && row.goal_id !== scope.goalId) {
			return false;
		}
		if (scope.taskId && row.task_id !== scope.taskId) {
			return false;
		}
		return true;
	};

	for (const row of db
		.prepare<
			[],
			{ id: string; name: string; summary: string; status: string; workspace_root: string }
		>('select id, name, summary, status, workspace_root from v2_core_projects')
		.all()) {
		if (scope.projectId && row.id !== scope.projectId) {
			continue;
		}
		candidates.push({
			recordType: 'project',
			recordId: row.id,
			title: row.name,
			projectId: row.id,
			goalId: null,
			taskId: null,
			runId: null,
			artifactId: null,
			fields: {
				name: row.name,
				summary: row.summary,
				status: row.status,
				workspaceRoot: row.workspace_root
			}
		});
	}

	for (const row of db
		.prepare<
			[],
			{
				id: string;
				project_id: string;
				parent_goal_id: string | null;
				title: string;
				summary: string;
				success_criteria: string;
				status: string;
			}
		>(
			'select id, project_id, parent_goal_id, title, summary, success_criteria, status from v2_core_goals'
		)
		.all()) {
		if (!inScope({ project_id: row.project_id, goal_id: row.id })) {
			continue;
		}
		candidates.push({
			recordType: 'goal',
			recordId: row.id,
			title: row.title,
			projectId: row.project_id,
			goalId: row.id,
			taskId: null,
			runId: null,
			artifactId: null,
			fields: {
				title: row.title,
				summary: row.summary,
				successCriteria: row.success_criteria,
				status: row.status,
				parentGoalId: row.parent_goal_id ?? ''
			}
		});
	}

	for (const row of db
		.prepare<
			[],
			{
				id: string;
				project_id: string;
				goal_id: string;
				title: string;
				summary: string;
				success_criteria: string;
				validation_plan: string;
				status: string;
			}
		>(
			'select id, project_id, goal_id, title, summary, success_criteria, validation_plan, status from v2_core_tasks'
		)
		.all()) {
		if (!inScope({ project_id: row.project_id, goal_id: row.goal_id, task_id: row.id })) {
			continue;
		}
		candidates.push({
			recordType: 'task',
			recordId: row.id,
			title: row.title,
			projectId: row.project_id,
			goalId: row.goal_id,
			taskId: row.id,
			runId: null,
			artifactId: null,
			fields: {
				title: row.title,
				summary: row.summary,
				successCriteria: row.success_criteria,
				validationPlan: row.validation_plan,
				status: row.status
			}
		});
	}

	for (const row of db
		.prepare<
			[],
			{
				id: string;
				task_id: string;
				project_id: string;
				goal_id: string;
				task_title: string;
				status: string;
				input_summary: string;
				action_summary: string;
				result_summary: string;
				validation_summary: string;
			}
		>(
			`
				select run.id, run.task_id, task.project_id, task.goal_id, task.title as task_title,
					run.status, run.input_summary, run.action_summary, run.result_summary, run.validation_summary
				from v2_core_runs run
				join v2_core_tasks task on task.id = run.task_id
			`
		)
		.all()) {
		if (!inScope(row)) {
			continue;
		}
		candidates.push({
			recordType: 'run',
			recordId: row.id,
			title: `Run for ${row.task_title}`,
			projectId: row.project_id,
			goalId: row.goal_id,
			taskId: row.task_id,
			runId: row.id,
			artifactId: null,
			fields: {
				status: row.status,
				inputSummary: row.input_summary,
				actionSummary: row.action_summary,
				resultSummary: row.result_summary,
				validationSummary: row.validation_summary
			}
		});
	}

	for (const row of db
		.prepare<
			[],
			{
				id: string;
				project_id: string;
				task_id: string | null;
				goal_id: string | null;
				run_id: string | null;
				uri: string;
				role: string;
				title: string;
				summary: string;
				status: string;
			}
		>(
			`
				select artifact.id, artifact.project_id, artifact.task_id, task.goal_id, artifact.run_id,
					artifact.uri, artifact.role, artifact.title, artifact.summary, artifact.status
				from v2_core_artifacts artifact
				left join v2_core_tasks task on task.id = artifact.task_id
			`
		)
		.all()) {
		if (!inScope(row)) {
			continue;
		}
		candidates.push({
			recordType: 'artifact',
			recordId: row.id,
			title: row.title,
			projectId: row.project_id,
			goalId: row.goal_id,
			taskId: row.task_id,
			runId: row.run_id,
			artifactId: row.id,
			fields: {
				title: row.title,
				summary: row.summary,
				uri: row.uri,
				role: row.role,
				status: row.status
			}
		});
	}

	for (const row of db
		.prepare<
			[],
			{
				id: string;
				project_id: string;
				goal_id: string;
				task_id: string;
				run_id: string | null;
				artifact_id: string | null;
				status: string;
				summary: string;
			}
		>(
			`
				select review.id, task.project_id, task.goal_id, review.task_id, review.run_id,
					review.artifact_id, review.status, review.summary
				from v2_core_reviews review
				join v2_core_tasks task on task.id = review.task_id
			`
		)
		.all()) {
		if (!inScope(row)) {
			continue;
		}
		candidates.push({
			recordType: 'review',
			recordId: row.id,
			title: `Review ${row.id}`,
			projectId: row.project_id,
			goalId: row.goal_id,
			taskId: row.task_id,
			runId: row.run_id,
			artifactId: row.artifact_id,
			fields: {
				status: row.status,
				summary: row.summary
			}
		});
	}

	for (const row of db
		.prepare<
			[],
			{
				id: string;
				project_id: string;
				goal_id: string | null;
				task_id: string | null;
				run_id: string | null;
				decision_type: string;
				summary: string;
				rationale: string;
			}
		>(
			'select id, project_id, goal_id, task_id, run_id, decision_type, summary, rationale from v2_core_decisions'
		)
		.all()) {
		if (!inScope(row)) {
			continue;
		}
		candidates.push({
			recordType: 'decision',
			recordId: row.id,
			title: row.summary,
			projectId: row.project_id,
			goalId: row.goal_id,
			taskId: row.task_id,
			runId: row.run_id,
			artifactId: null,
			fields: {
				decisionType: row.decision_type,
				summary: row.summary,
				rationale: row.rationale
			}
		});
	}

	for (const row of db
		.prepare<
			[],
			{ id: string; project_id: string; title: string; body: string; scope: string; status: string }
		>('select id, project_id, title, body, scope, status from v2_core_memory_items')
		.all()) {
		if (!inScope({ project_id: row.project_id })) {
			continue;
		}
		candidates.push({
			recordType: 'memory',
			recordId: row.id,
			title: row.title,
			projectId: row.project_id,
			goalId: null,
			taskId: null,
			runId: null,
			artifactId: null,
			fields: {
				title: row.title,
				body: row.body,
				scope: row.scope,
				status: row.status
			}
		});
	}

	for (const row of db
		.prepare<
			[],
			{
				id: string;
				project_id: string | null;
				title: string;
				capability_name: string;
				prompt_or_task: string;
				rubric: string;
				status: string;
				version: string;
			}
		>(
			'select id, project_id, title, capability_name, prompt_or_task, rubric, status, version from v2_core_evaluation_scenarios'
		)
		.all()) {
		if (!inScope({ project_id: row.project_id })) {
			continue;
		}
		candidates.push({
			recordType: 'evaluation_scenario',
			recordId: row.id,
			title: row.title,
			projectId: row.project_id,
			goalId: null,
			taskId: null,
			runId: null,
			artifactId: null,
			fields: {
				title: row.title,
				capabilityName: row.capability_name,
				promptOrTask: row.prompt_or_task,
				rubric: row.rubric,
				status: row.status,
				version: row.version
			}
		});
	}

	for (const row of db
		.prepare<
			[],
			{
				id: string;
				task_id: string;
				project_id: string;
				goal_id: string;
				run_id: string | null;
				status: string;
				model_id: string | null;
				rubric_summary: string;
				result_summary: string;
				failure_summary: string;
			}
		>(
			`
				select result.id, result.task_id, task.project_id, task.goal_id, result.run_id,
					result.status, result.model_id, result.rubric_summary, result.result_summary,
					result.failure_summary
				from v2_core_evaluation_results result
				join v2_core_tasks task on task.id = result.task_id
			`
		)
		.all()) {
		if (!inScope(row)) {
			continue;
		}
		candidates.push({
			recordType: 'evaluation_result',
			recordId: row.id,
			title: `Evaluation result ${row.id}`,
			projectId: row.project_id,
			goalId: row.goal_id,
			taskId: row.task_id,
			runId: row.run_id,
			artifactId: null,
			fields: {
				status: row.status,
				modelId: row.model_id ?? '',
				rubricSummary: row.rubric_summary,
				resultSummary: row.result_summary,
				failureSummary: row.failure_summary
			}
		});
	}

	return candidates;
}

function scoreV2CoreRetrievalCandidate(
	candidate: V2CoreRetrievalCandidate,
	query: string,
	terms: string[]
): V2CoreLocalRetrieval['results'][number] | null {
	const matchedFields: string[] = [];
	let score = 0;
	let snippet = '';
	const normalizedQuery = query.toLowerCase();
	const title = candidate.title.toLowerCase();

	if (title.includes(normalizedQuery)) {
		score += 8;
	}

	for (const [field, value] of Object.entries(candidate.fields)) {
		const normalized = value.toLowerCase();
		let fieldMatched = normalized.includes(normalizedQuery);
		if (fieldMatched) {
			score += field === 'title' || field === 'name' ? 6 : 4;
		}

		for (const term of terms) {
			if (normalized.includes(term)) {
				fieldMatched = true;
				score += field === 'title' || field === 'name' ? 3 : 1;
			}
		}

		if (fieldMatched) {
			matchedFields.push(field);
			snippet = snippet || makeV2CoreRetrievalSnippet(value, terms);
		}
	}

	if (matchedFields.length === 0) {
		return null;
	}

	return {
		recordType: candidate.recordType,
		recordId: candidate.recordId,
		title: candidate.title,
		snippet: snippet || candidate.title,
		projectId: candidate.projectId,
		goalId: candidate.goalId,
		taskId: candidate.taskId,
		runId: candidate.runId,
		artifactId: candidate.artifactId,
		inclusionReason: `Matched ${matchedFields.join(', ')} for query "${query}".`,
		matchedFields,
		score
	};
}

function makeV2CoreRetrievalSnippet(value: string, terms: string[]) {
	const compact = value.replace(/\s+/g, ' ').trim();
	if (compact.length <= 220) {
		return compact;
	}

	const normalized = compact.toLowerCase();
	const firstIndex = terms
		.map((term) => normalized.indexOf(term))
		.filter((index) => index >= 0)
		.sort((left, right) => left - right)[0];
	const start = Math.max((firstIndex ?? 0) - 60, 0);
	const prefix = start > 0 ? '...' : '';
	const suffix = start + 220 < compact.length ? '...' : '';

	return `${prefix}${compact.slice(start, start + 220)}${suffix}`;
}

type V2CoreOperatorConsoleGoalRow = {
	goal_id: string;
	project_id: string;
	project_name: string;
	parent_goal_id: string | null;
	title: string;
	status: string;
	open_task_count: number;
	done_task_count: number;
	decision_id: string | null;
	decision_summary: string | null;
	decision_rationale: string | null;
	decision_decided_at: string | null;
};

function readV2CoreOperatorConsoleGoals(
	db: Database.Database,
	conditions: string[],
	params: string[]
): V2CoreOperatorConsoleGoal[] {
	return db
		.prepare<string[], V2CoreOperatorConsoleGoalRow>(
			`
				select
					goal.id as goal_id,
					goal.project_id,
					project.name as project_name,
					goal.parent_goal_id,
					goal.title,
					goal.status,
					count(distinct case when task.status not in ('done', 'canceled') then task.id end) as open_task_count,
					count(distinct case when task.status = 'done' then task.id end) as done_task_count,
					decision.id as decision_id,
					decision.summary as decision_summary,
					decision.rationale as decision_rationale,
					decision.decided_at as decision_decided_at
				from v2_core_goals goal
				join v2_core_projects project on project.id = goal.project_id
				left join v2_core_tasks task on task.goal_id = goal.id
				left join v2_core_decisions decision on decision.id = (
					select latest_decision.id
					from v2_core_decisions latest_decision
					where latest_decision.goal_id = goal.id
						and latest_decision.decision_type = 'goal_status_transition'
					order by latest_decision.decided_at desc, latest_decision.id desc
					limit 1
				)
				where ${conditions.join(' and ')}
				group by goal.id
				order by
					case goal.status
						when 'active' then 0
						when 'blocked' then 1
						when 'paused' then 2
						else 3
					end,
					goal.title
			`
		)
		.all(...params)
		.map((goal) => ({
			goalId: goal.goal_id,
			projectId: goal.project_id,
			projectName: goal.project_name,
			parentGoalId: goal.parent_goal_id,
			title: goal.title,
			status: goal.status,
			openTaskCount: goal.open_task_count,
			doneTaskCount: goal.done_task_count,
			latestGoalStatusTransition: goal.decision_id
				? {
						decisionId: goal.decision_id,
						summary: goal.decision_summary ?? '',
						rationale: goal.decision_rationale ?? '',
						decidedAt: goal.decision_decided_at ?? ''
					}
				: null
		}));
}

export function readV2CoreOperatorConsole(
	db: Database.Database,
	options: { projectId?: string | null; goalId?: string | null; limit?: number } = {}
): V2CoreOperatorConsole {
	const scope = resolveV2CoreConsoleScope(db, options);
	const limit = Math.min(Math.max(options.limit ?? 5, 1), 25);
	const taskConditions: string[] = ['1 = 1'];
	const taskParams: string[] = [];

	if (scope.projectId) {
		taskConditions.push('task.project_id = ?');
		taskParams.push(scope.projectId);
	}

	if (scope.goalId) {
		taskConditions.push('task.goal_id = ?');
		taskParams.push(scope.goalId);
	}

	const goalConditions: string[] = ["goal.status in ('active', 'blocked', 'paused')"];
	const goalParams: string[] = [];
	if (scope.projectId) {
		goalConditions.push('goal.project_id = ?');
		goalParams.push(scope.projectId);
	}
	if (scope.goalId) {
		goalConditions.push('goal.id = ?');
		goalParams.push(scope.goalId);
	}

	const activeGoals = readV2CoreOperatorConsoleGoals(db, goalConditions, goalParams);
	const goalStatusGroups = {
		running: activeGoals.filter((goal) => goal.status === 'active'),
		blocked: activeGoals.filter((goal) => goal.status === 'blocked'),
		paused: activeGoals.filter((goal) => goal.status === 'paused')
	};
	const scopedChildGoals = scope.goalId
		? readV2CoreOperatorConsoleGoals(
				db,
				['goal.parent_goal_id = ?', "goal.status in ('active', 'blocked', 'paused')"],
				[scope.goalId]
			)
		: [];
	const reviewQueue = db
		.prepare<
			[...string[], number],
			{
				artifact_id: string;
				task_id: string;
				task_title: string;
				goal_id: string;
				goal_title: string;
				run_id: string | null;
				run_status: string | null;
				title: string;
				uri: string;
				status: string;
			}
		>(
			`
				select
					artifact.id as artifact_id,
					artifact.task_id,
					task.title as task_title,
					task.goal_id,
					goal.title as goal_title,
					artifact.run_id,
					run.status as run_status,
					artifact.title,
					artifact.uri,
					artifact.status
				from v2_core_artifacts artifact
				join v2_core_tasks task on task.id = artifact.task_id
				join v2_core_goals goal on goal.id = task.goal_id
				left join v2_core_runs run on run.id = artifact.run_id
				left join v2_core_reviews review on review.artifact_id = artifact.id
					and review.status in ('approved', 'rejected')
				where artifact.status = 'submitted'
					and review.id is null
					and not exists (
						select 1
						from v2_core_decisions decision
						where decision.task_id = artifact.task_id
							and decision.decision_type = 'accept_task_output'
					)
					and ${taskConditions.join(' and ')}
				order by artifact.id
				limit ?
			`
		)
		.all(...taskParams, limit)
		.map((artifact) => ({
			artifactId: artifact.artifact_id,
			taskId: artifact.task_id,
			taskTitle: artifact.task_title,
			goalId: artifact.goal_id,
			goalTitle: artifact.goal_title,
			runId: artifact.run_id,
			runStatus: artifact.run_status,
			title: artifact.title,
			uri: artifact.uri,
			status: artifact.status
		}));
	const recentRuns = db
		.prepare<
			[...string[], number],
			{
				run_id: string;
				task_id: string;
				task_title: string;
				goal_id: string;
				project_id: string;
				status: string;
				model_provider_id: string | null;
				model_provider_name: string | null;
				result_summary: string;
				validation_summary: string;
				ended_at: string | null;
			}
		>(
			`
				select
					run.id as run_id,
					task.id as task_id,
					task.title as task_title,
					task.goal_id,
					task.project_id,
					run.status,
					run.model_provider_id,
					provider.name as model_provider_name,
					run.result_summary,
					run.validation_summary,
					run.ended_at
				from v2_core_runs run
				join v2_core_tasks task on task.id = run.task_id
				left join v2_core_model_providers provider on provider.id = run.model_provider_id
				where ${taskConditions.join(' and ')}
				order by coalesce(run.ended_at, run.started_at, '') desc, run.id desc
				limit ?
			`
		)
		.all(...taskParams, limit)
		.map((run) => ({
			runId: run.run_id,
			taskId: run.task_id,
			taskTitle: run.task_title,
			goalId: run.goal_id,
			projectId: run.project_id,
			status: run.status,
			modelProviderId: run.model_provider_id,
			modelProviderName: run.model_provider_name,
			resultSummary: run.result_summary,
			validationSummary: run.validation_summary,
			endedAt: run.ended_at
		}));
	const currentGoalRuns = db
		.prepare<
			string[],
			{
				run_id: string;
				task_id: string;
				task_title: string;
				goal_id: string;
				status: string;
				model_provider_id: string | null;
				model_provider_name: string | null;
			}
		>(
			`
				select
					run.id as run_id,
					task.id as task_id,
					task.title as task_title,
					task.goal_id,
					run.status,
					run.model_provider_id,
					provider.name as model_provider_name
				from v2_core_runs run
				join v2_core_tasks task on task.id = run.task_id
				left join v2_core_model_providers provider on provider.id = run.model_provider_id
				where run.ended_at is null
					and ${taskConditions.join(' and ')}
				order by run.started_at desc, run.id desc
			`
		)
		.all(...taskParams);
	const scopedChildGoalIds = scopedChildGoals.map((goal) => goal.goalId);
	const scopedChildGoalRuns =
		scopedChildGoalIds.length > 0
			? db
					.prepare<
						string[],
						{
							run_id: string;
							task_id: string;
							task_title: string;
							goal_id: string;
							status: string;
							model_provider_id: string | null;
							model_provider_name: string | null;
						}
					>(
						`
							select
								run.id as run_id,
								task.id as task_id,
								task.title as task_title,
								task.goal_id,
								run.status,
								run.model_provider_id,
								provider.name as model_provider_name
							from v2_core_runs run
							join v2_core_tasks task on task.id = run.task_id
							left join v2_core_model_providers provider on provider.id = run.model_provider_id
							where run.ended_at is null
								and task.goal_id in (${scopedChildGoalIds.map(() => '?').join(', ')})
							order by run.started_at desc, run.id desc
						`
					)
					.all(...scopedChildGoalIds)
			: [];
	const recentArtifacts = db
		.prepare<
			[...string[], number],
			{
				artifact_id: string;
				task_id: string | null;
				run_id: string | null;
				project_id: string;
				title: string;
				uri: string;
				role: string;
				status: string;
			}
		>(
			`
				select
					artifact.id as artifact_id,
					artifact.task_id,
					artifact.run_id,
					artifact.project_id,
					artifact.title,
					artifact.uri,
					artifact.role,
					artifact.status
				from v2_core_artifacts artifact
				left join v2_core_tasks task on task.id = artifact.task_id
				where ${taskConditions.join(' and ')}
				order by artifact.id desc
				limit ?
			`
		)
		.all(...taskParams, limit)
		.map((artifact) => ({
			artifactId: artifact.artifact_id,
			taskId: artifact.task_id,
			runId: artifact.run_id,
			projectId: artifact.project_id,
			title: artifact.title,
			uri: artifact.uri,
			role: artifact.role,
			status: artifact.status
		}));
	const nextWork = readV2CoreNextWork(db, {
		projectId: scope.projectId,
		goalId: scope.goalId,
		limit
	});
	const scopedTaskRows = scope.goalId
		? db
				.prepare<
					[string],
					{
						task_id: string;
						title: string;
						status: string;
					}
				>(
					`
						select id as task_id, title, status
						from v2_core_tasks
						where goal_id = ?
						order by
							case status
								when 'in_progress' then 0
								when 'review' then 1
								when 'ready' then 2
								when 'blocked' then 3
								when 'done' then 4
								else 5
							end,
							id
					`
				)
				.all(scope.goalId)
		: [];
	const scopedTaskIds = scopedTaskRows.map((task) => task.task_id);
	const scopedTaskRuns =
		scopedTaskIds.length > 0
			? db
					.prepare<
						string[],
						{
							run_id: string;
							task_id: string;
							status: string;
							model_provider_name: string | null;
						}
					>(
						`
							select
								run.id as run_id,
								task.id as task_id,
								run.status,
								provider.name as model_provider_name
							from v2_core_runs run
							join v2_core_tasks task on task.id = run.task_id
							left join v2_core_model_providers provider on provider.id = run.model_provider_id
							where run.ended_at is null
								and task.id in (${scopedTaskIds.map(() => '?').join(', ')})
							order by run.started_at desc, run.id desc
						`
					)
					.all(...scopedTaskIds)
			: [];
	const scopedReviewArtifacts =
		scopedTaskIds.length > 0
			? db
					.prepare<
						string[],
						{
							artifact_id: string;
							task_id: string;
							title: string;
							status: string;
						}
					>(
						`
							select artifact.id as artifact_id, artifact.task_id, artifact.title, artifact.status
							from v2_core_artifacts artifact
							left join v2_core_reviews review on review.artifact_id = artifact.id
								and review.status in ('approved', 'rejected')
							where artifact.status = 'submitted'
								and review.id is null
								and artifact.task_id in (${scopedTaskIds.map(() => '?').join(', ')})
							order by artifact.id
						`
					)
					.all(...scopedTaskIds)
			: [];
	const currentRunByGoalId = new Map<string, (typeof currentGoalRuns)[number]>();
	for (const run of currentGoalRuns) {
		if (!currentRunByGoalId.has(run.goal_id)) {
			currentRunByGoalId.set(run.goal_id, run);
		}
	}
	const scopedChildRunByGoalId = new Map<string, (typeof scopedChildGoalRuns)[number]>();
	for (const run of scopedChildGoalRuns) {
		if (!scopedChildRunByGoalId.has(run.goal_id)) {
			scopedChildRunByGoalId.set(run.goal_id, run);
		}
	}
	const selectedTaskByGoalId = new Map<string, V2CoreNextWork['candidates'][number]>();
	for (const candidate of nextWork.candidates) {
		if (candidate.action === 'start_task' && !selectedTaskByGoalId.has(candidate.goalId)) {
			selectedTaskByGoalId.set(candidate.goalId, candidate);
		}
	}
	const selectedChildTaskByGoalId = new Map<string, V2CoreNextWork['candidates'][number]>();
	for (const goal of scopedChildGoals) {
		if (goal.status !== 'active' || scopedChildRunByGoalId.has(goal.goalId)) {
			continue;
		}

		const candidate =
			readV2CoreNextWork(db, {
				goalId: goal.goalId,
				limit: 1
			}).candidates.find((item) => item.action === 'start_task') ?? null;
		if (candidate) {
			selectedChildTaskByGoalId.set(goal.goalId, candidate);
		}
	}
	const currentRunByTaskId = new Map<string, (typeof scopedTaskRuns)[number]>();
	for (const run of scopedTaskRuns) {
		if (!currentRunByTaskId.has(run.task_id)) {
			currentRunByTaskId.set(run.task_id, run);
		}
	}
	const reviewArtifactByTaskId = new Map<string, (typeof scopedReviewArtifacts)[number]>();
	for (const artifact of scopedReviewArtifacts) {
		if (!reviewArtifactByTaskId.has(artifact.task_id)) {
			reviewArtifactByTaskId.set(artifact.task_id, artifact);
		}
	}
	const selectedNextWorkTaskIds = new Set(
		nextWork.candidates
			.filter((candidate) => candidate.action === 'start_task')
			.map((candidate) => candidate.taskId)
	);
	const scopedTaskRollup: V2CoreOperatorConsoleScopedTaskRollup | null = scope.goalId
		? {
				counts: {
					open: scopedTaskRows.filter((task) => !['done', 'canceled'].includes(task.status)).length,
					review: scopedTaskRows.filter((task) => task.status === 'review').length,
					done: scopedTaskRows.filter((task) => task.status === 'done').length
				},
				tasks: scopedTaskRows
					.filter((task) => task.status !== 'canceled')
					.slice(0, limit)
					.map((task) => {
						const currentRun = currentRunByTaskId.get(task.task_id) ?? null;
						const reviewArtifact = reviewArtifactByTaskId.get(task.task_id) ?? null;

						return {
							taskId: task.task_id,
							title: task.title,
							status: task.status,
							currentRun: currentRun
								? {
										runId: currentRun.run_id,
										status: currentRun.status,
										modelProviderName: currentRun.model_provider_name
									}
								: null,
							reviewArtifact: reviewArtifact
								? {
										artifactId: reviewArtifact.artifact_id,
										title: reviewArtifact.title,
										status: reviewArtifact.status
									}
								: null,
							selectedNextWork: selectedNextWorkTaskIds.has(task.task_id)
						};
					})
			}
		: null;

	function toWorkQueueItem(
		goal: V2CoreOperatorConsoleGoal,
		currentRun: (typeof currentGoalRuns)[number] | null,
		selectedTask: V2CoreNextWork['candidates'][number] | null
	): V2CoreOperatorConsoleWorkQueueItem {
		const queueState: V2CoreOperatorConsoleWorkQueueItem['queueState'] =
			goal.status === 'blocked'
				? 'blocked'
				: goal.status === 'paused'
					? 'paused'
					: currentRun
						? 'running'
						: selectedTask
							? 'ready_to_dispatch'
							: goal.openTaskCount > 0
								? 'no_dispatchable_work'
								: 'no_open_work';

		return {
			...goal,
			queueState,
			currentRun: currentRun
				? {
						runId: currentRun.run_id,
						taskId: currentRun.task_id,
						taskTitle: currentRun.task_title,
						status: currentRun.status,
						modelProviderId: currentRun.model_provider_id,
						modelProviderName: currentRun.model_provider_name
					}
				: null,
			selectedTask
		};
	}

	const workQueue: V2CoreOperatorConsoleWorkQueueItem[] = activeGoals.map((goal) => {
		const currentRun = currentRunByGoalId.get(goal.goalId) ?? null;
		const selectedTask =
			goal.status === 'active' && !currentRun
				? (selectedTaskByGoalId.get(goal.goalId) ?? null)
				: null;

		return toWorkQueueItem(goal, currentRun, selectedTask);
	});
	const scopedChildGoalRollup: V2CoreOperatorConsoleWorkQueueItem[] = scopedChildGoals.map(
		(goal) => {
			const currentRun = scopedChildRunByGoalId.get(goal.goalId) ?? null;
			const selectedTask =
				goal.status === 'active' && !currentRun
					? (selectedChildTaskByGoalId.get(goal.goalId) ?? null)
					: null;

			return toWorkQueueItem(goal, currentRun, selectedTask);
		}
	);
	const memory = scope.projectId
		? readV2CoreMemoryForContext(db, {
				projectId: scope.projectId
			})
		: null;
	const scopedWorkQueueItem = scope.goalId
		? (workQueue.find((item) => item.goalId === scope.goalId) ?? null)
		: null;
	const scopedGoal = activeGoals.find((goal) => goal.goalId === scope.goalId) ?? null;
	function scopedGoalReadiness(
		goal: V2CoreOperatorConsoleGoal,
		queueState: V2CoreOperatorConsoleWorkQueueItem['queueState'] | null,
		currentRun: V2CoreOperatorConsoleWorkQueueItem['currentRun'],
		selectedTask: V2CoreNextWork['candidates'][number] | null,
		taskRollup: V2CoreOperatorConsoleScopedTaskRollup | null
	): V2CoreOperatorConsoleScopedGoalSummary['readiness'] {
		if (goal.status === 'blocked' || queueState === 'blocked') {
			return {
				state: 'blocked',
				label: 'Unblock before continuing',
				summary: 'This goal is blocked. Resolve or resume the blocker before assigning more work.'
			};
		}

		if (goal.status === 'paused' || queueState === 'paused') {
			return {
				state: 'paused',
				label: 'Paused',
				summary: 'This goal is paused. Resume it before dispatching or planning more work.'
			};
		}

		if (currentRun) {
			return {
				state: 'running_work',
				label: 'Work is running',
				summary: 'A current run is open for this goal. Wait for it or open the current-run task.'
			};
		}

		if ((taskRollup?.counts.review ?? 0) > 0) {
			return {
				state: 'review_required',
				label: 'Review output',
				summary: 'This goal has work awaiting review. Review the output before selecting more work.'
			};
		}

		if (selectedTask || queueState === 'ready_to_dispatch') {
			return {
				state: 'ready_to_dispatch',
				label: 'Ready to dispatch',
				summary: 'This goal has selected ready work. Launch it or inspect the selected task.'
			};
		}

		if (goal.status === 'active' && goal.openTaskCount > 0) {
			return {
				state: 'needs_next_work',
				label: 'Select next work',
				summary:
					'This goal has open work, but no dispatchable task is selected. Clarify or prepare the next task.'
			};
		}

		return {
			state: 'ready_for_completion_assessment',
			label: 'Assess completion',
			summary:
				'This active goal has no running, review, blocked, or open work. Assess whether the goal is complete before creating more continuation work.'
		};
	}
	const scopedGoalSummary =
		scope.goalId && scopedGoal
			? {
					goal: scopedGoal,
					queueState: scopedWorkQueueItem?.queueState ?? null,
					readiness: scopedGoalReadiness(
						scopedGoal,
						scopedWorkQueueItem?.queueState ?? null,
						scopedWorkQueueItem?.currentRun ?? null,
						scopedWorkQueueItem?.selectedTask ?? null,
						scopedTaskRollup
					),
					currentRun: scopedWorkQueueItem?.currentRun ?? null,
					selectedTask: scopedWorkQueueItem?.selectedTask ?? null,
					recentAcceptedArtifact:
						recentArtifacts.find((artifact) => artifact.status === 'accepted') ?? null,
					trustedMemory: memory?.items.find((item) => item.status === 'trusted') ?? null
				}
			: null;
	const overview = readV2CoreOverview(db);
	const dependencyReport = readV2CoreDependencyReport(db, {
		projectId: scope.projectId,
		goalId: scope.goalId
	});
	const evaluationContext = readV2CoreEvaluationContext(db, {
		projectId: scope.projectId
	});
	const snapshotTableCounts = readV2CoreSnapshotTableCounts(db);

	return {
		scope,
		overview,
		activeGoals,
		goalStatusGroups,
		workQueue,
		scopedGoalSummary,
		scopedChildGoalRollup,
		scopedTaskRollup,
		nextWork,
		reviewQueue,
		recentRuns,
		recentArtifacts,
		memory,
		dependencyReport,
		evaluationContext,
		snapshotStatus: {
			format: V2_CORE_SNAPSHOT_FORMAT,
			tableCounts: snapshotTableCounts
		}
	};
}

function readV2CoreSnapshotTableCounts(db: Database.Database): Record<V2CoreSnapshotTableName, number> {
	return Object.fromEntries(
		V2_CORE_SNAPSHOT_TABLES.map((table) => {
			const row = db.prepare<[], { count: number }>(`select count(*) as count from ${table.name}`).get();
			return [table.name, row?.count ?? 0];
		})
	) as Record<V2CoreSnapshotTableName, number>;
}

export function readV2CoreAgentWorkPacket(
	db: Database.Database,
	taskId: string
): V2CoreAgentWorkPacket | null {
	const context = readV2CoreContextBundle(db, taskId);
	if (!context) {
		return null;
	}

	const detail = readV2CoreTaskDetail(db, taskId);
	if (!detail) {
		return null;
	}

	const memory = readV2CoreMemoryForContext(db, { taskId });
	const dependencyReport = readV2CoreDependencyReport(db, {
		projectId: detail.project.id,
		goalId: detail.goal.id
	});
	const console = readV2CoreOperatorConsole(db, {
		projectId: detail.project.id,
		goalId: detail.goal.id,
		limit: 5
	});
	const evaluationContext = readV2CoreEvaluationContext(db, {
		projectId: detail.project.id
	});
	const readiness = classifyV2CoreAgentPacketReadiness(
		detail.task.status,
		context.readiness.reason
	);
	const trustedMemory = memory.items.filter((item) => item.status === 'trusted').slice(0, 8);
	const selectedMemoryIds = new Set(trustedMemory.map((item) => item.id));
	const selectedContextSources = context.includedSources.filter(
		(source) => source.recordType !== 'memory' || selectedMemoryIds.has(source.recordId)
	);
	const selectedDependencyReport: V2CoreDependencyReport = {
		...dependencyReport,
		modelProviders: dependencyReport.modelProviders.slice(0, 5),
		toolExecutions: dependencyReport.toolExecutions.slice(0, 10)
	};
	const packetWithoutPrompt = {
		taskContract: {
			taskId: detail.task.id,
			title: detail.task.title,
			summary: detail.task.summary,
			status: detail.task.status,
			successCriteria: detail.task.successCriteria,
			validationPlan: detail.task.validationPlan,
			project: detail.project,
			goal: detail.goal
		},
		readiness,
		contextSources: selectedContextSources,
		recentEvidence: {
			currentTaskRuns: detail.runs,
			currentTaskArtifacts: detail.artifacts,
			currentTaskReviews: detail.reviews,
			recentProjectRuns: console.recentRuns,
			recentProjectArtifacts: console.recentArtifacts
		},
		relevantDecisions: detail.decisions,
		trustedMemory,
		dependencySummary: {
			...selectedDependencyReport.summary,
			modelProviders: selectedDependencyReport.modelProviders,
			toolExecutions: selectedDependencyReport.toolExecutions
		},
		evaluationEvidence: {
			scenarios: evaluationContext.scenarios.slice(0, 5),
			results: evaluationContext.results.slice(0, 10)
		},
		validationExpectations: {
			successCriteria: detail.task.successCriteria,
			validationPlan: detail.task.validationPlan,
			reviewRequiredBeforeDone: true,
			acceptanceDecisionRequiredBeforeDone: true
		},
		allowedActions: allowedV2CoreAgentPacketActions(detail.task.status),
		stoppingConditions: [
			'Stop if the task contract is ambiguous enough that implementation would create duplicate architecture or contradictory state.',
			'Stop if required files, commands, credentials, approvals, or external access are unavailable.',
			'Stop before schema, entity, lifecycle, or workflow expansion unless the task explicitly authorizes it.',
			'Stop before destructive file, database, git, deployment, or external communication actions without explicit approval.',
			'Stop after producing reviewable evidence and recording run results for the task.'
		],
		sourceLinks: buildV2CoreAgentPacketSourceLinks(
			detail,
			{ ...context, includedSources: selectedContextSources },
			{ ...memory, items: trustedMemory },
			selectedDependencyReport,
			evaluationContext
		).slice(0, 60)
	};

	return {
		...packetWithoutPrompt,
		renderedPrompt: renderV2CoreAgentWorkPacket(packetWithoutPrompt)
	};
}

export function readV2CoreAgentPreparationPacket(
	db: Database.Database,
	taskId: string
): V2CoreAgentPreparationPacket | null {
	const workPacket = readV2CoreAgentWorkPacket(db, taskId);
	const detail = readV2CoreTaskDetail(db, taskId);
	if (!workPacket || !detail) {
		return null;
	}

	const taskText = [
		workPacket.taskContract.title,
		workPacket.taskContract.summary,
		workPacket.taskContract.successCriteria,
		workPacket.taskContract.validationPlan,
		workPacket.taskContract.goal.title
	].join('\n');
	const primaryTaskText = [
		workPacket.taskContract.title,
		workPacket.taskContract.summary,
		workPacket.taskContract.goal.title
	].join('\n');
	const retrieval = readV2CoreLocalRetrieval(db, {
		projectId: detail.project.id,
		goalId: detail.goal.id,
		taskId,
		query: buildV2CoreAgentPreparationQuery(taskText, primaryTaskText),
		limit: 10
	});
	const selectedResources = buildV2CoreAgentPreparationResources(workPacket, retrieval);
	const requirementsAssessment = buildV2CoreAgentPreparationRequirements(workPacket, taskText);
	const gapAssessment = buildV2CoreAgentPreparationGaps(
		workPacket,
		selectedResources,
		requirementsAssessment,
		taskText
	);
	const verificationChecklist = Array.from(
		new Set(
			[
				...requirementsAssessment.verification,
				workPacket.validationExpectations.reviewRequiredBeforeDone
					? 'Submit output for review before closing the task.'
					: '',
				workPacket.validationExpectations.acceptanceDecisionRequiredBeforeDone
					? 'Record an acceptance decision before marking the task done.'
					: ''
			].filter(Boolean)
		)
	);

	return {
		taskContract: workPacket.taskContract,
		readiness: workPacket.readiness,
		requirementsAssessment,
		selectedResources,
		gapAssessment,
		executionPackage: {
			goal: detail.goal,
			expectedOutputs: buildV2CoreAgentPreparationExpectedOutputs(workPacket),
			allowedActions: workPacket.allowedActions,
			constraints: requirementsAssessment.constraints,
			verificationChecklist,
			selectedResourceCount: selectedResources.length
		},
		preparationReview: {
			questions: [
				'Did the packet include enough source-linked context to execute the task without rediscovery?',
				'Were any blocking gaps discovered during execution that should have been identified earlier?',
				'Did irrelevant context distract from the task contract or validation plan?',
				'Should any repeated procedure become trusted memory, a skill update, or a follow-up task after review?'
			],
			acceptanceChecks: [
				'Every selected resource has an inclusion reason and source.',
				'Every gap is classified as blocking, helpful_non_blocking, discoverable_during_execution, or deferred_or_irrelevant.',
				'The execution package contains the task contract, constraints, expected outputs, and verification checklist.',
				'The packet does not create or require new persistent entities.'
			]
		},
		sourceLinks: workPacket.sourceLinks
	};
}

function buildV2CoreAgentPreparationQuery(taskText: string, primaryTaskText: string) {
	const normalized = taskText.toLowerCase();
	const primary = primaryTaskText.toLowerCase();
	const terms = [
		'context',
		'memory',
		'tool',
		'evaluation',
		'artifact',
		'decision',
		'validation',
		normalized.includes('skill') || normalized.includes('workflow') ? 'skill workflow' : '',
		primary.includes('3d') || primary.includes('property') || primary.includes('modeling')
			? '3D property modeling floor plan source measurements'
			: '',
		normalized.includes('agent') || normalized.includes('preparation')
			? 'agent preparation execution package gaps resources'
			: ''
	];

	return terms.filter(Boolean).join(' ');
}

function buildV2CoreAgentPreparationRequirements(
	packet: V2CoreAgentWorkPacket,
	taskText: string
): V2CoreAgentPreparationPacket['requirementsAssessment'] {
	const normalized = taskText.toLowerCase();
	const primaryText = `${packet.taskContract.title}\n${packet.taskContract.summary}`.toLowerCase();
	const isPropertyModeling = /3d|property|modeling/.test(primaryText);
	const knowledge = [
		'Current task contract, parent goal, success criteria, and validation plan.',
		...(packet.trustedMemory.length > 0
			? ['Trusted project memory relevant to the task scope.']
			: []),
		...(packet.relevantDecisions.length > 0
			? ['Prior decisions that constrain or explain the chosen path.']
			: []),
		...(isPropertyModeling
			? [
					'Property-modeling source material such as measurements, floor plans, photos, constraints, and target output format.'
				]
			: [])
	];
	const skillsOrWorkflows = [
		...(normalized.includes('agent') || normalized.includes('preparation')
			? ['Agent work-packet and local retrieval workflow.']
			: []),
		...(normalized.includes('review') || normalized.includes('acceptance')
			? ['Managed run closeout and review-gated acceptance workflow.']
			: []),
		...(isPropertyModeling
			? ['3D/property modeling procedure or domain guidance if available.']
			: [])
	];
	const tools = [
		...(packet.dependencySummary.toolExecutions.length > 0
			? ['Previously used local tools with execution evidence.']
			: []),
		...(normalized.includes('cli') || normalized.includes('read model')
			? ['v2 core CLI and focused server test runner.']
			: [])
	];

	return {
		knowledge,
		skillsOrWorkflows,
		tools,
		sourceContext: [
			'Source-linked context bundle records selected for this task.',
			'Local retrieval results scoped to the task, goal, and project.',
			'Accepted artifacts and trusted memory when they affect execution or verification.'
		],
		constraints: [
			...packet.stoppingConditions,
			'Use existing v2 core records and computed read models before adding model surface area.',
			'Do not promote AI output to trusted memory without reviewed source evidence.'
		],
		verification: [
			packet.validationExpectations.successCriteria,
			packet.validationExpectations.validationPlan
		].filter(Boolean)
	};
}

function buildV2CoreAgentPreparationResources(
	packet: V2CoreAgentWorkPacket,
	retrieval: V2CoreLocalRetrieval
): V2CoreAgentPreparationPacket['selectedResources'] {
	const resources = new Map<string, V2CoreAgentPreparationPacket['selectedResources'][number]>();
	const add = (
		recordType: string,
		recordId: string,
		title: string,
		inclusionReason: string,
		source: V2CoreAgentPreparationPacket['selectedResources'][number]['source']
	) => {
		const key = `${recordType}:${recordId}`;
		if (!resources.has(key)) {
			resources.set(key, { recordType, recordId, title, inclusionReason, source });
		}
	};

	for (const source of packet.contextSources.slice(0, 12)) {
		add(source.recordType, source.recordId, source.title, source.reason, 'work_packet');
	}
	for (const item of packet.trustedMemory.slice(0, 8)) {
		add(
			'memory',
			item.id,
			item.title,
			'Trusted memory selected for task context.',
			'trusted_memory'
		);
	}
	for (const result of retrieval.results.slice(0, 8)) {
		add(
			result.recordType,
			result.recordId,
			result.title,
			result.inclusionReason,
			'local_retrieval'
		);
	}
	for (const execution of packet.dependencySummary.toolExecutions.slice(0, 5)) {
		add(
			'tool_execution',
			execution.executionId,
			execution.toolName,
			`Tool execution evidence with status ${execution.status}.`,
			'tool_evidence'
		);
	}
	for (const result of packet.evaluationEvidence.results.slice(0, 5)) {
		add(
			'evaluation_result',
			result.id,
			result.scenarioTitle,
			`Evaluation evidence with status ${result.status}.`,
			'evaluation_evidence'
		);
	}
	for (const skill of inferV2CoreAgentPreparationSkillFiles(packet, retrieval).slice(0, 5)) {
		add('skill_file', skill.path, skill.name, skill.reason, 'skill_file');
	}

	return Array.from(resources.values()).slice(0, 30);
}

function inferV2CoreAgentPreparationSkillFiles(
	packet: V2CoreAgentWorkPacket,
	retrieval: V2CoreLocalRetrieval
) {
	const taskText = [
		packet.taskContract.title,
		packet.taskContract.summary,
		packet.taskContract.successCriteria,
		packet.taskContract.validationPlan,
		...retrieval.results.map((result) => result.title)
	]
		.join('\n')
		.toLowerCase();
	const skills: Array<{ name: string; path: string; reason: string }> = [];
	const add = (name: string, path: string, reason: string) => {
		if (!skills.some((skill) => skill.path === path)) {
			skills.push({ name, path, reason });
		}
	};

	if (taskText.includes('ams') || taskText.includes('agent') || taskText.includes('goal')) {
		add(
			'ams-agent-interface',
			'.agents/skills/ams-agent-interface/SKILL.md',
			'Task concerns AMS goal/task/run workflow.'
		);
		add(
			'ams-control-plane-operations',
			'.agents/skills/ams-control-plane-operations/SKILL.md',
			'Task may inspect or update AMS state through supported operations.'
		);
	}
	if (taskText.includes('source') || taskText.includes('evidence') || taskText.includes('claim')) {
		add(
			'evidence-to-insight',
			'.agents/skills/evidence-to-insight/SKILL.md',
			'Task depends on turning evidence into proportional conclusions.'
		);
	}
	if (
		taskText.includes('organization') ||
		taskText.includes('ontology') ||
		taskText.includes('context')
	) {
		add(
			'information-organization-design',
			'.agents/skills/information-organization-design/SKILL.md',
			'Task involves structuring information for human and agent use.'
		);
	}

	return skills;
}

function buildV2CoreAgentPreparationGaps(
	packet: V2CoreAgentWorkPacket,
	resources: V2CoreAgentPreparationPacket['selectedResources'],
	requirements: V2CoreAgentPreparationPacket['requirementsAssessment'],
	taskText: string
): V2CoreAgentPreparationPacket['gapAssessment'] {
	const normalized = taskText.toLowerCase();
	const primaryText = `${packet.taskContract.title}\n${packet.taskContract.summary}`.toLowerCase();
	const gaps: V2CoreAgentPreparationPacket['gapAssessment'] = [];
	const add = (classification: V2CoreAgentPreparationGapClass, summary: string, source: string) => {
		if (!gaps.some((gap) => gap.classification === classification && gap.summary === summary)) {
			gaps.push({ classification, summary, source });
		}
	};

	if (!packet.readiness.actionable) {
		add('blocking', packet.readiness.reason, 'task_readiness');
	}
	if (packet.trustedMemory.length === 0) {
		add('helpful_non_blocking', 'No trusted memory was selected for this task.', 'trusted_memory');
	}
	if (
		requirements.tools.length > 0 &&
		!resources.some((resource) => resource.source === 'tool_evidence')
	) {
		add(
			'helpful_non_blocking',
			'No relevant prior tool-execution evidence was selected.',
			'tool_evidence'
		);
	}
	if (
		/3d|property|modeling/.test(primaryText) &&
		!resources.some((resource) => /3d|property|model/i.test(resource.title))
	) {
		add(
			'blocking',
			'Property-modeling work needs concrete source material or a representative fixture before execution.',
			'domain_source_context'
		);
	}
	if (packet.evaluationEvidence.results.length === 0) {
		add(
			'discoverable_during_execution',
			'No prior evaluation result is available; adequacy can be assessed after this run.',
			'evaluation_evidence'
		);
	}
	add(
		'deferred_or_irrelevant',
		'Persistent capability taxonomy, routing policy, scheduler, local model, broad UI, and auto-promotion are outside this packet slice.',
		'task_boundary'
	);

	return gaps;
}

function buildV2CoreAgentPreparationExpectedOutputs(packet: V2CoreAgentWorkPacket) {
	const outputs = ['A durable task output artifact suitable for review.'];
	const normalized = [packet.taskContract.title, packet.taskContract.summary]
		.join('\n')
		.toLowerCase();

	if (normalized.includes('read model') || normalized.includes('cli')) {
		outputs.push('Focused read-model/CLI behavior with server smoke coverage.');
	}
	if (
		normalized.includes('3d') ||
		normalized.includes('property') ||
		normalized.includes('modeling')
	) {
		outputs.push('A source-linked modeling output or fixture validation result.');
	}
	outputs.push('Validation evidence mapped back to the task success criteria.');

	return outputs;
}

function classifyV2CoreAgentPacketReadiness(
	status: string,
	defaultReason: string
): V2CoreAgentWorkPacket['readiness'] {
	if (status === 'ready') {
		return {
			status,
			actionable: true,
			reason: defaultReason,
			recommendedAction: 'start_task'
		};
	}

	if (status === 'in_progress') {
		return {
			status,
			actionable: true,
			reason: 'Task is already in progress; continue only within the existing task contract.',
			recommendedAction: 'continue_task'
		};
	}

	if (status === 'review') {
		return {
			status,
			actionable: false,
			reason:
				'Task is awaiting review; do not continue implementation unless review sends it back.',
			recommendedAction: 'review_output'
		};
	}

	if (status === 'blocked') {
		return {
			status,
			actionable: false,
			reason: 'Task is blocked and needs an unblock decision before execution.',
			recommendedAction: 'resolve_blocker'
		};
	}

	return {
		status,
		actionable: false,
		reason: `Task status is ${status}; no agent execution is recommended.`,
		recommendedAction: 'stop'
	};
}

function allowedV2CoreAgentPacketActions(status: string) {
	if (status === 'ready') {
		return [
			'inspect referenced source files and docs',
			'implement the bounded task contract',
			'run the validation plan',
			'record run evidence',
			'attach artifacts',
			'submit output for review'
		];
	}

	if (status === 'in_progress') {
		return [
			'continue the bounded task contract',
			'run the validation plan',
			'record run evidence',
			'attach artifacts',
			'submit output for review'
		];
	}

	if (status === 'review') {
		return [
			'inspect submitted evidence',
			'record review result',
			'return to in_progress if revision is needed'
		];
	}

	if (status === 'blocked') {
		return ['inspect blocker context', 'record an unblock decision or keep blocked'];
	}

	return ['inspect state only'];
}

function buildV2CoreAgentPacketSourceLinks(
	detail: V2CoreTaskDetail,
	context: V2CoreContextBundle,
	memory: V2CoreMemoryForContext,
	dependencyReport: V2CoreDependencyReport,
	evaluationContext: V2CoreEvaluationContext
): V2CoreAgentWorkPacket['sourceLinks'] {
	const links = new Map<string, V2CoreAgentWorkPacket['sourceLinks'][number]>();
	const add = (recordType: string, recordId: string, reason: string) => {
		links.set(`${recordType}:${recordId}`, { recordType, recordId, reason });
	};

	add('project', detail.project.id, 'Project containing the task.');
	add('goal', detail.goal.id, 'Goal this task advances.');
	add('task', detail.task.id, 'Selected task contract.');
	for (const source of context.includedSources) {
		add(source.recordType, source.recordId, source.reason);
	}
	for (const run of detail.runs) {
		add('run', run.id, 'Current task run evidence.');
	}
	for (const artifact of detail.artifacts) {
		add('artifact', artifact.id, `Current task artifact with status ${artifact.status}.`);
	}
	for (const review of detail.reviews) {
		add('review', review.id, `Current task review with status ${review.status}.`);
	}
	for (const decision of detail.decisions) {
		add('decision', decision.id, `Current task decision of type ${decision.decisionType}.`);
	}
	for (const item of memory.items) {
		add('memory', item.id, `Project memory with status ${item.status}.`);
		for (const source of item.sources) {
			add(source.sourceTable, source.sourceId, source.reason);
		}
	}
	for (const provider of dependencyReport.modelProviders) {
		add(
			'model_provider',
			provider.providerId,
			`Model provider used by ${provider.runCount} run(s).`
		);
	}
	for (const execution of dependencyReport.toolExecutions) {
		add('tool_execution', execution.executionId, `Tool execution with status ${execution.status}.`);
	}
	for (const scenario of evaluationContext.scenarios) {
		add('evaluation_scenario', scenario.id, `Evaluation scenario for ${scenario.capabilityName}.`);
	}
	for (const result of evaluationContext.results) {
		add('evaluation_result', result.id, `Evaluation result with status ${result.status}.`);
	}

	return Array.from(links.values());
}

function renderV2CoreAgentWorkPacket(
	packet: Omit<V2CoreAgentWorkPacket, 'renderedPrompt'>
): string {
	return clampText(
		[
			`Task: ${packet.taskContract.title}`,
			`Task id: ${packet.taskContract.taskId}`,
			`Project: ${packet.taskContract.project.name} (${packet.taskContract.project.id})`,
			`Goal: ${packet.taskContract.goal.title} (${packet.taskContract.goal.id})`,
			`Status: ${packet.taskContract.status}`,
			`Readiness: ${packet.readiness.reason}`,
			'',
			'Task summary:',
			packet.taskContract.summary || '(none)',
			'',
			'Success criteria:',
			packet.taskContract.successCriteria,
			'',
			'Validation plan:',
			packet.taskContract.validationPlan,
			'',
			'Trusted memory:',
			...packet.trustedMemory.slice(0, 5).map((item) => `- ${item.title}: ${item.body}`),
			...(packet.trustedMemory.length === 0 ? ['- none'] : []),
			'',
			'Recent evidence:',
			...packet.recentEvidence.recentProjectRuns
				.slice(0, 5)
				.map((run) => `- ${run.taskTitle}: ${run.resultSummary || run.status}`),
			...(packet.recentEvidence.recentProjectRuns.length === 0 ? ['- none'] : []),
			'',
			'Evaluation evidence:',
			...packet.evaluationEvidence.results
				.slice(0, 5)
				.map((result) => `- ${result.scenarioTitle}: ${result.status} (${result.resultSummary})`),
			...(packet.evaluationEvidence.results.length === 0 ? ['- none'] : []),
			'',
			'Allowed actions:',
			...packet.allowedActions.map((action) => `- ${action}`),
			'',
			'Stopping conditions:',
			...packet.stoppingConditions.map((condition) => `- ${condition}`)
		].join('\n'),
		4000
	);
}

function clampText(value: string, maxLength: number) {
	if (value.length <= maxLength) {
		return value;
	}

	return `${value.slice(0, Math.max(maxLength - 15, 0)).trimEnd()}\n[truncated]`;
}

function resolveV2CoreConsoleScope(
	db: Database.Database,
	options: { projectId?: string | null; goalId?: string | null }
) {
	const projectId = optionalText(options.projectId);
	const goalId = optionalText(options.goalId);

	if (goalId) {
		const goal = db
			.prepare<
				[string],
				{ project_id: string }
			>('select project_id from v2_core_goals where id = ?')
			.get(goalId);
		if (!goal) {
			throw new Error(`Goal ${goalId} was not found in the v2 core database.`);
		}
		if (projectId && projectId !== goal.project_id) {
			throw new Error(`Goal ${goalId} does not belong to project ${projectId}.`);
		}

		return {
			projectId: projectId ?? goal.project_id,
			goalId
		};
	}

	if (projectId) {
		ensureRow(db, 'v2_core_projects', projectId, 'Project');
	}

	return {
		projectId,
		goalId
	};
}

export function exportV2CoreSnapshot(db: Database.Database): V2CoreSnapshot {
	const tables = Object.fromEntries(
		V2_CORE_SNAPSHOT_TABLES.map((table) => [
			table.name,
			db
				.prepare<[], V2CoreSnapshotRow>(
					`
						select ${table.columns.join(', ')}
						from ${table.name}
						order by ${table.orderBy.join(', ')}
					`
				)
				.all()
		])
	) as Record<V2CoreSnapshotTableName, V2CoreSnapshotRow[]>;

	return {
		format: V2_CORE_SNAPSHOT_FORMAT,
		tables
	};
}

export function importV2CoreSnapshot(db: Database.Database, snapshot: unknown) {
	const validSnapshot = assertV2CoreSnapshot(snapshot);
	assertV2CoreSnapshotTargetEmpty(db);

	db.transaction(() => {
		for (const table of V2_CORE_SNAPSHOT_TABLES) {
			const placeholders = table.columns.map(() => '?').join(', ');
			const statement = db.prepare(
				`
					insert into ${table.name} (${table.columns.join(', ')})
					values (${placeholders})
				`
			);

			for (const row of validSnapshot.tables[table.name]) {
				statement.run(...table.columns.map((column) => row[column] ?? null));
			}
		}
	})();

	return readV2CoreOverview(db);
}

function assertV2CoreSnapshot(snapshot: unknown): V2CoreSnapshot {
	if (!snapshot || typeof snapshot !== 'object') {
		throw new Error('Snapshot must be a JSON object.');
	}

	const candidate = snapshot as {
		format?: unknown;
		tables?: unknown;
	};

	if (candidate.format !== V2_CORE_SNAPSHOT_FORMAT) {
		throw new Error(`Unsupported v2 core snapshot format: ${String(candidate.format)}.`);
	}

	if (!candidate.tables || typeof candidate.tables !== 'object') {
		throw new Error('Snapshot is missing tables.');
	}

	const tables = candidate.tables as Record<string, unknown>;
	for (const table of V2_CORE_SNAPSHOT_TABLES) {
		const rows = tables[table.name];
		if (!Array.isArray(rows)) {
			throw new Error(`Snapshot table ${table.name} must be an array.`);
		}

		for (const row of rows) {
			if (!row || typeof row !== 'object' || Array.isArray(row)) {
				throw new Error(`Snapshot table ${table.name} contains a non-object row.`);
			}

			const rowKeys = Object.keys(row);
			const expectedColumns = new Set<string>(table.columns);
			for (const key of rowKeys) {
				if (!expectedColumns.has(key)) {
					throw new Error(`Snapshot table ${table.name} contains unknown column ${key}.`);
				}
			}

			for (const column of table.columns) {
				if (!(column in row)) {
					throw new Error(`Snapshot table ${table.name} row is missing column ${column}.`);
				}
			}
		}
	}

	return candidate as V2CoreSnapshot;
}

function assertV2CoreSnapshotTargetEmpty(db: Database.Database) {
	const nonEmptyTable = V2_CORE_SNAPSHOT_TABLES.find((table) => {
		const row = db
			.prepare<[], { count: number }>(`select count(*) as count from ${table.name}`)
			.get();
		return (row?.count ?? 0) > 0;
	});

	if (nonEmptyTable) {
		throw new Error(`Refusing to import snapshot because ${nonEmptyTable.name} is not empty.`);
	}
}

function inferProjectIdForDecision(db: Database.Database, input: V2CoreDecisionInput) {
	const taskId = optionalText(input.taskId);
	if (taskId) {
		const row = db
			.prepare<
				[string],
				{ project_id: string }
			>('select project_id from v2_core_tasks where id = ?')
			.get(taskId);
		if (row) {
			return row.project_id;
		}
	}

	const goalId = optionalText(input.goalId);
	if (goalId) {
		const row = db
			.prepare<
				[string],
				{ project_id: string }
			>('select project_id from v2_core_goals where id = ?')
			.get(goalId);
		if (row) {
			return row.project_id;
		}
	}

	throw new Error('Missing projectId. Provide a project, goal, or task for the decision.');
}

export function readV2CoreOverview(db: Database.Database): V2CoreOverview {
	const projects = db
		.prepare<
			[],
			{
				id: string;
				name: string;
				summary: string;
				status: string;
				goal_count: number;
				task_count: number;
				run_count: number;
				artifact_count: number;
				memory_item_count: number;
			}
		>(
			`
				select
					project.id,
					project.name,
					project.summary,
					project.status,
					(select count(*) from v2_core_goals goal where goal.project_id = project.id) as goal_count,
					(select count(*) from v2_core_tasks task where task.project_id = project.id) as task_count,
					(
						select count(*)
						from v2_core_runs run
						join v2_core_tasks task on task.id = run.task_id
						where task.project_id = project.id
					) as run_count,
					(
						select count(*)
						from v2_core_artifacts artifact
						where artifact.project_id = project.id
					) as artifact_count,
					(
						select count(*)
						from v2_core_memory_items memory
						where memory.project_id = project.id
					) as memory_item_count
				from v2_core_projects project
				order by project.name
			`
		)
		.all()
		.map((row) => ({
			id: row.id,
			name: row.name,
			summary: row.summary,
			status: row.status,
			goalCount: row.goal_count,
			taskCount: row.task_count,
			runCount: row.run_count,
			artifactCount: row.artifact_count,
			memoryItemCount: row.memory_item_count
		}));

	return {
		projects,
		taskStatusCounts: groupedCounts(
			db,
			'select status as value, count(*) as count from v2_core_tasks group by status order by status'
		),
		reviewStatusCounts: groupedCounts(
			db,
			'select status as value, count(*) as count from v2_core_reviews group by status order by status'
		),
		memoryStatusCounts: groupedCounts(
			db,
			'select status as value, count(*) as count from v2_core_memory_items group by status order by status'
		)
	};
}

export function readV2CoreTaskDetail(
	db: Database.Database,
	taskId: string
): V2CoreTaskDetail | null {
	const row = db
		.prepare<
			[string],
			{
				task_id: string;
				project_id: string;
				goal_id: string;
				task_title: string;
				task_summary: string;
				success_criteria: string;
				validation_plan: string;
				task_status: string;
				project_name: string;
				goal_title: string;
				goal_status: string;
			}
		>(
			`
				select
					task.id as task_id,
					task.project_id,
					task.goal_id,
					task.title as task_title,
					task.summary as task_summary,
					task.success_criteria,
					task.validation_plan,
					task.status as task_status,
					project.name as project_name,
					goal.title as goal_title,
					goal.status as goal_status
				from v2_core_tasks task
				join v2_core_projects project on project.id = task.project_id
				join v2_core_goals goal on goal.id = task.goal_id
				where task.id = ?
			`
		)
		.get(taskId);

	if (!row) {
		return null;
	}

	const sourceReferences = db
		.prepare<
			[string],
			{
				record_table: string;
				record_id: string;
				source_system: string;
				source_collection: string;
				source_id: string;
				field: string;
				note: string;
			}
		>(
			`
				select record_table, record_id, source_system, source_collection, source_id, field, note
				from v2_core_source_references
				where record_id = ?
				order by record_table, source_system, source_collection, source_id
			`
		)
		.all(taskId)
		.map((source) => ({
			recordTable: source.record_table,
			recordId: source.record_id,
			sourceSystem: source.source_system,
			sourceCollection: source.source_collection,
			sourceId: source.source_id,
			field: source.field,
			note: source.note
		}));
	const sourceTaskReference =
		sourceReferences.find(
			(source) =>
				source.recordTable === 'v2_core_tasks' &&
				source.sourceCollection === 'followup_tasks' &&
				source.field === 'sourceTaskId'
		) ?? null;
	const sourceTask = sourceTaskReference
		? db
				.prepare<[string], { title: string }>('select title from v2_core_tasks where id = ?')
				.get(sourceTaskReference.sourceId)
		: null;
	const followupTaskIds = db
		.prepare<[string], { record_id: string }>(
			`
				select record_id
				from v2_core_source_references
				where record_table = 'v2_core_tasks'
					and source_collection = 'followup_tasks'
					and field = 'sourceTaskId'
					and source_id = ?
				order by record_id
			`
		)
		.all(taskId)
		.map((followup) => followup.record_id);

	return {
		task: {
			id: row.task_id,
			projectId: row.project_id,
			goalId: row.goal_id,
			title: row.task_title,
			summary: row.task_summary,
			successCriteria: row.success_criteria,
			validationPlan: row.validation_plan,
			status: row.task_status
		},
		project: {
			id: row.project_id,
			name: row.project_name
		},
		goal: {
			id: row.goal_id,
			title: row.goal_title,
			status: row.goal_status
		},
		dependencies: db
			.prepare<
				[string],
				{
					id: string;
					task_id: string;
					depends_on_task_id: string;
					depends_on_task_title: string;
					status: string;
					reason: string;
				}
			>(
				`
					select
						dependency.id,
						dependency.task_id,
						dependency.depends_on_task_id,
						depends_on_task.title as depends_on_task_title,
						dependency.status,
						dependency.reason
					from v2_core_task_dependencies dependency
					join v2_core_tasks depends_on_task on depends_on_task.id = dependency.depends_on_task_id
					where dependency.task_id = ?
					order by dependency.id
				`
			)
			.all(taskId)
			.map((dependency) => ({
				id: dependency.id,
				taskId: dependency.task_id,
				dependsOnTaskId: dependency.depends_on_task_id,
				dependsOnTaskTitle: dependency.depends_on_task_title,
				status: dependency.status,
				reason: dependency.reason
			})),
		runs: db
			.prepare<
				[string],
				{
					id: string;
					status: string;
					model_provider_id: string | null;
					model_provider_name: string | null;
					model_provider_kind: string | null;
					result_summary: string;
					validation_summary: string;
					started_at: string | null;
					ended_at: string | null;
				}
			>(
				`
					select
						run.id,
						run.status,
						run.model_provider_id,
						provider.name as model_provider_name,
						provider.kind as model_provider_kind,
						run.result_summary,
						run.validation_summary,
						run.started_at,
						run.ended_at
					from v2_core_runs run
					left join v2_core_model_providers provider on provider.id = run.model_provider_id
					where run.task_id = ?
					order by run.started_at, run.id
				`
			)
			.all(taskId)
			.map((run) => ({
				id: run.id,
				status: run.status,
				modelProviderId: run.model_provider_id,
				modelProviderName: run.model_provider_name,
				modelProviderKind: run.model_provider_kind,
				resultSummary: run.result_summary,
				validationSummary: run.validation_summary,
				startedAt: run.started_at,
				endedAt: run.ended_at
			})),
		toolExecutions: db
			.prepare<
				[string],
				{
					id: string;
					tool_id: string;
					tool_name: string;
					run_id: string | null;
					status: string;
					input_summary: string;
					result_summary: string;
					error_summary: string;
				}
			>(
				`
					select
						execution.id,
						execution.tool_id,
						tool.name as tool_name,
						execution.run_id,
						execution.status,
						execution.input_summary,
						execution.result_summary,
						execution.error_summary
					from v2_core_tool_executions execution
					join v2_core_tools tool on tool.id = execution.tool_id
					where execution.task_id = ?
					order by execution.started_at, execution.id
				`
			)
			.all(taskId)
			.map((execution) => ({
				id: execution.id,
				toolId: execution.tool_id,
				toolName: execution.tool_name,
				runId: execution.run_id,
				status: execution.status,
				inputSummary: execution.input_summary,
				resultSummary: execution.result_summary,
				errorSummary: execution.error_summary
			})),
		artifacts: db
			.prepare<
				[string],
				{
					id: string;
					run_id: string | null;
					uri: string;
					role: string;
					title: string;
					status: string;
				}
			>(
				`
					select id, run_id, uri, role, title, status
					from v2_core_artifacts
					where task_id = ?
					order by id
				`
			)
			.all(taskId)
			.map((artifact) => ({
				id: artifact.id,
				runId: artifact.run_id,
				uri: artifact.uri,
				role: artifact.role,
				title: artifact.title,
				status: artifact.status
			})),
		reviews: db
			.prepare<
				[string],
				{
					id: string;
					run_id: string | null;
					artifact_id: string | null;
					status: string;
					summary: string;
				}
			>(
				`
					select id, run_id, artifact_id, status, summary
					from v2_core_reviews
					where task_id = ?
					order by created_at, id
				`
			)
			.all(taskId)
			.map((review) => ({
				id: review.id,
				runId: review.run_id,
				artifactId: review.artifact_id,
				status: review.status,
				summary: review.summary
			})),
		decisions: db
			.prepare<[string], { id: string; decision_type: string; summary: string; rationale: string }>(
				`
					select id, decision_type, summary, rationale
					from v2_core_decisions
					where task_id = ?
					order by decided_at, id
				`
			)
			.all(taskId)
			.map((decision) => ({
				id: decision.id,
				decisionType: decision.decision_type,
				summary: decision.summary,
				rationale: decision.rationale
			})),
		memoryItems: db
			.prepare<
				[string, string, string, string, string],
				{ id: string; title: string; status: string; scope: string }
			>(
				`
					select memory.id, memory.title, memory.status, memory.scope
					from v2_core_memory_items memory
					join v2_core_memory_item_sources source on source.memory_item_id = memory.id
					where source.source_id = ?
						or source.source_id in (select id from v2_core_runs where task_id = ?)
						or source.source_id in (select id from v2_core_artifacts where task_id = ?)
						or source.source_id in (select id from v2_core_reviews where task_id = ?)
						or source.source_id in (select id from v2_core_decisions where task_id = ?)
					order by memory.created_at, memory.id
				`
			)
			.all(taskId, taskId, taskId, taskId, taskId)
			.map((memory) => ({
				id: memory.id,
				title: memory.title,
				status: memory.status,
				scope: memory.scope
			})),
		lineage: {
			sourceTaskId: sourceTaskReference?.sourceId ?? null,
			sourceTaskTitle: sourceTask?.title ?? null,
			sourceReason: sourceTaskReference?.note ?? null,
			followupTaskIds
		},
		sourceReferences
	};
}

function readV2CoreProject(db: Database.Database, projectId: string) {
	return db
		.prepare<
			[string],
			{ id: string; name: string; summary: string; status: string; workspace_root: string }
		>('select id, name, summary, status, workspace_root from v2_core_projects where id = ?')
		.get(projectId);
}

function readV2CoreGoal(db: Database.Database, goalId: string) {
	return db
		.prepare<
			[string],
			{
				id: string;
				project_id: string;
				parent_goal_id: string | null;
				title: string;
				summary: string;
				success_criteria: string;
				status: string;
			}
		>(
			`
				select id, project_id, parent_goal_id, title, summary, success_criteria, status
				from v2_core_goals
				where id = ?
			`
		)
		.get(goalId);
}

function readV2CoreDecision(db: Database.Database, decisionId: string) {
	return db
		.prepare<
			[string],
			{ id: string; project_id: string; decision_type: string; summary: string; rationale: string }
		>(
			`
				select id, project_id, decision_type, summary, rationale
				from v2_core_decisions
				where id = ?
			`
		)
		.get(decisionId);
}

function readV2CoreMemoryItem(db: Database.Database, memoryId: string) {
	return db
		.prepare<
			[string],
			{ id: string; project_id: string; title: string; body: string; scope: string; status: string }
		>(
			`
				select id, project_id, title, body, scope, status
				from v2_core_memory_items
				where id = ?
			`
		)
		.get(memoryId);
}

function readV2CoreEvaluationScenario(
	db: Database.Database,
	scenarioId: string
): V2CoreEvaluationScenario | null {
	const row = db
		.prepare<
			[string],
			{
				id: string;
				project_id: string | null;
				title: string;
				capability_name: string;
				prompt_or_task: string;
				rubric: string;
				status: string;
				version: string;
			}
		>(
			`
				select id, project_id, title, capability_name, prompt_or_task, rubric, status, version
				from v2_core_evaluation_scenarios
				where id = ?
			`
		)
		.get(scenarioId);

	if (!row) {
		return null;
	}

	return {
		id: row.id,
		projectId: row.project_id,
		title: row.title,
		capabilityName: row.capability_name,
		promptOrTask: row.prompt_or_task,
		rubric: row.rubric,
		status: row.status,
		version: row.version,
		sourceReferences: sourceReferencesFor(db, 'v2_core_evaluation_scenarios', row.id)
	};
}

function readV2CoreEvaluationResult(
	db: Database.Database,
	resultId: string
): V2CoreEvaluationResult | null {
	const row = db
		.prepare<
			[string],
			{
				id: string;
				scenario_id: string;
				scenario_title: string;
				task_id: string;
				run_id: string | null;
				tool_execution_id: string | null;
				provider_id: string | null;
				model_id: string | null;
				status: string;
				score: number | null;
				rubric_summary: string;
				result_summary: string;
				failure_summary: string;
				created_at: string;
			}
		>(
			`
				select
					result.id,
					result.scenario_id,
					scenario.title as scenario_title,
					result.task_id,
					result.run_id,
					result.tool_execution_id,
					result.provider_id,
					result.model_id,
					result.status,
					result.score,
					result.rubric_summary,
					result.result_summary,
					result.failure_summary,
					result.created_at
				from v2_core_evaluation_results result
				join v2_core_evaluation_scenarios scenario on scenario.id = result.scenario_id
				where result.id = ?
			`
		)
		.get(resultId);

	if (!row) {
		return null;
	}

	return {
		id: row.id,
		scenarioId: row.scenario_id,
		scenarioTitle: row.scenario_title,
		taskId: row.task_id,
		runId: row.run_id,
		toolExecutionId: row.tool_execution_id,
		providerId: row.provider_id,
		modelId: row.model_id,
		status: row.status,
		score: row.score,
		rubricSummary: row.rubric_summary,
		resultSummary: row.result_summary,
		failureSummary: row.failure_summary,
		createdAt: row.created_at,
		sourceReferences: sourceReferencesFor(db, 'v2_core_evaluation_results', row.id)
	};
}

function readV2CoreModelProvider(db: Database.Database, providerId: string) {
	return db
		.prepare<
			[string],
			{ id: string; name: string; kind: string; status: string }
		>('select id, name, kind, status from v2_core_model_providers where id = ?')
		.get(providerId);
}

function readV2CoreTool(db: Database.Database, toolId: string) {
	return db
		.prepare<
			[string],
			{
				id: string;
				name: string;
				description: string;
				kind: string;
				risk_level: string;
				approval_requirement: string;
				status: string;
			}
		>(
			`
				select id, name, description, kind, risk_level, approval_requirement, status
				from v2_core_tools
				where id = ?
			`
		)
		.get(toolId);
}
