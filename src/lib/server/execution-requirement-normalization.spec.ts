import { describe, expect, it } from 'vitest';
import { canonicalizeExecutionRequirementNames } from '$lib/execution-requirements';

describe('canonicalizeExecutionRequirementNames', () => {
	it('reuses canonical inventory names and de-duplicates matches', () => {
		expect(
			canonicalizeExecutionRequirementNames(
				['planning', 'Planning', 'citations', 'custom label'],
				['Planning', 'Citations']
			)
		).toEqual(['Planning', 'Citations', 'custom label']);
	});
});
