import { execFile, spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, relative } from 'node:path';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';
import { normalizePathInput } from '$lib/server/path-tools';
import type {
	ArtifactBrowserData,
	ArtifactDirectoryEntry,
	ArtifactEntryKind,
	ArtifactKnownOutput
} from '$lib/types/artifacts';

type ArtifactKnownOutputInput = {
	label: string;
	path: string;
	href?: string | null;
	description?: string;
};

type ArtifactDiffPreview = {
	status: 'ready' | 'empty' | 'unavailable';
	diffText: string;
	message: string;
	comparedAgainst: string | null;
};

type BuildArtifactBrowserInput = {
	rootPath: string;
	knownOutputs?: ArtifactKnownOutputInput[];
	maxEntries?: number;
	rootFileLabel?: string;
};

type ArtifactEditorLaunchCommand = {
	label: string;
	command: string;
	args: string[];
};

const execFileAsync = promisify(execFile);
const ARTIFACT_TEXT_EXTENSIONS = new Set([
	'md',
	'markdown',
	'txt',
	'log',
	'yml',
	'yaml',
	'svelte',
	'ts',
	'tsx',
	'js',
	'jsx',
	'json',
	'css',
	'html',
	'xml',
	'sh'
]);
const ARTIFACT_EDITOR_PREFERENCES = new Set(['auto', 'code', 'cursor', 'zed', 'system']);

function normalizeArtifactEditorPreference(value: unknown) {
	if (typeof value !== 'string') {
		return 'auto';
	}

	const normalized = value.trim().toLowerCase();
	return ARTIFACT_EDITOR_PREFERENCES.has(normalized)
		? (normalized as 'auto' | 'code' | 'cursor' | 'zed' | 'system')
		: 'auto';
}

function getArtifactEntryKind(stats: Awaited<ReturnType<typeof stat>>): ArtifactEntryKind {
	if (stats.isDirectory()) {
		return 'directory';
	}

	if (stats.isFile()) {
		return 'file';
	}

	return 'other';
}

function getPathExtension(path: string, kind: ArtifactEntryKind) {
	return kind === 'file' ? extname(path).slice(1).toLowerCase() : '';
}

async function inspectArtifactPath(path: string) {
	try {
		const details = await stat(path);
		const kind = getArtifactEntryKind(details);

		return {
			exists: true,
			kind,
			sizeBytes: kind === 'file' ? details.size : null
		} as const;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return {
				exists: false,
				kind: 'other',
				sizeBytes: null
			} as const;
		}

		throw error;
	}
}

export async function inspectArtifactPathStatus(pathInput: string) {
	const path = normalizePathInput(pathInput);

	if (!path) {
		throw new Error('Path is required.');
	}

	if (!isAbsolute(path)) {
		throw new Error('Use an absolute path.');
	}

	const inspection = await inspectArtifactPath(path);

	return {
		path,
		exists: inspection.exists,
		kind: inspection.kind,
		sizeBytes: inspection.sizeBytes
	} as const;
}

async function buildKnownOutput(input: ArtifactKnownOutputInput): Promise<ArtifactKnownOutput> {
	const path = normalizePathInput(input.path);

	if (!path) {
		return {
			label: input.label,
			path: '',
			kind: 'other',
			extension: '',
			sizeBytes: null,
			exists: false,
			href: null,
			description: input.description ?? 'Path not configured.'
		};
	}

	try {
		const inspection = await inspectArtifactPath(path);

		return {
			label: input.label,
			path,
			kind: inspection.kind,
			extension: getPathExtension(path, inspection.kind),
			sizeBytes: inspection.sizeBytes,
			exists: inspection.exists,
			href: inspection.exists && inspection.kind === 'file' ? (input.href ?? null) : null,
			description:
				input.description ??
				(inspection.exists ? 'Recorded output.' : 'Recorded output is missing from disk.')
		};
	} catch {
		return {
			label: input.label,
			path,
			kind: 'other',
			extension: '',
			sizeBytes: null,
			exists: false,
			href: null,
			description: input.description ?? 'Output could not be inspected.'
		};
	}
}

async function listDirectoryEntries(
	path: string,
	maxEntries: number
): Promise<{ entries: ArtifactDirectoryEntry[]; truncated: boolean }> {
	const allEntries = await readdir(path, { withFileTypes: true });
	const sortedEntries = [...allEntries].sort((left, right) => {
		const leftRank = left.isDirectory() ? 0 : left.isFile() ? 1 : 2;
		const rightRank = right.isDirectory() ? 0 : right.isFile() ? 1 : 2;

		if (leftRank !== rightRank) {
			return leftRank - rightRank;
		}

		return left.name.localeCompare(right.name);
	});
	const visibleEntries = sortedEntries.slice(0, maxEntries);
	const entries = await Promise.all(
		visibleEntries.map(async (entry) => {
			const entryPath = `${path}/${entry.name}`;
			const inspection = await inspectArtifactPath(entryPath);

			return {
				name: entry.name,
				path: entryPath,
				kind: inspection.kind,
				extension: getPathExtension(entryPath, inspection.kind),
				sizeBytes: inspection.sizeBytes
			} satisfies ArtifactDirectoryEntry;
		})
	);

	return {
		entries,
		truncated: sortedEntries.length > maxEntries
	};
}

