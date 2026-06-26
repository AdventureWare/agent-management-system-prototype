<script lang="ts">
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import DataTableSection from '$lib/components/DataTableSection.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		formatPriorityLabel,
		formatTaskAutonomyLevelLabel,
		formatTaskReadinessLevelLabel,
		formatTaskReviewRequirementLabel,
		formatTaskRiskLevelLabel,
		formatTaskStatusLabel,
		taskStatusToneClass
	} from '$lib/types/control-plane';

	let { data } = $props();

	function validationClass(quality: string) {
		switch (quality) {
			case 'strong':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'partial':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			default:
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
		}
	}

	function riskClass(riskLevel: string) {
		switch (riskLevel) {
			case 'low':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200';
			case 'medium':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-200';
			case 'high':
			case 'critical':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-200';
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}
</script>

<svelte:head>
	<title>Autonomous Queue · Agent Management System</title>
</svelte:head>

<AppPage>
	<PageHeader
		eyebrow="Work"
		title="Autonomous Queue"
		description="A deterministic v0 queue for deciding which tasks are safe and useful for an agent to work on next. This view selects and explains work; it does not launch unattended execution."
	/>

	<section class="grid gap-3 md:grid-cols-4">
		<div class="ui-panel">
			<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Ready</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.recommendedTasks.length}</p>
		</div>
		<div class="ui-panel">
			<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Blocked</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.blockedTasks.length}</p>
		</div>
		<div class="ui-panel">
			<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Planning</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.needsPlanningTasks.length}</p>
		</div>
		<div class="ui-panel">
			<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">High Risk</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.highRiskReviewTasks.length}</p>
		</div>
	</section>

	{#each data.sections as section (section.id)}
		<DataTableSection
			title={section.title}
			description={section.description}
			summary={`${section.items.length} task${section.items.length === 1 ? '' : 's'}`}
			empty={section.items.length === 0}
			emptyMessage="No tasks match this queue section."
		>
			<div class="space-y-3">
				{#each section.items as task (task.id)}
					<article class="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
						<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
							<div class="min-w-0">
								<a
									class="text-base font-semibold text-white hover:text-sky-200"
									href={resolve('/app/tasks/[taskId]', { taskId: task.id })}
								>
									{task.title}
								</a>
								<p class="mt-1 text-sm text-slate-400">{task.summary}</p>
								<p class="mt-2 text-xs text-slate-500">{task.projectGoalReason}</p>
							</div>
							<div class="shrink-0 text-left lg:text-right">
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Score
								</p>
								<p class="text-2xl font-semibold text-white">{task.score}</p>
							</div>
						</div>

						<div class="mt-3 flex flex-wrap gap-2">
							<span
								class={[
									'rounded-full border px-2.5 py-1 text-xs font-medium',
									taskStatusToneClass(task.status)
								]}
							>
								{formatTaskStatusLabel(task.status)}
							</span>
							<span
								class="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-xs font-medium text-slate-300"
							>
								{formatPriorityLabel(task.priority)}
							</span>
							<span
								class="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-xs font-medium text-slate-300"
							>
								{formatTaskReadinessLevelLabel(task.readinessLevel)}
							</span>
							<span
								class="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-xs font-medium text-slate-300"
							>
								{formatTaskAutonomyLevelLabel(task.autonomyLevel)}
							</span>
							<span
								class={[
									'rounded-full border px-2.5 py-1 text-xs font-medium',
									riskClass(task.riskLevel)
								]}
							>
								{formatTaskRiskLevelLabel(task.riskLevel)}
							</span>
							<span
								class={[
									'rounded-full border px-2.5 py-1 text-xs font-medium',
									validationClass(task.validationQuality)
								]}
							>
								Validation {task.validationQuality}
							</span>
						</div>

						<div class="mt-4 grid gap-3 text-sm text-slate-300 lg:grid-cols-2">
							<div>
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Recommendation
								</p>
								<p class="mt-1">{task.recommendationReason}</p>
							</div>
							<div>
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Readiness
								</p>
								<p class="mt-1">{task.readyReason}</p>
							</div>
							<div>
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Risk and Review
								</p>
								<p class="mt-1">
									{task.riskReviewReason}
									Review: {formatTaskReviewRequirementLabel(task.reviewRequirement)}.
								</p>
							</div>
							<div>
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Validation
								</p>
								<p class="mt-1">{task.validationReason}</p>
							</div>
						</div>

						{#if task.constraints.length > 0}
							<div class="mt-4">
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Constraints
								</p>
								<ul class="mt-2 flex flex-wrap gap-2">
									{#each task.constraints as constraint (constraint)}
										<li
											class="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-300"
										>
											{constraint}
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					</article>
				{/each}
			</div>
		</DataTableSection>
	{/each}
</AppPage>
