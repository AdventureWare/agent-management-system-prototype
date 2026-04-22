<script lang="ts">
	import { afterNavigate, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import CollectionToolbar from '$lib/components/CollectionToolbar.svelte';
	import DataTableSection from '$lib/components/DataTableSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		formatTaskStatusLabel,
		formatWorkflowStatusLabel,
		taskStatusToneClass,
		workflowStatusToneClass
	} from '$lib/types/control-plane';
	import type { ControlPlaneData } from '$lib/types/control-plane';
	import type { WorkflowDisplayRecord } from '$lib/server/workflows';

	type WorkflowsPageData = {
		deleteSuccess: boolean;
		projects: ControlPlaneData['projects'];
		roles: ControlPlaneData['roles'];
		workflows: WorkflowDisplayRecord[];
	};

	let { data }: { data: WorkflowsPageData } = $props();

	type DirectoryState = {
		query: string;
		projectId: string;
		status: string;
		workflowId: string;
	};

	let routerReady = $state(false);
	let initialDirectoryState = readDirectoryState(page.url);
	let query = $state(initialDirectoryState.query);
	let selectedProjectId = $state(initialDirectoryState.projectId);
	let selectedStatus = $state(initialDirectoryState.status);
	let selectedWorkflowId = $state(initialDirectoryState.workflowId);

	let totalStepCount = $derived(
		data.workflows.reduce(
			(count: number, workflow: WorkflowDisplayRecord) => count + workflow.steps.length,
			0
		)
	);
	let totalGeneratedTaskCount = $derived(
		data.workflows.reduce(
			(count: number, workflow: WorkflowDisplayRecord) => count + workflow.rollup.taskCount,
			0
		)
	);
	let activeWorkflowCount = $derived(
		data.workflows.filter(
			(workflow: WorkflowDisplayRecord) => workflow.rollup.derivedStatus === 'active'
		).length
	);
	let filteredWorkflows = $derived.by(() => {
		const normalizedQuery = query.trim().toLowerCase();

		return data.workflows.filter((workflow: WorkflowDisplayRecord) => {
			const matchesQuery =
				!normalizedQuery ||
				[
					workflow.name,
					workflow.summary,
					workflow.projectName,
					...workflow.steps.map((step: WorkflowDisplayRecord['steps'][number]) => step.title),
					...workflow.taskPreview.map(
						(task: WorkflowDisplayRecord['taskPreview'][number]) => task.title
					)
				].some((value) => value.toLowerCase().includes(normalizedQuery));
			const matchesProject =
				selectedProjectId === 'all' || workflow.projectId === selectedProjectId;
			const matchesStatus =
				selectedStatus === 'all' || workflow.rollup.derivedStatus === selectedStatus;

			return matchesQuery && matchesProject && matchesStatus;
		});
	});
	let selectedWorkflow = $derived(
		filteredWorkflows.find(
			(workflow: WorkflowDisplayRecord) => workflow.id === selectedWorkflowId
		) ??
			filteredWorkflows[0] ??
			null
	);

	function readDirectoryState(url: URL): DirectoryState {
		return {
			query: url.searchParams.get('q')?.trim() ?? '',
			projectId: url.searchParams.get('project')?.trim() || 'all',
			status: url.searchParams.get('status')?.trim() || 'all',
			workflowId: url.searchParams.get('workflow')?.trim() ?? ''
		};
	}

	function setParam(url: URL, key: string, value: string) {
		if (value) {
			url.searchParams.set(key, value);
			return;
		}

		url.searchParams.delete(key);
	}

	$effect(() => {
		if (!selectedWorkflowId) {
			selectedWorkflowId = data.workflows[0]?.id ?? '';
		}
	});

	$effect(() => {
		if (
			filteredWorkflows.some(
				(workflow: WorkflowDisplayRecord) => workflow.id === selectedWorkflowId
			)
		) {
			return;
		}

		selectedWorkflowId = filteredWorkflows[0]?.id ?? '';
	});

	$effect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const syncFromLocation = () => {
			const nextState = readDirectoryState(new URL(window.location.href));
			query = nextState.query;
			selectedProjectId = nextState.projectId;
			selectedStatus = nextState.status;
			selectedWorkflowId = nextState.workflowId;
		};

		window.addEventListener('popstate', syncFromLocation);

		return () => {
			window.removeEventListener('popstate', syncFromLocation);
		};
	});

	afterNavigate(() => {
		routerReady = true;
	});

	$effect(() => {
		if (typeof window === 'undefined' || !routerReady) {
			return;
		}

		const currentUrl = new URL(window.location.href);
		const nextUrl = new URL(currentUrl);
		setParam(nextUrl, 'q', query.trim());
		setParam(nextUrl, 'project', selectedProjectId !== 'all' ? selectedProjectId : '');
		setParam(nextUrl, 'status', selectedStatus !== 'all' ? selectedStatus : '');
		setParam(nextUrl, 'workflow', selectedWorkflowId);
		nextUrl.searchParams.delete('deleted');

		const currentPath = `${currentUrl.pathname}${currentUrl.search}`;
		const nextPath = `${nextUrl.pathname}${nextUrl.search}`;

		if (currentPath === nextPath) {
			return;
		}

		replaceState(nextUrl, page.state);
	});
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Workflows"
		title="Workflow templates"
		description="Browse reusable workflows as a directory first, then open a template to edit sequencing, defaults, and instantiation details."
	>
		{#snippet actions()}
			<AppButton href={resolve('/app/tasks')} variant="neutral">Open tasks</AppButton>
		{/snippet}
	</PageHeader>

	{#if data.deleteSuccess}
		<p
			aria-live="polite"
			class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200"
		>
			Workflow template deleted.
		</p>
	{/if}

	<div class="grid gap-4 md:grid-cols-3">
		<MetricCard
			label="Templates"
			value={data.workflows.length}
			detail="Reusable workflow definitions available across the workspace."
		/>
		<MetricCard
			label="Active templates"
			value={activeWorkflowCount}
			detail="Templates that currently have runnable or in-progress generated work."
		/>
		<MetricCard
			label="Generated tasks"
			value={totalGeneratedTaskCount}
			detail={`Across ${totalStepCount} saved step${totalStepCount === 1 ? '' : 's'} in the library.`}
		/>
	</div>

	<CollectionToolbar
		title="Workflow directory"
		description="Search templates, preview the structure, and open one only when you need to edit or instantiate it."
	>
		{#snippet controls()}
			<div class="flex flex-col gap-3 xl:w-[54rem]">
				<div class="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
					<label class="block">
						<span class="sr-only">Search workflows</span>
						<input
							bind:value={query}
							class="input text-white placeholder:text-slate-500"
							data-persist-off
							placeholder="Search workflows, steps, or generated tasks…"
						/>
					</label>

					<label class="block">
						<span class="sr-only">Filter workflows by project</span>
						<select bind:value={selectedProjectId} class="select text-white" data-persist-off>
							<option value="all">All projects</option>
							{#each data.projects as project (project.id)}
								<option value={project.id}>{project.name}</option>
							{/each}
						</select>
					</label>

					<label class="block">
						<span class="sr-only">Filter workflows by status</span>
						<select bind:value={selectedStatus} class="select text-white" data-persist-off>
							<option value="all">All statuses</option>
							<option value="draft">Draft</option>
							<option value="active">Active</option>
							<option value="review">Review</option>
							<option value="blocked">Blocked</option>
							<option value="done">Done</option>
							<option value="canceled">Canceled</option>
						</select>
					</label>
				</div>

				<div class="flex flex-wrap justify-end gap-3">
					{#if selectedWorkflow}
						<AppButton href={resolve(`/app/workflows/${selectedWorkflow.id}`)} variant="neutral">
							Open selected workflow
						</AppButton>
					{/if}
					<AppButton href={resolve('/app/workflows/new')} variant="primary">
						Create workflow
					</AppButton>
				</div>
			</div>
		{/snippet}
	</CollectionToolbar>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,0.9fr)]">
		<DataTableSection
			title="Templates"
			description="Preview a workflow from the directory, then open its detail page when you need the full editor."
			summary={`${filteredWorkflows.length} matching template${filteredWorkflows.length === 1 ? '' : 's'}`}
			empty={filteredWorkflows.length === 0}
			emptyMessage="No workflow templates match the current search or filters."
		>
			<div class="space-y-3 xl:hidden">
				{#each filteredWorkflows as workflow (workflow.id)}
					<article
						class={[
							'rounded-2xl border border-slate-800 bg-slate-950/45 p-4 transition',
							selectedWorkflow?.id === workflow.id ? 'border-sky-500/50 bg-slate-900/80' : ''
						]}
					>
						<button
							class="block w-full rounded-xl text-left transition outline-none hover:text-sky-200 focus-visible:ring-2 focus-visible:ring-sky-400"
							type="button"
							onclick={() => {
								selectedWorkflowId = workflow.id;
							}}
						>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="ui-wrap-anywhere text-sm font-semibold text-white">{workflow.name}</p>
									<p class="ui-clamp-3 mt-2 text-sm text-slate-400">{workflow.summary}</p>
								</div>
								<span
									class={`badge shrink-0 border text-[0.7rem] tracking-[0.2em] uppercase ${workflowStatusToneClass(workflow.rollup.derivedStatus)}`}
								>
									{formatWorkflowStatusLabel(workflow.rollup.derivedStatus)}
								</span>
							</div>
						</button>

						<div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
							<span class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
								Project · {workflow.projectName}
							</span>
							<span class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
								{workflow.steps.length} step{workflow.steps.length === 1 ? '' : 's'}
							</span>
							<span class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
								Generated · {workflow.rollup.taskCount}
							</span>
						</div>

						{#if selectedWorkflow?.id === workflow.id}
							<div class="mt-4 space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
								<div class="flex items-center justify-between gap-3">
									<p class="text-sm font-medium text-white">Quick preview</p>
									<p class="text-xs text-slate-500">Top steps and current usage</p>
								</div>

								<div class="grid gap-3 sm:grid-cols-2">
									<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Execution</p>
										<p class="mt-2 text-sm text-white">
											{workflow.rollup.runnableTaskCount} runnable task{workflow.rollup
												.runnableTaskCount === 1
												? ''
												: 's'}
										</p>
										<p class="mt-1 text-xs text-slate-500">
											{workflow.parallelizableStepCount} parallel-ready step{workflow.parallelizableStepCount ===
											1
												? ''
												: 's'}
										</p>
									</div>
									<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Defaults</p>
										<p class="mt-2 text-sm text-white">
											{workflow.defaultRoleCount} step{workflow.defaultRoleCount === 1 ? '' : 's'} with
											role defaults
										</p>
										<p class="mt-1 text-xs text-slate-500">
											{workflow.rollup.inProgressCount} in progress · {workflow.rollup.reviewCount}
											{' '}in review
										</p>
									</div>
								</div>

								<div class="space-y-2">
									<p class="text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">
										First steps
									</p>
									<div class="space-y-2">
										{#each workflow.steps.slice(0, 2) as step (step.id)}
											<div class="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
												<p class="ui-wrap-anywhere text-sm font-medium text-white">
													Step {step.position} · {step.title}
												</p>
												{#if step.dependsOnStepTitles.length > 0}
													<p class="mt-1 text-xs text-slate-500">
														Depends on {step.dependsOnStepTitles.join(', ')}
													</p>
												{:else if step.canRunInParallel}
													<p class="mt-1 text-xs text-slate-500">Can start in parallel.</p>
												{/if}
											</div>
										{/each}
									</div>
									{#if workflow.steps.length > 2}
										<p class="text-xs text-slate-500">
											{workflow.steps.length - 2} more step{workflow.steps.length - 2 === 1
												? ''
												: 's'} on the detail page.
										</p>
									{/if}
								</div>

								<div class="flex flex-wrap gap-3">
									<AppButton href={resolve(`/app/workflows/${workflow.id}`)} variant="primary">
										Open workflow detail
									</AppButton>
									<a
										class="inline-flex items-center rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.16em] text-slate-300 uppercase transition hover:border-slate-500 hover:text-white"
										href={resolve(`/app/tasks?workflowId=${workflow.id}`)}
									>
										View generated tasks
									</a>
								</div>
							</div>
						{/if}
					</article>
				{/each}
			</div>

			<table class="hidden min-w-full divide-y divide-slate-800 text-left xl:table">
				<thead class="bg-slate-900/70">
					<tr class="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
						<th class="px-4 py-3">Workflow</th>
						<th class="px-4 py-3">Status</th>
						<th class="px-4 py-3">Project</th>
						<th class="px-4 py-3">Steps</th>
						<th class="px-4 py-3">Generated</th>
						<th class="px-4 py-3">Open</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-800 bg-slate-950/40">
					{#each filteredWorkflows as workflow (workflow.id)}
						<tr
							class={[
								'align-top transition hover:bg-slate-900/60',
								selectedWorkflow?.id === workflow.id ? 'bg-slate-900/80' : ''
							]}
						>
							<td class="px-4 py-4">
								<button
									class="block w-full rounded-lg text-left transition outline-none hover:text-sky-200 focus-visible:ring-2 focus-visible:ring-sky-400"
									type="button"
									onclick={() => {
										selectedWorkflowId = workflow.id;
									}}
								>
									<p class="ui-wrap-anywhere text-sm font-semibold text-white">{workflow.name}</p>
									<p class="ui-clamp-2 mt-2 text-sm text-slate-400">{workflow.summary}</p>
								</button>
							</td>
							<td class="px-4 py-4">
								<span
									class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${workflowStatusToneClass(workflow.rollup.derivedStatus)}`}
								>
									{formatWorkflowStatusLabel(workflow.rollup.derivedStatus)}
								</span>
							</td>
							<td class="px-4 py-4 text-sm text-slate-300">{workflow.projectName}</td>
							<td class="px-4 py-4 text-sm text-slate-300">
								{workflow.steps.length} step{workflow.steps.length === 1 ? '' : 's'}
								{#if workflow.parallelizableStepCount > 0}
									<p class="mt-1 text-xs text-slate-500">
										{workflow.parallelizableStepCount} parallel-ready
									</p>
								{/if}
							</td>
							<td class="px-4 py-4 text-sm text-slate-300">
								{workflow.rollup.taskCount}
								{#if workflow.rollup.runnableTaskCount > 0}
									<p class="mt-1 text-xs text-slate-500">
										{workflow.rollup.runnableTaskCount} runnable now
									</p>
								{/if}
							</td>
							<td class="px-4 py-4">
								<a
									class="inline-flex rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.16em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
									href={resolve(`/app/workflows/${workflow.id}`)}
								>
									Open
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</DataTableSection>

		<section class="xl:ui-panel hidden space-y-5 xl:block">
			<div class="flex items-start justify-between gap-3">
				<div>
					<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">Preview</p>
					<h2 class="mt-2 text-xl font-semibold text-white">
						{selectedWorkflow ? selectedWorkflow.name : 'Select a workflow'}
					</h2>
					<p class="mt-2 text-sm text-slate-400">
						{selectedWorkflow
							? 'Keep this view lightweight, then open the detail page for editing, instantiation, and deeper history.'
							: 'Choose a workflow row to inspect the high-level structure before drilling in.'}
					</p>
				</div>

				{#if selectedWorkflow}
					<span
						class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${workflowStatusToneClass(selectedWorkflow.rollup.derivedStatus)}`}
					>
						{formatWorkflowStatusLabel(selectedWorkflow.rollup.derivedStatus)}
					</span>
				{/if}
			</div>

			{#if selectedWorkflow}
				<div class="space-y-4">
					<p class="text-sm text-slate-300">{selectedWorkflow.summary}</p>

					<div class="flex flex-wrap gap-2 text-xs text-slate-400">
						<span class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
							Project · {selectedWorkflow.projectName}
						</span>
						<span class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
							{selectedWorkflow.steps.length} step{selectedWorkflow.steps.length === 1 ? '' : 's'}
						</span>
						<span class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
							Generated tasks · {selectedWorkflow.rollup.taskCount}
						</span>
					</div>

					<div class="grid gap-3 sm:grid-cols-2">
						<div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Defaults</p>
							<p class="mt-2 text-sm text-white">
								{selectedWorkflow.defaultRoleCount} step{selectedWorkflow.defaultRoleCount === 1
									? ''
									: 's'} with default roles
							</p>
							<p class="mt-1 text-xs text-slate-500">
								{selectedWorkflow.parallelizableStepCount > 0
									? `${selectedWorkflow.parallelizableStepCount} step${selectedWorkflow.parallelizableStepCount === 1 ? '' : 's'} can start in parallel.`
									: 'Every later step currently waits on at least one dependency.'}
							</p>
						</div>
						<div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Current usage</p>
							<p class="mt-2 text-sm text-white">
								{selectedWorkflow.rollup.runnableTaskCount} runnable task{selectedWorkflow.rollup
									.runnableTaskCount === 1
									? ''
									: 's'}
							</p>
							<p class="mt-1 text-xs text-slate-500">
								{selectedWorkflow.rollup.inProgressCount} in progress · {selectedWorkflow.rollup
									.reviewCount}
								{' '}in review
							</p>
						</div>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
						<div class="flex items-center justify-between gap-3">
							<p class="text-sm font-medium text-white">Step outline</p>
							<p class="text-xs text-slate-500">Previewing the first few steps only</p>
						</div>

						<div class="mt-4 space-y-3">
							{#each selectedWorkflow.steps.slice(0, 3) as step (step.id)}
								<div class="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div class="min-w-0">
											<p class="ui-wrap-anywhere text-sm font-medium text-white">
												Step {step.position} · {step.title}
											</p>
											{#if step.summary}
												<p class="mt-1 text-xs text-slate-400">{step.summary}</p>
											{/if}
											{#if step.dependsOnStepTitles.length > 0}
												<p class="mt-2 text-xs text-slate-500">
													Depends on {step.dependsOnStepTitles.join(', ')}
												</p>
											{:else if step.canRunInParallel}
												<p class="mt-2 text-xs text-slate-500">Can start in parallel.</p>
											{/if}
										</div>
										<span
											class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-300"
										>
											{step.desiredRoleName ? step.desiredRoleName : 'No default role'}
										</span>
									</div>
								</div>
							{/each}

							{#if selectedWorkflow.steps.length > 3}
								<p class="text-xs text-slate-500">
									{selectedWorkflow.steps.length - 3} more step{selectedWorkflow.steps.length -
										3 ===
									1
										? ''
										: 's'} available on the detail page.
								</p>
							{/if}
						</div>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
						<div class="flex items-center justify-between gap-3">
							<p class="text-sm font-medium text-white">Recent generated tasks</p>
							<p class="text-xs text-slate-500">
								{selectedWorkflow.taskPreview.length} of {selectedWorkflow.rollup.taskCount}
							</p>
						</div>

						{#if selectedWorkflow.taskPreview.length === 0}
							<p class="mt-4 text-sm text-slate-400">
								This template has not been instantiated yet.
							</p>
						{:else}
							<div class="mt-4 space-y-3">
								{#each selectedWorkflow.taskPreview.slice(0, 3) as task (task.id)}
									<div
										class="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3"
									>
										<div class="flex flex-wrap items-center justify-between gap-3">
											<a
												class="ui-wrap-anywhere text-sm font-medium text-white transition hover:text-sky-300"
												href={resolve(`/app/tasks/${task.id}`)}
											>
												{task.title}
											</a>
											<span
												class={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-center text-[11px] leading-none uppercase ${taskStatusToneClass(task.status)}`}
											>
												{formatTaskStatusLabel(task.status)}
											</span>
										</div>
										<p class="text-xs text-slate-500">{task.projectName}</p>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<AppButton href={resolve(`/app/workflows/${selectedWorkflow.id}`)} variant="primary">
						Open workflow detail
					</AppButton>
				</div>
			{:else}
				<div class="rounded-2xl border border-dashed border-slate-800 bg-slate-950/35 p-6">
					<p class="text-sm text-slate-300">
						No workflow is selected yet because nothing matches the current search or filters.
					</p>
				</div>
			{/if}
		</section>
	</div>
</AppPage>
