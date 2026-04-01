<script lang="ts">
	import { resolve } from '$app/paths';
	import { PlayIcon, SaveIcon } from '@lucide/svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import ArtifactBrowser from '$lib/components/ArtifactBrowser.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import SessionActivityIndicator from '$lib/components/SessionActivityIndicator.svelte';
	import { formatSessionStateLabel } from '$lib/session-activity';
	import {
		approvalStatusToneClass,
		formatReviewStatusLabel,
		formatRunStatusLabel,
		formatTaskApprovalModeLabel,
		formatTaskStatusLabel,
		reviewStatusToneClass,
		runStatusToneClass,
		taskStatusToneClass
	} from '$lib/types/control-plane';

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

	function formatActiveRunStateLabel(status: string | null | undefined) {
		switch (status) {
			case 'queued':
				return 'Task queued';
			case 'starting':
				return 'Task starting';
			case 'running':
				return 'Task running';
			default:
				return 'Run task';
		}
	}

	let taskHasActiveRun = $derived(Boolean(data.task.hasActiveRun));
	let taskIsReadyToRun = $derived(data.task.status === 'ready');
	let runTaskDisabled = $derived(!taskIsReadyToRun || taskHasActiveRun);
	let runTaskButtonLabel = $derived(
		taskHasActiveRun ? formatActiveRunStateLabel(data.task.activeRun?.status) : 'Run task'
	);
	let runTaskHelperLabel = $derived.by(() => {
		if (taskHasActiveRun) {
			return 'Unavailable while this task is active';
		}

		if (!taskIsReadyToRun) {
			return 'Ready status required';
		}

		return 'Queue execution now';
	});
	let runTaskDisabledTitle = $derived.by(() => {
		if (taskHasActiveRun) {
			return 'A run is already in progress for this task.';
		}

		if (!taskIsReadyToRun) {
			return 'This task is not ready to run yet.';
		}

		return '';
	});
	let runTaskDisabledMessage = $derived.by(() => {
		if (taskHasActiveRun) {
			switch (data.task.activeRun?.status) {
				case 'queued':
					return 'This task already has queued work. Open the current work thread or wait for it to start before running again.';
				case 'starting':
					return 'This task is already starting in its work thread. Open the current work thread or wait for startup to finish before running again.';
				case 'running':
					return 'This task is already running. Open the current work thread or wait for the current run to finish before running again.';
				default:
					return 'This task already has active work. Open the current work thread or wait for it to finish before running again.';
			}
		}

		if (!taskIsReadyToRun) {
			return `Set the task status to Ready before running it. Current status: ${formatTaskStatusLabel(data.task.status)}.`;
		}

		return '';
	});
</script>

