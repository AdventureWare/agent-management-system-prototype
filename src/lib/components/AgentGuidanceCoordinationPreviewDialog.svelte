<script lang="ts">
	import AppDialog from '$lib/components/AppDialog.svelte';

	type ThreadContactTarget = {
		id: string;
		handle: string;
		contactLabel: string;
		projectLabel: string;
		roleLabel: string;
		lastActivityLabel: string;
		threadState: string | null;
		canContact: boolean;
		disabledReason: string;
		routingReason: string;
	};

	type CoordinationPreviewResult = {
		valid?: boolean;
		action?: string;
		checks?: string[];
		preview?: {
			target?: {
				id?: string;
				name?: string;
				handle?: string | null;
			};
			sourceThreadId?: string;
			prompt?: string;
			suggestedFollowUp?: string[];
		};
		suggestedNextCommands?: string[];
	};

	type ThreadContactTargetsPayload =
		| {
				targets?: ThreadContactTarget[];
		  }
		| {
				error?: string;
		  }
		| null;

	type CoordinationPreviewMemory = {
		targetThreadIdOrHandle?: string;
		prompt?: string;
		updatedAt?: string;
	};

	const COORDINATION_PREVIEW_MEMORY_KEY = 'ams:coordination-preview-memory';

	let {
		open = $bindable(false),
		sourceThreadId,
		sourceThreadLabel = '',
		initialPrompt = ''
	} = $props<{
		open?: boolean;
		sourceThreadId: string | null;
		sourceThreadLabel?: string;
		initialPrompt?: string;
	}>();

	let targetThreadIdOrHandle = $state('');
	let prompt = $state('');
	let targets = $state.raw<ThreadContactTarget[]>([]);
	let loadingTargets = $state(false);
	let targetsError = $state<string | null>(null);
	let previewLoading = $state(false);
	let previewError = $state<string | null>(null);
	let previewResult = $state.raw<CoordinationPreviewResult | null>(null);
	let memoryRestored = $state(false);
	let selectableTargets = $derived(targets.filter((target) => target.canContact));

	function readMemory(threadId: string): CoordinationPreviewMemory | null {
		try {
			const raw = globalThis.localStorage?.getItem(COORDINATION_PREVIEW_MEMORY_KEY);
			const parsed = raw ? JSON.parse(raw) : null;
			const entry = parsed && typeof parsed === 'object' ? parsed[threadId] : null;

			if (!entry || typeof entry !== 'object') {
				return null;
			}

			return {
				targetThreadIdOrHandle:
					typeof entry.targetThreadIdOrHandle === 'string'
						? entry.targetThreadIdOrHandle
						: undefined,
				prompt: typeof entry.prompt === 'string' ? entry.prompt : undefined,
				updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : undefined
			};
		} catch {
			return null;
		}
	}

	function writeMemory(threadId: string, memory: CoordinationPreviewMemory) {
		try {
			const raw = globalThis.localStorage?.getItem(COORDINATION_PREVIEW_MEMORY_KEY);
			const parsed = raw ? JSON.parse(raw) : null;
			const next = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};

			next[threadId] = {
				...memory,
				updatedAt: new Date().toISOString()
			};

			globalThis.localStorage?.setItem(COORDINATION_PREVIEW_MEMORY_KEY, JSON.stringify(next));
		} catch {
			// Browser storage can be unavailable; preview should still work without persistence.
		}
	}

	$effect(() => {
		if (!open) {
			return;
		}

		prompt = initialPrompt;
		previewError = null;
		previewResult = null;

		if (!sourceThreadId?.trim()) {
			targets = [];
			targetsError = 'A source thread is required before coordination can be previewed.';
			targetThreadIdOrHandle = '';
			return;
		}

		const remembered = readMemory(sourceThreadId);
		memoryRestored = Boolean(remembered?.targetThreadIdOrHandle || remembered?.prompt);
		prompt = remembered?.prompt || initialPrompt;
		loadingTargets = true;
		targetsError = null;

		void (async () => {
			try {
				const response = await fetch(
					`/api/agents/threads/${encodeURIComponent(sourceThreadId)}/contact-targets`,
					{
						cache: 'no-store'
					}
				);
				const payload = (await response.json().catch(() => null)) as ThreadContactTargetsPayload;

				if (!response.ok) {
					throw new Error(
						(payload && typeof payload === 'object' && 'error' in payload && payload.error) ||
							'Could not load thread contact targets.'
					);
				}

				const nextTargets =
					payload &&
					typeof payload === 'object' &&
					'targets' in payload &&
					Array.isArray(payload.targets)
						? payload.targets
						: [];
				targets = nextTargets;
				const preferredTarget =
					nextTargets.find((target: ThreadContactTarget) => target.canContact) ?? null;
				targetThreadIdOrHandle =
					remembered?.targetThreadIdOrHandle ||
					preferredTarget?.handle ||
					preferredTarget?.id ||
					'';
			} catch (error) {
				targets = [];
				targetThreadIdOrHandle = remembered?.targetThreadIdOrHandle || '';
				targetsError =
					error instanceof Error ? error.message : 'Could not load thread contact targets.';
			} finally {
				loadingTargets = false;
			}
		})();
	});

	let previewEntries = $derived(
		Object.entries(previewResult?.preview ?? {}).map(([key, value]) => ({
			key,
			value:
				value === null || typeof value === 'string' || typeof value === 'number'
					? String(value)
					: typeof value === 'boolean'
						? value
							? 'true'
							: 'false'
						: JSON.stringify(value)
		}))
	);

	async function runPreview() {
		if (!sourceThreadId?.trim()) {
			previewError = 'A source thread is required before coordination can be previewed.';
			return;
		}

		if (!targetThreadIdOrHandle.trim()) {
			previewError = 'Choose a target thread or handle before running the preview.';
			return;
		}

		if (!prompt.trim()) {
			previewError = 'Add the coordination prompt before running the preview.';
			return;
		}

		previewLoading = true;
		previewError = null;
		previewResult = null;

		try {
			const response = await fetch('/api/agent-intents/coordinate_with_another_thread', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					sourceThreadId,
					targetThreadIdOrHandle,
					prompt,
					validateOnly: true
				})
			});
			const payload = (await response.json().catch(() => null)) as
				| CoordinationPreviewResult
				| { error?: { message?: string } }
				| null;

			if (!response.ok) {
				throw new Error(
					(payload &&
						typeof payload === 'object' &&
						'error' in payload &&
						typeof payload.error === 'object' &&
						payload.error &&
						'message' in payload.error &&
						typeof payload.error.message === 'string' &&
						payload.error.message) ||
						'Could not run the coordination preview.'
				);
			}

			previewResult = (payload as CoordinationPreviewResult) ?? null;
			writeMemory(sourceThreadId, {
				targetThreadIdOrHandle: targetThreadIdOrHandle.trim(),
				prompt: prompt.trim()
			});
			memoryRestored = true;
		} catch (error) {
			previewError =
				error instanceof Error ? error.message : 'Could not run the coordination preview.';
		} finally {
			previewLoading = false;
		}
	}
