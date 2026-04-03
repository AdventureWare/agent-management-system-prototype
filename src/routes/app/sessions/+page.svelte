<script lang="ts">
	import { resolve } from '$app/paths';
	import { fetchAgentThreads, updateAgentThreadArchiveState } from '$lib/client/agent-threads';
	import { shouldPauseRefresh } from '$lib/client/refresh';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import CollectionToolbar from '$lib/components/CollectionToolbar.svelte';
	import DataTableSection from '$lib/components/DataTableSection.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SelectionActionBar from '$lib/components/SelectionActionBar.svelte';
	import ThreadActivityIndicator from '$lib/components/ThreadActivityIndicator.svelte';
	import {
		ACTIVE_REFRESH_INTERVAL_MS,
		ACTIVITY_CLOCK_INTERVAL_MS,
		formatActivityAge,
		formatThreadStateLabel
	} from '$lib/thread-activity';
	import { uniqueTopicLabels } from '$lib/topic-labels';
	import type { AgentThreadDetail } from '$lib/types/agent-thread';
	import { fade } from 'svelte/transition';

	type ArchiveAction = 'archive' | 'unarchive';

	let { data } = $props<{
		data: { threads?: AgentThreadDetail[]; sessions?: AgentThreadDetail[] };
	}>();
	let query = $state('');
	let autoRefresh = $state(true);
	let showArchived = $state(false);
	let isRefreshing = $state(false);
	let isUpdatingArchive = $state(false);
	let now = $state(Date.now());
	let sessions = $state.raw<AgentThreadDetail[]>([]);
	let selectedSessionIds = $state.raw<string[]>([]);
	let pageNotice = $state<{ tone: 'success' | 'error'; message: string } | null>(null);

	const timestampFormatter = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});
	const autoRefreshIntervalLabel = `${ACTIVE_REFRESH_INTERVAL_MS / 1000}s`;

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
				formatThreadStateLabel(session.sessionState),
				session.latestRunStatus,
				(session.topicLabels ?? []).join(' '),
				(session.categorization?.projectLabels ?? []).join(' '),
				(session.categorization?.goalLabels ?? []).join(' '),
				(session.categorization?.laneLabels ?? []).join(' '),
				(session.categorization?.focusLabels ?? []).join(' '),
				(session.categorization?.entityLabels ?? []).join(' '),
				(session.categorization?.roleLabels ?? []).join(' '),
				(session.categorization?.capabilityLabels ?? []).join(' '),
				(session.categorization?.toolLabels ?? []).join(' '),
				(session.categorization?.keywordLabels ?? []).join(' '),
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
	let availableCount = $derived(
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
		sessions = data.threads ?? data.sessions ?? [];
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
			if (document.visibilityState !== 'visible') {
				return;
			}

			void refreshSessions();
		}, ACTIVE_REFRESH_INTERVAL_MS);

		return () => {
			window.clearInterval(intervalId);
		};
	});

	$effect(() => {
		const intervalId = window.setInterval(() => {
			if (document.visibilityState !== 'visible') {
				return;
			}

			now = Date.now();
		}, ACTIVITY_CLOCK_INTERVAL_MS);

		return () => {
			window.clearInterval(intervalId);
		};
	});

	function isActiveSessionState(state: AgentThreadDetail['sessionState']) {
		return state === 'starting' || state === 'waiting' || state === 'working';
	}

	async function loadSessions() {
		sessions = await fetchAgentThreads({ includeArchived: true });
	}

	async function refreshSessions(options: { force?: boolean } = {}) {
		if (isRefreshing) {
			return;
		}

		if (shouldPauseRefresh({ force: options.force })) {
			return;
		}

		isRefreshing = true;

		try {
			await loadSessions();
			pageNotice = null;
		} catch (err) {
			pageNotice = {
				tone: 'error',
				message: err instanceof Error ? err.message : 'Could not refresh threads.'
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
			const updatedSessionIds = await updateAgentThreadArchiveState(sessionIds, archived);
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

	function setSelectionForRows(rows: AgentThreadDetail[], checked: boolean) {
		const rowIds = rows.map((session) => session.id);
		const rowIdSet = new Set(rowIds);

		if (checked) {
			selectedSessionIds = [...new Set([...selectedSessionIds, ...rowIds])];
			return;
		}

		selectedSessionIds = selectedSessionIds.filter((sessionId) => !rowIdSet.has(sessionId));
	}

	function areAllRowsSelected(rows: AgentThreadDetail[]) {
		return rows.length > 0 && rows.every((session) => isSessionSelected(session.id));
	}

	function selectedRowCount(rows: AgentThreadDetail[]) {
		return rows.filter((session) => isSessionSelected(session.id)).length;
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

	function threadLabel(session: AgentThreadDetail) {
		if (session.threadId) {
			return 'Available';
		}

		return session.hasActiveRun ? 'Pending' : 'Missing';
	}

	function resumeLabel(session: AgentThreadDetail) {
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

<svelte:window
	onfocus={() => {
		void refreshSessions();
	}}
/>
<svelte:document
	onvisibilitychange={() => {
		if (document.visibilityState !== 'visible') {
			return;
		}

		void refreshSessions();
	}}
/>

{#snippet sessionTable(
	title: string,
	description: string,
	rows: AgentThreadDetail[],
	emptyMessage: string,
	compactThreadColumn = false
)}
	<DataTableSection
		{title}
		description={`${description} Open any thread on its own detail page.`}
		summary={`${rows.length} shown · ${selectedRowCount(rows)} selected`}
		empty={rows.length === 0}
		{emptyMessage}
	>
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
					<th
						class={`px-3 py-3 font-medium ${compactThreadColumn ? 'w-[18rem] max-w-[18rem] min-w-[18rem]' : 'min-w-[22rem]'}`}
					>
						Thread
					</th>
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
						<td
							class={`px-3 py-3 align-top ${compactThreadColumn ? 'w-[18rem] max-w-[18rem] min-w-[18rem]' : 'min-w-[22rem]'}`}
						>
							<a
								class="block rounded-lg text-left transition outline-none hover:text-sky-200 focus-visible:ring-2 focus-visible:ring-sky-400"
								href={resolve(`/app/threads/${session.id}`)}
								aria-label={`View thread details for ${session.name}`}
							>
								<div class="ui-clamp-5 font-medium text-white">
									{session.name}
								</div>
								<span class="ui-clamp-5 mt-1 block text-xs text-slate-400">
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
									{#each uniqueTopicLabels(session.topicLabels) as topicLabel (topicLabel)}
										<span
											class="inline-flex items-center justify-center rounded-full border border-sky-900/60 bg-sky-950/30 px-2 py-1 text-center text-[11px] leading-none text-sky-200 uppercase"
										>
											{topicLabel}
										</span>
									{/each}
								</div>
								{#if session.relatedTasks.length > 0}
									<span class="ui-clamp-5 mt-2 block text-xs text-slate-500">
										Tasks: {session.relatedTasks.map((task) => task.title).join(', ')}
									</span>
								{/if}
								{#if session.archivedAt}
									<span class="mt-2 block text-xs text-slate-500">
										Archived {formatTimestamp(session.archivedAt)}
									</span>
								{/if}
								{#if session.latestRun?.lastMessage}
									<span class="ui-clamp-5 mt-2 block max-w-full text-xs text-slate-500">
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
									{formatThreadStateLabel(session.sessionState)}
								</span>
								<ThreadActivityIndicator {now} thread={session} compact />
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
								<p class="ui-clamp-5 mt-1 max-w-44 text-xs text-slate-500">
									{session.threadId}
								</p>
							{/if}
						</td>
						<td class="px-3 py-3 align-top">
							<p class="text-sm text-white">{resumeLabel(session)}</p>
						</td>
						<td class="px-3 py-3 align-top">
							<p class="ui-clamp-5 max-w-80 text-sm text-slate-300">{session.cwd}</p>
						</td>
						<td class="px-3 py-3 align-top">
							<AppButton href={resolve(`/app/threads/${session.id}`)} size="sm" variant="accent">
								View thread
							</AppButton>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</DataTableSection>
{/snippet}
<AppPage width="full" class="gap-6 px-4 py-5 sm:px-6 sm:py-8">
	<PageHeader
		eyebrow="Threads"
		title="Browse active and historical background threads"
		description="Use this page as the remote-work registry. The tables separate active runs from history, and each thread opens on its own detail page for logs, conversation turns, and follow-up work."
	>
		{#snippet meta()}
			<div
				class="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:flex-wrap sm:items-center"
			>
				<label
					class="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2"
				>
					<input bind:checked={autoRefresh} type="checkbox" />
					<span>Auto-refresh active runs every {autoRefreshIntervalLabel}</span>
				</label>
				<span>Refresh pauses while you are typing or when this tab is in the background.</span>
				<AppButton
					class="w-full sm:w-auto"
					type="button"
					variant="neutral"
					reserveLabel="Refreshing..."
					onclick={() => {
						void refreshSessions({ force: true });
					}}
					disabled={isRefreshing}
				>
					{isRefreshing ? 'Refreshing...' : 'Refresh all'}
				</AppButton>
			</div>
		{/snippet}
	</PageHeader>

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

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
		<MetricCard label="Active" value={activeCount} />
		<MetricCard label="Available" value={availableCount} />
		<MetricCard label="Closed / idle" value={inactiveCount} />
		<MetricCard label="Needs attention" value={attentionCount} />
		<MetricCard label="Archived" value={archivedCount} />
	</div>

	<div class="space-y-6">
		<CollectionToolbar
			title="Thread registry"
			description="Search by thread name, topic label, related task, path, thread state, thread id, or recent prompt text."
		>
			{#snippet controls()}
				<div class="w-full sm:max-w-sm">
					<label class="sr-only" for="session-search">Search threads</label>
					<input
						id="session-search"
						bind:value={query}
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
						placeholder="Search threads"
					/>
				</div>
			{/snippet}

			<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
		</CollectionToolbar>

		{#if selectedSessionIds.length > 0}
			<SelectionActionBar
				title={`${selectedSessionIds.length} ${selectedSessionIds.length === 1 ? 'thread' : 'threads'} selected`}
				description={selectedAction === 'archive'
					? 'Archive the selected threads to hide them from the default registry view.'
					: selectedAction === 'unarchive'
						? 'Restore the selected threads to the default registry view.'
						: 'Choose only archived threads or only unarchived threads for one bulk action.'}
				tone="muted"
			>
				{#snippet actions()}
					<AppButton
						type="button"
						variant={selectedAction === 'unarchive' ? 'accent' : 'neutral'}
						reserveLabel="Unarchive selected"
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
					</AppButton>
					<AppButton type="button" variant="ghost" onclick={clearSelection}>
						Clear selection
					</AppButton>
				{/snippet}
			</SelectionActionBar>
		{/if}

		{@render sessionTable(
			'Active threads',
			'Threads that currently have a queued or in-progress run.',
			activeSessions,
			'No active threads match the current search. Clear the search or open tasks to start new work.'
		)}

		{@render sessionTable(
			'Other threads',
			'Available, not-resumable, idle, and attention-needed threads kept for reference and follow-up.',
			historicalSessions,
			'No other threads match the current search. Clear the search or review archived threads if you expect older context.',
			true
		)}

		{#if showArchived}
			{@render sessionTable(
				'Archived threads',
				'Threads hidden from the default registry view. Select them here to restore them.',
				archivedSessions,
				'No archived threads match the current search. Clear the search or turn off archived mode when you are done reviewing history.'
			)}
		{/if}
	</div>
</AppPage>
