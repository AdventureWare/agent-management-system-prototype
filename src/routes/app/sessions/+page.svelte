<script lang="ts">
	import { resolve } from '$app/paths';
	import PathField from '$lib/components/PathField.svelte';
	import type { AgentSessionDetail } from '$lib/types/agent-session';
	import { fade } from 'svelte/transition';

	let { data, form } = $props();
	let cwd = $state('');
	let query = $state('');
	let autoRefresh = $state(true);
	let isRefreshing = $state(false);
	let sessions = $state.raw<AgentSessionDetail[]>([]);
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
				session.status,
				session.threadId ?? '',
				session.latestRun?.prompt ?? '',
				session.latestRun?.lastMessage ?? ''
			]
				.join(' ')
				.toLowerCase()
				.includes(term);
		});
	});
	let activeSessions = $derived(
		filteredSessions.filter(
			(session) => session.status === 'running' || session.status === 'queued'
		)
	);
	let historicalSessions = $derived(
		filteredSessions.filter(
			(session) => session.status !== 'running' && session.status !== 'queued'
		)
	);
	let runningCount = $derived(sessions.filter((session) => session.status === 'running').length);
	let queuedCount = $derived(sessions.filter((session) => session.status === 'queued').length);
	let historicalCount = $derived(
		sessions.filter((session) => session.status !== 'running' && session.status !== 'queued').length
	);
	let resumableCount = $derived(sessions.filter((session) => session.canResume).length);
	let attentionCount = $derived(
		sessions.filter((session) => session.status === 'failed' || session.status === 'canceled')
			.length
	);
	let projectsWithRoots = $derived(data.projects);

	$effect(() => {
		sessions = data.sessions;
	});

	$effect(() => {
		if (!autoRefresh || activeSessions.length === 0) {
			return;
		}

		const intervalId = window.setInterval(() => {
			void refreshSessions();
		}, 10000);

		return () => {
			window.clearInterval(intervalId);
		};
	});

	function applyProjectRootSelection(event: Event) {
		const projectId = (event.currentTarget as HTMLSelectElement).value;
		if (!projectId) {
			return;
		}

		const project = projectsWithRoots.find((candidate) => candidate.id === projectId);
		if (project?.projectRootFolder) {
			cwd = project.projectRootFolder;
		}
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
		const response = await fetch(resolve('/api/agents/sessions'));

		if (!response.ok) {
			throw new Error('Could not refresh sessions.');
		}

		const payload = (await response.json()) as { sessions: AgentSessionDetail[] };
		sessions = payload.sessions;
	}

	async function refreshSessions() {
		if (isRefreshing || document.hidden || userIsEditingFormControl()) {
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

	function formatTimestamp(iso: string | null) {
		if (!iso) {
			return 'Not available';
		}

		return timestampFormatter.format(new Date(iso));
	}

	function sessionStatusClass(status: AgentSessionDetail['status']) {
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
				<p class="mt-2 text-xs text-slate-500">Open any session on its own detail page.</p>
			</div>
			<p class="text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">
				{rows.length} shown
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
				<table class="min-w-[1040px] divide-y divide-slate-800 text-left">
					<thead class="text-xs tracking-[0.16em] text-slate-500 uppercase">
						<tr>
							<th class="px-3 py-3 font-medium">Session</th>
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
							<tr class="bg-slate-950/30 transition hover:bg-slate-900/60">
								<td class="px-3 py-3 align-top">
									<a
										class="block rounded-lg text-left outline-none transition hover:text-sky-200 focus-visible:ring-2 focus-visible:ring-sky-400"
										href={resolve(`/app/sessions/${session.id}`)}
										aria-label={`View details for ${session.name}`}
										data-sveltekit-reload
									>
										<span class="block font-medium text-white">{session.name}</span>
										<span class="mt-1 block text-xs text-slate-400">
											{session.model ?? 'default model'} · {session.sandbox}
										</span>
										{#if session.latestRun?.lastMessage}
											<span class="mt-2 block max-w-72 text-xs text-slate-500">
												Last reply: {compactText(session.latestRun.lastMessage, 120)}
											</span>
										{/if}
									</a>
								</td>
								<td class="px-3 py-3 align-top">
									<span
										class={`inline-flex rounded-full px-2 py-1 text-[11px] uppercase ${sessionStatusClass(session.status)}`}
									>
										{session.status}
									</span>
								</td>
								<td class="px-3 py-3 align-top">
									<p class="text-sm text-white">{session.lastActivityLabel}</p>
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
										<p class="mt-1 max-w-44 truncate text-xs text-slate-500">{session.threadId}</p>
									{/if}
								</td>
								<td class="px-3 py-3 align-top">
									<p class="text-sm text-white">{resumeLabel(session)}</p>
								</td>
								<td class="px-3 py-3 align-top">
									<p class="max-w-80 text-sm break-all text-slate-300">{session.cwd}</p>
								</td>
								<td class="px-3 py-3 align-top">
									<a
										class="inline-flex rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
										href={resolve(`/app/sessions/${session.id}`)}
										data-sveltekit-reload
									>
										View session
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
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Sessions</p>
		<h1 class="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
			See what is running now and what already happened
		</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Use this page as the session registry. The top tables separate active work from history, and
			each session now opens on its own detail page for logs, conversation turns, and follow-up work.
		</p>
		<div
			class="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:flex-wrap sm:items-center"
		>
			<label
				class="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2"
			>
				<input bind:checked={autoRefresh} type="checkbox" />
				<span>Auto-refresh active runs every 10s</span>
			</label>
			<span>Refresh pauses while you are typing or when this tab is in the background.</span>
			<button
				class="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-slate-300 transition hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:rounded-full"
				type="button"
				onclick={() => {
					void refreshSessions();
				}}
				disabled={isRefreshing}
			>
				{isRefreshing ? 'Refreshing...' : 'Refresh all'}
			</button>
		</div>
	</div>

	{#if form?.message}
		<p class="rounded-xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

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
			<p class="text-sm text-slate-400">Running</p>
			<p class="mt-2 text-3xl font-semibold text-white">{runningCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Queued</p>
			<p class="mt-2 text-3xl font-semibold text-white">{queuedCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Past sessions</p>
			<p class="mt-2 text-3xl font-semibold text-white">{historicalCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Ready to resume</p>
			<p class="mt-2 text-3xl font-semibold text-white">{resumableCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Needs attention</p>
			<p class="mt-2 text-3xl font-semibold text-white">{attentionCount}</p>
		</div>
	</div>

	<div class="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
		<form
			class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-6"
			method="POST"
			action="?/startSession"
		>
			<h2 class="text-xl font-semibold text-white">Start session</h2>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Task name</span>
				<input
					class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					name="name"
					placeholder="Fix the onboarding flow"
					required
				/>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Start from a saved project</span
				>
				<select
					class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					onchange={applyProjectRootSelection}
				>
					<option value="">Choose a project root</option>
					{#each projectsWithRoots as project (project.id)}
						<option value={project.id}>{project.name} · {project.projectRootFolder}</option>
					{/each}
				</select>
			</label>

			<div>
				<PathField
					bind:value={cwd}
					createMode="folder"
					helperText="Use an existing folder or create the working directory before the run starts."
					inputId="start-session-cwd"
					label="Repository or folder path"
					name="cwd"
					options={data.folderOptions}
					placeholder="/Users/colinfreed/Projects/Products/Kwipoo/app"
					required
				/>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Sandbox</span>
					<select
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
						name="sandbox"
					>
						{#each data.sandboxOptions as sandbox (sandbox)}
							<option value={sandbox}>{sandbox}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Model</span>
					<input
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
						name="model"
						placeholder="optional"
					/>
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Task instructions</span>
				<textarea
					class="min-h-40 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					name="prompt"
					placeholder="Read the repo, inspect AGENTS.md, then implement the bug fix and run validation."
					required
				></textarea>
			</label>

			<button
				class="w-full rounded-lg bg-sky-500 px-4 py-2 font-medium text-slate-950 sm:w-auto"
				type="submit"
			>
				Start background Codex run
			</button>
		</form>

		<div class="space-y-6">
			<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-xl font-semibold text-white">Session index</h2>
						<p class="mt-1 text-sm text-slate-400">
							Search by task name, path, status, thread id, or recent prompt text.
						</p>
					</div>
					<div class="w-full sm:max-w-sm">
						<label class="sr-only" for="session-search">Search sessions</label>
						<input
							id="session-search"
							bind:value={query}
							class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
							placeholder="Search sessions"
						/>
					</div>
				</div>
			</section>

			{@render sessionTable(
				'Active sessions',
				'Runs that are currently working or still waiting to start.',
				activeSessions,
				'No active sessions match the current search.'
			)}

			{@render sessionTable(
				'Past sessions',
				'Completed, failed, canceled, or idle sessions kept for reference and follow-up.',
				historicalSessions,
				'No past sessions match the current search.'
			)}
		</div>
	</div>
</section>
