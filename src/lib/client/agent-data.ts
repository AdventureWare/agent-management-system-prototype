import type { AgentThreadDetail } from '$lib/types/agent-thread';
import type {
	SelfImprovementCategory,
	SelfImprovementDecisionReason,
	SelfImprovementSeverity,
	SelfImprovementKnowledgeStatus,
	SelfImprovementSnapshot,
	SelfImprovementStatus
} from '$lib/types/self-improvement';
import type { HomeDashboardData } from '$lib/types/home-dashboard';

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
	options: { includeArchived?: boolean; includeCategorization?: boolean } = {}
) {
	const params = new URLSearchParams();

	if (options.includeArchived) {
		params.set('includeArchived', '1');
	}

	if (options.includeCategorization === false) {
		params.set('includeCategorization', '0');
	}

	const payload = await fetchJson<{
		threads?: AgentThreadDetail[];
	}>(
		`/api/agents/threads${params.size > 0 ? `?${params.toString()}` : ''}`,
		'Could not refresh threads.'
	);

	return payload.threads ?? [];
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

export function fetchHomeDashboard() {
	return fetchJson<HomeDashboardData>('/api/dashboard/home', 'Could not refresh dashboard.');
}

export function fetchSelfImprovementSnapshot(
	options: {
		projectId?: string | null;
		goalId?: string | null;
	} = {}
) {
	const params = new URLSearchParams();

	if (options.projectId?.trim()) {
		params.set('projectId', options.projectId.trim());
	}

	if (options.goalId?.trim()) {
		params.set('goalId', options.goalId.trim());
	}

	return fetchJson<SelfImprovementSnapshot>(
		`/api/improvement/opportunities${params.size > 0 ? `?${params.toString()}` : ''}`,
		'Could not refresh the suggestions queue.'
	);
}

export async function updateSelfImprovementOpportunityStatus(
	opportunityId: string,
	status: SelfImprovementStatus,
	options: {
		decisionSummary?: string;
		decisionReason?: SelfImprovementDecisionReason | null;
		impressionId?: string | null;
	} = {}
) {
	const response = await fetch(`/api/improvement/opportunities/${opportunityId}/status`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			status,
			decisionSummary: options.decisionSummary,
			decisionReason: options.decisionReason ?? null,
			impressionId: options.impressionId ?? null
		})
	});
	const payload = (await response.json().catch(() => ({}))) as { error?: string };

	if (!response.ok) {
		throw new Error(payload.error ?? 'Could not update the suggestion.');
	}
}

export async function captureSelfImprovementSuggestion(input: {
	title: string;
	summary: string;
	category: SelfImprovementCategory;
	severity: SelfImprovementSeverity;
	projectId?: string | null;
	goalId?: string | null;
}) {
	const response = await fetch('/api/improvement/opportunities', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify(input)
	});
	const payload = (await response.json().catch(() => ({}))) as {
		error?: string;
		suggestionId?: string;
	};

	if (!response.ok) {
		throw new Error(payload.error ?? 'Could not capture the suggestion.');
	}

	return payload.suggestionId ?? null;
}

export async function createTaskFromSelfImprovementOpportunity(
	opportunityId: string,
	options: {
		projectId?: string | null;
		goalId?: string | null;
		impressionId?: string | null;
	} = {}
) {
	const response = await fetch(`/api/improvement/opportunities/${opportunityId}/create-task`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			projectId: options.projectId ?? null,
			goalId: options.goalId ?? null,
			impressionId: options.impressionId ?? null
		})
	});
	const payload = (await response.json().catch(() => ({}))) as {
		error?: string;
		taskId?: string;
	};

	if (!response.ok) {
		throw new Error(payload.error ?? 'Could not create a follow-up task from this opportunity.');
	}

	return payload.taskId ?? null;
}

export async function createKnowledgeItemFromSelfImprovementOpportunity(
	opportunityId: string,
	options: {
		goalId?: string | null;
		impressionId?: string | null;
	} = {}
) {
	const response = await fetch(
		`/api/improvement/opportunities/${opportunityId}/create-knowledge-item`,
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				goalId: options.goalId ?? null,
				impressionId: options.impressionId ?? null
			})
		}
	);
	const payload = (await response.json().catch(() => ({}))) as {
		error?: string;
		knowledgeItemId?: string;
	};

	if (!response.ok) {
		throw new Error(payload.error ?? 'Could not capture a saved lesson from this opportunity.');
	}

	return payload.knowledgeItemId ?? null;
}

export async function updateSelfImprovementKnowledgeItemStatus(
	knowledgeItemId: string,
	status: SelfImprovementKnowledgeStatus
) {
	const response = await fetch(`/api/improvement/knowledge-items/${knowledgeItemId}/status`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			status
		})
	});
	const payload = (await response.json().catch(() => ({}))) as { error?: string };

	if (!response.ok) {
		throw new Error(payload.error ?? 'Could not update the saved lesson.');
	}
}
