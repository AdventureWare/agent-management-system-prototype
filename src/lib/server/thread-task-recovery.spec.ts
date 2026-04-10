import { describe, expect, it } from 'vitest';
import {
	extractManagedTaskInstructions,
	extractThreadTaskRecoveryDraft
} from './thread-task-recovery';

describe('thread-task-recovery', () => {
	it('extracts recovery details from a managed task thread prompt', () => {
		const prompt = `You are executing a queued task from the agent management system.

Task: Improve UI and UX of managing permissions and sharing of data/objects
Project: Kwipoo app
Project root: /Users/example/kwipoo/app
Default artifact root: /Users/example/kwipoo/agent_output/task-attachments

Instructions:
# Objective
Improve the UI and UX for managing permissions and sharing of data/objects.

## Focus Area
- Make access controls easier to understand.

Thread coordination:
Use the helper CLI if you need context.`;

		expect(
			extractThreadTaskRecoveryDraft({
				threadName:
					'Task thread · Improve UI and UX of managing permissions and s… · Kwipoo app · task_ae620901-ffb5-4327-962f-a75614eb9fef',
				prompts: [prompt]
			})
		).toEqual({
			taskId: 'task_ae620901-ffb5-4327-962f-a75614eb9fef',
			title: 'Improve UI and UX of managing permissions and sharing of data/objects',
			projectName: 'Kwipoo app',
			projectRootFolder: '/Users/example/kwipoo/app',
			artifactRoot: '/Users/example/kwipoo/agent_output/task-attachments',
			summary: `# Objective
Improve the UI and UX for managing permissions and sharing of data/objects.

## Focus Area
- Make access controls easier to understand.`
		});
	});

	it('falls back to thread-name metadata when the prompt is unavailable', () => {
		expect(
			extractThreadTaskRecoveryDraft({
				threadName:
					'Task thread · Format Tasks page content width · Agent Management System Prototype · task_d64e7add-fe69-4e5f-9c94-2e2d0d49090e',
				prompts: ['']
			})
		).toEqual({
			taskId: 'task_d64e7add-fe69-4e5f-9c94-2e2d0d49090e',
			title: 'Format Tasks page content width',
			projectName: 'Agent Management System Prototype',
			projectRootFolder: null,
			artifactRoot: null,
			summary: ''
		});
	});

	it('extracts only the instruction body from the managed prompt', () => {
		expect(
			extractManagedTaskInstructions(`Task: Example

Instructions:
First section.

Thread coordination:
Later section.`)
		).toBe('First section.');
	});
});
