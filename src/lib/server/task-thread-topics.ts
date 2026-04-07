import type { AgentRunDetail } from '$lib/types/agent-thread';
import type { ThreadCategorization } from '$lib/types/thread-categorization';
import type { Area, Task } from '$lib/types/control-plane';

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
			'breakpoint',
			'component',
			'css',
			'design',
			'frontend',
			'interface',
			'layout',
			'mobile',
			'page',
			'resize',
			'resizing',
			'responsive',
			'style',
			'svelte',
			'ux',
			'ui',
			'viewport'
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

const AREA_TOPIC_LABELS: Record<Area, string> = {
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
	projectId?: string | null;
	projectName?: string | null;
	goalId?: string | null;
	goalName?: string | null;
	area?: Area | null;
	desiredRole?: string | null;
	requiredCapabilityNames?: string[];
	requiredToolNames?: string[];
	isPrimary?: boolean;
};

type ThreadTopicInput = {
	threadName?: string;
	threadSummary?: string | null;
	runDetails: Array<Pick<AgentRunDetail, 'prompt' | 'lastMessage'>>;
	relatedTasks: ThreadTopicTask[];
};

type CategorizationSignalState = {
	areaScores: Map<string, number>;
	focusScores: Map<string, number>;
	entityScores: Map<string, number>;
	roleScores: Map<string, number>;
	capabilityScores: Map<string, number>;
	toolScores: Map<string, number>;
	keywordScores: Map<string, number>;
};

const LABEL_OVERRIDES: Record<string, string> = {
	api: 'API',
	ci: 'CI',
	codex: 'Codex',
	github: 'GitHub',
	ios: 'iOS',
	mcp: 'MCP',
	openai: 'OpenAI',
	swiftui: 'SwiftUI',
	sveltekit: 'SvelteKit',
	ui: 'UI',
	ux: 'UX',
	xcodebuild: 'Xcodebuild'
};

function tokenizeTopicText(value: string) {
	return value
		.toLowerCase()
		.split(/[^a-z0-9]+/g)
		.map((token) => token.trim())
		.filter(Boolean);
}

function formatStructuredLabel(value: string) {
	const normalized = value
		.trim()
		.replace(/^role[_-]+/i, '')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();

	if (!normalized) {
		return '';
	}

	return normalized
		.split(' ')
		.map((token) => LABEL_OVERRIDES[token] ?? `${token.charAt(0).toUpperCase()}${token.slice(1)}`)
		.join(' ');
}

function accumulateStructuredLabels(
	scores: Map<string, number>,
	values: string[] | null | undefined,
	weight: number
) {
	for (const value of new Set(
		(values ?? []).map((candidate) => formatStructuredLabel(candidate)).filter(Boolean)
	)) {
		scores.set(value, (scores.get(value) ?? 0) + weight);
	}
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
	areas: Array<Area | null | undefined>
): CategorizationSignalState {
	const areaScores = new Map<string, number>();
	const focusScores = new Map<string, number>();
	const entityScores = new Map<string, number>();
	const roleScores = new Map<string, number>();
	const capabilityScores = new Map<string, number>();
	const toolScores = new Map<string, number>();
	const keywordScores = new Map<string, number>();

	for (const area of areas) {
		if (!area) {
			continue;
		}

		const label = AREA_TOPIC_LABELS[area];
		areaScores.set(label, (areaScores.get(label) ?? 0) + 6);
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
		areaScores,
		focusScores,
		entityScores,
		roleScores,
		capabilityScores,
		toolScores,
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
	return [...scores.entries()]
		.sort(compareScoredEntries)
		.slice(0, maxCount)
		.map(([label]) => label);
}

function selectPrimaryFirstLabels(
	relatedTasks: ThreadTopicTask[],
	options: {
		idSelector: (task: ThreadTopicTask) => string | null | undefined;
		labelSelector: (task: ThreadTopicTask) => string | null | undefined;
		maxCount: number;
	}
) {
	return relatedTasks
		.filter(
			(task) => Boolean(options.idSelector(task)) && Boolean(options.labelSelector(task)?.trim())
		)
		.sort((left, right) => {
			if (Boolean(left.isPrimary) !== Boolean(right.isPrimary)) {
				return left.isPrimary ? -1 : 1;
			}

			return (options.labelSelector(left) ?? '').localeCompare(options.labelSelector(right) ?? '');
		})
		.map((task) => options.labelSelector(task)?.trim() ?? '')
		.filter(
			(label, index, labels) =>
				Boolean(label) &&
				labels.findIndex(
					(candidate) => normalizeTopicLabel(candidate) === normalizeTopicLabel(label)
				) === index
		)
		.slice(0, options.maxCount);
}

function collectUniqueIds(
	relatedTasks: ThreadTopicTask[],
	selector: (task: ThreadTopicTask) => string | null | undefined
) {
	return [...new Set(relatedTasks.map((task) => selector(task)?.trim() ?? '').filter(Boolean))];
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
		...categorization.areaLabels.slice(0, 1),
		...categorization.focusLabels.slice(0, 2),
		...categorization.entityLabels.slice(0, 1),
		...categorization.roleLabels.slice(0, 1),
		...categorization.capabilityLabels.slice(0, 1),
		...categorization.toolLabels.slice(0, 1),
		...categorization.keywordLabels.slice(0, 2)
	].slice(0, maxLabels);
}

