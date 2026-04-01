<script lang="ts">
	import SessionActivityIndicator from '$lib/components/SessionActivityIndicator.svelte';
	import type { AgentThreadDetail } from '$lib/types/agent-session';

	let {
		thread,
		now = Date.now(),
		compact = false
	} = $props<{
		thread: AgentThreadDetail;
		now?: number;
		compact?: boolean;
	}>();
</script>

<SessionActivityIndicator session={thread} {now} {compact} />
