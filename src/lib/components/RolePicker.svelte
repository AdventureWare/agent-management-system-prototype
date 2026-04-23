<script lang="ts">
	import AppButton from '$lib/components/AppButton.svelte';
	import {
		buildRelatedRoles,
		formatRoleAreaLabel,
		summarizeRolePurpose
	} from '$lib/roles/related-roles';
	import { formatCatalogLifecycleStatusLabel } from '$lib/types/control-plane';

	type RoleOption = {
		id: string;
		name: string;
		area?: string;
		family?: string;
		lifecycleStatus?: string;
		description?: string;
		skillIds?: string[];
		toolIds?: string[];
		mcpIds?: string[];
		systemPrompt?: string;
	};

	type NearbyRole = {
		role: RoleOption;
		score: number;
		reason: string;
		purposeSummary: string;
		contrastSummary: string;
	};

	let {
		label,
		name,
		inputId,
		value = $bindable(''),
		roles,
		helperText = '',
		noRoleLabel = 'No role preference',
		missingValueLabel = '',
		onchange
	}: {
		label: string;
		name?: string;
		inputId: string;
		value?: string;
		roles: RoleOption[];
		helperText?: string;
		noRoleLabel?: string;
		missingValueLabel?: string;
		onchange?: ((nextValue: string) => void) | null;
	} = $props();

	let isBrowserOpen = $state(false);
	let query = $state('');
	let selectedRole = $derived(roles.find((role) => role.id === value) ?? null);
	let filteredRoles = $derived.by(() => {
		const normalizedQuery = query.trim().toLowerCase();

		if (!normalizedQuery) {
			return roles;
		}

		return roles.filter((role) =>
			[
				role.name,
				role.area ?? '',
				role.family ?? '',
				role.description ?? '',
				...(role.skillIds ?? []),
				...(role.toolIds ?? []),
				...(role.mcpIds ?? [])
			]
				.join(' ')
				.toLowerCase()
				.includes(normalizedQuery)
		);
	});
	let sortedFilteredRoles = $derived(
		[...filteredRoles].sort((left, right) => compareRoles(left, right))
	);
	let groupedRoles = $derived.by(() => {
		const groups = new Map<string, RoleOption[]>();

		for (const role of sortedFilteredRoles) {
			const area = role.area?.trim() || 'other';
			const existing = groups.get(area) ?? [];
			existing.push(role);
			groups.set(area, existing);
		}

		return [...groups.entries()]
			.sort(([leftArea], [rightArea]) => compareRoleAreas(leftArea, rightArea))
			.map(([area, items]) => ({
				area,
				label: formatRoleAreaLabel(area),
				items
			}));
	});
	let nearbyRoles = $derived.by(() => {
		if (!selectedRole) {
			return [] as NearbyRole[];
		}

		return buildRelatedRoles(selectedRole, roles, 3);
	});

	function formatList(values?: string[]) {
		return values?.join(', ') ?? '';
	}

	function compareRoleAreas(left: string, right: string) {
		return roleAreaSortValue(left) - roleAreaSortValue(right) || left.localeCompare(right);
	}

	function compareRoles(left: RoleOption, right: RoleOption) {
		return (
			roleLifecycleSortValue(left.lifecycleStatus) -
				roleLifecycleSortValue(right.lifecycleStatus) ||
			compareRoleAreas(left.area?.trim() || 'other', right.area?.trim() || 'other') ||
			left.name.localeCompare(right.name)
		);
	}

	function roleAreaSortValue(area: string) {
		switch (area) {
			case 'product':
				return 0;
			case 'growth':
				return 1;
			case 'ops':
				return 2;
			case 'shared':
				return 3;
			default:
				return 4;
		}
	}

	function roleLifecycleSortValue(lifecycleStatus?: string) {
		switch (lifecycleStatus ?? 'active') {
			case 'active':
				return 0;
			case 'draft':
				return 1;
			case 'deprecated':
				return 2;
			case 'superseded':
				return 3;
			default:
				return 4;
		}
	}

	function describeRoleDefaults(role: RoleOption) {
		const parts: string[] = [];

		if ((role.skillIds?.length ?? 0) > 0) {
			parts.push(`${role.skillIds?.length} skill${role.skillIds?.length === 1 ? '' : 's'}`);
		}

		if ((role.toolIds?.length ?? 0) > 0) {
			parts.push(`${role.toolIds?.length} tool${role.toolIds?.length === 1 ? '' : 's'}`);
		}

		if ((role.mcpIds?.length ?? 0) > 0) {
			parts.push(`${role.mcpIds?.length} MCP${role.mcpIds?.length === 1 ? '' : 's'}`);
		}

		if (role.systemPrompt?.trim()) {
			parts.push('prompt');
		}

		return parts.join(' · ') || 'No role defaults configured.';
	}
	function commitSelection(nextValue: string) {
		value = nextValue;
		query = '';
		isBrowserOpen = false;
		onchange?.(nextValue);
	}
