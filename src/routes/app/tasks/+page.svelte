<script lang="ts">
	let { data, form } = $props();
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-semibold tracking-[0.24em] text-sky-300 uppercase">Tasks</p>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Queue and assignment</h1>
		<p class="max-w-3xl text-sm text-slate-300">
			Keep this queue strict. Each task should point at one goal, one desired role, one canonical
			artifact path, and explicit governance rules for risk, review, and dependencies.
		</p>
	</div>

	{#if form?.message}
		<p class="rounded-xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
			{form.message}
		</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
		<form
			class="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6"
			method="POST"
			action="?/createTask"
		>
			<h2 class="text-xl font-semibold text-white">Create task</h2>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Title</span>
				<input
					class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					name="title"
					placeholder="Source first outdoor-gear communities"
					required
				/>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Summary</span>
				<textarea
					class="min-h-28 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					name="summary"
					placeholder="Describe the scope, output, and constraints."
					required
				></textarea>
			</label>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Lane</span>
					<select
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
						name="lane"
					>
						{#each data.laneOptions as lane (lane)}
							<option value={lane}>{lane}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Priority</span>
					<select
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
						name="priority"
					>
						{#each data.priorityOptions as priority (priority)}
							<option value={priority}>{priority}</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Risk level</span>
					<select
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
						name="riskLevel"
					>
						{#each data.riskLevelOptions as riskLevel (riskLevel)}
							<option value={riskLevel}>{riskLevel}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="mb-2 block text-sm font-medium text-slate-200">Approval mode</span>
					<select
						class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
						name="approvalMode"
					>
						{#each data.approvalModeOptions as approvalMode (approvalMode)}
							<option value={approvalMode}>{approvalMode}</option>
						{/each}
					</select>
				</label>
			</div>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Goal</span>
				<select
					class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					name="goalId"
				>
					{#each data.goals as goal (goal.id)}
						<option value={goal.id}>{goal.name}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Desired role</span>
				<select
					class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					name="desiredRoleId"
				>
					{#each data.roles as role (role.id)}
						<option value={role.id}>{role.name}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Initial assignee</span>
				<select
					class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					name="assigneeWorkerId"
				>
					<option value="">Unassigned</option>
					{#each data.workers as worker (worker.id)}
						<option value={worker.id}>{worker.name}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Artifact path</span>
				<input
					class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					name="artifactPath"
					placeholder="/absolute/path/to/output.md or folder"
					required
				/>
			</label>

			<label class="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
				<input checked name="requiresReview" type="checkbox" />
				<span class="text-sm text-slate-200">Require review before this task can be treated as done</span>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Dependencies</span>
				<select
					class="min-h-32 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					name="dependencyTaskIds"
					multiple
				>
					{#each data.tasks as dependencyTask (dependencyTask.id)}
						<option value={dependencyTask.id}>{dependencyTask.title}</option>
					{/each}
				</select>
				<p class="mt-2 text-xs text-slate-500">Select tasks that must be done first.</p>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm font-medium text-slate-200">Blocked reason</span>
				<textarea
					class="min-h-24 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
					name="blockedReason"
					placeholder="Leave blank unless the task is currently stuck or pre-blocked."
				></textarea>
			</label>

			<button class="rounded-lg bg-sky-500 px-4 py-2 font-medium text-slate-950" type="submit">
				Create task
			</button>
		</form>

		<section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
			<h2 class="text-xl font-semibold text-white">Current queue</h2>

			<div class="mt-4 space-y-4">
				{#each data.tasks as task (task.id)}
					<form
						class="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
						method="POST"
						action="?/updateTask"
					>
						<input name="taskId" type="hidden" value={task.id} />

						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<h3 class="font-medium text-white">{task.title}</h3>
								<p class="mt-1 text-sm text-slate-300">{task.summary}</p>
							</div>
							<div class="flex items-center gap-2 text-xs uppercase">
								<span class="rounded-full border border-slate-700 px-2 py-1 text-slate-300">
									{task.lane}
								</span>
								<span class="rounded-full border border-slate-700 px-2 py-1 text-slate-300">
									{task.priority}
								</span>
								<span
									class={[
										'rounded-full px-2 py-1',
										task.riskLevel === 'high'
											? 'border border-rose-900/70 bg-rose-950/40 text-rose-300'
											: task.riskLevel === 'medium'
												? 'border border-amber-900/70 bg-amber-950/40 text-amber-300'
												: 'border border-emerald-900/70 bg-emerald-950/40 text-emerald-300'
									]}
								>
									{task.riskLevel}
								</span>
								{#if task.requiresReview}
									<span class="rounded-full border border-sky-800/70 px-2 py-1 text-sky-200">
										review
									</span>
								{/if}
								{#if task.hasUnmetDependencies}
									<span
										class="rounded-full border border-violet-800/70 bg-violet-950/40 px-2 py-1 text-violet-200"
									>
										dependency wait
									</span>
								{/if}
							</div>
						</div>

						<p class="text-xs text-slate-500">
							{task.goalName} · needs {task.roleName} · approval {task.approvalMode} · output {task.artifactPath}
						</p>

						{#if task.blockedReason}
							<p class="text-sm text-rose-200">{task.blockedReason}</p>
						{/if}

						{#if task.dependencyTaskNames.length > 0}
							<p class="text-xs text-slate-400">
								Depends on: {task.dependencyTaskNames.join(', ')}
							</p>
						{/if}

						<div class="grid gap-4 md:grid-cols-2">
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Status</span>
								<select
									class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
									name="status"
									value={task.status}
								>
									{#each data.statusOptions as status (status)}
										<option value={status} selected={task.status === status}>{status}</option>
									{/each}
								</select>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Assignee</span>
								<select
									class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
									name="assigneeWorkerId"
								>
									<option value="" selected={!task.assigneeWorkerId}>Unassigned</option>
									{#each data.workers as worker (worker.id)}
										<option value={worker.id} selected={task.assigneeWorkerId === worker.id}>
											{worker.name}
										</option>
									{/each}
								</select>
							</label>
						</div>

						<div class="grid gap-4 md:grid-cols-2">
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Risk level</span>
								<select
									class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
									name="riskLevel"
								>
									{#each data.riskLevelOptions as riskLevel (riskLevel)}
										<option value={riskLevel} selected={task.riskLevel === riskLevel}>
											{riskLevel}
										</option>
									{/each}
								</select>
							</label>

							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Approval mode</span>
								<select
									class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
									name="approvalMode"
								>
									{#each data.approvalModeOptions as approvalMode (approvalMode)}
										<option value={approvalMode} selected={task.approvalMode === approvalMode}>
											{approvalMode}
										</option>
									{/each}
								</select>
							</label>
						</div>

						<label class="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
							<input checked={task.requiresReview} name="requiresReview" type="checkbox" />
							<span class="text-sm text-slate-200">Require review before completion</span>
						</label>

						<div class="grid gap-4 md:grid-cols-[1fr_auto]">
							<label class="block">
								<span class="mb-2 block text-sm font-medium text-slate-200">Dependencies</span>
								<select
									class="min-h-28 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
									name="dependencyTaskIds"
									multiple
								>
									{#each data.tasks as dependencyTask (dependencyTask.id)}
										{#if dependencyTask.id !== task.id}
											<option
												value={dependencyTask.id}
												selected={task.dependencyTaskIds.includes(dependencyTask.id)}
											>
												{dependencyTask.title}
											</option>
										{/if}
									{/each}
								</select>
							</label>

							<div class="flex items-end">
								<button
									class="w-full rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-100"
									type="submit"
								>
									Save
								</button>
							</div>
						</div>

						<label class="block">
							<span class="mb-2 block text-sm font-medium text-slate-200">Blocked reason</span>
							<textarea
								class="min-h-24 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
								name="blockedReason"
							>{task.blockedReason}</textarea>
						</label>

						<p class="text-xs text-slate-500">Current assignee: {task.assigneeName}</p>
					</form>
				{/each}
			</div>
		</section>
	</div>
</section>