async function parentDirectoryIfReadable(path: string) {
	const parentPath = dirname(path);

	if (!parentPath || parentPath === path) {
		return null;
	}

	try {
		const parentStats = await stat(parentPath);
		return parentStats.isDirectory() ? parentPath : null;
	} catch {
		return null;
	}
}

export async function buildArtifactBrowser(
	input: BuildArtifactBrowserInput
): Promise<ArtifactBrowserData | null> {
	const rootPath = normalizePathInput(input.rootPath);

	if (!rootPath) {
		return null;
	}

	const maxEntries = input.maxEntries ?? 24;
	const knownOutputInputs = [...(input.knownOutputs ?? [])];
	let browsePath: string | null = null;
	let rootKind!: ArtifactBrowserData['rootKind'];
	let inspectingParentDirectory = false;
	let errorMessage = '';

	try {
		const rootStats = await stat(rootPath);

		if (rootStats.isDirectory()) {
			rootKind = 'directory';
			browsePath = rootPath;
		} else if (rootStats.isFile()) {
			rootKind = 'file';
			browsePath = dirname(rootPath);
			inspectingParentDirectory = browsePath !== rootPath;
		} else {
			rootKind = 'unreadable';
			errorMessage = 'This artifact path is not a regular file or folder.';
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			rootKind = 'missing';
			errorMessage = 'This artifact path is not on disk yet.';
			browsePath = await parentDirectoryIfReadable(rootPath);
			inspectingParentDirectory = browsePath !== null;
		} else {
			rootKind = 'unreadable';
			errorMessage = 'This artifact path could not be inspected.';
		}
	}

	if (input.rootFileLabel && rootKind !== 'directory') {
		knownOutputInputs.unshift({
			label: input.rootFileLabel,
			path: rootPath,
			description: rootKind === 'missing' ? 'Recorded file is missing from disk.' : 'Recorded file.'
		});
	}

	const knownOutputs = await Promise.all(
		knownOutputInputs.map((knownOutput) => buildKnownOutput(knownOutput))
	);

	if (!browsePath) {
		return {
			rootPath,
			rootKind,
			browsePath: null,
			inspectingParentDirectory,
			directoryEntries: [],
			directoryEntriesTruncated: false,
			knownOutputs,
			errorMessage
		};
	}

	try {
		const { entries, truncated } = await listDirectoryEntries(browsePath, maxEntries);

		return {
			rootPath,
			rootKind,
			browsePath,
			inspectingParentDirectory,
			directoryEntries: entries,
			directoryEntriesTruncated: truncated,
			knownOutputs,
			errorMessage
		};
	} catch {
		return {
			rootPath,
			rootKind: 'unreadable',
			browsePath,
			inspectingParentDirectory,
			directoryEntries: [],
			directoryEntriesTruncated: false,
			knownOutputs,
			errorMessage: 'The directory contents could not be listed.'
		};
	}
}

export async function createArtifactDownloadResponse(input: {
	path: string;
	name?: string;
	contentType?: string;
	disposition?: 'attachment' | 'inline';
}) {
	const path = normalizePathInput(input.path);

	if (!path) {
		throw new Error('Path is required.');
	}

	if (!isAbsolute(path)) {
		throw new Error('Use an absolute path.');
	}

	let details;

	try {
		details = await stat(path);
	} catch {
		throw new Error('Artifact file is missing from disk.');
	}

	if (!details.isFile()) {
		throw new Error('Only files can be downloaded.');
	}

	const encodedName = encodeURIComponent(input.name || basename(path));
	const contentType = input.contentType || inferArtifactContentType(path);
	const disposition = input.disposition ?? 'attachment';

	return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, {
		headers: {
			'content-type': contentType,
			'content-length': String(details.size),
			'content-disposition': `${disposition}; filename*=UTF-8''${encodedName}`
		}
	});
}

function formatArtifactEditorLocation(input: {
	path: string;
	line?: number | null;
	column?: number | null;
}) {
	if (!input.line || input.line <= 0) {
		return input.path;
	}

	return `${input.path}:${input.line}${input.column && input.column > 0 ? `:${input.column}` : ''}`;
}

