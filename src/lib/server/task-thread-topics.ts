import type { AgentRunDetail } from '$lib/types/agent-session';
import type { ThreadCategorization } from '$lib/types/thread-categorization';
import type { Lane, Task } from '$lib/types/control-plane';

const TOPIC_STOP_WORDS = new Set<string>([
	'a',
	'an',
	'and',
	'are',
	'build',
	'change',
	'changes',
	'codex',
	'continue',
	'create',
	'default',
	'execute',
	'flow',
	'follow',
	'from',
	'get',
	'into',
	'its',
	'like',
	'make',
	'management',
	'new',
	'prototype',
	'relevant',
	'run',
	'runs',
	'session',
	'sessions',
	'should',
	'start',
	'system',
	'task',
	'tasks',
	'that',
	'the',
	'them',
	'they',
	'this',
	'thread',
	'threads',
	'time',
	'topic',
	'topics',
	'update',
	'using',
	'with',
	'work'
]);

const FOCUS_PROFILES = [
	{
		label: 'Planning',
		keywords: ['brief', 'goal', 'ideation', 'plan', 'planning', 'proposal', 'roadmap', 'scope', 'spec']
	},
	{
		label: 'Coordination',
		keywords: ['assign', 'assignment', 'coordination', 'manager', 'orchestration', 'queue', 'routing', 'worker', 'workflow']
	},
	{
		label: 'UI/UX',
		keywords: ['component', 'css', 'design', 'frontend', 'interface', 'layout', 'page', 'style', 'svelte', 'ux', 'ui']
	},
	{
		label: 'Backend/API',
		keywords: ['api', 'auth', 'backend', 'endpoint', 'handler', 'request', 'response', 'route', 'server']
	},
	{
		label: 'Data',
		keywords: ['database', 'json', 'metadata', 'migration', 'model', 'persist', 'persistence', 'schema', 'state', 'storage']
	},
	{
		label: 'Testing',
		keywords: ['coverage', 'e2e', 'playwright', 'regression', 'spec', 'test', 'testing', 'vitest']
	},
	{
		label: 'Documentation',
		keywords: ['copy', 'docs', 'documentation', 'guide', 'prompt', 'readme', 'writeup']
	},
	{
		label: 'Operations',
		keywords: ['build', 'ci', 'deploy', 'environment', 'heartbeat', 'infra', 'log', 'monitoring', 'runtime']
	},
	{
		label: 'Research',
		keywords: ['analyze', 'audit', 'compare', 'discover', 'evaluate', 'investigate', 'research', 'review']
	},
	{
		label: 'Integrations',
		keywords: ['connector', 'github', 'integration', 'linear', 'mcp', 'oauth', 'openai', 'plugin', 'slack', 'vercel']
	}
] as const;

const ENTITY_PROFILES = [
	{
		label: 'Attachment',
		keywords: ['artifact', 'artifacts', 'attachment', 'attachments', 'file', 'files', 'upload']
	},
	{
		label: 'Browser',
		keywords: ['browser', 'browsers', 'playwright']
	},
	{
		label: 'Thread',
		keywords: ['conversation', 'resume', 'reuse', 'thread', 'threads']
	},
	{
		label: 'Task',
		keywords: ['backlog', 'queue', 'task', 'tasks']
	},
	{
		label: 'Goal',
		keywords: ['goal', 'goals']
	},
	{
		label: 'Project',
		keywords: ['project', 'projects', 'repo', 'repos', 'repository', 'workspace']
	},
	{
		label: 'Worker',
		keywords: ['provider', 'providers', 'role', 'roles', 'worker', 'workers']
	},
	{
		label: 'Run',
		keywords: ['execution', 'executions', 'heartbeat', 'run', 'runs']
	},
	{
		label: 'Review',
		keywords: ['approval', 'approvals', 'decision', 'decisions', 'review', 'reviews']
	},
	{
		label: 'Knowledge',
		keywords: ['context', 'knowledge', 'ontology', 'taxonomies', 'taxonomy']
	},
	{
		label: 'Prompt',
		keywords: ['instruction', 'instructions', 'prompt', 'prompts', 'skill', 'skills']
	}
] as const;

