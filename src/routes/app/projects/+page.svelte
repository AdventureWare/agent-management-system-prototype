<script lang="ts">
	import { resolve } from '$app/paths';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import CollectionToolbar from '$lib/components/CollectionToolbar.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import PathField from '$lib/components/PathField.svelte';

	let { data, form } = $props();
	let projectRootFolder = $state('');
	let defaultArtifactRoot = $state('');
	let defaultRepoPath = $state('');
	let query = $state('');

	function modalShouldStartOpen() {
		return Boolean(form?.message);
	}

	let isCreateModalOpen = $state(modalShouldStartOpen());

	let configuredRepoCount = $derived(
		data.projects.filter((project) => project.defaultRepoPath || project.defaultRepoUrl).length
	);
	let createSuccess = $derived(form?.ok && form?.successAction === 'createProject');

	function matchesProject(project: (typeof data.projects)[number], term: string) {
		const normalizedTerm = term.trim().toLowerCase();

		if (!normalizedTerm) {
			return true;
		}

		return [
			project.name,
			project.summary,
			project.projectRootFolder,
			project.defaultArtifactRoot,
			project.defaultRepoPath,
			project.defaultRepoUrl,
			project.defaultBranch
		]
			.join(' ')
			.toLowerCase()
			.includes(normalizedTerm);
	}

	let filteredProjects = $derived(
		data.projects.filter((project) => matchesProject(project, query))
	);

	function closeCreateModal() {
		isCreateModalOpen = false;
	}
</script>

<AppPage>
	<PageHeader
		eyebrow="Projects"
		title="Browse project contexts first"
		description="The project page should act like a directory, not a wall of forms. Search for the project you want, then open one detail page to edit defaults, inspect linked work, and see how that project is being used."
	>
		{#snippet actions()}
			<button
				class="btn preset-filled-primary-500 font-semibold"
				type="button"
				onclick={() => {
					isCreateModalOpen = true;
				}}
			>
				Add project
			</button>
		{/snippet}
	</PageHeader>

	{#if form?.message}
		<p class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if createSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Project created and saved into the control plane.
		</p>
	{/if}

	<CollectionToolbar
		title="Project directory"
		description="Search by name, summary, path, or repo hint, then open the project you want."
	>
		{#snippet controls()}
			<div class="w-full xl:w-80">
				<label class="sr-only" for="project-search">Search projects</label>
				<input
					id="project-search"
					bind:value={query}
					class="input text-white placeholder:text-slate-500"
					placeholder="Search projects"
				/>
			</div>
		{/snippet}

		{#if filteredProjects.length === 0}
			<p class="ui-empty-state mt-6">No projects match the current search.</p>
		{:else}
			<div class="mt-6 grid gap-4 md:grid-cols-2">
				{#each filteredProjects as project (project.id)}
					<a
						class="group flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-400/40 hover:bg-slate-900"
						href={resolve(`/app/projects/${project.id}`)}
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 space-y-2">
								<h3
									class="ui-wrap-anywhere text-lg font-semibold text-white transition group-hover:text-sky-200"
								>
									{project.name}
								</h3>
								<p class="ui-clamp-3 text-sm text-slate-300">{project.summary}</p>
							</div>
						</div>

						<div class="mt-4 grid gap-3 sm:grid-cols-3">
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Linked tasks</p>
								<p class="mt-2 text-lg font-semibold text-white">{project.taskCount}</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Goals in scope</p>
								<p class="mt-2 text-lg font-semibold text-white">{project.goalCount}</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Repo defaults</p>
								<p class="mt-2 text-lg font-semibold text-white">
									{project.defaultRepoPath || project.defaultRepoUrl ? 'Ready' : 'Unset'}
								</p>
							</div>
						</div>

						<div class="mt-4 space-y-2 text-sm text-slate-400">
							<p class="ui-clamp-2">
								<span class="text-slate-500">Root:</span>
								{project.projectRootFolder || 'Not configured'}
							</p>
							<p class="ui-clamp-2">
								<span class="text-slate-500">Artifact root:</span>
								{project.defaultArtifactRoot || 'Not configured'}
							</p>
							<p class="ui-clamp-2">
								<span class="text-slate-500">Branch:</span>
								{project.defaultBranch || 'Not configured'}
							</p>
						</div>

						<div
							class="mt-5 flex items-center justify-between border-t border-slate-800 pt-4 text-xs font-medium tracking-[0.16em] text-slate-500 uppercase"
						>
							<span>{project.defaultRepoUrl ? 'Repo attached' : 'No remote repo'}</span>
							<span class="text-sky-300 transition group-hover:text-sky-200"> Open details </span>
						</div>
					</a>
				{/each}
			</div>
		{/if}

		<div class="mt-6">
			<MetricCard
				label="Repo coverage"
				value={configuredRepoCount}
				detail="Projects with a checkout path or remote repo already attached."
			/>
		</div>
	</CollectionToolbar>
</AppPage>

{#if isCreateModalOpen}
	<AppDialog
		bind:open={isCreateModalOpen}
		title="Add project"
		description="Capture durable defaults here. Editing and linked activity live on the detail page after creation."
		closeLabel="Close add project form"
	>
		<form class="space-y-6" method="POST" action="?/createProject">
			<div class="space-y-4">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
					<input
						class="input text-white placeholder:text-slate-500"
						name="name"
						placeholder="Kwipoo"
						required
					/>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Summary</span>
					<textarea
						class="textarea min-h-28 text-white placeholder:text-slate-500"
						name="summary"
						placeholder="What this project covers and what defaults other work should inherit."
						required
					></textarea>
				</label>

				<div class="grid gap-4 lg:grid-cols-2">
					<div>
						<PathField
							bind:value={projectRootFolder}
							createMode="folder"
							helperText="Sets the default folder agents should enter for this project."
							inputId="create-project-root-folder"
							label="Project root folder"
							name="projectRootFolder"
							options={data.folderOptions}
							placeholder="/absolute/path/to/project/root"
						/>
					</div>

					<div>
						<PathField
							bind:value={defaultArtifactRoot}
							createMode="folder"
							helperText="Create this upfront if you want downstream work to reuse one artifact root."
							inputId="create-default-artifact-root"
							label="Default artifact root"
							name="defaultArtifactRoot"
							options={data.folderOptions}
							placeholder="/absolute/path/to/project/artifacts"
						/>
					</div>

					<div>
						<PathField
							bind:value={defaultRepoPath}
							createMode="folder"
							helperText="Useful when the repo checkout folder does not exist yet."
							inputId="create-default-repo-path"
							label="Default repo path"
							name="defaultRepoPath"
							options={data.folderOptions}
							placeholder="/absolute/path/to/local/checkout"
						/>
					</div>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Default repo URL</span>
						<input
							class="input text-white placeholder:text-slate-500"
							name="defaultRepoUrl"
							placeholder="git@github.com:org/repo.git"
						/>
					</label>
				</div>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Default branch</span>
					<input
						class="input text-white placeholder:text-slate-500"
						name="defaultBranch"
						placeholder="main"
					/>
				</label>
			</div>

			<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<button
					class="btn border border-slate-700 text-slate-200 hover:border-slate-600"
					type="button"
					onclick={closeCreateModal}
				>
					Cancel
				</button>
				<button class="btn preset-filled-primary-500 font-semibold" type="submit">
					Create project
				</button>
			</div>
		</form>
	</AppDialog>
{/if}
