<script lang="ts">
	import { resolve } from '$app/paths';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import { getTaskThreadReviewHref } from '$lib/task-thread-context';
	import { formatThreadStateLabel } from '$lib/thread-activity';
	import {
		formatAgentSandboxLabel,
		type AgentSandbox,
		type AgentThreadState
	} from '$lib/types/agent-thread';
	import { formatRunStatusLabel, runStatusToneClass } from '$lib/types/control-plane';
	import { uniqueTopicLabels } from '$lib/topic-labels';

	type ThreadMatchedContext = {
		projectLabels?: string[];
		goalLabels?: string[];
		areaLabels?: string[];
		focusLabels?: string[];
		entityLabels?: string[];
		roleLabels?: string[];
		capabilityLabels?: string[];
		toolLabels?: string[];
		keywordLabels?: string[];
		labels?: string[];
	};

	type TaskThreadLink = {
		id: string;
	};

	type TaskExecutionView = {
		agentThreadId: string | null;
		linkThread?: TaskThreadLink | null;
	};

	type ExecutionPreflightView = {
		hasDeclaredRequirements: boolean;
		eligibleWorkerCount: number;
		fullCoverageWorkerCount: number;
		uncoveredCapabilityNames: string[];
		uncoveredToolNames: string[];
		currentAssignee: {
			workerName: string;
			withinConcurrencyLimit: boolean;
			missingCapabilityNames: string[];
			missingToolNames: string[];
			hasFullCoverage: boolean;
		} | null;
	};

	type CandidateThreadView = {
		id: string;
		name: string;
		threadState: AgentThreadState | null;
		canResume: boolean;
		hasActiveRun: boolean;
		topicLabels?: string[];
		previewText?: string | null;
		isSuggested?: boolean;
		suggestionReason?: string | null;
		matchedContext?: ThreadMatchedContext;
		relatedTasks: Array<{ title: string }>;
	};

	type SuggestedThreadView = CandidateThreadView & {
		suggestionReason: string;
	};

	type RetrievedKnowledgeItemView = {
		id: string;
		title: string;
		matchScore: number;
		summary: string;
		triggerPattern: string;
		recommendedResponse: string;
		matchReasons: string[];
	};

	type RelatedRunView = {
		id: string;
		status: string;
		summary: string | null;
		updatedAtLabel: string;
		workerName: string;
		providerName: string;
		agentThreadId: string | null;
		threadId: string | null;
	};

	type LaunchContextView = {
		role: {
			name: string;
			description: string;
			skillIds: string[];
			toolIds: string[];
			mcpIds: string[];
			hasSystemPrompt: boolean;
		} | null;
		assignedWorker: {
			name: string;
			status: string;
			skillNames: string[];
		} | null;
		provider: {
			name: string;
			launcher: string;
			capabilityNames: string[];
		} | null;
		sandbox: {
			effective: AgentSandbox;
			taskRequirement: AgentSandbox | null;
			workerOverride: AgentSandbox | null;
			projectDefault: AgentSandbox | null;
			providerDefault: AgentSandbox | null;
		};
		project: {
			rootFolder: string;
			defaultArtifactRoot: string;
			additionalWritableRoots: string[];
			totalInstalledSkillCount: number;
			promptSkillNames: string[];
		};
		promptInputs: {
			includesSuccessCriteria: boolean;
			includesReadyCondition: boolean;
			includesExpectedOutcome: boolean;
			includesDelegationPacket: boolean;
			publishedKnowledgeCount: number;
			requiredPromptSkillNames: string[];
			missingPromptSkillNames: string[];
		};
		requirements: {
			capabilityNames: string[];
			toolNames: string[];
		};
	};

	let {
		task,
		executionPreflight,
		launchContext,
		retrievedKnowledgeItems,
		suggestedThread,
		candidateThreads,
		relatedRuns,
		threadActionLabel
	}: {
		task: TaskExecutionView;
		executionPreflight: ExecutionPreflightView;
		launchContext: LaunchContextView;
		retrievedKnowledgeItems: RetrievedKnowledgeItemView[];
		suggestedThread: SuggestedThreadView | null;
		candidateThreads: CandidateThreadView[];
		relatedRuns: RelatedRunView[];
		threadActionLabel: string;
	} = $props();

	let showAllCandidateThreads = $state(false);
	let visibleCandidateThreads = $derived(
		showAllCandidateThreads ? candidateThreads : candidateThreads.slice(0, 3)
	);

	function compactText(value: string, maxLength = 320) {
		const normalized = value.replace(/\s+/g, ' ').trim();

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
	}

	function matchedContextSummary(thread: { matchedContext?: ThreadMatchedContext }) {
		const match = thread.matchedContext;

		if (!match) {
			return [];
		}

		return [
			...(match.projectLabels ?? []),
			...(match.goalLabels ?? []),
			...(match.areaLabels ?? []),
			...(match.focusLabels ?? []),
			...(match.entityLabels ?? []),
			...(match.roleLabels ?? []),
			...(match.capabilityLabels ?? []),
			...(match.toolLabels ?? []),
			...(match.keywordLabels ?? [])
		].filter(
			(label, index, labels) =>
				labels.findIndex((candidate) => candidate.toLowerCase() === label.toLowerCase()) === index
		);
	}

	function relatedThreadTasksLabel(thread: { relatedTasks: Array<{ title: string }> }) {
		return thread.relatedTasks.length > 0
			? `Related tasks: ${thread.relatedTasks.map((linkedTask) => linkedTask.title).join(', ')}`
			: 'No tasks linked yet.';
	}

	let hasCoverageWarnings = $derived(
		executionPreflight.uncoveredCapabilityNames.length > 0 ||
			executionPreflight.uncoveredToolNames.length > 0 ||
			Boolean(
				executionPreflight.currentAssignee &&
				(!executionPreflight.currentAssignee.hasFullCoverage ||
					!executionPreflight.currentAssignee.withinConcurrencyLimit)
			) ||
			(executionPreflight.hasDeclaredRequirements &&
				executionPreflight.fullCoverageWorkerCount === 0)
	);

	function boolLabel(value: boolean, yesLabel: string, noLabel: string) {
		return value ? yesLabel : noLabel;
	}
