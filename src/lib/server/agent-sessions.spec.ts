import { describe, expect, it } from 'vitest';
import { extractThreadIdFromOutputLine, parseAgentSandbox } from './agent-sessions';

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
});
