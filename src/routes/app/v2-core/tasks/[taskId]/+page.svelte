<script lang="ts">
	import { resolve } from '$app/paths';
	import AppPage from '$lib/components/AppPage.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let { data, form } = $props();

	let detail = $derived(data.taskDetail);
	let task = $derived(detail.task);
	let isReadOnly = $derived(data.mode === 'read');
	let contextSources = $derived(data.contextBundle?.includedSources ?? []);
	let readiness = $derived(data.contextBundle?.readiness ?? null);
	let dependencySummary = $derived(data.dependencyReport.summary);
	let currentRuns = $derived(detail.runs.filter((run) => run.endedAt === null));

	function taskHref(taskId: string) {
		if (isReadOnly) {
			return resolve(`/app/v2-core/tasks/${taskId}?mode=read`);
		}

		return resolve(`/app/v2-core/tasks/${taskId}`);
	}

	function packetCommand(taskId: string) {
		return `npm run v2:core-db -- agent-work-packet --task ${taskId} --json`;
	}

	function closeoutCommand(taskId: string, runId: string) {
		return `npm run v2:core-db -- managed-run-lifecycle --mode complete --task ${taskId} --run ${runId}`;
	}
</script>

<AppPage>
	<div class="v2-core-task-page">
		<PageHeader
			eyebrow="AMS v2 core task"
			title={task.title}
			description={task.summary}
			density="compact"
		/>

		<section class="v2-task-metrics" aria-label="Task evidence counts">
			<MetricCard label="Status" value={task.status} density="compact" />
			<MetricCard label="Runs" value={detail.runs.length} density="compact" />
			<MetricCard label="Artifacts" value={detail.artifacts.length} density="compact" />
			<MetricCard label="Reviews" value={detail.reviews.length} density="compact" />
			<MetricCard label="Decisions" value={detail.decisions.length} density="compact" />
			<MetricCard label="Context sources" value={contextSources.length} density="compact" />
		</section>

		{#if form?.message}
			<p class={['v2-task-form-message', form.ok === false && 'v2-task-form-message-error']}>
				{form.message}
			</p>
		{/if}

		{#if isReadOnly}
			<section class="v2-task-read-only" aria-label="Read-only task inspection">
				<div>
					<p>Read-only inspection</p>
					<span>Mutation controls are hidden for remote or mobile review.</span>
				</div>
				<a href={resolve(`/app/v2-core/tasks/${task.id}`)}>Enable actions</a>
			</section>
		{/if}

		<section class="v2-task-grid">
			<section class="v2-task-panel" aria-labelledby="task-contract">
				<header class="v2-task-panel-header">
					<h2 id="task-contract">Task contract</h2>
					<span>{task.id}</span>
				</header>
				<div class="v2-task-body">
					<div class="v2-task-fact">
						<span>Project</span>
						<strong>{detail.project.name}</strong>
					</div>
					<div class="v2-task-fact">
						<span>Goal</span>
						<strong>{detail.goal.title}</strong>
					</div>
					<div class="v2-task-text-block">
						<span>Success criteria</span>
						<p>{task.successCriteria}</p>
					</div>
					<div class="v2-task-text-block">
						<span>Validation plan</span>
						<p>{task.validationPlan}</p>
					</div>
				</div>
			</section>

			{#if currentRuns.length}
				<section class="v2-task-panel" aria-labelledby="task-run-handoff">
					<header class="v2-task-panel-header">
						<h2 id="task-run-handoff">Run handoff</h2>
						<span>{currentRuns.length} current</span>
					</header>
					<div class="v2-task-list">
						{#each currentRuns as run (run.id)}
							<article class="v2-task-handoff">
								<div class="v2-task-handoff-header">
									<div>
										<p class="v2-task-row-title">{run.id}</p>
										<p class="v2-task-row-meta">{run.status} · {run.modelProviderName ?? 'No provider'}</p>
									</div>
									<span class="v2-task-badge">{run.modelProviderKind ?? 'provider'}</span>
								</div>
								<div class="v2-task-command-block">
									<span>Agent work packet</span>
									<code>{packetCommand(task.id)}</code>
								</div>
								<div class="v2-task-command-block">
									<span>Closeout command</span>
									<code>{closeoutCommand(task.id, run.id)}</code>
								</div>
								<p class="v2-task-inline-note">
									{'Closeout needs result evidence, validation evidence, a submitted artifact, review, and an acceptance decision before this task is done.'}
								</p>
								{#if !isReadOnly}
									<form
										method="POST"
										action="?/closeoutDispatchedRun"
										class="v2-task-evidence-form v2-task-closeout-form"
									>
										<input type="hidden" name="runId" value={run.id} />
										<label>
											<span>Result summary</span>
											<textarea
												name="resultSummary"
												rows="3"
												placeholder="What changed or was produced"
												required
											></textarea>
										</label>
										<label>
											<span>Validation summary</span>
											<textarea
												name="validationSummary"
												rows="2"
												placeholder="Tests, inspection, or review evidence"
												required
											></textarea>
										</label>
										<div class="v2-task-form-grid">
											<label>
												<span>Artifact title</span>
												<input name="artifactTitle" type="text" placeholder="Artifact name" required />
											</label>
											<label>
												<span>Artifact role</span>
												<select name="artifactRole">
													{#each data.artifactRoles as role (role)}
														<option value={role}>{role}</option>
													{/each}
												</select>
											</label>
										</div>
										<label>
											<span>Artifact URI</span>
											<input name="artifactUri" type="text" placeholder="git://commit/abc123" required />
										</label>
										<label>
											<span>Artifact summary</span>
											<textarea name="artifactSummary" rows="2" placeholder="Optional artifact note"
											></textarea>
										</label>
										<label>
											<span>Review summary</span>
											<textarea
												name="reviewSummary"
												rows="2"
												placeholder="Why this output is reviewable"
												required
											></textarea>
										</label>
										<label>
											<span>Acceptance rationale</span>
											<textarea
												name="acceptanceRationale"
												rows="2"
												placeholder="Why this satisfies the task contract"
												required
											></textarea>
										</label>
										<button type="submit">Close out run</button>
									</form>
								{/if}
							</article>
						{/each}
					</div>
				</section>
			{/if}

			<section class="v2-task-panel" aria-labelledby="task-actions">
				<header class="v2-task-panel-header">
					<h2 id="task-actions">Available actions</h2>
					{#if readiness}
						<span>{readiness.status}</span>
					{/if}
				</header>
				<div class="v2-task-list">
					{#each data.availableActions as action (action.id)}
						<article class="v2-task-row">
							<div>
								<p class="v2-task-row-title">{action.label}</p>
								<p class="v2-task-row-meta">{action.reason}</p>
							</div>
							{#if action.status === 'available' && !isReadOnly}
								<form method="POST" action="?/applyTaskAction" class="v2-task-action-form">
									<input type="hidden" name="actionId" value={action.id} />
									<label>
										<span>Summary</span>
										<textarea
											name="summary"
											rows="2"
											placeholder="Optional action note"
											aria-label={`${action.label} summary`}
										></textarea>
									</label>
									<button type="submit">{action.label}</button>
								</form>
							{:else}
								<span class={['v2-task-badge', `v2-task-badge-${action.status}`]}>
									{isReadOnly && action.status === 'available' ? 'read-only' : action.status}
								</span>
							{/if}
						</article>
					{/each}
				</div>
			</section>

			{#if !isReadOnly}
				<section class="v2-task-panel" aria-labelledby="task-run-evidence">
					<header class="v2-task-panel-header">
						<h2 id="task-run-evidence">Record run evidence</h2>
						<span>run + artifact</span>
					</header>
					<form method="POST" action="?/recordRunEvidence" class="v2-task-evidence-form">
						<label>
							<span>Input summary</span>
							<textarea
								name="inputSummary"
								rows="2"
								placeholder="Optional context or prompt summary"
							></textarea>
						</label>
						<label>
							<span>Action summary</span>
							<textarea name="actionSummary" rows="3" placeholder="What work was attempted" required
							></textarea>
						</label>
						<label>
							<span>Result summary</span>
							<textarea
								name="resultSummary"
								rows="3"
								placeholder="What changed or was produced"
								required
							></textarea>
						</label>
						<label>
							<span>Validation summary</span>
							<textarea
								name="validationSummary"
								rows="2"
								placeholder="Optional test, review, or inspection result"
							></textarea>
						</label>
						<div class="v2-task-form-grid">
							<label>
								<span>Artifact title</span>
								<input name="artifactTitle" type="text" placeholder="Artifact name" required />
							</label>
							<label>
								<span>Artifact role</span>
								<select name="artifactRole">
									{#each data.artifactRoles as role (role)}
										<option value={role}>{role}</option>
									{/each}
								</select>
							</label>
						</div>
						<label>
							<span>Artifact URI</span>
							<input
								name="artifactUri"
								type="text"
								placeholder="repo://path/to/artifact"
								required
							/>
						</label>
						<label>
							<span>Artifact summary</span>
							<textarea name="artifactSummary" rows="2" placeholder="Optional artifact description"
							></textarea>
						</label>
						<button type="submit">Record evidence</button>
					</form>
				</section>
			{/if}

			<section class="v2-task-panel" aria-labelledby="task-context">
				<header class="v2-task-panel-header">
					<h2 id="task-context">Context bundle</h2>
					{#if readiness}
						<span>{readiness.canStart ? 'can start' : 'not startable'}</span>
					{/if}
				</header>
				{#if readiness}
					<p class="v2-task-inline-note">{readiness.reason}</p>
				{/if}
				{#if contextSources.length}
					<div class="v2-task-list">
						{#each contextSources as source (`${source.recordType}:${source.recordId}`)}
							<article class="v2-task-row">
								<div>
									<p class="v2-task-row-title">{source.title}</p>
									<p class="v2-task-row-meta">{source.reason}</p>
								</div>
								<span class="v2-task-badge">{source.recordType}</span>
							</article>
						{/each}
					</div>
				{:else}
					<p class="v2-task-empty">No context sources</p>
				{/if}
			</section>

			<section class="v2-task-panel" aria-labelledby="task-runs">
				<header class="v2-task-panel-header">
					<h2 id="task-runs">Runs</h2>
					<span>{detail.runs.length}</span>
				</header>
				{#if detail.runs.length}
					<div class="v2-task-list">
						{#each detail.runs as run (run.id)}
							<article class="v2-task-row">
								<div>
									<p class="v2-task-row-title">{run.id}</p>
									<p class="v2-task-row-meta">{run.resultSummary}</p>
									<p class="v2-task-row-meta">{run.validationSummary}</p>
								</div>
								<div class="v2-task-row-side">
									<span class="v2-task-badge">{run.status}</span>
									<span>{run.modelProviderName ?? 'No provider'}</span>
								</div>
							</article>
						{/each}
					</div>
				{:else}
					<p class="v2-task-empty">No runs</p>
				{/if}
			</section>

			<section class="v2-task-panel" aria-labelledby="task-artifacts">
				<header class="v2-task-panel-header">
					<h2 id="task-artifacts">Artifacts</h2>
					<span>{detail.artifacts.length}</span>
				</header>
				{#if detail.artifacts.length}
					<div class="v2-task-list">
						{#each detail.artifacts as artifact (artifact.id)}
							<article class="v2-task-row">
								<div>
									<p class="v2-task-row-title">{artifact.title}</p>
									<p class="v2-task-row-meta">{artifact.uri}</p>
								</div>
								<div class="v2-task-row-side">
									<span class="v2-task-badge">{artifact.status}</span>
									<span>{artifact.role}</span>
								</div>
							</article>
						{/each}
					</div>
				{:else}
					<p class="v2-task-empty">No artifacts</p>
				{/if}
			</section>

			<section class="v2-task-panel" aria-labelledby="task-reviews">
				<header class="v2-task-panel-header">
					<h2 id="task-reviews">Reviews</h2>
					<span>{detail.reviews.length}</span>
				</header>
				{#if detail.reviews.length}
					<div class="v2-task-list">
						{#each detail.reviews as review (review.id)}
							<article class="v2-task-row">
								<div>
									<p class="v2-task-row-title">{review.summary}</p>
									<p class="v2-task-row-meta">{review.id}</p>
								</div>
								<span class="v2-task-badge">{review.status}</span>
							</article>
						{/each}
					</div>
				{:else}
					<p class="v2-task-empty">No reviews</p>
				{/if}
			</section>

			<section class="v2-task-panel" aria-labelledby="task-decisions">
				<header class="v2-task-panel-header">
					<h2 id="task-decisions">Decisions</h2>
					<span>{detail.decisions.length}</span>
				</header>
				{#if detail.decisions.length}
					<div class="v2-task-list">
						{#each detail.decisions as decision (decision.id)}
							<article class="v2-task-row">
								<div>
									<p class="v2-task-row-title">{decision.summary}</p>
									<p class="v2-task-row-meta">{decision.rationale}</p>
								</div>
								<span class="v2-task-badge">{decision.decisionType}</span>
							</article>
						{/each}
					</div>
				{:else}
					<p class="v2-task-empty">No decisions</p>
				{/if}
			</section>

			<section class="v2-task-panel" aria-labelledby="task-dependencies">
				<header class="v2-task-panel-header">
					<h2 id="task-dependencies">Provider and tool use</h2>
					<span>{dependencySummary.runCount} runs</span>
				</header>
				<div class="v2-task-count-grid">
					<div>
						<span>Provider runs</span>
						<strong>{dependencySummary.providerRunCount}</strong>
					</div>
					<div>
						<span>Tool executions</span>
						<strong>{dependencySummary.toolExecutionCount}</strong>
					</div>
				</div>
				{#if data.dependencyReport.modelProviders.length}
					<div class="v2-task-list v2-task-list-tight">
						{#each data.dependencyReport.modelProviders as provider (provider.providerId)}
							<div class="v2-task-mini-row">
								<span>{provider.name}</span>
								<strong>{provider.runCount}</strong>
							</div>
						{/each}
					</div>
				{/if}
				{#if data.dependencyReport.toolExecutions.length}
					<div class="v2-task-list v2-task-list-tight">
						{#each data.dependencyReport.toolExecutions as execution (execution.executionId)}
							<div class="v2-task-mini-row">
								<span>{execution.toolName}</span>
								<strong>{execution.status}</strong>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<section class="v2-task-panel" aria-labelledby="task-lineage">
				<header class="v2-task-panel-header">
					<h2 id="task-lineage">Lineage and sources</h2>
					<span>{detail.sourceReferences.length} sources</span>
				</header>
				<div class="v2-task-body">
					<div class="v2-task-text-block">
						<span>Source task</span>
						{#if detail.lineage.sourceTaskId}
							<p>
								<a href={taskHref(detail.lineage.sourceTaskId)}>{detail.lineage.sourceTaskTitle}</a>
							</p>
							<p>{detail.lineage.sourceReason}</p>
						{:else}
							<p>No source task</p>
						{/if}
					</div>
					<div class="v2-task-text-block">
						<span>Follow-up tasks</span>
						{#if detail.lineage.followupTaskIds.length}
							<ul>
								{#each detail.lineage.followupTaskIds as followupTaskId (followupTaskId)}
									<li><a href={taskHref(followupTaskId)}>{followupTaskId}</a></li>
								{/each}
							</ul>
						{:else}
							<p>No follow-up tasks</p>
						{/if}
					</div>
					{#if detail.sourceReferences.length}
						<div class="v2-task-source-list">
							{#each detail.sourceReferences as source (`${source.recordTable}:${source.sourceCollection}:${source.sourceId}:${source.field}`)}
								<div>
									<span>{source.sourceSystem} / {source.sourceCollection}</span>
									<strong>{source.sourceId}</strong>
									<p>{source.note}</p>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</section>
		</section>

		<a class="v2-task-back" href={resolve('/app/v2-core')}>Back to v2 core console</a>
	</div>
</AppPage>

<style>
	.v2-core-task-page {
		display: grid;
		gap: 1rem;
	}

	.v2-task-metrics {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
		gap: 0.75rem;
	}

	.v2-task-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 25rem), 1fr));
		gap: 1rem;
		align-items: start;
	}

	.v2-task-panel {
		min-width: 0;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 18%);
		border-radius: 0.5rem;
		background: var(--color-surface-50);
	}

	.v2-task-form-message {
		margin: 0;
		border: 1px solid color-mix(in srgb, var(--color-success-500), transparent 45%);
		border-radius: 0.5rem;
		background: color-mix(in srgb, var(--color-success-100), white 35%);
		padding: 0.75rem 0.875rem;
		color: var(--color-surface-900);
		font-size: 0.84rem;
	}

	.v2-task-form-message-error {
		border-color: color-mix(in srgb, var(--color-error-500), transparent 35%);
		background: color-mix(in srgb, var(--color-error-100), white 35%);
	}

	.v2-task-read-only {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--color-primary-500), transparent 38%);
		border-radius: 0.5rem;
		background: color-mix(in srgb, var(--color-primary-100), white 42%);
		padding: 0.75rem 0.875rem;
	}

	.v2-task-read-only p,
	.v2-task-read-only span {
		margin: 0;
	}

	.v2-task-read-only p {
		color: var(--color-surface-950);
		font-size: 0.9rem;
		font-weight: 750;
	}

	.v2-task-read-only span {
		color: var(--color-surface-700);
		font-size: 0.8rem;
		line-height: 1.35;
	}

	.v2-task-read-only a {
		flex: 0 0 auto;
		color: var(--color-primary-700);
		font-size: 0.82rem;
		font-weight: 700;
		text-decoration: none;
	}

	.v2-task-read-only a:hover {
		text-decoration: underline;
	}

	.v2-task-panel-header {
		display: flex;
		min-height: 3.25rem;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 35%);
		padding: 0.75rem 0.875rem;
	}

	.v2-task-panel-header h2 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
	}

	.v2-task-panel-header span,
	.v2-task-row-meta,
	.v2-task-row-side,
	.v2-task-empty,
	.v2-task-fact span,
	.v2-task-text-block span,
	.v2-task-count-grid span,
	.v2-task-mini-row,
	.v2-task-source-list span {
		color: var(--color-surface-700);
		font-size: 0.78rem;
	}

	.v2-task-body {
		display: grid;
		gap: 0.85rem;
		padding: 0.875rem;
	}

	.v2-task-fact,
	.v2-task-text-block,
	.v2-task-source-list div {
		display: grid;
		gap: 0.25rem;
		min-width: 0;
	}

	.v2-task-fact strong,
	.v2-task-text-block p,
	.v2-task-text-block ul,
	.v2-task-source-list p {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.v2-task-list {
		display: grid;
	}

	.v2-task-list-tight {
		border-top: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 35%);
	}

	.v2-task-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.75rem;
		align-items: center;
		min-height: 4.25rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 45%);
		padding: 0.75rem 0.875rem;
	}

	.v2-task-row:last-child {
		border-bottom: 0;
	}

	.v2-task-row-title {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 650;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}

	.v2-task-row-meta {
		margin: 0.25rem 0 0;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}

	.v2-task-row-side {
		display: grid;
		justify-items: end;
		gap: 0.25rem;
		text-align: right;
	}

	.v2-task-handoff {
		display: grid;
		gap: 0.75rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 45%);
		padding: 0.875rem;
	}

	.v2-task-handoff:last-child {
		border-bottom: 0;
	}

	.v2-task-handoff-header {
		display: flex;
		min-width: 0;
		align-items: start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.v2-task-command-block {
		display: grid;
		gap: 0.25rem;
		min-width: 0;
	}

	.v2-task-command-block span {
		color: var(--color-surface-700);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.v2-task-command-block code {
		border-radius: 0.35rem;
		background: var(--color-surface-100);
		padding: 0.45rem 0.55rem;
		color: var(--color-surface-900);
		font-size: 0.74rem;
		line-height: 1.35;
		overflow-wrap: anywhere;
		white-space: normal;
	}

	.v2-task-badge {
		display: inline-flex;
		max-width: 12rem;
		align-items: center;
		justify-content: center;
		border: 1px solid color-mix(in srgb, var(--color-surface-400), transparent 35%);
		border-radius: 999px;
		padding: 0.1rem 0.45rem;
		background: var(--color-surface-100);
		color: var(--color-surface-900);
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}

	.v2-task-action-form {
		display: grid;
		min-width: min(100%, 13rem);
		gap: 0.4rem;
		justify-items: stretch;
	}

	.v2-task-action-form label,
	.v2-task-evidence-form label {
		display: grid;
		gap: 0.2rem;
		color: var(--color-surface-700);
		font-size: 0.72rem;
		font-weight: 650;
	}

	.v2-task-action-form textarea,
	.v2-task-evidence-form textarea,
	.v2-task-evidence-form input,
	.v2-task-evidence-form select {
		width: 100%;
		min-height: 3rem;
		border: 1px solid color-mix(in srgb, var(--color-surface-400), transparent 30%);
		border-radius: 0.375rem;
		background: white;
		padding: 0.35rem 0.45rem;
		color: var(--color-surface-950);
		font: inherit;
		font-size: 0.78rem;
		line-height: 1.3;
	}

	.v2-task-action-form textarea,
	.v2-task-evidence-form textarea {
		resize: vertical;
	}

	.v2-task-evidence-form input,
	.v2-task-evidence-form select {
		min-height: 2.15rem;
	}

	.v2-task-action-form button,
	.v2-task-evidence-form button {
		border: 1px solid color-mix(in srgb, var(--color-primary-600), transparent 15%);
		border-radius: 0.375rem;
		background: var(--color-primary-600);
		padding: 0.35rem 0.55rem;
		color: white;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1.25;
	}

	.v2-task-action-form button:hover,
	.v2-task-evidence-form button:hover {
		background: var(--color-primary-700);
	}

	.v2-task-evidence-form {
		display: grid;
		gap: 0.65rem;
		padding: 0.875rem;
	}

	.v2-task-form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
		gap: 0.65rem;
	}

	.v2-task-badge-available {
		border-color: color-mix(in srgb, var(--color-success-500), transparent 45%);
		background: color-mix(in srgb, var(--color-success-100), white 35%);
	}

	.v2-task-badge-blocked {
		border-color: color-mix(in srgb, var(--color-warning-500), transparent 40%);
		background: color-mix(in srgb, var(--color-warning-100), white 35%);
	}

	.v2-task-badge-informational {
		border-color: color-mix(in srgb, var(--color-surface-400), transparent 35%);
		background: var(--color-surface-100);
	}

	.v2-task-inline-note,
	.v2-task-empty {
		margin: 0;
		padding: 0.875rem;
		color: var(--color-surface-700);
		font-size: 0.82rem;
	}

	.v2-task-inline-note {
		border-bottom: 1px solid color-mix(in srgb, var(--color-surface-300), transparent 45%);
	}

	.v2-task-count-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: 0.5rem;
		padding: 0.875rem;
	}

	.v2-task-count-grid div,
	.v2-task-mini-row {
		display: flex;
		min-width: 0;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.v2-task-count-grid span,
	.v2-task-mini-row span,
	.v2-task-source-list strong {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.v2-task-count-grid strong,
	.v2-task-mini-row strong {
		color: var(--color-surface-950);
		font-size: 0.9rem;
	}

	.v2-task-mini-row {
		min-height: 2.25rem;
		padding: 0.4rem 0.875rem;
	}

	.v2-task-source-list {
		display: grid;
		gap: 0.75rem;
	}

	.v2-task-back,
	.v2-task-text-block a {
		color: var(--color-primary-700);
		text-decoration: none;
	}

	.v2-task-back:hover,
	.v2-task-text-block a:hover {
		text-decoration: underline;
	}

	@media (max-width: 44rem) {
		.v2-task-read-only {
			align-items: start;
			flex-direction: column;
		}

		.v2-task-row {
			grid-template-columns: 1fr;
		}

		.v2-task-row-side {
			justify-items: start;
			text-align: left;
		}

		.v2-task-handoff-header {
			display: grid;
		}
	}
</style>
