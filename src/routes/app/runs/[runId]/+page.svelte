<script lang="ts">
	import { resolve } from '$app/paths';
	import ArtifactBrowser from '$lib/components/ArtifactBrowser.svelte';
	import { formatSessionStateLabel } from '$lib/session-activity';
	import {
		formatRunStatusLabel,
		formatWorkerStatusLabel,
		runStatusToneClass
	} from '$lib/types/control-plane';

	let { data } = $props();

	const timestampFormatter = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	function formatTimestamp(iso: string | null) {
		if (!iso) {
			return 'Not recorded';
		}

		return timestampFormatter.format(new Date(iso));
	}
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div class="min-w-0 space-y-3">
			<a
				class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase transition hover:text-sky-200"
				href={resolve('/app/runs')}
			>
				Runs
			</a>
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="ui-wrap-anywhere text-3xl font-semibold tracking-tight text-white">
					{data.run.id}
				</h1>
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${runStatusToneClass(data.run.status)}`}
				>
					{formatRunStatusLabel(data.run.status)}
				</span>
			</div>
			<p class="ui-wrap-anywhere max-w-3xl text-sm text-slate-300">
				{data.run.summary || 'No summary recorded for this execution.'}
			</p>
		</div>

		<div class="grid w-full gap-3 sm:grid-cols-2 lg:max-w-xl">
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
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Session</p>
				{#if data.run.sessionId}
					<a
						class="ui-wrap-inline mt-3 text-lg font-semibold text-sky-300 transition hover:text-sky-200"
						href={resolve(`/app/sessions/${data.run.sessionId}`)}
					>
						{data.run.sessionName ?? data.run.sessionId}
					</a>
					<p class="mt-2 text-sm text-slate-400">
						{data.run.sessionState ?? 'Unknown state'}
						{#if data.run.sessionArchivedAt}
							• archived{/if}
					</p>
				{:else}
					<p class="mt-3 text-lg font-semibold text-white">No session linked</p>
					<p class="mt-2 text-sm text-slate-400">This run was recorded without a thread session.</p>
				{/if}
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
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Provider</p>
				{#if data.provider}
					<a
						class="ui-wrap-inline mt-3 text-lg font-semibold text-sky-300 transition hover:text-sky-200"
						href={resolve(`/app/providers/${data.provider.id}`)}
					>
						{data.run.providerName}
					</a>
					<p class="mt-2 text-sm text-slate-400">{data.provider.service}</p>
				{:else}
					<p class="mt-3 text-lg font-semibold text-white">No provider</p>
					<p class="mt-2 text-sm text-slate-400">The execution was not tied to a provider.</p>
				{/if}
			</article>
		</div>
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
							No other runs recorded for this task yet.
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
				<h2 class="mt-2 text-xl font-semibold text-white">Session and thread links</h2>

				<div class="mt-5 space-y-4">
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Session</p>
						{#if data.run.sessionId}
							<a
								class="ui-wrap-inline mt-2 text-sm font-medium text-sky-300 transition hover:text-sky-200"
								href={resolve(`/app/sessions/${data.run.sessionId}`)}
							>
								{data.run.sessionName ?? data.run.sessionId}
							</a>
						{:else}
							<p class="mt-2 text-sm text-white">No session linked</p>
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

					{#if data.session}
						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Thread status
							</p>
							<p class="mt-2 text-sm text-white">
								{formatSessionStateLabel(data.session.sessionState)}
							</p>
							<p class="mt-2 text-sm text-slate-400">
								{data.session.canResume
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
							No artifact paths were recorded for this run.
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
</section>
