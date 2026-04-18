<script lang="ts">
	import { resolve } from '$app/paths';
	import { appNavigationSections } from '$lib/app-navigation';
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
			A task-first control plane for keeping Codex work moving while you are away.
		</h1>
		<p class="max-w-3xl text-base text-slate-300 sm:text-lg">
			The real workflow today is tasks, runs, and resumable threads. Projects, goals, planning,
			executionSurfaces, roles, and providers are already modeled, but they currently support that
			core loop more than they replace it.
		</p>
		<div class="flex flex-wrap gap-3">
			<a
				class="rounded-lg bg-sky-500 px-4 py-2 font-medium text-slate-950"
				href={resolve('/app/tasks')}
			>
				Open task queue
			</a>
			<a
				class="rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-100"
				href={resolve('/app/threads')}
			>
				Open threads
			</a>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Projects</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.summary.projectCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Goals</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.summary.goalCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Tasks in progress</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.summary.runningTaskCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
			<p class="text-sm text-slate-400">Runs recorded</p>
			<p class="mt-2 text-3xl font-semibold text-white">{data.summary.runCount}</p>
		</div>
	</div>

	<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
		<div class="flex flex-col gap-2">
			<h2 class="text-xl font-semibold text-white">Browse the control plane</h2>
			<p class="max-w-3xl text-sm text-slate-400">
				The app is organized around overview, daily work, supporting context, and execution
				capacity. Start in the section that matches the question you need answered.
			</p>
		</div>

		<div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			{#each appNavigationSections as section (section.id)}
				<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
					<p class="text-xs font-semibold tracking-[0.2em] text-sky-300 uppercase">
						{section.title}
					</p>
					<p class="mt-3 text-sm text-slate-300">{section.description}</p>
					<div class="mt-4 flex flex-wrap gap-2">
						{#each section.links as link (link.href)}
							<a
								class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-600 hover:text-white"
								href={resolve(link.href)}
							>
								{link.label}
							</a>
						{/each}
					</div>
				</article>
			{/each}
		</div>
	</section>

	<div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
		<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
			<h2 class="text-xl font-semibold text-white">Primary workflow right now</h2>
			<ul class="mt-4 space-y-3 text-sm text-slate-300">
				<li>Create and manage tasks as the main work object.</li>
				<li>Launch background Codex work and reuse existing threads when possible.</li>
				<li>Track run outcomes, errors, prompt digests, and artifacts.</li>
				<li>Review blockers, approvals, stale work, and follow-up opportunities.</li>
			</ul>
		</section>

		<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
			<h2 class="text-xl font-semibold text-white">Supporting structure already in place</h2>
			<ul class="mt-4 space-y-3 text-sm text-slate-300">
				<li>Projects for workspace, artifact, repo, branch, and sandbox defaults.</li>
				<li>Goals for outcome grouping and linked project/task relationships.</li>
				<li>Planning for reviewing date windows, load, and goal commitments.</li>
				<li>
					Execution surfaces, roles, and providers for routing, staffing, and execution metadata.
				</li>
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
								Area · {goal.area}
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
