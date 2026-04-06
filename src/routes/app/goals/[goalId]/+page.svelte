<script lang="ts">
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import ArtifactBrowser from '$lib/components/ArtifactBrowser.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import GoalEditor from '$lib/components/GoalEditor.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageTabs from '$lib/components/PageTabs.svelte';
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
		successSignal?: string;
		targetDate?: string;
		artifactPath?: string;
		parentGoalId?: string;
		projectIds?: string[];
		taskIds?: string[];
		area?: string;
		status?: string;
	};

	let updateSuccess = $derived(form?.ok && form?.successAction === 'updateGoal');
	let formValues = $derived(
		(form && 'values' in form ? form.values : undefined) as GoalFormValues | undefined
	);
	let selectedGoalPanel = $state<'structure' | 'projects' | 'tasks'>('structure');
	let deleteDescription = $derived.by(() => {
		const childDestination = data.goal.parentGoalName || 'the top level';
		const relatedTaskCount = data.relatedTasks.length;
		const childGoalCount = data.childGoals.length;

		return `This removes the goal from the control plane, clears it from ${relatedTaskCount} linked task${relatedTaskCount === 1 ? '' : 's'}, and moves ${childGoalCount} subgoal${childGoalCount === 1 ? '' : 's'} under ${childDestination}.`;
	});

	function formatDateLabel(value: string | null | undefined) {
		if (!value) {
			return 'Not set';
		}

		const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));

		if (!year || !month || !day) {
			return value;
		}

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(Date.UTC(year, month - 1, day)));
	}
</script>

<AppPage width="full">
	<DetailHeader
		backHref={resolve('/app/goals')}
		backLabel="Back to goals"
		eyebrow="Goal detail"
		title={data.goal.name}
		description={data.goal.summary}
	>
		{#snippet meta()}
			<div class="flex flex-wrap gap-2">
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${goalStatusToneClass(data.goal.status)}`}
				>
					{formatGoalStatusLabel(data.goal.status)}
				</span>
				<span
					class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
				>
					Target {formatDateLabel(data.goal.targetDate)}
				</span>
			</div>
		{/snippet}
	</DetailHeader>

	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
		<MetricCard
			label="Linked tasks"
			value={data.metrics.relatedTaskCount}
			detail="Tasks assigned to this goal."
		/>
		<MetricCard
			label="Active tasks"
			value={data.metrics.activeTaskCount}
			detail="Open or in-flight work under this goal."
		/>
		<MetricCard
			label="Linked projects"
			value={data.metrics.linkedProjectCount}
			detail="Projects providing context or workspace roots."
		/>
		<MetricCard
			label="Subgoals"
			value={data.metrics.childGoalCount}
			detail="Nested outcomes rolling up into this goal."
		/>
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
					description="This is the canonical goal management surface. Refine the wording with the coach, then update parent/subgoal structure, project context, and task links here."
					folderOptions={data.folderOptions}
					heading="Edit goal"
					areaOptions={data.areaOptions}
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
						successSignal: formValues?.successSignal ?? data.goal.successSignal,
						targetDate: formValues?.targetDate ?? data.goal.targetDate ?? '',
						artifactPath: formValues?.artifactPath ?? data.goal.artifactPath,
						parentGoalId: formValues?.parentGoalId ?? data.goal.parentGoalId ?? '',
						projectIds: formValues?.projectIds ?? data.linkedProjects.map((project) => project.id),
						taskIds: formValues?.taskIds ?? data.relatedTasks.map((task) => task.id),
						area: formValues?.area ?? data.goal.area,
						status: formValues?.status ?? data.goal.status
					}}
				/>
			</div>

			<DetailSection
				eyebrow="Workspace"
				title="Goal artifact browser"
				description="Use one durable workspace for planning notes, related briefs, and downstream outputs."
			>
				<ArtifactBrowser
					browser={data.artifactBrowser}
					emptyLabel="This goal workspace is empty right now."
				/>
			</DetailSection>

			<DetailSection
				eyebrow="Danger zone"
				title="Delete goal"
				description={deleteDescription}
				tone="rose"
			>
				<form class="mt-5" method="POST" action="?/deleteGoal">
					<button
						class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
						type="submit"
					>
						Delete goal
					</button>
				</form>
			</DetailSection>
		</section>

		<section class="space-y-6">
			<section class="card border border-slate-800/90 bg-slate-950/75 px-5 py-4">
				<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p class="text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase">
							Goal context
						</p>
						<p class="mt-1 text-sm text-slate-400">
							Switch between hierarchy, linked project context, and execution under this goal.
						</p>
					</div>
					<PageTabs
						ariaLabel="Goal detail panels"
						bind:value={selectedGoalPanel}
						items={[
							{ id: 'structure', label: 'Structure', badge: data.childGoals.length },
							{ id: 'projects', label: 'Projects', badge: data.linkedProjects.length },
							{ id: 'tasks', label: 'Tasks', badge: data.relatedTasks.length }
						]}
						panelIdPrefix="goal-detail"
					/>
				</div>
			</section>

			{#if selectedGoalPanel === 'structure'}
				<div
					id="goal-detail-panel-structure"
					role="tabpanel"
					aria-labelledby="goal-detail-tab-structure"
				>
					<DetailSection
						eyebrow="Structure"
						title="Parent and subgoal context"
						description="Keep the hierarchy visible while refining the goal wording and linked work."
					>
						<div class="space-y-4">
							<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Target date
								</p>
								<p class="mt-2 text-sm font-medium text-white">
									{formatDateLabel(data.goal.targetDate)}
								</p>
								<p class="mt-2 text-sm text-slate-400">
									{data.goal.targetDate
										? 'Use this to keep the outcome tied to a concrete delivery window.'
										: 'No target date is set for this goal yet.'}
								</p>
							</div>

							<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Parent goal
								</p>
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
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Subgoals
								</p>
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
					</DetailSection>
				</div>
			{:else if selectedGoalPanel === 'projects'}
				<div
					id="goal-detail-panel-projects"
					role="tabpanel"
					aria-labelledby="goal-detail-tab-projects"
				>
					<DetailSection
						eyebrow="Linked projects"
						title="Project context"
						description="Projects give the goal concrete workspace roots and execution context."
					>
						<div class="space-y-3">
							{#if data.linkedProjects.length === 0}
								<p
									class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
								>
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
												{project.defaultArtifactRoot ||
													project.projectRootFolder ||
													'No workspace default'}
											</p>
										</div>
										<span class="text-xs font-medium tracking-[0.16em] text-sky-300 uppercase">
											Open
										</span>
									</a>
								{/each}
							{/if}
						</div>
					</DetailSection>
				</div>
			{:else}
				<div id="goal-detail-panel-tasks" role="tabpanel" aria-labelledby="goal-detail-tab-tasks">
					<DetailSection
						eyebrow="Linked tasks"
						title="Execution under this goal"
						description="Review the work already attached to this outcome before adding more."
					>
						<div class="space-y-3">
							{#if data.relatedTasks.length === 0}
								<p
									class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
								>
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
					</DetailSection>
				</div>
			{/if}
		</section>
	</div>
</AppPage>
