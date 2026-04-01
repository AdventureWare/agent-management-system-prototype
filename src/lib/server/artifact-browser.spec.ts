import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { buildArtifactBrowser } from './artifact-browser';

let tempPaths: string[] = [];

async function createTempDir() {
	const path = await mkdtemp(join(tmpdir(), 'artifact-browser-'));
	tempPaths.push(path);
	return path;
}

describe('buildArtifactBrowser', () => {
	afterEach(async () => {
		await Promise.all(tempPaths.map((path) => rm(path, { recursive: true, force: true })));
		tempPaths = [];
	});

	it('lists direct directory contents for a folder root', async () => {
		const tempRoot = await createTempDir();
		const artifactRoot = join(tempRoot, 'agent_output');

		await mkdir(join(artifactRoot, 'logs'), { recursive: true });
		await writeFile(join(artifactRoot, 'summary.md'), '# Summary');

		const browser = await buildArtifactBrowser({ rootPath: artifactRoot });

		expect(browser).not.toBeNull();
		expect(browser?.rootKind).toBe('directory');
		expect(browser?.browsePath).toBe(artifactRoot);
		expect(browser?.directoryEntries.map((entry) => entry.name)).toEqual(['logs', 'summary.md']);
	});

	it('inspects the containing folder when the recorded root path is a file', async () => {
		const tempRoot = await createTempDir();
		const artifactRoot = join(tempRoot, 'agent_output');
		const outputPath = join(artifactRoot, 'run.log');

		await mkdir(artifactRoot, { recursive: true });
		await writeFile(outputPath, 'ok');

		const browser = await buildArtifactBrowser({
			rootPath: outputPath,
			rootFileLabel: 'Recorded output'
		});

		expect(browser).not.toBeNull();
		expect(browser?.rootKind).toBe('file');
		expect(browser?.browsePath).toBe(artifactRoot);
		expect(browser?.inspectingParentDirectory).toBe(true);
		expect(browser?.knownOutputs[0]).toEqual(
			expect.objectContaining({
				label: 'Recorded output',
				path: outputPath,
				kind: 'file',
				exists: true
			})
		);
	});
});
