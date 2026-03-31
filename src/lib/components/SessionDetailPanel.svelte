<script lang="ts">
	import { resolve } from '$app/paths';
	import { fetchAgentSession } from '$lib/client/agent-data';
	import {
		ACTIVE_REFRESH_INTERVAL_MS,
		ACTIVITY_CLOCK_INTERVAL_MS,
		formatActivityAge
	} from '$lib/session-activity';
	import SessionActivityIndicator from '$lib/components/SessionActivityIndicator.svelte';
	import type {
		AgentRunDetail,
		AgentRunStatus,
		AgentSessionDetail
	} from '$lib/types/agent-session';
	import { fade } from 'svelte/transition';

	let { session: sessionProp, backHref = resolve('/app/sessions') } = $props<{
		session: AgentSessionDetail;
		backHref?: string;
	}>();

	let session = $state.raw<AgentSessionDetail | null>(null);
	let autoRefresh = $state(true);
	let isRefreshing = $state(false);
	let isCanceling = $state(false);
	let now = $state(Date.now());
	let selectedRunId = $state('');
	let sendState = $state<{ status: 'sending' | 'success' | 'error'; message: string } | null>(null);
	let pageNotice = $state<{ tone: 'success' | 'error'; message: string } | null>(null);

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

		if (!prompt) {
			sendState = {
				status: 'error',
				message: 'Prompt is required.'
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
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ prompt })
			});
			const payload = (await response.json()) as { error?: string };

			if (!response.ok) {
				throw new Error(payload.error ?? 'Could not queue session message.');
			}

			formElement.reset();
			await refreshSession({ force: true });
			sendState = {
				status: 'success',
				message: 'Follow-up queued.'
			};
			pageNotice = {
				tone: 'success',
				message: `Follow-up queued for ${session.name}.`
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

	function sessionStateLabel(state: AgentSessionDetail['sessionState']) {
		switch (state) {
			case 'starting':
				return 'Starting';
			case 'waiting':
				return 'Waiting for response';
			case 'working':
				return 'Working';
			case 'ready':
				return 'Ready';
			case 'attention':
				return 'Needs attention';
			case 'unavailable':
				return 'Not resumable';
			default:
				return 'Idle';
		}
	}

	function sessionStatusClass(state: AgentSessionDetail['sessionState']) {
		switch (state) {
			case 'working':
				return 'border border-emerald-800/70 bg-emerald-950/50 text-emerald-300';
			case 'starting':
				return 'border border-amber-800/70 bg-amber-950/50 text-amber-300';
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
				return 'border border-amber-800/70 bg-amber-950/50 text-amber-300';
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
			return 'Ready';
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
			label: sessionStateLabel(detail.sessionState),
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
	<section
		class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-8"
		data-testid="session-detail-panel"
	>
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
			<div class="min-w-0 space-y-3">
				<a
					class="inline-flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-sky-300 uppercase transition hover:text-sky-200"
					href={resolve(backHref)}
				>
					Back to threads
				</a>
				<div class="flex flex-wrap items-center gap-2">
					<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">
						Thread detail
					</p>
					<span
						class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${sessionStatusClass(session.sessionState)}`}
					>
						{sessionStateLabel(session.sessionState)}
					</span>
					<span
						class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(session.latestRunStatus)}`}
					>
						latest run {session.latestRunStatus}
					</span>
					<span
						class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
					>
						{session.sandbox}
					</span>
					{#if session.origin === 'external'}
						<span
							class="inline-flex items-center justify-center rounded-full border border-sky-900/70 bg-sky-950/40 px-2 py-1 text-center text-[11px] leading-none text-sky-300 uppercase"
						>
							Imported from Codex
						</span>
					{/if}
				</div>
				<div>
					<h1 class="ui-wrap-anywhere text-2xl font-semibold tracking-tight text-white sm:text-3xl">
						{session.name}
					</h1>
					<p class="ui-wrap-anywhere mt-2 max-w-3xl text-sm text-slate-300">
						{session.sessionSummary}
					</p>
					{#if session.relatedTasks.length > 0}
						<p class="ui-clamp-3 mt-2 max-w-3xl text-xs text-slate-500">
							Related tasks: {session.relatedTasks.map((task) => task.title).join(', ')}
						</p>
					{/if}
				</div>
				<p class="ui-wrap-anywhere max-w-4xl text-xs text-slate-500">{session.cwd}</p>
			</div>

			<div class="flex flex-col gap-3 sm:items-end">
				<label
					class="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-400"
				>
					<input bind:checked={autoRefresh} type="checkbox" />
					<span>Auto-refresh active runs every 4s</span>
				</label>
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
					{#if session.hasActiveRun}
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
			</div>
		</div>

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
					<p class="ui-wrap-anywhere mt-1 max-w-full text-xs text-slate-500">{session.threadId}</p>
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
							<div>
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
				<form
					class="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4"
					onsubmit={submitFollowUp}
				>
					<div class="flex flex-col gap-1">
						<h2 class="text-lg font-semibold text-white">Send follow-up</h2>
						<p class="text-sm text-slate-400">
							Queue the next instruction into the same work thread when it is ready.
						</p>
					</div>
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
				</form>

				<section class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
					<div class="flex flex-col gap-1">
						<h2 class="text-lg font-semibold text-white">Conversation history</h2>
						<p class="text-sm text-slate-400">
							Inspect each turn in the thread and open any run to read the full prompt and response.
						</p>
					</div>

					<div class="mt-4 space-y-3">
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
										<div>
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
					</div>
				</section>
			</div>
		</div>
	</section>
{/if}
