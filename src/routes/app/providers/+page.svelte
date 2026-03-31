<script lang="ts">
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	let query = $state('');

	function modalShouldStartOpen() {
		return Boolean(form?.message);
	}

	let isCreateModalOpen = $state(modalShouldStartOpen());

	let createSuccess = $derived(form?.ok && form?.successAction === 'createProvider');

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

	function matchesProvider(provider: (typeof data.providers)[number], term: string) {
		const normalizedTerm = term.trim().toLowerCase();

		if (!normalizedTerm) {
			return true;
		}

		return [
			provider.name,
			provider.service,
			provider.description,
			provider.kind,
			provider.authMode,
			provider.defaultModel,
			provider.launcher,
			provider.capabilities.join(' '),
			provider.envVars.join(' ')
		]
			.join(' ')
			.toLowerCase()
			.includes(normalizedTerm);
	}

	let filteredProviders = $derived(
		data.providers.filter((provider) => matchesProvider(provider, query))
	);

	function closeCreateModal() {
		isCreateModalOpen = false;
	}
</script>

<svelte:document
	onkeydown={(event) => {
		if (event.key === 'Escape' && isCreateModalOpen) {
			closeCreateModal();
		}
	}}
/>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Providers</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Manage provider setups</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Review existing providers, add new ones, and open an individual setup when you need to change
			credentials, defaults, or operational notes.
		</p>
		<div class="pt-1">
			<button
				class="btn preset-filled-primary-500 font-semibold"
				type="button"
				onclick={() => {
					isCreateModalOpen = true;
				}}
			>
				Add provider
			</button>
		</div>
	</div>

	{#if form?.message}
		<p class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if createSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Provider setup created and saved into the control plane.
		</p>
	{/if}

	<section class="card border border-slate-800 bg-slate-950/70 p-6">
		<div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
			<div>
				<h2 class="text-xl font-semibold text-white">Provider directory</h2>
				<p class="mt-1 text-sm text-slate-400">
					Search by provider name, service, auth mode, capabilities, or launcher.
				</p>
			</div>

			<div class="w-full xl:w-80">
				<label class="sr-only" for="provider-search">Search providers</label>
				<input
					id="provider-search"
					bind:value={query}
					class="input text-white placeholder:text-slate-500"
					placeholder="Search providers"
				/>
			</div>
		</div>

		<div class="mt-6">
			{#if filteredProviders.length === 0}
				<p
					class="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400"
				>
					No providers match the current search.
				</p>
			{:else}
				<div class="grid gap-4 lg:grid-cols-2">
					{#each filteredProviders as provider (provider.id)}
						<a
							class="group flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-400/40 hover:bg-slate-900"
							href={resolve(`/app/providers/${provider.id}`)}
						>
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1 space-y-2">
									<div class="flex flex-wrap items-center gap-2">
										<h3
											class="ui-wrap-anywhere text-lg font-semibold text-white transition group-hover:text-sky-200"
										>
											{provider.name}
										</h3>
										<span
											class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${enabledClass(provider.enabled)}`}
										>
											{provider.enabled ? 'enabled' : 'disabled'}
										</span>
									</div>
									<p class="ui-clamp-3 text-sm text-slate-300">
										{provider.description || 'No description yet.'}
									</p>
								</div>
								<span
									class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${statusClass(provider.setupStatus)}`}
								>
									{provider.setupStatus.replace('_', ' ')}
								</span>
							</div>

							<div class="mt-4 flex flex-wrap gap-2">
								<span
									class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
								>
									{provider.service}
								</span>
								<span
									class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
								>
									{provider.kind}
								</span>
								<span
									class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
								>
									{provider.authMode.replace('_', ' ')}
								</span>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-3">
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Workers</p>
									<p class="mt-2 text-lg font-semibold text-white">{provider.workerCount}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Model</p>
									<p class="ui-wrap-anywhere mt-2 text-sm text-white">
										{provider.defaultModel || 'Unset'}
									</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Launcher</p>
									<p class="ui-wrap-anywhere mt-2 text-sm text-white">
										{provider.launcher || 'None'}
									</p>
								</div>
							</div>

							<div class="mt-4 space-y-2 text-sm text-slate-400">
								<p class="ui-wrap-anywhere">
									<span class="text-slate-500">Env vars:</span>
									{provider.envVars.length > 0 ? provider.envVars.join(', ') : 'None'}
								</p>
								<p class="ui-wrap-anywhere">
									<span class="text-slate-500">Capabilities:</span>
									{provider.capabilities.length > 0
										? provider.capabilities.join(', ')
										: 'None listed'}
								</p>
							</div>

							<div
								class="mt-5 flex items-center justify-between border-t border-slate-800 pt-4 text-xs font-medium tracking-[0.16em] text-slate-500 uppercase"
							>
								<span class="min-w-0 flex-1 pr-3 normal-case sm:truncate">
									{provider.baseUrl || 'No base URL override'}
								</span>
								<span class="text-sky-300 transition group-hover:text-sky-200">Open details</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</section>
</section>

{#if isCreateModalOpen}
	<div
		class="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) {
				closeCreateModal();
			}
		}}
	>
		<div class="mx-auto flex min-h-full max-w-5xl items-center justify-center p-4 sm:p-6">
			<form
				class="max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-black/40 sm:p-8"
				method="POST"
				action="?/createProvider"
			>
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 class="text-xl font-semibold text-white sm:text-2xl">Add provider setup</h2>
						<p class="mt-2 max-w-2xl text-sm text-slate-400">
							Create one record per provider you actually expect to route work through.
						</p>
					</div>
					<button
						class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:border-slate-600 hover:text-white"
						type="button"
						aria-label="Close add provider form"
						onclick={closeCreateModal}
					>
						×
					</button>
				</div>

				<div class="mt-6 space-y-4">
					<div class="grid gap-4 sm:grid-cols-2">
						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
							<input
								class="input text-white placeholder:text-slate-500"
								name="name"
								placeholder="OpenAI Codex CLI"
								required
							/>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Service</span>
							<input
								class="input text-white placeholder:text-slate-500"
								name="service"
								placeholder="OpenAI"
								required
							/>
						</label>
					</div>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Description</span>
						<textarea
							class="textarea min-h-24 text-white placeholder:text-slate-500"
							name="description"
							placeholder="What this provider is for and when it should be selected."
						></textarea>
					</label>

					<div class="grid gap-4 md:grid-cols-3">
						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Access surface</span>
							<select class="select text-white" name="kind">
								{#each data.kindOptions as kind (kind)}
									<option value={kind}>{kind}</option>
								{/each}
							</select>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Auth mode</span>
							<select class="select text-white" name="authMode">
								{#each data.authModeOptions as authMode (authMode)}
									<option value={authMode}>{authMode}</option>
								{/each}
							</select>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Setup status</span>
							<select class="select text-white" name="setupStatus">
								{#each data.setupStatusOptions as setupStatus (setupStatus)}
									<option value={setupStatus}>{setupStatus}</option>
								{/each}
							</select>
						</label>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Default model</span>
							<input
								class="input text-white placeholder:text-slate-500"
								name="defaultModel"
								placeholder="gpt-5.4"
							/>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Launcher or command</span>
							<input
								class="input text-white placeholder:text-slate-500"
								name="launcher"
								placeholder="codex"
							/>
						</label>
					</div>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Base URL</span>
						<input
							class="input text-white placeholder:text-slate-500"
							name="baseUrl"
							placeholder="https://api.openai.com/v1"
						/>
					</label>

					<div class="grid gap-4 sm:grid-cols-2">
						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200"
								>Environment variables</span
							>
							<input
								class="input text-white placeholder:text-slate-500"
								name="envVars"
								placeholder="OPENAI_API_KEY, OPENAI_ORG_ID"
							/>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Capabilities</span>
							<input
								class="input text-white placeholder:text-slate-500"
								name="capabilities"
								placeholder="repo edits, planning, citations"
							/>
						</label>
					</div>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Notes</span>
						<textarea
							class="textarea min-h-28 text-white placeholder:text-slate-500"
							name="notes"
							placeholder="Operator notes, caveats, or handoff guidance."
						></textarea>
					</label>

					<label
						class="inline-flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-200"
					>
						<input checked class="checkbox" name="enabled" type="checkbox" />
						<span>Enable this provider immediately</span>
					</label>

					<p class="text-xs text-slate-500">
						Local CLI setups work well for Codex. OAuth and API-key modes keep room for future
						providers.
					</p>
				</div>

				<div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
					<button
						class="btn border border-slate-700 text-slate-200 hover:border-slate-600"
						type="button"
						onclick={closeCreateModal}
					>
						Cancel
					</button>
					<button class="btn preset-filled-primary-500 font-semibold" type="submit">
						Create provider
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
