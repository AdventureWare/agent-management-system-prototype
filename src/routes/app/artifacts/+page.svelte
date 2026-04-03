<script lang="ts">
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import ArtifactBrowser from '$lib/components/ArtifactBrowser.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';

	let { data } = $props();
</script>

<AppPage width="full">
	<DetailHeader
		backHref={resolve('/app')}
		backLabel="Back to app"
		eyebrow="Artifacts"
		title={data.path || 'Artifact browser'}
		description={data.path
			? 'Browse a referenced folder or inspect the containing directory for a referenced file.'
			: 'Open this page with a path query to inspect a referenced artifact location.'}
	/>

	<ArtifactBrowser
		browser={data.artifactBrowser}
		emptyLabel="No files or folders were found at this artifact location."
	/>
</AppPage>
