<script lang="ts">
	import { resolve } from '$app/paths';
	import type {
		ArtifactBrowserData,
		ArtifactDirectoryEntry,
		ArtifactKnownOutput
	} from '$lib/types/artifacts';

	type Props = {
		browser?: ArtifactBrowserData | null;
		emptyLabel?: string;
	};

	let { browser = null, emptyLabel = 'No files or folders found yet.' }: Props = $props();

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

	function downloadHref(path: string) {
		return resolve(`/api/artifacts/file?path=${encodeURIComponent(path)}`);
	}

	function itemHref(item: ArtifactKnownOutput | ArtifactDirectoryEntry) {
		if (item.kind !== 'file') {
			return null;
		}

		return 'href' in item && item.href ? item.href : downloadHref(item.path);
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
							Browsing the containing folder because the recorded path is a file.
						</p>
					{/if}
				</div>
			{/if}

			{#if browser.errorMessage}
				<p class="mt-4 text-sm text-amber-300">{browser.errorMessage}</p>
			{/if}
		</div>

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
								<a
									class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
									href={itemHref(output) || undefined}
								>
									Download
								</a>
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
								<a
									class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
									href={itemHref(entry) || undefined}
								>
									Download
								</a>
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
