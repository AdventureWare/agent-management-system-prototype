<script lang="ts">
	import { resolve } from '$app/paths';
	import AppButton from '$lib/components/AppButton.svelte';
	import DetailFactCard from '$lib/components/DetailFactCard.svelte';
	import { getTaskThreadReviewHref } from '$lib/task-thread-context';
	import ThreadActivityIndicator from '$lib/components/ThreadActivityIndicator.svelte';
	import { formatThreadStateLabel } from '$lib/thread-activity';
	import type { AgentThreadDetail } from '$lib/types/agent-thread';

	type ProjectView = {
		id: string;
	};

	type SkillPreviewView = {
		id: string;
		description?: string | null;
		sourceLabel: string;
	};

	type AvailableSkillsView = {
		totalCount: number;
		projectCount: number;
		globalCount: number;
		previewSkills: SkillPreviewView[];
	};

	type StalledRecoveryView = {
		eligible: boolean;
		headline: string;
		detail: string;
	};

	type TaskOverviewView = {
		projectName: string;
		assigneeName: string;
		desiredRoleName?: string | null;
		desiredRoleId?: string | null;
		runCount: number;
		updatedAtLabel: string;
		targetDate?: string | null;
		linkThread?: AgentThreadDetail | null;
		statusThread?: AgentThreadDetail | null;
	};

	let {
		onRefresh,
		isRefreshing,
		showLiveUpdates,
		autoRefreshIntervalLabel,
		refreshError,
		actionBasePath = '',
		readOnly = false,
		task,
		project,
		threadActionLabel,
		availableSkills,
		formMessage,
		updateSuccess,
		attachSuccess,
		removeAttachmentSuccess,
		threadAssignSuccess,
		launchSuccess,
		recoverSuccess,
		submittedThreadId,
		governanceSuccessMessage,
		runTaskDisabled,
		runTaskDisabledTitle,
		runTaskDisabledMessage,
		taskHasActiveRun,
		stalledRecovery
	}: {
		onRefresh: () => void;
		isRefreshing: boolean;
		showLiveUpdates: boolean;
		autoRefreshIntervalLabel: string;
		refreshError: string | null;
		actionBasePath?: string;
		readOnly?: boolean;
		task: TaskOverviewView;
		project: ProjectView | null;
		threadActionLabel: string;
		availableSkills: AvailableSkillsView;
		formMessage?: string;
		updateSuccess: boolean;
		attachSuccess: boolean;
		removeAttachmentSuccess: boolean;
		threadAssignSuccess: boolean;
		launchSuccess: boolean;
		recoverSuccess: boolean;
		submittedThreadId: string;
		governanceSuccessMessage: string;
		runTaskDisabled: boolean;
		runTaskDisabledTitle: string;
		runTaskDisabledMessage: string;
		taskHasActiveRun: boolean;
		stalledRecovery: StalledRecoveryView | null;
	} = $props();

	function formatDateLabel(value: string | null | undefined) {
		if (!value) {
			return 'Not set';
		}

		const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));

		if (!year || !month || !day) {
			return value;
		}

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(Date.UTC(year, month - 1, day)));
	}

	function taskAction(actionName: string) {
		return actionBasePath ? `${actionBasePath}?/${actionName}` : `?/${actionName}`;
	}
</script>

