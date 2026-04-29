<script lang="ts">
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import OpenInEditorButton from '$lib/components/OpenInEditorButton.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { showAppToast } from '$lib/client/app-toast';
	import { onMount } from 'svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function sourceToneClass(installation: { global: boolean; project: boolean }) {
		if (installation.project) {
			return 'border-sky-800/70 bg-sky-950/40 text-sky-200';
		}

		if (installation.global) {
			return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}

		return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
	}

	function availabilityToneClass(availability: 'default' | 'enabled' | 'disabled') {
		switch (availability) {
			case 'enabled':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'disabled':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
			case 'default':
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function formatDateTime(value: string) {
		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return value;
		}

		return date.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function readableSkillBody(content: string) {
		return content
			.replace(/\r\n/g, '\n')
			.replace(/\s+(#{2,6}\s+)/g, '\n\n$1')
			.replace(/\s+(\d+\.\s+\*\*)/g, '\n$1')
			.replace(/\s+(-\s+\*\*)/g, '\n$1')
			.trim();
	}

	function readableBlocks(content: string) {
		return readableSkillBody(content)
			.split(/\n{2,}/)
			.map((block) => block.trim())
			.filter(Boolean);
	}

	function isHeading(block: string) {
		return /^#{2,6}\s+/.test(block);
	}

	function headingText(block: string) {
		return block.replace(/^#{2,6}\s+/, '').trim();
	}

	function isUnorderedList(block: string) {
		return block.split('\n').every((line) => /^[-*]\s+/.test(line.trim()));
	}

	function isOrderedList(block: string) {
		return block.split('\n').every((line) => /^\d+\.\s+/.test(line.trim()));
	}

	function isCodeBlock(block: string) {
		return /^```/.test(block.trim()) || block.split('\n').every((line) => line.startsWith('    '));
	}

	function listItems(block: string) {
		return block
			.split('\n')
			.map((line) =>
				line
					.replace(/^[-*]\s+/, '')
					.replace(/^\d+\.\s+/, '')
					.trim()
			)
			.filter(Boolean);
	}

	function codeBlockText(block: string) {
		return block
			.trim()
			.replace(/^```[^\n]*\n?/, '')
			.replace(/\n?```$/, '')
			.replace(/^ {4}/gm, '');
	}

	function qualityIssues(installation: {
		content: string;
		bodyMarkdown: string;
		description: string;
	}) {
		const issues: string[] = [];

		if (!/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(installation.content)) {
			issues.push('Missing YAML frontmatter.');
		}

		if (!installation.description.trim()) {
			issues.push('Missing description.');
		}

		if (!/##\s+When to use/i.test(installation.bodyMarkdown)) {
			issues.push('Missing “When to use” section.');
		}

		if (!/##\s+Workflow/i.test(installation.bodyMarkdown)) {
			issues.push('Missing “Workflow” section.');
		}

		return issues;
	}

	function canWriteClipboard() {
		return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
	}

	async function copyPath(path: string) {
		if (!path || !canWriteClipboard()) {
			return;
		}

		try {
			await navigator.clipboard.writeText(path);
			showAppToast({
				message: 'Skill path copied.',
				tone: 'success',
				durationMs: 1600
			});
		} catch {
			showAppToast({
				message: 'Could not copy the path.',
				tone: 'error',
				durationMs: 2200
			});
		}
	}

	type SourceViewMode = 'rendered' | 'raw' | 'edit';

	let editableInstallations = $derived(
		data.installations.filter((installation) => installation.project)
	);
	let updateSuccess = $derived(form?.ok && form?.successAction === 'updateProjectSkill');
	let availabilityUpdateSuccess = $derived(
		form?.ok && form?.successAction === 'updateSkillAvailabilityPolicy'
	);
	let selectedSkillFilePath = $state('');
	let sourceViewMode = $state<SourceViewMode>('rendered');
	let rawWrap = $state(true);
	let editDescription = $state('');
	let editBodyMarkdown = $state('');
	let editBaselineKey = $state('');
	let selectedInstallation = $derived(
		data.installations.find(
			(installation) => installation.skillFilePath === selectedSkillFilePath
		) ??
			data.installations[0] ??
			null
	);
	let renderedBlocks = $derived(
		selectedInstallation ? readableBlocks(selectedInstallation.bodyMarkdown) : []
	);
	let selectedHeadings = $derived(renderedBlocks.filter(isHeading).map(headingText));
	let selectedQualityIssues = $derived(
		selectedInstallation ? qualityIssues(selectedInstallation) : []
	);
	let availabilityEvents = $derived(data.availabilityEvents ?? []);
	let editDirty = $derived(
		Boolean(
			selectedInstallation &&
			sourceViewMode === 'edit' &&
			(editDescription !== selectedInstallation.description ||
				editBodyMarkdown !== selectedInstallation.bodyMarkdown)
		)
	);

	$effect(() => {
		if (!selectedSkillFilePath && data.installations[0]) {
			selectedSkillFilePath = data.installations[0].skillFilePath;
		}

		if (selectedInstallation && !selectedInstallation.project && sourceViewMode === 'edit') {
			sourceViewMode = 'rendered';
		}

		const nextBaselineKey = selectedInstallation
			? `${selectedInstallation.skillFilePath}:${sourceViewMode}`
			: '';
		if (selectedInstallation && sourceViewMode === 'edit' && editBaselineKey !== nextBaselineKey) {
			editBaselineKey = nextBaselineKey;
			editDescription = selectedInstallation.description;
			editBodyMarkdown = selectedInstallation.bodyMarkdown;
		}
	});

	onMount(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!editDirty) {
				return;
			}

			event.preventDefault();
			event.returnValue = '';
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});
</script>

<AppPage width="full">
	<PageHeader eyebrow="Skill detail" title={data.skill.id} description={data.skill.description}>
		{#snippet actions()}
			<a
				class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
				href="/app/skills"
			>
				Back to skills
			</a>
		{/snippet}
	</PageHeader>

	{#if updateSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Saved {form?.skillId}.
		</p>
	{/if}

	{#if availabilityUpdateSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Updated skill availability.
		</p>
	{/if}

	{#if form?.message}
		<p class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.5fr)]">
		<section class="space-y-6">
			<DetailSection
				eyebrow="Sources"
				title="Installed skill files"
				description="Each source is an actual discovered `SKILL.md`. Project-local sources can be edited here; global sources are shown read-only."
				bodyClass="space-y-4"
			>
				{#if data.installations.length === 0}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
					>
						No installed source file was found. This skill may only be present because tasks request
						it.
					</p>
				{:else}
					<div class="space-y-4">
						<div class="flex flex-wrap gap-2">
							{#each data.installations as installation (installation.skillFilePath)}
								<button
									class={`rounded-full border px-3 py-2 text-xs transition hover:border-sky-600 hover:text-white ${
										selectedInstallation?.skillFilePath === installation.skillFilePath
											? 'border-sky-700 bg-sky-950/50 text-sky-100'
											: 'border-slate-700 bg-slate-950/70 text-slate-300'
									}`}
									type="button"
									onclick={() => {
										selectedSkillFilePath = installation.skillFilePath;
										sourceViewMode = 'rendered';
									}}
								>
									{installation.projectName}
									<span class="text-slate-500"> · {installation.sourceLabel}</span>
								</button>
							{/each}
						</div>

						{#if selectedInstallation}
							<article class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-2">
											<h3 class="ui-wrap-anywhere font-medium text-white">
												{selectedInstallation.projectName}
											</h3>
											<span
												class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${sourceToneClass(selectedInstallation)}`}
											>
												{selectedInstallation.sourceLabel}
											</span>
											{#if selectedInstallation.project}
												<span
													class="badge border border-sky-800/70 bg-sky-950/40 text-[0.72rem] tracking-[0.18em] text-sky-200 uppercase"
												>
													Editable
												</span>
											{/if}
											{#if selectedQualityIssues.length > 0}
												<span
													class="badge border border-amber-900/70 bg-amber-950/40 text-[0.72rem] tracking-[0.18em] text-amber-200 uppercase"
												>
													{selectedQualityIssues.length} issue{selectedQualityIssues.length === 1
														? ''
														: 's'}
												</span>
											{/if}
										</div>
										<p class="ui-wrap-anywhere mt-2 font-mono text-xs text-slate-500">
											{selectedInstallation.skillFilePath}
										</p>
									</div>
								</div>

								<div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
									<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Name</p>
										<p class="ui-wrap-anywhere mt-2 font-mono text-sm text-white">
											{selectedInstallation.id}
										</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Scope</p>
										<p class="mt-2 text-sm text-white">{selectedInstallation.sourceLabel}</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Project</p>
										<p class="ui-wrap-anywhere mt-2 text-sm text-white">
											{selectedInstallation.projectName}
										</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Actions</p>
										<div class="mt-2 flex flex-wrap gap-2">
											<button
												class="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-600 hover:text-white"
												type="button"
												onclick={() => {
													void copyPath(selectedInstallation?.skillFilePath ?? '');
												}}
											>
												Copy path
											</button>
											<OpenInEditorButton
												path={selectedInstallation.skillFilePath}
												className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-wait disabled:opacity-70"
											/>
										</div>
									</div>
								</div>

								{#if selectedQualityIssues.length > 0}
									<div class="mt-4 rounded-2xl border border-amber-900/70 bg-amber-950/20 p-4">
										<p class="text-[11px] tracking-[0.16em] text-amber-300 uppercase">
											Review notes
										</p>
										<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-100">
											{#each selectedQualityIssues as issue}
												<li>{issue}</li>
											{/each}
										</ul>
									</div>
								{/if}

								<div
									class="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70"
								>
									<div
										class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/70 px-4 py-3"
									>
										<div class="flex flex-wrap gap-2">
											<button
												class={`rounded-full border px-3 py-1.5 text-xs transition ${
													sourceViewMode === 'rendered'
														? 'border-sky-700 bg-sky-950/50 text-sky-100'
														: 'border-slate-700 bg-slate-950/70 text-slate-300 hover:text-white'
												}`}
												type="button"
												onclick={() => {
													sourceViewMode = 'rendered';
												}}
											>
												Rendered
											</button>
											<button
												class={`rounded-full border px-3 py-1.5 text-xs transition ${
													sourceViewMode === 'raw'
														? 'border-sky-700 bg-sky-950/50 text-sky-100'
														: 'border-slate-700 bg-slate-950/70 text-slate-300 hover:text-white'
												}`}
												type="button"
												onclick={() => {
													sourceViewMode = 'raw';
												}}
											>
												Raw
											</button>
											{#if selectedInstallation.project}
												<button
													class={`rounded-full border px-3 py-1.5 text-xs transition ${
														sourceViewMode === 'edit'
															? 'border-sky-700 bg-sky-950/50 text-sky-100'
															: 'border-slate-700 bg-slate-950/70 text-slate-300 hover:text-white'
													}`}
													type="button"
													onclick={() => {
														sourceViewMode = 'edit';
													}}
												>
													Edit
												</button>
											{/if}
										</div>
										<div class="flex flex-wrap items-center gap-2">
											{#if sourceViewMode === 'raw'}
												<button
													class="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-600 hover:text-white"
													type="button"
													onclick={() => {
														rawWrap = !rawWrap;
													}}
												>
													{rawWrap ? 'No wrap' : 'Wrap'}
												</button>
											{/if}
											<span
												class="badge border border-slate-700 bg-slate-950/70 text-[0.72rem] tracking-[0.18em] text-slate-200 uppercase"
											>
												SKILL.md
											</span>
										</div>
									</div>

									{#if sourceViewMode === 'rendered'}
										<div class="max-h-[42rem] overflow-auto p-5">
											{#if selectedHeadings.length > 0}
												<div class="mb-5 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
													<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
														Sections
													</p>
													<div class="mt-3 flex flex-wrap gap-2">
														{#each selectedHeadings as heading}
															<span
																class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300"
															>
																{heading}
															</span>
														{/each}
													</div>
												</div>
											{/if}
											{#if renderedBlocks.length === 0}
												<p class="text-sm text-slate-500">No readable body content found.</p>
											{:else}
												<div class="space-y-4 text-sm leading-7 text-slate-200">
													{#each renderedBlocks as block}
														{#if isHeading(block)}
															<h4 class="pt-2 text-base font-semibold text-white">
																{headingText(block)}
															</h4>
														{:else if isCodeBlock(block)}
															<pre
																class="ui-wrap-anywhere overflow-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs leading-6 text-slate-300">{codeBlockText(
																	block
																)}</pre>
														{:else if isUnorderedList(block)}
															<ul class="list-disc space-y-2 pl-5">
																{#each listItems(block) as item}
																	<li class="break-words">{item}</li>
																{/each}
															</ul>
														{:else if isOrderedList(block)}
															<ol class="list-decimal space-y-2 pl-5">
																{#each listItems(block) as item}
																	<li class="break-words">{item}</li>
																{/each}
															</ol>
														{:else}
															<p class="break-words whitespace-pre-wrap">{block}</p>
														{/if}
													{/each}
												</div>
											{/if}
										</div>
									{:else if sourceViewMode === 'raw'}
										<pre
											class={`max-h-[42rem] overflow-auto p-4 font-mono text-[0.82rem] leading-7 text-slate-200 ${rawWrap ? 'break-words whitespace-pre-wrap' : 'whitespace-pre'}`}>{selectedInstallation.content}</pre>
									{:else if selectedInstallation.project}
										<form class="space-y-4 p-4" method="POST" action="?/updateProjectSkill">
											<input
												name="projectId"
												type="hidden"
												value={selectedInstallation.projectId}
											/>
											<input name="skillId" type="hidden" value={selectedInstallation.id} />
											<label class="block">
												<span
													class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase"
												>
													Description
												</span>
												<input
													class="input border-slate-700 bg-slate-950/80 text-white"
													name="description"
													bind:value={editDescription}
													autocomplete="off"
												/>
											</label>
											<label class="block">
												<span
													class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase"
												>
													Body
												</span>
												<textarea
													class="textarea min-h-[32rem] resize-y border-slate-700 bg-slate-950/80 p-4 font-mono text-[0.82rem] leading-6 text-slate-100"
													name="bodyMarkdown"
													bind:value={editBodyMarkdown}
													spellcheck="false"
												></textarea>
												<p class="mt-2 text-xs text-slate-500">
													Frontmatter is managed by AMS from the description field.
												</p>
											</label>
											<div class="flex flex-wrap items-center justify-between gap-3">
												{#if editDirty}
													<p class="text-xs text-amber-200">Unsaved changes</p>
												{:else}
													<p class="text-xs text-slate-500">No unsaved changes</p>
												{/if}
												<div class="flex flex-wrap justify-end gap-2">
													<AppButton
														type="button"
														variant="ghost"
														onclick={() => {
															editDescription = selectedInstallation.description;
															editBodyMarkdown = selectedInstallation.bodyMarkdown;
														}}
													>
														Reset
													</AppButton>
													<AppButton type="submit">Save Project Skill</AppButton>
												</div>
											</div>
										</form>
									{/if}
								</div>
							</article>
						{/if}
					</div>
				{/if}
			</DetailSection>
		</section>

		<section class="space-y-6">
			<DetailSection
				eyebrow="Availability"
				title="Projects"
				description="Where this skill is installed, inherited, requested, or explicitly enabled or disabled."
				bodyClass="space-y-3"
			>
				{#each data.skill.projects as project (`${data.skill.id}:${project.projectId}`)}
					<article
						class={`rounded-2xl border p-4 ${
							project.availability === 'disabled'
								? 'border-rose-900/70 bg-rose-950/20'
								: project.missing
									? 'border-amber-900/70 bg-amber-950/20'
									: project.projectLocal
										? 'border-sky-900/70 bg-sky-950/20'
										: 'border-slate-800 bg-slate-950/50'
						}`}
					>
						<div class="flex flex-wrap items-center justify-between gap-3">
							<a
								class="ui-wrap-anywhere font-medium text-white transition hover:text-sky-200"
								href={project.projectHref}
							>
								{project.projectName}
							</a>
							<div class="flex flex-wrap gap-2">
								<span
									class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${
										project.missing
											? 'border-amber-900/70 bg-amber-950/40 text-amber-200'
											: project.projectLocal
												? 'border-sky-800/70 bg-sky-950/40 text-sky-200'
												: 'border-slate-700 bg-slate-950/70 text-slate-300'
									}`}
								>
									{project.missing ? 'Missing' : project.sourceLabel}
								</span>
								<span
									class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${availabilityToneClass(project.availability)}`}
								>
									{project.availabilityLabel}
								</span>
							</div>
						</div>
						{#if project.requestingTaskCount > 0}
							<p class="mt-2 text-sm text-slate-400">
								Requested by {project.requestingTaskCount} task{project.requestingTaskCount === 1
									? ''
									: 's'}.
							</p>
						{/if}
						<form class="mt-4 grid gap-3" method="POST" action="?/updateSkillAvailabilityPolicy">
							<input name="projectId" type="hidden" value={project.projectId} />
							<input name="skillId" type="hidden" value={data.skill.id} />
							<label class="block">
								<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Availability
								</span>
								<select class="select text-white" name="availability">
									<option value="default" selected={project.availability === 'default'}>
										Default
									</option>
									<option value="enabled" selected={project.availability === 'enabled'}>
										Enabled
									</option>
									<option value="disabled" selected={project.availability === 'disabled'}>
										Disabled
									</option>
								</select>
							</label>
							<label class="block">
								<span class="mb-2 block text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Notes
								</span>
								<textarea
									class="textarea min-h-20 text-white"
									name="notes"
									autocomplete="off"
									placeholder="Why this skill is enabled or disabled for this project…"
									>{project.availabilityNotes}</textarea
								>
							</label>
							<div class="flex justify-end">
								<AppButton type="submit">Save Availability</AppButton>
							</div>
						</form>
					</article>
				{/each}
			</DetailSection>

			<DetailSection
				eyebrow="History"
				title="Availability changes"
				description="Recent explicit availability policy changes for this skill across projects."
				bodyClass="space-y-3"
			>
				{#if availabilityEvents.length === 0}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
					>
						No explicit availability changes have been recorded for this skill yet.
					</p>
				{:else}
					{#each availabilityEvents as event (event.id)}
						<article class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<a
										class="ui-wrap-anywhere font-medium text-white transition hover:text-sky-200"
										href={event.projectHref}
									>
										{event.projectName}
									</a>
									<p class="mt-1 text-xs text-slate-500">{formatDateTime(event.changedAt)}</p>
								</div>
								<span
									class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${availabilityToneClass(event.availability)}`}
								>
									{event.availabilityLabel}
								</span>
							</div>
							{#if event.notes}
								<p class="mt-3 text-sm leading-6 text-slate-300">{event.notes}</p>
							{:else}
								<p class="mt-3 text-sm text-slate-500">No note recorded.</p>
							{/if}
						</article>
					{/each}
				{/if}
			</DetailSection>

			<DetailSection
				eyebrow="Demand"
				title="Requesting tasks"
				description="Tasks that currently request this prompt skill."
				bodyClass="space-y-3"
			>
				{#if data.requestingTasks.length === 0}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
					>
						No tasks currently request this skill.
					</p>
				{:else}
					{#each data.requestingTasks as task (task.id)}
						<a
							class="block rounded-2xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
							href={task.taskHref}
						>
							<p class="font-medium text-white">{task.title}</p>
							<p class="mt-2 text-sm text-slate-400">{task.projectName}</p>
							<p class="mt-1 text-xs text-slate-500">{task.status.replace(/_/g, ' ')}</p>
						</a>
					{/each}
				{/if}
			</DetailSection>

			{#if editableInstallations.length === 0}
				<DetailSection
					eyebrow="Editing"
					title="Read-only"
					description="No project-local installation was found for this skill. Create a project-local skill before editing it in AMS."
					bodyClass="hidden"
				/>
			{/if}
		</section>
	</div>
</AppPage>
