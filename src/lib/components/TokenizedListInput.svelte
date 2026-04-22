<script lang="ts">
	function normalizeToken(value: string) {
		return value.replace(/\s+/g, ' ').trim();
	}

	function appendUniqueTokens(current: string[], nextValues: string[]) {
		const next = [...current];

		for (const value of nextValues) {
			const normalized = normalizeToken(value);

			if (!normalized || next.includes(normalized)) {
				continue;
			}

			next.push(normalized);
		}

		return next;
	}

	function parseDraftTokens(value: string) {
		return value
			.split(',')
			.map((item) => normalizeToken(item))
			.filter(Boolean);
	}

	let {
		label,
		name,
		inputId,
		items = $bindable([]),
		placeholder = '',
		helperText = '',
		emptyText = 'No items added yet.',
		suggestions = []
	}: {
		label: string;
		name: string;
		inputId: string;
		items?: string[];
		placeholder?: string;
		helperText?: string;
		emptyText?: string;
		suggestions?: string[];
	} = $props();

	let draft = $state('');
	let normalizedSuggestions = $derived(
		[...new Set(suggestions.map((suggestion) => normalizeToken(suggestion)).filter(Boolean))].sort(
			(a, b) => a.localeCompare(b)
		)
	);
	let availableSuggestions = $derived(
		normalizedSuggestions.filter((suggestion) => !items.includes(suggestion)).slice(0, 12)
	);

	function commitDraft() {
		const nextTokens = parseDraftTokens(draft);

		if (nextTokens.length === 0) {
			draft = '';
			return;
		}

		items = appendUniqueTokens(items, nextTokens);
		draft = '';
	}

	function removeItem(item: string) {
		items = items.filter((value) => value !== item);
	}

	function addSuggestion(value: string) {
		items = appendUniqueTokens(items, [value]);
		draft = '';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			commitDraft();
			return;
		}

		if (event.key === 'Backspace' && draft.length === 0 && items.length > 0) {
			items = items.slice(0, -1);
		}
	}
</script>

<label class="block">
	<span class="mb-2 block text-sm font-medium text-slate-200">{label}</span>
	<input
		id={inputId}
		bind:value={draft}
		class="input text-white placeholder:text-slate-500"
		{placeholder}
		onblur={commitDraft}
		onkeydown={handleKeydown}
	/>
	<input {name} type="hidden" value={items.join(', ')} />

	{#if helperText}
		<p class="mt-2 text-xs text-slate-500">{helperText}</p>
	{/if}

	{#if items.length > 0}
		<div class="mt-3 flex flex-wrap gap-2">
			{#each items as item (item)}
				<button
					type="button"
					class="rounded-full border border-sky-800/60 bg-sky-950/40 px-3 py-1 text-xs text-sky-100 transition hover:border-sky-700"
					onclick={() => removeItem(item)}
				>
					{item} ×
				</button>
			{/each}
		</div>
	{:else}
		<p
			class="mt-3 rounded-2xl border border-dashed border-slate-800 px-3 py-3 text-sm text-slate-500"
		>
			{emptyText}
		</p>
	{/if}

	{#if availableSuggestions.length > 0}
		<div class="mt-3 flex flex-wrap gap-2">
			{#each availableSuggestions as suggestion (suggestion)}
				<button
					type="button"
					class="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-700 hover:text-white"
					onclick={() => addSuggestion(suggestion)}
				>
					{suggestion}
				</button>
			{/each}
		</div>
		<p class="mt-2 text-xs text-slate-500">Click a suggestion to add it.</p>
	{/if}
</label>
