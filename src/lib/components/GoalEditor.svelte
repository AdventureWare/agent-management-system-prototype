<script lang="ts">
	import { onMount } from 'svelte';
	import {
		clearFormDraft,
		isFormDraftEmpty,
		readFormDraft,
		writeFormDraft
	} from '$lib/client/form-drafts';
	import PathField from '$lib/components/PathField.svelte';
	import {
		formatGoalStatusLabel,
		formatTaskStatusLabel,
		goalStatusToneClass
	} from '$lib/types/control-plane';

	type GoalFormValues = {
		goalId?: string;
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

	type FolderOption = {
		label: string;
		path: string;
	};

	type ParentGoalOption = {
		id: string;
		name: string;
		status: string;
		artifactPath: string;
	};

	type ProjectOption = {
		id: string;
		name: string;
		summary: string;
		defaultArtifactRoot: string;
		projectRootFolder: string;
	};

	type TaskOption = {
		id: string;
		title: string;
		status: string;
		projectId: string;
		projectName: string;
		currentGoalId: string;
		currentGoalName: string;
	};

	let {
		action,
		submitLabel,
		heading,
		description,
		values = {},
		folderOptions,
		laneOptions,
		statusOptions,
		parentGoalOptions,
		projectOptions,
		taskOptions,
		showIdField = false,
		draftStorageKey = null,
		clearDraftOnSuccess = false
	}: {
		action: string;
		submitLabel: string;
		heading: string;
		description: string;
		values?: GoalFormValues;
		folderOptions: FolderOption[];
		laneOptions: readonly string[];
		statusOptions: readonly string[];
		parentGoalOptions: ParentGoalOption[];
		projectOptions: ProjectOption[];
		taskOptions: TaskOption[];
		showIdField?: boolean;
		draftStorageKey?: string | null;
		clearDraftOnSuccess?: boolean;
	} = $props();

	let draftReady = $state(false);
	let name = $state('');
	let summary = $state('');
	let lane = $state('product');
	let status = $state('ready');
	let horizon = $state('');
	let successSignal = $state('');
	let projectQuery = $state('');
	let taskQuery = $state('');
	let selectedProjectIds = $state.raw<string[]>([]);
	let selectedTaskIds = $state.raw<string[]>([]);
	let selectedParentGoalId = $state('');
	let artifactPath = $state('');
	let showProjectBrowser = $state(false);
	let showTaskBrowser = $state(false);
	let lastValuesKey = $state('');

	selectedProjectIds = getInitialProjectIds();
	selectedTaskIds = getInitialTaskIds();
	selectedParentGoalId = getInitialParentGoalId();
	artifactPath = getInitialArtifactPath();

	$effect(() => {
		const nextValuesKey = JSON.stringify({
			goalId: values.goalId ?? '',
			name: values.name ?? '',
			summary: values.summary ?? '',
			lane: values.lane ?? 'product',
			status: values.status ?? 'ready',
			horizon: values.horizon ?? '',
			successSignal: values.successSignal ?? '',
			projectIds: values.projectIds ?? [],
			taskIds: values.taskIds ?? [],
			parentGoalId: values.parentGoalId ?? '',
			artifactPath: values.artifactPath ?? ''
		});

		if (lastValuesKey === nextValuesKey) {
			return;
		}

		lastValuesKey = nextValuesKey;
		name = values.name ?? '';
		summary = values.summary ?? '';
		lane = values.lane ?? 'product';
		status = values.status ?? 'ready';
		horizon = values.horizon ?? '';
		successSignal = values.successSignal ?? '';
		selectedProjectIds = [...(values.projectIds ?? [])];
		selectedTaskIds = [...(values.taskIds ?? [])];
		selectedParentGoalId = values.parentGoalId ?? '';
		artifactPath = values.artifactPath ?? '';
		showProjectBrowser = false;
		showTaskBrowser = false;
	});

	onMount(() => {
		if (!draftStorageKey) {
			draftReady = true;
			return;
		}

		if (clearDraftOnSuccess) {
			clearFormDraft(draftStorageKey);
			draftReady = true;
			return;
		}

		const hasIncomingValues = !isFormDraftEmpty({
			name: values.name ?? '',
			summary: values.summary ?? '',
			horizon: values.horizon ?? '',
			successSignal: values.successSignal ?? '',
			artifactPath: values.artifactPath ?? '',
			parentGoalId: values.parentGoalId ?? '',
			projectIds: values.projectIds ?? [],
			taskIds: values.taskIds ?? [],
			lane: values.lane ?? '',
			status: values.status ?? ''
		});

		if (hasIncomingValues) {
			draftReady = true;
			return;
		}

		const savedDraft = readFormDraft<GoalFormValues>(draftStorageKey);

		if (savedDraft) {
			name = savedDraft.name ?? '';
			summary = savedDraft.summary ?? '';
			lane = savedDraft.lane ?? 'product';
			status = savedDraft.status ?? 'ready';
			horizon = savedDraft.horizon ?? '';
			successSignal = savedDraft.successSignal ?? '';
			artifactPath = savedDraft.artifactPath ?? '';
			selectedParentGoalId = savedDraft.parentGoalId ?? '';
			selectedProjectIds = [...(savedDraft.projectIds ?? [])];
			selectedTaskIds = [...(savedDraft.taskIds ?? [])];
		}

		draftReady = true;
	});

	$effect(() => {
		if (!draftStorageKey || !draftReady) {
			return;
		}

		writeFormDraft(draftStorageKey, {
			name,
			summary,
			lane: lane === 'product' ? '' : lane,
			status: status === 'ready' ? '' : status,
			horizon,
			successSignal,
			artifactPath,
			parentGoalId: selectedParentGoalId,
			projectIds: selectedProjectIds,
			taskIds: selectedTaskIds
		});
	});

	let selectedProjectIdSet = $derived(new Set(selectedProjectIds));
	let selectedTaskIdSet = $derived(new Set(selectedTaskIds));
	let projectMap = $derived(new Map(projectOptions.map((project) => [project.id, project])));
	let taskMap = $derived(new Map(taskOptions.map((task) => [task.id, task])));
	let parentGoalMap = $derived(new Map(parentGoalOptions.map((goal) => [goal.id, goal])));
	let selectedProjects = $derived(
		selectedProjectIds
			.map((projectId) => projectMap.get(projectId))
			.filter((project): project is ProjectOption => Boolean(project))
	);
	let selectedTasks = $derived(
		selectedTaskIds
			.map((taskId) => taskMap.get(taskId))
			.filter((task): task is TaskOption => Boolean(task))
	);
	let recommendedArtifactPath = $derived.by(() => {
		const selectedTaskProjectIds = selectedTasks
			.map((task) => task.projectId)
			.filter((projectId) => projectId.length > 0);
		const candidateProjectIds = [...new Set([...selectedProjectIds, ...selectedTaskProjectIds])];

		for (const projectId of candidateProjectIds) {
			const project = projectMap.get(projectId);

			if (!project) {
				continue;
			}

			if (project.defaultArtifactRoot) {
				return project.defaultArtifactRoot;
			}

			if (project.projectRootFolder) {
				return project.projectRootFolder;
			}
		}

		return parentGoalMap.get(selectedParentGoalId)?.artifactPath ?? '';
	});
	let filteredProjectOptions = $derived.by(() => {
		const normalizedQuery = projectQuery.trim().toLowerCase();

		if (!normalizedQuery) {
			return projectOptions;
		}

		return projectOptions.filter((project) =>
			[project.name, project.summary, project.defaultArtifactRoot, project.projectRootFolder]
				.join(' ')
				.toLowerCase()
				.includes(normalizedQuery)
		);
	});
	let filteredTaskOptions = $derived.by(() => {
		const normalizedQuery = taskQuery.trim().toLowerCase();

		if (!normalizedQuery) {
			return taskOptions;
		}

		return taskOptions.filter((task) =>
			[task.title, task.projectName, task.status, task.currentGoalName, task.currentGoalId]
				.join(' ')
				.toLowerCase()
				.includes(normalizedQuery)
		);
	});
	let projectBrowserLabel = $derived(
		showProjectBrowser
			? 'Hide project list'
			: `Browse ${projectOptions.length} ${projectOptions.length === 1 ? 'project' : 'projects'}`
	);
	let taskBrowserLabel = $derived(
		showTaskBrowser
			? 'Hide task list'
			: `Browse ${taskOptions.length} ${taskOptions.length === 1 ? 'task' : 'tasks'}`
	);

	function toggleSelectedId(current: string[], id: string, checked: boolean) {
		if (checked) {
			return current.includes(id) ? current : [...current, id];
		}

		return current.filter((candidate) => candidate !== id);
	}

	function removeProject(projectId: string) {
		selectedProjectIds = selectedProjectIds.filter((candidate) => candidate !== projectId);
	}

	function removeTask(taskId: string) {
		selectedTaskIds = selectedTaskIds.filter((candidate) => candidate !== taskId);
	}

	function getInitialProjectIds() {
		return [...(values.projectIds ?? [])];
	}

	function getInitialTaskIds() {
		return [...(values.taskIds ?? [])];
	}

	function getInitialParentGoalId() {
		return values.parentGoalId ?? '';
	}

	function getInitialArtifactPath() {
		return values.artifactPath ?? '';
	}
</script>

<form
	class="space-y-6"
	method="POST"
	{action}
	data-persist-scope={draftStorageKey ? 'manual' : undefined}
>
	{#if showIdField && values.goalId}
		<input type="hidden" name="goalId" value={values.goalId} />
	{/if}

	<div class="space-y-2">
		<h2 class="text-xl font-semibold text-white">{heading}</h2>
		<p class="text-sm text-slate-400">{description}</p>
	</div>

	<div class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
		<div>
			<h3 class="text-sm font-semibold tracking-[0.2em] text-slate-300 uppercase">Outcome</h3>
			<p class="mt-1 text-sm text-slate-500">
				State the outcome first. Structure and execution links come after.
			</p>
		</div>

		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
			<input
				bind:value={name}
				class="input text-white placeholder:text-slate-500"
				name="name"
				placeholder="Improve goal planning & linking UX…"
				required
			/>
		</label>

		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Summary</span>
			<textarea
				bind:value={summary}
				class="textarea min-h-28 text-white placeholder:text-slate-500"
				name="summary"
				placeholder="Describe the desired outcome and why it matters…"
				required
			></textarea>
		</label>

		<div class="grid gap-4 lg:grid-cols-2">
			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Lane</span>
				<select bind:value={lane} class="select text-white" name="lane">
					{#each laneOptions as lane (lane)}
						<option value={lane}>{lane}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
				<select bind:value={status} class="select text-white" name="status">
					{#each statusOptions as status (status)}
						<option value={status}>{formatGoalStatusLabel(status)}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Horizon</span>
				<input
					bind:value={horizon}
					class="input text-white placeholder:text-slate-500"
					name="horizon"
					placeholder="Now, next quarter, later this year…"
				/>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Parent goal</span>
				<select bind:value={selectedParentGoalId} class="select text-white" name="parentGoalId">
					<option value="">No parent goal</option>
					{#each parentGoalOptions as goal (goal.id)}
						<option value={goal.id}>{goal.name}</option>
					{/each}
				</select>
			</label>
		</div>

		<label class="block">
			<span class="mb-2 block text-sm font-medium text-slate-200">Success signal</span>
			<textarea
				bind:value={successSignal}
				class="textarea min-h-24 text-white placeholder:text-slate-500"
				name="successSignal"
				placeholder="What evidence will show this goal is actually working…"
			></textarea>
		</label>
	</div>

	<div class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
		<div>
			<h3 class="text-sm font-semibold tracking-[0.2em] text-slate-300 uppercase">Relationships</h3>
			<p class="mt-1 text-sm text-slate-500">
				Use the same pattern for every relationship: pick the parent, link projects, and assign the
				tasks that should roll up into this goal.
			</p>
		</div>

		<div class="grid gap-4 xl:grid-cols-2">
			<div class="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-sm font-medium text-slate-200">Projects</p>
						<p class="mt-1 text-xs text-slate-500">
							Linked projects help scope the goal and recommend a workspace.
						</p>
					</div>
					<div class="flex flex-wrap items-center justify-end gap-2">
						<span
							class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300"
						>
							{selectedProjects.length} selected
						</span>
						<button
							class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:text-white"
							type="button"
							onclick={() => {
								showProjectBrowser = !showProjectBrowser;
							}}
						>
							{projectBrowserLabel}
						</button>
					</div>
				</div>

				{#if selectedProjects.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each selectedProjects as project (project.id)}
							<button
								class="rounded-full border border-sky-800/60 bg-sky-950/40 px-3 py-1 text-xs text-sky-100 transition hover:border-sky-700"
								type="button"
								onclick={() => {
									removeProject(project.id);
								}}
							>
								{project.name} ×
							</button>
						{/each}
					</div>
				{:else}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-4 text-sm text-slate-500"
					>
						No projects linked yet. Add one if you want stronger context or a recommended workspace.
					</p>
				{/if}

				{#if showProjectBrowser}
					<label class="block">
						<span class="sr-only">Search linked projects</span>
						<input
							bind:value={projectQuery}
							class="input text-white placeholder:text-slate-500"
							placeholder="Search projects…"
						/>
					</label>

					{#if filteredProjectOptions.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-5 text-sm text-slate-500"
						>
							No projects match the current search.
						</p>
					{:else}
						<div class="max-h-72 space-y-2 overflow-y-auto pr-1">
							{#each filteredProjectOptions as project (project.id)}
								<label
									class={`flex gap-3 rounded-2xl border p-3 text-sm text-slate-200 ${selectedProjectIdSet.has(project.id) ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800 bg-slate-950/70'}`}
								>
									<input
										checked={selectedProjectIdSet.has(project.id)}
										class="mt-0.5 checkbox"
										name="projectIds"
										type="checkbox"
										value={project.id}
										onchange={(event) => {
											selectedProjectIds = toggleSelectedId(
												selectedProjectIds,
												project.id,
												(event.currentTarget as HTMLInputElement).checked
											);
										}}
									/>
									<span class="min-w-0">
										<span class="block font-medium text-white">{project.name}</span>
										<span class="ui-clamp-2 mt-1 block text-xs text-slate-500">
											{project.summary}
										</span>
									</span>
								</label>
							{/each}
						</div>
					{/if}
				{/if}
			</div>

			<div class="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-sm font-medium text-slate-200">Tasks</p>
						<p class="mt-1 text-xs text-slate-500">
							Saving will assign selected tasks to this goal.
						</p>
					</div>
					<div class="flex flex-wrap items-center justify-end gap-2">
						<span
							class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300"
						>
							{selectedTasks.length} selected
						</span>
						<button
							class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:text-white"
							type="button"
							onclick={() => {
								showTaskBrowser = !showTaskBrowser;
							}}
						>
							{taskBrowserLabel}
						</button>
					</div>
				</div>

				{#if selectedTasks.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each selectedTasks as task (task.id)}
							<button
								class="rounded-full border border-emerald-800/50 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-100 transition hover:border-emerald-700"
								type="button"
								onclick={() => {
									removeTask(task.id);
								}}
							>
								{task.title} ×
							</button>
						{/each}
					</div>
				{:else}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-4 text-sm text-slate-500"
					>
						No tasks assigned yet. Add tasks only when the goal already has execution work under it.
					</p>
				{/if}

				{#if showTaskBrowser}
					<label class="block">
						<span class="sr-only">Search linked tasks</span>
						<input
							bind:value={taskQuery}
							class="input text-white placeholder:text-slate-500"
							placeholder="Search tasks…"
						/>
					</label>

					{#if filteredTaskOptions.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-5 text-sm text-slate-500"
						>
							No tasks match the current search.
						</p>
					{:else}
						<div class="max-h-72 space-y-2 overflow-y-auto pr-1">
							{#each filteredTaskOptions as task (task.id)}
								<label
									class={`flex gap-3 rounded-2xl border p-3 text-sm text-slate-200 ${selectedTaskIdSet.has(task.id) ? 'border-emerald-500/40 bg-emerald-950/20' : task.currentGoalId ? 'border-amber-900/50 bg-amber-950/20' : 'border-slate-800 bg-slate-950/70'}`}
								>
									<input
										checked={selectedTaskIdSet.has(task.id)}
										class="mt-0.5 checkbox"
										name="taskIds"
										type="checkbox"
										value={task.id}
										onchange={(event) => {
											selectedTaskIds = toggleSelectedId(
												selectedTaskIds,
												task.id,
												(event.currentTarget as HTMLInputElement).checked
											);
										}}
									/>
									<span class="min-w-0">
										<span class="block font-medium text-white">{task.title}</span>
										<span class="mt-1 block text-xs text-slate-500">
											{task.projectName} • {formatTaskStatusLabel(task.status)}
										</span>
										{#if task.currentGoalId && !selectedTaskIdSet.has(task.id)}
											<span class="mt-1 block text-xs text-amber-200">
												Currently linked to {task.currentGoalName || task.currentGoalId}
											</span>
										{/if}
									</span>
								</label>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>

	<div class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
		<div>
			<h3 class="text-sm font-semibold tracking-[0.2em] text-slate-300 uppercase">Workspace</h3>
			<p class="mt-1 text-sm text-slate-500">
				Leave the path blank to keep the form light. If the linked context has a good workspace, use
				the recommendation below or let the server infer it.
			</p>
		</div>

		{#if recommendedArtifactPath}
			<div
				class="rounded-2xl border border-sky-800/40 bg-sky-950/20 px-4 py-3 text-sm text-sky-100"
			>
				<p class="ui-wrap-anywhere">
					Recommended workspace: <span class="font-medium">{recommendedArtifactPath}</span>
				</p>
				<button
					class="mt-3 rounded-full border border-sky-700/60 bg-sky-950/50 px-3 py-1 text-xs font-medium text-sky-100 transition hover:border-sky-600 hover:text-white"
					type="button"
					onclick={() => {
						artifactPath = recommendedArtifactPath;
					}}
				>
					Use recommended workspace
				</button>
			</div>
		{/if}

		<PathField
			bind:value={artifactPath}
			createMode="folder"
			helperText="If left blank, a linked project or parent goal can provide the default workspace."
			inputId={`goal-artifact-path-${values.goalId ?? 'new'}`}
			label="Artifact path"
			name="artifactPath"
			options={folderOptions}
			placeholder="/absolute/path/to/goal/workspace"
		/>
	</div>

	<div class="flex flex-wrap items-center justify-between gap-3">
		{#if selectedParentGoalId}
			<p class="text-xs text-slate-500">
				Parent status:
				<span
					class={`ml-2 rounded-full border px-2 py-1 ${goalStatusToneClass(parentGoalMap.get(selectedParentGoalId)?.status ?? '')}`}
				>
					{formatGoalStatusLabel(parentGoalMap.get(selectedParentGoalId)?.status ?? 'ready')}
				</span>
			</p>
		{:else}
			<p class="text-xs text-slate-500">This goal will be created as a top-level outcome.</p>
		{/if}

		<button class="btn preset-filled-primary-500 font-semibold" type="submit">
			{submitLabel}
		</button>
	</div>
</form>
