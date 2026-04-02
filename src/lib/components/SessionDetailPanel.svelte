<script lang="ts">
	import { resolve } from '$app/paths';
	import { fetchAgentThread } from '$lib/client/agent-threads';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailFactCard from '$lib/components/DetailFactCard.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import {
		ACTIVE_REFRESH_INTERVAL_MS,
		ACTIVITY_CLOCK_INTERVAL_MS,
		formatActivityAge,
		formatThreadStateLabel,
		getThreadActivityMeta
	} from '$lib/thread-activity';
	import ThreadActivityIndicator from '$lib/components/ThreadActivityIndicator.svelte';
	import {
		approvalStatusToneClass,
		formatApprovalStatusLabel,
		formatReviewStatusLabel,
		formatTaskApprovalModeLabel,
		formatTaskStatusLabel,
		reviewStatusToneClass
	} from '$lib/types/control-plane';
	import type { AgentRunDetail, AgentRunStatus, AgentThreadDetail } from '$lib/types/agent-session';
	import { fade } from 'svelte/transition';

	type TaskResponseAction = {
		taskId: string;
		taskTitle: string;
		taskStatus: string;
		openReview: { status: string; summary: string } | null;
		pendingApproval: { mode: string; status: string; summary: string } | null;
		canApproveAndComplete: boolean;
		helperText: string;
		disabledReason: string;
	};

	type ThreadFocusTask = {
		id: string;
		title: string;
		status: string;
		isPrimary: boolean;
		source: 'resolved' | 'linked';
	};

	let {
		session: sessionProp,
		sandboxOptions,
		taskResponseAction = null,
		form = null,
		backHref = resolve('/app/sessions')
	} = $props<{
		session: AgentThreadDetail;
		sandboxOptions: readonly string[];
		taskResponseAction?: TaskResponseAction | null;
		form?: {
			ok?: boolean;
			message?: string;
			successAction?: string;
			taskId?: string;
			sessionId?: string;
		} | null;
		backHref?: string;
	}>();

	let session = $state.raw<AgentThreadDetail | null>(null);
	let autoRefresh = $state(true);
	let isRefreshing = $state(false);
	let isCanceling = $state(false);
	let now = $state(Date.now());
	let selectedRunId = $state('');
	let followUpAttachmentInput = $state<HTMLInputElement | null>(null);
	let pendingFollowUpAttachments = $state.raw<
		{ id: string; name: string; sizeBytes: number; contentType: string }[]
	>([]);
	let sendState = $state<{ status: 'sending' | 'success' | 'error'; message: string } | null>(null);
	let pageNotice = $state<{ tone: 'success' | 'error'; message: string } | null>(null);
	let approveTaskResponseSuccess = $derived(
		form?.ok &&
			form?.successAction === 'approveTaskResponse' &&
			form?.taskId === taskResponseAction?.taskId
	);
	let updateSessionSandboxSuccess = $derived(
		form?.ok && form?.successAction === 'updateSessionSandbox' && form?.sessionId === session?.id
	);

	const timestampFormatter = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});
	type SessionStateDescriptor = {
		label: string;
		detail: string;
		className: string;
	};

	type ThreadCategorySection = {
		label: string;
		values: string[];
	};

	let selectedRun = $derived.by(() => {
		if (!session) {
			return null;
		}

		return (
			session.runs.find((run) => run.id === selectedRunId) ??
			session.latestRun ??
			session.runs[0] ??
			null
		);
	});
	let chronologicalRuns = $derived.by(() => (session ? [...session.runs].reverse() : []));
	let sessionState = $derived.by(() => (session ? describeSessionState(session) : null));
	let threadAttachments = $derived(session?.attachments ?? []);
	let latestContextRun = $derived.by(() => session?.latestRun ?? session?.runs[0] ?? null);
	let focusTask = $derived.by<ThreadFocusTask | null>(() => {
		if (taskResponseAction) {
			return {
				id: taskResponseAction.taskId,
				title: taskResponseAction.taskTitle,
				status: taskResponseAction.taskStatus,
				isPrimary: true,
				source: 'resolved'
			};
		}

		if (!session) {
			return null;
		}

		const primaryTask =
			session.relatedTasks.find((task) => task.isPrimary) ??
			(session.relatedTasks.length === 1 ? session.relatedTasks[0] : null);

		if (!primaryTask) {
			return null;
		}

		return {
			id: primaryTask.id,
			title: primaryTask.title,
			status: primaryTask.status,
			isPrimary: primaryTask.isPrimary,
			source: 'linked'
		};
	});
	let selectedHistoricalRun = $derived.by(() => {
		if (!selectedRun) {
			return null;
		}

		if (latestContextRun && selectedRun.id === latestContextRun.id) {
			return null;
		}

		return selectedRun;
	});

	$effect(() => {
		session = sessionProp;
	});

	$effect(() => {
		if (!session) {
			selectedRunId = '';
			return;
		}

		const fallbackRunId = session.latestRun?.id ?? session.runs[0]?.id ?? '';

		if (!fallbackRunId) {
			selectedRunId = '';
			return;
		}

		if (!selectedRunId || !session.runs.some((run) => run.id === selectedRunId)) {
			selectedRunId = fallbackRunId;
		}
	});

	$effect(() => {
		if (!session || !autoRefresh || !session.hasActiveRun) {
			return;
		}

		const intervalId = window.setInterval(() => {
			void refreshSession();
		}, ACTIVE_REFRESH_INTERVAL_MS);

		return () => {
			window.clearInterval(intervalId);
		};
	});

	$effect(() => {
		const intervalId = window.setInterval(() => {
			now = Date.now();
		}, ACTIVITY_CLOCK_INTERVAL_MS);

		return () => {
			window.clearInterval(intervalId);
		};
	});

	function userIsEditingFormControl() {
		const activeElement = document.activeElement;

		if (!(activeElement instanceof HTMLElement)) {
			return false;
		}

		if (activeElement.isContentEditable) {
			return true;
		}

		return ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);
	}

	function formatAttachmentSize(sizeBytes: number) {
		if (sizeBytes < 1024) {
			return `${sizeBytes} B`;
		}

		if (sizeBytes < 1024 * 1024) {
			return `${(sizeBytes / 1024).toFixed(1)} KB`;
		}

		return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function getThreadCategorySections(detail: AgentThreadDetail): ThreadCategorySection[] {
		if (!detail.categorization) {
			return [];
		}

		return [
			{ label: 'Area', values: detail.categorization.laneLabels },
			{ label: 'Focus', values: detail.categorization.focusLabels },
			{ label: 'Context', values: detail.categorization.entityLabels },
			{ label: 'Terms', values: detail.categorization.keywordLabels }
		].filter((section) => section.values.length > 0);
	}

	function createAttachmentKey(file: File) {
		return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
	}

	function syncPendingFollowUpAttachments() {
		pendingFollowUpAttachments = Array.from(followUpAttachmentInput?.files ?? []).map((file) => ({
			id: createAttachmentKey(file),
			name: file.name || 'Attachment',
			sizeBytes: file.size,
			contentType: file.type || 'Unknown type'
		}));
	}

	function replaceFollowUpAttachmentFiles(files: File[]) {
		if (!followUpAttachmentInput || typeof DataTransfer === 'undefined') {
			return;
		}

		const transfer = new DataTransfer();

		for (const file of files) {
			transfer.items.add(file);
		}

		followUpAttachmentInput.files = transfer.files;
		syncPendingFollowUpAttachments();
	}

	function mergeFollowUpAttachmentFiles(files: Iterable<File>) {
		const nextFiles = Array.from(followUpAttachmentInput?.files ?? []);

		for (const file of files) {
			if (file.size === 0) {
				continue;
			}

			const nextFileKey = createAttachmentKey(file);
			const existingIndex = nextFiles.findIndex(
				(existingFile) => createAttachmentKey(existingFile) === nextFileKey
			);

			if (existingIndex >= 0) {
				nextFiles[existingIndex] = file;
				continue;
			}

			nextFiles.push(file);
		}

		replaceFollowUpAttachmentFiles(nextFiles);
	}

	function clearPendingFollowUpAttachments() {
		if (followUpAttachmentInput) {
			followUpAttachmentInput.value = '';
		}

		pendingFollowUpAttachments = [];
	}

	function handleFollowUpAttachmentPaste(event: ClipboardEvent) {
		const pastedFiles = Array.from(event.clipboardData?.items ?? [])
			.filter((item) => item.kind === 'file')
			.map((item) => item.getAsFile())
			.filter((file): file is File => file !== null);

		if (pastedFiles.length === 0) {
			return;
		}

		mergeFollowUpAttachmentFiles(pastedFiles);
	}

	async function loadSession() {
		if (!session) {
			throw new Error('Thread not found.');
		}

		session = await fetchAgentThread(session.id);
	}

	async function refreshSession(options: { force?: boolean } = {}) {
		if (isRefreshing) {
			return;
		}

		if (!options.force && (document.hidden || userIsEditingFormControl())) {
			return;
		}

		isRefreshing = true;

		try {
			await loadSession();
			pageNotice = null;
		} catch (err) {
			pageNotice = {
				tone: 'error',
				message: err instanceof Error ? err.message : 'Could not refresh the thread.'
			};
		} finally {
			isRefreshing = false;
		}
	}

	async function cancelActiveRun() {
		if (!session || isCanceling || !session.hasActiveRun) {
			return;
		}

		isCanceling = true;

		try {
			const response = await fetch(resolve(`/api/agents/sessions/${session.id}/cancel`), {
				method: 'POST'
			});
			const payload = (await response.json()) as { error?: string };

			if (!response.ok) {
				throw new Error(payload.error ?? 'Could not cancel the active run.');
			}

			await refreshSession({ force: true });
			pageNotice = {
				tone: 'success',
				message: 'Active run canceled.'
			};
		} catch (err) {
			pageNotice = {
				tone: 'error',
				message: err instanceof Error ? err.message : 'Could not cancel the active run.'
			};
		} finally {
			isCanceling = false;
		}
	}

	async function submitFollowUp(event: SubmitEvent) {
		event.preventDefault();

		if (!session) {
			return;
		}

		const formElement = event.currentTarget;
		if (!(formElement instanceof HTMLFormElement)) {
			return;
		}

		const formData = new FormData(formElement);
		const prompt = formData.get('prompt')?.toString().trim() ?? '';
		const attachmentCount = formData
			.getAll('attachments')
			.filter((value): value is File => value instanceof File && value.size > 0).length;

		if (!prompt && attachmentCount === 0) {
			sendState = {
				status: 'error',
				message: 'Prompt or attachment is required.'
			};
			return;
		}

		if (sendState?.status === 'sending') {
			return;
		}

		sendState = {
			status: 'sending',
			message: 'Queueing follow-up...'
		};

		try {
			const response = await fetch(resolve(`/api/agents/sessions/${session.id}/messages`), {
				method: 'POST',
				body: formData
			});
			const payload = (await response.json()) as { error?: string };

			if (!response.ok) {
				throw new Error(payload.error ?? 'Could not queue thread follow-up.');
			}

			formElement.reset();
			clearPendingFollowUpAttachments();
			await refreshSession({ force: true });
			sendState = {
				status: 'success',
				message:
					attachmentCount > 0
						? attachmentCount === 1
							? 'Follow-up queued with 1 attachment.'
							: `Follow-up queued with ${attachmentCount} attachments.`
						: 'Follow-up queued.'
			};
			pageNotice = {
				tone: 'success',
				message:
					attachmentCount > 0
						? `Follow-up queued for ${session.name} with ${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}.`
						: `Follow-up queued for ${session.name}.`
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Could not queue thread follow-up.';
			sendState = {
				status: 'error',
				message
			};
			pageNotice = {
				tone: 'error',
				message
			};
		}
	}

	function selectRun(runId: string) {
		selectedRunId = runId;
	}

	function formatTimestamp(iso: string | null) {
		if (!iso) {
			return 'Not available';
		}

		return timestampFormatter.format(new Date(iso));
	}

	function sessionStatusClass(state: AgentThreadDetail['sessionState']) {
		switch (state) {
			case 'working':
				return 'border border-emerald-800/70 bg-emerald-950/50 text-emerald-300';
			case 'starting':
				return 'border border-violet-800/70 bg-violet-950/50 text-violet-300';
			case 'waiting':
			case 'ready':
				return 'border border-sky-800/70 bg-sky-950/50 text-sky-300';
			case 'attention':
				return 'border border-rose-900/70 bg-rose-950/40 text-rose-300';
			case 'unavailable':
			default:
				return 'border border-slate-700 bg-slate-900 text-slate-300';
		}
	}

	function runStatusClass(status: AgentRunStatus | 'idle') {
		switch (status) {
			case 'running':
				return 'border border-emerald-800/70 bg-emerald-950/50 text-emerald-300';
			case 'queued':
				return 'border border-violet-800/70 bg-violet-950/50 text-violet-300';
			case 'failed':
			case 'canceled':
				return 'border border-rose-900/70 bg-rose-950/40 text-rose-300';
			case 'completed':
				return 'border border-sky-800/70 bg-sky-950/50 text-sky-300';
			default:
				return 'border border-slate-700 bg-slate-900 text-slate-300';
		}
	}

	function threadLabel(detail: AgentThreadDetail) {
		if (detail.threadId) {
			return 'Available';
		}

		return detail.hasActiveRun ? 'Pending' : 'Missing';
	}

	function resumeLabel(detail: AgentThreadDetail) {
		if (detail.hasActiveRun) {
			return 'Busy';
		}

		return detail.canResume ? 'Available' : 'Blocked';
	}

	function latestRunStatus(run: AgentRunDetail | null) {
		return run?.state?.status ?? 'idle';
	}

	function runModeLabel(run: AgentRunDetail) {
		return run.mode === 'message' ? 'Follow-up' : 'Start';
	}

	function describeSessionState(detail: AgentThreadDetail): SessionStateDescriptor {
		return {
			label: formatThreadStateLabel(detail.sessionState),
			detail: detail.sessionSummary,
			className: sessionStatusClass(detail.sessionState)
		};
	}

	function replyStateLabel(detail: AgentThreadDetail) {
		if (detail.latestRun?.lastMessage) {
			return 'Captured';
		}

		if (detail.latestRunStatus === 'running') {
			return 'Waiting';
		}

		if (detail.latestRunStatus === 'queued') {
			return 'Pending';
		}

		if (detail.latestRunStatus === 'failed' || detail.latestRunStatus === 'canceled') {
			return 'Missing';
		}

		return 'None';
	}

	function replyStateDetail(detail: AgentThreadDetail) {
		if (detail.latestRun?.lastMessage) {
			return 'A saved reply is available in the selected run.';
		}

		if (detail.latestRunStatus === 'running') {
			return 'Waiting for the first saved reply from the current run.';
		}

		if (detail.latestRunStatus === 'queued') {
			return 'The current run has not started yet.';
		}

		if (detail.latestRunStatus === 'failed' || detail.latestRunStatus === 'canceled') {
			return 'The latest run ended before a reply was captured.';
		}

		return 'No reply has been captured for the latest run.';
	}

	function responseStateLabel(run: AgentRunDetail) {
		switch (latestRunStatus(run)) {
			case 'queued':
				return 'Queued. Waiting for the agent to start.';
			case 'running':
				return 'Run in progress. No response captured yet.';
			case 'failed':
				return 'Run failed before a response was captured.';
			case 'canceled':
				return 'Run was canceled before a response was captured.';
			default:
				return 'No response captured for this run.';
		}
	}

	function responseText(run: AgentRunDetail) {
		return run.lastMessage ?? responseStateLabel(run);
	}

	function compactText(value: string, maxLength = 180) {
		const normalized = value.replace(/\s+/g, ' ').trim();

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
	}

	function executionMeta(detail: AgentThreadDetail) {
		return getThreadActivityMeta(detail, now);
	}

	function focusTaskDescription(task: ThreadFocusTask) {
		if (task.source === 'resolved') {
			return 'This thread response is tied to the current task.';
		}

		if (task.isPrimary) {
			return 'Primary task linked to this thread.';
		}

		return 'Linked task context for this thread.';
	}
</script>

{#snippet focusTaskCard(
	task: ThreadFocusTask,
	options: {
		label: string;
		description: string;
		compact?: boolean;
	}
)}
	<div
		class={[
			'rounded-xl border border-amber-800/40 bg-gradient-to-br from-amber-950/25 via-slate-950/90 to-slate-950',
			options.compact ? 'p-3' : 'p-4'
		]}
	>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0">
				<p class="text-[11px] font-semibold tracking-[0.18em] text-amber-200 uppercase">
					{options.label}
				</p>
				<p class="ui-wrap-anywhere mt-2 text-sm font-semibold text-white">{task.title}</p>
				<p class="mt-1 text-sm text-slate-300">{options.description}</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<span
					class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
				>
					{formatTaskStatusLabel(task.status)}
				</span>
				{#if task.isPrimary}
					<span
						class="inline-flex items-center justify-center rounded-full border border-amber-700/50 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none text-amber-200 uppercase"
					>
						Primary
					</span>
				{/if}
			</div>
		</div>

		<div class="mt-3 flex flex-wrap items-center justify-between gap-3">
			<p class="text-xs text-slate-400">{focusTaskDescription(task)}</p>
			<a
				class="text-sm font-medium text-amber-200 transition hover:text-amber-100"
				href={resolve(`/app/tasks/${task.id}`)}
			>
				Open task detail
			</a>
		</div>
	</div>
{/snippet}

{#snippet sessionStatus(detail: AgentThreadDetail, showFocusTask: boolean)}
	<div class="space-y-4 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<p class="text-xs font-medium tracking-[0.16em] text-slate-400 uppercase">Thread status</p>
				<h2 class="mt-1 text-lg font-semibold text-white">{sessionState?.label ?? 'Unknown'}</h2>
			</div>
			{#if sessionState}
				<span
					class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${sessionState.className}`}
				>
					{sessionState.label}
				</span>
			{/if}
		</div>

		<p class="ui-wrap-anywhere text-sm text-slate-300">
			{sessionState?.detail ?? detail.sessionSummary}
		</p>
		{#if (detail.topicLabels ?? []).length > 0}
			<div class="flex flex-wrap gap-2">
				{#each detail.topicLabels ?? [] as topicLabel (topicLabel)}
					<span
						class="inline-flex items-center justify-center rounded-full border border-sky-900/60 bg-sky-950/30 px-2 py-1 text-center text-[11px] leading-none text-sky-200 uppercase"
					>
						{topicLabel}
					</span>
				{/each}
			</div>
		{/if}
		{#if getThreadCategorySections(detail).length > 0}
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{#each getThreadCategorySections(detail) as section (section.label)}
					<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">{section.label}</p>
						<p class="mt-2 text-sm text-slate-200">{section.values.join(', ')}</p>
					</div>
				{/each}
			</div>
		{/if}
		<ThreadActivityIndicator thread={detail} {now} />
		<p class="text-xs text-slate-500">
			A work thread keeps one Codex conversation and all of its runs together. Each run in the
			history below is one start or follow-up execution inside this thread.
		</p>

		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
			<DetailFactCard
				label="Latest run"
				value={detail.latestRun ? runModeLabel(detail.latestRun) : 'None yet'}
				detail={detail.latestRun ? latestRunStatus(detail.latestRun) : 'No runs recorded'}
				class="rounded-lg border-transparent bg-black/20"
				labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
			/>
			<DetailFactCard
				label="Execution"
				value={executionMeta(detail).label}
				detail={executionMeta(detail).detail}
				class="rounded-lg border-transparent bg-black/20"
				labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
			/>
			<DetailFactCard
				label="Reply state"
				value={replyStateLabel(detail)}
				detail={replyStateDetail(detail)}
				class="rounded-lg border-transparent bg-black/20"
				labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
			/>
			<DetailFactCard
				label="Thread"
				value={threadLabel(detail)}
				detail={detail.threadId
					? 'A Codex thread id is available for follow-up work.'
					: 'No Codex thread id yet. Start the first run and the manager will attach one when it becomes available.'}
				class="rounded-lg border-transparent bg-black/20"
				labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
			/>
			<DetailFactCard
				label="Follow-up"
				value={resumeLabel(detail)}
				detail={detail.canResume
					? 'You can send the next instruction now.'
					: detail.hasActiveRun
						? 'Wait for the active run to finish first.'
						: 'This thread cannot accept a follow-up yet.'}
				class="rounded-lg border-transparent bg-black/20"
				labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
			/>
		</div>

		{#if showFocusTask && focusTask}
			{@render focusTaskCard(focusTask, {
				label: 'Current task',
				description:
					'Keep this task in view while reviewing the latest thread output or sending the next follow-up.'
			})}
		{/if}

		<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
			<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Related tasks</p>
			{#if detail.relatedTasks.length > 0}
				<div class="mt-3 flex flex-wrap gap-2">
					{#each detail.relatedTasks as task (task.id)}
						<a
							class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-1 text-center text-xs leading-none text-sky-300 transition hover:border-sky-400/40 hover:text-sky-200"
							href={resolve(`/app/tasks/${task.id}`)}
						>
							{task.title}
							{task.isPrimary ? ' · primary' : ''}
						</a>
					{/each}
				</div>
			{:else}
				<p class="mt-2 text-sm text-slate-400">
					No tasks are linked to this thread yet. Assign it from a task when you want future work to reuse this context.
				</p>
			{/if}
		</div>
	</div>
{/snippet}

{#if session}
	<AppPage width="full" class="gap-5 sm:gap-6">
		<div class="space-y-5 sm:space-y-6" data-testid="session-detail-panel">
			<DetailHeader
				backHref={resolve(backHref)}
				backLabel="Back to threads"
				eyebrow="Thread detail"
				title={session.name}
				description={session.sessionSummary}
			>
				{#snippet actions()}
					<div class="flex flex-col gap-3 sm:flex-row">
						<button
							class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100"
							type="button"
							onclick={() => {
								void refreshSession({ force: true });
							}}
						>
							{isRefreshing ? 'Refreshing...' : 'Refresh thread'}
						</button>
						{#if session!.hasActiveRun}
							<button
								class="w-full rounded-lg border border-rose-900/70 bg-rose-950/30 px-4 py-2 text-sm font-medium text-rose-200 disabled:opacity-50 sm:w-auto"
								type="button"
								onclick={() => {
									void cancelActiveRun();
								}}
								disabled={isCanceling}
							>
								{isCanceling ? 'Canceling...' : 'Cancel active run'}
							</button>
						{/if}
					</div>
				{/snippet}

				{#snippet meta()}
					<div class="space-y-4">
						<div class="flex flex-wrap items-center gap-2">
							<span
								class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${sessionStatusClass(session!.sessionState)}`}
							>
								{formatThreadStateLabel(session!.sessionState)}
							</span>
							<span
								class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(session!.latestRunStatus)}`}
							>
								latest run {session!.latestRunStatus}
							</span>
							<span
								class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
							>
								{session!.sandbox}
							</span>
							{#if session!.origin === 'external'}
								<span
									class="inline-flex items-center justify-center rounded-full border border-sky-900/70 bg-sky-950/40 px-2 py-1 text-center text-[11px] leading-none text-sky-300 uppercase"
								>
									Imported from Codex
								</span>
							{/if}
						</div>

						<label
							class="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-400"
						>
							<input bind:checked={autoRefresh} type="checkbox" />
							<span>Auto-refresh active runs every 4s</span>
						</label>

						{#if session!.relatedTasks.length > 0}
							<p class="ui-clamp-3 max-w-3xl text-xs text-slate-500">
								Related tasks: {session!.relatedTasks.map((task) => task.title).join(', ')}
							</p>
						{/if}

						<p class="ui-wrap-anywhere max-w-4xl text-xs text-slate-500">{session!.cwd}</p>
					</div>
				{/snippet}
			</DetailHeader>

			{#if pageNotice}
				<p
					class={[
						'rounded-xl px-4 py-3 text-sm',
						pageNotice.tone === 'success'
							? 'border border-emerald-900/70 bg-emerald-950/40 text-emerald-200'
							: 'border border-rose-900/70 bg-rose-950/40 text-rose-200'
					]}
					in:fade={{ duration: 150 }}
					out:fade={{ duration: 120 }}
				>
					{pageNotice.message}
				</p>
			{/if}

			{#if updateSessionSandboxSuccess}
				<p
					class="rounded-xl border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
				>
					Thread sandbox updated. Future follow-up runs will use the new access mode.
				</p>
			{/if}

			<div class="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
				<div class="space-y-6">
					<DetailSection
						eyebrow="Priority"
						title="Decision context"
						description="Start here: confirm the task, read the newest agent response, and scan the signals that affect the next decision."
						bodyClass="space-y-4"
					>
						{#if focusTask}
							{@render focusTaskCard(focusTask, {
								label: 'Current task',
								description:
									'This is the task the thread is currently anchored to while you review or reply.'
							})}
						{/if}

						<div class="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<p class="text-sm font-medium text-white">Most recent response</p>
									<p class="mt-1 text-sm text-slate-400">
										{#if latestContextRun}
											{runModeLabel(latestContextRun)} queued {formatTimestamp(
												latestContextRun.createdAt
											)}
										{:else}
											No saved response has been captured in this thread yet. Start the thread or wait for the current run to finish to populate this view.
										{/if}
									</p>
								</div>
								{#if latestContextRun}
									<div class="flex flex-wrap items-center gap-2">
										<span
											class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(latestRunStatus(latestContextRun))}`}
										>
											{latestRunStatus(latestContextRun)}
										</span>
										<span
											class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
										>
											{latestContextRun.mode}
										</span>
									</div>
								{/if}
							</div>

							{#if latestContextRun}
								<div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,0.48fr)]">
									<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
										<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Agent response</p>
										<p class="ui-wrap-anywhere mt-3 text-sm whitespace-pre-wrap text-slate-200">
											{responseText(latestContextRun)}
										</p>
									</div>

									<div class="space-y-4">
										<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
											<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">
												Latest instruction
											</p>
											<p class="ui-wrap-anywhere mt-3 text-sm whitespace-pre-wrap text-slate-300">
												{latestContextRun.prompt}
											</p>
										</div>

										<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
											<DetailFactCard
												label="Queued"
												value={formatTimestamp(latestContextRun.createdAt)}
												class="rounded-lg border-transparent bg-black/20"
												labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
											/>
											<DetailFactCard
												label="Finished"
												value={formatTimestamp(latestContextRun.state?.finishedAt ?? null)}
												class="rounded-lg border-transparent bg-black/20"
												labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
											/>
										</div>
									</div>
								</div>
							{:else}
								<p
									class="mt-4 rounded-lg border border-dashed border-slate-800 px-4 py-5 text-sm text-slate-400"
								>
									Run the thread once or wait for the current run to finish to get a saved response
									here.
								</p>
							{/if}
						</div>

						<div class="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<p class="text-sm font-medium text-white">Relevant context</p>
									<p class="mt-1 text-sm text-slate-400">{session.sessionSummary}</p>
								</div>
								<div class="flex flex-wrap items-center gap-2">
									<span
										class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${sessionStatusClass(session.sessionState)}`}
									>
										{formatThreadStateLabel(session.sessionState)}
									</span>
									<span
										class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(session.latestRunStatus)}`}
									>
										latest run {session.latestRunStatus}
									</span>
								</div>
							</div>

							<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
								<DetailFactCard
									label="Execution"
									value={executionMeta(session).label}
									detail={executionMeta(session).detail}
									class="rounded-lg border-transparent bg-black/20"
									labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
								/>
								<DetailFactCard
									label="Reply state"
									value={replyStateLabel(session)}
									detail={replyStateDetail(session)}
									class="rounded-lg border-transparent bg-black/20"
									labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
								/>
								<DetailFactCard
									label="Follow-up"
									value={resumeLabel(session)}
									detail={session.canResume
										? 'You can respond in this thread now.'
										: session.hasActiveRun
											? 'Wait for the current run to finish first.'
											: 'This thread cannot accept a follow-up yet.'}
									class="rounded-lg border-transparent bg-black/20"
									labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
								/>
								<DetailFactCard
									label="Last activity"
									value={formatActivityAge(session.lastActivityAt, now)}
									detail={formatTimestamp(session.lastActivityAt)}
									class="rounded-lg border-transparent bg-black/20"
									labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
								/>
								<DetailFactCard
									label="Attachments"
									value={threadAttachments.length}
									detail={threadAttachments.length > 0
										? 'Files stay with the thread.'
										: 'No thread files yet. Add one in the follow-up form when the next run needs extra context.'}
									class="rounded-lg border-transparent bg-black/20"
									labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
								/>
							</div>

							{#if (session.topicLabels ?? []).length > 0 || session.relatedTasks.length > 0 || taskResponseAction?.openReview || taskResponseAction?.pendingApproval}
								<div class="mt-4 space-y-3 rounded-lg border border-slate-800 bg-black/20 p-4">
									{#if (session.topicLabels ?? []).length > 0}
										<div class="flex flex-wrap gap-2">
											{#each session.topicLabels ?? [] as topicLabel (topicLabel)}
												<span
													class="inline-flex items-center justify-center rounded-full border border-sky-900/60 bg-sky-950/30 px-2 py-1 text-center text-[11px] leading-none text-sky-200 uppercase"
												>
													{topicLabel}
												</span>
											{/each}
										</div>
									{/if}

									{#if taskResponseAction?.openReview || taskResponseAction?.pendingApproval}
										<div class="flex flex-wrap gap-2">
											{#if taskResponseAction?.openReview}
												<span
													class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${reviewStatusToneClass(taskResponseAction.openReview.status)}`}
												>
													Review {formatReviewStatusLabel(taskResponseAction.openReview.status)}
												</span>
											{/if}
											{#if taskResponseAction?.pendingApproval}
												<span
													class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${approvalStatusToneClass(taskResponseAction.pendingApproval.status)}`}
												>
													{formatTaskApprovalModeLabel(taskResponseAction.pendingApproval.mode)}
													{formatApprovalStatusLabel(taskResponseAction.pendingApproval.status)}
												</span>
											{/if}
										</div>
									{/if}

									{#if session.relatedTasks.length > 0}
										<div class="flex flex-wrap gap-2">
											{#each session.relatedTasks as task (task.id)}
												<a
													class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-1 text-center text-xs leading-none text-sky-300 transition hover:border-sky-400/40 hover:text-sky-200"
													href={resolve(`/app/tasks/${task.id}`)}
												>
													{task.title}
													{task.isPrimary ? ' · primary' : ''}
												</a>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</DetailSection>

					{#if selectedHistoricalRun}
						<DetailSection
							eyebrow="Selected turn"
							title="Inspect earlier context"
							description="Use this when you need to review an older turn without losing the newest response above."
							bodyClass="space-y-4"
						>
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<p class="text-sm font-medium text-white">
										{runModeLabel(selectedHistoricalRun)} queued
										{formatTimestamp(selectedHistoricalRun.createdAt)}
									</p>
									<p class="mt-1 text-sm text-slate-400">
										You are looking at older thread context. The newest response stays pinned above.
									</p>
								</div>
								<div class="flex flex-wrap items-center gap-2">
									<span
										class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(latestRunStatus(selectedHistoricalRun))}`}
									>
										{latestRunStatus(selectedHistoricalRun)}
									</span>
									<span
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
									>
										{selectedHistoricalRun.mode}
									</span>
								</div>
							</div>

							<div class="grid gap-3 sm:grid-cols-3">
								<DetailFactCard
									label="Queued"
									value={formatTimestamp(selectedHistoricalRun.createdAt)}
								/>
								<DetailFactCard
									label="Finished"
									value={formatTimestamp(selectedHistoricalRun.state?.finishedAt ?? null)}
								/>
								<DetailFactCard
									label="Thread target"
									value={selectedHistoricalRun.requestedThreadId ?? 'Start a new thread'}
								/>
							</div>

							<div class="space-y-3">
								<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Instruction</p>
									<p class="ui-wrap-anywhere mt-2 text-sm whitespace-pre-wrap text-slate-200">
										{selectedHistoricalRun.prompt}
									</p>
								</div>

								<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Agent response</p>
									<p class="ui-wrap-anywhere mt-2 text-sm whitespace-pre-wrap text-slate-200">
										{responseText(selectedHistoricalRun)}
									</p>
								</div>
							</div>

							<details class="rounded-xl border border-slate-800 bg-black/30 p-4">
								<summary class="cursor-pointer text-sm font-medium text-slate-200">
									Selected turn log output
								</summary>
								{#if selectedHistoricalRun.logTail?.length}
									<pre
										class="ui-wrap-anywhere mt-3 max-h-80 overflow-auto text-xs whitespace-pre-wrap text-slate-300">{selectedHistoricalRun.logTail.join(
											'\n'
										)}</pre>
								{:else}
									<p class="mt-3 text-sm text-slate-400">
										No log lines were saved for this turn. Check the run detail if you expected execution output.
									</p>
								{/if}
							</details>
						</DetailSection>
					{/if}

					<DetailSection
						eyebrow="Conversation"
						title="Conversation history"
						description="Inspect each turn in the thread and open any run to read the full prompt and response."
						bodyClass="space-y-3"
					>
						{#if chronologicalRuns.length === 0}
							<p
								class="rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400"
							>
								No runs have been recorded for this thread yet. Send the first instruction from a linked task or wait for a queued run to start.
							</p>
						{:else}
							{#each chronologicalRuns as run, index (run.id)}
								<button
									class={[
										'w-full rounded-xl border p-4 text-left transition',
										selectedRun?.id === run.id
											? 'border-sky-800/70 bg-sky-950/20'
											: 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
									]}
									type="button"
									aria-pressed={selectedRun?.id === run.id}
									onclick={() => {
										selectRun(run.id);
									}}
								>
									<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
										<div class="min-w-0">
											<p class="text-sm font-medium text-white">
												Turn {index + 1} · {runModeLabel(run)}
											</p>
											<p class="mt-1 text-xs text-slate-500">
												Queued {formatTimestamp(run.createdAt)}
											</p>
										</div>
										<span
											class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(latestRunStatus(run))}`}
										>
											{latestRunStatus(run)}
										</span>
									</div>

									<div class="mt-3 grid gap-3 lg:grid-cols-2">
										<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Instruction
											</p>
											<p class="ui-clamp-3 mt-2 text-sm text-slate-300">
												{compactText(run.prompt, 180)}
											</p>
										</div>
										<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Response</p>
											<p class="ui-clamp-3 mt-2 text-sm text-slate-300">
												{compactText(responseText(run), 180)}
											</p>
										</div>
									</div>
								</button>
							{/each}
						{/if}
					</DetailSection>
				</div>

				<div class="space-y-6">
					<form class="space-y-3" onsubmit={submitFollowUp} onpaste={handleFollowUpAttachmentPaste}>
						<DetailSection
							eyebrow="Action"
							title="Send follow-up"
							description="Reply in the same thread once you have enough context. Attached files are saved onto the thread and included for the next run."
							bodyClass="space-y-3"
						>
							{#if focusTask}
								{@render focusTaskCard(focusTask, {
									label: 'Working on',
									description: 'Keep this visible while composing the next instruction.',
									compact: true
								})}
							{/if}
							<textarea
								class="min-h-40 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
								name="prompt"
								placeholder={session.canResume
									? 'Send the next instruction.'
									: session.hasActiveRun
										? 'This thread is busy until the current run finishes.'
										: 'This thread cannot resume until a Codex thread id is discovered.'}
								disabled={!session.canResume || sendState?.status === 'sending'}
							></textarea>
							<div class="space-y-3 rounded-lg border border-slate-800 bg-black/20 p-4">
								<div class="flex flex-col gap-1">
									<p class="text-sm font-medium text-white">Follow-up attachments</p>
									<p class="text-sm text-slate-400">
										Choose files or paste screenshots and copied files anywhere in this form.
									</p>
								</div>
								<label class="block">
									<span class="sr-only">Attach follow-up files</span>
									<input
										bind:this={followUpAttachmentInput}
										class="file-input w-full border border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50"
										name="attachments"
										type="file"
										multiple
										disabled={!session.canResume || sendState?.status === 'sending'}
										onchange={syncPendingFollowUpAttachments}
									/>
								</label>
								{#if pendingFollowUpAttachments.length > 0}
									<div class="space-y-3">
										<div class="flex flex-wrap items-center justify-between gap-3">
											<p class="text-sm text-slate-200">
												{pendingFollowUpAttachments.length === 1
													? '1 attachment ready to send'
													: `${pendingFollowUpAttachments.length} attachments ready to send`}
											</p>
											<button
												class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white disabled:opacity-50"
												type="button"
												disabled={sendState?.status === 'sending'}
												onclick={clearPendingFollowUpAttachments}
											>
												Clear
											</button>
										</div>
										<div class="space-y-2">
											{#each pendingFollowUpAttachments as attachment (attachment.id)}
												<div class="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-3">
													<p class="ui-wrap-anywhere text-sm font-medium text-white">
														{attachment.name}
													</p>
													<p class="mt-1 text-xs text-slate-400">
														{formatAttachmentSize(attachment.sizeBytes)} · {attachment.contentType}
													</p>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</div>
							{#if sendState}
								<p
									class={[
										'text-sm',
										sendState.status === 'error'
											? 'text-rose-300'
											: sendState.status === 'success'
												? 'text-emerald-300'
												: 'text-sky-300'
									]}
								>
									{sendState.message}
								</p>
							{/if}
							<button
								class="w-full rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-100 disabled:opacity-50 sm:w-auto"
								type="submit"
								disabled={!session.canResume || sendState?.status === 'sending'}
							>
								{sendState?.status === 'sending' ? 'Queueing...' : 'Send follow-up instruction'}
							</button>
						</DetailSection>
					</form>

					{#if taskResponseAction}
						<DetailSection
							eyebrow="Decision"
							title="Approve task response"
							description={taskResponseAction.helperText}
							bodyClass="space-y-4"
						>
							<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
								<div class="flex flex-wrap items-center justify-between gap-3">
									<div class="min-w-0">
										<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Linked task</p>
										<p class="ui-wrap-anywhere mt-2 text-sm font-medium text-white">
											{taskResponseAction.taskTitle}
										</p>
									</div>
									<span
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
									>
										{formatTaskStatusLabel(taskResponseAction.taskStatus)}
									</span>
								</div>

								<div class="mt-3 flex flex-wrap gap-2">
									{#if taskResponseAction.openReview}
										<span
											class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${reviewStatusToneClass(taskResponseAction.openReview.status)}`}
										>
											Review {formatReviewStatusLabel(taskResponseAction.openReview.status)}
										</span>
									{/if}
									{#if taskResponseAction.pendingApproval}
										<span
											class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${approvalStatusToneClass(taskResponseAction.pendingApproval.status)}`}
										>
											{formatTaskApprovalModeLabel(taskResponseAction.pendingApproval.mode)}
											{formatApprovalStatusLabel(taskResponseAction.pendingApproval.status)}
										</span>
									{/if}
								</div>

								<p class="mt-3 text-sm text-slate-400">
									Review the newest response on the left, then approve it here to close the task
									without leaving this thread.
								</p>
							</div>

							{#if approveTaskResponseSuccess}
								<p
									class="rounded-xl border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
								>
									Task response approved and task marked complete.
								</p>
							{:else if form?.message}
								<p
									class="rounded-xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
								>
									{form.message}
								</p>
							{/if}

							<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<a
									class="ui-wrap-inline text-sm text-sky-300 transition hover:text-sky-200"
									href={resolve(`/app/tasks/${taskResponseAction.taskId}`)}
								>
									Open task detail
								</a>
								<form method="POST" action="?/approveTaskResponse">
									<button
										class="w-full rounded-lg border border-emerald-800/70 bg-emerald-950/40 px-4 py-2 text-sm font-medium text-emerald-200 disabled:opacity-50 sm:w-auto"
										type="submit"
										disabled={!taskResponseAction.canApproveAndComplete}
										title={taskResponseAction.disabledReason}
									>
										Approve response and complete task
									</button>
								</form>
							</div>

							{#if taskResponseAction.disabledReason}
								<p class="text-sm text-slate-400">{taskResponseAction.disabledReason}</p>
							{/if}
						</DetailSection>
					{/if}

					{@render sessionStatus(session, false)}

					<div class="grid gap-3 sm:grid-cols-2">
						<DetailFactCard label="Started" value={formatTimestamp(session.createdAt)} />
						<DetailFactCard
							label="Last activity"
							value={formatActivityAge(session.lastActivityAt, now)}
							detail={formatTimestamp(session.lastActivityAt)}
						/>
						<DetailFactCard
							label="Thread"
							value={threadLabel(session)}
							detail={session.threadId || ''}
							detailClass="ui-wrap-anywhere mt-1 max-w-full text-xs text-slate-500"
						/>
						<DetailFactCard label="Runs" value={session.runCount} />
						<DetailFactCard label="Resume" value={resumeLabel(session)} />
						<DetailFactCard label="Sandbox" value={session.sandbox} />
					</div>

					<DetailSection
						eyebrow="Attachments"
						title="Thread attachments"
						description="Files attached during follow-up stay on this thread for later reference."
						bodyClass="space-y-4"
					>
						{#if threadAttachments.length === 0}
							<p
								class="rounded-lg border border-dashed border-slate-800 px-4 py-5 text-sm text-slate-500"
							>
								No files are attached to this thread yet. Add one in the follow-up form when the next run needs reference material.
							</p>
						{:else}
							<div class="space-y-3">
								{#each threadAttachments as attachment (attachment.id)}
									<article class="rounded-lg border border-slate-800 bg-black/20 p-4">
										<div class="flex flex-wrap items-start justify-between gap-3">
											<div class="min-w-0">
												<p class="ui-wrap-anywhere text-sm font-medium text-white">
													{attachment.name}
												</p>
												<p class="mt-1 text-xs text-slate-400">
													{formatAttachmentSize(attachment.sizeBytes)} · {attachment.contentType}
												</p>
												<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">
													{attachment.path}
												</p>
												<p class="mt-2 text-xs text-slate-500">
													Attached {formatTimestamp(attachment.attachedAt)}
												</p>
											</div>
											<a
												class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
												href={resolve(
													`/api/agents/sessions/${session.id}/attachments/${attachment.id}`
												)}
											>
												Download
											</a>
										</div>
									</article>
								{/each}
							</div>
						{/if}
					</DetailSection>

					<form method="POST" action="?/updateSessionSandbox">
						<DetailSection
							eyebrow="Thread access"
							title="Sandbox for future follow-up runs"
							description="Lower-priority thread setting: change what this thread can access the next time you resume it. The current run keeps its existing sandbox."
						>
							<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
								<div class="flex flex-col gap-3 sm:flex-row sm:items-end">
									<label class="block min-w-[14rem]">
										<span class="mb-2 block text-sm font-medium text-slate-200">Sandbox mode</span>
										<select class="select text-white" name="sandbox">
											{#each sandboxOptions as sandbox (sandbox)}
												<option value={sandbox} selected={session.sandbox === sandbox}
													>{sandbox}</option
												>
											{/each}
										</select>
									</label>
									<button class="btn preset-filled-primary-500 font-semibold" type="submit">
										Update sandbox
									</button>
								</div>
							</div>
						</DetailSection>
					</form>
				</div>
			</div>
		</div>
	</AppPage>
{/if}
