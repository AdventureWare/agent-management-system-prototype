import { AGENT_SANDBOX_OPTIONS, type AgentSandbox } from '$lib/types/agent-thread';
import { parseExecutionRequirementNames } from '$lib/execution-requirements';
import {
	AREA_OPTIONS,
	PRIORITY_OPTIONS,
	TASK_APPROVAL_MODE_OPTIONS,
	TASK_RISK_LEVEL_OPTIONS
} from '$lib/types/control-plane';

type TaskFormValue = string | FormDataEntryValue | null | undefined;

export type CreateTaskFormInput = {
	name: string;
	instructions: string;
	successCriteria: string;
	readyCondition: string;
	expectedOutcome: string;
	projectId: string;
	parentTaskId: string;
	delegationObjective: string;
	delegationInputContext: string;
	delegationExpectedDeliverable: string;
	delegationDoneCondition: string;
	delegationIntegrationNotes: string;
	assigneeWorkerId: string;
	targetDate: string;
	goalId: string;
	area: (typeof AREA_OPTIONS)[number];
	priority: (typeof PRIORITY_OPTIONS)[number];
	riskLevel: (typeof TASK_RISK_LEVEL_OPTIONS)[number];
	approvalMode: (typeof TASK_APPROVAL_MODE_OPTIONS)[number];
	requiredThreadSandbox: AgentSandbox | null;
	requiresReview: boolean;
	desiredRoleId: string;
	blockedReason: string;
	dependencyTaskIds: string[];
	requiredPromptSkillNames: string[];
	requiredCapabilityNames: string[];
	requiredToolNames: string[];
};

export type TaskDetailFormInput = CreateTaskFormInput & {
	hasDelegationPacketFields: boolean;
	hasGoalId: boolean;
	hasAssigneeWorkerId: boolean;
	hasPriority: boolean;
	hasRiskLevel: boolean;
	hasApprovalMode: boolean;
	hasRequiredThreadSandbox: boolean;
	hasRequiresReview: boolean;
	hasDesiredRoleId: boolean;
	hasRequiredPromptSkillNames: boolean;
	hasRequiredCapabilityNames: boolean;
	hasRequiredToolNames: boolean;
	hasBlockedReason: boolean;
	hasDependencyTaskSelection: boolean;
	hasTargetDate: boolean;
};

export type CreateTaskPrefill = {
	open: boolean;
	projectId: string;
	parentTaskId: string;
	delegationObjective: string;
	delegationInputContext: string;
	delegationExpectedDeliverable: string;
	delegationDoneCondition: string;
	delegationIntegrationNotes: string;
	name: string;
	instructions: string;
	successCriteria: string;
	readyCondition: string;
	expectedOutcome: string;
	requiredThreadSandbox: string;
	assigneeWorkerId: string;
	targetDate: string;
	goalId: string;
	area: (typeof AREA_OPTIONS)[number];
	priority: (typeof PRIORITY_OPTIONS)[number];
	riskLevel: (typeof TASK_RISK_LEVEL_OPTIONS)[number];
	approvalMode: (typeof TASK_APPROVAL_MODE_OPTIONS)[number];
	requiresReview: boolean;
	desiredRoleId: string;
	blockedReason: string;
	dependencyTaskIds: string[];
	requiredPromptSkillNames: string;
	requiredCapabilityNames: string;
	requiredToolNames: string;
};

function readTrimmedValue(value: TaskFormValue) {
	return value?.toString().trim() ?? '';
}

function parseOption<T extends readonly string[]>(
	options: T,
	value: TaskFormValue,
	fallback: T[number]
): T[number] {
	const normalized = readTrimmedValue(value);
	return options.includes(normalized as T[number]) ? (normalized as T[number]) : fallback;
}

function parseBoolean(value: TaskFormValue, fallback: boolean) {
	const normalized = readTrimmedValue(value).toLowerCase();

	if (normalized === 'true') {
		return true;
	}

	if (normalized === 'false') {
		return false;
	}

	return fallback;
}

function parseNameList(value: TaskFormValue) {
	return [
		...new Set(
			readTrimmedValue(value)
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean)
		)
	];
}

function parseIdList(values: Iterable<TaskFormValue>) {
	return [...new Set([...values].map((value) => readTrimmedValue(value)).filter(Boolean))];
}

function parseOptionalSandbox(value: TaskFormValue): AgentSandbox | null {
	const normalized = readTrimmedValue(value);
	return AGENT_SANDBOX_OPTIONS.includes(normalized as AgentSandbox)
		? (normalized as AgentSandbox)
		: null;
}

