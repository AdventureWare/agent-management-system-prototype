<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { getHiddenCollapsedRowCount } from '$lib/client/collection-visibility';
	import { clearFormDraft, readFormDraft, writeFormDraft } from '$lib/client/form-drafts';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import CollectionToolbar from '$lib/components/CollectionToolbar.svelte';
	import DataTableSection from '$lib/components/DataTableSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import PathField from '$lib/components/PathField.svelte';

	let { data, form } = $props();
	const CREATE_PROJECT_DRAFT_KEY = 'ams:create-project';
	const ROOT_PROJECT_PARENT_KEY = '__root__';

	type ProjectDirectoryProject = (typeof data.projects)[number];
	type ProjectDirectoryRow = ProjectDirectoryProject & {
		depth: number;
		visibleChildCount: number;
		isExpanded: boolean;
		isDirectMatch: boolean;
		isContextRow: boolean;
	};
	type ProjectDirectoryState = {
		rows: ProjectDirectoryRow[];
		matchingRowCount: number;
		hiddenCollapsedRowCount: number;
	};

	let createProjectDraftReady = $state(false);
	let projectName = $state('');
	let projectSummary = $state('');
	let parentProjectId = $state('');
	let projectRootFolder = $state('');
	let defaultArtifactRoot = $state('');
	let defaultRepoPath = $state('');
	let defaultRepoUrl = $state('');
	let defaultBranch = $state('');
	let additionalWritableRoots = $state('');
	let defaultThreadSandbox = $state('');
	let query = $state('');
	let collapsedProjectIds = $state.raw<string[]>([]);

	function modalShouldStartOpen() {
		return Boolean(form?.message);
	}

	let isCreateModalOpen = $state(modalShouldStartOpen());

	let createSuccess = $derived(form?.ok && form?.successAction === 'createProject');
	let deleteSuccess = $derived(data.deleted);

	function matchesProject(project: ProjectDirectoryProject, term: string) {
		const normalizedTerm = term.trim().toLowerCase();

		if (!normalizedTerm) {
			return true;
		}

		return [
			project.name,
			project.parentProjectName ?? '',
			project.lineageLabel ?? '',
			project.summary,
			project.projectRootFolder,
			project.defaultArtifactRoot,
			project.defaultRepoPath,
			project.defaultRepoUrl,
			project.defaultBranch,
			(project.additionalWritableRoots ?? []).join(' '),
			project.defaultThreadSandbox ?? ''
		]
			.join(' ')
			.toLowerCase()
			.includes(normalizedTerm);
	}

	let forceExpandedTree = $derived(query.trim().length > 0);
	let totalProjectCount = $derived(data.projects.length);
	let rootProjectCount = $derived(
		data.projects.filter((project) => !project.parentProjectId).length
	);
	let subprojectCount = $derived(data.projects.filter((project) => project.parentProjectId).length);
	let projectDirectoryState = $derived.by<ProjectDirectoryState>(() => {
		const projectById: Record<string, ProjectDirectoryProject> = {};

		for (const project of data.projects) {
			projectById[project.id] = project;
		}

		const childrenByParentId: Record<string, ProjectDirectoryProject[]> = {};

		for (const project of data.projects) {
			const parentKey =
				project.parentProjectId && projectById[project.parentProjectId]
					? project.parentProjectId
					: ROOT_PROJECT_PARENT_KEY;
			const siblings = childrenByParentId[parentKey] ?? [];
			siblings.push(project);
			childrenByParentId[parentKey] = siblings;
		}

		const directMatchIds: Record<string, boolean> = {};
		const includedProjectIds: Record<string, boolean> = {};

		function includeProject(project: ProjectDirectoryProject): boolean {
			const children = childrenByParentId[project.id] ?? [];
			const hasIncludedDescendant = children.some(includeProject);
			const isDirectMatch = matchesProject(project, query);

			if (isDirectMatch) {
				directMatchIds[project.id] = true;
			}

			if (isDirectMatch || hasIncludedDescendant) {
				includedProjectIds[project.id] = true;
				return true;
			}

			return false;
		}

		for (const rootProject of childrenByParentId[ROOT_PROJECT_PARENT_KEY] ?? []) {
			includeProject(rootProject);
		}

		const rows: ProjectDirectoryRow[] = [];

		function visit(project: ProjectDirectoryProject, depth: number) {
			if (!includedProjectIds[project.id]) {
				return;
			}

			const visibleChildren = (childrenByParentId[project.id] ?? []).filter(
				(childProject) => includedProjectIds[childProject.id]
			);
			const isExpanded = forceExpandedTree || !collapsedProjectIds.includes(project.id);

			rows.push({
				...project,
				depth,
				visibleChildCount: visibleChildren.length,
				isExpanded,
				isDirectMatch: Boolean(directMatchIds[project.id]),
				isContextRow: Boolean(includedProjectIds[project.id]) && !directMatchIds[project.id]
			});

			if (visibleChildren.length > 0 && isExpanded) {
				for (const childProject of visibleChildren) {
					visit(childProject, depth + 1);
				}
			}
		}

		for (const rootProject of childrenByParentId[ROOT_PROJECT_PARENT_KEY] ?? []) {
			visit(rootProject, 0);
		}

		const matchingRowCount = Object.keys(includedProjectIds).length;

		return {
			rows,
			matchingRowCount,
			hiddenCollapsedRowCount: getHiddenCollapsedRowCount({
				matchingRowCount,
				visibleRowCount: rows.length
			})
		};
	});
	let visibleProjectRows = $derived(projectDirectoryState.rows);
	let matchingProjectRowCount = $derived(projectDirectoryState.matchingRowCount);
	let hiddenCollapsedProjectRowCount = $derived(projectDirectoryState.hiddenCollapsedRowCount);

	function toggleProjectExpansion(projectId: string) {
		if (collapsedProjectIds.includes(projectId)) {
			collapsedProjectIds = collapsedProjectIds.filter((candidate) => candidate !== projectId);
			return;
		}

		collapsedProjectIds = [...collapsedProjectIds, projectId];
	}

	function projectIndentStyle(depth: number) {
		return `padding-left: ${depth * 1.35}rem;`;
	}

	function hierarchyLabel(depth: number) {
		if (depth === 0) {
			return 'Root project';
		}

		if (depth === 1) {
			return 'Subproject';
		}

		return `Level ${depth + 1}`;
	}

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
			parentProjectId: string;
			projectRootFolder: string;
			defaultArtifactRoot: string;
			defaultRepoPath: string;
			defaultRepoUrl: string;
			defaultBranch: string;
			additionalWritableRoots: string;
			defaultThreadSandbox: string;
		}>(CREATE_PROJECT_DRAFT_KEY);

		if (savedDraft) {
			projectName = savedDraft.name ?? '';
			projectSummary = savedDraft.summary ?? '';
			parentProjectId = savedDraft.parentProjectId ?? '';
			projectRootFolder = savedDraft.projectRootFolder ?? '';
			defaultArtifactRoot = savedDraft.defaultArtifactRoot ?? '';
			defaultRepoPath = savedDraft.defaultRepoPath ?? '';
			defaultRepoUrl = savedDraft.defaultRepoUrl ?? '';
			defaultBranch = savedDraft.defaultBranch ?? '';
			additionalWritableRoots = savedDraft.additionalWritableRoots ?? '';
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
			parentProjectId,
			projectRootFolder,
			defaultArtifactRoot,
			defaultRepoPath,
			defaultRepoUrl,
			defaultBranch,
			additionalWritableRoots,
			defaultThreadSandbox
		});
	});
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Projects"
		title="Browse the project hierarchy first"
		description="Projects now read like a directory instead of a wall of cards. Scan the tree, keep parent and subproject context visible, then open one project detail page when you need the full record."
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

	<div class="grid gap-3 md:grid-cols-3">
		<MetricCard
			label="Projects tracked"
			value={totalProjectCount}
			detail="Every project in the current directory, including nested subprojects."
		/>
		<MetricCard
			label="Top-level projects"
			value={rootProjectCount}
			detail="Root projects that anchor the rest of the hierarchy."
		/>
		<MetricCard
			label="Subprojects"
			value={subprojectCount}
			detail="Projects that live underneath a parent record."
		/>
	</div>

	<CollectionToolbar
		title="Project directory"
		description="Search by project name, description, or parent context, then open the record you want."
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
	</CollectionToolbar>

	<DataTableSection
		title="Projects"
		description="Browse projects and subprojects, open project details to see more information and edit."
		summary={`${matchingProjectRowCount} matching row${matchingProjectRowCount === 1 ? '' : 's'}`}
		empty={visibleProjectRows.length === 0}
		emptyMessage="No projects match the current search."
	>
		{#if hiddenCollapsedProjectRowCount > 0}
			<div
				class="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<p class="text-sm text-amber-100">
					{hiddenCollapsedProjectRowCount} matching project{hiddenCollapsedProjectRowCount === 1
						? ' is'
						: 's are'} currently hidden inside collapsed branches.
				</p>
				<button
					class="inline-flex items-center justify-center rounded-full border border-amber-800/70 px-3 py-2 text-center text-xs leading-none font-medium tracking-[0.14em] text-amber-100 uppercase transition hover:border-amber-700 hover:text-white"
					type="button"
					onclick={() => {
						collapsedProjectIds = [];
					}}
				>
					Expand all
				</button>
			</div>
		{/if}

		<table class="min-w-full divide-y divide-slate-800 text-left">
			<thead class="bg-slate-900/70">
				<tr class="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
					<th class="px-4 py-3">Project tree</th>
					<th class="px-4 py-3">Parent</th>
					<th class="px-4 py-3">Open</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-800 bg-slate-950/40">
				{#each visibleProjectRows as project (project.id)}
					<tr
						class={`align-top transition ${project.isContextRow ? 'bg-slate-950/20 hover:bg-slate-900/40' : 'hover:bg-slate-900/60'}`}
					>
						<td class="px-4 py-4">
							<div
								class="flex min-w-[22rem] items-start gap-3"
								style={projectIndentStyle(project.depth)}
							>
								<div class="flex h-7 w-7 items-center justify-center">
									{#if project.visibleChildCount > 0}
										<button
											aria-label={`${project.isExpanded ? 'Collapse' : 'Expand'} subprojects for ${project.name}`}
											class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
											type="button"
											onclick={() => {
												toggleProjectExpansion(project.id);
											}}
										>
											{project.isExpanded ? '-' : '+'}
										</button>
									{:else}
										<span
											class={`block h-2.5 w-2.5 rounded-full ${project.depth === 0 ? 'bg-sky-400/70' : 'bg-slate-600'}`}
										></span>
									{/if}
								</div>

								<div class="min-w-0 space-y-2">
									<div class="flex flex-wrap items-center gap-2">
										<a
											class={`ui-wrap-anywhere text-sm font-semibold transition hover:text-sky-200 ${project.isContextRow ? 'text-slate-300' : 'text-white'}`}
											href={resolve(`/app/projects/${project.id}`)}
										>
											{project.name}
										</a>
										<span
											class="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[0.65rem] font-medium tracking-[0.14em] text-slate-300 uppercase"
										>
											{hierarchyLabel(project.depth)}
										</span>
										{#if project.isContextRow}
											<span
												class="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[0.65rem] font-medium tracking-[0.14em] text-slate-400 uppercase"
											>
												Context
											</span>
										{/if}
									</div>
									<a
										class={`block rounded-lg transition hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-sky-400 ${project.isContextRow ? 'text-slate-400' : 'text-slate-300'}`}
										href={resolve(`/app/projects/${project.id}`)}
									>
										<p class="ui-clamp-2 text-sm">{project.summary}</p>
									</a>
								</div>
							</div>
						</td>
						<td class="px-4 py-4 text-sm text-slate-300">
							{project.parentProjectName || 'Top level'}
						</td>
						<td class="px-4 py-4">
							<a
								class="inline-flex rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.16em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
								href={resolve(`/app/projects/${project.id}`)}
							>
								Open
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</DataTableSection>
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

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Parent project</span>
					<select bind:value={parentProjectId} class="select text-white" name="parentProjectId">
						<option value="">No parent project</option>
						{#each data.parentProjectOptions as project (project.id)}
							<option value={project.id}>{project.label}</option>
						{/each}
					</select>
					<span class="mt-2 block text-xs text-slate-500">
						Use this when the new project is a subproject like an app, website, or wrapper inside a
						larger product.
					</span>
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
						Additional writable roots
					</span>
					<textarea
						bind:value={additionalWritableRoots}
						class="textarea min-h-28 text-white placeholder:text-slate-500"
						name="additionalWritableRoots"
						placeholder="/Users/you/Library/Mobile Documents/com~apple~CloudDocs/Shared&#10;/Users/you/Dropbox/Client Files"
					></textarea>
					<span class="mt-2 block text-xs text-slate-500">
						One absolute folder per line. Use this for iCloud Drive, Dropbox, Google Drive,
						OneDrive, or other synced folders outside the project root. New threads pass these roots
						to Codex with <code>--add-dir</code>.
					</span>
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
