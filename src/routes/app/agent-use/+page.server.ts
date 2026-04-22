import type { PageServerLoad } from './$types';
import { loadControlPlane } from '$lib/server/control-plane';
import { listAgentThreads } from '$lib/server/agent-threads';
import { summarizeAgentToolUse } from '$lib/server/agent-use-telemetry.js';

function collectUniqueIds(summary: Awaited<ReturnType<typeof summarizeAgentToolUse>>) {
	const threadIds = new Set<string>();
	const taskIds = new Set<string>();
	const runIds = new Set<string>();

	for (const entry of summary.threadCounts) {
		threadIds.add(entry.threadId);
	}

	for (const entry of summary.taskCounts) {
		taskIds.add(entry.taskId);
	}

	for (const entry of summary.runCounts) {
		runIds.add(entry.runId);
	}

	for (const match of summary.playbookMatches) {
		for (const threadId of match.threadIds) {
			threadIds.add(threadId);
		}
	}

	for (const event of summary.recentEvents) {
		if (event.threadId) {
			threadIds.add(event.threadId);
		}

		if (event.taskId) {
			taskIds.add(event.taskId);
		}

		if (event.runId) {
			runIds.add(event.runId);
		}
	}

	return {
		threadIds: [...threadIds],
		taskIds: [...taskIds],
		runIds: [...runIds]
	};
}

export const load: PageServerLoad = async ({ url }) => {
	const filters = {
		threadId: url.searchParams.get('thread')?.trim() || '',
		taskId: url.searchParams.get('task')?.trim() || '',
		runId: url.searchParams.get('run')?.trim() || '',
		toolName: url.searchParams.get('tool')?.trim() || '',
		outcome: url.searchParams.get('outcome')?.trim() || '',
		since: url.searchParams.get('since')?.trim() || ''
	};
	const summary = await summarizeAgentToolUse({
		threadId: filters.threadId || undefined,
		taskId: filters.taskId || undefined,
		runId: filters.runId || undefined,
		toolName: filters.toolName || undefined,
		outcome: filters.outcome || undefined,
		since: filters.since || undefined
	});
	const unfilteredSummary = await summarizeAgentToolUse();
	const requestedIds = collectUniqueIds(summary);
	const unfilteredIds = collectUniqueIds(unfilteredSummary);
	const threadIds = [...new Set([...requestedIds.threadIds, ...unfilteredIds.threadIds])];
	const [controlPlane, threads] = await Promise.all([
		loadControlPlane(),
		threadIds.length > 0
			? listAgentThreads({
					threadIds,
					includeCategorization: false,
					reconcileTaskState: false
				})
			: Promise.resolve([])
	]);
	const taskLabelById = Object.fromEntries(
		controlPlane.tasks.map((task) => [task.id, task.title] as const)
	);
	const runLabelById = Object.fromEntries(
		controlPlane.runs.map((run) => {
			const taskTitle = taskLabelById[run.taskId];
			const label = taskTitle ? `${taskTitle} · ${run.status}` : run.summary || run.status;
			return [run.id, label] as const;
		})
	);
	const threadLabelById = Object.fromEntries(
		threads.map((thread) => {
			const detail =
				thread.handle && thread.handle !== thread.name
					? `${thread.name} · ${thread.handle}`
					: thread.contactLabel && thread.contactLabel !== thread.name
						? `${thread.name} · ${thread.contactLabel}`
						: thread.name;
			return [thread.id, detail] as const;
		})
	);

	return {
		filters,
		summary,
		unfilteredSummary,
		entityLabels: {
			threadById: threadLabelById,
			taskById: taskLabelById,
			runById: runLabelById
		}
	};
};
