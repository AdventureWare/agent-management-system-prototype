<script lang="ts">
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let { data } = $props();

	function formatOutcomeLabel(value: string) {
		return value === 'success' ? 'Success' : 'Error';
	}

	function formatCommandLabel(resource: string | null, command: string | null) {
		if (!resource || !command) {
			return 'Unclassified';
		}

		return `${resource}:${command}`;
	}

	function formatIntentList(intents: string[]) {
		return intents.join(', ');
	}

	function buildAgentUseHref(
		overrides: Partial<{
			thread: string | null;
			task: string | null;
			run: string | null;
			tool: string | null;
			outcome: string | null;
			since: string | null;
		}>
	) {
		const params = new URLSearchParams();
		const mergedFilters = {
			thread: data.filters.threadId,
			task: data.filters.taskId,
			run: data.filters.runId,
			tool: data.filters.toolName,
			outcome: data.filters.outcome,
			since: data.filters.since,
			...overrides
		};

		for (const [key, value] of Object.entries(mergedFilters)) {
			if (typeof value === 'string' && value.trim()) {
				params.set(key, value);
			}
		}

		return `/app/agent-use${params.size > 0 ? `?${params.toString()}` : ''}`;
	}

	const detailLinkClass =
		'text-sky-300 underline decoration-sky-500/60 decoration-1 underline-offset-4 transition hover:text-sky-200';

	function threadLabel(threadId: string) {
		return data.entityLabels.threadById[threadId] ?? threadId;
	}

	function taskLabel(taskId: string) {
		return data.entityLabels.taskById[taskId] ?? taskId;
	}

	function runLabel(runId: string) {
		return data.entityLabels.runById[runId] ?? runId;
	}

	function hasActiveFilters() {
		return Boolean(
			data.filters.threadId ||
			data.filters.taskId ||
			data.filters.runId ||
			data.filters.toolName ||
			data.filters.outcome ||
			data.filters.since
		);
	}

	function buildDetailHref(target: 'thread' | 'task' | 'run', id: string | null | undefined) {
		if (!id || !id.trim()) {
			return null;
		}

		switch (target) {
			case 'thread':
				return `/app/threads/${id}`;
			case 'task':
				return `/app/tasks/${id}`;
			case 'run':
				return `/app/runs/${id}`;
		}
	}

	const sinceOptions = [
		{ value: '', label: 'All time' },
		{ value: '1h', label: 'Last hour' },
		{ value: '24h', label: 'Last 24 hours' },
		{ value: '7d', label: 'Last 7 days' },
		{ value: '30d', label: 'Last 30 days' }
	] as const;
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Agent Use"
		title="Inspect AMS tool usage"
		description="Compare the manifest playbooks against actual MCP tool activity captured from managed runs. Use this surface to see what agents do often, which playbooks match real behavior, and what guidance is still unused."
	/>

	<section class="mt-6 card border border-slate-800 bg-slate-950/70 p-6">
		<div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
			<div>
				<h2 class="text-xl font-semibold text-white">Telemetry retention</h2>
				<p class="mt-1 text-sm text-slate-400">
					Agent-use telemetry keeps up to {data.summary.retention.maxEvents} events from the last
					{data.summary.retention.retentionDays} days. Older events are pruned automatically.
				</p>
			</div>
			<div class="space-y-1 text-sm text-slate-400 xl:text-right">
				<p>Current store: {data.summary.retention.retainedEventCount} retained events</p>
				<p>Oldest retained: {data.summary.retention.oldestRetainedAt ?? 'none'}</p>
				<p>Newest retained: {data.summary.retention.newestRetainedAt ?? 'none'}</p>
			</div>
		</div>
	</section>

	{#if hasActiveFilters()}
		<section
			class={`mt-6 card border p-6 ${
				data.summary.totalEvents > 0
					? 'border-sky-900/70 bg-sky-950/20'
					: data.unfilteredSummary.totalEvents > 0
						? 'border-amber-900/70 bg-amber-950/20'
						: 'border-slate-800 bg-slate-950/70'
			}`}
		>
			{#if data.summary.totalEvents > 0}
				<h2 class="text-xl font-semibold text-white">Filtered slice has retained telemetry</h2>
				<p class="mt-2 text-sm text-sky-200/85">
					Showing {data.summary.totalEvents} retained telemetry event{data.summary.totalEvents === 1
						? ''
						: 's'} for the current filter set.{#if data.summary.lastRecordedAt}
						Latest matching event: {data.summary.lastRecordedAt}.
					{/if}
				</p>
			{:else if data.unfilteredSummary.totalEvents > 0}
				<h2 class="text-xl font-semibold text-white">No retained telemetry matches this slice</h2>
				<p class="mt-2 text-sm text-amber-200/85">
					The current filter set has no retained matches. That can mean no agent activity matched
					these filters inside the retained window, or older events were pruned before this view was
					loaded.
				</p>
			{:else}
				<h2 class="text-xl font-semibold text-white">No retained telemetry recorded yet</h2>
				<p class="mt-2 text-sm text-slate-400">
					The local operator store does not currently have any retained agent-use events.
				</p>
			{/if}
		</section>
	{/if}

	<div class="grid gap-4 md:grid-cols-4">
		<MetricCard
			label="Recorded events"
			value={String(data.summary.totalEvents)}
			detail="Successful and failed AMS MCP tool calls captured from managed runs."
		/>
		<MetricCard
			label="Successful"
			value={String(data.summary.successfulEvents)}
			detail="Tool calls that completed without raising an MCP error."
		/>
		<MetricCard
			label="Failed"
			value={String(data.summary.failedEvents)}
			detail="Tool calls that raised an MCP error before returning a result."
		/>
		<MetricCard
			label="Matched playbooks"
			value={String(data.summary.playbookMatches.filter((entry) => entry.count > 0).length)}
			detail={data.summary.lastRecordedAt
				? `Latest event recorded at ${data.summary.lastRecordedAt}.`
				: 'No managed-run MCP telemetry has been captured yet.'}
		/>
		<MetricCard
			label="Uncovered tools"
			value={String(data.summary.uncoveredToolCounts.length)}
			detail="Observed AMS tools that are not referenced by any shared playbook."
		/>
	</div>

	<section class="mt-6 card border border-slate-800 bg-slate-950/70 p-6">
		<div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
			<div>
				<h2 class="text-xl font-semibold text-white">Filters</h2>
				<p class="mt-1 text-sm text-slate-400">
					Filter telemetry by thread, tool, outcome, or time window without leaving the operator UI.
				</p>
			</div>
			<div class="flex flex-wrap gap-3">
				<AppButton href="/app/agent-use" variant="neutral">Clear filters</AppButton>
			</div>
		</div>

		<form class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" method="GET">
			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Thread</span>
				<select class="select text-white" name="thread">
					<option value="">All threads</option>
					{#each data.unfilteredSummary.threadCounts as thread (thread.threadId)}
						<option value={thread.threadId} selected={data.filters.threadId === thread.threadId}>
							{threadLabel(thread.threadId)}
						</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Task</span>
				<select class="select text-white" name="task">
					<option value="">All tasks</option>
					{#each data.unfilteredSummary.taskCounts as task (task.taskId)}
						<option value={task.taskId} selected={data.filters.taskId === task.taskId}>
							{taskLabel(task.taskId)}
						</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Run</span>
				<select class="select text-white" name="run">
					<option value="">All runs</option>
					{#each data.unfilteredSummary.runCounts as run (run.runId)}
						<option value={run.runId} selected={data.filters.runId === run.runId}>
							{runLabel(run.runId)}
						</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Tool</span>
				<select class="select text-white" name="tool">
					<option value="">All tools</option>
					{#each data.unfilteredSummary.toolCounts as tool (tool.toolName)}
						<option value={tool.toolName} selected={data.filters.toolName === tool.toolName}>
							{tool.toolName}
						</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Outcome</span>
				<select class="select text-white" name="outcome">
					<option value="">All outcomes</option>
					<option value="success" selected={data.filters.outcome === 'success'}>Success</option>
					<option value="error" selected={data.filters.outcome === 'error'}>Error</option>
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Window</span>
				<select class="select text-white" name="since">
					{#each sinceOptions as option (option.value)}
						<option value={option.value} selected={data.filters.since === option.value}>
							{option.label}
						</option>
					{/each}
				</select>
			</label>

			<div class="md:col-span-2 xl:col-span-3">
				<AppButton type="submit">Apply filters</AppButton>
			</div>
		</form>
	</section>

	{#if data.filters.threadId || data.filters.taskId || data.filters.runId}
		<section class="mt-6 card border border-slate-800 bg-slate-950/70 p-6">
			<div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<h2 class="text-xl font-semibold text-white">Open related details</h2>
					<p class="mt-1 text-sm text-slate-400">
						Jump from the current telemetry slice back into the corresponding detail pages.
					</p>
				</div>
				<div class="flex flex-wrap gap-3">
					{#if data.filters.threadId}
						<AppButton
							href={buildDetailHref('thread', data.filters.threadId) ?? '/app/agent-use'}
							variant="ghost"
						>
							Open thread
						</AppButton>
					{/if}
					{#if data.filters.taskId}
						<AppButton
							href={buildDetailHref('task', data.filters.taskId) ?? '/app/agent-use'}
							variant="ghost"
						>
							Open task
						</AppButton>
					{/if}
					{#if data.filters.runId}
						<AppButton
							href={buildDetailHref('run', data.filters.runId) ?? '/app/agent-use'}
							variant="ghost"
						>
							Open run
						</AppButton>
					{/if}
				</div>
			</div>
		</section>
	{/if}

	<div class="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
		<section class="card border border-slate-800 bg-slate-950/70 p-6">
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 class="text-xl font-semibold text-white">Observed playbook matches</h2>
					<p class="mt-1 text-sm text-slate-400">
						Exact matches between successful tool sequences and the shared manifest playbooks.
					</p>
				</div>
				<span class="badge border border-slate-700 bg-slate-900/80 text-slate-300">
					{data.summary.playbookMatches.length} tracked
				</span>
			</div>

			{#if data.summary.playbookMatches.length === 0}
				<p class="mt-6 text-sm text-slate-400">No playbook telemetry has been captured yet.</p>
			{:else}
				<div class="mt-6 space-y-3">
					{#each data.summary.playbookMatches as match (match.intent)}
						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<div>
									<p class="text-sm font-semibold text-white">{match.intent}</p>
									<p class="mt-1 text-xs text-slate-400">
										{match.count > 0
											? `${match.count} exact sequence match${match.count === 1 ? '' : 'es'} observed.`
											: 'No matching managed-run sequence observed yet.'}
									</p>
								</div>
								<span class="badge border border-slate-700 bg-slate-950/80 text-slate-200">
									{match.count}
								</span>
							</div>
							{#if match.threadIds.length > 0}
								<div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
									<span>Threads:</span>
									{#each match.threadIds as threadId (threadId)}
										<a
											class={detailLinkClass}
											href={buildAgentUseHref({
												thread: threadId,
												outcome: 'success'
											})}
										>
											{threadLabel(threadId)}
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<div class="space-y-6">
			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<h2 class="text-xl font-semibold text-white">Most-used tools</h2>
				<p class="mt-1 text-sm text-slate-400">
					Which AMS MCP tools agents actually call most often.
				</p>

				{#if data.summary.toolCounts.length === 0}
					<p class="mt-6 text-sm text-slate-400">No tool telemetry has been captured yet.</p>
				{:else}
					<div class="mt-6 space-y-3">
						{#each data.summary.toolCounts.slice(0, 8) as tool (tool.toolName)}
							<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
								<div class="flex items-center justify-between gap-3">
									<div>
										<p class="text-sm font-semibold text-white">{tool.toolName}</p>
										<p class="mt-1 text-xs text-slate-400">
											{tool.successCount} success, {tool.errorCount} error
										</p>
									</div>
									<span class="badge border border-slate-700 bg-slate-950/80 text-slate-200">
										{tool.count}
									</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<h2 class="text-xl font-semibold text-white">Unused playbooks</h2>
				<p class="mt-1 text-sm text-slate-400">
					Manifest playbooks that have not been observed yet in successful managed-run usage.
				</p>

				{#if data.summary.unusedPlaybooks.length === 0}
					<p class="mt-6 text-sm text-emerald-300">
						Every tracked playbook has at least one observed match.
					</p>
				{:else}
					<div class="mt-6 flex flex-wrap gap-2">
						{#each data.summary.unusedPlaybooks as intent (intent)}
							<span class="badge border border-amber-900/70 bg-amber-950/40 text-amber-200">
								{intent}
							</span>
						{/each}
					</div>
				{/if}
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<h2 class="text-xl font-semibold text-white">Guidance gaps</h2>
				<p class="mt-1 text-sm text-slate-400">
					Observed tools without playbook coverage, plus playbook tools that have not appeared in
					telemetry yet.
				</p>

				<div class="mt-6 space-y-5">
					<div>
						<h3 class="text-sm font-semibold text-white">Observed but uncovered tools</h3>
						{#if data.summary.uncoveredToolCounts.length === 0}
							<p class="mt-2 text-sm text-emerald-300">
								Every observed tool is covered by at least one shared playbook.
							</p>
						{:else}
							<div class="mt-3 space-y-3">
								{#each data.summary.uncoveredToolCounts as tool (tool.toolName)}
									<div class="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4">
										<div class="flex items-center justify-between gap-3">
											<div>
												<p class="text-sm font-semibold text-white">{tool.toolName}</p>
												<p class="mt-1 text-xs text-amber-200/80">
													{tool.successCount} success, {tool.errorCount} error
												</p>
											</div>
											<div class="flex items-center gap-2">
												<span
													class="badge border border-amber-900/70 bg-amber-950/40 text-amber-200"
												>
													{tool.count}
												</span>
												<AppButton
													href={buildAgentUseHref({ tool: tool.toolName })}
													variant="ghost"
												>
													Inspect tool
												</AppButton>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<div>
						<h3 class="text-sm font-semibold text-white">Playbook tools not yet observed</h3>
						{#if data.summary.unobservedPlaybookTools.length === 0}
							<p class="mt-2 text-sm text-emerald-300">
								Every playbook tool has appeared at least once in the current telemetry window.
							</p>
						{:else}
							<div class="mt-3 space-y-3">
								{#each data.summary.unobservedPlaybookTools.slice(0, 8) as tool (tool.toolName)}
									<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
										<div class="flex items-center justify-between gap-3">
											<div>
												<p class="text-sm font-semibold text-white">{tool.toolName}</p>
												<p class="mt-1 text-xs text-slate-400">
													Referenced by {formatIntentList(tool.intents)}
												</p>
											</div>
											<AppButton href={buildAgentUseHref({ tool: tool.toolName })} variant="ghost">
												Inspect tool
											</AppButton>
										</div>
									</div>
								{/each}
								{#if data.summary.unobservedPlaybookTools.length > 8}
									<p class="text-xs text-slate-500">
										Showing 8 of {data.summary.unobservedPlaybookTools.length} unobserved playbook tools.
									</p>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</section>
		</div>
	</div>

	<section class="mt-6 card border border-slate-800 bg-slate-950/70 p-6">
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="text-xl font-semibold text-white">Recent MCP activity</h2>
				<p class="mt-1 text-sm text-slate-400">
					The latest AMS MCP tool calls captured from managed runs.
				</p>
			</div>
			<span class="badge border border-slate-700 bg-slate-900/80 text-slate-300">
				{data.summary.recentEvents.length} shown
			</span>
		</div>

		{#if data.summary.recentEvents.length === 0}
			<p class="mt-6 text-sm text-slate-400">No MCP usage events have been recorded yet.</p>
		{:else}
			<div class="mt-6 overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-800 text-left text-sm">
					<thead class="text-xs tracking-[0.18em] text-slate-500 uppercase">
						<tr>
							<th class="px-3 py-2 font-medium">Time</th>
							<th class="px-3 py-2 font-medium">Tool</th>
							<th class="px-3 py-2 font-medium">Command</th>
							<th class="px-3 py-2 font-medium">Thread</th>
							<th class="px-3 py-2 font-medium">Task</th>
							<th class="px-3 py-2 font-medium">Run</th>
							<th class="px-3 py-2 font-medium">Outcome</th>
							<th class="px-3 py-2 font-medium">Args</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-900/80 text-slate-200">
						{#each data.summary.recentEvents as event (event.id)}
							<tr class="align-top">
								<td class="px-3 py-3 text-slate-400">{event.recordedAt}</td>
								<td class="px-3 py-3 font-medium text-white">
									<a class={detailLinkClass} href={buildAgentUseHref({ tool: event.toolName })}>
										{event.toolName}
									</a>
								</td>
								<td class="px-3 py-3 text-slate-400">
									{formatCommandLabel(event.resource, event.command)}
								</td>
								<td class="px-3 py-3 text-slate-400">
									{#if event.threadId}
										<div class="flex flex-col gap-1">
											<a
												class={detailLinkClass}
												href={buildAgentUseHref({ thread: event.threadId })}
											>
												{threadLabel(event.threadId)}
											</a>
											<a
												class={detailLinkClass}
												href={buildDetailHref('thread', event.threadId) ?? '#'}
											>
												Open thread
											</a>
										</div>
									{:else}
										unknown
									{/if}
								</td>
								<td class="px-3 py-3 text-slate-400">
									{#if event.taskId}
										<div class="flex flex-col gap-1">
											<a class={detailLinkClass} href={buildAgentUseHref({ task: event.taskId })}>
												{taskLabel(event.taskId)}
											</a>
											<a
												class={detailLinkClass}
												href={buildDetailHref('task', event.taskId) ?? '#'}
											>
												Open task
											</a>
										</div>
									{:else}
										unknown
									{/if}
								</td>
								<td class="px-3 py-3 text-slate-400">
									{#if event.runId}
										<div class="flex flex-col gap-1">
											<a class={detailLinkClass} href={buildAgentUseHref({ run: event.runId })}>
												{runLabel(event.runId)}
											</a>
											<a class={detailLinkClass} href={buildDetailHref('run', event.runId) ?? '#'}>
												Open run
											</a>
										</div>
									{:else}
										unknown
									{/if}
								</td>
								<td class="px-3 py-3">
									<span
										class={`badge border ${
											event.outcome === 'success'
												? 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200'
												: 'border-rose-900/70 bg-rose-950/40 text-rose-200'
										}`}
									>
										{formatOutcomeLabel(event.outcome)}
									</span>
								</td>
								<td class="px-3 py-3 text-slate-400">
									{event.argKeys.length > 0 ? event.argKeys.join(', ') : 'none'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</AppPage>
