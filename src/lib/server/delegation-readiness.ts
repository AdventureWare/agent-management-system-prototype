import {
	getOpenReviewForTask,
	getPendingApprovalForTask,
	taskHasUnmetDependencies
} from '$lib/server/control-plane';
import { normalizeExecutionRequirementName } from '$lib/execution-requirements';
import { getRigorProfileGuidance, resolveEffectiveRigorProfile } from '$lib/rigor-profiles';
import type {
	ControlPlaneData,
	Project,
	RigorProfile,
	Run,
	Task,
	TaskAutonomyLevel,
	TaskReadinessLevel,
	TaskRiskLevel
} from '$lib/types/control-plane';

export const DELEGATION_READINESS_MODE_OPTIONS = [
	'CAPTURED',
	'NEEDS_CLARIFICATION',
	'NEEDS_PLANNING',
	'NEEDS_RESEARCH',
	'READY_FOR_EXECUTION',
	'AWAITING_REVIEW',
	'AUTOMATION_CANDIDATE'
] as const;

export type DelegationReadinessMode = (typeof DELEGATION_READINESS_MODE_OPTIONS)[number];

export type DelegationReadinessActionId =
	| 'clarify'
	| 'plan'
	| 'research'
	| 'execute'
	| 'review'
	| 'convert_to_template_or_skill';

export type DelegationReadinessSuggestedAction = {
	id: DelegationReadinessActionId;
	label: string;
	detail: string;
};

export type DelegationReadinessAssessment = {
	recommendedMode: DelegationReadinessMode;
	readinessLabel: string;
	canExecute: boolean;
	needsClarification: boolean;
	needsResearch: boolean;
	needsReview: boolean;
	effectiveRigorProfile: RigorProfile;
	rigorProfileLabel: string;
	rigorProfileValidationExpectations: string[];
	riskFlags: string[];
	missingInformation: string[];
	suggestedNextActions: DelegationReadinessSuggestedAction[];
	rationale: string;
};

export type DelegationReadinessContext = {
	availablePromptSkillNames?: string[];
};

const RESEARCH_BLOCKER_PATTERN =
	/\b(research|investigate|unknown|uncertain|uncertainty|spike|explore|verify|validate|compare|look up|lookup|find out)\b/i;
const CLARIFICATION_BLOCKER_PATTERN =
	/\b(clarify|question|ask|preference|decision|choose|confirm|ambiguous|unclear|waiting on user|user input)\b/i;
const SHORT_SUMMARY_CHARACTER_LIMIT = 40;

const EXECUTABLE_READINESS_LEVELS = new Set<TaskReadinessLevel>([
	'R3_EXECUTABLE',
	'R4_REVIEWABLE',
	'R5_AUTOMATABLE'
]);

const EXECUTABLE_AUTONOMY_LEVELS = new Set<TaskAutonomyLevel>([
	'A2_AGENT_MAY_DRAFT_ARTIFACTS',
	'A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE',
	'A4_AGENT_MAY_CREATE_REVIEWABLE_DIFF_OR_PR'
]);

function hasText(value: string | null | undefined) {
	return Boolean(value?.trim());
}

function readText(value: string | null | undefined) {
	return value?.trim() ?? '';
}

function getReadinessLevel(task: Task): TaskReadinessLevel {
	return task.readinessLevel ?? 'R1_FRAMED';
}

function getAutonomyLevel(task: Task): TaskAutonomyLevel {
	return task.autonomyLevel ?? 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE';
}

function getLatestRun(data: Pick<ControlPlaneData, 'runs'>, task: Task): Run | null {
	const latestLinkedRun = task.latestRunId
		? (data.runs.find((run) => run.id === task.latestRunId) ?? null)
		: null;

	return latestLinkedRun ?? data.runs.find((run) => run.taskId === task.id) ?? null;
}

function taskHasOnlyCaptureFields(task: Task) {
	return (
		!hasText(task.summary) ||
		(readText(task.summary).length <= SHORT_SUMMARY_CHARACTER_LIMIT &&
			!hasText(task.expectedOutcome) &&
			!hasText(task.successCriteria) &&
			!hasText(task.scope) &&
			!hasText(task.validationSteps) &&
			(task.requiredPromptSkillNames ?? []).length === 0 &&
			(task.requiredCapabilityNames ?? []).length === 0 &&
			(task.requiredToolNames ?? []).length === 0)
	);
}

