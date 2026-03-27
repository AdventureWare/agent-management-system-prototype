<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { AgentSessionDetail, AgentTimelineStep } from '$lib/types/agent-session';

	let { data, form } = $props();
	let cwd = $state('');
	let autoRefresh = $state(true);
	let isRefreshing = $state(false);

	let activeSessions = $derived(
		data.sessions.filter((session) => session.status === 'running' || session.status === 'queued')
	);
	let attentionSessions = $derived(
		data.sessions.filter((session) => session.status === 'failed' || session.status === 'canceled')
	);
	let finishedSessions = $derived(
		data.sessions.filter(
			(session) =>
				session.status !== 'running' &&
				session.status !== 'queued' &&
				session.status !== 'failed' &&
				session.status !== 'canceled'
		)
	);

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

	async function refreshSessions() {
		if (isRefreshing || document.hidden || userIsEditingFormControl()) {
			return;
		}

		isRefreshing = true;

		try {
			await invalidateAll();
		} finally {
			isRefreshing = false;
		}
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
				<li class="flex min-w-0 flex-1 items-start gap-3">
					<div class="flex min-w-0 flex-1 items-start gap-3">
						<span class={`mt-1 h-2.5 w-2.5 rounded-full ${timelineDotClass(step.state)}`}></span>
						<div class={`min-w-0 flex-1 rounded-lg border p-3 ${timelineCardClass(step.state)}`}>
							<p class="text-sm font-medium text-white">{step.label}</p>
							<p class="mt-1 text-xs text-slate-400">{step.detail}</p>
						</div>
					</div>

					{#if index < session.runTimeline.length - 1}
						<div
							class={`mt-5 hidden h-px flex-1 rounded-full lg:block ${timelineConnectorClass(step.state)}`}
						></div>
					{/if}
				</li>
			{/each}
		</ol>
	</div>
{/snippet}

<section class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Remote Work</p>
		<h1 class="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
			Assign a task and keep Codex running
		</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			This is the minimum useful control surface: start a background Codex run on your laptop, check
			how many runs are active, inspect logs, and send a follow-up prompt into the same thread after
			the first run completes.
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
			<span>Refresh pauses while you're typing or when this tab is in the background.</span>
			<button
				class="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-slate-300 transition hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:rounded-full"
				type="button"
				onclick={() => {
					void refreshSessions();
				}}
				disabled={isRefreshing}
			>
				{isRefreshing ? 'Refreshing...' : 'Refresh now'}
			</button>
		</div>
	</div>

	{#if form?.message}
		<p class="rounded-xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Running agents</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.summary.runningCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Queued agents</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.summary.queuedCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Finished runs</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.summary.completedCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Failed or canceled</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.summary.failedCount}</p>
		</div>
	</div>

	<div class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
		<form
			class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-6"
			method="POST"
			action="?/startSession"
		>
			<h2 class="text-xl font-semibold text-white">Start remote task</h2>

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
				<span class="mb-2 block text-sm font-medium text-slate-200">Pick a known folder</span>
				<select
					class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					onchange={(event) => {
						const value = (event.currentTarget as HTMLSelectElement).value;
						if (value) {
							cwd = value;
						}
					}}
				>
					<option value="">Choose a project folder</option>
					{#each data.folderOptions as option (option.path)}
						<option value={option.path}>{option.label}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Repository or folder path</span>
				<input
					bind:value={cwd}
					class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					list="folder-path-options"
					name="cwd"
					placeholder="/Users/colinfreed/Projects/Products/Kwipoo/app"
					required
				/>
			</label>

			<datalist id="folder-path-options">
				{#each data.folderOptions as option (option.path)}
					<option value={option.path}>{option.label}</option>
				{/each}
			</datalist>

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

		<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-6">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<h2 class="text-xl font-semibold text-white">Current runs</h2>
				<p class="text-xs text-slate-500">Sorted by what needs attention first.</p>
			</div>

			<div class="mt-4 space-y-4">
				{#if data.sessions.length === 0}
					<p class="text-sm text-slate-400">No runs yet.</p>
				{:else}
					{#if activeSessions.length > 0}
						<div class="space-y-4">
							<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
								<h3 class="text-sm font-semibold tracking-[0.18em] text-emerald-300 uppercase">
									Active
								</h3>
								<p class="text-xs text-slate-500">These are still working or waiting to start.</p>
							</div>
							{#each activeSessions as session (session.id)}
								<article
									class={[
										'space-y-4 rounded-xl border bg-slate-900/60 p-4',
										session.status === 'running'
											? 'border-emerald-800/70 ring-1 ring-emerald-900/50'
											: 'border-amber-800/70 ring-1 ring-amber-900/40'
									]}
								>
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div class="min-w-0 space-y-2">
											<div class="flex flex-wrap items-center gap-2">
												<h3 class="font-medium text-white">{session.name}</h3>
												<span
													class="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300 uppercase"
												>
													{session.sandbox}
												</span>
												<span
													class={[
														'rounded-full px-2 py-1 text-xs uppercase',
														session.status === 'running'
															? 'border border-emerald-800/70 bg-emerald-950/50 text-emerald-300'
															: 'border border-amber-800/70 bg-amber-950/50 text-amber-300'
													]}
												>
													{session.status}
												</span>
											</div>
											<p class="text-sm text-slate-300">{session.statusSummary}</p>
											<p class="text-xs break-all text-slate-500">{session.cwd}</p>
										</div>

										<form method="POST" action="?/cancelRun">
											<input type="hidden" name="sessionId" value={session.id} />
											<button
												class="w-full rounded-lg border border-rose-900/70 bg-rose-950/30 px-4 py-2 font-medium text-rose-200 sm:w-auto"
												type="submit"
											>
												Cancel run
											</button>
										</form>
									</div>

									<div class="grid gap-3 sm:grid-cols-3">
										<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
											<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">
												Last activity
											</p>
											<p class="mt-2 text-sm font-medium text-white">{session.lastActivityLabel}</p>
										</div>
										<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
											<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Thread</p>
											<p class="mt-2 text-sm font-medium text-white">
												{session.threadId ? 'Discovered' : 'Not yet'}
											</p>
										</div>
										<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
											<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Run count</p>
											<p class="mt-2 text-sm font-medium text-white">{session.runCount}</p>
										</div>
									</div>

									{@render sessionTimeline(session)}

									{#if session.latestRun}
										<div class="space-y-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-xs font-medium tracking-[0.16em] text-slate-400 uppercase">
												Current assignment
											</p>
											<p class="text-sm whitespace-pre-wrap text-slate-300">
												{session.latestRun.prompt}
											</p>
										</div>
									{/if}

									<details class="rounded-lg border border-slate-800 bg-black/30 p-3">
										<summary class="cursor-pointer text-sm font-medium text-slate-200">
											Recent log output
										</summary>
										{#if session.latestRun?.logTail?.length}
											<pre
												class="mt-3 max-h-72 overflow-auto text-xs whitespace-pre-wrap text-slate-300">{session.latestRun.logTail.join(
													'\n'
												)}</pre>
										{:else}
											<p class="mt-3 text-sm text-slate-400">No log lines yet.</p>
										{/if}
									</details>
								</article>
							{/each}
						</div>
					{/if}

					{#if attentionSessions.length > 0}
						<div class="space-y-4">
							<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
								<h3 class="text-sm font-semibold tracking-[0.18em] text-rose-300 uppercase">
									Needs Attention
								</h3>
								<p class="text-xs text-slate-500">These stopped or failed and need review.</p>
							</div>
							{#each attentionSessions as session (session.id)}
								<article class="space-y-4 rounded-xl border border-rose-900/60 bg-rose-950/10 p-4">
									<div
										class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between"
									>
										<div class="min-w-0 space-y-2">
											<div class="flex flex-wrap items-center gap-2">
												<h3 class="font-medium text-white">{session.name}</h3>
												<span
													class="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300 uppercase"
												>
													{session.sandbox}
												</span>
												<span
													class="rounded-full border border-rose-900/70 bg-rose-950/40 px-2 py-1 text-xs text-rose-300 uppercase"
												>
													{session.status}
												</span>
											</div>
											<p class="text-sm text-slate-300">{session.statusSummary}</p>
											<p class="text-xs break-all text-slate-500">{session.cwd}</p>
										</div>
										<div class="text-left text-xs text-slate-500 sm:text-right">
											<p>Last activity</p>
											<p class="mt-1 text-sm text-white">{session.lastActivityLabel}</p>
										</div>
									</div>

									{@render sessionTimeline(session)}

									{#if session.latestRun?.lastMessage}
										<div class="space-y-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-xs font-medium tracking-[0.16em] text-slate-400 uppercase">
												Last agent message
											</p>
											<p class="text-sm whitespace-pre-wrap text-slate-200">
												{session.latestRun.lastMessage}
											</p>
										</div>
									{/if}

									<details class="rounded-lg border border-slate-800 bg-black/30 p-3">
										<summary class="cursor-pointer text-sm font-medium text-slate-200">
											Inspect log output
										</summary>
										{#if session.latestRun?.logTail?.length}
											<pre
												class="mt-3 max-h-72 overflow-auto text-xs whitespace-pre-wrap text-slate-300">{session.latestRun.logTail.join(
													'\n'
												)}</pre>
										{:else}
											<p class="mt-3 text-sm text-slate-400">No log lines yet.</p>
										{/if}
									</details>

									<form class="space-y-3" method="POST" action="?/sendMessage">
										<input type="hidden" name="sessionId" value={session.id} />
										<textarea
											class="min-h-28 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
											name="prompt"
											placeholder={session.canResume
												? 'Send a recovery instruction or ask the agent to continue.'
												: 'This run cannot resume until a thread id is discovered.'}
											disabled={!session.canResume}
										></textarea>
										<button
											class="w-full rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-100 disabled:opacity-50 sm:w-auto"
											type="submit"
											disabled={!session.canResume}
										>
											Send follow-up instruction
										</button>
									</form>
								</article>
							{/each}
						</div>
					{/if}

					{#if finishedSessions.length > 0}
						<div class="space-y-4">
							<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
								<h3 class="text-sm font-semibold tracking-[0.18em] text-sky-300 uppercase">
									Completed
								</h3>
								<p class="text-xs text-slate-500">
									These finished and are available for follow-up.
								</p>
							</div>
							{#each finishedSessions as session (session.id)}
								<article class="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
									<div
										class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between"
									>
										<div class="min-w-0 space-y-2">
											<div class="flex flex-wrap items-center gap-2">
												<h3 class="font-medium text-white">{session.name}</h3>
												<span
													class="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300 uppercase"
												>
													{session.sandbox}
												</span>
												<span
													class="rounded-full border border-sky-800/70 bg-sky-950/50 px-2 py-1 text-xs text-sky-300 uppercase"
												>
													{session.status}
												</span>
											</div>
											<p class="text-sm text-slate-300">{session.statusSummary}</p>
											<p class="text-xs break-all text-slate-500">{session.cwd}</p>
										</div>

										<div class="text-left text-xs text-slate-500 sm:text-right">
											<p>Last activity</p>
											<p class="mt-1 text-sm text-white">{session.lastActivityLabel}</p>
										</div>
									</div>

									{@render sessionTimeline(session)}

									<div class="grid gap-3 sm:grid-cols-4">
										<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
											<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Thread</p>
											<p class="mt-2 text-sm font-medium text-white">
												{session.threadId ? 'Ready' : 'Missing'}
											</p>
										</div>
										<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
											<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Runs</p>
											<p class="mt-2 text-sm font-medium text-white">{session.runCount}</p>
										</div>
										<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
											<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Exit code</p>
											<p class="mt-2 text-sm font-medium text-white">
												{session.lastExitCode ?? 'n/a'}
											</p>
										</div>
										<div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
											<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Resume</p>
											<p class="mt-2 text-sm font-medium text-white">
												{session.canResume ? 'Available' : 'Blocked'}
											</p>
										</div>
									</div>

									{#if session.latestRun?.lastMessage}
										<div class="space-y-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
											<p class="text-xs font-medium tracking-[0.16em] text-slate-400 uppercase">
												Last agent message
											</p>
											<p class="text-sm whitespace-pre-wrap text-slate-200">
												{session.latestRun.lastMessage}
											</p>
										</div>
									{/if}

									<details class="rounded-lg border border-slate-800 bg-black/30 p-3">
										<summary class="cursor-pointer text-sm font-medium text-slate-200">
											Show task and logs
										</summary>
										{#if session.latestRun}
											<div class="mt-3 space-y-3">
												<div class="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
													<p class="text-xs font-medium tracking-[0.16em] text-slate-400 uppercase">
														Last assignment
													</p>
													<p class="mt-2 text-sm whitespace-pre-wrap text-slate-300">
														{session.latestRun.prompt}
													</p>
												</div>
												{#if session.latestRun.logTail.length > 0}
													<pre
														class="max-h-72 overflow-auto text-xs whitespace-pre-wrap text-slate-300">{session.latestRun.logTail.join(
															'\n'
														)}</pre>
												{/if}
											</div>
										{/if}
									</details>

									<form class="space-y-3" method="POST" action="?/sendMessage">
										<input type="hidden" name="sessionId" value={session.id} />
										<textarea
											class="min-h-28 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
											name="prompt"
											placeholder={session.canResume
												? 'Send the next instruction.'
												: 'This run cannot resume until a thread id is discovered.'}
											disabled={!session.canResume}
										></textarea>
										<button
											class="w-full rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-100 disabled:opacity-50 sm:w-auto"
											type="submit"
											disabled={!session.canResume}
										>
											Send follow-up instruction
										</button>
									</form>
								</article>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		</section>
	</div>
</section>
