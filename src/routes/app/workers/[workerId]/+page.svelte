<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { resolve } from '$app/paths';
	import { fetchJson } from '$lib/client/agent-data';
	import { shouldPauseRefresh } from '$lib/client/refresh';
	import { mergeStoredWorkerRecord, workerRecordStore } from '$lib/client/worker-record-store';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import { ACTIVE_REFRESH_INTERVAL_MS } from '$lib/thread-activity';
	import {
		formatRunStatusLabel,
		formatTaskStatusLabel,
		formatWorkerStatusLabel,
		runStatusToneClass,
		taskStatusToneClass,
		workerStatusToneClass
	} from '$lib/types/control-plane';
	import { fromStore } from 'svelte/store';

	let props = $props<{ data: PageData; form?: ActionData }>();
	let form = $derived(props.form);
	let refreshedData = $state.raw<PageData | null>(null);
	let sourceData = $derived(refreshedData ?? props.data);
	const workerRecordState = fromStore(workerRecordStore);
	let data = $derived.by(() => ({
		...sourceData,
		worker: mergeStoredWorkerRecord(sourceData.worker, workerRecordState.current.byId)
	}));
	let isRefreshing = $state(false);
	let refreshError = $state<string | null>(null);

	let updateSuccess = $derived(form?.ok && form?.successAction === 'updateWorker');
	const autoRefreshIntervalLabel = `${ACTIVE_REFRESH_INTERVAL_MS / 1000}s`;
	function runIsActive(run: PageData['recentRuns'][number]) {
		return ['queued', 'starting', 'running'].includes(run.status);
	}

	let hasActiveRecentRun = $derived(data.recentRuns.some(runIsActive));

	$effect(() => {
		if (props.data) {
			refreshedData = null;
		}
	});

	$effect(() => {
		workerRecordStore.seedWorker(sourceData.worker);
	});

	function shouldAutoRefreshWorkerDetail() {
		return data.worker.status === 'busy' || hasActiveRecentRun;
	}

	async function refreshWorkerDetail(options: { force?: boolean } = {}) {
		if (isRefreshing || shouldPauseRefresh({ force: options.force })) {
			return;
		}

		isRefreshing = true;

		try {
			refreshedData = await fetchJson<PageData>(
				`/api/workers/${data.worker.id}`,
				'Could not refresh the worker detail.'
			);
			refreshError = null;
		} catch (err) {
			refreshError = err instanceof Error ? err.message : 'Could not refresh the worker detail.';
		} finally {
			isRefreshing = false;
		}
	}

	function handleWindowFocus() {
		void refreshWorkerDetail();
	}

	function handleVisibilityChange() {
		if (document.visibilityState !== 'visible') {
			return;
		}

		void refreshWorkerDetail();
	}

	$effect(() => {
		if (!shouldAutoRefreshWorkerDetail()) {
			return;
		}

		const intervalId = window.setInterval(() => {
			void refreshWorkerDetail();
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
		backHref={resolve('/app/workers')}
		backLabel="Back to workers"
		eyebrow="Worker detail"
		title={data.worker.name}
		description={data.worker.note || 'No note saved for this worker yet.'}
	>
		{#snippet meta()}
			<div class="flex flex-wrap gap-2">
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${workerStatusToneClass(data.worker.status)}`}
				>
					{formatWorkerStatusLabel(data.worker.status)}
				</span>
			</div>
		{/snippet}
	</DetailHeader>

	<div class="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-400">
		<button
			class="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2 font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
			type="button"
			onclick={() => {
				void refreshWorkerDetail({ force: true });
			}}
			disabled={isRefreshing}
		>
			{isRefreshing ? 'Refreshing...' : 'Refresh state'}
		</button>
		{#if shouldAutoRefreshWorkerDetail()}
			<span
				class="rounded-full border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-emerald-200"
			>
				Live updates every {autoRefreshIntervalLabel} while this worker is active
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
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Provider</p>
			<p class="ui-wrap-anywhere mt-3 text-lg font-semibold text-white">
				{data.worker.providerName}
			</p>
			<p class="ui-wrap-anywhere mt-2 text-sm text-slate-400">
				{data.worker.location} execution surface
			</p>
			<p class="ui-wrap-anywhere mt-1 text-sm text-slate-400">
				Provider default sandbox: {data.worker.providerDefaultThreadSandbox}
			</p>
		</article>
		<article class="card border border-slate-800 bg-slate-950/70 p-4">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Role</p>
			<p class="ui-wrap-anywhere mt-3 text-lg font-semibold text-white">{data.worker.roleName}</p>
			<p class="mt-2 text-sm text-slate-400">Capacity {data.worker.capacity}</p>
		</article>
		<article class="card border border-slate-800 bg-slate-950/70 p-4">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Assigned tasks</p>
			<p class="mt-3 text-3xl font-semibold text-white">{data.assignedTasks.length}</p>
			<p class="mt-2 text-sm text-slate-400">Tasks currently assigned to this worker.</p>
		</article>
		<article class="card border border-slate-800 bg-slate-950/70 p-4">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Recent runs</p>
			<p class="mt-3 text-3xl font-semibold text-white">{data.recentRuns.length}</p>
			<p class="mt-2 text-sm text-slate-400">Latest recorded runs on this worker.</p>
		</article>
	</div>

	{#if form?.message}
		<p class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if updateSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Worker updates saved.
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
		<form
			class="space-y-4 card border border-slate-800 bg-slate-950/70 p-6"
			method="POST"
			action="?/updateWorker"
		>
			<div class="space-y-2">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Worker details
				</p>
				<h2 class="text-xl font-semibold text-white">Edit worker status and routing context</h2>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
				<input class="input text-white" name="name" required value={data.worker.name} />
			</label>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Provider</span>
					<select class="select text-white" name="providerId">
						{#each data.providers as provider (provider.id)}
							<option value={provider.id} selected={data.worker.providerId === provider.id}>
								{provider.name}
							</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Role</span>
					<select class="select text-white" name="roleId">
						{#each data.roles as role (role.id)}
							<option value={role.id} selected={data.worker.roleId === role.id}>{role.name}</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="grid gap-4 sm:grid-cols-3">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Location</span>
					<select class="select text-white" name="location">
						{#each data.locationOptions as location (location)}
							<option value={location} selected={data.worker.location === location}>
								{location}
							</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
					<select class="select text-white" name="status">
						{#each data.statusOptions as status (status)}
							<option value={status} selected={data.worker.status === status}>
								{formatWorkerStatusLabel(status)}
							</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Capacity</span>
					<input
						class="input text-white"
						name="capacity"
						type="number"
						min="1"
						value={data.worker.capacity}
					/>
				</label>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Skills</span>
					<input
						class="input text-white"
						name="skills"
						value={(data.worker.skills ?? []).join(', ')}
					/>
					<p class="mt-2 text-xs text-slate-500">
						Worker-specific skills used for routing and coverage checks.
					</p>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Max concurrent runs</span>
					<input
						class="input text-white"
						name="maxConcurrentRuns"
						type="number"
						min="1"
						value={data.worker.maxConcurrentRuns ?? ''}
					/>
					<p class="mt-2 text-xs text-slate-500">
						Leave blank to use the worker capacity as the concurrency limit.
					</p>
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Thread sandbox override</span>
				<select class="select text-white" name="threadSandboxOverride">
					<option value="" selected={data.worker.threadSandboxOverride === null}>
						Use provider default ({data.worker.providerDefaultThreadSandbox})
					</option>
					{#each data.sandboxOptions as sandbox (sandbox)}
						<option value={sandbox} selected={data.worker.threadSandboxOverride === sandbox}>
							{sandbox}
						</option>
					{/each}
				</select>
				<p class="mt-2 text-xs text-slate-500">
					Applies when this worker starts a new managed thread. Existing threads keep their own
					saved sandbox until you change them directly.
				</p>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Note</span>
				<textarea class="textarea min-h-24 text-white" name="note">{data.worker.note}</textarea>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Tags</span>
				<input class="input text-white" name="tags" value={data.worker.tags.join(', ')} />
			</label>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Registered</p>
					<p class="mt-2">{new Date(data.worker.registeredAt).toLocaleString()}</p>
				</div>
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Last seen</p>
					<p class="mt-2">{new Date(data.worker.lastSeenAt).toLocaleString()}</p>
				</div>
			</div>

			<button class="btn preset-filled-primary-500 font-semibold" type="submit">
				Save worker
			</button>
		</form>

		<div class="space-y-6">
			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
							Capability summary
						</p>
						<h2 class="mt-2 text-xl font-semibold text-white">Current execution surface</h2>
					</div>
				</div>

				<div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Worker skills
						</p>
						<p class="mt-2 text-sm text-white">
							{data.worker.skills.length > 0 ? data.worker.skills.join(', ') : 'None listed'}
						</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Provider capabilities
						</p>
						<p class="mt-2 text-sm text-white">
							{data.worker.providerCapabilities.length > 0
								? data.worker.providerCapabilities.join(', ')
								: 'None listed'}
						</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Effective concurrency
						</p>
						<p class="mt-2 text-sm text-white">
							{data.worker.activeRunCount} active / {data.worker.effectiveConcurrencyLimit} allowed
						</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Thread sandbox
						</p>
						<p class="mt-2 text-sm text-white">
							{data.worker.threadSandboxOverride ??
								`Provider default (${data.worker.providerDefaultThreadSandbox})`}
						</p>
					</div>
				</div>

				{#if data.worker.effectiveCapabilities.length > 0}
					<div class="mt-4 flex flex-wrap gap-2">
						{#each data.worker.effectiveCapabilities as capability (capability)}
							<span
								class="ui-wrap-anywhere rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
							>
								{capability}
							</span>
						{/each}
					</div>
				{/if}
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
							Assigned tasks
						</p>
						<h2 class="mt-2 text-xl font-semibold text-white">Work currently routed here</h2>
					</div>
					<a
						class="rounded-full border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
						href={resolve('/app/tasks')}
					>
						Open tasks
					</a>
				</div>

				<div class="mt-5 space-y-4">
					{#if data.assignedTasks.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No tasks are assigned to this worker right now.
						</p>
					{:else}
						{#each data.assignedTasks as task (task.id)}
							<a
								class="block rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
								href={resolve(`/app/tasks/${task.id}`)}
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<p class="ui-wrap-anywhere font-medium text-white">{task.title}</p>
										<p class="mt-1 text-sm text-slate-400">Updated {task.updatedAtLabel}</p>
									</div>
									<span
										class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(task.status)}`}
									>
										{formatTaskStatusLabel(task.status)}
									</span>
								</div>
							</a>
						{/each}
					{/if}
				</div>
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Recent runs</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Latest execution history</h2>

				<div class="mt-5 space-y-4">
					{#if data.recentRuns.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No runs recorded for this worker yet.
						</p>
					{:else}
						{#each data.recentRuns as run (run.id)}
							<article class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<p class="ui-wrap-anywhere font-medium text-white">{run.taskTitle}</p>
										<p class="ui-clamp-3 mt-1 text-sm text-slate-400">
											{run.summary || 'No summary recorded.'}
										</p>
									</div>
									<p class="text-xs text-slate-500">Updated {run.updatedAtLabel}</p>
								</div>
								<div class="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
									<span
										class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${runStatusToneClass(run.status)}`}
									>
										{formatRunStatusLabel(run.status)}
									</span>
									<a
										class="text-sky-300 transition hover:text-sky-200"
										href={resolve(`/app/runs/${run.id}`)}
									>
										Open run
									</a>
									{#if run.agentThreadId}
										<a
											class="text-sky-300 transition hover:text-sky-200"
											href={resolve(`/app/threads/${run.agentThreadId}`)}
										>
											Open thread
										</a>
									{/if}
									<a
										class="text-sky-300 transition hover:text-sky-200"
										href={resolve(`/app/tasks/${run.taskId}`)}
									>
										Open task
									</a>
								</div>
							</article>
						{/each}
					{/if}
				</div>
			</section>
		</div>
	</div>
</AppPage>