function getMissingSkillNames(task: Task, context: DelegationReadinessContext) {
	if (!context.availablePromptSkillNames) {
		return [];
	}

	const availableNames = new Set(
		context.availablePromptSkillNames.map((name) => normalizeExecutionRequirementName(name))
	);

	return (task.requiredPromptSkillNames ?? []).filter(
		(skillName) => !availableNames.has(normalizeExecutionRequirementName(skillName))
	);
}

function getMissingCapabilityNames(data: ControlPlaneData, task: Task) {
	const availableNames = new Set<string>();

	for (const provider of data.providers) {
		for (const capability of provider.capabilities ?? []) {
			availableNames.add(normalizeExecutionRequirementName(capability));
		}
	}

	for (const executionSurface of data.executionSurfaces) {
		for (const capability of executionSurface.skills ?? []) {
			availableNames.add(normalizeExecutionRequirementName(capability));
		}
	}

	return (task.requiredCapabilityNames ?? []).filter(
		(capabilityName) => !availableNames.has(normalizeExecutionRequirementName(capabilityName))
	);
}

function getMissingToolNames(data: ControlPlaneData, task: Task) {
	const availableNames = new Set(
		data.providers.map((provider) => normalizeExecutionRequirementName(provider.launcher))
	);

	return (task.requiredToolNames ?? []).filter(
		(toolName) => !availableNames.has(normalizeExecutionRequirementName(toolName))
	);
}

function buildMissingInformation(input: {
	task: Task;
	project: Project | null;
	data: ControlPlaneData;
	context: DelegationReadinessContext;
}) {
	const missing: string[] = [];
	const { task, project, data, context } = input;
	const effectiveRigorProfile = resolveEffectiveRigorProfile({ task, project });
	const missingSkillNames = getMissingSkillNames(task, context);
	const missingCapabilityNames = getMissingCapabilityNames(data, task);
	const missingToolNames = getMissingToolNames(data, task);

	if (!hasText(task.summary)) {
		missing.push('Add a short description.');
	}

	if (!hasText(task.expectedOutcome)) {
		missing.push('Add an expected outcome.');
	}

	if (!hasText(task.successCriteria)) {
		missing.push('Add done or acceptance criteria.');
	}

	if (!hasText(task.validationSteps)) {
		missing.push('Add validation notes or checks.');
	}

	if (!hasText(task.scope) && getReadinessLevel(task) !== 'R0_IDEA') {
		missing.push('Add a clear scope boundary.');
	}

	if (
		(effectiveRigorProfile === 'BETA' ||
			effectiveRigorProfile === 'PRODUCTION' ||
			effectiveRigorProfile === 'HIGH_STAKES') &&
		!hasText(task.validationSteps)
	) {
		missing.push('Add validation steps appropriate for limited-user or production exposure.');
	}

	if (
		(effectiveRigorProfile === 'PRODUCTION' || effectiveRigorProfile === 'HIGH_STAKES') &&
		(task.reviewRequirement === 'NONE' || task.requiresReview === false)
	) {
		missing.push('Add human review or approval before production or high-stakes work proceeds.');
	}

	if (effectiveRigorProfile === 'HIGH_STAKES') {
		missing.push('Prepare an approval packet; do not execute high-stakes actions autonomously.');
	}

	if (task.status === 'blocked' || hasText(task.blockedReason)) {
		missing.push('Resolve the blocker before execution.');
	}

	if (taskHasUnmetDependencies(data, task)) {
		missing.push('Complete dependency tasks first.');
	}

	if (missingSkillNames.length > 0) {
		missing.push(`Install or remove missing prompt skills: ${missingSkillNames.join(', ')}.`);
	}

	if (missingCapabilityNames.length > 0) {
		missing.push(`Add execution capability coverage: ${missingCapabilityNames.join(', ')}.`);
	}

	if (missingToolNames.length > 0) {
		missing.push(`Add runtime tool coverage: ${missingToolNames.join(', ')}.`);
	}

	return missing;
}

