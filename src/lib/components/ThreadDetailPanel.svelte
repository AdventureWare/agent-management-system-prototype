<script lang="ts">
	import { resolve } from '$app/paths';
	import { fetchAgentThread } from '$lib/client/agent-threads';
	import { agentThreadStore } from '$lib/client/agent-thread-store';
	import { shouldPauseRefresh } from '$lib/client/refresh';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import DetailFactCard from '$lib/components/DetailFactCard.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import DetailSection from '$lib/components/DetailSection.svelte';
	import PageTabs from '$lib/components/PageTabs.svelte';
	import ThreadMessageContent from '$lib/components/ThreadMessageContent.svelte';
	import {
		ACTIVE_REFRESH_INTERVAL_MS,
		ACTIVITY_CLOCK_INTERVAL_MS,
		formatActivityAge,
		formatThreadStateLabel,
		getThreadActivityMeta
	} from '$lib/thread-activity';
	import { uniqueTopicLabels } from '$lib/topic-labels';
	import ThreadActivityIndicator from '$lib/components/ThreadActivityIndicator.svelte';
	import {
		approvalStatusToneClass,
		formatApprovalStatusLabel,
		formatReviewStatusLabel,
		formatTaskApprovalModeLabel,
		formatTaskStatusLabel,
		reviewStatusToneClass
	} from '$lib/types/control-plane';
	import {
		AGENT_THREAD_CONTACT_TYPE_OPTIONS,
		formatAgentThreadContactStatusLabel,
		formatAgentThreadContactTypeLabel
	} from '$lib/types/agent-thread';
	import type {
		AgentRunDetail,
		AgentRunStatus,
		AgentThreadContact,
		AgentThreadContactContextItem,
		AgentThreadDetail
	} from '$lib/types/agent-thread';
	import { onMount, tick } from 'svelte';
	import { fromStore } from 'svelte/store';
	import { fade } from 'svelte/transition';

	type TaskResponseAction = {
		taskId: string;
		taskTitle: string;
		taskProjectId: string;
		taskStatus: string;
		taskGoalId: string;
		taskArea: string;
		taskPriority: string;
		taskRiskLevel: string;
		taskApprovalMode: string;
		taskRequiresReview: boolean;
		taskDesiredRoleId: string;
		taskAssigneeWorkerId: string;
		taskTargetDate: string;
		taskRequiredCapabilityNames: string[];
		taskRequiredToolNames: string[];
		openReview: { status: string; summary: string } | null;
		pendingApproval: { mode: string; status: string; summary: string } | null;
		canApproveAndComplete: boolean;
		helperText: string;
		disabledReason: string;
	};

	type ThreadFocusTask = {
		id: string;
		title: string;
		projectId: string | null;
		status: string;
		summary: string;
		isPrimary: boolean;
		source: 'resolved' | 'linked';
	};

	type ResponseContextArtifact = {
		path: string;
		label: string;
		href: string;
		sourceLabel: string;
		actionLabel?: string;
	};

	type ThreadContactTarget = {
		id: string;
		name: string;
		handle: string;
		contactLabel: string;
		projectLabel: string;
		roleLabel: string;
		primaryTaskTitle: string;
		relatedTaskCount: number;
		lastActivityLabel: string;
		threadState: AgentThreadDetail['threadState'];
		latestRunStatus: AgentThreadDetail['latestRunStatus'];
		threadSummary: string;
		relatedTaskTitles: string[];
		canContact: boolean;
		disabledReason: string;
		routingReason: string;
	};

	type ContactContextItemOption = AgentThreadContactContextItem & {
		defaultSelected: boolean;
	};

	let {
		thread: sessionProp,
		sandboxOptions,
		threadFocusTask = null,
		taskResponseAction = null,
		threadContacts = [],
		threadContactTargets = [],
		responseContextArtifacts = [],
		form = null,
		backHref = resolve('/app/threads')
	} = $props<{
		thread: AgentThreadDetail;
		sandboxOptions: readonly string[];
		threadFocusTask?: ThreadFocusTask | null;
		taskResponseAction?: TaskResponseAction | null;
		threadContacts?: AgentThreadContact[];
		threadContactTargets?: ThreadContactTarget[];
		responseContextArtifacts?: ResponseContextArtifact[];
		form?: {
			ok?: boolean;
			message?: string;
			successAction?: string;
			taskId?: string;
			threadId?: string;
			previousThreadId?: string;
		} | null;
		backHref?: string;
	}>();

	let autoRefresh = $state(true);
	let isRefreshing = $state(false);
	let isCanceling = $state(false);
	let now = $state(Date.now());
	let selectedRunId = $state('');
	let selectedSidebarView = $state<'follow_up' | 'details' | 'attachments'>('follow_up');
	let conversationHistoryExpanded = $state(false);
	let expandedConversationRunIds = $state.raw<string[]>([]);
	let latestInstructionExpanded = $state(false);
	let followUpComposerRoot = $state<HTMLElement | null>(null);
	let followUpPromptField = $state<HTMLTextAreaElement | null>(null);
	let followUpAttachmentInput = $state<HTMLInputElement | null>(null);
	let followUpPrompt = $state('');
	let pendingFollowUpAttachments = $state.raw<
		{ id: string; name: string; sizeBytes: number; contentType: string }[]
	>([]);
	let threadContactsState = $state.raw<AgentThreadContact[]>([]);
	let sendState = $state<{ status: 'sending' | 'success' | 'error'; message: string } | null>(null);
	let contactTargetThreadId = $state('');
	let contactTargetQuery = $state('');
	let contactTargetBrowseMode = $state<'top' | 'all'>('top');
	let contactProjectFilter = $state('all');
	let contactRoleFilter = $state('all');
	let contactAvailabilityFilter = $state<'all' | 'available'>('available');
	let contactType = $state<(typeof AGENT_THREAD_CONTACT_TYPE_OPTIONS)[number]>('question');
	let contactContextSummary = $state('');
	let selectedContactContextItemIds = $state.raw<string[]>([]);
	let contactPrompt = $state('');
	let contactState = $state<{ status: 'sending' | 'success' | 'error'; message: string } | null>(
		null
	);
	let pageNotice = $state<{ tone: 'success' | 'error'; message: string } | null>(null);
	let threadDetailRoot = $state<HTMLElement | null>(null);
	let threadHeaderShrinkProgress = $state(0);
	let replyEntryRequested = $state(false);
	let session = $derived.by<AgentThreadDetail | null>(
		() => threadStoreState.current.byId[sessionProp.id] ?? sessionProp
	);
	let approveTaskResponseSuccess = $derived(
		form?.ok &&
			form?.successAction === 'approveTaskResponse' &&
			form?.taskId === taskResponseAction?.taskId
	);
	let recoverThreadSuccess = $derived(
		form?.ok && form?.successAction === 'recoverThread' && form?.threadId === session?.id
	);
	let moveLatestRequestToNewThreadSuccess = $derived(
		form?.ok &&
			form?.successAction === 'moveLatestRequestToNewThread' &&
			form?.previousThreadId === session?.id
	);
	let updateThreadHandleAliasSuccess = $derived(
		form?.ok && form?.successAction === 'updateThreadHandleAlias' && form?.threadId === session?.id
	);
	let updateThreadSandboxSuccess = $derived(
		form?.ok && form?.successAction === 'updateThreadSandbox' && form?.threadId === session?.id
	);

	const timestampFormatter = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});
	const autoRefreshIntervalLabel = `${ACTIVE_REFRESH_INTERVAL_MS / 1000}s`;
	const THREAD_DETAIL_REFRESH_INTERVAL_MS = Math.max(ACTIVE_REFRESH_INTERVAL_MS, 5_000);
	const THREAD_HEADER_SHRINK_DISTANCE = 120;
	const threadStoreState = fromStore(agentThreadStore);
	type ThreadStateDescriptor = {
		label: string;
		detail: string;
		className: string;
	};

	type ThreadCategorySection = {
		label: string;
		values: string[];
	};

	let selectedRun = $derived.by(() => {
		if (!session) {
			return null;
		}

		return (
			session.runs.find((run) => run.id === selectedRunId) ??
			session.latestRun ??
			session.runs[0] ??
			null
		);
	});
	let chronologicalRuns = $derived.by(() => (session ? [...session.runs].reverse() : []));
	let recentConversationRuns = $derived.by(() => chronologicalRuns.slice(-2));
	let hiddenConversationRunCount = $derived(
		Math.max(chronologicalRuns.length - recentConversationRuns.length, 0)
	);
	let visibleConversationRuns = $derived.by(() =>
		conversationHistoryExpanded ? chronologicalRuns : recentConversationRuns
	);
	let runNumberById = $derived.by(
		() => new Map(chronologicalRuns.map((run, index) => [run.id, index + 1]))
	);
	let contactTargetById = $derived.by<Map<string, ThreadContactTarget>>(
		() =>
			new Map(
				threadContactTargets.map((target: ThreadContactTarget) => [target.id, target] as const)
			)
	);
	let contactProjectOptions = $derived.by<string[]>(() =>
		[
			...new Set<string>(
				threadContactTargets
					.map((target: ThreadContactTarget) => target.projectLabel.trim())
					.filter((label: string) => label.length > 0)
			)
		].sort((left: string, right: string) => left.localeCompare(right))
	);
	let contactRoleOptions = $derived.by<string[]>(() =>
		[
			...new Set<string>(
				threadContactTargets
					.map((target: ThreadContactTarget) => target.roleLabel.trim())
					.filter((label: string) => label.length > 0)
			)
		].sort((left: string, right: string) => left.localeCompare(right))
	);
	let visibleContactTargets = $derived.by<ThreadContactTarget[]>(() => {
		const query = contactTargetQuery.trim().toLowerCase();

		return threadContactTargets.filter((target: ThreadContactTarget) => {
			if (contactAvailabilityFilter === 'available' && !target.canContact) {
				return false;
			}

			if (contactProjectFilter !== 'all' && target.projectLabel !== contactProjectFilter) {
				return false;
			}

			if (contactRoleFilter !== 'all' && target.roleLabel !== contactRoleFilter) {
				return false;
			}

			if (!query) {
				return true;
			}

			return [
				target.name,
				target.handle,
				target.contactLabel,
				target.projectLabel,
				target.roleLabel,
				target.primaryTaskTitle,
				target.lastActivityLabel,
				target.threadSummary,
				target.routingReason,
				...target.relatedTaskTitles
			]
				.join(' ')
				.toLowerCase()
				.includes(query);
		});
	});
	let suggestedContactTargets = $derived.by<ThreadContactTarget[]>(() =>
		visibleContactTargets.slice(0, 3)
	);
	let bestVisibleContactTarget = $derived.by<ThreadContactTarget | null>(
		() => visibleContactTargets[0] ?? null
	);
	let browsableContactTargets = $derived.by<ThreadContactTarget[]>(() =>
		contactTargetBrowseMode === 'all' ? visibleContactTargets : visibleContactTargets.slice(0, 12)
	);
	let threadState = $derived.by(() => (session ? describeThreadState(session) : null));
	let threadAttachments = $derived(session?.attachments ?? []);
	let combinedResponseContextArtifacts = $derived.by(() => [
		...threadAttachments.map((attachment) => ({
			path: attachment.path,
			label: attachment.name,
			href: `#thread-attachment-${attachment.id}`,
			sourceLabel: 'Thread attachment',
			actionLabel: 'Jump'
		})),
		...responseContextArtifacts
	]);
	let latestContextRun = $derived.by(() => session?.latestRun ?? session?.runs[0] ?? null);
	let latestInstructionNeedsClamp = $derived((latestContextRun?.prompt?.trim().length ?? 0) > 180);
	let selectedContactTarget = $derived.by<ThreadContactTarget | null>(
		() => contactTargetById.get(contactTargetThreadId) ?? null
	);
	let orderedThreadContacts = $derived.by(() =>
		[...threadContactsState].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
	);
	let sentThreadContacts = $derived.by(() =>
		orderedThreadContacts.filter((contact) => contact.sourceAgentThreadId === session?.id)
	);
	let receivedThreadContacts = $derived.by(() =>
		orderedThreadContacts.filter((contact) => contact.targetAgentThreadId === session?.id)
	);
	let awaitingReplyContacts = $derived.by(() =>
		sentThreadContacts.filter((contact) => contact.status === 'awaiting_reply')
	);
	let resolvedSentThreadContacts = $derived.by(() =>
		sentThreadContacts.filter((contact) => contact.status !== 'awaiting_reply')
	);
	$effect(() => {
		threadContactsState = threadContacts;
	});
	$effect(() => {
		const nextBrowseMode = contactTargetQuery.trim() ? 'all' : 'top';

		if (contactTargetBrowseMode !== nextBrowseMode) {
			contactTargetBrowseMode = nextBrowseMode;
		}
	});
	$effect(() => {
		if (contactProjectFilter !== 'all' && !contactProjectOptions.includes(contactProjectFilter)) {
			contactProjectFilter = 'all';
		}

		if (contactRoleFilter !== 'all' && !contactRoleOptions.includes(contactRoleFilter)) {
			contactRoleFilter = 'all';
		}
	});
	let focusTask = $derived.by<ThreadFocusTask | null>(() => {
		if (threadFocusTask) {
			return threadFocusTask;
		}

		if (taskResponseAction) {
			return {
				id: taskResponseAction.taskId,
				title: taskResponseAction.taskTitle,
				projectId: taskResponseAction.taskProjectId,
				status: taskResponseAction.taskStatus,
				summary: '',
				isPrimary: true,
				source: 'resolved'
			};
		}

		if (!session) {
			return null;
		}

		const primaryTask =
			session.relatedTasks.find((task) => task.isPrimary) ??
			(session.relatedTasks.length === 1 ? session.relatedTasks[0] : null);

		if (!primaryTask) {
			return null;
		}

		return {
			id: primaryTask.id,
			title: primaryTask.title,
			projectId: null,
			status: primaryTask.status,
			summary: '',
			isPrimary: primaryTask.isPrimary,
			source: 'linked'
		};
	});
	let availableContactContextItems = $derived.by<ContactContextItemOption[]>(() => {
		const items: ContactContextItemOption[] = [];

		if (focusTask) {
			items.push({
				id: `focus-task:${focusTask.id}`,
				kind: 'task',
				label: focusTask.title,
				detail: focusTask.summary || `Current task (${focusTask.status}).`,
				path: null,
				href: resolve(`/app/tasks/${focusTask.id}`),
				defaultSelected: true
			});
		}

		if (latestContextRun) {
			items.push({
				id: `run:${latestContextRun.id}`,
				kind: 'run',
				label: 'Latest thread response',
				detail:
					latestContextRun.lastMessage?.trim() ||
					latestContextRun.prompt?.trim() ||
					'Most recent saved thread context.',
				path: latestContextRun.messagePath || latestContextRun.logPath || null,
				href: null,
				defaultSelected: true
			});
		}

		for (const artifact of combinedResponseContextArtifacts) {
			items.push({
				id: `artifact:${artifact.path}`,
				kind: artifact.sourceLabel === 'Thread attachment' ? 'thread_attachment' : 'task_artifact',
				label: artifact.label,
				detail: artifact.sourceLabel,
				path: artifact.path,
				href: artifact.href ? resolve(artifact.href) : null,
				defaultSelected: false
			});
		}

		return items.filter(
			(item, index, contextItems) =>
				contextItems.findIndex((candidate) => candidate.id === item.id) === index
		);
	});
	$effect(() => {
		const validIds = selectedContactContextItemIds.filter((id) =>
			availableContactContextItems.some((item) => item.id === id)
		);

		if (validIds.length > 0) {
			if (!sameStringArray(validIds, selectedContactContextItemIds)) {
				selectedContactContextItemIds = validIds;
			}
			return;
		}

		const defaultIds = availableContactContextItems
			.filter((item) => item.defaultSelected)
			.map((item) => item.id);

		if (!sameStringArray(defaultIds, selectedContactContextItemIds)) {
			selectedContactContextItemIds = defaultIds;
		}
	});
	let selectedHistoricalRun = $derived.by(() => {
		if (!selectedRun) {
			return null;
		}

		if (latestContextRun && selectedRun.id === latestContextRun.id) {
			return null;
		}

		return selectedRun;
	});
	let needsRecovery = $derived.by(
		() =>
			Boolean(session?.latestRun) &&
			(session?.hasActiveRun || (session?.threadState ?? session?.threadState) === 'attention')
	);
	let canRecoverInPlace = $derived.by(() => {
		if (!session?.latestRun) {
			return false;
		}

		if (session.hasActiveRun) {
			return session.origin === 'managed';
		}

		return (
			session.canResume &&
			(session.latestRunStatus === 'failed' || session.latestRunStatus === 'canceled')
		);
	});
	let canMoveLatestRequestToNewThread = $derived.by(() => {
		if (!session?.latestRun || !needsRecovery) {
			return false;
		}

		if (session.hasActiveRun) {
			return session.origin === 'managed';
		}

		return true;
	});

	function urlRequestsReplyEntry() {
		if (typeof window === 'undefined') {
			return false;
		}

		const url = new URL(window.location.href);
		const composeParam = url.searchParams.get('compose')?.trim().toLowerCase() ?? '';

		return composeParam === '1' || composeParam === 'true' || url.hash === '#reply';
	}

	function syncReplyEntryIntentFromLocation() {
		replyEntryRequested = urlRequestsReplyEntry();

		if (replyEntryRequested) {
			selectedSidebarView = 'follow_up';
		}
	}

	function findScrollContainer(node: HTMLElement | null) {
		const appShellScrollContainer = node?.closest('[data-app-shell-scroll-container="true"]');

		if (appShellScrollContainer instanceof HTMLElement) {
			return appShellScrollContainer;
		}

		let current = node?.parentElement ?? null;

		while (current) {
			const overflowY = window.getComputedStyle(current).overflowY;

			if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
				return current;
			}

			current = current.parentElement;
		}

		return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null;
	}

	async function focusFollowUpComposer() {
		await tick();

		followUpComposerRoot?.scrollIntoView({ block: 'start', behavior: 'smooth' });

		if (followUpPromptField && !followUpPromptField.disabled) {
			followUpPromptField.focus();
			const caretPosition = followUpPrompt.length;
			followUpPromptField.setSelectionRange(caretPosition, caretPosition);
			return;
		}

		followUpComposerRoot?.scrollIntoView({ block: 'start', behavior: 'smooth' });
	}

	onMount(() => {
		let cancelled = false;
		let cleanup: (() => void) | undefined;
		const syncReplyEntryIntent = () => {
			syncReplyEntryIntentFromLocation();
		};

		void tick().then(() => {
			if (cancelled) {
				return;
			}

			const scrollContainer = findScrollContainer(threadDetailRoot);

			if (!scrollContainer) {
				return;
			}

			const syncThreadHeaderState = () => {
				const scrollTop =
					scrollContainer === document.scrollingElement
						? window.scrollY
						: scrollContainer.scrollTop;
				const scrollViewportTop =
					scrollContainer === document.scrollingElement
						? 0
						: scrollContainer.getBoundingClientRect().top;
				const headerTop = threadDetailRoot?.getBoundingClientRect().top ?? scrollViewportTop;
				const visibleScrollOffset = Math.max(scrollViewportTop - headerTop, 0);
				const shrinkOffset = Math.max(scrollTop, visibleScrollOffset);

				threadHeaderShrinkProgress = Math.min(
					Math.max(shrinkOffset / THREAD_HEADER_SHRINK_DISTANCE, 0),
					1
				);
			};

			syncThreadHeaderState();
			scrollContainer.addEventListener('scroll', syncThreadHeaderState, { passive: true });
			window.addEventListener('resize', syncThreadHeaderState);

			cleanup = () => {
				scrollContainer.removeEventListener('scroll', syncThreadHeaderState);
				window.removeEventListener('resize', syncThreadHeaderState);
			};
		});

		syncReplyEntryIntent();
		window.addEventListener('hashchange', syncReplyEntryIntent);
		window.addEventListener('popstate', syncReplyEntryIntent);

		return () => {
			cancelled = true;
			cleanup?.();
			window.removeEventListener('hashchange', syncReplyEntryIntent);
			window.removeEventListener('popstate', syncReplyEntryIntent);
		};
	});

	$effect(() => {
		agentThreadStore.seedThread(sessionProp);
	});

	$effect(() => {
		if (!session) {
			selectedRunId = '';
			return;
		}

		const fallbackRunId = session.latestRun?.id ?? session.runs[0]?.id ?? '';

		if (!fallbackRunId) {
			selectedRunId = '';
			return;
		}

		if (!selectedRunId || !session.runs.some((run) => run.id === selectedRunId)) {
			selectedRunId = fallbackRunId;
		}
	});

	let previousConversationThreadId = '';

	$effect(() => {
		const currentThreadId = session?.id ?? '';

		if (currentThreadId !== previousConversationThreadId) {
			conversationHistoryExpanded = false;
			expandedConversationRunIds = [];
			previousConversationThreadId = currentThreadId;
		}
	});

	$effect(() => {
		const preferredTarget =
			visibleContactTargets.find((target: ThreadContactTarget) => target.canContact) ??
			visibleContactTargets[0] ??
			null;

		if (!preferredTarget) {
			contactTargetThreadId = '';
			return;
		}

		if (!visibleContactTargets.some((target) => target.id === contactTargetThreadId)) {
			contactTargetThreadId = preferredTarget.id;
		}
	});

	let previousLatestInstructionRunId = '';

	$effect(() => {
		const currentLatestInstructionRunId = latestContextRun?.id ?? '';

		if (currentLatestInstructionRunId !== previousLatestInstructionRunId) {
			latestInstructionExpanded = false;
			previousLatestInstructionRunId = currentLatestInstructionRunId;
		}
	});

	$effect(() => {
		if (!session || !autoRefresh || !session.hasActiveRun) {
			return;
		}

		const intervalId = window.setInterval(() => {
			void refreshThread();
		}, THREAD_DETAIL_REFRESH_INTERVAL_MS);

		return () => {
			window.clearInterval(intervalId);
		};
	});

	let previousReplyEntryFocusKey = '';

	$effect(() => {
		const replyEntryFocusKey =
			replyEntryRequested && selectedSidebarView === 'follow_up' && session
				? `${session.id}:${session.canResume ? 'ready' : 'blocked'}`
				: '';

		if (!replyEntryFocusKey || replyEntryFocusKey === previousReplyEntryFocusKey) {
			return;
		}

		previousReplyEntryFocusKey = replyEntryFocusKey;
		void focusFollowUpComposer();
	});

	$effect(() => {
		const intervalId = window.setInterval(() => {
			now = Date.now();
		}, ACTIVITY_CLOCK_INTERVAL_MS);

		return () => {
			window.clearInterval(intervalId);
		};
	});

	function formatAttachmentSize(sizeBytes: number) {
		if (sizeBytes < 1024) {
			return `${sizeBytes} B`;
		}

		if (sizeBytes < 1024 * 1024) {
			return `${(sizeBytes / 1024).toFixed(1)} KB`;
		}

		return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function getThreadCategorySections(detail: AgentThreadDetail): ThreadCategorySection[] {
		if (!detail.categorization) {
			return [];
		}

		return [
			{ label: 'Projects', values: detail.categorization.projectLabels },
			{ label: 'Goals', values: detail.categorization.goalLabels },
			{
				label: 'Area',
				values: detail.categorization.areaLabels ?? detail.categorization.areaLabels ?? []
			},
			{ label: 'Focus', values: detail.categorization.focusLabels },
			{ label: 'Context', values: detail.categorization.entityLabels },
			{ label: 'Role', values: detail.categorization.roleLabels },
			{ label: 'Capabilities', values: detail.categorization.capabilityLabels },
			{ label: 'Tools', values: detail.categorization.toolLabels },
			{ label: 'Terms', values: detail.categorization.keywordLabels }
		].filter((section) => section.values.length > 0);
	}

	function createAttachmentKey(file: File) {
		return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
	}

	function syncPendingFollowUpAttachments() {
		pendingFollowUpAttachments = Array.from(followUpAttachmentInput?.files ?? []).map((file) => ({
			id: createAttachmentKey(file),
			name: file.name || 'Attachment',
			sizeBytes: file.size,
			contentType: file.type || 'Unknown type'
		}));
	}

	function replaceFollowUpAttachmentFiles(files: File[]) {
		if (!followUpAttachmentInput || typeof DataTransfer === 'undefined') {
			return;
		}

		const transfer = new DataTransfer();

		for (const file of files) {
			transfer.items.add(file);
		}

		followUpAttachmentInput.files = transfer.files;
		syncPendingFollowUpAttachments();
	}

	function mergeFollowUpAttachmentFiles(files: Iterable<File>) {
		const nextFiles = Array.from(followUpAttachmentInput?.files ?? []);

		for (const file of files) {
			if (file.size === 0) {
				continue;
			}

			const nextFileKey = createAttachmentKey(file);
			const existingIndex = nextFiles.findIndex(
				(existingFile) => createAttachmentKey(existingFile) === nextFileKey
			);

			if (existingIndex >= 0) {
				nextFiles[existingIndex] = file;
				continue;
			}

			nextFiles.push(file);
		}

		replaceFollowUpAttachmentFiles(nextFiles);
	}

	async function attachReferencedArtifactToFollowUp(input: { path: string; label: string }) {
		if (!session?.canResume || sendState?.status === 'sending') {
			return;
		}

		selectedSidebarView = 'follow_up';
		await tick();

		const response = await fetch(
			resolve(`/api/artifacts/file?path=${encodeURIComponent(input.path)}`)
		);

		if (!response.ok) {
			throw new Error('Could not load the referenced file.');
		}

		const blob = await response.blob();
		const contentType =
			response.headers.get('content-type')?.split(';')[0]?.trim() ||
			blob.type ||
			'application/octet-stream';
		const fileName = input.path.split('/').pop() || input.label || 'attachment';
		const attachment = new File([blob], fileName, {
			type: contentType,
			lastModified: 0
		});

		mergeFollowUpAttachmentFiles([attachment]);
		pageNotice = {
			tone: 'success',
			message: `${fileName} added to the follow-up attachments.`
		};
	}

	function clearPendingFollowUpAttachments() {
		if (followUpAttachmentInput) {
			followUpAttachmentInput.value = '';
		}

		pendingFollowUpAttachments = [];
	}

	function handleFollowUpAttachmentPaste(event: ClipboardEvent) {
		const pastedFiles = Array.from(event.clipboardData?.items ?? [])
			.filter((item) => item.kind === 'file')
			.map((item) => item.getAsFile())
			.filter((file): file is File => file !== null);

		if (pastedFiles.length === 0) {
			return;
		}

		mergeFollowUpAttachmentFiles(pastedFiles);
	}

	async function loadThread() {
		if (!session) {
			throw new Error('Thread not found.');
		}

		const [thread, contactResponse] = await Promise.all([
			fetchAgentThread(session.id),
			fetch(resolve(`/api/agents/threads/${session.id}/contacts?limit=12`), {
				cache: 'no-store'
			})
		]);

		if (thread) {
			agentThreadStore.seedThread(thread);
		}

		if (!contactResponse.ok) {
			throw new Error('Could not refresh thread contacts.');
		}

		const contactPayload = (await contactResponse.json()) as {
			contacts?: AgentThreadContact[];
		};
		threadContactsState = contactPayload.contacts ?? [];
	}

	async function refreshThread(options: { force?: boolean } = {}) {
		if (isRefreshing) {
			return;
		}

		if (shouldPauseRefresh({ force: options.force })) {
			return;
		}

		isRefreshing = true;

		try {
			await loadThread();
			pageNotice = null;
		} catch (err) {
			pageNotice = {
				tone: 'error',
				message: err instanceof Error ? err.message : 'Could not refresh the thread.'
			};
		} finally {
			isRefreshing = false;
		}
	}

	async function cancelActiveRun() {
		if (!session || isCanceling || !session.hasActiveRun) {
			return;
		}

		isCanceling = true;

		try {
			const response = await fetch(resolve(`/api/agents/threads/${session.id}/cancel`), {
				method: 'POST'
			});
			const payload = (await response.json()) as { error?: string };

			if (!response.ok) {
				throw new Error(payload.error ?? 'Could not cancel the active run.');
			}

			await refreshThread({ force: true });
			pageNotice = {
				tone: 'success',
				message: 'Active run canceled.'
			};
		} catch (err) {
			pageNotice = {
				tone: 'error',
				message: err instanceof Error ? err.message : 'Could not cancel the active run.'
			};
		} finally {
			isCanceling = false;
		}
	}

	function handleWindowFocus() {
		void refreshThread();
	}

	function handleVisibilityChange() {
		if (document.visibilityState !== 'visible') {
			return;
		}

		void refreshThread();
	}

	async function submitFollowUp(event: SubmitEvent) {
		event.preventDefault();

		if (!session) {
			return;
		}

		const formElement = event.currentTarget;
		if (!(formElement instanceof HTMLFormElement)) {
			return;
		}

		const formData = new FormData(formElement);
		const prompt = formData.get('prompt')?.toString().trim() ?? '';
		const attachmentCount = formData
			.getAll('attachments')
			.filter((value): value is File => value instanceof File && value.size > 0).length;

		if (!prompt && attachmentCount === 0) {
			sendState = {
				status: 'error',
				message: 'Prompt or attachment is required.'
			};
			return;
		}

		if (sendState?.status === 'sending') {
			return;
		}

		sendState = {
			status: 'sending',
			message: 'Queueing follow-up...'
		};

		try {
			const response = await fetch(resolve(`/api/agents/threads/${session.id}/messages`), {
				method: 'POST',
				body: formData
			});
			const payload = (await response.json()) as { error?: string };

			if (!response.ok) {
				throw new Error(payload.error ?? 'Could not queue thread follow-up.');
			}

			formElement.reset();
			followUpPrompt = '';
			clearPendingFollowUpAttachments();
			await refreshThread({ force: true });
			sendState = {
				status: 'success',
				message:
					attachmentCount > 0
						? attachmentCount === 1
							? 'Follow-up queued with 1 attachment.'
							: `Follow-up queued with ${attachmentCount} attachments.`
						: 'Follow-up queued.'
			};
			pageNotice = {
				tone: 'success',
				message:
					attachmentCount > 0
						? `Follow-up queued for ${session.name} with ${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}.`
						: `Follow-up queued for ${session.name}.`
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Could not queue thread follow-up.';
			sendState = {
				status: 'error',
				message
			};
			pageNotice = {
				tone: 'error',
				message
			};
		}
	}

	async function queueThreadContact(target: ThreadContactTarget | null) {
		if (!session || !target) {
			return;
		}

		const prompt = contactPrompt.trim();
		const contextItems = availableContactContextItems
			.filter((item) => selectedContactContextItemIds.includes(item.id))
			.map(({ id, kind, label, detail, path, href }) => ({
				id,
				kind,
				label,
				detail,
				path,
				href
			}));

		if (!prompt) {
			contactState = {
				status: 'error',
				message: 'Prompt is required.'
			};
			return;
		}

		if (!target.canContact) {
			contactState = {
				status: 'error',
				message: target.disabledReason || 'This thread cannot accept a contact request.'
			};
			return;
		}

		if (contactState?.status === 'sending') {
			return;
		}

		contactTargetThreadId = target.id;
		contactState = {
			status: 'sending',
			message: 'Queueing thread contact...'
		};

		try {
			const response = await fetch(resolve(`/api/agents/threads/${target.id}/messages`), {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					prompt,
					sourceThreadId: session.id,
					contactType,
					contextSummary: contactContextSummary.trim(),
					contextItems,
					replyRequested: true
				})
			});
			const payload = (await response.json()) as { error?: string };

			if (!response.ok) {
				throw new Error(payload.error ?? 'Could not contact the selected thread.');
			}

			contactPrompt = '';
			contactContextSummary = '';
			selectedContactContextItemIds = [];
			contactType = 'question';
			await refreshThread({ force: true });
			contactState = {
				status: 'success',
				message: `Contact request queued for ${target.name}.`
			};
			pageNotice = {
				tone: 'success',
				message: `Queued a cross-thread contact request for ${target.name}.`
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Could not contact the selected thread.';
			contactState = {
				status: 'error',
				message
			};
			pageNotice = {
				tone: 'error',
				message
			};
		}
	}

	async function submitThreadContact(event: SubmitEvent) {
		event.preventDefault();
		await queueThreadContact(selectedContactTarget);
	}

	function selectRun(runId: string) {
		selectedRunId = runId;
	}

	function isConversationRunExpanded(runId: string) {
		return expandedConversationRunIds.includes(runId);
	}

	function toggleConversationRunExpanded(runId: string) {
		if (isConversationRunExpanded(runId)) {
			expandedConversationRunIds = expandedConversationRunIds.filter((id) => id !== runId);
			return;
		}

		expandedConversationRunIds = [...expandedConversationRunIds, runId];
	}

	function conversationRunNumber(runId: string) {
		return runNumberById.get(runId) ?? 0;
	}

	function formatTimestamp(iso: string | null) {
		if (!iso) {
			return 'Not available';
		}

		return timestampFormatter.format(new Date(iso));
	}

	function sessionStatusClass(state: AgentThreadDetail['threadState']) {
		switch (state) {
			case 'working':
				return 'border border-emerald-800/70 bg-emerald-950/50 text-emerald-300';
			case 'starting':
				return 'border border-violet-800/70 bg-violet-950/50 text-violet-300';
			case 'waiting':
			case 'ready':
				return 'border border-sky-800/70 bg-sky-950/50 text-sky-300';
			case 'attention':
				return 'border border-rose-900/70 bg-rose-950/40 text-rose-300';
			case 'unavailable':
			default:
				return 'border border-slate-700 bg-slate-900 text-slate-300';
		}
	}

	function runStatusClass(status: AgentRunStatus | 'idle') {
		switch (status) {
			case 'running':
				return 'border border-emerald-800/70 bg-emerald-950/50 text-emerald-300';
			case 'queued':
				return 'border border-violet-800/70 bg-violet-950/50 text-violet-300';
			case 'failed':
			case 'canceled':
				return 'border border-rose-900/70 bg-rose-950/40 text-rose-300';
			case 'completed':
				return 'border border-sky-800/70 bg-sky-950/50 text-sky-300';
			default:
				return 'border border-slate-700 bg-slate-900 text-slate-300';
		}
	}

	function contactStatusClass(status: AgentThreadContact['status']) {
		switch (status) {
			case 'awaiting_reply':
				return 'border border-amber-800/70 bg-amber-950/40 text-amber-200';
			case 'answered':
				return 'border border-emerald-800/70 bg-emerald-950/40 text-emerald-200';
			case 'sent':
			default:
				return 'border border-slate-700 bg-slate-900 text-slate-300';
		}
	}

	function contactDirectionLabel(contact: AgentThreadContact) {
		return contact.sourceAgentThreadId === session?.id
			? `Sent to ${contact.targetAgentThreadName}`
			: `Received from ${contact.sourceAgentThreadName}`;
	}

	function threadLabel(detail: AgentThreadDetail) {
		if (detail.threadId) {
			return 'Available';
		}

		return detail.hasActiveRun ? 'Pending' : 'Missing';
	}

	function resumeLabel(detail: AgentThreadDetail) {
		if (detail.hasActiveRun) {
			return 'Busy';
		}

		return detail.canResume ? 'Available' : 'Blocked';
	}

	function latestRunStatus(run: AgentRunDetail | null) {
		return run?.state?.status ?? 'idle';
	}

	function runModeLabel(run: AgentRunDetail) {
		return run.mode === 'message' ? 'Follow-up' : 'Start';
	}

	function sameStringArray(left: string[], right: string[]) {
		return left.length === right.length && left.every((value, index) => value === right[index]);
	}

	function sourceThreadLabel(run: AgentRunDetail) {
		return run.sourceAgentThreadName ?? run.sourceAgentThreadId ?? '';
	}

	function runQueuedLabel(run: AgentRunDetail) {
		return run.mode === 'message' ? 'Follow-up queued on' : 'Queued on';
	}

	function describeThreadState(detail: AgentThreadDetail): ThreadStateDescriptor {
		return {
			label: formatThreadStateLabel(detail.threadState ?? detail.threadState ?? 'idle'),
			detail: detail.threadSummary ?? detail.threadSummary ?? '',
			className: sessionStatusClass(detail.threadState ?? detail.threadState ?? 'idle')
		};
	}

	function replyStateLabel(detail: AgentThreadDetail) {
		if (detail.latestRun?.lastMessage) {
			return 'Captured';
		}

		if (detail.latestRunStatus === 'running') {
			return 'Waiting';
		}

		if (detail.latestRunStatus === 'queued') {
			return 'Pending';
		}

		if (detail.latestRunStatus === 'failed' || detail.latestRunStatus === 'canceled') {
			return 'Missing';
		}

		return 'None';
	}

	function replyStateDetail(detail: AgentThreadDetail) {
		if (detail.latestRun?.lastMessage) {
			return 'A saved reply is available in the selected run.';
		}

		if (detail.latestRunStatus === 'running') {
			return 'Waiting for the first saved reply from the current run.';
		}

		if (detail.latestRunStatus === 'queued') {
			return 'The current run has not started yet.';
		}

		if (detail.latestRunStatus === 'failed' || detail.latestRunStatus === 'canceled') {
			return 'The latest run ended before a reply was captured.';
		}

		return 'No reply has been captured for the latest run.';
	}

	function responseStateLabel(run: AgentRunDetail) {
		switch (latestRunStatus(run)) {
			case 'queued':
				return 'Queued. Waiting for the agent to start.';
			case 'running':
				return 'Run in progress. No response captured yet.';
			case 'failed':
				return 'Run failed before a response was captured.';
			case 'canceled':
				return 'Run was canceled before a response was captured.';
			default:
				return 'No response captured for this run.';
		}
	}

	function responseText(run: AgentRunDetail) {
		return run.lastMessage ?? responseStateLabel(run);
	}

	function shouldShowActiveResponsePlaceholder(run: AgentRunDetail | null) {
		if (!run?.lastMessage) {
			const status = latestRunStatus(run);
			return status === 'queued' || status === 'running';
		}

		return false;
	}

	function compactText(value: string, maxLength = 180) {
		const normalized = value.replace(/\s+/g, ' ').trim();

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
	}

	function executionMeta(detail: AgentThreadDetail) {
		return getThreadActivityMeta(detail, now);
	}

	function focusTaskDescription(task: ThreadFocusTask) {
		if (task.source === 'resolved') {
			return 'This thread response is tied to the current task.';
		}

		if (task.isPrimary) {
			return 'Primary task linked to this thread.';
		}

		return 'Linked task context for this thread.';
	}

	function recoveryHeadline(detail: AgentThreadDetail) {
		if (detail.hasActiveRun) {
			return 'This thread still has an active run that may need intervention.';
		}

		return 'The latest run needs attention before this thread is healthy again.';
	}

	function recoveryDetail(detail: AgentThreadDetail) {
		if (detail.hasActiveRun) {
			return detail.threadId
				? 'Recover in place to retire the current run and replay the latest request inside the same thread, or move that request into a fresh thread.'
				: 'No resumable thread id is available yet. Move the latest request into a fresh thread if this run is truly stuck.';
		}

		if (detail.canResume) {
			return 'You can retry the latest request inside this thread, or move it into a fresh thread if the current context looks poisoned.';
		}

		return 'This thread cannot resume directly. Move the latest request into a fresh thread to keep work moving.';
	}

	function recoverInPlaceDisabledReason(detail: AgentThreadDetail) {
		if (!detail.latestRun) {
			return 'No saved request is available to recover.';
		}

		if (detail.hasActiveRun && detail.origin !== 'managed') {
			return 'Imported Codex threads cannot force-recover an active managed run yet.';
		}

		if (!detail.hasActiveRun && !detail.canResume) {
			return 'This thread does not currently have a resumable Codex thread id.';
		}

		return '';
	}

	function moveLatestRequestDisabledReason(detail: AgentThreadDetail) {
		if (!detail.latestRun) {
			return 'No saved request is available to move.';
		}

		if (detail.hasActiveRun && detail.origin !== 'managed') {
			return 'Imported Codex threads cannot retire an active run automatically yet.';
		}

		return '';
	}

	function createTaskFromThreadName(prompt: string) {
		const normalizedPrompt = prompt
			.split('\n')
			.map((line) => line.trim())
			.find(Boolean);

		if (normalizedPrompt) {
			return compactText(normalizedPrompt, 72);
		}

		if (focusTask) {
			return `Follow-up: ${focusTask.title}`;
		}

		return `New task from ${session?.name ?? 'thread'}`;
	}

	function createTaskFromThreadInstructions(prompt: string) {
		const trimmedPrompt = prompt.trim();
		const sections = [
			trimmedPrompt
				? `Requested follow-up work:\n${trimmedPrompt}`
				: 'Create a new task based on this thread.',
			session ? `Thread: ${session.name}` : '',
			focusTask ? `Current task context: ${focusTask.title}` : '',
			latestContextRun
				? `Latest response summary:\n${compactText(responseText(latestContextRun), 420)}`
				: (session?.threadSummary ?? session?.threadSummary ?? '')
		].filter(Boolean);

		return sections.join('\n\n');
	}
</script>

<svelte:window onfocus={handleWindowFocus} />
<svelte:document onvisibilitychange={handleVisibilityChange} />

{#snippet focusTaskCard(
	task: ThreadFocusTask,
	options: {
		label: string;
		description: string;
		compact?: boolean;
	}
)}
	<div
		class={[
			'rounded-xl border border-amber-800/40 bg-gradient-to-br from-amber-950/25 via-slate-950/90 to-slate-950',
			options.compact ? 'p-3' : 'p-4'
		]}
	>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0">
				<p class="text-[11px] font-semibold tracking-[0.18em] text-amber-200 uppercase">
					{options.label}
				</p>
				<p class="ui-wrap-anywhere mt-2 text-sm font-semibold text-white">{task.title}</p>
				{#if task.summary.trim()}
					<div class="mt-3 rounded-lg border border-slate-800/80 bg-black/20 p-3">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Task brief</p>
						<p
							class={[
								'ui-wrap-anywhere mt-2 text-sm text-slate-200',
								options.compact ? '' : 'leading-6 whitespace-pre-wrap'
							]}
						>
							{options.compact ? compactText(task.summary.trim(), 220) : task.summary.trim()}
						</p>
					</div>
				{:else}
					<p class="ui-wrap-anywhere mt-1 text-sm text-slate-300">{options.description}</p>
				{/if}
			</div>
			<div class="flex min-w-0 flex-wrap items-center gap-2">
				<span
					class="inline-flex max-w-full items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none whitespace-normal text-slate-300 uppercase"
				>
					{formatTaskStatusLabel(task.status)}
				</span>
				{#if task.isPrimary}
					<span
						class="inline-flex max-w-full items-center justify-center rounded-full border border-amber-700/50 bg-amber-950/40 px-2 py-1 text-center text-[11px] leading-none whitespace-normal text-amber-200 uppercase"
					>
						Primary
					</span>
				{/if}
			</div>
		</div>

		<div class="mt-3 flex flex-wrap items-center justify-between gap-3">
			<p class="ui-wrap-anywhere text-xs text-slate-400">{focusTaskDescription(task)}</p>
			<a
				class="ui-wrap-anywhere text-sm font-medium text-amber-200 transition hover:text-amber-100"
				href={resolve(`/app/tasks/${task.id}`)}
			>
				Open task detail
			</a>
		</div>
	</div>
{/snippet}

{#snippet threadContactBadge(run: AgentRunDetail)}
	{#if run.sourceAgentThreadId}
		<a
			class="inline-flex max-w-full items-center justify-center rounded-full border border-amber-700/50 bg-amber-950/30 px-2 py-1 text-center text-[11px] leading-none whitespace-normal text-amber-200"
			href={resolve(`/app/threads/${run.sourceAgentThreadId}`)}
		>
			Contact from {sourceThreadLabel(run)}
		</a>
	{/if}
{/snippet}

{#snippet sessionStatus(detail: AgentThreadDetail, showFocusTask: boolean)}
	{@const execution = executionMeta(detail)}
	<div class="space-y-4 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<p class="text-xs font-medium tracking-[0.16em] text-slate-400 uppercase">Thread status</p>
				<h2 class="mt-1 text-lg font-semibold text-white">{threadState?.label ?? 'Unknown'}</h2>
			</div>
			{#if threadState}
				<span
					class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${threadState.className}`}
				>
					{threadState.label}
				</span>
			{/if}
		</div>

		<p class="ui-wrap-anywhere text-sm text-slate-300">
			{threadState?.detail ?? detail.threadSummary ?? detail.threadSummary}
		</p>
		{#if uniqueTopicLabels(detail.topicLabels).length > 0}
			<div class="flex flex-wrap gap-2">
				{#each uniqueTopicLabels(detail.topicLabels) as topicLabel (topicLabel)}
					<span
						class="inline-flex items-center justify-center rounded-full border border-sky-900/60 bg-sky-950/30 px-2 py-1 text-center text-[11px] leading-none text-sky-200 uppercase"
					>
						{topicLabel}
					</span>
				{/each}
			</div>
		{/if}
		{#if getThreadCategorySections(detail).length > 0}
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{#each getThreadCategorySections(detail) as section (section.label)}
					<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">{section.label}</p>
						<p class="ui-wrap-anywhere mt-2 text-sm text-slate-200">{section.values.join(', ')}</p>
					</div>
				{/each}
			</div>
		{/if}
		<ThreadActivityIndicator thread={detail} {now} />
		<p class="ui-wrap-anywhere text-xs text-slate-500">
			A work thread keeps one Codex conversation and all of its runs together. Each run in the
			history below is one start or follow-up execution inside this thread.
		</p>

		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
			<DetailFactCard
				label="Latest run"
				value={detail.latestRun ? runModeLabel(detail.latestRun) : 'None yet'}
				detail={detail.latestRun ? latestRunStatus(detail.latestRun) : 'No runs recorded'}
				class="rounded-lg border-transparent bg-black/20"
				labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
			/>
			<DetailFactCard
				label="Execution"
				value={execution.label}
				detail={execution.detail}
				class="rounded-lg border-transparent bg-black/20"
				labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
			/>
			{#if execution.activityLabel}
				<DetailFactCard
					label={execution.activityHeading ?? 'Current activity'}
					value={execution.activityLabel}
					detail={execution.activityDetail ?? execution.detail}
					class="rounded-lg border-transparent bg-black/20"
					labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
				/>
			{/if}
			<DetailFactCard
				label="Reply state"
				value={replyStateLabel(detail)}
				detail={replyStateDetail(detail)}
				class="rounded-lg border-transparent bg-black/20"
				labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
			/>
			<DetailFactCard
				label="Thread"
				value={threadLabel(detail)}
				detail={detail.threadId
					? 'A Codex thread id is available for follow-up work.'
					: 'No Codex thread id yet. Start the first run and the manager will attach one when it becomes available.'}
				class="rounded-lg border-transparent bg-black/20"
				labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
			/>
			<DetailFactCard
				label="Follow-up"
				value={resumeLabel(detail)}
				detail={detail.canResume
					? 'You can send the next instruction now.'
					: detail.hasActiveRun
						? 'Wait for the active run to finish first.'
						: 'This thread cannot accept a follow-up yet.'}
				class="rounded-lg border-transparent bg-black/20"
				labelClass="text-[11px] tracking-[0.16em] text-slate-500 uppercase"
			/>
		</div>

		{#if showFocusTask && focusTask}
			{@render focusTaskCard(focusTask, {
				label: 'Current task',
				description:
					'Keep this task in view while reviewing the latest thread output or sending the next follow-up.'
			})}
		{/if}

		<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
			<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Related tasks</p>
			{#if detail.relatedTasks.length > 0}
				<div class="mt-3 flex flex-wrap gap-2">
					{#each detail.relatedTasks as task (task.id)}
						<a
							class="ui-wrap-anywhere inline-flex max-w-full items-center justify-center rounded-full border border-slate-700 px-3 py-1 text-center text-xs leading-none whitespace-normal text-sky-300 transition hover:border-sky-400/40 hover:text-sky-200"
							href={resolve(`/app/tasks/${task.id}`)}
						>
							{task.title}
							{task.isPrimary ? ' · primary' : ''}
						</a>
					{/each}
				</div>
			{:else}
				<p class="ui-wrap-anywhere mt-2 text-sm text-slate-400">
					No tasks are linked to this thread yet. Assign it from a task when you want future work to
					reuse this context.
				</p>
			{/if}
		</div>
	</div>
{/snippet}

{#if session}
	<AppPage width="full" class="gap-5 sm:gap-6">
		<div
			bind:this={threadDetailRoot}
			class="space-y-5 sm:space-y-6"
			data-testid="thread-detail-panel"
		>
			<div style={`--ui-scroll-shrink-progress:${threadHeaderShrinkProgress};`}>
				<DetailHeader
					backHref={resolve(backHref)}
					backLabel="Back to threads"
					eyebrow="Thread detail"
					title={session.name}
					description={session.threadSummary ?? session.threadSummary}
					class="ui-scroll-shrink-header"
				>
					{#snippet actions()}
						<div class="thread-detail-header-actions flex flex-col gap-3 sm:flex-row sm:flex-wrap">
							<button
								class="thread-detail-header-action rounded-lg border border-slate-700 font-medium text-slate-100"
								type="button"
								onclick={() => {
									void refreshThread({ force: true });
								}}
							>
								{isRefreshing ? 'Refreshing...' : 'Refresh thread'}
							</button>
							{#if session!.hasActiveRun}
								<button
									class="thread-detail-header-action w-full rounded-lg border border-rose-900/70 bg-rose-950/30 font-medium text-rose-200 disabled:opacity-50 sm:w-auto"
									type="button"
									onclick={() => {
										void cancelActiveRun();
									}}
									disabled={isCanceling}
								>
									{isCanceling ? 'Canceling...' : 'Cancel active run'}
								</button>
							{/if}
						</div>
					{/snippet}

					{#snippet meta()}
						<div class="thread-detail-header-meta space-y-4">
							<div class="flex flex-wrap items-center gap-2">
								<span
									class="inline-flex items-center justify-center rounded-full border border-sky-900/70 bg-sky-950/30 px-2 py-1 text-center text-[11px] leading-none text-sky-200"
								>
									{session!.handle ?? session!.id}
								</span>
								{#if session!.handleAlias}
									<span
										class="inline-flex items-center justify-center rounded-full border border-emerald-900/70 bg-emerald-950/30 px-2 py-1 text-center text-[11px] leading-none text-emerald-200 uppercase"
									>
										Custom handle
									</span>
								{/if}
								<span
									class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${sessionStatusClass(session!.threadState ?? session!.threadState ?? 'idle')}`}
								>
									{formatThreadStateLabel(session!.threadState ?? session!.threadState ?? 'idle')}
								</span>
								<span
									class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(session!.latestRunStatus)}`}
								>
									latest run {session!.latestRunStatus}
								</span>
								<span
									class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
								>
									{session!.sandbox}
								</span>
								{#if session!.origin === 'external'}
									<span
										class="inline-flex items-center justify-center rounded-full border border-sky-900/70 bg-sky-950/40 px-2 py-1 text-center text-[11px] leading-none text-sky-300 uppercase"
									>
										Imported from Codex
									</span>
								{/if}
							</div>

							<div class="thread-detail-header-secondary space-y-4 overflow-hidden">
								<label
									class="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-400"
								>
									<input bind:checked={autoRefresh} type="checkbox" />
									<span>Auto-refresh active runs every {autoRefreshIntervalLabel}</span>
								</label>

								{#if session!.relatedTasks.length > 0}
									<p class="ui-clamp-3 ui-wrap-anywhere max-w-3xl text-xs text-slate-500">
										Related tasks: {session!.relatedTasks.map((task) => task.title).join(', ')}
									</p>
								{/if}

								<p class="ui-wrap-anywhere max-w-4xl text-xs text-slate-500">
									Contact label: {session!.contactLabel ??
										formatThreadStateLabel(session!.threadState)}
								</p>

								<p class="ui-wrap-anywhere max-w-4xl text-xs text-slate-500">{session!.cwd}</p>
							</div>
						</div>
					{/snippet}
				</DetailHeader>
			</div>

			{#if pageNotice}
				<p
					class={[
						'ui-wrap-anywhere rounded-xl px-4 py-3 text-sm',
						pageNotice.tone === 'success'
							? 'border border-emerald-900/70 bg-emerald-950/40 text-emerald-200'
							: 'border border-rose-900/70 bg-rose-950/40 text-rose-200'
					]}
					in:fade={{ duration: 150 }}
					out:fade={{ duration: 120 }}
				>
					{pageNotice.message}
				</p>
			{/if}

			{#if updateThreadSandboxSuccess}
				<p
					class="ui-wrap-anywhere rounded-xl border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
				>
					Thread sandbox updated. Future follow-up runs will use the new access mode.
				</p>
			{/if}

			{#if updateThreadHandleAliasSuccess}
				<p
					class="ui-wrap-anywhere rounded-xl border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
				>
					Thread handle alias updated.
				</p>
			{/if}

			{#if recoverThreadSuccess}
				<p
					class="ui-wrap-anywhere rounded-xl border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
				>
					Thread recovery queued. The latest request is running again in this thread.
				</p>
			{/if}

			{#if moveLatestRequestToNewThreadSuccess}
				<p
					class="ui-wrap-anywhere rounded-xl border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
				>
					Latest request moved into a fresh thread.
					{#if form?.threadId}
						<a
							class="ui-wrap-anywhere ml-2 font-medium text-emerald-100 underline decoration-emerald-300/60 underline-offset-2"
							href={resolve(`/app/threads/${form.threadId}`)}
						>
							Open new thread
						</a>
					{/if}
				</p>
			{/if}

			<div class="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
				<div class="order-2 space-y-6 xl:order-1">
					<DetailSection
						eyebrow="Priority"
						title="Decision context"
						description="Start here: confirm the task, read the newest agent response, and scan the signals that affect the next decision."
						bodyClass="space-y-4"
					>
						{#if focusTask}
							{@render focusTaskCard(focusTask, {
								label: 'Current task',
								description:
									'This is the task the thread is currently anchored to while you review or reply.'
							})}
						{/if}

						<div class="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<p class="text-sm font-medium text-white">Most recent response</p>
									<p class="ui-wrap-anywhere mt-1 text-sm text-slate-400">
										{#if latestContextRun}
											{runQueuedLabel(latestContextRun)}
											{formatTimestamp(latestContextRun.createdAt)}
										{:else}
											No saved response has been captured in this thread yet. Start the thread or
											wait for the current run to finish to populate this view.
										{/if}
									</p>
								</div>
								{#if latestContextRun}
									<div class="flex flex-wrap items-center gap-2">
										<span
											class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(latestRunStatus(latestContextRun))}`}
										>
											{latestRunStatus(latestContextRun)}
										</span>
										<span
											class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
										>
											{latestContextRun.mode}
										</span>
									</div>
								{/if}
							</div>

							{#if latestContextRun}
								{@const latestExecution = executionMeta(session)}
								<div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,0.48fr)]">
									<div class="min-w-0 space-y-4 xl:col-span-2">
										<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
											<div
												class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
											>
												<div class="min-w-0">
													<div class="flex flex-wrap items-center gap-2">
														<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">
															Latest instruction
														</p>
														{@render threadContactBadge(latestContextRun)}
													</div>
													{#if latestInstructionExpanded}
														<div class="mt-3">
															<ThreadMessageContent text={latestContextRun.prompt} tone="muted" />
														</div>
													{:else}
														<p
															class="ui-wrap-anywhere ui-clamp-2 mt-3 text-sm whitespace-pre-wrap text-slate-300"
														>
															{latestContextRun.prompt}
														</p>
													{/if}
												</div>
												{#if latestInstructionNeedsClamp}
													<AppButton
														size="sm"
														type="button"
														variant="ghost"
														onclick={() => {
															latestInstructionExpanded = !latestInstructionExpanded;
														}}
													>
														{latestInstructionExpanded
															? 'Collapse instruction'
															: 'Expand instruction'}
													</AppButton>
												{/if}
											</div>
										</div>

										<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
											<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">
												Agent response
											</p>
											<div class="mt-3">
												{#if shouldShowActiveResponsePlaceholder(latestContextRun)}
													<div class="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4">
														<div class="min-w-0 animate-pulse opacity-75">
															<p
																class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase"
															>
																Agent is working
															</p>
															<p class="mt-2 text-sm font-medium text-slate-200">
																{latestExecution.activityLabel ?? latestExecution.label}
															</p>
															<p class="ui-wrap-anywhere mt-1 text-sm text-slate-400">
																{latestExecution.activityDetail ?? latestExecution.detail}
															</p>
														</div>
														<div class="mt-3 text-xs text-slate-500">
															Updated {latestExecution.ageLabel}. This pane will switch to the saved
															agent reply as soon as the current run writes one.
														</div>
													</div>
												{:else}
													<ThreadMessageContent
														text={responseText(latestContextRun)}
														showReferenceSummary={true}
														contextArtifacts={combinedResponseContextArtifacts}
														onAttachArtifact={attachReferencedArtifactToFollowUp}
													/>
												{/if}
											</div>
											<div
												class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500"
											>
												<p class="ui-wrap-anywhere">
													<span class="tracking-[0.12em] text-slate-600 uppercase">Finished</span>
													<span class="ml-2">
														{formatTimestamp(latestContextRun.state?.finishedAt ?? null)}
													</span>
												</p>
											</div>
										</div>
									</div>
								</div>
							{:else}
								<p
									class="ui-wrap-anywhere mt-4 rounded-lg border border-dashed border-slate-800 px-4 py-5 text-sm text-slate-400"
								>
									Run the thread once or wait for the current run to finish to get a saved response
									here.
								</p>
							{/if}
						</div>
					</DetailSection>

					{#if selectedHistoricalRun}
						<DetailSection
							eyebrow="Selected turn"
							title="Inspect earlier context"
							description="Use this when you need to review an older turn without losing the newest response above."
							bodyClass="space-y-4"
						>
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<p class="text-sm font-medium text-white">
										{runQueuedLabel(selectedHistoricalRun)}
										{formatTimestamp(selectedHistoricalRun.createdAt)}
									</p>
									<p class="ui-wrap-anywhere mt-1 text-sm text-slate-400">
										You are looking at older thread context. The newest response stays pinned above.
									</p>
								</div>
								<div class="flex min-w-0 flex-wrap items-center gap-2">
									<span
										class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(latestRunStatus(selectedHistoricalRun))}`}
									>
										{latestRunStatus(selectedHistoricalRun)}
									</span>
									<span
										class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-300 uppercase"
									>
										{selectedHistoricalRun.mode}
									</span>
								</div>
							</div>

							<div class="grid gap-3 sm:grid-cols-3">
								<DetailFactCard
									label="Queued"
									value={formatTimestamp(selectedHistoricalRun.createdAt)}
								/>
								<DetailFactCard
									label="Finished"
									value={formatTimestamp(selectedHistoricalRun.state?.finishedAt ?? null)}
								/>
								<DetailFactCard
									label="Thread target"
									value={selectedHistoricalRun.requestedThreadId ?? 'Start a new thread'}
								/>
							</div>

							{#if selectedHistoricalRun.sourceAgentThreadId}
								<div class="flex flex-wrap items-center gap-2">
									{@render threadContactBadge(selectedHistoricalRun)}
								</div>
							{/if}

							<div class="space-y-3">
								<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Instruction</p>
									<div class="mt-2">
										<ThreadMessageContent text={selectedHistoricalRun.prompt} />
									</div>
								</div>

								<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
									<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Agent response</p>
									<div class="mt-2">
										<ThreadMessageContent
											text={responseText(selectedHistoricalRun)}
											showReferenceSummary={true}
											contextArtifacts={combinedResponseContextArtifacts}
											onAttachArtifact={attachReferencedArtifactToFollowUp}
										/>
									</div>
								</div>
							</div>

							<details class="rounded-xl border border-slate-800 bg-black/30 p-4">
								<summary class="ui-wrap-anywhere cursor-pointer text-sm font-medium text-slate-200">
									Selected turn log output
								</summary>
								{#if selectedHistoricalRun.logTail?.length}
									<pre
										class="ui-wrap-anywhere mt-3 max-h-80 overflow-auto text-xs whitespace-pre-wrap text-slate-300">{selectedHistoricalRun.logTail.join(
											'\n'
										)}</pre>
								{:else}
									<p class="ui-wrap-anywhere mt-3 text-sm text-slate-400">
										No log lines were saved for this turn. Check the run detail if you expected
										execution output.
									</p>
								{/if}
							</details>
						</DetailSection>
					{/if}

					<DetailSection
						eyebrow="Conversation"
						title="Conversation history"
						description="Inspect each turn in the thread, expand full text inline, or pin an older turn above without losing the newest response."
						bodyClass="space-y-3"
					>
						{#if hiddenConversationRunCount > 0}
							<div
								class="flex flex-col gap-3 rounded-lg border border-slate-800 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<p class="ui-wrap-anywhere text-sm text-slate-400">
									Showing the 2 most recent turns by default so the latest context stays compact.
								</p>
								<AppButton
									size="sm"
									type="button"
									variant="ghost"
									onclick={() => {
										conversationHistoryExpanded = !conversationHistoryExpanded;
									}}
								>
									{#if conversationHistoryExpanded}
										Show only 2 recent turns
									{:else}
										Show {hiddenConversationRunCount} older turn{hiddenConversationRunCount === 1
											? ''
											: 's'}
									{/if}
								</AppButton>
							</div>
						{/if}

						{#if chronologicalRuns.length === 0}
							<p
								class="ui-wrap-anywhere rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400"
							>
								No runs have been recorded for this thread yet. Send the first instruction from a
								linked task or wait for a queued run to start.
							</p>
						{:else}
							{#each visibleConversationRuns as run (run.id)}
								<article
									data-testid={`conversation-run-${run.id}`}
									class={[
										'w-full rounded-xl border p-4 text-left transition',
										selectedRun?.id === run.id
											? 'border-sky-800/70 bg-sky-950/20'
											: 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
									]}
								>
									<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
										<div class="min-w-0">
											<p class="text-sm font-medium text-white">
												Turn {conversationRunNumber(run.id)} · {runModeLabel(run)}
											</p>
											<p class="mt-1 text-xs text-slate-500">
												Queued {formatTimestamp(run.createdAt)}
											</p>
										</div>
										<span
											class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(latestRunStatus(run))}`}
										>
											{latestRunStatus(run)}
										</span>
									</div>

									<div class="mt-3 grid gap-3 lg:grid-cols-2">
										<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
												Instruction
											</p>
											<div class="relative mt-2">
												<div
													class={[
														'overflow-hidden transition-[max-height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
														isConversationRunExpanded(run.id) ? 'max-h-[48rem]' : 'max-h-20'
													]}
												>
													<ThreadMessageContent text={run.prompt} tone="muted" />
												</div>
												{#if !isConversationRunExpanded(run.id)}
													<div
														class="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent"
													></div>
												{/if}
											</div>
										</div>
										<div class="rounded-lg border border-slate-800 bg-black/20 p-3">
											<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Response</p>
											<div class="relative mt-2">
												<div
													class={[
														'overflow-hidden transition-[max-height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
														isConversationRunExpanded(run.id) ? 'max-h-[48rem]' : 'max-h-20'
													]}
												>
													<ThreadMessageContent text={responseText(run)} tone="muted" />
												</div>
												{#if !isConversationRunExpanded(run.id)}
													<div
														class="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent"
													></div>
												{/if}
											</div>
										</div>
									</div>

									<div class="mt-3 flex flex-wrap items-center gap-2">
										{@render threadContactBadge(run)}
										<AppButton
											size="sm"
											type="button"
											variant={selectedRun?.id === run.id ? 'ghost' : 'neutral'}
											onclick={() => {
												selectRun(run.id);
											}}
										>
											{selectedRun?.id === run.id
												? `Viewing Turn ${conversationRunNumber(run.id)}`
												: `Inspect Turn ${conversationRunNumber(run.id)}`}
										</AppButton>
										<AppButton
											size="sm"
											type="button"
											variant="ghost"
											onclick={() => {
												toggleConversationRunExpanded(run.id);
												selectRun(run.id);
											}}
										>
											{isConversationRunExpanded(run.id)
												? 'Collapse full text'
												: 'Expand full text'}
										</AppButton>
									</div>
								</article>
							{/each}
						{/if}
					</DetailSection>
				</div>

				<div
					class="order-1 space-y-6 xl:sticky xl:top-6 xl:order-2 xl:max-h-[calc(100vh-3rem)] xl:self-start xl:overflow-y-auto xl:pr-1"
				>
					<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
						<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div class="min-w-0">
								<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
									Sidebar views
								</p>
								<p class="ui-wrap-anywhere mt-2 text-sm text-slate-400">
									Switch between action surfaces, thread controls, and attached files instead of
									scanning one long rail.
								</p>
							</div>
							<PageTabs
								ariaLabel="Thread sidebar views"
								bind:value={selectedSidebarView}
								items={[
									{ id: 'follow_up', label: 'Follow-up' },
									{ id: 'details', label: 'Thread details' },
									{
										id: 'attachments',
										label: 'Attachments',
										badge: threadAttachments.length
									}
								]}
								panelIdPrefix="session-sidebar"
							/>
						</div>
					</div>

					<div
						id={`session-sidebar-panel-${selectedSidebarView}`}
						role="tabpanel"
						aria-labelledby={`session-sidebar-tab-${selectedSidebarView}`}
						class="space-y-6"
					>
						{#if selectedSidebarView === 'follow_up'}
							<DetailSection
								eyebrow="Action"
								title="Send follow-up"
								description="Reply in the same thread once you have enough context. Attached files are saved onto the thread and included for the next run."
								bodyClass="space-y-3"
							>
								<div id="reply" bind:this={followUpComposerRoot} class="space-y-3">
									<div class="rounded-xl border border-slate-800 bg-black/20 p-4">
										<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
											<div>
												<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">
													Reply context
												</p>
												<p class="mt-2 text-sm text-slate-400">
													Review the current task, latest instruction, and saved response without
													leaving the composer.
												</p>
											</div>
											{#if latestContextRun}
												<span
													class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(latestRunStatus(latestContextRun))}`}
												>
													{latestRunStatus(latestContextRun)}
												</span>
											{/if}
										</div>

										{#if focusTask}
											{@render focusTaskCard(focusTask, {
												label: 'Working on',
												description:
													'Keep this task visible while you review the last turn and draft the next instruction.',
												compact: true
											})}
										{/if}

										{#if latestContextRun}
											<div class="space-y-3">
												<div class="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
													<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
														Latest instruction
													</p>
													<p
														class="ui-wrap-anywhere ui-clamp-3 mt-2 text-sm whitespace-pre-wrap text-slate-300"
													>
														{latestContextRun.prompt}
													</p>
												</div>

												<div class="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
													<div class="flex flex-wrap items-center justify-between gap-2">
														<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
															Most recent response
														</p>
														<p class="text-xs text-slate-500">
															{formatTimestamp(latestContextRun.createdAt)}
														</p>
													</div>
													<div class="mt-2 max-h-52 overflow-auto pr-1">
														{#if shouldShowActiveResponsePlaceholder(latestContextRun)}
															<p class="ui-wrap-anywhere text-sm text-slate-400">
																The current run is still working. The saved response appears here as
																soon as it is written.
															</p>
														{:else}
															<ThreadMessageContent
																text={responseText(latestContextRun)}
																tone="muted"
															/>
														{/if}
													</div>
												</div>
											</div>
										{:else}
											<p
												class="ui-wrap-anywhere rounded-lg border border-dashed border-slate-800 px-4 py-4 text-sm text-slate-400"
											>
												No saved response is available yet. The composer stays ready here once the
												thread has something to review.
											</p>
										{/if}
									</div>

									<form
										id="thread-follow-up-form"
										class="space-y-3"
										onsubmit={submitFollowUp}
										onpaste={handleFollowUpAttachmentPaste}
									>
										<textarea
											bind:this={followUpPromptField}
											bind:value={followUpPrompt}
											class="min-h-40 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
											name="prompt"
											placeholder={session.canResume
												? 'Send the next instruction.'
												: session.hasActiveRun
													? 'This thread is busy until the current run finishes.'
													: 'This thread cannot resume until a Codex thread id is discovered.'}
											disabled={!session.canResume || sendState?.status === 'sending'}
										></textarea>
										<div class="space-y-3 rounded-lg border border-slate-800 bg-black/20 p-4">
											<div class="flex flex-col gap-1">
												<p class="text-sm font-medium text-white">Follow-up attachments</p>
												<p class="ui-wrap-anywhere text-sm text-slate-400">
													Choose files or paste screenshots and copied files anywhere in this form.
												</p>
											</div>
											<label class="block">
												<span class="sr-only">Attach follow-up files</span>
												<input
													bind:this={followUpAttachmentInput}
													class="file-input w-full border border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50"
													name="attachments"
													type="file"
													multiple
													disabled={!session.canResume || sendState?.status === 'sending'}
													onchange={syncPendingFollowUpAttachments}
												/>
											</label>
											{#if pendingFollowUpAttachments.length > 0}
												<div class="space-y-3">
													<div class="flex flex-wrap items-center justify-between gap-3">
														<p class="ui-wrap-anywhere text-sm text-slate-200">
															{pendingFollowUpAttachments.length === 1
																? '1 attachment ready to send'
																: `${pendingFollowUpAttachments.length} attachments ready to send`}
														</p>
														<AppButton
															size="sm"
															type="button"
															variant="ghost"
															disabled={sendState?.status === 'sending'}
															onclick={clearPendingFollowUpAttachments}
														>
															Clear
														</AppButton>
													</div>
													<div class="space-y-2">
														{#each pendingFollowUpAttachments as attachment (attachment.id)}
															<div
																class="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-3"
															>
																<p class="ui-wrap-anywhere text-sm font-medium text-white">
																	{attachment.name}
																</p>
																<p class="mt-1 text-xs text-slate-400">
																	{formatAttachmentSize(attachment.sizeBytes)} · {attachment.contentType}
																</p>
															</div>
														{/each}
													</div>
												</div>
											{/if}
										</div>
										{#if sendState}
											<p
												class={[
													'ui-wrap-anywhere text-sm',
													sendState.status === 'error'
														? 'text-rose-300'
														: sendState.status === 'success'
															? 'text-emerald-300'
															: 'text-sky-300'
												]}
											>
												{sendState.message}
											</p>
										{/if}
									</form>
								</div>

								<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
									<AppButton
										class="w-full justify-center sm:w-[15.5rem]"
										form="thread-follow-up-form"
										type="submit"
										variant="primary"
										disabled={!session.canResume || sendState?.status === 'sending'}
									>
										{sendState?.status === 'sending' ? 'Queueing...' : 'Send follow-up instruction'}
									</AppButton>
									<form method="GET" action={resolve('/app/tasks')}>
										<input type="hidden" name="create" value="1" />
										{#if taskResponseAction?.taskProjectId || focusTask?.projectId}
											<input
												type="hidden"
												name="projectId"
												value={taskResponseAction?.taskProjectId ?? focusTask?.projectId ?? ''}
											/>
										{/if}
										<input
											type="hidden"
											name="name"
											value={createTaskFromThreadName(followUpPrompt)}
										/>
										<input
											type="hidden"
											name="instructions"
											value={createTaskFromThreadInstructions(followUpPrompt)}
										/>
										{#if taskResponseAction}
											<input type="hidden" name="goalId" value={taskResponseAction.taskGoalId} />
											<input type="hidden" name="area" value={taskResponseAction.taskArea} />
											<input
												type="hidden"
												name="priority"
												value={taskResponseAction.taskPriority}
											/>
											<input
												type="hidden"
												name="riskLevel"
												value={taskResponseAction.taskRiskLevel}
											/>
											<input
												type="hidden"
												name="approvalMode"
												value={taskResponseAction.taskApprovalMode}
											/>
											<input
												type="hidden"
												name="requiresReview"
												value={taskResponseAction.taskRequiresReview ? 'true' : 'false'}
											/>
											<input
												type="hidden"
												name="desiredRoleId"
												value={taskResponseAction.taskDesiredRoleId}
											/>
											{#if taskResponseAction.taskAssigneeWorkerId}
												<input
													type="hidden"
													name="assigneeWorkerId"
													value={taskResponseAction.taskAssigneeWorkerId}
												/>
											{/if}
											{#if taskResponseAction.taskTargetDate}
												<input
													type="hidden"
													name="targetDate"
													value={taskResponseAction.taskTargetDate}
												/>
											{/if}
											{#if taskResponseAction.taskRequiredCapabilityNames.length > 0}
												<input
													type="hidden"
													name="requiredCapabilityNames"
													value={taskResponseAction.taskRequiredCapabilityNames.join(', ')}
												/>
											{/if}
											{#if taskResponseAction.taskRequiredToolNames.length > 0}
												<input
													type="hidden"
													name="requiredToolNames"
													value={taskResponseAction.taskRequiredToolNames.join(', ')}
												/>
											{/if}
										{/if}
										<AppButton class="w-full sm:w-auto" type="submit" variant="accent">
											Create new task
										</AppButton>
									</form>
								</div>
							</DetailSection>

							<DetailSection
								eyebrow="Coordination"
								title="Contact another thread"
								description="Use this when this thread needs instructions, context, or an assignment from another thread. The selected thread receives a structured request with this thread’s name, linked task context, summary, and latest saved response."
								bodyClass="space-y-4"
							>
								{#if threadContactTargets.length === 0}
									<p
										class="ui-wrap-anywhere rounded-lg border border-dashed border-slate-800 px-4 py-5 text-sm text-slate-400"
									>
										No other threads are available yet. Start or import another thread before using
										cross-thread contact.
									</p>
								{:else}
									<form class="space-y-3" onsubmit={submitThreadContact}>
										<label class="block">
											<span class="mb-2 block text-sm font-medium text-slate-200">
												Find a thread
											</span>
											<input
												bind:value={contactTargetQuery}
												class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
												type="text"
												placeholder="Search by handle, role, project, task, or summary."
												spellcheck="false"
												autocomplete="off"
												disabled={contactState?.status === 'sending'}
											/>
											<p class="mt-2 text-xs text-slate-500">
												{visibleContactTargets.length} matching thread{visibleContactTargets.length ===
												1
													? ''
													: 's'}
											</p>
										</label>

										<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_auto]">
											<label class="block">
												<span class="mb-2 block text-xs tracking-[0.16em] text-slate-500 uppercase">
													Project
												</span>
												<select bind:value={contactProjectFilter} class="select text-white">
													<option value="all">All projects</option>
													{#each contactProjectOptions as option (option)}
														<option value={option}>{option}</option>
													{/each}
												</select>
											</label>

											<label class="block">
												<span class="mb-2 block text-xs tracking-[0.16em] text-slate-500 uppercase">
													Role
												</span>
												<select bind:value={contactRoleFilter} class="select text-white">
													<option value="all">All roles</option>
													{#each contactRoleOptions as option (option)}
														<option value={option}>{option}</option>
													{/each}
												</select>
											</label>

											<label class="block">
												<span class="mb-2 block text-xs tracking-[0.16em] text-slate-500 uppercase">
													Availability
												</span>
												<select bind:value={contactAvailabilityFilter} class="select text-white">
													<option value="available">Available only</option>
													<option value="all">All threads</option>
												</select>
											</label>

											<div class="flex items-end">
												<AppButton
													class="w-full"
													type="button"
													variant="ghost"
													onclick={() => {
														contactProjectFilter = 'all';
														contactRoleFilter = 'all';
														contactAvailabilityFilter = 'available';
													}}
												>
													Reset filters
												</AppButton>
											</div>
										</div>

										{#if bestVisibleContactTarget}
											<div class="rounded-lg border border-sky-900/40 bg-sky-950/20 p-4">
												<div class="flex flex-wrap items-start justify-between gap-3">
													<div class="min-w-0">
														<p class="text-xs tracking-[0.16em] text-sky-300 uppercase">
															Best match
														</p>
														<p class="ui-wrap-anywhere mt-2 text-sm font-medium text-white">
															{bestVisibleContactTarget.contactLabel}
														</p>
														<p class="ui-wrap-anywhere mt-1 text-xs text-slate-400">
															{bestVisibleContactTarget.handle}
														</p>
														<p class="ui-wrap-anywhere mt-2 text-xs text-sky-100/90">
															{bestVisibleContactTarget.routingReason ||
																bestVisibleContactTarget.threadSummary}
														</p>
													</div>
													<div class="flex flex-wrap gap-2">
														<AppButton
															type="button"
															variant="neutral"
															disabled={bestVisibleContactTarget.id === contactTargetThreadId}
															onclick={() => {
																contactTargetThreadId = bestVisibleContactTarget.id;
															}}
														>
															{bestVisibleContactTarget.id === contactTargetThreadId
																? 'Using best match'
																: 'Use best match'}
														</AppButton>
														<AppButton
															type="button"
															variant="accent"
															disabled={!bestVisibleContactTarget.canContact ||
																!contactPrompt.trim() ||
																contactState?.status === 'sending'}
															onclick={() => queueThreadContact(bestVisibleContactTarget)}
														>
															Contact best match
														</AppButton>
													</div>
												</div>
											</div>
										{/if}

										{#if suggestedContactTargets.length > 1}
											<div class="space-y-2">
												<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">
													Top matches
												</p>
												<div class="flex flex-wrap gap-2">
													{#each suggestedContactTargets as target (target.id)}
														<button
															class={[
																'rounded-full border px-3 py-2 text-left text-xs transition',
																target.id === contactTargetThreadId
																	? 'border-sky-500/60 bg-sky-950/40 text-sky-100'
																	: 'border-slate-700 bg-slate-950/50 text-slate-300 hover:border-sky-600/50 hover:text-sky-100'
															]}
															type="button"
															onclick={() => {
																contactTargetThreadId = target.id;
															}}
														>
															<span class="block font-medium">{target.contactLabel}</span>
															<span class="mt-1 block text-[11px] text-slate-400">
																{target.routingReason || target.handle}
															</span>
														</button>
													{/each}
												</div>
											</div>
										{/if}

										{#if visibleContactTargets.length === 0}
											<p
												class="ui-wrap-anywhere rounded-lg border border-dashed border-slate-800 px-4 py-4 text-sm text-slate-400"
											>
												No threads match that search yet. Try a broader role, project, task, or
												handle hint.
											</p>
										{:else}
											<div class="space-y-3">
												<div class="flex flex-wrap items-center justify-between gap-3">
													<div>
														<p class="text-sm font-medium text-white">Browse matching threads</p>
														<p class="text-xs text-slate-500">
															Showing {browsableContactTargets.length} of {visibleContactTargets.length}
															match{visibleContactTargets.length === 1 ? '' : 'es'}
														</p>
													</div>
													<div class="flex flex-wrap gap-2">
														<button
															class={[
																'rounded-full border px-3 py-2 text-xs transition',
																contactTargetBrowseMode === 'top'
																	? 'border-sky-500/60 bg-sky-950/40 text-sky-100'
																	: 'border-slate-700 bg-slate-950/50 text-slate-300 hover:border-sky-600/50 hover:text-sky-100'
															]}
															type="button"
															onclick={() => {
																contactTargetBrowseMode = 'top';
															}}
														>
															Top 12
														</button>
														<button
															class={[
																'rounded-full border px-3 py-2 text-xs transition',
																contactTargetBrowseMode === 'all'
																	? 'border-sky-500/60 bg-sky-950/40 text-sky-100'
																	: 'border-slate-700 bg-slate-950/50 text-slate-300 hover:border-sky-600/50 hover:text-sky-100'
															]}
															type="button"
															onclick={() => {
																contactTargetBrowseMode = 'all';
															}}
														>
															Show all
														</button>
													</div>
												</div>

												<div class="max-h-96 space-y-2 overflow-y-auto pr-1">
													{#each browsableContactTargets as target (target.id)}
														<button
															class={[
																'w-full rounded-xl border p-4 text-left transition',
																target.id === contactTargetThreadId
																	? 'border-sky-500/60 bg-sky-950/25'
																	: 'border-slate-800 bg-black/20 hover:border-sky-700/50 hover:bg-slate-950/40'
															]}
															type="button"
															onclick={() => {
																contactTargetThreadId = target.id;
															}}
														>
															<div class="flex flex-wrap items-start justify-between gap-3">
																<div class="min-w-0">
																	<p class="ui-wrap-anywhere text-sm font-medium text-white">
																		{target.contactLabel}
																	</p>
																	<p class="ui-wrap-anywhere mt-1 text-xs text-slate-400">
																		{target.handle}
																	</p>
																	<div class="mt-2 flex flex-wrap items-center gap-2">
																		{#if target.projectLabel}
																			<span
																				class="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 uppercase"
																			>
																				{target.projectLabel}
																			</span>
																		{/if}
																		{#if target.roleLabel}
																			<span
																				class="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 uppercase"
																			>
																				{target.roleLabel}
																			</span>
																		{/if}
																	</div>
																	{#if target.primaryTaskTitle}
																		<p class="ui-wrap-anywhere mt-2 text-sm text-slate-200">
																			{target.primaryTaskTitle}
																		</p>
																	{/if}
																</div>
																<div class="flex flex-wrap items-center gap-2">
																	<span
																		class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${sessionStatusClass(target.threadState)}`}
																	>
																		{formatThreadStateLabel(target.threadState)}
																	</span>
																	<span
																		class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(target.latestRunStatus)}`}
																	>
																		{target.latestRunStatus}
																	</span>
																</div>
															</div>
															<div
																class="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500"
															>
																<span>Last active {target.lastActivityLabel}</span>
																{#if target.relatedTaskCount > 0}
																	<span>
																		{target.relatedTaskCount} linked task{target.relatedTaskCount ===
																		1
																			? ''
																			: 's'}
																	</span>
																{/if}
																{#if target.canContact}
																	<span class="text-emerald-300">Available</span>
																{:else}
																	<span class="text-amber-200">
																		{target.disabledReason || 'Unavailable'}
																	</span>
																{/if}
															</div>
															<p class="ui-wrap-anywhere mt-3 text-sm text-slate-300">
																{target.threadSummary}
															</p>
															{#if target.routingReason}
																<p class="ui-wrap-anywhere mt-2 text-xs text-sky-200/90">
																	Why this stands out: {target.routingReason}
																</p>
															{/if}
														</button>
													{/each}
												</div>
											</div>
										{/if}

										{#if selectedContactTarget}
											<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
												<p
													class="ui-wrap-anywhere text-xs tracking-[0.2em] text-slate-500 uppercase"
												>
													{selectedContactTarget.handle}
												</p>
												<p class="ui-wrap-anywhere mt-2 text-sm text-slate-200">
													{selectedContactTarget.contactLabel}
												</p>
												<div class="flex flex-wrap items-center gap-2">
													<span
														class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${sessionStatusClass(selectedContactTarget.threadState)}`}
													>
														{formatThreadStateLabel(selectedContactTarget.threadState)}
													</span>
													<span
														class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${runStatusClass(selectedContactTarget.latestRunStatus)}`}
													>
														latest run {selectedContactTarget.latestRunStatus}
													</span>
												</div>
												<p class="ui-wrap-anywhere mt-3 text-sm text-slate-300">
													{selectedContactTarget.threadSummary}
												</p>
												{#if selectedContactTarget.routingReason}
													<p class="ui-wrap-anywhere mt-3 text-xs text-sky-200/90">
														Routing hint: {selectedContactTarget.routingReason}
													</p>
												{/if}
												{#if selectedContactTarget.relatedTaskTitles.length > 0}
													<p class="ui-wrap-anywhere mt-3 text-xs text-slate-500">
														Linked tasks: {selectedContactTarget.relatedTaskTitles.join(', ')}
													</p>
												{/if}
												{#if selectedContactTarget.disabledReason}
													<p class="ui-wrap-anywhere mt-3 text-sm text-amber-200/90">
														{selectedContactTarget.disabledReason}
													</p>
												{/if}
											</div>
										{/if}

										<div class="grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
											<label class="block">
												<span class="mb-2 block text-sm font-medium text-slate-200">
													Contact type
												</span>
												<select
													bind:value={contactType}
													class="select text-white"
													disabled={!selectedContactTarget?.canContact ||
														contactState?.status === 'sending'}
												>
													{#each AGENT_THREAD_CONTACT_TYPE_OPTIONS as option (option)}
														<option value={option}>
															{formatAgentThreadContactTypeLabel(option)}
														</option>
													{/each}
												</select>
											</label>

											<label class="block">
												<span class="mb-2 block text-sm font-medium text-slate-200">
													Focused context note
												</span>
												<textarea
													bind:value={contactContextSummary}
													class="min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
													placeholder="Optional: narrow the ask to the exact file, decision, blocker, or artifact that matters."
													disabled={!selectedContactTarget?.canContact ||
														contactState?.status === 'sending'}
												></textarea>
											</label>
										</div>

										{#if availableContactContextItems.length > 0}
											<div class="space-y-3 rounded-lg border border-slate-800 bg-black/20 p-4">
												<div class="flex flex-wrap items-center justify-between gap-2">
													<p class="text-sm font-medium text-white">Shared context bundle</p>
													<p class="text-xs text-slate-500">
														{selectedContactContextItemIds.length} selected
													</p>
												</div>
												<div class="space-y-2">
													{#each availableContactContextItems as item (item.id)}
														<label
															class="flex gap-3 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-3"
														>
															<input
																bind:group={selectedContactContextItemIds}
																class="mt-1"
																type="checkbox"
																value={item.id}
																disabled={!selectedContactTarget?.canContact ||
																	contactState?.status === 'sending'}
															/>
															<div class="min-w-0">
																<div class="flex flex-wrap items-center gap-2">
																	<p class="ui-wrap-anywhere text-sm text-slate-100">
																		{item.label}
																	</p>
																	<span
																		class="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-400 uppercase"
																	>
																		{item.kind.replace(/_/g, ' ')}
																	</span>
																</div>
																<p class="ui-wrap-anywhere mt-1 text-xs text-slate-400">
																	{item.detail}
																</p>
																{#if item.path}
																	<p class="ui-wrap-anywhere mt-1 text-xs text-slate-500">
																		{item.path}
																	</p>
																{/if}
															</div>
														</label>
													{/each}
												</div>
											</div>
										{/if}

										<textarea
											bind:value={contactPrompt}
											class="min-h-32 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
											placeholder="Ask another thread for the instruction, context, or assignment this thread needs."
											disabled={!selectedContactTarget?.canContact ||
												contactState?.status === 'sending'}
										></textarea>

										{#if contactState}
											<p
												class={[
													'ui-wrap-anywhere text-sm',
													contactState.status === 'error'
														? 'text-rose-300'
														: contactState.status === 'success'
															? 'text-emerald-300'
															: 'text-sky-300'
												]}
											>
												{contactState.message}
											</p>
										{/if}

										<AppButton
											class="w-full justify-center sm:w-[15.5rem]"
											type="submit"
											variant="accent"
											disabled={!selectedContactTarget?.canContact ||
												!contactPrompt.trim() ||
												contactState?.status === 'sending'}
										>
											{contactState?.status === 'sending'
												? 'Queueing...'
												: 'Contact selected thread'}
										</AppButton>
									</form>

									{#snippet contactCard(contact: AgentThreadContact)}
										<div class="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3">
											<div class="flex flex-wrap items-start justify-between gap-3">
												<div class="min-w-0">
													<p class="text-xs text-slate-500">
														{contactDirectionLabel(contact)} · {timestampFormatter.format(
															new Date(contact.createdAt)
														)}
													</p>
													<div class="mt-2 flex flex-wrap items-center gap-2">
														<span
															class="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none text-slate-200 uppercase"
														>
															{formatAgentThreadContactTypeLabel(contact.contactType)}
														</span>
														<span
															class={`inline-flex items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none uppercase ${contactStatusClass(contact.status)}`}
														>
															{formatAgentThreadContactStatusLabel(contact.status)}
														</span>
													</div>
												</div>
											</div>
											{#if contact.contextSummary}
												<p class="ui-wrap-anywhere mt-3 text-xs text-sky-200/90">
													Context: {contact.contextSummary}
												</p>
											{/if}
											{#if contact.contextItems.length > 0}
												<div class="mt-3 space-y-2">
													<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
														Shared context
													</p>
													{#each contact.contextItems as item (item.id)}
														<div
															class="rounded-lg border border-slate-800/70 bg-black/20 px-3 py-2"
														>
															<p class="ui-wrap-anywhere text-xs text-slate-200">
																{item.label}
															</p>
															<p class="ui-wrap-anywhere mt-1 text-xs text-slate-500">
																{item.detail}
															</p>
															{#if item.path}
																<p class="ui-wrap-anywhere mt-1 text-xs text-slate-500">
																	{item.path}
																</p>
															{/if}
														</div>
													{/each}
												</div>
											{/if}
											<p class="ui-wrap-anywhere mt-2 text-sm text-slate-200">
												{contact.prompt}
											</p>
											<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">
												Contact {contact.id}
												{#if contact.replyToContactId}
													· Reply to {contact.replyToContactId}
												{/if}
												{#if contact.resolvedByContactId}
													· Answered by {contact.resolvedByContactId}
												{/if}
												{#if contact.replyRequested}
													· Reply requested
												{/if}
											</p>
										</div>
									{/snippet}

									{#if orderedThreadContacts.length > 0}
										<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
											<div class="flex flex-wrap items-center justify-between gap-3">
												<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">
													Contact inbox and outbox
												</p>
												<div class="flex flex-wrap gap-2 text-[11px] uppercase">
													<span
														class="rounded-full border border-amber-800/60 bg-amber-950/30 px-2 py-1 text-amber-200"
													>
														Awaiting reply {awaitingReplyContacts.length}
													</span>
													<span
														class="rounded-full border border-slate-700 px-2 py-1 text-slate-300"
													>
														Received {receivedThreadContacts.length}
													</span>
													<span
														class="rounded-full border border-slate-700 px-2 py-1 text-slate-300"
													>
														Sent {sentThreadContacts.length}
													</span>
												</div>
											</div>

											<div class="mt-4 space-y-4">
												{#if awaitingReplyContacts.length > 0}
													<div class="space-y-3">
														<p class="text-xs tracking-[0.16em] text-amber-200 uppercase">
															Awaiting reply
														</p>
														{#each awaitingReplyContacts as contact (contact.id)}
															{@render contactCard(contact)}
														{/each}
													</div>
												{/if}

												{#if receivedThreadContacts.length > 0}
													<div class="space-y-3">
														<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Inbox</p>
														{#each receivedThreadContacts as contact (contact.id)}
															{@render contactCard(contact)}
														{/each}
													</div>
												{/if}

												{#if resolvedSentThreadContacts.length > 0}
													<div class="space-y-3">
														<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">Outbox</p>
														{#each resolvedSentThreadContacts as contact (contact.id)}
															{@render contactCard(contact)}
														{/each}
													</div>
												{/if}
											</div>
										</div>
									{/if}
								{/if}
							</DetailSection>

							{#if taskResponseAction}
								<DetailSection
									eyebrow="Decision"
									title="Approve task response"
									description={taskResponseAction.helperText}
									bodyClass="space-y-4"
								>
									<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
										<div class="flex flex-wrap items-center justify-between gap-3">
											<div class="min-w-0">
												<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">
													Linked task
												</p>
												<p class="ui-wrap-anywhere mt-2 text-sm font-medium text-white">
													{taskResponseAction.taskTitle}
												</p>
											</div>
											<span
												class="inline-flex max-w-full items-center justify-center rounded-full border border-slate-700 px-2 py-1 text-center text-[11px] leading-none whitespace-normal text-slate-300 uppercase"
											>
												{formatTaskStatusLabel(taskResponseAction.taskStatus)}
											</span>
										</div>

										<div class="mt-3 flex flex-wrap gap-2">
											{#if taskResponseAction.openReview}
												<span
													class={`inline-flex max-w-full items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none whitespace-normal uppercase ${reviewStatusToneClass(taskResponseAction.openReview.status)}`}
												>
													Review {formatReviewStatusLabel(taskResponseAction.openReview.status)}
												</span>
											{/if}
											{#if taskResponseAction.pendingApproval}
												<span
													class={`inline-flex max-w-full items-center justify-center rounded-full px-2 py-1 text-center text-[11px] leading-none whitespace-normal uppercase ${approvalStatusToneClass(taskResponseAction.pendingApproval.status)}`}
												>
													{formatTaskApprovalModeLabel(taskResponseAction.pendingApproval.mode)}
													{formatApprovalStatusLabel(taskResponseAction.pendingApproval.status)}
												</span>
											{/if}
										</div>

										<p class="ui-wrap-anywhere mt-3 text-sm text-slate-400">
											Review the newest response on the left, then approve it here to close the task
											without leaving this thread.
										</p>
									</div>

									{#if approveTaskResponseSuccess}
										<p
											class="rounded-xl border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
										>
											Task response approved and task marked complete.
										</p>
									{:else if form?.message}
										<p
											class="ui-wrap-anywhere rounded-xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
										>
											{form.message}
										</p>
									{/if}

									<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<AppButton
											href={resolve(`/app/tasks/${taskResponseAction.taskId}`)}
											size="sm"
											variant="accent"
										>
											Open task detail
										</AppButton>
										<form method="POST" action="?/approveTaskResponse">
											<AppButton
												class="w-full sm:w-auto"
												type="submit"
												variant="success"
												disabled={!taskResponseAction.canApproveAndComplete}
												title={taskResponseAction.disabledReason}
											>
												Approve response and complete task
											</AppButton>
										</form>
									</div>

									{#if taskResponseAction.disabledReason}
										<p class="ui-wrap-anywhere text-sm text-slate-400">
											{taskResponseAction.disabledReason}
										</p>
									{/if}
								</DetailSection>
							{/if}
						{:else if selectedSidebarView === 'details'}
							<DetailSection
								eyebrow="Thread status"
								title="Current thread state"
								description="Operational details and quick status facts for this thread."
								bodyClass="space-y-4"
							>
								{@render sessionStatus(session, false)}

								<div class="grid gap-3 sm:grid-cols-2">
									<DetailFactCard label="Started" value={formatTimestamp(session.createdAt)} />
									<DetailFactCard
										label="Last activity"
										value={formatActivityAge(session.lastActivityAt, now)}
										detail={formatTimestamp(session.lastActivityAt)}
									/>
									<DetailFactCard
										label="Thread"
										value={threadLabel(session)}
										detail={session.threadId || ''}
										detailClass="ui-wrap-anywhere mt-1 max-w-full text-xs text-slate-500"
									/>
									<DetailFactCard label="Runs" value={session.runCount} />
									<DetailFactCard label="Resume" value={resumeLabel(session)} />
									<DetailFactCard label="Sandbox" value={session.sandbox} />
								</div>
							</DetailSection>

							{#if needsRecovery}
								<DetailSection
									eyebrow="Recovery"
									title="Recover or move work"
									description="Use this when a thread is stalled, failed, canceled, or otherwise needs attention."
									bodyClass="space-y-4"
								>
									<div class="rounded-lg border border-amber-800/50 bg-amber-950/20 p-4">
										<p class="ui-wrap-anywhere text-sm font-medium text-amber-100">
											{recoveryHeadline(session)}
										</p>
										<p class="ui-wrap-anywhere mt-2 text-sm text-amber-200/85">
											{recoveryDetail(session)}
										</p>
									</div>

									<div class="grid gap-3 lg:grid-cols-2">
										<form method="POST" action="?/recoverThread">
											<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
												<p class="text-sm font-medium text-white">Retry in this thread</p>
												<p class="ui-wrap-anywhere mt-2 text-sm text-slate-400">
													Recover the current thread, then replay the latest saved request without
													losing the existing conversation context.
												</p>
												<AppButton
													class="mt-4 w-full"
													type="submit"
													variant="warning"
													disabled={!canRecoverInPlace}
													title={recoverInPlaceDisabledReason(session)}
												>
													Recover in this thread
												</AppButton>
											</div>
										</form>

										<form method="POST" action="?/moveLatestRequestToNewThread">
											<div class="rounded-lg border border-slate-800 bg-black/20 p-4">
												<p class="text-sm font-medium text-white">Move latest request</p>
												<p class="ui-wrap-anywhere mt-2 text-sm text-slate-400">
													Start a fresh thread from the latest saved request and carry linked task
													work over to that new thread.
												</p>
												<AppButton
													class="mt-4 w-full"
													type="submit"
													variant="accent"
													disabled={!canMoveLatestRequestToNewThread}
													title={moveLatestRequestDisabledReason(session)}
												>
													Move latest request to new thread
												</AppButton>
											</div>
										</form>
									</div>

									{#if !canRecoverInPlace}
										<p class="ui-wrap-anywhere text-sm text-slate-400">
											{recoverInPlaceDisabledReason(session)}
										</p>
									{/if}
								</DetailSection>
							{/if}

							<form method="POST" action="?/updateThreadHandleAlias">
								<DetailSection
									eyebrow="Identity"
									title="Stable handle alias"
									description="Optional durable contact handle. Use this when you want an explicit routing name like coordination.main or frontend.owner instead of the derived handle."
								>
									<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
										<label class="block min-w-[18rem] flex-1">
											<span class="mb-2 block text-sm font-medium text-slate-200">
												Handle alias
											</span>
											<input
												class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
												type="text"
												name="handleAlias"
												value={session.handleAlias ?? ''}
												placeholder="coordination.main"
												spellcheck="false"
												autocomplete="off"
											/>
											<p class="mt-2 text-xs text-slate-500">
												Letters, numbers, dots, and hyphens only. Leave blank to restore the derived
												handle.
											</p>
										</label>
										<AppButton type="submit" variant="primary">Save handle alias</AppButton>
									</div>
								</DetailSection>
							</form>

							<form method="POST" action="?/updateThreadSandbox">
								<DetailSection
									eyebrow="Thread access"
									title="Sandbox for future follow-up runs"
									description="Lower-priority thread setting: change what this thread can access the next time you resume it. The current run keeps its existing sandbox."
								>
									<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
										<div class="flex flex-col gap-3 sm:flex-row sm:items-end">
											<label class="block min-w-[14rem]">
												<span class="mb-2 block text-sm font-medium text-slate-200">
													Sandbox mode
												</span>
												<select class="select text-white" name="sandbox">
													{#each sandboxOptions as sandbox (sandbox)}
														<option value={sandbox} selected={session.sandbox === sandbox}
															>{sandbox}</option
														>
													{/each}
												</select>
											</label>
											<AppButton type="submit" variant="primary">Update sandbox</AppButton>
										</div>
									</div>
								</DetailSection>
							</form>
						{:else}
							<DetailSection
								eyebrow="Attachments"
								title="Thread attachments"
								description="Files attached during follow-up stay on this thread for later reference."
								bodyClass="space-y-4"
							>
								{#if threadAttachments.length === 0}
									<p
										class="ui-wrap-anywhere rounded-lg border border-dashed border-slate-800 px-4 py-5 text-sm text-slate-500"
									>
										No files are attached to this thread yet. Add one in the follow-up form when the
										next run needs reference material.
									</p>
								{:else}
									<div class="space-y-3">
										{#each threadAttachments as attachment (attachment.id)}
											<article
												id={`thread-attachment-${attachment.id}`}
												class="scroll-mt-24 rounded-lg border border-slate-800 bg-black/20 p-4"
											>
												<div class="flex flex-wrap items-start justify-between gap-3">
													<div class="min-w-0">
														<p class="ui-wrap-anywhere text-sm font-medium text-white">
															{attachment.name}
														</p>
														<p class="mt-1 text-xs text-slate-400">
															{formatAttachmentSize(attachment.sizeBytes)} · {attachment.contentType}
														</p>
														<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">
															{attachment.path}
														</p>
														<p class="ui-wrap-anywhere mt-2 text-xs text-slate-500">
															Attached {formatTimestamp(attachment.attachedAt)}
														</p>
													</div>
													<a
														class="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium tracking-[0.14em] text-sky-300 uppercase transition hover:border-sky-400/40 hover:text-sky-200"
														href={resolve(
															`/api/agents/threads/${session.id}/attachments/${attachment.id}`
														)}
													>
														Download
													</a>
												</div>
											</article>
										{/each}
									</div>
								{/if}
							</DetailSection>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</AppPage>
{/if}
