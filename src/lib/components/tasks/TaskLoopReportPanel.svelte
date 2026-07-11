<script lang="ts">
	import DetailSection from '$lib/components/DetailSection.svelte';
	import {
		formatEnumLabel,
		formatReviewStatusLabel,
		formatTaskApprovalModeLabel,
		formatTaskStatusLabel,
		taskStatusToneClass
	} from '$lib/types/control-plane';

	type TaskLoopReportView = {
		task: {
			id: string;
			status: string;
			blockedReason: string;
		};
		classification: {
			value: string;
			actionable: boolean;
			reasons: Array<{
				code: string;
				message: string;
			}>;
			recommendationKind: string;
			recommendationReason: string;
		};
		readiness: {
			readinessMode: string;
			effectiveRigorProfile: string | null;
			hasUnmetDependencies: boolean;
			hasOpenReview: boolean;
			hasPendingApproval: boolean;
			isTerminal: boolean;
		};
		latestRun: {
			id: string;
			status: string;
			resultSummary?: string;
			validationSummary?: string;
			updatedAt: string;
		} | null;
		openReview: {
			id: string;
			status: string;
			summary: string;
		} | null;
		pendingApproval: {
			id: string;
			mode: string;
			status: string;
			summary: string;
		} | null;
		dependencies: {
			open: Array<{
				id: string;
				title: string;
				status: string;
			}>;
			missingTaskIds: string[];
		};
		followUps: {
			openCount: number;
			tasks: Array<{
				id: string;
				title: string;
				status: string;
			}>;
		};
		artifacts: {
			allPaths: string[];
		};
		decisions: Array<{
			id: string;
			decisionType: string;
			summary: string;
		}>;
		workPacket: {
			mode: string;
			recommendationKind: string;
			command: string;
		} | null;
		nextAction: {
			action: string;
			reason: string;
			suggestedCommands: string[];
		};
		source: {
			readOnly: true;
		};
	};

	let { report }: { report: TaskLoopReportView | null } = $props();

	let primaryReason = $derived(report?.classification.reasons[0]?.message ?? '');
	let openGateCount = $derived(
		(report?.readiness.hasOpenReview ? 1 : 0) + (report?.readiness.hasPendingApproval ? 1 : 0)
	);
	let dependencyIssueCount = $derived(
		(report?.dependencies.open.length ?? 0) + (report?.dependencies.missingTaskIds.length ?? 0)
	);

	function formatCommand(command: string) {
		return command.replace(/:/g, ' ');
	}
</script>

{#if report}
	<DetailSection
		id="task-loop-report"
		eyebrow="Control loop"
		title="Task loop report"
		description="Canonical readback for the selected task across execution, governance, dependencies, artifacts, and next action."
		bodyClass="space-y-5"
	>
		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
				<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
					Classification
				</p>
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<span
						class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(report.task.status)}`}
					>
						{formatTaskStatusLabel(report.task.status)}
					</span>
					<span
						class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
					>
						{formatEnumLabel(report.classification.value)}
					</span>
				</div>
				<p class="ui-wrap-anywhere mt-3 text-sm text-slate-300">
					{primaryReason || report.classification.recommendationReason}
				</p>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
				<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Next action</p>
				<p class="mt-3 text-sm font-semibold text-white">
					{formatEnumLabel(report.nextAction.action)}
				</p>
				<p class="ui-wrap-anywhere mt-2 text-sm text-slate-400">{report.nextAction.reason}</p>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
				<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Gates</p>
				<p class="mt-3 text-sm font-semibold text-white">
					{openGateCount === 0
						? 'No open gates'
						: `${openGateCount} open gate${openGateCount === 1 ? '' : 's'}`}
				</p>
				<p class="mt-2 text-sm text-slate-400">
					{report.openReview
						? `Review ${formatReviewStatusLabel(report.openReview.status)}`
						: report.pendingApproval
							? `${formatTaskApprovalModeLabel(report.pendingApproval.mode)} pending`
							: 'Review and approval are clear.'}
				</p>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
				<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Evidence</p>
				<p class="mt-3 text-sm font-semibold text-white">
					{report.latestRun
						? `Latest run ${formatEnumLabel(report.latestRun.status)}`
						: 'No run evidence'}
				</p>
				<p class="mt-2 text-sm text-slate-400">
					{report.artifacts.allPaths.length} artifact path{report.artifacts.allPaths.length === 1
						? ''
						: 's'}
					· {report.decisions.length} decision{report.decisions.length === 1 ? '' : 's'}
				</p>
			</div>
		</div>

		<div class="grid gap-4 lg:grid-cols-3">
			<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Dependencies
					</p>
					<span
						class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
					>
						{dependencyIssueCount} open
					</span>
				</div>
				{#if report.dependencies.open.length === 0 && report.dependencies.missingTaskIds.length === 0}
					<p class="mt-3 text-sm text-slate-400">No open dependency issues.</p>
				{:else}
					<ul class="mt-3 space-y-2">
						{#each report.dependencies.open.slice(0, 3) as dependency (dependency.id)}
							<li class="ui-wrap-anywhere text-sm text-slate-300">
								{dependency.title}
								<span class="text-slate-500">· {formatTaskStatusLabel(dependency.status)}</span>
							</li>
						{/each}
						{#each report.dependencies.missingTaskIds.slice(0, 3) as dependencyId (dependencyId)}
							<li class="ui-wrap-anywhere text-sm text-amber-300">
								Missing dependency record {dependencyId}
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Follow-ups</p>
					<span
						class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
					>
						{report.followUps.openCount} open
					</span>
				</div>
				{#if report.followUps.tasks.length === 0}
					<p class="mt-3 text-sm text-slate-400">No linked follow-up tasks from the latest run.</p>
				{:else}
					<ul class="mt-3 space-y-2">
						{#each report.followUps.tasks.slice(0, 3) as followUp (followUp.id)}
							<li class="ui-wrap-anywhere text-sm text-slate-300">
								{followUp.title}
								<span class="text-slate-500">· {formatTaskStatusLabel(followUp.status)}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
					Agent readback
				</p>
				<div class="mt-3 flex flex-wrap gap-2">
					{#each report.nextAction.suggestedCommands.slice(0, 4) as command (command)}
						<span
							class="inline-flex max-w-full items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-center text-xs leading-none text-slate-200"
						>
							{formatCommand(command)}
						</span>
					{/each}
				</div>
				{#if report.workPacket}
					<p class="ui-wrap-anywhere mt-3 text-xs text-slate-500">{report.workPacket.command}</p>
				{/if}
			</div>
		</div>
	</DetailSection>
{/if}
