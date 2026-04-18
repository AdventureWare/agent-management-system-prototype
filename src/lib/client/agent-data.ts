import type { AgentThreadDetail, AgentThreadStatusSnapshot } from '$lib/types/agent-thread';

export async function fetchJson<T>(path: string, errorMessage: string): Promise<T> {
	const response = await fetch(path, {
		cache: 'no-store'
	});

	if (!response.ok) {
		throw new Error(errorMessage);
	}

	return (await response.json()) as T;
}

export async function fetchAgentThreads(
	options: {
		includeArchived?: boolean;
		includeCategorization?: boolean;
		includeTargets?: boolean;
		includeExternal?: boolean;
		includeManaged?: boolean;
		reconcileTaskState?: boolean;
		threadIds?: string[];
	} = {}
) {
	const params = new URLSearchParams();

	if (options.includeArchived) {
		params.set('includeArchived', '1');
	}

	if (options.includeCategorization === false) {
		params.set('includeCategorization', '0');
	}

	if (options.includeTargets === false) {
		params.set('includeTargets', '0');
	}

	if (options.includeExternal === false) {
		params.set('includeExternal', '0');
	}

	if (options.includeManaged === false) {
		params.set('includeManaged', '0');
	}

	if (options.reconcileTaskState === false) {
		params.set('reconcileTaskState', '0');
	}

	for (const threadId of options.threadIds ?? []) {
		if (threadId.trim()) {
			params.append('threadId', threadId.trim());
		}
	}

	const payload = await fetchJson<{
		threads?: AgentThreadDetail[];
	}>(
		`/api/agents/threads${params.size > 0 ? `?${params.toString()}` : ''}`,
		'Could not refresh threads.'
	);

	return payload.threads ?? [];
}

export async function fetchAgentThreadStatuses(threadIds: string[]) {
	const params = new URLSearchParams();

	for (const threadId of threadIds) {
		if (threadId.trim()) {
			params.append('threadId', threadId.trim());
		}
	}

	if (params.size === 0) {
		return [];
	}

	const payload = await fetchJson<{
		statuses?: AgentThreadStatusSnapshot[];
	}>(`/api/agents/threads/status?${params.toString()}`, 'Could not refresh thread activity.');

	return payload.statuses ?? [];
}

export async function updateAgentThreadArchiveState(threadIds: string[], archived: boolean) {
	const response = await fetch('/api/agents/threads/archive', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			threadIds,
			sessionIds: threadIds,
			archived
		})
	});
	const payload = (await response.json()) as {
		error?: string;
		updatedThreadIds?: string[];
	};

	if (!response.ok) {
		throw new Error(payload.error ?? 'Could not update thread archive state.');
	}

	return payload.updatedThreadIds ?? [];
}

export async function fetchAgentThread(threadId: string) {
	const response = await fetch(`/api/agents/threads/${threadId}`, {
		cache: 'no-store'
	});

	if (response.status === 404) {
		throw new Error('Thread not found.');
	}

	if (!response.ok) {
		throw new Error('Could not refresh the thread.');
	}

	const payload = (await response.json()) as {
		thread?: AgentThreadDetail;
	};
	const thread = payload.thread;

	if (!thread) {
		throw new Error('Could not refresh the thread.');
	}

	return thread;
}
