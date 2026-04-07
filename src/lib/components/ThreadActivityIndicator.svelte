<script lang="ts">
	import type { AgentThreadDetail } from '$lib/types/agent-thread';
	import { getThreadActivityMeta } from '$lib/thread-activity';

	let {
		thread,
		now = Date.now(),
		compact = false
	} = $props<{
		thread: AgentThreadDetail;
		now?: number;
		compact?: boolean;
	}>();

	let meta = $derived(getThreadActivityMeta(thread, now));
	let toneClass = $derived.by(() => {
		switch (meta.tone) {
			case 'live':
				return {
					label: 'text-emerald-200',
					bar: 'bg-emerald-400',
					chip: 'border-emerald-800/70 bg-emerald-950/40 text-emerald-200'
				};
			case 'progress':
				return {
					label: 'text-violet-200',
					bar: 'bg-violet-300',
					chip: 'border-violet-800/70 bg-violet-950/40 text-violet-200'
				};
			case 'ready':
				return {
					label: 'text-sky-200',
					bar: 'bg-sky-300',
					chip: 'border-sky-800/70 bg-sky-950/40 text-sky-200'
				};
			case 'attention':
				return {
					label: 'text-rose-200',
					bar: 'bg-rose-300',
					chip: 'border-rose-900/70 bg-rose-950/40 text-rose-200'
				};
			case 'idle':
			default:
				return {
					label: 'text-slate-200',
					bar: 'bg-slate-400',
					chip: 'border-slate-700 bg-slate-900/80 text-slate-200'
				};
		}
	});
</script>

<div
	class={compact
		? 'flex min-w-0 flex-col gap-2'
		: 'flex min-w-0 flex-col gap-2 sm:flex-row sm:justify-between sm:gap-3'}
>
	<div class="flex min-w-0 items-start gap-3">
		<div aria-hidden="true" class="activity-signal mt-0.5">
			{#each [0, 1, 2] as index (index)}
				<span
					class={['signal-bar', toneClass.bar, meta.animate ? 'signal-bar-animated' : '']}
					style={`animation-delay:${index * 140}ms;height:${0.45 + index * 0.2}rem;`}
				></span>
			{/each}
		</div>

		<div class="min-w-0 flex-1 space-y-1.5">
			<div class="flex min-w-0 flex-wrap items-start gap-2">
				<p class={`text-xs font-semibold tracking-[0.16em] uppercase ${toneClass.label}`}>
					{meta.label}
				</p>
				{#if compact}
					<span
						class={`inline-flex shrink-0 items-center justify-center rounded-full border px-2 py-1 text-center text-[10px] leading-none uppercase ${toneClass.chip}`}
					>
						Updated {meta.ageLabel}
					</span>
				{/if}
			</div>
			<p class={compact ? 'ui-clamp-2 text-xs text-slate-400' : 'text-xs text-slate-400'}>
				{meta.detail}
			</p>
			{#if meta.activityLabel}
				{#if compact}
					<div class={`min-w-0 rounded-xl border px-2.5 py-2 ${toneClass.chip}`}>
						<p class={`text-[10px] font-semibold tracking-[0.16em] uppercase ${toneClass.label}`}>
							{meta.activityHeading ?? 'Latest signal'}
						</p>
						<p class="ui-clamp-2 mt-1 text-[11px] leading-relaxed font-medium text-white">
							{meta.activityLabel}
						</p>
						{#if meta.activityDetail}
							<p class="ui-clamp-2 mt-1 text-[11px] leading-relaxed text-slate-300/90">
								{meta.activityDetail}
							</p>
						{/if}
					</div>
				{:else}
					<div
						class={`inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border px-2 py-1 text-[11px] leading-relaxed ${toneClass.chip}`}
					>
						{#if meta.activityHeading}
							<span class="font-semibold uppercase opacity-80">{meta.activityHeading}</span>
						{/if}
						<span class="text-white">{meta.activityLabel}</span>
						{#if meta.activityDetail}
							<span class="ui-wrap-anywhere text-slate-300/90">{meta.activityDetail}</span>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</div>

	{#if !compact}
		<span
			class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${toneClass.chip}`}
		>
			Updated {meta.ageLabel}
		</span>
	{/if}
</div>

<style>
	.activity-signal {
		display: inline-flex;
		align-items: end;
		gap: 0.2rem;
		min-height: 1rem;
	}

	.signal-bar {
		width: 0.28rem;
		border-radius: 999px;
		opacity: 0.7;
		transform-origin: bottom;
	}

	.signal-bar-animated {
		animation: activity-bars 1.15s ease-in-out infinite;
	}

	@keyframes activity-bars {
		0%,
		100% {
			opacity: 0.35;
			transform: scaleY(0.45);
		}

		50% {
			opacity: 1;
			transform: scaleY(1);
		}
	}
</style>
