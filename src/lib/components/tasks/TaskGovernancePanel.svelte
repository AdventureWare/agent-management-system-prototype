<script lang="ts">
	import { resolve } from '$app/paths';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import { getTaskApprovalSummary, getTaskReviewSummary } from '$lib/task-governance-ui';
	import {
		approvalStatusToneClass,
		formatDecisionTypeLabel,
		formatPriorityLabel,
		formatReviewStatusLabel,
		formatTaskApprovalModeLabel,
		formatTaskRiskLevelLabel,
		formatTaskStatusLabel,
		reviewStatusToneClass,
		taskStatusToneClass
	} from '$lib/types/control-plane';

	type TaskGovernanceView = {
		priority: string;
		riskLevel: string;
		approvalMode: string;
		requiresReview: boolean;
		desiredRoleName: string | null;
		desiredRoleId: string;
		openReview: {
			summary: string;
			status: string;
		} | null;
		pendingApproval: {
			summary: string;
			mode: string;
			status: string;
		} | null;
		goalId: string;
		goalName: string | null;
		blockedReason: string;
	};

	type ParentTaskView = {
		id: string;
		title: string;
		status: string;
		projectName: string;
	};

	type ChildTaskRollupView = {
		status: string;
		summary: string;
		doneCount: number;
		acceptedCount: number;
		pendingIntegrationCount: number;
		inProgressCount: number;
		reviewCount: number;
		blockedCount: number;
		readyCount: number;
	};

	type ChildTaskView = {
		id: string;
		title: string;
		status: string;
		projectName: string;
		updatedAtLabel: string;
		integrationStatus: 'accepted' | 'pending' | 'not_ready';
		delegationAcceptance: {
			acceptedAtLabel: string;
		} | null;
		delegationPacket: {
			objective?: string;
			expectedDeliverable?: string;
			doneCondition?: string;
		} | null;
	};

	type DependencyTaskView = {
		id: string;
		title: string;
		status: string;
		projectName: string;
	};

	type RecentDecisionView = {
		id: string;
		decisionType: string;
		createdAtLabel: string;
		summary: string;
	};

	type RoleOption = {
		id: string;
		name: string;
	};

	type TaskGovernancePanelProps = {
		task: TaskGovernanceView;
		parentTask: ParentTaskView | null;
		childTaskRollup: ChildTaskRollupView | null;
		childTasks: ChildTaskView[];
		roles: RoleOption[];
		dependencyTasks: DependencyTaskView[];
		recentDecisions: RecentDecisionView[];
		actionBasePath?: string;
		readOnly?: boolean;
	};

	let {
		task,
		parentTask,
		childTaskRollup,
		childTasks,
		roles,
		dependencyTasks,
		recentDecisions,
		actionBasePath = '',
		readOnly = false
	}: TaskGovernancePanelProps = $props();
	let remainingChildSlots = $derived(Math.max(0, 3 - childTasks.length));
	let pendingChildTasks = $derived(
		childTasks.filter((childTask) => childTask.integrationStatus === 'pending')
	);
	let activeChildTasks = $derived(
		childTasks.filter((childTask) => childTask.integrationStatus === 'not_ready')
	);
	let acceptedChildTasks = $derived(
		childTasks.filter((childTask) => childTask.integrationStatus === 'accepted')
	);

	function taskAction(actionName: string) {
		return actionBasePath ? `${actionBasePath}?/${actionName}` : `?/${actionName}`;
	}

	function childTaskOpenHref(childTask: ChildTaskView) {
		const panel = childTask.integrationStatus === 'not_ready' ? 'execution' : 'governance';
		return resolve(`/app/tasks/${childTask.id}?panel=${panel}`);
	}

	function childTaskOpenLabel(childTask: ChildTaskView) {
		if (childTask.integrationStatus === 'pending') {
			return 'Review handoff';
		}

		if (childTask.integrationStatus === 'accepted') {
			return 'View accepted task';
		}

		return 'Open task';
	}

	function childTaskIntegrationToneClass(childTask: ChildTaskView) {
		if (childTask.integrationStatus === 'accepted') {
			return taskStatusToneClass('done');
		}

		if (childTask.integrationStatus === 'pending') {
			return taskStatusToneClass('review');
		}

		return taskStatusToneClass(childTask.status);
	}

	function childTaskIntegrationLabel(childTask: ChildTaskView) {
		if (childTask.integrationStatus === 'accepted') {
			return 'Accepted';
		}

		if (childTask.integrationStatus === 'pending') {
			return 'Pending integration';
		}

		return 'Not ready';
	}
