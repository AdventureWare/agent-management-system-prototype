import type { Task } from '$lib/types/control-plane';
import type { ExecutionSurfaceTaskFit } from '$lib/server/execution-surface-api';

export type TaskExecutionPreflight = {
	requiredCapabilityNames: string[];
	requiredToolNames: string[];
	hasDeclaredRequirements: boolean;
	eligibleWorkerCount: number;
	fullCoverageWorkerCount: number;
	uncoveredCapabilityNames: string[];
	uncoveredToolNames: string[];
	currentAssignee: {
		executionSurfaceId: string;
		executionSurfaceName: string;
		withinConcurrencyLimit: boolean;
		missingCapabilityNames: string[];
		missingToolNames: string[];
		hasFullCoverage: boolean;
	} | null;
};

function isRequirementCovered(
	suggestions: ExecutionSurfaceTaskFit[],
	requirement: string,
	key: 'missingCapabilityNames' | 'missingToolNames'
) {
	return suggestions.some((suggestion) => !suggestion[key].includes(requirement));
}

export function buildTaskExecutionPreflight(
	task: Pick<Task, 'requiredCapabilityNames' | 'requiredToolNames' | 'assigneeExecutionSurfaceId'>,
	suggestions: ExecutionSurfaceTaskFit[]
): TaskExecutionPreflight {
	const requiredCapabilityNames = [...(task.requiredCapabilityNames ?? [])];
	const requiredToolNames = [...(task.requiredToolNames ?? [])];
	const currentAssignee = task.assigneeExecutionSurfaceId
		? (suggestions.find(
				(suggestion) => suggestion.executionSurfaceId === task.assigneeExecutionSurfaceId
			) ?? null)
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
					executionSurfaceId: currentAssignee.executionSurfaceId,
					executionSurfaceName: currentAssignee.executionSurfaceName,
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
