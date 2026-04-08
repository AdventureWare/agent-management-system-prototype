<script lang="ts">
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import {
		getTaskApprovalPolicyLabel,
		getTaskApprovalSummary,
		getTaskReviewRequirementLabel,
		getTaskReviewSummary
	} from '$lib/task-governance-ui';
	import {
		approvalStatusToneClass,
		formatPriorityLabel,
		formatTaskApprovalModeLabel,
		formatTaskRiskLevelLabel,
		formatTaskStatusLabel,
		taskStatusToneClass
	} from '$lib/types/control-plane';
	import { formatReviewStatusLabel, reviewStatusToneClass } from '$lib/types/control-plane';
	import type { ActionData, PageData } from './$types';
	import type { TaskStaleSignalKey } from '$lib/types/task-work-item';

	type GovernanceItem = PageData['reviewItems'][number];

	let { data, form } = $props<{ data: PageData; form?: ActionData }>();

	let successMessage = $derived.by(() => {
		if (!form?.ok) {
			return null;
		}

		switch (form.successAction) {
			case 'approveReview':
				return 'Review approved.';
			case 'requestChanges':
				return 'Changes requested and task moved back to blocked.';
			case 'approveApproval':
				return 'Approval gate cleared.';
			case 'rejectApproval':
				return 'Approval rejected and task moved to blocked.';
			default:
				return null;
		}
	});

	function staleBadgeClass(signal: TaskStaleSignalKey) {
		switch (signal) {
			case 'staleInProgress':
				return 'border border-violet-800/70 bg-violet-950/40 text-violet-200';
			case 'noRecentRunActivity':
				return 'border border-rose-800/70 bg-rose-950/40 text-rose-200';
			case 'activeThreadNoRecentOutput':
				return 'border border-amber-800/70 bg-amber-950/40 text-amber-200';
			default:
				return 'border border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function staleBadgeLabel(item: GovernanceItem, signal: TaskStaleSignalKey) {
		switch (signal) {
			case 'staleInProgress':
				return `stale WIP ${item.freshness.taskAgeLabel}`;
			case 'noRecentRunActivity':
				return `run quiet ${item.freshness.runActivityAgeLabel}`;
			case 'activeThreadNoRecentOutput':
				return `thread quiet ${item.freshness.threadActivityAgeLabel}`;
			default:
				return 'stale';
		}
	}
</script>

{#snippet taskContext(item: GovernanceItem)}
	<div class="mt-3 flex flex-wrap gap-2 text-[0.7rem] tracking-[0.16em] uppercase">
		<span class={`badge border ${taskStatusToneClass(item.status)}`}>
			{formatTaskStatusLabel(item.status)}
		</span>
		<span class="badge border border-slate-700 bg-slate-950/70 text-slate-300">
			{formatPriorityLabel(item.priority)}
		</span>
		<span class="badge border border-slate-700 bg-slate-950/70 text-slate-300">
			{formatTaskRiskLevelLabel(item.riskLevel)}
		</span>
		{#if item.requiresReview}
			<span class="badge border border-sky-800/70 bg-sky-950/40 text-sky-200">
				{getTaskReviewRequirementLabel(item.requiresReview)}
			</span>
		{:else}
			<span class="badge border border-slate-700 bg-slate-950/70 text-slate-300">
				{getTaskReviewRequirementLabel(item.requiresReview)}
			</span>
		{/if}
		{#if item.approvalMode !== 'none'}
			<span class="badge border border-amber-800/70 bg-amber-950/40 text-amber-200">
				{getTaskApprovalPolicyLabel(item.approvalMode)}
			</span>
		{/if}
	</div>

	<div class="mt-4 grid gap-3 md:grid-cols-3">
		<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
			<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Project</p>
			<p class="mt-2 text-sm text-white">{item.projectName}</p>
		</div>
		<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
			<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Goal</p>
			<p class="mt-2 text-sm text-white">{item.goalName}</p>
		</div>
		<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
			<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Updated</p>
			<p class="mt-2 text-sm text-white">{item.updatedAtLabel}</p>
		</div>
	</div>
{/snippet}

<AppPage width="full">
	<PageHeader
		eyebrow="Governance"
		title="Review, approve, and triage cross-task decisions"
		description="A dedicated operator inbox for open reviews, approval gates, and escalations that need human judgment before work should continue."
	/>

	{#if form?.message}
		<p class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{:else if successMessage}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			{successMessage}
		</p>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
		<MetricCard
			label="Open reviews"
			value={data.summary.reviewCount}
			detail="Tasks waiting on a reviewer decision."
		/>
		<MetricCard
			label="Pending approvals"
			value={data.summary.approvalCount}
			detail="Approval gates currently blocking forward progress."
		/>
		<MetricCard
			label="Escalations"
			value={data.summary.escalationCount}
			detail="Items needing operator follow-up outside formal review or approval gates."
		/>
		<MetricCard
			label="Blocked tasks"
			value={data.summary.blockedCount}
			detail="Tasks explicitly marked blocked."
		/>
		<MetricCard
			label="Stale work"
			value={data.summary.staleCount}
			detail="In-progress work with stale run or thread activity."
		/>
	</div>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<DetailSection
			eyebrow="Reviews"
			title="Open reviews"
			description="Approve completed work or send it back with changes requested."
			bodyClass="space-y-4"
		>
			{#if data.reviewItems.length === 0}
				<p
					class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
				>
					No open reviews are waiting right now.
				</p>
			{:else}
				{#each data.reviewItems as item (item.id)}
					<article class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<h2 class="ui-wrap-anywhere text-lg font-semibold text-white">{item.title}</h2>
									<span
										class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${reviewStatusToneClass(item.openReview?.status ?? 'open')}`}
									>
										{formatReviewStatusLabel(item.openReview?.status ?? 'open')}
									</span>
								</div>
								<p class="mt-2 text-sm leading-6 text-slate-300">{item.summary}</p>
							</div>
							<a
								class="text-sm font-medium text-sky-300 transition hover:text-sky-200"
								href={resolve(`/app/tasks/${item.id}`)}
							>
								Open task
							</a>
						</div>

						{@render taskContext(item)}

						<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Review note</p>
							<p class="mt-2 text-sm text-white">
								{getTaskReviewSummary(item.openReview?.summary)}
							</p>
						</div>

						<div class="mt-4 flex flex-col gap-3 sm:flex-row">
							<form method="POST" action="?/approveReview">
								<input type="hidden" name="taskId" value={item.id} />
								<button
									class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200"
									type="submit"
								>
									Approve review
								</button>
							</form>
							<form method="POST" action="?/requestChanges">
								<input type="hidden" name="taskId" value={item.id} />
								<button
									class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
									type="submit"
								>
									Request changes
								</button>
							</form>
						</div>
					</article>
				{/each}
			{/if}
		</DetailSection>

		<DetailSection
			eyebrow="Approvals"
			title="Pending approval gates"
			description="Clear or reject the formal gates that are preventing execution or completion."
			bodyClass="space-y-4"
		>
			{#if data.approvalItems.length === 0}
				<p
					class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
				>
					No approval gates are waiting right now.
				</p>
			{:else}
				{#each data.approvalItems as item (item.id)}
					<article class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<h2 class="ui-wrap-anywhere text-lg font-semibold text-white">{item.title}</h2>
									<span
										class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${approvalStatusToneClass(item.pendingApproval?.status ?? 'pending')}`}
									>
										{formatTaskApprovalModeLabel(item.pendingApproval?.mode ?? item.approvalMode)}
									</span>
								</div>
								<p class="mt-2 text-sm leading-6 text-slate-300">{item.summary}</p>
							</div>
							<a
								class="text-sm font-medium text-sky-300 transition hover:text-sky-200"
								href={resolve(`/app/tasks/${item.id}`)}
							>
								Open task
							</a>
						</div>

						{@render taskContext(item)}

						<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Approval note</p>
							<p class="mt-2 text-sm text-white">
								{getTaskApprovalSummary(
									item.pendingApproval?.mode ?? item.approvalMode,
									item.pendingApproval?.summary
								)}
							</p>
						</div>

						<div class="mt-4 flex flex-col gap-3 sm:flex-row">
							<form method="POST" action="?/approveApproval">
								<input type="hidden" name="taskId" value={item.id} />
								<button
									class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200"
									type="submit"
								>
									Approve gate
								</button>
							</form>
							<form method="POST" action="?/rejectApproval">
								<input type="hidden" name="taskId" value={item.id} />
								<button
									class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
									type="submit"
								>
									Reject gate
								</button>
							</form>
						</div>
					</article>
				{/each}
			{/if}
		</DetailSection>
	</div>

	<DetailSection
		eyebrow="Escalations"
		title="Blocked, dependency-held, and stale work"
		description="Items that still need operator judgment, but not through a formal review or approval object."
		bodyClass="space-y-4"
	>
		{#if data.escalationItems.length === 0}
			<p class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
				No additional escalations are waiting right now.
			</p>
		{:else}
			<div class="grid gap-4 xl:grid-cols-2">
				{#each data.escalationItems as item (item.id)}
					<article class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<h2 class="ui-wrap-anywhere text-lg font-semibold text-white">{item.title}</h2>
								<p class="mt-2 text-sm leading-6 text-slate-300">{item.summary}</p>
							</div>
							<a
								class="text-sm font-medium text-sky-300 transition hover:text-sky-200"
								href={resolve(`/app/tasks/${item.id}`)}
							>
								Open task
							</a>
						</div>

						{@render taskContext(item)}

						{#if item.freshness.staleSignals.length > 0}
							<div class="mt-4 flex flex-wrap gap-2 text-[0.7rem] tracking-[0.16em] uppercase">
								{#each item.freshness.staleSignals as signal (signal)}
									<span class={`badge ${staleBadgeClass(signal)}`}>
										{staleBadgeLabel(item, signal)}
									</span>
								{/each}
							</div>
						{/if}

						<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Operator follow-up
							</p>
							<div class="mt-3 space-y-2 text-sm text-white">
								{#each item.escalationReasons as reason, index (index)}
									<p>{reason}</p>
								{/each}
							</div>
						</div>

						<div class="mt-4 grid gap-3 sm:grid-cols-2">
							<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Assignee</p>
								<p class="mt-2 text-sm text-white">{item.assigneeName}</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Dependencies</p>
								<p class="mt-2 text-sm text-white">
									{item.dependencyTaskNames.length > 0
										? item.dependencyTaskNames.join(', ')
										: 'No dependency links'}
								</p>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</DetailSection>
</AppPage>
