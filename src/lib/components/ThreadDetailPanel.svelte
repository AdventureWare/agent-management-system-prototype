<script lang="ts">
	import SessionDetailPanel from '$lib/components/SessionDetailPanel.svelte';
	import type { AgentThreadDetail } from '$lib/types/agent-session';

	type TaskResponseAction = {
		taskId: string;
		taskTitle: string;
		taskProjectId: string;
		taskStatus: string;
		openReview: { status: string; summary: string } | null;
		pendingApproval: { mode: string; status: string; summary: string } | null;
		canApproveAndComplete: boolean;
		helperText: string;
		disabledReason: string;
	};

	let {
		thread,
		sandboxOptions,
		taskResponseAction = null,
		form = null,
		backHref = '/app/sessions'
	} = $props<{
		thread: AgentThreadDetail;
		sandboxOptions: readonly string[];
		taskResponseAction?: TaskResponseAction | null;
		form?: {
			ok?: boolean;
			message?: string;
			successAction?: string;
			taskId?: string;
			sessionId?: string;
			previousSessionId?: string;
		} | null;
		backHref?: string;
	}>();
</script>

<SessionDetailPanel session={thread} {sandboxOptions} {taskResponseAction} {form} {backHref} />
