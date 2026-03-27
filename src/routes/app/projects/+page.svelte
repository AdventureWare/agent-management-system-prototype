<script lang="ts">
	import { resolve } from '$app/paths';
	import PathField from '$lib/components/PathField.svelte';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';

	let { data, form } = $props();
	let projectRootFolder = $state('');
	let defaultArtifactRoot = $state('');
	let defaultRepoPath = $state('');

	let projectLaneCount = $derived(
		data.projects.filter((project) => project.lane === 'product').length
	);
	let configuredFolderCount = $derived(
		data.projects.filter((project) => project.projectRootFolder || project.defaultArtifactRoot)
			.length
	);
	let configuredRepoCount = $derived(
		data.projects.filter((project) => project.defaultRepoPath || project.defaultRepoUrl).length
	);
	let defaultLane = $derived(data.laneOptions[0] ?? 'product');
	let createSuccess = $derived(form?.ok && form?.successAction === 'createProject');
	let updatedProjectId = $derived(
		form?.successAction === 'updateProject' ? (form.projectId?.toString() ?? '') : ''
	);
	let projectsByLane = $derived.by(() =>
		data.laneOptions.map((lane) => ({
			lane,
			projects: data.projects.filter((project) => project.lane === lane)
		}))
	);
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Projects</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Project roots and repo context</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Projects are the durable config layer. Add a project once, then keep its root folder, repo
			location, and branch choice in one place so future agent work can start from the right entry
			point without retyping context.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Project count</p>
			<p class="mt-3 text-3xl font-semibold text-white">{data.projects.length}</p>
			<p class="mt-2 text-sm text-slate-400">
				Every reusable project profile currently configured.
			</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Folder defaults set
			</p>
			<p class="mt-3 text-3xl font-semibold text-white">{configuredFolderCount}</p>
			<p class="mt-2 text-sm text-slate-400">
				Projects with a root folder or artifact root already defined.
			</p>
		</article>

		<article class="card border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Repo defaults set
			</p>
			<p class="mt-3 text-3xl font-semibold text-white">{configuredRepoCount}</p>
			<p class="mt-2 text-sm text-slate-400">
				Projects with a checkout path or remote repo already attached.
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
	{:else if form?.ok && form?.successAction === 'updateProject'}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Project updates saved.
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
		<form
			class="space-y-4 card border border-slate-800 bg-slate-950/70 p-6"
			method="POST"
			action="?/createProject"
		>
			<h2 class="text-xl font-semibold text-white">Add project</h2>
			<p class="text-sm text-slate-400">
				Keep this focused on defaults that downstream work should reuse automatically rather than
				retyping on each goal or task.
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
				<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<h2 class="text-xl font-semibold text-white">Configured projects</h2>
						<p class="mt-1 text-sm text-slate-400">
							Review defaults by lane before you spin up new agent sessions or assign repo-scoped
							work.
						</p>
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

				<div class="space-y-4">
					{#each projectsByLane as group (group.lane)}
						<Tabs.Content value={group.lane} class="space-y-4">
							{#if group.projects.length > 0}
								<div class="space-y-3">
									{#each group.projects as project (project.id)}
										<form
											class="space-y-4 card border border-slate-800 bg-slate-900/60 p-4"
											method="POST"
											action="?/updateProject"
										>
											<input name="projectId" type="hidden" value={project.id} />

											<div class="flex flex-wrap items-start justify-between gap-3">
												<div>
													<div class="flex flex-wrap items-center gap-3">
														<h3 class="font-medium text-white">{project.name}</h3>
														<a
															class="text-xs font-medium tracking-[0.18em] text-sky-300 uppercase transition hover:text-sky-200"
															href={resolve(`/app/projects/${project.id}`)}
														>
															View details
														</a>
													</div>
													<p class="mt-2 text-sm text-slate-300">{project.summary}</p>
												</div>
												<div class="flex flex-wrap items-center gap-2">
													{#if updatedProjectId === project.id}
														<span
															class="badge border border-emerald-900/70 bg-emerald-950/50 text-[0.7rem] tracking-[0.2em] text-emerald-200 uppercase"
														>
															Saved
														</span>
													{/if}
													<span
														class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
													>
														{project.lane}
													</span>
												</div>
											</div>

											<div class="grid gap-4 lg:grid-cols-2">
												<label class="block">
													<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
													<input
														class="input text-white placeholder:text-slate-500"
														name="name"
														required
														value={project.name}
													/>
												</label>

												<label class="block">
													<span class="mb-2 block text-sm font-medium text-slate-200">Lane</span>
													<select class="select text-white" name="lane">
														{#each data.laneOptions as lane (lane)}
															<option value={lane} selected={project.lane === lane}>{lane}</option>
														{/each}
													</select>
												</label>
											</div>

											<label class="block">
												<span class="mb-2 block text-sm font-medium text-slate-200">Summary</span>
												<textarea
													class="textarea min-h-28 text-white placeholder:text-slate-500"
													name="summary"
													placeholder="What this project covers and what defaults other work should inherit."
													required>{project.summary}</textarea
												>
											</label>

											<div class="grid gap-4 lg:grid-cols-2">
												<div>
													<PathField
														createMode="folder"
														helperText="Agents will start here when this project is selected later."
														inputId={`project-root-folder-${project.id}`}
														label="Project root folder"
														name="projectRootFolder"
														options={data.folderOptions}
														placeholder="/absolute/path/to/project/root"
														value={project.projectRootFolder}
													/>
												</div>

												<div>
													<PathField
														createMode="folder"
														helperText="Create the shared artifact folder if you want it reserved now."
														inputId={`project-artifact-root-${project.id}`}
														label="Default artifact root"
														name="defaultArtifactRoot"
														options={data.folderOptions}
														placeholder="/absolute/path/to/project/artifacts"
														value={project.defaultArtifactRoot}
													/>
												</div>

												<div>
													<PathField
														createMode="folder"
														helperText="Creates the checkout folder if the repo is not cloned yet."
														inputId={`project-repo-path-${project.id}`}
														label="Default repo path"
														name="defaultRepoPath"
														options={data.folderOptions}
														placeholder="/absolute/path/to/local/checkout"
														value={project.defaultRepoPath}
													/>
												</div>

												<label class="block">
													<span class="mb-2 block text-sm font-medium text-slate-200">
														Default repo URL
													</span>
													<input
														class="input text-white placeholder:text-slate-500"
														name="defaultRepoUrl"
														placeholder="git@github.com:org/repo.git"
														value={project.defaultRepoUrl}
													/>
												</label>
											</div>

											<div class="flex flex-wrap items-end justify-between gap-3">
												<label class="block w-full max-w-xs">
													<span class="mb-2 block text-sm font-medium text-slate-200">
														Default branch
													</span>
													<input
														class="input text-white placeholder:text-slate-500"
														name="defaultBranch"
														placeholder="main"
														value={project.defaultBranch}
													/>
												</label>

												<button class="btn preset-filled-primary-500 font-semibold" type="submit">
													Save changes
												</button>
											</div>
										</form>
									{/each}
								</div>
							{:else}
								<p
									class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
								>
									No projects are configured in the {group.lane} lane yet.
								</p>
							{/if}
						</Tabs.Content>
					{/each}
				</div>
			</Tabs>

			<div class="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Product lane snapshot
				</p>
				<p class="mt-3 text-3xl font-semibold text-white">{projectLaneCount}</p>
				<p class="mt-2 text-sm text-slate-400">
					Product projects are usually where local repo defaults matter most for app worker handoff.
				</p>
			</div>
		</section>
	</div>
</section>