function buildRiskFlags(task: Task, effectiveRigorProfile: RigorProfile) {
	const flags: string[] = [];
	const riskLevel: TaskRiskLevel = task.riskLevel ?? 'medium';
	const autonomyLevel = getAutonomyLevel(task);

	if (effectiveRigorProfile === 'HIGH_STAKES') {
		flags.push('High-stakes profile requires explicit human approval before execution.');
	}

	if (effectiveRigorProfile === 'PRODUCTION') {
		flags.push(
			'Production profile expects stronger validation, review, and rollback consideration.'
		);
	}

	if (riskLevel === 'high' || riskLevel === 'critical') {
		flags.push(`${riskLevel} risk requires human review before bounded execution.`);
	}

	if (autonomyLevel === 'A0_HUMAN_ONLY') {
		flags.push('Autonomy is human-only.');
	}

	if (autonomyLevel === 'A5_AGENT_MAY_MERGE_DEPLOY_OR_CHANGE_EXTERNAL_STATE') {
		flags.push('A5 autonomy can change external state and is outside v0 autonomous execution.');
	}

	if (task.approvalMode !== 'none') {
		flags.push(`Approval gate is set to ${task.approvalMode.replace(/_/g, ' ')}.`);
	}

	return flags;
}

function taskLooksRepeatable(data: ControlPlaneData, task: Task) {
	if (task.taskTemplateId || task.workflowId || getReadinessLevel(task) === 'R5_AUTOMATABLE') {
		return true;
	}

	const normalizedTitle = readText(task.title).toLowerCase();

	if (!normalizedTitle) {
		return false;
	}

	return (
		data.tasks.filter((candidate) => candidate.title.trim().toLowerCase() === normalizedTitle)
			.length >= 2
	);
}

function getBlockerMode(task: Task): DelegationReadinessMode | null {
	const blocker = readText(task.blockedReason);

	if (!blocker) {
		return null;
	}

	if (RESEARCH_BLOCKER_PATTERN.test(blocker)) {
		return 'NEEDS_RESEARCH';
	}

	if (CLARIFICATION_BLOCKER_PATTERN.test(blocker)) {
		return 'NEEDS_CLARIFICATION';
	}

	return 'NEEDS_CLARIFICATION';
}

function buildAction(mode: DelegationReadinessMode): DelegationReadinessSuggestedAction {
	switch (mode) {
		case 'NEEDS_CLARIFICATION':
			return {
				id: 'clarify',
				label: 'Clarify task',
				detail: 'Capture the missing user intent, preference, or decision before delegation.'
			};
		case 'NEEDS_RESEARCH':
			return {
				id: 'research',
				label: 'Reduce uncertainty',
				detail: 'Run a research or spike task before assigning bounded execution.'
			};
		case 'NEEDS_PLANNING':
			return {
				id: 'plan',
				label: 'Plan next',
				detail: 'Break down the work and add enough outcome and validation detail for delegation.'
			};
		case 'READY_FOR_EXECUTION':
			return {
				id: 'execute',
				label: 'Execute',
				detail: 'The task is clear enough for bounded agent work with review controls.'
			};
		case 'AWAITING_REVIEW':
			return {
				id: 'review',
				label: 'Review output',
				detail: 'Inspect the latest run, artifacts, blockers, and validation result.'
			};
		case 'AUTOMATION_CANDIDATE':
			return {
				id: 'convert_to_template_or_skill',
				label: 'Convert to template or skill',
				detail:
					'This looks repeatable enough to capture as a reusable workflow, template, or skill.'
			};
		case 'CAPTURED':
		default:
			return {
				id: 'plan',
				label: 'Frame task',
				detail: 'Keep the capture lightweight, then add structure only when delegation is needed.'
			};
	}
}

function getReadinessLabel(mode: DelegationReadinessMode) {
	switch (mode) {
		case 'CAPTURED':
			return 'Quick capture';
		case 'NEEDS_CLARIFICATION':
			return 'Needs clarification';
		case 'NEEDS_PLANNING':
			return 'Ready for planning';
		case 'NEEDS_RESEARCH':
			return 'Needs research';
		case 'READY_FOR_EXECUTION':
			return 'Ready for bounded execution';
		case 'AWAITING_REVIEW':
			return 'Awaiting review';
		case 'AUTOMATION_CANDIDATE':
			return 'Automation candidate';
	}
}

function getRationale(mode: DelegationReadinessMode, task: Task, missingInformation: string[]) {
	if (mode === 'CAPTURED') {
		return 'The task is valid as lightweight capture, but it lacks enough framing for delegation.';
	}

	if (missingInformation.length > 0) {
		return missingInformation[0] ?? 'The task needs more information before delegation.';
	}

	if (mode === 'READY_FOR_EXECUTION') {
		return 'The task has enough outcome, validation, risk, autonomy, and blocker context for bounded agent work.';
	}

	if (mode === 'AWAITING_REVIEW') {
		return 'The latest task state or run indicates human review is the next useful step.';
	}

	if (mode === 'AUTOMATION_CANDIDATE') {
		return 'The task is repeatable or template/workflow-backed and can be turned into reusable operating structure.';
	}

	if (task.status === 'blocked' && hasText(task.blockedReason)) {
		return `The task is blocked: ${readText(task.blockedReason)}.`;
	}

	return 'The task needs progressive enrichment before it should be delegated.';
}

