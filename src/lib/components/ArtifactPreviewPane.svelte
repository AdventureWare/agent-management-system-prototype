<script lang="ts">
	import {
		artifactPreviewHref,
		artifactPreviewKind,
		type ArtifactPreviewKind
	} from '$lib/artifact-links';
	import ThreadMessageContent from '$lib/components/ThreadMessageContent.svelte';

	type PreviewState = {
		kind: ArtifactPreviewKind | null;
		status: 'idle' | 'loading' | 'ready' | 'error';
		content: string;
		errorMessage: string;
	};

	let {
		path,
		label = '',
		focusLine = null,
		focusColumn = null
	} = $props<{
		path: string;
		label?: string;
		focusLine?: number | null;
		focusColumn?: number | null;
	}>();
	let previewRoot = $state<HTMLElement | null>(null);

	let previewState = $state<PreviewState>({
		kind: null,
		status: 'idle',
		content: '',
		errorMessage: ''
	});

	$effect(() => {
		const kind = artifactPreviewKind(path);

		if (!path || !kind) {
			previewState = {
				kind,
				status: 'idle',
				content: '',
				errorMessage: ''
			};
			return;
		}

		if (kind === 'image' || kind === 'pdf') {
			previewState = {
				kind,
				status: 'ready',
				content: artifactPreviewHref(path),
				errorMessage: ''
			};
			return;
		}

		let cancelled = false;
		previewState = {
			kind,
			status: 'loading',
			content: '',
			errorMessage: ''
		};

		void fetch(artifactPreviewHref(path))
			.then(async (response) => {
				if (!response.ok) {
					throw new Error('Preview could not be loaded.');
				}

				return await response.text();
			})
			.then((content) => {
				if (cancelled) {
					return;
				}

				previewState = {
					kind,
					status: 'ready',
					content,
					errorMessage: ''
				};
			})
			.catch((error) => {
				if (cancelled) {
					return;
				}

				previewState = {
					kind,
					status: 'error',
					content: '',
					errorMessage: error instanceof Error ? error.message : 'Preview could not be loaded.'
				};
			});

		return () => {
			cancelled = true;
		};
	});

	function fileExtension(pathValue: string) {
		return pathValue.split('.').pop()?.toLowerCase() ?? '';
	}

	function isMarkdownFile(pathValue: string) {
		return ['md', 'markdown'].includes(fileExtension(pathValue));
	}

	function isJsonFile(pathValue: string) {
		return fileExtension(pathValue) === 'json';
	}

	function formattedTextContent(content: string) {
		if (!isJsonFile(path)) {
			return content;
		}

		try {
			return `${JSON.stringify(JSON.parse(content), null, 2)}\n`;
		} catch {
			return content;
		}
	}

	let displayedTextContent = $derived.by(() =>
		previewState.kind === 'text' && previewState.status === 'ready'
			? formattedTextContent(previewState.content)
			: ''
	);
	let displayedLines = $derived.by(() => displayedTextContent.split('\n'));
	let shouldRenderMarkdown = $derived.by(
		() =>
			previewState.kind === 'text' &&
			previewState.status === 'ready' &&
			isMarkdownFile(path) &&
			!focusLine
	);

	$effect(() => {
		if (
			!previewRoot ||
			previewState.kind !== 'text' ||
			previewState.status !== 'ready' ||
			!focusLine
		) {
			return;
		}

		const target = previewRoot.querySelector<HTMLElement>(`[data-artifact-line="${focusLine}"]`);
		target?.scrollIntoView({ block: 'center' });
	});
</script>

{#if !previewState.kind}
	<p class="text-sm text-slate-400">No inline preview is available for this file type.</p>
{:else if previewState.status === 'loading'}
	<p class="text-sm text-slate-300">Loading preview…</p>
{:else if previewState.status === 'error'}
	<p class="text-sm text-amber-300">{previewState.errorMessage}</p>
{:else if previewState.kind === 'image'}
	<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
		<img
			src={previewState.content}
			alt={label || path}
			class="mx-auto max-h-[70vh] w-auto rounded-xl"
		/>
	</div>
{:else if previewState.kind === 'pdf'}
	<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-2">
		<iframe
			src={previewState.content}
			title={label || path}
			class="h-[72vh] w-full rounded-xl bg-white"
		></iframe>
	</div>
{:else if shouldRenderMarkdown}
	<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
		<ThreadMessageContent text={displayedTextContent} tone="muted" />
	</div>
{:else}
	<div
		bind:this={previewRoot}
		class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60"
	>
		{#if focusLine}
			<div class="border-b border-slate-800/80 bg-slate-950/70 px-4 py-2 text-xs text-slate-400">
				Focused line
				<span class="font-medium text-slate-200">L{focusLine}</span>
				{#if focusColumn}
					<span class="text-slate-500">:C{focusColumn}</span>
				{/if}
			</div>
		{/if}
		<div class="overflow-x-auto p-4 font-mono text-sm leading-7 text-slate-200">
			{#each displayedLines as line, index (`${index}-${line}`)}
				<div
					data-artifact-line={index + 1}
					class={[
						'grid min-w-full grid-cols-[auto,1fr] gap-4 px-2',
						focusLine === index + 1 ? 'rounded-lg bg-sky-950/40 ring-1 ring-sky-700/40' : ''
					]}
				>
					<div class="py-0.5 text-right text-xs text-slate-500 select-none">{index + 1}</div>
					<pre class="ui-wrap-anywhere py-0.5 whitespace-pre-wrap">{line || ' '}</pre>
				</div>
			{/each}
		</div>
	</div>
{/if}
