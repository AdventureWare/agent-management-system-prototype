import { formatActivityAge } from '$lib/session-activity';
import type { AgentSessionDetail } from '$lib/types/agent-session';
import type { ControlPlaneData, Run } from '$lib/types/control-plane';
import { formatRelativeTime } from '$lib/server/control-plane';

export type RunRecord = Run & {
	taskTitle: string;
	taskProjectId: string | null;
	taskProjectName: string;
	workerName: string;
	providerName: string;
	sessionName: string | null;
	sessionState: AgentSessionDetail['sessionState'] | null;
	sessionArchivedAt: string | null;
	sessionSummary: string | null;
	sessionCanResume: boolean;
	sessionHasActiveRun: boolean;
	createdAtLabel: string;
	updatedAtLabel: string;
	heartbeatAgeLabel: string;
	isHeartbeatStale: boolean;
};

export function buildRunRecords(
	data: ControlPlaneData,
	sessions: AgentSessionDetail[]
): RunRecord[] {
	const taskMap = new Map(data.tasks.map((task) => [task.id, task]));
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const sessionMap = new Map(sessions.map((session) => [session.id, session]));
	const staleHeartbeatCutoffMs = 5 * 60 * 1000;

	return [...data.runs]
		.map((run) => {
			const task = taskMap.get(run.taskId) ?? null;
			const project = task ? (projectMap.get(task.projectId) ?? null) : null;
			const worker = run.workerId ? (workerMap.get(run.workerId) ?? null) : null;
			const provider = run.providerId ? (providerMap.get(run.providerId) ?? null) : null;
			const session = run.sessionId ? (sessionMap.get(run.sessionId) ?? null) : null;
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
				sessionName: session?.name ?? null,
				sessionState: session?.sessionState ?? null,
				sessionArchivedAt: session?.archivedAt ?? null,
				sessionSummary: session?.sessionSummary ?? null,
				sessionCanResume: session?.canResume ?? false,
				sessionHasActiveRun: session?.hasActiveRun ?? false,
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