export function buildArtifactEditorLaunchCommands(input: {
	path: string;
	line?: number | null;
	column?: number | null;
	platform?: NodeJS.Platform;
	preferredEditor?: string | null;
}): ArtifactEditorLaunchCommand[] {
	const platform = input.platform ?? process.platform;
	const location = formatArtifactEditorLocation(input);
	const preferredEditor = normalizeArtifactEditorPreference(
		input.preferredEditor ?? process.env.AMS_ARTIFACT_EDITOR
	);
	const platformCommands =
		platform === 'darwin'
			? {
					code: { label: 'VS Code CLI', command: 'code', args: ['-g', location] },
					cursor: { label: 'Cursor CLI', command: 'cursor', args: ['-g', location] },
					zed: { label: 'Zed CLI', command: 'zed', args: ['--goto', location] },
					system: { label: 'macOS open', command: 'open', args: [input.path] }
				}
			: platform === 'win32'
				? {
						code: { label: 'VS Code CLI', command: 'code.cmd', args: ['-g', location] },
						cursor: { label: 'Cursor CLI', command: 'cursor.cmd', args: ['-g', location] },
						zed: { label: 'Zed CLI', command: 'zed', args: ['--goto', location] },
						system: {
							label: 'Windows shell',
							command: 'cmd',
							args: ['/c', 'start', '', input.path]
						}
					}
				: {
						code: { label: 'VS Code CLI', command: 'code', args: ['-g', location] },
						cursor: { label: 'Cursor CLI', command: 'cursor', args: ['-g', location] },
						zed: { label: 'Zed CLI', command: 'zed', args: ['--goto', location] },
						system: { label: 'xdg-open', command: 'xdg-open', args: [input.path] }
					};

	if (preferredEditor === 'auto') {
		return [
			platformCommands.code,
			platformCommands.cursor,
			platformCommands.zed,
			platformCommands.system
		];
	}

	return [platformCommands[preferredEditor]];
}

async function runArtifactEditorCommand(command: ArtifactEditorLaunchCommand) {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(command.command, command.args, {
			stdio: 'ignore',
			detached: true
		});
		let settled = false;

		const resolveOnce = () => {
			if (settled) {
				return;
			}

			settled = true;
			child.unref();
			resolve();
		};
		const rejectOnce = (error: Error) => {
			if (settled) {
				return;
			}

			settled = true;
			reject(error);
		};

		child.once('error', (error) => {
			rejectOnce(error instanceof Error ? error : new Error(`${command.label} failed.`));
		});
		child.once('spawn', () => {
			setTimeout(resolveOnce, 80);
		});
		child.once('close', (code) => {
			if (code === 0) {
				resolveOnce();
				return;
			}

			rejectOnce(new Error(`${command.label} exited with code ${code ?? 'unknown'}.`));
		});
	});
}

export async function openArtifactInEditor(input: {
	path: string;
	line?: number | null;
	column?: number | null;
	preferredEditor?: string | null;
}) {
	const path = normalizePathInput(input.path);

	if (!path) {
		throw new Error('Path is required.');
	}

	if (!isAbsolute(path)) {
		throw new Error('Use an absolute path.');
	}

	let details;

	try {
		details = await stat(path);
	} catch {
		throw new Error('Artifact file is missing from disk.');
	}

	if (!details.isFile()) {
		throw new Error('Only files can be opened in the editor.');
	}

	const commands = buildArtifactEditorLaunchCommands({
		path,
		line: input.line,
		column: input.column,
		preferredEditor: input.preferredEditor
	});
	const failures: string[] = [];

	for (const command of commands) {
		try {
			await runArtifactEditorCommand(command);
			return {
				path,
				launcher: command.label
			};
		} catch (error) {
			failures.push(error instanceof Error ? error.message : `${command.label} failed.`);
		}
	}

	throw new Error(`No supported local editor launcher succeeded. ${failures.join(' ')}`.trim());
}

async function runGitCommand(input: { cwd: string; args: string[]; allowExitCodes?: number[] }) {
	try {
		const result = await execFileAsync('git', input.args, {
			cwd: input.cwd,
			maxBuffer: 1024 * 1024 * 8
		});

		return {
			stdout: result.stdout,
			stderr: result.stderr,
			exitCode: 0
		};
	} catch (error) {
		const commandError = error as Error & {
			code?: number | string;
			stdout?: string;
			stderr?: string;
		};
		const exitCode = typeof commandError.code === 'number' ? commandError.code : Number.NaN;

		if (input.allowExitCodes?.includes(exitCode)) {
			return {
				stdout: commandError.stdout ?? '',
				stderr: commandError.stderr ?? '',
				exitCode
			};
		}

		throw error;
	}
}

async function findGitRepositoryRoot(path: string) {
	try {
		const result = await runGitCommand({
			cwd: dirname(path),
			args: ['rev-parse', '--show-toplevel']
		});

		return result.stdout.trim() || null;
	} catch {
		return null;
	}
}

