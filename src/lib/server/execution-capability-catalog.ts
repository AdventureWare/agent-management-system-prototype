import { normalizeExecutionRequirementName } from '$lib/execution-requirements';
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import type { ControlPlaneData } from '$lib/types/control-plane';

export type ProjectSkillCatalogEntry = {
	projectId: string;
	projectName: string;
	projectHref: string;
	totalCount: number;
	projectCount: number;
	globalCount: number;
	requestedSkillCount: number;
	requestingTaskCount: number;
	missingRequestedSkillCount: number;
	tasksMissingRequestedSkillCount: number;
	missingRequestedSkills: Array<{
		id: string;
		requestingTaskCount: number;
	}>;
	installedSkills: Array<{
		id: string;
		sourceLabel: string;
	}>;
	previewSkills: Array<{
		id: string;
		sourceLabel: string;
	}>;
};

export type CapabilityCatalogEntry = {
	name: string;
	executionSurfaceSkillCount: number;
	supportedExecutionSurfaceCount: number;
	onlineSupportedExecutionSurfaceCount: number;
	providerCapabilityCount: number;
	connectedProviderCount: number;
};

export type ToolCatalogEntry = {
	name: string;
	providerCount: number;
	connectedProviderCount: number;
	executionSurfaceCount: number;
	onlineExecutionSurfaceCount: number;
};

export type ExecutionCapabilityCatalog = {
	projectSkills: ProjectSkillCatalogEntry[];
	capabilities: CapabilityCatalogEntry[];
	tools: ToolCatalogEntry[];
};

type CapabilityAccumulator = {
	name: string;
	executionSurfaceIds: Set<string>;
	supportedExecutionSurfaceIds: Set<string>;
	onlineSupportedExecutionSurfaceIds: Set<string>;
	providerIds: Set<string>;
	connectedProviderIds: Set<string>;
};

type ToolAccumulator = {
	name: string;
	providerIds: Set<string>;
	connectedProviderIds: Set<string>;
	executionSurfaceIds: Set<string>;
	onlineExecutionSurfaceIds: Set<string>;
};

function getOrCreateCapabilityEntry(
	entries: Map<string, CapabilityAccumulator>,
	name: string
): CapabilityAccumulator | null {
	const normalizedName = normalizeExecutionRequirementName(name);

	if (!normalizedName) {
		return null;
	}

	const existing = entries.get(normalizedName);

	if (existing) {
		return existing;
	}

	const nextEntry = {
		name: name.trim(),
		executionSurfaceIds: new Set<string>(),
		supportedExecutionSurfaceIds: new Set<string>(),
		onlineSupportedExecutionSurfaceIds: new Set<string>(),
		providerIds: new Set<string>(),
		connectedProviderIds: new Set<string>()
	};
	entries.set(normalizedName, nextEntry);
	return nextEntry;
}

function getOrCreateToolEntry(
	entries: Map<string, ToolAccumulator>,
	name: string
): ToolAccumulator | null {
	const normalizedName = normalizeExecutionRequirementName(name);

	if (!normalizedName) {
		return null;
	}

	const existing = entries.get(normalizedName);

	if (existing) {
		return existing;
	}

	const nextEntry = {
		name: name.trim(),
		providerIds: new Set<string>(),
		connectedProviderIds: new Set<string>(),
		executionSurfaceIds: new Set<string>(),
		onlineExecutionSurfaceIds: new Set<string>()
	};
	entries.set(normalizedName, nextEntry);
	return nextEntry;
}

