import { describe, expect, it } from 'vitest';
import { getAgentCapabilityManifest } from './agent-capability-manifest';

describe('agent-use-reliability', () => {
	it('keeps manifest playbooks aligned with the MCP tool surface and readback loop', async () => {
		const manifest = getAgentCapabilityManifest();
		const { getTools } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const toolNames = new Set(getTools().map((tool) => tool.name));
		const phaseOrder = ['discover', 'inspect', 'mutate', 'readback'] as const;
		const playbookNames = new Set(manifest.guidance.playbooks.map((playbook) => playbook.intent));

		for (const requiredPlaybook of [
			'create_task',
			'prepare_task_for_review',
			'prepare_task_for_approval',
			'accept_child_handoff',
			'reject_task_approval',
			'request_child_handoff_changes',
			'coordinate_with_another_thread'
		]) {
			expect(playbookNames.has(requiredPlaybook)).toBe(true);
		}

		for (const playbook of manifest.guidance.playbooks) {
			expect(playbook.steps[0]?.tool).toBe('ams_manifest');
			expect(playbook.steps[0]?.phase).toBe('discover');

			for (const step of playbook.steps) {
				expect(toolNames.has(step.tool)).toBe(true);
			}

			const playbookPhaseIndexes = playbook.steps.map((step) => phaseOrder.indexOf(step.phase));

			for (let index = 1; index < playbookPhaseIndexes.length; index += 1) {
				expect(playbookPhaseIndexes[index]).toBeGreaterThanOrEqual(playbookPhaseIndexes[index - 1]);
			}

			const mutationIndexes = playbook.steps
				.map((step, index) => ({ step, index }))
				.filter(({ step }) => step.phase === 'mutate')
				.map(({ index }) => index);

			for (const mutationIndex of mutationIndexes) {
				expect(
					playbook.steps.slice(mutationIndex + 1).some((step) => step.phase === 'readback')
				).toBe(true);
			}
		}
	});

	it('keeps rejection and follow-up playbooks pointed at the correct outcome-specific tools', () => {
		const manifest = getAgentCapabilityManifest();
		const rejectApprovalPlaybook = manifest.guidance.playbooks.find(
			(playbook) => playbook.intent === 'reject_task_approval'
		);
		const childFollowUpPlaybook = manifest.guidance.playbooks.find(
			(playbook) => playbook.intent === 'request_child_handoff_changes'
		);

		expect(rejectApprovalPlaybook?.steps.map((step) => step.tool)).toEqual([
			'ams_manifest',
			'ams_task_get',
			'ams_task_reject_approval',
			'ams_task_get'
		]);
		expect(rejectApprovalPlaybook?.steps.map((step) => step.phase)).toEqual([
			'discover',
			'inspect',
			'mutate',
			'readback'
		]);

		expect(childFollowUpPlaybook?.steps.map((step) => step.tool)).toEqual([
			'ams_manifest',
			'ams_task_get',
			'ams_task_request_child_handoff_changes',
			'ams_task_get'
		]);
		expect(childFollowUpPlaybook?.steps.map((step) => step.phase)).toEqual([
			'discover',
			'inspect',
			'mutate',
			'readback'
		]);
	});
});
