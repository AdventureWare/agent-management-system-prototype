<script lang="ts">
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		executionSurfaceStatusToneClass,
		formatProviderSetupStatusLabel,
		formatExecutionSurfaceStatusLabel,
		providerSetupStatusToneClass
	} from '$lib/types/control-plane';

	let { data, form } = $props();

	function attentionToneClass(severity: string) {
		switch (severity) {
			case 'high':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
			case 'medium':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			case 'low':
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function accessStateClass(state: string) {
		switch (state) {
			case 'healthy':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'offline':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			case 'provider_disabled':
			case 'provider_needs_setup':
			case 'unknown_provider':
			default:
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
		}
	}

	function accessStateLabel(state: string) {
		switch (state) {
			case 'healthy':
				return 'Healthy';
			case 'offline':
				return 'Execution surface offline';
			case 'provider_disabled':
				return 'Provider disabled';
			case 'provider_needs_setup':
				return 'Provider needs setup';
			case 'unknown_provider':
			default:
				return 'Provider missing';
		}
	}

	function recordedStatusClass(status: string) {
		switch (status) {
			case 'healthy':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'warning':
			case 'needs_setup':
			case 'offline':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			case 'blocked':
			case 'disabled':
			case 'provider_missing':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
			case 'unknown':
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function inventoryStatusClass(status: 'usable' | 'partial' | 'listed') {
		switch (status) {
			case 'usable':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'partial':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			case 'listed':
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function capabilityInventoryStatus(entry: {
		onlineSupportedExecutionSurfaceCount: number;
		supportedExecutionSurfaceCount: number;
		connectedProviderCount: number;
	}) {
		if (entry.onlineSupportedExecutionSurfaceCount > 0) {
			return { label: 'Usable now', tone: 'usable' as const };
		}

		if (entry.supportedExecutionSurfaceCount > 0 || entry.connectedProviderCount > 0) {
			return { label: 'Partially ready', tone: 'partial' as const };
		}

		return { label: 'Listed only', tone: 'listed' as const };
	}

	function toolInventoryStatus(entry: {
		onlineExecutionSurfaceCount: number;
		executionSurfaceCount: number;
		connectedProviderCount: number;
	}) {
		if (entry.onlineExecutionSurfaceCount > 0 && entry.connectedProviderCount > 0) {
			return { label: 'Usable now', tone: 'usable' as const };
		}

		if (entry.executionSurfaceCount > 0 || entry.connectedProviderCount > 0) {
			return { label: 'Partially ready', tone: 'partial' as const };
		}

		return { label: 'Listed only', tone: 'listed' as const };
	}

	let probeSuccess = $derived(form?.ok && form?.successAction === 'runProbe');
	let providerAvailabilitySuccess = $derived(
		form?.ok && form?.successAction === 'updateProviderAvailability'
	);
	let executionSurfaceAvailabilitySuccess = $derived(
		form?.ok && form?.successAction === 'updateExecutionSurfaceAvailability'
	);
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Access"
		title="Track permissions and authorization"
		description="A single inventory for local folder access, provider connection health, execution-surface readiness, and the environments that agents can use."
	>
		{#snippet actions()}
			<form method="POST" action="?/runProbe">
				<AppButton type="submit" variant="primary">Run access probe</AppButton>
			</form>
		{/snippet}
	</PageHeader>

	{#if probeSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Access probe recorded.
		</p>
	{/if}

	{#if form?.message}
		<p class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if providerAvailabilitySuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Provider availability updated.
		</p>
	{/if}

	{#if executionSurfaceAvailabilitySuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			ExecutionSurface availability updated.
		</p>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
		<MetricCard
			label="Projects blocked"
			value={data.summary.projectBlockerCount}
			detail="Projects with launch-critical local path issues."
		/>
		<MetricCard
			label="Attention paths"
			value={data.summary.attentionPathCount}
			detail="Tracked local paths that need review."
		/>
		<MetricCard
			label="macOS cloud probes"
			value={data.summary.macosPromptCount}
			detail="Cloud-synced paths where the probe was inconclusive."
		/>
		<MetricCard
			label="Providers needing setup"
			value={data.summary.providerNeedsSetupCount}
			detail="Provider configs that are not yet in a connected state."
		/>
		<MetricCard
			label="Execution-surface access issues"
			value={data.summary.executionSurfaceAccessIssueCount}
			detail="Execution surfaces blocked by provider state or offline status."
		/>
	</div>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
		<section class="space-y-6">
			<DetailSection
				eyebrow="Recorded state"
				title="Last probe and recent changes"
				description="Use the probe button to save the current access state and keep a simple history of changes."
				bodyClass="space-y-4"
			>
				<div class="grid gap-4 md:grid-cols-2">
					<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Last checked</p>
						<p class="mt-2 text-sm text-white">
							{data.probeState.lastCheckedAt ?? 'No recorded probe yet'}
						</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Recorded targets</p>
						<p class="mt-2 text-sm text-white">{data.probeState.records.length}</p>
					</div>
				</div>

				{#if data.probeState.events.length === 0}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
					>
						No recorded access changes yet.
					</p>
				{:else}
					<div class="space-y-3">
						{#each data.probeState.events.slice(0, 8) as event (event.id)}
							<a
								class="block rounded-2xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
								href={event.scopeHref}
								rel="external"
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-2">
											<h3 class="ui-wrap-anywhere font-medium text-white">
												{event.targetLabel}
											</h3>
											<span
												class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${recordedStatusClass(event.nextStatus)}`}
											>
												{event.nextStatus.replace(/_/g, ' ')}
											</span>
										</div>
										<p class="mt-2 text-sm text-slate-300">{event.scopeLabel}</p>
										<p class="mt-2 text-sm text-slate-400">{event.summary}</p>
									</div>
									<div class="text-xs text-slate-500">
										<p>{event.checkedAt}</p>
										<p class="mt-1">
											{event.previousStatus
												? `${event.previousStatus} -> ${event.nextStatus}`
												: `new -> ${event.nextStatus}`}
										</p>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</DetailSection>

			<DetailSection
				eyebrow="Attention"
				title="Local paths needing action"
				description="These are the local folder issues currently visible across all projects."
				bodyClass="space-y-4"
			>
				{#if data.attentionPaths.length === 0}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
					>
						No tracked local path issues right now.
					</p>
				{:else}
					{#each data.attentionPaths as item (item.id)}
						<article class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<h3 class="ui-wrap-anywhere font-medium text-white">{item.label}</h3>
										<span
											class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${attentionToneClass(item.severity)}`}
										>
											{item.severity}
										</span>
										{#if item.requiredForLaunch}
											<span
												class="badge border border-slate-700 bg-slate-900/80 text-[0.72rem] tracking-[0.18em] text-slate-200 uppercase"
											>
												Launch critical
											</span>
										{/if}
									</div>
									<p class="ui-wrap-anywhere mt-2 text-sm text-slate-300">
										{item.path || 'Not configured'}
									</p>
									<p class="mt-2 text-sm text-slate-500">
										<a
											class="text-sky-300 hover:text-sky-200"
											href={item.projectHref}
											rel="external"
										>
											{item.projectName}
										</a>
									</p>
								</div>
							</div>

							<div class="mt-4 grid gap-3 lg:grid-cols-2">
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Host access</p>
									<p class="mt-2 text-sm text-white">{item.accessMessage}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Sandbox coverage
									</p>
									<p class="mt-2 text-sm text-white">{item.coverageMessage}</p>
								</div>
							</div>

							{#if item.recommendedAction}
								<p class="mt-4 text-sm text-sky-200">{item.recommendedAction}</p>
							{/if}
						</article>
					{/each}
				{/if}
			</DetailSection>

			<DetailSection
				eyebrow="Projects"
				title="Project access inventory"
				description="Each project rolls up its local folder status so you can see where attention is accumulating."
				bodyClass="space-y-4"
			>
				<div class="grid gap-4 lg:grid-cols-2">
					{#each data.projects as project (project.id)}
						<a
							class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
							href={project.projectHref}
							rel="external"
						>
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<h3 class="ui-wrap-anywhere font-medium text-white">{project.name}</h3>
									<p class="ui-clamp-2 mt-2 text-sm text-slate-300">{project.summary}</p>
								</div>
								<span
									class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${project.permissionSurface.summary.blockerCount > 0 ? 'border-rose-900/70 bg-rose-950/40 text-rose-200' : 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200'}`}
								>
									{project.permissionSurface.summary.blockerCount > 0 ? 'Needs action' : 'Clear'}
								</span>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-3">
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Sandbox</p>
									<p class="mt-2 text-sm text-white">
										{project.permissionSurface.effectiveSandbox}
									</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Launch blockers
									</p>
									<p class="mt-2 text-sm text-white">
										{project.permissionSurface.summary.blockerCount}
									</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Outside sandbox
									</p>
									<p class="mt-2 text-sm text-white">
										{project.permissionSurface.summary.outsideSandboxCount}
									</p>
								</div>
							</div>
						</a>
					{/each}
				</div>
			</DetailSection>
		</section>

		<section class="space-y-6">
			<DetailSection
				eyebrow="Inventory"
				title="Execution coverage"
				description="Use this catalog to compare provider-declared capabilities, launchers, and registered execution surfaces."
				bodyClass="space-y-5"
			>
				<div class="space-y-3">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Capability coverage
							</p>
							<p class="mt-2 text-sm text-slate-400">
								Capabilities combine execution-surface skills and provider-declared capabilities so
								you can see which labels are merely listed versus currently backed by live execution
								surfaces.
							</p>
						</div>
						<span
							class="badge border border-slate-700 bg-slate-950/70 text-[0.72rem] tracking-[0.18em] text-slate-200 uppercase"
						>
							{data.executionCatalog.capabilities.length} tracked
						</span>
					</div>

					{#if data.executionCatalog.capabilities.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No execution-surface skills or provider capabilities are recorded yet.
						</p>
					{:else}
						<div class="space-y-3">
							{#each data.executionCatalog.capabilities as capability (capability.name)}
								<article class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div class="min-w-0 flex-1">
											<h3 class="ui-wrap-anywhere font-medium text-white">{capability.name}</h3>
											<p class="mt-2 text-sm text-slate-400">
												{capability.onlineSupportedExecutionSurfaceCount} online execution surface{capability.onlineSupportedExecutionSurfaceCount ===
												1
													? ''
													: 's'} can currently cover this label through direct execution-surface skills
												or provider metadata.
											</p>
										</div>
										<span
											class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${inventoryStatusClass(capabilityInventoryStatus(capability).tone)}`}
										>
											{capabilityInventoryStatus(capability).label}
										</span>
									</div>

									<div class="mt-4 grid gap-3 sm:grid-cols-4">
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Surface skills
											</p>
											<p class="mt-2 text-sm text-white">
												{capability.executionSurfaceSkillCount}
											</p>
										</div>
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Supporting surfaces
											</p>
											<p class="mt-2 text-sm text-white">
												{capability.supportedExecutionSurfaceCount}
											</p>
										</div>
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Provider declarations
											</p>
											<p class="mt-2 text-sm text-white">
												{capability.providerCapabilityCount}
											</p>
										</div>
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Connected providers
											</p>
											<p class="mt-2 text-sm text-white">
												{capability.connectedProviderCount}
											</p>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</div>

				<div class="space-y-3">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Launcher coverage
							</p>
							<p class="mt-2 text-sm text-slate-400">
								Launchers track the execution surfaces currently declared by providers and backed by
								registered surfaces.
							</p>
						</div>
						<span
							class="badge border border-slate-700 bg-slate-950/70 text-[0.72rem] tracking-[0.18em] text-slate-200 uppercase"
						>
							{data.executionCatalog.tools.length} tracked
						</span>
					</div>

					{#if data.executionCatalog.tools.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No provider launchers are recorded yet.
						</p>
					{:else}
						<div class="space-y-3">
							{#each data.executionCatalog.tools as tool (tool.name)}
								<article class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div class="min-w-0 flex-1">
											<h3 class="ui-wrap-anywhere font-medium text-white">{tool.name}</h3>
											<p class="mt-2 text-sm text-slate-400">
												{tool.onlineExecutionSurfaceCount} online execution surface{tool.onlineExecutionSurfaceCount ===
												1
													? ''
													: 's'} are currently attached to this launcher.
											</p>
										</div>
										<span
											class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${inventoryStatusClass(toolInventoryStatus(tool).tone)}`}
										>
											{toolInventoryStatus(tool).label}
										</span>
									</div>

									<div class="mt-4 grid gap-3 sm:grid-cols-4">
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Providers
											</p>
											<p class="mt-2 text-sm text-white">{tool.providerCount}</p>
										</div>
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Connected providers
											</p>
											<p class="mt-2 text-sm text-white">{tool.connectedProviderCount}</p>
										</div>
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Execution surfaces
											</p>
											<p class="mt-2 text-sm text-white">{tool.executionSurfaceCount}</p>
										</div>
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Online surfaces
											</p>
											<p class="mt-2 text-sm text-white">
												{tool.onlineExecutionSurfaceCount}
											</p>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</div>
			</DetailSection>

			<DetailSection
				eyebrow="Providers"
				title="Connection health"
				description="Providers are the current source of truth for auth mode, setup status, and default runtime context."
				bodyClass="space-y-4"
			>
				{#each data.providers as provider (provider.id)}
					<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<h3 class="ui-wrap-anywhere font-medium text-white">{provider.name}</h3>
								<p class="mt-2 text-sm text-slate-300">{provider.service}</p>
							</div>
							<div class="flex flex-wrap gap-2">
								<span
									class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${provider.enabled ? 'border-sky-800/70 bg-sky-950/40 text-sky-200' : 'border-slate-700 bg-slate-950/70 text-slate-300'}`}
								>
									{provider.enabled ? 'Enabled' : 'Disabled'}
								</span>
								<span
									class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${providerSetupStatusToneClass(provider.setupStatus)}`}
								>
									{formatProviderSetupStatusLabel(provider.setupStatus)}
								</span>
							</div>
						</div>

						<div class="mt-4 grid gap-3 sm:grid-cols-3">
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Auth mode</p>
								<p class="mt-2 text-sm text-white">{provider.authMode.replace('_', ' ')}</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Execution surfaces
								</p>
								<p class="mt-2 text-sm text-white">{provider.executionSurfaceCount}</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Sandbox</p>
								<p class="mt-2 text-sm text-white">{provider.defaultThreadSandbox}</p>
							</div>
						</div>

						<form class="mt-4 space-y-3" method="POST" action="?/updateProviderAvailability">
							<input name="providerId" type="hidden" value={provider.id} />

							<div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
								<label class="block">
									<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Quick setup status
									</span>
									<select class="select text-white" name="setupStatus">
										{#each data.providerSetupStatusOptions as setupStatus (setupStatus)}
											<option value={setupStatus} selected={provider.setupStatus === setupStatus}>
												{formatProviderSetupStatusLabel(setupStatus)}
											</option>
										{/each}
									</select>
								</label>

								<label
									class="inline-flex items-center gap-3 self-end rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-200"
								>
									<input
										checked={provider.enabled}
										class="checkbox"
										name="enabled"
										type="checkbox"
									/>
									<span>Enabled</span>
								</label>
							</div>

							<div class="flex items-center justify-between gap-3">
								<p class="text-xs text-slate-500">
									Use quick controls here, or open the provider detail page for full configuration.
								</p>
								<div class="flex flex-wrap items-center gap-2">
									<a
										class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
										href={provider.providerHref}
									>
										Open detail
									</a>
									<button
										class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-700 hover:text-white"
										type="submit"
									>
										Save readiness
									</button>
								</div>
							</div>
						</form>
					</article>
				{/each}
			</DetailSection>

			<DetailSection
				eyebrow="Execution surfaces"
				title="Execution surface readiness"
				description="Execution surfaces inherit access risk from both their own state and their backing provider."
				bodyClass="space-y-4"
			>
				{#each data.executionSurfaces as executionSurface (executionSurface.id)}
					<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="ui-wrap-anywhere font-medium text-white">{executionSurface.name}</h3>
									<span
										class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${executionSurfaceStatusToneClass(executionSurface.status)}`}
									>
										{formatExecutionSurfaceStatusLabel(executionSurface.status)}
									</span>
								</div>
								<p class="mt-2 text-sm text-slate-300">{executionSurface.providerName}</p>
								<p class="mt-1 text-sm text-slate-500">
									{executionSurface.supportedRoleNames?.length > 0
										? executionSurface.supportedRoleNames.join(', ')
										: executionSurface.roleName}
								</p>
							</div>
							<span
								class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${accessStateClass(executionSurface.accessState)}`}
							>
								{accessStateLabel(executionSurface.accessState)}
							</span>
						</div>

						<form
							class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
							method="POST"
							action="?/updateExecutionSurfaceAvailability"
						>
							<input name="executionSurfaceId" type="hidden" value={executionSurface.id} />

							<label class="block min-w-0 flex-1">
								<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Quick surface status
								</span>
								<select class="select text-white" name="status">
									{#each data.executionSurfaceStatusOptions as status (status)}
										<option value={status} selected={executionSurface.status === status}>
											{formatExecutionSurfaceStatusLabel(status)}
										</option>
									{/each}
								</select>
							</label>

							<button
								class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-700 hover:text-white"
								type="submit"
							>
								Update status
							</button>

							<a
								class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
								href={executionSurface.executionSurfaceHref}
							>
								Open detail
							</a>
						</form>
					</article>
				{/each}
			</DetailSection>
		</section>
	</div>
</AppPage>
