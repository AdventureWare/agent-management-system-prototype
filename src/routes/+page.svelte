<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatTaskStatusLabel, taskStatusToneClass } from '$lib/types/control-plane';

	let { data } = $props();
</script>

<svelte:head>
	<title>Agent Control Plane Prototype</title>
</svelte:head>

<section class="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12">
	<div class="space-y-4">
		<p class="text-sm font-semibold tracking-[0.28em] text-sky-300 uppercase">
			Agent Control Plane
		</p>
		<h1 class="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
			A minimal control plane for keeping Codex working on your laptop while you are away.
		</h1>
		<p class="max-w-3xl text-base text-slate-300 sm:text-lg">
			The first usable goal is simple: remotely assign a task, start a background Codex run, and
			check how many runs are active or finished.
		</p>
		<div class="flex flex-wrap gap-3">
			<a
				class="rounded-lg bg-sky-500 px-4 py-2 font-medium text-slate-950"
				href={resolve('/app/sessions')}
			>
				Open remote work
			</a>
			<a
				class="rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-100"
				href={resolve('/app/sessions')}
			>
				Launch Codex run
			</a>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Server-backed</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.summary.goalCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Tasks in progress</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.summary.runningTaskCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Blocked tasks</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.summary.blockedTaskCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Workers online</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.summary.onlineWorkerCount}</p>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
		<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
			<h2 class="text-xl font-semibold text-white">What this prototype handles now</h2>
			<ul class="mt-4 space-y-3 text-sm text-slate-300">
				<li>Background Codex runs launched from a browser.</li>
				<li>Logs and last-message capture on disk.</li>
				<li>A single page to monitor active and finished runs.</li>
				<li>Follow-up instructions into the same Codex thread after the first run finishes.</li>
			</ul>
		</section>

		<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
			<h2 class="text-xl font-semibold text-white">Next layers after this slice</h2>
			<ul class="mt-4 space-y-3 text-sm text-slate-300">
				<li>Authentication before exposing it beyond your laptop.</li>
				<li>Auto-refresh or websocket status updates.</li>
				<li>A simple task inbox that launches sessions automatically.</li>
				<li>Deployment or secure remote access so you can use it away from home.</li>
			</ul>
		</section>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
			<h2 class="text-xl font-semibold text-white">Active goals</h2>
			<div class="mt-4 space-y-3">
				{#each data.goals as goal (goal.id)}
					<div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
						<div class="flex items-center justify-between gap-3">
							<h3 class="font-medium text-white">{goal.name}</h3>
							<span
								class="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300 uppercase"
							>
								{goal.lane}
							</span>
						</div>
						<p class="mt-2 text-sm text-slate-300">{goal.summary}</p>
						<p class="mt-3 text-xs text-slate-500">{goal.artifactPath}</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
			<h2 class="text-xl font-semibold text-white">Recent tasks</h2>
			<div class="mt-4 space-y-3">
				{#each data.tasks as task (task.id)}
					<div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
						<div class="flex items-center justify-between gap-3">
							<h3 class="font-medium text-white">{task.title}</h3>
							<span
								class={`rounded-full border px-2 py-1 text-xs uppercase ${taskStatusToneClass(task.status)}`}
							>
								{formatTaskStatusLabel(task.status)}
							</span>
						</div>
						<p class="mt-2 text-sm text-slate-300">{task.summary}</p>
					</div>
				{/each}
			</div>
		</section>
	</div>
</section>
