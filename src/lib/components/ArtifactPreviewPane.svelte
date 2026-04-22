<script lang="ts">
	import {
		artifactDiffHref,
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

	type DiffState = {
		status: 'idle' | 'loading' | 'ready' | 'empty' | 'unavailable' | 'error';
		content: string;
		message: string;
		comparedAgainst: string | null;
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
	let activeTab = $state<'preview' | 'diff'>('preview');

	let previewState = $state<PreviewState>({
		kind: null,
		status: 'idle',
		content: '',
		errorMessage: ''
	});
	let diffState = $state<DiffState>({
		status: 'idle',
		content: '',
		message: '',
		comparedAgainst: null
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
	let hasDiffTab = $derived(previewState.kind === 'text');
	let diffLines = $derived.by(() => diffState.content.split('\n'));

	function diffLineClass(line: string) {
		if (line.startsWith('@@')) {
			return 'bg-sky-950/40 text-sky-100';
		}

		if (line.startsWith('+') && !line.startsWith('+++')) {
			return 'bg-emerald-950/40 text-emerald-100';
		}

		if (line.startsWith('-') && !line.startsWith('---')) {
			return 'bg-rose-950/40 text-rose-100';
		}

		if (
			line.startsWith('diff ') ||
			line.startsWith('index ') ||
			line.startsWith('---') ||
			line.startsWith('+++')
		) {
			return 'bg-slate-900/90 text-slate-300';
		}

		return 'text-slate-200';
	}

	$effect(() => {
		if (previewState.kind !== 'text' && activeTab === 'diff') {
			activeTab = 'preview';
		}
	});

	$effect(() => {
		if (!path || previewState.kind !== 'text' || activeTab !== 'diff') {
			if (activeTab !== 'diff') {
				diffState = {
					status: 'idle',
					content: '',
					message: '',
					comparedAgainst: null
				};
			}
			return;
		}

		let cancelled = false;
		diffState = {
			status: 'loading',
			content: '',
			message: '',
			comparedAgainst: null
		};

		void fetch(artifactDiffHref(path))
			.then(async (response) => {
				if (!response.ok) {
					const payload = await response.json().catch(() => null);
					throw new Error(
						typeof payload?.message === 'string'
							? payload.message
							: 'Diff preview could not be loaded.'
					);
				}

				return (await response.json()) as {
					status: DiffState['status'];
					diffText: string;
					message: string;
					comparedAgainst: string | null;
				};
			})
			.then((payload) => {
				if (cancelled) {
					return;
				}

				diffState = {
					status: payload.status,
					content: payload.diffText,
					message: payload.message,
					comparedAgainst: payload.comparedAgainst
				};
			})
			.catch((error) => {
				if (cancelled) {
					return;
				}

				diffState = {
					status: 'error',
					content: '',
					message: error instanceof Error ? error.message : 'Diff preview could not be loaded.',
					comparedAgainst: null
				};
			});

		return () => {
			cancelled = true;
		};
	});

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

{#if hasDiffTab}
	<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class={[
					'rounded-full border px-3 py-2 text-xs font-medium tracking-[0.14em] uppercase transition',
					activeTab === 'preview'
						? 'border-sky-700/80 bg-sky-950/60 text-sky-100'
						: 'border-slate-700 text-slate-300 hover:border-slate-500/60 hover:text-white'
				]}
				onclick={() => {
					activeTab = 'preview';
				}}
			>
				Preview
			</button>
			<button
				type="button"
				class={[
					'rounded-full border px-3 py-2 text-xs font-medium tracking-[0.14em] uppercase transition',
					activeTab === 'diff'
						? 'border-sky-700/80 bg-sky-950/60 text-sky-100'
						: 'border-slate-700 text-slate-300 hover:border-slate-500/60 hover:text-white'
				]}
				onclick={() => {
					activeTab = 'diff';
				}}
			>
				Diff
			</button>
		</div>
		{#if activeTab === 'diff' && diffState.comparedAgainst}
			<p class="text-xs text-slate-500">Compared against {diffState.comparedAgainst}</p>
		{/if}
	</div>
{/if}

{#if activeTab === 'diff'}
	{#if diffState.status === 'loading' || diffState.status === 'idle'}
		<p class="text-sm text-slate-300">Loading diff…</p>
	{:else if diffState.status === 'error'}
		<p class="text-sm text-amber-300">{diffState.message}</p>
	{:else if diffState.status === 'empty' || diffState.status === 'unavailable'}
		<div class="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-400">
			{diffState.message}
		</div>
	{:else}
		<div class="space-y-3">
			<p class="text-xs text-slate-500">{diffState.message}</p>
			<div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
				<div class="font-mono text-sm leading-7">
					{#each diffLines as line, index (`${index}-${line}`)}
						<pre
							class={[
								'ui-wrap-anywhere rounded-md px-3 py-0.5 whitespace-pre-wrap',
								diffLineClass(line)
							]}>
							{line || ' '}
						</pre>
					{/each}
				</div>
			</div>
		</div>
	{/if}
{:else if !previewState.kind}
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
