import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { ensurePathTarget } from './path-tools';

const tempPaths: string[] = [];

async function createTempRoot() {
	const root = await mkdtemp(join(tmpdir(), 'ams-path-tools-'));
	tempPaths.push(root);
	return root;
}

describe('path tools', () => {
	afterEach(async () => {
		await Promise.all(
			tempPaths.splice(0).map((path) => rm(path, { force: true, recursive: true }))
		);
	});

	it('creates a missing folder path', async () => {
		const root = await createTempRoot();
		const targetPath = join(root, 'workspace', 'artifacts');

		const result = await ensurePathTarget({ path: targetPath, target: 'folder' });
		const targetStat = await stat(targetPath);

		expect(result).toEqual({
			path: targetPath,
			target: 'folder',
			created: true,
			existed: false
		});
		expect(targetStat.isDirectory()).toBe(true);
	});

	it('creates a missing file path and its parent folders', async () => {
		const root = await createTempRoot();
		const targetPath = join(root, 'notes', 'brief.md');

		const result = await ensurePathTarget({ path: targetPath, target: 'file' });
		const targetStat = await stat(targetPath);

		expect(result).toEqual({
			path: targetPath,
			target: 'file',
			created: true,
			existed: false
		});
		expect(targetStat.isFile()).toBe(true);
		expect(await readFile(targetPath, 'utf8')).toBe('');
	});

	it('returns existed=true when the requested path already matches the target type', async () => {
		const root = await createTempRoot();
		const targetPath = join(root, 'existing-folder');

		await ensurePathTarget({ path: targetPath, target: 'folder' });
		const result = await ensurePathTarget({ path: targetPath, target: 'folder' });

		expect(result).toEqual({
			path: targetPath,
			target: 'folder',
			created: false,
			existed: true
		});
	});

	it('rejects relative paths', async () => {
		await expect(ensurePathTarget({ path: 'relative/path', target: 'folder' })).rejects.toThrow(
			'Use an absolute path.'
		);
	});
});
