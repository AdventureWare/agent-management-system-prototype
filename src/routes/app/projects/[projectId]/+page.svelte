<script lang="ts">
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailFactCard from '$lib/components/DetailFactCard.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PathField from '$lib/components/PathField.svelte';
	import { buildPlannerPrompt } from '$lib/workflow-prompts';
	import {
		formatTaskAutonomyLevelLabel,
		formatTaskReviewRequirementLabel,
		formatTaskRiskLevelLabel,
		formatGoalStatusLabel,
		formatTaskApprovalModeLabel,
		formatTaskStatusLabel,
		goalStatusToneClass,
		taskStatusToneClass
	} from '$lib/types/control-plane';

	let { data, form } = $props();

	let updateSuccess = $derived(form?.ok && form?.successAction === 'updateProject');
	let deleteBlocked = $derived(data.contextScope.directTaskCount > 0);
	let copyStatus = $state('');
	let plannerPrompt = $state('');

	function listOrNone(items: string[] | undefined) {
		return items?.length ? items.map((item) => `- ${item}`).join('\n') : '- Not configured';
	}

	function textOrFallback(value: string | null | undefined) {
		return value?.trim() || 'Not configured';
	}

	function buildAgentContextPackage() {
		return [
			`# Project Context: ${data.project.name}`,
			'',
			'## Project Brief',
			textOrFallback(data.project.projectBrief || data.project.summary),
			'',
			'## Current State',
			textOrFallback(data.project.currentStateMemo),
			'',
			'## Constraints',
			textOrFallback(data.project.constraints),
			'',
			'## Non-goals',
			textOrFallback(data.project.nonGoals),
			'',
			'## Agent Instructions',
			`Instructions path: ${textOrFallback(data.project.agentInstructionsPath)}`,
			`Setup notes: ${textOrFallback(data.project.setupNotes)}`,
			`Coding conventions: ${textOrFallback(data.project.codingConventions)}`,
			`Approval requirements: ${textOrFallback(data.project.approvalRequirements)}`,
			'',
			'## Default Autonomy Policy',
			`Allowed autonomy: ${data.project.defaultAutonomyLevel}`,
			`Risk threshold: ${data.project.defaultRiskThreshold}`,
			`Review requirement: ${data.project.defaultReviewRequirement}`,
			`Validation expectations: ${textOrFallback(data.project.defaultValidationExpectations)}`,
			'',
			'## Default Validation Commands',
			listOrNone(data.project.validationCommands),
			'',
			'## Important Links',
			listOrNone(data.project.importantLinks)
		].join('\n');
	}

	async function copyAgentContext() {
		const contextPackage = buildAgentContextPackage();
		await navigator.clipboard.writeText(contextPackage);
		copyStatus = 'Agent context copied.';
		window.setTimeout(() => {
			copyStatus = '';
		}, 2200);
	}

	function buildProjectPlannerPrompt() {
		return buildPlannerPrompt({
			project: data.project,
			goals: data.relatedGoals,
			tasks: data.relatedTasks
		});
	}

	async function preparePlannerPrompt() {
		plannerPrompt = buildProjectPlannerPrompt();
		await navigator.clipboard.writeText(plannerPrompt);
		copyStatus = 'Planner prompt copied.';
		window.setTimeout(() => {
			copyStatus = '';
		}, 2200);
	}

	function accessToneClass(status: string) {
		switch (status) {
			case 'ready':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'macos_cloud_probe_blocked':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			case 'missing':
			case 'needs_host_access':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
			case 'not_configured':
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function accessLabel(status: string) {
		switch (status) {
			case 'ready':
				return 'Host access ready';
			case 'macos_cloud_probe_blocked':
				return 'macOS protected';
			case 'missing':
				return 'Missing path';
			case 'needs_host_access':
				return 'Host access blocked';
			case 'not_configured':
			default:
				return 'Not configured';
		}
	}

	function coverageToneClass(status: string) {
		switch (status) {
			case 'project_root':
			case 'additional_writable_root':
			case 'danger_full_access':
				return 'border-sky-800/70 bg-sky-950/40 text-sky-200';
			case 'outside_sandbox':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			case 'not_configured':
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}
</script>

<AppPage width="full">
	<DetailHeader
		backHref={resolve('/app/projects')}
		backLabel="Back to projects"
		eyebrow="Project detail"
		title={data.project.name}
		description={data.project.summary}
	/>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
		<MetricCard
			label="Tasks in scope"
			value={data.metrics.activeTasks}
			detail="Direct project work plus rolled-up subproject work when this is a parent project."
		/>
		<MetricCard
			label="Linked goals"
			value={data.metrics.goalCount}
			detail="Goals inferred from tasks and artifact paths."
		/>
		<MetricCard
			label="Review tasks"
			value={data.metrics.reviewTasks}
			detail="Tasks currently waiting on explicit review."
		/>
		<MetricCard
			label="Subprojects"
			value={data.metrics.childProjectCount}
			detail="Direct child projects linked under this project."
		/>
		<MetricCard
			label="Pending approvals"
			value={data.metrics.pendingApprovals}
			detail="Tasks stalled on an approval gate."
		/>
		<MetricCard
			label="Blocked signals"
			value={data.metrics.blockedTasks}
			detail="Blocked tasks or tasks stalled by dependencies."
		/>
	</div>

	{#if form?.message}
		<p class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if updateSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Project updates saved.
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
		<section class="space-y-6">
			<DetailSection
				eyebrow="Project structure"
				title="Parent and subproject context"
				description="Each project keeps its own defaults. Parent projects roll up descendant work for broader planning, while tasks still use the defaults on the exact linked project."
				bodyClass="space-y-4"
			>
				<div class="grid gap-4 md:grid-cols-2">
					<DetailFactCard
						label="Project lineage"
						value={data.projectLineage.map((project) => project.name).join(' / ') ||
							data.project.name}
					/>
					<DetailFactCard
						label="Context scope"
						value={data.contextScope.rolledUpTaskCount > 0
							? `${data.contextScope.directTaskCount} direct task(s) and ${data.contextScope.rolledUpTaskCount} rolled up from subprojects`
							: 'Focused on this project only'}
					/>
				</div>

				<div class="grid gap-4 lg:grid-cols-2">
					<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Parent project</p>
						{#if data.parentProject}
							<a
								class="mt-2 inline-flex text-sm font-medium text-sky-300 transition hover:text-sky-200"
								href={resolve(`/app/projects/${data.parentProject.id}`)}
							>
								{data.parentProject.name}
							</a>
							<p class="mt-2 text-sm text-slate-400">{data.parentProject.summary}</p>
						{:else}
							<p class="mt-2 text-sm text-slate-400">This project is currently top-level.</p>
						{/if}
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Direct subprojects</p>
						{#if data.childProjects.length === 0}
							<p class="mt-2 text-sm text-slate-400">No child projects linked yet.</p>
						{:else}
							<div class="mt-2 space-y-3">
								{#each data.childProjects as childProject (childProject.id)}
									<a
										class="block rounded-xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-sky-400/40"
										href={resolve(`/app/projects/${childProject.id}`)}
									>
										<p class="ui-wrap-anywhere text-sm font-medium text-white">
											{childProject.name}
										</p>
										<p class="mt-2 text-sm text-slate-400">{childProject.summary}</p>
										<p class="mt-2 text-xs text-slate-500">
											{childProject.taskCount} task(s) · {childProject.goalCount} goal(s)
										</p>
									</a>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</DetailSection>

			<DetailSection
				eyebrow="Skills"
				title="Project skill inventory"
				description="Prompt skills installed for this project workspace, plus any task-requested skills that are missing."
				bodyClass="space-y-4"
			>
				{#if !data.projectSkillInventory || data.projectSkillInventory.totalCount === 0}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
					>
						No installed skills were discovered for this project workspace.
					</p>
				{:else}
					<div class="grid gap-3 md:grid-cols-2">
						{#each data.projectSkillInventory.installedSkills as skill (skill.id)}
							<a
								class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-sky-400/40"
								href={resolve(`/app/skills/${encodeURIComponent(skill.id)}`)}
							>
								<div class="flex flex-wrap items-center gap-2">
									<p class="ui-wrap-anywhere font-medium text-white">{skill.id}</p>
									<span
										class="badge border border-slate-700 bg-slate-950/70 text-[0.72rem] tracking-[0.18em] text-slate-300 uppercase"
									>
										{skill.sourceLabel}
									</span>
									{#if skill.availability !== 'default'}
										<span
											class="badge border border-sky-800/70 bg-sky-950/40 text-[0.72rem] tracking-[0.18em] text-sky-200 uppercase"
										>
											{skill.availabilityLabel}
										</span>
									{/if}
								</div>
								<p class="ui-clamp-2 mt-2 text-sm text-slate-400">{skill.description}</p>
								{#if skill.availabilityNotes}
									<p class="mt-2 text-xs text-slate-500">{skill.availabilityNotes}</p>
								{/if}
							</a>
						{/each}
					</div>
				{/if}

				{#if data.projectSkillInventory?.missingRequestedSkills.length}
					<div class="rounded-2xl border border-amber-900/70 bg-amber-950/20 p-4">
						<p class="text-[11px] tracking-[0.16em] text-amber-300 uppercase">Missing requested</p>
						<div class="mt-3 flex flex-wrap gap-2">
							{#each data.projectSkillInventory.missingRequestedSkills as skill (skill.id)}
								<a
									class="rounded-full border border-amber-900/70 bg-amber-950/40 px-3 py-1 text-xs text-amber-100 transition hover:border-amber-700"
									href={resolve(
										`/app/skills?q=${encodeURIComponent(skill.id)}&project=${encodeURIComponent(data.project.id)}&status=missing`
									)}
								>
									{skill.id} · {skill.requestingTaskCount}
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</DetailSection>

			<DetailSection
				eyebrow="Project details"
				title="Edit defaults and repo context"
				description="Collection pages help you find the project. This page holds the actual project setup."
				bodyClass="space-y-4"
			>
				<form class="space-y-4" method="POST" action="?/updateProject">
					<div class="grid gap-4 lg:grid-cols-2">
						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
							<input class="input text-white" name="name" required value={data.project.name} />
						</label>
					</div>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Summary</span>
						<textarea class="textarea min-h-28 text-white" name="summary" required
							>{data.project.summary}</textarea
						>
					</label>

					<div class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Project Memory</p>
								<h3 class="mt-1 font-medium text-white">Agent context artifacts</h3>
							</div>
							<div class="flex flex-wrap items-center gap-2">
								<button
									class="btn border border-sky-800/70 bg-sky-950/40 text-sm font-semibold text-sky-200"
									type="button"
									onclick={copyAgentContext}
								>
									Copy Agent Context
								</button>
								<button
									class="btn border border-emerald-800/70 bg-emerald-950/40 text-sm font-semibold text-emerald-200"
									type="button"
									onclick={preparePlannerPrompt}
								>
									Prepare Planner Prompt
								</button>
								{#if copyStatus}
									<span class="text-xs text-emerald-300">{copyStatus}</span>
								{/if}
							</div>
						</div>

						<div class="mt-4 grid gap-4 xl:grid-cols-2">
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Project brief</span>
								<textarea
									class="textarea min-h-44 text-white placeholder:text-slate-500"
									name="projectBrief"
									placeholder="What this project is, why it exists, desired future state, success criteria, target users or stakeholders, important links, major constraints, and non-goals."
									>{data.project.projectBrief}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Current state memo
								</span>
								<textarea
									class="textarea min-h-44 text-white placeholder:text-slate-500"
									name="currentStateMemo"
									placeholder="Current status, recent changes, known problems, current risks, likely next moves, and open questions."
									>{data.project.currentStateMemo}</textarea
								>
							</label>

							<label class="block xl:col-span-2">
								<span class="mb-2 block text-sm font-medium text-slate-200">Decision log</span>
								<textarea
									class="textarea min-h-36 text-white placeholder:text-slate-500"
									name="decisionLog"
									placeholder="Important decisions, rationale, rejected alternatives, date/author when available, and implications for agents."
									>{data.project.decisionLog}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									AGENTS.md or instruction path
								</span>
								<input
									class="input text-white placeholder:text-slate-500"
									name="agentInstructionsPath"
									placeholder="/absolute/path/to/AGENTS.md"
									value={data.project.agentInstructionsPath}
								/>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Important links and repositories
								</span>
								<textarea
									class="textarea min-h-24 text-white placeholder:text-slate-500"
									name="importantLinks"
									placeholder="https://github.com/org/repo&#10;https://docs.example.com/project"
									>{(data.project.importantLinks ?? []).join('\n')}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Setup notes</span>
								<textarea
									class="textarea min-h-28 text-white placeholder:text-slate-500"
									name="setupNotes"
									placeholder="Install steps, local services, credentials, fixtures, or environment assumptions."
									>{data.project.setupNotes}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Test and validation commands
								</span>
								<textarea
									class="textarea min-h-28 text-white placeholder:text-slate-500"
									name="validationCommands"
									placeholder="npm run check&#10;npm run test:unit -- --run"
									>{(data.project.validationCommands ?? []).join('\n')}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Coding and documentation conventions
								</span>
								<textarea
									class="textarea min-h-28 text-white placeholder:text-slate-500"
									name="codingConventions"
									placeholder="Style, architecture, documentation, testing, and artifact conventions agents should preserve."
									>{data.project.codingConventions}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Approval requirements
								</span>
								<textarea
									class="textarea min-h-28 text-white placeholder:text-slate-500"
									name="approvalRequirements"
									placeholder="Actions that need review, approval, coordination, or explicit human confirmation."
									>{data.project.approvalRequirements}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Major constraints</span>
								<textarea
									class="textarea min-h-28 text-white placeholder:text-slate-500"
									name="constraints"
									placeholder="Technical, process, compliance, data, timeline, or access constraints."
									>{data.project.constraints}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Non-goals</span>
								<textarea
									class="textarea min-h-28 text-white placeholder:text-slate-500"
									name="nonGoals"
									placeholder="Work agents should not pursue unless explicitly assigned."
									>{data.project.nonGoals}</textarea
								>
							</label>
						</div>

						<div class="mt-4 grid gap-4 md:grid-cols-3">
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Default autonomy level
								</span>
								<select class="select text-white" name="defaultAutonomyLevel">
									{#each data.autonomyOptions as autonomyLevel (autonomyLevel)}
										<option
											value={autonomyLevel}
											selected={data.project.defaultAutonomyLevel === autonomyLevel}
										>
											{formatTaskAutonomyLevelLabel(autonomyLevel)}
										</option>
									{/each}
								</select>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Default risk threshold
								</span>
								<select class="select text-white" name="defaultRiskThreshold">
									{#each data.riskOptions as riskLevel (riskLevel)}
										<option
											value={riskLevel}
											selected={data.project.defaultRiskThreshold === riskLevel}
										>
											{formatTaskRiskLevelLabel(riskLevel)}
										</option>
									{/each}
								</select>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Default review requirement
								</span>
								<select class="select text-white" name="defaultReviewRequirement">
									{#each data.reviewRequirementOptions as reviewRequirement (reviewRequirement)}
										<option
											value={reviewRequirement}
											selected={data.project.defaultReviewRequirement === reviewRequirement}
										>
											{formatTaskReviewRequirementLabel(reviewRequirement)}
										</option>
									{/each}
								</select>
							</label>
						</div>

						<div class="mt-4 grid gap-4 lg:grid-cols-3">
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Default allowed actions
								</span>
								<textarea
									class="textarea min-h-24 text-white placeholder:text-slate-500"
									name="defaultAllowedActions"
									placeholder="read repository&#10;edit files in workspace&#10;run local tests"
									>{(data.project.defaultAllowedActions ?? []).join('\n')}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Default disallowed actions
								</span>
								<textarea
									class="textarea min-h-24 text-white placeholder:text-slate-500"
									name="defaultDisallowedActions"
									placeholder="merge to main&#10;deploy production&#10;rotate credentials"
									>{(data.project.defaultDisallowedActions ?? []).join('\n')}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Default validation expectations
								</span>
								<textarea
									class="textarea min-h-24 text-white placeholder:text-slate-500"
									name="defaultValidationExpectations"
									placeholder="Run focused tests for touched areas and report any commands that could not be run."
									>{data.project.defaultValidationExpectations}</textarea
								>
							</label>
						</div>
					</div>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Parent project</span>
						<select class="select text-white" name="parentProjectId">
							<option value="" selected={!data.project.parentProjectId}>No parent project</option>
							{#each data.parentProjectOptions as project (project.id)}
								<option value={project.id} selected={data.project.parentProjectId === project.id}>
									{project.label}
								</option>
							{/each}
						</select>
					</label>

					<div class="grid gap-4 lg:grid-cols-2">
						<div>
							<PathField
								createMode="folder"
								helperText="Agents will start here when this project is selected later."
								inputId={`project-root-folder-${data.project.id}`}
								label="Project root folder"
								name="projectRootFolder"
								options={data.folderOptions}
								placeholder="/absolute/path/to/project/root"
								value={data.project.projectRootFolder}
							/>
						</div>

						<div>
							<PathField
								createMode="folder"
								helperText="Create the shared artifact folder if you want it reserved now."
								inputId={`project-artifact-root-${data.project.id}`}
								label="Default artifact root"
								name="defaultArtifactRoot"
								options={data.folderOptions}
								placeholder="/absolute/path/to/project/artifacts"
								value={data.project.defaultArtifactRoot}
							/>
						</div>

						<div>
							<PathField
								createMode="folder"
								helperText="Creates the checkout folder if the repo is not cloned yet."
								inputId={`project-repo-path-${data.project.id}`}
								label="Default repo path"
								name="defaultRepoPath"
								options={data.folderOptions}
								placeholder="/absolute/path/to/local/checkout"
								value={data.project.defaultRepoPath}
							/>
						</div>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Default repo URL</span>
							<input
								class="input text-white placeholder:text-slate-500"
								name="defaultRepoUrl"
								placeholder="git@github.com:org/repo.git"
								value={data.project.defaultRepoUrl}
							/>
						</label>
					</div>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">
							Additional writable roots
						</span>
						<textarea
							class="textarea min-h-28 text-white placeholder:text-slate-500"
							name="additionalWritableRoots"
							placeholder="/Users/you/Library/Mobile Documents/com~apple~CloudDocs/Shared&#10;/Users/you/Dropbox/Client Files"
							>{(data.project.additionalWritableRoots ?? []).join('\n')}</textarea
						>
						<p class="mt-2 text-sm text-slate-500">
							One absolute folder per line. New threads pass these folders to Codex with
							<code>--add-dir</code>. macOS still has to grant the app process access to the folder
							itself.
						</p>
					</label>

					<div
						class="flex flex-wrap items-end justify-between gap-3 border-t border-slate-800 pt-4"
					>
						<div class="flex flex-wrap gap-4">
							<label class="block w-full max-w-xs">
								<span class="mb-2 block text-sm font-medium text-slate-200">Default branch</span>
								<input
									class="input text-white placeholder:text-slate-500"
									name="defaultBranch"
									placeholder="main"
									value={data.project.defaultBranch}
								/>
							</label>

							<label class="block w-full max-w-xs">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Default thread sandbox
								</span>
								<select class="select text-white" name="defaultThreadSandbox">
									<option value="" selected={!data.project.defaultThreadSandbox}>
										Inherit provider default
									</option>
									{#each data.sandboxOptions as sandbox (sandbox)}
										<option
											value={sandbox}
											selected={data.project.defaultThreadSandbox === sandbox}
										>
											{sandbox}
										</option>
									{/each}
								</select>
							</label>

							<label class="block w-full max-w-xs">
								<span class="mb-2 block text-sm font-medium text-slate-200"> Default model </span>
								<input
									class="input text-white placeholder:text-slate-500"
									name="defaultModel"
									placeholder="Inherit provider default"
									value={data.project.defaultModel ?? ''}
								/>
							</label>
						</div>

						<button class="btn preset-filled-primary-500 font-semibold" type="submit">
							Save project
						</button>
					</div>
				</form>
			</DetailSection>

			<DetailSection
				eyebrow="Permissions"
				title="Local access and sandbox coverage"
				description="This first pass checks local folders only. It separates host OS access from Codex sandbox coverage so iCloud and similar failures are easier to diagnose before a run starts."
				bodyClass="space-y-5"
			>
				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Effective sandbox</p>
						<p class="mt-2 text-sm font-medium text-white">
							{data.permissionSurface.effectiveSandbox}
						</p>
						<p class="mt-2 text-sm text-slate-400">{data.permissionSurface.sandboxSource}</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Outside sandbox</p>
						<p class="mt-2 text-sm font-medium text-white">
							{data.permissionSurface.summary.outsideSandboxCount}
						</p>
						<p class="mt-2 text-sm text-slate-400">
							Paths that currently sit outside the default thread sandbox coverage.
						</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Launch blockers</p>
						<p class="mt-2 text-sm font-medium text-white">
							{data.permissionSurface.summary.blockerCount}
						</p>
						<p class="mt-2 text-sm text-slate-400">
							Required thread paths that the current app process still cannot use.
						</p>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">macOS cloud probes</p>
						<p class="mt-2 text-sm font-medium text-white">
							{data.permissionSurface.summary.macosPromptCount}
						</p>
						<p class="mt-2 text-sm text-slate-400">
							Paths where macOS blocked the direct check but a real Codex run may still work.
						</p>
					</div>
				</div>

				<div class="space-y-4">
					{#each data.permissionSurface.localPaths as item (item.id)}
						<article class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<h3 class="ui-wrap-anywhere font-medium text-white">{item.label}</h3>
										{#if item.requiredForLaunch}
											<span
												class="badge border border-slate-700 bg-slate-900/80 text-[0.7rem] tracking-[0.18em] text-slate-200 uppercase"
											>
												Launch critical
											</span>
										{/if}
									</div>
									<p class="ui-wrap-anywhere mt-2 text-sm text-slate-300">
										{item.path || 'Not configured'}
									</p>
									<p class="mt-2 text-sm text-slate-500">{item.importance}</p>
								</div>

								<div class="flex flex-wrap gap-2">
									<span class={`badge border text-[0.72rem] ${accessToneClass(item.accessStatus)}`}>
										{accessLabel(item.accessStatus)}
									</span>
									<span
										class={`badge border text-[0.72rem] ${coverageToneClass(item.coverageStatus)}`}
									>
										{item.coverageLabel}
									</span>
								</div>
							</div>

							<div class="mt-4 grid gap-3 lg:grid-cols-2">
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Host access</p>
									<p class="mt-2 text-sm text-white">{item.accessMessage}</p>
									{#if item.accessGuidance}
										<p class="mt-2 text-sm text-slate-400">{item.accessGuidance}</p>
									{/if}
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
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
					<p>
						Provider and account authorization still live on the providers and executionSurfaces
						surfaces. This section is focused on local folder access because that is what controls
						iCloud, Dropbox, and similar synced paths today.
					</p>
				</div>
			</DetailSection>

			<DetailSection
				eyebrow="Project memory"
				title="Stored agent context"
				description="Durable project notes that planner, executor, and reviewer prompts can reuse without restating the same background in every task."
				bodyClass="space-y-4"
			>
				<div class="flex flex-wrap justify-end gap-2">
					<button
						class="btn border border-sky-800/70 bg-sky-950/40 text-sm font-semibold text-sky-200"
						type="button"
						onclick={copyAgentContext}
					>
						Copy Agent Context
					</button>
					<button
						class="btn border border-emerald-800/70 bg-emerald-950/40 text-sm font-semibold text-emerald-200"
						type="button"
						onclick={preparePlannerPrompt}
					>
						Prepare Planner Prompt
					</button>
					{#if copyStatus}
						<span class="self-center text-xs text-emerald-300">{copyStatus}</span>
					{/if}
				</div>

				{#if plannerPrompt}
					<div class="rounded-2xl border border-emerald-900/50 bg-emerald-950/15 p-4">
						<p class="text-[11px] tracking-[0.16em] text-emerald-200 uppercase">
							Prepared planner prompt
						</p>
						<textarea class="mt-3 textarea min-h-72 font-mono text-xs text-white" readonly
							>{plannerPrompt}</textarea
						>
					</div>
				{/if}

				<div class="grid gap-4 lg:grid-cols-2">
					<DetailFactCard
						label="Project brief"
						value={data.project.projectBrief || data.project.summary || 'Not configured'}
					/>
					<DetailFactCard
						label="Current state memo"
						value={data.project.currentStateMemo || 'Not configured'}
					/>
					<DetailFactCard
						label="AGENTS.md reference"
						value={data.project.agentInstructionsPath || 'Not configured'}
					/>
					<DetailFactCard
						label="Default autonomy policy"
						value={`${data.project.defaultAutonomyLevel ?? 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE'} · ${data.project.defaultRiskThreshold ?? 'medium'} risk · ${data.project.defaultReviewRequirement ?? 'SUMMARY_REVIEW'}`}
					/>
					<DetailFactCard
						label="Validation commands"
						value={(data.project.validationCommands ?? []).join(' · ') || 'Not configured'}
					/>
					<DetailFactCard
						label="Constraints"
						value={data.project.constraints || 'Not configured'}
					/>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
					<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Decision log</p>
					{#if data.project.decisionLog}
						<p class="mt-3 text-sm whitespace-pre-wrap text-slate-300">
							{data.project.decisionLog}
						</p>
					{:else}
						<p class="mt-3 text-sm text-slate-500">No project decision memo has been saved.</p>
					{/if}

					{#if data.relatedDecisionLog.length}
						<div class="mt-4 space-y-3 border-t border-slate-800 pt-4">
							{#each data.relatedDecisionLog as decision (decision.id)}
								<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
									<div class="flex flex-wrap items-center justify-between gap-2">
										<p class="text-xs font-medium text-slate-200">
											{decision.decisionType.replace(/_/g, ' ')}
										</p>
										<p class="text-xs text-slate-500">{decision.createdAt.slice(0, 10)}</p>
									</div>
									<p class="mt-2 text-sm text-slate-300">{decision.summary}</p>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</DetailSection>

			<DetailSection
				eyebrow="Project defaults"
				title="Roots and repo context"
				description="The same defaults shown in editable form, compressed here for quick scanning."
				bodyClass="grid gap-4 md:grid-cols-2"
			>
				<DetailFactCard
					label="Parent project"
					value={data.parentProject?.name || 'Top-level project'}
				/>
				<DetailFactCard
					label="Direct subprojects"
					value={data.childProjects.length ? `${data.childProjects.length}` : 'None'}
				/>
				<DetailFactCard
					class="md:col-span-2"
					label="Project root folder"
					value={data.project.projectRootFolder || 'Not configured'}
				/>
				<DetailFactCard
					class="md:col-span-2"
					label="Default artifact root"
					value={data.project.defaultArtifactRoot || 'Not configured'}
				/>
				<DetailFactCard
					class="md:col-span-2"
					label="Default repo path"
					value={data.project.defaultRepoPath || 'Not configured'}
				/>
				<DetailFactCard
					class="md:col-span-2"
					label="Default repo URL"
					value={data.project.defaultRepoUrl || 'Not configured'}
				/>
				<DetailFactCard
					label="Default branch"
					value={data.project.defaultBranch || 'Not configured'}
				/>
				<DetailFactCard
					class="md:col-span-2"
					label="Additional writable roots"
					value={(data.project.additionalWritableRoots ?? []).join(' · ') || 'None configured'}
				/>
				<DetailFactCard
					label="Default thread sandbox"
					value={data.project.defaultThreadSandbox || 'Inherit provider default'}
				/>
			</DetailSection>

			<DetailSection
				eyebrow="Danger zone"
				title="Delete project"
				description={deleteBlocked
					? `This project still has ${data.contextScope.directTaskCount} directly linked task${data.contextScope.directTaskCount === 1 ? '' : 's'}. Reassign or delete those tasks first because tasks require a project.`
					: `This removes the project from the control plane, clears explicit links from ${data.relatedGoals.length} related goal${data.relatedGoals.length === 1 ? '' : 's'}, removes it from planning session scope, and promotes any child projects to the next parent level.`}
				tone="rose"
			>
				<form class="mt-5" method="POST" action="?/deleteProject">
					<button
						class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
						type="submit"
						disabled={deleteBlocked}
					>
						Delete project
					</button>
				</form>
			</DetailSection>
		</section>

		<section class="space-y-6">
			<DetailSection
				eyebrow="Related tasks"
				title="Queued and active work"
				description={data.contextScope.rolledUpTaskCount > 0
					? 'Direct project tasks appear alongside rolled-up child-project work so parent projects can stay broad without losing each subproject’s own defaults.'
					: 'Every task explicitly linked to this project, newest activity first.'}
				bodyClass="space-y-4"
			>
				{#snippet actions()}
					<a
						class="rounded-full border border-sky-800/70 bg-sky-950/40 px-3 py-2 text-xs font-medium text-sky-200 transition hover:border-sky-700 hover:text-white"
						href={resolve('/app/tasks')}
					>
						Open tasks
					</a>
				{/snippet}

				<div class="space-y-4">
					{#if data.relatedTasks.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No tasks are linked to this project yet.
						</p>
					{:else}
						{#each data.relatedTasks as task (task.id)}
							<a
								class="block rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-sky-400/40 hover:bg-slate-900"
								href={resolve(`/app/tasks/${task.id}`)}
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-2">
											<h3 class="ui-wrap-anywhere font-medium text-white">{task.title}</h3>
											<span
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(task.status)}`}
											>
												{formatTaskStatusLabel(task.status)}
											</span>
											{#if task.hasUnmetDependencies}
												<span
													class="badge border border-rose-900/70 bg-rose-950/40 text-[0.7rem] tracking-[0.2em] text-rose-200 uppercase"
												>
													Dependency blocked
												</span>
											{/if}
											{#if task.openReview}
												<span
													class="badge border border-amber-900/70 bg-amber-950/40 text-[0.7rem] tracking-[0.2em] text-amber-200 uppercase"
												>
													Review open
												</span>
											{/if}
											{#if task.pendingApproval}
												<span
													class="badge border border-amber-900/70 bg-amber-950/40 text-[0.7rem] tracking-[0.2em] text-amber-200 uppercase"
												>
													Approval {formatTaskApprovalModeLabel(task.pendingApproval.mode)}
												</span>
											{/if}
										</div>
										<p class="ui-clamp-3 mt-2 text-sm text-slate-300">{task.summary}</p>
									</div>
									<div class="min-w-0 text-left text-xs text-slate-500 sm:max-w-56 sm:text-right">
										<p>Updated {task.updatedAtLabel}</p>
										<p class="ui-wrap-anywhere mt-1 text-slate-400">{task.assigneeName}</p>
									</div>
								</div>

								<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Project</p>
										<p class="ui-wrap-anywhere mt-2 text-sm text-white">
											{task.projectName}
										</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Goal</p>
										<p class="ui-wrap-anywhere mt-2 text-sm text-white">{task.goalName}</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Priority</p>
										<p class="mt-2 text-sm text-white">{task.priority}</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
											Artifact path
										</p>
										<p class="ui-wrap-anywhere mt-2 text-sm text-white">
											{task.artifactPath || 'Not set'}
										</p>
									</div>
								</div>
							</a>
						{/each}
					{/if}
				</div>
			</DetailSection>

			<DetailSection
				eyebrow="Related goals"
				title="Goals sharing this project context"
				description="Goals appear here when a task links to them or when their artifact path falls under this project’s configured roots."
				bodyClass="space-y-4"
			>
				<div class="space-y-4">
					{#if data.relatedGoals.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No goals map to this project yet.
						</p>
					{:else}
						{#each data.relatedGoals as goal (goal.id)}
							<a
								class="block rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-sky-400/40"
								href={resolve(`/app/goals/${goal.id}`)}
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-2">
											<h3 class="ui-wrap-anywhere font-medium text-white">{goal.name}</h3>
											<span
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${goalStatusToneClass(goal.status)}`}
											>
												{formatGoalStatusLabel(goal.status)}
											</span>
										</div>
										<p class="ui-clamp-3 mt-2 text-sm text-slate-300">{goal.summary}</p>
									</div>
									<p class="text-xs text-slate-500">{goal.taskCount} linked task(s)</p>
								</div>
								<p class="ui-wrap-anywhere mt-3 text-xs text-slate-500">{goal.artifactPath}</p>
							</a>
						{/each}
					{/if}
				</div>
			</DetailSection>
		</section>
	</div>
</AppPage>
