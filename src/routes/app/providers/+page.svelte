<script lang="ts">
	import { Progress, Tabs } from '@skeletonlabs/skeleton-svelte';

	let { data } = $props();

	let providerKinds = $derived([...new Set(data.providers.map((provider) => provider.kind))]);
	let providersByKind = $derived.by(() =>
		providerKinds.map((kind) => ({
			kind,
			providers: data.providers.filter((provider) => provider.kind === kind)
		}))
	);
	let totalWorkers = $derived(
		data.providers.reduce((count, provider) => count + provider.workerCount, 0)
	);
	let maxWorkerCount = $derived(
		Math.max(1, ...data.providers.map((provider) => provider.workerCount))
	);
</script>

<section class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Providers</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Execution surfaces</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Providers represent where workers run. Keep local providers private and let them connect
			outbound to the coordinator rather than exposing your machine directly.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Provider count</p>
			<p class="mt-3 text-3xl font-semibold text-white">{data.providers.length}</p>
			<p class="mt-2 text-sm text-slate-400">Every execution surface currently registered.</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Kinds represented
			</p>
			<p class="mt-3 text-3xl font-semibold text-white">{providerKinds.length}</p>
			<p class="mt-2 text-sm text-slate-400">Useful for isolating local and hosted capacity.</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Registered workers
			</p>
			<p class="mt-3 text-3xl font-semibold text-white">{totalWorkers}</p>
			<p class="mt-2 text-sm text-slate-400">Workers currently attached across all providers.</p>
		</article>
	</div>

	{#if providerKinds.length > 0}
		<Tabs defaultValue={providerKinds[0]} class="space-y-4">
			<Tabs.List
				class="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-2"
			>
				{#each providerKinds as kind (kind)}
					<Tabs.Trigger
						value={kind}
						class="btn border border-transparent btn-sm text-slate-300 data-[state=active]:border-sky-400/30 data-[state=active]:bg-sky-400 data-[state=active]:text-slate-950"
					>
						{kind}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>

			{#each providersByKind as group (group.kind)}
				<Tabs.Content value={group.kind} class="grid gap-4 lg:grid-cols-2">
					{#each group.providers as provider (provider.id)}
						<article class="card border border-slate-800 bg-slate-950/70 p-6">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<h2 class="text-xl font-semibold text-white">{provider.name}</h2>
								<span
									class="badge border border-slate-700 bg-slate-900/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
								>
									{provider.kind}
								</span>
							</div>

							<p class="mt-3 text-sm text-slate-300">{provider.description}</p>

							<Progress max={maxWorkerCount} value={provider.workerCount} class="mt-5 space-y-2">
								<div class="flex items-center justify-between gap-3">
									<Progress.Label class="text-sm font-medium text-slate-200">
										Worker saturation
									</Progress.Label>
									<Progress.ValueText class="text-xs text-slate-500">
										{provider.workerCount} of {maxWorkerCount}
									</Progress.ValueText>
								</div>
								<Progress.Track class="h-2 overflow-hidden rounded-full bg-slate-800">
									<Progress.Range class="h-full rounded-full bg-emerald-400" />
								</Progress.Track>
							</Progress>
						</article>
					{/each}
				</Tabs.Content>
			{/each}
		</Tabs>
	{/if}
</section>