</script>

<div class="block">
	<div class="flex items-start justify-between gap-3">
		<span class="mb-2 block text-sm font-medium text-slate-200">{label}</span>
		{#if selectedRole}
			<a class="text-xs text-sky-300 underline" href={`/app/roles/${selectedRole.id}`}>
				Open detail
			</a>
		{/if}
	</div>

	{#if name}
		<input {name} type="hidden" {value} />
	{/if}

	<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0">
				{#if !value}
					<p class="text-sm font-medium text-white">{noRoleLabel}</p>
					<p class="mt-1 text-sm text-slate-400">
						Leave the role unset to route only by assignee and other declared requirements.
					</p>
				{:else if selectedRole}
					<div class="flex flex-wrap items-center gap-2">
						<p class="text-sm font-medium text-white">{selectedRole.name}</p>
						<span
							class="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.14em] text-slate-400 uppercase"
						>
							{formatRoleAreaLabel(selectedRole.area)}
						</span>
						{#if selectedRole.family?.trim()}
							<span
								class="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.14em] text-slate-400 uppercase"
							>
								Family · {selectedRole.family}
							</span>
						{/if}
						{#if selectedRole.lifecycleStatus && selectedRole.lifecycleStatus !== 'active'}
							<span
								class="rounded-full border border-amber-800/60 bg-amber-950/20 px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.14em] text-amber-200 uppercase"
							>
								{formatCatalogLifecycleStatusLabel(selectedRole.lifecycleStatus)}
							</span>
						{/if}
					</div>
					<p class="mt-1 text-sm text-slate-400">
						{selectedRole.description || 'No role description recorded.'}
					</p>
					{#if selectedRole.lifecycleStatus === 'deprecated'}
						<p class="mt-2 text-xs text-amber-300">
							This role is deprecated. Prefer an active adjacent role unless you are preserving old
							routing.
						</p>
					{:else if selectedRole.lifecycleStatus === 'superseded'}
						<p class="mt-2 text-xs text-amber-300">
							This role has been superseded. Check the directory detail before choosing it for new
							work.
						</p>
					{/if}
					<p class="mt-2 text-xs text-slate-500">
						Configured defaults: {describeRoleDefaults(selectedRole)}
					</p>
				{:else}
					<p class="text-sm font-medium text-amber-200">
						{missingValueLabel || `${value} (missing role)`}
					</p>
					<p class="mt-1 text-sm text-amber-300">
						This item still references a role that is no longer available.
					</p>
				{/if}
			</div>

			<div class="flex flex-wrap gap-2">
				<AppButton
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => (isBrowserOpen = !isBrowserOpen)}
				>
					{isBrowserOpen ? 'Hide roles' : 'Choose role'}
				</AppButton>
				{#if value}
					<AppButton type="button" variant="ghost" size="sm" onclick={() => commitSelection('')}>
						Clear
					</AppButton>
				{/if}
			</div>
		</div>

		{#if helperText}
			<p class="mt-3 text-xs text-slate-500">{helperText}</p>
		{/if}

		{#if selectedRole && nearbyRoles.length > 0}
			<div class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
				<p class="text-[0.7rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">
					Nearby roles to compare
				</p>
				<div class="mt-3 flex flex-wrap gap-2">
					{#each nearbyRoles as nearby (nearby.role.id)}
						<button
							type="button"
							class="rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-left transition hover:border-slate-600 hover:bg-slate-900"
							onclick={() => commitSelection(nearby.role.id)}
						>
							<p class="text-sm font-medium text-white">{nearby.role.name}</p>
							<p class="mt-1 text-xs text-slate-500">{nearby.reason}</p>
							<p class="mt-1 text-xs text-slate-500">
								Compared with current: {nearby.contrastSummary}
							</p>
							<p class="mt-2 text-xs text-slate-400">
								Use when: {summarizeRolePurpose(nearby.role.description)}
							</p>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if selectedRole}
			<div class="mt-4 grid gap-3 lg:grid-cols-3">
				<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
					<p class="text-[0.7rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Skills
					</p>
					<p class="mt-2 text-sm text-slate-300">
						{formatList(selectedRole.skillIds) || 'No role skills declared.'}
					</p>
				</div>
				<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
					<p class="text-[0.7rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">
						Tools
					</p>
					<p class="mt-2 text-sm text-slate-300">
						{formatList(selectedRole.toolIds) || 'No role tools declared.'}
					</p>
				</div>
				<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
					<p class="text-[0.7rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">MCPs</p>
					<p class="mt-2 text-sm text-slate-300">
						{formatList(selectedRole.mcpIds) || 'No role MCPs declared.'}
					</p>
				</div>
			</div>
		{/if}

		{#if selectedRole}
			<p class="mt-3 text-xs text-slate-500">
				{selectedRole.systemPrompt?.trim()
					? 'This role also contributes dedicated prompt instructions.'
					: 'This role does not add dedicated prompt instructions.'}
			</p>
		{/if}

		{#if isBrowserOpen}
			<div class="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
				<label class="block">
					<span class="sr-only">Search roles</span>
					<input
						id={inputId}
						bind:value={query}
						class="input text-white placeholder:text-slate-500"
						placeholder="Search roles by name, area, family, purpose, or defaults…"
					/>
				</label>
				<p class="text-xs text-slate-500">
					Active and draft roles are shown first. Deprecated and superseded roles stay available for
					legacy routing, but they are not preferred for new work.
				</p>

				<div class="max-h-72 space-y-2 overflow-y-auto pr-1">
					<button
						type="button"
						class={`w-full rounded-2xl border px-3 py-3 text-left transition ${!value ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900'}`}
						onclick={() => commitSelection('')}
					>
						<p class="text-sm font-medium text-white">{noRoleLabel}</p>
						<p class="mt-1 text-sm text-slate-400">
							Route without a default role when the work can stay flexible.
						</p>
					</button>

					{#if filteredRoles.length === 0}
						<p
							class="rounded-2xl border border-dashed border-slate-800 px-4 py-4 text-sm text-slate-500"
						>
							No roles match the current search.
						</p>
					{:else}
						{#each groupedRoles as group (group.area)}
							<div class="space-y-2">
								<p
									class="px-1 text-[0.65rem] font-semibold tracking-[0.16em] text-slate-500 uppercase"
								>
									{group.label}
								</p>
								{#each group.items as role (role.id)}
									<button
										type="button"
										class={`w-full rounded-2xl border px-3 py-3 text-left transition ${value === role.id ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900'}`}
										onclick={() => commitSelection(role.id)}
									>
										<div class="flex flex-wrap items-center justify-between gap-2">
											<p class="text-sm font-medium text-white">{role.name}</p>
											<div class="flex flex-wrap gap-2">
												<span
													class="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.14em] text-slate-400 uppercase"
												>
													{formatRoleAreaLabel(role.area)}
												</span>
												{#if role.family?.trim()}
													<span
														class="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.14em] text-slate-400 uppercase"
													>
														Family · {role.family}
													</span>
												{/if}
												{#if role.lifecycleStatus && role.lifecycleStatus !== 'active'}
													<span
														class="rounded-full border border-amber-800/60 bg-amber-950/20 px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.14em] text-amber-200 uppercase"
													>
														{formatCatalogLifecycleStatusLabel(role.lifecycleStatus)}
													</span>
												{/if}
											</div>
										</div>
										<p class="mt-1 text-sm text-slate-400">
											{role.description || 'No role description recorded.'}
										</p>
										<p class="mt-2 text-xs text-slate-500">
											Defaults: {describeRoleDefaults(role)}
										</p>
										{#if role.lifecycleStatus === 'deprecated'}
											<p class="mt-2 text-xs text-amber-300">
												Legacy role. Prefer an active adjacent role when you can.
											</p>
										{:else if role.lifecycleStatus === 'superseded'}
											<p class="mt-2 text-xs text-amber-300">
												Superseded role. Use only when preserving older routing.
											</p>
										{/if}
									</button>
								{/each}
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
