<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { clearFormDraft, readFormDraft, writeFormDraft } from '$lib/client/form-drafts';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import CollectionToolbar from '$lib/components/CollectionToolbar.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		formatProviderSetupStatusLabel,
		providerSetupStatusToneClass
	} from '$lib/types/control-plane';

	let { data, form } = $props();
	const CREATE_PROVIDER_DRAFT_KEY = 'ams:create-provider';

	let createProviderDraftReady = $state(false);
	let providerName = $state('');
	let providerService = $state('');
	let providerDescription = $state('');
	let providerKind = $state('cloud');
	let providerAuthMode = $state('custom');
	let providerSetupStatus = $state('planned');
	let providerDefaultModel = $state('');
	let providerLauncher = $state('');
	let providerDefaultThreadSandbox = $state('workspace-write');
	let providerBaseUrl = $state('');
	let providerEnvVars = $state('');
	let providerCapabilities = $state('');
	let providerNotes = $state('');
	let providerEnabled = $state(true);
	let query = $state('');

	function modalShouldStartOpen() {
		return Boolean(form?.message);
	}

	let isCreateModalOpen = $state(modalShouldStartOpen());

	let createSuccess = $derived(form?.ok && form?.successAction === 'createProvider');

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
			provider.defaultThreadSandbox,
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

	function defaultProviderKind() {
		return data.kindOptions[0] ?? 'cloud';
	}

	function defaultProviderAuthMode() {
		return data.authModeOptions[0] ?? 'custom';
	}

	function defaultProviderSetupStatus() {
		return data.setupStatusOptions[0] ?? 'planned';
	}

	function defaultProviderThreadSandbox() {
		return 'workspace-write';
	}

	function normalizeProviderKind(value: string | undefined) {
		return data.kindOptions.find((option) => option === value) ?? defaultProviderKind();
	}

	function normalizeProviderAuthMode(value: string | undefined) {
		return data.authModeOptions.find((option) => option === value) ?? defaultProviderAuthMode();
	}

	function normalizeProviderSetupStatus(value: string | undefined) {
		return (
			data.setupStatusOptions.find((option) => option === value) ?? defaultProviderSetupStatus()
		);
	}

	onMount(() => {
		if (createSuccess) {
			clearFormDraft(CREATE_PROVIDER_DRAFT_KEY);
			createProviderDraftReady = true;
			return;
		}

		const savedDraft = readFormDraft<{
			name: string;
			service: string;
			description: string;
			kind: string;
			authMode: string;
			setupStatus: string;
			defaultModel: string;
			launcher: string;
			defaultThreadSandbox: string;
			baseUrl: string;
			envVars: string;
			capabilities: string;
			notes: string;
			enabled: boolean;
		}>(CREATE_PROVIDER_DRAFT_KEY);

		if (savedDraft) {
			providerName = savedDraft.name ?? '';
			providerService = savedDraft.service ?? '';
			providerDescription = savedDraft.description ?? '';
			providerKind = normalizeProviderKind(savedDraft.kind);
			providerAuthMode = normalizeProviderAuthMode(savedDraft.authMode);
			providerSetupStatus = normalizeProviderSetupStatus(savedDraft.setupStatus);
			providerDefaultModel = savedDraft.defaultModel ?? '';
			providerLauncher = savedDraft.launcher ?? '';
			providerDefaultThreadSandbox =
				savedDraft.defaultThreadSandbox ?? defaultProviderThreadSandbox();
			providerBaseUrl = savedDraft.baseUrl ?? '';
			providerEnvVars = savedDraft.envVars ?? '';
			providerCapabilities = savedDraft.capabilities ?? '';
			providerNotes = savedDraft.notes ?? '';
			providerEnabled = savedDraft.enabled ?? true;
			isCreateModalOpen = true;
		}

		providerKind = normalizeProviderKind(providerKind);
		providerAuthMode = normalizeProviderAuthMode(providerAuthMode);
		providerSetupStatus = normalizeProviderSetupStatus(providerSetupStatus);

		createProviderDraftReady = true;
	});

	$effect(() => {
		if (!createProviderDraftReady) {
			return;
		}

		writeFormDraft(CREATE_PROVIDER_DRAFT_KEY, {
			name: providerName,
			service: providerService,
			description: providerDescription,
			kind: providerKind === defaultProviderKind() ? '' : providerKind,
			authMode: providerAuthMode === defaultProviderAuthMode() ? '' : providerAuthMode,
			setupStatus: providerSetupStatus === defaultProviderSetupStatus() ? '' : providerSetupStatus,
			defaultModel: providerDefaultModel,
			launcher: providerLauncher,
			defaultThreadSandbox:
				providerDefaultThreadSandbox === defaultProviderThreadSandbox()
					? ''
					: providerDefaultThreadSandbox,
			baseUrl: providerBaseUrl,
			envVars: providerEnvVars,
			capabilities: providerCapabilities,
			notes: providerNotes,
			enabled: providerEnabled === true ? undefined : providerEnabled
		});
	});
</script>

