import type { ArtifactEditorPreference } from '$lib/artifact-links';

export const ARTIFACT_EDITOR_PREFERENCE_STORAGE_KEY = 'ams:artifact-editor-preference';

export const ARTIFACT_EDITOR_PREFERENCE_OPTIONS = [
	{ value: 'auto', label: 'Auto detect' },
	{ value: 'code', label: 'VS Code' },
	{ value: 'cursor', label: 'Cursor' },
	{ value: 'zed', label: 'Zed' },
	{ value: 'system', label: 'System default' }
] satisfies Array<{ value: ArtifactEditorPreference; label: string }>;

export function normalizeArtifactEditorPreference(value: unknown): ArtifactEditorPreference {
	return ARTIFACT_EDITOR_PREFERENCE_OPTIONS.some((option) => option.value === value)
		? (value as ArtifactEditorPreference)
		: 'auto';
}

export function readArtifactEditorPreference(): ArtifactEditorPreference {
	if (typeof window === 'undefined') {
		return 'auto';
	}

	return normalizeArtifactEditorPreference(
		window.localStorage.getItem(ARTIFACT_EDITOR_PREFERENCE_STORAGE_KEY)
	);
}

export function writeArtifactEditorPreference(value: ArtifactEditorPreference) {
	if (typeof window === 'undefined') {
		return;
	}

	window.localStorage.setItem(ARTIFACT_EDITOR_PREFERENCE_STORAGE_KEY, value);
}
