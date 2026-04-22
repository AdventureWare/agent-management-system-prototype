<script lang="ts">
	import { artifactDownloadHref, artifactFileHref, artifactFolderHref } from '$lib/artifact-links';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import ArtifactEditorPreferenceSelect from '$lib/components/ArtifactEditorPreferenceSelect.svelte';
	import ArtifactPreviewPane from '$lib/components/ArtifactPreviewPane.svelte';
	import OpenInEditorButton from '$lib/components/OpenInEditorButton.svelte';

	let {
		open = $bindable(false),
		path = '',
		label = '',
		focusLine = null,
		focusColumn = null
	} = $props<{
		open?: boolean;
		path?: string;
		label?: string;
		focusLine?: number | null;
		focusColumn?: number | null;
	}>();

	let copiedValue = $state<'path' | 'link' | null>(null);

	let dialogTitle = $derived(label || path.split('/').pop() || 'Artifact preview');
	let pageHref = $derived(
		path ? artifactFileHref(path, { line: focusLine, column: focusColumn }) : ''
	);
	let containingFolderHref = $derived(path ? artifactFolderHref(path) : '');

	function canWriteClipboard() {
		return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
	}

	async function copyValue(value: string, kind: 'path' | 'link') {
		if (!canWriteClipboard() || !value) {
			return;
		}

		try {
			const text =
				kind === 'link' && typeof window !== 'undefined'
					? new URL(value, window.location.origin).toString()
					: value;

			await navigator.clipboard.writeText(text);
			copiedValue = kind;
			window.setTimeout(() => {
				if (copiedValue === kind) {
					copiedValue = null;
				}
			}, 1400);
		} catch {
			copiedValue = null;
		}
	}
</script>

<AppDialog
	bind:open
	title={dialogTitle}
	description={path}
	surfaceClass="max-w-6xl"
	bodyClass="space-y-5"
	closeLabel="Close artifact preview"
>
	<div class="flex flex-wrap items-center gap-2">
		<ArtifactEditorPreferenceSelect />
		<OpenInEditorButton
			{path}
			line={focusLine}
			column={focusColumn}
			className="rounded-full border border-violet-800/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-violet-200 uppercase transition hover:border-violet-700/90 hover:text-violet-100 disabled:cursor-wait disabled:opacity-70"
		/>
		<a
			class="rounded-full border border-sky-800/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-200 uppercase transition hover:border-sky-700/90 hover:text-sky-100"
			href={pageHref}
			rel="external"
		>
			Open page
		</a>
		<a
			class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
			href={containingFolderHref}
			rel="external"
		>
			Open folder
		</a>
		<button
			class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
			type="button"
			onclick={() => {
				void copyValue(path, 'path');
			}}
		>
			{copiedValue === 'path' ? 'Copied path' : 'Copy path'}
		</button>
		<button
			class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-slate-200 uppercase transition hover:border-slate-500/60 hover:text-white"
			type="button"
			onclick={() => {
				void copyValue(pageHref, 'link');
			}}
		>
			{copiedValue === 'link' ? 'Copied link' : 'Copy link'}
		</button>
		<a
			class="rounded-full border border-emerald-800/70 px-3 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200 uppercase transition hover:border-emerald-700/90 hover:text-emerald-100"
			href={artifactDownloadHref(path)}
			rel="external"
		>
			Download
		</a>
	</div>

	<ArtifactPreviewPane {path} {label} {focusLine} {focusColumn} />
</AppDialog>
