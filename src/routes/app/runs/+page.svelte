<script lang="ts">
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatRunStatusLabel, runStatusToneClass } from '$lib/types/control-plane';

	let { data } = $props();

	const timeOptions = [
		{ value: 'all', label: 'All time' },
		{ value: '1h', label: 'Last hour' },
		{ value: '24h', label: 'Last 24 hours' },
		{ value: '7d', label: 'Last 7 days' },
		{ value: '30d', label: 'Last 30 days' }
	] as const;

	let query = $state('');
	let selectedStatus = $state('all');
	let selectedTaskId = $state('all');
	let selectedWorkerId = $state('all');
	let selectedProviderId = $state('all');
	let selectedTime = $state<(typeof timeOptions)[number]['value']>('all');

	function timeWindowMs(value: (typeof timeOptions)[number]['value']) {
		switch (value) {
			case '1h':
				return 60 * 60 * 1000;
			case '24h':
				return 24 * 60 * 60 * 1000;
			case '7d':
				return 7 * 24 * 60 * 60 * 1000;
			case '30d':
				return 30 * 24 * 60 * 60 * 1000;
			default:
				return null;
		}
	}

	function compactText(value: string, maxLength = 120) {
		const normalized = value.replace(/\s+/g, ' ').trim();

		if (!normalized) {
			return '';
		}

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
	}

	function matchesRun(run: (typeof data.runs)[number], term: string) {
		const normalizedTerm = term.trim().toLowerCase();

		if (!normalizedTerm) {
			return true;
		}

		return [
			run.id,
			run.status,
			run.taskTitle,
			run.taskProjectName,
			run.workerName,
			run.providerName,
			run.agentThreadId ?? '',
			run.threadName ?? '',
			run.threadId ?? '',
			run.promptDigest,
			run.summary,
			run.errorSummary,
			run.artifactPaths.join(' ')
		]
			.join(' ')
			.toLowerCase()
			.includes(normalizedTerm);
	}

	let filteredRuns = $derived.by(() => {
		const cutoffMs = timeWindowMs(selectedTime);
		const now = Date.now();

		return data.runs.filter((run) => {
			if (selectedStatus !== 'all' && run.status !== selectedStatus) {
				return false;
			}

			if (selectedTaskId !== 'all' && run.taskId !== selectedTaskId) {
				return false;
			}

			if (selectedWorkerId !== 'all' && run.workerId !== selectedWorkerId) {
				return false;
			}

			if (selectedProviderId !== 'all' && run.providerId !== selectedProviderId) {
				return false;
			}

			if (cutoffMs !== null && now - Date.parse(run.updatedAt) > cutoffMs) {
				return false;
			}

			return matchesRun(run, query);
		});
	});

	let activeRunCount = $derived(
		filteredRuns.filter((run) =>
			['queued', 'starting', 'running', 'awaiting_approval'].includes(run.status)
		).length
	);
	let attentionRunCount = $derived(
		filteredRuns.filter((run) => ['blocked', 'failed', 'canceled'].includes(run.status)).length
	);
	let completedRunCount = $derived(filteredRuns.filter((run) => run.status === 'completed').length);
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Runs"
		title="Inspect execution outcomes"
		description="Runs are the execution ledger for the control plane. Use this surface to filter by routing, check recent heartbeats, inspect prompt digests, and jump into the exact task or thread tied to an execution record."
	/>

	<div class="grid gap-4 md:grid-cols-4">
		<MetricCard
			label="Visible runs"
			value={filteredRuns.length}
			detail="Filtered execution records in scope."
		/>
		<MetricCard
			label="Active"
			value={activeRunCount}
			detail="Queued, starting, running, or awaiting approval."
		/>
		<MetricCard
			label="Attention"
			value={attentionRunCount}
			detail="Blocked, failed, or canceled outcomes."
		/>
		<MetricCard
			label="Completed"
			value={completedRunCount}
			detail="Runs with a finished happy-path result."
		/>
	</div>

	<section class="card border border-slate-800 bg-slate-950/70 p-6">
		<div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
			<div>
				<h2 class="text-xl font-semibold text-white">Filters</h2>
				<p class="mt-1 text-sm text-slate-400">
					Narrow by status, task, worker, provider, and recent activity window.
				</p>
			</div>
			<div class="w-full xl:max-w-sm">
				<label class="sr-only" for="run-search">Search runs</label>
				<input
					id="run-search"
					bind:value={query}
					class="input text-white placeholder:text-slate-500"
					placeholder="Search summary, prompt digest, paths, or IDs"
				/>
			</div>
		</div>

		<div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
				<select bind:value={selectedStatus} class="select text-white">
					<option value="all">All statuses</option>
					{#each data.statusOptions as status (status)}
						<option value={status}>{formatRunStatusLabel(status)}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Task</span>
				<select bind:value={selectedTaskId} class="select text-white">
					<option value="all">All tasks</option>
					{#each data.tasks as task (task.id)}
						<option value={task.id}>{task.title}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Worker</span>
				<select bind:value={selectedWorkerId} class="select text-white">
					<option value="all">All workers</option>
					{#each data.workers as worker (worker.id)}
						<option value={worker.id}>{worker.name}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Provider</span>
				<select bind:value={selectedProviderId} class="select text-white">
					<option value="all">All providers</option>
					{#each data.providers as provider (provider.id)}
						<option value={provider.id}>{provider.name}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Time</span>
				<select bind:value={selectedTime} class="select text-white">
					{#each timeOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
		</div>
	</section>

	<section class="card border border-slate-800 bg-slate-950/70 p-6">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 class="text-xl font-semibold text-white">Execution ledger</h2>
				<p class="mt-1 text-sm text-slate-400">
					Prompt digests, thread references, heartbeats, errors, and artifacts stay visible here.
				</p>
			</div>
			<p class="text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">
				{filteredRuns.length} shown
			</p>
		</div>

		{#if filteredRuns.length === 0}
			<p
				class="mt-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400"
			>
				No runs match the current filters. Broaden the time window or clear one of the filters.
			</p>
		{:else}
			<div class="mt-4 overflow-x-auto">
				<table class="min-w-[1480px] divide-y divide-slate-800 text-left">
					<thead class="text-xs tracking-[0.16em] text-slate-500 uppercase">
						<tr>
							<th class="px-3 py-3 font-medium">Run</th>
							<th class="px-3 py-3 font-medium">Task</th>
							<th class="px-3 py-3 font-medium">Worker</th>
							<th class="px-3 py-3 font-medium">Provider</th>
							<th class="px-3 py-3 font-medium">Prompt + thread</th>
							<th class="px-3 py-3 font-medium">Heartbeat + errors</th>
							<th class="px-3 py-3 font-medium">Artifacts</th>
							<th class="px-3 py-3 font-medium">Updated</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-900/80">
						{#each filteredRuns as run (run.id)}
							<tr class="bg-slate-950/30 align-top transition hover:bg-slate-900/60">
								<td class="px-3 py-3">
									<div class="min-w-[16rem] space-y-2">
										<div class="flex flex-wrap items-center gap-2">
											<a
												class="font-medium text-white transition hover:text-sky-200"
												href={resolve(`/app/runs/${run.id}`)}
											>
												{run.id}
											</a>
											<span
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${runStatusToneClass(run.status)}`}
											>
												{formatRunStatusLabel(run.status)}
											</span>
										</div>
										<p class="text-sm text-slate-300">{compactText(run.summary || 'No summary')}</p>
									</div>
								</td>
								<td class="px-3 py-3">
									<div class="min-w-[16rem] space-y-2">
										<a
											class="font-medium text-sky-300 transition hover:text-sky-200"
											href={resolve(`/app/tasks/${run.taskId}`)}
										>
											{run.taskTitle}
										</a>
										<p class="text-sm text-slate-400">{run.taskProjectName}</p>
									</div>
								</td>
								<td class="px-3 py-3 text-sm text-slate-300">{run.workerName}</td>
								<td class="px-3 py-3 text-sm text-slate-300">{run.providerName}</td>
								<td class="px-3 py-3">
									<div class="min-w-[18rem] space-y-2 text-sm text-slate-300">
										<p>{compactText(run.promptDigest || 'No prompt digest')}</p>
										<div class="space-y-1 text-xs text-slate-500">
											<p>Thread record</p>
											{#if run.agentThreadId}
												<a
													class="ui-wrap-inline text-sky-300 transition hover:text-sky-200"
													href={resolve(`/app/threads/${run.agentThreadId}`)}
												>
													{run.threadName || run.agentThreadId}
												</a>
											{:else}
												<p>No managed thread record</p>
											{/if}
											<p class="ui-wrap-anywhere">{run.threadId || 'No thread id recorded'}</p>
										</div>
									</div>
								</td>
								<td class="px-3 py-3">
									<div class="min-w-[14rem] space-y-2 text-sm text-slate-300">
										<p>{run.heartbeatAgeLabel}</p>
										<p class="text-rose-300">{compactText(run.errorSummary || 'No errors')}</p>
									</div>
								</td>
								<td class="px-3 py-3">
									<div class="min-w-[16rem] space-y-2 text-sm text-slate-300">
										{#if run.artifactPaths.length === 0}
											<p>No artifacts</p>
										{:else}
											{#each run.artifactPaths as path (path)}
												<p class="ui-wrap-anywhere">{path}</p>
											{/each}
										{/if}
									</div>
								</td>
								<td class="px-3 py-3 text-sm text-slate-300">
									<p>{run.updatedAtLabel}</p>
									<p class="mt-1 text-xs text-slate-500">{run.updatedAt}</p>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</AppPage>
