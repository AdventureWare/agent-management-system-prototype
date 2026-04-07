import { existsSync } from 'node:fs';
import { selectTaskThreadContext } from '$lib/task-thread-context';
import { projectMatchesPath } from '$lib/server/control-plane';
import type { AgentThreadDetail } from '$lib/types/agent-thread';
import type { Project } from '$lib/types/control-plane';

type TaskThreadInput = {
	assignedThread: AgentThreadDetail | null;
	latestRunThread: AgentThreadDetail | null;
};

function sessionHasRequiredWritableRoots(
	project: Project,
	session: Pick<AgentThreadDetail, 'additionalWritableRoots'> | null | undefined
) {
	const requiredRoots = project.additionalWritableRoots ?? [];

	if (requiredRoots.length === 0) {
		return true;
	}

	const sessionRoots = new Set(session?.additionalWritableRoots ?? []);
	return requiredRoots.every((root) => sessionRoots.has(root));
}

export function isTaskThreadCompatibleWithProject(
	project: Project | null,
	session: Pick<AgentThreadDetail, 'cwd' | 'additionalWritableRoots'> | null | undefined
) {
	if (!project || !session?.cwd) {
		return false;
	}

	return (
		projectMatchesPath(project, session.cwd) &&
		sessionHasRequiredWritableRoots(project, session) &&
		existsSync(session.cwd)
	);
}

export function selectProjectTaskThreadContext(project: Project | null, input: TaskThreadInput) {
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
