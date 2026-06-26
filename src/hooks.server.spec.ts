import { describe, expect, it } from 'vitest';
import { isAgentControlPlaneApiPath } from './hooks.server';

describe('server hooks agent API auth paths', () => {
	it('includes structured agent control-plane API routes', () => {
		expect(isAgentControlPlaneApiPath('/api/agent-capabilities')).toBe(true);
		expect(isAgentControlPlaneApiPath('/api/agent-context/current')).toBe(true);
		expect(isAgentControlPlaneApiPath('/api/agent-goal-loop/get_actionable_work')).toBe(true);
		expect(isAgentControlPlaneApiPath('/api/agent-work-packets/get_agent_work_packet')).toBe(true);
		expect(isAgentControlPlaneApiPath('/api/agent-run-results/record_run_result')).toBe(true);
		expect(isAgentControlPlaneApiPath('/api/agent-run-results/request_review_from_run')).toBe(true);
		expect(isAgentControlPlaneApiPath('/api/agent-reviews/get_review_status')).toBe(true);
	});

	it('does not treat arbitrary app api routes as agent bearer-token routes', () => {
		expect(isAgentControlPlaneApiPath('/api/agent-run-results')).toBe(false);
		expect(isAgentControlPlaneApiPath('/api/providers')).toBe(false);
		expect(isAgentControlPlaneApiPath('/app/tasks')).toBe(false);
	});
});
