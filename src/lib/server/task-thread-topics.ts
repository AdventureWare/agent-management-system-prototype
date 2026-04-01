import type { AgentRunDetail } from '$lib/types/agent-session';
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

const DOMAIN_PROFILES = [
	{
		label: 'Planning',
		keywords: [
			'brief',
			'goal',
			'ideation',
			'plan',
			'planning',
			'proposal',
			'roadmap',
			'scope',
			'spec'
		]
	},
	{
		label: 'Coordination',
		keywords: [
			'assign',
			'assignment',
			'coordination',
			'manager',
			'orchestration',
			'queue',
			'routing',
			'worker',
			'workflow'
		]
	},
	{
		label: 'UI/UX',
		keywords: [
			'component',
			'css',
			'design',
			'frontend',
			'interface',
			'layout',
			'page',
			'style',
			'svelte',
			'ux',
			'ui'
		]
	},
	{
		label: 'Backend/API',
		keywords: [
			'api',
			'auth',
			'backend',
			'endpoint',
			'handler',
			'request',
			'response',
			'route',
			'server'
		]
	},
	{
		label: 'Data',
		keywords: [
			'database',
			'json',
			'metadata',
			'migration',
			'model',
			'persist',
			'persistence',
			'schema',
			'state',
			'storage'
		]
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
		keywords: [
			'build',
			'ci',
			'deploy',
			'environment',
			'heartbeat',
			'infra',
			'log',
			'monitoring',
			'runtime'
		]
	},
	{
		label: 'Research',
		keywords: [
			'analyze',
			'audit',
			'compare',
			'discover',
			'evaluate',
			'investigate',
			'research',
			'review'
		]
	},
	{
		label: 'Integrations',
		keywords: [
			'connector',
			'github',
			'integration',
			'linear',
			'mcp',
			'oauth',
			'openai',
			'plugin',
			'slack',
			'vercel'
		]
	}
] as const;

const DOMAIN_KEYWORDS = new Set<string>(DOMAIN_PROFILES.flatMap((profile) => profile.keywords));

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

function tokenizeTopicText(value: string) {
	return value
		.toLowerCase()
		.split(/[^a-z0-9]+/g)
		.map((token) => token.trim())
		.filter(Boolean);
}

function accumulateTopicSignals(
	sources: WeightedTextSource[],
	lanes: Array<Lane | null | undefined>
) {
	const domainScores = new Map<string, number>();
	const keywordScores = new Map<string, number>();

	for (const lane of lanes) {
		if (!lane) {
			continue;
		}

		const label = LANE_TOPIC_LABELS[lane];
		domainScores.set(label, (domainScores.get(label) ?? 0) + 6);
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

		for (const profile of DOMAIN_PROFILES) {
			const matches = profile.keywords.filter((keyword) => uniqueTokens.has(keyword)).length;

			if (matches > 0) {
				domainScores.set(
					profile.label,
					(domainScores.get(profile.label) ?? 0) + source.weight * matches
				);
			}
		}

		for (const token of tokens) {
			if (token.length < 4 || TOPIC_STOP_WORDS.has(token) || DOMAIN_KEYWORDS.has(token)) {
				continue;
			}

			keywordScores.set(token, (keywordScores.get(token) ?? 0) + source.weight);
		}
	}

	return { domainScores, keywordScores };
}

function compareScoredEntries(left: [string, number], right: [string, number]) {
	if (left[1] !== right[1]) {
		return right[1] - left[1];
	}

	return left[0].localeCompare(right[0]);
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

function buildTopicLabelsFromSignals(input: {
	domainScores: Map<string, number>;
	keywordScores: Map<string, number>;
	maxLabels?: number;
}) {
	const labels: string[] = [];

	for (const [label] of [...input.domainScores.entries()].sort(compareScoredEntries)) {
		labels.push(label);

		if (labels.length >= (input.maxLabels ?? 4)) {
			return labels;
		}
	}

	for (const [token] of [...input.keywordScores.entries()].sort(compareScoredEntries)) {
		const label = formatKeywordTopicLabel(token);

		if (labels.some((existing) => normalizeTopicLabel(existing) === normalizeTopicLabel(label))) {
			continue;
		}

		labels.push(label);

		if (labels.length >= (input.maxLabels ?? 4)) {
			break;
		}
	}

	return labels;
}

export function normalizeTopicLabel(label: string) {
	return label.trim().toLowerCase();
}

export function deriveTaskTopicLabels(task: Pick<Task, 'title' | 'summary' | 'lane'>) {
	const { domainScores, keywordScores } = accumulateTopicSignals(
		[
			{ text: task.title, weight: 4 },
			{ text: task.summary, weight: 3 }
		],
		[task.lane]
	);

	return buildTopicLabelsFromSignals({ domainScores, keywordScores });
}

export function deriveThreadTopicLabels(input: ThreadTopicInput) {
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

	const { domainScores, keywordScores } = accumulateTopicSignals(sources, lanes);

	return buildTopicLabelsFromSignals({ domainScores, keywordScores });
}
