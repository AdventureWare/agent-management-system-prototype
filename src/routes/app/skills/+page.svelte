<script lang="ts">
	import { enhance } from '$app/forms';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { ActionData, PageData, SubmitFunction } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function inventoryStatusClass(status: 'usable' | 'partial' | 'listed') {
		switch (status) {
			case 'usable':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'partial':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			case 'listed':
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function skillAvailabilityStatus(entry: {
		missingProjectCount: number;
		availableProjectCount: number;
		projectLocalProjectCount: number;
	}) {
		if (entry.missingProjectCount > 0) {
			return { label: 'Missing where requested', tone: 'partial' as const };
		}

		if (entry.projectLocalProjectCount > 0) {
			return { label: 'Project-local', tone: 'usable' as const };
		}

		if (entry.availableProjectCount > 0) {
			return { label: 'Global only', tone: 'listed' as const };
		}

		return { label: 'Requested only', tone: 'partial' as const };
	}

	function skillDetailHref(skillId: string) {
		return `/app/skills/${encodeURIComponent(skillId)}`;
	}

	let createProjectSkillSuccess = $derived(
		form?.ok && form?.successAction === 'createProjectSkill'
	);
	let previewProjectSkillSuccess = $derived(
		form?.ok && form?.successAction === 'previewProjectSkill'
	);
	let previewRefinedProjectSkillSuccess = $derived(
		form?.ok && form?.successAction === 'previewRefinedProjectSkill'
	);
	let saveProjectSkillDraftSuccess = $derived(
		form?.ok && form?.successAction === 'saveProjectSkillDraft'
	);
	let externalSkillSearchSuccess = $derived(
		form?.ok && form?.successAction === 'searchExternalSkills'
	);
	let installExternalSkillSuccess = $derived(
		form?.ok && form?.successAction === 'installExternalSkill'
	);
	let createProjectSkillFormValues = $derived.by(() => ({
		projectId:
			form && 'projectId' in form && typeof form.projectId === 'string' ? form.projectId : '',
		skillId: form && 'skillId' in form && typeof form.skillId === 'string' ? form.skillId : '',
		description:
			form && 'description' in form && typeof form.description === 'string' ? form.description : ''
	}));
	let generateProjectSkillFormValues = $derived.by(() => ({
		projectId:
			form && 'projectId' in form && typeof form.projectId === 'string' ? form.projectId : '',
		skillId: form && 'skillId' in form && typeof form.skillId === 'string' ? form.skillId : '',
		intendedUse:
			form && 'intendedUse' in form && typeof form.intendedUse === 'string' ? form.intendedUse : ''
	}));
	let refineProjectSkillFormValues = $derived.by(() => ({
		projectId:
			form && 'projectId' in form && typeof form.projectId === 'string' ? form.projectId : '',
		skillId: form && 'skillId' in form && typeof form.skillId === 'string' ? form.skillId : '',
		improvementGoal:
			form && 'improvementGoal' in form && typeof form.improvementGoal === 'string'
				? form.improvementGoal
				: ''
	}));
	let externalSkillSearchFormValues = $derived.by(() => ({
		projectId:
			form && 'projectId' in form && typeof form.projectId === 'string' ? form.projectId : '',
		query: form && 'query' in form && typeof form.query === 'string' ? form.query : ''
	}));
	let externalSkillSearchResults = $derived.by(() =>
		form &&
		'results' in form &&
		Array.isArray(form.results) &&
		form.results.every(
			(result) =>
				result &&
				typeof result === 'object' &&
				'packageSpec' in result &&
				typeof result.packageSpec === 'string'
		)
			? form.results.map((result) => ({
					packageSpec: result.packageSpec,
					url: 'url' in result && typeof result.url === 'string' ? result.url : null,
					installCountLabel:
						'installCountLabel' in result && typeof result.installCountLabel === 'string'
							? result.installCountLabel
							: null
				}))
			: []
	);
	let installedExternalSkillIds = $derived.by(() =>
		form &&
		'installedSkillIds' in form &&
		Array.isArray(form.installedSkillIds) &&
		form.installedSkillIds.every((skillId) => typeof skillId === 'string')
			? form.installedSkillIds
			: []
	);
	let installedExternalSkills = $derived.by(() =>
		form &&
		'installedSkills' in form &&
		Array.isArray(form.installedSkills) &&
		form.installedSkills.every(
			(skill) =>
				skill &&
				typeof skill === 'object' &&
				'id' in skill &&
				typeof skill.id === 'string' &&
				'skillFilePath' in skill &&
				typeof skill.skillFilePath === 'string'
		)
			? form.installedSkills.map((skill) => ({
					id: skill.id,
					description:
						'description' in skill && typeof skill.description === 'string'
							? skill.description
							: '',
					sourceLabel:
						'sourceLabel' in skill && typeof skill.sourceLabel === 'string'
							? skill.sourceLabel
							: 'Project',
					skillFilePath: skill.skillFilePath
				}))
			: []
	);
	let externalSkillSearchRawOutput = $derived.by(() =>
		form && 'rawOutput' in form && typeof form.rawOutput === 'string' ? form.rawOutput : ''
	);
	let installExternalSkillFormValues = $derived.by(() => ({
		projectId:
			form && 'projectId' in form && typeof form.projectId === 'string' ? form.projectId : '',
		packageSpec:
			form && 'packageSpec' in form && typeof form.packageSpec === 'string' ? form.packageSpec : ''
	}));
	let generatedProjectSkillPreview = $derived.by(() => ({
		description:
			form &&
			'generatedSkillDescription' in form &&
			typeof form.generatedSkillDescription === 'string'
				? form.generatedSkillDescription
				: '',
		body:
			form && 'generatedSkillBody' in form && typeof form.generatedSkillBody === 'string'
				? form.generatedSkillBody
				: '',
		filePath:
			form && 'generatedSkillFilePath' in form && typeof form.generatedSkillFilePath === 'string'
				? form.generatedSkillFilePath
				: '',
		relatedTaskCount:
			form &&
			'generatedRelatedTaskCount' in form &&
			typeof form.generatedRelatedTaskCount === 'number'
				? form.generatedRelatedTaskCount
				: 0
	}));
	let generatedProjectSkillPreviewVisible = $derived(
		previewProjectSkillSuccess || previewRefinedProjectSkillSuccess || saveProjectSkillDraftSuccess
	);
	let generatedProjectSkillPreviewSaveMode = $derived.by(() =>
		form && 'previewSkillSaveMode' in form && form.previewSkillSaveMode === 'update'
			? 'update'
			: 'create'
	);
	let generatedProjectSkillPreviewNeedsSave = $derived(
		previewProjectSkillSuccess || previewRefinedProjectSkillSuccess
	);
	let refinementCurrentSkillContent = $derived.by(() =>
		form && 'currentSkillContent' in form && typeof form.currentSkillContent === 'string'
			? form.currentSkillContent
			: ''
	);
	let refineProjectSkillChoices = $derived.by(() => {
		const selectedProjectId = refineProjectSkillFormValues.projectId;

		if (!selectedProjectId) {
			return [];
		}

		const projectSkills = data.executionCatalog.projectSkills.find(
			(projectSkills) => projectSkills.projectId === selectedProjectId
		);

		return projectSkills?.installedSkills ?? [];
	});
	let suggestedProjectSkills = $derived.by(() =>
		data.executionCatalog.projectSkills
			.flatMap((projectSkills) =>
				projectSkills.missingRequestedSkills.map((skill) => ({
					projectId: projectSkills.projectId,
					projectName: projectSkills.projectName,
					projectHref: projectSkills.projectHref,
					skillId: skill.id,
					requestingTaskCount: skill.requestingTaskCount,
					description: `Project-specific guidance for ${skill.id} tasks in ${projectSkills.projectName}.`
				}))
			)
			.sort(
				(left, right) =>
					right.requestingTaskCount - left.requestingTaskCount ||
					left.projectName.localeCompare(right.projectName) ||
					left.skillId.localeCompare(right.skillId)
			)
			.slice(0, 8)
	);
	let externalSkillSearchPending = $state(false);
	let installExternalSkillPending = $state(false);
	let installedExternalSkillProjectName = $derived.by(() => {
		const projectId =
			form && 'projectId' in form && typeof form.projectId === 'string' ? form.projectId : '';

		return data.projects.find((project) => project.id === projectId)?.name ?? 'Selected project';
	});
	const searchExternalSkillsEnhance: SubmitFunction = () => {
		externalSkillSearchPending = true;

		return async ({ update }) => {
			await update();
			externalSkillSearchPending = false;
		};
	};
	const installExternalSkillEnhance: SubmitFunction = () => {
		installExternalSkillPending = true;

		return async ({ update }) => {
			await update();
			installExternalSkillPending = false;
		};
	};
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Skills"
		title="Browse and manage agent skills"
		description="Review installed Codex skills, see whether they are global or project-local, spot task-requested skill gaps, and create or refine project-local skill docs."
	/>

	{#if form?.message}
		<p class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if createProjectSkillSuccess || saveProjectSkillDraftSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			{#if createProjectSkillSuccess}
				Project skill stub created for {form?.createdSkillId}.
			{:else}
				Saved skill draft for {form?.createdSkillId}.
			{/if}
		</p>
	{/if}

	{#if externalSkillSearchSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			External skill search completed.
		</p>
	{/if}

	{#if installExternalSkillSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Installed {form?.packageSpec}
			{#if installedExternalSkillIds.length > 0}
				and discovered {installedExternalSkillIds.join(', ')} locally.
			{:else}
				into the selected project workspace.
			{/if}
		</p>
	{/if}

	{#if previewProjectSkillSuccess || previewRefinedProjectSkillSuccess}
		<p class="card border border-sky-900/70 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
			Draft preview ready for {form?.createdSkillId}. Review it before saving.
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.55fr)]">
		<section class="space-y-6">
			<DetailSection
				eyebrow="Inventory"
				title="Skill availability"
				description="This is the skill-centered view: what exists, where it is available, and where task demand is missing a matching installed skill."
				bodyClass="space-y-4"
			>
				{#if data.executionCatalog.skills.length === 0}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
					>
						No installed or task-requested prompt skills were found across tracked projects.
					</p>
				{:else}
					{#each data.executionCatalog.skills as skill (skill.id)}
						<article class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<a
											class="ui-wrap-anywhere font-medium text-white transition hover:text-sky-200"
											href={skillDetailHref(skill.id)}
										>
											{skill.id}
										</a>
										<span
											class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${inventoryStatusClass(skillAvailabilityStatus(skill).tone)}`}
										>
											{skillAvailabilityStatus(skill).label}
										</span>
									</div>
									<p class="ui-clamp-2 mt-2 text-sm text-slate-400">{skill.description}</p>
								</div>
							</div>

							<div class="mt-4 flex flex-wrap gap-2 text-xs">
								<span
									class="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-slate-300"
								>
									Available: <span class="text-white">{skill.availableProjectCount}</span>
								</span>
								<span
									class="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-slate-300"
								>
									Project-local: <span class="text-white">{skill.projectLocalProjectCount}</span>
								</span>
								<span
									class="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-slate-300"
								>
									Global: <span class="text-white">{skill.globalProjectCount}</span>
								</span>
								<span
									class="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-slate-300"
								>
									Requested: <span class="text-white">{skill.requestedProjectCount}</span>
								</span>
								<span
									class="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-slate-300"
								>
									Tasks: <span class="text-white">{skill.requestingTaskCount}</span>
								</span>
								<span
									class="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-slate-300"
								>
									Gaps: <span class="text-white">{skill.missingProjectCount}</span>
								</span>
							</div>

							<div class="mt-4 flex flex-wrap gap-2">
								{#each skill.projects as project (`${skill.id}:${project.projectId}`)}
									<a
										class={`rounded-full border px-3 py-1 text-xs transition hover:border-sky-600 hover:text-white ${
											project.availability === 'disabled'
												? 'border-rose-900/70 bg-rose-950/40 text-rose-100'
												: project.missing
													? 'border-amber-900/70 bg-amber-950/40 text-amber-100'
													: project.projectLocal
														? 'border-sky-800/70 bg-sky-950/40 text-sky-100'
														: 'border-slate-700 bg-slate-950/80 text-slate-200'
										}`}
										href={project.projectHref}
										title={project.missing
											? `${project.requestingTaskCount} task${project.requestingTaskCount === 1 ? '' : 's'} request this missing skill`
											: project.availabilityLabel}
									>
										{project.projectName}
										{#if project.requestingTaskCount > 0}
											<span class="text-slate-400"> · {project.requestingTaskCount}</span>
										{:else if project.availability !== 'default'}
											<span class="text-slate-400"> · {project.availabilityLabel}</span>
										{/if}
									</a>
								{/each}
							</div>
						</article>
					{/each}
				{/if}
			</DetailSection>

			<DetailSection
				eyebrow="Projects"
				title="Project skill coverage"
				description="Use this project view when you need to understand what a new thread launched for that project will see."
				bodyClass="grid gap-4 lg:grid-cols-2"
			>
				{#each data.executionCatalog.projectSkills as projectSkills (projectSkills.projectId)}
					<a
						class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
						href={projectSkills.projectHref}
						rel="external"
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<h3 class="ui-wrap-anywhere font-medium text-white">{projectSkills.projectName}</h3>
								<p class="mt-2 text-sm text-slate-400">
									{projectSkills.missingRequestedSkillCount > 0
										? `${projectSkills.missingRequestedSkillCount} requested prompt skill${projectSkills.missingRequestedSkillCount === 1 ? '' : 's'} are not installed for this workspace.`
										: projectSkills.totalCount === 0
											? 'No installed skills discovered for this project yet.'
											: `${projectSkills.totalCount} installed skill${projectSkills.totalCount === 1 ? '' : 's'} discovered.`}
								</p>
							</div>
							<span
								class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${
									projectSkills.missingRequestedSkillCount > 0
										? 'border-amber-900/70 bg-amber-950/40 text-amber-200'
										: projectSkills.totalCount > 0
											? 'border-sky-800/70 bg-sky-950/40 text-sky-200'
											: 'border-slate-700 bg-slate-950/70 text-slate-300'
								}`}
							>
								{projectSkills.missingRequestedSkillCount > 0
									? 'Missing requested'
									: projectSkills.totalCount > 0
										? 'Installed'
										: 'Empty'}
							</span>
						</div>

						<div class="mt-4 flex flex-wrap gap-2">
							{#each projectSkills.previewSkills as skill (skill.id)}
								<span
									class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200"
									title={skill.description || skill.availabilityLabel}
								>
									{skill.id}
									{#if skill.availability !== 'default'}
										<span class="text-slate-500"> · {skill.availabilityLabel}</span>
									{/if}
								</span>
							{/each}
						</div>
					</a>
				{/each}
			</DetailSection>
		</section>

		<section class="space-y-6">
			<DetailSection
				eyebrow="Import"
				title="Install external skills"
				description="Search for a reusable skill package, review the package spec, then install it into a selected project workspace."
				bodyClass="space-y-4"
			>
				<form
					class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
					method="POST"
					action="?/searchExternalSkills"
					use:enhance={searchExternalSkillsEnhance}
				>
					<div class="grid gap-3">
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Project
							</span>
							<select class="select text-white" name="projectId" required>
								<option value="">Choose project</option>
								{#each data.projects as project (project.id)}
									<option
										value={project.id}
										selected={externalSkillSearchFormValues.projectId === project.id}
									>
										{project.name}
									</option>
								{/each}
							</select>
						</label>
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Query
							</span>
							<input
								class="input text-white"
								name="query"
								placeholder="react performance, docs, changelog…"
								required
								value={externalSkillSearchFormValues.query}
							/>
						</label>
					</div>
					<div class="mt-4 flex justify-end">
						<AppButton type="submit" disabled={externalSkillSearchPending}>
							{externalSkillSearchPending ? 'Searching…' : 'Search Skills'}
						</AppButton>
					</div>
				</form>

				{#if externalSkillSearchPending}
					<div class="rounded-2xl border border-sky-900/70 bg-sky-950/20 p-4">
						<p class="text-sm text-sky-100">Searching external skill packages…</p>
					</div>
				{/if}

				{#if externalSkillSearchResults.length > 0}
					<div class="space-y-3">
						{#each externalSkillSearchResults as result (result.packageSpec)}
							<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<p class="ui-wrap-anywhere font-mono text-sm text-white">
											{result.packageSpec}
										</p>
										{#if result.installCountLabel}
											<p class="mt-2 text-xs text-slate-500">
												{result.installCountLabel} installs
											</p>
										{/if}
									</div>
									{#if result.url}
										<a
											class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
											href={result.url}
											target="_blank"
											rel="noreferrer"
										>
											Open Source
										</a>
									{/if}
								</div>
								<form
									class="mt-3"
									method="POST"
									action="?/installExternalSkill"
									use:enhance={installExternalSkillEnhance}
								>
									<input
										name="projectId"
										type="hidden"
										value={externalSkillSearchFormValues.projectId}
									/>
									<input name="query" type="hidden" value={externalSkillSearchFormValues.query} />
									<input name="packageSpec" type="hidden" value={result.packageSpec} />
									<AppButton type="submit" disabled={installExternalSkillPending}>
										{installExternalSkillPending ? 'Installing…' : 'Install To Project'}
									</AppButton>
								</form>
							</article>
						{/each}
					</div>
				{:else if externalSkillSearchSuccess}
					<div class="rounded-2xl border border-dashed border-slate-800 p-4">
						<p class="text-sm text-slate-400">
							No external skills were parsed from the search results.
						</p>
						{#if externalSkillSearchRawOutput}
							<pre
								class="ui-wrap-anywhere mt-4 max-h-60 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs leading-6 text-slate-300">{externalSkillSearchRawOutput}</pre>
						{/if}
					</div>
				{/if}

				<form
					class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
					method="POST"
					action="?/installExternalSkill"
					use:enhance={installExternalSkillEnhance}
				>
					<input name="query" type="hidden" value={externalSkillSearchFormValues.query} />
					<div class="grid gap-3">
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Project
							</span>
							<select class="select text-white" name="projectId" required>
								<option value="">Choose project</option>
								{#each data.projects as project (project.id)}
									<option
										value={project.id}
										selected={installExternalSkillFormValues.projectId === project.id ||
											externalSkillSearchFormValues.projectId === project.id}
									>
										{project.name}
									</option>
								{/each}
							</select>
						</label>
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Package spec
							</span>
							<input
								class="input text-white"
								name="packageSpec"
								placeholder="owner/repo@skill-name…"
								required
								value={installExternalSkillFormValues.packageSpec}
							/>
						</label>
					</div>
					<div class="mt-4 flex justify-end">
						<AppButton type="submit" disabled={installExternalSkillPending}>
							{installExternalSkillPending ? 'Installing…' : 'Install Package'}
						</AppButton>
					</div>
				</form>

				{#if installExternalSkillSuccess}
					<div class="rounded-2xl border border-emerald-900/70 bg-emerald-950/20 p-4">
						<p class="text-[11px] tracking-[0.16em] text-emerald-300 uppercase">Install result</p>
						<p class="mt-3 text-sm text-emerald-100">
							{form?.packageSpec} was installed into {installedExternalSkillProjectName}.
						</p>
						{#if installedExternalSkills.length > 0}
							<div class="mt-4 space-y-3">
								{#each installedExternalSkills as skill (skill.skillFilePath)}
									<article class="rounded-xl border border-emerald-900/50 bg-slate-950/60 p-3">
										<div class="flex flex-wrap items-center gap-2">
											<a
												class="ui-wrap-anywhere font-mono text-sm text-white transition hover:text-sky-200"
												href={skillDetailHref(skill.id)}
											>
												{skill.id}
											</a>
											<span
												class="badge border border-sky-800/70 bg-sky-950/40 text-[0.72rem] tracking-[0.18em] text-sky-200 uppercase"
											>
												{skill.sourceLabel}
											</span>
										</div>
										{#if skill.description}
											<p class="mt-2 text-sm text-slate-300">{skill.description}</p>
										{/if}
										<p class="ui-wrap-anywhere mt-2 font-mono text-xs text-slate-500">
											{skill.skillFilePath}
										</p>
									</article>
								{/each}
							</div>
						{:else}
							<p class="mt-3 text-sm text-slate-400">
								The install command completed, but no new `SKILL.md` file was detected. Check the
								package output or existing installed skills before retrying.
							</p>
						{/if}
					</div>
				{/if}
			</DetailSection>

			<DetailSection
				eyebrow="Manage"
				title="Add or revise skills"
				description="Create project-local skills under `.agents/skills`, generate a draft from task demand, or refine an existing skill file."
				bodyClass="space-y-4"
			>
				<form
					class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
					method="POST"
					action="?/createProjectSkill"
				>
					<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Create skill</p>
					<div class="mt-4 grid gap-3">
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Project
							</span>
							<select class="select text-white" name="projectId" required>
								<option value="">Choose project</option>
								{#each data.projects as project (project.id)}
									<option
										value={project.id}
										selected={createProjectSkillFormValues.projectId === project.id}
									>
										{project.name}
									</option>
								{/each}
							</select>
						</label>
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Skill ID
							</span>
							<input
								class="input text-white"
								name="skillId"
								placeholder="docs-writer"
								required
								value={createProjectSkillFormValues.skillId}
							/>
						</label>
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Description
							</span>
							<input
								class="input text-white"
								name="description"
								placeholder="Project-specific guidance for writing docs."
								required
								value={createProjectSkillFormValues.description}
							/>
						</label>
					</div>
					<div class="mt-4 flex justify-end">
						<AppButton type="submit">Create skill stub</AppButton>
					</div>
				</form>

				<form
					class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
					method="POST"
					action="?/previewProjectSkill"
				>
					<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Generate draft</p>
					<div class="mt-4 grid gap-3">
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Project
							</span>
							<select class="select text-white" name="projectId" required>
								<option value="">Choose project</option>
								{#each data.projects as project (project.id)}
									<option
										value={project.id}
										selected={generateProjectSkillFormValues.projectId === project.id}
									>
										{project.name}
									</option>
								{/each}
							</select>
						</label>
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Skill ID
							</span>
							<input
								class="input text-white"
								name="skillId"
								placeholder="release-changelog-writer"
								required
								value={generateProjectSkillFormValues.skillId}
							/>
						</label>
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Intended use
							</span>
							<textarea class="textarea min-h-28 text-white" name="intendedUse" required
								>{generateProjectSkillFormValues.intendedUse}</textarea
							>
						</label>
					</div>
					<div class="mt-4 flex justify-end">
						<AppButton type="submit">Preview draft</AppButton>
					</div>
				</form>

				<form
					class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
					method="POST"
					action="?/previewRefinedProjectSkill"
				>
					<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Refine skill</p>
					<div class="mt-4 grid gap-3">
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Project
							</span>
							<select class="select text-white" name="projectId" required>
								<option value="">Choose project</option>
								{#each data.projects as project (project.id)}
									<option
										value={project.id}
										selected={refineProjectSkillFormValues.projectId === project.id}
									>
										{project.name}
									</option>
								{/each}
							</select>
						</label>
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Skill ID
							</span>
							<input
								class="input text-white"
								name="skillId"
								list="skills-page-installed-skill-options"
								placeholder="docs-writer"
								required
								value={refineProjectSkillFormValues.skillId}
							/>
							<datalist id="skills-page-installed-skill-options">
								{#each refineProjectSkillChoices as skill (skill.id)}
									<option value={skill.id}>{skill.sourceLabel}</option>
								{/each}
							</datalist>
						</label>
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Improvement goal
							</span>
							<textarea class="textarea min-h-28 text-white" name="improvementGoal" required
								>{refineProjectSkillFormValues.improvementGoal}</textarea
							>
						</label>
					</div>
					<div class="mt-4 flex justify-end">
						<AppButton type="submit">Preview refinement</AppButton>
					</div>
				</form>
			</DetailSection>

			{#if suggestedProjectSkills.length > 0}
				<DetailSection
					eyebrow="Demand"
					title="Next likely skills"
					description="These come from task prompt-skill requests that are missing from the current project workspace."
					bodyClass="space-y-3"
				>
					{#each suggestedProjectSkills as suggestion (`${suggestion.projectId}:${suggestion.skillId}`)}
						<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="font-medium text-white">{suggestion.skillId}</p>
							<p class="mt-1 text-sm text-slate-400">{suggestion.projectName}</p>
							<p class="mt-2 text-sm text-slate-400">
								Requested by {suggestion.requestingTaskCount} task{suggestion.requestingTaskCount ===
								1
									? ''
									: 's'}.
							</p>
							<form class="mt-3" method="POST" action="?/previewProjectSkill">
								<input name="projectId" type="hidden" value={suggestion.projectId} />
								<input name="skillId" type="hidden" value={suggestion.skillId} />
								<input name="intendedUse" type="hidden" value={suggestion.description} />
								<AppButton type="submit">Preview draft</AppButton>
							</form>
						</article>
					{/each}
				</DetailSection>
			{/if}
		</section>
	</div>

	{#if generatedProjectSkillPreviewVisible}
		<DetailSection
			eyebrow="Draft"
			title="Skill draft preview"
			description={generatedProjectSkillPreview.filePath}
			bodyClass="space-y-4"
		>
			{#if generatedProjectSkillPreview.relatedTaskCount > 0}
				<p class="text-sm text-slate-400">
					Generated from {generatedProjectSkillPreview.relatedTaskCount} related task{generatedProjectSkillPreview.relatedTaskCount ===
					1
						? ''
						: 's'}.
				</p>
			{/if}
			{#if generatedProjectSkillPreviewNeedsSave}
				<form class="space-y-4" method="POST" action="?/saveProjectSkillDraft">
					<input
						name="projectId"
						type="hidden"
						value={form && 'projectId' in form && typeof form.projectId === 'string'
							? form.projectId
							: ''}
					/>
					<input
						name="skillId"
						type="hidden"
						value={form && 'createdSkillId' in form && typeof form.createdSkillId === 'string'
							? form.createdSkillId
							: ''}
					/>
					<input name="saveMode" type="hidden" value={generatedProjectSkillPreviewSaveMode} />
					<label class="block">
						<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
							Description
						</span>
						<input
							class="input border-slate-700 bg-slate-950/80 text-white"
							name="description"
							value={generatedProjectSkillPreview.description}
						/>
					</label>
					{#if previewRefinedProjectSkillSuccess && refinementCurrentSkillContent}
						<div class="grid gap-4 xl:grid-cols-2">
							<div>
								<p class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Current SKILL.md
								</p>
								<pre
									class="ui-wrap-anywhere max-h-[32rem] overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs leading-6 text-slate-400">{refinementCurrentSkillContent}</pre>
							</div>
							<label class="block">
								<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Proposed SKILL.md
								</span>
								<textarea
									class="textarea min-h-[32rem] border-slate-700 bg-slate-950/80 font-mono text-xs leading-6 text-slate-200"
									name="bodyMarkdown">{generatedProjectSkillPreview.body}</textarea
								>
							</label>
						</div>
					{:else}
						<label class="block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								SKILL.md draft
							</span>
							<textarea
								class="textarea min-h-96 border-slate-700 bg-slate-950/80 font-mono text-xs leading-6 text-slate-200"
								name="bodyMarkdown">{generatedProjectSkillPreview.body}</textarea
							>
						</label>
					{/if}
					<div class="flex justify-end">
						<AppButton type="submit">
							{generatedProjectSkillPreviewSaveMode === 'update'
								? 'Save refined skill'
								: 'Save generated skill'}
						</AppButton>
					</div>
				</form>
			{:else if generatedProjectSkillPreview.body}
				<pre
					class="ui-wrap-anywhere max-h-96 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs leading-6 text-slate-300">{generatedProjectSkillPreview.body}</pre>
			{/if}
		</DetailSection>
	{/if}
</AppPage>
