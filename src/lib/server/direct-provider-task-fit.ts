import { normalizeExecutionRequirementName } from '$lib/execution-requirements';
import type { ControlPlaneData, Task } from '$lib/types/control-plane';

export type DirectProviderTaskFit = {
	providerId: string;
	providerName: string;
	enabled: boolean;
	launcher: string;
	missingCapabilityNames: string[];
	missingToolNames: string[];
	hasFullCoverage: boolean;
	canLaunchDirectly: boolean;
};

export function describeDirectProviderTaskFit(
	provider:
		| Pick<
				ControlPlaneData['providers'][number],
				'id' | 'name' | 'enabled' | 'launcher' | 'capabilities'
		  >
		| null
		| undefined,
	task: Pick<Task, 'requiredCapabilityNames' | 'requiredToolNames'>
): DirectProviderTaskFit | null {
	if (!provider) {
		return null;
	}

	const capabilityKeys = new Set(
		(provider.capabilities ?? []).map(normalizeExecutionRequirementName).filter(Boolean)
	);
	const toolKeys = new Set(
		[provider.launcher ?? ''].map(normalizeExecutionRequirementName).filter(Boolean)
	);
	const missingCapabilityNames = (task.requiredCapabilityNames ?? []).filter(
		(name) => !capabilityKeys.has(normalizeExecutionRequirementName(name))
	);
	const missingToolNames = (task.requiredToolNames ?? []).filter(
		(name) => !toolKeys.has(normalizeExecutionRequirementName(name))
	);
	const hasFullCoverage = missingCapabilityNames.length === 0 && missingToolNames.length === 0;

	return {
		providerId: provider.id,
		providerName: provider.name,
		enabled: provider.enabled,
		launcher: provider.launcher,
		missingCapabilityNames,
		missingToolNames,
		hasFullCoverage,
		canLaunchDirectly: provider.enabled && hasFullCoverage
	};
}
