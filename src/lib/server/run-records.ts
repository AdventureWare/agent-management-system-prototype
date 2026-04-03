import { formatActivityAge } from '$lib/session-activity';
import type { AgentThreadDetail } from '$lib/types/agent-thread';
import type { ControlPlaneData, Run } from '$lib/types/control-plane';
import { formatRelativeTime } from '$lib/server/control-plane';

export type RunRecord = Run & {
	taskTitle: string;
	taskProjectId: string | null;
	taskProjectName: string;
	workerName: string;
	providerName: string;
	threadName: string | null;
	threadState: AgentThreadDetail['threadState'] | null;
	threadArchivedAt: string | null;
	threadSummary: string | null;
	threadCanResume: boolean;
	threadHasActiveRun: boolean;
	createdAtLabel: string;
	updatedAtLabel: string;
	heartbeatAgeLabel: string;
	isHeartbeatStale: boolean;
};

export function buildRunRecords(data: ControlPlaneData, threads: AgentThreadDetail[]): RunRecord[] {
	const taskMap = new Map(data.tasks.map((task) => [task.id, task]));
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const threadMap = new Map(threads.map((thread) => [thread.id, thread]));
	const staleHeartbeatCutoffMs = 5 * 60 * 1000;

	return [...data.runs]
		.map((run) => {
			const task = taskMap.get(run.taskId) ?? null;
			const project = task ? (projectMap.get(task.projectId) ?? null) : null;
			const worker = run.workerId ? (workerMap.get(run.workerId) ?? null) : null;
			const provider = run.providerId ? (providerMap.get(run.providerId) ?? null) : null;
			const thread = run.agentThreadId ? (threadMap.get(run.agentThreadId) ?? null) : null;
			const heartbeatAgeMs = run.lastHeartbeatAt
				? Math.max(0, Date.now() - Date.parse(run.lastHeartbeatAt))
				: null;

			return {
				...run,
				taskTitle: task?.title ?? 'Unknown task',
				taskProjectId: task?.projectId ?? null,
				taskProjectName: project?.name ?? 'Unknown project',
				workerName: worker?.name ?? 'Unassigned',
				providerName: provider?.name ?? 'No provider',
				threadName: thread?.name ?? null,
				threadState: thread?.threadState ?? thread?.threadState ?? null,
				threadArchivedAt: thread?.archivedAt ?? null,
				threadSummary: thread?.threadSummary ?? thread?.threadSummary ?? null,
				threadCanResume: thread?.canResume ?? false,
				threadHasActiveRun: thread?.hasActiveRun ?? false,
				createdAtLabel: formatRelativeTime(run.createdAt),
				updatedAtLabel: formatRelativeTime(run.updatedAt),
				heartbeatAgeLabel: formatActivityAge(run.lastHeartbeatAt),
				isHeartbeatStale:
					heartbeatAgeMs !== null &&
					heartbeatAgeMs > staleHeartbeatCutoffMs &&
					(run.status === 'running' || run.status === 'starting')
			};
		})
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
