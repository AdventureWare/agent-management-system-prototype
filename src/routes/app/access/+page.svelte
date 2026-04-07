<script lang="ts">
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		formatProviderSetupStatusLabel,
		formatWorkerStatusLabel,
		providerSetupStatusToneClass,
		workerStatusToneClass
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
				return 'Worker offline';
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

	let probeSuccess = $derived(form?.ok && form?.successAction === 'runProbe');
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Access"
		title="Track permissions and authorization"
		description="A single inventory for local folder access, provider connection health, and worker readiness. This first pass is read-only and is meant to make access failures visible before they become run failures."
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
			label="Worker access issues"
			value={data.summary.workerAccessIssueCount}
			detail="Workers blocked by provider state or offline status."
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
										<a class="text-sky-300 hover:text-sky-200" href={item.projectHref}>
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
				eyebrow="Providers"
				title="Connection health"
				description="Providers are the current source of truth for auth mode, setup status, and default runtime context."
				bodyClass="space-y-4"
			>
				{#each data.providers as provider (provider.id)}
					<a
						class="block rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
						href={provider.providerHref}
					>
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
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Workers</p>
								<p class="mt-2 text-sm text-white">{provider.workerCount}</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Sandbox</p>
								<p class="mt-2 text-sm text-white">{provider.defaultThreadSandbox}</p>
							</div>
						</div>
					</a>
				{/each}
			</DetailSection>

			<DetailSection
				eyebrow="Workers"
				title="Execution surface readiness"
				description="Workers inherit access risk from both their own state and their backing provider."
				bodyClass="space-y-4"
			>
				{#each data.workers as worker (worker.id)}
					<a
						class="block rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
						href={worker.workerHref}
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="ui-wrap-anywhere font-medium text-white">{worker.name}</h3>
									<span
										class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${workerStatusToneClass(worker.status)}`}
									>
										{formatWorkerStatusLabel(worker.status)}
									</span>
								</div>
								<p class="mt-2 text-sm text-slate-300">{worker.providerName}</p>
								<p class="mt-1 text-sm text-slate-500">{worker.roleName}</p>
							</div>
							<span
								class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${accessStateClass(worker.accessState)}`}
							>
								{accessStateLabel(worker.accessState)}
							</span>
						</div>
					</a>
				{/each}
			</DetailSection>
		</section>
	</div>
</AppPage>
