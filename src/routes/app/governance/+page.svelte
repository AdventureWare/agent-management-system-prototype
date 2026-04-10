<script lang="ts">
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import PageTabs from '$lib/components/PageTabs.svelte';
	import QueueOpenButton from '$lib/components/QueueOpenButton.svelte';
	import {
		getTaskApprovalPolicyLabel,
		getTaskApprovalSummary,
		getTaskReviewRequirementLabel,
		getTaskReviewSummary
	} from '$lib/task-governance-ui';
	import { getTaskThreadActionLabel, getTaskThreadReviewHref } from '$lib/task-thread-context';
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

	type GovernanceQueueItem = PageData['queueItems'][number];
	type GovernanceQueueView = 'all' | 'review' | 'approval' | 'escalation';

	let { data, form } = $props<{ data: PageData; form?: ActionData }>();

	let selectedQueueView = $state<GovernanceQueueView>('all');

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

	let filteredQueueItems = $derived.by(() => {
		if (selectedQueueView === 'all') {
			return data.queueItems;
		}

		const queueView = selectedQueueView;

		return data.queueItems.filter((item: GovernanceQueueItem) =>
			item.queueKinds.includes(queueView)
		);
	});

	function queueKindLabel(kind: GovernanceQueueItem['queueKinds'][number]) {
		switch (kind) {
			case 'review':
				return 'Review follow-up';
			case 'approval':
				return 'Approval gate';
			case 'escalation':
				return 'Escalation';
		}
	}

	function queueKindClass(kind: GovernanceQueueItem['queueKinds'][number]) {
		switch (kind) {
			case 'review':
				return 'border border-sky-800/70 bg-sky-950/40 text-sky-200';
			case 'approval':
				return 'border border-amber-800/70 bg-amber-950/40 text-amber-200';
			case 'escalation':
				return 'border border-rose-800/70 bg-rose-950/40 text-rose-200';
		}
	}

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

	function staleBadgeLabel(item: GovernanceQueueItem, signal: TaskStaleSignalKey) {
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

	function emptyStateLabel(view: GovernanceQueueView) {
		switch (view) {
			case 'review':
				return 'No review follow-ups are waiting right now.';
			case 'approval':
				return 'No approval gates are waiting right now.';
			case 'escalation':
				return 'No escalations are waiting right now.';
			default:
				return 'No governance items are waiting right now.';
		}
	}
</script>

{#snippet taskContext(item: GovernanceQueueItem)}
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
{/snippet}

<AppPage width="full">
	<PageHeader
		eyebrow="Governance"
		title="Work the operator inbox as a queue"
		description="Review follow-ups, approval gates, and escalations now share one queue so human intervention points stay visible without opening every task detail page."
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

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
		<MetricCard
			label="Inbox items"
			value={data.summary.queueCount}
			detail="Unique tasks that currently need operator intervention."
		/>
		<MetricCard
			label="Review follow-ups"
			value={data.summary.reviewFollowUpCount}
			detail="Formal reviews plus tasks paused in review without a separate queue record."
		/>
		<MetricCard
			label="Approval gates"
			value={data.summary.approvalCount}
			detail="Approval objects currently blocking execution or completion."
		/>
		<MetricCard
			label="Escalations"
			value={data.summary.escalationCount}
			detail="Blocked, dependency-held, or stale items that still need judgment."
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

	<DetailSection
		eyebrow="Inbox"
		title="Operator queue"
		description="Switch views when you want to isolate one class of intervention, but keep the same task records and action forms throughout."
		bodyClass="space-y-4"
	>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">Queue views</p>
					<p class="mt-2 text-sm text-slate-400">
						Items can appear in more than one view when the same task needs multiple kinds of
						operator intervention.
					</p>
				</div>
				<PageTabs
					ariaLabel="Governance inbox views"
					bind:value={selectedQueueView}
					items={[
						{ id: 'all', label: 'All items', badge: data.summary.queueCount },
						{ id: 'review', label: 'Review follow-ups', badge: data.summary.reviewFollowUpCount },
						{ id: 'approval', label: 'Approval gates', badge: data.summary.approvalCount },
						{ id: 'escalation', label: 'Escalations', badge: data.summary.escalationCount }
					]}
					panelIdPrefix="governance-inbox"
				/>
			</div>
		</div>

		<div
			id={`governance-inbox-panel-${selectedQueueView}`}
			role="tabpanel"
			aria-labelledby={`governance-inbox-tab-${selectedQueueView}`}
		>
			{#if filteredQueueItems.length === 0}
				<p
					class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
				>
					{emptyStateLabel(selectedQueueView)}
				</p>
			{:else}
				<div class="space-y-4">
					{#each filteredQueueItems as item (item.id)}
						<article
							data-testid={`governance-queue-card-${item.id}`}
							class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5"
						>
							<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<h2 class="ui-wrap-anywhere text-lg font-semibold text-white">
											{item.title}
										</h2>
										{#each item.queueKinds as kind (kind)}
											<span
												class={`badge text-[0.72rem] tracking-[0.18em] uppercase ${queueKindClass(kind)}`}
											>
												{queueKindLabel(kind)}
											</span>
										{/each}
										{#if item.openReview}
											<span
												class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${reviewStatusToneClass(item.openReview.status)}`}
											>
												{formatReviewStatusLabel(item.openReview.status)}
											</span>
										{/if}
										{#if item.pendingApproval}
											<span
												class={`badge border text-[0.72rem] tracking-[0.18em] uppercase ${approvalStatusToneClass(item.pendingApproval.status)}`}
											>
												{formatTaskApprovalModeLabel(item.pendingApproval.mode)}
											</span>
										{/if}
									</div>

									<p class="mt-2 text-sm leading-6 text-slate-300">{item.summary}</p>
									<p class="mt-2 text-sm text-slate-400">{item.queueSummary}</p>
								</div>

								<div class="flex flex-col gap-2 sm:flex-row xl:flex-col">
									<QueueOpenButton
										href={resolve(`/app/tasks/${item.id}`)}
										label="Open task"
										menuAriaLabel={`Open task options for ${item.title}`}
									/>
									{#if item.linkThread}
										<QueueOpenButton
											href={resolve(getTaskThreadReviewHref(item.linkThread.id))}
											label={getTaskThreadActionLabel(item)}
											menuAriaLabel={`Open thread options for ${item.linkThread.name}`}
										/>
									{/if}
								</div>
							</div>

							{@render taskContext(item)}

							<div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Project</p>
									<p class="mt-2 text-sm text-white">{item.projectName}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Goal</p>
									<p class="mt-2 text-sm text-white">{item.goalName}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Assignee</p>
									<p class="mt-2 text-sm text-white">{item.assigneeName}</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Updated</p>
									<p class="mt-2 text-sm text-white">{item.updatedAtLabel}</p>
								</div>
							</div>

							{#if item.freshness.staleSignals.length > 0}
								<div class="mt-4 flex flex-wrap gap-2 text-[0.7rem] tracking-[0.16em] uppercase">
									{#each item.freshness.staleSignals as signal (signal)}
										<span class={`badge ${staleBadgeClass(signal)}`}>
											{staleBadgeLabel(item, signal)}
										</span>
									{/each}
								</div>
							{/if}

							{#if item.openReview || item.pendingApproval}
								<div class="mt-4 grid gap-3 xl:grid-cols-2">
									{#if item.openReview}
										<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Review note
											</p>
											<p class="mt-2 text-sm text-white">
												{getTaskReviewSummary(item.openReview.summary)}
											</p>
										</div>
									{/if}

									{#if item.pendingApproval}
										<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Approval note
											</p>
											<p class="mt-2 text-sm text-white">
												{getTaskApprovalSummary(
													item.pendingApproval.mode,
													item.pendingApproval.summary
												)}
											</p>
										</div>
									{/if}
								</div>
							{/if}

							{#if item.escalationReasons.length > 0}
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
							{/if}

							<div class="mt-4 grid gap-3 sm:grid-cols-2">
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Dependencies</p>
									<p class="mt-2 text-sm text-white">
										{item.dependencyTaskNames.length > 0
											? item.dependencyTaskNames.join(', ')
											: 'No dependency links'}
									</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Next step</p>
									<p class="mt-2 text-sm text-white">{item.queueSummary}</p>
								</div>
							</div>

							{#if item.openReview || item.pendingApproval}
								<div class="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
									{#if item.openReview}
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
									{/if}
									{#if item.pendingApproval}
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
									{/if}
								</div>
							{/if}
						</article>
					{/each}
				</div>
			{/if}
		</div>
	</DetailSection>
</AppPage>
