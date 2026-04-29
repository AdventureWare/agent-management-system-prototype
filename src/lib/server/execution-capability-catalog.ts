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
		description: string;
		global: boolean;
		project: boolean;
		sourceLabel: string;
		availability: 'default' | 'enabled' | 'disabled';
		availabilityLabel: string;
		availabilityNotes: string;
	}>;
	previewSkills: Array<{
		id: string;
		description: string;
		global: boolean;
		project: boolean;
		sourceLabel: string;
		availability: 'default' | 'enabled' | 'disabled';
		availabilityLabel: string;
		availabilityNotes: string;
	}>;
};

export type SkillAvailabilityCatalogEntry = {
	id: string;
	description: string;
	availableProjectCount: number;
	projectLocalProjectCount: number;
	globalProjectCount: number;
	requestedProjectCount: number;
	requestingTaskCount: number;
	missingProjectCount: number;
	tasksMissingRequestedSkillCount: number;
	projects: Array<{
		projectId: string;
		projectName: string;
		projectHref: string;
		installed: boolean;
		projectLocal: boolean;
		global: boolean;
		sourceLabel: string;
		description: string;
		availability: 'default' | 'enabled' | 'disabled';
		availabilityLabel: string;
		availabilityNotes: string;
		requestingTaskCount: number;
		missing: boolean;
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
	skills: SkillAvailabilityCatalogEntry[];
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

function getProjectSkillAvailabilityPolicy(
	project: Pick<ControlPlaneData['projects'][number], 'skillAvailabilityPolicies'>,
	skillId: string
) {
	const normalizedSkillId = normalizeExecutionRequirementName(skillId);

	return (
		project.skillAvailabilityPolicies?.find(
			(policy) => normalizeExecutionRequirementName(policy.skillId) === normalizedSkillId
		) ?? null
	);
}

function getProjectSkillAvailabilityLabel(input: {
	availability: 'default' | 'enabled' | 'disabled';
	project: boolean;
	global: boolean;
	installed: boolean;
}) {
	if (input.availability === 'enabled') {
		return 'Enabled for project';
	}

	if (input.availability === 'disabled') {
		return 'Disabled for project';
	}

	if (input.project) {
		return 'Project-local';
	}

	if (input.global) {
		return 'Inherited global';
	}

	return input.installed ? 'Available' : 'Default';
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

	const projectSkills = [...data.projects]
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
						right.requestingTaskCount - left.requestingTaskCount || left.id.localeCompare(right.id)
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
					description: skill.description,
					global: skill.global,
					project: skill.project,
					sourceLabel: skill.sourceLabel,
					availability:
						getProjectSkillAvailabilityPolicy(project, skill.id)?.availability ?? 'default',
					availabilityLabel: getProjectSkillAvailabilityLabel({
						availability:
							getProjectSkillAvailabilityPolicy(project, skill.id)?.availability ?? 'default',
						project: skill.project,
						global: skill.global,
						installed: true
					}),
					availabilityNotes: getProjectSkillAvailabilityPolicy(project, skill.id)?.notes ?? ''
				})),
				previewSkills: installedSkills.slice(0, 8).map((skill) => ({
					id: skill.id,
					description: skill.description,
					global: skill.global,
					project: skill.project,
					sourceLabel: skill.sourceLabel,
					availability:
						getProjectSkillAvailabilityPolicy(project, skill.id)?.availability ?? 'default',
					availabilityLabel: getProjectSkillAvailabilityLabel({
						availability:
							getProjectSkillAvailabilityPolicy(project, skill.id)?.availability ?? 'default',
						project: skill.project,
						global: skill.global,
						installed: true
					}),
					availabilityNotes: getProjectSkillAvailabilityPolicy(project, skill.id)?.notes ?? ''
				}))
			};
		})
		.sort(
			(left, right) =>
				right.totalCount - left.totalCount || left.projectName.localeCompare(right.projectName)
		);

	const skillsById = new Map<string, SkillAvailabilityCatalogEntry>();

	for (const project of projectSkills) {
		const requestedSkillsById = new Map<string, { id: string; requestingTaskCount: number }>();
		const requestingTaskIdsBySkillId = new Map<string, Set<string>>();

		for (const task of data.tasks.filter(
			(candidate) => candidate.projectId === project.projectId
		)) {
			for (const skillName of task.requiredPromptSkillNames ?? []) {
				const normalizedSkillName = normalizeExecutionRequirementName(skillName);

				if (!normalizedSkillName) {
					continue;
				}

				const requestingTaskIds = requestingTaskIdsBySkillId.get(normalizedSkillName) ?? new Set();
				requestingTaskIds.add(task.id);
				requestingTaskIdsBySkillId.set(normalizedSkillName, requestingTaskIds);
				requestedSkillsById.set(normalizedSkillName, {
					id: skillName.trim(),
					requestingTaskCount: requestingTaskIds.size
				});
			}
		}

		for (const installedSkill of project.installedSkills) {
			const normalizedSkillName = normalizeExecutionRequirementName(installedSkill.id);

			if (!normalizedSkillName) {
				continue;
			}

			const entry =
				skillsById.get(normalizedSkillName) ??
				({
					id: installedSkill.id,
					description: installedSkill.description,
					availableProjectCount: 0,
					projectLocalProjectCount: 0,
					globalProjectCount: 0,
					requestedProjectCount: 0,
					requestingTaskCount: 0,
					missingProjectCount: 0,
					tasksMissingRequestedSkillCount: 0,
					projects: []
				} satisfies SkillAvailabilityCatalogEntry);
			const requestedSkill = requestedSkillsById.get(normalizedSkillName);

			entry.projects.push({
				projectId: project.projectId,
				projectName: project.projectName,
				projectHref: project.projectHref,
				installed: true,
				projectLocal: installedSkill.project,
				global: installedSkill.global,
				sourceLabel: installedSkill.sourceLabel,
				description: installedSkill.description,
				availability: installedSkill.availability,
				availabilityLabel: installedSkill.availabilityLabel,
				availabilityNotes: installedSkill.availabilityNotes,
				requestingTaskCount: requestedSkill?.requestingTaskCount ?? 0,
				missing: false
			});
			skillsById.set(normalizedSkillName, entry);
			requestedSkillsById.delete(normalizedSkillName);
		}

		for (const missingSkill of requestedSkillsById.values()) {
			const normalizedSkillName = normalizeExecutionRequirementName(missingSkill.id);

			if (!normalizedSkillName) {
				continue;
			}

			const entry =
				skillsById.get(normalizedSkillName) ??
				({
					id: missingSkill.id,
					description: '',
					availableProjectCount: 0,
					projectLocalProjectCount: 0,
					globalProjectCount: 0,
					requestedProjectCount: 0,
					requestingTaskCount: 0,
					missingProjectCount: 0,
					tasksMissingRequestedSkillCount: 0,
					projects: []
				} satisfies SkillAvailabilityCatalogEntry);

			entry.projects.push({
				projectId: project.projectId,
				projectName: project.projectName,
				projectHref: project.projectHref,
				installed: false,
				projectLocal: false,
				global: false,
				sourceLabel: 'Missing',
				description: '',
				availability: 'default',
				availabilityLabel: 'Missing',
				availabilityNotes: '',
				requestingTaskCount: missingSkill.requestingTaskCount,
				missing: true
			});
			skillsById.set(normalizedSkillName, entry);
		}
	}

	const skills = [...skillsById.values()]
		.map((skill) => {
			const availableProjects = skill.projects.filter((project) => project.installed);
			const requestedProjects = skill.projects.filter((project) => project.requestingTaskCount > 0);
			const missingProjects = skill.projects.filter((project) => project.missing);

			return {
				...skill,
				description:
					skill.description ||
					availableProjects.find((project) => project.description)?.description ||
					'No installed skill description recorded.',
				availableProjectCount: availableProjects.length,
				projectLocalProjectCount: availableProjects.filter((project) => project.projectLocal)
					.length,
				globalProjectCount: availableProjects.filter((project) => project.global).length,
				requestedProjectCount: requestedProjects.length,
				requestingTaskCount: requestedProjects.reduce(
					(total, project) => total + project.requestingTaskCount,
					0
				),
				missingProjectCount: missingProjects.length,
				tasksMissingRequestedSkillCount: missingProjects.reduce(
					(total, project) => total + project.requestingTaskCount,
					0
				),
				projects: [...skill.projects].sort(
					(left, right) =>
						Number(right.missing) - Number(left.missing) ||
						Number(right.installed) - Number(left.installed) ||
						right.requestingTaskCount - left.requestingTaskCount ||
						left.projectName.localeCompare(right.projectName)
				)
			};
		})
		.sort(
			(left, right) =>
				right.missingProjectCount - left.missingProjectCount ||
				right.requestingTaskCount - left.requestingTaskCount ||
				right.availableProjectCount - left.availableProjectCount ||
				left.id.localeCompare(right.id)
		);

	return {
		projectSkills,
		skills,
		capabilities: finalizeCapabilityEntries(capabilityEntries),
		tools: finalizeToolEntries(toolEntries)
	};
}