</script>

<div id="task-detail-panel-execution" role="tabpanel" aria-labelledby="task-detail-tab-execution">
	<DetailSection
		id="execution"
		eyebrow="Execution"
		title="Thread continuity and run history"
		description="Manage where work continues and review how this task has executed over time."
		tone="sky"
		bodyClass="divide-y divide-slate-800/90 p-0"
	>
		<div class="px-6 py-6">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Launch preflight
			</p>
			<h3 class="mt-2 text-xl font-semibold text-white">Current capability coverage</h3>
			<p class="mt-2 max-w-2xl text-sm text-slate-400">
				This is a read-only check against the current execution-surface and provider metadata before
				you launch new work.
			</p>

			<div
				class={`mt-5 rounded-2xl border p-4 ${hasCoverageWarnings ? 'border-amber-900/50 bg-amber-950/15' : 'border-emerald-900/40 bg-emerald-950/15'}`}
			>
				<p class={`text-sm ${hasCoverageWarnings ? 'text-amber-100' : 'text-emerald-100'}`}>
					{#if !executionPreflight.hasDeclaredRequirements}
						No required capabilities or tools are declared for this task yet.
					{:else if executionPreflight.fullCoverageWorkerCount > 0}
						{executionPreflight.fullCoverageWorkerCount} execution surface{executionPreflight.fullCoverageWorkerCount ===
						1
							? ''
							: 's'} currently cover all declared capability and tool requirements.
					{:else}
						No execution surface currently covers all declared capability and tool requirements.
					{/if}
				</p>
				<p class="mt-2 text-sm text-slate-300">
					Eligible now: {executionPreflight.eligibleWorkerCount} execution surface{executionPreflight.eligibleWorkerCount ===
					1
						? ''
						: 's'}
				</p>

				{#if executionPreflight.uncoveredCapabilityNames.length > 0}
					<p class="mt-3 text-sm text-amber-100">
						Uncovered capabilities: {executionPreflight.uncoveredCapabilityNames.join(', ')}
					</p>
				{/if}

				{#if executionPreflight.uncoveredToolNames.length > 0}
					<p class="mt-2 text-sm text-amber-100">
						Uncovered tools: {executionPreflight.uncoveredToolNames.join(', ')}
					</p>
				{/if}

				{#if executionPreflight.currentAssignee}
					<p class="mt-3 text-sm text-slate-300">
						Assigned execution surface: {executionPreflight.currentAssignee.workerName}
					</p>
					{#if !executionPreflight.currentAssignee.withinConcurrencyLimit}
						<p class="mt-2 text-sm text-amber-100">
							The assigned execution surface is already at its concurrency limit.
						</p>
					{/if}
					{#if executionPreflight.currentAssignee.missingCapabilityNames.length > 0}
						<p class="mt-2 text-sm text-amber-100">
							Assigned execution surface is missing capabilities:
							{executionPreflight.currentAssignee.missingCapabilityNames.join(', ')}
						</p>
					{/if}
					{#if executionPreflight.currentAssignee.missingToolNames.length > 0}
						<p class="mt-2 text-sm text-amber-100">
							Assigned execution surface is missing tools:
							{executionPreflight.currentAssignee.missingToolNames.join(', ')}
						</p>
					{/if}
				{/if}
			</div>
		</div>

		<div class="px-6 py-6">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Launch context</p>
			<h3 class="mt-2 text-xl font-semibold text-white">What a new thread will inherit</h3>
			<p class="mt-2 max-w-2xl text-sm text-slate-400">
				This mirrors the current launch plan so users can inspect the execution surface, provider,
				sandbox, installed skills, and prompt inputs before starting work.
			</p>

			<div class="mt-5 grid gap-4 xl:grid-cols-2">
				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Execution surface
					</p>
					<p class="mt-3 text-sm text-slate-300">
						Surface:
						{launchContext.assignedWorker
							? `${launchContext.assignedWorker.name} · ${launchContext.assignedWorker.status}`
							: 'Unassigned'}
					</p>
					<p class="mt-2 text-sm text-slate-300">
						Provider:
						{launchContext.provider
							? `${launchContext.provider.name} · ${launchContext.provider.launcher}`
							: 'No provider resolved'}
					</p>
					<p class="mt-2 text-sm text-slate-300">
						Effective sandbox: {formatAgentSandboxLabel(launchContext.sandbox.effective)}
					</p>
					<p class="mt-2 text-xs text-slate-500">
						Task requirement: {launchContext.sandbox.taskRequirement
							? formatAgentSandboxLabel(launchContext.sandbox.taskRequirement)
							: 'None'}
						· Surface override: {launchContext.sandbox.workerOverride
							? formatAgentSandboxLabel(launchContext.sandbox.workerOverride)
							: 'None'}
					</p>
					<p class="mt-1 text-xs text-slate-500">
						Project default: {launchContext.sandbox.projectDefault
							? formatAgentSandboxLabel(launchContext.sandbox.projectDefault)
							: 'None'}
						· Provider default: {launchContext.sandbox.providerDefault
							? formatAgentSandboxLabel(launchContext.sandbox.providerDefault)
							: 'None'}
					</p>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Prompt inputs
					</p>
					<p class="mt-3 text-sm text-slate-300">
						Success criteria: {boolLabel(
							launchContext.promptInputs.includesSuccessCriteria,
							'Included',
							'Not included'
						)}
					</p>
					<p class="mt-2 text-sm text-slate-300">
						Ready condition: {boolLabel(
							launchContext.promptInputs.includesReadyCondition,
							'Included',
							'Not included'
						)}
					</p>
					<p class="mt-2 text-sm text-slate-300">
						Expected outcome: {boolLabel(
							launchContext.promptInputs.includesExpectedOutcome,
							'Included',
							'Not included'
						)}
					</p>
					<p class="mt-2 text-sm text-slate-300">
						Delegation packet: {boolLabel(
							launchContext.promptInputs.includesDelegationPacket,
							'Included',
							'Not included'
						)}
					</p>
					<p class="mt-2 text-sm text-slate-300">
						Requested prompt skills:
						{launchContext.promptInputs.requiredPromptSkillNames.length > 0
							? launchContext.promptInputs.requiredPromptSkillNames.join(', ')
							: 'None'}
					</p>
					{#if launchContext.promptInputs.missingPromptSkillNames.length > 0}
						<p class="mt-2 text-sm text-amber-100">
							Not currently installed:
							{launchContext.promptInputs.missingPromptSkillNames.join(', ')}
						</p>
					{/if}
					<p class="mt-2 text-sm text-slate-300">
						Published knowledge items: {launchContext.promptInputs.publishedKnowledgeCount}
					</p>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Role context
					</p>
					{#if launchContext.role}
						<p class="mt-3 text-sm text-slate-300">{launchContext.role.name}</p>
						<p class="mt-2 text-sm text-slate-400">
							{launchContext.role.description || 'No role description recorded.'}
						</p>
						<p class="mt-2 text-sm text-slate-300">
							Role system prompt: {boolLabel(launchContext.role.hasSystemPrompt, 'Included', 'None')}
						</p>
						<p class="mt-2 text-sm text-slate-300">
							Role skills: {launchContext.role.skillIds.length > 0
								? launchContext.role.skillIds.join(', ')
								: 'None'}
						</p>
						<p class="mt-2 text-sm text-slate-300">
							Role tools: {launchContext.role.toolIds.length > 0
								? launchContext.role.toolIds.join(', ')
								: 'None'}
						</p>
						<p class="mt-2 text-sm text-slate-300">
							Role MCPs: {launchContext.role.mcpIds.length > 0
								? launchContext.role.mcpIds.join(', ')
								: 'None'}
						</p>
					{:else}
						<p class="mt-3 text-sm text-slate-400">
							No preferred role is set for this task. Execution routing can still proceed without one.
						</p>
					{/if}
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Workspace context
					</p>
					<p class="mt-3 text-sm text-slate-300">{launchContext.project.rootFolder}</p>
					<p class="mt-2 text-sm text-slate-300">
						Artifact root: {launchContext.project.defaultArtifactRoot || 'Not set'}
					</p>
					<p class="mt-2 text-sm text-slate-300">
						Additional writable roots: {launchContext.project.additionalWritableRoots.length}
					</p>
					{#if launchContext.project.additionalWritableRoots.length > 0}
						<p class="mt-2 text-xs text-slate-500">
							{launchContext.project.additionalWritableRoots.join(', ')}
						</p>
					{/if}
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Installed skills in prompt
					</p>
					<p class="mt-3 text-sm text-slate-300">
						{launchContext.project.totalInstalledSkillCount} installed skill{launchContext.project
							.totalInstalledSkillCount === 1
							? ''
							: 's'} discovered for this project.
					</p>
					{#if launchContext.project.promptSkillNames.length === 0}
						<p class="mt-2 text-sm text-slate-500">
							No installed skills will be listed in the next launch prompt.
						</p>
					{:else}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each launchContext.project.promptSkillNames as skillName (skillName)}
								<span
									class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
								>
									{skillName}
								</span>
							{/each}
						</div>
						{#if launchContext.project.totalInstalledSkillCount > launchContext.project.promptSkillNames.length}
							<p class="mt-2 text-xs text-slate-500">
								The launch prompt currently lists the first
								{launchContext.project.promptSkillNames.length} installed skills.
							</p>
						{/if}
					{/if}
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Execution surface and provider capabilities
					</p>
					<div class="mt-3 space-y-3">
						<div>
							<p class="text-xs text-slate-500 uppercase">Surface skills</p>
							{#if (launchContext.assignedWorker?.skillNames.length ?? 0) === 0}
								<p class="mt-2 text-sm text-slate-500">No execution-surface skills recorded.</p>
							{:else}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each launchContext.assignedWorker?.skillNames ?? [] as skillName (skillName)}
										<span
											class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
										>
											{skillName}
										</span>
									{/each}
								</div>
							{/if}
						</div>
						<div>
							<p class="text-xs text-slate-500 uppercase">Provider capabilities</p>
							{#if (launchContext.provider?.capabilityNames.length ?? 0) === 0}
								<p class="mt-2 text-sm text-slate-500">No provider capabilities recorded.</p>
							{:else}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each launchContext.provider?.capabilityNames ?? [] as capabilityName (capabilityName)}
										<span
											class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
										>
											{capabilityName}
										</span>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Declared task requirements
					</p>
					<div class="mt-3 space-y-3">
						<div>
							<p class="text-xs text-slate-500 uppercase">Capabilities</p>
							{#if launchContext.requirements.capabilityNames.length === 0}
								<p class="mt-2 text-sm text-slate-500">No capability requirements declared.</p>
							{:else}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each launchContext.requirements.capabilityNames as capabilityName (capabilityName)}
										<span
											class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
										>
											{capabilityName}
										</span>
									{/each}
								</div>
							{/if}
						</div>
						<div>
							<p class="text-xs text-slate-500 uppercase">Tools</p>
							{#if launchContext.requirements.toolNames.length === 0}
								<p class="mt-2 text-sm text-slate-500">No tool requirements declared.</p>
							{:else}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each launchContext.requirements.toolNames as toolName (toolName)}
										<span
											class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
										>
											{toolName}
										</span>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="px-6 py-6">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Published knowledge
			</p>
			<h3 class="mt-2 text-xl font-semibold text-white">Guidance retrieved for the next launch</h3>
			<p class="mt-2 max-w-2xl text-sm text-slate-400">
				These published lessons are matched against the current task and injected into new launch
				prompts from this page.
			</p>

			{#if retrievedKnowledgeItems.length === 0}
				<p class="mt-5 text-sm text-slate-500">
					No published knowledge currently matches this task. Publish a knowledge item from the
					improvements queue when you identify a reusable lesson.
				</p>
			{:else}
				<div class="mt-5 space-y-3">
					{#each retrievedKnowledgeItems as knowledgeItem (knowledgeItem.id)}
						<article class="rounded-2xl border border-sky-900/40 bg-sky-950/15 p-4">
							<div class="flex flex-wrap items-center gap-2">
								<p class="text-sm font-medium text-white">{knowledgeItem.title}</p>
								<span
									class="badge border border-sky-800/60 bg-sky-950/40 text-[0.65rem] tracking-[0.16em] text-sky-200 uppercase"
								>
									Score {knowledgeItem.matchScore}
								</span>
							</div>
							<p class="mt-2 text-sm text-slate-300">{knowledgeItem.summary}</p>
							<div class="mt-4 grid gap-4 lg:grid-cols-2">
								<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
									<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
										Trigger pattern
									</p>
									<p class="mt-2 text-sm text-slate-300">{knowledgeItem.triggerPattern}</p>
								</div>
								<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
									<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
										Recommended response
									</p>
									<p class="mt-2 text-sm text-slate-300">
										{knowledgeItem.recommendedResponse}
									</p>
								</div>
							</div>
							{#if knowledgeItem.matchReasons.length > 0}
								<p class="mt-3 text-xs text-sky-200">{knowledgeItem.matchReasons.join(' ')}</p>
							{/if}
						</article>
					{/each}
				</div>
			{/if}
		</div>

		<div class="px-6 py-6">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Thread continuity
			</p>
			<h3 class="mt-2 text-xl font-semibold text-white">Assign this task to a work thread</h3>
			<p class="mt-2 max-w-2xl text-sm text-slate-400">
				A work thread is reusable context. Assign this task to an existing thread when you want
				follow-up work to continue in the same conversation instead of creating a fresh one.
			</p>

			{#if suggestedThread && suggestedThread.id !== task.agentThreadId}
				<div class="mt-5 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4">
					<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div class="min-w-0">
							<p class="text-xs font-semibold tracking-[0.16em] text-emerald-300 uppercase">
								Suggested available thread
							</p>
							<p class="thread-name-clamp mt-2 text-sm font-medium text-white">
								{suggestedThread.name}
							</p>
							{#if uniqueTopicLabels(suggestedThread.topicLabels).length > 0}
								<div class="mt-3 flex flex-wrap gap-2">
									{#each uniqueTopicLabels(suggestedThread.topicLabels) as topicLabel (topicLabel)}
										<span
											class="badge border border-emerald-900/60 bg-emerald-950/30 text-[0.65rem] tracking-[0.16em] text-emerald-100 uppercase"
										>
											{topicLabel}
										</span>
									{/each}
								</div>
							{/if}
							{#if matchedContextSummary(suggestedThread).length > 0}
								<div class="mt-3">
									<p class="text-[11px] tracking-[0.16em] text-emerald-300 uppercase">
										Shared context
									</p>
									<div class="mt-2 flex flex-wrap gap-2">
										{#each matchedContextSummary(suggestedThread) as label (label)}
											<span
												class="badge border border-emerald-900/60 bg-emerald-950/20 text-[0.65rem] tracking-[0.16em] text-emerald-100 uppercase"
											>
												{label}
											</span>
										{/each}
									</div>
								</div>
							{/if}
							<p class="mt-2 text-sm text-emerald-100/90">{suggestedThread.suggestionReason}</p>
							<p class="mt-2 text-xs text-slate-400">
								{formatThreadStateLabel(suggestedThread.threadState ?? 'idle')} · Available to resume
							</p>
						</div>

						<div class="flex flex-col gap-2 sm:items-end">
							<form method="POST" action="?/updateTaskThread">
								<input type="hidden" name="agentThreadId" value={suggestedThread.id} />
								<button
									class="rounded-full border border-emerald-700/70 bg-emerald-950/40 px-3 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200 uppercase transition hover:border-emerald-500/60 hover:text-emerald-100"
									type="submit"
								>
									Assign suggested thread
								</button>
							</form>
							<a
								class="text-sm text-sky-300 transition hover:text-sky-200"
								href={resolve(getTaskThreadReviewHref(suggestedThread.id))}
							>
								Open thread
							</a>
						</div>
					</div>
				</div>
			{/if}

			<form class="mt-5 space-y-4" method="POST" action="?/updateTaskThread">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Assigned thread</span>
					<select class="select text-white" name="agentThreadId">
						<option value="" selected={!task.agentThreadId}>
							Create a new thread when this task runs
						</option>
						{#each candidateThreads as thread (thread.id)}
							<option value={thread.id} selected={task.agentThreadId === thread.id}>
								{thread.isSuggested ? 'Suggested · ' : ''}{thread.name} ·
								{formatThreadStateLabel(thread.threadState ?? 'idle')} ·
								{thread.canResume ? 'ready' : thread.hasActiveRun ? 'busy' : 'blocked'}{thread
									.topicLabels?.length
									? ` · ${thread.topicLabels.join(', ')}`
									: ''}
							</option>
						{/each}
					</select>
				</label>
				<p class="text-sm text-slate-400">
					Leave the task unassigned if the next run should start a new thread from scratch.
				</p>

				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<button class="btn border border-slate-700 font-semibold text-slate-100" type="submit">
						Save thread assignment
					</button>
					{#if task.linkThread}
						<a
							class="text-sm text-sky-300 transition hover:text-sky-200"
							href={resolve(getTaskThreadReviewHref(task.linkThread.id))}
						>
							{threadActionLabel}
						</a>
					{/if}
				</div>
			</form>

			{#if candidateThreads.length > 0}
				<div class="mt-5 space-y-3">
					{#each visibleCandidateThreads as thread (thread.id)}
						<div class="relative rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<a
								class="absolute top-4 right-4 text-sm text-sky-300 transition hover:text-sky-200"
								href={resolve(getTaskThreadReviewHref(thread.id))}
							>
								Open thread
							</a>
							<div class="min-w-0 pr-28">
								<div class="flex flex-wrap items-center gap-2">
									<p class="thread-name-clamp text-sm font-medium text-white">{thread.name}</p>
									{#if thread.isSuggested}
										<span
											class="badge border border-emerald-800/70 bg-emerald-950/40 text-[0.65rem] tracking-[0.18em] text-emerald-200 uppercase"
										>
											Suggested
										</span>
									{/if}
								</div>
								<p class="mt-1 text-xs text-slate-500">
									{formatThreadStateLabel(thread.threadState ?? 'idle')} ·
									{thread.canResume ? 'Can resume' : thread.hasActiveRun ? 'Busy' : 'Blocked'}
								</p>
							</div>
							{#if uniqueTopicLabels(thread.topicLabels).length > 0}
								<div class="mt-3 flex flex-wrap gap-2">
									{#each uniqueTopicLabels(thread.topicLabels) as topicLabel (topicLabel)}
										<span
											class="badge border border-sky-900/50 bg-sky-950/30 text-[0.65rem] tracking-[0.16em] text-sky-200 uppercase"
										>
											{topicLabel}
										</span>
									{/each}
								</div>
							{/if}
							{#if matchedContextSummary(thread).length > 0}
								<div class="mt-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Shared context
									</p>
									<div class="mt-2 flex flex-wrap gap-2">
										{#each matchedContextSummary(thread) as label (label)}
											<span
												class="badge border border-emerald-900/40 bg-emerald-950/10 text-[0.65rem] tracking-[0.16em] text-emerald-200 uppercase"
											>
												{label}
											</span>
										{/each}
									</div>
								</div>
							{/if}
							{#if thread.previewText}
								<p class="thread-preview-clamp mt-3 text-sm leading-6 text-slate-300">
									{compactText(thread.previewText)}
								</p>
							{/if}
							{#if thread.isSuggested && thread.suggestionReason}
								<p class="mt-3 text-xs font-medium text-emerald-200">
									{thread.suggestionReason}
								</p>
							{/if}
							<p class="ui-wrap-anywhere mt-3 text-xs text-slate-400">
								{relatedThreadTasksLabel(thread)}
							</p>
						</div>
					{/each}
				</div>
				{#if candidateThreads.length > 3}
					<button
						class="mt-4 text-sm text-sky-300 transition hover:text-sky-200"
						type="button"
						onclick={() => {
							showAllCandidateThreads = !showAllCandidateThreads;
						}}
					>
						{showAllCandidateThreads
							? 'Show fewer threads'
							: `See more threads (${candidateThreads.length - 3} more)`}
					</button>
				{/if}
			{:else}
				<p class="mt-5 text-sm text-slate-500">
					No reusable threads match this project context yet. Start the task once to create a fresh
					thread, or revisit this panel after related work has accumulated.
				</p>
			{/if}
		</div>

		<div class="px-6 py-6">
			<div class="flex items-start justify-between gap-3">
				<div>
					<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
						Run history
					</p>
					<h3 class="mt-2 text-xl font-semibold text-white">Execution timeline</h3>
				</div>
				<a
					class="rounded-full border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
					href={resolve('/app/runs')}
				>
					Open runs
				</a>
			</div>

			<div class="mt-5 space-y-4">
				{#if relatedRuns.length === 0}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
					>
						No runs are recorded for this task yet. Launch the task to create the first run, then
						return here to compare later attempts.
					</p>
				{:else}
					{#each relatedRuns as run (run.id)}
						<article class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<a
											class="ui-wrap-anywhere font-medium text-white transition hover:text-sky-200"
											href={resolve(`/app/runs/${run.id}`)}
										>
											{run.id}
										</a>
										<span
											class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${runStatusToneClass(run.status)}`}
										>
											{formatRunStatusLabel(run.status)}
										</span>
									</div>
									<p class="ui-wrap-anywhere mt-2 text-sm text-slate-300">
										{run.summary || 'No summary recorded.'}
									</p>
								</div>
								<p class="text-xs text-slate-500">Updated {run.updatedAtLabel}</p>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-3">
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Execution surface
									</p>
									<p class="mt-2 text-sm text-white">{run.workerName}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Provider</p>
									<p class="mt-2 text-sm text-white">{run.providerName}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Thread record
									</p>
									{#if run.agentThreadId}
										<a
											class="ui-wrap-inline mt-2 text-sm text-sky-300 transition hover:text-sky-200"
											href={resolve(`/app/threads/${run.agentThreadId}`)}
										>
											{run.threadId || run.agentThreadId}
										</a>
									{:else}
										<p class="mt-2 text-sm text-white">No thread</p>
									{/if}
								</div>
							</div>
							<div class="mt-3">
								<a
									class="text-xs font-medium text-sky-300 transition hover:text-sky-200"
									href={resolve(`/app/runs/${run.id}`)}
								>
									Open run details
								</a>
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</div>
	</DetailSection>
</div>

<style>
	.thread-name-clamp {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		line-clamp: 4;
		-webkit-line-clamp: 4;
		overflow: hidden;
		overflow-wrap: anywhere;
		word-break: break-word;
		hyphens: auto;
	}

	.thread-preview-clamp {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		line-clamp: 5;
		-webkit-line-clamp: 5;
		overflow: hidden;
		overflow-wrap: anywhere;
		word-break: break-word;
		hyphens: auto;
	}
</style>