<AppPage>
	<DetailHeader
		backHref={resolve('/app/tasks')}
		backLabel="Back to tasks"
		eyebrow="Task detail"
		title={data.task.title}
		description={data.task.summary}
	>
		{#snippet meta()}
			<div class="flex flex-wrap items-center gap-3">
				<span
					class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(data.task.status)}`}
				>
					{formatTaskStatusLabel(data.task.status)}
				</span>
				<span class="text-sm text-slate-500">Updated {data.task.updatedAtLabel}</span>
			</div>
		{/snippet}
	</DetailHeader>

	<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
		<article class="card border border-slate-800 bg-slate-950/70 p-4">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Project</p>
			<p class="ui-wrap-anywhere mt-3 text-lg font-semibold text-white">{data.task.projectName}</p>
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
			<p class="ui-wrap-anywhere mt-3 text-lg font-semibold text-white">{data.task.assigneeName}</p>
			<p class="ui-wrap-anywhere mt-2 text-sm text-slate-400">
				Desired role: {data.task.desiredRoleId || 'Not set'}
			</p>
		</article>
		<article class="card border border-slate-800 bg-slate-950/70 p-4">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Runs recorded</p>
			<p class="mt-3 text-3xl font-semibold text-white">{data.task.runCount}</p>
			<p class="mt-2 text-sm text-slate-400">Updated {data.task.updatedAtLabel}</p>
		</article>
		<article class="card border border-slate-800 bg-slate-950/70 p-4">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Thread access</p>
			{#if data.task.linkThread}
				<div class="mt-3 flex flex-wrap items-center gap-3">
					<a
						class="inline-flex rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
						href={resolve(`/app/sessions/${data.task.linkThread.id}`)}
					>
						{threadActionLabel()}
					</a>
					<p class="ui-wrap-anywhere text-sm font-medium text-white">{data.task.linkThread.name}</p>
				</div>
				{#if data.task.statusThread}
					<div class="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2">
						<SessionActivityIndicator compact session={data.task.statusThread} />
					</div>
				{/if}
				{#if data.task.linkThread.id !== data.task.statusThread?.id}
					<p class="mt-2 text-xs text-slate-500">
						{formatSessionStateLabel(data.task.linkThread.sessionState)}
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

	<nav class="card border border-slate-800/90 bg-slate-950/70 px-5 py-4">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase">
					Page sections
				</p>
				<p class="mt-1 text-sm text-slate-400">
					Jump between configuration, resources, execution, governance, and cleanup.
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<a
					class="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
					href="#task-configuration"
				>
					Task configuration
				</a>
				<a
					class="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
					href="#resources"
				>
					Resources
				</a>
				<a
					class="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
					href="#execution"
				>
					Execution
				</a>
				<a
					class="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
					href="#governance"
				>
					Governance
				</a>
				<a
					class="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-rose-400/40 hover:text-rose-200"
					href="#danger-zone"
				>
					Danger zone
				</a>
			</div>
		</div>
	</nav>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
		<form id="task-configuration" method="POST" action="?/updateTask">
			<DetailSection
				eyebrow="Task details"
				title="Edit task brief and execution settings"
				description="Keep the collection page lightweight. Use this page to edit the task itself."
				bodyClass="space-y-6"
			>
				<section class="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5">
					<div class="space-y-2">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Task brief
						</p>
						<h3 class="text-lg font-semibold text-white">Core task definition</h3>
						<p class="text-sm text-slate-400">
							Set the title and worker-facing instructions that define the task itself.
						</p>
					</div>

					<div class="mt-5 space-y-4">
						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
							<input class="input text-white" name="name" required value={data.task.title} />
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Instructions</span>
							<textarea class="textarea min-h-40 text-white" name="instructions" required
								>{data.task.summary}</textarea
							>
						</label>
					</div>
				</section>

				<section class="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5">
					<div class="space-y-2">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Execution settings
						</p>
						<h3 class="text-lg font-semibold text-white">Project, status, and assignment</h3>
						<p class="text-sm text-slate-400">
							Choose where the task belongs, what state it is in, and who should pick it up.
						</p>
					</div>

					<div class="mt-5 grid gap-4 lg:grid-cols-[1fr_220px]">
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

					<label class="mt-4 block">
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
				</section>

				<section class="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5">
					<div class="space-y-2">
						<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
							Task metadata
						</p>
						<h3 class="text-lg font-semibold text-white">Reference information</h3>
						<p class="text-sm text-slate-400">
							Keep this context visible while editing without mixing it into the main form fields.
						</p>
					</div>

					<div class="mt-5 grid gap-4 sm:grid-cols-2">
						<div
							class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300"
						>
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Created
							</p>
							<p class="mt-2">{new Date(data.task.createdAt).toLocaleString()}</p>
						</div>
						<div
							class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300"
						>
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Artifact path
							</p>
							<p class="ui-wrap-anywhere mt-2">{data.task.artifactPath || 'Not set'}</p>
						</div>
					</div>
				</section>

				<div
					class="rounded-3xl border border-sky-900/50 bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950/60 p-4 shadow-[0_18px_60px_-28px_rgba(14,165,233,0.45)]"
				>
					<div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
						<div class="max-w-xl">
							<p class="text-xs font-semibold tracking-[0.24em] text-sky-300 uppercase">
								Primary actions
							</p>
							<h3 class="mt-2 text-lg font-semibold text-white">Save changes or queue work now</h3>
							<p class="mt-2 text-sm text-slate-300">
								Use Save to update the task brief. Use Run to launch the task with the current form
								values and continue execution in its work thread.
							</p>
						</div>

						<div class="grid gap-3 sm:grid-cols-2 xl:min-w-[25rem]">
							<button
								class="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-slate-600 bg-slate-900/85 px-5 py-4 text-left font-semibold text-slate-50 shadow-[0_12px_30px_-20px_rgba(15,23,42,1)] transition hover:border-slate-500 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
								type="submit"
							>
								<span>
									<span class="block text-sm font-semibold">Save task</span>
									<span
										class="mt-1 block text-xs font-medium tracking-[0.16em] text-slate-400 uppercase"
									>
										Update details only
									</span>
								</span>
								<SaveIcon class="size-4 shrink-0 text-slate-300" />
							</button>

							<button
								class={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
									runTaskDisabled
										? 'cursor-not-allowed border-slate-700 bg-slate-800/80 text-slate-400 shadow-none focus-visible:outline-slate-500'
										: 'border-sky-700/80 bg-sky-500 text-slate-950 shadow-[0_18px_40px_-20px_rgba(56,189,248,0.9)] hover:border-sky-300 hover:bg-sky-400 focus-visible:outline-sky-200'
								}`}
								type="submit"
								formaction="?/launchTaskSession"
								disabled={runTaskDisabled}
								aria-disabled={runTaskDisabled}
							>
								<span>
									<span class="block text-sm font-semibold">{runTaskButtonLabel}</span>
									<span
										class={`mt-1 block text-xs font-medium tracking-[0.16em] uppercase ${
											runTaskDisabled ? 'text-slate-500' : 'text-sky-950/80'
										}`}
									>
										{runTaskHelperLabel}
									</span>
								</span>
								<PlayIcon class="size-4 shrink-0" />
							</button>
						</div>
					</div>

					{#if runTaskDisabled}
						<div
							class="mt-4 rounded-2xl border border-sky-900/50 bg-sky-950/30 px-4 py-3 text-sm text-sky-100"
						>
							<p class="font-medium">{runTaskDisabledTitle}</p>
							<p class="mt-1 text-sky-100/80">{runTaskDisabledMessage}</p>
							{#if taskHasActiveRun && data.task.linkThread}
								<a
									class="mt-3 inline-flex text-sm text-sky-200 underline underline-offset-4 transition hover:text-sky-100"
									href={resolve(`/app/sessions/${data.task.linkThread.id}`)}
								>
									{threadActionLabel() || 'Open current work thread'}
								</a>
							{/if}
						</div>
					{/if}
				</div>
			</DetailSection>
		</form>

		<div class="space-y-6">
			<DetailSection
				id="resources"
				eyebrow="Resources"
				title="Files, uploads, and task outputs"
				description="Keep source material and generated artifacts together so the task can be reviewed from one place."
				bodyClass="divide-y divide-slate-800/90 p-0"
			>
				<div class="px-6 py-6">
					<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
						Attachments
					</p>
					<h3 class="mt-2 text-xl font-semibold text-white">Attached files</h3>
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
											<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">
												{attachment.path}
											</p>
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
				</div>

				<div class="px-6 py-6">
					<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
						Artifact root
					</p>
					<h3 class="mt-2 text-xl font-semibold text-white">Browse task outputs</h3>
					<p class="mt-2 max-w-2xl text-sm text-slate-400">
						Review the task artifact root directly instead of relying on the raw path alone.
						Attached files remain linked through the existing task download route.
					</p>

					<div class="mt-5">
						<ArtifactBrowser
							browser={data.artifactBrowser}
							emptyLabel="No files or folders are present under this task root yet."
						/>
					</div>
				</div>
			</DetailSection>

			<DetailSection
				id="execution"
				eyebrow="Execution"
				title="Thread continuity and run history"
				description="Manage where work continues and review how this task has executed over time."
				tone="sky"
				bodyClass="divide-y divide-slate-800/90 p-0"
			>
				<div class="px-6 py-6">
					<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
						Thread continuity
					</p>
					<h3 class="mt-2 text-xl font-semibold text-white">Assign this task to a work thread</h3>
					<p class="mt-2 max-w-2xl text-sm text-slate-400">
						A work thread is reusable context. Assign this task to an existing thread when you want
						follow-up work to continue in the same conversation instead of creating a fresh one.
					</p>

					{#if data.suggestedThread && data.suggestedThread.id !== data.task.threadSessionId}
						<div class="mt-5 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4">
							<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
								<div class="min-w-0">
									<p class="text-xs font-semibold tracking-[0.16em] text-emerald-300 uppercase">
										Suggested available thread
									</p>
									<p class="thread-name-clamp mt-2 text-sm font-medium text-white">
										{data.suggestedThread.name}
									</p>
									{#if data.suggestedThread.topicLabels?.length > 0}
										<div class="mt-3 flex flex-wrap gap-2">
											{#each data.suggestedThread.topicLabels as topicLabel (topicLabel)}
												<span
													class="badge border border-emerald-900/60 bg-emerald-950/30 text-[0.65rem] tracking-[0.16em] text-emerald-100 uppercase"
												>
													{topicLabel}
												</span>
											{/each}
										</div>
									{/if}
									<p class="mt-2 text-sm text-emerald-100/90">
										{data.suggestedThread.suggestionReason}
									</p>
									<p class="mt-2 text-xs text-slate-400">
										{formatSessionStateLabel(data.suggestedThread.sessionState)} · Available to resume
									</p>
								</div>

								<div class="flex flex-col gap-2 sm:items-end">
									<form method="POST" action="?/updateTaskThread">
										<input type="hidden" name="threadSessionId" value={data.suggestedThread.id} />
										<button
											class="rounded-full border border-emerald-700/70 bg-emerald-950/40 px-3 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200 uppercase transition hover:border-emerald-500/60 hover:text-emerald-100"
											type="submit"
										>
											Assign suggested thread
										</button>
									</form>
									<a
										class="text-sm text-sky-300 transition hover:text-sky-200"
										href={resolve(`/app/sessions/${data.suggestedThread.id}`)}
									>
										Open thread
									</a>
								</div>
							</div>
						</div>
					{/if}

					<form class="mt-5 space-y-4" method="POST" action="?/updateTaskThread">
						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Assigned thread</span>
							<select class="select text-white" name="threadSessionId">
								<option value="" selected={!data.task.threadSessionId}>
									Create a new thread when this task runs
								</option>
								{#each data.candidateThreads as thread (thread.id)}
									<option value={thread.id} selected={data.task.threadSessionId === thread.id}>
										{thread.isSuggested ? 'Suggested · ' : ''}{thread.name} ·
										{formatSessionStateLabel(thread.sessionState)} ·
										{thread.canResume ? 'ready' : thread.hasActiveRun ? 'busy' : 'blocked'}{thread
											.topicLabels?.length
											? ` · ${thread.topicLabels.join(', ')}`
											: ''}
									</option>
								{/each}
							</select>
						</label>
						<p class="text-sm text-slate-400">
							Leave the task unassigned if the next run should start a new thread from scratch.
						</p>

						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<button
								class="btn border border-slate-700 font-semibold text-slate-100"
								type="submit"
							>
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
									<div class="min-w-0 pr-28">
										<div class="flex flex-wrap items-center gap-2">
											<p class="thread-name-clamp text-sm font-medium text-white">
												{thread.name}
											</p>
											{#if thread.isSuggested}
												<span
													class="badge border border-emerald-800/70 bg-emerald-950/40 text-[0.65rem] tracking-[0.18em] text-emerald-200 uppercase"
												>
													Suggested
												</span>
											{/if}
										</div>
										<p class="mt-1 text-xs text-slate-500">
											{formatSessionStateLabel(thread.sessionState)} ·
											{thread.canResume ? 'Can resume' : thread.hasActiveRun ? 'Busy' : 'Blocked'}
										</p>
									</div>
									{#if thread.topicLabels?.length > 0}
										<div class="mt-3 flex flex-wrap gap-2">
											{#each thread.topicLabels as topicLabel (topicLabel)}
												<span
													class="badge border border-sky-900/50 bg-sky-950/30 text-[0.65rem] tracking-[0.16em] text-sky-200 uppercase"
												>
													{topicLabel}
												</span>
											{/each}
										</div>
									{/if}
									{#if thread.previewText}
										<p class="thread-preview-clamp mt-3 text-sm leading-6 text-slate-300">
											{compactText(thread.previewText)}
										</p>
									{/if}
									{#if thread.isSuggested && thread.suggestionReason}
										<p class="mt-3 text-xs font-medium text-emerald-200">
											{thread.suggestionReason}
										</p>
									{/if}
									<p class="ui-wrap-anywhere mt-3 text-xs text-slate-400">
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
				</div>

				<div class="px-6 py-6">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
								Run history
							</p>
							<h3 class="mt-2 text-xl font-semibold text-white">Execution timeline</h3>
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
										<div class="min-w-0 flex-1">
											<div class="flex flex-wrap items-center gap-2">
												<a
													class="ui-wrap-anywhere font-medium text-white transition hover:text-sky-200"
													href={resolve(`/app/runs/${run.id}`)}
												>
													{run.id}
												</a>
												<span
													class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${runStatusToneClass(run.status)}`}
												>
													{formatRunStatusLabel(run.status)}
												</span>
											</div>
											<p class="ui-wrap-anywhere mt-2 text-sm text-slate-300">
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
													class="ui-wrap-inline mt-2 text-sm text-sky-300 transition hover:text-sky-200"
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
				</div>
			</DetailSection>

			<DetailSection
				id="governance"
				eyebrow="Governance"
				title="Review state and execution constraints"
				description="Track decisions that can block or redirect the task before more work is queued."
				tone="amber"
				bodyClass="divide-y divide-slate-800/90 p-0"
			>
				<div class="px-6 py-6">
					<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Governance</p>
					<h3 class="mt-2 text-xl font-semibold text-white">Review and approval state</h3>

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
										class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${reviewStatusToneClass(data.task.openReview.status)}`}
									>
										{formatReviewStatusLabel(data.task.openReview.status)}
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
												`Waiting on ${formatTaskApprovalModeLabel(data.task.pendingApproval.mode)} approval.`
											: 'No pending approval'}
									</p>
								</div>
								{#if data.task.pendingApproval}
									<span
										class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${approvalStatusToneClass(data.task.pendingApproval.status)}`}
									>
										{formatTaskApprovalModeLabel(data.task.pendingApproval.mode)}
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
				</div>

				<div class="px-6 py-6">
					<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
						Dependency context
					</p>
					<h3 class="mt-2 text-xl font-semibold text-white">Dependencies and execution notes</h3>

					<div class="mt-5 space-y-4">
						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Goal link
							</p>
							{#if data.task.goalId}
								<a
									class="mt-2 inline-flex text-sm font-medium text-sky-300 transition hover:text-sky-200"
									href={resolve(`/app/goals/${data.task.goalId}`)}
								>
									{data.task.goalName || data.task.goalId}
								</a>
							{:else}
								<p class="mt-2 text-sm text-white">No goal linked</p>
							{/if}
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
												class={`badge border text-[0.7rem] tracking-[0.2em] uppercase ${taskStatusToneClass(dependency.status)}`}
											>
												{formatTaskStatusLabel(dependency.status)}
											</span>
										</a>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</DetailSection>

			<DetailSection
				id="danger-zone"
				eyebrow="Danger zone"
				title="Delete task"
				description="This removes the task from the control plane, drops its related runs, reviews, and approvals, and detaches it from dependency lists on other tasks."
				tone="rose"
			>
				<form class="mt-5" method="POST" action="?/deleteTask">
					<button
						class="btn border border-rose-800/70 bg-rose-950/40 font-semibold text-rose-200"
						type="submit"
					>
						Delete task
					</button>
				</form>
			</DetailSection>
		</div>
	</div>
</AppPage>

<style>
	.thread-name-clamp {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		line-clamp: 4;
		-webkit-line-clamp: 4;
		overflow: hidden;
		overflow-wrap: anywhere;
		word-break: break-word;
		hyphens: auto;
	}

	.thread-preview-clamp {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		line-clamp: 5;
		-webkit-line-clamp: 5;
		overflow: hidden;
		overflow-wrap: anywhere;
		word-break: break-word;
		hyphens: auto;
	}
</style>
