import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute } from 'node:path';
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

type BuildArtifactBrowserInput = {
	rootPath: string;
	knownOutputs?: ArtifactKnownOutputInput[];
	maxEntries?: number;
	rootFileLabel?: string;
};

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
	let rootKind: ArtifactBrowserData['rootKind'] = 'missing';
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

			if (input.rootFileLabel) {
				knownOutputInputs.unshift({
					label: input.rootFileLabel,
					path: rootPath,
					description: 'Recorded file.'
				});
			}
		} else {
			rootKind = 'unreadable';
			errorMessage = 'This artifact path is not a regular file or folder.';
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			rootKind = 'missing';
			errorMessage = 'This artifact path is not on disk yet.';
		} else {
			rootKind = 'unreadable';
			errorMessage = 'This artifact path could not be inspected.';
		}
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

	const payload = await readFile(path);
	const encodedName = encodeURIComponent(input.name || basename(path));

	return new Response(payload, {
		headers: {
			'content-type': input.contentType || 'application/octet-stream',
			'content-length': String(payload.byteLength),
			'content-disposition': `attachment; filename*=UTF-8''${encodedName}`
		}
	});
}
