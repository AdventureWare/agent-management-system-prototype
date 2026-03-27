<script lang="ts">
	import { resolve } from '$app/paths';
	import PathField from '$lib/components/PathField.svelte';
	import type {
		AgentRunDetail,
		AgentRunStatus,
		AgentSessionDetail,
		AgentTimelineStep
	} from '$lib/types/agent-session';
	import { fade } from 'svelte/transition';

	let { data, form } = $props();
	let cwd = $state('');
	let query = $state('');
	let autoRefresh = $state(true);
	let isRefreshing = $state(false);
	let selectedSessionId = $state('');
	let selectedRunIdBySessionId = $state<Record<string, string>>({});
	let sessions = $state.raw<AgentSessionDetail[]>([]);
	let sendStateBySessionId = $state<
		Record<string, { status: 'sending' | 'success' | 'error'; message: string }>
	>({});
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
	let selectedSession = $derived.by(() => {
		return (
			filteredSessions.find((session) => session.id === selectedSessionId) ??
			filteredSessions[0] ??
			sessions.find((session) => session.id === selectedSessionId) ??
			sessions[0] ??
			null
		);
	});
	let selectedRun = $derived.by(() => {
		if (!selectedSession) {
			return null;
		}

		const selectedRunId = selectedRunIdBySessionId[selectedSession.id];

		return (
			selectedSession.runs.find((run) => run.id === selectedRunId) ??
			selectedSession.latestRun ??
			selectedSession.runs[0] ??
			null
		);
	});
	let chronologicalSelectedRuns = $derived.by(() => {
		if (!selectedSession) {
			return [];
		}

		return [...selectedSession.runs].reverse();
	});
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
		if (sessions.length === 0) {
			selectedSessionId = '';
			return;
		}

		if (!sessions.some((session) => session.id === selectedSessionId)) {
			selectedSessionId = sessions[0]?.id ?? '';
		}
	});

	$effect(() => {
		if (!selectedSession) {
			return;
		}

		const selectedRunId = selectedRunIdBySessionId[selectedSession.id];

		if (selectedRunId && selectedSession.runs.some((run) => run.id === selectedRunId)) {
			return;
		}

		const fallbackRunId = selectedSession.latestRun?.id ?? selectedSession.runs[0]?.id;

		if (!fallbackRunId) {
			return;
		}

		selectedRunIdBySessionId = {
			...selectedRunIdBySessionId,
			[selectedSession.id]: fallbackRunId
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

	function selectSession(sessionId: string) {
		selectedSessionId = sessionId;
	}

	function selectRun(sessionId: string, runId: string) {
		selectedRunIdBySessionId = {
			...selectedRunIdBySessionId,
			[sessionId]: runId
		};
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

	async function refreshSession(sessionId: string) {
		const response = await fetch(resolve(`/api/agents/sessions/${sessionId}`));

		if (response.status === 404) {
			await loadSessions();
			return;
		}

		if (!response.ok) {
			throw new Error('Could not refresh the updated session.');
		}

		const payload = (await response.json()) as { session: AgentSessionDetail };
		sessions = sessions.map((session) => (session.id === sessionId ? payload.session : session));
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

	async function refreshSelectedSession() {
		if (!selectedSession) {
			return;
		}

		try {
			await refreshSession(selectedSession.id);
			pageNotice = null;
		} catch (err) {
			pageNotice = {
				tone: 'error',
				message: err instanceof Error ? err.message : 'Could not refresh the selected session.'
			};
		}
	}

	function sendStateFor(sessionId: string) {
		return sendStateBySessionId[sessionId] ?? null;
	}

	async function submitFollowUp(event: SubmitEvent) {
		event.preventDefault();

		const formElement = event.currentTarget;
		if (!(formElement instanceof HTMLFormElement)) {
			return;
		}

		const formData = new FormData(formElement);
		const sessionId = formData.get('sessionId')?.toString().trim() ?? '';
		const prompt = formData.get('prompt')?.toString().trim() ?? '';

		if (!sessionId || !prompt) {
			if (sessionId) {
				sendStateBySessionId[sessionId] = {
					status: 'error',
					message: 'Session and prompt are required.'
				};
			}
			return;
		}

		if (sendStateBySessionId[sessionId]?.status === 'sending') {
			return;
		}

		const sessionName = sessions.find((session) => session.id === sessionId)?.name ?? 'the session';
		sendStateBySessionId[sessionId] = {
			status: 'sending',
			message: 'Queueing follow-up...'
		};

		try {
			const response = await fetch(resolve(`/api/agents/sessions/${sessionId}/messages`), {
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
			await refreshSession(sessionId);
			sendStateBySessionId[sessionId] = {
				status: 'success',
				message: 'Follow-up queued.'
			};
			pageNotice = {
				tone: 'success',
				message: `Follow-up queued for ${sessionName}.`
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Could not queue session message.';
			sendStateBySessionId[sessionId] = {
				status: 'error',
				message
			};
			pageNotice = {
				tone: 'error',
				message
			};
		}
	}

	function formatTimestamp(iso: string | null) {
		if (!iso) {
			return 'Not available';
		}

		return timestampFormatter.format(new Date(iso));
	}

	function timelineDotClass(state: AgentTimelineStep['state']) {
		switch (state) {
			case 'complete':
				return 'bg-emerald-400 ring-4 ring-emerald-950/60';
			case 'current':
				return 'bg-sky-400 ring-4 ring-sky-950/60';
			case 'attention':
				return 'bg-rose-400 ring-4 ring-rose-950/60';
			default:
				return 'bg-slate-700 ring-4 ring-slate-950/60';
		}
	}

	function timelineCardClass(state: AgentTimelineStep['state']) {
		switch (state) {
			case 'complete':
				return 'border-emerald-900/60 bg-emerald-950/20';
			case 'current':
				return 'border-sky-900/60 bg-sky-950/20';
			case 'attention':
				return 'border-rose-900/60 bg-rose-950/20';
			default:
				return 'border-slate-800 bg-slate-950/60';
		}
	}

	function timelineConnectorClass(state: AgentTimelineStep['state']) {
		switch (state) {
			case 'complete':
				return 'bg-emerald-900/70';
			case 'current':
				return 'bg-sky-900/70';
			case 'attention':
				return 'bg-rose-900/70';
			default:
				return 'bg-slate-800';
		}
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

	function latestRunStatus(run: AgentRunDetail | null) {
		return run?.state?.status ?? 'idle';
	}

	function runModeLabel(run: AgentRunDetail) {
		return run.mode === 'message' ? 'Follow-up' : 'Start';
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
</script>

{#snippet sessionTimeline(session: AgentSessionDetail)}
	<div class="space-y-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<p class="text-xs font-medium tracking-[0.16em] text-slate-400 uppercase">Run timeline</p>
			<p class="text-xs text-slate-500">
				{session.latestRun?.mode === 'message' ? 'Follow-up run' : 'Initial run'}
			</p>
		</div>

		<ol class="flex flex-col gap-3 lg:flex-row lg:items-start">
			{#each session.runTimeline as step, index (step.key)}
				<li class="flex min-w-0 flex-1 items-start gap-3 lg:basis-0">
					<div class="flex min-w-0 flex-1 items-start gap-3">
						<span class={`mt-1 h-2.5 w-2.5 rounded-full ${timelineDotClass(step.state)}`}></span>
						<div class={`min-w-0 flex-1 rounded-lg border p-3 ${timelineCardClass(step.state)}`}>
							<p class="text-sm font-medium text-white">{step.label}</p>
							<p class="mt-1 text-xs text-slate-400">{step.detail}</p>
						</div>
					</div>

					{#if index < session.runTimeline.length - 1}
						<div
							class={`mt-5 hidden w-6 shrink-0 rounded-full lg:block lg:h-px xl:w-8 ${timelineConnectorClass(step.state)}`}
						></div>
					{/if}
				</li>
			{/each}
		</ol>
	</div>
{/snippet}

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
				<table class="min-w-[980px] divide-y divide-slate-800 text-left">
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
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-900/80">
						{#each rows as session (session.id)}
							<tr
								class={[
									'transition',
									selectedSession?.id === session.id ? 'bg-slate-900/90' : 'bg-slate-950/30'
								]}
							>
								<td class="px-3 py-3 align-top">
									<button
										class="block text-left"
										type="button"
										aria-pressed={selectedSession?.id === session.id}
										aria-label={`Open details for ${session.name}`}
										onclick={() => {
											selectSession(session.id);
										}}
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
									</button>
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
			the selected session panel keeps the deeper controls, logs, and follow-up flow in one place.
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

	{#if selectedSession}
		<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-6">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div class="min-w-0 space-y-3">
					<div class="flex flex-wrap items-center gap-2">
						<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">
							Selected session
						</p>
						<span
							class={`rounded-full px-2 py-1 text-[11px] uppercase ${sessionStatusClass(selectedSession.status)}`}
						>
							{selectedSession.status}
						</span>
						<span
							class="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 uppercase"
						>
							{selectedSession.sandbox}
						</span>
					</div>
					<div>
						<h2 class="text-2xl font-semibold tracking-tight text-white">{selectedSession.name}</h2>
						<p class="mt-2 max-w-3xl text-sm text-slate-300">{selectedSession.statusSummary}</p>
					</div>
					<p class="max-w-4xl text-xs break-all text-slate-500">{selectedSession.cwd}</p>
				</div>

				<div class="flex flex-col gap-3 sm:flex-row">
					<button
						class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100"
						type="button"
						onclick={() => {
							void refreshSelectedSession();
						}}
					>
						Refresh selected
					</button>
					{#if selectedSession.hasActiveRun}
						<form method="POST" action="?/cancelRun">
							<input type="hidden" name="sessionId" value={selectedSession.id} />
							<button
								class="w-full rounded-lg border border-rose-900/70 bg-rose-950/30 px-4 py-2 text-sm font-medium text-rose-200 sm:w-auto"
								type="submit"
							>
								Cancel active run
							</button>
						</form>
					{/if}
				</div>
			</div>

			<div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
				<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
					<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Started</p>
					<p class="mt-2 text-sm font-medium text-white">
						{formatTimestamp(selectedSession.createdAt)}
					</p>
				</div>
				<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
					<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Last activity</p>
					<p class="mt-2 text-sm font-medium text-white">{selectedSession.lastActivityLabel}</p>
					<p class="mt-1 text-xs text-slate-500">
						{formatTimestamp(selectedSession.lastActivityAt)}
					</p>
				</div>
				<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
					<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Thread</p>
					<p class="mt-2 text-sm font-medium text-white">{threadLabel(selectedSession)}</p>
					{#if selectedSession.threadId}
						<p class="mt-1 max-w-full text-xs break-all text-slate-500">
							{selectedSession.threadId}
						</p>
					{/if}
				</div>
				<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
					<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Runs</p>
					<p class="mt-2 text-sm font-medium text-white">{selectedSession.runCount}</p>
				</div>
				<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
					<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Resume</p>
					<p class="mt-2 text-sm font-medium text-white">{resumeLabel(selectedSession)}</p>
				</div>
			</div>

			<div class="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
				<div class="space-y-4">
					{@render sessionTimeline(selectedSession)}

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
										class={`rounded-full px-2 py-1 text-[11px] uppercase ${runStatusClass(latestRunStatus(selectedRun))}`}
									>
										{latestRunStatus(selectedRun)}
									</span>
									<span
										class="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 uppercase"
									>
										{selectedRun.mode}
									</span>
								</div>
							</div>

							<div class="grid gap-3 sm:grid-cols-3">
								<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Queued</p>
									<p class="mt-2 text-sm text-white">{formatTimestamp(selectedRun.createdAt)}</p>
								</div>
								<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Finished</p>
									<p class="mt-2 text-sm text-white">
										{formatTimestamp(selectedRun.state?.finishedAt ?? null)}
									</p>
								</div>
								<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Thread target</p>
									<p class="mt-2 text-sm text-white">
										{selectedRun.requestedThreadId ?? 'Start a new thread'}
									</p>
								</div>
							</div>

							<div class="space-y-3">
								<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Instruction</p>
									<p class="mt-2 text-sm whitespace-pre-wrap text-slate-200">
										{selectedRun.prompt}
									</p>
								</div>

								<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Agent response</p>
									<p class="mt-2 text-sm whitespace-pre-wrap text-slate-200">
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
								class="mt-3 max-h-80 overflow-auto text-xs whitespace-pre-wrap text-slate-300">{selectedRun.logTail.join(
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
						method="POST"
						action="?/sendMessage"
						onsubmit={submitFollowUp}
					>
						<div class="flex flex-col gap-1">
							<h3 class="text-lg font-semibold text-white">Send follow-up</h3>
							<p class="text-sm text-slate-400">
								Queue the next instruction into the same session thread when it is ready.
							</p>
						</div>
						<input type="hidden" name="sessionId" value={selectedSession.id} />
						<textarea
							class="min-h-32 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
							name="prompt"
							placeholder={selectedSession.canResume
								? 'Send the next instruction.'
								: selectedSession.hasActiveRun
									? 'This session is busy until the current run finishes.'
									: 'This session cannot resume until a thread id is discovered.'}
							disabled={!selectedSession.canResume ||
								sendStateFor(selectedSession.id)?.status === 'sending'}
						></textarea>
						{#if sendStateFor(selectedSession.id)}
							<p
								class={[
									'text-sm',
									sendStateFor(selectedSession.id)?.status === 'error'
										? 'text-rose-300'
										: sendStateFor(selectedSession.id)?.status === 'success'
											? 'text-emerald-300'
											: 'text-sky-300'
								]}
							>
								{sendStateFor(selectedSession.id)?.message}
							</p>
						{/if}
						<button
							class="w-full rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-100 disabled:opacity-50 sm:w-auto"
							type="submit"
							disabled={!selectedSession.canResume ||
								sendStateFor(selectedSession.id)?.status === 'sending'}
						>
							{sendStateFor(selectedSession.id)?.status === 'sending'
								? 'Queueing...'
								: 'Send follow-up instruction'}
						</button>
					</form>

					<section class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
						<div class="flex flex-col gap-1">
							<h3 class="text-lg font-semibold text-white">Conversation history</h3>
							<p class="text-sm text-slate-400">
								Inspect each turn in the session and open any run to read the full prompt and
								response.
							</p>
						</div>

						<div class="mt-4 space-y-3">
							{#if chronologicalSelectedRuns.length === 0}
								<p class="rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">
									No runs have been recorded for this session yet.
								</p>
							{:else}
								{#each chronologicalSelectedRuns as run, index (run.id)}
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
											selectRun(selectedSession.id, run.id);
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
												class={`inline-flex rounded-full px-2 py-1 text-[11px] uppercase ${runStatusClass(latestRunStatus(run))}`}
											>
												{latestRunStatus(run)}
											</span>
										</div>

										<div class="mt-3 grid gap-3 lg:grid-cols-2">
											<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
												<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
													Instruction
												</p>
												<p class="mt-2 text-sm text-slate-300">
													{compactText(run.prompt, 180)}
												</p>
											</div>
											<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
												<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
													Response
												</p>
												<p class="mt-2 text-sm text-slate-300">
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
</section>