function finalizeCapabilityEntries(entries: Map<string, CapabilityAccumulator>) {
	return [...entries.values()]
		.map((entry) => ({
			name: entry.name,
			executionSurfaceSkillCount: entry.executionSurfaceIds.size,
			supportedExecutionSurfaceCount: entry.supportedExecutionSurfaceIds.size,
			onlineSupportedExecutionSurfaceCount: entry.onlineSupportedExecutionSurfaceIds.size,
			providerCapabilityCount: entry.providerIds.size,
			connectedProviderCount: entry.connectedProviderIds.size
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
}

function finalizeToolEntries(entries: Map<string, ToolAccumulator>) {
	return [...entries.values()]
		.map((entry) => ({
			name: entry.name,
			providerCount: entry.providerIds.size,
			connectedProviderCount: entry.connectedProviderIds.size,
			executionSurfaceCount: entry.executionSurfaceIds.size,
			onlineExecutionSurfaceCount: entry.onlineExecutionSurfaceIds.size
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
}

export function buildExecutionCapabilityCatalog(
	data: Pick<ControlPlaneData, 'projects' | 'providers' | 'executionSurfaces' | 'tasks'>
): ExecutionCapabilityCatalog {
	const capabilityEntries = new Map<string, CapabilityAccumulator>();
	const toolEntries = new Map<string, ToolAccumulator>();
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const executionSurfacesByProviderId = new Map<string, ControlPlaneData['executionSurfaces']>();

	for (const executionSurface of data.executionSurfaces) {
		const providerExecutionSurfaces =
			executionSurfacesByProviderId.get(executionSurface.providerId) ?? [];
		providerExecutionSurfaces.push(executionSurface);
		executionSurfacesByProviderId.set(executionSurface.providerId, providerExecutionSurfaces);
	}

	for (const provider of data.providers) {
		for (const capabilityName of provider.capabilities ?? []) {
			const entry = getOrCreateCapabilityEntry(capabilityEntries, capabilityName);

			if (entry) {
				entry.providerIds.add(provider.id);

				if (provider.enabled && provider.setupStatus === 'connected') {
					entry.connectedProviderIds.add(provider.id);
				}

				for (const executionSurface of executionSurfacesByProviderId.get(provider.id) ?? []) {
					entry.supportedExecutionSurfaceIds.add(executionSurface.id);

					if (executionSurface.status !== 'offline') {
						entry.onlineSupportedExecutionSurfaceIds.add(executionSurface.id);
					}
				}
			}
		}

		const toolEntry = getOrCreateToolEntry(toolEntries, provider.launcher);

		if (toolEntry) {
			toolEntry.providerIds.add(provider.id);

			if (provider.enabled && provider.setupStatus === 'connected') {
				toolEntry.connectedProviderIds.add(provider.id);
			}
		}
	}

	for (const executionSurface of data.executionSurfaces) {
		const provider = providerMap.get(executionSurface.providerId) ?? null;

		for (const skillName of executionSurface.skills ?? []) {
			const entry = getOrCreateCapabilityEntry(capabilityEntries, skillName);

			if (entry) {
				entry.executionSurfaceIds.add(executionSurface.id);
				entry.supportedExecutionSurfaceIds.add(executionSurface.id);

				if (executionSurface.status !== 'offline') {
					entry.onlineSupportedExecutionSurfaceIds.add(executionSurface.id);
				}
			}
		}

		const toolEntry = getOrCreateToolEntry(toolEntries, provider?.launcher ?? '');

		if (toolEntry) {
			toolEntry.executionSurfaceIds.add(executionSurface.id);

			if (executionSurface.status !== 'offline') {
				toolEntry.onlineExecutionSurfaceIds.add(executionSurface.id);
			}
		}
	}

	return {
		projectSkills: [...data.projects]
			.map((project) => {
				const installedSkills = listInstalledCodexSkills(project.projectRootFolder);
				const installedSkillNames = new Set(
					installedSkills
						.map((skill) => normalizeExecutionRequirementName(skill.id))
						.filter((skillName): skillName is string => Boolean(skillName))
				);
				const requestedSkillEntries = new Map<
					string,
					{
						id: string;
						requestingTaskIds: Set<string>;
					}
				>();

				for (const task of data.tasks.filter((candidate) => candidate.projectId === project.id)) {
					for (const promptSkillName of task.requiredPromptSkillNames ?? []) {
						const normalizedSkillName = normalizeExecutionRequirementName(promptSkillName);

						if (!normalizedSkillName) {
							continue;
						}

						const existingEntry = requestedSkillEntries.get(normalizedSkillName) ?? {
							id: promptSkillName.trim(),
							requestingTaskIds: new Set<string>()
						};
						existingEntry.requestingTaskIds.add(task.id);
						requestedSkillEntries.set(normalizedSkillName, existingEntry);
					}
				}

				const missingRequestedSkillEntries = [...requestedSkillEntries.entries()]
					.filter(([normalizedSkillName]) => !installedSkillNames.has(normalizedSkillName))
					.map(([, entry]) => entry);
				const missingRequestedSkills = missingRequestedSkillEntries
					.map((entry) => ({
						id: entry.id,
						requestingTaskCount: entry.requestingTaskIds.size
					}))
					.sort(
						(left, right) =>
							right.requestingTaskCount - left.requestingTaskCount ||
							left.id.localeCompare(right.id)
					);
				const requestingTaskCount = new Set(
					[...requestedSkillEntries.values()].flatMap((entry) => [...entry.requestingTaskIds])
				).size;
				const tasksMissingRequestedSkillCount = new Set(
					missingRequestedSkillEntries.flatMap((entry) => [...entry.requestingTaskIds])
				).size;

				return {
					projectId: project.id,
					projectName: project.name,
					projectHref: `/app/projects/${project.id}`,
					totalCount: installedSkills.length,
					projectCount: installedSkills.filter((skill) => skill.project).length,
					globalCount: installedSkills.filter((skill) => skill.global).length,
					requestedSkillCount: requestedSkillEntries.size,
					requestingTaskCount,
					missingRequestedSkillCount: missingRequestedSkills.length,
					tasksMissingRequestedSkillCount,
					missingRequestedSkills: missingRequestedSkills.slice(0, 8),
					installedSkills: installedSkills.map((skill) => ({
						id: skill.id,
						sourceLabel: skill.sourceLabel
					})),
					previewSkills: installedSkills.slice(0, 8).map((skill) => ({
						id: skill.id,
						sourceLabel: skill.sourceLabel
					}))
				};
			})
			.sort(
				(left, right) =>
					right.totalCount - left.totalCount || left.projectName.localeCompare(right.projectName)
			),
		capabilities: finalizeCapabilityEntries(capabilityEntries),
		tools: finalizeToolEntries(toolEntries)
	};
}
