<script lang="ts">
	import {
		artifactDownloadHref,
		artifactFileHref,
		artifactFolderHref,
		artifactPreviewKind
	} from '$lib/artifact-links';
	import ArtifactQuickPreviewDialog from '$lib/components/ArtifactQuickPreviewDialog.svelte';
	import ArtifactEditorPreferenceSelect from '$lib/components/ArtifactEditorPreferenceSelect.svelte';
	import ArtifactPreviewPane from '$lib/components/ArtifactPreviewPane.svelte';
	import OpenInEditorButton from '$lib/components/OpenInEditorButton.svelte';
	import type {
		ArtifactBrowserData,
		ArtifactDirectoryEntry,
		ArtifactKnownOutput
	} from '$lib/types/artifacts';

	type Props = {
		browser?: ArtifactBrowserData | null;
		emptyLabel?: string;
		focusLine?: number | null;
		focusColumn?: number | null;
	};
	let {
		browser = null,
		emptyLabel = 'No files or folders found yet.',
		focusLine = null,
		focusColumn = null
	}: Props = $props();
	let copiedPath = $state<string | null>(null);
	let copiedLink = $state<string | null>(null);
	let quickPreviewOpen = $state(false);
	let quickPreviewPath = $state<string | null>(null);
	let quickPreviewLabel = $state('');

	function formatSize(sizeBytes: number | null) {
		if (sizeBytes === null) {
			return '';
		}

		if (sizeBytes < 1024) {
			return `${sizeBytes} B`;
		}

		if (sizeBytes < 1024 * 1024) {
			return `${(sizeBytes / 1024).toFixed(1)} KB`;
		}

		return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function typeBadge(item: ArtifactDirectoryEntry | ArtifactKnownOutput) {
		if (item.kind === 'directory') {
			return 'Folder';
		}

		if (item.kind === 'file' && item.extension) {
			return item.extension.slice(0, 6).toUpperCase();
		}

		return item.kind === 'file' ? 'File' : 'Item';
	}

	function itemHref(item: ArtifactKnownOutput | ArtifactDirectoryEntry) {
		if (item.kind === 'directory') {
			return artifactFileHref(item.path);
		}

		if (item.kind !== 'file') {
			return null;
		}

		if ('href' in item && item.href && /^https?:\/\//.test(item.href)) {
			return item.href;
		}

		return artifactFileHref(item.path);
	}

	function openExternalHref(href: string) {
		if (typeof window === 'undefined') {
			return;
		}

		window.open(href, '_blank', 'noopener,noreferrer');
	}

	function rootStateLabel(browserData: ArtifactBrowserData) {
		switch (browserData.rootKind) {
			case 'directory':
				return 'Folder';
			case 'file':
				return 'File';
			case 'missing':
				return 'Missing';
			default:
				return 'Unavailable';
		}
	}

	function rootFileLabel(path: string) {
		return path.split('/').pop() || path;
	}

	function fileActionLabel(path: string) {
		return artifactPreviewKind(path) ? 'Open page' : 'Open';
	}

	function canWriteClipboard() {
		return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
	}

	async function copyPath(path: string) {
		if (!canWriteClipboard()) {
			return;
		}

		try {
			await navigator.clipboard.writeText(path);
			copiedPath = path;
			window.setTimeout(() => {
				if (copiedPath === path) {
					copiedPath = null;
				}
			}, 1400);
		} catch {
			copiedPath = null;
		}
	}

	async function copyLink(path: string, line: number | null = null, column: number | null = null) {
		if (!canWriteClipboard() || typeof window === 'undefined') {
			return;
		}

		try {
			const href = new URL(
				artifactFileHref(path, { line, column }),
				window.location.origin
			).toString();
			const key = `${path}:${line ?? ''}:${column ?? ''}`;
			await navigator.clipboard.writeText(href);
			copiedLink = key;
			window.setTimeout(() => {
				if (copiedLink === key) {
					copiedLink = null;
				}
			}, 1400);
		} catch {
			copiedLink = null;
		}
	}

	function openQuickPreview(path: string, label: string) {
		quickPreviewOpen = true;
		quickPreviewPath = path;
		quickPreviewLabel = label;
	}
</script>

<div class="space-y-4">
	{#if !browser}
		<div class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
			Artifact root not configured.
		</div>
	{:else}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Recorded path
					</p>
					<p class="ui-wrap-anywhere mt-2 text-sm text-white">{browser.rootPath}</p>
				</div>
				<span
					class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
				>
					{rootStateLabel(browser)}
				</span>
			</div>

			{#if browser.browsePath}
				<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Directory listing
					</p>
					<p class="ui-wrap-anywhere mt-2 text-sm text-slate-200">{browser.browsePath}</p>
					{#if browser.inspectingParentDirectory}
						<p class="mt-2 text-xs text-slate-500">
							{browser.rootKind === 'file'
								? 'Browsing the containing folder because the recorded path is a file.'
								: 'Browsing the containing folder because the recorded path is not directly available.'}
						</p>
					{/if}
				</div>
			{/if}

			{#if browser.errorMessage}
				<div class="mt-4 space-y-3 rounded-2xl border border-amber-900/40 bg-amber-950/20 p-3">
					<p class="text-sm text-amber-300">{browser.errorMessage}</p>
					{#if browser.browsePath}
						<div class="flex flex-wrap gap-2">
							<a
								class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
								href={artifactFileHref(browser.browsePath)}
								rel="external"
							>
								Open containing folder
							</a>
							<button
								class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
								type="button"
								onclick={() => {
									void copyPath(browser.rootPath);
								}}
							>
								{copiedPath === browser.rootPath ? 'Copied path' : 'Copy missing path'}
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		{#if browser.rootKind === 'file'}
			<div class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							File preview
						</p>
						<p class="ui-wrap-anywhere mt-2 text-sm text-slate-300">
							Inspect the referenced file here instead of downloading it first.
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<ArtifactEditorPreferenceSelect />
						<OpenInEditorButton
							path={browser.rootPath}
							line={focusLine}
							column={focusColumn}
							className="rounded-full border border-violet-800/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-violet-200 uppercase transition hover:border-violet-700/90 hover:text-violet-100 disabled:cursor-wait disabled:opacity-70"
						/>
						{#if browser.browsePath}
							<a
								class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
								href={artifactFileHref(browser.browsePath)}
								rel="external"
							>
								Open folder
							</a>
						{/if}
						<button
							class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
							type="button"
							onclick={() => {
								void copyPath(browser.rootPath);
							}}
						>
							{copiedPath === browser.rootPath ? 'Copied' : 'Copy path'}
						</button>
						<button
							class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
							type="button"
							onclick={() => {
								void copyLink(browser.rootPath, focusLine, focusColumn);
							}}
						>
							{copiedLink === `${browser.rootPath}:${focusLine ?? ''}:${focusColumn ?? ''}`
								? 'Copied link'
								: 'Copy link'}
						</button>
						<a
							class="rounded-full border border-emerald-800/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200 uppercase transition hover:border-emerald-700/90 hover:text-emerald-100"
							href={artifactDownloadHref(browser.rootPath)}
							rel="external"
						>
							Download
						</a>
					</div>
				</div>

				<ArtifactPreviewPane
					path={browser.rootPath}
					label={rootFileLabel(browser.rootPath)}
					{focusLine}
					{focusColumn}
				/>
			</div>
		{/if}

		{#if browser.knownOutputs.length > 0}
			<div class="space-y-3">
				<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
					Known outputs
				</p>
				{#each browser.knownOutputs as output (`${output.label}-${output.path}`)}
					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<p class="ui-wrap-anywhere font-medium text-white">{output.label}</p>
									<span
										class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
									>
										{typeBadge(output)}
									</span>
									{#if !output.exists}
										<span
											class="badge border border-amber-900/70 bg-amber-950/40 text-[0.7rem] tracking-[0.2em] text-amber-200 uppercase"
										>
											Missing
										</span>
									{/if}
								</div>
								<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">{output.path}</p>
								<p class="mt-2 text-sm text-slate-300">
									{output.description}
									{#if output.sizeBytes !== null}
										· {formatSize(output.sizeBytes)}
									{/if}
								</p>
							</div>
							{#if itemHref(output)}
								{#if itemHref(output)?.startsWith('http://') || itemHref(output)?.startsWith('https://')}
									<button
										class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
										type="button"
										onclick={() => {
											const href = itemHref(output);
											if (href) openExternalHref(href);
										}}
									>
										Open
									</button>
								{:else}
									<div class="flex flex-wrap gap-2">
										{#if output.kind === 'file' && artifactPreviewKind(output.path)}
											<OpenInEditorButton
												path={output.path}
												className="rounded-full border border-violet-800/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-violet-200 uppercase transition hover:border-violet-700/90 hover:text-violet-100 disabled:cursor-wait disabled:opacity-70"
											/>
											<button
												class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-violet-200 uppercase transition hover:border-violet-500/50 hover:text-violet-100"
												type="button"
												onclick={() => {
													openQuickPreview(output.path, output.label);
												}}
											>
												Quick preview
											</button>
										{/if}
										<a
											class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
											href={itemHref(output) || ''}
											rel="external"
										>
											{output.kind === 'directory' ? 'Browse' : fileActionLabel(output.path)}
										</a>
										{#if output.kind === 'file'}
											<a
												class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
												href={artifactFolderHref(output.path)}
												rel="external"
											>
												Open folder
											</a>
											<button
												class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
												type="button"
												onclick={() => {
													void copyLink(output.path);
												}}
											>
												{copiedLink === `${output.path}::` ? 'Copied link' : 'Copy link'}
											</button>
											<button
												class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
												type="button"
												onclick={() => {
													void copyPath(output.path);
												}}
											>
												{copiedPath === output.path ? 'Copied' : 'Copy path'}
											</button>
											<a
												class="rounded-full border border-emerald-800/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200 uppercase transition hover:border-emerald-700/90 hover:text-emerald-100"
												href={artifactDownloadHref(output.path)}
												rel="external"
											>
												Download
											</a>
										{/if}
									</div>
								{/if}
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<div class="space-y-3">
			<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
				Directory contents
			</p>

			{#if browser.directoryEntries.length === 0}
				<p
					class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500"
				>
					{emptyLabel}
				</p>
			{:else}
				{#each browser.directoryEntries as entry (entry.path)}
					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<p class="ui-wrap-anywhere font-medium text-white">{entry.name}</p>
									<span
										class="badge border border-slate-700 bg-slate-950/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
									>
										{typeBadge(entry)}
									</span>
								</div>
								<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">{entry.path}</p>
								<p class="mt-2 text-sm text-slate-300">
									{entry.kind === 'directory' ? 'Subfolder' : 'File'}
									{#if entry.sizeBytes !== null}
										· {formatSize(entry.sizeBytes)}
									{/if}
								</p>
							</div>
							{#if itemHref(entry)}
								{#if itemHref(entry)?.startsWith('http://') || itemHref(entry)?.startsWith('https://')}
									<button
										class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
										type="button"
										onclick={() => {
											const href = itemHref(entry);
											if (href) openExternalHref(href);
										}}
									>
										Open
									</button>
								{:else}
									<div class="flex flex-wrap gap-2">
										{#if entry.kind === 'file' && artifactPreviewKind(entry.path)}
											<OpenInEditorButton
												path={entry.path}
												className="rounded-full border border-violet-800/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-violet-200 uppercase transition hover:border-violet-700/90 hover:text-violet-100 disabled:cursor-wait disabled:opacity-70"
											/>
											<button
												class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-violet-200 uppercase transition hover:border-violet-500/50 hover:text-violet-100"
												type="button"
												onclick={() => {
													openQuickPreview(entry.path, entry.name);
												}}
											>
												Quick preview
											</button>
										{/if}
										<a
											class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
											href={itemHref(entry) || ''}
											rel="external"
										>
											{entry.kind === 'directory' ? 'Browse' : fileActionLabel(entry.path)}
										</a>
										{#if entry.kind === 'file'}
											<a
												class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
												href={artifactFolderHref(entry.path)}
												rel="external"
											>
												Open folder
											</a>
											<button
												class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
												type="button"
												onclick={() => {
													void copyLink(entry.path);
												}}
											>
												{copiedLink === `${entry.path}::` ? 'Copied link' : 'Copy link'}
											</button>
											<button
												class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
												type="button"
												onclick={() => {
													void copyPath(entry.path);
												}}
											>
												{copiedPath === entry.path ? 'Copied' : 'Copy path'}
											</button>
											<a
												class="rounded-full border border-emerald-800/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200 uppercase transition hover:border-emerald-700/90 hover:text-emerald-100"
												href={artifactDownloadHref(entry.path)}
												rel="external"
											>
												Download
											</a>
										{/if}
									</div>
								{/if}
							{/if}
						</div>
					</div>
				{/each}
			{/if}

			{#if browser.directoryEntriesTruncated}
				<p class="text-xs text-slate-500">
					Showing the first {browser.directoryEntries.length} entries from this folder.
				</p>
			{/if}
		</div>
	{/if}
</div>

<ArtifactQuickPreviewDialog
	bind:open={quickPreviewOpen}
	path={quickPreviewPath ?? ''}
	label={quickPreviewLabel}
/>
