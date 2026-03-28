<script lang="ts">
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	let updateSuccess = $derived(form?.ok && form?.successAction === 'updateWorker');

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
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div class="space-y-3">
			<a
				class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase transition hover:text-sky-200"
				href={resolve('/app/workers')}
			>
				Workers
			</a>
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="text-3xl font-semibold tracking-tight text-white">{data.worker.name}</h1>
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${statusClass(data.worker.status)}`}
				>
					{data.worker.status}
				</span>
			</div>
			<p class="max-w-3xl text-sm text-slate-300">{data.worker.note || 'No note saved for this worker yet.'}</p>
		</div>

		<div class="grid w-full gap-3 sm:grid-cols-2 lg:max-w-xl">
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Provider</p>
				<p class="mt-3 text-lg font-semibold text-white">{data.worker.providerName}</p>
				<p class="mt-2 text-sm text-slate-400">{data.worker.location} execution surface</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Role</p>
				<p class="mt-3 text-lg font-semibold text-white">{data.worker.roleName}</p>
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

	<div class="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
		<form
			class="space-y-4 card border border-slate-800 bg-slate-950/70 p-6"
			method="POST"
			action="?/updateWorker"
		>
			<div class="space-y-2">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Worker details</p>
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
							<option value={status} selected={data.worker.status === status}>{status}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Capacity</span>
					<input class="input text-white" name="capacity" type="number" min="1" value={data.worker.capacity} />
				</label>
			</div>

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
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Registered
					</p>
					<p class="mt-2">{new Date(data.worker.registeredAt).toLocaleString()}</p>
				</div>
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Last seen
					</p>
					<p class="mt-2">{new Date(data.worker.lastSeenAt).toLocaleString()}</p>
				</div>
			</div>

			<button class="btn preset-filled-primary-500 font-semibold" type="submit">
				Save worker
			</button>
		</form>

		<div class="space-y-6">
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
									<div>
										<p class="font-medium text-white">{task.title}</p>
										<p class="mt-1 text-sm text-slate-400">Updated {task.updatedAtLabel}</p>
									</div>
									<span
										class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${statusClass(task.status === 'done' ? 'idle' : task.status === 'blocked' ? 'offline' : task.status === 'running' ? 'busy' : 'idle')}`}
									>
										{task.status}
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
									<div>
										<p class="font-medium text-white">{run.taskTitle}</p>
										<p class="mt-1 text-sm text-slate-400">{run.summary || 'No summary recorded.'}</p>
									</div>
									<p class="text-xs text-slate-500">Updated {run.updatedAtLabel}</p>
								</div>
								<div class="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
									<span>{run.status}</span>
									{#if run.sessionId}
										<a
											class="text-sky-300 transition hover:text-sky-200"
											href={resolve(`/app/sessions/${run.sessionId}`)}
										>
											Open session
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
</section>
