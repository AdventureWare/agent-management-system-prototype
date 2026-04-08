<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { clearFormDraft, readFormDraft, writeFormDraft } from '$lib/client/form-drafts';
	import { mergeStoredWorkerRecord, workerRecordStore } from '$lib/client/worker-record-store';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import CollectionToolbar from '$lib/components/CollectionToolbar.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatWorkerStatusLabel, workerStatusToneClass } from '$lib/types/control-plane';
	import { fromStore } from 'svelte/store';

	let { data, form } = $props();
	const CREATE_WORKER_DRAFT_KEY = 'ams:create-worker';
	const workerRecordState = fromStore(workerRecordStore);

	let createWorkerDraftReady = $state(false);
	let workerName = $state('');
	let workerProviderId = $state('');
	let workerRoleId = $state('');
	let workerLocation = $state('cloud');
	let workerStatus = $state('idle');
	let workerCapacity = $state('1');
	let workerMaxConcurrentRuns = $state('');
	let workerNote = $state('');
	let workerTags = $state('');
	let workerSkills = $state('');
	let query = $state('');

	function modalShouldStartOpen() {
		return Boolean(form?.message);
	}

	let isCreateModalOpen = $state(modalShouldStartOpen());
	let workers = $derived.by(() =>
		data.workers.map((worker) => mergeStoredWorkerRecord(worker, workerRecordState.current.byId))
	);

	let localWorkerCount = $derived(workers.filter((worker) => worker.location === 'local').length);
	let busyWorkerCount = $derived(workers.filter((worker) => worker.status === 'busy').length);
	let totalCapacity = $derived(workers.reduce((count, worker) => count + worker.capacity, 0));

	function locationClass(location: string) {
		return location === 'local'
			? 'border-sky-800/70 bg-sky-950/40 text-sky-200'
			: 'border-slate-700 bg-slate-950/70 text-slate-300';
	}

	function matchesWorker(worker: (typeof data.workers)[number], term: string) {
		const normalizedTerm = term.trim().toLowerCase();

		if (!normalizedTerm) {
			return true;
		}

		return [
			worker.name,
			worker.note,
			worker.providerName,
			worker.roleName,
			worker.location,
			worker.status,
			worker.tags.join(' '),
			(worker.skills ?? []).join(' '),
			(worker.providerCapabilities ?? []).join(' '),
			(worker.effectiveCapabilities ?? []).join(' ')
		]
			.join(' ')
			.toLowerCase()
			.includes(normalizedTerm);
	}

	let filteredWorkers = $derived(workers.filter((worker) => matchesWorker(worker, query)));

	let createSuccess = $derived(form?.ok && form?.successAction === 'createWorker');

	$effect(() => {
		workerRecordStore.seedWorkers(data.workers);
	});

	function defaultWorkerProviderId() {
		return data.providers[0]?.id ?? '';
	}

	function defaultWorkerRoleId() {
		return data.roles[0]?.id ?? '';
	}

	function defaultWorkerLocation() {
		return data.locationOptions[0] ?? 'cloud';
	}

	function defaultWorkerStatus() {
		return data.statusOptions[0] ?? 'idle';
	}

	function normalizeWorkerLocation(value: string | undefined) {
		return data.locationOptions.find((option) => option === value) ?? defaultWorkerLocation();
	}

	function normalizeWorkerStatus(value: string | undefined) {
		return data.statusOptions.find((option) => option === value) ?? defaultWorkerStatus();
	}

	onMount(() => {
		if (createSuccess) {
			clearFormDraft(CREATE_WORKER_DRAFT_KEY);
			createWorkerDraftReady = true;
			return;
		}

		const savedDraft = readFormDraft<{
			name: string;
			providerId: string;
			roleId: string;
			location: string;
			status: string;
			capacity: string;
			maxConcurrentRuns: string;
			note: string;
			tags: string;
			skills: string;
		}>(CREATE_WORKER_DRAFT_KEY);

		if (savedDraft) {
			workerName = savedDraft.name ?? '';
			workerProviderId = savedDraft.providerId ?? defaultWorkerProviderId();
			workerRoleId = savedDraft.roleId ?? defaultWorkerRoleId();
			workerLocation = normalizeWorkerLocation(savedDraft.location);
			workerStatus = normalizeWorkerStatus(savedDraft.status);
			workerCapacity = savedDraft.capacity ?? '1';
			workerMaxConcurrentRuns = savedDraft.maxConcurrentRuns ?? '';
			workerNote = savedDraft.note ?? '';
			workerTags = savedDraft.tags ?? '';
			workerSkills = savedDraft.skills ?? '';
			isCreateModalOpen = true;
		}

		workerProviderId = workerProviderId || defaultWorkerProviderId();
		workerRoleId = workerRoleId || defaultWorkerRoleId();
		workerLocation = normalizeWorkerLocation(workerLocation);
		workerStatus = normalizeWorkerStatus(workerStatus);

		createWorkerDraftReady = true;
	});

	$effect(() => {
		if (!createWorkerDraftReady) {
			return;
		}

		writeFormDraft(CREATE_WORKER_DRAFT_KEY, {
			name: workerName,
			providerId: workerProviderId === defaultWorkerProviderId() ? '' : workerProviderId,
			roleId: workerRoleId === defaultWorkerRoleId() ? '' : workerRoleId,
			location: workerLocation === defaultWorkerLocation() ? '' : workerLocation,
			status: workerStatus === defaultWorkerStatus() ? '' : workerStatus,
			capacity: workerCapacity === '1' ? '' : workerCapacity,
			maxConcurrentRuns: workerMaxConcurrentRuns,
			note: workerNote,
			tags: workerTags,
			skills: workerSkills
		});
	});
