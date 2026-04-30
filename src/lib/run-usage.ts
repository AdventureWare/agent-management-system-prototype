type RunUsageLike = {
	inputTokens?: number | null;
	cachedInputTokens?: number | null;
	outputTokens?: number | null;
	uncachedInputTokens?: number | null;
	estimatedCostUsd?: number | null;
	modelUsed?: string | null;
	modelSource?: string | null;
};

export function getRunTotalTokens(run: RunUsageLike) {
	return (run.inputTokens ?? 0) + (run.outputTokens ?? 0);
}

export function getRunCacheRatio(run: RunUsageLike) {
	if (
		!run.inputTokens ||
		run.inputTokens <= 0 ||
		!run.cachedInputTokens ||
		run.cachedInputTokens <= 0
	) {
		return null;
	}

	return Math.min(run.cachedInputTokens / run.inputTokens, 1);
}

export function formatTokenCount(value: number | null | undefined) {
	if (value === null || value === undefined || !Number.isFinite(value)) {
		return '0';
	}

	return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

export function formatUsd(value: number | null | undefined) {
	if (value === null || value === undefined || !Number.isFinite(value)) {
		return 'Cost unavailable';
	}

	if (value > 0 && value < 0.01) {
		return '<$0.01';
	}

	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value);
}

export function formatPercent(value: number | null | undefined) {
	if (value === null || value === undefined || !Number.isFinite(value)) {
		return 'n/a';
	}

	return new Intl.NumberFormat('en-US', {
		style: 'percent',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(value);
}

export function formatRunTokenSummary(run: RunUsageLike) {
	const parts = [
		run.inputTokens !== null && run.inputTokens !== undefined
			? `${formatTokenCount(run.inputTokens)} in`
			: '',
		run.outputTokens !== null && run.outputTokens !== undefined
			? `${formatTokenCount(run.outputTokens)} out`
			: '',
		run.cachedInputTokens ? `${formatTokenCount(run.cachedInputTokens)} cached` : ''
	].filter(Boolean);

	return parts.length > 0 ? parts.join(' · ') : 'Usage unavailable';
}

function formatRunModelSource(source: string | null | undefined) {
	switch (source) {
		case 'explicit_launch_override':
			return 'explicit selection';
		case 'thread_setting':
			return 'thread setting';
		case 'provider_default':
			return 'provider default';
		case 'runner_reported':
			return 'runner reported';
		case 'runner_default_unverified':
			return 'runner default';
		default:
			return '';
	}
}

export function formatRunModelLabel(run: Pick<RunUsageLike, 'modelUsed' | 'modelSource'>) {
	const model = run.modelUsed?.trim();
	const source = formatRunModelSource(run.modelSource);

	if (!model) {
		return source ? `Model unavailable · ${source}` : 'Model unavailable';
	}

	return source ? `${model} · ${source}` : model;
}
