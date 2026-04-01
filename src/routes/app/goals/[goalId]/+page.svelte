<script lang="ts">
	import { resolve } from '$app/paths';
	import ArtifactBrowser from '$lib/components/ArtifactBrowser.svelte';
	import GoalEditor from '$lib/components/GoalEditor.svelte';
	import {
		formatGoalStatusLabel,
		formatTaskStatusLabel,
		goalStatusToneClass,
		taskStatusToneClass
	} from '$lib/types/control-plane';

	let { data, form } = $props();

	type GoalFormValues = {
		name?: string;
		summary?: string;
		horizon?: string;
		successSignal?: string;
		artifactPath?: string;
		parentGoalId?: string;
		projectIds?: string[];
		taskIds?: string[];
		lane?: string;
		status?: string;
	};

	let updateSuccess = $derived(form?.ok && form?.successAction === 'updateGoal');
	let formValues = $derived(
		(form && 'values' in form ? form.values : undefined) as GoalFormValues | undefined
	);
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div class="min-w-0 space-y-3">
			<a
				class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase transition hover:text-sky-200"
				href={resolve('/app/goals')}
			>
				Goals
			</a>
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="ui-wrap-anywhere text-3xl font-semibold tracking-tight text-white">
					{data.goal.name}
				</h1>
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${goalStatusToneClass(data.goal.status)}`}
				>
					{formatGoalStatusLabel(data.goal.status)}
				</span>
			</div>
			<p class="ui-wrap-anywhere max-w-3xl text-sm text-slate-300">{data.goal.summary}</p>
		</div>

		<div class="grid w-full gap-3 sm:grid-cols-2 lg:max-w-4xl xl:grid-cols-4">
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Linked tasks
				</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.metrics.relatedTaskCount}</p>
				<p class="mt-2 text-sm text-slate-400">Tasks assigned to this goal.</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Active tasks
				</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.metrics.activeTaskCount}</p>
				<p class="mt-2 text-sm text-slate-400">Open or in-flight work under this goal.</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Linked projects
				</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.metrics.linkedProjectCount}</p>
				<p class="mt-2 text-sm text-slate-400">Projects providing context or workspace roots.</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Subgoals</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.metrics.childGoalCount}</p>
				<p class="mt-2 text-sm text-slate-400">Nested outcomes rolling up into this goal.</p>
			</article>
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

	{#if updateSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Goal updates and relationship links saved.
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
		<section class="space-y-6">
			<div class="card border border-slate-800 bg-slate-950/70 p-6">
				<GoalEditor
					action="?/updateGoal"
					description="This is the canonical goal management surface. Update the goal details, parent/subgoal structure, project context, and task links here."
					folderOptions={data.folderOptions}
					heading="Edit goal"
					laneOptions={data.laneOptions}
					parentGoalOptions={data.parentGoalOptions}
					projectOptions={data.projectOptions}
					showIdField
					statusOptions={data.statusOptions}
					submitLabel="Save goal"
					taskOptions={data.taskOptions}
					values={{
						goalId: data.goal.id,
						name: formValues?.name ?? data.goal.name,
						summary: formValues?.summary ?? data.goal.summary,
						horizon: formValues?.horizon ?? data.goal.horizon,
						successSignal: formValues?.successSignal ?? data.goal.successSignal,
						artifactPath: formValues?.artifactPath ?? data.goal.artifactPath,
						parentGoalId: formValues?.parentGoalId ?? (data.goal.parentGoalId ?? ''),
						projectIds:
							formValues?.projectIds ?? data.linkedProjects.map((project) => project.id),
						taskIds: formValues?.taskIds ?? data.relatedTasks.map((task) => task.id),
						lane: formValues?.lane ?? data.goal.lane,
						status: formValues?.status ?? data.goal.status
					}}
				/>
			</div>

			<article class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Workspace
				</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Goal artifact browser</h2>
				<p class="mt-2 text-sm text-slate-400">
					Use one durable workspace for planning notes, related briefs, and downstream outputs.
				</p>

				<div class="mt-5">
					<ArtifactBrowser
						browser={data.artifactBrowser}
						emptyLabel="This goal workspace is empty right now."
					/>
				</div>
			</article>
		</section>

		<section class="space-y-6">
			<article class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Structure
				</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Parent and subgoal context</h2>

				<div class="mt-5 space-y-4">
					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Parent goal</p>
						{#if data.goal.parentGoalId}
							<a
								class="mt-2 inline-flex text-sm font-medium text-sky-300 transition hover:text-sky-200"
								href={resolve(`/app/goals/${data.goal.parentGoalId}`)}
							>
								{data.goal.parentGoalName}
							</a>
						{:else}
							<p class="mt-2 text-sm text-slate-400">Top-level goal.</p>
						{/if}
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Subgoals</p>
						{#if data.childGoals.length === 0}
							<p class="mt-2 text-sm text-slate-400">No subgoals linked yet.</p>
						{:else}
							<div class="mt-3 space-y-3">
								{#each data.childGoals as childGoal (childGoal.id)}
									<a
										class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 transition hover:border-sky-400/40"
										href={resolve(`/app/goals/${childGoal.id}`)}
									>
										<div class="min-w-0">
											<p class="ui-wrap-anywhere text-sm font-medium text-white">
												{childGoal.name}
											</p>
											<p class="mt-1 text-xs text-slate-500">
												{childGoal.taskCount} linked task(s)
											</p>
										</div>
										<span
											class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${goalStatusToneClass(childGoal.status)}`}
										>
											{formatGoalStatusLabel(childGoal.status)}
										</span>
									</a>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</article>

			<article class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Linked projects
				</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Project context</h2>

				<div class="mt-5 space-y-3">
					{#if data.linkedProjects.length === 0}
						<p class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
							No projects linked yet.
						</p>
					{:else}
						{#each data.linkedProjects as project (project.id)}
							<a
								class="flex items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4 transition hover:border-sky-400/40"
								href={resolve(`/app/projects/${project.id}`)}
							>
								<div class="min-w-0">
									<p class="ui-wrap-anywhere text-sm font-medium text-white">{project.name}</p>
									<p class="ui-clamp-2 mt-2 text-sm text-slate-300">{project.summary}</p>
									<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">
										{project.defaultArtifactRoot || project.projectRootFolder || 'No workspace default'}
									</p>
								</div>
								<span class="text-xs font-medium tracking-[0.16em] text-sky-300 uppercase">
									Open
								</span>
							</a>
						{/each}
					{/if}
				</div>
			</article>

			<article class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Linked tasks
				</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Execution under this goal</h2>

				<div class="mt-5 space-y-3">
					{#if data.relatedTasks.length === 0}
						<p class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
							No tasks are assigned to this goal yet.
						</p>
					{:else}
						{#each data.relatedTasks as task (task.id)}
							<a
								class="flex items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4 transition hover:border-sky-400/40"
								href={resolve(`/app/tasks/${task.id}`)}
							>
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<p class="ui-wrap-anywhere text-sm font-medium text-white">{task.title}</p>
										<span
											class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(task.status)}`}
										>
											{formatTaskStatusLabel(task.status)}
										</span>
									</div>
									<p class="ui-clamp-2 mt-2 text-sm text-slate-300">{task.summary}</p>
									<p class="mt-2 text-xs text-slate-500">{task.projectName}</p>
								</div>
								<span class="text-xs font-medium tracking-[0.16em] text-sky-300 uppercase">
									Open
								</span>
							</a>
						{/each}
					{/if}
				</div>
			</article>
		</section>
	</div>
</section>