<div class="space-y-4">
	<div class="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-400">
		<button
			class="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2 font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
			type="button"
			onclick={onRefresh}
			disabled={isRefreshing}
		>
			{isRefreshing ? 'Refreshing...' : 'Refresh state'}
		</button>
		{#if showLiveUpdates}
			<span
				class="rounded-full border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-emerald-200"
			>
				Live updates every {autoRefreshIntervalLabel} while work is active
			</span>
		{/if}
		{#if refreshError}
			<span class="rounded-full border border-rose-900/70 bg-rose-950/40 px-3 py-2 text-rose-200">
				{refreshError}
			</span>
		{/if}
	</div>

	<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
		<DetailFactCard
			label="Project"
			value={task.projectName}
			href={project ? resolve(`/app/projects/${project.id}`) : undefined}
			hrefLabel={project ? 'Open project details' : undefined}
			class="card border border-slate-800 bg-slate-950/70 p-4"
			labelClass="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase"
			valueClass="ui-wrap-anywhere mt-3 text-lg font-semibold text-white"
		/>
		<DetailFactCard
			label="Assignee"
			value={task.assigneeName}
			detail={`Desired role: ${task.desiredRoleName || task.desiredRoleId || 'Not set'}`}
			class="card border border-slate-800 bg-slate-950/70 p-4"
			labelClass="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase"
			valueClass="ui-wrap-anywhere mt-3 text-lg font-semibold text-white"
			detailClass="ui-wrap-anywhere mt-2 text-sm text-slate-400"
		/>
		<DetailFactCard
			label="Runs recorded"
			value={task.runCount}
			detail={`Updated ${task.updatedAtLabel}`}
			class="card border border-slate-800 bg-slate-950/70 p-4"
			labelClass="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase"
			valueClass="mt-3 text-3xl font-semibold text-white"
			detailClass="mt-2 text-sm text-slate-400"
		/>
		<DetailFactCard
			label="Target date"
			value={formatDateLabel(task.targetDate)}
			detail={task.targetDate
				? `Scheduled for ${task.targetDate}`
				: 'Set a task-level target date to make queue timing visible.'}
			class="card border border-slate-800 bg-slate-950/70 p-4"
			labelClass="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase"
			valueClass="mt-3 text-lg font-semibold text-white"
			detailClass="mt-2 text-sm text-slate-400"
		/>
		<DetailFactCard
			label="Thread access"
			class="card border border-slate-800 bg-slate-950/70 p-4"
			labelClass="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase"
		>
			{#if task.linkThread}
				<div class="mt-1 flex flex-wrap items-center gap-3">
					<AppButton
						href={resolve(getTaskThreadReviewHref(task.linkThread.id))}
						size="sm"
						variant="accent"
						reserveLabel="Open assigned thread"
					>
						{threadActionLabel}
					</AppButton>
					<p class="ui-wrap-anywhere text-sm font-medium text-white">{task.linkThread.name}</p>
				</div>
				{#if task.statusThread}
					<div class="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2">
						<ThreadActivityIndicator compact thread={task.statusThread} />
					</div>
				{/if}
				{#if task.linkThread.id !== task.statusThread?.id}
					<p class="mt-2 text-xs text-slate-500">
						{formatThreadStateLabel(task.linkThread.threadState ?? 'idle')}
					</p>
				{/if}
			{:else}
				<p class="mt-1 text-lg font-semibold text-white">None yet</p>
				<p class="mt-2 text-sm text-slate-400">
					Launch the task to create a thread, or assign an existing thread below.
				</p>
			{/if}
		</DetailFactCard>
	</div>

	<section class="card border border-slate-800 bg-slate-950/70 px-5 py-4">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Skill access</p>
				<p class="mt-2 text-sm text-white">
					{availableSkills.totalCount === 0
						? 'No installed skills were discovered for this task workspace yet.'
						: `${availableSkills.totalCount} installed skill${availableSkills.totalCount === 1 ? '' : 's'} are available to new task threads.`}
				</p>
				<p class="mt-1 text-sm text-slate-400">
					{availableSkills.projectCount} project-local · {availableSkills.globalCount} global
				</p>
			</div>

			{#if availableSkills.previewSkills.length > 0}
				<div class="flex flex-wrap gap-2 lg:max-w-2xl lg:justify-end">
					{#each availableSkills.previewSkills as skill (skill.id)}
						<span
							class="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-200"
							title={skill.description || undefined}
						>
							{skill.id}
							<span class="text-slate-500"> · {skill.sourceLabel}</span>
						</span>
					{/each}
				</div>
			{/if}
		</div>
	</section>

	{#if formMessage}
		<p
			aria-live="polite"
			class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
		>
			{formMessage}
		</p>
	{/if}

	{#if updateSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Task updates saved.
		</p>
	{:else if attachSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			File attached to the task.
		</p>
	{:else if removeAttachmentSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Attachment removed from the task.
		</p>
	{:else if threadAssignSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Thread assignment updated.
		</p>
	{:else if launchSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Task queued in its work thread.
			{#if submittedThreadId}
				<a class="underline" href={resolve(`/app/threads/${submittedThreadId}`)}>
					Open thread details
				</a>
				to review the queued work.
			{/if}
		</p>
	{:else if recoverSuccess}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Recovered the stalled run and queued fresh work.
			{#if submittedThreadId}
				<a class="underline" href={resolve(`/app/threads/${submittedThreadId}`)}>
					Open thread details
				</a>
				to review the recovered work.
			{/if}
		</p>
	{:else if governanceSuccessMessage}
		<p
			aria-live="polite"
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			{governanceSuccessMessage}
		</p>
	{/if}

	{#if runTaskDisabled}
		<section class="card border border-sky-900/50 bg-sky-950/25 px-5 py-4">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<p class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase">
						Run availability
					</p>
					<p class="mt-2 text-sm font-medium text-sky-100">{runTaskDisabledTitle}</p>
					<p class="mt-1 text-sm text-sky-100/80">{runTaskDisabledMessage}</p>
					{#if stalledRecovery?.eligible}
						<div class="mt-4 rounded-2xl border border-amber-900/50 bg-amber-950/25 px-4 py-3">
							<p class="text-xs font-semibold tracking-[0.16em] text-amber-300 uppercase">
								Stalled recovery
							</p>
							<p class="mt-2 text-sm font-medium text-amber-100">{stalledRecovery.headline}</p>
							<p class="mt-1 text-sm text-amber-100/80">{stalledRecovery.detail}</p>
						</div>
					{/if}
				</div>
				<div class="flex flex-col gap-3 sm:items-end">
					{#if taskHasActiveRun && task.linkThread}
						<a
							class="inline-flex w-full items-center justify-center rounded-full border border-sky-800/60 px-4 py-2 text-sm font-medium text-sky-200 transition hover:border-sky-500/60 hover:text-sky-100 sm:w-auto"
							href={resolve(getTaskThreadReviewHref(task.linkThread.id))}
						>
							{threadActionLabel || 'Open current work thread'}
						</a>
					{/if}
					{#if !readOnly && stalledRecovery?.eligible}
						<button
							class="inline-flex w-full items-center justify-center rounded-full border border-amber-700/70 bg-amber-950/40 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-500/60 hover:text-white sm:w-auto"
							type="submit"
							form="task-update-form"
							formaction={taskAction('recoverTaskSession')}
						>
							Recover stalled run
						</button>
					{/if}
				</div>
			</div>
		</section>
	{/if}
</div>
