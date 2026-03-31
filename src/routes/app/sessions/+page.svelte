<script lang="ts">
	import { resolve } from '$app/paths';
	import { fetchAgentSessions, updateAgentSessionArchiveState } from '$lib/client/agent-data';
	import SessionActivityIndicator from '$lib/components/SessionActivityIndicator.svelte';
	import {
		ACTIVE_REFRESH_INTERVAL_MS,
		ACTIVITY_CLOCK_INTERVAL_MS,
		formatActivityAge
	} from '$lib/session-activity';
	import type { AgentSessionDetail } from '$lib/types/agent-session';
	import { fade } from 'svelte/transition';

	type ArchiveAction = 'archive' | 'unarchive';

	let { data } = $props<{ data: { sessions: AgentSessionDetail[] } }>();
	let query = $state('');
	let autoRefresh = $state(true);
	let showArchived = $state(false);
	let isRefreshing = $state(false);
	let isUpdatingArchive = $state(false);
	let now = $state(Date.now());
	let sessions = $state.raw<AgentSessionDetail[]>([]);
	let selectedSessionIds = $state.raw<string[]>([]);
	let pageNotice = $state<{ tone: 'success' | 'error'; message: string } | null>(null);

	const timestampFormatter = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	let filteredSessions = $derived.by(() => {
		const term = query.trim().toLowerCase();

		if (!term) {
			return sessions;
		}

		return sessions.filter((session) => {
			return [
				session.name,
				session.cwd,
				session.sessionState,
				session.latestRunStatus,
				session.threadId ?? '',
				session.relatedTasks.map((task) => task.title).join(' '),
				session.latestRun?.prompt ?? '',
				session.latestRun?.lastMessage ?? ''
			]
				.join(' ')
				.toLowerCase()
				.includes(term);
		});
	});
	let unarchivedSessions = $derived(filteredSessions.filter((session) => !session.archivedAt));
	let archivedSessions = $derived(
		filteredSessions.filter((session) => Boolean(session.archivedAt))
	);
	let activeSessions = $derived(
		unarchivedSessions.filter((session) => isActiveSessionState(session.sessionState))
	);
	let historicalSessions = $derived(
		unarchivedSessions.filter((session) => !isActiveSessionState(session.sessionState))
	);
	let activeCount = $derived(
		sessions.filter((session) => !session.archivedAt && isActiveSessionState(session.sessionState))
			.length
	);
	let readyCount = $derived(
		sessions.filter((session) => !session.archivedAt && session.sessionState === 'ready').length
	);
	let inactiveCount = $derived(
		sessions.filter(
			(session) =>
				!session.archivedAt &&
				(session.sessionState === 'unavailable' || session.sessionState === 'idle')
		).length
	);
	let attentionCount = $derived(
		sessions.filter((session) => !session.archivedAt && session.sessionState === 'attention').length
	);
	let archivedCount = $derived(sessions.filter((session) => Boolean(session.archivedAt)).length);
	let selectedSessions = $derived.by(() =>
		sessions.filter((session) => selectedSessionIds.includes(session.id))
	);
	let selectedArchivedCount = $derived(
		selectedSessions.filter((session) => Boolean(session.archivedAt)).length
	);
	let selectedUnarchivedCount = $derived(selectedSessions.length - selectedArchivedCount);
	let selectedAction = $derived.by(() => {
		if (selectedSessionIds.length === 0) {
			return null;
		}

		if (selectedArchivedCount > 0 && selectedUnarchivedCount > 0) {
			return null;
		}

		return selectedArchivedCount > 0 ? ('unarchive' as const) : ('archive' as const);
	});

	$effect(() => {
		sessions = data.sessions;
	});

	$effect(() => {
		const nextSelectedSessionIds = selectedSessionIds.filter((sessionId) =>
			sessions.some((session) => session.id === sessionId)
		);

		if (
			nextSelectedSessionIds.length === selectedSessionIds.length &&
			nextSelectedSessionIds.every((sessionId, index) => sessionId === selectedSessionIds[index])
		) {
			return;
		}

		selectedSessionIds = nextSelectedSessionIds;
	});

	$effect(() => {
		if (!autoRefresh || activeSessions.length === 0) {
			return;
		}

		const intervalId = window.setInterval(() => {
			void refreshSessions();
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

	function isActiveSessionState(state: AgentSessionDetail['sessionState']) {
		return state === 'starting' || state === 'waiting' || state === 'working';
	}

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

	async function loadSessions() {
		sessions = await fetchAgentSessions({ includeArchived: true });
	}

	async function refreshSessions(options: { force?: boolean } = {}) {
		if (isRefreshing) {
			return;
		}

		if (!options.force && (document.hidden || userIsEditingFormControl())) {
			return;
		}

		isRefreshing = true;

		try {
			await loadSessions();
			pageNotice = null;
		} catch (err) {
			pageNotice = {
				tone: 'error',
				message: err instanceof Error ? err.message : 'Could not refresh sessions.'
			};
		} finally {
			isRefreshing = false;
		}
	}

	async function updateArchiveState(archived: boolean) {
		if (isUpdatingArchive || selectedSessionIds.length === 0) {
			return;
		}

		const sessionIds = [...selectedSessionIds];
		isUpdatingArchive = true;

		try {
			const updatedSessionIds = await updateAgentSessionArchiveState(sessionIds, archived);
			await loadSessions();
			selectedSessionIds = [];
			pageNotice = {
				tone: 'success',
				message:
					updatedSessionIds.length === 1
						? `${archived ? 'Archived' : 'Unarchived'} 1 thread.`
						: `${archived ? 'Archived' : 'Unarchived'} ${updatedSessionIds.length} threads.`
			};
		} catch (err) {
			pageNotice = {
				tone: 'error',
				message: err instanceof Error ? err.message : 'Could not update thread archive state.'
			};
		} finally {
			isUpdatingArchive = false;
		}
	}

	function clearSelection() {
		selectedSessionIds = [];
	}

	function handleShowArchivedChange(checked: boolean) {
		showArchived = checked;

		if (checked) {
			return;
		}

		selectedSessionIds = selectedSessionIds.filter((sessionId) => {
			const session = sessions.find((candidate) => candidate.id === sessionId);
			return !session?.archivedAt;
		});
	}

	function isSessionSelected(sessionId: string) {
		return selectedSessionIds.includes(sessionId);
	}

	function toggleSessionSelection(sessionId: string, checked: boolean) {
		if (checked) {
			selectedSessionIds = isSessionSelected(sessionId)
				? selectedSessionIds
				: [...selectedSessionIds, sessionId];
			return;
		}

		selectedSessionIds = selectedSessionIds.filter((candidate) => candidate !== sessionId);
	}

	function setSelectionForRows(rows: AgentSessionDetail[], checked: boolean) {
		const rowIds = rows.map((session) => session.id);
		const rowIdSet = new Set(rowIds);

		if (checked) {
			selectedSessionIds = [...new Set([...selectedSessionIds, ...rowIds])];
			return;
		}

		selectedSessionIds = selectedSessionIds.filter((sessionId) => !rowIdSet.has(sessionId));
	}

	function areAllRowsSelected(rows: AgentSessionDetail[]) {
		return rows.length > 0 && rows.every((session) => isSessionSelected(session.id));
	}

	function selectedRowCount(rows: AgentSessionDetail[]) {
		return rows.filter((session) => isSessionSelected(session.id)).length;
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
				return 'Waiting';
			case 'working':
				return 'Working';
			case 'ready':
				return 'Ready';
			case 'attention':
				return 'Attention';
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

	function threadLabel(session: AgentSessionDetail) {
		if (session.threadId) {
			return 'Ready';
		}

		return session.hasActiveRun ? 'Pending' : 'Missing';
	}

	function resumeLabel(session: AgentSessionDetail) {
		if (session.hasActiveRun) {
			return 'Busy';
		}

		return session.canResume ? 'Available' : 'Blocked';
	}

	function compactText(value: string, maxLength = 180) {
		const normalized = value.replace(/\s+/g, ' ').trim();

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
	}
</script>

{#snippet sessionTable(
	title: string,
	description: string,
	rows: AgentSessionDetail[],
	emptyMessage: string
)}
	<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 class="text-lg font-semibold text-white">{title}</h2>
				<p class="mt-1 text-sm text-slate-400">{description}</p>
				<p class="mt-2 text-xs text-slate-500">Open any thread on its own detail page.</p>
			</div>
			<p class="text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">
				{rows.length} shown · {selectedRowCount(rows)} selected
			</p>
		</div>

		{#if rows.length === 0}
			<p
				class="mt-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400"
			>
				{emptyMessage}
			</p>
		{:else}
			<div class="mt-4 overflow-x-auto">
				<table class="min-w-[1100px] divide-y divide-slate-800 text-left">
					<thead class="text-xs tracking-[0.16em] text-slate-500 uppercase">
						<tr>
							<th class="w-16 px-3 py-3 font-medium">
								<label class="inline-flex items-center gap-2">
									<input
										aria-label={`Select all rows in ${title}`}
										type="checkbox"
										checked={areAllRowsSelected(rows)}
										onchange={(event) => {
											if (event.currentTarget instanceof HTMLInputElement) {
												setSelectionForRows(rows, event.currentTarget.checked);
											}
										}}
									/>
									<span class="sr-only">Select all</span>
								</label>
							</th>
							<th class="px-3 py-3 font-medium">Thread</th>
							<th class="px-3 py-3 font-medium">Status</th>
							<th class="px-3 py-3 font-medium">Last activity</th>
							<th class="px-3 py-3 font-medium">Started</th>
							<th class="px-3 py-3 font-medium">Runs</th>
							<th class="px-3 py-3 font-medium">Thread</th>
							<th class="px-3 py-3 font-medium">Resume</th>
							<th class="px-3 py-3 font-medium">Working dir</th>
							<th class="px-3 py-3 font-medium">Open</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-900/80">
						{#each rows as session (session.id)}
							<tr
								class={[
									'bg-slate-950/30 transition hover:bg-slate-900/60',
									isSessionSelected(session.id) ? 'bg-slate-900/80' : ''
								]}
							>
								<td class="px-3 py-3 align-top">
									<label class="inline-flex items-center gap-2">
										<input
											aria-label={`Select thread ${session.name}`}
											type="checkbox"
											checked={isSessionSelected(session.id)}
											onchange={(event) => {
												if (event.currentTarget instanceof HTMLInputElement) {
													toggleSessionSelection(session.id, event.currentTarget.checked);
												}
											}}
										/>
										<span class="sr-only">Select thread {session.name}</span>
									</label>
								</td>
								<td class="px-3 py-3 align-top">
									<a
										class="block rounded-lg text-left transition outline-none hover:text-sky-200 focus-visible:ring-2 focus-visible:ring-sky-400"
										href={resolve(`/app/sessions/${session.id}`)}
										aria-label={`View thread details for ${session.name}`}
									>
										<span class="ui-wrap-anywhere block font-medium text-white">{session.name}</span>
										<span class="ui-wrap-anywhere mt-1 block text-xs text-slate-400">
											{session.model ?? 'default model'} · {session.sandbox}
										</span>
										<div class="mt-2 flex flex-wrap gap-2">
											{#if session.archivedAt}
												<span
													class="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
												>
													Archived
												</span>
											{/if}
											{#if session.origin === 'external'}
												<span
													class="inline-flex items-center justify-center rounded-full border border-sky-900/70 bg-sky-950/40 px-2 py-1 text-center text-[11px] leading-none text-sky-300 uppercase"
												>
													Imported from Codex
												</span>
											{/if}
										</div>
										{#if session.relatedTasks.length > 0}
											<span class="ui-clamp-3 mt-2 block text-xs text-slate-500">
												Tasks: {session.relatedTasks.map((task) => task.title).join(', ')}
											</span>
										{/if}
										{#if session.archivedAt}
											<span class="mt-2 block text-xs text-slate-500">
												Archived {formatTimestamp(session.archivedAt)}
											</span>
										{/if}
										{#if session.latestRun?.lastMessage}
											<span class="ui-clamp-3 mt-2 block max-w-72 text-xs text-slate-500">
												Last reply: {compactText(session.latestRun.lastMessage, 120)}
											</span>
										{/if}
									</a>
								</td>
								<td class="px-3 py-3 align-top">
									<div class="space-y-2">
										<span
											class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${sessionStatusClass(session.sessionState)}`}
										>
											{sessionStateLabel(session.sessionState)}
										</span>
										<SessionActivityIndicator {now} {session} compact />
										<p class="text-xs text-slate-500">Latest run {session.latestRunStatus}</p>
									</div>
								</td>
								<td class="px-3 py-3 align-top">
									<p class="text-sm text-white">{formatActivityAge(session.lastActivityAt, now)}</p>
									<p class="mt-1 text-xs text-slate-500">
										{formatTimestamp(session.lastActivityAt)}
									</p>
								</td>
								<td class="px-3 py-3 align-top">
									<p class="text-sm text-white">{formatTimestamp(session.createdAt)}</p>
								</td>
								<td class="px-3 py-3 align-top">
									<p class="text-sm text-white">{session.runCount}</p>
									<p class="mt-1 text-xs text-slate-500">
										latest {session.latestRun?.mode === 'message' ? 'follow-up' : 'start'}
									</p>
								</td>
								<td class="px-3 py-3 align-top">
									<p class="text-sm text-white">{threadLabel(session)}</p>
									{#if session.threadId}
										<p class="ui-wrap-anywhere mt-1 max-w-44 text-xs text-slate-500">
											{session.threadId}
										</p>
									{/if}
								</td>
								<td class="px-3 py-3 align-top">
									<p class="text-sm text-white">{resumeLabel(session)}</p>
								</td>
								<td class="px-3 py-3 align-top">
									<p class="ui-wrap-anywhere max-w-80 text-sm text-slate-300">{session.cwd}</p>
								</td>
								<td class="px-3 py-3 align-top">
									<a
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-center text-xs font-medium leading-none tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
										href={resolve(`/app/sessions/${session.id}`)}
									>
										View thread
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
{/snippet}

<section class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Threads</p>
		<h1 class="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
			Browse active and historical background threads
		</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Use this page as the remote-work registry. The tables separate active runs from history, and
			each thread opens on its own detail page for logs, conversation turns, and follow-up work.
		</p>
		<div
			class="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:flex-wrap sm:items-center"
		>
			<label
				class="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2"
			>
				<input bind:checked={autoRefresh} type="checkbox" />
				<span>Auto-refresh active runs every 4s</span>
			</label>
			<span>Refresh pauses while you are typing or when this tab is in the background.</span>
			<button
				class="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-slate-300 transition hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:rounded-full"
				type="button"
				onclick={() => {
					void refreshSessions({ force: true });
				}}
				disabled={isRefreshing}
			>
				{isRefreshing ? 'Refreshing...' : 'Refresh all'}
			</button>
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

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Active</p>
			<p class="mt-2 text-3xl font-semibold text-white">{activeCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Ready</p>
			<p class="mt-2 text-3xl font-semibold text-white">{readyCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Closed / idle</p>
			<p class="mt-2 text-3xl font-semibold text-white">{inactiveCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Needs attention</p>
			<p class="mt-2 text-3xl font-semibold text-white">{attentionCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Archived</p>
			<p class="mt-2 text-3xl font-semibold text-white">{archivedCount}</p>
		</div>
	</div>

	<div class="space-y-6">
		<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 class="text-xl font-semibold text-white">Thread index</h2>
					<p class="mt-1 text-sm text-slate-400">
						Search by thread name, related task, path, thread state, thread id, or recent prompt
						text.
					</p>
				</div>
				<div class="w-full sm:max-w-sm">
					<label class="sr-only" for="session-search">Search threads</label>
					<input
						id="session-search"
						bind:value={query}
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
						placeholder="Search threads"
					/>
				</div>
			</div>
			<div class="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
				<label
					class="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300"
				>
					<input
						type="checkbox"
						checked={showArchived}
						onchange={(event) => {
							if (event.currentTarget instanceof HTMLInputElement) {
								handleShowArchivedChange(event.currentTarget.checked);
							}
						}}
					/>
					<span>Show archived threads</span>
				</label>
				{#if archivedCount > 0 && !showArchived}
					<p class="text-sm text-slate-500">
						{archivedCount} archived {archivedCount === 1 ? 'thread is' : 'threads are'} hidden from the
						default view.
					</p>
				{/if}
			</div>
		</section>

		{#if selectedSessionIds.length > 0}
			<section class="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 sm:p-5">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-sm font-semibold tracking-[0.16em] text-white uppercase">
							{selectedSessionIds.length}
							{selectedSessionIds.length === 1 ? 'thread' : 'threads'} selected
						</h2>
						<p class="mt-1 text-sm text-slate-400">
							{#if selectedAction === 'archive'}
								Archive the selected threads to hide them from the default registry view.
							{:else if selectedAction === 'unarchive'}
								Restore the selected threads to the default registry view.
							{:else}
								Choose only archived threads or only unarchived threads for one bulk action.
							{/if}
						</p>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row">
						<button
							class="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-center text-sm font-medium leading-none text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
							type="button"
							onclick={() => {
								if (selectedAction === 'archive') {
									void updateArchiveState(true);
								} else if (selectedAction === 'unarchive') {
									void updateArchiveState(false);
								}
							}}
							disabled={!selectedAction || isUpdatingArchive}
						>
							{#if isUpdatingArchive}
								Updating...
							{:else if selectedAction === 'unarchive'}
								Unarchive selected
							{:else}
								Archive selected
							{/if}
						</button>
						<button
							class="inline-flex items-center justify-center rounded-full border border-slate-800 px-4 py-2 text-center text-sm leading-none text-slate-400 transition hover:border-slate-700 hover:text-white"
							type="button"
							onclick={clearSelection}
						>
							Clear selection
						</button>
					</div>
				</div>
			</section>
		{/if}

		{@render sessionTable(
			'Active threads',
			'Threads that currently have a queued or in-progress run.',
			activeSessions,
			'No active threads match the current search.'
		)}

		{@render sessionTable(
			'Other threads',
			'Ready, not-resumable, idle, and attention-needed threads kept for reference and follow-up.',
			historicalSessions,
			'No other threads match the current search.'
		)}

		{#if showArchived}
			{@render sessionTable(
				'Archived threads',
				'Threads hidden from the default registry view. Select them here to restore them.',
				archivedSessions,
				'No archived threads match the current search.'
			)}
		{/if}
	</div>
</section>
