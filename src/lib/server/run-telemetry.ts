import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadControlPlane, updateControlPlaneCollections } from '$lib/server/control-plane';
import type {
	ControlPlaneData,
	Provider,
	ProviderModelPricing,
	Run,
	RunCostSource,
	RunUsageSource
} from '$lib/types/control-plane';

type RunSpendRollupItem = {
	key: string;
	label: string;
	runCount: number;
	totalCostUsd: number;
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	attentionRunCount: number;
};

type RunUsageCostSummary = {
	spendLast24hUsd: number;
	spendLast7dUsd: number;
	failedOrCanceledSpendLast7dRatio: number | null;
	highCostRuns: Array<{
		runId: string;
		taskId: string;
		taskTitle: string;
		providerName: string;
		modelUsed: string | null;
		status: string;
		estimatedCostUsd: number;
	}>;
	rollups: {
		byProvider: RunSpendRollupItem[];
		byActor: RunSpendRollupItem[];
		byProject: RunSpendRollupItem[];
		byGoal: RunSpendRollupItem[];
	};
};

type ManagedRunTelemetrySnapshot = {
	modelUsed: string | null;
	usageSource: RunUsageSource;
	inputTokens: number | null;
	cachedInputTokens: number | null;
	outputTokens: number | null;
	uncachedInputTokens: number | null;
	usageCapturedAt: string | null;
};

const AGENT_THREADS_ROOT = resolve(process.cwd(), 'data', 'agent-threads');

function getManagedRunPaths(agentThreadId: string, agentThreadRunId: string) {
	const runRoot = resolve(AGENT_THREADS_ROOT, agentThreadId, 'runs', agentThreadRunId);

	return {
		summaryPath: resolve(runRoot, 'summary.json'),
		logPath: resolve(runRoot, 'codex.log')
	};
}

function normalizeOptionalText(value: unknown) {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	return normalized ? normalized : null;
}

