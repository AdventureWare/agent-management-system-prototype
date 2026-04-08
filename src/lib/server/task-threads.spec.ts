import { describe, expect, it } from 'vitest';
import { buildTaskThreadName, buildTaskThreadPrompt, resolveTaskThreadName } from './task-threads';

describe('task thread naming', () => {
	it('builds a standardized task thread name', () => {
		expect(
			buildTaskThreadName({
				projectName: 'Agent Management System Prototype',
				taskName: 'Thread naming standardization',
				taskId: 'task_thread_naming'
			})
		).toBe(
			'Task thread · Thread naming standardization · Agent Management System Prototype · task_thread_naming'
		);
	});

	it('upgrades legacy work thread names when task context is available', () => {
		expect(
			resolveTaskThreadName({
				currentName: 'Work thread: Agent Management System Prototype',
				projectName: 'Agent Management System Prototype',
				taskName: 'Thread naming standardization',
				taskId: 'task_thread_naming'
			})
		).toBe(
			'Task thread · Thread naming standardization · Agent Management System Prototype · task_thread_naming'
		);
	});

	it('preserves custom names that are already descriptive', () => {
		expect(
			resolveTaskThreadName({
				currentName: 'Architecture review: Agent Management System Prototype',
				projectName: 'Agent Management System Prototype',
				taskName: 'Thread naming standardization',
				taskId: 'task_thread_naming'
			})
		).toBe('Architecture review: Agent Management System Prototype');
	});

	it('includes installed skill names in the task prompt when available', () => {
		expect(
			buildTaskThreadPrompt({
				taskName: 'Standardize skill discovery',
				taskInstructions: 'Show installed skills before running a task.',
				projectName: 'Agent Management System Prototype',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output',
				availableSkillNames: ['skill-installer', 'web-design-guidelines']
			})
		).toContain('Installed skills available: skill-installer, web-design-guidelines');
	});

	it('includes retrieved published knowledge in the task prompt when available', () => {
		expect(
			buildTaskThreadPrompt({
				taskName: 'Stabilize execution',
				taskInstructions: 'Fix the flaky launch path.',
				projectName: 'Agent Management System Prototype',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output',
				relevantKnowledgeItems: [
					{
						title: 'Failure recovery pattern',
						summary: 'Capture repeated launch failures as a reusable recovery play.',
						triggerPattern: 'Repeated launch or retry failures for the same task.',
						recommendedResponse: 'Add a preflight check before retrying the failing step.',
						matchReasons: ['Matches this project.', 'Shares task language: launch, retry.']
					}
				]
			})
		).toContain('Apply this published system knowledge when it is relevant to the work:');
	});

	it('includes delegation packet details in the task prompt when present', () => {
		expect(
			buildTaskThreadPrompt({
				taskName: 'Implement delegation packet editing',
				taskInstructions: 'Add the missing contract fields for delegated child tasks.',
				projectName: 'Agent Management System Prototype',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output',
				delegationPacket: {
					objective: 'Own the packet editing flow.',
					inputContext: 'Parent task handles overall coordination.',
					expectedDeliverable: 'Editable packet fields on task detail.',
					doneCondition: 'The parent can inspect and trust the child contract.',
					integrationNotes: 'Call out anything the parent must still decide.'
				}
			})
		).toContain('Delegation packet:');
	});

	it('includes thread coordination instructions for managed runs', () => {
		expect(
			buildTaskThreadPrompt({
				taskName: 'Coordinate thread work',
				taskInstructions: 'Use another thread if you need outside context.',
				projectName: 'Agent Management System Prototype',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output'
			})
		).toContain('AMS_AGENT_THREAD_ID');
		expect(
			buildTaskThreadPrompt({
				taskName: 'Coordinate thread work',
				taskInstructions: 'Use another thread if you need outside context.',
				projectName: 'Agent Management System Prototype',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output'
			})
		).toContain('node scripts/agent-thread-cli.mjs best-target');
		expect(
			buildTaskThreadPrompt({
				taskName: 'Coordinate thread work',
				taskInstructions: 'Use another thread if you need outside context.',
				projectName: 'Agent Management System Prototype',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output'
			})
		).toContain('node scripts/agent-thread-cli.mjs list --can-contact');
		expect(
			buildTaskThreadPrompt({
				taskName: 'Coordinate thread work',
				taskInstructions: 'Use another thread if you need outside context.',
				projectName: 'Agent Management System Prototype',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output'
			})
		).toContain('node scripts/agent-thread-cli.mjs resolve <query> --can-contact');
		expect(
			buildTaskThreadPrompt({
				taskName: 'Coordinate thread work',
				taskInstructions: 'Use another thread if you need outside context.',
				projectName: 'Agent Management System Prototype',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output'
			})
		).toContain(
			'node scripts/agent-thread-cli.mjs contact <targetThreadIdOrHandle> --type <question|request_context|request_assignment|handoff|review_request|status_update> --context'
		);
	});
});
