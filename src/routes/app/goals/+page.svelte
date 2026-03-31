<script lang="ts">
	import PathField from '$lib/components/PathField.svelte';
	import { Progress, Tabs } from '@skeletonlabs/skeleton-svelte';

	let { data, form } = $props();
	let artifactPath = $state('');

	let activeGoalCount = $derived(data.goals.filter((goal) => goal.status !== 'done').length);
	let defaultStatus = $derived(data.statusOptions[0] ?? '');
	let goalsByStatus = $derived.by(() =>
		data.statusOptions.map((status) => ({
			status,
			goals: data.goals.filter((goal) => goal.status === status)
		}))
	);
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Goals</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Effort folders and ownership</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			A goal is the top-level effort. It should map to one coordination or growth folder and give
			every downstream task a canonical artifact path.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Goal count</p>
			<p class="mt-3 text-3xl font-semibold text-white">{data.goals.length}</p>
			<p class="mt-2 text-sm text-slate-400">
				Top-level efforts currently defined in the control plane.
			</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Active efforts</p>
			<p class="mt-3 text-3xl font-semibold text-white">{activeGoalCount}</p>
			<p class="mt-2 text-sm text-slate-400">
				Goals still moving through planning, delivery, or review.
			</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Status lanes</p>
			<p class="mt-3 text-3xl font-semibold text-white">{data.statusOptions.length}</p>
			<p class="mt-2 text-sm text-slate-400">Distinct buckets used to sort the goal portfolio.</p>
		</article>
	</div>

	{#if form?.message}
		<p class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if form?.ok}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Goal created and appended to the control plane.
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
		<form
			class="space-y-4 card border border-slate-800 bg-slate-950/70 p-6"
			method="POST"
			action="?/createGoal"
		>
			<h2 class="text-xl font-semibold text-white">Create goal</h2>
			<p class="text-sm text-slate-400">
				Use a stable name, a lane that matches ownership, and an artifact path that downstream tasks
				can reference without translation.
			</p>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
				<input
					class="input text-white placeholder:text-slate-500"
					name="name"
					placeholder="Kwipoo cross-platform launch prep"
					required
				/>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Lane</span>
				<select class="select text-white" name="lane">
					{#each data.laneOptions as lane (lane)}
						<option value={lane}>{lane}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
				<select class="select text-white" name="status">
					{#each data.statusOptions as status (status)}
						<option value={status}>{status}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Summary</span>
				<textarea
					class="textarea min-h-28 text-white placeholder:text-slate-500"
					name="summary"
					placeholder="Define what this effort is coordinating and what counts as done."
					required
				></textarea>
			</label>

			<div>
				<PathField
					bind:value={artifactPath}
					createMode="folder"
					helperText="Creates the goal folder if you are defining a new effort workspace."
					inputId="create-goal-artifact-path"
					label="Artifact path"
					name="artifactPath"
					options={data.folderOptions}
					placeholder="/absolute/path/to/coordination/or/growth/folder"
					required
				/>
			</div>

			<button class="btn preset-filled-primary-500 font-semibold" type="submit">
				Create goal
			</button>
		</form>

		<section class="card border border-slate-800 bg-slate-950/70 p-6">
			<Tabs defaultValue={defaultStatus} class="space-y-4">
				<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<h2 class="text-xl font-semibold text-white">Current goals</h2>
						<p class="mt-1 text-sm text-slate-400">
							Review the portfolio by status before handing work down to tasks and roles.
						</p>
					</div>

					<Tabs.List
						class="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2"
					>
						{#each data.statusOptions as status (status)}
							<Tabs.Trigger
								value={status}
								class="btn border border-transparent btn-sm text-slate-300 data-[state=active]:border-sky-400/30 data-[state=active]:bg-sky-400 data-[state=active]:text-slate-950"
							>
								{status}
							</Tabs.Trigger>
						{/each}
					</Tabs.List>
				</div>

				<div class="space-y-4">
					{#each goalsByStatus as group (group.status)}
						<Tabs.Content value={group.status} class="space-y-4">
							<Progress
								max={Math.max(1, data.goals.length)}
								value={group.goals.length}
								class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
							>
								<div class="flex items-center justify-between gap-3">
									<Progress.Label class="text-sm font-medium text-slate-200">
										{group.status} share
									</Progress.Label>
									<Progress.ValueText class="text-xs text-slate-500">
										{group.goals.length} of {data.goals.length} goals
									</Progress.ValueText>
								</div>
								<Progress.Track class="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
									<Progress.Range class="h-full rounded-full bg-sky-400" />
								</Progress.Track>
							</Progress>

							{#if group.goals.length > 0}
								<div class="space-y-3">
									{#each group.goals as goal (goal.id)}
										<article class="card border border-slate-800 bg-slate-900/60 p-4">
											<div class="flex flex-wrap items-start justify-between gap-3">
												<div>
													<h3 class="font-medium text-white">{goal.name}</h3>
													<p
														class="mt-1 text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase"
													>
														{goal.lane}
													</p>
												</div>
												<span
													class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
												>
													{goal.status}
												</span>
											</div>
											<p class="mt-3 text-sm text-slate-300">{goal.summary}</p>
											<p class="mt-3 text-xs text-slate-500">{goal.artifactPath}</p>
										</article>
									{/each}
								</div>
							{:else}
								<p
									class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
								>
									No goals are currently parked in the {group.status} lane.
								</p>
							{/if}
						</Tabs.Content>
					{/each}
				</div>
			</Tabs>
		</section>
	</div>
</section>
