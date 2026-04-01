<script lang="ts">
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		description = '',
		children,
		panelClass = '',
		bodyClass = '',
		closeLabel = 'Close dialog'
	} = $props<{
		open?: boolean;
		title: string;
		description?: string;
		children?: Snippet;
		panelClass?: string;
		bodyClass?: string;
		closeLabel?: string;
	}>();
</script>

<Dialog
	{open}
	onOpenChange={(details) => {
		open = details.open;
	}}
>
	<Dialog.Backdrop class="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm" />

	<Dialog.Positioner class="fixed inset-0 z-40 overflow-y-auto p-4 sm:p-6">
		<Dialog.Content
			class={['mx-auto flex min-h-full w-full max-w-5xl items-center justify-center', panelClass]}
		>
			<div
				class="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40"
			>
				<div
					class="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5 sm:px-8"
				>
					<div class="min-w-0">
						<Dialog.Title class="text-xl font-semibold text-white sm:text-2xl">
							{title}
						</Dialog.Title>
						{#if description}
							<Dialog.Description class="mt-2 max-w-2xl text-sm text-slate-400">
								{description}
							</Dialog.Description>
						{/if}
					</div>

					<Dialog.CloseTrigger
						aria-label={closeLabel}
						class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:border-slate-600 hover:text-white"
					>
						×
					</Dialog.CloseTrigger>
				</div>

				<div class={['overflow-y-auto px-6 py-6 sm:px-8 sm:py-8', bodyClass]}>
					{@render children?.()}
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Positioner>
</Dialog>
