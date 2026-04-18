<script lang="ts">
	import { Progress } from '@skeletonlabs/skeleton-svelte';
	import AppButton from '$lib/components/AppButton.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let { data, form } = $props();
	let selectedRoleId = $state('');

	let staffedRoleCount = $derived(
		data.roles.filter((role) => role.executionSurfaceCount > 0).length
	);
	let queuedTaskCount = $derived(data.roles.reduce((count, role) => count + role.taskCount, 0));
	let maxExecutionSurfaceCount = $derived(
		Math.max(1, ...data.roles.map((role) => role.executionSurfaceCount))
	);
	let maxTaskCount = $derived(Math.max(1, ...data.roles.map((role) => role.taskCount)));
	let createRoleSuccess = $derived(form?.ok && form?.successAction === 'createRole');
	let updateRoleSuccess = $derived(form?.ok && form?.successAction === 'updateRole');
	let selectedRole = $derived(
		data.roles.find((role) => role.id === selectedRoleId) ?? data.roles[0] ?? null
	);

	$effect(() => {
		const submittedRoleId = form?.roleId ?? '';
		const fallbackRoleId = data.roles[0]?.id ?? '';
		const hasSelectedRole = data.roles.some((role) => role.id === selectedRoleId);

		if (submittedRoleId && submittedRoleId !== selectedRoleId) {
			selectedRoleId = submittedRoleId;
			return;
		}

		if (!selectedRoleId || !hasSelectedRole) {
			selectedRoleId = fallbackRoleId;
		}
	});

	function formatAreaLabel(value: string) {
		if (value === 'shared') {
			return 'Shared';
		}

		return value.replace(/\b\w/g, (character) => character.toUpperCase());
	}

	function formatListField(values?: string[]) {
		return values?.join(', ') ?? '';
	}
</script>

