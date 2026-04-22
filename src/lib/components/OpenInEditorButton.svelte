<script lang="ts">
	import { resolve } from '$app/paths';
	import { showAppToast } from '$lib/client/app-toast';
	import { readArtifactEditorPreference } from '$lib/client/artifact-editor-preference';

	let {
		path,
		line = null,
		column = null,
		label = 'Open in editor',
		className = ''
	} = $props<{
		path: string;
		line?: number | null;
		column?: number | null;
		label?: string;
		className?: string;
	}>();

	let openState = $state<'idle' | 'opening' | 'success' | 'error'>('idle');
	let errorMessage = $state('');

	let buttonLabel = $derived(
		openState === 'opening'
			? 'Opening'
			: openState === 'success'
				? 'Opened'
				: openState === 'error'
					? 'Retry open'
					: label
	);

	async function openInEditor() {
		openState = 'opening';
		errorMessage = '';

		try {
			const response = await fetch(resolve('/api/artifacts/open'), {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					path,
					line,
					column,
					editor: readArtifactEditorPreference()
				})
			});

			if (!response.ok) {
				const payload = await response.json().catch(() => null);
				throw new Error(
					typeof payload?.message === 'string'
						? payload.message
						: 'Could not open the file in the local editor.'
				);
			}

			const payload = (await response.json().catch(() => null)) as { launcher?: string } | null;
			openState = 'success';
			showAppToast({
				message: payload?.launcher
					? `Opened in ${payload.launcher}.`
					: 'Opened in your local editor.',
				tone: 'success',
				durationMs: 1800
			});
			window.setTimeout(() => {
				if (openState === 'success') {
					openState = 'idle';
				}
			}, 1400);
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Could not open the file in the local editor.';
			openState = 'error';
			showAppToast({
				message: errorMessage,
				tone: 'error',
				durationMs: 2600
			});
		}
	}
</script>

<button
	type="button"
	class={className}
	title={errorMessage || label}
	disabled={openState === 'opening'}
	onclick={() => {
		void openInEditor();
	}}
>
	{buttonLabel}
</button>
