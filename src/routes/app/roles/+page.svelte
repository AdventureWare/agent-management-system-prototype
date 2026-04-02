<script lang="ts">
	import { ChevronDownIcon } from '@lucide/svelte';
	import { Accordion, Progress } from '@skeletonlabs/skeleton-svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let { data } = $props();

	let staffedRoleCount = $derived(data.roles.filter((role) => role.workerCount > 0).length);
	let queuedTaskCount = $derived(data.roles.reduce((count, role) => count + role.taskCount, 0));
	let maxWorkerCount = $derived(Math.max(1, ...data.roles.map((role) => role.workerCount)));
	let maxTaskCount = $derived(Math.max(1, ...data.roles.map((role) => role.taskCount)));
</script>

<AppPage width="medium">
	<PageHeader
		eyebrow="Roles"
		title="Assignment model"
		description="Roles keep task intake clean. A task should request a role, not a vague kind of help. Workers then advertise which role they are actually suitable for."
	/>

	<div class="grid gap-4 md:grid-cols-3">
		<MetricCard
			label="Cataloged roles"
			value={data.roles.length}
			detail="Distinct contracts workers can advertise against."
		/>
		<MetricCard
			label="Staffed roles"
			value={staffedRoleCount}
			detail="Roles with at least one registered worker."
		/>
		<MetricCard
			label="Queued demand"
			value={queuedTaskCount}
			detail="Tasks waiting to land on an explicit role."
		/>
	</div>

	<section class="ui-panel">
		<div class="flex flex-col gap-2">
			<h2 class="text-xl font-semibold text-white">Role registry</h2>
			<p class="max-w-3xl text-sm text-slate-400">
				Use this page to compare staffing and demand across roles before drilling into workers and
				tasks.
			</p>
		</div>

		<Accordion multiple class="mt-6 space-y-4">
			{#each data.roles as role (role.id)}
				<Accordion.Item
					value={role.id}
					class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/55"
				>
					<Accordion.ItemTrigger class="flex w-full items-start gap-4 px-5 py-4 text-left">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-3">
								<h2 class="text-xl font-semibold text-white">{role.name}</h2>
								<span
									class="badge border border-slate-700 bg-slate-900/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
								>
									Area · {role.lane}
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
</AppPage>