async function isTrackedGitFile(repoRoot: string, filePath: string) {
	try {
		await runGitCommand({
			cwd: repoRoot,
			args: ['ls-files', '--error-unmatch', '--', filePath]
		});
		return true;
	} catch {
		return false;
	}
}

function isArtifactTextFile(path: string) {
	return ARTIFACT_TEXT_EXTENSIONS.has(extname(path).slice(1).toLowerCase());
}

function buildNewFileDiff(relativePath: string, content: string) {
	const normalizedContent = content.replace(/\r\n/g, '\n');
	const lines = normalizedContent.split('\n');
	const printableLines = normalizedContent.endsWith('\n') ? lines.slice(0, -1) : lines;
	const body =
		printableLines.length === 0 ? '' : `${printableLines.map((line) => `+${line}`).join('\n')}\n`;
	const hunkHeader =
		printableLines.length === 0 ? '@@ -0,0 +1 @@\n' : `@@ -0,0 +1,${printableLines.length} @@\n`;

	return [
		`diff --git a/${relativePath} b/${relativePath}`,
		'new file mode 100644',
		'--- /dev/null',
		`+++ b/${relativePath}`,
		hunkHeader.trimEnd(),
		body.trimEnd()
	]
		.filter(Boolean)
		.join('\n')
		.concat('\n');
}

export async function buildArtifactDiffPreview(input: {
	path: string;
}): Promise<ArtifactDiffPreview> {
	const path = normalizePathInput(input.path);

	if (!path) {
		throw new Error('Path is required.');
	}

	if (!isAbsolute(path)) {
		throw new Error('Use an absolute path.');
	}

	let details;

	try {
		details = await stat(path);
	} catch {
		throw new Error('Artifact file is missing from disk.');
	}

	if (!details.isFile()) {
		throw new Error('Only files can be diffed.');
	}

	if (!isArtifactTextFile(path)) {
		return {
			status: 'unavailable',
			diffText: '',
			message: 'Diff preview is only available for text-like files.',
			comparedAgainst: null
		};
	}

	const repoRoot = await findGitRepositoryRoot(path);

	if (!repoRoot) {
		return {
			status: 'unavailable',
			diffText: '',
			message: 'Diff preview is only available for files inside a Git repository.',
			comparedAgainst: null
		};
	}

	const resolvedRepoRoot = await realpath(repoRoot).catch(() => repoRoot);
	const resolvedPath = await realpath(path).catch(() => path);
	const relativePath = relative(resolvedRepoRoot, resolvedPath).replaceAll('\\', '/');

	if (!relativePath || relativePath.startsWith('..')) {
		return {
			status: 'unavailable',
			diffText: '',
			message: 'Diff preview is only available for files inside this repository.',
			comparedAgainst: null
		};
	}

	if (!(await isTrackedGitFile(repoRoot, relativePath))) {
		const content = await readFile(path, 'utf8');
		return {
			status: 'ready',
			diffText: buildNewFileDiff(relativePath, content),
			message: 'Showing a synthetic new-file diff because this file is not tracked yet.',
			comparedAgainst: 'untracked file'
		};
	}

	let diffResult;

	try {
		diffResult = await runGitCommand({
			cwd: repoRoot,
			args: ['diff', '--no-ext-diff', '--unified=3', 'HEAD', '--', relativePath]
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : '';

		if (message.includes('bad revision')) {
			diffResult = await runGitCommand({
				cwd: repoRoot,
				args: ['diff', '--no-ext-diff', '--unified=3', '--', relativePath]
			});
		} else {
			throw error;
		}
	}

	if (!diffResult.stdout.trim()) {
		return {
			status: 'empty',
			diffText: '',
			message: 'No local diff was found for this file.',
			comparedAgainst: 'HEAD'
		};
	}

	return {
		status: 'ready',
		diffText: diffResult.stdout,
		message: 'Showing the local diff against HEAD.',
		comparedAgainst: 'HEAD'
	};
}

function inferArtifactContentType(path: string) {
	const extension = extname(path).slice(1).toLowerCase();

	switch (extension) {
		case 'md':
		case 'markdown':
			return 'text/markdown; charset=utf-8';
		case 'txt':
		case 'log':
		case 'yml':
		case 'yaml':
		case 'svelte':
		case 'ts':
		case 'tsx':
		case 'js':
		case 'jsx':
		case 'json':
		case 'css':
		case 'html':
		case 'xml':
		case 'sh':
			return extension === 'json'
				? 'application/json; charset=utf-8'
				: extension === 'html'
					? 'text/html; charset=utf-8'
					: 'text/plain; charset=utf-8';
		case 'png':
			return 'image/png';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'gif':
			return 'image/gif';
		case 'webp':
			return 'image/webp';
		case 'svg':
			return 'image/svg+xml';
		case 'pdf':
			return 'application/pdf';
		default:
			return 'application/octet-stream';
	}
}
