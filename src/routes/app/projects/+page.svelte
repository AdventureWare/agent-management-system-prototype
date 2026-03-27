<script lang="ts">
	import { Tabs } from '@skeletonlabs/skeleton-svelte';

	let { data, form } = $props();
	let defaultCoordinationFolder = $state('');
	let defaultArtifactRoot = $state('');
	let defaultRepoPath = $state('');

	let projectLaneCount = $derived(
		data.projects.filter((project) => project.lane === 'product').length
	);
	let configuredFolderCount = $derived(
		data.projects.filter(
			(project) => project.defaultCoordinationFolder || project.defaultArtifactRoot
		).length
	);
	let configuredRepoCount = $derived(
		data.projects.filter((project) => project.defaultRepoPath || project.defaultRepoUrl).length
	);
	let defaultLane = $derived(data.laneOptions[0] ?? 'product');
	let projectsByLane = $derived.by(() =>
		data.laneOptions.map((lane) => ({
			lane,
			projects: data.projects.filter((project) => project.lane === lane)
		}))
	);

	function applyFolderSelection(event: Event, setValue: (value: string) => void) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (value) {
			setValue(value);
		}
	}
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Projects</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">
			Default folders and repo context
		</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Projects are the durable config layer. Add a project once, then keep its default folders, repo
			location, and branch choice in one place so future goals and tasks can inherit cleaner
			starting context.
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
				Projects with a coordination folder or artifact root already defined.
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

	{#if form?.ok}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Project created and saved into the control plane.
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
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">
						Default coordination folder
					</span>
					<select
						class="select mb-2 text-white"
						onchange={(event) => {
							applyFolderSelection(event, (value) => {
								defaultCoordinationFolder = value;
							});
						}}
					>
						<option value="">Choose a project folder</option>
						{#each data.folderOptions as option (option.path)}
							<option value={option.path}>{option.label}</option>
						{/each}
					</select>
					<input
						bind:value={defaultCoordinationFolder}
						class="input text-white placeholder:text-slate-500"
						list="project-folder-path-options"
						name="defaultCoordinationFolder"
						placeholder="/absolute/path/to/coordination"
					/>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Default artifact root</span>
					<select
						class="select mb-2 text-white"
						onchange={(event) => {
							applyFolderSelection(event, (value) => {
								defaultArtifactRoot = value;
							});
						}}
					>
						<option value="">Choose a project folder</option>
						{#each data.folderOptions as option (option.path)}
							<option value={option.path}>{option.label}</option>
						{/each}
					</select>
					<input
						bind:value={defaultArtifactRoot}
						class="input text-white placeholder:text-slate-500"
						list="project-folder-path-options"
						name="defaultArtifactRoot"
						placeholder="/absolute/path/to/project/artifacts"
					/>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Default repo path</span>
					<select
						class="select mb-2 text-white"
						onchange={(event) => {
							applyFolderSelection(event, (value) => {
								defaultRepoPath = value;
							});
						}}
					>
						<option value="">Choose a project folder</option>
						{#each data.folderOptions as option (option.path)}
							<option value={option.path}>{option.label}</option>
						{/each}
					</select>
					<input
						bind:value={defaultRepoPath}
						class="input text-white placeholder:text-slate-500"
						list="project-folder-path-options"
						name="defaultRepoPath"
						placeholder="/absolute/path/to/local/checkout"
					/>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Default repo URL</span>
					<input
						class="input text-white placeholder:text-slate-500"
						name="defaultRepoUrl"
						placeholder="git@github.com:org/repo.git"
					/>
				</label>
			</div>

			<datalist id="project-folder-path-options">
				{#each data.folderOptions as option (option.path)}
					<option value={option.path}>{option.label}</option>
				{/each}
			</datalist>

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
							Review defaults by lane before you spin up new goals or assign repo-scoped work.
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
										<article class="card border border-slate-800 bg-slate-900/60 p-4">
											<div class="flex flex-wrap items-start justify-between gap-3">
												<div>
													<h3 class="font-medium text-white">{project.name}</h3>
													<p class="mt-2 text-sm text-slate-300">{project.summary}</p>
												</div>
												<span
													class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
												>
													{project.lane}
												</span>
											</div>

											<div class="mt-4 grid gap-3 lg:grid-cols-2">
												<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
													<p
														class="text-[11px] font-medium tracking-[0.16em] text-slate-500 uppercase"
													>
														Default folders
													</p>
													<p class="mt-3 text-xs text-slate-400">Coordination</p>
													<p class="mt-1 text-sm break-all text-white">
														{project.defaultCoordinationFolder || 'Not set'}
													</p>
													<p class="mt-3 text-xs text-slate-400">Artifact root</p>
													<p class="mt-1 text-sm break-all text-white">
														{project.defaultArtifactRoot || 'Not set'}
													</p>
												</div>

												<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
													<p
														class="text-[11px] font-medium tracking-[0.16em] text-slate-500 uppercase"
													>
														Repo defaults
													</p>
													<p class="mt-3 text-xs text-slate-400">Checkout path</p>
													<p class="mt-1 text-sm break-all text-white">
														{project.defaultRepoPath || 'Not set'}
													</p>
													<p class="mt-3 text-xs text-slate-400">Remote + branch</p>
													<p class="mt-1 text-sm break-all text-white">
														{project.defaultRepoUrl || 'Not set'}
													</p>
													<p class="mt-2 text-xs text-slate-400">
														Branch: {project.defaultBranch || 'Not set'}
													</p>
												</div>
											</div>
										</article>
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