const FOCUS_KEYWORDS = new Set<string>(FOCUS_PROFILES.flatMap((profile) => profile.keywords));
const ENTITY_KEYWORDS = new Set<string>(ENTITY_PROFILES.flatMap((profile) => profile.keywords));

const LANE_TOPIC_LABELS: Record<Lane, string> = {
	product: 'Product',
	growth: 'Growth',
	ops: 'Operations'
};

type WeightedTextSource = {
	text: string | null | undefined;
	weight: number;
};

type ThreadTopicTask = {
	title: string;
	summary?: string | null;
	lane?: Lane | null;
	isPrimary?: boolean;
};

type ThreadTopicInput = {
	sessionName: string;
	sessionSummary: string | null;
	runDetails: Array<Pick<AgentRunDetail, 'prompt' | 'lastMessage'>>;
	relatedTasks: ThreadTopicTask[];
};

type CategorizationSignalState = {
	laneScores: Map<string, number>;
	focusScores: Map<string, number>;
	entityScores: Map<string, number>;
	keywordScores: Map<string, number>;
};

function tokenizeTopicText(value: string) {
	return value
		.toLowerCase()
		.split(/[^a-z0-9]+/g)
		.map((token) => token.trim())
		.filter(Boolean);
}

function accumulateProfileScores(
	profiles: ReadonlyArray<{ label: string; keywords: readonly string[] }>,
	tokens: Set<string>,
	weight: number
) {
	const scores = new Map<string, number>();

	for (const profile of profiles) {
		const matches = profile.keywords.filter((keyword) => {
			if (keyword.endsWith('y')) {
				return tokens.has(keyword) || tokens.has(`${keyword.slice(0, -1)}ies`);
			}

			return tokens.has(keyword);
		}).length;

		if (matches > 0) {
			scores.set(profile.label, weight * matches);
		}
	}

	return scores;
}

function accumulateCategorizationSignals(
	sources: WeightedTextSource[],
	lanes: Array<Lane | null | undefined>
): CategorizationSignalState {
	const laneScores = new Map<string, number>();
	const focusScores = new Map<string, number>();
	const entityScores = new Map<string, number>();
	const keywordScores = new Map<string, number>();

	for (const lane of lanes) {
		if (!lane) {
			continue;
		}

		const label = LANE_TOPIC_LABELS[lane];
		laneScores.set(label, (laneScores.get(label) ?? 0) + 6);
	}

	for (const source of sources) {
		if (!source.text?.trim()) {
			continue;
		}

		const tokens = tokenizeTopicText(source.text);

		if (tokens.length === 0) {
			continue;
		}

		const uniqueTokens = new Set(tokens);
		const focusMatches = accumulateProfileScores(FOCUS_PROFILES, uniqueTokens, source.weight);
		const entityMatches = accumulateProfileScores(ENTITY_PROFILES, uniqueTokens, source.weight);

		for (const [label, score] of focusMatches) {
			focusScores.set(label, (focusScores.get(label) ?? 0) + score);
		}

		for (const [label, score] of entityMatches) {
			entityScores.set(label, (entityScores.get(label) ?? 0) + score);
		}

		for (const token of tokens) {
			if (
				token.length < 4 ||
				TOPIC_STOP_WORDS.has(token) ||
				FOCUS_KEYWORDS.has(token) ||
				ENTITY_KEYWORDS.has(token)
			) {
				continue;
			}

			keywordScores.set(token, (keywordScores.get(token) ?? 0) + source.weight);
		}
	}

	return {
		laneScores,
		focusScores,
		entityScores,
		keywordScores
	};
}

