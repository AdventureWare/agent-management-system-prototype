import type { AgentThreadDetail } from '$lib/types/agent-thread';
import type { Provider, RunModelSource } from '$lib/types/control-plane';

export type LaunchModelResolution = {
	model: string | null;
	source: RunModelSource;
	label: string;
};

function normalizeModel(value: string | null | undefined) {
	const normalized = value?.trim() ?? '';
	return normalized.length > 0 ? normalized : null;
}

export function resolveLaunchModel(input: {
	explicitModel?: string | null;
	thread?: Pick<AgentThreadDetail, 'model'> | null;
	executionSurface?: { modelOverride?: string | null } | null;
	project?: { defaultModel?: string | null } | null;
	provider?: Pick<Provider, 'defaultModel'> | null;
}): LaunchModelResolution {
	const explicitModel = normalizeModel(input.explicitModel);

	if (explicitModel) {
		return {
			model: explicitModel,
			source: 'explicit_launch_override',
			label: 'Explicit launch selection'
		};
	}

	const threadModel = normalizeModel(input.thread?.model);

	if (threadModel) {
		return {
			model: threadModel,
			source: 'thread_setting',
			label: 'Thread setting'
		};
	}

	const executionSurfaceModel = normalizeModel(input.executionSurface?.modelOverride);

	if (executionSurfaceModel) {
		return {
			model: executionSurfaceModel,
			source: 'execution_surface_default',
			label: 'Execution surface default'
		};
	}

	const projectModel = normalizeModel(input.project?.defaultModel);

	if (projectModel) {
		return {
			model: projectModel,
			source: 'project_default',
			label: 'Project default'
		};
	}

	const providerModel = normalizeModel(input.provider?.defaultModel);

	if (providerModel) {
		return {
			model: providerModel,
			source: 'provider_default',
			label: 'Provider default'
		};
	}

	return {
		model: null,
		source: 'runner_default_unverified',
		label: 'Runner default'
	};
}

export function collectLaunchModelOptions(input: {
	providers: Array<Pick<Provider, 'defaultModel' | 'modelPricing'>>;
	modelsFromProjects?: Array<string | null | undefined>;
	modelsFromExecutionSurfaces?: Array<string | null | undefined>;
	modelsFromRuns?: Array<string | null | undefined>;
	modelsFromThreads?: Array<string | null | undefined>;
}) {
	const options = new Set<string>();

	for (const provider of input.providers) {
		const providerDefault = normalizeModel(provider.defaultModel);

		if (providerDefault) {
			options.add(providerDefault);
		}

		for (const pricing of provider.modelPricing ?? []) {
			const pricingModel = normalizeModel(pricing.model);

			if (pricingModel) {
				options.add(pricingModel);
			}
		}
	}

	for (const model of input.modelsFromProjects ?? []) {
		const normalized = normalizeModel(model);

		if (normalized) {
			options.add(normalized);
		}
	}

	for (const model of input.modelsFromExecutionSurfaces ?? []) {
		const normalized = normalizeModel(model);

		if (normalized) {
			options.add(normalized);
		}
	}

	for (const model of input.modelsFromRuns ?? []) {
		const normalized = normalizeModel(model);

		if (normalized) {
			options.add(normalized);
		}
	}

	for (const model of input.modelsFromThreads ?? []) {
		const normalized = normalizeModel(model);

		if (normalized) {
			options.add(normalized);
		}
	}

	return [...options].sort((left, right) => left.localeCompare(right));
}
