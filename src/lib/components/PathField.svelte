<script lang="ts">
	type PathOption = {
		label: string;
		path: string;
	};

	type CreateMode = 'folder' | 'file' | 'either';

	let {
		label,
		name,
		inputId,
		placeholder = '',
		required = false,
		value = $bindable(''),
		options = [],
		createMode = 'folder',
		helperText = ''
	}: {
		label: string;
		name: string;
		inputId: string;
		placeholder?: string;
		required?: boolean;
		value?: string;
		options?: PathOption[];
		createMode?: CreateMode;
		helperText?: string;
	} = $props();

	let isCreating = $state(false);
	let feedbackMessage = $state('');
	let feedbackTone = $state<'neutral' | 'success' | 'error'>('neutral');
	let selectedCreateTarget = $state<'folder' | 'file'>('folder');
	let createTarget = $derived(createMode === 'file' ? 'file' : selectedCreateTarget);

	let listId = $derived(`${inputId}-options`);
	let actionLabel = $derived(
		createMode === 'either'
			? `Create ${createTarget} if missing`
			: createMode === 'file'
				? 'Create file if missing'
				: 'Create folder if missing'
	);
	let feedbackClass = $derived(
		feedbackTone === 'error'
			? 'text-rose-300'
			: feedbackTone === 'success'
				? 'text-emerald-300'
				: 'text-slate-500'
	);

	function applyOption(event: Event) {
		const nextValue = (event.currentTarget as HTMLSelectElement).value;

		if (!nextValue) {
			return;
		}

		value = nextValue;
		feedbackMessage = '';
		feedbackTone = 'neutral';
	}

	async function createPath() {
		const trimmedValue = value.trim();

		if (!trimmedValue) {
			feedbackTone = 'error';
			feedbackMessage = 'Enter a path first.';
			return;
		}

		isCreating = true;
		feedbackMessage = '';
		feedbackTone = 'neutral';

		try {
			const response = await fetch('/api/paths/ensure', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					path: trimmedValue,
					target: createMode === 'either' ? createTarget : createMode
				})
			});
			const payload = (await response.json().catch(() => null)) as
				| {
						error?: string;
						target?: 'folder' | 'file';
						created?: boolean;
				  }
				| null;

			if (!response.ok) {
				throw new Error(payload?.error ?? 'Could not create the requested path.');
			}

			const target = payload?.target ?? (createMode === 'either' ? createTarget : createMode);
			feedbackTone = 'success';
			feedbackMessage = payload?.created
				? `${target === 'file' ? 'File' : 'Folder'} created.`
				: `${target === 'file' ? 'File' : 'Folder'} already exists.`;
		} catch (error) {
			feedbackTone = 'error';
			feedbackMessage =
				error instanceof Error ? error.message : 'Could not create the requested path.';
		} finally {
			isCreating = false;
		}
	}
</script>

<label class="block">
	<span class="mb-2 block text-sm font-medium text-slate-200">{label}</span>
	<select class="select mb-2 w-full text-white" onchange={applyOption}>
		<option value="">Choose a known path</option>
		{#each options as option (option.path)}
			<option value={option.path}>{option.label}</option>
		{/each}
	</select>
	<input
		bind:value
		class="input w-full text-white placeholder:text-slate-500"
		id={inputId}
		list={listId}
		name={name}
		placeholder={placeholder}
		{required}
	/>
</label>

<datalist id={listId}>
	{#each options as option (option.path)}
		<option value={option.path}>{option.label}</option>
	{/each}
</datalist>

<div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
	{#if createMode === 'either'}
		<select class="select max-w-[9rem] text-white" bind:value={selectedCreateTarget}>
			<option value="folder">Folder</option>
			<option value="file">File</option>
		</select>
	{/if}

	<button
		class="btn btn-sm border border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:text-white disabled:opacity-60"
		type="button"
		onclick={createPath}
		disabled={isCreating}
	>
		{isCreating ? 'Creating...' : actionLabel}
	</button>

	<p aria-live="polite" class={`ui-wrap-anywhere min-w-0 flex-1 text-xs ${feedbackClass}`}>
		{feedbackMessage || helperText}
	</p>
</div>
