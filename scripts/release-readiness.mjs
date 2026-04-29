#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

function printHelp() {
	process.stdout.write(
		[
			'Usage: node scripts/release-readiness.mjs --feature <name> [options]',
			'',
			'Options:',
			'  --feature <name>              Feature or slice being evaluated',
			'  --scope <path>                Path considered part of the feature slice; repeatable',
			'  --feature-validation <text>   Feature-specific validation result; repeatable',
			'  --repo-gate <text>            Repo-wide gate result; repeatable',
			'  --blocker <text>              Known release blocker; repeatable',
			'  --note <text>                 Additional note; repeatable',
			'  --output <path>               Write markdown report to a file',
			'  --help                        Show this help',
			'',
			'Example:',
			'  node scripts/release-readiness.mjs --feature "Task detail editor" --scope src/lib/components/tasks --feature-validation "task detail spec passed" --repo-gate "npm run check passed"'
		].join('\n') + '\n'
	);
}

function parseArgs(argv) {
	const options = {
		feature: '',
		scopes: [],
		featureValidations: [],
		repoGates: [],
		blockers: [],
		notes: [],
		output: ''
	};

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];

		if (token === '--help' || token === '-h') {
			options.help = true;
			continue;
		}

		const next = argv[index + 1];

		if (!next || next.startsWith('--')) {
			throw new Error(`Missing value for ${token}.`);
		}

		switch (token) {
			case '--feature':
				options.feature = next;
				break;
			case '--scope':
				options.scopes.push(next);
				break;
			case '--feature-validation':
				options.featureValidations.push(next);
				break;
			case '--repo-gate':
				options.repoGates.push(next);
				break;
			case '--blocker':
				options.blockers.push(next);
				break;
			case '--note':
				options.notes.push(next);
				break;
			case '--output':
				options.output = next;
				break;
			default:
				throw new Error(`Unknown option: ${token}.`);
		}

		index += 1;
	}

	return options;
}

function gitStatusRows() {
	const output = execFileSync('git', ['status', '--porcelain'], {
		encoding: 'utf8'
	}).trimEnd();

	if (!output) {
		return [];
	}

	return output.split('\n').map((line) => {
		const status = line.slice(0, 2);
		const filePath = line.slice(3).trim();
		const normalizedPath = filePath.includes(' -> ')
			? (filePath.split(' -> ').at(-1) ?? filePath)
			: filePath;

		return {
			status: formatGitStatus(status),
			path: normalizedPath
		};
	});
}

function formatGitStatus(status) {
	switch (status) {
		case '??':
			return 'untracked';
		case ' M':
		case 'M ':
		case 'MM':
			return 'modified';
		case 'A ':
		case ' A':
			return 'added';
		case 'D ':
		case ' D':
			return 'deleted';
		case 'R ':
		case ' R':
			return 'renamed';
		default:
			return status.trim() || status;
	}
}

function normalizeScope(scope) {
	return relative(process.cwd(), resolve(process.cwd(), scope)).replaceAll('\\', '/');
}

function pathIsInScope(filePath, scopes) {
	if (scopes.length === 0) {
		return false;
	}

	return scopes.some((scope) => filePath === scope || filePath.startsWith(`${scope}/`));
}

function bulletList(items, fallback) {
	if (items.length === 0) {
		return [`- ${fallback}`];
	}

	return items.map((item) => `- ${item}`);
}

function renderReport(options) {
	const statusRows = gitStatusRows();
	const scopes = options.scopes.map(normalizeScope);
	const scopedChanges = statusRows.filter((row) => pathIsInScope(row.path, scopes));
	const outsideScopeChanges =
		scopes.length === 0 ? statusRows : statusRows.filter((row) => !pathIsInScope(row.path, scopes));
	const branchBlockers = [
		...options.blockers,
		...(outsideScopeChanges.length > 0
			? [
					`${outsideScopeChanges.length} worktree change(s) fall outside the declared feature scope.`
				]
			: [])
	];
	const featureReady = options.featureValidations.length > 0;
	const branchReady =
		branchBlockers.length === 0 && options.repoGates.length > 0 && outsideScopeChanges.length === 0;
	const timestamp = new Date().toISOString();

	return [
		`# Release Readiness: ${options.feature}`,
		'',
		`Generated: ${timestamp}`,
		'',
		'## Feature Readiness',
		'',
		`Status: ${featureReady ? 'Ready based on recorded feature validations' : 'Needs recorded feature validation'}`,
		'',
		...bulletList(
			options.featureValidations,
			'No feature-specific validation was recorded. Add targeted tests, manual verification, or acceptance proof before treating the feature as ready.'
		),
		'',
		'## Branch Readiness',
		'',
		`Status: ${branchReady ? 'Ready based on recorded repo gates and clean declared scope' : 'Not ready until branch-level blockers are resolved or explicitly accepted'}`,
		'',
		'### Repo Gates',
		'',
		...bulletList(
			options.repoGates,
			'No repo-wide gate was recorded. Run or explicitly waive checks such as `npm run check`, targeted tests, `npm run build`, or `npm run lint`.'
		),
		'',
		'### Branch Blockers',
		'',
		...bulletList(
			branchBlockers,
			'No branch-level blockers were detected from the declared scope.'
		),
		'',
		'## Worktree Scope',
		'',
		`Declared scope: ${scopes.length > 0 ? scopes.map((scope) => `\`${scope}\``).join(', ') : 'none'}`,
		'',
		'### In Scope',
		'',
		...bulletList(
			scopedChanges.map((row) => `\`${row.status}\` ${row.path}`),
			'No changed files matched the declared scope.'
		),
		'',
		'### Outside Scope',
		'',
		...bulletList(
			outsideScopeChanges.map((row) => `\`${row.status}\` ${row.path}`),
			'No changed files outside the declared scope.'
		),
		'',
		'## Notes',
		'',
		...bulletList(options.notes, 'No additional notes recorded.'),
		'',
		'## Decision',
		'',
		featureReady && branchReady
			? 'The feature and branch are both ready based on the recorded evidence.'
			: 'Do not treat feature readiness as branch readiness. Resolve or explicitly accept branch blockers before shipping.',
		''
	].join('\n');
}

try {
	const options = parseArgs(process.argv.slice(2));

	if (options.help) {
		printHelp();
		process.exit(0);
	}

	if (!options.feature.trim()) {
		throw new Error('--feature is required.');
	}

	const report = renderReport({
		...options,
		feature: options.feature.trim()
	});

	if (options.output) {
		const outputPath = resolve(process.cwd(), options.output);
		mkdirSync(dirname(outputPath), { recursive: true });
		writeFileSync(outputPath, report);
		process.stdout.write(`${outputPath}\n`);
	} else {
		process.stdout.write(report);
	}
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exit(1);
}
