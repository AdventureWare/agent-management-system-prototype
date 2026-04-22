<script lang="ts">
	import { onMount } from 'svelte';
	import { subscribeAppToasts, type AppToastRecord } from '$lib/client/app-toast';

	let toasts = $state<AppToastRecord[]>([]);

	function removeToast(id: string) {
		toasts = toasts.filter((toast) => toast.id !== id);
	}

	onMount(() => {
		return subscribeAppToasts((toast) => {
			toasts = [...toasts, toast];
			window.setTimeout(() => {
				removeToast(toast.id);
			}, toast.durationMs);
		});
	});
</script>

{#if toasts.length > 0}
	<div class="pointer-events-none fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-3">
		{#each toasts as toast (toast.id)}
			<div
				class={[
					'rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-sm',
					toast.tone === 'success'
						? 'border-emerald-800/60 bg-emerald-950/90 text-emerald-100'
						: toast.tone === 'error'
							? 'border-rose-800/60 bg-rose-950/90 text-rose-100'
							: 'border-slate-700/70 bg-slate-950/90 text-slate-100'
				]}
				aria-live="polite"
				role="status"
			>
				{toast.message}
			</div>
		{/each}
	</div>
{/if}
