import { existsSync } from 'node:fs';
import { selectTaskThreadContext } from '$lib/task-thread-context';
import { projectMatchesPath } from '$lib/server/control-plane';
import type { AgentSessionDetail } from '$lib/types/agent-thread';
import type { Project } from '$lib/types/control-plane';

type TaskThreadInput = {
	assignedThread: AgentSessionDetail | null;
	latestRunThread: AgentSessionDetail | null;
};

export function isTaskThreadCompatibleWithProject(
	project: Project | null,
	session: Pick<AgentSessionDetail, 'cwd'> | null | undefined
) {
	if (!project || !session?.cwd) {
		return false;
	}

	return projectMatchesPath(project, session.cwd) && existsSync(session.cwd);
}

export function selectProjectTaskThreadContext(
	project: Project | null,
	input: TaskThreadInput
) {
	const assignedThread = isTaskThreadCompatibleWithProject(project, input.assignedThread)
		? input.assignedThread
		: null;
	const latestRunThread =
		input.latestRunThread?.id === assignedThread?.id ||
		isTaskThreadCompatibleWithProject(project, input.latestRunThread)
			? input.latestRunThread
			: null;

	return selectTaskThreadContext({
		assignedThread,
		latestRunThread
	});
}
