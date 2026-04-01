import type { AgentSessionDetail } from '$lib/types/agent-session';
import type { SelfImprovementStatus } from '$lib/types/self-improvement';
import type { HomeDashboardData } from '$lib/types/home-dashboard';

async function fetchJson<T>(path: string, errorMessage: string): Promise<T> {
	const response = await fetch(path, {
		cache: 'no-store'
	});

	if (!response.ok) {
		throw new Error(errorMessage);
	}

	return (await response.json()) as T;
}

export async function fetchAgentSessions(options: { includeArchived?: boolean } = {}) {
	const includeArchived = options.includeArchived ? '?includeArchived=1' : '';
	const payload = await fetchJson<{ sessions: AgentSessionDetail[] }>(
		`/api/agents/sessions${includeArchived}`,
		'Could not refresh sessions.'
	);

	return payload.sessions;
}

export async function updateAgentSessionArchiveState(sessionIds: string[], archived: boolean) {
	const response = await fetch('/api/agents/sessions/archive', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			sessionIds,
			archived
		})
	});
	const payload = (await response.json()) as { error?: string; updatedSessionIds?: string[] };

	if (!response.ok) {
		throw new Error(payload.error ?? 'Could not update thread archive state.');
	}

	return payload.updatedSessionIds ?? [];
}

export async function fetchAgentSession(sessionId: string) {
	const response = await fetch(`/api/agents/sessions/${sessionId}`, {
		cache: 'no-store'
	});

	if (response.status === 404) {
		throw new Error('Session not found.');
	}

	if (!response.ok) {
		throw new Error('Could not refresh the thread.');
	}

	const payload = (await response.json()) as { session: AgentSessionDetail };
	return payload.session;
}

export function fetchHomeDashboard() {
	return fetchJson<HomeDashboardData>('/api/dashboard/home', 'Could not refresh dashboard.');
}

export async function updateSelfImprovementOpportunityStatus(
	opportunityId: string,
	status: SelfImprovementStatus,
	decisionSummary?: string
) {
	const response = await fetch(`/api/improvement/opportunities/${opportunityId}/status`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			status,
			decisionSummary
		})
	});
	const payload = (await response.json().catch(() => ({}))) as { error?: string };

	if (!response.ok) {
		throw new Error(payload.error ?? 'Could not update the self-improvement opportunity.');
	}
}

export async function createTaskFromSelfImprovementOpportunity(opportunityId: string) {
	const response = await fetch(`/api/improvement/opportunities/${opportunityId}/create-task`, {
		method: 'POST'
	});
	const payload = (await response.json().catch(() => ({}))) as {
		error?: string;
		taskId?: string;
	};

	if (!response.ok) {
		throw new Error(payload.error ?? 'Could not create a draft task from this opportunity.');
	}

	return payload.taskId ?? null;
}
