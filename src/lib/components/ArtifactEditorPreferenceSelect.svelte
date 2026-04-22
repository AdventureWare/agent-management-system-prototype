<script lang="ts">
	import {
		ARTIFACT_EDITOR_PREFERENCE_OPTIONS,
		readArtifactEditorPreference,
		writeArtifactEditorPreference
	} from '$lib/client/artifact-editor-preference';
	import type { ArtifactEditorPreference } from '$lib/artifact-links';

	let { className = '' } = $props<{ className?: string }>();

	let value = $state<ArtifactEditorPreference>(readArtifactEditorPreference());

	function updatePreference(nextValue: string) {
		value = nextValue as ArtifactEditorPreference;
		writeArtifactEditorPreference(value);
	}
</script>

<label
	class={['flex items-center gap-2 text-xs text-slate-400', className]}
	title="Applies to all Open in editor actions in this browser."
>
	<span class="tracking-[0.14em] uppercase">Preferred editor</span>
	<select
		class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition outline-none focus:border-sky-700/70"
		title="Applies to all Open in editor actions in this browser."
		{value}
		onchange={(event) => {
			updatePreference((event.currentTarget as HTMLSelectElement).value);
		}}
	>
		{#each ARTIFACT_EDITOR_PREFERENCE_OPTIONS as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</label>
