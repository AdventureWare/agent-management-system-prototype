<script lang="ts">
	import { resolve } from '$app/paths';
	import { fetchAgentSession } from '$lib/client/agent-data';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import {
		ACTIVE_REFRESH_INTERVAL_MS,
		ACTIVITY_CLOCK_INTERVAL_MS,
		formatActivityAge,
		formatSessionStateLabel
	} from '$lib/session-activity';
	import SessionActivityIndicator from '$lib/components/SessionActivityIndicator.svelte';
	import {
		approvalStatusToneClass,
		formatApprovalStatusLabel,
		formatReviewStatusLabel,
		formatTaskApprovalModeLabel,
		formatTaskStatusLabel,
		reviewStatusToneClass
	} from '$lib/types/control-plane';
	import type {
		AgentRunDetail,
		AgentRunStatus,
		AgentSessionDetail
	} from '$lib/types/agent-session';
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

	let {
		session: sessionProp,
		sandboxOptions,
		taskResponseAction = null,
		form = null,
		backHref = resolve('/app/sessions')
	} = $props<{
		session: AgentSessionDetail;
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

	let session = $state.raw<AgentSessionDetail | null>(null);
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
		const nextFiles = new Map(
			Array.from(followUpAttachmentInput?.files ?? []).map((file) => [
				createAttachmentKey(file),
				file
			])
		);

		for (const file of files) {
			if (file.size === 0) {
				continue;
			}

			nextFiles.set(createAttachmentKey(file), file);
		}

		replaceFollowUpAttachmentFiles([...nextFiles.values()]);
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
			throw new Error('Session not found.');
		}

		session = await fetchAgentSession(session.id);
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
				throw new Error(payload.error ?? 'Could not queue session message.');
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
			const message = err instanceof Error ? err.message : 'Could not queue session message.';
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

	function sessionStatusClass(state: AgentSessionDetail['sessionState']) {
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

	function threadLabel(detail: AgentSessionDetail) {
		if (detail.threadId) {
			return 'Available';
		}

		return detail.hasActiveRun ? 'Pending' : 'Missing';
	}

	function resumeLabel(detail: AgentSessionDetail) {
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

	function describeSessionState(detail: AgentSessionDetail): SessionStateDescriptor {
		return {
			label: formatSessionStateLabel(detail.sessionState),
			detail: detail.sessionSummary,
			className: sessionStatusClass(detail.sessionState)
		};
	}

	function replyStateLabel(detail: AgentSessionDetail) {
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

	function replyStateDetail(detail: AgentSessionDetail) {
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
</script>

{#snippet sessionStatus(detail: AgentSessionDetail)}
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
		<SessionActivityIndicator session={detail} {now} />
		<p class="text-xs text-slate-500">
			A work thread keeps one Codex conversation and all of its runs together. Each run in the
			history below is one start or follow-up execution inside this thread.
		</p>

		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
				<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Latest run</p>
				<p class="ui-wrap-anywhere mt-2 text-sm font-medium text-white">
					{detail.latestRun ? runModeLabel(detail.latestRun) : 'None yet'}
				</p>
				<p class="mt-1 text-xs text-slate-500">
					{detail.latestRun ? latestRunStatus(detail.latestRun) : 'No runs recorded'}
				</p>
			</div>
			<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
				<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Reply state</p>
				<p class="ui-wrap-anywhere mt-2 text-sm font-medium text-white">
					{replyStateLabel(detail)}
				</p>
				<p class="mt-1 text-xs text-slate-500">{replyStateDetail(detail)}</p>
			</div>
			<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
				<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Thread</p>
				<p class="ui-wrap-anywhere mt-2 text-sm font-medium text-white">{threadLabel(detail)}</p>
				<p class="mt-1 text-xs text-slate-500">
					{detail.threadId
						? 'A Codex thread id is available for follow-up work.'
						: 'No thread id yet.'}
				</p>
			</div>
			<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
				<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Follow-up</p>
				<p class="ui-wrap-anywhere mt-2 text-sm font-medium text-white">{resumeLabel(detail)}</p>
				<p class="mt-1 text-xs text-slate-500">
					{detail.canResume
						? 'You can send the next instruction now.'
						: detail.hasActiveRun
							? 'Wait for the active run to finish first.'
							: 'This thread cannot accept a follow-up yet.'}
				</p>
			</div>
		</div>

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
				<p class="mt-2 text-sm text-slate-400">No tasks are linked to this thread yet.</p>
			{/if}
		</div>
	</div>
{/snippet}

{#if session}
	<AppPage class="gap-5 sm:gap-6">
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
								{formatSessionStateLabel(session!.sessionState)}
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

			<form method="POST" action="?/updateSessionSandbox">
				<DetailSection
					eyebrow="Thread access"
					title="Sandbox for future follow-up runs"
					description="Change what this thread can access the next time you resume it. The current run, if any, keeps its existing sandbox."
				>
					<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-end">
							<label class="block min-w-[14rem]">
								<span class="mb-2 block text-sm font-medium text-slate-200">Sandbox mode</span>
								<select class="select text-white" name="sandbox">
									{#each sandboxOptions as sandbox (sandbox)}
										<option value={sandbox} selected={session.sandbox === sandbox}>{sandbox}</option
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

			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
				<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
					<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Started</p>
					<p class="ui-wrap-anywhere mt-2 text-sm font-medium text-white">
						{formatTimestamp(session.createdAt)}
					</p>
				</div>
				<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
					<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Last activity</p>
					<p class="ui-wrap-anywhere mt-2 text-sm font-medium text-white">
						{formatActivityAge(session.lastActivityAt, now)}
					</p>
					<p class="mt-1 text-xs text-slate-500">{formatTimestamp(session.lastActivityAt)}</p>
				</div>
				<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
					<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Thread</p>
					<p class="ui-wrap-anywhere mt-2 text-sm font-medium text-white">{threadLabel(session)}</p>
					{#if session.threadId}
						<p class="ui-wrap-anywhere mt-1 max-w-full text-xs text-slate-500">
							{session.threadId}
						</p>
					{/if}
				</div>
				<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
					<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Runs</p>
					<p class="mt-2 text-sm font-medium text-white">{session.runCount}</p>
				</div>
				<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
					<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Resume</p>
					<p class="ui-wrap-anywhere mt-2 text-sm font-medium text-white">
						{resumeLabel(session)}
					</p>
				</div>
			</div>

			<div class="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
				<div class="space-y-4">
					{@render sessionStatus(session)}

					{#if selectedRun}
						<div class="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<p class="text-sm font-medium text-white">Selected run</p>
									<p class="mt-1 text-xs text-slate-500">
										{runModeLabel(selectedRun)} queued {formatTimestamp(selectedRun.createdAt)}
									</p>
								</div>
								<div class="flex flex-wrap items-center gap-2">
									<span
										class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(latestRunStatus(selectedRun))}`}
									>
										{latestRunStatus(selectedRun)}
									</span>
									<span
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
									>
										{selectedRun.mode}
									</span>
								</div>
							</div>

							<div class="grid gap-3 sm:grid-cols-3">
								<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Queued</p>
									<p class="ui-wrap-anywhere mt-2 text-sm text-white">
										{formatTimestamp(selectedRun.createdAt)}
									</p>
								</div>
								<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Finished</p>
									<p class="ui-wrap-anywhere mt-2 text-sm text-white">
										{formatTimestamp(selectedRun.state?.finishedAt ?? null)}
									</p>
								</div>
								<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Thread target</p>
									<p class="ui-wrap-anywhere mt-2 text-sm text-white">
										{selectedRun.requestedThreadId ?? 'Start a new thread'}
									</p>
								</div>
							</div>

							<div class="space-y-3">
								<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Instruction</p>
									<p class="ui-wrap-anywhere mt-2 text-sm whitespace-pre-wrap text-slate-200">
										{selectedRun.prompt}
									</p>
								</div>

								<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Agent response</p>
									<p class="ui-wrap-anywhere mt-2 text-sm whitespace-pre-wrap text-slate-200">
										{responseText(selectedRun)}
									</p>
								</div>
							</div>
						</div>
					{/if}

					<details class="rounded-xl border border-slate-800 bg-black/30 p-4">
						<summary class="cursor-pointer text-sm font-medium text-slate-200">
							Selected run log output
						</summary>
						{#if selectedRun?.logTail?.length}
							<pre
								class="ui-wrap-anywhere mt-3 max-h-80 overflow-auto text-xs whitespace-pre-wrap text-slate-300">{selectedRun.logTail.join(
									'\n'
								)}</pre>
						{:else}
							<p class="mt-3 text-sm text-slate-400">No log lines yet.</p>
						{/if}
					</details>
				</div>

				<div class="space-y-4">
					<form class="space-y-3" onsubmit={submitFollowUp} onpaste={handleFollowUpAttachmentPaste}>
						<DetailSection
							eyebrow="Follow-up"
							title="Send follow-up"
							description="Queue the next instruction into the same work thread when it is ready. Attached files are saved onto the thread and included as immediate context for the next run."
							bodyClass="space-y-3"
						>
							<textarea
								class="min-h-32 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
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
								No files attached to this thread yet.
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

					{#if taskResponseAction}
						<DetailSection
							eyebrow="Task response"
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
									Review the thread output above, then approve it here to close the task without
									leaving this thread.
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
								No runs have been recorded for this thread yet.
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
			</div>
		</div>
	</AppPage>
{/if}
