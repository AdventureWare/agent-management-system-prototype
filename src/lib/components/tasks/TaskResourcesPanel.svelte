<script lang="ts">
	import { resolve } from '$app/paths';
	import ArtifactBrowser from '$lib/components/ArtifactBrowser.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import type { ArtifactBrowserData } from '$lib/types/artifacts';
	import type { TaskAttachment } from '$lib/types/control-plane';

	let {
		taskId,
		attachments,
		attachmentRoot,
		artifactBrowser,
		actionBasePath = '',
		readOnly = false
	} = $props<{
		taskId: string;
		attachments: TaskAttachment[];
		attachmentRoot: string;
		artifactBrowser: ArtifactBrowserData;
		actionBasePath?: string;
		readOnly?: boolean;
	}>();

	function formatAttachmentSize(sizeBytes: number) {
		if (sizeBytes < 1024) {
			return `${sizeBytes} B`;
		}

		if (sizeBytes < 1024 * 1024) {
			return `${(sizeBytes / 1024).toFixed(1)} KB`;
		}

		return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function taskAction(actionName: string) {
		return actionBasePath ? `${actionBasePath}?/${actionName}` : `?/${actionName}`;
	}
</script>

<div id="task-detail-panel-resources" role="tabpanel" aria-labelledby="task-detail-tab-resources">
	<DetailSection
		id="resources"
		eyebrow="Resources"
		title="Files, uploads, and task outputs"
		description="Keep source material and generated artifacts together so the task can be reviewed from one place."
		bodyClass="divide-y divide-slate-800/90 p-0"
	>
		<div class="px-6 py-6">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Attachments</p>
			<h3 class="mt-2 text-xl font-semibold text-white">Attached files</h3>
			<p class="mt-2 max-w-2xl text-sm text-slate-400">
				Upload supporting files for this task. Files are stored under the task artifact area so the
				execution thread and human reviewer can reference the same source material.
			</p>

			{#if readOnly}
				<div
					class="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300"
				>
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Storage root
					</p>
					<p class="ui-wrap-anywhere mt-2">{attachmentRoot || 'Not configured'}</p>
					<p class="mt-3 text-slate-400">Uploads and file removal stay on the full task page.</p>
				</div>
			{:else}
				<form
					class="mt-5 space-y-4"
					method="POST"
					action={taskAction('attachTaskFile')}
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
						<p class="ui-wrap-anywhere mt-2">{attachmentRoot || 'Not configured'}</p>
					</div>

					<button class="btn border border-slate-700 font-semibold text-slate-100" type="submit">
						Attach file
					</button>
				</form>
			{/if}

			<div class="mt-5 space-y-4">
				{#if attachments.length === 0}
					<p
						class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
					>
						No files are attached to this task yet. Upload one above when the execution surface or
						reviewer needs shared source material.
					</p>
				{:else}
					{#each attachments as attachment (attachment.id)}
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
										href={resolve(`/api/tasks/${taskId}/attachments/${attachment.id}`)}
									>
										Download
									</a>
									{#if !readOnly}
										<form method="POST" action={taskAction('removeTaskAttachment')}>
											<input type="hidden" name="attachmentId" value={attachment.id} />
											<button
												class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-rose-400/40 hover:text-rose-200"
												type="submit"
											>
												Detach
											</button>
										</form>
									{/if}
								</div>
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</div>

		<div class="px-6 py-6">
			<p class="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Artifact root</p>
			<h3 class="mt-2 text-xl font-semibold text-white">Browse task outputs</h3>
			<p class="mt-2 max-w-2xl text-sm text-slate-400">
				Review the task artifact root directly instead of relying on the raw path alone. Attached
				files remain linked through the existing task download route.
			</p>

			<div class="mt-5">
				<ArtifactBrowser
					browser={artifactBrowser}
					emptyLabel="No files or folders are present under this task root yet. Run the task or attach a file if you expected outputs here."
				/>
			</div>
		</div>
	</DetailSection>
</div>
