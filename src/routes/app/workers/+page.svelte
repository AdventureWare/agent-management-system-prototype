<script lang="ts">
	let { data, form } = $props();
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Workers</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Execution capacity</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Workers are the reachable execution surfaces. Keep the distinction clear between local workers
			that can touch your machine and cloud workers that should stay isolated.
		</p>
	</div>

	{#if form?.message}
		<p class="rounded-xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
		<form
			class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6"
			method="POST"
			action="?/createWorker"
		>
			<h2 class="text-xl font-semibold text-white">Register worker</h2>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
				<input
					class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					name="name"
					placeholder="Cloud growth researcher"
					required
				/>
			</label>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Provider</span>
					<select
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
						name="providerId"
					>
						{#each data.providers as provider (provider.id)}
							<option value={provider.id}>{provider.name}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Role</span>
					<select
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
						name="roleId"
					>
						{#each data.roles as role (role.id)}
							<option value={role.id}>{role.name}</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="grid gap-4 sm:grid-cols-3">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Location</span>
					<select
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
						name="location"
					>
						{#each data.locationOptions as location (location)}
							<option value={location}>{location}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
					<select
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
						name="status"
					>
						{#each data.statusOptions as status (status)}
							<option value={status}>{status}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Capacity</span>
					<input
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
						name="capacity"
						type="number"
						min="1"
						value="1"
					/>
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Note</span>
				<textarea
					class="min-h-24 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					name="note"
					placeholder="What this worker is best used for."
				></textarea>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Tags</span>
				<input
					class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					name="tags"
					placeholder="svelte, ios, growth, research"
				/>
			</label>

			<button class="rounded-lg bg-sky-500 px-4 py-2 font-medium text-slate-950" type="submit">
				Register worker
			</button>
		</form>

		<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
			<h2 class="text-xl font-semibold text-white">Current workers</h2>

			<div class="mt-4 space-y-4">
				{#each data.workers as worker (worker.id)}
					<form
						class="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
						method="POST"
						action="?/updateWorker"
					>
						<input name="workerId" type="hidden" value={worker.id} />

						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<h3 class="font-medium text-white">{worker.name}</h3>
								<p class="mt-1 text-sm text-slate-300">{worker.note}</p>
							</div>
							<span
								class="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300 uppercase"
							>
								{worker.location}
							</span>
						</div>

						<p class="text-xs text-slate-500">
							{worker.roleName} · {worker.providerName} · capacity {worker.capacity}
						</p>

						{#if worker.tags.length > 0}
							<div class="flex flex-wrap gap-2">
								{#each worker.tags as tag (tag)}
									<span
										class="rounded-full border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300"
									>
										{tag}
									</span>
								{/each}
							</div>
						{/if}

						<div class="grid gap-4 md:grid-cols-[0.5fr_auto]">
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
								<select
									class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
									name="status"
								>
									{#each data.statusOptions as status (status)}
										<option value={status} selected={worker.status === status}>{status}</option>
									{/each}
								</select>
							</label>

							<div class="flex items-end">
								<button
									class="w-full rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-100"
									type="submit"
								>
									Update
								</button>
							</div>
						</div>
					</form>
				{/each}
			</div>
		</section>
	</div>
</section>
