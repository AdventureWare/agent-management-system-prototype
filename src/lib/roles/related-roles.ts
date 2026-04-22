type RelatedRoleInput = {
	id: string;
	name: string;
	area?: string;
	family?: string;
	description?: string;
	skillIds?: string[];
	toolIds?: string[];
	mcpIds?: string[];
	systemPrompt?: string;
	taskCount?: number;
};

export type RelatedRole<T extends RelatedRoleInput> = {
	role: T;
	score: number;
	reason: string;
	purposeSummary: string;
	contrastSummary: string;
};

function sharedValues(left?: string[], right?: string[]) {
	const rightValues = new Set(right ?? []);
	return [...new Set(left ?? [])].filter((value) => rightValues.has(value));
}

function formatSharedValueSummary(label: string, values: string[]) {
	const visibleValues = values.slice(0, 2);
	const remainderCount = values.length - visibleValues.length;

	return `${label}: ${visibleValues.join(', ')}${remainderCount > 0 ? ` +${remainderCount} more` : ''}`;
}

function uniqueValues(left?: string[], right?: string[]) {
	const leftValues = new Set(left ?? []);
	return [...new Set(right ?? [])].filter((value) => !leftValues.has(value));
}

function formatUniqueValueSummary(label: string, values: string[]) {
	const visibleValues = values.slice(0, 2);
	const remainderCount = values.length - visibleValues.length;

	return `${label}: ${visibleValues.join(', ')}${remainderCount > 0 ? ` +${remainderCount} more` : ''}`;
}

export function formatRoleAreaLabel(area?: string) {
	const normalizedArea = area?.trim();

	switch (normalizedArea) {
		case 'product':
			return 'Product';
		case 'growth':
			return 'Growth';
		case 'ops':
			return 'Ops';
		case 'shared':
			return 'Shared';
		case '':
		case undefined:
			return 'Other';
		default:
			return normalizedArea
				.split(/[-_\s]+/)
				.filter(Boolean)
				.map((segment) => `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`)
				.join(' ');
	}
}

export function summarizeRolePurpose(description?: string) {
	const normalized = description?.replace(/\s+/g, ' ').trim() ?? '';

	if (!normalized) {
		return 'No role description recorded.';
	}

	const firstSentenceMatch = normalized.match(/^(.+?[.!?])(?:\s|$)/);
	const summary = firstSentenceMatch?.[1] ?? normalized;

	if (summary.length <= 120) {
		return summary;
	}

	return `${summary.slice(0, 117).trimEnd()}...`;
}

function buildRelatedRole<T extends RelatedRoleInput>(source: T, candidate: T): RelatedRole<T> {
	const sharedSkillValues = sharedValues(source.skillIds, candidate.skillIds);
	const sharedToolValues = sharedValues(source.toolIds, candidate.toolIds);
	const sharedMcpValues = sharedValues(source.mcpIds, candidate.mcpIds);
	const candidateUniqueSkillValues = uniqueValues(source.skillIds, candidate.skillIds);
	const candidateUniqueToolValues = uniqueValues(source.toolIds, candidate.toolIds);
	const candidateUniqueMcpValues = uniqueValues(source.mcpIds, candidate.mcpIds);
	const sameArea = Boolean(source.area && candidate.area && source.area === candidate.area);
	const sameFamily = Boolean(
		source.family &&
		candidate.family &&
		source.family.toLowerCase() === candidate.family.toLowerCase()
	);
	const sharedPrompt = Boolean(source.systemPrompt?.trim() && candidate.systemPrompt?.trim());
	let score = 0;
	const reasons: string[] = [];

	if (sameFamily) {
		score += 6;
		reasons.push(`Same family${candidate.family?.trim() ? `: ${candidate.family.trim()}` : ''}`);
	}

	if (sameArea) {
		score += 3;
		reasons.push(`Same ${formatRoleAreaLabel(candidate.area)} area`);
	}

	if (sharedSkillValues.length > 0) {
		score += sharedSkillValues.length * 3;
		reasons.push(formatSharedValueSummary('Skills', sharedSkillValues));
	}

	if (sharedToolValues.length > 0) {
		score += sharedToolValues.length * 2;
		reasons.push(formatSharedValueSummary('Tools', sharedToolValues));
	}

	if (sharedMcpValues.length > 0) {
		score += sharedMcpValues.length * 2;
		reasons.push(formatSharedValueSummary('MCPs', sharedMcpValues));
	}

	if (sharedPrompt) {
		score += 1;
		reasons.push('Both add prompt guidance');
	}

	if ((candidate.taskCount ?? 0) > 0) {
		score += 1;
	}

	const contrastSegments: string[] = [];

	if (!sameFamily && candidate.family?.trim()) {
		contrastSegments.push(`Different family: ${candidate.family.trim()}`);
	}

	if (!sameArea && candidate.area?.trim()) {
		contrastSegments.push(`Different area: ${formatRoleAreaLabel(candidate.area)}`);
	}

	if (candidateUniqueSkillValues.length > 0) {
		contrastSegments.push(formatUniqueValueSummary('Adds skills', candidateUniqueSkillValues));
	}

	if (candidateUniqueToolValues.length > 0) {
		contrastSegments.push(formatUniqueValueSummary('Adds tools', candidateUniqueToolValues));
	}

	if (candidateUniqueMcpValues.length > 0) {
		contrastSegments.push(formatUniqueValueSummary('Adds MCPs', candidateUniqueMcpValues));
	}

	return {
		role: candidate,
		score,
		reason: reasons.join(' · ') || 'Related role',
		purposeSummary: summarizeRolePurpose(candidate.description),
		contrastSummary: contrastSegments.join(' · ') || 'Different purpose emphasis.'
	};
}

export function buildRelatedRoles<T extends RelatedRoleInput>(
	source: T,
	roles: T[],
	limit = 4
): RelatedRole<T>[] {
	return roles
		.filter((role) => role.id !== source.id)
		.map((role) => buildRelatedRole(source, role))
		.filter((candidate) => candidate.score > 0)
		.sort(
			(left, right) => right.score - left.score || left.role.name.localeCompare(right.role.name)
		)
		.slice(0, limit);
}
