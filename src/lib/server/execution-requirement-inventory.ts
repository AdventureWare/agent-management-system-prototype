import { normalizeExecutionRequirementName } from '$lib/execution-requirements';
import type { ControlPlaneData } from '$lib/types/control-plane';

export type ExecutionRequirementInventoryEntry = {
	name: string;
	executionSurfaceCount: number;
	providerCount: number;
};

export type ExecutionRequirementInventory = {
	capabilities: ExecutionRequirementInventoryEntry[];
	tools: ExecutionRequirementInventoryEntry[];
	capabilityNames: string[];
	toolNames: string[];
};

type RequirementAccumulator = {
	name: string;
	executionSurfaceIds: Set<string>;
	providerIds: Set<string>;
};

function getOrCreateEntry(
	entries: Map<string, RequirementAccumulator>,
	name: string
): RequirementAccumulator | null {
	const normalizedName = normalizeExecutionRequirementName(name);

	if (!normalizedName) {
		return null;
	}

	const existingEntry = entries.get(normalizedName);

	if (existingEntry) {
		return existingEntry;
	}

	const nextEntry = {
		name: name.trim(),
		executionSurfaceIds: new Set<string>(),
		providerIds: new Set<string>()
	};
	entries.set(normalizedName, nextEntry);
	return nextEntry;
}

function finalizeEntries(entries: Map<string, RequirementAccumulator>) {
	return [...entries.values()]
		.map((entry) => ({
			name: entry.name,
			executionSurfaceCount: entry.executionSurfaceIds.size,
			providerCount: entry.providerIds.size
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
}

export function buildExecutionRequirementInventory(
	data: Pick<ControlPlaneData, 'providers' | 'executionSurfaces'>
): ExecutionRequirementInventory {
	const capabilityEntries = new Map<string, RequirementAccumulator>();
	const toolEntries = new Map<string, RequirementAccumulator>();

	for (const provider of data.providers) {
		for (const capabilityName of provider.capabilities ?? []) {
			const entry = getOrCreateEntry(capabilityEntries, capabilityName);

			if (entry) {
				entry.providerIds.add(provider.id);
			}
		}

		const toolEntry = getOrCreateEntry(toolEntries, provider.launcher);

		if (toolEntry) {
			toolEntry.providerIds.add(provider.id);
		}
	}

	for (const executionSurface of data.executionSurfaces) {
		for (const skillName of executionSurface.skills ?? []) {
			const entry = getOrCreateEntry(capabilityEntries, skillName);

			if (entry) {
				entry.executionSurfaceIds.add(executionSurface.id);
			}
		}
	}

	const capabilities = finalizeEntries(capabilityEntries);
	const tools = finalizeEntries(toolEntries);

	return {
		capabilities,
		tools,
		capabilityNames: capabilities.map((entry) => entry.name),
		toolNames: tools.map((entry) => entry.name)
	};
}
