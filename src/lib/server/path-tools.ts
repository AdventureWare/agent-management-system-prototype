import { mkdir, open, stat } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';

export const PATH_TARGET_OPTIONS = ['folder', 'file'] as const;

export type PathTarget = (typeof PATH_TARGET_OPTIONS)[number];

export type EnsurePathResult = {
	path: string;
	target: PathTarget;
	created: boolean;
	existed: boolean;
};

function isPathTarget(value: string): value is PathTarget {
	return PATH_TARGET_OPTIONS.includes(value as PathTarget);
}

export function parsePathTarget(
	value: string | null | undefined,
	fallback: PathTarget
): PathTarget {
	return value && isPathTarget(value) ? value : fallback;
}

export function normalizePathInput(value: string | null | undefined) {
	let path = value?.trim() ?? '';

	while (path.length >= 2) {
		const wrapper = path[0];

		if ((wrapper !== "'" && wrapper !== '"') || path.at(-1) !== wrapper) {
			break;
		}

		path = path.slice(1, -1).trim();
	}

	return path;
}

export function normalizePathListInput(value: string | string[] | null | undefined) {
	const candidates = Array.isArray(value)
		? value
		: typeof value === 'string'
			? value.split(/\r?\n/)
			: [];

	return [
		...new Set(
			candidates
				.map((candidate) => normalizePathInput(candidate))
				.filter((candidate) => candidate.length > 0)
		)
	];
}

export async function ensurePathTarget(input: {
	path: string;
	target: PathTarget;
}): Promise<EnsurePathResult> {
	const path = normalizePathInput(input.path);

	if (!path) {
		throw new Error('Path is required.');
	}

	if (!isAbsolute(path)) {
		throw new Error('Use an absolute path.');
	}

	try {
		const existing = await stat(path);

		if (input.target === 'folder' && !existing.isDirectory()) {
			throw new Error('A file already exists at that path.');
		}

		if (input.target === 'file' && !existing.isFile()) {
			throw new Error('A folder already exists at that path.');
		}

		return {
			path,
			target: input.target,
			created: false,
			existed: true
		};
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
			throw error;
		}
	}

	if (input.target === 'folder') {
		await mkdir(path, { recursive: true });
		return {
			path,
			target: input.target,
			created: true,
			existed: false
		};
	}

	await mkdir(dirname(path), { recursive: true });
	const handle = await open(path, 'a');
	await handle.close();

	return {
		path,
		target: input.target,
		created: true,
		existed: false
	};
}
