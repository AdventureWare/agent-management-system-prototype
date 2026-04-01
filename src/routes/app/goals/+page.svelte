<script lang="ts">
	import { resolve } from '$app/paths';
	import GoalEditor from '$lib/components/GoalEditor.svelte';
	import { formatGoalStatusLabel, goalStatusToneClass } from '$lib/types/control-plane';

	let { data, form } = $props();

	let query = $state('');
	let selectedStatus = $state('all');

	function modalShouldStartOpen() {
		return Boolean(form?.message);
	}

	let isCreateModalOpen = $state(modalShouldStartOpen());

	let createSuccess = $derived(form?.ok && form?.successAction === 'createGoal');
	let nestedGoalCount = $derived(data.goals.filter((goal) => goal.childGoalCount > 0).length);
	let linkedTaskCount = $derived(
		data.goals.reduce((count, goal) => count + goal.relatedTaskCount, 0)
	);
	let fullyScopedGoalCount = $derived(
		data.goals.filter((goal) => goal.linkedProjects.length > 0 && goal.relatedTaskCount > 0).length
	);

	function closeCreateModal() {
		isCreateModalOpen = false;
	}

	function matchesGoal(goal: (typeof data.goals)[number], term: string) {
		const normalizedTerm = term.trim().toLowerCase();

		if (!normalizedTerm) {
			return true;
		}

		return [
			goal.name,
			goal.summary,
			goal.parentGoalName,
			goal.horizon,
			goal.successSignal,
			goal.artifactPath,
			...goal.linkedProjects.map((project) => project.name),
			...goal.linkedTasks.map((task) => `${task.title} ${task.projectName}`),
			...goal.childGoals.map((childGoal) => childGoal.name)
		]
			.join(' ')
			.toLowerCase()
			.includes(normalizedTerm);
	}

	let filteredGoals = $derived(
		data.goals.filter(
			(goal) =>
				(selectedStatus === 'all' || goal.status === selectedStatus) && matchesGoal(goal, query)
		)
	);
</script>

<svelte:document
	onkeydown={(event) => {
		if (event.key === 'Escape' && isCreateModalOpen) {
			closeCreateModal();
		}
	}}
