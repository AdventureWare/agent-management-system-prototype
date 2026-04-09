import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = process.cwd();
const SKIP_ENV_VAR = 'AMS_SKIP_VITE_COMPAT_CHECK';
const viteVersion = readInstalledPackageVersion('vite');

if (process.env[SKIP_ENV_VAR] === '1') {
	process.exit(0);
}

if (!viteVersion) {
	process.exit(0);
}

const viteMajor = parseMajor(viteVersion);

if (viteMajor === null) {
	process.exit(0);
}

const compatibilityChecks = [
	{
		name: '@sveltejs/vite-plugin-svelte',
		range: readPeerDependencyRange('@sveltejs/vite-plugin-svelte', 'vite')
	},
	{
		name: 'vite-plugin-devtools-json',
		range: readPeerDependencyRange('vite-plugin-devtools-json', 'vite')
	}
];

const incompatiblePackages = compatibilityChecks
	.map((check) => {
		if (!check.range) {
			return null;
		}

		const supportedMajors = parseSupportedMajors(check.range);

		if (supportedMajors.length === 0 || supportedMajors.includes(viteMajor)) {
			return null;
		}

		return {
			...check,
			supportedMajors
		};
	})
	.filter(Boolean);

if (incompatiblePackages.length === 0) {
	process.exit(0);
}

const packageSummary = incompatiblePackages
	.map(
		(check) =>
			`- ${check.name} declares vite ${check.range} (supports majors ${check.supportedMajors.join(', ')})`
	)
	.join('\n');

console.error(
	[
		`Unsupported Vite/plugin combination detected in ${REPO_ROOT}.`,
		`Installed vite version: ${viteVersion}`,
		packageSummary,
		'',
		'This repo has already shown optimizer instability with this setup, including heap OOMs during dependency bundling.',
		'Align the installed toolchain before running Vite commands again.',
		'Recommended next step: reinstall with a Vite 7 release, or upgrade the plugins to versions that explicitly support Vite 8.',
		`Set ${SKIP_ENV_VAR}=1 to bypass this check if you intentionally want the experimental setup.`
	].join('\n')
);

process.exit(1);

function readInstalledPackageVersion(packageName) {
	const packageJson = readInstalledPackageJson(packageName);
	return typeof packageJson?.version === 'string' ? packageJson.version : null;
}

function readPeerDependencyRange(packageName, dependencyName) {
	const packageJson = readInstalledPackageJson(packageName);
	const peerDependencies = packageJson?.peerDependencies;

	if (!peerDependencies || typeof peerDependencies !== 'object') {
		return null;
	}

	const range = peerDependencies[dependencyName];
	return typeof range === 'string' ? range : null;
}

function readInstalledPackageJson(packageName) {
	const packageJsonPath = resolve(REPO_ROOT, 'node_modules', packageName, 'package.json');

	if (!existsSync(packageJsonPath)) {
		return null;
	}

	return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
}

function parseMajor(version) {
	const match = /^(\d+)\./.exec(version);
	return match ? Number.parseInt(match[1] ?? '', 10) : null;
}

function parseSupportedMajors(range) {
	return [...range.matchAll(/\^(\d+)\./g)]
		.map((match) => Number.parseInt(match[1] ?? '', 10))
		.filter(Number.isFinite)
		.filter((value, index, values) => values.indexOf(value) === index)
		.sort((left, right) => left - right);
}
