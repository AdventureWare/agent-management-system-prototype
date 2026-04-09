<script lang="ts">
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		executionSurfaceStatusToneClass,
		formatProviderSetupStatusLabel,
		formatExecutionSurfaceStatusLabel,
		providerSetupStatusToneClass
	} from '$lib/types/control-plane';

	let { data, form } = $props();

	function attentionToneClass(severity: string) {
		switch (severity) {
			case 'high':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
			case 'medium':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			case 'low':
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function accessStateClass(state: string) {
		switch (state) {
			case 'healthy':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'offline':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			case 'provider_disabled':
			case 'provider_needs_setup':
			case 'unknown_provider':
			default:
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
		}
	}

	function accessStateLabel(state: string) {
		switch (state) {
			case 'healthy':
				return 'Healthy';
			case 'offline':
				return 'Execution surface offline';
			case 'provider_disabled':
				return 'Provider disabled';
			case 'provider_needs_setup':
				return 'Provider needs setup';
			case 'unknown_provider':
			default:
				return 'Provider missing';
		}
	}

	function recordedStatusClass(status: string) {
		switch (status) {
			case 'healthy':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'warning':
			case 'needs_setup':
			case 'offline':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			case 'blocked':
			case 'disabled':
			case 'provider_missing':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
			case 'unknown':
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

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

	function capabilityInventoryStatus(entry: {
		onlineSupportedExecutionSurfaceCount: number;
		supportedExecutionSurfaceCount: number;
		connectedProviderCount: number;
	}) {
		if (entry.onlineSupportedExecutionSurfaceCount > 0) {
			return { label: 'Usable now', tone: 'usable' as const };
		}

		if (entry.supportedExecutionSurfaceCount > 0 || entry.connectedProviderCount > 0) {
			return { label: 'Partially ready', tone: 'partial' as const };
		}

		return { label: 'Listed only', tone: 'listed' as const };
	}

	function toolInventoryStatus(entry: {
		onlineExecutionSurfaceCount: number;
		executionSurfaceCount: number;
		connectedProviderCount: number;
	}) {
		if (entry.onlineExecutionSurfaceCount > 0 && entry.connectedProviderCount > 0) {
			return { label: 'Usable now', tone: 'usable' as const };
		}

		if (entry.executionSurfaceCount > 0 || entry.connectedProviderCount > 0) {
			return { label: 'Partially ready', tone: 'partial' as const };
		}

		return { label: 'Listed only', tone: 'listed' as const };
	}

	let probeSuccess = $derived(form?.ok && form?.successAction === 'runProbe');
	let providerAvailabilitySuccess = $derived(
		form?.ok && form?.successAction === 'updateProviderAvailability'
	);
	let executionSurfaceAvailabilitySuccess = $derived(
		form?.ok && form?.successAction === 'updateExecutionSurfaceAvailability'
	);
	let createProjectSkillSuccess = $derived(
		form?.ok && form?.successAction === 'createProjectSkill'
	);
	let previewProjectSkillSuccess = $derived(
		form?.ok && form?.successAction === 'previewProjectSkill'
	);
	let generateProjectSkillSuccess = $derived(
		form?.ok && form?.successAction === 'generateProjectSkill'
	);
	let previewRefinedProjectSkillSuccess = $derived(
		form?.ok && form?.successAction === 'previewRefinedProjectSkill'
	);
	let refineProjectSkillSuccess = $derived(
		form?.ok && form?.successAction === 'refineProjectSkill'
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
	let externalSkillSearchRawOutput = $derived.by(() =>
		form && 'rawOutput' in form && typeof form.rawOutput === 'string' ? form.rawOutput : ''
	);
	let installExternalSkillFormValues = $derived.by(() => ({
		projectId:
			form && 'projectId' in form && typeof form.projectId === 'string' ? form.projectId : '',
		packageSpec:
			form && 'packageSpec' in form && typeof form.packageSpec === 'string' ? form.packageSpec : ''
	}));
	let installExternalSkillProjectSummary = $derived.by(() =>
		installExternalSkillFormValues.projectId
			? (data.executionCatalog.projectSkills.find(
					(projectSkills) => projectSkills.projectId === installExternalSkillFormValues.projectId
				) ?? null)
			: null
	);
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
				: 0,
		referenceFiles:
			form &&
			'generatedReferenceFiles' in form &&
			Array.isArray(form.generatedReferenceFiles) &&
			form.generatedReferenceFiles.every(
				(referenceFile) =>
					referenceFile &&
					typeof referenceFile === 'object' &&
					'path' in referenceFile &&
					typeof referenceFile.path === 'string' &&
					'content' in referenceFile &&
					typeof referenceFile.content === 'string'
			)
				? form.generatedReferenceFiles.map((referenceFile) => ({
						path: referenceFile.path,
						content: referenceFile.content
					}))
				: [],
		scriptFiles:
			form &&
			'generatedScriptFiles' in form &&
			Array.isArray(form.generatedScriptFiles) &&
			form.generatedScriptFiles.every(
				(scriptFile) =>
					scriptFile &&
					typeof scriptFile === 'object' &&
					'path' in scriptFile &&
					typeof scriptFile.path === 'string' &&
					'content' in scriptFile &&
					typeof scriptFile.content === 'string'
			)
				? form.generatedScriptFiles.map((scriptFile) => ({
						path: scriptFile.path,
						content: scriptFile.content
					}))
				: []
	}));
	let generatedProjectSkillPreviewVisible = $derived(
		previewProjectSkillSuccess ||
			generateProjectSkillSuccess ||
			previewRefinedProjectSkillSuccess ||
			refineProjectSkillSuccess ||
			saveProjectSkillDraftSuccess
	);
	let generatedProjectSkillPreviewTitle = $derived(
		previewRefinedProjectSkillSuccess || refineProjectSkillSuccess
			? 'Refined skill preview'
			: 'Generated skill preview'
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
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Access"
		title="Track permissions and authorization"
		description="A single inventory for local folder access, provider connection health, execution-surface readiness, and the skills and execution surfaces that are currently installed or usable. It also shows where task-requested prompt skills are missing from project workspaces before those gaps turn into weak thread context."
	>
		{#snippet actions()}
			<form method="POST" action="?/runProbe">
				<AppButton type="submit" variant="primary">Run access probe</AppButton>
			</form>
		{/snippet}
	</PageHeader>

	{#if probeSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Access probe recorded.
		</p>
	{/if}

	{#if form?.message}
		<p class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if providerAvailabilitySuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Provider availability updated.
		</p>
	{/if}

	{#if executionSurfaceAvailabilitySuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			ExecutionSurface availability updated.
		</p>
	{/if}

	{#if createProjectSkillSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Project skill stub created for {form?.createdSkillId}.
		</p>
	{/if}

	{#if generateProjectSkillSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Generated a first skill draft for {form?.createdSkillId}.
			{#if form?.assistChangeSummary}
				{form.assistChangeSummary}
			{/if}
		</p>
	{/if}

	{#if previewProjectSkillSuccess}
		<p class="card border border-sky-900/70 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
			Draft preview ready for {form?.createdSkillId}. Review it before saving it into the project
			workspace.
		</p>
	{/if}

	{#if refineProjectSkillSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Refined skill draft for {form?.createdSkillId}.
			{#if form?.assistChangeSummary}
				{form.assistChangeSummary}
			{/if}
		</p>
	{/if}

	{#if previewRefinedProjectSkillSuccess}
		<p class="card border border-sky-900/70 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
			Refined draft preview ready for {form?.createdSkillId}. Review it before overwriting the
			existing skill file.
		</p>
	{/if}

	{#if saveProjectSkillDraftSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Saved skill draft for {form?.createdSkillId}.
			{#if form?.assistChangeSummary}
				{form.assistChangeSummary}
			{/if}
		</p>
	{/if}

	{#if generatedProjectSkillPreviewVisible}
		<div class="rounded-2xl border border-sky-900/50 bg-sky-950/20 p-4">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p class="text-[11px] tracking-[0.16em] text-sky-300 uppercase">
						{generatedProjectSkillPreviewTitle}
					</p>
					<p class="mt-2 text-sm text-slate-300">
						{generatedProjectSkillPreview.description}
					</p>
				</div>
				{#if generatedProjectSkillPreview.relatedTaskCount > 0}
					<span
						class="badge border border-sky-800/70 bg-sky-950/40 text-[0.72rem] tracking-[0.18em] text-sky-200 uppercase"
					>
						{generatedProjectSkillPreview.relatedTaskCount} related task{generatedProjectSkillPreview.relatedTaskCount ===
						1
							? ''
							: 's'}
					</span>
				{/if}
			</div>
			{#if generatedProjectSkillPreview.filePath}
				<p class="ui-wrap-anywhere mt-3 text-xs text-slate-400">
					{generatedProjectSkillPreviewNeedsSave ? 'Will be written to' : 'Written to'}
					{` ${generatedProjectSkillPreview.filePath}`}
				</p>
			{/if}
			{#if generatedProjectSkillPreviewNeedsSave}
				<form class="mt-4 space-y-4" method="POST" action="?/saveProjectSkillDraft">
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
					<input
						name="assistChangeSummary"
						type="hidden"
						value={form &&
						'assistChangeSummary' in form &&
						typeof form.assistChangeSummary === 'string'
							? form.assistChangeSummary
							: ''}
					/>
					<input
						name="relatedTaskCount"
						type="hidden"
						value={generatedProjectSkillPreview.relatedTaskCount}
					/>
					<label class="block">
						<span class="mb-2 block text-[11px] tracking-[0.16em] text-sky-300 uppercase">
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
								<p class="mb-2 block text-[11px] tracking-[0.16em] text-sky-300 uppercase">
									Current SKILL.md
								</p>
								<pre
									class="ui-wrap-anywhere max-h-[32rem] overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs leading-6 text-slate-400">{refinementCurrentSkillContent}</pre>
							</div>
							<label class="block">
								<span class="mb-2 block text-[11px] tracking-[0.16em] text-sky-300 uppercase">
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
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-sky-300 uppercase">
								SKILL.md draft
							</span>
							<textarea
								class="textarea min-h-96 border-slate-700 bg-slate-950/80 font-mono text-xs leading-6 text-slate-200"
								name="bodyMarkdown">{generatedProjectSkillPreview.body}</textarea
							>
						</label>
					{/if}
					{#if generatedProjectSkillPreview.referenceFiles.length > 0}
						<div class="space-y-3">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<p class="text-[11px] tracking-[0.16em] text-sky-300 uppercase">Reference files</p>
								<span
									class="badge border border-sky-800/70 bg-sky-950/40 text-[0.72rem] tracking-[0.18em] text-sky-200 uppercase"
								>
									{generatedProjectSkillPreview.referenceFiles.length} file{generatedProjectSkillPreview
										.referenceFiles.length === 1
										? ''
										: 's'}
								</span>
							</div>
							<p class="text-xs text-slate-400">
								Reference files are optional. Clear either field to omit one before save.
							</p>
							{#each generatedProjectSkillPreview.referenceFiles as referenceFile (referenceFile.path)}
								<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
									<label class="block">
										<span class="mb-2 block text-[11px] tracking-[0.16em] text-sky-300 uppercase">
											Path
										</span>
										<input
											class="input font-mono text-xs text-white"
											name="referenceFilePath"
											value={referenceFile.path}
										/>
									</label>
									<label class="mt-3 block">
										<span class="mb-2 block text-[11px] tracking-[0.16em] text-sky-300 uppercase">
											Content
										</span>
										<textarea
											class="textarea min-h-64 font-mono text-xs leading-6 text-slate-200"
											name="referenceFileContent">{referenceFile.content}</textarea
										>
									</label>
								</div>
							{/each}
						</div>
					{/if}
					{#if generatedProjectSkillPreview.scriptFiles.length > 0}
						<div class="space-y-3">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<p class="text-[11px] tracking-[0.16em] text-sky-300 uppercase">Script files</p>
								<span
									class="badge border border-sky-800/70 bg-sky-950/40 text-[0.72rem] tracking-[0.18em] text-sky-200 uppercase"
								>
									{generatedProjectSkillPreview.scriptFiles.length} file{generatedProjectSkillPreview
										.scriptFiles.length === 1
										? ''
										: 's'}
								</span>
							</div>
							<p class="text-xs text-slate-400">
								Scripts are optional. Clear either field to omit one before save.
							</p>
							{#each generatedProjectSkillPreview.scriptFiles as scriptFile (scriptFile.path)}
								<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
									<label class="block">
										<span class="mb-2 block text-[11px] tracking-[0.16em] text-sky-300 uppercase">
											Path
										</span>
										<input
											class="input font-mono text-xs text-white"
											name="scriptFilePath"
											value={scriptFile.path}
										/>
									</label>
									<label class="mt-3 block">
										<span class="mb-2 block text-[11px] tracking-[0.16em] text-sky-300 uppercase">
											Content
										</span>
										<textarea
											class="textarea min-h-64 font-mono text-xs leading-6 text-slate-200"
											name="scriptFileContent">{scriptFile.content}</textarea
										>
									</label>
								</div>
							{/each}
						</div>
					{/if}
					<div class="flex flex-wrap items-center justify-between gap-3">
						<p class="text-xs text-slate-400">
							{generatedProjectSkillPreviewSaveMode === 'update'
								? 'Saving will overwrite the existing project-local skill file with this refined draft.'
								: 'Saving will create a new project-local skill file with this generated draft.'}
						</p>
						<button
							class="rounded-full border border-sky-800/70 bg-sky-950/40 px-3 py-2 text-xs font-medium text-sky-100 transition hover:border-sky-700 hover:text-white"
							type="submit"
						>
							{generatedProjectSkillPreviewSaveMode === 'update'
								? 'Save refined skill'
								: 'Save generated skill'}
						</button>
					</div>
				</form>
			{:else}
				{#if generatedProjectSkillPreview.body}
					<pre
						class="ui-wrap-anywhere mt-4 max-h-96 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs leading-6 text-slate-300">{generatedProjectSkillPreview.body}</pre>
				{/if}
				{#if generatedProjectSkillPreview.referenceFiles.length > 0}
					<div class="mt-4 space-y-3">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<p class="text-[11px] tracking-[0.16em] text-sky-300 uppercase">Reference files</p>
							<span
								class="badge border border-sky-800/70 bg-sky-950/40 text-[0.72rem] tracking-[0.18em] text-sky-200 uppercase"
							>
								{generatedProjectSkillPreview.referenceFiles.length} file{generatedProjectSkillPreview
									.referenceFiles.length === 1
									? ''
									: 's'}
							</span>
						</div>
						{#each generatedProjectSkillPreview.referenceFiles as referenceFile (referenceFile.path)}
							<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
								<p class="ui-wrap-anywhere font-mono text-xs text-sky-200">
									{referenceFile.path}
								</p>
								<pre
									class="ui-wrap-anywhere mt-3 max-h-72 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs leading-6 text-slate-300">{referenceFile.content}</pre>
							</div>
						{/each}
					</div>
				{/if}
				{#if generatedProjectSkillPreview.scriptFiles.length > 0}
					<div class="mt-4 space-y-3">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<p class="text-[11px] tracking-[0.16em] text-sky-300 uppercase">Script files</p>
							<span
								class="badge border border-sky-800/70 bg-sky-950/40 text-[0.72rem] tracking-[0.18em] text-sky-200 uppercase"
							>
								{generatedProjectSkillPreview.scriptFiles.length} file{generatedProjectSkillPreview
									.scriptFiles.length === 1
									? ''
									: 's'}
							</span>
						</div>
						{#each generatedProjectSkillPreview.scriptFiles as scriptFile (scriptFile.path)}
							<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
								<p class="ui-wrap-anywhere font-mono text-xs text-sky-200">
									{scriptFile.path}
								</p>
								<pre
									class="ui-wrap-anywhere mt-3 max-h-72 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs leading-6 text-slate-300">{scriptFile.content}</pre>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
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
			{#if installExternalSkillProjectSummary}
				{#if installExternalSkillProjectSummary.missingRequestedSkillCount === 0}
					No requested prompt-skill gaps remain for {installExternalSkillProjectSummary.projectName}.
				{:else}
					{installExternalSkillProjectSummary.missingRequestedSkillCount}
					requested prompt skill gap(s) remain for {installExternalSkillProjectSummary.projectName}.
				{/if}
			{/if}
		</p>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
		<MetricCard
			label="Projects blocked"
			value={data.summary.projectBlockerCount}
			detail="Projects with launch-critical local path issues."
		/>
		<MetricCard
			label="Attention paths"
			value={data.summary.attentionPathCount}
			detail="Tracked local paths that need review."
		/>
		<MetricCard
			label="macOS cloud probes"
			value={data.summary.macosPromptCount}
			detail="Cloud-synced paths where the probe was inconclusive."
		/>
		<MetricCard
			label="Providers needing setup"
			value={data.summary.providerNeedsSetupCount}
			detail="Provider configs that are not yet in a connected state."
		/>
		<MetricCard
			label="Prompt-skill gaps"
			value={data.summary.projectsMissingRequestedPromptSkillsCount}
			detail="Projects where tasks request prompt skills that are not installed."
		/>
		<MetricCard
			label="Execution-surface access issues"
			value={data.summary.executionSurfaceAccessIssueCount}
			detail="Execution surfaces blocked by provider state or offline status."
		/>
	</div>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
		<section class="space-y-6">
			<DetailSection
				eyebrow="Workbench"
				title="Add skills and execution context"
				description="Create project-local skills from real task demand, and use the right control surface when you actually mean role MCPs or provider tools."
				bodyClass="space-y-4"
			>
				<form
					class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
					method="POST"
					action="?/searchExternalSkills"
				>
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Find external skills
							</p>
							<p class="mt-2 text-sm text-slate-400">
								Search the external skills ecosystem, review the package spec and source link, then
								install project-locally from the reviewed result.
							</p>
						</div>
						<span
							class="badge border border-slate-700 bg-slate-950/70 text-[0.72rem] tracking-[0.18em] text-slate-200 uppercase"
						>
							Reviewed install
						</span>
					</div>

					<div class="mt-4 grid gap-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]">
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
								placeholder="react performance, docs, changelog"
								required
								value={externalSkillSearchFormValues.query}
							/>
						</label>

						<div class="flex items-end">
							<button
								class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-700 hover:text-white"
								type="submit"
							>
								Search
							</button>
						</div>
					</div>
				</form>

				{#if externalSkillSearchResults.length > 0}
					<div class="grid gap-3 lg:grid-cols-2">
						{#each externalSkillSearchResults as result (result.packageSpec)}
							<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<p class="ui-wrap-anywhere font-mono text-sm text-white">
											{result.packageSpec}
										</p>
										<p class="mt-2 text-sm text-slate-400">
											Review this package spec before installing it project-locally.
										</p>
									</div>
									{#if result.installCountLabel}
										<span
											class="badge border border-slate-700 bg-slate-950/70 text-[0.72rem] tracking-[0.18em] text-slate-200 uppercase"
										>
											{result.installCountLabel} installs
										</span>
									{/if}
								</div>
								<div class="mt-4 flex flex-wrap items-center gap-2">
									{#if result.url}
										<a
											class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
											href={result.url}
											target="_blank"
											rel="noreferrer"
										>
											Open source
										</a>
									{/if}
									<form method="POST" action="?/installExternalSkill">
										<input
											name="projectId"
											type="hidden"
											value={externalSkillSearchFormValues.projectId}
										/>
										<input name="query" type="hidden" value={externalSkillSearchFormValues.query} />
										<input name="packageSpec" type="hidden" value={result.packageSpec} />
										<button
											class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-700 hover:text-white"
											type="submit"
										>
											Install to project
										</button>
									</form>
								</div>
							</article>
						{/each}
					</div>
				{:else if externalSkillSearchSuccess}
					<div class="rounded-2xl border border-dashed border-slate-800 p-4">
						<p class="text-sm text-slate-400">
							No external skills were parsed from the search results. If the CLI returned something
							unexpected, you can review the raw response below or install by package spec manually.
						</p>
						{#if externalSkillSearchRawOutput}
							<pre
								class="ui-wrap-anywhere mt-4 max-h-80 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs leading-6 text-slate-300">{externalSkillSearchRawOutput}</pre>
						{/if}
					</div>
				{/if}

				<form
					class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
					method="POST"
					action="?/installExternalSkill"
				>
					<input name="query" type="hidden" value={externalSkillSearchFormValues.query} />
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Manual package install
							</p>
							<p class="mt-2 text-sm text-slate-400">
								Use this when search parsing misses a valid package spec but you already know what
								you want to install.
							</p>
						</div>
					</div>

					<div class="mt-4 grid gap-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]">
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
								placeholder="owner/repo@skill-name"
								required
								value={installExternalSkillFormValues.packageSpec}
							/>
						</label>

						<div class="flex items-end">
							<button
								class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-700 hover:text-white"
								type="submit"
							>
								Install
							</button>
						</div>
					</div>
				</form>

				<div class="grid gap-4 xl:grid-cols-3">
					<form
						class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
						method="POST"
						action="?/previewProjectSkill"
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Generate custom skill
								</p>
								<p class="mt-2 text-sm text-slate-400">
									Generate a first real `SKILL.md` draft from project context, installed skills, and
									related task demand.
								</p>
							</div>
							<span
								class="badge border border-sky-800/70 bg-sky-950/40 text-[0.72rem] tracking-[0.18em] text-sky-200 uppercase"
							>
								AI-assisted draft
							</span>
						</div>

						<div class="mt-4 grid gap-3 md:grid-cols-2">
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
						</div>

						<label class="mt-3 block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Intended use
							</span>
							<textarea
								class="textarea min-h-28 text-white"
								name="intendedUse"
								placeholder="Generate release notes and changelog copy grounded in this project’s repo and delivery workflow."
								required>{generateProjectSkillFormValues.intendedUse}</textarea
							>
						</label>

						<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
							<p class="text-xs text-slate-500">
								This writes a new project-local skill file. It is intentionally a first strong
								draft, not the full validation and iteration system yet.
							</p>
							<button
								class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-700 hover:text-white"
								type="submit"
							>
								Preview draft
							</button>
						</div>
					</form>

					<form
						class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
						method="POST"
						action="?/previewRefinedProjectSkill"
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Refine existing skill
								</p>
								<p class="mt-2 text-sm text-slate-400">
									Rewrite a project-local skill using a concrete improvement goal and the same
									project/task context used for skill generation.
								</p>
							</div>
							<span
								class="badge border border-sky-800/70 bg-sky-950/40 text-[0.72rem] tracking-[0.18em] text-sky-200 uppercase"
							>
								Improvement pass
							</span>
						</div>

						<div class="mt-4 grid gap-3 md:grid-cols-2">
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
									list="project-installed-skill-options"
									placeholder="release-changelog-writer"
									required
									value={refineProjectSkillFormValues.skillId}
								/>
								<datalist id="project-installed-skill-options">
									{#each refineProjectSkillChoices as skill (skill.id)}
										<option value={skill.id}>{skill.sourceLabel}</option>
									{/each}
								</datalist>
							</label>
						</div>

						{#if refineProjectSkillFormValues.projectId}
							<p class="mt-3 text-xs text-slate-500">
								{#if refineProjectSkillChoices.length > 0}
									{refineProjectSkillChoices.length} installed skill{refineProjectSkillChoices.length ===
									1
										? ''
										: 's'} discovered for this project.
								{:else}
									No installed skills discovered for this project yet.
								{/if}
							</p>
						{/if}

						<label class="mt-3 block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Improvement goal
							</span>
							<textarea
								class="textarea min-h-28 text-white"
								name="improvementGoal"
								placeholder="Make the trigger tighter, add project-specific guardrails, and turn the workflow into a more reliable step-by-step procedure."
								required>{refineProjectSkillFormValues.improvementGoal}</textarea
							>
						</label>

						<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
							<p class="text-xs text-slate-500">
								This overwrites the existing project-local skill file with a refined draft.
							</p>
							<button
								class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-700 hover:text-white"
								type="submit"
							>
								Preview refinement
							</button>
						</div>
					</form>

					<form
						class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
						method="POST"
						action="?/createProjectSkill"
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Create project skill
								</p>
								<p class="mt-2 text-sm text-slate-400">
									Scaffold a reusable project-local skill under `.agents/skills` when a workflow
									keeps recurring.
								</p>
							</div>
							<span
								class="badge border border-slate-700 bg-slate-950/70 text-[0.72rem] tracking-[0.18em] text-slate-200 uppercase"
							>
								Project-local
							</span>
						</div>

						<div class="mt-4 grid gap-3 md:grid-cols-2">
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
						</div>

						<label class="mt-3 block">
							<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Description
							</span>
							<input
								class="input text-white"
								name="description"
								placeholder="Project-specific guidance for writing operator-facing docs."
								required
								value={createProjectSkillFormValues.description}
							/>
						</label>

						<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
							<p class="text-xs text-slate-500">
								The app creates a starter `SKILL.md`. You can refine the trigger language and
								workflow after scaffolding it.
							</p>
							<button
								class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-700 hover:text-white"
								type="submit"
							>
								Create skill stub
							</button>
						</div>
					</form>

					<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
							Where to add other capability types
						</p>
						<div class="mt-4 space-y-3">
							<a
								class="block rounded-2xl border border-slate-800 bg-slate-900/60 p-3 transition hover:border-sky-400/40 hover:bg-slate-900"
								href="/app/roles"
							>
								<p class="text-sm font-medium text-white">Roles</p>
								<p class="mt-1 text-sm text-slate-400">
									Define role-level default skills, MCPs, tools, prompt instructions, and review
									policy.
								</p>
							</a>
							<a
								class="block rounded-2xl border border-slate-800 bg-slate-900/60 p-3 transition hover:border-sky-400/40 hover:bg-slate-900"
								href="/app/providers"
							>
								<p class="text-sm font-medium text-white">Providers</p>
								<p class="mt-1 text-sm text-slate-400">
									Configure launchers, auth, provider capabilities, and readiness for tool/runtime
									access.
								</p>
							</a>
							<a
								class="block rounded-2xl border border-slate-800 bg-slate-900/60 p-3 transition hover:border-sky-400/40 hover:bg-slate-900"
								href="/app/execution-surfaces"
							>
								<p class="text-sm font-medium text-white">Execution surfaces</p>
								<p class="mt-1 text-sm text-slate-400">
									Assign execution-surface skills, supported roles, and live availability.
								</p>
							</a>
						</div>
					</div>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Next likely skills to add
							</p>
							<p class="mt-2 text-sm text-slate-400">
								These come from tasks already requesting prompt skills that are missing from the
								current project workspace.
							</p>
						</div>
						<span
							class="badge border border-slate-700 bg-slate-950/70 text-[0.72rem] tracking-[0.18em] text-slate-200 uppercase"
						>
							{suggestedProjectSkills.length} suggestions
						</span>
					</div>

					{#if suggestedProjectSkills.length === 0}
						<p
							class="mt-4 rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No missing prompt-skill demand is recorded right now. Use the form above when you want
							to create a new project-local skill proactively.
						</p>
					{:else}
						<div class="mt-4 grid gap-3 lg:grid-cols-2">
							{#each suggestedProjectSkills as suggestion (`${suggestion.projectId}:${suggestion.skillId}`)}
								<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div class="min-w-0 flex-1">
											<p class="font-medium text-white">{suggestion.skillId}</p>
											<p class="mt-1 text-sm text-slate-400">
												<a class="text-sky-300 hover:text-sky-200" href={suggestion.projectHref}>
													{suggestion.projectName}
												</a>
											</p>
											<p class="mt-2 text-sm text-slate-400">
												Requested by {suggestion.requestingTaskCount} task{suggestion.requestingTaskCount ===
												1
													? ''
													: 's'}.
											</p>
										</div>
										<div class="flex flex-wrap items-center gap-2">
											<form method="POST" action="?/previewProjectSkill">
												<input name="projectId" type="hidden" value={suggestion.projectId} />
												<input name="skillId" type="hidden" value={suggestion.skillId} />
												<input name="intendedUse" type="hidden" value={suggestion.description} />
												<button
													class="rounded-full border border-sky-800/70 bg-sky-950/40 px-3 py-2 text-xs font-medium text-sky-100 transition hover:border-sky-700 hover:text-white"
													type="submit"
												>
													Preview draft
												</button>
											</form>
											<form method="POST" action="?/createProjectSkill">
												<input name="projectId" type="hidden" value={suggestion.projectId} />
												<input name="skillId" type="hidden" value={suggestion.skillId} />
												<input name="description" type="hidden" value={suggestion.description} />
												<button
													class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-700 hover:text-white"
													type="submit"
												>
													Create stub
												</button>
											</form>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</div>
			</DetailSection>

			<DetailSection
				eyebrow="Recorded state"
				title="Last probe and recent changes"
				description="Use the probe button to save the current access state and keep a simple history of changes."
				bodyClass="space-y-4"
			>
				<div class="grid gap-4 md:grid-cols-2">
					<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Last checked</p>
						<p class="mt-2 text-sm text-white">
							{data.probeState.lastCheckedAt ?? 'No recorded probe yet'}
						</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Recorded targets</p>
						<p class="mt-2 text-sm text-white">{data.probeState.records.length}</p>
					</div>
				</div>

				{#if data.probeState.events.length === 0}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
					>
						No recorded access changes yet.
					</p>
				{:else}
					<div class="space-y-3">
						{#each data.probeState.events.slice(0, 8) as event (event.id)}
							<a
								class="block rounded-2xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
								href={event.scopeHref}
								rel="external"
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-2">
											<h3 class="ui-wrap-anywhere font-medium text-white">
												{event.targetLabel}
											</h3>
											<span
												class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${recordedStatusClass(event.nextStatus)}`}
											>
												{event.nextStatus.replace(/_/g, ' ')}
											</span>
										</div>
										<p class="mt-2 text-sm text-slate-300">{event.scopeLabel}</p>
										<p class="mt-2 text-sm text-slate-400">{event.summary}</p>
									</div>
									<div class="text-xs text-slate-500">
										<p>{event.checkedAt}</p>
										<p class="mt-1">
											{event.previousStatus
												? `${event.previousStatus} -> ${event.nextStatus}`
												: `new -> ${event.nextStatus}`}
										</p>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</DetailSection>

			<DetailSection
				eyebrow="Attention"
				title="Local paths needing action"
				description="These are the local folder issues currently visible across all projects."
				bodyClass="space-y-4"
			>
				{#if data.attentionPaths.length === 0}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
					>
						No tracked local path issues right now.
					</p>
				{:else}
					{#each data.attentionPaths as item (item.id)}
						<article class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<h3 class="ui-wrap-anywhere font-medium text-white">{item.label}</h3>
										<span
											class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${attentionToneClass(item.severity)}`}
										>
											{item.severity}
										</span>
										{#if item.requiredForLaunch}
											<span
												class="badge border border-slate-700 bg-slate-900/80 text-[0.72rem] tracking-[0.18em] text-slate-200 uppercase"
											>
												Launch critical
											</span>
										{/if}
									</div>
									<p class="ui-wrap-anywhere mt-2 text-sm text-slate-300">
										{item.path || 'Not configured'}
									</p>
									<p class="mt-2 text-sm text-slate-500">
										<a
											class="text-sky-300 hover:text-sky-200"
											href={item.projectHref}
											rel="external"
										>
											{item.projectName}
										</a>
									</p>
								</div>
							</div>

							<div class="mt-4 grid gap-3 lg:grid-cols-2">
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Host access</p>
									<p class="mt-2 text-sm text-white">{item.accessMessage}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Sandbox coverage
									</p>
									<p class="mt-2 text-sm text-white">{item.coverageMessage}</p>
								</div>
							</div>

							{#if item.recommendedAction}
								<p class="mt-4 text-sm text-sky-200">{item.recommendedAction}</p>
							{/if}
						</article>
					{/each}
				{/if}
			</DetailSection>

			<DetailSection
				eyebrow="Projects"
				title="Project access inventory"
				description="Each project rolls up its local folder status so you can see where attention is accumulating."
				bodyClass="space-y-4"
			>
				<div class="grid gap-4 lg:grid-cols-2">
					{#each data.projects as project (project.id)}
						<a
							class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
							href={project.projectHref}
							rel="external"
						>
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<h3 class="ui-wrap-anywhere font-medium text-white">{project.name}</h3>
									<p class="ui-clamp-2 mt-2 text-sm text-slate-300">{project.summary}</p>
								</div>
								<span
									class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${project.permissionSurface.summary.blockerCount > 0 ? 'border-rose-900/70 bg-rose-950/40 text-rose-200' : 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200'}`}
								>
									{project.permissionSurface.summary.blockerCount > 0 ? 'Needs action' : 'Clear'}
								</span>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-3">
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Sandbox</p>
									<p class="mt-2 text-sm text-white">
										{project.permissionSurface.effectiveSandbox}
									</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Launch blockers
									</p>
									<p class="mt-2 text-sm text-white">
										{project.permissionSurface.summary.blockerCount}
									</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Outside sandbox
									</p>
									<p class="mt-2 text-sm text-white">
										{project.permissionSurface.summary.outsideSandboxCount}
									</p>
								</div>
							</div>
						</a>
					{/each}
				</div>
			</DetailSection>
		</section>

		<section class="space-y-6">
			<DetailSection
				eyebrow="Inventory"
				title="Installed skills and execution surfaces"
				description="Use this catalog to compare project-installed skills with the capability and launcher coverage that execution surfaces and providers can currently support, including prompt skills tasks are already requesting."
				bodyClass="space-y-5"
			>
				<div class="space-y-3">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Project-installed skills
							</p>
							<p class="mt-2 text-sm text-slate-400">
								These are the Codex skills discovered per project root. They inform prompt context
								for new threads but are separate from execution-surface/provider routing metadata.
								Task-requested prompt skills are shown alongside the installed inventory so missing
								context is visible before launch.
							</p>
						</div>
						<span
							class="badge border border-slate-700 bg-slate-950/70 text-[0.72rem] tracking-[0.18em] text-slate-200 uppercase"
						>
							{data.executionCatalog.projectSkills.reduce(
								(total, project) => total + project.totalCount,
								0
							)} total discovered
						</span>
					</div>

					<div class="grid gap-4 lg:grid-cols-2">
						{#each data.executionCatalog.projectSkills as projectSkills (projectSkills.projectId)}
							<a
								class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
								href={projectSkills.projectHref}
								rel="external"
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<h3 class="ui-wrap-anywhere font-medium text-white">
											{projectSkills.projectName}
										</h3>
										<p class="mt-2 text-sm text-slate-400">
											{projectSkills.missingRequestedSkillCount > 0
												? `${projectSkills.missingRequestedSkillCount} requested prompt skill${projectSkills.missingRequestedSkillCount === 1 ? '' : 's'} are not installed for this project workspace.`
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

								<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
									<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Total</p>
										<p class="mt-2 text-sm text-white">{projectSkills.totalCount}</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
											Project-local
										</p>
										<p class="mt-2 text-sm text-white">{projectSkills.projectCount}</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Global</p>
										<p class="mt-2 text-sm text-white">{projectSkills.globalCount}</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Requested</p>
										<p class="mt-2 text-sm text-white">{projectSkills.requestedSkillCount}</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Missing</p>
										<p class="mt-2 text-sm text-white">
											{projectSkills.missingRequestedSkillCount}
										</p>
									</div>
								</div>

								{#if projectSkills.requestedSkillCount > 0}
									<p class="mt-4 text-sm text-slate-400">
										{projectSkills.requestingTaskCount} task{projectSkills.requestingTaskCount === 1
											? ''
											: 's'} currently request prompt skills for this project.
										{#if projectSkills.tasksMissingRequestedSkillCount > 0}
											{` ${projectSkills.tasksMissingRequestedSkillCount} task${projectSkills.tasksMissingRequestedSkillCount === 1 ? '' : 's'} are missing at least one requested skill.`}
										{/if}
									</p>
								{/if}

								{#if projectSkills.previewSkills.length > 0}
									<div class="mt-4 flex flex-wrap gap-2">
										{#each projectSkills.previewSkills as skill (skill.id)}
											<span
												class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200"
												title={skill.sourceLabel}
											>
												{skill.id}
											</span>
										{/each}
									</div>
								{/if}

								{#if projectSkills.missingRequestedSkills.length > 0}
									<div class="mt-4 flex flex-wrap gap-2">
										{#each projectSkills.missingRequestedSkills as skill (skill.id)}
											<span
												class="rounded-full border border-amber-900/70 bg-amber-950/40 px-3 py-1 text-xs text-amber-100"
												title={`${skill.requestingTaskCount} task${skill.requestingTaskCount === 1 ? '' : 's'} request this skill`}
											>
												{skill.id}
											</span>
										{/each}
									</div>
									<p class="mt-2 text-xs text-amber-200">
										Task-requested prompt skills that are not currently installed for this project
										workspace.
									</p>
								{/if}
							</a>
						{/each}
					</div>
				</div>

				<div class="space-y-3">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Capability coverage
							</p>
							<p class="mt-2 text-sm text-slate-400">
								Capabilities combine execution-surface skills and provider-declared capabilities so
								you can see which labels are merely listed versus currently backed by live execution
								surfaces.
							</p>
						</div>
						<span
							class="badge border border-slate-700 bg-slate-950/70 text-[0.72rem] tracking-[0.18em] text-slate-200 uppercase"
						>
							{data.executionCatalog.capabilities.length} tracked
						</span>
					</div>

					{#if data.executionCatalog.capabilities.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No execution-surface skills or provider capabilities are recorded yet.
						</p>
					{:else}
						<div class="space-y-3">
							{#each data.executionCatalog.capabilities as capability (capability.name)}
								<article class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div class="min-w-0 flex-1">
											<h3 class="ui-wrap-anywhere font-medium text-white">{capability.name}</h3>
											<p class="mt-2 text-sm text-slate-400">
												{capability.onlineSupportedExecutionSurfaceCount} online execution surface{capability.onlineSupportedExecutionSurfaceCount ===
												1
													? ''
													: 's'} can currently cover this label through direct execution-surface skills
												or provider metadata.
											</p>
										</div>
										<span
											class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${inventoryStatusClass(capabilityInventoryStatus(capability).tone)}`}
										>
											{capabilityInventoryStatus(capability).label}
										</span>
									</div>

									<div class="mt-4 grid gap-3 sm:grid-cols-4">
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Surface skills
											</p>
											<p class="mt-2 text-sm text-white">
												{capability.executionSurfaceSkillCount}
											</p>
										</div>
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Supporting surfaces
											</p>
											<p class="mt-2 text-sm text-white">
												{capability.supportedExecutionSurfaceCount}
											</p>
										</div>
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Provider declarations
											</p>
											<p class="mt-2 text-sm text-white">
												{capability.providerCapabilityCount}
											</p>
										</div>
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Connected providers
											</p>
											<p class="mt-2 text-sm text-white">
												{capability.connectedProviderCount}
											</p>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</div>

				<div class="space-y-3">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Launcher coverage
							</p>
							<p class="mt-2 text-sm text-slate-400">
								Launchers track the execution surfaces currently declared by providers and backed by
								registered surfaces.
							</p>
						</div>
						<span
							class="badge border border-slate-700 bg-slate-950/70 text-[0.72rem] tracking-[0.18em] text-slate-200 uppercase"
						>
							{data.executionCatalog.tools.length} tracked
						</span>
					</div>

					{#if data.executionCatalog.tools.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No provider launchers are recorded yet.
						</p>
					{:else}
						<div class="space-y-3">
							{#each data.executionCatalog.tools as tool (tool.name)}
								<article class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div class="min-w-0 flex-1">
											<h3 class="ui-wrap-anywhere font-medium text-white">{tool.name}</h3>
											<p class="mt-2 text-sm text-slate-400">
												{tool.onlineExecutionSurfaceCount} online execution surface{tool.onlineExecutionSurfaceCount ===
												1
													? ''
													: 's'} are currently attached to this launcher.
											</p>
										</div>
										<span
											class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${inventoryStatusClass(toolInventoryStatus(tool).tone)}`}
										>
											{toolInventoryStatus(tool).label}
										</span>
									</div>

									<div class="mt-4 grid gap-3 sm:grid-cols-4">
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Providers
											</p>
											<p class="mt-2 text-sm text-white">{tool.providerCount}</p>
										</div>
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Connected providers
											</p>
											<p class="mt-2 text-sm text-white">{tool.connectedProviderCount}</p>
										</div>
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Execution surfaces
											</p>
											<p class="mt-2 text-sm text-white">{tool.executionSurfaceCount}</p>
										</div>
										<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Online surfaces
											</p>
											<p class="mt-2 text-sm text-white">
												{tool.onlineExecutionSurfaceCount}
											</p>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</div>
			</DetailSection>

			<DetailSection
				eyebrow="Providers"
				title="Connection health"
				description="Providers are the current source of truth for auth mode, setup status, and default runtime context."
				bodyClass="space-y-4"
			>
				{#each data.providers as provider (provider.id)}
					<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<h3 class="ui-wrap-anywhere font-medium text-white">{provider.name}</h3>
								<p class="mt-2 text-sm text-slate-300">{provider.service}</p>
							</div>
							<div class="flex flex-wrap gap-2">
								<span
									class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${provider.enabled ? 'border-sky-800/70 bg-sky-950/40 text-sky-200' : 'border-slate-700 bg-slate-950/70 text-slate-300'}`}
								>
									{provider.enabled ? 'Enabled' : 'Disabled'}
								</span>
								<span
									class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${providerSetupStatusToneClass(provider.setupStatus)}`}
								>
									{formatProviderSetupStatusLabel(provider.setupStatus)}
								</span>
							</div>
						</div>

						<div class="mt-4 grid gap-3 sm:grid-cols-3">
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Auth mode</p>
								<p class="mt-2 text-sm text-white">{provider.authMode.replace('_', ' ')}</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Execution surfaces
								</p>
								<p class="mt-2 text-sm text-white">{provider.executionSurfaceCount}</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Sandbox</p>
								<p class="mt-2 text-sm text-white">{provider.defaultThreadSandbox}</p>
							</div>
						</div>

						<form class="mt-4 space-y-3" method="POST" action="?/updateProviderAvailability">
							<input name="providerId" type="hidden" value={provider.id} />

							<div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
								<label class="block">
									<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Quick setup status
									</span>
									<select class="select text-white" name="setupStatus">
										{#each data.providerSetupStatusOptions as setupStatus (setupStatus)}
											<option value={setupStatus} selected={provider.setupStatus === setupStatus}>
												{formatProviderSetupStatusLabel(setupStatus)}
											</option>
										{/each}
									</select>
								</label>

								<label
									class="inline-flex items-center gap-3 self-end rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-200"
								>
									<input
										checked={provider.enabled}
										class="checkbox"
										name="enabled"
										type="checkbox"
									/>
									<span>Enabled</span>
								</label>
							</div>

							<div class="flex items-center justify-between gap-3">
								<p class="text-xs text-slate-500">
									Use quick controls here, or open the provider detail page for full configuration.
								</p>
								<div class="flex flex-wrap items-center gap-2">
									<a
										class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
										href={provider.providerHref}
									>
										Open detail
									</a>
									<button
										class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-700 hover:text-white"
										type="submit"
									>
										Save readiness
									</button>
								</div>
							</div>
						</form>
					</article>
				{/each}
			</DetailSection>

			<DetailSection
				eyebrow="Execution surfaces"
				title="Execution surface readiness"
				description="Execution surfaces inherit access risk from both their own state and their backing provider."
				bodyClass="space-y-4"
			>
				{#each data.executionSurfaces as executionSurface (executionSurface.id)}
					<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="ui-wrap-anywhere font-medium text-white">{executionSurface.name}</h3>
									<span
										class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${executionSurfaceStatusToneClass(executionSurface.status)}`}
									>
										{formatExecutionSurfaceStatusLabel(executionSurface.status)}
									</span>
								</div>
								<p class="mt-2 text-sm text-slate-300">{executionSurface.providerName}</p>
								<p class="mt-1 text-sm text-slate-500">
									{executionSurface.supportedRoleNames?.length > 0
										? executionSurface.supportedRoleNames.join(', ')
										: executionSurface.roleName}
								</p>
							</div>
							<span
								class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${accessStateClass(executionSurface.accessState)}`}
							>
								{accessStateLabel(executionSurface.accessState)}
							</span>
						</div>

						<form
							class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
							method="POST"
							action="?/updateExecutionSurfaceAvailability"
						>
							<input name="executionSurfaceId" type="hidden" value={executionSurface.id} />

							<label class="block min-w-0 flex-1">
								<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Quick surface status
								</span>
								<select class="select text-white" name="status">
									{#each data.executionSurfaceStatusOptions as status (status)}
										<option value={status} selected={executionSurface.status === status}>
											{formatExecutionSurfaceStatusLabel(status)}
										</option>
									{/each}
								</select>
							</label>

							<button
								class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-700 hover:text-white"
								type="submit"
							>
								Update status
							</button>

							<a
								class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
								href={executionSurface.executionSurfaceHref}
							>
								Open detail
							</a>
						</form>
					</article>
				{/each}
			</DetailSection>
		</section>
	</div>
</AppPage>