function compareScoredEntries(left: [string, number], right: [string, number]) {
	if (left[1] !== right[1]) {
		return right[1] - left[1];
	}

	return left[0].localeCompare(right[0]);
}

function selectLabels(scores: Map<string, number>, maxCount: number) {
	return [...scores.entries()].sort(compareScoredEntries).slice(0, maxCount).map(([label]) => label);
}

function formatKeywordTopicLabel(token: string) {
	const singular =
		token.endsWith('ies') && token.length > 4
			? `${token.slice(0, -3)}y`
			: token.endsWith('s') && token.length > 5 && !token.endsWith('ss')
				? token.slice(0, -1)
				: token;

	return singular.charAt(0).toUpperCase() + singular.slice(1);
}

function buildCompactTopicLabels(categorization: ThreadCategorization, maxLabels = 4) {
	return [
		...categorization.laneLabels.slice(0, 1),
		...categorization.focusLabels.slice(0, 2),
		...categorization.entityLabels.slice(0, 1),
		...categorization.keywordLabels.slice(0, 2)
	].slice(0, maxLabels);
}

function buildCategorizationFromSignals(input: CategorizationSignalState): ThreadCategorization {
	const laneLabels = selectLabels(input.laneScores, 1);
	const focusLabels = selectLabels(input.focusScores, 3);
	const entityLabels = selectLabels(input.entityScores, 3);
	const keywordLabels = selectLabels(input.keywordScores, 4)
		.map((token) => formatKeywordTopicLabel(token))
		.filter((label) => {
			const normalized = normalizeTopicLabel(label);

			return ![...laneLabels, ...focusLabels, ...entityLabels].some(
				(existing) => normalizeTopicLabel(existing) === normalized
			);
		});

	const categorization = {
		laneLabels,
		focusLabels,
		entityLabels,
		keywordLabels,
		labels: []
	} satisfies ThreadCategorization;

	return {
		...categorization,
		labels: buildCompactTopicLabels(categorization)
	};
}

export function normalizeTopicLabel(label: string) {
	return label.trim().toLowerCase();
}

export function deriveTaskCategorization(
	task: Pick<Task, 'title' | 'summary' | 'lane' | 'requiredCapabilityNames' | 'requiredToolNames'>
) {
	const { laneScores, focusScores, entityScores, keywordScores } = accumulateCategorizationSignals(
		[
			{ text: task.title, weight: 4 },
			{ text: task.summary, weight: 3 },
			{ text: task.requiredCapabilityNames?.join(' '), weight: 2 },
			{ text: task.requiredToolNames?.join(' '), weight: 2 }
		],
		[task.lane]
	);

	return buildCategorizationFromSignals({ laneScores, focusScores, entityScores, keywordScores });
}

export function deriveTaskTopicLabels(
	task: Pick<Task, 'title' | 'summary' | 'lane' | 'requiredCapabilityNames' | 'requiredToolNames'>
) {
	return deriveTaskCategorization(task).labels;
}

export function deriveThreadCategorization(input: ThreadTopicInput) {
	const sources: WeightedTextSource[] = [
		{ text: input.sessionName, weight: 3 },
		{ text: input.sessionSummary, weight: 1 }
	];
	const lanes: Array<Lane | null | undefined> = [];

	for (const task of input.relatedTasks) {
		const titleWeight = task.isPrimary ? 5 : 3;
		const summaryWeight = task.isPrimary ? 3 : 2;

		sources.push({ text: task.title, weight: titleWeight });
		sources.push({ text: task.summary, weight: summaryWeight });
		lanes.push(task.lane);
	}

	for (const runDetail of input.runDetails.slice(0, 3)) {
		sources.push({ text: runDetail.prompt, weight: 2 });
		sources.push({ text: runDetail.lastMessage, weight: 2 });
	}

	return buildCategorizationFromSignals(accumulateCategorizationSignals(sources, lanes));
}

export function deriveThreadTopicLabels(input: ThreadTopicInput) {
	return deriveThreadCategorization(input).labels;
}
