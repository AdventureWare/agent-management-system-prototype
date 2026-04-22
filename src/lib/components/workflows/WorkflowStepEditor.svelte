<script lang="ts">
	import AppButton from '$lib/components/AppButton.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';

	type StepDraft = {
		clientId: string;
		title: string;
		desiredRoleId: string;
		summary: string;
		dependsOnStepPositions: number[];
	};

	type RoleOption = {
		id: string;
		name: string;
	};

	type StepField = 'title' | 'desiredRoleId' | 'summary';

	let {
		steps,
		roles,
		onupdate,
		onupdateDependencies,
		onadd,
		onremove
	}: {
		steps: StepDraft[];
		roles: RoleOption[];
		onupdate: (clientId: string, field: StepField, value: string) => void;
		onupdateDependencies: (clientId: string, positions: number[]) => void;
		onadd: () => void;
		onremove: (clientId: string) => void;
	} = $props();

	function toggleDependency(step: StepDraft, dependencyPosition: number, checked: boolean) {
		const nextPositions = checked
			? [...new Set([...step.dependsOnStepPositions, dependencyPosition])]
			: step.dependsOnStepPositions.filter((position) => position !== dependencyPosition);

		onupdateDependencies(
			step.clientId,
			[...nextPositions].sort((left, right) => left - right)
		);
	}
</script>

<div class="space-y-3">
	{#each steps as step, index (step.clientId)}
		<div class="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-sm font-medium text-white">Step {index + 1}</p>
				<AppButton
					type="button"
					size="sm"
					variant="ghost"
					disabled={steps.length === 1}
					onclick={() => onremove(step.clientId)}
				>
					Remove
				</AppButton>
			</div>

			<div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Step title</span>
					<input
						class="input text-white"
						name="stepTitle"
						required
						value={step.title}
						onchange={(event) => onupdate(step.clientId, 'title', event.currentTarget.value)}
					/>
				</label>

				<RolePicker
					label="Default role"
					inputId={`workflow-step-role-${step.clientId}`}
					value={step.desiredRoleId}
					helperText="Optional. Sets the default specialization for this step."
					onchange={(nextValue) => onupdate(step.clientId, 'desiredRoleId', nextValue)}
					{roles}
				/>
			</div>

			<label class="mt-4 block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Step summary</span>
				<textarea
					class="textarea min-h-24 text-white"
					name="stepSummary"
					onchange={(event) => onupdate(step.clientId, 'summary', event.currentTarget.value)}
					>{step.summary}</textarea
				>
			</label>

			<input
				type="hidden"
				name="stepDependsOnStepPositions"
				value={step.dependsOnStepPositions.join(',')}
			/>

			{#if index > 0}
				<div class="mt-4 space-y-3">
					<div>
						<span class="block text-sm font-medium text-slate-200">Depends on earlier steps</span>
						<span class="mt-2 block text-xs text-slate-500">
							Leave every dependency unchecked to allow this step to start in parallel.
						</span>
					</div>
					<div class="grid gap-2">
						{#each steps.slice(0, index) as earlierStep, earlierIndex (earlierStep.clientId)}
							<label
								class="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-2"
							>
								<input
									type="checkbox"
									checked={step.dependsOnStepPositions.includes(earlierIndex + 1)}
									onchange={(event) =>
										toggleDependency(step, earlierIndex + 1, event.currentTarget.checked)}
								/>
								<span class="min-w-0 text-sm text-slate-300">
									<span class="font-medium text-white">Step {earlierIndex + 1}</span>
									<span class="ml-1">{earlierStep.title || 'Untitled step'}</span>
								</span>
							</label>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/each}

	<AppButton type="button" variant="ghost" onclick={onadd}>Add step</AppButton>
</div>
