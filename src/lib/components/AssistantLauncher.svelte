<script lang="ts">
	import { page } from '$app/state';
	import { BotIcon, CheckIcon, PencilIcon, SendIcon, SparklesIcon, XIcon } from '@lucide/svelte';
	import type {
		AssistantActionPlan,
		AssistantContextObject,
		AssistantExecuteResponse,
		AssistantPlanResponse
	} from '$lib/assistant/types';
	import { buildAssistantContext } from '$lib/client/assistant-context';
	import AppButton from '$lib/components/AppButton.svelte';

	let open = $state(false);
	let input = $state('');
	let loading = $state(false);
	let error = $state('');
	let clarification = $state('');
	let clarificationOptions = $state<string[]>([]);
	let plan = $state<AssistantActionPlan | null>(null);
	let editOpen = $state(false);
	let editPayload = $state('');
	let result = $state<AssistantExecuteResponse | null>(null);

	let context = $derived(buildAssistantContext({ url: page.url, data: page.data }));
	let planPayloadRows = $derived(
		plan
			? Object.entries(plan.payload)
					.filter(([, value]) => hasVisibleValue(value))
					.map(([key, value]) => ({
						key,
						label: fieldLabel(key),
						value: formatFieldValue(value)
					}))
			: []
	);
	let contextRows = $derived.by(() => {
		if (!plan) {
			return [];
		}

		const used = plan.contextUsed;
		const rows: { key: string; label: string; value: string }[] = [];

		if (used.route) {
			rows.push({ key: 'route', label: 'Route', value: used.route });
		}

		if (used.pageType) {
			rows.push({
				key: 'pageType',
				label: 'Page',
				value: used.pageType.replaceAll('_', ' ')
			});
		}

		if (used.currentObject) {
			rows.push({
				key: 'currentObject',
				label: 'Current object',
				value: objectLabel(used.currentObject)
			});
		}

		if (used.breadcrumbs && used.breadcrumbs.length > 0) {
			rows.push({
				key: 'breadcrumbs',
				label: 'Breadcrumbs',
				value: used.breadcrumbs.map(objectLabel).join(' / ')
			});
		}

		if (used.visibleCapabilities && used.visibleCapabilities.length > 0) {
			rows.push({
				key: 'visibleCapabilities',
				label: 'Screen actions',
				value: used.visibleCapabilities.map((action) => action.replace('_', ' ')).join(', ')
			});
		}

		return rows;
	});
	let contextLabel = $derived(
		context.currentObject
			? `${context.currentObject.type}: ${context.currentObject.name}`
			: context.pageType.replaceAll('_', ' ')
	);

	function hasVisibleValue(value: unknown) {
		if (Array.isArray(value)) {
			return value.length > 0;
		}

		return value !== null && value !== undefined && String(value).trim() !== '';
	}

	function fieldLabel(key: string) {
		const labels: Record<string, string> = {
			name: 'Name',
			title: 'Title',
			summary: 'Summary',
			description: 'Description',
			instructions: 'Instructions',
			systemPrompt: 'System prompt',
			projectId: 'Project',
			goalId: 'Goal',
			parentTaskId: 'Parent task',
			parentGoalId: 'Parent goal',
			roleId: 'Role',
			providerId: 'Provider',
			supportedRoleIds: 'Supported roles',
			note: 'Note',
			tags: 'Tags'
		};

		return (
			labels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
		);
	}

	function formatFieldValue(value: unknown) {
		if (Array.isArray(value)) {
			return value.join(', ');
		}

		if (value && typeof value === 'object') {
			return JSON.stringify(value);
		}

		return String(value);
	}

	function objectLabel(object: AssistantContextObject) {
		return `${object.type}: ${object.name}`;
	}

	function resetDraft() {
		error = '';
		clarification = '';
		clarificationOptions = [];
		plan = null;
		editOpen = false;
		editPayload = '';
		result = null;
	}

	function formatApiError(payload: { error?: string; errorCode?: string }) {
		const message = payload.error?.trim() || 'Request failed.';
		return payload.errorCode ? `${message} [${payload.errorCode}]` : message;
	}

	async function readJsonResponse<T>(response: Response): Promise<T> {
		const payload = (await response.json()) as T & { error?: string; errorCode?: string };

		if (!response.ok) {
			throw new Error(formatApiError(payload));
		}

		return payload;
	}

	async function submitRequest(inputOverride?: string) {
		const trimmedInput = (inputOverride ?? input).trim();

		if (!trimmedInput) {
			error = 'Enter an instruction first.';
			return;
		}

		resetDraft();
		loading = true;

		try {
			const response = await fetch('/api/assistant/plan', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					input: trimmedInput,
					context
				})
			});
			const payload = await readJsonResponse<AssistantPlanResponse>(response);

			if (payload.kind === 'plan') {
				plan = payload.plan;
				editPayload = JSON.stringify(payload.plan.payload, null, 2);
			} else {
				clarification = payload.question;
				clarificationOptions = payload.options ?? [];
			}
		} catch (caughtError) {
			error = caughtError instanceof Error ? caughtError.message : 'Could not interpret request.';
		} finally {
			loading = false;
		}
	}

	function chooseClarificationOption(option: string) {
		const normalized = option.trim();
		const currentInput = input.trim();
		const clarifiedInput = /^(task|goal|role|agent)$/i.test(normalized)
			? `Create a ${normalized.toLowerCase()} from this request: ${currentInput}`
			: currentInput
				? `${currentInput}\n\nClarification: ${normalized}`
				: normalized;

		input = clarifiedInput;
		void submitRequest(clarifiedInput);
	}

	function closeAssistant() {
		open = false;
	}

	function handleAssistantKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			closeAssistant();
		}
	}

	function applyPayloadEdits() {
		if (!plan) {
			return;
		}

		try {
			const parsed = JSON.parse(editPayload) as AssistantActionPlan['payload'];
			plan = { ...plan, payload: parsed };
			editOpen = false;
			error = '';
		} catch {
			error = 'The edited payload is not valid JSON.';
		}
	}

	async function confirmPlan() {
		if (!plan) {
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/assistant/execute', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ plan })
			});
			result = await readJsonResponse<AssistantExecuteResponse>(response);
			plan = null;
			editOpen = false;
			input = '';
		} catch (caughtError) {
			error = caughtError instanceof Error ? caughtError.message : 'Could not create record.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:window onkeydown={handleAssistantKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-sm">
		<div
			class="flex h-full w-full max-w-xl flex-col border-l border-slate-800 bg-slate-950 shadow-2xl shadow-black/40"
			aria-label="In-app assistant"
			aria-modal="true"
			role="dialog"
		>
			<header class="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
				<div class="min-w-0">
					<p class="text-[11px] font-semibold tracking-[0.22em] text-sky-300 uppercase">
						Assistant
					</p>
					<h2 class="mt-1 text-xl font-semibold text-white">Create from natural language</h2>
					<p class="mt-1 text-sm text-slate-400">
						Context: <span class="text-slate-200">{contextLabel}</span>
					</p>
				</div>
				<button
					class="ui-button ui-button-ghost ui-button-icon"
					type="button"
					aria-label="Close assistant"
					title="Close assistant"
					onclick={closeAssistant}
				>
					<XIcon class="size-4" />
				</button>
			</header>

			<div class="min-h-0 flex-1 overflow-y-auto px-5 py-5" aria-busy={loading}>
				<div class="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
					<div class="flex items-start gap-3">
						<SparklesIcon class="mt-0.5 size-4 shrink-0 text-sky-300" />
						<div class="min-w-0 text-sm text-slate-300">
							<p>
								I can create tasks, goals, roles, and agents. I use the current route and object
								context before showing a preview.
							</p>
						</div>
					</div>
				</div>

				<div class="mt-3 flex flex-wrap gap-2 text-xs">
					<span
						class="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-slate-300"
					>
						{context.pageType.replaceAll('_', ' ')}
					</span>
					{#if context.currentObject}
						<span
							class="ui-wrap-inline rounded-full border border-sky-900/70 bg-sky-950/30 px-3 py-1 text-sky-200"
						>
							{context.currentObject.type}: {context.currentObject.name}
						</span>
					{/if}
				</div>

				<form
					class="mt-4 space-y-3"
					onsubmit={(event) => {
						event.preventDefault();
						void submitRequest();
					}}
				>
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Instruction</span>
						<textarea
							class="textarea min-h-32 w-full text-white"
							placeholder="Create a task called Create Web Developer Role. Instructions are to create a web developer role that is an expert at web development."
							aria-describedby="assistant-instruction-help"
							bind:value={input}
						></textarea>
						<span id="assistant-instruction-help" class="mt-2 block text-xs text-slate-500">
							Pasted voice transcripts work here too. The assistant will show a draft before saving.
						</span>
					</label>
					<div class="flex flex-wrap justify-end gap-2">
						<AppButton type="submit" variant="primary" disabled={loading}>
							<SendIcon class="size-4" />
							<span>{loading ? 'Working' : 'Preview'}</span>
						</AppButton>
					</div>
				</form>

				{#if error}
					<p class="ui-notice mt-4 border border-rose-900/70 bg-rose-950/40 text-rose-200">
						{error}
					</p>
				{/if}

				{#if clarification}
					<section class="mt-4 rounded-lg border border-amber-900/70 bg-amber-950/25 p-4">
						<p class="text-sm font-semibold text-amber-100">Clarification needed</p>
						<p class="mt-2 text-sm text-amber-100/85">{clarification}</p>
						{#if clarificationOptions.length > 0}
							<div class="mt-3 flex flex-wrap gap-2">
								{#each clarificationOptions as option (option)}
									<AppButton
										type="button"
										variant="warning"
										size="sm"
										disabled={loading}
										onclick={() => {
											chooseClarificationOption(option);
										}}
									>
										<span>{option}</span>
									</AppButton>
								{/each}
							</div>
						{/if}
					</section>
				{/if}

				{#if plan}
					<section class="mt-4 rounded-lg border border-sky-900/70 bg-sky-950/20 p-4">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<p class="text-[11px] font-semibold tracking-[0.2em] text-sky-300 uppercase">
									Preview
								</p>
								<h3 class="mt-1 text-lg font-semibold text-white">{plan.summary}</h3>
								<p class="mt-1 text-sm text-slate-400">
									Action: {plan.action.replace('_', ' ')} · confidence {Math.round(
										plan.confidence * 100
									)}%
								</p>
							</div>
							<AppButton
								type="button"
								variant="ghost"
								size="sm"
								onclick={() => {
									editOpen = !editOpen;
								}}
							>
								<PencilIcon class="size-4" />
								<span>Edit</span>
							</AppButton>
						</div>

						<dl class="mt-4 divide-y divide-slate-800 text-sm">
							{#each planPayloadRows as row (row.key)}
								<div class="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
									<dt class="font-medium text-slate-400">{row.label}</dt>
									<dd class="ui-wrap-anywhere text-slate-100">
										{row.value}
									</dd>
								</div>
							{/each}
						</dl>

						{#if contextRows.length > 0}
							<div class="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
								<p class="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
									Context used
								</p>
								<dl class="mt-2 space-y-2 text-xs">
									{#each contextRows as row (row.key)}
										<div class="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)]">
											<dt class="text-slate-500">{row.label}</dt>
											<dd class="ui-wrap-anywhere text-slate-300">{row.value}</dd>
										</div>
									{/each}
								</dl>
							</div>
						{/if}

						{#if editOpen}
							<label class="mt-4 block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Payload JSON</span>
								<textarea
									class="textarea min-h-48 w-full font-mono text-sm text-white"
									bind:value={editPayload}
								></textarea>
							</label>
							<div class="mt-3 flex justify-end">
								<AppButton type="button" variant="neutral" size="sm" onclick={applyPayloadEdits}>
									Apply edits
								</AppButton>
							</div>
						{/if}

						<div class="mt-5 flex flex-wrap justify-end gap-2">
							<AppButton
								type="button"
								variant="ghost"
								onclick={() => {
									plan = null;
									editOpen = false;
								}}
							>
								<XIcon class="size-4" />
								<span>Cancel</span>
							</AppButton>
							<AppButton type="button" variant="success" disabled={loading} onclick={confirmPlan}>
								<CheckIcon class="size-4" />
								<span>Confirm create</span>
							</AppButton>
						</div>
					</section>
				{/if}

				{#if result}
					<section class="mt-4 rounded-lg border border-emerald-900/70 bg-emerald-950/25 p-4">
						<p class="text-sm font-semibold text-emerald-100">Created {result.objectType}</p>
						<a
							class="mt-2 inline-flex text-sm text-emerald-200 underline decoration-emerald-500/60 underline-offset-4 hover:text-emerald-100"
							href={result.record.href}
						>
							Open {result.record.name}
						</a>
					</section>
				{/if}
			</div>
		</div>
	</div>
{/if}

<button
	class="fixed right-4 bottom-4 z-40 inline-flex size-14 items-center justify-center rounded-full border border-sky-500/60 bg-sky-500 text-slate-950 shadow-xl shadow-sky-950/30 transition hover:bg-sky-400 focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:outline-none"
	type="button"
	aria-label="Open assistant"
	title="Open assistant"
	onclick={() => {
		open = true;
	}}
>
	<BotIcon class="size-6" />
</button>
