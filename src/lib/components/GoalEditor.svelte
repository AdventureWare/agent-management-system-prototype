<script lang="ts">
	import { onMount, tick } from 'svelte';
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
		successSignal?: string;
		targetDate?: string;
		artifactPath?: string;
		parentGoalId?: string;
		projectIds?: string[];
		taskIds?: string[];
		area?: string;
		status?: string;
	};

	type GoalCoachPrompt = {
		id: string;
		label: string;
		helper: string;
		target: 'summary' | 'successSignal';
		mode: 'replaceIfEmpty' | 'append';
		text: string;
	};

	type GoalQualityCheck = {
		id: string;
		label: string;
		detail: string;
		passed: boolean;
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
		areaOptions,
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
		areaOptions: readonly string[];
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
	let area = $state('product');
	let status = $state('ready');
	let successSignal = $state('');
	let targetDate = $state('');
	let projectQuery = $state('');
	let taskQuery = $state('');
	let selectedProjectIds = $state.raw<string[]>([]);
	let selectedTaskIds = $state.raw<string[]>([]);
	let selectedParentGoalId = $state('');
	let artifactPath = $state('');
	let showProjectBrowser = $state(false);
	let showTaskBrowser = $state(false);
	let showWorkspaceEditor = $state(false);
	let lastValuesKey = $state('');
	let nameField: HTMLInputElement | undefined;
	let summaryField: HTMLTextAreaElement | undefined;
	let successSignalField: HTMLTextAreaElement | undefined;

	selectedProjectIds = getInitialProjectIds();
	selectedTaskIds = getInitialTaskIds();
	selectedParentGoalId = getInitialParentGoalId();
	artifactPath = getInitialArtifactPath();

	$effect(() => {
		const nextValuesKey = JSON.stringify({
			goalId: values.goalId ?? '',
			name: values.name ?? '',
			summary: values.summary ?? '',
			area: values.area ?? 'product',
			status: values.status ?? 'ready',
			successSignal: values.successSignal ?? '',
			targetDate: values.targetDate ?? '',
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
		area = values.area ?? 'product';
		status = values.status ?? 'ready';
		successSignal = values.successSignal ?? '';
		targetDate = values.targetDate ?? '';
		selectedProjectIds = [...(values.projectIds ?? [])];
		selectedTaskIds = [...(values.taskIds ?? [])];
		selectedParentGoalId = values.parentGoalId ?? '';
		artifactPath = values.artifactPath ?? '';
		showProjectBrowser = false;
		showTaskBrowser = false;
		showWorkspaceEditor = false;
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
			successSignal: values.successSignal ?? '',
			targetDate: values.targetDate ?? '',
			artifactPath: values.artifactPath ?? '',
			parentGoalId: values.parentGoalId ?? '',
			projectIds: values.projectIds ?? [],
			taskIds: values.taskIds ?? [],
			area: values.area ?? '',
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
			area = savedDraft.area ?? 'product';
			status = savedDraft.status ?? 'ready';
			successSignal = savedDraft.successSignal ?? '';
			targetDate = savedDraft.targetDate ?? '';
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
			area: area === 'product' ? '' : area,
			status: status === 'ready' ? '' : status,
			successSignal,
			targetDate,
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
	let normalizedName = $derived(name.trim());
	let normalizedSummary = $derived(summary.trim());
	let normalizedSuccessSignal = $derived(successSignal.trim());
	let hasOutcomeTitle = $derived(
		normalizedName.length >= 12 && normalizedName.split(/\s+/).filter(Boolean).length >= 3
	);
	let summaryExplainsOutcome = $derived(
		normalizedSummary.length >= 90 ||
			/\b(because|so that|so we can|in order to|for\s+\w+)\b/i.test(normalizedSummary)
	);
	let successSignalFeelsConcrete = $derived(
		normalizedSuccessSignal.length >= 28 &&
			(/\d/.test(normalizedSuccessSignal) ||
				/\b(reduce|increase|fewer|less|more|faster|slower|adoption|usage|retention|conversion|latency|errors|requests|quality|weekly|monthly|review|evidence|signal)\b/i.test(
					normalizedSuccessSignal
				))
	);
	let hasScopeContext = $derived(
		Boolean(
			selectedParentGoalId ||
			selectedProjectIds.length > 0 ||
			selectedTaskIds.length > 0 ||
			artifactPath.trim() ||
			recommendedArtifactPath
		)
	);
	let goalQualityChecks = $derived.by<GoalQualityCheck[]>(() => [
		{
			id: 'title',
			label: 'Outcome title is specific',
			detail: hasOutcomeTitle
				? 'The title reads like a concrete change, not a vague theme.'
				: 'Name the change you want, not the work to do. Example: "Reduce goal-linking confusion for operators."',
			passed: hasOutcomeTitle
		},
		{
			id: 'summary',
			label: 'Summary explains what changes and why',
			detail: summaryExplainsOutcome
				? 'The summary gives enough context to understand the point of the goal.'
				: 'Add 2-4 plain sentences covering what improves, who it helps, and why it matters now.',
			passed: summaryExplainsOutcome
		},
		{
			id: 'success',
			label: 'Success signal is observable',
			detail: successSignalFeelsConcrete
				? 'The goal has a visible proof point, not just intent.'
				: 'Write what evidence would convince you this goal is working: a metric, behavior change, or review outcome.',
			passed: successSignalFeelsConcrete
		},
		{
			id: 'context',
			label: 'Scope is anchored in context',
			detail: hasScopeContext
				? 'The goal is attached to a parent, linked work, or a workspace.'
				: 'Link a parent goal, project, task, or workspace so the goal has clear placement in the system.',
			passed: hasScopeContext
		}
	]);
	let goalQualityScore = $derived(goalQualityChecks.filter((check) => check.passed).length);
	let goalQualityLabel = $derived.by(() => {
		if (goalQualityScore >= 4) {
			return 'Ready to save';
		}

		if (goalQualityScore === 3) {
			return 'Solid draft';
		}

		if (goalQualityScore === 2) {
			return 'Getting clearer';
		}

		return 'Needs framing';
	});
	let goalQualityToneClass = $derived.by(() => {
		if (goalQualityScore >= 4) {
			return 'border-emerald-900/70 bg-emerald-950/30 text-emerald-100';
		}

		if (goalQualityScore === 3) {
			return 'border-sky-800/70 bg-sky-950/30 text-sky-100';
		}

		if (goalQualityScore === 2) {
			return 'border-amber-900/70 bg-amber-950/30 text-amber-100';
		}

		return 'border-rose-900/70 bg-rose-950/30 text-rose-100';
	});
	let nextCoachNudge = $derived(
		goalQualityChecks.find((check) => !check.passed)?.detail ??
			'This goal is specific enough to save. Use the relationship section only if the goal already needs linked context.'
	);
	let laneExample = $derived.by(() => {
		switch (area) {
			case 'growth':
				return {
					name: 'Increase qualified project intake from existing operator workflows',
					summary:
						'This goal makes it easier for operators already using the system to start new projects without losing context. It matters because better intake quality improves downstream planning and reduces setup churn.',
					successSignal:
						'We can point to more qualified project starts from returning operators, with fewer setup corrections during the first planning pass.'
				};
			case 'ops':
				return {
					name: 'Reduce planning overhead when connecting goals, tasks, and projects',
					summary:
						'This goal removes avoidable coordination friction in the control plane so operators can create and structure work in one pass. It matters because planning churn slows execution and creates stale links.',
					successSignal:
						'A new goal can be created and linked without follow-up cleanup, and fewer records need manual restructuring after the first save.'
				};
			case 'product':
			default:
				return {
					name: 'Help operators describe goals clearly before linking execution work',
					summary:
						'This goal improves the goal-writing flow so users can describe the outcome in natural language before dealing with structure. It matters because weak goal definitions make the rest of the planning model harder to trust.',
					successSignal:
						'Most new goals include a clear outcome, a concrete proof point, and enough context for linked work to make sense immediately.'
				};
		}
	});
	let coachPrompts = $derived.by<GoalCoachPrompt[]>(() => [
		{
			id: 'summary-starter',
			label: 'Start the summary',
			helper: 'Describe the change, who it helps, and why it matters.',
			target: 'summary',
			mode: 'replaceIfEmpty',
			text: `This goal improves [experience, system, or process] for [who]. It matters because [impact, blocker, or opportunity]. If it works, [what changes].`
		},
		{
			id: 'summary-why',
			label: 'Add the why-now',
			helper: 'Explain the urgency, pain, or opportunity behind the goal.',
			target: 'summary',
			mode: 'append',
			text: `It matters now because [current pain, risk, or opportunity].`
		},
		{
			id: 'success-starter',
			label: 'Start the success signal',
			helper: 'Define what evidence would make this feel real.',
			target: 'successSignal',
			mode: 'replaceIfEmpty',
			text: `We will know this is working when [observable behavior or metric] changes and we can verify it with [source of evidence].`
		},
		{
			id: 'success-review',
			label: 'Add a review check',
			helper: 'Give the goal a cadence or decision point.',
			target: 'successSignal',
			mode: 'append',
			text: `Review this against [metric, artifact, or feedback source] on [date or cadence].`
		}
	]);
	let trimmedArtifactPath = $derived(artifactPath.trim());
	let hasExplicitWorkspace = $derived(trimmedArtifactPath.length > 0);
	let workspaceSummaryLabel = $derived.by(() => {
		if (trimmedArtifactPath.length > 0 && trimmedArtifactPath === recommendedArtifactPath) {
			return 'Using recommended workspace';
		}

		if (trimmedArtifactPath.length > 0) {
			return 'Custom workspace';
		}

		if (recommendedArtifactPath) {
			return 'Will use linked workspace';
		}

		return 'Workspace still needed';
	});
	let workspaceSummaryToneClass = $derived.by(() => {
		if (trimmedArtifactPath.length > 0) {
			return 'border-emerald-900/60 bg-emerald-950/20 text-emerald-100';
		}

		if (recommendedArtifactPath) {
			return 'border-sky-800/50 bg-sky-950/20 text-sky-100';
		}

		return 'border-amber-900/60 bg-amber-950/20 text-amber-100';
	});
	let workspaceSummaryText = $derived.by(() => {
		if (trimmedArtifactPath.length > 0) {
			return trimmedArtifactPath;
		}

		if (recommendedArtifactPath) {
			return recommendedArtifactPath;
		}

		return 'Link a parent goal or project, or set a custom workspace before saving.';
	});
	let workspaceToggleLabel = $derived(
		showWorkspaceEditor
			? 'Hide workspace controls'
			: hasExplicitWorkspace
				? 'Change workspace'
				: 'Set custom workspace'
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

	function mergeCoachText(current: string, text: string, mode: GoalCoachPrompt['mode']) {
		if (mode === 'replaceIfEmpty') {
			return current.trim().length > 0 ? current : text;
		}

		return current.trim().length > 0 ? `${current.trim()}\n${text}` : text;
	}

	async function focusField(target: GoalCoachPrompt['target']) {
		await tick();

		if (target === 'summary') {
			summaryField?.focus();
			summaryField?.setSelectionRange(summaryField.value.length, summaryField.value.length);
			return;
		}

		successSignalField?.focus();
		successSignalField?.setSelectionRange(
			successSignalField.value.length,
			successSignalField.value.length
		);
	}

	async function applyCoachPrompt(prompt: GoalCoachPrompt) {
		if (prompt.target === 'summary') {
			summary = mergeCoachText(summary, prompt.text, prompt.mode);
		} else {
			successSignal = mergeCoachText(successSignal, prompt.text, prompt.mode);
		}

		await focusField(prompt.target);
	}

	async function applyLaneExample() {
		name = name.trim().length > 0 ? name : laneExample.name;
		summary = summary.trim().length > 0 ? summary : laneExample.summary;
		successSignal = successSignal.trim().length > 0 ? successSignal : laneExample.successSignal;
		await tick();
		nameField?.focus();
		nameField?.setSelectionRange(nameField.value.length, nameField.value.length);
	}

	function clearWorkspaceOverride() {
		artifactPath = '';
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
				State the outcome first. The coach helps you describe a useful goal before you worry about
				relationships.
			</p>
		</div>

		<div class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
			<div class="space-y-4">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
					<input
						bind:this={nameField}
						bind:value={name}
						class="input text-white placeholder:text-slate-500"
						name="name"
						placeholder="Reduce goal-linking confusion for operators…"
						required
					/>
					<span class="mt-2 block text-xs text-slate-500">
						Start with the change you want, not the task you plan to do.
					</span>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Summary</span>
					<textarea
						bind:this={summaryField}
						bind:value={summary}
						class="textarea min-h-32 text-white placeholder:text-slate-500"
						name="summary"
						placeholder="Describe what should be different if this goal succeeds, who it helps, and why it matters…"
						required
					></textarea>
					<span class="mt-2 block text-xs text-slate-500">
						Write 2-4 plain sentences. Good goals explain the change, the audience, and the reason.
					</span>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Success signal</span>
					<textarea
						bind:this={successSignalField}
						bind:value={successSignal}
						class="textarea min-h-24 text-white placeholder:text-slate-500"
						name="successSignal"
						placeholder="What evidence will show this goal is actually working…"
					></textarea>
					<span class="mt-2 block text-xs text-slate-500">
						This can be a metric, a visible behavior change, or a review condition.
					</span>
				</label>

				<div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Area</span>
						<select bind:value={area} class="select text-white" name="area">
							{#each areaOptions as areaOption (areaOption)}
								<option value={areaOption}>{areaOption}</option>
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
						<span class="mb-2 block text-sm font-medium text-slate-200">Parent goal</span>
						<select bind:value={selectedParentGoalId} class="select text-white" name="parentGoalId">
							<option value="">No parent goal</option>
							{#each parentGoalOptions as goal (goal.id)}
								<option value={goal.id}>{goal.name}</option>
							{/each}
						</select>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Target date</span>
						<input bind:value={targetDate} class="input text-white" name="targetDate" type="date" />
						<span class="mt-2 block text-xs text-slate-500">
							Optional. Use this when the outcome should land by a specific date.
						</span>
					</label>
				</div>
			</div>

			<aside class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-xs font-semibold tracking-[0.2em] text-sky-300 uppercase">Goal coach</p>
						<h4 class="mt-2 text-lg font-semibold text-white">{goalQualityLabel}</h4>
					</div>
					<span
						class={`rounded-full border px-3 py-1 text-xs font-medium tracking-[0.16em] uppercase ${goalQualityToneClass}`}
					>
						{goalQualityScore}/4 checks
					</span>
				</div>

				<p class={`rounded-2xl border px-4 py-3 text-sm ${goalQualityToneClass}`}>
					{nextCoachNudge}
				</p>

				<div class="space-y-2">
					{#each goalQualityChecks as check (check.id)}
						<div
							class={`rounded-2xl border px-3 py-3 text-sm ${check.passed ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-100' : 'border-slate-800 bg-slate-900/60 text-slate-300'}`}
						>
							<p class="font-medium">{check.label}</p>
							<p class={`mt-1 text-xs ${check.passed ? 'text-emerald-200/80' : 'text-slate-500'}`}>
								{check.detail}
							</p>
						</div>
					{/each}
				</div>

				<div class="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<div>
						<p class="text-sm font-medium text-slate-100">If you're stuck</p>
						<p class="mt-1 text-xs text-slate-500">
							Use one of these starters, then rewrite it in your own words.
						</p>
					</div>

					<div class="space-y-2">
						{#each coachPrompts as prompt (prompt.id)}
							<button
								class="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3 text-left transition hover:border-sky-500/40 hover:bg-slate-950"
								type="button"
								onclick={() => {
									applyCoachPrompt(prompt);
								}}
							>
								<span class="block text-sm font-medium text-white">{prompt.label}</span>
								<span class="mt-1 block text-xs text-slate-500">{prompt.helper}</span>
							</button>
						{/each}
					</div>

					<button
						class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-600 hover:text-white"
						type="button"
						onclick={applyLaneExample}
					>
						Fill empty fields from example
					</button>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<p class="text-sm font-medium text-slate-100">Example for the {area} area</p>
					<p class="mt-2 text-xs text-slate-500">Name</p>
					<p class="mt-1 text-sm text-slate-200">{laneExample.name}</p>
					<p class="mt-3 text-xs text-slate-500">Summary</p>
					<p class="mt-1 text-sm text-slate-300">{laneExample.summary}</p>
				</div>
			</aside>
		</div>
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
				Keep this lightweight. Most goals can inherit workspace from linked context, and only need a
				custom path when they truly live somewhere else.
			</p>
		</div>

		<div class={`rounded-2xl border px-4 py-4 ${workspaceSummaryToneClass}`}>
			<p class="text-xs font-semibold tracking-[0.16em] uppercase">{workspaceSummaryLabel}</p>
			<p class="ui-wrap-anywhere mt-2 text-sm">{workspaceSummaryText}</p>
		</div>

		<div class="flex flex-wrap gap-2">
			{#if recommendedArtifactPath && trimmedArtifactPath !== recommendedArtifactPath}
				<button
					class="rounded-full border border-sky-700/60 bg-sky-950/40 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-100 uppercase transition hover:border-sky-600 hover:text-white"
					type="button"
					onclick={() => {
						artifactPath = recommendedArtifactPath;
					}}
				>
					Use recommended workspace
				</button>
			{/if}

			<button
				class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-600 hover:text-white"
				type="button"
				onclick={() => {
					showWorkspaceEditor = !showWorkspaceEditor;
				}}
			>
				{workspaceToggleLabel}
			</button>

			{#if hasExplicitWorkspace}
				<button
					class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white"
					type="button"
					onclick={clearWorkspaceOverride}
				>
					Clear custom workspace
				</button>
			{/if}
		</div>

		{#if showWorkspaceEditor}
			<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
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
		{/if}
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