</script>

<AppPage>
	<PageHeader
		eyebrow="Execution Surfaces"
		title="Browse execution surfaces"
		description="Execution surfaces are the actual local or cloud runtimes that can take work. This page stays collection-first so you can find the right surface quickly, then drill into its detail page for routing and activity."
	>
		{#snippet actions()}
			<AppButton
				type="button"
				variant="primary"
				onclick={() => {
					isCreateModalOpen = true;
				}}
			>
				Add surface
			</AppButton>
		{/snippet}
	</PageHeader>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		<MetricCard
			label="Surfaces"
			value={workers.length}
			detail="Reachable execution surfaces saved in the control plane."
		/>
		<MetricCard
			label="Local surfaces"
			value={localWorkerCount}
			detail="Execution surfaces that can directly touch your machine and repos."
		/>
		<MetricCard
			label="Total capacity"
			value={totalCapacity}
			detail={`${busyWorkerCount} surfaces are marked busy right now.`}
		/>
	</div>

	{#if form?.message}
		<p class="ui-notice border border-rose-900/70 bg-rose-950/40 text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if createSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Execution surface created and saved into the control plane.
		</p>
	{/if}

	<CollectionToolbar
		title="Surface directory"
		description="Search by surface name, role, provider, note, or tags, then open one surface for full routing and execution detail."
	>
		{#snippet controls()}
			<div class="w-full xl:w-80">
				<label class="sr-only" for="worker-search">Search workers</label>
				<input
					id="worker-search"
					bind:value={query}
					class="input text-white placeholder:text-slate-500"
					placeholder="Search workers"
				/>
			</div>
		{/snippet}

		{#if filteredWorkers.length === 0}
			<p class="ui-empty-state mt-6">No workers match the current search.</p>
		{:else}
			<div class="mt-6 space-y-4">
				{#each filteredWorkers as worker (worker.id)}
					<a
						class="group block rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-400/40 hover:bg-slate-900"
						href={resolve(`/app/workers/${worker.id}`)}
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<h3
										class="ui-wrap-anywhere text-lg font-semibold text-white transition group-hover:text-sky-200"
									>
										{worker.name}
									</h3>
									<span
										class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${workerStatusToneClass(worker.status)}`}
									>
										{formatWorkerStatusLabel(worker.status)}
									</span>
									<span
										class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${locationClass(worker.location)}`}
									>
										{worker.location}
									</span>
								</div>
								<p class="ui-clamp-3 mt-2 text-sm text-slate-300">
									{worker.note || 'No note saved.'}
								</p>
							</div>
							<div class="min-w-0 text-left text-xs text-slate-500 sm:max-w-56 sm:text-right">
								<p class="ui-wrap-anywhere">{worker.providerName}</p>
								<p class="ui-wrap-anywhere mt-1">{worker.roleName}</p>
							</div>
						</div>

						<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Capacity</p>
								<p class="mt-2 text-lg font-semibold text-white">{worker.capacity}</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Concurrency</p>
								<p class="mt-2 text-lg font-semibold text-white">
									{worker.activeRunCount} / {worker.effectiveConcurrencyLimit}
								</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Assigned tasks</p>
								<p class="mt-2 text-lg font-semibold text-white">{worker.assignedTaskCount}</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Last run</p>
								<p class="ui-wrap-anywhere mt-2 text-sm text-white">
									{worker.latestRunAt ? new Date(worker.latestRunAt).toLocaleString() : 'None'}
								</p>
							</div>
						</div>

						{#if worker.tags.length > 0}
							<div class="mt-4 flex flex-wrap gap-2">
								{#each worker.tags as tag (tag)}
									<span
										class="ui-wrap-anywhere rounded-full border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300"
									>
										{tag}
									</span>
								{/each}
							</div>
						{/if}

						{#if (worker.skills?.length ?? 0) > 0 || (worker.providerCapabilities?.length ?? 0) > 0}
							<div class="mt-4 flex flex-wrap gap-2">
								{#each worker.skills ?? [] as skill (skill)}
									<span
										class="ui-wrap-anywhere rounded-full border border-sky-900/60 bg-sky-950/20 px-2 py-1 text-xs text-sky-100"
									>
										{skill}
										<span class="text-sky-300/70"> · worker</span>
									</span>
								{/each}
								{#each worker.providerCapabilities ?? [] as capability (capability)}
									<span
										class="ui-wrap-anywhere rounded-full border border-emerald-900/60 bg-emerald-950/20 px-2 py-1 text-xs text-emerald-100"
									>
										{capability}
										<span class="text-emerald-300/70"> · provider</span>
									</span>
								{/each}
							</div>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	</CollectionToolbar>
</AppPage>

{#if isCreateModalOpen}
	<AppDialog
		bind:open={isCreateModalOpen}
		title="Register worker"
		description="Add a new execution surface after you confirm the current directory does not already cover the capacity you need."
		closeLabel="Close register worker form"
	>
		<form class="space-y-6" method="POST" action="?/createWorker" data-persist-scope="manual">
			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
				<input
					bind:value={workerName}
					class="input text-white placeholder:text-slate-500"
					name="name"
					placeholder="Cloud growth researcher"
					required
				/>
			</label>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Provider</span>
					<select bind:value={workerProviderId} class="select text-white" name="providerId">
						{#each data.providers as provider (provider.id)}
							<option value={provider.id}>{provider.name}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Role</span>
					<select bind:value={workerRoleId} class="select text-white" name="roleId">
						{#each data.roles as role (role.id)}
							<option value={role.id}>{role.name}</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="grid gap-4 sm:grid-cols-3">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Location</span>
					<select bind:value={workerLocation} class="select text-white" name="location">
						{#each data.locationOptions as location (location)}
							<option value={location}>{location}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
					<select bind:value={workerStatus} class="select text-white" name="status">
						{#each data.statusOptions as status (status)}
							<option value={status}>{formatWorkerStatusLabel(status)}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Capacity</span>
					<input
						bind:value={workerCapacity}
						class="input text-white"
						name="capacity"
						type="number"
						min="1"
					/>
				</label>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Skills</span>
					<input
						bind:value={workerSkills}
						class="input text-white placeholder:text-slate-500"
						name="skills"
						placeholder="planning, svelte, citations"
					/>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200"> Max concurrent runs </span>
					<input
						bind:value={workerMaxConcurrentRuns}
						class="input text-white placeholder:text-slate-500"
						name="maxConcurrentRuns"
						type="number"
						min="1"
						placeholder="Use capacity"
					/>
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Note</span>
				<textarea
					bind:value={workerNote}
					class="textarea min-h-24 text-white placeholder:text-slate-500"
					name="note"
					placeholder="What this worker is best used for."
				></textarea>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Tags</span>
				<input
					bind:value={workerTags}
					class="input text-white placeholder:text-slate-500"
					name="tags"
					placeholder="svelte, ios, growth, research"
				/>
			</label>

			<AppButton type="submit" variant="primary">Register worker</AppButton>
		</form>
	</AppDialog>
{/if}
