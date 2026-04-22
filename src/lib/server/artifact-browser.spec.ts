import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
	buildArtifactBrowser,
	buildArtifactDiffPreview,
	buildArtifactEditorLaunchCommands,
	inspectArtifactPathStatus
} from './artifact-browser';

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

	it('falls back to the containing folder when a recorded file is missing', async () => {
		const tempRoot = await createTempDir();
		const artifactRoot = join(tempRoot, 'agent_output');
		const missingPath = join(artifactRoot, 'missing.log');

		await mkdir(artifactRoot, { recursive: true });
		await writeFile(join(artifactRoot, 'summary.md'), '# Summary');

		const browser = await buildArtifactBrowser({
			rootPath: missingPath,
			rootFileLabel: 'Recorded output'
		});

		expect(browser).not.toBeNull();
		expect(browser?.rootKind).toBe('missing');
		expect(browser?.browsePath).toBe(artifactRoot);
		expect(browser?.inspectingParentDirectory).toBe(true);
		expect(browser?.directoryEntries.map((entry) => entry.name)).toEqual(['summary.md']);
		expect(browser?.knownOutputs[0]).toEqual(
			expect.objectContaining({
				label: 'Recorded output',
				path: missingPath,
				exists: false
			})
		);
	});

	it('reports whether an artifact path exists on disk', async () => {
		const tempRoot = await createTempDir();
		const outputPath = join(tempRoot, 'summary.md');

		await writeFile(outputPath, '# Summary');

		await expect(inspectArtifactPathStatus(outputPath)).resolves.toEqual({
			path: outputPath,
			exists: true,
			kind: 'file',
			sizeBytes: 9
		});

		await expect(inspectArtifactPathStatus(join(tempRoot, 'missing.md'))).resolves.toEqual({
			path: join(tempRoot, 'missing.md'),
			exists: false,
			kind: 'other',
			sizeBytes: null
		});
	});

	it('builds editor launch commands that preserve line and column targeting', () => {
		expect(
			buildArtifactEditorLaunchCommands({
				path: '/tmp/project/agent_output/brief.md',
				line: 14,
				column: 3,
				platform: 'darwin'
			})
		).toEqual([
			{
				label: 'VS Code CLI',
				command: 'code',
				args: ['-g', '/tmp/project/agent_output/brief.md:14:3']
			},
			{
				label: 'Cursor CLI',
				command: 'cursor',
				args: ['-g', '/tmp/project/agent_output/brief.md:14:3']
			},
			{
				label: 'Zed CLI',
				command: 'zed',
				args: ['--goto', '/tmp/project/agent_output/brief.md:14:3']
			},
			{
				label: 'macOS open',
				command: 'open',
				args: ['/tmp/project/agent_output/brief.md']
			}
		]);
	});

	it('respects an explicit editor preference when building launch commands', () => {
		expect(
			buildArtifactEditorLaunchCommands({
				path: '/tmp/project/agent_output/brief.md',
				line: 8,
				preferredEditor: 'cursor',
				platform: 'darwin'
			})
		).toEqual([
			{
				label: 'Cursor CLI',
				command: 'cursor',
				args: ['-g', '/tmp/project/agent_output/brief.md:8']
			}
		]);
	});

	it('builds a synthetic diff for untracked text files', async () => {
		const tempRoot = await createTempDir();
		const artifactRoot = join(tempRoot, 'repo');
		const outputPath = join(artifactRoot, 'new-file.md');

		await mkdir(artifactRoot, { recursive: true });
		await writeFile(outputPath, '# New file\nhello world\n');

		await import('node:child_process').then(({ execFileSync }) => {
			execFileSync('git', ['init'], { cwd: artifactRoot });
		});

		const diffPreview = await buildArtifactDiffPreview({ path: outputPath });

		expect(diffPreview.status).toBe('ready');
		expect(diffPreview.comparedAgainst).toBe('untracked file');
		expect(diffPreview.diffText).toContain('new file mode 100644');
		expect(diffPreview.diffText).toContain('+# New file');
	});
});
