import type { Approval, Decision, Goal, Project, Review, Run, Task } from '../types/control-plane';

export type V2ImportSourceRef = {
	system: 'ams-v1';
	collection: string;
	id: string;
};

export type V2ProjectDraft = {
	id: string;
	source: V2ImportSourceRef;
	name: string;
	summary: string;
	rootPaths: string[];
	memorySources: {
		projectBrief: string;
		currentStateMemo: string;
		decisionLog: string;
		constraints: string;
		nonGoals: string;
	};
	defaults: {
		autonomyLevel: Project['defaultAutonomyLevel'];
		riskThreshold: Project['defaultRiskThreshold'];
		reviewRequirement: Project['defaultReviewRequirement'];
		rigorProfile: Project['defaultRigorProfile'];
		validationCommands: string[];
	};
};

export type V2GoalDraft = {
	id: string;
	source: V2ImportSourceRef;
	projectId: string;
	parentGoalId: string | null;
	title: string;
	summary: string;
	successCriteria: string;
	status: Goal['status'];
	priority: number;
	targetDate: string | null;
};

export type V2TaskDraft = {
	id: string;
	source: V2ImportSourceRef;
	projectId: string;
	goalId: string;
	parentTaskId: string | null;
	title: string;
	summary: string;
	scope: string;
	nonGoals: string;
	successCriteria: string;
	readyCondition: string;
	expectedOutcome: string;
	validationPlan: string;
	status: Task['status'];
	priority: Task['priority'];
	riskLevel: Task['riskLevel'];
	readinessLevel: Task['readinessLevel'] | null;
	autonomyLevel: Task['autonomyLevel'] | null;
	reviewRequirement: Task['reviewRequirement'] | null;
	approvalMode: Task['approvalMode'];
	candidateCapabilityNames: string[];
	candidateToolNames: string[];
	candidateSkillNames: string[];
	artifactSourceCount: number;
};

export type V2TaskDependencyDraft = {
	id: string;
	source: V2ImportSourceRef;
	taskId: string;
	dependsOnTaskId: string;
	status: 'resolved' | 'unresolved';
	reason: string;
};

export type V2WorkSessionCandidateDraft = {
	id: string;
	source: V2ImportSourceRef;
	projectId: string;
	providerId: string | null;
	externalThreadId: string;
	taskIds: string[];
	runIds: string[];
};

export type V2RunDraft = {
	id: string;
	source: V2ImportSourceRef;
	taskId: string;
	workSessionId: string | null;
	providerId: string | null;
	executionSurfaceId: string | null;
	status: Run['status'];
	startedAt: string | null;
	endedAt: string | null;
	inputSummary: string;
	actionSummary: string;
	resultSummary: string;
	validationSummary: string;
	blockerSummary: string;
	model: {
		modelUsed: string | null;
		modelSource: Run['modelSource'] | null;
		observedModelUsed: string | null;
		modelMismatchSummary: string | null;
	};
	usage: {
		inputTokens: number | null;
		cachedInputTokens: number | null;
		outputTokens: number | null;
		uncachedInputTokens: number | null;
		estimatedCostUsd: number | null;
		usageSource: Run['usageSource'] | null;
		costSource: Run['costSource'] | null;
	};
	artifactPathCount: number;
};

export type V2ReviewDraft = {
	id: string;
	source: V2ImportSourceRef;
	taskId: string;
	runId: string | null;
	status: Review['status'];
	summary: string;
	createdAt: string;
	resolvedAt: string | null;
};

export type V2ApprovalDraft = {
	id: string;
	source: V2ImportSourceRef;
	taskId: string;
	runId: string | null;
	mode: Approval['mode'];
	status: Approval['status'];
	summary: string;
	createdAt: string;
	resolvedAt: string | null;
};

export type V2DecisionDraft = {
	id: string;
	source: V2ImportSourceRef;
	taskId: string | null;
	goalId: string | null;
	runId: string | null;
	reviewId: string | null;
	approvalId: string | null;
	decisionType: Decision['decisionType'];
	summary: string;
	createdAt: string;
};

export type V2ArtifactCandidateDraft = {
	id: string;
	source: V2ImportSourceRef;
	projectId: string;
	taskId: string | null;
	runId: string | null;
	uri: string;
	role:
		| 'project_root'
		| 'goal_artifact_path'
		| 'task_artifact_path'
		| 'task_attachment'
		| 'run_artifact_path';
	title: string;
	contentType: string | null;
	sizeBytes: number | null;
	exists: boolean | null;
	sourceReferenceCount: number;
	sourceReferences: Array<{
		collection: string;
		id: string;
		field: string;
	}>;
};

