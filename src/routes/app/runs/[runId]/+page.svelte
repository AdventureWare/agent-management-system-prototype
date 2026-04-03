<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import { fetchJson } from '$lib/client/agent-data';
	import { shouldPauseRefresh } from '$lib/client/refresh';
	import ArtifactBrowser from '$lib/components/ArtifactBrowser.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import { ACTIVE_REFRESH_INTERVAL_MS, formatThreadStateLabel } from '$lib/thread-activity';
	import {
		formatRunStatusLabel,
		formatWorkerStatusLabel,
		runStatusToneClass
	} from '$lib/types/control-plane';

	let props = $props<{ data: PageData }>();
	let refreshedData = $state.raw<PageData | null>(null);
	let data = $derived(refreshedData ?? props.data);
	let isRefreshing = $state(false);
	let refreshError = $state<string | null>(null);

	const autoRefreshIntervalLabel = `${ACTIVE_REFRESH_INTERVAL_MS / 1000}s`;

	const timestampFormatter = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	$effect(() => {
		props.data;
		refreshedData = null;
	});

	function formatTimestamp(iso: string | null) {
		if (!iso) {
			return 'Not recorded';
		}

		return timestampFormatter.format(new Date(iso));
	}

	function shouldAutoRefreshRunDetail() {
		return ['queued', 'starting', 'running'].includes(data.run.status);
	}

	async function refreshRunDetail(options: { force?: boolean } = {}) {
		if (isRefreshing || shouldPauseRefresh({ force: options.force })) {
			return;
		}

		isRefreshing = true;

		try {
			refreshedData = await fetchJson<PageData>(
				`/api/runs/${data.run.id}`,
				'Could not refresh the run.'
			);
			refreshError = null;
		} catch (err) {
			refreshError = err instanceof Error ? err.message : 'Could not refresh the run.';
		} finally {
			isRefreshing = false;
		}
	}

	function handleWindowFocus() {
		void refreshRunDetail();
	}

	function handleVisibilityChange() {
		if (document.visibilityState !== 'visible') {
			return;
		}

		void refreshRunDetail();
	}

	$effect(() => {
		if (!shouldAutoRefreshRunDetail()) {
			return;
		}

		const intervalId = window.setInterval(() => {
			void refreshRunDetail();
		}, ACTIVE_REFRESH_INTERVAL_MS);

		return () => {
			window.clearInterval(intervalId);
		};
	});
</script>

<svelte:window onfocus={handleWindowFocus} />
<svelte:document onvisibilitychange={handleVisibilityChange} />