<AppPage width="full">
	<PageHeader
		eyebrow="Roles"
		title="Assignment model"
		description="Roles describe the specialized mode a task should run in. A task should request a role such as technical writer or security analyst, while execution surfaces advertise which roles they can support."
	/>

	{#if form?.message}
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

	<div class="grid gap-4 md:grid-cols-3">
		<MetricCard
			label="Cataloged roles"
			value={data.roles.length}
			detail="Distinct specializations execution surfaces can advertise against."
		/>
		<MetricCard
			label="Staffed roles"
			value={staffedRoleCount}
			detail="Roles with at least one registered execution surface."
		/>
		<MetricCard
			label="Queued demand"
			value={queuedTaskCount}
			detail="Tasks waiting to land on an explicit role."
		/>
	</div>

	<section class="ui-panel space-y-5">
		<div class="max-w-3xl">
			<h2 class="text-xl font-semibold text-white">Create role</h2>
			<p class="mt-2 text-sm text-slate-400">
				Define the specialization bundle a task can request. These defaults are where role-level
				skills, MCPs, tools, prompt scaffolding, and review policies should live.
			</p>
		</div>

		<form class="space-y-4" method="POST" action="?/createRole">
			<div class="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,220px)_minmax(0,1fr)]">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
					<input class="input text-white" name="name" placeholder="Technical writer" required />
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Area</span>
					<select class="select text-white" name="area">
						{#each data.roleAreaOptions as area (area)}
							<option value={area}>{formatAreaLabel(area)}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Description</span>
					<input
						class="input text-white"
						name="description"
						placeholder="Produces clear release notes, setup guides, and operator-facing docs."
						required
					/>
				</label>
			</div>

			<div class="grid gap-4 lg:grid-cols-3">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Skills</span>
					<input
						class="input text-white"
						name="skillIds"
						placeholder="documentation-writing, writing"
					/>
					<span class="mt-2 block text-xs text-slate-500">
						Comma-separated skills the role should assume by default.
					</span>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Tools</span>
					<input class="input text-white" name="toolIds" placeholder="codex, playwright" />
					<span class="mt-2 block text-xs text-slate-500">
						Comma-separated tools or execution modes this role expects.
					</span>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">MCPs</span>
					<input class="input text-white" name="mcpIds" placeholder="github, vercel" />
					<span class="mt-2 block text-xs text-slate-500">
						Comma-separated MCP integrations the role should reach for first.
					</span>
				</label>
			</div>

			<div class="grid gap-4 lg:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">System prompt</span>
					<textarea
						class="textarea min-h-32 text-white placeholder:text-slate-500"
						name="systemPrompt"
						placeholder="Act as a senior technical writer. Optimize for clarity, accuracy, and maintainable docs."
					></textarea>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Quality checklist</span>
					<textarea
						class="textarea min-h-32 text-white placeholder:text-slate-500"
						name="qualityChecklist"
						placeholder="accurate, source-backed, concise, copy-pasteable"
					></textarea>
					<span class="mt-2 block text-xs text-slate-500">
						Comma-separated checks used to judge the role’s output.
					</span>
				</label>
			</div>

			<div class="grid gap-4 lg:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Approval policy</span>
					<textarea
						class="textarea min-h-28 text-white placeholder:text-slate-500"
						name="approvalPolicy"
						placeholder="Require human approval before publishing externally visible docs."
					></textarea>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Escalation policy</span>
					<textarea
						class="textarea min-h-28 text-white placeholder:text-slate-500"
						name="escalationPolicy"
						placeholder="Escalate to a domain owner if sources conflict or the task introduces policy risk."
					></textarea>
				</label>
			</div>

			<div class="flex flex-wrap gap-3">
				<AppButton type="submit" variant="primary">Create role</AppButton>
			</div>
		</form>
	</section>

	<section class="ui-panel">
		<div class="flex flex-col gap-2">
			<h2 class="text-xl font-semibold text-white">Role registry</h2>
			<p class="max-w-3xl text-sm text-slate-400">
				Use this page to compare staffing and demand across roles before drilling into execution
				surfaces and tasks.
			</p>
		</div>

		<div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
			<div class="space-y-3">
				{#each data.roles as role (role.id)}
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
						<div class="flex flex-wrap items-center gap-3">
							<h2 class="text-lg font-semibold text-white">{role.name}</h2>
							<span
								class="badge border border-slate-700 bg-slate-900/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
							>
								Area · {formatAreaLabel(role.area)}
							</span>
						</div>
						<p class="mt-3 text-sm text-slate-300">{role.description}</p>
						<div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
							<span class="rounded-full border border-slate-800 px-2.5 py-1">
								{role.executionSurfaceCount} surfaces
							</span>
							<span class="rounded-full border border-slate-800 px-2.5 py-1">
								{role.taskCount} tasks
							</span>
							<span class="rounded-full border border-slate-800 px-2.5 py-1">
								{role.skillIds?.length ?? 0} skills
							</span>
						</div>
					</button>
				{/each}
			</div>

			{#if selectedRole}
				<div class="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/55 p-5">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-[11px] tracking-[0.24em] text-slate-500 uppercase">Selected role</p>
							<h3 class="mt-2 text-2xl font-semibold text-white">{selectedRole.name}</h3>
							<p class="mt-2 max-w-3xl text-sm text-slate-300">{selectedRole.description}</p>
						</div>
						<span
							class="badge border border-slate-700 bg-slate-900/70 text-[0.7rem] tracking-[0.2em] text-slate-300 uppercase"
						>
							Area · {formatAreaLabel(selectedRole.area)}
						</span>
					</div>

					<div class="grid gap-4 lg:grid-cols-2">
						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm font-medium text-slate-200">Execution-surface coverage</p>
								<p class="text-sm text-slate-400">
									{selectedRole.executionSurfaceCount} execution surfaces
								</p>
							</div>
							<Progress
								max={maxExecutionSurfaceCount}
								value={selectedRole.executionSurfaceCount}
								class="mt-3 space-y-2"
							>
								<Progress.Track class="h-2 overflow-hidden rounded-full bg-slate-800">
									<Progress.Range class="h-full rounded-full bg-sky-400" />
								</Progress.Track>
								<Progress.ValueText class="text-xs text-slate-500">
									{selectedRole.executionSurfaceCount} of {maxExecutionSurfaceCount} currently registered
								</Progress.ValueText>
							</Progress>
						</div>

						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm font-medium text-slate-200">Task demand</p>
								<p class="text-sm text-slate-400">{selectedRole.taskCount} tasks</p>
							</div>
							<Progress max={maxTaskCount} value={selectedRole.taskCount} class="mt-3 space-y-2">
								<Progress.Track class="h-2 overflow-hidden rounded-full bg-slate-800">
									<Progress.Range class="h-full rounded-full bg-fuchsia-400" />
								</Progress.Track>
								<Progress.ValueText class="text-xs text-slate-500">
									{selectedRole.taskCount} of {maxTaskCount} queued against this role
								</Progress.ValueText>
							</Progress>
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-3">
						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Skills</p>
							<p class="mt-2 text-sm text-white">{selectedRole.skillIds?.length ?? 0}</p>
						</div>
						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">Tools</p>
							<p class="mt-2 text-sm text-white">{selectedRole.toolIds?.length ?? 0}</p>
						</div>
						<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
							<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">MCPs</p>
							<p class="mt-2 text-sm text-white">{selectedRole.mcpIds?.length ?? 0}</p>
						</div>
					</div>

					<form class="space-y-4" method="POST" action="?/updateRole">
						<input type="hidden" name="roleId" value={selectedRole.id} />

						<div class="grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,200px)_minmax(0,1fr)]">
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Name</span>
								<input class="input text-white" name="name" required value={selectedRole.name} />
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Area</span>
								<select class="select text-white" name="area">
									{#each data.roleAreaOptions as area (area)}
										<option selected={selectedRole.area === area} value={area}>
											{formatAreaLabel(area)}
										</option>
									{/each}
								</select>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Description</span>
								<input
									class="input text-white"
									name="description"
									required
									value={selectedRole.description}
								/>
							</label>
						</div>

						<div class="grid gap-4 lg:grid-cols-3">
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Skills</span>
								<input
									class="input text-white"
									name="skillIds"
									value={formatListField(selectedRole.skillIds)}
								/>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Tools</span>
								<input
									class="input text-white"
									name="toolIds"
									value={formatListField(selectedRole.toolIds)}
								/>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">MCPs</span>
								<input
									class="input text-white"
									name="mcpIds"
									value={formatListField(selectedRole.mcpIds)}
								/>
							</label>
						</div>

						<div class="grid gap-4 lg:grid-cols-2">
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">System prompt</span>
								<textarea class="textarea min-h-32 text-white" name="systemPrompt"
									>{selectedRole.systemPrompt ?? ''}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Quality checklist
								</span>
								<textarea class="textarea min-h-32 text-white" name="qualityChecklist"
									>{formatListField(selectedRole.qualityChecklist)}</textarea
								>
							</label>
						</div>

						<div class="grid gap-4 lg:grid-cols-2">
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Approval policy</span>
								<textarea class="textarea min-h-28 text-white" name="approvalPolicy"
									>{selectedRole.approvalPolicy ?? ''}</textarea
								>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">
									Escalation policy
								</span>
								<textarea class="textarea min-h-28 text-white" name="escalationPolicy"
									>{selectedRole.escalationPolicy ?? ''}</textarea
								>
							</label>
						</div>

						<div class="flex flex-wrap gap-3">
							<AppButton type="submit" variant="primary">Save role</AppButton>
						</div>
					</form>
				</div>
			{/if}
		</div>
	</section>
</AppPage>