export type V1ArtifactPathCheck = {
	sourceType: string;
	sourceId: string;
	parentId?: string;
	field: string;
	path: string;
	exists: boolean;
};

export type V2ImportMapperInput = {
	projects: Project[];
	goals: Goal[];
	tasks: Task[];
	runs?: Run[];
	reviews?: Review[];
	approvals?: Approval[];
	decisions?: Decision[];
	artifactPathChecks?: V1ArtifactPathCheck[];
};

export type V2ImportDraft = {
	projects: V2ProjectDraft[];
	goals: V2GoalDraft[];
	tasks: V2TaskDraft[];
	taskDependencies: V2TaskDependencyDraft[];
	workSessions: V2WorkSessionCandidateDraft[];
	runs: V2RunDraft[];
	reviews: V2ReviewDraft[];
	approvals: V2ApprovalDraft[];
	decisions: V2DecisionDraft[];
	artifactCandidates: V2ArtifactCandidateDraft[];
	unresolvedReferences: V2TaskDependencyDraft[];
};

function source(collection: string, id: string): V2ImportSourceRef {
	return {
		system: 'ams-v1',
		collection,
		id
	};
}

function compactPaths(paths: Array<string | null | undefined>) {
	return [...new Set(paths.map((path) => path?.trim() ?? '').filter(Boolean))];
}

function requiredArray<T>(value: T[] | undefined): T[] {
	return Array.isArray(value) ? value : [];
}

