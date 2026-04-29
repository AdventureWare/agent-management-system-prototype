import { randomUUID } from 'node:crypto';
import { updateControlPlaneCollections } from '$lib/server/control-plane';
import type { ProjectSkillAvailability } from '$lib/types/control-plane';

export function parseProjectSkillAvailability(value: string): ProjectSkillAvailability {
	if (value === 'enabled' || value === 'disabled') {
		return value;
	}

	return 'default';
}

export async function updateProjectSkillAvailabilityPolicy(input: {
	projectId: string;
	skillId: string;
	availability: ProjectSkillAvailability;
	notes: string;
}) {
	let projectFound = false;
	const changedAt = new Date().toISOString();

	await updateControlPlaneCollections((data) => ({
		data: {
			...data,
			projects: data.projects.map((project) => {
				if (project.id !== input.projectId) {
					return project;
				}

				projectFound = true;
				const nextPolicies = (project.skillAvailabilityPolicies ?? []).filter(
					(policy) => policy.skillId.toLowerCase() !== input.skillId.toLowerCase()
				);

				if (input.availability !== 'default' || input.notes) {
					nextPolicies.push({
						skillId: input.skillId,
						availability: input.availability,
						notes: input.notes,
						updatedAt: changedAt
					});
				}

				return {
					...project,
					skillAvailabilityPolicies: nextPolicies.sort((left, right) =>
						left.skillId.localeCompare(right.skillId)
					),
					skillAvailabilityPolicyEvents: [
						{
							id: `skill_availability_event_${randomUUID()}`,
							skillId: input.skillId,
							availability: input.availability,
							notes: input.notes,
							changedAt
						},
						...(project.skillAvailabilityPolicyEvents ?? [])
					].slice(0, 50)
				};
			})
		},
		changedCollections: ['projects']
	}));

	if (!projectFound) {
		throw new Error('Project not found.');
	}

	return {
		projectId: input.projectId,
		skillId: input.skillId,
		availability: input.availability
	};
}
