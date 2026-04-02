<script lang="ts">
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailFactCard from '$lib/components/DetailFactCard.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import {
		formatRunStatusLabel,
		formatProviderSetupStatusLabel,
		formatWorkerStatusLabel,
		providerSetupStatusToneClass,
		runStatusToneClass,
		workerStatusToneClass
	} from '$lib/types/control-plane';

	let { data, form } = $props();

	let updateSuccess = $derived(form?.ok && form?.successAction === 'updateProvider');

	function enabledClass(enabled: boolean) {
		return enabled
			? 'border-sky-800/70 bg-sky-950/40 text-sky-200'
			: 'border-slate-700 bg-slate-950/70 text-slate-400';
	}
</script>

<AppPage width="full">
	<DetailHeader
		backHref={resolve('/app/providers')}
		backLabel="Back to providers"
		eyebrow="Provider detail"
		title={data.provider.name}
		description={data.provider.description || 'No description saved for this provider yet.'}
	>
		{#snippet meta()}
			<div class="flex flex-wrap gap-2">
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${enabledClass(data.provider.enabled)}`}
				>
					{data.provider.enabled ? 'enabled' : 'disabled'}
				</span>
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${providerSetupStatusToneClass(data.provider.setupStatus)}`}
				>
					{formatProviderSetupStatusLabel(data.provider.setupStatus)}
				</span>
			</div>
		{/snippet}
	</DetailHeader>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<MetricCard
			label="Service"
			value={data.provider.service}
			detail={`${data.provider.kind} surface`}
		/>
		<MetricCard
			label="Auth mode"
			value={data.provider.authMode}
			detail={`Launcher: ${data.provider.launcher || 'Not set'} | Thread sandbox: ${data.provider.defaultThreadSandbox}`}
		/>
		<MetricCard
			label="Workers"
			value={data.attachedWorkers.length}
			detail="Workers currently configured against this provider."
		/>
		<MetricCard
			label="Recent runs"
			value={data.recentRuns.length}
			detail="Most recent runs routed through this provider."
		/>
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

	<div class="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
		<DetailSection
			eyebrow="Provider details"
			title="Edit provider readiness and defaults"
			bodyClass="space-y-4"
		>
			<form class="space-y-4" method="POST" action="?/updateProvider">
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
									{formatProviderSetupStatusLabel(setupStatus)}
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
							value={data.provider.defaultModel}
						/>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Launcher or command</span>
						<input class="input text-white" name="launcher" value={data.provider.launcher} />
					</label>
				</div>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Default thread sandbox</span>
					<select class="select text-white" name="defaultThreadSandbox">
						{#each data.sandboxOptions as sandbox (sandbox)}
							<option value={sandbox} selected={data.provider.defaultThreadSandbox === sandbox}>
								{sandbox}
							</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Base URL</span>
					<input class="input text-white" name="baseUrl" value={data.provider.baseUrl} />
				</label>

				<div class="grid gap-4 sm:grid-cols-2">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Environment variables</span>
						<input
							class="input text-white"
							name="envVars"
							value={data.provider.envVars.join(', ')}
						/>
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
					<textarea class="textarea min-h-28 text-white" name="notes"
						>{data.provider.notes}</textarea
					>
				</label>

				<div
					class="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<label
						class="inline-flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-200"
					>
						<input
							checked={data.provider.enabled}
							class="checkbox"
							name="enabled"
							type="checkbox"
						/>
						<span>Keep enabled</span>
					</label>

					<button class="btn preset-filled-primary-500 font-semibold" type="submit">
						Save provider
					</button>
				</div>
			</form>
		</DetailSection>

		<div class="space-y-6">
			<DetailSection
				eyebrow="Configuration summary"
				title="Current capabilities and requirements"
				bodyClass="grid gap-4 md:grid-cols-2"
			>
				<DetailFactCard
					label="Environment variables"
					value={data.provider.envVars.length > 0
						? data.provider.envVars.join(', ')
						: 'None listed'}
				/>
				<DetailFactCard
					label="Capabilities"
					value={data.provider.capabilities.length > 0
						? data.provider.capabilities.join(', ')
						: 'None listed'}
				/>
				<DetailFactCard label="Default thread sandbox" value={data.provider.defaultThreadSandbox} />
				<DetailFactCard label="Notes" value={data.provider.notes || 'No notes saved.'} />
			</DetailSection>

			<DetailSection
				eyebrow="Attached workers"
				title="Workers using this provider"
				bodyClass="space-y-4"
			>
				{#snippet actions()}
					<a
						class="rounded-full border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
						href={resolve('/app/workers')}
					>
						Open workers
					</a>
				{/snippet}

				<div class="space-y-4">
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
									<div class="min-w-0 flex-1">
										<h3 class="ui-wrap-anywhere font-medium text-white">{worker.name}</h3>
										<p class="ui-wrap-anywhere mt-1 text-sm text-slate-400">{worker.roleName}</p>
									</div>
									<span
										class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${workerStatusToneClass(worker.status)}`}
									>
										{formatWorkerStatusLabel(worker.status)}
									</span>
								</div>
								<p class="ui-clamp-3 mt-3 text-sm text-slate-300">
									{worker.note || 'No note saved.'}
								</p>
							</a>
						{/each}
					{/if}
				</div>
			</DetailSection>

			<DetailSection
				eyebrow="Recent runs"
				title="Latest activity through this provider"
				bodyClass="space-y-4"
			>
				<div class="space-y-4">
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
									<div class="min-w-0 flex-1">
										<p class="ui-wrap-anywhere font-medium text-white">{run.taskTitle}</p>
										<p class="ui-clamp-3 mt-1 text-sm text-slate-400">
											{run.summary || 'No summary recorded.'}
										</p>
									</div>
									<p class="text-xs text-slate-500">Updated {run.updatedAtLabel}</p>
								</div>
								<div class="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
									<span
										class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${runStatusToneClass(run.status)}`}
									>
										{formatRunStatusLabel(run.status)}
									</span>
									<span class="ui-wrap-anywhere"
										>{run.threadId || run.sessionId || 'No thread'}</span
									>
									<a
										class="text-sky-300 transition hover:text-sky-200"
										href={resolve(`/app/runs/${run.id}`)}
									>
										Open run
									</a>
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
			</DetailSection>
		</div>
	</div>
</AppPage>
