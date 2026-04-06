<script lang="ts">
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailFactCard from '$lib/components/DetailFactCard.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
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
	let deleteBlocked = $derived(data.relatedTasks.length > 0);
</script>

<AppPage width="full">
	<DetailHeader
		backHref={resolve('/app/projects')}
		backLabel="Back to projects"
		eyebrow="Project detail"
		title={data.project.name}
		description={data.project.summary}
	/>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
		<MetricCard
			label="Open tasks"
			value={data.metrics.activeTasks}
			detail="Related tasks that still need attention."
		/>
		<MetricCard
			label="Linked goals"
			value={data.metrics.goalCount}
			detail="Goals inferred from tasks and artifact paths."
		/>
		<MetricCard
			label="Review tasks"
			value={data.metrics.reviewTasks}
			detail="Tasks currently waiting on explicit review."
		/>
		<MetricCard
			label="Pending approvals"
			value={data.metrics.pendingApprovals}
			detail="Tasks stalled on an approval gate."
		/>
		<MetricCard
			label="Blocked signals"
			value={data.metrics.blockedTasks}
			detail="Blocked tasks or tasks stalled by dependencies."
		/>
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
			<DetailSection
				eyebrow="Project details"
				title="Edit defaults and repo context"
				description="Collection pages help you find the project. This page holds the actual project setup."
				bodyClass="space-y-4"
			>
				<form class="space-y-4" method="POST" action="?/updateProject">
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

					<div
						class="flex flex-wrap items-end justify-between gap-3 border-t border-slate-800 pt-4"
					>
						<div class="flex flex-wrap gap-4">
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
										<option
											value={sandbox}
											selected={data.project.defaultThreadSandbox === sandbox}
										>
											{sandbox}
										</option>
									{/each}
								</select>
							</label>
						</div>

						<button class="btn preset-filled-primary-500 font-semibold" type="submit">
							Save project
						</button>
					</div>
				</form>
			</DetailSection>

			<DetailSection
				eyebrow="Project defaults"
				title="Roots and repo context"
				description="The same defaults shown in editable form, compressed here for quick scanning."
				bodyClass="grid gap-4 md:grid-cols-2"
			>
				<DetailFactCard
					class="md:col-span-2"
					label="Project root folder"
					value={data.project.projectRootFolder || 'Not configured'}
				/>
				<DetailFactCard
					class="md:col-span-2"
					label="Default artifact root"
					value={data.project.defaultArtifactRoot || 'Not configured'}
				/>
				<DetailFactCard
					class="md:col-span-2"
					label="Default repo path"
					value={data.project.defaultRepoPath || 'Not configured'}
				/>
				<DetailFactCard
					class="md:col-span-2"
					label="Default repo URL"
					value={data.project.defaultRepoUrl || 'Not configured'}
				/>
				<DetailFactCard
					label="Default branch"
					value={data.project.defaultBranch || 'Not configured'}
				/>
				<DetailFactCard
					label="Default thread sandbox"
					value={data.project.defaultThreadSandbox || 'Inherit provider default'}
				/>
			</DetailSection>

			<DetailSection
				eyebrow="Danger zone"
				title="Delete project"
				description={deleteBlocked
					? `This project still has ${data.relatedTasks.length} linked task${data.relatedTasks.length === 1 ? '' : 's'}. Reassign or delete those tasks first because tasks require a project.`
					: `This removes the project from the control plane, clears explicit links from ${data.relatedGoals.length} related goal${data.relatedGoals.length === 1 ? '' : 's'}, and removes it from planning session scope.`}
				tone="rose"
			>
				<form class="mt-5" method="POST" action="?/deleteProject">
					<button
						class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
						type="submit"
						disabled={deleteBlocked}
					>
						Delete project
					</button>
				</form>
			</DetailSection>
		</section>

		<section class="space-y-6">
			<DetailSection
				eyebrow="Related tasks"
				title="Queued and active work"
				description="Every task explicitly linked to this project, newest activity first."
				bodyClass="space-y-4"
			>
				{#snippet actions()}
					<a
						class="rounded-full border border-sky-800/70 bg-sky-950/40 px-3 py-2 text-xs font-medium text-sky-200 transition hover:border-sky-700 hover:text-white"
						href={resolve('/app/tasks')}
					>
						Open tasks
					</a>
				{/snippet}

				<div class="space-y-4">
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
			</DetailSection>

			<DetailSection
				eyebrow="Related goals"
				title="Goals sharing this project context"
				description="Goals appear here when a task links to them or when their artifact path falls under this project’s configured roots."
				bodyClass="space-y-4"
			>
				<div class="space-y-4">
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
			</DetailSection>
		</section>
	</div>
</AppPage>
