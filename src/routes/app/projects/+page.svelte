<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { clearFormDraft, readFormDraft, writeFormDraft } from '$lib/client/form-drafts';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import CollectionToolbar from '$lib/components/CollectionToolbar.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import PathField from '$lib/components/PathField.svelte';

	let { data, form } = $props();
	const CREATE_PROJECT_DRAFT_KEY = 'ams:create-project';

	let createProjectDraftReady = $state(false);
	let projectName = $state('');
	let projectSummary = $state('');
	let projectRootFolder = $state('');
	let defaultArtifactRoot = $state('');
	let defaultRepoPath = $state('');
	let defaultRepoUrl = $state('');
	let defaultBranch = $state('');
	let defaultThreadSandbox = $state('');
	let query = $state('');

	function modalShouldStartOpen() {
		return Boolean(form?.message);
	}

	let isCreateModalOpen = $state(modalShouldStartOpen());

	let configuredRepoCount = $derived(
		data.projects.filter((project) => project.defaultRepoPath || project.defaultRepoUrl).length
	);
	let createSuccess = $derived(form?.ok && form?.successAction === 'createProject');
	let deleteSuccess = $derived(data.deleted);

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
			project.defaultBranch,
			project.defaultThreadSandbox ?? ''
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

	onMount(() => {
		if (createSuccess) {
			clearFormDraft(CREATE_PROJECT_DRAFT_KEY);
			createProjectDraftReady = true;
			return;
		}

		const savedDraft = readFormDraft<{
			name: string;
			summary: string;
			projectRootFolder: string;
			defaultArtifactRoot: string;
			defaultRepoPath: string;
			defaultRepoUrl: string;
			defaultBranch: string;
			defaultThreadSandbox: string;
		}>(CREATE_PROJECT_DRAFT_KEY);

		if (savedDraft) {
			projectName = savedDraft.name ?? '';
			projectSummary = savedDraft.summary ?? '';
			projectRootFolder = savedDraft.projectRootFolder ?? '';
			defaultArtifactRoot = savedDraft.defaultArtifactRoot ?? '';
			defaultRepoPath = savedDraft.defaultRepoPath ?? '';
			defaultRepoUrl = savedDraft.defaultRepoUrl ?? '';
			defaultBranch = savedDraft.defaultBranch ?? '';
			defaultThreadSandbox = savedDraft.defaultThreadSandbox ?? '';
			isCreateModalOpen = true;
		}

		createProjectDraftReady = true;
	});

	$effect(() => {
		if (!createProjectDraftReady) {
			return;
		}

		writeFormDraft(CREATE_PROJECT_DRAFT_KEY, {
			name: projectName,
			summary: projectSummary,
			projectRootFolder,
			defaultArtifactRoot,
			defaultRepoPath,
			defaultRepoUrl,
			defaultBranch,
			defaultThreadSandbox
		});
	});
</script>

<AppPage>
	<PageHeader
		eyebrow="Projects"
		title="Browse project contexts first"
		description="The project page should act like a directory, not a wall of forms. Search for the project you want, then open one detail page to edit defaults, inspect linked work, and see how that project is being used."
	>
		{#snippet actions()}
			<AppButton
				type="button"
				variant="primary"
				onclick={() => {
					isCreateModalOpen = true;
				}}
			>
				Add project
			</AppButton>
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

	{#if deleteSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Project deleted.
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
							<p class="ui-clamp-2">
								<span class="text-slate-500">Thread sandbox:</span>
								{project.defaultThreadSandbox || 'Inherit provider default'}
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
		<form class="space-y-6" method="POST" action="?/createProject" data-persist-scope="manual">
			<div class="space-y-4">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
					<input
						bind:value={projectName}
						class="input text-white placeholder:text-slate-500"
						name="name"
						placeholder="Kwipoo"
						required
					/>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Summary</span>
					<textarea
						bind:value={projectSummary}
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
							bind:value={defaultRepoUrl}
							class="input text-white placeholder:text-slate-500"
							name="defaultRepoUrl"
							placeholder="git@github.com:org/repo.git"
						/>
					</label>
				</div>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Default branch</span>
					<input
						bind:value={defaultBranch}
						class="input text-white placeholder:text-slate-500"
						name="defaultBranch"
						placeholder="main"
					/>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">
						Default thread sandbox
					</span>
					<select
						bind:value={defaultThreadSandbox}
						class="select text-white"
						name="defaultThreadSandbox"
					>
						<option value="">Inherit provider default</option>
						{#each data.sandboxOptions as sandbox (sandbox)}
							<option value={sandbox}>{sandbox}</option>
						{/each}
					</select>
					<span class="mt-2 block text-xs text-slate-500">
						Use this when one project consistently needs a broader sandbox than the global provider
						default.
					</span>
				</label>
			</div>

			<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<AppButton type="button" variant="neutral" onclick={closeCreateModal}>Cancel</AppButton>
				<AppButton type="submit" variant="primary">Create project</AppButton>
			</div>
		</form>
	</AppDialog>
{/if}
