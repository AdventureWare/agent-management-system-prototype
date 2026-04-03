<script lang="ts">
	import type { AgentThreadDetail } from '$lib/types/agent-session';
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

<div class:items-center={compact} class="flex flex-col gap-2 sm:flex-row sm:justify-between">
	<div class="flex items-start gap-3">
		<div aria-hidden="true" class="activity-signal mt-0.5">
			{#each [0, 1, 2] as index (index)}
				<span
					class={['signal-bar', toneClass.bar, meta.animate ? 'signal-bar-animated' : '']}
					style={`animation-delay:${index * 140}ms;height:${0.45 + index * 0.2}rem;`}
				></span>
			{/each}
		</div>

		<div class="space-y-1">
			<p class={`text-xs font-semibold tracking-[0.16em] uppercase ${toneClass.label}`}>
				{meta.label}
			</p>
			<p class="text-xs text-slate-400">{meta.detail}</p>
		</div>
	</div>

	<span
		class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${toneClass.chip}`}
	>
		Updated {meta.ageLabel}
	</span>
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