function nullableText(value: string | null | undefined) {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function countTaskArtifactSources(task: Task) {
	const artifactPathCount = task.artifactPath.trim() ? 1 : 0;
	return artifactPathCount + requiredArray(task.attachments).length;
}

export function mapV1ProjectToV2Draft(project: Project): V2ProjectDraft {
	return {
		id: project.id,
		source: source('projects', project.id),
		name: project.name,
		summary: project.summary,
		rootPaths: compactPaths([
			project.projectRootFolder,
			project.defaultArtifactRoot,
			project.defaultRepoPath,
			...(project.additionalWritableRoots ?? [])
		]),
		memorySources: {
			projectBrief: project.projectBrief ?? '',
			currentStateMemo: project.currentStateMemo ?? '',
			decisionLog: project.decisionLog ?? '',
			constraints: project.constraints ?? '',
			nonGoals: project.nonGoals ?? ''
		},
		defaults: {
			autonomyLevel: project.defaultAutonomyLevel,
			riskThreshold: project.defaultRiskThreshold,
			reviewRequirement: project.defaultReviewRequirement,
			rigorProfile: project.defaultRigorProfile ?? null,
			validationCommands: project.validationCommands ?? []
		}
	};
}

export function mapV1GoalToV2Draft(goal: Goal, projectId: string): V2GoalDraft {
	return {
		id: goal.id,
		source: source('goals', goal.id),
		projectId,
		parentGoalId: goal.parentGoalId ?? null,
		title: goal.name,
		summary: goal.summary,
		successCriteria: goal.successSignal ?? '',
		status: goal.status,
		priority: goal.planningPriority ?? 0,
		targetDate: goal.targetDate ?? null
	};
}

export function mapV1TaskToV2Draft(task: Task): V2TaskDraft {
	return {
		id: task.id,
		source: source('tasks', task.id),
		projectId: task.projectId,
		goalId: task.goalId,
		parentTaskId: task.parentTaskId ?? null,
		title: task.title,
		summary: task.summary,
		scope: task.scope ?? '',
		nonGoals: task.nonGoals ?? '',
		successCriteria: task.successCriteria ?? '',
		readyCondition: task.readyCondition ?? '',
		expectedOutcome: task.expectedOutcome ?? '',
		validationPlan: task.validationSteps ?? '',
		status: task.status,
		priority: task.priority,
		riskLevel: task.riskLevel,
		readinessLevel: task.readinessLevel ?? null,
		autonomyLevel: task.autonomyLevel ?? null,
		reviewRequirement: task.reviewRequirement ?? null,
		approvalMode: task.approvalMode,
		candidateCapabilityNames: task.requiredCapabilityNames ?? [],
		candidateToolNames: task.requiredToolNames ?? [],
		candidateSkillNames: task.requiredPromptSkillNames ?? [],
		artifactSourceCount: countTaskArtifactSources(task)
	};
}

export function mapV1TaskDependenciesToV2Drafts(tasks: Task[]): V2TaskDependencyDraft[] {
	const taskIds = new Set(tasks.map((task) => task.id));

	return tasks.flatMap((task) =>
		task.dependencyTaskIds.map((dependencyTaskId) => {
			const status = taskIds.has(dependencyTaskId) ? 'resolved' : 'unresolved';

			return {
				id: `${task.id}__depends_on__${dependencyTaskId}`,
				source: source('tasks.dependencyTaskIds', task.id),
				taskId: task.id,
				dependsOnTaskId: dependencyTaskId,
				status,
				reason:
					status === 'resolved'
						? 'Dependency task is present in the selected import slice.'
						: 'Dependency task is not present in the selected import slice.'
			};
		})
	);
}

export function mapV1RunsToV2Drafts(runs: Run[]): V2RunDraft[] {
	return runs.map((run) => ({
		id: run.id,
		source: source('runs', run.id),
		taskId: run.taskId,
		workSessionId: nullableText(run.agentThreadId) ?? nullableText(run.threadId),
		providerId: run.providerId,
		executionSurfaceId: run.executionSurfaceId,
		status: run.status,
		startedAt: run.startedAt,
		endedAt: run.endedAt,
		inputSummary: run.contextSummary ?? '',
		actionSummary: run.actionsTaken ?? '',
		resultSummary: run.resultSummary ?? run.summary,
		validationSummary: run.validationSummary ?? '',
		blockerSummary: requiredArray(run.blockersFound).join('\n'),
		model: {
			modelUsed: run.modelUsed ?? null,
			modelSource: run.modelSource ?? null,
			observedModelUsed: run.observedModelUsed ?? null,
			modelMismatchSummary: run.modelMismatchSummary ?? null
		},
		usage: {
			inputTokens: run.inputTokens ?? null,
			cachedInputTokens: run.cachedInputTokens ?? null,
			outputTokens: run.outputTokens ?? null,
			uncachedInputTokens: run.uncachedInputTokens ?? null,
			estimatedCostUsd: run.estimatedCostUsd ?? null,
			usageSource: run.usageSource ?? null,
			costSource: run.costSource ?? null
		},
		artifactPathCount: requiredArray(run.artifactPaths).length
	}));
}

export function mapV1WorkSessionsToV2Drafts(input: {
	projectId: string;
	tasks: Task[];
	runs: Run[];
}): V2WorkSessionCandidateDraft[] {
	const sessionMap = new Map<string, V2WorkSessionCandidateDraft>();

	function ensureSession(id: string, sourceCollection: string, sourceId: string) {
		const existing = sessionMap.get(id);
		if (existing) {
			return existing;
		}

		const created: V2WorkSessionCandidateDraft = {
			id,
			source: source(sourceCollection, sourceId),
			projectId: input.projectId,
			providerId: null,
			externalThreadId: id,
			taskIds: [],
			runIds: []
		};
		sessionMap.set(id, created);
		return created;
	}

	for (const task of input.tasks) {
		const sessionId = nullableText(task.agentThreadId);
		if (!sessionId) {
			continue;
		}

		const session = ensureSession(sessionId, 'tasks.agentThreadId', task.id);
		if (!session.taskIds.includes(task.id)) {
			session.taskIds.push(task.id);
		}
	}

	for (const run of input.runs) {
		const sessionIds = [
			{ id: nullableText(run.agentThreadId), sourceCollection: 'runs.agentThreadId' },
			{ id: nullableText(run.threadId), sourceCollection: 'runs.threadId' }
		].filter((entry): entry is { id: string; sourceCollection: string } => Boolean(entry.id));

		for (const entry of sessionIds) {
			const session = ensureSession(entry.id, entry.sourceCollection, run.id);
			session.providerId ??= run.providerId;
			if (!session.runIds.includes(run.id)) {
				session.runIds.push(run.id);
			}
		}
	}

	return [...sessionMap.values()];
}

export function mapV1ReviewsToV2Drafts(reviews: Review[]): V2ReviewDraft[] {
	return reviews.map((review) => ({
		id: review.id,
		source: source('reviews', review.id),
		taskId: review.taskId,
		runId: review.runId,
		status: review.status,
		summary: review.summary,
		createdAt: review.createdAt,
		resolvedAt: review.resolvedAt
	}));
}

export function mapV1ApprovalsToV2Drafts(approvals: Approval[]): V2ApprovalDraft[] {
	return approvals.map((approval) => ({
		id: approval.id,
		source: source('approvals', approval.id),
		taskId: approval.taskId,
		runId: approval.runId,
		mode: approval.mode,
		status: approval.status,
		summary: approval.summary,
		createdAt: approval.createdAt,
		resolvedAt: approval.resolvedAt
	}));
}

export function mapV1DecisionsToV2Drafts(decisions: Decision[]): V2DecisionDraft[] {
	return decisions.map((decision) => ({
		id: decision.id,
		source: source('decisions', decision.id),
		taskId: decision.taskId,
		goalId: decision.goalId,
		runId: decision.runId,
		reviewId: decision.reviewId,
		approvalId: decision.approvalId,
		decisionType: decision.decisionType,
		summary: decision.summary,
		createdAt: decision.createdAt
	}));
}

function artifactRoleForCheck(check: V1ArtifactPathCheck): V2ArtifactCandidateDraft['role'] {
	if (check.sourceType === 'Project') {
		return 'project_root';
	}

	if (check.sourceType === 'Goal') {
		return 'goal_artifact_path';
	}

	if (check.sourceType === 'TaskAttachment') {
		return 'task_attachment';
	}

	if (check.sourceType === 'Run') {
		return 'run_artifact_path';
	}

	return 'task_artifact_path';
}

function artifactCollectionForCheck(check: V1ArtifactPathCheck) {
	switch (check.sourceType) {
		case 'Project':
			return 'projects';
		case 'Goal':
			return 'goals';
		case 'TaskAttachment':
			return 'tasks.attachments';
		case 'Run':
			return 'runs';
		case 'Task':
		default:
			return 'tasks';
	}
}

export function mapV1ArtifactCandidatesToV2Drafts(input: {
	projectId: string;
	tasks: Task[];
	runs: Run[];
	artifactPathChecks: V1ArtifactPathCheck[];
}): V2ArtifactCandidateDraft[] {
	const taskIds = new Set(input.tasks.map((task) => task.id));
	const runTaskByRunId = new Map(input.runs.map((run) => [run.id, run.taskId]));
	const candidatesByPath = new Map<string, V2ArtifactCandidateDraft>();

	for (const check of input.artifactPathChecks) {
		const existing = candidatesByPath.get(check.path);
		const collection = artifactCollectionForCheck(check);
		const sourceReference = {
			collection,
			id: check.parentId ?? check.sourceId,
			field: check.field
		};

		if (existing) {
			existing.sourceReferenceCount += 1;
			existing.sourceReferences.push(sourceReference);
			existing.exists = existing.exists ?? check.exists;
			continue;
		}

		const runId = check.sourceType === 'Run' ? check.sourceId : null;
		const taskId =
			check.sourceType === 'Task' || check.sourceType === 'TaskAttachment'
				? (check.parentId ?? check.sourceId)
				: runId
					? (runTaskByRunId.get(runId) ?? null)
					: null;

		candidatesByPath.set(check.path, {
			id: `artifact_${candidatesByPath.size + 1}`,
			source: source(collection, check.parentId ?? check.sourceId),
			projectId: input.projectId,
			taskId: taskId && taskIds.has(taskId) ? taskId : null,
			runId,
			uri: check.path,
			role: artifactRoleForCheck(check),
			title: check.path.split('/').at(-1) ?? check.path,
			contentType: null,
			sizeBytes: null,
			exists: check.exists,
			sourceReferenceCount: 1,
			sourceReferences: [sourceReference]
		});
	}

	return [...candidatesByPath.values()];
}

export function mapV1SliceToV2Draft(input: V2ImportMapperInput): V2ImportDraft {
	const selectedProject = input.projects[0] ?? null;
	const selectedProjectId = selectedProject?.id ?? '';
	const runs = input.runs ?? [];
	const reviews = input.reviews ?? [];
	const approvals = input.approvals ?? [];
	const decisions = input.decisions ?? [];
	const artifactPathChecks = input.artifactPathChecks ?? [];
	const taskDependencies = mapV1TaskDependenciesToV2Drafts(input.tasks);

	return {
		projects: input.projects.map(mapV1ProjectToV2Draft),
		goals: input.goals.map((goal) => mapV1GoalToV2Draft(goal, selectedProjectId)),
		tasks: input.tasks.map(mapV1TaskToV2Draft),
		taskDependencies,
		workSessions: mapV1WorkSessionsToV2Drafts({
			projectId: selectedProjectId,
			tasks: input.tasks,
			runs
		}),
		runs: mapV1RunsToV2Drafts(runs),
		reviews: mapV1ReviewsToV2Drafts(reviews),
		approvals: mapV1ApprovalsToV2Drafts(approvals),
		decisions: mapV1DecisionsToV2Drafts(decisions),
		artifactCandidates: mapV1ArtifactCandidatesToV2Drafts({
			projectId: selectedProjectId,
			tasks: input.tasks,
			runs,
			artifactPathChecks
		}),
		unresolvedReferences: taskDependencies.filter(
			(dependency) => dependency.status === 'unresolved'
		)
	};
}
