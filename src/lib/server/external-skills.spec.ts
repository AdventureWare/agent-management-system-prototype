import { describe, expect, it } from 'vitest';
import {
	inferExternalSkillIdFromPackageSpec,
	parseExternalSkillSearchOutput,
	sanitizeExternalSkillsOutput
} from './external-skills';

describe('parseExternalSkillSearchOutput', () => {
	it('extracts package specs and URLs from skills CLI output', () => {
		const results = parseExternalSkillSearchOutput(`
Install with npx skills add <owner/repo@skill>

vercel-labs/agent-skills@vercel-react-best-practices
└ https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices

openai/agent-skills@docs-writer
└ https://skills.sh/openai/agent-skills/docs-writer
`);

		expect(results).toEqual([
			{
				packageSpec: 'vercel-labs/agent-skills@vercel-react-best-practices',
				url: 'https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices',
				installCountLabel: null
			},
			{
				packageSpec: 'openai/agent-skills@docs-writer',
				url: 'https://skills.sh/openai/agent-skills/docs-writer',
				installCountLabel: null
			}
		]);
	});

	it('parses package specs that include trailing install-count text', () => {
		const results = parseExternalSkillSearchOutput(`
vercel-labs/agent-skills@vercel-react-best-practices 261.1K installs
https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices
`);

		expect(results).toEqual([
			{
				packageSpec: 'vercel-labs/agent-skills@vercel-react-best-practices',
				url: 'https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices',
				installCountLabel: '261.1K'
			}
		]);
	});

	it('returns an empty list when no package specs are present', () => {
		expect(parseExternalSkillSearchOutput('No results found.')).toEqual([]);
	});
});

describe('sanitizeExternalSkillsOutput', () => {
	it('strips ANSI color codes before display or parsing', () => {
		expect(
			sanitizeExternalSkillsOutput(
				'\u001b[38;5;145mvercel-labs/agent-skills@docs-writer\u001b[0m 261 installs'
			)
		).toBe('vercel-labs/agent-skills@docs-writer 261 installs');
	});
});

describe('inferExternalSkillIdFromPackageSpec', () => {
	it('infers the requested skill id from an external package spec', () => {
		expect(
			inferExternalSkillIdFromPackageSpec('vercel-labs/agent-skills@vercel-react-best-practices')
		).toBe('vercel-react-best-practices');
	});

	it('returns null when the package spec does not name a skill segment', () => {
		expect(inferExternalSkillIdFromPackageSpec('vercel-labs/agent-skills')).toBeNull();
	});
});