function buildCategorizationFromSignals(input: CategorizationSignalState): ThreadCategorization {
	const areaLabels = selectLabels(input.areaScores, 1);
	const focusLabels = selectLabels(input.focusScores, 3);
	const entityLabels = selectLabels(input.entityScores, 3);
	const roleLabels = selectLabels(input.roleScores, 2);
	const capabilityLabels = selectLabels(input.capabilityScores, 3);
	const toolLabels = selectLabels(input.toolScores, 3);
	const keywordLabels = selectLabels(input.keywordScores, 4)
		.map((token) => formatKeywordTopicLabel(token))
		.filter((label) => {
			const normalized = normalizeTopicLabel(label);

			return ![
				...areaLabels,
				...focusLabels,
				...entityLabels,
				...roleLabels,
				...capabilityLabels,
				...toolLabels
			].some((existing) => normalizeTopicLabel(existing) === normalized);
		});

	const categorization = {
		projectIds: [],
		projectLabels: [],
		goalIds: [],
		goalLabels: [],
		areaLabels,
		focusLabels,
		entityLabels,
		roleLabels,
		capabilityLabels,
		toolLabels,
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
	task: Pick<Task, 'title' | 'summary' | 'area'> &
		Partial<Pick<Task, 'desiredRoleId' | 'requiredCapabilityNames' | 'requiredToolNames'>>
) {
	const signals = accumulateCategorizationSignals(
		[
			{ text: task.title, weight: 4 },
			{ text: task.summary, weight: 3 }
		],
		[task.area]
	);
	accumulateStructuredLabels(signals.roleScores, task.desiredRoleId ? [task.desiredRoleId] : [], 3);
	accumulateStructuredLabels(signals.capabilityScores, task.requiredCapabilityNames, 3);
	accumulateStructuredLabels(signals.toolScores, task.requiredToolNames, 3);

	return buildCategorizationFromSignals(signals);
}

export function deriveTaskTopicLabels(
	task: Pick<Task, 'title' | 'summary' | 'area'> &
		Partial<Pick<Task, 'desiredRoleId' | 'requiredCapabilityNames' | 'requiredToolNames'>>
) {
	return deriveTaskCategorization(task).labels;
}

export function deriveThreadCategorization(input: ThreadTopicInput) {
	const sources: WeightedTextSource[] = [
		{ text: input.threadName ?? '', weight: 3 },
		{ text: input.threadSummary ?? null, weight: 1 }
	];
	const areas: Array<Area | null | undefined> = [];

	for (const task of input.relatedTasks) {
		const titleWeight = task.isPrimary ? 5 : 3;
		const summaryWeight = task.isPrimary ? 3 : 2;

		sources.push({ text: task.title, weight: titleWeight });
		sources.push({ text: task.summary, weight: summaryWeight });
		areas.push(task.area);
	}

	for (const runDetail of input.runDetails.slice(0, 3)) {
		sources.push({ text: runDetail.prompt, weight: 2 });
		sources.push({ text: runDetail.lastMessage, weight: 2 });
	}
	const signals = accumulateCategorizationSignals(sources, areas);
	const projectLabels = selectPrimaryFirstLabels(input.relatedTasks, {
		idSelector: (task) => task.projectId,
		labelSelector: (task) => task.projectName,
		maxCount: 2
	});
	const goalLabels = selectPrimaryFirstLabels(input.relatedTasks, {
		idSelector: (task) => task.goalId,
		labelSelector: (task) => task.goalName,
		maxCount: 3
	});

	for (const task of input.relatedTasks) {
		const structuredWeight = task.isPrimary ? 4 : 2;
		accumulateStructuredLabels(
			signals.roleScores,
			task.desiredRole ? [task.desiredRole] : [],
			structuredWeight
		);
		accumulateStructuredLabels(
			signals.capabilityScores,
			task.requiredCapabilityNames,
			structuredWeight
		);
		accumulateStructuredLabels(signals.toolScores, task.requiredToolNames, structuredWeight);
	}

	return {
		...buildCategorizationFromSignals(signals),
		projectIds: collectUniqueIds(input.relatedTasks, (task) => task.projectId),
		projectLabels,
		goalIds: collectUniqueIds(input.relatedTasks, (task) => task.goalId),
		goalLabels
	};
}

export function deriveThreadTopicLabels(input: ThreadTopicInput) {
	return deriveThreadCategorization(input).labels;
}
