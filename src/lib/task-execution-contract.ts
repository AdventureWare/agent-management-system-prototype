export const TASK_EXECUTION_CONTRACT_FIELD_LABELS = {
	successCriteria: 'success criteria',
	readyCondition: 'ready condition',
	expectedOutcome: 'expected outcome'
} as const;

export type TaskExecutionContractField = keyof typeof TASK_EXECUTION_CONTRACT_FIELD_LABELS;

export type TaskExecutionContractStatus = {
	successCriteria: string;
	readyCondition: string;
	expectedOutcome: string;
	hasSuccessCriteria: boolean;
	hasReadyCondition: boolean;
	hasExpectedOutcome: boolean;
	missingLaunchFieldLabels: string[];
	missingReviewFieldLabels: string[];
	canLaunch: boolean;
	canReviewAgainstContract: boolean;
};

function readContractValue(value: string | null | undefined) {
	return value?.trim() ?? '';
}

export function formatTaskExecutionContractFieldList(labels: string[]) {
	if (labels.length <= 1) {
		return labels[0] ?? '';
	}

	if (labels.length === 2) {
		return `${labels[0]} and ${labels[1]}`;
	}

	return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
}

export function buildTaskExecutionContractStatus(input: {
	successCriteria?: string | null;
	readyCondition?: string | null;
	expectedOutcome?: string | null;
}): TaskExecutionContractStatus {
	const successCriteria = readContractValue(input.successCriteria);
	const readyCondition = readContractValue(input.readyCondition);
	const expectedOutcome = readContractValue(input.expectedOutcome);
	const hasSuccessCriteria = Boolean(successCriteria);
	const hasReadyCondition = Boolean(readyCondition);
	const hasExpectedOutcome = Boolean(expectedOutcome);
	const missingLaunchFieldLabels = [
		!hasSuccessCriteria ? TASK_EXECUTION_CONTRACT_FIELD_LABELS.successCriteria : '',
		!hasReadyCondition ? TASK_EXECUTION_CONTRACT_FIELD_LABELS.readyCondition : '',
		!hasExpectedOutcome ? TASK_EXECUTION_CONTRACT_FIELD_LABELS.expectedOutcome : ''
	].filter(Boolean);
	const missingReviewFieldLabels = [
		!hasSuccessCriteria ? TASK_EXECUTION_CONTRACT_FIELD_LABELS.successCriteria : '',
		!hasExpectedOutcome ? TASK_EXECUTION_CONTRACT_FIELD_LABELS.expectedOutcome : ''
	].filter(Boolean);

	return {
		successCriteria,
		readyCondition,
		expectedOutcome,
		hasSuccessCriteria,
		hasReadyCondition,
		hasExpectedOutcome,
		missingLaunchFieldLabels,
		missingReviewFieldLabels,
		canLaunch: true,
		canReviewAgainstContract: missingReviewFieldLabels.length === 0
	};
}

export function getTaskLaunchContractBlockerMessage(
	contract: Pick<TaskExecutionContractStatus, 'canLaunch' | 'missingLaunchFieldLabels'>
) {
	if (contract.canLaunch) {
		return null;
	}

	return `This task is missing ${formatTaskExecutionContractFieldList(contract.missingLaunchFieldLabels)}. Add ${contract.missingLaunchFieldLabels.length === 1 ? 'it' : 'them'} before launching so the agent has a clear execution contract.`;
}

export function getTaskReviewContractGapMessage(
	contract: Pick<
		TaskExecutionContractStatus,
		'canReviewAgainstContract' | 'missingReviewFieldLabels'
	>
) {
	if (contract.canReviewAgainstContract) {
		return null;
	}

	return `Reviews will be forced to infer acceptance until ${formatTaskExecutionContractFieldList(contract.missingReviewFieldLabels)} ${contract.missingReviewFieldLabels.length === 1 ? 'is' : 'are'} recorded.`;
}