</script>

<AppDialog
	bind:open
	title="Preview thread coordination"
	description="Validate target routing and contact readiness before sending a real cross-thread message."
	surfaceClass="max-w-4xl"
>
	<div class="space-y-5">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
			<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">Source thread</p>
			<p class="ui-wrap-anywhere mt-2 text-sm text-slate-200">
				{sourceThreadLabel || sourceThreadId || 'No source thread available'}
			</p>
			{#if sourceThreadId}
				<p class="mt-1 font-mono text-xs text-slate-500">{sourceThreadId}</p>
			{/if}
		</div>

		<div class="grid gap-4 lg:grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)]">
			<div class="space-y-4">
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<div class="flex items-center justify-between gap-3">
						<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
							Target thread
						</p>
						{#if loadingTargets}
							<span class="text-xs text-slate-500">Loading targets…</span>
						{/if}
					</div>
					{#if memoryRestored}
						<p class="mt-2 text-xs text-slate-400">
							Restored the last target and prompt used from this source thread.
						</p>
					{/if}

					{#if targetsError}
						<p class="mt-3 text-sm text-rose-200">{targetsError}</p>
					{:else}
						<label class="mt-3 block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Suggested target</span>
							<select bind:value={targetThreadIdOrHandle} class="select text-white">
								<option value="">Choose a thread</option>
								{#each selectableTargets as target (target.id)}
									<option value={target.handle || target.id}>
										{target.contactLabel}
										{target.projectLabel ? ` · ${target.projectLabel}` : ''}
									</option>
								{/each}
							</select>
						</label>

						<label class="mt-4 block">
							<span class="mb-2 block text-sm font-medium text-slate-200">
								Exact thread id or handle
							</span>
							<input
								bind:value={targetThreadIdOrHandle}
								class="input text-white placeholder:text-slate-500"
								placeholder="thread_123 or researcher"
							/>
						</label>
					{/if}
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Coordination prompt</span>
						<textarea
							bind:value={prompt}
							class="textarea min-h-28 text-white placeholder:text-slate-500"
							placeholder="Need help investigating the rollout risk on the auth path. Reply back with the findings."
						></textarea>
					</label>
				</div>

				<div class="flex flex-wrap gap-3">
					<button
						class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-200"
						type="button"
						disabled={previewLoading || loadingTargets}
						onclick={() => {
							void runPreview();
						}}
					>
						{previewLoading ? 'Running preview…' : 'Run preview'}
					</button>
				</div>
			</div>

			<div class="space-y-4">
				{#if previewError}
					<div
						class="rounded-2xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
					>
						{previewError}
					</div>
				{/if}

				{#if previewResult}
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<div class="flex flex-wrap items-center gap-2">
							<span
								class={`rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase ${
									previewResult.valid
										? 'border-emerald-800/70 bg-emerald-950/40 text-emerald-200'
										: 'border-amber-800/70 bg-amber-950/40 text-amber-200'
								}`}
							>
								{previewResult.valid ? 'Preview valid' : 'Preview returned warnings'}
							</span>
							{#if previewResult.action}
								<span
									class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 font-mono text-xs text-slate-300"
								>
									{previewResult.action}
								</span>
							{/if}
						</div>
					</div>
				{/if}

				{#if (previewResult?.checks?.length ?? 0) > 0}
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
							Validation checks
						</p>
						<ul class="mt-3 space-y-2 text-sm text-slate-200">
							{#each previewResult?.checks ?? [] as check}
								<li class="ui-wrap-anywhere">{check}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if previewEntries.length > 0}
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
							Preview result
						</p>
						<dl class="mt-3 grid gap-3">
							{#each previewEntries as entry (entry.key)}
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<dt class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
										{entry.key}
									</dt>
									<dd class="ui-wrap-anywhere mt-2 text-sm text-slate-200">{entry.value}</dd>
								</div>
							{/each}
						</dl>
					</div>
				{/if}

				{#if (previewResult?.suggestedNextCommands?.length ?? 0) > 0}
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
							Suggested next commands
						</p>
						<div class="mt-3 flex flex-wrap gap-2">
							{#each previewResult?.suggestedNextCommands ?? [] as command}
								<span
									class="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 font-mono text-xs text-slate-300"
								>
									{command}
								</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</AppDialog>
