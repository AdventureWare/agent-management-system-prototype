<script lang="ts">
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import TokenizedListInput from '$lib/components/TokenizedListInput.svelte';
	import { buildRelatedRoles, formatRoleAreaLabel } from '$lib/roles/related-roles';
	import {
		CATALOG_LIFECYCLE_STATUS_OPTIONS,
		formatCatalogLifecycleStatusLabel
	} from '$lib/types/control-plane';
	import type { CatalogLifecycleStatus } from '$lib/types/control-plane';
	import type { PageData } from './$types';

	type RoleDirectoryEntry = (typeof data.roles)[number];
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
	type RelatedRole = {
		role: RoleDirectoryEntry;
		score: number;
		reason: string;
		purposeSummary: string;
		contrastSummary: string;
	};
	type RoleFormState = {
		ok?: boolean;
		successAction?: string;
		formContext?: 'updateRole';
		roleId?: string;
		values?: RoleDraftSource;
		message?: string;
	};

	let { data, form }: { data: PageData; form: RoleFormState | null } = $props();

	function hasDraftValues(value: RoleFormState | null): value is RoleFormState & {
		formContext: 'updateRole';
		roleId: string;
		values: RoleDraftSource;
	} {
		return Boolean(
			value && typeof value === 'object' && 'formContext' in value && 'values' in value
		);
	}

	let selectedRole = $derived(data.role);
	let editPanelOpen = $state(false);
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
	let updateRoleSuccess = $derived(form?.ok && form?.successAction === 'updateRole');
	let selectedRoleReferences = $derived(
		selectedRole.taskCount +
			selectedRole.templateCount +
			selectedRole.workflowCount +
			selectedRole.executionSurfaceCount
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
	let knownFamilies = $derived(
		[...new Set(data.roles.map((role) => role.family?.trim() ?? '').filter(Boolean))].sort((a, b) =>
			a.localeCompare(b)
		)
	);
	let sourceRole = $derived(
		selectedRole.sourceRoleId
			? (data.roles.find((role) => role.id === selectedRole.sourceRoleId) ?? null)
			: null
	);
	let supersededByRole = $derived(
		selectedRole.supersededByRoleId
			? (data.roles.find((role) => role.id === selectedRole.supersededByRoleId) ?? null)
			: null
	);
	let relatedRoles = $derived.by(() => buildRelatedRoles(selectedRole, data.roles, 4));

	$effect(() => {
		if (updateRoleSuccess || form?.formContext === 'updateRole') {
			editPanelOpen = true;
		}
	});

	$effect(() => {
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

	function formatRoleSummary(role: RoleDirectoryEntry) {
		return [
			`${role.taskCount} task reference${role.taskCount === 1 ? '' : 's'}`,
			`${role.templateCount} template reference${role.templateCount === 1 ? '' : 's'}`,
			`${role.workflowCount} workflow reference${role.workflowCount === 1 ? '' : 's'}`,
			`${role.executionSurfaceCount} surface link${role.executionSurfaceCount === 1 ? '' : 's'}`
		].join(' · ');
	}
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Role detail"
		title={selectedRole.name}
		description={selectedRole.description}
	/>

	{#if form?.message}
		<p class="ui-notice border border-rose-900/70 bg-rose-950/40 text-rose-200">
			{form.message}
		</p>
	{/if}

	{#if updateRoleSuccess}
		<p class="ui-notice border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
			Role updated.
		</p>
	{/if}

	<div class="flex flex-wrap gap-3">
		<AppButton href={`/app/roles?role=${selectedRole.id}`} variant="neutral">
			Back to directory
		</AppButton>
		<AppButton type="button" variant="ghost" onclick={() => (editPanelOpen = true)}>
			Edit here
		</AppButton>
	</div>

	<div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<MetricCard
			label="Task references"
			value={selectedRole.taskCount}
			detail="Tasks currently asking an actor to assume this role."
		/>
		<MetricCard
			label="Template references"
			value={selectedRole.templateCount}
			detail="Saved task templates that default to this role."
		/>
		<MetricCard
			label="Workflow references"
			value={selectedRole.workflowCount}
			detail="Workflow steps that route through this role."
		/>
		<MetricCard
			label="Surface links"
			value={selectedRole.executionSurfaceCount}
			detail="Execution surfaces that currently advertise support for this role."
		/>
	</div>

	<section class="ui-panel mt-6 space-y-6">
		<datalist id="role-family-options">
			{#each knownFamilies as family (family)}
				<option value={family}></option>
			{/each}
		</datalist>

		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<p class="text-[11px] tracking-[0.24em] text-slate-500 uppercase">Role purpose and fit</p>
				<h2 class="mt-2 text-2xl font-semibold text-white">{selectedRole.name}</h2>
				<p class="mt-2 max-w-3xl text-sm text-slate-300">{selectedRole.description}</p>
			</div>
			<div class="space-y-2 text-right">
				<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">
					Area · {formatAreaLabel(selectedRole.area)}
				</p>
				{#if selectedRole.family?.trim()}
					<p class="text-xs tracking-[0.16em] text-slate-500 uppercase">
						Family · {selectedRole.family}
					</p>
				{/if}
				{#if (selectedRole.lifecycleStatus ?? 'active') !== 'active'}
					<p class="text-xs tracking-[0.16em] text-amber-300 uppercase">
						{formatCatalogLifecycleStatusLabel(selectedRole.lifecycleStatus ?? 'active')}
					</p>
				{/if}
				<p class="text-xs text-slate-500">{formatRoleSummary(selectedRole)}</p>
			</div>
		</div>

		{#if sourceRole || selectedRole.forkReason || supersededByRole}
			<div class="grid gap-4 xl:grid-cols-3">
				{#if sourceRole}
					<div class="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Forked from
						</p>
						<p class="mt-2 text-sm text-white">
							<a
								class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
								href={`/app/roles/${sourceRole.id}`}
							>
								{sourceRole.name}
							</a>
						</p>
					</div>
				{/if}
				{#if selectedRole.forkReason}
					<div class="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							How this differs
						</p>
						<p class="mt-2 text-sm text-slate-300">{selectedRole.forkReason}</p>
					</div>
				{/if}
				{#if supersededByRole}
					<div class="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
						<p class="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Successor role
						</p>
						<p class="mt-2 text-sm text-white">
							<a
								class="underline decoration-slate-700 underline-offset-4 hover:text-sky-200"
								href={`/app/roles/${supersededByRole.id}`}
							>
								{supersededByRole.name}
							</a>
						</p>
					</div>
				{/if}
			</div>
		{/if}

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
							<a
								class="block rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-left transition hover:border-slate-700 hover:bg-slate-900"
								href={`/app/roles/${relatedRole.role.id}`}
							>
								<div class="flex items-center justify-between gap-3">
									<p class="text-sm font-semibold text-white">{relatedRole.role.name}</p>
									<span class="text-xs text-slate-500">{relatedRole.reason}</span>
								</div>
								<p class="mt-2 text-xs text-slate-500">
									Compare against current: {relatedRole.contrastSummary}
								</p>
								<p class="mt-2 text-sm text-slate-400">{relatedRole.purposeSummary}</p>
							</a>
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
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Execution surfaces</p>
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
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Task templates</p>
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
							<p class="mt-2 text-sm text-slate-500">No saved task templates use this role yet.</p>
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
							<p class="mt-2 text-sm text-slate-500">No workflow steps reference this role yet.</p>
						{/if}
					</div>
				</div>
			</div>

			<div class="space-y-4">
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
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">System prompt</p>
							<p class="mt-2 text-sm text-white">
								{selectedRole.systemPrompt || 'No system prompt default saved.'}
							</p>
						</div>
						<div>
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
								Quality checklist
							</p>
							<p class="mt-2 text-sm text-white">
								{formatListField(selectedRole.qualityChecklist) || 'No checklist defaults saved.'}
							</p>
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
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Approval policy</p>
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
							<span class="mb-2 block text-sm font-medium text-slate-200">Successor role</span>
							<select
								class="select text-white"
								name="supersededByRoleId"
								bind:value={updateSupersededByRoleId}
							>
								<option value="">No successor</option>
								{#each data.roles.filter((role) => role.id !== selectedRole.id) as roleOption (roleOption.id)}
									<option value={roleOption.id}>{roleOption.name}</option>
								{/each}
							</select>
						</label>
					</div>

					<label class="block">
						<span class="mb-2 block text-sm font-medium text-slate-200">Use when</span>
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
							<select class="select text-white" name="sourceRoleId" bind:value={updateSourceRoleId}>
								<option value="">No source role</option>
								{#each data.roles.filter((role) => role.id !== selectedRole.id) as roleOption (roleOption.id)}
									<option value={roleOption.id}>{roleOption.name}</option>
								{/each}
							</select>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">How this differs</span>
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
							inputId="role-detail-skill-ids"
							bind:items={updateSkillIds}
							placeholder="Type a skill and press Enter"
							helperText="Skills the role should assume by default."
							emptyText="No default skills listed."
							suggestions={knownSkillIds}
						/>

						<TokenizedListInput
							label="Tools"
							name="toolIds"
							inputId="role-detail-tool-ids"
							bind:items={updateToolIds}
							placeholder="Type a tool and press Enter"
							helperText="Tools or execution modes this role expects."
							emptyText="No default tools listed."
							suggestions={knownToolIds}
						/>

						<TokenizedListInput
							label="MCPs"
							name="mcpIds"
							inputId="role-detail-mcp-ids"
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
							inputId="role-detail-quality-checklist"
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
							<span class="mb-2 block text-sm font-medium text-slate-200">Approval policy</span>
							<textarea
								class="textarea min-h-28 text-white"
								name="approvalPolicy"
								bind:value={updateApprovalPolicy}
							></textarea>
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Escalation policy</span>
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
	</section>
</AppPage>
