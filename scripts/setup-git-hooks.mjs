import { spawnSync } from 'node:child_process';

const insideWorkTree = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
	encoding: 'utf8'
});

if (insideWorkTree.status !== 0 || insideWorkTree.stdout.trim() !== 'true') {
	process.exit(0);
}

const desiredHooksPath = '.githooks';
const currentHooksPath = spawnSync('git', ['config', '--local', '--get', 'core.hooksPath'], {
	encoding: 'utf8'
});

if (currentHooksPath.status === 0 && currentHooksPath.stdout.trim() === desiredHooksPath) {
	process.exit(0);
}

const setHooksPath = spawnSync(
	'git',
	['config', '--local', 'core.hooksPath', desiredHooksPath],
	{ encoding: 'utf8' }
);

if (setHooksPath.status !== 0) {
	process.stderr.write(setHooksPath.stderr || 'Failed to configure git hooks path.\n');
	process.exit(setHooksPath.status ?? 1);
}

process.stdout.write(`Configured git hooks path: ${desiredHooksPath}\n`);
