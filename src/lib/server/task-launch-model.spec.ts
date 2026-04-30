import { describe, expect, it } from 'vitest';
import { collectLaunchModelOptions, resolveLaunchModel } from './task-launch-model';

describe('resolveLaunchModel', () => {
	it('prefers an explicit launch override', () => {
		expect(
			resolveLaunchModel({
				explicitModel: 'gpt-5.5',
				thread: { model: 'gpt-5.4' },
				provider: { defaultModel: 'gpt-5.3' }
			})
		).toEqual({
			model: 'gpt-5.5',
			source: 'explicit_launch_override',
			label: 'Explicit launch selection'
		});
	});

	it('uses the thread setting before the provider default', () => {
		expect(
			resolveLaunchModel({
				thread: { model: 'gpt-5.4' },
				provider: { defaultModel: 'gpt-5.3' }
			})
		).toMatchObject({
			model: 'gpt-5.4',
			source: 'thread_setting'
		});
	});

	it('marks missing model selection as an unverified runner default', () => {
		expect(resolveLaunchModel({ provider: { defaultModel: '' } })).toEqual({
			model: null,
			source: 'runner_default_unverified',
			label: 'Runner default'
		});
	});
});

describe('collectLaunchModelOptions', () => {
	it('deduplicates provider, pricing, run, and thread model ids', () => {
		expect(
			collectLaunchModelOptions({
				providers: [
					{
						defaultModel: 'gpt-5.4',
						modelPricing: [
							{
								model: 'gpt-5.4',
								inputUsdPer1M: 1,
								cachedInputUsdPer1M: 0.1,
								outputUsdPer1M: 10,
								pricingVersion: '2026-04-30',
								updatedAt: '2026-04-30T00:00:00.000Z'
							},
							{
								model: 'gpt-5.5',
								inputUsdPer1M: 1,
								cachedInputUsdPer1M: 0.1,
								outputUsdPer1M: 10,
								pricingVersion: '2026-04-30',
								updatedAt: '2026-04-30T00:00:00.000Z'
							}
						]
					}
				],
				modelsFromRuns: ['gpt-5.4', 'o3'],
				modelsFromThreads: ['gpt-5.5', 'gpt-5.3']
			})
		).toEqual(['gpt-5.3', 'gpt-5.4', 'gpt-5.5', 'o3']);
	});
});
