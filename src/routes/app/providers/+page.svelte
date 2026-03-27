<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let enabledProviders = $derived(data.providers.filter((provider) => provider.enabled));
	let connectedProviders = $derived(
		data.providers.filter((provider) => provider.setupStatus === 'connected')
	);
	let attachedWorkerCount = $derived(
		data.providers.reduce((count, provider) => count + provider.workerCount, 0)
	);
	let createSuccess = $derived(form?.ok && form?.successAction === 'createProvider');
	let updatedProviderId = $derived(
		form?.successAction === 'updateProvider' ? (form.providerId?.toString() ?? '') : ''
	);

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
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Providers</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Model and tool provider setup</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Keep the provider layer explicit: which services you use, how each one authenticates, which
			model or launcher it defaults to, and whether it is ready for real work. This is where Codex,
			ChatGPT, and future providers should live.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-4">
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Configured</p>
			<p class="mt-3 text-3xl font-semibold text-white">{data.providers.length}</p>
			<p class="mt-2 text-sm text-slate-400">
				Saved provider profiles across local, cloud, and API access.
			</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Enabled</p>
			<p class="mt-3 text-3xl font-semibold text-white">{enabledProviders.length}</p>
			<p class="mt-2 text-sm text-slate-400">Profiles currently available for downstream work.</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Connected</p>
			<p class="mt-3 text-3xl font-semibold text-white">{connectedProviders.length}</p>
			<p class="mt-2 text-sm text-slate-400">
				Profiles marked ready instead of planned or pending setup.
			</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Worker links</p>
			<p class="mt-3 text-3xl font-semibold text-white">{attachedWorkerCount}</p>
			<p class="mt-2 text-sm text-slate-400">
				Workers currently attached to the saved provider records.
			</p>
		</article>
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
		<div class="flex flex-col gap-2">
			<h2 class="text-xl font-semibold text-white">Suggested starting profiles</h2>
			<p class="text-sm text-slate-400">
				These are the shapes the page is designed around now: one local coding surface, one chat
				surface, and optional fallback providers later.
			</p>
		</div>

		<div class="mt-4 grid gap-4 lg:grid-cols-3">
			{#each data.starterProfiles as profile (profile.name)}
				<article class="space-y-3 card border border-slate-800 bg-slate-900/60 p-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p class="text-sm font-medium text-white">{profile.name}</p>
							<p class="mt-1 text-sm text-slate-400">{profile.description}</p>
						</div>
						<span
							class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${statusClass(profile.setupStatus)}`}
						>
							{profile.setupStatus.replace('_', ' ')}
						</span>
					</div>

					<div class="flex flex-wrap gap-2">
						<span
							class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
						>
							{profile.service}
						</span>
						<span
							class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
						>
							{profile.kind}
						</span>
						<span
							class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
						>
							{profile.authMode.replace('_', ' ')}
						</span>
					</div>

					<p class="text-xs text-slate-500">
						{profile.defaultModel
							? `Default model suggestion: ${profile.defaultModel}`
							: 'Leave the model blank until this provider is connected.'}
					</p>
				</article>
			{/each}
		</div>
	</section>

	<div class="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
		<form
			class="space-y-4 card border border-slate-800 bg-slate-950/70 p-6"
			method="POST"
			action="?/createProvider"
		>
			<div class="space-y-2">
				<h2 class="text-xl font-semibold text-white">Add provider setup</h2>
				<p class="text-sm text-slate-400">
					Use one record per provider you actually want the system to route through, not every
					provider you might try someday.
				</p>
			</div>

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
					<span class="mb-2 block text-sm font-medium text-slate-200">Environment variables</span>
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

			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-xs text-slate-500">
					Local CLI setups work well for Codex. OAuth and API-key modes keep room for future
					providers.
				</p>
				<button class="btn preset-filled-primary-500 font-semibold" type="submit">
					Save provider
				</button>
			</div>
		</form>

		<section class="card border border-slate-800 bg-slate-950/70 p-6">
			<div class="flex flex-col gap-2">
				<h2 class="text-xl font-semibold text-white">Configured providers</h2>
				<p class="text-sm text-slate-400">
					Update readiness, defaults, and operational notes in place. Local CLI profiles are easiest
					to keep honest because the launcher and env vars are visible here.
				</p>
			</div>

			{#if data.providers.length === 0}
				<p
					class="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-sm text-slate-400"
				>
					No provider setups saved yet. Start with the add form and use the starter profiles above
					as the first pass.
				</p>
			{:else}
				<div class="mt-4 space-y-4">
					{#each data.providers as provider (provider.id)}
						<form
							class="space-y-4 card border border-slate-800 bg-slate-900/60 p-4"
							method="POST"
							action="?/updateProvider"
						>
							<input name="providerId" type="hidden" value={provider.id} />

							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="space-y-2">
									<div class="flex flex-wrap items-center gap-2">
										<h3 class="font-medium text-white">{provider.name}</h3>
										<span
											class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${enabledClass(provider.enabled)}`}
										>
											{provider.enabled ? 'enabled' : 'disabled'}
										</span>
										<span
											class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${statusClass(provider.setupStatus)}`}
										>
											{provider.setupStatus.replace('_', ' ')}
										</span>
										{#if updatedProviderId === provider.id}
											<span
												class="badge border border-emerald-900/70 bg-emerald-950/40 text-[0.7rem] tracking-[0.2em] text-emerald-200 uppercase"
											>
												Saved
											</span>
										{/if}
									</div>
									<p class="text-sm text-slate-300">
										{provider.description || 'No description yet.'}
									</p>
								</div>

								<div class="text-right text-xs text-slate-500">
									<p>{provider.service}</p>
									<p class="mt-1">{provider.workerCount} worker link(s)</p>
								</div>
							</div>

							<div class="grid gap-4 sm:grid-cols-2">
								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
									<input
										class="input text-white placeholder:text-slate-500"
										name="name"
										required
										value={provider.name}
									/>
								</label>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Service</span>
									<input
										class="input text-white placeholder:text-slate-500"
										name="service"
										required
										value={provider.service}
									/>
								</label>
							</div>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Description</span>
								<textarea class="textarea min-h-24 text-white" name="description"
									>{provider.description}</textarea
								>
							</label>

							<div class="grid gap-4 md:grid-cols-3">
								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Access surface</span>
									<select class="select text-white" name="kind">
										{#each data.kindOptions as kind (kind)}
											<option value={kind} selected={provider.kind === kind}>{kind}</option>
										{/each}
									</select>
								</label>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Auth mode</span>
									<select class="select text-white" name="authMode">
										{#each data.authModeOptions as authMode (authMode)}
											<option value={authMode} selected={provider.authMode === authMode}>
												{authMode}
											</option>
										{/each}
									</select>
								</label>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Setup status</span>
									<select class="select text-white" name="setupStatus">
										{#each data.setupStatusOptions as setupStatus (setupStatus)}
											<option value={setupStatus} selected={provider.setupStatus === setupStatus}>
												{setupStatus}
											</option>
										{/each}
									</select>
								</label>
							</div>

							<div class="grid gap-4 sm:grid-cols-2">
								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Default model</span>
									<input
										class="input text-white"
										name="defaultModel"
										value={provider.defaultModel}
									/>
								</label>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200"
										>Launcher or command</span
									>
									<input class="input text-white" name="launcher" value={provider.launcher} />
								</label>
							</div>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Base URL</span>
								<input class="input text-white" name="baseUrl" value={provider.baseUrl} />
							</label>

							<div class="grid gap-4 sm:grid-cols-2">
								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200"
										>Environment variables</span
									>
									<input
										class="input text-white"
										name="envVars"
										value={provider.envVars.join(', ')}
									/>
								</label>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Capabilities</span>
									<input
										class="input text-white"
										name="capabilities"
										value={provider.capabilities.join(', ')}
									/>
								</label>
							</div>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Notes</span>
								<textarea class="textarea min-h-28 text-white" name="notes"
									>{provider.notes}</textarea
								>
							</label>

							<div
								class="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<label
									class="inline-flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-200"
								>
									<input
										checked={provider.enabled}
										class="checkbox"
										name="enabled"
										type="checkbox"
									/>
									<span>
										Keep enabled
										{#if provider.workerCount > 0}
											({provider.workerCount} worker link{provider.workerCount === 1 ? '' : 's'})
										{/if}
									</span>
								</label>

								<div class="flex flex-wrap items-center gap-3 text-xs text-slate-500">
									<span>{provider.kind}</span>
									<span>{provider.authMode.replace('_', ' ')}</span>
									{#if provider.defaultModel}
										<span>{provider.defaultModel}</span>
									{/if}
									{#if provider.authMode === 'local_cli'}
										<span>CLI-backed</span>
									{/if}
									<button class="btn preset-filled-primary-500 btn-sm font-semibold" type="submit">
										Save changes
									</button>
								</div>
							</div>
						</form>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</section>