export function isValidTaskDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function readCreateTaskForm(form: FormData): CreateTaskFormInput {
	return {
		name: readTrimmedValue(form.get('name')),
		instructions: readTrimmedValue(form.get('instructions')),
		successCriteria: readTrimmedValue(form.get('successCriteria')),
		readyCondition: readTrimmedValue(form.get('readyCondition')),
		expectedOutcome: readTrimmedValue(form.get('expectedOutcome')),
		projectId: readTrimmedValue(form.get('projectId')),
		parentTaskId: readTrimmedValue(form.get('parentTaskId')),
		delegationObjective: readTrimmedValue(form.get('delegationObjective')),
		delegationInputContext: readTrimmedValue(form.get('delegationInputContext')),
		delegationExpectedDeliverable: readTrimmedValue(form.get('delegationExpectedDeliverable')),
		delegationDoneCondition: readTrimmedValue(form.get('delegationDoneCondition')),
		delegationIntegrationNotes: readTrimmedValue(form.get('delegationIntegrationNotes')),
		assigneeWorkerId: readTrimmedValue(form.get('assigneeWorkerId')),
		targetDate: readTrimmedValue(form.get('targetDate')),
		goalId: readTrimmedValue(form.get('goalId')),
		area: parseOption(AREA_OPTIONS, form.get('area'), 'product'),
		priority: parseOption(PRIORITY_OPTIONS, form.get('priority'), 'medium'),
		riskLevel: parseOption(TASK_RISK_LEVEL_OPTIONS, form.get('riskLevel'), 'medium'),
		approvalMode: parseOption(TASK_APPROVAL_MODE_OPTIONS, form.get('approvalMode'), 'none'),
		requiredThreadSandbox: parseOptionalSandbox(form.get('requiredThreadSandbox')),
		requiresReview: parseBoolean(form.get('requiresReview'), true),
		desiredRoleId: readTrimmedValue(form.get('desiredRoleId')),
		blockedReason: readTrimmedValue(form.get('blockedReason')),
		dependencyTaskIds: parseIdList(form.getAll('dependencyTaskIds')),
		requiredPromptSkillNames: parseExecutionRequirementNames(
			readTrimmedValue(form.get('requiredPromptSkillNames'))
		),
		requiredCapabilityNames: parseExecutionRequirementNames(
			readTrimmedValue(form.get('requiredCapabilityNames'))
		),
		requiredToolNames: parseExecutionRequirementNames(
			readTrimmedValue(form.get('requiredToolNames'))
		)
	};
}

export function readTaskDetailForm(form: FormData): TaskDetailFormInput {
	return {
		...readCreateTaskForm(form),
		hasDelegationPacketFields:
			form.has('delegationObjective') ||
			form.has('delegationInputContext') ||
			form.has('delegationExpectedDeliverable') ||
			form.has('delegationDoneCondition') ||
			form.has('delegationIntegrationNotes'),
		hasGoalId: form.has('goalId'),
		hasAssigneeWorkerId: form.has('assigneeWorkerId'),
		hasPriority: form.has('priority'),
		hasRiskLevel: form.has('riskLevel'),
		hasApprovalMode: form.has('approvalMode'),
		hasRequiredThreadSandbox: form.has('requiredThreadSandbox'),
		hasRequiresReview: form.has('requiresReview'),
		hasDesiredRoleId: form.has('desiredRoleId'),
		hasRequiredPromptSkillNames: form.has('requiredPromptSkillNames'),
		hasRequiredCapabilityNames: form.has('requiredCapabilityNames'),
		hasRequiredToolNames: form.has('requiredToolNames'),
		hasBlockedReason: form.has('blockedReason'),
		hasDependencyTaskSelection: form.has('dependencyTaskSelection'),
		hasTargetDate: form.has('targetDate')
	};
}

export function readCreateTaskPrefill(url: URL): CreateTaskPrefill {
	const targetDate = readTrimmedValue(url.searchParams.get('targetDate'));

	return {
		open: url.searchParams.get('create') === '1',
		projectId: readTrimmedValue(url.searchParams.get('projectId')),
		parentTaskId: readTrimmedValue(url.searchParams.get('parentTaskId')),
		delegationObjective: readTrimmedValue(url.searchParams.get('delegationObjective')),
		delegationInputContext: readTrimmedValue(url.searchParams.get('delegationInputContext')),
		delegationExpectedDeliverable: readTrimmedValue(
			url.searchParams.get('delegationExpectedDeliverable')
		),
		delegationDoneCondition: readTrimmedValue(url.searchParams.get('delegationDoneCondition')),
		delegationIntegrationNotes: readTrimmedValue(
			url.searchParams.get('delegationIntegrationNotes')
		),
		name: readTrimmedValue(url.searchParams.get('name')),
		instructions: readTrimmedValue(url.searchParams.get('instructions')),
		successCriteria: readTrimmedValue(url.searchParams.get('successCriteria')),
		readyCondition: readTrimmedValue(url.searchParams.get('readyCondition')),
		expectedOutcome: readTrimmedValue(url.searchParams.get('expectedOutcome')),
		requiredThreadSandbox: readTrimmedValue(url.searchParams.get('requiredThreadSandbox')),
		assigneeWorkerId: readTrimmedValue(url.searchParams.get('assigneeWorkerId')),
		targetDate: targetDate && isValidTaskDate(targetDate) ? targetDate : '',
		goalId: readTrimmedValue(url.searchParams.get('goalId')),
		area: parseOption(AREA_OPTIONS, url.searchParams.get('area'), 'product'),
		priority: parseOption(PRIORITY_OPTIONS, url.searchParams.get('priority'), 'medium'),
		riskLevel: parseOption(TASK_RISK_LEVEL_OPTIONS, url.searchParams.get('riskLevel'), 'medium'),
		approvalMode: parseOption(
			TASK_APPROVAL_MODE_OPTIONS,
			url.searchParams.get('approvalMode'),
			'none'
		),
		requiresReview: parseBoolean(url.searchParams.get('requiresReview'), true),
		desiredRoleId: readTrimmedValue(url.searchParams.get('desiredRoleId')),
		blockedReason: readTrimmedValue(url.searchParams.get('blockedReason')),
		dependencyTaskIds: parseNameList(url.searchParams.get('dependencyTaskIds')),
		requiredPromptSkillNames: readTrimmedValue(url.searchParams.get('requiredPromptSkillNames')),
		requiredCapabilityNames: readTrimmedValue(url.searchParams.get('requiredCapabilityNames')),
		requiredToolNames: readTrimmedValue(url.searchParams.get('requiredToolNames'))
	};
}
