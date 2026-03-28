<script lang="ts">
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	let query = $state('');
	let selectedStatus = $state('all');

	let linkedTaskCount = $derived(data.tasks.filter((task) => task.projectId).length);
	let unassignedTaskCount = $derived(
		data.tasks.filter((task) => !task.assigneeWorkerId && task.status !== 'done').length
	);
	let openReviewCount = $derived(data.tasks.filter((task) => task.openReview).length);
	let pendingApprovalCount = $derived(data.tasks.filter((task) => task.pendingApproval).length);
	let createSuccess = $derived(form?.ok && form?.successAction === 'createTask');

	function statusClass(status: string) {
		switch (status) {
			case 'done':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-300';
			case 'blocked':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-300';
			case 'review':
				return 'border-sky-800/70 bg-sky-950/40 text-sky-200';
			case 'running':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-300';
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function compactText(value: string, maxLength = 120) {
		const normalized = value.replace(/\s+/g, ' ').trim();

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
	}

	function matchesTask(task: (typeof data.tasks)[number], term: string) {
		const normalizedTerm = term.trim().toLowerCase();

		if (!normalizedTerm) {
			return true;
		}

		return [
			task.title,
			task.summary,
			task.projectName,
			task.assigneeName,
			task.status,
			task.artifactPath
		]
			.join(' ')
			.toLowerCase()
			.includes(normalizedTerm);
	}

	let filteredTasks = $derived.by(() =>
		data.tasks.filter((task) => {
			if (selectedStatus !== 'all' && task.status !== selectedStatus) {
				return false;
			}

			return matchesTask(task, query);
		})
	);
	let activeTasks = $derived(filteredTasks.filter((task) => task.status !== 'done'));
	let completedTasks = $derived(filteredTasks.filter((task) => task.status === 'done'));
</script>

{#snippet taskTable(title: string, description: string, rows: (typeof data.tasks)[number][], emptyMessage: string)}
	<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 class="text-lg font-semibold text-white">{title}</h2>
				<p class="mt-1 text-sm text-slate-400">{description}</p>
			</div>
			<p class="text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">{rows.length} shown</p>
		</div>

		{#if rows.length === 0}
			<p
				class="mt-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400"
			>
				{emptyMessage}
			</p>
		{:else}
			<div class="mt-4 overflow-x-auto">
				<table class="min-w-[920px] divide-y divide-slate-800 text-left">
					<thead class="text-xs tracking-[0.16em] text-slate-500 uppercase">
						<tr>
							<th class="px-3 py-3 font-medium">Task</th>
							<th class="px-3 py-3 font-medium">Project</th>
							<th class="px-3 py-3 font-medium">Status</th>
							<th class="px-3 py-3 font-medium">Assignee</th>
							<th class="px-3 py-3 font-medium">Runs</th>
							<th class="px-3 py-3 font-medium">Updated</th>
							<th class="px-3 py-3 font-medium">Open</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-900/80">
						{#each rows as task (task.id)}
							<tr class="bg-slate-950/30 transition hover:bg-slate-900/60">
								<td class="px-3 py-3 align-top">
									<div class="max-w-sm">
										<p class="font-medium text-white">{task.title}</p>
										<p class="mt-1 text-sm text-slate-400">{compactText(task.summary)}</p>
										<div class="mt-2 flex flex-wrap gap-2">
											{#if task.openReview}
												<span
													class="inline-flex rounded-full border border-sky-800/70 bg-sky-950/40 px-2 py-1 text-[11px] text-sky-200 uppercase"
												>
													Review open
												</span>
											{/if}
											{#if task.pendingApproval}
												<span
													class="inline-flex rounded-full border border-amber-800/70 bg-amber-950/40 px-2 py-1 text-[11px] text-amber-200 uppercase"
												>
													Approval {task.pendingApproval.mode}
												</span>
											{/if}
										</div>
										{#if task.hasUnmetDependencies}
											<p class="mt-2 text-xs text-rose-300">Blocked by unmet dependencies</p>
										{/if}
									</div>
								</td>
								<td class="px-3 py-3 align-top text-sm text-slate-300">{task.projectName}</td>
								<td class="px-3 py-3 align-top">
									<span
										class={`inline-flex rounded-full border px-2 py-1 text-[11px] uppercase ${statusClass(task.status)}`}
									>
										{task.status}
									</span>
								</td>
								<td class="px-3 py-3 align-top text-sm text-slate-300">{task.assigneeName}</td>
								<td class="px-3 py-3 align-top">
									<p class="text-sm text-white">{task.runCount}</p>
									{#if task.latestRun?.sessionId}
										<a
											class="mt-1 inline-block text-xs text-sky-300 transition hover:text-sky-200"
											href={resolve(`/app/sessions/${task.latestRun.sessionId}`)}
										>
											Open latest session
										</a>
									{/if}
								</td>
								<td class="px-3 py-3 align-top">
									<p class="text-sm text-white">{task.updatedAtLabel}</p>
									<p class="mt-1 text-xs text-slate-500">
										{new Date(task.updatedAt).toLocaleString()}
									</p>
								</td>
								<td class="px-3 py-3 align-top">
									<a
										class="inline-flex rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
										href={resolve(`/app/tasks/${task.id}`)}
									>
										Open task
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
{/snippet}

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Tasks</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Browse the queue, then open one task</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Tasks should read like an operating queue. Scan by status, search for a specific brief, and
			use the detail page for editing, launching sessions, and deeper execution context.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Task count</p>
			<p class="mt-3 text-3xl font-semibold text-white">{data.tasks.length}</p>
			<p class="mt-2 text-sm text-slate-400">Every task currently stored in the control plane.</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Linked to projects
			</p>
			<p class="mt-3 text-3xl font-semibold text-white">{linkedTaskCount}</p>
			<p class="mt-2 text-sm text-slate-400">Tasks with an explicit project relationship.</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Open and unassigned
			</p>
			<p class="mt-3 text-3xl font-semibold text-white">{unassignedTaskCount}</p>
			<p class="mt-2 text-sm text-slate-400">Ready, blocked, or review tasks with no current owner.</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Governance queue
			</p>
			<p class="mt-3 text-3xl font-semibold text-white">{openReviewCount + pendingApprovalCount}</p>
			<p class="mt-2 text-sm text-slate-400">
				{openReviewCount} in review and {pendingApprovalCount} waiting on approval.
			</p>
		</article>
	</div>

	{#if form?.message}
		<p class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if createSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Task created and linked to its project.
		</p>
	{/if}

	{#if data.projects.length === 0}
		<section class="card rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
			<h2 class="text-xl font-semibold text-white">Create a project first</h2>
			<p class="mt-2 max-w-2xl text-sm text-slate-400">
				Tasks require a project link, so add at least one project before creating work items.
			</p>
			<a
				class="mt-4 inline-flex rounded-full border border-sky-800/70 bg-sky-950/40 px-4 py-2 text-sm font-medium text-sky-200 transition hover:border-sky-700 hover:text-white"
				href={resolve('/app/projects')}
			>
				Open projects
			</a>
		</section>
	{:else}
		<div class="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
			<form
				class="space-y-4 card border border-slate-800 bg-slate-950/70 p-6"
				method="POST"
				action="?/createTask"
			>
				<h2 class="text-xl font-semibold text-white">Create task</h2>
				<p class="text-sm text-slate-400">
					Add the brief here. Editing, launch controls, and run history live on the task detail page.
				</p>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
					<input
						class="input text-white placeholder:text-slate-500"
						name="name"
						placeholder="Build the first task creation flow"
						required
					/>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Project</span>
					<select class="select text-white" name="projectId" required>
						<option value="" disabled selected>Select a project</option>
						{#each data.projects as project (project.id)}
							<option value={project.id}>{project.name}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Assign to worker</span>
					<select class="select text-white" name="assigneeWorkerId">
						<option value="">Leave unassigned</option>
						{#each data.workers as worker (worker.id)}
							<option value={worker.id}>{worker.name}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Instructions</span>
					<textarea
						class="textarea min-h-40 text-white placeholder:text-slate-500"
						name="instructions"
						placeholder="Describe the work, expected outcome, and any constraints."
						required
					></textarea>
				</label>

				<button class="btn preset-filled-primary-500 font-semibold" type="submit">
					Create task
				</button>
			</form>

			<div class="space-y-6">
				<section class="card border border-slate-800 bg-slate-950/70 p-6">
					<div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
						<div>
							<h2 class="text-xl font-semibold text-white">Task index</h2>
							<p class="mt-1 text-sm text-slate-400">
								Search by task title, summary, project, assignee, or artifact path.
							</p>
						</div>

						<div class="flex w-full flex-col gap-3 xl:w-auto xl:items-end">
							<div class="w-full xl:w-80">
								<label class="sr-only" for="task-search">Search tasks</label>
								<input
									id="task-search"
									bind:value={query}
									class="input text-white placeholder:text-slate-500"
									placeholder="Search tasks"
								/>
							</div>

							<div class="flex flex-wrap gap-2">
								<button
									class={[
										'rounded-full border px-3 py-2 text-xs font-medium tracking-[0.14em] uppercase transition',
										selectedStatus === 'all'
											? 'border-sky-400/40 bg-sky-400 text-slate-950'
											: 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
									]}
									type="button"
									onclick={() => {
										selectedStatus = 'all';
									}}
								>
									All
								</button>

								{#each data.statusOptions as status (status)}
									<button
										class={[
											'rounded-full border px-3 py-2 text-xs font-medium tracking-[0.14em] uppercase transition',
											selectedStatus === status
												? 'border-sky-400/40 bg-sky-400 text-slate-950'
												: 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
										]}
										type="button"
										onclick={() => {
											selectedStatus = status;
										}}
									>
										{status}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</section>

				{@render taskTable(
					'Active queue',
					'Ready, running, review, and blocked work that still needs attention.',
					activeTasks,
					'No active tasks match the current filters.'
				)}

				{@render taskTable(
					'Completed work',
					'Finished tasks kept here for reference and session follow-up.',
					completedTasks,
					'No completed tasks match the current filters.'
				)}
			</div>
		</div>
	{/if}
</section>
