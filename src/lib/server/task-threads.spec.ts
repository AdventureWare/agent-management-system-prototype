import { describe, expect, it } from 'vitest';
import { buildTaskThreadName, resolveTaskThreadName } from './task-threads';

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
				currentName: 'Task ideation: Agent Management System Prototype',
				projectName: 'Agent Management System Prototype',
				taskName: 'Thread naming standardization',
				taskId: 'task_thread_naming'
			})
		).toBe('Task ideation: Agent Management System Prototype');
	});
});
