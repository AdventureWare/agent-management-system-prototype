import { describe, expect, it } from 'vitest';
import { extractThreadIdFromOutputLine, parseAgentSandbox } from './agent-sessions';
import { buildCodexArgs } from '../../../scripts/agent-session-runner-args.mjs';

describe('agent session helpers', () => {
	it('extracts thread ids from codex json lines', () => {
		expect(
			extractThreadIdFromOutputLine(
				'{"type":"thread.started","thread_id":"019d2d45-9094-7311-9d52-c2d5479c1368"}'
			)
		).toBe('019d2d45-9094-7311-9d52-c2d5479c1368');
	});

	it('ignores non-thread json lines and plain text logs', () => {
		expect(extractThreadIdFromOutputLine('{"type":"turn.started"}')).toBeNull();
		expect(extractThreadIdFromOutputLine('plain stderr line')).toBeNull();
	});

	it('parses sandbox values safely', () => {
		expect(parseAgentSandbox('read-only', 'workspace-write')).toBe('read-only');
		expect(parseAgentSandbox('unknown', 'workspace-write')).toBe('workspace-write');
	});

	it('keeps resume runs read-only by default', () => {
		expect(
			buildCodexArgs({
				mode: 'message',
				threadId: 'thread_123',
				sandbox: 'read-only',
				model: null,
				messagePath: '/tmp/last-message.txt',
				prompt: 'follow up'
			})
		).toEqual([
			'exec',
			'resume',
			'--json',
			'--skip-git-repo-check',
			'thread_123',
			'-o',
			'/tmp/last-message.txt',
			'follow up'
		]);
	});

	it('maps workspace-write resume runs to full-auto', () => {
		expect(
			buildCodexArgs({
				mode: 'message',
				threadId: 'thread_123',
				sandbox: 'workspace-write',
				model: 'gpt-5',
				messagePath: '/tmp/last-message.txt',
				prompt: 'follow up'
			})
		).toEqual([
			'exec',
			'resume',
			'--json',
			'--skip-git-repo-check',
			'--full-auto',
			'-m',
			'gpt-5',
			'thread_123',
			'-o',
			'/tmp/last-message.txt',
			'follow up'
		]);
	});

	it('maps danger-full-access resume runs to bypass approvals and sandbox', () => {
		expect(
			buildCodexArgs({
				mode: 'message',
				threadId: 'thread_123',
				sandbox: 'danger-full-access',
				model: null,
				messagePath: '/tmp/last-message.txt',
				prompt: 'follow up'
			})
		).toEqual([
			'exec',
			'resume',
			'--json',
			'--skip-git-repo-check',
			'--dangerously-bypass-approvals-and-sandbox',
			'thread_123',
			'-o',
			'/tmp/last-message.txt',
			'follow up'
		]);
	});

	it('keeps start runs on the explicit sandbox flag path', () => {
		expect(
			buildCodexArgs({
				mode: 'start',
				cwd: '/tmp/project',
				sandbox: 'workspace-write',
				model: null,
				messagePath: '/tmp/last-message.txt',
				prompt: 'start work'
			})
		).toEqual([
			'exec',
			'--json',
			'--skip-git-repo-check',
			'-C',
			'/tmp/project',
			'--sandbox',
			'workspace-write',
			'-o',
			'/tmp/last-message.txt',
			'start work'
		]);
	});
});
