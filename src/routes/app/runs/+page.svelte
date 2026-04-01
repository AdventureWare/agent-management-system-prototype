<script lang="ts">
	import { resolve } from '$app/paths';
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
			run.sessionId ?? '',
			run.sessionName ?? '',
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

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Runs</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Inspect execution outcomes</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Runs are the execution ledger for the control plane. Use this surface to filter by routing,
			check recent heartbeats, inspect prompt digests, and jump into the exact task or session tied
			to an execution record.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-4">
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Visible runs</p>
			<p class="mt-3 text-3xl font-semibold text-white">{filteredRuns.length}</p>
			<p class="mt-2 text-sm text-slate-400">Filtered execution records in scope.</p>
		</article>
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Active</p>
			<p class="mt-3 text-3xl font-semibold text-white">{activeRunCount}</p>
			<p class="mt-2 text-sm text-slate-400">Queued, starting, running, or awaiting approval.</p>
		</article>
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Attention</p>
			<p class="mt-3 text-3xl font-semibold text-white">{attentionRunCount}</p>
			<p class="mt-2 text-sm text-slate-400">Blocked, failed, or canceled outcomes.</p>
		</article>
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Completed</p>
			<p class="mt-3 text-3xl font-semibold text-white">{completedRunCount}</p>
			<p class="mt-2 text-sm text-slate-400">Runs with a finished happy-path result.</p>
		</article>
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
				No runs match the current filters.
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
									<div class="max-w-xs min-w-0 space-y-2">
										<div class="flex flex-wrap items-center gap-2">
											<a
												class="ui-wrap-anywhere font-medium text-white transition hover:text-sky-200"
												href={resolve(`/app/runs/${run.id}`)}
											>
												{run.id}
											</a>
											<span
												class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusToneClass(run.status)}`}
											>
												{formatRunStatusLabel(run.status)}
											</span>
										</div>
										<p class="ui-clamp-5 text-sm text-slate-300">
											{compactText(run.summary || 'No summary recorded.', 180)}
										</p>
									</div>
								</td>
								<td class="px-3 py-3">
									<div class="max-w-xs min-w-0 space-y-1">
										<a
											class="ui-clamp-5 font-medium text-white transition hover:text-sky-200"
											href={resolve(`/app/tasks/${run.taskId}`)}
										>
											{run.taskTitle}
										</a>
										<p class="ui-clamp-5 text-sm text-slate-400">{run.taskProjectName}</p>
									</div>
								</td>
								<td class="px-3 py-3">
									<div class="max-w-xs min-w-0 space-y-1">
										{#if run.workerId}
											<a
												class="ui-clamp-5 text-sm font-medium text-sky-300 transition hover:text-sky-200"
												href={resolve(`/app/workers/${run.workerId}`)}
											>
												{run.workerName}
											</a>
										{:else}
											<p class="text-sm text-slate-400">Unassigned</p>
										{/if}
									</div>
								</td>
								<td class="px-3 py-3">
									<div class="max-w-xs min-w-0 space-y-1">
										{#if run.providerId}
											<a
												class="ui-clamp-5 text-sm font-medium text-sky-300 transition hover:text-sky-200"
												href={resolve(`/app/providers/${run.providerId}`)}
											>
												{run.providerName}
											</a>
										{:else}
											<p class="text-sm text-slate-400">No provider</p>
										{/if}
									</div>
								</td>
								<td class="px-3 py-3">
									<div class="max-w-sm min-w-0 space-y-2">
										<div>
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Prompt digest
											</p>
											<p class="ui-clamp-5 mt-1 font-mono text-xs text-slate-200">
												{run.promptDigest || 'Not captured'}
											</p>
										</div>
										<div>
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Session / thread
											</p>
											<div class="mt-1 space-y-1 text-xs text-slate-300">
												{#if run.sessionId}
													<a
														class="ui-clamp-5 text-sky-300 transition hover:text-sky-200"
														href={resolve(`/app/sessions/${run.sessionId}`)}
													>
														{run.sessionName ?? run.sessionId}
													</a>
												{:else}
													<p>No session linked</p>
												{/if}
												<p class="ui-clamp-5 text-slate-500">
													{run.threadId || 'No thread id recorded'}
												</p>
											</div>
										</div>
									</div>
								</td>
								<td class="px-3 py-3">
									<div class="max-w-sm min-w-0 space-y-2 text-sm">
										<p
											class={run.isHeartbeatStale ? 'font-medium text-amber-300' : 'text-slate-300'}
										>
											Heartbeat {run.heartbeatAgeLabel}
										</p>
										<p class="ui-clamp-5 text-slate-400">
											{compactText(run.errorSummary || 'No error summary.', 160)}
										</p>
									</div>
								</td>
								<td class="px-3 py-3">
									<div class="max-w-sm min-w-0 space-y-2">
										{#if run.artifactPaths.length === 0}
											<p class="text-sm text-slate-400">No artifact paths</p>
										{:else}
											{#each run.artifactPaths.slice(0, 2) as path (path)}
												<p class="ui-clamp-5 text-xs text-slate-300">{path}</p>
											{/each}
											{#if run.artifactPaths.length > 2}
												<p class="text-xs text-slate-500">
													+{run.artifactPaths.length - 2} more paths
												</p>
											{/if}
										{/if}
									</div>
								</td>
								<td class="px-3 py-3">
									<div class="space-y-1 text-sm text-slate-300">
										<p>Updated {run.updatedAtLabel}</p>
										<p class="text-slate-500">Created {run.createdAtLabel}</p>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</section>
