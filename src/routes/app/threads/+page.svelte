<script lang="ts">
	import { resolve } from '$app/paths';
	import { fetchAgentThreads, updateAgentThreadArchiveState } from '$lib/client/agent-threads';
	import { agentThreadStore } from '$lib/client/agent-thread-store';
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
	import { fromStore } from 'svelte/store';
	import { fade } from 'svelte/transition';

	type ArchiveAction = 'archive' | 'unarchive';

	let { data } = $props<{
		data: { threads?: AgentThreadDetail[] };
	}>();
	let query = $state('');
	let autoRefresh = $state(true);
	let showArchived = $state(false);
	let isRefreshing = $state(false);
	let isUpdatingArchive = $state(false);
	let now = $state(Date.now());
	let selectedThreadIds = $state.raw<string[]>([]);
	let pageNotice = $state<{ tone: 'success' | 'error'; message: string } | null>(null);
	const threadStoreState = fromStore(agentThreadStore);

	const timestampFormatter = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});
	const autoRefreshIntervalLabel = `${ACTIVE_REFRESH_INTERVAL_MS / 1000}s`;
	let sessions = $derived.by(() =>
		threadStoreState.current.orderedIds
			.map((threadId) => threadStoreState.current.byId[threadId])
			.filter((session): session is AgentThreadDetail => Boolean(session))
	);
	let sessionById = $derived.by(
		() => new Map(sessions.map((session) => [session.id, session] as const))
	);
	let selectedThreadIdSet = $derived(new Set(selectedThreadIds));
	let sessionCollections = $derived.by(() => {
		const term = query.trim().toLowerCase();
		const filteredSessions: AgentThreadDetail[] = [];
		const unarchivedSessions: AgentThreadDetail[] = [];
		const archivedSessions: AgentThreadDetail[] = [];
		const activeSessions: AgentThreadDetail[] = [];
		const historicalSessions: AgentThreadDetail[] = [];
		let activeCount = 0;
		let availableCount = 0;
		let inactiveCount = 0;
		let attentionCount = 0;
		let archivedCount = 0;

		for (const session of sessions) {
			if (session.archivedAt) {
				archivedCount += 1;
			} else if (isActiveSessionState(session.threadState)) {
				activeCount += 1;
			} else if (session.threadState === 'ready') {
				availableCount += 1;
			} else if (session.threadState === 'attention') {
				attentionCount += 1;
			} else if (session.threadState === 'unavailable' || session.threadState === 'idle') {
				inactiveCount += 1;
			}

			if (term && !threadMatchesQuery(session, term)) {
				continue;
			}

			filteredSessions.push(session);

			if (session.archivedAt) {
				archivedSessions.push(session);
				continue;
			}

			unarchivedSessions.push(session);

			if (isActiveSessionState(session.threadState)) {
				activeSessions.push(session);
				continue;
			}

			historicalSessions.push(session);
		}

		return {
			filteredSessions,
			unarchivedSessions,
			archivedSessions,
			activeSessions,
			historicalSessions,
			activeCount,
			availableCount,
			inactiveCount,
			attentionCount,
			archivedCount
		};
	});
	let filteredSessions = $derived(sessionCollections.filteredSessions);
	let unarchivedSessions = $derived(sessionCollections.unarchivedSessions);
	let archivedSessions = $derived(sessionCollections.archivedSessions);
	let activeSessions = $derived(sessionCollections.activeSessions);
	let historicalSessions = $derived(sessionCollections.historicalSessions);
	let activeCount = $derived(sessionCollections.activeCount);
	let availableCount = $derived(sessionCollections.availableCount);
	let inactiveCount = $derived(sessionCollections.inactiveCount);
	let attentionCount = $derived(sessionCollections.attentionCount);
	let archivedCount = $derived(sessionCollections.archivedCount);
	let selectedThreads = $derived.by(() =>
		sessions.filter((session) => selectedThreadIdSet.has(session.id))
	);
	let selectedArchivedCount = $derived(
		selectedThreads.filter((session) => Boolean(session.archivedAt)).length
	);
	let selectedUnarchivedCount = $derived(selectedThreads.length - selectedArchivedCount);
	let selectedAction = $derived.by(() => {
		if (selectedThreadIds.length === 0) {
			return null;
		}

		if (selectedArchivedCount > 0 && selectedUnarchivedCount > 0) {
			return null;
		}

		return selectedArchivedCount > 0 ? ('unarchive' as const) : ('archive' as const);
	});

	$effect(() => {
		agentThreadStore.seedThreads(data.threads ?? [], { replace: true });
	});

	$effect(() => {
		const nextSelectedThreadIds = selectedThreadIds.filter((threadId) => sessionById.has(threadId));

		if (
			nextSelectedThreadIds.length === selectedThreadIds.length &&
			nextSelectedThreadIds.every((threadId, index) => threadId === selectedThreadIds[index])
		) {
			return;
		}

		selectedThreadIds = nextSelectedThreadIds;
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

	function isActiveSessionState(state: AgentThreadDetail['threadState']) {
		return state === 'starting' || state === 'waiting' || state === 'working';
	}

	function threadMatchesQuery(session: AgentThreadDetail, term: string) {
		return [
			session.name,
			session.cwd,
			session.threadState,
			formatThreadStateLabel(session.threadState),
			session.latestRunStatus,
			(session.topicLabels ?? []).join(' '),
			(session.categorization?.projectLabels ?? []).join(' '),
			(session.categorization?.goalLabels ?? []).join(' '),
			(session.categorization?.areaLabels ?? []).join(' '),
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
	}

	async function loadSessions() {
		agentThreadStore.seedThreads(await fetchAgentThreads({ includeArchived: true }), {
			replace: true
		});
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
		if (isUpdatingArchive || selectedThreadIds.length === 0) {
			return;
		}

		const threadIds = [...selectedThreadIds];
		isUpdatingArchive = true;

		try {
			const updatedThreadIds = await updateAgentThreadArchiveState(threadIds, archived);
			agentThreadStore.patchArchiveState(updatedThreadIds, archived);
			selectedThreadIds = [];
			pageNotice = {
				tone: 'success',
				message:
					updatedThreadIds.length === 1
						? `${archived ? 'Archived' : 'Unarchived'} 1 thread.`
						: `${archived ? 'Archived' : 'Unarchived'} ${updatedThreadIds.length} threads.`
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
		selectedThreadIds = [];
	}

	function handleShowArchivedChange(checked: boolean) {
		showArchived = checked;

		if (checked) {
			return;
		}

		selectedThreadIds = selectedThreadIds.filter((threadId) => {
			const session = sessionById.get(threadId);
			return !session?.archivedAt;
		});
	}

	function isThreadSelected(threadId: string) {
		return selectedThreadIdSet.has(threadId);
	}

	function toggleThreadSelection(threadId: string, checked: boolean) {
		if (checked) {
			selectedThreadIds = isThreadSelected(threadId)
				? selectedThreadIds
				: [...selectedThreadIds, threadId];
			return;
		}

		selectedThreadIds = selectedThreadIds.filter((candidate) => candidate !== threadId);
	}

	function setSelectionForRows(rows: AgentThreadDetail[], checked: boolean) {
		const rowIds = rows.map((session) => session.id);
		const rowIdSet = new Set(rowIds);

		if (checked) {
			selectedThreadIds = [...new Set([...selectedThreadIds, ...rowIds])];
			return;
		}

		selectedThreadIds = selectedThreadIds.filter((threadId) => !rowIdSet.has(threadId));
	}

	function areAllRowsSelected(rows: AgentThreadDetail[]) {
		return rows.length > 0 && rows.every((session) => isThreadSelected(session.id));
	}

	function selectedRowCount(rows: AgentThreadDetail[]) {
		return rows.filter((session) => isThreadSelected(session.id)).length;
	}

	function formatTimestamp(iso: string | null) {
		if (!iso) {
			return 'Not available';
		}

		return timestampFormatter.format(new Date(iso));
	}

	function sessionStatusClass(state: AgentThreadDetail['threadState']) {
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
		<div class="space-y-3 lg:hidden">
			<div
				class="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
			>
				<p class="text-xs font-medium tracking-[0.14em] text-slate-400 uppercase">
					Select shown threads
				</p>
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
			</div>

			{#each rows as session (session.id)}
				<article
					class={[
						'rounded-2xl border bg-slate-950/50 p-4',
						isThreadSelected(session.id) ? 'border-sky-500/40 bg-slate-900/80' : 'border-slate-800'
					]}
				>
					<div class="flex items-start gap-3">
						<label class="mt-1 inline-flex items-center gap-2">
							<input
								aria-label={`Select thread ${session.name}`}
								type="checkbox"
								checked={isThreadSelected(session.id)}
								onchange={(event) => {
									if (event.currentTarget instanceof HTMLInputElement) {
										toggleThreadSelection(session.id, event.currentTarget.checked);
									}
								}}
							/>
							<span class="sr-only">Select thread {session.name}</span>
						</label>

						<div class="min-w-0 flex-1 space-y-3">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0">
									<a
										class="block rounded-lg text-left transition outline-none hover:text-sky-200 focus-visible:ring-2 focus-visible:ring-sky-400"
										href={resolve(`/app/threads/${session.id}`)}
										aria-label={`View thread details for ${session.name}`}
									>
										<p class="ui-wrap-anywhere text-base font-semibold text-white">
											{session.name}
										</p>
										<p class="ui-clamp-3 mt-2 text-sm text-slate-400">
											{session.model ?? 'default model'} · {session.sandbox}
										</p>
									</a>
								</div>
								<span
									class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${sessionStatusClass(session.threadState)}`}
								>
									{formatThreadStateLabel(session.threadState)}
								</span>
							</div>

							<div class="flex flex-wrap gap-2">
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
								<p class="ui-clamp-3 text-xs text-slate-500">
									Tasks: {session.relatedTasks.map((task) => task.title).join(', ')}
								</p>
							{/if}
							{#if session.latestRun?.lastMessage}
								<p class="ui-clamp-3 text-xs text-slate-500">
									Last reply: {compactText(session.latestRun.lastMessage, 120)}
								</p>
							{/if}

							<div class="rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-3">
								<ThreadActivityIndicator {now} thread={session} compact />
								<p class="mt-2 text-xs text-slate-500">Latest run {session.latestRunStatus}</p>
							</div>

							<div class="grid gap-3 sm:grid-cols-2">
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Last activity
									</p>
									<p class="mt-2 text-sm text-white">
										{formatActivityAge(session.lastActivityAt, now)}
									</p>
									<p class="mt-1 text-xs text-slate-500">
										{formatTimestamp(session.lastActivityAt)}
									</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Started</p>
									<p class="mt-2 text-sm text-white">{formatTimestamp(session.createdAt)}</p>
									{#if session.archivedAt}
										<p class="mt-1 text-xs text-slate-500">
											Archived {formatTimestamp(session.archivedAt)}
										</p>
									{/if}
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Runs</p>
									<p class="mt-2 text-sm text-white">{session.runCount}</p>
									<p class="mt-1 text-xs text-slate-500">
										latest {session.latestRun?.mode === 'message' ? 'follow-up' : 'start'}
									</p>
								</div>
								<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Resume</p>
									<p class="mt-2 text-sm text-white">{resumeLabel(session)}</p>
									<p class="mt-1 text-xs text-slate-500">{threadLabel(session)}</p>
									{#if session.threadId}
										<p class="ui-clamp-2 mt-1 text-xs text-slate-500">{session.threadId}</p>
									{/if}
								</div>
							</div>

							<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Working directory
								</p>
								<p class="ui-clamp-3 mt-2 text-sm text-slate-300">{session.cwd}</p>
							</div>

							<AppButton
								class="w-full sm:w-auto"
								href={resolve(`/app/threads/${session.id}`)}
								size="sm"
								variant="accent"
							>
								View thread
							</AppButton>
						</div>
					</div>
				</article>
			{/each}
		</div>

		<table class="hidden min-w-[1100px] divide-y divide-slate-800 text-left lg:table">
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
							isThreadSelected(session.id) ? 'bg-slate-900/80' : ''
						]}
					>
						<td class="px-3 py-3 align-top">
							<label class="inline-flex items-center gap-2">
								<input
									aria-label={`Select thread ${session.name}`}
									type="checkbox"
									checked={isThreadSelected(session.id)}
									onchange={(event) => {
										if (event.currentTarget instanceof HTMLInputElement) {
											toggleThreadSelection(session.id, event.currentTarget.checked);
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
									class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${sessionStatusClass(session.threadState)}`}
								>
									{formatThreadStateLabel(session.threadState)}
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
<AppPage width="full" class="gap-6 px-1 py-4 sm:px-2 sm:py-6 xl:px-4">
	<PageHeader
		eyebrow="Threads"
		title="Browse active and historical threads"
		description="Use this page as the remote-work registry for live runs, resumable threads, and older history."
	>
		{#snippet meta()}
			<div class="space-y-2 text-sm text-slate-400">
				<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
					<label
						class="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2"
					>
						<input bind:checked={autoRefresh} type="checkbox" />
						<span>Auto-refresh every {autoRefreshIntervalLabel}</span>
					</label>
					<AppButton
						class="w-full sm:w-auto"
						type="button"
						variant="neutral"
						size="sm"
						reserveLabel="Refreshing..."
						onclick={() => {
							void refreshSessions({ force: true });
						}}
						disabled={isRefreshing}
					>
						{isRefreshing ? 'Refreshing...' : 'Refresh all'}
					</AppButton>
				</div>
				<p class="text-xs text-slate-500">
					Refresh pauses while you are typing or when this tab is in the background.
				</p>
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

	<div class="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-5">
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

		{#if selectedThreadIds.length > 0}
			<SelectionActionBar
				title={`${selectedThreadIds.length} ${selectedThreadIds.length === 1 ? 'thread' : 'threads'} selected`}
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