export function buildDelegationReadinessAssessment(
	data: ControlPlaneData,
	task: Task,
	context: DelegationReadinessContext = {}
): DelegationReadinessAssessment {
	const latestRun = getLatestRun(data, task);
	const openReview = getOpenReviewForTask(data, task.id);
	const pendingApproval = getPendingApprovalForTask(data, task.id);
	const project = data.projects.find((candidate) => candidate.id === task.projectId) ?? null;
	const effectiveRigorProfile = resolveEffectiveRigorProfile({ task, project });
	const rigorGuidance = getRigorProfileGuidance(effectiveRigorProfile);
	const blockerMode = getBlockerMode(task);
	const readinessLevel = getReadinessLevel(task);
	const autonomyLevel = getAutonomyLevel(task);
	const missingInformation = buildMissingInformation({ task, project, data, context });
	const riskFlags = buildRiskFlags(task, effectiveRigorProfile);
	const hasRunNeedingReview =
		latestRun?.status === 'completed' ||
		latestRun?.status === 'blocked' ||
		task.status === 'review' ||
		Boolean(openReview) ||
		Boolean(pendingApproval);
	const hasEnoughExecutionContract =
		hasText(task.expectedOutcome) &&
		(hasText(task.successCriteria) || hasText(task.validationSteps)) &&
		(hasText(task.scope) || hasText(task.readyCondition) || hasText(task.summary));
	const canExecute =
		task.status === 'ready' &&
		!blockerMode &&
		!taskHasUnmetDependencies(data, task) &&
		!openReview &&
		!pendingApproval &&
		hasEnoughExecutionContract &&
		EXECUTABLE_READINESS_LEVELS.has(readinessLevel) &&
		EXECUTABLE_AUTONOMY_LEVELS.has(autonomyLevel) &&
		effectiveRigorProfile !== 'HIGH_STAKES' &&
		task.riskLevel !== 'high' &&
		task.riskLevel !== 'critical' &&
		getMissingSkillNames(task, context).length === 0 &&
		getMissingCapabilityNames(data, task).length === 0 &&
		getMissingToolNames(data, task).length === 0;
	let recommendedMode: DelegationReadinessMode;

	if (hasRunNeedingReview) {
		recommendedMode = 'AWAITING_REVIEW';
	} else if (blockerMode) {
		recommendedMode = blockerMode;
	} else if (canExecute && taskLooksRepeatable(data, task)) {
		recommendedMode = 'AUTOMATION_CANDIDATE';
	} else if (canExecute) {
		recommendedMode = 'READY_FOR_EXECUTION';
	} else if (taskHasOnlyCaptureFields(task) || readinessLevel === 'R0_IDEA') {
		recommendedMode = 'CAPTURED';
	} else if (readText(task.summary).match(RESEARCH_BLOCKER_PATTERN)) {
		recommendedMode = 'NEEDS_RESEARCH';
	} else if (!hasText(task.expectedOutcome) && !hasText(task.successCriteria)) {
		recommendedMode = 'NEEDS_PLANNING';
	} else {
		recommendedMode = 'NEEDS_PLANNING';
	}

	const suggestedNextActions = [buildAction(recommendedMode)];

	if (recommendedMode !== 'AUTOMATION_CANDIDATE' && taskLooksRepeatable(data, task)) {
		suggestedNextActions.push(buildAction('AUTOMATION_CANDIDATE'));
	}

	return {
		recommendedMode,
		readinessLabel: getReadinessLabel(recommendedMode),
		canExecute,
		needsClarification: recommendedMode === 'NEEDS_CLARIFICATION',
		needsResearch: recommendedMode === 'NEEDS_RESEARCH',
		needsReview: recommendedMode === 'AWAITING_REVIEW',
		effectiveRigorProfile,
		rigorProfileLabel: rigorGuidance.label,
		rigorProfileValidationExpectations: rigorGuidance.validationExpectations,
		riskFlags,
		missingInformation,
		suggestedNextActions,
		rationale: getRationale(recommendedMode, task, missingInformation)
	};
}
