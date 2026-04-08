import type { Task } from '$lib/types/control-plane';
import type { WorkerTaskFit } from '$lib/server/worker-api';

export type TaskExecutionPreflight = {
	requiredCapabilityNames: string[];
	requiredToolNames: string[];
	hasDeclaredRequirements: boolean;
	eligibleWorkerCount: number;
	fullCoverageWorkerCount: number;
	uncoveredCapabilityNames: string[];
	uncoveredToolNames: string[];
	currentAssignee: {
		workerId: string;
		workerName: string;
		withinConcurrencyLimit: boolean;
		missingCapabilityNames: string[];
		missingToolNames: string[];
		hasFullCoverage: boolean;
	} | null;
};

function isRequirementCovered(
	suggestions: WorkerTaskFit[],
	requirement: string,
	key: 'missingCapabilityNames' | 'missingToolNames'
) {
	return suggestions.some((suggestion) => !suggestion[key].includes(requirement));
}

export function buildTaskExecutionPreflight(
	task: Pick<Task, 'requiredCapabilityNames' | 'requiredToolNames' | 'assigneeWorkerId'>,
	suggestions: WorkerTaskFit[]
): TaskExecutionPreflight {
	const requiredCapabilityNames = [...(task.requiredCapabilityNames ?? [])];
	const requiredToolNames = [...(task.requiredToolNames ?? [])];
	const currentAssignee = task.assigneeWorkerId
		? (suggestions.find((suggestion) => suggestion.workerId === task.assigneeWorkerId) ?? null)
		: null;

	return {
		requiredCapabilityNames,
		requiredToolNames,
		hasDeclaredRequirements: requiredCapabilityNames.length > 0 || requiredToolNames.length > 0,
		eligibleWorkerCount: suggestions.filter((suggestion) => suggestion.eligible).length,
		fullCoverageWorkerCount: suggestions.filter(
			(suggestion) =>
				suggestion.missingCapabilityNames.length === 0 && suggestion.missingToolNames.length === 0
		).length,
		uncoveredCapabilityNames: requiredCapabilityNames.filter(
			(requirement) => !isRequirementCovered(suggestions, requirement, 'missingCapabilityNames')
		),
		uncoveredToolNames: requiredToolNames.filter(
			(requirement) => !isRequirementCovered(suggestions, requirement, 'missingToolNames')
		),
		currentAssignee: currentAssignee
			? {
					workerId: currentAssignee.workerId,
					workerName: currentAssignee.workerName,
					withinConcurrencyLimit: currentAssignee.withinConcurrencyLimit,
					missingCapabilityNames: currentAssignee.missingCapabilityNames,
					missingToolNames: currentAssignee.missingToolNames,
					hasFullCoverage:
						currentAssignee.missingCapabilityNames.length === 0 &&
						currentAssignee.missingToolNames.length === 0
				}
			: null
	};
}
