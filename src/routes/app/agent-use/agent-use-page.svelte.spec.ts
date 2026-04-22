import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/app/agent-use/+page.svelte', () => {
	it('links playbook matches and recent events into filtered drill-down views', async () => {
		render(Page, {
			data: {
				filters: {
					threadId: 'thread_alpha',
					taskId: 'task_1',
					runId: 'run_1',
					toolName: '',
					outcome: '',
					since: '24h'
				},
				summary: {
					totalEvents: 3,
					successfulEvents: 2,
					failedEvents: 1,
					lastRecordedAt: '2026-04-21T18:00:00.000Z',
					retention: {
						retentionDays: 30,
						maxEvents: 5000,
						retainedEventCount: 3,
						oldestRetainedAt: '2026-04-21T17:00:00.000Z',
						newestRetainedAt: '2026-04-21T18:00:00.000Z',
						cutoffAt: '2026-03-22T18:00:00.000Z'
					},
					playbookMatches: [
						{
							intent: 'prepare_task_for_approval',
							count: 1,
							threadIds: ['thread_alpha']
						}
					],
					toolCounts: [
						{
							toolName: 'ams_task_get',
							count: 2,
							successCount: 2,
							errorCount: 0
						}
					],
					threadCounts: [{ threadId: 'thread_alpha', count: 2 }],
					taskCounts: [{ taskId: 'task_1', count: 2 }],
					runCounts: [{ runId: 'run_1', count: 2 }],
					unusedPlaybooks: [],
					uncoveredToolCounts: [],
					unobservedPlaybookTools: [],
					recentEvents: [
						{
							id: 'event_1',
							recordedAt: '2026-04-21T18:00:00.000Z',
							toolName: 'ams_task_get',
							resource: 'task',
							command: 'get',
							threadId: 'thread_alpha',
							taskId: 'task_1',
							runId: 'run_1',
							outcome: 'success',
							argKeys: ['taskId']
						}
					]
				},
				unfilteredSummary: {
					totalEvents: 3,
					threadCounts: [{ threadId: 'thread_alpha', count: 2 }],
					taskCounts: [{ taskId: 'task_1', count: 2 }],
					runCounts: [{ runId: 'run_1', count: 2 }],
					toolCounts: [{ toolName: 'ams_task_get', count: 2 }]
				},
				entityLabels: {
					threadById: {
						thread_alpha: 'Frontend thread · frontend.project-1.task-1'
					},
					taskById: {
						task_1: 'Ship telemetry labels'
					},
					runById: {
						run_1: 'Ship telemetry labels · running'
					}
				}
			} as never
		});

		const hrefs = Array.from(document.querySelectorAll('a'))
			.map((link) => link.getAttribute('href'))
			.filter((href): href is string => Boolean(href));

		expect(hrefs).toContain(
			'/app/agent-use?thread=thread_alpha&task=task_1&run=run_1&outcome=success&since=24h'
		);
		expect(hrefs).toContain(
			'/app/agent-use?thread=thread_alpha&task=task_1&run=run_1&tool=ams_task_get&since=24h'
		);
		expect(hrefs).toContain('/app/agent-use?thread=thread_alpha&task=task_1&run=run_1&since=24h');
		expect(hrefs).toContain('/app/agent-use?thread=thread_alpha&task=task_1&run=run_1&since=24h');
		expect(hrefs).toContain('/app/agent-use?thread=thread_alpha&task=task_1&run=run_1&since=24h');
		expect(hrefs).toContain('/app/threads/thread_alpha');
		expect(hrefs).toContain('/app/tasks/task_1');
		expect(hrefs).toContain('/app/runs/run_1');

		expect(document.body.textContent).toContain('Frontend thread · frontend.project-1.task-1');
		expect(document.body.textContent).toContain('Ship telemetry labels');
		expect(document.body.textContent).toContain('Ship telemetry labels · running');
		expect(document.body.textContent).toContain(
			'Agent-use telemetry keeps up to 5000 events from the last'
		);
		expect(document.body.textContent).toContain('30 days. Older events are pruned automatically.');
		expect(document.body.textContent).toContain('Filtered slice has retained telemetry');
		expect(document.body.textContent).toContain(
			'Showing 3 retained telemetry events for the current filter set.'
		);
	});
});
