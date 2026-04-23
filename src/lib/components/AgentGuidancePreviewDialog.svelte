<script lang="ts">
	import AppDialog from '$lib/components/AppDialog.svelte';

	type AgentGuidancePreviewResult = {
		valid?: boolean;
		action?: string;
		checks?: string[];
		preview?: Record<string, unknown>;
		suggestedNextCommands?: string[];
	};

	let {
		open = $bindable(false),
		title,
		description,
		loading = false,
		error = null,
		result = null
	} = $props<{
		open?: boolean;
		title: string;
		description: string;
		loading?: boolean;
		error?: string | null;
		result?: AgentGuidancePreviewResult | null;
	}>();

	let previewEntries = $derived(
		Object.entries(result?.preview ?? {}).map(([key, value]) => ({
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
</script>

<AppDialog bind:open {title} {description} surfaceClass="max-w-3xl">
	{#if loading}
		<p class="text-sm text-slate-300">Running preview…</p>
	{:else if error}
		<div
			class="rounded-2xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
		>
			{error}
		</div>
	{:else if result}
		<div class="space-y-5">
			<div class="flex flex-wrap items-center gap-2">
				<span
					class={`rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase ${
						result.valid
							? 'border-emerald-800/70 bg-emerald-950/40 text-emerald-200'
							: 'border-amber-800/70 bg-amber-950/40 text-amber-200'
					}`}
				>
					{result.valid ? 'Preview valid' : 'Preview returned warnings'}
				</span>
				{#if result.action}
					<span
						class="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 font-mono text-xs text-slate-300"
					>
						{result.action}
					</span>
				{/if}
			</div>

			{#if (result.checks?.length ?? 0) > 0}
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
						Validation checks
					</p>
					<ul class="mt-3 space-y-2 text-sm text-slate-200">
						{#each result.checks ?? [] as check}
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
					<dl class="mt-3 grid gap-3 sm:grid-cols-2">
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

			{#if (result.suggestedNextCommands?.length ?? 0) > 0}
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
						Suggested next commands
					</p>
					<div class="mt-3 flex flex-wrap gap-2">
						{#each result.suggestedNextCommands ?? [] as command}
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
	{:else}
		<p class="text-sm text-slate-400">
			Select a previewable guidance action to inspect its dry-run output.
		</p>
	{/if}
</AppDialog>
