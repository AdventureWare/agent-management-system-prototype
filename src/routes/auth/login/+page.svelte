<script lang="ts">
	let { data, form } = $props<{
		data: {
			nextPath: string;
		};
		form?: {
			message?: string;
			nextPath?: string;
		};
	}>();

	let nextPath = $derived(form?.nextPath ?? data.nextPath);
</script>

<svelte:head>
	<title>Remote Operator Login</title>
</svelte:head>

<section class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
	<div
		class="rounded-[1.75rem] border border-slate-800 bg-slate-950/80 p-6 shadow-2xl shadow-slate-950/40 sm:p-7"
	>
		<div class="space-y-3">
			<p class="text-xs font-semibold tracking-[0.28em] text-sky-300 uppercase">
				Remote Operator Access
			</p>
			<h1 class="text-3xl font-semibold tracking-tight text-white">Unlock the control plane</h1>
			<p class="text-sm leading-6 text-slate-300">
				This laptop-hosted app is behind a shared operator password while it is exposed off-machine.
				Enter that password to open the operator surfaces on this phone.
			</p>
		</div>

		<form class="mt-6 space-y-4" method="POST">
			<input type="hidden" name="next" value={nextPath} />

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Operator password</span>
				<input
					autocapitalize="off"
					autocomplete="current-password"
					autocorrect="off"
					class="input text-white placeholder:text-slate-500"
					name="password"
					placeholder="Enter the remote access password"
					required
					spellcheck="false"
					type="password"
				/>
			</label>

			{#if form?.message}
				<p
					class="rounded-2xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
				>
					{form.message}
				</p>
			{/if}

			<button
				class="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-400 px-4 py-3 text-sm font-semibold tracking-[0.08em] text-slate-950 uppercase transition hover:bg-sky-300"
				type="submit"
			>
				Open operator app
			</button>
		</form>

		<p class="mt-5 text-xs leading-5 text-slate-500">
			When remote access is disabled, this screen is skipped and the app opens directly.
		</p>
	</div>
</section>