<AppPage width="full">
	<DetailHeader
		backHref={resolve('/app/runs')}
		backLabel="Back to runs"
		eyebrow="Run detail"
		title={data.run.id}
		description={data.run.summary || 'No summary recorded for this execution.'}
	/>

	<div class="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-400">
		<button
			class="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2 font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
			type="button"
			onclick={() => {
				void refreshRunDetail({ force: true });
			}}
			disabled={isRefreshing}
		>
			{isRefreshing ? 'Refreshing...' : 'Refresh state'}
		</button>
		{#if shouldAutoRefreshRunDetail()}
			<span class="rounded-full border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-emerald-200">
				Live updates every {autoRefreshIntervalLabel} while the run is active
			</span>
		{/if}
		{#if refreshError}
			<span class="rounded-full border border-rose-900/70 bg-rose-950/40 px-3 py-2 text-rose-200">
				{refreshError}
			</span>
		{/if}
	</div>

	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
		<article class="card border border-slate-800 bg-slate-950/70 p-4">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Task</p>
			<a
				class="ui-wrap-inline mt-3 text-lg font-semibold text-sky-300 transition hover:text-sky-200"
				href={resolve(`/app/tasks/${data.run.taskId}`)}
			>
				{data.run.taskTitle}
			</a>
			<p class="mt-2 text-sm text-slate-400">{data.run.taskProjectName}</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-4">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Status</p>
			<div class="mt-3 flex flex-wrap items-center gap-2">
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${runStatusToneClass(data.run.status)}`}
				>
					{formatRunStatusLabel(data.run.status)}
				</span>
				{#if data.run.threadState}
					<span class="text-sm text-slate-400">{formatThreadStateLabel(data.run.threadState)}</span>
				{/if}
			</div>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-4">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Worker</p>
			{#if data.worker}
				<a
					class="ui-wrap-inline mt-3 text-lg font-semibold text-sky-300 transition hover:text-sky-200"
					href={resolve(`/app/workers/${data.worker.id}`)}
				>
					{data.run.workerName}
				</a>
				<p class="mt-2 text-sm text-slate-400">
					{formatWorkerStatusLabel(data.worker.status)} worker
				</p>
			{:else}
				<p class="mt-3 text-lg font-semibold text-white">Unassigned</p>
				<p class="mt-2 text-sm text-slate-400">No worker was captured on this run.</p>
			{/if}
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-4">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Thread record</p>
			{#if data.run.agentThreadId}
				<a
					class="ui-wrap-inline mt-3 text-lg font-semibold text-sky-300 transition hover:text-sky-200"
					href={resolve(`/app/threads/${data.run.agentThreadId}`)}
				>
					{data.run.threadName ?? data.run.agentThreadId}
				</a>
				<p class="mt-2 text-sm text-slate-400">
					{data.run.threadState ? formatThreadStateLabel(data.run.threadState) : 'Unknown state'}
					{#if data.run.threadArchivedAt}
						• archived{/if}
				</p>
			{:else}
				<p class="mt-3 text-lg font-semibold text-white">No thread record linked</p>
				<p class="mt-2 text-sm text-slate-400">
					This run was recorded without a managed thread record.
				</p>
			{/if}
		</article>
	</div>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
		<div class="space-y-6">
			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Execution timing
				</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Lifecycle and heartbeat</h2>

				<div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Created</p>
						<p class="mt-2 text-sm text-white">{formatTimestamp(data.run.createdAt)}</p>
						<p class="mt-2 text-xs text-slate-500">{data.run.createdAtLabel}</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Started</p>
						<p class="mt-2 text-sm text-white">{formatTimestamp(data.run.startedAt)}</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Updated</p>
						<p class="mt-2 text-sm text-white">{formatTimestamp(data.run.updatedAt)}</p>
						<p class="mt-2 text-xs text-slate-500">{data.run.updatedAtLabel}</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Heartbeat age
						</p>
						<p
							class={data.run.isHeartbeatStale
								? 'mt-2 text-sm text-amber-300'
								: 'mt-2 text-sm text-white'}
						>
							{data.run.heartbeatAgeLabel}
						</p>
						<p class="mt-2 text-xs text-slate-500">
							Last heartbeat {formatTimestamp(data.run.lastHeartbeatAt)}
						</p>
					</div>
				</div>

				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Ended</p>
						<p class="mt-2 text-sm text-white">{formatTimestamp(data.run.endedAt)}</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Thread id
						</p>
						<p class="ui-wrap-anywhere mt-2 text-sm text-white">
							{data.run.threadId || 'No thread id recorded'}
						</p>
					</div>
				</div>
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Prompt digest
				</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Captured execution inputs</h2>

				<div class="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Digest</p>
					<p class="ui-wrap-anywhere mt-3 font-mono text-sm text-slate-100">
						{data.run.promptDigest || 'Not captured'}
					</p>
				</div>

				<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Summary</p>
					<p class="ui-wrap-anywhere mt-3 text-sm text-slate-200">
						{data.run.summary || 'No summary recorded for this run.'}
					</p>
				</div>
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
							Related task runs
						</p>
						<h2 class="mt-2 text-xl font-semibold text-white">Same task, other attempts</h2>
					</div>
					<a
						class="rounded-full border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
						href={resolve(`/app/tasks/${data.run.taskId}`)}
					>
						Open task
					</a>
				</div>

				<div class="mt-5 space-y-4">
					{#if data.relatedTaskRuns.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No other runs are recorded for this task yet. Open the task to start another run or
							resume its thread.
						</p>
					{:else}
						{#each data.relatedTaskRuns as run (run.id)}
							<a
								class="block rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
								href={resolve(`/app/runs/${run.id}`)}
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-2">
											<p class="ui-wrap-anywhere font-medium text-white">{run.id}</p>
											<span
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${runStatusToneClass(run.status)}`}
											>
												{formatRunStatusLabel(run.status)}
											</span>
										</div>
										<p class="ui-clamp-2 mt-2 text-sm text-slate-400">
											{run.summary || 'No summary recorded.'}
										</p>
									</div>
									<p class="text-xs text-slate-500">Updated {run.updatedAtLabel}</p>
								</div>
							</a>
						{/each}
					{/if}
				</div>
			</section>
		</div>

		<div class="space-y-6">
			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Thread access
				</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Thread record and thread id</h2>

				<div class="mt-5 space-y-4">
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Thread record
						</p>
						{#if data.run.agentThreadId}
							<a
								class="ui-wrap-inline mt-2 text-sm font-medium text-sky-300 transition hover:text-sky-200"
								href={resolve(`/app/threads/${data.run.agentThreadId}`)}
							>
								{data.run.threadName ?? data.run.agentThreadId}
							</a>
						{:else}
							<p class="mt-2 text-sm text-white">No thread record linked</p>
						{/if}
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Thread id
						</p>
						<p class="ui-wrap-anywhere mt-2 text-sm text-white">
							{data.run.threadId || 'No thread id recorded'}
						</p>
					</div>

					{#if data.thread}
						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Thread status
							</p>
							<p class="mt-2 text-sm text-white">
								{formatThreadStateLabel(
									data.thread.threadState ?? data.thread.threadState ?? 'idle'
								)}
							</p>
							<p class="mt-2 text-sm text-slate-400">
								{data.thread.canResume
									? 'Resumable from the manager'
									: 'History only from the manager'}
							</p>
						</div>
					{/if}
				</div>
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Error summary
				</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Failures and blockers</h2>

				<div
					class={data.run.errorSummary
						? 'mt-5 rounded-2xl border border-rose-900/70 bg-rose-950/30 p-4'
						: 'mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4'}
				>
					<p class="ui-wrap-anywhere text-sm text-white">
						{data.run.errorSummary || 'No error summary recorded.'}
					</p>
				</div>
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Artifact paths
				</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Recorded output locations</h2>

				<div class="mt-5 space-y-3">
					{#if data.artifactBrowsers.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No artifact paths were recorded for this run. Check the linked task or thread if
							outputs may have landed elsewhere.
						</p>
					{:else}
						{#each data.artifactBrowsers as browser, index (`${browser?.rootPath ?? 'artifact'}-${index}`)}
							<div class="rounded-3xl border border-slate-800 bg-slate-900/30 p-4">
								<ArtifactBrowser
									{browser}
									emptyLabel="No files or folders were found for this recorded run location."
								/>
							</div>
						{/each}
					{/if}
				</div>
			</section>
		</div>
	</div>
</AppPage>
