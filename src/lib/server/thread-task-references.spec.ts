import { describe, expect, it } from 'vitest';
import { extractThreadTaskReference } from './thread-task-references';

describe('extractThreadTaskReference', () => {
	it('extracts task metadata from a standardized task thread name', () => {
		expect(
			extractThreadTaskReference(
				'Task thread · Improve UI and UX of managing permissions and s… · Kwipoo app · task_ae620901-ffb5-4327-962f-a75614eb9fef'
			)
		).toEqual({
			taskId: 'task_ae620901-ffb5-4327-962f-a75614eb9fef',
			taskTitle: 'Improve UI and UX of managing permissions and s…',
			projectName: 'Kwipoo app'
		});
	});

	it('returns null for non-task thread names', () => {
		expect(extractThreadTaskReference('Coordinator thread')).toBeNull();
	});

	it('handles names without a project segment', () => {
		expect(extractThreadTaskReference('Task thread · Retry later · task_123')).toEqual({
			taskId: 'task_123',
			taskTitle: 'Retry later',
			projectName: null
		});
	});
});
