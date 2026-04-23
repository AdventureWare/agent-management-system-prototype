<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import type { ActionData, PageData } from './$types';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import CollectionToolbar from '$lib/components/CollectionToolbar.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import TokenizedListInput from '$lib/components/TokenizedListInput.svelte';
	import { buildRelatedRoles, formatRoleAreaLabel } from '$lib/roles/related-roles';
	import {
		CATALOG_LIFECYCLE_STATUS_OPTIONS,
		formatCatalogLifecycleStatusLabel
	} from '$lib/types/control-plane';
	import type { CatalogLifecycleStatus } from '$lib/types/control-plane';

	let { data, form }: { data: PageData; form: ActionData | null } = $props();

	type RoleDirectoryEntry = (typeof data.roles)[number];
	type RelatedRole = {
		role: RoleDirectoryEntry;
		score: number;
		reason: string;
		purposeSummary: string;
		contrastSummary: string;
	};
	type RoleDraftSource = {
		roleId?: string;
		name?: string;
		area?: string;
		family?: string;
		lifecycleStatus?: CatalogLifecycleStatus;
		sourceRoleId?: string | null;
		forkReason?: string;
		supersededByRoleId?: string | null;
		description?: string;
		skillIds?: string[] | string;
		toolIds?: string[] | string;
		mcpIds?: string[] | string;
		systemPrompt?: string;
		qualityChecklist?: string[] | string;
		approvalPolicy?: string;
		escalationPolicy?: string;
	};

	function hasDraftValues(value: ActionData | null): value is NonNullable<ActionData> & {
		formContext: 'createRole' | 'updateRole';
		values: RoleDraftSource;
	} {
		return Boolean(
			value && typeof value === 'object' && 'formContext' in value && 'values' in value
		);
	}

	let routerReady = $state(false);
	let consumedForkRoleId = $state('');
	let selectedRoleId = $state('');
	let query = $state('');
	let selectedArea = $state('all');
	let selectedFamily = $state('all');
	let selectedLifecycle = $state('all');
	let editPanelOpen = $state(false);
	let createAdvancedOpen = $state(false);
	let createName = $state('');
	let createArea = $state('shared');
	let createFamily = $state('');
	let createLifecycleStatus = $state('active');
	let createSourceRoleId = $state('');
	let createForkReason = $state('');
	let createSupersededByRoleId = $state('');
	let createDescription = $state('');
	let createSkillIds = $state<string[]>([]);
	let createToolIds = $state<string[]>([]);
	let createMcpIds = $state<string[]>([]);
	let createSystemPrompt = $state('');
	let createQualityChecklist = $state<string[]>([]);
	let createApprovalPolicy = $state('');
	let createEscalationPolicy = $state('');
	let updateName = $state('');
	let updateArea = $state('shared');
	let updateFamily = $state('');
	let updateLifecycleStatus = $state('active');
	let updateSourceRoleId = $state('');
	let updateForkReason = $state('');
	let updateSupersededByRoleId = $state('');
	let updateDescription = $state('');
	let updateSkillIds = $state<string[]>([]);
	let updateToolIds = $state<string[]>([]);
	let updateMcpIds = $state<string[]>([]);
	let updateSystemPrompt = $state('');
	let updateQualityChecklist = $state<string[]>([]);
	let updateApprovalPolicy = $state('');
	let updateEscalationPolicy = $state('');

	let createRoleSuccess = $derived(form?.ok && form?.successAction === 'createRole');
	let updateRoleSuccess = $derived(form?.ok && form?.successAction === 'updateRole');
	let migrateRoleReferencesSuccess = $derived(
		form?.ok && form?.successAction === 'migrateRoleReferences'
	);
	let taskReferencedRoleCount = $derived(data.roles.filter((role) => role.taskCount > 0).length);
	let libraryReferencedRoleCount = $derived(
		data.roles.filter((role) => role.templateCount > 0 || role.workflowCount > 0).length
	);
	let surfaceLinkedRoleCount = $derived(
		data.roles.filter((role) => role.executionSurfaceCount > 0).length
	);
	let activeRoleCount = $derived(
		data.roles.filter((role) => (role.lifecycleStatus ?? 'active') === 'active').length
	);
	let knownFamilies = $derived(data.roleFamilyOptions);
	let createForkSourceRole = $derived(
		createSourceRoleId ? (data.roles.find((role) => role.id === createSourceRoleId) ?? null) : null
	);
	let createForkMode = $derived(Boolean(createForkSourceRole));
	let updateForkSourceRole = $derived(
		updateSourceRoleId ? (data.roles.find((role) => role.id === updateSourceRoleId) ?? null) : null
	);
	let createSuccessorOptions = $derived(
		data.roles.filter(
			(role) =>
				role.id !== createSourceRoleId &&
				(role.lifecycleStatus ?? 'active') !== 'deprecated' &&
				(role.lifecycleStatus ?? 'active') !== 'superseded'
		)
	);
	let updateSuccessorOptions = $derived(
		data.roles.filter(
			(role) =>
				role.id !== selectedRole?.id &&
				(role.lifecycleStatus ?? 'active') !== 'deprecated' &&
				(role.lifecycleStatus ?? 'active') !== 'superseded'
		)
	);
	let filteredRoles = $derived.by(() => {
		const normalizedQuery = query.trim().toLowerCase();

		return data.roles.filter((role) => {
			const matchesArea = selectedArea === 'all' || role.area === selectedArea;
			const matchesFamily =
				selectedFamily === 'all' || (role.family?.trim() ?? '') === selectedFamily;
			const matchesLifecycle =
				selectedLifecycle === 'all' || (role.lifecycleStatus ?? 'active') === selectedLifecycle;
			const matchesQuery =
				!normalizedQuery ||
				[
					role.name,
					role.family ?? '',
					role.description,
					...(role.skillIds ?? []),
					...(role.toolIds ?? []),
					...(role.mcpIds ?? []),
					...(role.taskExamples ?? []).map((task) => task.name),
					...(role.templateReferences ?? []).map((template) => template.name),
					...(role.workflowReferences ?? []).map((workflow) => workflow.name),
					...(role.executionSurfaceReferences ?? []).map((surface) => surface.name)
				]
					.join(' ')
					.toLowerCase()
					.includes(normalizedQuery);

			return matchesArea && matchesFamily && matchesLifecycle && matchesQuery;
		});
	});
	let selectedRole = $derived(
		filteredRoles.find((role) => role.id === selectedRoleId) ??
			data.roles.find((role) => role.id === selectedRoleId) ??
			filteredRoles[0] ??
			data.roles[0] ??
			null
	);
	let selectedRoleReferences = $derived.by(() => {
		if (!selectedRole) {
			return 0;
		}

		return (
			selectedRole.taskCount +
			selectedRole.templateCount +
			selectedRole.workflowCount +
			selectedRole.executionSurfaceCount
		);
	});
	let relatedRoles = $derived.by<RelatedRole[]>(() =>
		selectedRole ? buildRelatedRoles(selectedRole, data.roles, 4) : []
	);
	let roleDirectorySummary = $derived(
		`${filteredRoles.length} matching role${filteredRoles.length === 1 ? '' : 's'}`
	);
	let knownSkillIds = $derived(
		[...new Set(data.roles.flatMap((role) => role.skillIds ?? []))].sort((a, b) =>
			a.localeCompare(b)
		)
	);
	let knownToolIds = $derived(
		[...new Set(data.roles.flatMap((role) => role.toolIds ?? []))].sort((a, b) =>
			a.localeCompare(b)
		)
	);
	let knownMcpIds = $derived(
		[...new Set(data.roles.flatMap((role) => role.mcpIds ?? []))].sort((a, b) => a.localeCompare(b))
	);
	let knownChecklistItems = $derived(
		[...new Set(data.roles.flatMap((role) => role.qualityChecklist ?? []))].sort((a, b) =>
			a.localeCompare(b)
		)
	);
	$effect(() => {
		const submittedRoleId = form?.roleId ?? '';
		const knownRoleIds = new Set(data.roles.map((role) => role.id));

		if (
			submittedRoleId &&
			knownRoleIds.has(submittedRoleId) &&
			submittedRoleId !== selectedRoleId
		) {
			selectedRoleId = submittedRoleId;
			return;
		}

		if (!selectedRoleId) {
			selectedRoleId =
				data.initialSelectedRoleId || filteredRoles[0]?.id || data.roles[0]?.id || '';
			return;
		}

		if (!knownRoleIds.has(selectedRoleId)) {
			selectedRoleId = filteredRoles[0]?.id ?? data.roles[0]?.id ?? '';
		}
	});

	onMount(() => {
		routerReady = true;

		const syncFromLocation = () => {
			const url = new URL(window.location.href);
			const requestedRoleId = url.searchParams.get('role')?.trim() ?? '';

			if (requestedRoleId && data.roles.some((role) => role.id === requestedRoleId)) {
				selectedRoleId = requestedRoleId;
				return;
			}

			selectedRoleId = data.initialSelectedRoleId || data.roles[0]?.id || '';
		};

		window.addEventListener('popstate', syncFromLocation);

		return () => {
			window.removeEventListener('popstate', syncFromLocation);
		};
	});

	$effect(() => {
		if (typeof window === 'undefined' || !routerReady) {
			return;
		}

		const currentUrl = new URL(window.location.href);
		const nextUrl = new URL(currentUrl);

		if (selectedRoleId) {
			nextUrl.searchParams.set('role', selectedRoleId);
		} else {
			nextUrl.searchParams.delete('role');
		}

		const currentPath = `${currentUrl.pathname}${currentUrl.search}`;
		const nextPath = `${nextUrl.pathname}${nextUrl.search}`;

		if (currentPath === nextPath) {
			return;
		}

		updateRoleSelectionUrl(nextUrl);
	});

	$effect(() => {
		if (updateRoleSuccess || form?.formContext === 'updateRole') {
			editPanelOpen = true;
		}
	});

	$effect(() => {
		if (createRoleSuccess) {
			resetCreateDraft();
			createAdvancedOpen = false;
			consumedForkRoleId = '';
			return;
		}

		if (hasDraftValues(form) && form.formContext === 'createRole') {
			applyCreateDraft(form.values);
			createAdvancedOpen = hasAdvancedValues(form.values);
		}
	});

	$effect(() => {
		const requestedForkRoleId = page.url.searchParams.get('fork')?.trim() ?? '';

		if (!requestedForkRoleId || requestedForkRoleId === consumedForkRoleId) {
			return;
		}

		const sourceRole = data.roles.find((role) => role.id === requestedForkRoleId) ?? null;

		if (!sourceRole) {
			consumedForkRoleId = requestedForkRoleId;
			return;
		}

		openCreateFromRole(sourceRole);
		consumedForkRoleId = requestedForkRoleId;
	});

	$effect(() => {
		if (!selectedRole) {
			applyUpdateDraft(null);
			return;
		}

		if (
			hasDraftValues(form) &&
			form.formContext === 'updateRole' &&
			form.roleId === selectedRole.id
		) {
			applyUpdateDraft(form.values);
			return;
		}

		applyUpdateDraft(selectedRole);
	});

	function formatAreaLabel(value: string) {
		return formatRoleAreaLabel(value);
	}

	function formatListField(values?: string[]) {
		return values?.join(', ') ?? '';
	}

	function parseDraftList(values?: string[] | string) {
		if (Array.isArray(values)) {
			return values.map((value) => value.trim()).filter(Boolean);
		}

		return (
			values
				?.split(',')
				.map((value) => value.trim())
				.filter(Boolean) ?? []
		);
	}

	function formatCapabilityPreview(role: RoleDirectoryEntry) {
		const previewValues = [
			...(role.skillIds ?? []),
			...(role.toolIds ?? []),
			...(role.mcpIds ?? [])
		].slice(0, 3);

		if (previewValues.length === 0) {
			return 'No default capabilities listed yet.';
		}

		return previewValues.join(', ');
	}

	function formatRoleSummary(role: RoleDirectoryEntry) {
		const segments = [
			`${role.taskCount} task reference${role.taskCount === 1 ? '' : 's'}`,
			`${role.templateCount} template reference${role.templateCount === 1 ? '' : 's'}`,
			`${role.workflowCount} workflow reference${role.workflowCount === 1 ? '' : 's'}`,
			`${role.executionSurfaceCount} surface link${role.executionSurfaceCount === 1 ? '' : 's'}`
		];

		return segments.join(' · ');
	}

	function hasAdvancedValues(values?: RoleDraftSource | null) {
		if (!values) {
			return false;
		}

		return [
			parseDraftList(values.skillIds).length > 0,
			parseDraftList(values.toolIds).length > 0,
			parseDraftList(values.mcpIds).length > 0,
			values.systemPrompt?.trim() ?? '',
			parseDraftList(values.qualityChecklist).length > 0,
			values.approvalPolicy?.trim() ?? '',
			values.escalationPolicy?.trim() ?? ''
		].some(Boolean);
	}

	function applyCreateDraft(values?: RoleDraftSource | null) {
		createName = values?.name?.trim() ?? '';
		createArea = values?.area?.trim() || 'shared';
		createFamily = values?.family?.trim() ?? '';
		createLifecycleStatus = values?.lifecycleStatus?.trim() || 'active';
		createSourceRoleId = values?.sourceRoleId?.trim() ?? '';
		createForkReason = values?.forkReason ?? '';
		createSupersededByRoleId = values?.supersededByRoleId?.trim() ?? '';
		createDescription = values?.description?.trim() ?? '';
		createSkillIds = parseDraftList(values?.skillIds);
		createToolIds = parseDraftList(values?.toolIds);
		createMcpIds = parseDraftList(values?.mcpIds);
		createSystemPrompt = values?.systemPrompt ?? '';
		createQualityChecklist = parseDraftList(values?.qualityChecklist);
		createApprovalPolicy = values?.approvalPolicy ?? '';
		createEscalationPolicy = values?.escalationPolicy ?? '';
	}

	function applyUpdateDraft(values?: RoleDraftSource | null) {
		updateName = values?.name?.trim() ?? '';
		updateArea = values?.area?.trim() || 'shared';
		updateFamily = values?.family?.trim() ?? '';
		updateLifecycleStatus = values?.lifecycleStatus?.trim() || 'active';
		updateSourceRoleId = values?.sourceRoleId?.trim() ?? '';
		updateForkReason = values?.forkReason ?? '';
		updateSupersededByRoleId = values?.supersededByRoleId?.trim() ?? '';
		updateDescription = values?.description?.trim() ?? '';
		updateSkillIds = parseDraftList(values?.skillIds);
		updateToolIds = parseDraftList(values?.toolIds);
		updateMcpIds = parseDraftList(values?.mcpIds);
		updateSystemPrompt = values?.systemPrompt ?? '';
		updateQualityChecklist = parseDraftList(values?.qualityChecklist);
		updateApprovalPolicy = values?.approvalPolicy ?? '';
		updateEscalationPolicy = values?.escalationPolicy ?? '';
	}

	function resetCreateDraft() {
		applyCreateDraft(null);
	}

	function openCreateFromRole(role: RoleDirectoryEntry | null) {
		if (!role) {
			return;
		}

		applyCreateDraft({
			...role,
			name: `${role.name} variant`,
			sourceRoleId: role.id,
			forkReason: '',
			lifecycleStatus: 'active',
			supersededByRoleId: ''
		});
		createAdvancedOpen = hasAdvancedValues(role);
	}

	function formatReferenceCountLabel(count: number, label: string) {
		return `${count} ${label}${count === 1 ? '' : 's'}`;
	}

	function updateRoleSelectionUrl(nextUrl: URL) {
		try {
			replaceState(nextUrl, page.state);
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.includes('before router is initialized') &&
				typeof window !== 'undefined'
			) {
				window.history.replaceState(window.history.state, '', nextUrl);
				return;
			}

			throw error;
		}
	}
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Roles"
		title="Role directory"
		description="Browse reusable specialization bundles, compare adjacent roles, and open one only when you need details or to edit its defaults."
	/>

	{#if form?.message && !form?.ok}
		<p class="ui-notice border border-rose-900/70 bg-rose-950/40 text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if createRoleSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Role created.
		</p>
	{/if}

	{#if updateRoleSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Role updated.
		</p>
	{/if}

	{#if migrateRoleReferencesSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			{form?.message || 'Role references migrated.'}
		</p>
	{/if}

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
		<MetricCard
			label="Cataloged roles"
			value={data.roles.length}
			detail="Distinct specialization bundles available for routing and reuse."
		/>
		<MetricCard
			label="Active roles"
			value={activeRoleCount}
			detail="Roles currently preferred for new work and routing."
		/>
		<MetricCard
			label="Used in tasks"
			value={taskReferencedRoleCount}
			detail="Roles that are currently referenced by at least one task."
		/>
		<MetricCard
			label="Used in workflow library"
			value={libraryReferencedRoleCount}
			detail="Roles referenced by saved task templates or workflow steps."
		/>
		<MetricCard
			label="Linked to surfaces"
			value={surfaceLinkedRoleCount}
			detail="Roles currently advertised by one or more execution surfaces."
		/>
	</div>

	<section class="ui-panel space-y-6">
		<CollectionToolbar
			title="Role directory"
			description="Search roles by name, purpose, examples, or default capabilities, then inspect one role without dropping straight into edit mode."
			density="compact"
		>
			{#snippet controls()}
				<div class="flex flex-col gap-3 xl:w-[46rem]">
					<div
						class="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
					>
						<label class="block">
							<span class="sr-only">Search roles</span>
							<input
								bind:value={query}
								class="input text-white placeholder:text-slate-500"
								placeholder="Search by role, purpose, defaults, or examples…"
							/>
						</label>

						<label class="block">
							<span class="sr-only">Filter roles by area</span>
							<select bind:value={selectedArea} class="select text-white">
								<option value="all">All areas</option>
								{#each data.roleAreaOptions as area (area)}
									<option value={area}>{formatAreaLabel(area)}</option>
								{/each}
							</select>
						</label>

						<label class="block">
							<span class="sr-only">Filter roles by family</span>
							<select bind:value={selectedFamily} class="select text-white">
								<option value="all">All families</option>
								{#each knownFamilies as family (family)}
									<option value={family}>{family}</option>
								{/each}
							</select>
						</label>

						<label class="block">
							<span class="sr-only">Filter roles by lifecycle</span>
							<select bind:value={selectedLifecycle} class="select text-white">
								<option value="all">All states</option>
								{#each CATALOG_LIFECYCLE_STATUS_OPTIONS as lifecycleStatus (lifecycleStatus)}
									<option value={lifecycleStatus}>
										{formatCatalogLifecycleStatusLabel(lifecycleStatus)}
									</option>
								{/each}
							</select>
						</label>
					</div>
				</div>
			{/snippet}
		</CollectionToolbar>

		<div class="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(24rem,0.95fr)]">
			<div class="space-y-3">
				<div class="flex items-center justify-between gap-3">
					<h2 class="text-lg font-semibold text-white">Roles</h2>
					<p class="text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">
						{roleDirectorySummary}
					</p>
				</div>

				{#if filteredRoles.length === 0}
					<p class="ui-empty-state">No roles match the current search or area filter.</p>
				{:else}
					{#each filteredRoles as role (role.id)}
						<button
							type="button"
							class={[
								'w-full rounded-2xl border px-4 py-4 text-left transition',
								selectedRole?.id === role.id
									? 'border-sky-400/60 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.15)]'
									: 'border-slate-800 bg-slate-950/55 hover:border-slate-700 hover:bg-slate-900/70'
							]}
							aria-pressed={selectedRole?.id === role.id}
							onclick={() => {
								selectedRoleId = role.id;
							}}
						>
							<div class="flex flex-wrap items-center justify-between gap-3">
								<div class="min-w-0">
									<h2 class="ui-wrap-anywhere text-lg font-semibold text-white">{role.name}</h2>
									<div class="mt-1 flex flex-wrap gap-2">
										<p class="text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">
											{formatAreaLabel(role.area)}
										</p>
										{#if role.family?.trim()}
											<p class="text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">
												Family · {role.family}
											</p>
										{/if}
										{#if (role.lifecycleStatus ?? 'active') !== 'active'}
											<p class="text-xs font-medium tracking-[0.16em] text-amber-300 uppercase">
												{formatCatalogLifecycleStatusLabel(role.lifecycleStatus ?? 'active')}
											</p>
										{/if}
									</div>
								</div>
								<span
									class="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-300"
								>
									{role.configuredDefaultsCount} default{role.configuredDefaultsCount === 1
										? ''
										: 's'}
								</span>
							</div>

							<p class="mt-3 text-[11px] font-medium tracking-[0.16em] text-slate-500 uppercase">
								Role purpose
							</p>
							<p class="mt-2 text-sm text-slate-300">{role.description}</p>

							<div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
								<span class="rounded-full border border-slate-800 px-2.5 py-1">
									{role.taskCount} tasks
								</span>
								<span class="rounded-full border border-slate-800 px-2.5 py-1">
									{role.templateCount} templates
								</span>
								<span class="rounded-full border border-slate-800 px-2.5 py-1">
									{role.workflowCount} workflows
								</span>
								<span class="rounded-full border border-slate-800 px-2.5 py-1">
									{role.executionSurfaceCount} surface links
								</span>
							</div>

							<p class="mt-4 text-xs text-slate-500">
								Defaults · {formatCapabilityPreview(role)}
							</p>

							{#if (role.taskExamples ?? []).length > 0}
								<p class="mt-2 text-xs text-slate-500">
									Examples · {(role.taskExamples ?? []).map((task) => task.name).join(' · ')}
								</p>
							{/if}
						</button>
					{/each}
				{/if}
			</div>

			{#if selectedRole}
				<div class="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/55 p-5">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="text-[11px] tracking-[0.24em] text-slate-500 uppercase">Selected role</p>
							<h3 class="ui-wrap-anywhere mt-2 text-2xl font-semibold text-white">
								{selectedRole.name}
							</h3>
							<p class="mt-2 max-w-3xl text-sm text-slate-300">{selectedRole.description}</p>
						</div>
						<span
							class="badge border border-slate-700 bg-slate-900/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
						>
							Area · {formatAreaLabel(selectedRole.area)}
						</span>
						{#if selectedRole.family?.trim()}
							<span
								class="badge border border-slate-700 bg-slate-900/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
							>
								Family · {selectedRole.family}
							</span>
						{/if}
						{#if (selectedRole.lifecycleStatus ?? 'active') !== 'active'}
							<span
								class="badge border border-amber-800/60 bg-amber-950/30 text-[0.7rem] tracking-[0.2em] text-amber-200 uppercase"
							>
								{formatCatalogLifecycleStatusLabel(selectedRole.lifecycleStatus ?? 'active')}
							</span>
						{/if}
					</div>

					<div class="flex flex-wrap gap-3">
						<AppButton href={`/app/roles/${selectedRole.id}`} variant="ghost">
							Open dedicated detail
						</AppButton>
					</div>

					<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Task references</p>
							<p class="mt-2 text-lg font-semibold text-white">{selectedRole.taskCount}</p>
						</div>
						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Template references
							</p>
							<p class="mt-2 text-lg font-semibold text-white">{selectedRole.templateCount}</p>
						</div>
						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Workflow references
							</p>
							<p class="mt-2 text-lg font-semibold text-white">{selectedRole.workflowCount}</p>
						</div>
						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Surface links</p>
							<p class="mt-2 text-lg font-semibold text-white">
								{selectedRole.executionSurfaceCount}
							</p>
						</div>
					</div>

					{#if selectedRole.sourceRole || selectedRole.forkReason || selectedRole.supersededByRole}
						<div class="grid gap-4 lg:grid-cols-3">
							{#if selectedRole.sourceRole}
								<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Forked from</p>
									<p class="mt-2 text-sm text-white">
										<a
											class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
											href={`/app/roles/${selectedRole.sourceRole.id}`}
										>
											{selectedRole.sourceRole.name}
										</a>
									</p>
								</div>
							{/if}
							{#if selectedRole.forkReason}
								<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Fork reason</p>
									<p class="mt-2 text-sm text-slate-300">{selectedRole.forkReason}</p>
								</div>
							{/if}
							{#if selectedRole.supersededByRole}
								<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Successor role
									</p>
									<p class="mt-2 text-sm text-white">
										<a
											class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
											href={`/app/roles/${selectedRole.supersededByRole.id}`}
										>
											{selectedRole.supersededByRole.name}
										</a>
									</p>
								</div>
							{/if}
						</div>
					{/if}

					{#if selectedRole.supersededByRole && selectedRoleReferences > 0}
						<div class="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="max-w-2xl">
									<p class="text-sm font-medium text-white">Migrate existing references</p>
									<p class="mt-2 text-sm text-slate-300">
										This superseded role is still referenced by
										{formatReferenceCountLabel(selectedRole.taskCount, 'task')},
										{formatReferenceCountLabel(selectedRole.templateCount, 'template')},
										{formatReferenceCountLabel(selectedRole.workflowCount, 'workflow')}, and
										{formatReferenceCountLabel(
											selectedRole.executionSurfaceCount,
											'execution surface'
										)}. Move those references to
										<a
											class="underline decoration-amber-700 underline-offset-4 hover:text-white"
											href={`/app/roles/${selectedRole.supersededByRole.id}`}
										>
											{selectedRole.supersededByRole.name}
										</a>
										when the replacement is ready to take over.
									</p>
								</div>

								<form method="POST" action="?/migrateRoleReferences" data-persist-scope="manual">
									<input type="hidden" name="roleId" value={selectedRole.id} />
									<AppButton
										type="submit"
										variant="warning"
										onclick={(event) => {
											if (
												!window.confirm(
													`Move all references from "${selectedRole.name}" to "${selectedRole.supersededByRole?.name}"?`
												)
											) {
												event.preventDefault();
											}
										}}
									>
										Migrate references
									</AppButton>
								</form>
							</div>
						</div>
					{/if}

					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p class="text-sm font-medium text-white">Role purpose and fit</p>
								<p class="mt-1 text-xs text-slate-500">
									Use this summary to decide whether the role fits before opening the editor.
								</p>
							</div>
							<p class="text-xs text-slate-500">{formatRoleSummary(selectedRole)}</p>
						</div>
						<p class="mt-4 text-sm text-slate-300">{selectedRole.description}</p>
					</div>

					<div class="grid gap-4 xl:grid-cols-2">
						<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm font-medium text-white">Typical work</p>
								<p class="text-xs text-slate-500">{selectedRole.taskCount} task references</p>
							</div>
							{#if (selectedRole.taskExamples ?? []).length > 0}
								<ul class="mt-4 space-y-2 text-sm text-slate-300">
									{#each selectedRole.taskExamples ?? [] as task (task.id)}
										<li class="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
											<a
												class="underline decoration-slate-700 underline-offset-4 hover:text-white"
												href={`/app/tasks/${task.id}`}
											>
												{task.name}
											</a>
										</li>
									{/each}
								</ul>
							{:else}
								<p class="mt-4 text-sm text-slate-500">No task examples reference this role yet.</p>
							{/if}
						</div>

						<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm font-medium text-white">Related roles</p>
								<p class="text-xs text-slate-500">Based on shared area and default overlap</p>
							</div>
							{#if relatedRoles.length > 0}
								<div class="mt-4 space-y-3">
									{#each relatedRoles as relatedRole (relatedRole.role.id)}
										<button
											type="button"
											class="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-left transition hover:border-slate-700 hover:bg-slate-900"
											onclick={() => {
												selectedRoleId = relatedRole.role.id;
											}}
										>
											<div class="flex items-center justify-between gap-3">
												<p class="ui-wrap-anywhere text-sm font-semibold text-white">
													{relatedRole.role.name}
												</p>
												<span class="text-xs text-slate-500">{relatedRole.reason}</span>
											</div>
											<p class="mt-2 text-xs text-slate-500">
												Compare against current: {relatedRole.contrastSummary}
											</p>
											<p class="mt-2 text-sm text-slate-400">{relatedRole.purposeSummary}</p>
										</button>
									{/each}
								</div>
							{:else}
								<p class="mt-4 text-sm text-slate-500">
									No nearby roles stand out yet from shared area or defaults.
								</p>
							{/if}
						</div>
					</div>

					<div class="grid gap-4 xl:grid-cols-2">
						<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm font-medium text-white">Current references</p>
								<p class="text-xs text-slate-500">{selectedRoleReferences} total references</p>
							</div>

							<div class="mt-4 space-y-4">
								<div>
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Execution surfaces
									</p>
									{#if (selectedRole.executionSurfaceReferences ?? []).length > 0}
										<div class="mt-2 flex flex-wrap gap-2">
											{#each selectedRole.executionSurfaceReferences ?? [] as surface (surface.id)}
												<a
													class="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-white"
													href={`/app/execution-surfaces/${surface.id}`}
												>
													{surface.name}
												</a>
											{/each}
										</div>
									{:else}
										<p class="mt-2 text-sm text-slate-500">
											No execution surfaces link to this role yet.
										</p>
									{/if}
								</div>

								<div>
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Task templates
									</p>
									{#if (selectedRole.templateReferences ?? []).length > 0}
										<div class="mt-2 flex flex-wrap gap-2">
											{#each selectedRole.templateReferences ?? [] as template (template.id)}
												<a
													class="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-white"
													href={`/app/task-templates/${template.id}`}
												>
													{template.name}
												</a>
											{/each}
										</div>
									{:else}
										<p class="mt-2 text-sm text-slate-500">
											No saved task templates use this role yet.
										</p>
									{/if}
								</div>

								<div>
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Workflows</p>
									{#if (selectedRole.workflowReferences ?? []).length > 0}
										<div class="mt-2 flex flex-wrap gap-2">
											{#each selectedRole.workflowReferences ?? [] as workflow (workflow.id)}
												<a
													class="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-white"
													href={`/app/workflows/${workflow.id}`}
												>
													{workflow.name}
												</a>
											{/each}
										</div>
									{:else}
										<p class="mt-2 text-sm text-slate-500">
											No workflow steps reference this role yet.
										</p>
									{/if}
								</div>
							</div>
						</div>

						<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm font-medium text-white">Defaults</p>
								<p class="text-xs text-slate-500">
									{selectedRole.configuredDefaultsCount} configured default{selectedRole.configuredDefaultsCount ===
									1
										? ''
										: 's'}
								</p>
							</div>

							<div class="mt-4 space-y-4">
								<div>
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Skills</p>
									<p class="mt-2 text-sm text-white">
										{formatListField(selectedRole.skillIds) || 'No default skills listed.'}
									</p>
								</div>
								<div>
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Tools</p>
									<p class="mt-2 text-sm text-white">
										{formatListField(selectedRole.toolIds) || 'No default tools listed.'}
									</p>
								</div>
								<div>
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">MCPs</p>
									<p class="mt-2 text-sm text-white">
										{formatListField(selectedRole.mcpIds) || 'No preferred MCPs listed.'}
									</p>
								</div>
								<div>
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										System prompt
									</p>
									<p class="mt-2 text-sm text-white">
										{selectedRole.systemPrompt || 'No system prompt default saved.'}
									</p>
								</div>
								<div>
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
										Quality checklist
									</p>
									<p class="mt-2 text-sm text-white">
										{formatListField(selectedRole.qualityChecklist) ||
											'No checklist defaults saved.'}
									</p>
								</div>
							</div>
						</div>
					</div>

					<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
						<div class="flex items-center justify-between gap-3">
							<p class="text-sm font-medium text-white">Governance</p>
							<p class="text-xs text-slate-500">Policies applied when this role is assumed</p>
						</div>

						<div class="mt-4 grid gap-4 lg:grid-cols-2">
							<div>
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Approval policy
								</p>
								<p class="mt-2 text-sm text-white">
									{selectedRole.approvalPolicy || 'No approval policy saved.'}
								</p>
							</div>

							<div>
								<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
									Escalation policy
								</p>
								<p class="mt-2 text-sm text-white">
									{selectedRole.escalationPolicy || 'No escalation policy saved.'}
								</p>
							</div>
						</div>
					</div>

					<details
						class="rounded-2xl border border-slate-800 bg-slate-900/45 p-4"
						bind:open={editPanelOpen}
					>
						<summary class="cursor-pointer text-sm font-medium text-white">
							Edit role definition and defaults
						</summary>

						<form class="mt-4 space-y-5" method="POST" action="?/updateRole">
							<input type="hidden" name="roleId" value={selectedRole.id} />

							<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
								<p class="text-sm font-medium text-white">Change impact</p>
								<p class="mt-2 text-sm text-slate-400">
									This role is currently referenced by {selectedRole.taskCount} task{selectedRole.taskCount ===
									1
										? ''
										: 's'}, {selectedRole.templateCount} template{selectedRole.templateCount === 1
										? ''
										: 's'}, {selectedRole.workflowCount} workflow{selectedRole.workflowCount === 1
										? ''
										: 's'}, and {selectedRole.executionSurfaceCount} execution surface{selectedRole.executionSurfaceCount ===
									1
										? ''
										: 's'}.
								</p>
							</div>

							<div class="space-y-4">
								<div>
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Identity</p>
									<p class="mt-1 text-sm text-slate-400">
										These fields define what the role is and when it should be chosen.
									</p>
								</div>

								<div class="grid gap-4 lg:grid-cols-5">
									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
										<input class="input text-white" name="name" required bind:value={updateName} />
									</label>

									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">Area</span>
										<select class="select text-white" name="area" bind:value={updateArea}>
											{#each data.roleAreaOptions as area (area)}
												<option value={area}>{formatAreaLabel(area)}</option>
											{/each}
										</select>
									</label>

									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">Family</span>
										<input
											class="input text-white"
											name="family"
											list="role-family-options"
											placeholder="Writing"
											bind:value={updateFamily}
										/>
										<span class="mt-2 block text-xs text-slate-500">
											Choose one of the shared family labels to keep the catalog comparable.
										</span>
									</label>

									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">Catalog state</span>
										<select
											class="select text-white"
											name="lifecycleStatus"
											bind:value={updateLifecycleStatus}
										>
											{#each CATALOG_LIFECYCLE_STATUS_OPTIONS as lifecycleStatus (lifecycleStatus)}
												<option value={lifecycleStatus}>
													{formatCatalogLifecycleStatusLabel(lifecycleStatus)}
												</option>
											{/each}
										</select>
									</label>

									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">Successor role</span
										>
										<select
											class="select text-white"
											name="supersededByRoleId"
											bind:value={updateSupersededByRoleId}
										>
											<option value="">No successor</option>
											{#each updateSuccessorOptions as roleOption (roleOption.id)}
												<option value={roleOption.id}>{roleOption.name}</option>
											{/each}
										</select>
										<span class="mt-2 block text-xs text-slate-500">
											Successors should stay active or draft so new routing has a safe default.
										</span>
									</label>
								</div>

								<label class="block">
									<span class="mb-2 block text-sm font-medium text-slate-200"> Use when </span>
									<textarea
										class="textarea min-h-28 text-white"
										name="description"
										placeholder="Use this role when the task needs..."
										required
										bind:value={updateDescription}
									></textarea>
								</label>

								<div class="grid gap-4 lg:grid-cols-2">
									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">Forked from</span>
										<select
											class="select text-white"
											name="sourceRoleId"
											bind:value={updateSourceRoleId}
										>
											<option value="">No source role</option>
											{#each data.roles.filter((role) => role.id !== selectedRole.id) as roleOption (roleOption.id)}
												<option value={roleOption.id}>{roleOption.name}</option>
											{/each}
										</select>
									</label>

									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">
											How this differs
										</span>
										<textarea
											class="textarea min-h-28 text-white"
											name="forkReason"
											placeholder="Explain why this role exists separately from its source."
											bind:value={updateForkReason}
										></textarea>
									</label>
								</div>
							</div>

							<div class="space-y-4">
								<div>
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Defaults</p>
									<p class="mt-1 text-sm text-slate-400">
										Defaults help an actor assume this role consistently once it is selected.
									</p>
								</div>

								<div class="grid gap-4 lg:grid-cols-3">
									<TokenizedListInput
										label="Skills"
										name="skillIds"
										inputId="update-role-skill-ids"
										bind:items={updateSkillIds}
										placeholder="Type a skill and press Enter"
										helperText="Skills the role should assume by default."
										emptyText="No default skills listed."
										suggestions={knownSkillIds}
									/>

									<TokenizedListInput
										label="Tools"
										name="toolIds"
										inputId="update-role-tool-ids"
										bind:items={updateToolIds}
										placeholder="Type a tool and press Enter"
										helperText="Tools or execution modes this role expects."
										emptyText="No default tools listed."
										suggestions={knownToolIds}
									/>

									<TokenizedListInput
										label="MCPs"
										name="mcpIds"
										inputId="update-role-mcp-ids"
										bind:items={updateMcpIds}
										placeholder="Type an MCP and press Enter"
										helperText="Preferred MCP integrations for this role."
										emptyText="No preferred MCPs listed."
										suggestions={knownMcpIds}
									/>
								</div>

								<div class="grid gap-4 lg:grid-cols-2">
									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">System prompt</span>
										<textarea
											class="textarea min-h-32 text-white"
											name="systemPrompt"
											bind:value={updateSystemPrompt}
										></textarea>
									</label>

									<TokenizedListInput
										label="Quality checklist"
										name="qualityChecklist"
										inputId="update-role-quality-checklist"
										bind:items={updateQualityChecklist}
										placeholder="Type a check and press Enter"
										helperText="Checks used to judge the role’s output."
										emptyText="No checklist defaults saved."
										suggestions={knownChecklistItems}
									/>
								</div>
							</div>

							<div class="space-y-4">
								<div>
									<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Governance</p>
									<p class="mt-1 text-sm text-slate-400">
										Policies here shape approval and escalation behavior when the role is active.
									</p>
								</div>

								<div class="grid gap-4 lg:grid-cols-2">
									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200"
											>Approval policy</span
										>
										<textarea
											class="textarea min-h-28 text-white"
											name="approvalPolicy"
											bind:value={updateApprovalPolicy}
										></textarea>
									</label>

									<label class="block">
										<span class="mb-2 block text-sm font-medium text-slate-200">
											Escalation policy
										</span>
										<textarea
											class="textarea min-h-28 text-white"
											name="escalationPolicy"
											bind:value={updateEscalationPolicy}
										></textarea>
									</label>
								</div>
							</div>

							<div class="flex flex-wrap gap-3">
								<AppButton type="submit" variant="primary">Save role</AppButton>
							</div>
						</form>
					</details>
				</div>
			{/if}
		</div>
	</section>

	<section class="ui-panel space-y-5">
		<datalist id="role-family-options">
			{#each knownFamilies as family (family)}
				<option value={family}></option>
			{/each}
		</datalist>

		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="max-w-3xl">
				<h2 class="text-xl font-semibold text-white">
					{createForkMode ? 'Fork role' : 'Create role'}
				</h2>
				<p class="mt-2 text-sm text-slate-400">
					{#if createForkMode}
						Start from the existing role below, then name the variant and explain why it needs to
						exist separately.
					{:else}
						Create a new role only when the existing catalog does not already cover the
						specialization you need. Start with the role’s purpose, then add defaults that help
						actors assume it.
					{/if}
				</p>
			</div>
			<div class="flex flex-wrap gap-3">
				<AppButton
					type="button"
					variant="neutral"
					disabled={!selectedRole}
					onclick={() => openCreateFromRole(selectedRole)}
				>
					Fork selected role
				</AppButton>
				<AppButton type="button" variant="ghost" onclick={resetCreateDraft}>Clear</AppButton>
			</div>
		</div>

		<form class="space-y-4" method="POST" action="?/createRole">
			{#if createForkSourceRole}
				<div class="rounded-2xl border border-sky-900/60 bg-sky-950/20 p-4">
					<p class="text-sm font-medium text-white">Forking from {createForkSourceRole.name}</p>
					<p class="mt-2 text-sm text-slate-300">
						Keep the shared defaults that still fit, rename the variant, and use
						<span class="font-medium text-white">How this differs</span>
						to explain the split.
					</p>
				</div>
			{/if}

			<div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
				<p class="text-sm font-medium text-white">Basics</p>
				<p class="mt-1 text-sm text-slate-400">
					{#if createForkMode}
						Define how this role variant differs first. Keep defaults only where the source role
						still applies.
					{:else}
						Define the role’s purpose first. Add defaults only if they help actors assume the role
						more consistently.
					{/if}
				</p>
			</div>

			<div class="grid gap-4 lg:grid-cols-5">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
					<input
						class="input text-white"
						name="name"
						placeholder="Technical writer"
						required
						bind:value={createName}
					/>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Area</span>
					<select class="select text-white" name="area" bind:value={createArea}>
						{#each data.roleAreaOptions as area (area)}
							<option value={area}>{formatAreaLabel(area)}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Family</span>
					<input
						class="input text-white"
						name="family"
						list="role-family-options"
						placeholder="Writing"
						bind:value={createFamily}
					/>
					<span class="mt-2 block text-xs text-slate-500">
						Choose one of the shared family labels to keep the catalog comparable.
					</span>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Catalog state</span>
					<select
						class="select text-white"
						name="lifecycleStatus"
						bind:value={createLifecycleStatus}
					>
						{#each CATALOG_LIFECYCLE_STATUS_OPTIONS as lifecycleStatus (lifecycleStatus)}
							<option value={lifecycleStatus}>
								{formatCatalogLifecycleStatusLabel(lifecycleStatus)}
							</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Successor role</span>
					<select
						class="select text-white"
						name="supersededByRoleId"
						bind:value={createSupersededByRoleId}
					>
						<option value="">No successor</option>
						{#each createSuccessorOptions as roleOption (roleOption.id)}
							<option value={roleOption.id}>{roleOption.name}</option>
						{/each}
					</select>
					<span class="mt-2 block text-xs text-slate-500">
						Successors should stay active or draft so new routing has a safe default.
					</span>
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Use when</span>
				<textarea
					class="textarea min-h-28 text-white"
					name="description"
					placeholder="Use this role when the task needs..."
					required
					bind:value={createDescription}
				></textarea>
			</label>

			<div class="grid gap-4 lg:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Forked from</span>
					<select class="select text-white" name="sourceRoleId" bind:value={createSourceRoleId}>
						<option value="">No source role</option>
						{#each data.roles as roleOption (roleOption.id)}
							<option value={roleOption.id}>{roleOption.name}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">How this differs</span>
					<textarea
						class="textarea min-h-28 text-white"
						name="forkReason"
						placeholder="Explain why this role should exist separately from its source."
						bind:value={createForkReason}
					></textarea>
				</label>
			</div>

			<details
				class="rounded-2xl border border-slate-800 bg-slate-900/45 p-4"
				bind:open={createAdvancedOpen}
			>
				<summary class="cursor-pointer text-sm font-medium text-white">
					Add defaults and governance
				</summary>
				<p class="mt-3 text-sm text-slate-400">
					These settings are optional. Add them when the role needs stable defaults beyond its
					purpose statement.
				</p>

				<div class="mt-4 grid gap-4 lg:grid-cols-3">
					<TokenizedListInput
						label="Skills"
						name="skillIds"
						inputId="create-role-skill-ids"
						bind:items={createSkillIds}
						placeholder="Type a skill and press Enter"
						helperText="Skills the role should assume by default."
						emptyText="No default skills listed."
						suggestions={knownSkillIds}
					/>

					<TokenizedListInput
						label="Tools"
						name="toolIds"
						inputId="create-role-tool-ids"
						bind:items={createToolIds}
						placeholder="Type a tool and press Enter"
						helperText="Tools or execution modes this role expects."
						emptyText="No default tools listed."
						suggestions={knownToolIds}
					/>

					<TokenizedListInput
						label="MCPs"
						name="mcpIds"
						inputId="create-role-mcp-ids"
						bind:items={createMcpIds}
						placeholder="Type an MCP and press Enter"
						helperText="Preferred MCP integrations for this role."
						emptyText="No preferred MCPs listed."
						suggestions={knownMcpIds}
					/>
				</div>

				<div class="mt-4 grid gap-4 lg:grid-cols-2">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">System prompt</span>
						<textarea
							class="textarea min-h-32 text-white placeholder:text-slate-500"
							name="systemPrompt"
							placeholder="Act as a senior technical writer. Optimize for clarity, accuracy, and maintainable docs."
							bind:value={createSystemPrompt}
						></textarea>
					</label>

					<TokenizedListInput
						label="Quality checklist"
						name="qualityChecklist"
						inputId="create-role-quality-checklist"
						bind:items={createQualityChecklist}
						placeholder="Type a check and press Enter"
						helperText="Checks used to judge the role’s output."
						emptyText="No checklist defaults saved."
						suggestions={knownChecklistItems}
					/>
				</div>

				<div class="mt-4 grid gap-4 lg:grid-cols-2">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Approval policy</span>
						<textarea
							class="textarea min-h-28 text-white placeholder:text-slate-500"
							name="approvalPolicy"
							placeholder="Require human approval before publishing externally visible docs."
							bind:value={createApprovalPolicy}
						></textarea>
					</label>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Escalation policy</span>
						<textarea
							class="textarea min-h-28 text-white placeholder:text-slate-500"
							name="escalationPolicy"
							placeholder="Escalate to a domain owner if sources conflict or the task introduces policy risk."
							bind:value={createEscalationPolicy}
						></textarea>
					</label>
				</div>
			</details>

			<div class="flex flex-wrap gap-3">
				<AppButton type="submit" variant="primary">Create role</AppButton>
			</div>
		</form>
	</section>
</AppPage>
