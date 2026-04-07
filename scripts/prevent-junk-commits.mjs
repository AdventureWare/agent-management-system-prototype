import { spawnSync } from 'node:child_process';

const forbiddenPatterns = [
	{
		pattern: /^\.playwright-cli\//,
		reason: 'Playwright CLI captures are local debugging artifacts.'
	},
	{
		pattern: /^output\/playwright\//,
		reason: 'Playwright output images should stay local.'
	},
	{
		pattern: /^agent_output\//,
		reason: 'Agent output is generated scratch content.'
	},
	{
		pattern: /^test-results\//,
		reason: 'Test result bundles are generated artifacts.'
	},
	{
		pattern: /^playwright-report\//,
		reason: 'Playwright HTML reports are generated artifacts.'
	},
	{
		pattern: /^screenshots\//,
		reason: 'Ad hoc screenshots should stay local unless intentionally moved elsewhere.'
	}
];

const staged = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], {
	encoding: 'utf8'
});

if (staged.status !== 0) {
	process.stderr.write(staged.stderr || 'Failed to inspect staged files.\n');
	process.exit(staged.status ?? 1);
}

const files = staged.stdout.split('\0').filter(Boolean);
const blocked = files
	.map((file) => {
		const rule = forbiddenPatterns.find(({ pattern }) => pattern.test(file));
		return rule ? { file, reason: rule.reason } : null;
	})
	.filter(Boolean);

if (blocked.length === 0) {
	process.exit(0);
}

process.stderr.write('\nCommit blocked: staged artifact files detected.\n');
for (const { file, reason } of blocked) {
	process.stderr.write(`- ${file}: ${reason}\n`);
}

process.stderr.write(
	'\nIf one of these files is intentional, move it to a non-artifact path first.\n'
);
process.stderr.write('To unstage them: git restore --staged <path>...\n');
process.exit(1);
