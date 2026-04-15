import { describeDirectProviderTaskFit } from '$lib/server/direct-provider-task-fit';
import type { Task } from '$lib/types/control-plane';
import type { ControlPlaneData } from '$lib/types/control-plane';
import type { ExecutionSurfaceTaskFit } from '$lib/server/execution-surface-api';

export type TaskExecutionPreflight = {
	requiredCapabilityNames: string[];
	requiredToolNames: string[];
	hasDeclaredRequirements: boolean;
	registeredExecutionSurfaceCount: number;
	eligibleExecutionSurfaceCount: number;
	fullCoverageExecutionSurfaceCount: number;
	uncoveredCapabilityNames: string[];
	uncoveredToolNames: string[];
	directProvider: {
		providerId: string;
		providerName: string;
		enabled: boolean;
		launcher: string;
		canLaunchDirectly: boolean;
		missingCapabilityNames: string[];
		missingToolNames: string[];
		hasFullCoverage: boolean;
	} | null;
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
	suggestions: ExecutionSurfaceTaskFit[],
	directProvider:
		| Pick<
				ControlPlaneData['providers'][number],
				'id' | 'name' | 'enabled' | 'launcher' | 'capabilities'
		  >
		| null
		| undefined = null
): TaskExecutionPreflight {
	const requiredCapabilityNames = [...(task.requiredCapabilityNames ?? [])];
	const requiredToolNames = [...(task.requiredToolNames ?? [])];
	const directProviderFit = describeDirectProviderTaskFit(directProvider, task);
	const currentAssignee = task.assigneeExecutionSurfaceId
		? (suggestions.find(
				(suggestion) => suggestion.executionSurfaceId === task.assigneeExecutionSurfaceId
			) ?? null)
		: null;

	return {
		requiredCapabilityNames,
		requiredToolNames,
		hasDeclaredRequirements: requiredCapabilityNames.length > 0 || requiredToolNames.length > 0,
		registeredExecutionSurfaceCount: suggestions.length,
		eligibleExecutionSurfaceCount: suggestions.filter((suggestion) => suggestion.eligible).length,
		fullCoverageExecutionSurfaceCount: suggestions.filter(
			(suggestion) =>
				suggestion.missingCapabilityNames.length === 0 && suggestion.missingToolNames.length === 0
		).length,
		uncoveredCapabilityNames: requiredCapabilityNames.filter(
			(requirement) => !isRequirementCovered(suggestions, requirement, 'missingCapabilityNames')
		),
		uncoveredToolNames: requiredToolNames.filter(
			(requirement) => !isRequirementCovered(suggestions, requirement, 'missingToolNames')
		),
		directProvider: directProviderFit
			? {
					providerId: directProviderFit.providerId,
					providerName: directProviderFit.providerName,
					enabled: directProviderFit.enabled,
					launcher: directProviderFit.launcher,
					canLaunchDirectly: directProviderFit.canLaunchDirectly,
					missingCapabilityNames: directProviderFit.missingCapabilityNames,
					missingToolNames: directProviderFit.missingToolNames,
					hasFullCoverage: directProviderFit.hasFullCoverage
				}
			: null,
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
