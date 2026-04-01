import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export type FolderOption = {
	label: string;
	path: string;
};

const HOME_DIR = '/Users/colinfreed';
const FOLDER_PICKER_ROOTS = [
	{ path: resolve(HOME_DIR, 'Projects', 'AdventureWare', 'Products'), depth: 3, labelPrefix: 'Products' },
	{ path: resolve(HOME_DIR, 'Projects', 'Experiments'), depth: 2, labelPrefix: 'Experiments' },
	{ path: resolve(HOME_DIR, 'Projects', 'Shared'), depth: 2, labelPrefix: 'Shared' }
];

async function listFolderOptions(rootPath: string, maxDepth: number): Promise<string[]> {
	const results = new Set<string>();

	async function visit(path: string, depth: number) {
		if (depth > maxDepth) {
			return;
		}

		let entries;

		try {
			entries = await readdir(path, { withFileTypes: true });
		} catch {
			return;
		}

		results.add(path);

		for (const entry of entries) {
			if (!entry.isDirectory() || entry.name.startsWith('.')) {
				continue;
			}

			const nextPath = resolve(path, entry.name);
			await visit(nextPath, depth + 1);
		}
	}

	await visit(rootPath, 0);

	return [...results].sort((left, right) => left.localeCompare(right));
}

export async function loadFolderPickerOptions(): Promise<FolderOption[]> {
	const groups = await Promise.all(
		FOLDER_PICKER_ROOTS.map(async (root) => {
			const paths = await listFolderOptions(root.path, root.depth);
			return paths.map((path) => ({
				path,
				label: `${root.labelPrefix} · ${path.replace(`${root.path}/`, '').replace(root.path, '.')}`
			}));
		})
	);

	return groups.flat();
}