</script>

<div id="task-detail-panel-governance" role="tabpanel" aria-labelledby="task-detail-tab-governance">
	<DetailSection
		id="governance"
		eyebrow="Governance"
		title="Review state and execution constraints"
		description="Track decisions that can block or redirect the task before more work is queued."
		tone="amber"
		bodyClass="divide-y divide-slate-800/90 p-0"
	>
		<div class="px-6 py-6">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Governance</p>
			<h3 class="mt-2 text-xl font-semibold text-white">Review and approval state</h3>

			<div class="mt-5 space-y-4">
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Open review
							</p>
							<p class="mt-2 text-sm text-white">
								{task.openReview ? getTaskReviewSummary(task.openReview.summary) : 'No open review'}
							</p>
						</div>
						{#if task.openReview}
							<span
								class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${reviewStatusToneClass(task.openReview.status)}`}
							>
								{formatReviewStatusLabel(task.openReview.status)}
							</span>
						{/if}
					</div>

					{#if !readOnly && task.openReview}
						<div class="mt-4 flex flex-col gap-3 sm:flex-row">
							<form method="POST" action={taskAction('approveReview')}>
								<button
									class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200"
									type="submit"
								>
									Approve review
								</button>
							</form>
							<form method="POST" action={taskAction('requestChanges')}>
								<button
									class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
									type="submit"
								>
									Request changes
								</button>
							</form>
						</div>
					{/if}
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Pending approval
							</p>
							<p class="mt-2 text-sm text-white">
								{task.pendingApproval
									? getTaskApprovalSummary(task.pendingApproval.mode, task.pendingApproval.summary)
									: 'No pending approval'}
							</p>
						</div>
						{#if task.pendingApproval}
							<span
								class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${approvalStatusToneClass(task.pendingApproval.status)}`}
							>
								{formatTaskApprovalModeLabel(task.pendingApproval.mode)}
							</span>
						{/if}
					</div>

					{#if !readOnly && task.pendingApproval}
						<div class="mt-4 flex flex-col gap-3 sm:flex-row">
							<form method="POST" action={taskAction('approveApproval')}>
								<button
									class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200"
									type="submit"
								>
									Approve gate
								</button>
							</form>
							<form method="POST" action={taskAction('rejectApproval')}>
								<button
									class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
									type="submit"
								>
									Reject gate
								</button>
							</form>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="px-6 py-6">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
				Dependency context
			</p>
			<h3 class="mt-2 text-xl font-semibold text-white">Dependencies and execution notes</h3>

			<div class="mt-5 space-y-4">
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Routing summary
					</p>
					<div class="mt-3 space-y-2 text-sm text-white">
						<p>Priority: {formatPriorityLabel(task.priority)}</p>
						<p>Risk level: {formatTaskRiskLevelLabel(task.riskLevel)}</p>
						<p>Approval mode: {formatTaskApprovalModeLabel(task.approvalMode)}</p>
						<p>Requires review: {task.requiresReview ? 'Yes' : 'No'}</p>
						<p>
							Desired role: {task.desiredRoleName || task.desiredRoleId || 'No role preference'}
						</p>
					</div>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Delegation lineage
							</p>
							<p class="mt-2 text-sm text-white">
								Track whether this task belongs to a parent task or owns delegated subtasks.
							</p>
						</div>
						<span
							class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
						>
							{(parentTask ? 1 : 0) + childTasks.length} links
						</span>
					</div>

					<div class="mt-4 space-y-4">
						{#if childTaskRollup}
							<div class="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3">
								<div class="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p class="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
											Parent rollup
										</p>
										<p class="mt-2 text-sm text-white">{childTaskRollup.summary}</p>
									</div>
									<span
										class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(childTaskRollup.status)}`}
									>
										{childTaskRollup.status === 'done'
											? 'Ready to integrate'
											: formatTaskStatusLabel(childTaskRollup.status)}
									</span>
								</div>
								<p class="mt-3 text-xs text-slate-500">
									{childTaskRollup.doneCount} done · {childTaskRollup.acceptedCount} accepted ·
									{childTaskRollup.pendingIntegrationCount} pending parent review ·
									{childTaskRollup.inProgressCount} in progress ·
									{childTaskRollup.reviewCount} in review · {childTaskRollup.blockedCount}
									blocked · {childTaskRollup.readyCount} ready
								</p>
							</div>
						{/if}

						<div class="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3">
							<p class="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
								Parent task
							</p>
							{#if parentTask}
								<div class="mt-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
									<div class="flex flex-wrap items-center justify-between gap-3">
										<a
											class="ui-wrap-anywhere text-sm font-medium text-sky-300 transition hover:text-sky-200"
											href={resolve(`/app/tasks/${parentTask.id}`)}
										>
											{parentTask.title}
										</a>
										<span
											class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(parentTask.status)}`}
										>
											{formatTaskStatusLabel(parentTask.status)}
										</span>
									</div>
									<p class="mt-2 text-xs text-slate-500">{parentTask.projectName}</p>
									<div class="mt-3">
										<a
											class="btn border border-slate-700 bg-slate-950/70 text-xs font-semibold text-slate-100"
											href={resolve(`/app/tasks/${parentTask.id}`)}
										>
											Open parent task
										</a>
									</div>
								</div>
							{:else}
								<p class="mt-2 text-sm text-slate-400">This task is not linked to a parent task.</p>
							{/if}
						</div>

						<div class="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<p class="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
									Delegated subtasks
								</p>
								<span class="text-xs text-slate-500">
									{childTasks.length === 1 ? '1 child task' : `${childTasks.length} child tasks`} ·
									{remainingChildSlots} slot{remainingChildSlots === 1 ? '' : 's'} remaining
								</span>
							</div>
							{#if childTasks.length === 0}
								<p class="mt-2 text-sm text-slate-400">No delegated subtasks are linked yet.</p>
							{:else}
								<div class="mt-4 grid gap-3 md:grid-cols-3">
									<div class="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3">
										<p
											class="text-[0.7rem] font-semibold tracking-[0.16em] text-amber-200 uppercase"
										>
											Needs parent decision
										</p>
										<p class="mt-2 text-2xl font-semibold text-white">{pendingChildTasks.length}</p>
										<p class="mt-1 text-xs text-slate-400">
											Completed child handoff{pendingChildTasks.length === 1 ? '' : 's'} waiting on parent
											review.
										</p>
									</div>
									<div class="rounded-xl border border-sky-900/60 bg-sky-950/20 p-3">
										<p class="text-[0.7rem] font-semibold tracking-[0.16em] text-sky-200 uppercase">
											Still moving
										</p>
										<p class="mt-2 text-2xl font-semibold text-white">{activeChildTasks.length}</p>
										<p class="mt-1 text-xs text-slate-400">
											Child task{activeChildTasks.length === 1 ? '' : 's'} still running, queued, or blocked.
										</p>
									</div>
									<div class="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3">
										<p
											class="text-[0.7rem] font-semibold tracking-[0.16em] text-emerald-200 uppercase"
										>
											Accepted
										</p>
										<p class="mt-2 text-2xl font-semibold text-white">
											{acceptedChildTasks.length}
										</p>
										<p class="mt-1 text-xs text-slate-400">
											Child task{acceptedChildTasks.length === 1 ? '' : 's'} already integrated into the
											parent workflow.
										</p>
									</div>
								</div>

								<div class="mt-4 space-y-4">
									{#if pendingChildTasks.length > 0}
										<section class="space-y-3">
											<div class="flex flex-wrap items-center justify-between gap-2">
												<div>
													<h4 class="text-sm font-semibold text-white">Needs parent decision</h4>
													<p class="mt-1 text-xs text-slate-400">
														Review these completed handoffs first so the branch can move forward
														cleanly.
													</p>
												</div>
												<span
													class="badge border border-amber-900/70 bg-amber-950/40 text-[0.7rem] tracking-[0.2em] text-amber-200 uppercase"
												>
													{pendingChildTasks.length} awaiting review
												</span>
											</div>
											{#each pendingChildTasks as childTask (childTask.id)}
												<div class="rounded-xl border border-amber-900/50 bg-slate-950/80 p-4">
													<div
														class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
													>
														<div class="min-w-0 flex-1">
															<div class="flex flex-wrap items-center gap-2">
																<a
																	class="ui-wrap-anywhere text-sm font-medium text-sky-300 transition hover:text-sky-200"
																	href={childTaskOpenHref(childTask)}
																>
																	{childTask.title}
																</a>
																<span
																	class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(childTask.status)}`}
																>
																	{formatTaskStatusLabel(childTask.status)}
																</span>
																<span
																	class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${childTaskIntegrationToneClass(childTask)}`}
																>
																	{childTaskIntegrationLabel(childTask)}
																</span>
															</div>
															<p class="mt-2 text-xs text-slate-500">
																{childTask.projectName} · Updated {childTask.updatedAtLabel}
															</p>
															{#if childTask.delegationPacket?.objective || childTask.delegationPacket?.expectedDeliverable || childTask.delegationPacket?.doneCondition}
																<div class="mt-3 space-y-2 text-xs text-slate-400">
																	{#if childTask.delegationPacket?.objective}
																		<p>Objective: {childTask.delegationPacket.objective}</p>
																	{/if}
																	{#if childTask.delegationPacket?.expectedDeliverable}
																		<p>
																			Deliverable: {childTask.delegationPacket.expectedDeliverable}
																		</p>
																	{/if}
																	{#if childTask.delegationPacket?.doneCondition}
																		<p>
																			Done condition: {childTask.delegationPacket.doneCondition}
																		</p>
																	{/if}
																</div>
															{/if}
														</div>
														<div class="flex flex-wrap gap-2">
															<a
																class="btn border border-slate-700 bg-slate-950/70 text-xs font-semibold text-slate-100"
																href={childTaskOpenHref(childTask)}
															>
																{childTaskOpenLabel(childTask)}
															</a>
														</div>
													</div>
													<div
														class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
													>
														{#if childTask.delegationAcceptance}
															<p class="text-xs text-slate-500">
																Accepted {childTask.delegationAcceptance.acceptedAtLabel}
															</p>
														{:else}
															<p class="text-xs text-slate-500">
																Waiting for the parent to accept or return the handoff.
															</p>
														{/if}
														{#if !readOnly}
															<div class="flex flex-col gap-3 sm:flex-row">
																<form method="POST" action={taskAction('acceptChildHandoff')}>
																	<input type="hidden" name="childTaskId" value={childTask.id} />
																	<button
																		class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200"
																		type="submit"
																	>
																		Accept handoff
																	</button>
																</form>
																<form
																	method="POST"
																	action={taskAction('requestChildHandoffChanges')}
																>
																	<input type="hidden" name="childTaskId" value={childTask.id} />
																	<button
																		class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
																		type="submit"
																	>
																		Request follow-up
																	</button>
																</form>
															</div>
														{/if}
													</div>
												</div>
											{/each}
										</section>
									{/if}

									{#if activeChildTasks.length > 0}
										<section class="space-y-3">
											<div class="flex flex-wrap items-center justify-between gap-2">
												<div>
													<h4 class="text-sm font-semibold text-white">Still moving</h4>
													<p class="mt-1 text-xs text-slate-400">
														These delegated tasks are still in progress, queued, or blocked.
													</p>
												</div>
												<span
													class="badge border border-sky-900/70 bg-sky-950/40 text-[0.7rem] tracking-[0.2em] text-sky-200 uppercase"
												>
													{activeChildTasks.length} active
												</span>
											</div>
											{#each activeChildTasks as childTask (childTask.id)}
												<div class="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
													<div
														class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
													>
														<div class="min-w-0 flex-1">
															<div class="flex flex-wrap items-center gap-2">
																<a
																	class="ui-wrap-anywhere text-sm font-medium text-sky-300 transition hover:text-sky-200"
																	href={childTaskOpenHref(childTask)}
																>
																	{childTask.title}
																</a>
																<span
																	class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(childTask.status)}`}
																>
																	{formatTaskStatusLabel(childTask.status)}
																</span>
																<span
																	class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${childTaskIntegrationToneClass(childTask)}`}
																>
																	{childTaskIntegrationLabel(childTask)}
																</span>
															</div>
															<p class="mt-2 text-xs text-slate-500">
																{childTask.projectName} · Updated {childTask.updatedAtLabel}
															</p>
															{#if childTask.delegationPacket?.objective || childTask.delegationPacket?.expectedDeliverable || childTask.delegationPacket?.doneCondition}
																<div class="mt-3 space-y-2 text-xs text-slate-400">
																	{#if childTask.delegationPacket?.objective}
																		<p>Objective: {childTask.delegationPacket.objective}</p>
																	{/if}
																	{#if childTask.delegationPacket?.expectedDeliverable}
																		<p>
																			Deliverable: {childTask.delegationPacket.expectedDeliverable}
																		</p>
																	{/if}
																	{#if childTask.delegationPacket?.doneCondition}
																		<p>
																			Done condition: {childTask.delegationPacket.doneCondition}
																		</p>
																	{/if}
																</div>
															{/if}
														</div>
														<div class="flex flex-wrap gap-2">
															<a
																class="btn border border-slate-700 bg-slate-950/70 text-xs font-semibold text-slate-100"
																href={childTaskOpenHref(childTask)}
															>
																{childTaskOpenLabel(childTask)}
															</a>
														</div>
													</div>
												</div>
											{/each}
										</section>
									{/if}

									{#if acceptedChildTasks.length > 0}
										<section class="space-y-3">
											<div class="flex flex-wrap items-center justify-between gap-2">
												<div>
													<h4 class="text-sm font-semibold text-white">Already accepted</h4>
													<p class="mt-1 text-xs text-slate-400">
														Accepted child tasks stay visible here so the parent branch remains easy
														to audit.
													</p>
												</div>
												<span
													class="badge border border-emerald-900/70 bg-emerald-950/40 text-[0.7rem] tracking-[0.2em] text-emerald-200 uppercase"
												>
													{acceptedChildTasks.length} accepted
												</span>
											</div>
											{#each acceptedChildTasks as childTask (childTask.id)}
												<div class="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
													<div
														class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
													>
														<div class="min-w-0 flex-1">
															<div class="flex flex-wrap items-center gap-2">
																<a
																	class="ui-wrap-anywhere text-sm font-medium text-sky-300 transition hover:text-sky-200"
																	href={childTaskOpenHref(childTask)}
																>
																	{childTask.title}
																</a>
																<span
																	class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(childTask.status)}`}
																>
																	{formatTaskStatusLabel(childTask.status)}
																</span>
																<span
																	class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${childTaskIntegrationToneClass(childTask)}`}
																>
																	{childTaskIntegrationLabel(childTask)}
																</span>
															</div>
															<p class="mt-2 text-xs text-slate-500">
																{childTask.projectName} · Updated {childTask.updatedAtLabel}
															</p>
															{#if childTask.delegationAcceptance}
																<p class="mt-2 text-xs text-slate-500">
																	Accepted {childTask.delegationAcceptance.acceptedAtLabel}
																</p>
															{/if}
														</div>
														<div class="flex flex-wrap gap-2">
															<a
																class="btn border border-slate-700 bg-slate-950/70 text-xs font-semibold text-slate-100"
																href={childTaskOpenHref(childTask)}
															>
																{childTaskOpenLabel(childTask)}
															</a>
														</div>
													</div>
												</div>
											{/each}
										</section>
									{/if}
								</div>
							{/if}
						</div>

						<div class="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<div>
									<p class="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
										Decompose parent task
									</p>
									<p class="mt-2 text-sm text-white">
										Create up to three bounded child tasks with explicit specialist roles and
										handoff contracts.
									</p>
								</div>
								<span
									class="badge border border-amber-900/70 bg-amber-950/40 text-[0.7rem] tracking-[0.2em] text-amber-300 uppercase"
								>
									Fan-out limit: 3
								</span>
							</div>

							{#if remainingChildSlots === 0}
								<p
									class="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-300"
								>
									This task already owns the maximum number of delegated child tasks for the current
									orchestration flow.
								</p>
							{:else if !readOnly}
								<form class="mt-4 space-y-4" method="POST" action={taskAction('decomposeTask')}>
									{#each [0, 1, 2] as index (index)}
										<fieldset class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
											<div class="flex flex-wrap items-center justify-between gap-3">
												<label
													class="inline-flex items-center gap-2 text-sm font-medium text-white"
												>
													<input
														class="h-4 w-4 rounded border-slate-700 bg-slate-950 text-sky-400 focus:ring-sky-500"
														type="checkbox"
														name={`decompositionEnabled${index}`}
														value="true"
													/>
													<span>Child template {index + 1}</span>
												</label>
												<p class="text-xs text-slate-500">
													Use only the rows you need. Keep each child scoped to one clear
													deliverable.
												</p>
											</div>

											<div class="mt-4 grid gap-4 lg:grid-cols-2">
												<label class="grid gap-2">
													<span
														class="text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase"
													>
														Child title
													</span>
													<input
														class="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
														type="text"
														name={`decompositionTitle${index}`}
														placeholder="Specialist child task title"
													/>
												</label>

												<label class="grid gap-2">
													<span
														class="text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase"
													>
														Desired role
													</span>
													<select
														class="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
														name={`decompositionDesiredRoleId${index}`}
													>
														<option value="">Select a specialist role</option>
														{#each roles as role (role.id)}
															<option value={role.id}>{role.name}</option>
														{/each}
													</select>
												</label>

												<label class="grid gap-2 lg:col-span-2">
													<span
														class="text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase"
													>
														Child brief
													</span>
													<textarea
														class="min-h-24 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
														name={`decompositionInstructions${index}`}
														placeholder="Describe the bounded work this child should execute."
													></textarea>
												</label>

												<label class="grid gap-2">
													<span
														class="text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase"
													>
														Delegation objective
													</span>
													<textarea
														class="min-h-24 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
														name={`decompositionObjective${index}`}
														placeholder="What specialized outcome should this child own?"
													></textarea>
												</label>

												<label class="grid gap-2">
													<span
														class="text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase"
													>
														Expected deliverable
													</span>
													<textarea
														class="min-h-24 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
														name={`decompositionExpectedDeliverable${index}`}
														placeholder="Artifact, document, code change, or analysis expected back from the child."
													></textarea>
												</label>

												<label class="grid gap-2 lg:col-span-2">
													<span
														class="text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase"
													>
														Done condition
													</span>
													<textarea
														class="min-h-24 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
														name={`decompositionDoneCondition${index}`}
														placeholder="What must be true before the parent should accept the handoff?"
													></textarea>
												</label>
											</div>
										</fieldset>
									{/each}

									<div class="flex flex-wrap items-center justify-between gap-3">
										<p class="text-xs text-slate-500">
											Child tasks inherit the parent project, goal, governance settings, execution
											requirements, and sandbox defaults.
										</p>
										<button
											class="btn border border-amber-800/70 bg-amber-950/40 font-semibold text-amber-200"
											type="submit"
										>
											Create delegated child tasks
										</button>
									</div>
								</form>
							{:else}
								<p
									class="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-300"
								>
									Delegation and approval actions stay on the full task page.
								</p>
							{/if}
						</div>
					</div>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Goal link</p>
					{#if task.goalId}
						<a
							class="mt-2 inline-flex text-sm font-medium text-sky-300 transition hover:text-sky-200"
							href={resolve(`/app/goals/${task.goalId}`)}
						>
							{task.goalName || task.goalId}
						</a>
					{:else}
						<p class="mt-2 text-sm text-white">No goal linked</p>
					{/if}
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Blocked reason
					</p>
					<p class="mt-2 text-sm text-white">{task.blockedReason || 'No blocker recorded'}</p>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Dependencies
							</p>
							<p class="mt-2 text-sm text-white">
								Tasks this work item depends on before it can move cleanly.
							</p>
						</div>
						<span
							class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
						>
							{dependencyTasks.length}
						</span>
					</div>

					{#if dependencyTasks.length === 0}
						<p class="mt-4 text-sm text-slate-400">No dependencies recorded.</p>
					{:else}
						<div class="mt-4 space-y-3">
							{#each dependencyTasks as dependency (dependency.id)}
								<div class="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3">
									<div class="flex flex-wrap items-center justify-between gap-3">
										<a
											class="ui-wrap-anywhere text-sm font-medium text-sky-300 transition hover:text-sky-200"
											href={resolve(`/app/tasks/${dependency.id}`)}
										>
											{dependency.title}
										</a>
										<span
											class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(dependency.status)}`}
										>
											{formatTaskStatusLabel(dependency.status)}
										</span>
									</div>
									<p class="mt-2 text-xs text-slate-500">{dependency.projectName}</p>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Recent decisions
							</p>
							<p class="mt-2 text-sm text-white">
								Planning, review, approval, and recovery decisions recorded for this task.
							</p>
						</div>
						<span
							class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
						>
							{recentDecisions.length}
						</span>
					</div>

					{#if recentDecisions.length === 0}
						<p class="mt-4 text-sm text-slate-400">
							No decisions are recorded for this task yet. Reviews, approvals, and recovery actions
							will appear here after work starts moving.
						</p>
					{:else}
						<div class="mt-4 space-y-3">
							{#each recentDecisions as decision (decision.id)}
								<article class="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3">
									<div class="flex flex-wrap items-center justify-between gap-3">
										<span
											class="badge border border-amber-900/70 bg-amber-950/40 text-[0.7rem] tracking-[0.2em] text-amber-300 uppercase"
										>
											{formatDecisionTypeLabel(decision.decisionType)}
										</span>
										<p class="text-xs text-slate-500">{decision.createdAtLabel}</p>
									</div>
									<p class="mt-3 text-sm leading-6 text-white">{decision.summary}</p>
								</article>
							{/each}
						</div>
					{/if}
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Dependencies
					</p>
					{#if dependencyTasks.length === 0}
						<p class="mt-2 text-sm text-slate-400">
							No dependencies are recorded. This task can proceed independently unless you add a
							blocker or upstream task.
						</p>
					{:else}
						<div class="mt-3 space-y-3">
							{#each dependencyTasks as dependency (dependency.id)}
								<a
									class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3 transition hover:border-sky-400/40"
									href={resolve(`/app/tasks/${dependency.id}`)}
								>
									<span class="text-sm text-white">{dependency.title}</span>
									<span
										class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(dependency.status)}`}
									>
										{formatTaskStatusLabel(dependency.status)}
									</span>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</DetailSection>
</div>
