<script lang="ts">
	import { resolve } from '$app/paths';
	import PathField from '$lib/components/PathField.svelte';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';

	let { data, form } = $props();
	let projectRootFolder = $state('');
	let defaultArtifactRoot = $state('');
	let defaultRepoPath = $state('');
	let query = $state('');

	let configuredFolderCount = $derived(
		data.projects.filter((project) => project.projectRootFolder || project.defaultArtifactRoot)
			.length
	);
	let configuredRepoCount = $derived(
		data.projects.filter((project) => project.defaultRepoPath || project.defaultRepoUrl).length
	);
	let fullyConfiguredCount = $derived(
		data.projects.filter((project) => project.readinessCount >= 3).length
	);
	let defaultLane = $derived(data.laneOptions[0] ?? 'product');
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

	let projectsByLane = $derived.by(() =>
		data.laneOptions.map((lane) => ({
			lane,
			projects: data.projects.filter(
				(project) => project.lane === lane && matchesProject(project, query)
			)
		}))
	);

	function readinessClass(readinessCount: number) {
		if (readinessCount >= 3) {
			return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
		}

		if (readinessCount >= 1) {
			return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
		}

		return 'border-slate-700 bg-slate-950/70 text-slate-300';
	}
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Projects</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Browse project contexts first</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			The project page should act like a directory, not a wall of forms. Scan by lane, search for
			the project you want, then open one detail page to edit defaults, inspect linked work, and see
			how that project is being used.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Project count</p>
			<p class="mt-3 text-3xl font-semibold text-white">{data.projects.length}</p>
			<p class="mt-2 text-sm text-slate-400">Every reusable project profile in the control plane.</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Folder defaults set
			</p>
			<p class="mt-3 text-3xl font-semibold text-white">{configuredFolderCount}</p>
			<p class="mt-2 text-sm text-slate-400">Projects with a working root or artifact root ready.</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Mostly configured
			</p>
			<p class="mt-3 text-3xl font-semibold text-white">{fullyConfiguredCount}</p>
			<p class="mt-2 text-sm text-slate-400">
				Projects with enough defaults to launch downstream work cleanly.
			</p>
		</article>
	</div>

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

	<div class="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
		<form
			class="space-y-4 card border border-slate-800 bg-slate-950/70 p-6"
			method="POST"
			action="?/createProject"
		>
			<h2 class="text-xl font-semibold text-white">Add project</h2>
			<p class="text-sm text-slate-400">
				Capture durable defaults here. Editing and linked activity live on the detail page after
				creation.
			</p>

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
				<span class="mb-2 block text-sm font-medium text-slate-200">Lane</span>
				<select class="select text-white" name="lane">
					{#each data.laneOptions as lane (lane)}
						<option value={lane}>{lane}</option>
					{/each}
				</select>
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

			<button class="btn preset-filled-primary-500 font-semibold" type="submit">
				Create project
			</button>
		</form>

		<section class="card border border-slate-800 bg-slate-950/70 p-6">
			<Tabs defaultValue={defaultLane} class="space-y-4">
				<div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
					<div>
						<h2 class="text-xl font-semibold text-white">Project directory</h2>
						<p class="mt-1 text-sm text-slate-400">
							Search by name, summary, path, or repo hint, then open the project you want.
						</p>
					</div>

					<div class="flex flex-col gap-3 xl:items-end">
						<div class="w-full xl:w-80">
							<label class="sr-only" for="project-search">Search projects</label>
							<input
								id="project-search"
								bind:value={query}
								class="input text-white placeholder:text-slate-500"
								placeholder="Search projects"
							/>
						</div>

						<Tabs.List
							class="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2"
						>
							{#each data.laneOptions as lane (lane)}
								<Tabs.Trigger
									value={lane}
									class="btn border border-transparent btn-sm text-slate-300 data-[state=active]:border-sky-400/30 data-[state=active]:bg-sky-400 data-[state=active]:text-slate-950"
								>
									{lane}
								</Tabs.Trigger>
							{/each}
						</Tabs.List>
					</div>
				</div>

				{#each projectsByLane as group (group.lane)}
					<Tabs.Content value={group.lane}>
						{#if group.projects.length === 0}
							<p
								class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
							>
								No projects match this lane and search combination.
							</p>
						{:else}
							<div class="grid gap-4 md:grid-cols-2">
								{#each group.projects as project (project.id)}
									<a
										class="group flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-400/40 hover:bg-slate-900"
										href={resolve(`/app/projects/${project.id}`)}
									>
										<div class="flex items-start justify-between gap-3">
											<div class="space-y-2">
												<div class="flex flex-wrap items-center gap-2">
													<h3 class="text-lg font-semibold text-white transition group-hover:text-sky-200">
														{project.name}
													</h3>
													<span
														class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${readinessClass(project.readinessCount)}`}
													>
														{project.readinessCount}/4 defaults
													</span>
												</div>
												<p class="text-sm text-slate-300">{project.summary}</p>
											</div>
											<span
												class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
											>
												{project.lane}
											</span>
										</div>

										<div class="mt-4 grid gap-3 sm:grid-cols-3">
											<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
												<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
													Linked tasks
												</p>
												<p class="mt-2 text-lg font-semibold text-white">{project.taskCount}</p>
											</div>
											<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
												<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
													Goals in scope
												</p>
												<p class="mt-2 text-lg font-semibold text-white">{project.goalCount}</p>
											</div>
											<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
												<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
													Repo defaults
												</p>
												<p class="mt-2 text-lg font-semibold text-white">
													{project.defaultRepoPath || project.defaultRepoUrl ? 'Ready' : 'Unset'}
												</p>
											</div>
										</div>

										<div class="mt-4 space-y-2 text-sm text-slate-400">
											<p class="truncate">
												<span class="text-slate-500">Root:</span>
												{project.projectRootFolder || 'Not configured'}
											</p>
											<p class="truncate">
												<span class="text-slate-500">Artifact root:</span>
												{project.defaultArtifactRoot || 'Not configured'}
											</p>
											<p class="truncate">
												<span class="text-slate-500">Branch:</span>
												{project.defaultBranch || 'Not configured'}
											</p>
										</div>

										<div
											class="mt-5 flex items-center justify-between border-t border-slate-800 pt-4 text-xs font-medium tracking-[0.16em] text-slate-500 uppercase"
										>
											<span>{project.defaultRepoUrl ? 'Repo attached' : 'No remote repo'}</span>
											<span class="text-sky-300 transition group-hover:text-sky-200">
												Open details
											</span>
										</div>
									</a>
								{/each}
							</div>
						{/if}
					</Tabs.Content>
				{/each}
			</Tabs>

			<div class="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Repo coverage
				</p>
				<p class="mt-3 text-3xl font-semibold text-white">{configuredRepoCount}</p>
				<p class="mt-2 text-sm text-slate-400">
					Projects with a checkout path or remote repo already attached.
				</p>
			</div>
		</section>
	</div>
</section>
