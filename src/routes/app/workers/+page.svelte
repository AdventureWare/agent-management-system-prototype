<script lang="ts">
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	let query = $state('');

	let localWorkerCount = $derived(data.workers.filter((worker) => worker.location === 'local').length);
	let busyWorkerCount = $derived(data.workers.filter((worker) => worker.status === 'busy').length);
	let totalCapacity = $derived(data.workers.reduce((count, worker) => count + worker.capacity, 0));

	function statusClass(status: string) {
		switch (status) {
			case 'busy':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-300';
			case 'offline':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-300';
			default:
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
		}
	}

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
			worker.tags.join(' ')
		]
			.join(' ')
			.toLowerCase()
			.includes(normalizedTerm);
	}

	let filteredWorkers = $derived(data.workers.filter((worker) => matchesWorker(worker, query)));
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Workers</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Browse execution surfaces</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Workers represent the actual local or cloud surfaces that can take work. This page should help
			you find the right worker quickly, then jump into the worker detail page for updates and context.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Workers</p>
			<p class="mt-3 text-3xl font-semibold text-white">{data.workers.length}</p>
			<p class="mt-2 text-sm text-slate-400">Reachable execution surfaces saved in the control plane.</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Local workers</p>
			<p class="mt-3 text-3xl font-semibold text-white">{localWorkerCount}</p>
			<p class="mt-2 text-sm text-slate-400">Workers that can directly touch your machine and repos.</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Total capacity</p>
			<p class="mt-3 text-3xl font-semibold text-white">{totalCapacity}</p>
			<p class="mt-2 text-sm text-slate-400">{busyWorkerCount} workers are marked busy right now.</p>
		</article>
	</div>

	{#if form?.message}
		<p class="rounded-xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
		<form
			class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6"
			method="POST"
			action="?/createWorker"
		>
			<h2 class="text-xl font-semibold text-white">Register worker</h2>
			<p class="text-sm text-slate-400">
				Create the worker here. Status changes, notes, and related activity live on the detail page.
			</p>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
				<input
					class="input text-white placeholder:text-slate-500"
					name="name"
					placeholder="Cloud growth researcher"
					required
				/>
			</label>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Provider</span>
					<select class="select text-white" name="providerId">
						{#each data.providers as provider (provider.id)}
							<option value={provider.id}>{provider.name}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Role</span>
					<select class="select text-white" name="roleId">
						{#each data.roles as role (role.id)}
							<option value={role.id}>{role.name}</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="grid gap-4 sm:grid-cols-3">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Location</span>
					<select class="select text-white" name="location">
						{#each data.locationOptions as location (location)}
							<option value={location}>{location}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
					<select class="select text-white" name="status">
						{#each data.statusOptions as status (status)}
							<option value={status}>{status}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Capacity</span>
					<input class="input text-white" name="capacity" type="number" min="1" value="1" />
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Note</span>
				<textarea
					class="textarea min-h-24 text-white placeholder:text-slate-500"
					name="note"
					placeholder="What this worker is best used for."
				></textarea>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Tags</span>
				<input
					class="input text-white placeholder:text-slate-500"
					name="tags"
					placeholder="svelte, ios, growth, research"
				/>
			</label>

			<button class="btn preset-filled-primary-500 font-semibold" type="submit">
				Register worker
			</button>
		</form>

		<div class="space-y-6">
			<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
				<div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
					<div>
						<h2 class="text-xl font-semibold text-white">Worker directory</h2>
						<p class="mt-1 text-sm text-slate-400">
							Search by worker name, role, provider, note, or tags.
						</p>
					</div>
					<div class="w-full xl:w-80">
						<label class="sr-only" for="worker-search">Search workers</label>
						<input
							id="worker-search"
							bind:value={query}
							class="input text-white placeholder:text-slate-500"
							placeholder="Search workers"
						/>
					</div>
				</div>
			</section>

			<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
				{#if filteredWorkers.length === 0}
					<p
						class="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400"
					>
						No workers match the current search.
					</p>
				{:else}
					<div class="space-y-4">
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
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${statusClass(worker.status)}`}
											>
												{worker.status}
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

								<div class="mt-4 grid gap-3 sm:grid-cols-3">
									<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Capacity</p>
										<p class="mt-2 text-lg font-semibold text-white">{worker.capacity}</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
											Assigned tasks
										</p>
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
							</a>
						{/each}
					</div>
				{/if}
			</section>
		</div>
	</div>
</section>
