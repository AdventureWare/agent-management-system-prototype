<script lang="ts">
	import { resolve } from '$app/paths';
	import SessionActivityIndicator from '$lib/components/SessionActivityIndicator.svelte';
	import { formatTaskStatusLabel } from '$lib/types/control-plane';

	let { data, form } = $props();

	let updateSuccess = $derived(form?.ok && form?.successAction === 'updateTask');
	let attachSuccess = $derived(form?.ok && form?.successAction === 'attachTaskFile');
	let removeAttachmentSuccess = $derived(
		form?.ok && form?.successAction === 'removeTaskAttachment'
	);
	let threadAssignSuccess = $derived(form?.ok && form?.successAction === 'updateTaskThread');
	let launchSuccess = $derived(form?.ok && form?.successAction === 'launchTaskSession');
	let showAllCandidateThreads = $state(false);
	let visibleCandidateThreads = $derived(
		showAllCandidateThreads ? data.candidateThreads : data.candidateThreads.slice(0, 3)
	);
	let governanceSuccessMessage = $derived.by(() => {
		switch (form?.successAction) {
			case 'approveReview':
				return 'Review approved.';
			case 'requestChanges':
				return 'Changes requested and task moved back into attention.';
			case 'approveApproval':
				return 'Approval granted.';
			case 'rejectApproval':
				return 'Approval rejected and task blocked.';
			default:
				return '';
		}
	});

	function statusClass(status: string) {
		switch (status) {
			case 'done':
				return 'border-emerald-900/70 bg-emerald-950/40 text-emerald-300';
			case 'blocked':
				return 'border-rose-900/70 bg-rose-950/40 text-rose-300';
			case 'review':
				return 'border-sky-800/70 bg-sky-950/40 text-sky-200';
			case 'in_progress':
				return 'border-amber-900/70 bg-amber-950/40 text-amber-300';
			default:
				return 'border-slate-700 bg-slate-950/70 text-slate-300';
		}
	}

	function threadStateLabel(state: string) {
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
				return 'Needs attention';
			case 'unavailable':
				return 'Not resumable';
			default:
				return 'Idle';
		}
	}

	function threadActionLabel() {
		if (!data.task.linkThread) {
			return '';
		}

		if (data.task.statusThread?.id === data.task.linkThread.id) {
			switch (data.task.statusThread.sessionState) {
				case 'starting':
				case 'waiting':
				case 'working':
					return 'Open active thread';
			}
		}

		return data.task.linkThreadKind === 'latest' ? 'Open latest thread' : 'Open assigned thread';
	}

	function compactText(value: string, maxLength = 320) {
		const normalized = value.replace(/\s+/g, ' ').trim();

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
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
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div class="space-y-3">
			<a
				class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase transition hover:text-sky-200"
				href={resolve('/app/tasks')}
			>
				Tasks
			</a>
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="ui-wrap-anywhere text-3xl font-semibold tracking-tight text-white">
					{data.task.title}
				</h1>
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${statusClass(data.task.status)}`}
				>
					{formatTaskStatusLabel(data.task.status)}
				</span>
			</div>
			<p class="ui-wrap-anywhere max-w-3xl text-sm text-slate-300">{data.task.summary}</p>
		</div>

		<div class="grid w-full gap-3 sm:grid-cols-2 lg:max-w-xl">
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Project</p>
				<p class="ui-wrap-anywhere mt-3 text-lg font-semibold text-white">
					{data.task.projectName}
				</p>
				{#if data.project}
					<a
						class="mt-2 inline-flex text-sm text-sky-300 transition hover:text-sky-200"
						href={resolve(`/app/projects/${data.project.id}`)}
					>
						Open project details
					</a>
				{/if}
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Assignee</p>
				<p class="ui-wrap-anywhere mt-3 text-lg font-semibold text-white">
					{data.task.assigneeName}
				</p>
				<p class="mt-2 text-sm text-slate-400">
					Desired role: {data.task.desiredRoleId || 'Not set'}
				</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Runs recorded
				</p>
				<p class="mt-3 text-3xl font-semibold text-white">{data.task.runCount}</p>
				<p class="mt-2 text-sm text-slate-400">Updated {data.task.updatedAtLabel}</p>
			</article>
			<article class="card border border-slate-800 bg-slate-950/70 p-4">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Thread access
				</p>
				{#if data.task.linkThread}
					<div class="mt-3 flex flex-wrap items-center gap-3">
						<a
							class="inline-flex rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
							href={resolve(`/app/sessions/${data.task.linkThread.id}`)}
						>
							{threadActionLabel()}
						</a>
						<p class="ui-wrap-anywhere text-sm font-medium text-white">
							{data.task.linkThread.name}
						</p>
					</div>
					{#if data.task.statusThread}
						<div class="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2">
							<SessionActivityIndicator compact session={data.task.statusThread} />
						</div>
					{/if}
					{#if data.task.linkThread.id !== data.task.statusThread?.id}
						<p class="mt-2 text-xs text-slate-500">
							{threadStateLabel(data.task.linkThread.sessionState)}
						</p>
					{/if}
				{:else}
					<p class="mt-3 text-lg font-semibold text-white">None yet</p>
					<p class="mt-2 text-sm text-slate-400">
						Launch the task to create a thread, or assign an existing thread below.
					</p>
				{/if}
			</article>
		</div>
	</div>

	{#if form?.message}
		<p class="card border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if updateSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Task updates saved.
		</p>
	{:else if attachSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			File attached to the task.
		</p>
	{:else if removeAttachmentSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Attachment removed from the task.
		</p>
	{:else if threadAssignSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Thread assignment updated.
		</p>
	{:else if launchSuccess}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			Task queued in its work thread.
			{#if form?.sessionId}
				<a class="underline" href={resolve(`/app/sessions/${form.sessionId.toString()}`)}>
					Open thread details
				</a>
				for `{form.sessionId}`.
			{/if}
		</p>
	{:else if governanceSuccessMessage}
		<p
			class="card border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
		>
			{governanceSuccessMessage}
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
		<form
			class="space-y-4 card border border-slate-800 bg-slate-950/70 p-6"
			method="POST"
			action="?/updateTask"
		>
			<div class="space-y-2">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Task details</p>
				<h2 class="text-xl font-semibold text-white">Edit task brief and execution settings</h2>
				<p class="text-sm text-slate-400">
					Keep the collection page lightweight. Use this page to edit the task itself.
				</p>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
				<input class="input text-white" name="name" required value={data.task.title} />
			</label>

			<div class="grid gap-4 lg:grid-cols-[1fr_220px]">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Project</span>
					<select class="select text-white" name="projectId" required>
						{#each data.projects as project (project.id)}
							<option value={project.id} selected={data.task.projectId === project.id}>
								{project.name}
							</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
					<select class="select text-white" name="status">
						{#each data.statusOptions as status (status)}
							<option value={status} selected={data.task.status === status}>
								{formatTaskStatusLabel(status)}
							</option>
						{/each}
					</select>
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Assigned worker</span>
				<select class="select text-white" name="assigneeWorkerId">
					<option value="" selected={!data.task.assigneeWorkerId}>Unassigned</option>
					{#each data.workers as worker (worker.id)}
						<option value={worker.id} selected={data.task.assigneeWorkerId === worker.id}>
							{worker.name}
						</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Instructions</span>
				<textarea class="textarea min-h-40 text-white" name="instructions" required
					>{data.task.summary}</textarea
				>
			</label>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Created</p>
					<p class="mt-2">{new Date(data.task.createdAt).toLocaleString()}</p>
				</div>
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Artifact path
					</p>
					<p class="ui-wrap-anywhere mt-2">{data.task.artifactPath || 'Not set'}</p>
				</div>
			</div>

			<div class="flex flex-col gap-3 sm:flex-row">
				<button class="btn border border-slate-700 font-semibold text-slate-100" type="submit">
					Save task
				</button>

				<button
					class="btn border border-sky-800/70 bg-sky-950/40 font-semibold text-sky-200"
					type="submit"
					formaction="?/launchTaskSession"
				>
					Run task
				</button>
			</div>
		</form>

		<div class="space-y-6">
			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Attachments</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Attached files</h2>
				<p class="mt-2 max-w-2xl text-sm text-slate-400">
					Upload supporting files for this task. Files are stored under the task artifact area so
					the worker thread and human reviewer can reference the same source material.
				</p>

				<form
					class="mt-5 space-y-4"
					method="POST"
					action="?/attachTaskFile"
					enctype="multipart/form-data"
				>
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Choose file</span>
						<input
							class="file-input w-full border border-slate-700 bg-slate-900 text-slate-100"
							name="attachment"
							type="file"
							required
						/>
					</label>

					<div
						class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300"
					>
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Storage root
						</p>
						<p class="ui-wrap-anywhere mt-2">{data.attachmentRoot || 'Not configured'}</p>
					</div>

					<button class="btn border border-slate-700 font-semibold text-slate-100" type="submit">
						Attach file
					</button>
				</form>

				<div class="mt-5 space-y-4">
					{#if data.task.attachments.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No files attached to this task yet.
						</p>
					{:else}
						{#each data.task.attachments as attachment (attachment.id)}
							<article class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0">
										<p class="ui-wrap-anywhere font-medium text-white">{attachment.name}</p>
										<p class="mt-2 text-sm text-slate-300">
											{formatAttachmentSize(attachment.sizeBytes)} · {attachment.contentType ||
												'Unknown type'}
										</p>
										<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">{attachment.path}</p>
										<p class="mt-2 text-xs text-slate-500">
											Attached {new Date(attachment.attachedAt).toLocaleString()}
										</p>
									</div>
									<div class="flex flex-col gap-2 sm:items-end">
										<a
											class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
											href={resolve(`/api/tasks/${data.task.id}/attachments/${attachment.id}`)}
										>
											Download
										</a>
										<form method="POST" action="?/removeTaskAttachment">
											<input type="hidden" name="attachmentId" value={attachment.id} />
											<button
												class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-rose-400/40 hover:text-rose-200"
												type="submit"
											>
												Detach
											</button>
										</form>
									</div>
								</div>
							</article>
						{/each}
					{/if}
				</div>
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Thread continuity
				</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Assign this task to a work thread</h2>
				<p class="mt-2 max-w-2xl text-sm text-slate-400">
					A work thread is reusable context. Assign this task to an existing thread when you want
					follow-up work to continue in the same conversation instead of creating a fresh one.
				</p>

				<form class="mt-5 space-y-4" method="POST" action="?/updateTaskThread">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Assigned thread</span>
						<select class="select text-white" name="threadSessionId">
							<option value="" selected={!data.task.threadSessionId}>No assigned thread</option>
							{#each data.candidateThreads as thread (thread.id)}
								<option value={thread.id} selected={data.task.threadSessionId === thread.id}>
									{thread.name} · {threadStateLabel(thread.sessionState)} ·
									{thread.canResume ? 'ready' : thread.hasActiveRun ? 'busy' : 'blocked'}
								</option>
							{/each}
						</select>
					</label>

					<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<button class="btn border border-slate-700 font-semibold text-slate-100" type="submit">
							Save thread assignment
						</button>
						{#if data.task.linkThread}
							<a
								class="text-sm text-sky-300 transition hover:text-sky-200"
								href={resolve(`/app/sessions/${data.task.linkThread.id}`)}
							>
								{threadActionLabel()}
							</a>
						{/if}
					</div>
				</form>

				{#if data.candidateThreads.length > 0}
					<div class="mt-5 space-y-3">
						{#each visibleCandidateThreads as thread (thread.id)}
							<div class="relative rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
								<a
									class="absolute top-4 right-4 text-sm text-sky-300 transition hover:text-sky-200"
									href={resolve(`/app/sessions/${thread.id}`)}
								>
									Open thread
								</a>
								<div class="pr-28">
									<p class="thread-name-clamp text-sm font-medium text-white">
										{thread.name}
									</p>
									<p class="mt-1 text-xs text-slate-500">
										{threadStateLabel(thread.sessionState)} ·
										{thread.canResume
											? 'Ready for follow-up'
											: thread.hasActiveRun
												? 'Busy'
												: 'Blocked'}
									</p>
								</div>
								{#if thread.previewText}
									<p class="thread-preview-clamp mt-3 text-sm leading-6 text-slate-300">
										{compactText(thread.previewText)}
									</p>
								{/if}
								<p class="mt-3 text-xs text-slate-400">
									{thread.relatedTasks.length > 0
										? `Related tasks: ${thread.relatedTasks.map((task) => task.title).join(', ')}`
										: 'No tasks linked yet.'}
								</p>
							</div>
						{/each}
					</div>
					{#if data.candidateThreads.length > 3}
						<button
							class="mt-4 text-sm text-sky-300 transition hover:text-sky-200"
							type="button"
							onclick={() => {
								showAllCandidateThreads = !showAllCandidateThreads;
							}}
						>
							{showAllCandidateThreads
								? 'Show fewer threads'
								: `See more threads (${data.candidateThreads.length - 3} more)`}
						</button>
					{/if}
				{:else}
					<p class="mt-5 text-sm text-slate-500">
						No reusable threads match this project context yet.
					</p>
				{/if}
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Governance</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Review and approval state</h2>

				<div class="mt-5 space-y-4">
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Open review
								</p>
								<p class="mt-2 text-sm text-white">
									{data.task.openReview
										? data.task.openReview.summary || 'Waiting on reviewer decision.'
										: 'No open review'}
								</p>
							</div>
							{#if data.task.openReview}
								<span
									class="badge border border-sky-800/70 bg-sky-950/40 text-[0.7rem] tracking-[0.2em] text-sky-200 uppercase"
								>
									{data.task.openReview.status}
								</span>
							{/if}
						</div>

						{#if data.task.openReview}
							<div class="mt-4 flex flex-col gap-3 sm:flex-row">
								<form method="POST" action="?/approveReview">
									<button
										class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200"
										type="submit"
									>
										Approve review
									</button>
								</form>
								<form method="POST" action="?/requestChanges">
									<button
										class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
										type="submit"
									>
										Request changes
									</button>
								</form>
							</div>
						{/if}
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
									Pending approval
								</p>
								<p class="mt-2 text-sm text-white">
									{data.task.pendingApproval
										? data.task.pendingApproval.summary ||
											`Waiting on ${data.task.pendingApproval.mode} approval.`
										: 'No pending approval'}
								</p>
							</div>
							{#if data.task.pendingApproval}
								<span
									class="badge border border-amber-800/70 bg-amber-950/40 text-[0.7rem] tracking-[0.2em] text-amber-200 uppercase"
								>
									{data.task.pendingApproval.mode}
								</span>
							{/if}
						</div>

						{#if data.task.pendingApproval}
							<div class="mt-4 flex flex-col gap-3 sm:flex-row">
								<form method="POST" action="?/approveApproval">
									<button
										class="btn border border-emerald-800/70 bg-emerald-950/40 font-semibold text-emerald-200"
										type="submit"
									>
										Approve gate
									</button>
								</form>
								<form method="POST" action="?/rejectApproval">
									<button
										class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
										type="submit"
									>
										Reject gate
									</button>
								</form>
							</div>
						{/if}
					</div>
				</div>
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
					Dependency context
				</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Dependencies and execution notes</h2>

				<div class="mt-5 space-y-4">
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Goal link
						</p>
						<p class="mt-2 text-sm text-white">{data.task.goalId || 'No goal linked'}</p>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Blocked reason
						</p>
						<p class="mt-2 text-sm text-white">
							{data.task.blockedReason || 'No blocker recorded'}
						</p>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Dependencies
						</p>
						{#if data.dependencyTasks.length === 0}
							<p class="mt-2 text-sm text-slate-400">No dependencies recorded.</p>
						{:else}
							<div class="mt-3 space-y-3">
								{#each data.dependencyTasks as dependency (dependency.id)}
									<a
										class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3 transition hover:border-sky-400/40"
										href={resolve(`/app/tasks/${dependency.id}`)}
									>
										<span class="text-sm text-white">{dependency.title}</span>
										<span
											class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${statusClass(dependency.status)}`}
										>
											{formatTaskStatusLabel(dependency.status)}
										</span>
									</a>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</section>

			<section class="card border border-slate-800 bg-slate-950/70 p-6">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
							Run history
						</p>
						<h2 class="mt-2 text-xl font-semibold text-white">Execution timeline</h2>
					</div>
					<a
						class="rounded-full border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
						href={resolve('/app/runs')}
					>
						Open runs
					</a>
				</div>

				<div class="mt-5 space-y-4">
					{#if data.relatedRuns.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
						>
							No runs recorded yet.
						</p>
					{:else}
						{#each data.relatedRuns as run (run.id)}
							<article class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div>
										<div class="flex flex-wrap items-center gap-2">
										<a
											class="font-medium text-white transition hover:text-sky-200"
											href={resolve(`/app/runs/${run.id}`)}
										>
											{run.id}
										</a>
											<span
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${statusClass(run.status === 'completed' ? 'done' : run.status === 'failed' ? 'blocked' : run.status === 'running' ? 'in_progress' : 'ready')}`}
											>
												{run.status}
											</span>
										</div>
										<p class="mt-2 text-sm text-slate-300">
											{run.summary || 'No summary recorded.'}
										</p>
									</div>
									<p class="text-xs text-slate-500">Updated {run.updatedAtLabel}</p>
								</div>

								<div class="mt-4 grid gap-3 sm:grid-cols-3">
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Worker</p>
										<p class="mt-2 text-sm text-white">{run.workerName}</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Provider</p>
										<p class="mt-2 text-sm text-white">{run.providerName}</p>
									</div>
									<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
										<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Session</p>
										{#if run.sessionId}
											<a
												class="mt-2 inline-flex text-sm text-sky-300 transition hover:text-sky-200"
												href={resolve(`/app/sessions/${run.sessionId}`)}
											>
												{run.sessionId}
											</a>
										{:else}
											<p class="mt-2 text-sm text-white">No thread</p>
										{/if}
									</div>
								</div>
								<div class="mt-3">
									<a
										class="text-xs font-medium text-sky-300 transition hover:text-sky-200"
										href={resolve(`/app/runs/${run.id}`)}
									>
										Open run details
									</a>
								</div>
							</article>
						{/each}
					{/if}
				</div>
			</section>

			<section class="card border border-rose-900/50 bg-rose-950/20 p-6">
				<p class="text-xs font-semibold tracking-[0.24em] text-rose-300 uppercase">Danger zone</p>
				<h2 class="mt-2 text-xl font-semibold text-white">Delete task</h2>
				<p class="mt-2 max-w-2xl text-sm text-slate-300">
					This removes the task from the control plane, drops its related runs, reviews, and
					approvals, and detaches it from dependency lists on other tasks.
				</p>
				<form class="mt-5" method="POST" action="?/deleteTask">
					<button
						class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
						type="submit"
					>
						Delete task
					</button>
				</form>
			</section>
		</div>
	</div>
</section>

<style>
	.thread-name-clamp {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		line-clamp: 4;
		-webkit-line-clamp: 4;
		overflow: hidden;
	}

	.thread-preview-clamp {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		line-clamp: 5;
		-webkit-line-clamp: 5;
		overflow: hidden;
	}
</style>
