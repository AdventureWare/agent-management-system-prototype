import type { V2ImportDraft } from './v2-import-mapper.ts';

export type V2ImportDraftValidationIssue = {
	code: string;
	message: string;
	recordType?: string;
	recordId?: string;
};

export type V2ImportDraftValidationResult = {
	valid: boolean;
	issues: V2ImportDraftValidationIssue[];
	counts: Record<string, number>;
};

function issue(input: V2ImportDraftValidationIssue): V2ImportDraftValidationIssue {
	return input;
}

function hasSource(record: { source?: unknown }): boolean {
	const source = record.source as
		| { system?: unknown; collection?: unknown; id?: unknown }
		| undefined;

	return (
		source?.system === 'ams-v1' &&
		typeof source.collection === 'string' &&
		source.collection.trim().length > 0 &&
		typeof source.id === 'string' &&
		source.id.trim().length > 0
	);
}

function addSourceIssues(
	issues: V2ImportDraftValidationIssue[],
	recordType: string,
	records: Array<{ id: string; source?: unknown }>
) {
	for (const record of records) {
		if (!hasSource(record)) {
			issues.push(
				issue({
					code: 'missing_source_reference',
					message: `${recordType} ${record.id} is missing an AMS v1 source reference.`,
					recordType,
					recordId: record.id
				})
			);
		}
	}
}

