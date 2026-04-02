import type { AgentSessionDetail } from '$lib/types/agent-session';
import type { ControlPlaneData, Provider, Worker } from '$lib/types/control-plane';
import type {
	OntologyActor,
	OntologyApproval,
	OntologyArtifact,
	OntologyCapability,
	OntologyContextResource,
	OntologyDecision,
	OntologyExecutionSurface,
	OntologyGapSummary,
	OntologyGoal,
	OntologyPlanningSession,
	OntologyProject,
	OntologyReview,
	OntologyRole,
	OntologyTask,
	OntologyThread,
	OntologyTool,
	OntologyV1Snapshot,
	OntologyWorkAttempt
} from '$lib/types/ontology';

function toActorIdFromWorkerId(workerId: string) {
	return `actor_${workerId}`;
}

function slugify(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function uniqueStrings(values: Array<string | null | undefined>) {
	return [...new Set(values.map((value) => value?.trim() ?? '').filter(Boolean))];
}

function toolNamesForProvider(provider: Provider) {
	return uniqueStrings([provider.launcher]);
}

function capabilityNamesForWorker(worker: Worker, provider: Provider | null) {
	return uniqueStrings([...(worker.skills ?? []), ...(provider?.capabilities ?? [])]);
}

export function summarizeOntologyV1Gaps(
	snapshot: Omit<OntologyV1Snapshot, 'gaps'>
): OntologyGapSummary {
	return {
		goalCount: snapshot.goals.length,
		taskCount: snapshot.tasks.length,
		workAttemptCount: snapshot.workAttempts.length,
		threadCount: snapshot.threads.length,
		actorCount: snapshot.actors.length,
		humanActorCount: snapshot.actors.filter((actor) => actor.kind === 'human').length,
		planningSessionCount: snapshot.planningSessions.length,
		decisionCount: snapshot.decisions.length,
		goalsWithoutTasksCount: snapshot.goals.filter((goal) => goal.taskIds.length === 0).length,
		tasksWithoutGoalCount: snapshot.tasks.filter((task) => !task.goalId).length,
		tasksWithoutAssignedActorCount: snapshot.tasks.filter((task) => !task.assignedActorId).length,
		tasksWithoutPrimaryThreadCount: snapshot.tasks.filter((task) => !task.primaryThreadId).length,
		tasksWithoutContextCount: snapshot.tasks.filter((task) => task.contextResourceIds.length === 0)
			.length,
		tasksWithoutCapabilityRequirementsCount: snapshot.tasks.filter(
			(task) => task.requiredCapabilityNames.length === 0
		).length,
		workAttemptsWithoutThreadCount: snapshot.workAttempts.filter((attempt) => !attempt.threadId)
			.length
	};
}

export function buildOntologyV1Snapshot(input: {
	data: ControlPlaneData;
	sessions?: AgentSessionDetail[];
}): OntologyV1Snapshot {
	const { data } = input;
	const sessions = input.sessions ?? [];
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));

	const roles: OntologyRole[] = data.roles.map((role) => ({
		id: role.id,
		name: role.name,
		description: role.description,
		lane: role.lane
	}));

	const actors: OntologyActor[] = data.workers.map((worker) => {
		const provider = providerMap.get(worker.providerId) ?? null;

		return {
			id: toActorIdFromWorkerId(worker.id),
			name: worker.name,
			kind: 'ai',
			roleIds: worker.roleId ? [worker.roleId] : [],
			capabilityNames: capabilityNamesForWorker(worker, provider),
			executionSurfaceIds: [worker.id]
		};
	});

	const executionSurfaces: OntologyExecutionSurface[] = data.workers.map((worker) => {
		const provider = providerMap.get(worker.providerId) ?? null;

		return {
			id: worker.id,
			name: worker.name,
			status: worker.status,
			providerId: worker.providerId || null,
			roleIds: worker.roleId ? [worker.roleId] : [],
			capabilityNames: capabilityNamesForWorker(worker, provider),
			toolNames: provider ? toolNamesForProvider(provider) : [],
			sandbox: worker.threadSandboxOverride ?? provider?.defaultThreadSandbox ?? null
		};
	});

	const capabilityMap = new Map<string, OntologyCapability>();

	for (const worker of data.workers) {
		for (const skill of worker.skills ?? []) {
			const name = skill.trim();
			if (!name) {
				continue;
			}

			const id = `capability_${slugify(name)}`;
			capabilityMap.set(id, {
				id,
				name,
				source: 'worker_skill'
			});
		}
	}

	for (const provider of data.providers) {
		for (const capability of provider.capabilities) {
			const name = capability.trim();
			if (!name) {
				continue;
			}

			const id = `capability_${slugify(name)}`;
			capabilityMap.set(id, {
				id,
				name,
				source: 'provider_capability'
			});
		}
	}

	const toolMap = new Map<string, OntologyTool>();

	for (const provider of data.providers) {
		for (const toolName of toolNamesForProvider(provider)) {
			const id = `tool_${slugify(toolName)}`;
			toolMap.set(id, {
				id,
				name: toolName,
				source: 'provider_launcher'
			});
		}
	}

	const projects: OntologyProject[] = data.projects.map((project) => ({
		id: project.id,
		name: project.name,
		summary: project.summary,
		projectRootFolder: project.projectRootFolder,
		defaultArtifactRoot: project.defaultArtifactRoot,
		defaultRepoPath: project.defaultRepoPath,
		defaultRepoUrl: project.defaultRepoUrl,
		defaultBranch: project.defaultBranch
	}));

	const contextResources: OntologyContextResource[] = [];
	const contextIdsByTask = new Map<string, string[]>();
	const contextIdsByThread = new Map<string, string[]>();

	for (const task of data.tasks) {
		const taskContextIds: string[] = [];

		for (const attachment of task.attachments) {
			const id = `context_task_attachment_${attachment.id}`;
			contextResources.push({
				id,
				name: attachment.name,
				path: attachment.path,
				contentType: attachment.contentType,
				source: 'task_attachment',
				taskId: task.id,
				threadId: null
			});
			taskContextIds.push(id);
		}

		contextIdsByTask.set(task.id, taskContextIds);
	}

	for (const session of sessions) {
		const threadContextIds: string[] = [];

		for (const attachment of session.attachments ?? []) {
			const id = `context_thread_attachment_${attachment.id}`;
			contextResources.push({
				id,
				name: attachment.name,
				path: attachment.path,
				contentType: attachment.contentType,
				source: 'thread_attachment',
				taskId: null,
				threadId: session.id
			});
			threadContextIds.push(id);
		}

		contextIdsByThread.set(session.id, threadContextIds);
	}

	const artifacts: OntologyArtifact[] = [];
	const artifactIdsByRun = new Map<string, string[]>();
	const artifactIdsByTask = new Map<string, string[]>();

	for (const run of data.runs) {
		const runArtifactIds: string[] = [];

		for (const [index, path] of run.artifactPaths.entries()) {
			const id = `artifact_${run.id}_${index}`;
			artifacts.push({
				id,
				path,
				source: 'run_artifact_path',
				producedByWorkAttemptId: run.id,
				taskId: run.taskId,
				threadId: run.sessionId
			});
			runArtifactIds.push(id);
		}

		artifactIdsByRun.set(run.id, runArtifactIds);
		artifactIdsByTask.set(run.taskId, [
			...(artifactIdsByTask.get(run.taskId) ?? []),
			...runArtifactIds
		]);
	}

	const workAttempts: OntologyWorkAttempt[] = data.runs.map(
		(run): OntologyWorkAttempt => ({
			id: run.id,
			kind: 'run',
			taskId: run.taskId || null,
			performedByActorId: run.workerId ? toActorIdFromWorkerId(run.workerId) : null,
			executionSurfaceId: run.workerId,
			providerId: run.providerId,
			threadId: run.sessionId,
			status: run.status,
			startedAt: run.startedAt,
			endedAt: run.endedAt,
			summary: run.summary,
			errorSummary: run.errorSummary || null,
			artifactIds: artifactIdsByRun.get(run.id) ?? []
		})
	);

	const workAttemptIdsByTask = new Map<string, string[]>();
	const workAttemptIdsByThread = new Map<string, string[]>();

	for (const workAttempt of workAttempts) {
		if (workAttempt.taskId) {
			workAttemptIdsByTask.set(workAttempt.taskId, [
				...(workAttemptIdsByTask.get(workAttempt.taskId) ?? []),
				workAttempt.id
			]);
		}

		if (workAttempt.threadId) {
			workAttemptIdsByThread.set(workAttempt.threadId, [
				...(workAttemptIdsByThread.get(workAttempt.threadId) ?? []),
				workAttempt.id
			]);
		}
	}

	const sessionTaskIds = new Map<string, Set<string>>();

	for (const task of data.tasks) {
		if (!task.threadSessionId) {
			continue;
		}

		const taskIds = sessionTaskIds.get(task.threadSessionId) ?? new Set<string>();
		taskIds.add(task.id);
		sessionTaskIds.set(task.threadSessionId, taskIds);
	}

	for (const session of sessions) {
		const taskIds = sessionTaskIds.get(session.id) ?? new Set<string>();

		for (const relatedTask of session.relatedTasks ?? []) {
			taskIds.add(relatedTask.id);
		}

		sessionTaskIds.set(session.id, taskIds);
	}

	const threads: OntologyThread[] = sessions.map(
		(session): OntologyThread => ({
			id: session.id,
			name: session.name,
			externalThreadId: session.threadId,
			state: session.sessionState,
			sandbox: session.sandbox,
			sessionSummary: session.sessionSummary,
			taskIds: [...(sessionTaskIds.get(session.id) ?? new Set<string>())],
			workAttemptIds: workAttemptIdsByThread.get(session.id) ?? [],
			contextResourceIds: contextIdsByThread.get(session.id) ?? []
		})
	);

	const goals: OntologyGoal[] = data.goals.map((goal) => {
		const taskIds = data.tasks.filter((task) => task.goalId === goal.id).map((task) => task.id);
		const subgoalIds = data.goals
			.filter((candidate) => candidate.parentGoalId === goal.id)
			.map((candidate) => candidate.id);

		return {
			id: goal.id,
			name: goal.name,
			summary: goal.summary,
			status: goal.status,
			targetDate: goal.targetDate ?? null,
			parentGoalId: goal.parentGoalId ?? null,
			projectIds: goal.projectIds ?? [],
			taskIds,
			subgoalIds,
			successSignal: goal.successSignal ?? null
		};
	});

	const tasks: OntologyTask[] = data.tasks.map((task) => ({
		id: task.id,
		title: task.title,
		summary: task.summary,
		status: task.status,
		priority: task.priority,
		riskLevel: task.riskLevel,
		approvalMode: task.approvalMode,
		projectId: task.projectId || null,
		goalId: task.goalId || null,
		dependencyTaskIds: task.dependencyTaskIds,
		desiredRoleId: task.desiredRoleId || null,
		assignedActorId: task.assigneeWorkerId ? toActorIdFromWorkerId(task.assigneeWorkerId) : null,
		primaryThreadId: task.threadSessionId,
		workAttemptIds: workAttemptIdsByTask.get(task.id) ?? [],
		contextResourceIds: contextIdsByTask.get(task.id) ?? [],
		artifactIds: artifactIdsByTask.get(task.id) ?? [],
		requiredCapabilityNames: task.requiredCapabilityNames ?? [],
		requiredToolNames: task.requiredToolNames ?? [],
		targetDate: task.targetDate ?? null,
		estimateHours: task.estimateHours ?? null,
		blockedReason: task.blockedReason || null
	}));

	const reviews: OntologyReview[] = data.reviews.map((review) => ({
		id: review.id,
		taskId: review.taskId,
		workAttemptId: review.runId,
		status: review.status,
		reviewerActorId: review.reviewerWorkerId
			? toActorIdFromWorkerId(review.reviewerWorkerId)
			: null,
		summary: review.summary
	}));

	const approvals: OntologyApproval[] = data.approvals.map((approval) => ({
		id: approval.id,
		taskId: approval.taskId,
		workAttemptId: approval.runId,
		status: approval.status,
		mode: approval.mode,
		approverActorId: approval.approverWorkerId
			? toActorIdFromWorkerId(approval.approverWorkerId)
			: null,
		summary: approval.summary
	}));

	const decisions: OntologyDecision[] = (data.decisions ?? []).map((decision) => ({
		id: decision.id,
		planningSessionId: decision.planningSessionId,
		taskId: decision.taskId,
		goalId: decision.goalId,
		decisionType: decision.decisionType,
		summary: decision.summary
	}));
	const planningSessions: OntologyPlanningSession[] = (data.planningSessions ?? []).map(
		(session) => ({
			id: session.id,
			windowStart: session.windowStart,
			windowEnd: session.windowEnd,
			goalIds: session.goalIds,
			taskIds: session.taskIds,
			decisionIds: session.decisionIds
		})
	);

	const limitations = [
		'Current workers act mostly as execution surfaces; the broader Actor concept is still only approximated.',
		'Runs are mapped as WorkAttempt instances, but human work attempts are not yet represented.'
	];

	const snapshotWithoutGaps: Omit<OntologyV1Snapshot, 'gaps'> = {
		goals,
		tasks,
		workAttempts,
		threads,
		artifacts,
		contextResources,
		actors,
		executionSurfaces,
		roles,
		capabilities: [...capabilityMap.values()].sort((left, right) =>
			left.name.localeCompare(right.name)
		),
		tools: [...toolMap.values()].sort((left, right) => left.name.localeCompare(right.name)),
		projects,
		reviews,
		approvals,
		planningSessions,
		decisions,
		limitations
	};

	return {
		...snapshotWithoutGaps,
		gaps: summarizeOntologyV1Gaps(snapshotWithoutGaps)
	};
}
