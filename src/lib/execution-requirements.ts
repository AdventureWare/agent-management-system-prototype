export function normalizeExecutionRequirementName(value: string | null | undefined) {
	return value?.trim().toLowerCase() ?? '';
}

export function parseExecutionRequirementNames(value: string | null | undefined) {
	return [
		...new Set(
			(value ?? '')
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean)
		)
	];
}

export function appendExecutionRequirementName(
	currentValue: string | null | undefined,
	nextName: string
) {
	const normalizedNextName = normalizeExecutionRequirementName(nextName);

	if (!normalizedNextName) {
		return currentValue?.trim() ?? '';
	}

	const names = parseExecutionRequirementNames(currentValue);

	if (names.some((name) => normalizeExecutionRequirementName(name) === normalizedNextName)) {
		return names.join(', ');
	}

	return [...names, nextName.trim()].join(', ');
}

export function findUnknownExecutionRequirementNames(
	value: string | null | undefined,
	knownNames: string[]
) {
	const knownNameKeys = new Set(knownNames.map((name) => normalizeExecutionRequirementName(name)));

	return parseExecutionRequirementNames(value).filter(
		(name) => !knownNameKeys.has(normalizeExecutionRequirementName(name))
	);
}