export function validateV2ImportDraft(draft: V2ImportDraft): V2ImportDraftValidationResult {
	const issues: V2ImportDraftValidationIssue[] = [];
	const projectIds = new Set(draft.projects.map((project) => project.id));
	const goalIds = new Set(draft.goals.map((goal) => goal.id));
	const taskIds = new Set(draft.tasks.map((task) => task.id));
	const runIds = new Set(draft.runs.map((run) => run.id));
	const reviewIds = new Set(draft.reviews.map((review) => review.id));
	const approvalIds = new Set(draft.approvals.map((approval) => approval.id));
	const workSessionIds = new Set(draft.workSessions.map((session) => session.id));

	addSourceIssues(issues, 'ProjectDraft', draft.projects);
	addSourceIssues(issues, 'GoalDraft', draft.goals);
	addSourceIssues(issues, 'TaskDraft', draft.tasks);
	addSourceIssues(issues, 'TaskDependencyDraft', draft.taskDependencies);
	addSourceIssues(issues, 'WorkSessionCandidateDraft', draft.workSessions);
	addSourceIssues(issues, 'RunDraft', draft.runs);
	addSourceIssues(issues, 'ReviewDraft', draft.reviews);
	addSourceIssues(issues, 'ApprovalDraft', draft.approvals);
	addSourceIssues(issues, 'DecisionDraft', draft.decisions);
	addSourceIssues(issues, 'ArtifactCandidateDraft', draft.artifactCandidates);

	for (const goal of draft.goals) {
		if (!projectIds.has(goal.projectId)) {
			issues.push(
				issue({
					code: 'goal_missing_project',
					message: `Goal ${goal.id} references project ${goal.projectId}, which is not imported.`,
					recordType: 'GoalDraft',
					recordId: goal.id
				})
			);
		}
	}

	for (const task of draft.tasks) {
		if (!projectIds.has(task.projectId)) {
			issues.push(
				issue({
					code: 'task_missing_project',
					message: `Task ${task.id} references project ${task.projectId}, which is not imported.`,
					recordType: 'TaskDraft',
					recordId: task.id
				})
			);
		}

		if (!goalIds.has(task.goalId)) {
			issues.push(
				issue({
					code: 'task_missing_goal',
					message: `Task ${task.id} references goal ${task.goalId}, which is not imported.`,
					recordType: 'TaskDraft',
					recordId: task.id
				})
			);
		}
	}

	for (const dependency of draft.taskDependencies) {
		if (!taskIds.has(dependency.taskId)) {
			issues.push(
				issue({
					code: 'dependency_missing_task',
					message: `Dependency ${dependency.id} references task ${dependency.taskId}, which is not imported.`,
					recordType: 'TaskDependencyDraft',
					recordId: dependency.id
				})
			);
		}

		if (dependency.status === 'resolved' && !taskIds.has(dependency.dependsOnTaskId)) {
			issues.push(
				issue({
					code: 'dependency_missing_resolved_target',
					message: `Resolved dependency ${dependency.id} references missing task ${dependency.dependsOnTaskId}.`,
					recordType: 'TaskDependencyDraft',
					recordId: dependency.id
				})
			);
		}
	}

	for (const run of draft.runs) {
		if (!taskIds.has(run.taskId)) {
			issues.push(
				issue({
					code: 'run_missing_task',
					message: `Run ${run.id} references task ${run.taskId}, which is not imported.`,
					recordType: 'RunDraft',
					recordId: run.id
				})
			);
		}

		if (run.workSessionId && !workSessionIds.has(run.workSessionId)) {
			issues.push(
				issue({
					code: 'run_missing_work_session',
					message: `Run ${run.id} references work session ${run.workSessionId}, which is not imported.`,
					recordType: 'RunDraft',
					recordId: run.id
				})
			);
		}
	}

	for (const review of draft.reviews) {
		if (!taskIds.has(review.taskId)) {
			issues.push(
				issue({
					code: 'review_missing_task',
					message: `Review ${review.id} references task ${review.taskId}, which is not imported.`,
					recordType: 'ReviewDraft',
					recordId: review.id
				})
			);
		}

		if (review.runId && !runIds.has(review.runId)) {
			issues.push(
				issue({
					code: 'review_missing_run',
					message: `Review ${review.id} references run ${review.runId}, which is not imported.`,
					recordType: 'ReviewDraft',
					recordId: review.id
				})
			);
		}
	}

	for (const approval of draft.approvals) {
		if (!taskIds.has(approval.taskId)) {
			issues.push(
				issue({
					code: 'approval_missing_task',
					message: `Approval ${approval.id} references task ${approval.taskId}, which is not imported.`,
					recordType: 'ApprovalDraft',
					recordId: approval.id
				})
			);
		}

		if (approval.runId && !runIds.has(approval.runId)) {
			issues.push(
				issue({
					code: 'approval_missing_run',
					message: `Approval ${approval.id} references run ${approval.runId}, which is not imported.`,
					recordType: 'ApprovalDraft',
					recordId: approval.id
				})
			);
		}
	}

	for (const decision of draft.decisions) {
		const hasImportedReference =
			(decision.taskId !== null && taskIds.has(decision.taskId)) ||
			(decision.goalId !== null && goalIds.has(decision.goalId)) ||
			(decision.runId !== null && runIds.has(decision.runId)) ||
			(decision.reviewId !== null && reviewIds.has(decision.reviewId)) ||
			(decision.approvalId !== null && approvalIds.has(decision.approvalId));

		if (!hasImportedReference) {
			issues.push(
				issue({
					code: 'decision_missing_imported_reference',
					message: `Decision ${decision.id} does not reference an imported task, goal, run, review, or approval.`,
					recordType: 'DecisionDraft',
					recordId: decision.id
				})
			);
		}
	}

	const artifactSourceReferenceCount = draft.artifactCandidates.reduce(
		(count, artifact) => count + artifact.sourceReferenceCount,
		0
	);

	for (const artifact of draft.artifactCandidates) {
		if (!projectIds.has(artifact.projectId)) {
			issues.push(
				issue({
					code: 'artifact_missing_project',
					message: `Artifact candidate ${artifact.id} references project ${artifact.projectId}, which is not imported.`,
					recordType: 'ArtifactCandidateDraft',
					recordId: artifact.id
				})
			);
		}

		if (artifact.taskId && !taskIds.has(artifact.taskId)) {
			issues.push(
				issue({
					code: 'artifact_missing_task',
					message: `Artifact candidate ${artifact.id} references task ${artifact.taskId}, which is not imported.`,
					recordType: 'ArtifactCandidateDraft',
					recordId: artifact.id
				})
			);
		}

		if (artifact.runId && !runIds.has(artifact.runId)) {
			issues.push(
				issue({
					code: 'artifact_missing_run',
					message: `Artifact candidate ${artifact.id} references run ${artifact.runId}, which is not imported.`,
					recordType: 'ArtifactCandidateDraft',
					recordId: artifact.id
				})
			);
		}

		if (artifact.sourceReferenceCount !== artifact.sourceReferences.length) {
			issues.push(
				issue({
					code: 'artifact_source_reference_count_mismatch',
					message: `Artifact candidate ${artifact.id} source reference count does not match source references.`,
					recordType: 'ArtifactCandidateDraft',
					recordId: artifact.id
				})
			);
		}
	}

	return {
		valid: issues.length === 0,
		issues,
		counts: {
			projects: draft.projects.length,
			goals: draft.goals.length,
			tasks: draft.tasks.length,
			taskDependencies: draft.taskDependencies.length,
			workSessions: draft.workSessions.length,
			runs: draft.runs.length,
			reviews: draft.reviews.length,
			approvals: draft.approvals.length,
			decisions: draft.decisions.length,
			artifactCandidates: draft.artifactCandidates.length,
			artifactSourceReferences: artifactSourceReferenceCount,
			unresolvedReferences: draft.unresolvedReferences.length
		}
	};
}
