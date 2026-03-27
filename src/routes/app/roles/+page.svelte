<script lang="ts">
	import { ChevronDownIcon } from '@lucide/svelte';
	import { Accordion, Progress } from '@skeletonlabs/skeleton-svelte';

	let { data } = $props();

	let staffedRoleCount = $derived(data.roles.filter((role) => role.workerCount > 0).length);
	let queuedTaskCount = $derived(data.roles.reduce((count, role) => count + role.taskCount, 0));
	let maxWorkerCount = $derived(Math.max(1, ...data.roles.map((role) => role.workerCount)));
	let maxTaskCount = $derived(Math.max(1, ...data.roles.map((role) => role.taskCount)));
</script>

<section class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Roles</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Assignment model</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Roles keep task intake clean. A task should request a role, not a vague kind of help. Workers
			then advertise which role they are actually suitable for.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Cataloged roles
			</p>
			<p class="mt-3 text-3xl font-semibold text-white">{data.roles.length}</p>
			<p class="mt-2 text-sm text-slate-400">Distinct contracts workers can advertise against.</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Staffed roles</p>
			<p class="mt-3 text-3xl font-semibold text-white">{staffedRoleCount}</p>
			<p class="mt-2 text-sm text-slate-400">Roles with at least one registered worker.</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Queued demand</p>
			<p class="mt-3 text-3xl font-semibold text-white">{queuedTaskCount}</p>
			<p class="mt-2 text-sm text-slate-400">Tasks waiting to land on an explicit role.</p>
		</article>
	</div>

	<Accordion multiple class="space-y-4">
		{#each data.roles as role (role.id)}
			<Accordion.Item
				value={role.id}
				class="overflow-hidden card border border-slate-800 bg-slate-950/70"
			>
				<Accordion.ItemTrigger class="flex w-full items-start gap-4 px-5 py-4 text-left">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-3">
							<h2 class="text-xl font-semibold text-white">{role.name}</h2>
							<span
								class="badge border border-slate-700 bg-slate-900/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
							>
								{role.lane}
							</span>
						</div>
						<p class="mt-3 max-w-3xl text-sm text-slate-300">{role.description}</p>
					</div>

					<Accordion.ItemIndicator
						class="mt-1 text-slate-400 transition-transform duration-200 data-[state=open]:rotate-180"
					>
						<ChevronDownIcon class="size-4" />
					</Accordion.ItemIndicator>
				</Accordion.ItemTrigger>

				<Accordion.ItemContent class="border-t border-slate-800 px-5 py-5">
					<div class="grid gap-4 lg:grid-cols-2">
						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm font-medium text-slate-200">Worker coverage</p>
								<p class="text-sm text-slate-400">{role.workerCount} workers</p>
							</div>
							<Progress max={maxWorkerCount} value={role.workerCount} class="mt-3 space-y-2">
								<Progress.Track class="h-2 overflow-hidden rounded-full bg-slate-800">
									<Progress.Range class="h-full rounded-full bg-sky-400" />
								</Progress.Track>
								<Progress.ValueText class="text-xs text-slate-500">
									{role.workerCount} of {maxWorkerCount} currently assigned
								</Progress.ValueText>
							</Progress>
						</div>

						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm font-medium text-slate-200">Task demand</p>
								<p class="text-sm text-slate-400">{role.taskCount} tasks</p>
							</div>
							<Progress max={maxTaskCount} value={role.taskCount} class="mt-3 space-y-2">
								<Progress.Track class="h-2 overflow-hidden rounded-full bg-slate-800">
									<Progress.Range class="h-full rounded-full bg-fuchsia-400" />
								</Progress.Track>
								<Progress.ValueText class="text-xs text-slate-500">
									{role.taskCount} of {maxTaskCount} queued against this role
								</Progress.ValueText>
							</Progress>
						</div>
					</div>
				</Accordion.ItemContent>
			</Accordion.Item>
		{/each}
	</Accordion>
</section>
