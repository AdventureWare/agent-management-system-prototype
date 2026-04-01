<script lang="ts">
	import { resolve } from '$app/paths';
	import PathField from '$lib/components/PathField.svelte';
	import {
		formatGoalStatusLabel,
		formatTaskApprovalModeLabel,
		formatTaskStatusLabel,
		goalStatusToneClass,
		taskStatusToneClass
	} from '$lib/types/control-plane';

	let { data, form } = $props();

	let updateSuccess = $derived(form?.ok && form?.successAction === 'updateProject');
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div class="min-w-0 space-y-3">
			<a
				class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase transition hover:text-sky-200"
				href={resolve('/app/projects')}
			>
				Projects
			</a>
			<h1 class="ui-wrap-anywhere text-3xl font-semibold tracking-tight text-white">
				{data.project.name}
			</h1>
			<p class="ui-wrap-anywhere max-w-3xl text-sm text-slate-300">{data.project.summary}</p>
		</div>

		<div class="grid w-full gap-3 sm:grid-cols-2 lg:max-w-4xl xl:grid-cols-3">
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Open tasks</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.metrics.activeTasks}</p>
				<p class="mt-2 text-sm text-slate-400">Related tasks that still need attention.</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Linked goals</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.metrics.goalCount}</p>
				<p class="mt-2 text-sm text-slate-400">Goals inferred from tasks and artifact paths.</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Review tasks</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.metrics.reviewTasks}</p>
				<p class="mt-2 text-sm text-slate-400">Tasks currently waiting on explicit review.</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Pending approvals
				</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.metrics.pendingApprovals}</p>
				<p class="mt-2 text-sm text-slate-400">Tasks stalled on an approval gate.</p>
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

	{#if form?.message}
		<p class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if updateSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Project updates saved.
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
		<section class="space-y-6">
			<form
				class="space-y-4 card border border-slate-800 bg-slate-950/70 p-6"
				method="POST"
				action="?/updateProject"
			>
				<div class="space-y-2">
					<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
						Project details
					</p>
					<h2 class="text-xl font-semibold text-white">Edit defaults and repo context</h2>
					<p class="text-sm text-slate-400">
						Collection pages help you find the project. This page holds the actual project setup.
					</p>
				</div>

				<div class="grid gap-4 lg:grid-cols-2">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
						<input class="input text-white" name="name" required value={data.project.name} />
					</label>
				</div>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Summary</span>
					<textarea class="textarea min-h-28 text-white" name="summary" required
						>{data.project.summary}</textarea
					>
				</label>

				<div class="grid gap-4 lg:grid-cols-2">
					<div>
						<PathField
							createMode="folder"
							helperText="Agents will start here when this project is selected later."
							inputId={`project-root-folder-${data.project.id}`}
							label="Project root folder"
							name="projectRootFolder"
							options={data.folderOptions}
							placeholder="/absolute/path/to/project/root"
							value={data.project.projectRootFolder}
						/>
					</div>

					<div>
						<PathField
							createMode="folder"
							helperText="Create the shared artifact folder if you want it reserved now."
							inputId={`project-artifact-root-${data.project.id}`}
							label="Default artifact root"
							name="defaultArtifactRoot"
							options={data.folderOptions}
							placeholder="/absolute/path/to/project/artifacts"
							value={data.project.defaultArtifactRoot}
						/>
					</div>

					<div>
						<PathField
							createMode="folder"
							helperText="Creates the checkout folder if the repo is not cloned yet."
							inputId={`project-repo-path-${data.project.id}`}
							label="Default repo path"
							name="defaultRepoPath"
							options={data.folderOptions}
							placeholder="/absolute/path/to/local/checkout"
							value={data.project.defaultRepoPath}
						/>
					</div>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Default repo URL</span>
						<input
							class="input text-white placeholder:text-slate-500"
							name="defaultRepoUrl"
							placeholder="git@github.com:org/repo.git"
							value={data.project.defaultRepoUrl}
						/>
					</label>
				</div>

				<div class="flex flex-wrap items-end justify-between gap-3">
					<label class="block w-full max-w-xs">
						<span class="mb-2 block text-sm font-medium text-slate-200">Default branch</span>
						<input
							class="input text-white placeholder:text-slate-500"
							name="defaultBranch"
							placeholder="main"
							value={data.project.defaultBranch}
						/>
					</label>

					<label class="block w-full max-w-xs">
						<span class="mb-2 block text-sm font-medium text-slate-200">
							Default thread sandbox
						</span>
						<select class="select text-white" name="defaultThreadSandbox">
							<option value="" selected={!data.project.defaultThreadSandbox}>
								Inherit provider default
							</option>
							{#each data.sandboxOptions as sandbox (sandbox)}
								<option value={sandbox} selected={data.project.defaultThreadSandbox === sandbox}>
									{sandbox}
								</option>
							{/each}
						</select>
					</label>

					<button class="btn preset-filled-primary-500 font-semibold" type="submit">
						Save project
					</button>
				</div>
			</form>

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
						Back to directory
					</a>
				</div>

				<div class="mt-5 space-y-4">
					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Project root folder
						</p>
						<p class="ui-wrap-anywhere mt-2 text-sm text-slate-200">
							{data.project.projectRootFolder || 'Not configured'}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Default artifact root
						</p>
						<p class="ui-wrap-anywhere mt-2 text-sm text-slate-200">
							{data.project.defaultArtifactRoot || 'Not configured'}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Default repo path
						</p>
						<p class="ui-wrap-anywhere mt-2 text-sm text-slate-200">
							{data.project.defaultRepoPath || 'Not configured'}
						</p>
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
							<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
								Default repo URL
							</p>
							<p class="ui-wrap-anywhere mt-2 text-sm text-slate-200">
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
						<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
							<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
								Default thread sandbox
							</p>
							<p class="mt-2 text-sm text-slate-200">
								{data.project.defaultThreadSandbox || 'Inherit provider default'}
							</p>
						</div>
					</div>
				</div>
			</article>
		</section>

		<section class="space-y-6">
			<article class="card border border-slate-800 bg-slate-950/70 p-6">
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
						Open tasks
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
							<a
								class="block rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
								href={resolve(`/app/tasks/${task.id}`)}
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-2">
											<h3 class="ui-wrap-anywhere font-medium text-white">{task.title}</h3>
											<span
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(task.status)}`}
											>
												{formatTaskStatusLabel(task.status)}
											</span>
											{#if task.hasUnmetDependencies}
												<span
													class="badge border border-rose-900/70 bg-rose-950/40 text-[0.7rem] tracking-[0.2em] text-rose-200 uppercase"
												>
													Dependency blocked
												</span>
											{/if}
											{#if task.openReview}
												<span
													class="badge border border-amber-900/70 bg-amber-950/40 text-[0.7rem] tracking-[0.2em] text-amber-200 uppercase"
												>
													Review open
												</span>
											{/if}
											{#if task.pendingApproval}
												<span
													class="badge border border-amber-900/70 bg-amber-950/40 text-[0.7rem] tracking-[0.2em] text-amber-200 uppercase"
												>
													Approval {formatTaskApprovalModeLabel(task.pendingApproval.mode)}
												</span>
											{/if}
										</div>
										<p class="ui-clamp-3 mt-2 text-sm text-slate-300">{task.summary}</p>
									</div>
									<div class="min-w-0 text-left text-xs text-slate-500 sm:max-w-56 sm:text-right">
										<p>Updated {task.updatedAtLabel}</p>
										<p class="ui-wrap-anywhere mt-1 text-slate-400">{task.assigneeName}</p>
									</div>
								</div>

								<div class="mt-4 grid gap-3 sm:grid-cols-3">
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Goal</p>
										<p class="ui-wrap-anywhere mt-2 text-sm text-white">{task.goalName}</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Priority</p>
										<p class="mt-2 text-sm text-white">{task.priority}</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
											Artifact path
										</p>
										<p class="ui-wrap-anywhere mt-2 text-sm text-white">
											{task.artifactPath || 'Not set'}
										</p>
									</div>
								</div>
							</a>
						{/each}
					{/if}
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
							<a
								class="block rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-sky-400/40"
								href={resolve(`/app/goals/${goal.id}`)}
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-2">
											<h3 class="ui-wrap-anywhere font-medium text-white">{goal.name}</h3>
											<span
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${goalStatusToneClass(goal.status)}`}
											>
												{formatGoalStatusLabel(goal.status)}
											</span>
										</div>
										<p class="ui-clamp-3 mt-2 text-sm text-slate-300">{goal.summary}</p>
									</div>
									<p class="text-xs text-slate-500">{goal.taskCount} linked task(s)</p>
								</div>
								<p class="ui-wrap-anywhere mt-3 text-xs text-slate-500">{goal.artifactPath}</p>
							</a>
						{/each}
					{/if}
				</div>
			</article>
		</section>
	</div>
</section>
