<script lang="ts">
	type SuggestedActionView = {
		id: string;
		label: string;
		detail: string;
	};

	type DelegationReadinessView = {
		recommendedMode: string;
		readinessLabel: string;
		canExecute: boolean;
		needsClarification: boolean;
		needsResearch: boolean;
		needsReview: boolean;
		effectiveRigorProfile: string;
		rigorProfileLabel: string;
		rigorProfileValidationExpectations: string[];
		riskFlags: string[];
		missingInformation: string[];
		suggestedNextActions: SuggestedActionView[];
		rationale: string;
	};

	let { assessment }: { assessment: DelegationReadinessView } = $props();

	let primaryAction = $derived(assessment.suggestedNextActions[0] ?? null);

	function modeToneClass(mode: string) {
		switch (mode) {
			case 'READY_FOR_EXECUTION':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'AWAITING_REVIEW':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			case 'AUTOMATION_CANDIDATE':
				return 'border-sky-900/70 bg-sky-950/40 text-sky-200';
			case 'NEEDS_CLARIFICATION':
			case 'NEEDS_RESEARCH':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
			case 'NEEDS_PLANNING':
				return 'border-violet-900/70 bg-violet-950/40 text-violet-200';
			case 'CAPTURED':
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function nextActionToneClass(actionId: string) {
		switch (actionId) {
			case 'execute':
				return 'border-emerald-900/70 bg-emerald-950/30 text-emerald-100';
			case 'review':
				return 'border-amber-900/70 bg-amber-950/30 text-amber-100';
			case 'convert_to_template_or_skill':
				return 'border-sky-900/70 bg-sky-950/30 text-sky-100';
			case 'clarify':
			case 'research':
				return 'border-rose-900/70 bg-rose-950/30 text-rose-100';
			case 'plan':
			default:
				return 'border-violet-900/70 bg-violet-950/30 text-violet-100';
		}
	}
</script>

<section class="card border border-slate-800 bg-slate-950/70 px-5 py-4">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-2">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Delegation readiness
				</p>
				<span
					class={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] leading-none font-semibold tracking-[0.14em] uppercase ${modeToneClass(assessment.recommendedMode)}`}
				>
					{assessment.readinessLabel}
				</span>
				<span
					class="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-[11px] leading-none font-semibold tracking-[0.14em] text-slate-300 uppercase"
				>
					{assessment.rigorProfileLabel}
				</span>
			</div>
			<p class="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{assessment.rationale}</p>
		</div>

		{#if primaryAction}
			<div class={`rounded-2xl border p-4 lg:max-w-md ${nextActionToneClass(primaryAction.id)}`}>
				<p class="text-[11px] font-semibold tracking-[0.18em] uppercase">Suggested next action</p>
				<p class="mt-2 text-sm font-semibold">{primaryAction.label}</p>
				<p class="mt-1 text-sm opacity-90">{primaryAction.detail}</p>
			</div>
		{/if}
	</div>

	<details class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
		<summary class="cursor-pointer text-sm font-semibold text-slate-200">
			Improve readiness checklist
		</summary>

		<div class="mt-4 grid gap-4 lg:grid-cols-2">
			<div>
				<p class="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
					Missing or weak information
				</p>
				{#if assessment.missingInformation.length === 0}
					<p class="mt-2 text-sm text-slate-400">
						No obvious information gaps were detected by the v0 rules.
					</p>
				{:else}
					<ul class="mt-2 space-y-2">
						{#each assessment.missingInformation as item (item)}
							<li
								class="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300"
							>
								{item}
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div>
				<p class="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
					Guardrails
				</p>
				{#if assessment.riskFlags.length === 0}
					<p class="mt-2 text-sm text-slate-400">
						No risk guardrails were triggered by the v0 rules.
					</p>
				{:else}
					<ul class="mt-2 space-y-2">
						{#each assessment.riskFlags as flag (flag)}
							<li
								class="rounded-xl border border-amber-900/70 bg-amber-950/20 px-3 py-2 text-sm text-amber-100"
							>
								{flag}
							</li>
						{/each}
					</ul>
				{/if}

				{#if assessment.rigorProfileValidationExpectations.length > 0}
					<p class="mt-4 text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
						Profile validation
					</p>
					<ul class="mt-2 space-y-2">
						{#each assessment.rigorProfileValidationExpectations as expectation (expectation)}
							<li
								class="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300"
							>
								{expectation}
							</li>
						{/each}
					</ul>
				{/if}

				{#if assessment.suggestedNextActions.length > 1}
					<p class="mt-4 text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
						Also consider
					</p>
					<ul class="mt-2 space-y-2">
						{#each assessment.suggestedNextActions.slice(1) as action (action.id)}
							<li
								class="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300"
							>
								<span class="font-medium text-white">{action.label}</span>
								<span class="text-slate-500"> - {action.detail}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</details>
</section>