/>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Goals</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Browse outcomes, then manage one</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Goals now work like projects: the collection page helps you find the right outcome, while each
			goal has its own detail page for editing workspace, parent/subgoal structure, and linked work.
		</p>
		<div class="pt-1">
			<button
				class="btn preset-filled-primary-500 font-semibold"
				type="button"
				onclick={() => {
					isCreateModalOpen = true;
				}}
			>
				Add goal
			</button>
		</div>
	</div>

	{#if form?.message}
		<p
			aria-live="polite"
			class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
		>
			{form.message}
		</p>
	{/if}

	{#if createSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Goal created and relationship links saved.
		</p>
	{/if}

	<div class="grid gap-4 md:grid-cols-4">
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Goal count</p>
			<p class="mt-3 text-3xl font-semibold text-white">{data.goals.length}</p>
			<p class="mt-2 text-sm text-slate-400">Durable outcomes tracked in the control plane.</p>
		</article>
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Nested goals</p>
			<p class="mt-3 text-3xl font-semibold text-white">{nestedGoalCount}</p>
			<p class="mt-2 text-sm text-slate-400">Goals already grouped into parent/subgoal structure.</p>
		</article>
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Linked tasks</p>
			<p class="mt-3 text-3xl font-semibold text-white">{linkedTaskCount}</p>
			<p class="mt-2 text-sm text-slate-400">Tasks currently assigned to a goal from the goal layer.</p>
		</article>
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Fully scoped</p>
			<p class="mt-3 text-3xl font-semibold text-white">{fullyScopedGoalCount}</p>
			<p class="mt-2 text-sm text-slate-400">Goals with both project context and linked task execution.</p>
		</article>
	</div>

	<section class="card border border-slate-800 bg-slate-950/70 p-6">
		<div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
			<div>
				<h2 class="text-xl font-semibold text-white">Goal directory</h2>
				<p class="mt-1 text-sm text-slate-400">
					Search by outcome, related project, task, or workspace, then open a goal to manage it.
				</p>
			</div>

			<div class="grid gap-3 sm:grid-cols-2 xl:w-[34rem]">
				<label class="block">
					<span class="sr-only">Search goals</span>
					<input
						bind:value={query}
						class="input text-white placeholder:text-slate-500"
						id="goal-search"
						placeholder="Search goals…"
					/>
				</label>

				<label class="block">
					<span class="sr-only">Filter goals by status</span>
					<select bind:value={selectedStatus} class="select text-white">
						<option value="all">All statuses</option>
						{#each data.statusOptions as status (status)}
							<option value={status}>{formatGoalStatusLabel(status)}</option>
						{/each}
					</select>
				</label>
			</div>
		</div>

		{#if filteredGoals.length === 0}
			<p class="mt-6 rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
				No goals match the current search or status filter.
			</p>
		{:else}
			<div class="mt-6 grid gap-4 lg:grid-cols-2">
				{#each filteredGoals as goal (goal.id)}
					<a
						class="group flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-400/40 hover:bg-slate-900"
						href={resolve(`/app/goals/${goal.id}`)}
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 space-y-2">
								<div class="flex flex-wrap items-center gap-2">
									<h3
										class="ui-wrap-anywhere text-lg font-semibold text-white transition group-hover:text-sky-200"
									>
										{goal.name}
									</h3>
									<span
										class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${goalStatusToneClass(goal.status)}`}
									>
										{formatGoalStatusLabel(goal.status)}
									</span>
								</div>
								<p class="text-xs font-semibold tracking-[0.2em] text-sky-300 uppercase">
									{goal.lane}
								</p>
								<p class="ui-clamp-3 text-sm text-slate-300">{goal.summary}</p>
							</div>
							<p class="text-xs text-slate-500">
								{goal.parentGoalName ? `Child of ${goal.parentGoalName}` : 'Top level'}
							</p>
						</div>

						<div class="mt-4 grid gap-3 sm:grid-cols-3">
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Subgoals</p>
								<p class="mt-2 text-lg font-semibold text-white">{goal.childGoalCount}</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Projects</p>
								<p class="mt-2 text-lg font-semibold text-white">{goal.linkedProjects.length}</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Tasks</p>
								<p class="mt-2 text-lg font-semibold text-white">{goal.relatedTaskCount}</p>
							</div>
						</div>

						<div class="mt-4 space-y-2 text-sm text-slate-400">
							{#if goal.horizon}
								<p class="ui-clamp-2">
									<span class="text-slate-500">Horizon:</span>
									{goal.horizon}
								</p>
							{/if}
							<p class="ui-clamp-2">
								<span class="text-slate-500">Workspace:</span>
								{goal.artifactPath || 'Not configured'}
							</p>
						</div>

						{#if goal.linkedProjects.length > 0}
							<div class="mt-4 flex flex-wrap gap-2">
								{#each goal.linkedProjects.slice(0, 3) as project (project.id)}
									<span
										class="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs text-slate-300"
									>
										{project.name}
									</span>
								{/each}
								{#if goal.linkedProjects.length > 3}
									<span
										class="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs text-slate-400"
									>
										+{goal.linkedProjects.length - 3} more
									</span>
								{/if}
							</div>
						{/if}

						<div
							class="mt-5 flex items-center justify-between border-t border-slate-800 pt-4 text-xs font-medium tracking-[0.16em] text-slate-500 uppercase"
						>
							<span>{goal.relatedTaskCount > 0 ? 'Execution linked' : 'Needs linked execution'}</span>
							<span class="text-sky-300 transition group-hover:text-sky-200">Open details</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</section>
</section>

{#if isCreateModalOpen}
	<div
		aria-label="Create goal dialog"
		aria-modal="true"
		class="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm"
		role="dialog"
		tabindex="-1"
		onclick={(event) => {
			if (event.target === event.currentTarget) {
				closeCreateModal();
			}
		}}
		onkeydown={(event) => {
			if (event.key === 'Escape') {
				closeCreateModal();
			}
		}}
	>
		<div class="mx-auto flex min-h-full max-w-6xl items-center justify-center p-4 sm:p-6">
			<div
				class="max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-black/40 sm:p-8"
			>
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 class="text-xl font-semibold text-white sm:text-2xl">Add goal</h2>
						<p class="mt-2 max-w-2xl text-sm text-slate-400">
							Capture the outcome in one place, then use the same relationship controls you’ll see
							on the goal detail page.
						</p>
					</div>
					<button
						aria-label="Close add goal form"
						class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:border-slate-600 hover:text-white"
						type="button"
						onclick={closeCreateModal}
					>
						×
					</button>
				</div>

				<div class="mt-6">
					<GoalEditor
						action="?/createGoal"
						description="Outcome first, relationships second. You can keep the workspace blank if the linked context already tells the system where the goal should live."
						folderOptions={data.folderOptions}
						heading="Create goal"
						laneOptions={data.laneOptions}
						parentGoalOptions={data.parentGoalOptions}
						projectOptions={data.projectOptions}
						statusOptions={data.statusOptions}
						submitLabel="Create goal"
						taskOptions={data.taskOptions}
						values={form?.values ?? {}}
					/>
				</div>
			</div>
		</div>
	</div>
{/if}
