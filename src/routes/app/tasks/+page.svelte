<script lang="ts">
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	let linkedTaskCount = $derived(data.tasks.filter((task) => task.projectId).length);
	let unassignedTaskCount = $derived(
		data.tasks.filter((task) => !task.assigneeWorkerId && task.status !== 'done').length
	);
	let createSuccess = $derived(form?.ok && form?.successAction === 'createTask');
	let launchedTaskId = $derived(
		form?.successAction === 'launchTaskSession' ? (form.taskId?.toString() ?? '') : ''
	);
	let launchedSessionId = $derived(
		form?.successAction === 'launchTaskSession' ? (form.sessionId?.toString() ?? '') : ''
	);
	let updatedTaskId = $derived(
		form?.successAction === 'updateTask' ? (form.taskId?.toString() ?? '') : ''
	);

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
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Tasks</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Project-linked task board</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Create work from three durable inputs: a task name, clear instructions, and the project it
			belongs to. That keeps the queue usable without making operators fill in coordination fields
			up front.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
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
			<p class="mt-2 text-sm text-slate-400">
				Ready, blocked, or review tasks with no current owner.
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
	{:else if launchedTaskId}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Session started from the task. <a class="underline" href={resolve('/app/sessions')}
				>Open sessions</a
			>{#if launchedSessionId}
				to inspect `{launchedSessionId}`{/if}.
		</p>
	{/if}

	{#if data.projects.length === 0}
		<section class="card rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
			<h2 class="text-xl font-semibold text-white">Create a project first</h2>
			<p class="mt-2 max-w-2xl text-sm text-slate-400">
				Tasks now require a project link, so add at least one project before creating work items.
			</p>
			<a
				class="mt-4 inline-flex rounded-full border border-sky-800/70 bg-sky-950/40 px-4 py-2 text-sm font-medium text-sky-200 transition hover:border-sky-700 hover:text-white"
				href={resolve('/app/projects')}
			>
				Open projects
			</a>
		</section>
	{:else}
		<div class="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
			<form
				class="space-y-4 card border border-slate-800 bg-slate-950/70 p-6"
				method="POST"
				action="?/createTask"
			>
				<h2 class="text-xl font-semibold text-white">Create task</h2>
				<p class="text-sm text-slate-400">
					Add the task in plain language first. Operational metadata can evolve later if the queue
					needs more structure.
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

				<button class="btn preset-filled-primary-500 font-semibold" type="submit"
					>Create task</button
				>
			</form>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<div class="flex flex-col gap-2">
					<h2 class="text-xl font-semibold text-white">Current tasks</h2>
					<p class="text-sm text-slate-400">
						Edit the core task brief in place. Project and status are the only required control
						fields on this board.
					</p>
				</div>

				<div class="mt-4 space-y-4">
					{#if data.tasks.length === 0}
						<p
							class="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-sm text-slate-400"
						>
							No tasks yet. Create the first one from the form on the left.
						</p>
					{:else}
						{#each data.tasks as task (task.id)}
							<form
								class="space-y-4 card border border-slate-800 bg-slate-900/60 p-4"
								method="POST"
								action="?/updateTask"
							>
								<input name="taskId" type="hidden" value={task.id} />

								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="flex flex-wrap items-center gap-2">
										<span
											class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${statusClass(task.status)}`}
										>
											{task.status}
										</span>
										<span
											class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
										>
											{task.projectName}
										</span>
										{#if updatedTaskId === task.id}
											<span
												class="badge border border-emerald-900/70 bg-emerald-950/40 text-[0.7rem] tracking-[0.2em] text-emerald-200 uppercase"
											>
												Saved
											</span>
										{/if}
									</div>

									<p class="text-xs text-slate-500">Assignee: {task.assigneeName}</p>
								</div>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
									<input
										class="input text-white placeholder:text-slate-500"
										name="name"
										required
										value={task.title}
									/>
								</label>

								<div class="grid gap-4 lg:grid-cols-[1fr_220px]">
									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">Project</span>
										<select class="select text-white" name="projectId" required>
											{#each data.projects as project (project.id)}
												<option value={project.id} selected={task.projectId === project.id}>
													{project.name}
												</option>
											{/each}
										</select>
									</label>

									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
										<select class="select text-white" name="status">
											{#each data.statusOptions as status (status)}
												<option value={status} selected={task.status === status}>{status}</option>
											{/each}
										</select>
									</label>
								</div>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Assigned worker</span>
									<select class="select text-white" name="assigneeWorkerId">
										<option value="" selected={!task.assigneeWorkerId}>Unassigned</option>
										{#each data.workers as worker (worker.id)}
											<option value={worker.id} selected={task.assigneeWorkerId === worker.id}>
												{worker.name}
											</option>
										{/each}
									</select>
								</label>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200">Instructions</span>
									<textarea
										class="textarea min-h-32 text-white placeholder:text-slate-500"
										name="instructions"
										required>{task.summary}</textarea
									>
								</label>

								<div class="space-y-2 text-xs text-slate-500">
									<p>Created {new Date(task.createdAt).toLocaleString()}</p>
									<p>Current worker: {task.assigneeName}</p>
									{#if task.artifactPath}
										<p class="break-all">Default output path: {task.artifactPath}</p>
									{/if}
								</div>

								<div class="flex flex-col gap-3 sm:flex-row">
									<button
										class="btn border border-slate-700 font-semibold text-slate-100"
										type="submit"
									>
										Save task
									</button>

									<button
										class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-200"
										type="submit"
										formaction="?/launchTaskSession"
									>
										Start session
									</button>
								</div>
							</form>
						{/each}
					{/if}
				</div>
			</section>
		</div>
	{/if}
</section>
