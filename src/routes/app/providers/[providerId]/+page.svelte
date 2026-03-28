<script lang="ts">
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	let updateSuccess = $derived(form?.ok && form?.successAction === 'updateProvider');

	function statusClass(status: string) {
		switch (status) {
			case 'connected':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'needs_setup':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function enabledClass(enabled: boolean) {
		return enabled
			? 'border-sky-800/70 bg-sky-950/40 text-sky-200'
			: 'border-slate-700 bg-slate-950/70 text-slate-400';
	}
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div class="space-y-3">
			<a
				class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase transition hover:text-sky-200"
				href={resolve('/app/providers')}
			>
				Providers
			</a>
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="text-3xl font-semibold tracking-tight text-white">{data.provider.name}</h1>
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${enabledClass(data.provider.enabled)}`}
				>
					{data.provider.enabled ? 'enabled' : 'disabled'}
				</span>
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${statusClass(data.provider.setupStatus)}`}
				>
					{data.provider.setupStatus.replace('_', ' ')}
				</span>
			</div>
			<p class="max-w-3xl text-sm text-slate-300">
				{data.provider.description || 'No description saved for this provider yet.'}
			</p>
		</div>

		<div class="grid w-full gap-3 sm:grid-cols-2 lg:max-w-xl">
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Service</p>
				<p class="mt-3 text-lg font-semibold text-white">{data.provider.service}</p>
				<p class="mt-2 text-sm text-slate-400">{data.provider.kind} surface</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Auth mode</p>
				<p class="mt-3 text-lg font-semibold text-white">{data.provider.authMode}</p>
				<p class="mt-2 text-sm text-slate-400">Launcher: {data.provider.launcher || 'Not set'}</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Workers</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.attachedWorkers.length}</p>
				<p class="mt-2 text-sm text-slate-400">Workers currently configured against this provider.</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Recent runs</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.recentRuns.length}</p>
				<p class="mt-2 text-sm text-slate-400">Most recent runs routed through this provider.</p>
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
			Provider updates saved.
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
		<form
			class="space-y-4 card border border-slate-800 bg-slate-950/70 p-6"
			method="POST"
			action="?/updateProvider"
		>
			<div class="space-y-2">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Provider details</p>
				<h2 class="text-xl font-semibold text-white">Edit provider readiness and defaults</h2>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
					<input class="input text-white" name="name" required value={data.provider.name} />
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Service</span>
					<input class="input text-white" name="service" required value={data.provider.service} />
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Description</span>
				<textarea class="textarea min-h-24 text-white" name="description"
					>{data.provider.description}</textarea
				>
			</label>

			<div class="grid gap-4 md:grid-cols-3">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Access surface</span>
					<select class="select text-white" name="kind">
						{#each data.kindOptions as kind (kind)}
							<option value={kind} selected={data.provider.kind === kind}>{kind}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Auth mode</span>
					<select class="select text-white" name="authMode">
						{#each data.authModeOptions as authMode (authMode)}
							<option value={authMode} selected={data.provider.authMode === authMode}>
								{authMode}
							</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Setup status</span>
					<select class="select text-white" name="setupStatus">
						{#each data.setupStatusOptions as setupStatus (setupStatus)}
							<option value={setupStatus} selected={data.provider.setupStatus === setupStatus}>
								{setupStatus}
							</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Default model</span>
					<input class="input text-white" name="defaultModel" value={data.provider.defaultModel} />
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Launcher or command</span>
					<input class="input text-white" name="launcher" value={data.provider.launcher} />
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Base URL</span>
				<input class="input text-white" name="baseUrl" value={data.provider.baseUrl} />
			</label>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Environment variables</span>
					<input class="input text-white" name="envVars" value={data.provider.envVars.join(', ')} />
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Capabilities</span>
					<input
						class="input text-white"
						name="capabilities"
						value={data.provider.capabilities.join(', ')}
					/>
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Notes</span>
				<textarea class="textarea min-h-28 text-white" name="notes">{data.provider.notes}</textarea>
			</label>

			<div
				class="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<label
					class="inline-flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-200"
				>
					<input checked={data.provider.enabled} class="checkbox" name="enabled" type="checkbox" />
					<span>Keep enabled</span>
				</label>

				<button class="btn preset-filled-primary-500 font-semibold" type="submit">
					Save provider
				</button>
			</div>
		</form>

		<div class="space-y-6">
			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Configuration summary
				</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Current capabilities and requirements</h2>

				<div class="mt-5 space-y-4">
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Environment variables
						</p>
						<p class="mt-2 text-sm text-white">
							{data.provider.envVars.length > 0 ? data.provider.envVars.join(', ') : 'None listed'}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Capabilities
						</p>
						<p class="mt-2 text-sm text-white">
							{data.provider.capabilities.length > 0
								? data.provider.capabilities.join(', ')
								: 'None listed'}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Notes</p>
						<p class="mt-2 text-sm text-white">{data.provider.notes || 'No notes saved.'}</p>
					</div>
				</div>
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
							Attached workers
						</p>
						<h2 class="mt-2 text-xl font-semibold text-white">Workers using this provider</h2>
					</div>
					<a
						class="rounded-full border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
						href={resolve('/app/workers')}
					>
						Open workers
					</a>
				</div>

				<div class="mt-5 space-y-4">
					{#if data.attachedWorkers.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No workers are attached to this provider yet.
						</p>
					{:else}
						{#each data.attachedWorkers as worker (worker.id)}
							<a
								class="block rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
								href={resolve(`/app/workers/${worker.id}`)}
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div>
										<h3 class="font-medium text-white">{worker.name}</h3>
										<p class="mt-1 text-sm text-slate-400">{worker.roleName}</p>
									</div>
									<span
										class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
									>
										{worker.status}
									</span>
								</div>
								<p class="mt-3 text-sm text-slate-300">{worker.note || 'No note saved.'}</p>
							</a>
						{/each}
					{/if}
				</div>
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Recent runs</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Latest activity through this provider</h2>

				<div class="mt-5 space-y-4">
					{#if data.recentRuns.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No runs have been recorded for this provider yet.
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
									<span>{run.sessionId || 'No session'}</span>
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