function normalizeNonNegativeNumber(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeManagedRunTelemetry(
	candidate: Record<string, unknown>
): ManagedRunTelemetrySnapshot {
	const inputTokens = normalizeNonNegativeNumber(candidate.inputTokens);
	const cachedInputTokens = normalizeNonNegativeNumber(candidate.cachedInputTokens);
	const outputTokens = normalizeNonNegativeNumber(candidate.outputTokens);
	const uncachedInputTokens =
		normalizeNonNegativeNumber(candidate.uncachedInputTokens) ??
		(inputTokens !== null ? Math.max(inputTokens - (cachedInputTokens ?? 0), 0) : null);

	return {
		modelUsed: normalizeOptionalText(candidate.modelUsed),
		usageSource:
			inputTokens !== null || cachedInputTokens !== null || outputTokens !== null
				? 'provider_reported'
				: 'missing',
		inputTokens,
		cachedInputTokens,
		outputTokens,
		uncachedInputTokens,
		usageCapturedAt: normalizeOptionalText(candidate.usageCapturedAt)
	};
}

function parseTurnCompletedLine(line: string) {
	try {
		const parsed = JSON.parse(line) as {
			type?: string;
			usage?: {
				input_tokens?: number;
				cached_input_tokens?: number;
				output_tokens?: number;
			};
		};

		if (parsed.type !== 'turn.completed') {
			return null;
		}

		const inputTokens = normalizeNonNegativeNumber(parsed.usage?.input_tokens);
		const cachedInputTokens = normalizeNonNegativeNumber(parsed.usage?.cached_input_tokens);
		const outputTokens = normalizeNonNegativeNumber(parsed.usage?.output_tokens);

		return {
			inputTokens,
			cachedInputTokens,
			outputTokens,
			uncachedInputTokens:
				inputTokens !== null ? Math.max(inputTokens - (cachedInputTokens ?? 0), 0) : null,
			usageCapturedAt: null
		};
	} catch {
		return null;
	}
}

async function readManagedRunTelemetrySnapshot(input: {
	agentThreadId: string;
	agentThreadRunId: string;
	fallbackModel: string | null;
}): Promise<ManagedRunTelemetrySnapshot> {
	const paths = getManagedRunPaths(input.agentThreadId, input.agentThreadRunId);
	const defaultSnapshot: ManagedRunTelemetrySnapshot = {
		modelUsed: input.fallbackModel,
		usageSource: 'missing',
		inputTokens: null,
		cachedInputTokens: null,
		outputTokens: null,
		uncachedInputTokens: null,
		usageCapturedAt: null
	};

	if (existsSync(paths.summaryPath)) {
		try {
			const raw = JSON.parse(await readFile(paths.summaryPath, 'utf8')) as {
				modelUsed?: string | null;
				usage?: Record<string, unknown> | null;
			};
			const usage = raw.usage && typeof raw.usage === 'object' ? raw.usage : null;

			if (usage) {
				const normalized = normalizeManagedRunTelemetry({
					modelUsed: raw.modelUsed ?? input.fallbackModel,
					...usage
				});

				if (normalized.usageSource === 'provider_reported' || normalized.modelUsed) {
					return normalized;
				}
			} else if (raw.modelUsed) {
				defaultSnapshot.modelUsed = normalizeOptionalText(raw.modelUsed);
			}
		} catch {
			// Fall back to the raw log when the summary is unreadable or from an older schema.
		}
	}

	if (!existsSync(paths.logPath)) {
		return defaultSnapshot;
	}

	try {
		const log = await readFile(paths.logPath, 'utf8');
		const lines = log.split('\n');
		let usage: ReturnType<typeof parseTurnCompletedLine> = null;

		for (const line of lines) {
			const parsed = parseTurnCompletedLine(line);

			if (parsed) {
				usage = parsed;
			}
		}

		if (!usage) {
			return defaultSnapshot;
		}

		return {
			...defaultSnapshot,
			usageSource: 'provider_reported',
			inputTokens: usage.inputTokens,
			cachedInputTokens: usage.cachedInputTokens,
			outputTokens: usage.outputTokens,
			uncachedInputTokens: usage.uncachedInputTokens,
			usageCapturedAt: usage.usageCapturedAt
		};
	} catch {
		return defaultSnapshot;
	}
}

function findProviderModelPricing(provider: Provider | null, modelUsed: string | null) {
	if (!provider || !modelUsed) {
		return null;
	}

	const normalizedModel = modelUsed.trim().toLowerCase();

	return (
		provider.modelPricing?.find(
			(pricing) => pricing.model.trim().toLowerCase() === normalizedModel
		) ?? null
	);
}

function estimateRunCostUsd(input: {
	modelPricing: ProviderModelPricing | null;
	usage: Pick<
		Run,
		'inputTokens' | 'cachedInputTokens' | 'outputTokens' | 'uncachedInputTokens' | 'usageSource'
	>;
}): {
	estimatedCostUsd: number | null;
	costSource: RunCostSource;
	pricingVersion: string | null;
} {
	const { modelPricing, usage } = input;

	if (usage.usageSource !== 'provider_reported') {
		return {
			estimatedCostUsd: null,
			costSource: 'missing_usage',
			pricingVersion: null
		};
	}

	if (!modelPricing) {
		return {
			estimatedCostUsd: null,
			costSource: 'missing_pricing',
			pricingVersion: null
		};
	}

	const uncachedInputTokens = usage.uncachedInputTokens ?? 0;
	const cachedInputTokens = usage.cachedInputTokens ?? 0;
	const outputTokens = usage.outputTokens ?? 0;
	const estimatedCostUsd =
		(uncachedInputTokens / 1_000_000) * modelPricing.inputUsdPer1M +
		(cachedInputTokens / 1_000_000) * modelPricing.cachedInputUsdPer1M +
		(outputTokens / 1_000_000) * modelPricing.outputUsdPer1M;

	return {
		estimatedCostUsd,
		costSource: 'configured_model_pricing',
		pricingVersion: modelPricing.pricingVersion
	};
}

function runTelemetryChanged(run: Run, next: Partial<Run>) {
	return (
		run.agentThreadRunId !== next.agentThreadRunId ||
		run.modelUsed !== next.modelUsed ||
		run.usageSource !== next.usageSource ||
		run.inputTokens !== next.inputTokens ||
		run.cachedInputTokens !== next.cachedInputTokens ||
		run.outputTokens !== next.outputTokens ||
		run.uncachedInputTokens !== next.uncachedInputTokens ||
		run.usageCapturedAt !== next.usageCapturedAt ||
		run.estimatedCostUsd !== next.estimatedCostUsd ||
		run.costSource !== next.costSource ||
		run.pricingVersion !== next.pricingVersion
	);
}

export async function syncControlPlaneRunTelemetry(data: ControlPlaneData) {
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	let changed = false;

	const runs = await Promise.all(
		data.runs.map(async (run) => {
			if (!run.agentThreadId || !run.agentThreadRunId) {
				return run;
			}

			const provider = run.providerId ? (providerMap.get(run.providerId) ?? null) : null;
			const snapshot = await readManagedRunTelemetrySnapshot({
				agentThreadId: run.agentThreadId,
				agentThreadRunId: run.agentThreadRunId,
				fallbackModel: run.modelUsed ?? provider?.defaultModel ?? null
			});
			const modelUsed =
				run.modelUsed?.trim() ||
				snapshot.modelUsed?.trim() ||
				provider?.defaultModel?.trim() ||
				null;
			const usageSource =
				snapshot.usageSource === 'provider_reported'
					? snapshot.usageSource
					: (run.usageSource ?? 'missing');
			const inputTokens =
				snapshot.inputTokens !== null ? snapshot.inputTokens : (run.inputTokens ?? null);
			const cachedInputTokens =
				snapshot.cachedInputTokens !== null
					? snapshot.cachedInputTokens
					: (run.cachedInputTokens ?? null);
			const outputTokens =
				snapshot.outputTokens !== null ? snapshot.outputTokens : (run.outputTokens ?? null);
			const uncachedInputTokens =
				snapshot.uncachedInputTokens !== null
					? snapshot.uncachedInputTokens
					: inputTokens !== null
						? Math.max(inputTokens - (cachedInputTokens ?? 0), 0)
						: (run.uncachedInputTokens ?? null);
			const usageCapturedAt = snapshot.usageCapturedAt ?? run.usageCapturedAt ?? null;
			const cost = estimateRunCostUsd({
				modelPricing: findProviderModelPricing(provider, modelUsed),
				usage: {
					inputTokens,
					cachedInputTokens,
					outputTokens,
					uncachedInputTokens,
					usageSource
				}
			});
			const nextRun = {
				...run,
				modelUsed,
				usageSource,
				inputTokens,
				cachedInputTokens,
				outputTokens,
				uncachedInputTokens,
				usageCapturedAt,
				estimatedCostUsd: cost.estimatedCostUsd,
				costSource: cost.costSource,
				pricingVersion: cost.pricingVersion
			} satisfies Run;

			if (runTelemetryChanged(run, nextRun)) {
				changed = true;
				return nextRun;
			}

			return run;
		})
	);

	return changed ? { ...data, runs } : data;
}

export async function loadControlPlaneWithRunTelemetry() {
	const data = await loadControlPlane();
	const hydrated = await syncControlPlaneRunTelemetry(data);

	if (hydrated === data) {
		return data;
	}

	return updateControlPlaneCollections(async (current) => ({
		data: await syncControlPlaneRunTelemetry(current),
		changedCollections: ['runs']
	}));
}

function createRollupMap() {
	return new Map<string, RunSpendRollupItem>();
}

function addRunToRollup(
	map: Map<string, RunSpendRollupItem>,
	key: string,
	label: string,
	run: Run
) {
	const current = map.get(key) ?? {
		key,
		label,
		runCount: 0,
		totalCostUsd: 0,
		inputTokens: 0,
		outputTokens: 0,
		totalTokens: 0,
		attentionRunCount: 0
	};
	const inputTokens = run.inputTokens ?? 0;
	const outputTokens = run.outputTokens ?? 0;
	const totalTokens = inputTokens + outputTokens;

	current.runCount += 1;
	current.totalCostUsd += run.estimatedCostUsd ?? 0;
	current.inputTokens += inputTokens;
	current.outputTokens += outputTokens;
	current.totalTokens += totalTokens;

	if (run.status === 'failed' || run.status === 'canceled' || run.status === 'blocked') {
		current.attentionRunCount += 1;
	}

	map.set(key, current);
}

function sortRollups(values: RunSpendRollupItem[]) {
	return values
		.filter((item) => item.runCount > 0)
		.sort(
			(left, right) =>
				right.totalCostUsd - left.totalCostUsd ||
				right.totalTokens - left.totalTokens ||
				right.runCount - left.runCount ||
				left.label.localeCompare(right.label)
		)
		.slice(0, 5);
}

export function buildRunUsageCostSummary(data: ControlPlaneData): RunUsageCostSummary {
	const now = Date.now();
	const last24hCutoff = now - 24 * 60 * 60 * 1000;
	const last7dCutoff = now - 7 * 24 * 60 * 60 * 1000;
	const taskMap = new Map(data.tasks.map((task) => [task.id, task]));
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const executionSurfaceMap = new Map(
		data.executionSurfaces.map((executionSurface) => [executionSurface.id, executionSurface])
	);
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const providerRollups = createRollupMap();
	const actorRollups = createRollupMap();
	const projectRollups = createRollupMap();
	const goalRollups = createRollupMap();

	let spendLast24hUsd = 0;
	let spendLast7dUsd = 0;
	let failedOrCanceledSpendLast7dUsd = 0;

	for (const run of data.runs) {
		const updatedAtMs = Date.parse(run.updatedAt);
		const task = taskMap.get(run.taskId) ?? null;
		const project = task ? (projectMap.get(task.projectId) ?? null) : null;
		const goal = task?.goalId ? (goalMap.get(task.goalId) ?? null) : null;
		const provider = run.providerId ? (providerMap.get(run.providerId) ?? null) : null;
		const actor = run.executionSurfaceId
			? (executionSurfaceMap.get(run.executionSurfaceId) ?? null)
			: null;

		if (updatedAtMs >= last24hCutoff) {
			spendLast24hUsd += run.estimatedCostUsd ?? 0;
		}

		if (updatedAtMs >= last7dCutoff) {
			spendLast7dUsd += run.estimatedCostUsd ?? 0;

			if (run.status === 'failed' || run.status === 'canceled') {
				failedOrCanceledSpendLast7dUsd += run.estimatedCostUsd ?? 0;
			}
		}

		addRunToRollup(
			providerRollups,
			run.providerId ?? 'provider:none',
			provider?.name ?? 'No provider',
			run
		);
		addRunToRollup(
			actorRollups,
			run.executionSurfaceId ?? 'actor:none',
			actor?.name ?? 'Unassigned',
			run
		);
		addRunToRollup(
			projectRollups,
			project?.id ?? 'project:none',
			project?.name ?? 'No project',
			run
		);
		addRunToRollup(goalRollups, goal?.id ?? 'goal:none', goal?.name ?? 'No goal', run);
	}

	return {
		spendLast24hUsd,
		spendLast7dUsd,
		failedOrCanceledSpendLast7dRatio:
			spendLast7dUsd > 0 ? failedOrCanceledSpendLast7dUsd / spendLast7dUsd : null,
		highCostRuns: [...data.runs]
			.filter((run) => (run.estimatedCostUsd ?? 0) > 0)
			.sort(
				(left, right) =>
					(right.estimatedCostUsd ?? 0) - (left.estimatedCostUsd ?? 0) ||
					right.updatedAt.localeCompare(left.updatedAt)
			)
			.slice(0, 5)
			.map((run) => ({
				runId: run.id,
				taskId: run.taskId,
				taskTitle: taskMap.get(run.taskId)?.title ?? 'Unknown task',
				providerName:
					(run.providerId ? providerMap.get(run.providerId)?.name : null) ?? 'No provider',
				modelUsed: run.modelUsed ?? null,
				status: run.status,
				estimatedCostUsd: run.estimatedCostUsd ?? 0
			})),
		rollups: {
			byProvider: sortRollups([...providerRollups.values()]),
			byActor: sortRollups([...actorRollups.values()]),
			byProject: sortRollups([...projectRollups.values()]),
			byGoal: sortRollups([...goalRollups.values()])
		}
	};
}
