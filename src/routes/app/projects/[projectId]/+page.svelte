<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();

	function taskStatusClass(status: string) {
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

	function goalStatusClass(status: string) {
		switch (status) {
			case 'done':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-300';
			case 'blocked':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-300';
			case 'running':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-300';
			case 'review':
				return 'border-sky-800/70 bg-sky-950/40 text-sky-200';
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div class="space-y-3">
			<a
				class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase transition hover:text-sky-200"
				href={resolve('/app/projects')}
			>
				Projects
			</a>
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="text-3xl font-semibold tracking-tight text-white">{data.project.name}</h1>
				<span
					class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
				>
					{data.project.lane}
				</span>
			</div>
			<p class="max-w-3xl text-sm text-slate-300">{data.project.summary}</p>
		</div>

		<div class="grid w-full gap-3 sm:grid-cols-2 lg:max-w-xl">
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Open tasks</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.metrics.activeTasks}</p>
				<p class="mt-2 text-sm text-slate-400">Related tasks that still need attention.</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Linked goals</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.metrics.goalCount}</p>
				<p class="mt-2 text-sm text-slate-400">
					Goals inferred from task links and artifact paths.
				</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Review tasks</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.metrics.reviewTasks}</p>
				<p class="mt-2 text-sm text-slate-400">Tasks currently waiting on explicit review.</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Blocked signals
				</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.metrics.blockedTasks}</p>
				<p class="mt-2 text-sm text-slate-400">Blocked tasks or tasks stalled by dependencies.</p>
			</article>
		</div>
	</div>

	<div class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
		<section class="space-y-6">
			<article class="card border border-slate-800 bg-slate-950/70 p-6">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
							Project defaults
						</p>
						<h2 class="mt-2 text-xl font-semibold text-white">Roots and repo context</h2>
					</div>
					<a
						class="rounded-full border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
						href={resolve('/app/projects')}
					>
						Edit in projects
					</a>
				</div>

				<div class="mt-5 space-y-4">
					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Project root folder
						</p>
						<p class="mt-2 text-sm break-all text-slate-200">
							{data.project.projectRootFolder || 'Not configured'}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Default artifact root
						</p>
						<p class="mt-2 text-sm break-all text-slate-200">
							{data.project.defaultArtifactRoot || 'Not configured'}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Default repo path
						</p>
						<p class="mt-2 text-sm break-all text-slate-200">
							{data.project.defaultRepoPath || 'Not configured'}
						</p>
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
							<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
								Default repo URL
							</p>
							<p class="mt-2 text-sm break-all text-slate-200">
								{data.project.defaultRepoUrl || 'Not configured'}
							</p>
						</div>
						<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
							<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
								Default branch
							</p>
							<p class="mt-2 text-sm text-slate-200">
								{data.project.defaultBranch || 'Not configured'}
							</p>
						</div>
					</div>
				</div>
			</article>

			<article class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Related goals
				</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Goals sharing this project context</h2>
				<p class="mt-2 text-sm text-slate-400">
					Goals appear here when a task links to them or when their artifact path falls under this
					project’s configured roots.
				</p>

				<div class="mt-5 space-y-4">
					{#if data.relatedGoals.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No goals map to this project yet.
						</p>
					{:else}
						{#each data.relatedGoals as goal (goal.id)}
							<article class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div>
										<div class="flex flex-wrap items-center gap-2">
											<h3 class="font-medium text-white">{goal.name}</h3>
											<span
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${goalStatusClass(goal.status)}`}
											>
												{goal.status}
											</span>
										</div>
										<p class="mt-2 text-sm text-slate-300">{goal.summary}</p>
									</div>
									<p class="text-xs text-slate-500">{goal.taskCount} linked task(s)</p>
								</div>
								<p class="mt-3 text-xs break-all text-slate-500">{goal.artifactPath}</p>
							</article>
						{/each}
					{/if}
				</div>
			</article>
		</section>

		<section class="card border border-slate-800 bg-slate-950/70 p-6">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
						Related tasks
					</p>
					<h2 class="mt-2 text-xl font-semibold text-white">Queued and active work</h2>
					<p class="mt-2 text-sm text-slate-400">
						Every task explicitly linked to this project, newest activity first.
					</p>
				</div>
				<a
					class="rounded-full border border-sky-800/70 bg-sky-950/40 px-3 py-2 text-xs font-medium text-sky-200 transition hover:border-sky-700 hover:text-white"
					href={resolve('/app/tasks')}
				>
					Open tasks board
				</a>
			</div>

			<div class="mt-5 space-y-4">
				{#if data.relatedTasks.length === 0}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
					>
						No tasks are linked to this project yet.
					</p>
				{:else}
					{#each data.relatedTasks as task (task.id)}
						<article class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div>
									<div class="flex flex-wrap items-center gap-2">
										<h3 class="font-medium text-white">{task.title}</h3>
										<span
											class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusClass(task.status)}`}
										>
											{task.status}
										</span>
										{#if task.hasUnmetDependencies}
											<span
												class="badge border border-rose-900/70 bg-rose-950/40 text-[0.7rem] tracking-[0.2em] text-rose-200 uppercase"
											>
												Dependency blocked
											</span>
										{/if}
									</div>
									<p class="mt-2 text-sm text-slate-300">{task.summary}</p>
								</div>
								<div class="text-left text-xs text-slate-500 sm:text-right">
									<p>Updated {task.updatedAtLabel}</p>
									<p class="mt-1 text-slate-400">{task.assigneeName}</p>
								</div>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-3">
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Goal</p>
									<p class="mt-2 text-sm text-white">{task.goalName}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Priority</p>
									<p class="mt-2 text-sm text-white">{task.priority}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Artifact path
									</p>
									<p class="mt-2 text-sm break-all text-white">
										{task.artifactPath || 'Not configured'}
									</p>
								</div>
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</section>
	</div>
</section>