<AppPage>
	<PageHeader
		eyebrow="Providers"
		title="Manage provider setups"
		description="Review existing providers, add new ones, and open an individual setup when you need to change credentials, defaults, or operational notes."
	>
		{#snippet actions()}
			<AppButton
				type="button"
				variant="primary"
				onclick={() => {
					isCreateModalOpen = true;
				}}
			>
				Add provider
			</AppButton>
		{/snippet}
	</PageHeader>

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

	<CollectionToolbar
		title="Provider directory"
		description="Search by provider name, service, auth mode, capabilities, or launcher."
	>
		{#snippet controls()}
			<div class="w-full xl:w-80">
				<label class="sr-only" for="provider-search">Search providers</label>
				<input
					id="provider-search"
					bind:value={query}
					class="input text-white placeholder:text-slate-500"
					placeholder="Search providers"
				/>
			</div>
		{/snippet}

		<div class="mt-6">
			{#if filteredProviders.length === 0}
				<p class="ui-empty-state">No providers match the current search.</p>
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
									class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${providerSetupStatusToneClass(provider.setupStatus)}`}
								>
									{formatProviderSetupStatusLabel(provider.setupStatus)}
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
								<p class="ui-wrap-anywhere">
									<span class="text-slate-500">Thread sandbox:</span>
									{provider.defaultThreadSandbox}
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
	</CollectionToolbar>
</AppPage>

{#if isCreateModalOpen}
	<AppDialog
		bind:open={isCreateModalOpen}
		title="Add provider setup"
		description="Create one record per provider you actually expect to route work through."
		closeLabel="Close add provider form"
	>
		<form class="space-y-6" method="POST" action="?/createProvider" data-persist-scope="manual">
			<div class="space-y-4">
				<div class="grid gap-4 sm:grid-cols-2">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
						<input
							bind:value={providerName}
							class="input text-white placeholder:text-slate-500"
							name="name"
							placeholder="OpenAI Codex CLI"
							required
						/>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Service</span>
						<input
							bind:value={providerService}
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
						bind:value={providerDescription}
						class="textarea min-h-24 text-white placeholder:text-slate-500"
						name="description"
						placeholder="What this provider is for and when it should be selected."
					></textarea>
				</label>

				<div class="grid gap-4 md:grid-cols-3">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Access surface</span>
						<select bind:value={providerKind} class="select text-white" name="kind">
							{#each data.kindOptions as kind (kind)}
								<option value={kind}>{kind}</option>
							{/each}
						</select>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Auth mode</span>
						<select bind:value={providerAuthMode} class="select text-white" name="authMode">
							{#each data.authModeOptions as authMode (authMode)}
								<option value={authMode}>{authMode}</option>
							{/each}
						</select>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Setup status</span>
						<select bind:value={providerSetupStatus} class="select text-white" name="setupStatus">
							{#each data.setupStatusOptions as setupStatus (setupStatus)}
								<option value={setupStatus}>{formatProviderSetupStatusLabel(setupStatus)}</option>
							{/each}
						</select>
					</label>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Default model</span>
						<input
							bind:value={providerDefaultModel}
							class="input text-white placeholder:text-slate-500"
							name="defaultModel"
							placeholder="gpt-5.4"
						/>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Launcher or command</span>
						<input
							bind:value={providerLauncher}
							class="input text-white placeholder:text-slate-500"
							name="launcher"
							placeholder="codex"
						/>
					</label>
				</div>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Default thread sandbox</span>
					<select
						bind:value={providerDefaultThreadSandbox}
						class="select text-white"
						name="defaultThreadSandbox"
					>
						{#each data.sandboxOptions as sandbox (sandbox)}
							<option value={sandbox}>{sandbox}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Base URL</span>
					<input
						bind:value={providerBaseUrl}
						class="input text-white placeholder:text-slate-500"
						name="baseUrl"
						placeholder="https://api.openai.com/v1"
					/>
				</label>

				<div class="grid gap-4 sm:grid-cols-2">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Environment variables</span>
						<input
							bind:value={providerEnvVars}
							class="input text-white placeholder:text-slate-500"
							name="envVars"
							placeholder="OPENAI_API_KEY, OPENAI_ORG_ID"
						/>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Capabilities</span>
						<input
							bind:value={providerCapabilities}
							class="input text-white placeholder:text-slate-500"
							name="capabilities"
							placeholder="repo edits, planning, citations"
						/>
					</label>
				</div>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Notes</span>
					<textarea
						bind:value={providerNotes}
						class="textarea min-h-28 text-white placeholder:text-slate-500"
						name="notes"
						placeholder="Operator notes, caveats, or handoff guidance."
					></textarea>
				</label>

				<label
					class="inline-flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-200"
				>
					<input bind:checked={providerEnabled} class="checkbox" name="enabled" type="checkbox" />
					<span>Enable this provider immediately</span>
				</label>

				<p class="text-xs text-slate-500">
					Local CLI setups work well for Codex. OAuth and API-key modes keep room for future
					providers.
				</p>
			</div>

			<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<AppButton type="button" variant="neutral" onclick={closeCreateModal}>Cancel</AppButton>
				<AppButton type="submit" variant="primary">Create provider</AppButton>
			</div>
		</form>
	</AppDialog>
{/if}
