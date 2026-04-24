import net from 'node:net';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
	formatBindFailureMessage,
	probeListenTarget,
	validateBuildArtifacts
} from '../../../scripts/operator-server.mjs';

const tempDirs: string[] = [];

async function writeBuildFile(root: string, relativePath: string, contents: string) {
	const filePath = join(root, relativePath);
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, contents);
}

async function createFixtureRoot() {
	const root = await mkdtemp(join(tmpdir(), 'operator-server-build-'));
	tempDirs.push(root);
	return root;
}

async function createBuildFixture(root: string) {
	await writeBuildFile(root, 'build/index.js', "export { handler } from './handler.js';\n");
	await writeBuildFile(root, 'build/env.js', 'export const env = {};\n');
	await writeBuildFile(root, 'build/shims.js', 'export {};\n');
	await writeBuildFile(
		root,
		'build/handler.js',
		[
			"import './shims.js';",
			"import { serverReady } from './server/index.js';",
			"import { manifest } from './server/manifest.js';",
			'if (!serverReady || !manifest) throw new Error("handler validation failed");',
			'export const handler = {};',
			''
		].join('\n')
	);
	await writeBuildFile(
		root,
		'build/server/index.js',
		["import './chunks/root.js';", 'export const serverReady = true;', ''].join('\n')
	);
	await writeBuildFile(root, 'build/server/chunks/root.js', 'export const root = true;\n');
	await writeBuildFile(root, 'build/server/chunks/node.js', 'export const node = true;\n');
	await writeBuildFile(root, 'build/server/chunks/endpoint.js', 'export const endpoint = true;\n');
	await writeBuildFile(
		root,
		'build/server/manifest.js',
		[
			'const manifest = {',
			'  _: {',
			'    client: {',
			"      start: '_app/immutable/entry/start.js',",
			"      app: '_app/immutable/entry/app.js',",
			"      imports: ['_app/immutable/entry/start.js', '_app/immutable/chunks/client.js'],",
			'      stylesheets: [],',
			'      fonts: []',
			'    },',
			"    nodes: [() => import('./chunks/node.js')],",
			"    routes: [{ endpoint: () => import('./chunks/endpoint.js') }]",
			'  }',
			'};',
			'export { manifest };',
			''
		].join('\n')
	);
	await writeBuildFile(
		root,
		'build/client/_app/immutable/entry/start.js',
		'export const start = true;\n'
	);
	await writeBuildFile(
		root,
		'build/client/_app/immutable/entry/app.js',
		'export const app = true;\n'
	);
	await writeBuildFile(
		root,
		'build/client/_app/immutable/chunks/client.js',
		'export const client = true;\n'
	);
}

function fixtureBuildPaths(root: string) {
	return {
		repoRoot: root,
		buildRoot: join(root, 'build'),
		buildClientRoot: join(root, 'build', 'client'),
		buildEntryPath: join(root, 'build', 'index.js'),
		buildHandlerPath: join(root, 'build', 'handler.js'),
		buildServerIndexPath: join(root, 'build', 'server', 'index.js'),
		buildManifestPath: join(root, 'build', 'server', 'manifest.js')
	};
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('operator-server build validation', () => {
	it('fails when a startup server chunk is missing even if the manifest loaders remain valid', async () => {
		expect.assertions(3);

		const root = await createFixtureRoot();
		await createBuildFixture(root);
		await rm(join(root, 'build', 'server', 'chunks', 'root.js'));

		const validation = await validateBuildArtifacts(fixtureBuildPaths(root));

		expect(validation.ok).toBe(false);
		expect(validation.reason).toContain('Build startup imports are invalid');
		expect(validation.reason).toContain('root.js');
	});

	it('fails when the server manifest references a missing client asset', async () => {
		expect.assertions(3);

		const root = await createFixtureRoot();
		await createBuildFixture(root);
		await rm(join(root, 'build', 'client', '_app', 'immutable', 'chunks', 'client.js'));

		const validation = await validateBuildArtifacts(fixtureBuildPaths(root));

		expect(validation.ok).toBe(false);
		expect(validation.reason).toContain('Server manifest references a missing client asset');
		expect(validation.reason).toContain('client.js');
	});
});

describe('operator-server bind probing', () => {
	it('reports EADDRINUSE when the requested local port is already occupied', async () => {
		expect.assertions(2);

		const server = net.createServer();
		await new Promise((resolvePromise, reject) => {
			server.once('error', reject);
			server.listen({ host: '127.0.0.1', port: 0 }, () => resolvePromise(undefined));
		});

		try {
			const address = server.address();
			if (!address || typeof address === 'string') {
				throw new Error('Expected an IPv4 address from the fixture server.');
			}

			const probe = await probeListenTarget('127.0.0.1', address.port);
			expect(probe.ok).toBe(false);
			expect(probe.error?.code).toBe('EADDRINUSE');
		} finally {
			await new Promise((resolvePromise) => server.close(() => resolvePromise(undefined)));
		}
	});

	it('suggests an alternate port when the requested bind is denied but the next port is available', () => {
		const message = formatBindFailureMessage(
			'127.0.0.1',
			3000,
			{
				ok: false,
				error: { code: 'EPERM', message: 'listen EPERM: operation not permitted 127.0.0.1:3000' }
			},
			3001,
			{ ok: true }
		);

		expect(message).toContain('Restart on an alternate port');
		expect(message).toContain('AMS_APP_PORT=3001 npm run app:server:start');
	});

	it('classifies repeated permission-denied probes as an environment restriction', () => {
		const message = formatBindFailureMessage(
			'127.0.0.1',
			3000,
			{
				ok: false,
				error: { code: 'EPERM', message: 'listen EPERM: operation not permitted 127.0.0.1:3000' }
			},
			3001,
			{
				ok: false,
				error: { code: 'EPERM', message: 'listen EPERM: operation not permitted 127.0.0.1:3001' }
			}
		);

		expect(message).toContain('suggests this environment blocks local listeners');
	});
});
