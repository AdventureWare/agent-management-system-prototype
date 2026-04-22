<script lang="ts">
	import DetailSection from '$lib/components/DetailSection.svelte';

	type AgentRecommendedAction = {
		resource: string;
		command: string;
		reason: string;
		stateSignals: string[];
		expectedOutcome: string;
		suggestedReadbackCommands: string[];
		shouldValidateFirst?: boolean;
		validationMode?: string;
		validationReason?: string;
	};

	type AgentCurrentContext = {
		summary: {
			currentState: string;
			blockers: string[];
			openGates: string[];
			recommendedNextActions: AgentRecommendedAction[];
		};
		task?: {
			title: string;
			status: string;
		} | null;
		run?: {
			status: string;
		} | null;
		thread?: {
			name: string | null;
			threadState: string | null;
		} | null;
	};

	let { context, class: className = '' } = $props<{
		context: AgentCurrentContext | null | undefined;
		class?: string;
	}>();

	let blockerCount = $derived(context?.summary.blockers.length ?? 0);
	let openGateCount = $derived(context?.summary.openGates.length ?? 0);
	let recommendedActionCount = $derived(context?.summary.recommendedNextActions.length ?? 0);

	function formatCommandLabel(action: AgentRecommendedAction) {
		return `${action.resource}:${action.command}`;
	}
</script>

{#if context}
	<DetailSection
		id="agent-current-context"
		eyebrow="Agent guidance"
		title="Current context recommendations"
		description="Operator-facing view of the same structured current-context guidance returned to managed agents."
		tone="amber"
		class={className}
	>
		<div class="space-y-5">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
				<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
					Current state
				</p>
				<p class="ui-wrap-anywhere mt-2 text-sm text-slate-100">{context.summary.currentState}</p>
				<div class="mt-3 flex flex-wrap gap-2 text-xs">
					{#if context.task}
						<span
							class="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-slate-300"
						>
							Task status: {context.task.status}
						</span>
					{/if}
					{#if context.run}
						<span
							class="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-slate-300"
						>
							Run status: {context.run.status}
						</span>
					{/if}
					{#if context.thread?.threadState}
						<span
							class="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-slate-300"
						>
							Thread state: {context.thread.threadState}
						</span>
					{/if}
				</div>
			</div>

			<div class="grid gap-4 lg:grid-cols-[minmax(0,0.68fr)_minmax(0,0.32fr)]">
				<div class="space-y-4">
					<div>
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Recommended next actions
						</p>
						<p class="mt-1 text-sm text-slate-400">
							{recommendedActionCount} structured recommendation{recommendedActionCount === 1
								? ''
								: 's'} based on the latest task, run, and thread state.
						</p>
					</div>

					{#if context.summary.recommendedNextActions.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-5 text-sm text-slate-500"
						>
							No current-context recommendations were returned for this state.
						</p>
					{:else}
						<div class="space-y-4">
							{#each context.summary.recommendedNextActions as action (`${action.resource}:${action.command}`)}
								<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
									<div class="flex flex-wrap items-start gap-2">
										<span
											class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 font-mono text-xs text-sky-200"
										>
											{formatCommandLabel(action)}
										</span>
										{#if action.shouldValidateFirst}
											<span class="badge border border-amber-800/70 bg-amber-950/40 text-amber-200">
												Preview first
											</span>
										{/if}
									</div>
									<p class="ui-wrap-anywhere mt-3 text-sm font-medium text-white">
										{action.reason}
									</p>

									{#if action.shouldValidateFirst && action.validationReason}
										<div class="mt-4 rounded-xl border border-amber-800/50 bg-amber-950/20 p-3">
											<p
												class="text-[11px] font-semibold tracking-[0.18em] text-amber-200 uppercase"
											>
												Validation guidance
											</p>
											<p class="ui-wrap-anywhere mt-2 text-sm text-amber-100">
												{action.validationReason}
											</p>
											{#if action.validationMode}
												<p class="mt-2 text-xs text-amber-200/90">
													Use validation mode: <span class="font-mono">{action.validationMode}</span
													>
												</p>
											{/if}
										</div>
									{/if}

									<div class="mt-4 grid gap-4 lg:grid-cols-2">
										<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
											<p
												class="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase"
											>
												Why now
											</p>
											<ul class="mt-2 space-y-2 text-sm text-slate-300">
												{#each action.stateSignals as signal}
													<li class="ui-wrap-anywhere">{signal}</li>
												{/each}
											</ul>
										</div>
										<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
											<p
												class="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase"
											>
												Expected outcome
											</p>
											<p class="ui-wrap-anywhere mt-2 text-sm text-slate-300">
												{action.expectedOutcome}
											</p>
											<p
												class="mt-3 text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase"
											>
												Read back after success
											</p>
											<div class="mt-2 flex flex-wrap gap-2">
												{#each action.suggestedReadbackCommands as command}
													<span
														class="rounded-full border border-slate-800 bg-slate-900/80 px-2 py-1 font-mono text-xs text-slate-300"
													>
														{command}
													</span>
												{/each}
											</div>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</div>

				<div class="space-y-4">
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Blockers</p>
						<p class="mt-2 text-sm text-slate-400">
							{blockerCount} blocker{blockerCount === 1 ? '' : 's'} currently inferred.
						</p>
						{#if context.summary.blockers.length === 0}
							<p class="mt-3 text-sm text-slate-500">No blockers are currently called out.</p>
						{:else}
							<ul class="mt-3 space-y-2 text-sm text-slate-200">
								{#each context.summary.blockers as blocker}
									<li
										class="ui-wrap-anywhere rounded-xl border border-rose-900/40 bg-rose-950/20 px-3 py-2"
									>
										{blocker}
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Open gates
						</p>
						<p class="mt-2 text-sm text-slate-400">
							{openGateCount} governance or delegation gate{openGateCount === 1 ? '' : 's'} currently
							open.
						</p>
						{#if context.summary.openGates.length === 0}
							<p class="mt-3 text-sm text-slate-500">No open gates are currently recorded.</p>
						{:else}
							<ul class="mt-3 space-y-2 text-sm text-slate-200">
								{#each context.summary.openGates as gate}
									<li
										class="ui-wrap-anywhere rounded-xl border border-amber-800/40 bg-amber-950/20 px-3 py-2"
									>
										{gate}
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</DetailSection>
{/if}
