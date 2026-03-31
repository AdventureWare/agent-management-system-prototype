<script lang="ts">
	import { resolve } from '$app/paths';
	import SessionActivityIndicator from '$lib/components/SessionActivityIndicator.svelte';
	import { formatTaskStatusLabel } from '$lib/types/control-plane';

	let { data, form } = $props();

	let query = $state('');
	let selectedStatus = $state('all');
	let selectedTaskIds = $state.raw<string[]>([]);

	let ideationSuccess = $derived(form?.ok && form?.successAction === 'runTaskIdeationAssistant');
	let createSuccess = $derived(form?.ok && form?.successAction === 'createTask');
	let ideationDraftCreateCount = $derived(
		form?.ok && form?.successAction === 'createDraftTasksFromIdeation'
			? Number(form.createdCount ?? 0)
			: 0
	);
	let ideationDraftCreateSuccess = $derived(ideationDraftCreateCount > 0);
	let deleteCount = $derived.by(() => {
		if (form?.ok && form?.successAction === 'deleteTasks') {
			return Number(form.deletedCount ?? 0);
		}

		return data.deleted ? 1 : 0;
	});
	let deleteSuccess = $derived(deleteCount > 0);

	function statusClass(status: string) {
		switch (status) {
			case 'done':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-300';
			case 'blocked':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-300';
			case 'review':
				return 'border-sky-800/70 bg-sky-950/40 text-sky-200';
			case 'in_progress':
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

	function confidenceClass(confidence: 'high' | 'medium' | 'low') {
		switch (confidence) {
			case 'high':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'medium':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
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
			task.artifactPath,
			...task.attachments.map((attachment) => `${attachment.name} ${attachment.path}`),
			task.statusThread?.name ?? '',
			task.statusThread?.sessionState ?? ''
		]
			.join(' ')
			.toLowerCase()
			.includes(normalizedTerm);
	}

	function threadActionLabel(task: (typeof data.tasks)[number]) {
		if (!task.linkThread) {
			return '';
		}

		if (task.statusThread?.id === task.linkThread.id) {
			switch (task.statusThread.sessionState) {
				case 'starting':
				case 'waiting':
				case 'working':
					return 'Open active thread';
			}
		}

		return task.linkThreadKind === 'latest' ? 'Open latest thread' : 'Open assigned thread';
	}

	function isTaskSelected(taskId: string) {
		return selectedTaskIds.includes(taskId);
	}

	function toggleTaskSelection(taskId: string, checked: boolean) {
		if (checked) {
			selectedTaskIds = isTaskSelected(taskId) ? selectedTaskIds : [...selectedTaskIds, taskId];
			return;
		}

		selectedTaskIds = selectedTaskIds.filter((candidate) => candidate !== taskId);
	}

	function setSelectionForRows(rows: (typeof data.tasks)[number][], checked: boolean) {
		const rowIds = rows.map((task) => task.id);
		const rowIdSet = new Set(rowIds);

		if (checked) {
			selectedTaskIds = [...new Set([...selectedTaskIds, ...rowIds])];
			return;
		}

		selectedTaskIds = selectedTaskIds.filter((taskId) => !rowIdSet.has(taskId));
	}

	function areAllRowsSelected(rows: (typeof data.tasks)[number][]) {
		return rows.length > 0 && rows.every((task) => isTaskSelected(task.id));
	}

	function clearSelection() {
		selectedTaskIds = [];
	}

	$effect(() => {
		const nextSelectedTaskIds = selectedTaskIds.filter((taskId) =>
			data.tasks.some((task) => task.id === taskId)
		);

		if (
			nextSelectedTaskIds.length === selectedTaskIds.length &&
			nextSelectedTaskIds.every((taskId, index) => taskId === selectedTaskIds[index])
		) {
			return;
		}

		selectedTaskIds = nextSelectedTaskIds;
	});

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

{#snippet taskTable(
	title: string,
	description: string,
	rows: (typeof data.tasks)[number][],
	emptyMessage: string
)}
	<section class="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 class="text-lg font-semibold text-white">{title}</h2>
				<p class="mt-1 text-sm text-slate-400">{description}</p>
			</div>
			<p class="text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">
				{rows.length} shown
			</p>
		</div>

		{#if rows.length === 0}
			<p
				class="mt-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400"
			>
				{emptyMessage}
			</p>
		{:else}
			<div class="mt-4 overflow-x-auto">
				<table class="min-w-[980px] divide-y divide-slate-800 text-left">
					<thead class="text-xs tracking-[0.16em] text-slate-500 uppercase">
						<tr>
							<th class="px-3 py-3 font-medium">
								<label class="flex items-center justify-center">
									<span class="sr-only">Select all shown tasks</span>
									<input
										checked={areAllRowsSelected(rows)}
										class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
										type="checkbox"
										onchange={(event) => {
											setSelectionForRows(rows, event.currentTarget.checked);
										}}
									/>
								</label>
							</th>
							<th class="px-3 py-3 font-medium">Task</th>
							<th class="px-3 py-3 font-medium">Project</th>
							<th class="px-3 py-3 font-medium">Status</th>
							<th class="px-3 py-3 font-medium">Assignee</th>
							<th class="px-3 py-3 font-medium">Runs</th>
							<th class="px-3 py-3 font-medium">Updated</th>
							<th class="px-3 py-3 font-medium">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-900/80">
						{#each rows as task (task.id)}
							<tr class="bg-slate-950/30 transition hover:bg-slate-900/60">
								<td class="px-3 py-3 align-top">
									<label class="flex items-center justify-center">
										<span class="sr-only">Select {task.title}</span>
										<input
											checked={isTaskSelected(task.id)}
											class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
											type="checkbox"
											onchange={(event) => {
												toggleTaskSelection(task.id, event.currentTarget.checked);
											}}
										/>
									</label>
								</td>
								<td class="px-3 py-3 align-top">
									<div class="max-w-sm min-w-0">
										<p class="ui-clamp-2 font-medium text-white">{task.title}</p>
										<p class="ui-clamp-3 mt-1 text-sm text-slate-400">
											{compactText(task.summary)}
										</p>
										<div class="mt-2 flex flex-wrap gap-2">
											{#if task.openReview}
												<span
													class="inline-flex items-center justify-center rounded-full border border-sky-800/70 bg-sky-950/40 px-2 py-1 text-center text-[11px] leading-none text-sky-200 uppercase"
												>
													Review open
												</span>
											{/if}
											{#if task.pendingApproval}
												<span
													class="inline-flex items-center justify-center rounded-full border border-amber-800/70 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
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
								<td class="px-3 py-3 align-top text-sm text-slate-300">
									<p class="ui-wrap-anywhere max-w-40">{task.projectName}</p>
								</td>
								<td class="px-3 py-3 align-top">
									<div class="min-w-52 space-y-3">
										<span
											class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${statusClass(task.status)}`}
										>
											{formatTaskStatusLabel(task.status)}
										</span>
										{#if task.statusThread}
											<div class="rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2">
												<SessionActivityIndicator compact session={task.statusThread} />
											</div>
										{/if}
									</div>
								</td>
								<td class="px-3 py-3 align-top text-sm text-slate-300">
									<p class="ui-wrap-anywhere max-w-40">{task.assigneeName}</p>
								</td>
								<td class="px-3 py-3 align-top">
									<p class="text-sm text-white">{task.runCount}</p>
									{#if task.statusThread}
										<p class="ui-wrap-anywhere mt-1 max-w-40 text-xs text-slate-500">
											{task.statusThread.name}
										</p>
									{/if}
								</td>
								<td class="px-3 py-3 align-top">
									<p class="text-sm text-white">{task.updatedAtLabel}</p>
									<p class="mt-1 text-xs text-slate-500">
										{new Date(task.updatedAt).toLocaleString()}
									</p>
								</td>
								<td class="px-3 py-3 align-top">
									<div class="flex min-w-40 flex-col items-start gap-2">
										<a
											class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
											href={resolve(`/app/tasks/${task.id}`)}
										>
											Open task
										</a>
										{#if task.linkThread}
											<a
												class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
												href={resolve(`/app/sessions/${task.linkThread.id}`)}
											>
												{threadActionLabel(task)}
											</a>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
{/snippet}

<section class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Tasks</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">
			Browse the queue, then open one task
		</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Tasks should read like an operating queue. Scan by status, search for a specific brief, and
			use the detail page for editing, launching threads, and deeper execution context.
		</p>
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
	{:else if ideationSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Task ideation queued for {form?.projectName?.toString() || 'the selected project'}.
			{#if form?.sessionId}
				<a class="underline" href={resolve(`/app/sessions/${form.sessionId.toString()}`)}>
					Open thread details
				</a>
				to review the suggested tasks.
			{/if}
		</p>
	{:else if ideationDraftCreateSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			{ideationDraftCreateCount === 1
				? `1 draft task created for ${form?.projectName?.toString() || 'the selected project'}.`
				: `${ideationDraftCreateCount} draft tasks created for ${form?.projectName?.toString() || 'the selected project'}.`}
		</p>
	{:else if deleteSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			{deleteCount === 1
				? 'Task deleted and removed from the queue.'
				: `${deleteCount} tasks deleted and removed from the queue.`}
		</p>
	{/if}

	{#if data.projects.length === 0}
		<section class="card rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
			<h2 class="text-xl font-semibold text-white">Create a project first</h2>
			<p class="mt-2 max-w-2xl text-sm text-slate-400">
				Tasks require a project link, so add at least one project before creating work items.
			</p>
			<a
				class="mt-4 inline-flex items-center justify-center rounded-full border border-sky-800/70 bg-sky-950/40 px-4 py-2 text-center text-sm leading-none font-medium text-sky-200 transition hover:border-sky-700 hover:text-white"
				href={resolve('/app/projects')}
			>
				Open projects
			</a>
		</section>
	{:else}
		<div class="grid gap-6 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
			<div class="min-w-0 space-y-6">
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
										'inline-flex items-center justify-center rounded-full border px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] uppercase transition',
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
											'inline-flex items-center justify-center rounded-full border px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] uppercase transition',
											selectedStatus === status
												? 'border-sky-400/40 bg-sky-400 text-slate-950'
												: 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
										]}
										type="button"
										onclick={() => {
											selectedStatus = status;
										}}
									>
										{formatTaskStatusLabel(status)}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</section>

				<section class="card border border-slate-800 bg-slate-950/70 p-6">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 class="text-xl font-semibold text-white">Bulk actions</h2>
							<p class="mt-1 text-sm text-slate-400">
								Select tasks from the queue to remove them in one pass.
							</p>
						</div>

						<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
							<p class="text-sm text-slate-300">
								{selectedTaskIds.length === 0
									? 'No tasks selected'
									: `${selectedTaskIds.length} task${selectedTaskIds.length === 1 ? '' : 's'} selected`}
							</p>
							{#if selectedTaskIds.length > 0}
								<button
									class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-600 hover:text-white"
									type="button"
									onclick={clearSelection}
								>
									Clear selection
								</button>
								<form method="POST" action="?/deleteTasks">
									{#each selectedTaskIds as taskId (taskId)}
										<input name="taskId" type="hidden" value={taskId} />
									{/each}
									<button
										class="inline-flex items-center justify-center rounded-full border border-rose-800/70 bg-rose-950/40 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-rose-200 uppercase transition hover:border-rose-700 hover:text-white"
										type="submit"
									>
										Delete selected
									</button>
								</form>
							{/if}
						</div>
					</div>
				</section>

				{@render taskTable(
					'Active queue',
					'Draft, ready, in-progress, review, and blocked work that still needs attention.',
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

			<div class="min-w-0 space-y-6">
				<form
					class="space-y-4 card border border-slate-800 bg-slate-950/70 p-6"
					method="POST"
					action="?/runTaskIdeationAssistant"
				>
					<div class="space-y-2">
						<p class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase">
							Task ideation
						</p>
						<h2 class="text-xl font-semibold text-white">Need more tasks to queue?</h2>
						<p class="text-sm text-slate-400">
							Run a reusable assistant thread that inspects a project, reviews its task history, and
							proposes additional task ideas before you create them manually.
						</p>
					</div>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Project</span>
						<select class="select text-white" name="projectId" required>
							<option value="" disabled selected>Select a project</option>
							{#each data.projects as project (project.id)}
								<option value={project.id}>{project.name}</option>
							{/each}
						</select>
					</label>

					<p
						class="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300"
					>
						The assistant uses the selected project’s configured workspace plus its existing tasks,
						runs, goals, and related project context. If a resumable ideation thread already exists,
						this reuses it instead of starting from scratch.
					</p>

					<button
						class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-200"
						type="submit"
					>
						Run task ideation assistant
					</button>
				</form>

				<section class="card border border-slate-800 bg-slate-950/70 p-6">
					<div class="space-y-2">
						<p class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase">
							Ideation review
						</p>
						<h2 class="text-xl font-semibold text-white">Create drafts from ideation output</h2>
						<p class="text-sm text-slate-400">
							Review each project’s latest ideation reply here, then create only the suggestions you
							want as draft tasks.
						</p>
					</div>

					{#if data.ideationReviews.length === 0}
						<p
							class="mt-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-5 text-sm text-slate-400"
						>
							Run the ideation assistant first. Its latest saved reply will appear here for review.
						</p>
					{:else}
						<div class="mt-4 space-y-4">
							{#each data.ideationReviews as review (review.sessionId)}
								<form
									class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
									method="POST"
									action="?/createDraftTasksFromIdeation"
								>
									<input name="sessionId" type="hidden" value={review.sessionId} />

									<div class="flex flex-col gap-3">
										<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
											<div>
												<h3 class="text-base font-semibold text-white">{review.projectName}</h3>
												<p class="mt-1 text-sm text-slate-400">{review.sessionSummary}</p>
											</div>
											<a
												class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
												href={resolve(`/app/sessions/${review.sessionId}`)}
											>
												Open thread
											</a>
										</div>

										<div class="flex flex-wrap gap-2 text-xs text-slate-300">
											<span class="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1">
												{review.suggestionCount} suggestion{review.suggestionCount === 1 ? '' : 's'}
											</span>
											<span class="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1">
												Last activity {review.lastActivityLabel}
											</span>
											<span class="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1">
												Default role {review.defaultDraftRoleName}
											</span>
										</div>

										<p
											class="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300"
										>
											Selected suggestions become <span class="font-medium text-white"
												>In Draft</span
											>{' '}
											tasks in <span class="font-medium text-white">{review.projectName}</span> with
											default routing to
											<span class="font-medium text-white"> {review.defaultDraftRoleName}</span>
											{#if review.defaultArtifactPath}
												and artifact path
												<span class="ui-wrap-anywhere font-medium text-white">
													{review.defaultArtifactPath}
												</span>.
											{:else}
												.
											{/if}
										</p>
									</div>

									{#if review.suggestionCount === 0}
										<p
											class="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-4 text-sm text-slate-400"
										>
											{review.hasActiveRun
												? 'The ideation run is still active. Wait for a saved assistant reply, then refresh or reopen this page.'
												: 'The latest saved reply did not match the expected suggestion format. Open the thread to review the raw output.'}
										</p>
									{:else}
										<div class="space-y-3">
											{#each review.suggestions as suggestion (suggestion.index)}
												<label
													class="block rounded-2xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-slate-700"
												>
													<div class="flex items-start gap-3">
														<input
															class="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400"
															name="suggestionIndex"
															type="checkbox"
															value={suggestion.index}
														/>
														<div class="min-w-0 flex-1">
															<div class="flex flex-wrap items-center gap-2">
																<h4 class="font-medium text-white">{suggestion.title}</h4>
																<span
																	class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${confidenceClass(suggestion.confidence)}`}
																>
																	{suggestion.confidence} confidence
																</span>
															</div>
															<p class="mt-2 text-sm text-slate-300">
																{suggestion.whyItMatters}
															</p>
															<div class="mt-3 space-y-2 text-sm">
																<div>
																	<p
																		class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase"
																	>
																		Draft summary
																	</p>
																	<p class="mt-1 whitespace-pre-wrap text-slate-300">
																		{suggestion.suggestedInstructions}
																	</p>
																</div>
																<div>
																	<p
																		class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase"
																	>
																		Signals
																	</p>
																	<p class="mt-1 whitespace-pre-wrap text-slate-400">
																		{suggestion.signals}
																	</p>
																</div>
															</div>
														</div>
													</div>
												</label>
											{/each}
										</div>

										<button
											class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-200"
											type="submit"
										>
											Create selected draft tasks
										</button>
									{/if}
								</form>
							{/each}
						</div>
					{/if}
				</section>

				<form
					class="min-w-0 space-y-4 card border border-slate-800 bg-slate-950/70 p-6"
					method="POST"
					action="?/createTask"
				>
					<h2 class="text-xl font-semibold text-white">Create task</h2>
					<p class="text-sm text-slate-400">
						Add the brief here. Editing, launch controls, and run history live on the task detail
						page.
					</p>

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
						<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
						<input
							class="input text-white placeholder:text-slate-500"
							name="name"
							placeholder="Build the first task creation flow"
							required
						/>
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
			</div>
		</div>
	{/if}
</section>
