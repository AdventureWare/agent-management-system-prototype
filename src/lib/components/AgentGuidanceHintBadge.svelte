<script lang="ts">
	import type { AgentGuidanceHint } from '$lib/server/agent-current-context';

	let {
		hint,
		compact = false,
		class: className = ''
	} = $props<{
		hint: AgentGuidanceHint | null | undefined;
		compact?: boolean;
		class?: string;
	}>();

	function formatCommandLabel(commandHint: AgentGuidanceHint) {
		return `${commandHint.resource}:${commandHint.command}`;
	}
</script>

{#if hint}
	<div class={['rounded-xl border border-slate-800 bg-slate-950/60 p-3', className]}>
		<div class="flex flex-wrap items-center gap-2">
			<span
				class={`rounded-full border px-2 py-1 text-[11px] leading-none uppercase ${
					hint.shouldValidateFirst
						? 'border-amber-800/70 bg-amber-950/40 text-amber-200'
						: 'border-sky-900/70 bg-sky-950/40 text-sky-200'
				}`}
			>
				{hint.shouldValidateFirst ? 'Preview first' : 'Agent next action'}
			</span>
			<span
				class="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 font-mono text-[11px] text-slate-300"
			>
				{formatCommandLabel(hint)}
			</span>
		</div>
		<p
			class={`ui-wrap-anywhere mt-2 ${compact ? 'text-xs text-slate-300' : 'text-sm text-slate-200'}`}
		>
			{hint.reason}
		</p>
		{#if hint.shouldValidateFirst && hint.validationReason}
			<p
				class={`ui-wrap-anywhere mt-2 ${compact ? 'text-[11px] text-amber-200/90' : 'text-xs text-amber-200/90'}`}
			>
				{hint.validationReason}
			</p>
		{/if}
	</div>
{/if}
