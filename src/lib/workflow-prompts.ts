import { getRigorProfileGuidance, resolveEffectiveRigorProfile } from '$lib/rigor-profiles';
import type { Goal, Project, Review, Run, Task } from '$lib/types/control-plane';

type PromptTask = Pick<
	Task,
	| 'id'
	| 'title'
	| 'summary'
	| 'status'
	| 'successCriteria'
	| 'readyCondition'
	| 'expectedOutcome'
	| 'scope'
	| 'nonGoals'
	| 'validationSteps'
	| 'rigorProfile'
	| 'readinessLevel'
	| 'autonomyLevel'
	| 'allowedActionNames'
	| 'reviewRequirement'
	| 'riskLevel'
	| 'approvalMode'
	| 'requiresReview'
	| 'requiredPromptSkillNames'
	| 'requiredCapabilityNames'
	| 'requiredToolNames'
	| 'blockedReason'
	| 'dependencyTaskIds'
	| 'artifactPath'
	| 'latestRunId'
>;

type PromptProject = Pick<
	Project,
	| 'id'
	| 'name'
	| 'summary'
	| 'projectBrief'
	| 'currentStateMemo'
	| 'decisionLog'
	| 'agentInstructionsPath'
	| 'setupNotes'
	| 'validationCommands'
	| 'codingConventions'
	| 'approvalRequirements'
	| 'defaultAllowedActions'
	| 'defaultDisallowedActions'
	| 'defaultAutonomyLevel'
	| 'defaultRiskThreshold'
	| 'defaultReviewRequirement'
	| 'defaultRigorProfile'
	| 'defaultValidationExpectations'
	| 'importantLinks'
	| 'constraints'
	| 'nonGoals'
	| 'projectRootFolder'
	| 'defaultArtifactRoot'
>;

type PromptRun = Pick<
	Run,
	| 'id'
	| 'taskId'
	| 'status'
	| 'summary'
	| 'errorSummary'
	| 'artifactPaths'
	| 'promptDigest'
	| 'startedAt'
	| 'endedAt'
	| 'updatedAt'
	| 'agentThreadId'
	| 'threadId'
>;

type PromptReview = Pick<Review, 'id' | 'taskId' | 'runId' | 'status' | 'summary'>;

type PromptGoal = Pick<Goal, 'id' | 'name' | 'status' | 'summary' | 'successSignal'>;

function valueOrFallback(value: string | null | undefined, fallback = 'Not recorded') {
	return value?.trim() || fallback;
}

function bulletList(
	items: Array<string | null | undefined> | undefined,
	fallback = '- Not recorded'
) {
	const filteredItems = (items ?? []).map((item) => item?.trim() ?? '').filter(Boolean);
	return filteredItems.length > 0 ? filteredItems.map((item) => `- ${item}`).join('\n') : fallback;
}

function numberedList(
	items: Array<string | null | undefined> | undefined,
	fallback = 'None recorded'
) {
	const filteredItems = (items ?? []).map((item) => item?.trim() ?? '').filter(Boolean);
	return filteredItems.length > 0
		? filteredItems.map((item, index) => `${index + 1}. ${item}`).join('\n')
		: fallback;
}

function compact(value: string | null | undefined, maxLength = 640) {
	const normalized = valueOrFallback(value).replace(/\s+/g, ' ').trim();
	return normalized.length > maxLength
		? `${normalized.slice(0, maxLength - 1).trimEnd()}...`
		: normalized;
}

function projectMemorySection(project: PromptProject) {
	return [
		`Project: ${project.name} (${project.id})`,
		`Summary: ${valueOrFallback(project.summary)}`,
		`Root: ${valueOrFallback(project.projectRootFolder)}`,
		`Artifact root: ${valueOrFallback(project.defaultArtifactRoot)}`,
		`Instructions path: ${valueOrFallback(project.agentInstructionsPath)}`,
		'',
		'Project brief:',
		valueOrFallback(project.projectBrief || project.summary),
		'',
		'Current state memo:',
		valueOrFallback(project.currentStateMemo),
		'',
		'Constraints:',
		valueOrFallback(project.constraints),
		'',
		'Project non-goals:',
		valueOrFallback(project.nonGoals),
		'',
		'Validation commands:',
		bulletList(project.validationCommands),
		'',
		'Default governance:',
		`- Autonomy: ${project.defaultAutonomyLevel ?? 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE'}`,
		`- Risk threshold: ${project.defaultRiskThreshold ?? 'medium'}`,
		`- Review requirement: ${project.defaultReviewRequirement ?? 'SUMMARY_REVIEW'}`,
		`- Rigor profile: ${project.defaultRigorProfile ?? 'INTERNAL'}`,
		`- Allowed actions: ${(project.defaultAllowedActions ?? []).join(', ') || 'Not recorded'}`,
		`- Disallowed actions: ${(project.defaultDisallowedActions ?? []).join(', ') || 'Not recorded'}`,
		`- Approval requirements: ${valueOrFallback(project.approvalRequirements)}`,
		`- Validation expectations: ${valueOrFallback(project.defaultValidationExpectations)}`,
		'',
		'Important links:',
		bulletList(project.importantLinks),
		'',
		'Decision log:',
		valueOrFallback(project.decisionLog)
	].join('\n');
}

function taskContractSection(task: PromptTask) {
	return [
		`Task: ${task.title} (${task.id})`,
		`Status: ${task.status}`,
		`Summary: ${valueOrFallback(task.summary)}`,
		`Expected outcome: ${valueOrFallback(task.expectedOutcome)}`,
		'',
		'Scope:',
		valueOrFallback(task.scope),
		'',
		'Non-goals:',
		valueOrFallback(task.nonGoals),
		'',
		'Acceptance criteria:',
		valueOrFallback(task.successCriteria),
		'',
		'Ready condition:',
		valueOrFallback(task.readyCondition),
		'',
		'Validation steps:',
		valueOrFallback(task.validationSteps),
		'',
		'Metadata:',
		`- Readiness: ${task.readinessLevel ?? 'R0_IDEA'}`,
		`- Autonomy: ${task.autonomyLevel ?? 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE'}`,
		`- Rigor profile override: ${task.rigorProfile ?? 'Inherit project/default'}`,
		`- Risk: ${task.riskLevel}`,
		`- Review requirement: ${task.reviewRequirement ?? (task.requiresReview ? 'SUMMARY_REVIEW' : 'NONE')}`,
		`- Approval mode: ${task.approvalMode}`,
		`- Allowed actions: ${(task.allowedActionNames ?? []).join(', ') || 'Not recorded'}`,
		`- Required prompt skills: ${(task.requiredPromptSkillNames ?? []).join(', ') || 'None'}`,
		`- Required capabilities: ${(task.requiredCapabilityNames ?? []).join(', ') || 'None'}`,
		`- Required tools: ${(task.requiredToolNames ?? []).join(', ') || 'None'}`,
		`- Dependencies: ${task.dependencyTaskIds.length > 0 ? task.dependencyTaskIds.join(', ') : 'None'}`,
		`- Blocked reason: ${valueOrFallback(task.blockedReason, 'None')}`,
		`- Artifact path: ${valueOrFallback(task.artifactPath)}`
	].join('\n');
}

function rigorGuidanceSection(project: PromptProject, task: PromptTask) {
	const effectiveProfile = resolveEffectiveRigorProfile({ project, task });
	const guidance = getRigorProfileGuidance(effectiveProfile);

	return [
		`Effective rigor profile: ${guidance.label} (${effectiveProfile})`,
		guidance.summary,
		'',
		'Profile-specific validation:',
		bulletList(guidance.validationExpectations),
		'',
		'Profile-specific instructions:',
		bulletList(guidance.promptInstructions)
	].join('\n');
}

export function buildPlannerPrompt(input: {
	project: PromptProject;
	goals?: PromptGoal[];
	tasks?: PromptTask[];
}) {
	const activeTasks = (input.tasks ?? []).filter((task) => task.status !== 'done');

	return [
		'# Planner Mode Work Packet',
		'',
		'You are operating in Planner mode for the Agent Management System. Analyze and propose only. Do not edit code, run destructive commands, launch agents, create external side effects, or mark work complete.',
		'',
		'## Project Memory',
		projectMemorySection(input.project),
		'',
		'## Rigor Profile',
		(input.tasks ?? [])[0]
			? rigorGuidanceSection(input.project, (input.tasks ?? [])[0])
			: `Default rigor profile: ${input.project.defaultRigorProfile ?? 'INTERNAL'}`,
		'',
		'## Goals',
		(input.goals ?? []).length > 0
			? (input.goals ?? [])
					.map(
						(goal) =>
							`- ${goal.name} (${goal.status}): ${compact(goal.summary, 260)} Success signal: ${valueOrFallback(goal.successSignal, 'Not recorded')}`
					)
					.join('\n')
			: '- No goals recorded',
		'',
		'## Current Tasks',
		activeTasks.length > 0
			? activeTasks
					.map(
						(task) =>
							`- ${task.title} (${task.status}, ${task.readinessLevel ?? 'R0_IDEA'}, ${task.autonomyLevel ?? 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE'}, ${task.riskLevel} risk): ${compact(task.summary, 220)}`
					)
					.join('\n')
			: '- No active tasks recorded',
		'',
		'## Produce',
		numberedList([
			'Project status summary',
			'Proposed next tasks, each with outcome, scope, non-goals, acceptance criteria, validation steps, risk, autonomy, readiness, and review requirement',
			'Improvements to existing task specs',
			'Identified blockers',
			'Questions for the user',
			'Recommended changes to readiness, autonomy, risk, allowed actions, and review metadata'
		]),
		'',
		'## Safety Boundaries',
		bulletList([
			'Planner mode is not permission to edit code or mutate project state.',
			'Keep proposed execution tasks in draft or framed readiness until the user accepts them.',
			'Call out ambiguity instead of assuming permission for irreversible or external changes.',
			'Stop and ask if the next step requires credentials, deployment, data deletion, or policy changes.'
		])
	].join('\n');
}

export function buildExecutorPrompt(input: {
	project: PromptProject;
	task: PromptTask;
	goal?: PromptGoal | null;
	recentRuns?: PromptRun[];
}) {
	return [
		'# Executor Mode Work Packet',
		'',
		'You are operating in Executor mode. Work only within this packet. If the task is not R3/R4/R5, is not low risk, lacks acceptance criteria, or conflicts with allowed actions, stop and report the mismatch.',
		'',
		'## Task Contract',
		taskContractSection(input.task),
		'',
		'## Project Context',
		projectMemorySection(input.project),
		'',
		'## Rigor Profile',
		rigorGuidanceSection(input.project, input.task),
		'',
		'## Goal Context',
		input.goal
			? `${input.goal.name} (${input.goal.status}): ${valueOrFallback(input.goal.summary)}\nSuccess signal: ${valueOrFallback(input.goal.successSignal)}`
			: 'No linked goal recorded.',
		'',
		'## Recent Runs',
		(input.recentRuns ?? []).length > 0
			? (input.recentRuns ?? [])
					.map(
						(run) =>
							`- ${run.id} (${run.status}, updated ${run.updatedAt}): ${compact(run.summary || run.errorSummary, 260)}`
					)
					.join('\n')
			: '- No prior runs recorded',
		'',
		'## Allowed Actions',
		bulletList(
			input.task.allowedActionNames,
			'- Only analyze, edit within the project workspace when permitted by autonomy level, and run validation commands needed for this task.'
		),
		'',
		'## Stopping Conditions',
		bulletList([
			'Stop if readiness, autonomy, risk, approval, sandbox, or review constraints do not permit the work.',
			'Stop before deployment, merge, destructive data changes, credential changes, or external-state changes unless explicitly allowed.',
			'Stop and report if validation cannot be run or fails for reasons you cannot address safely.',
			'Stop if the task requires expanding scope beyond the stated outcome or non-goals.'
		]),
		'',
		'## Completion Report Required',
		bulletList([
			'What changed',
			'Which acceptance criteria were satisfied',
			'Validation commands and results',
			'Risks, concerns, or follow-up tasks',
			'Whether the task is ready for human review'
		])
	].join('\n');
}

export function buildResearchPrompt(input: {
	project: PromptProject;
	task: PromptTask;
	goal?: PromptGoal | null;
}) {
	return [
		'# Research Mode Work Packet',
		'',
		'You are operating in Research mode. Reduce uncertainty and report evidence. Do not make implementation changes, launch external side effects, or mark the task complete.',
		'',
		'## Research Question',
		taskContractSection(input.task),
		'',
		'## Project Context',
		projectMemorySection(input.project),
		'',
		'## Rigor Profile',
		rigorGuidanceSection(input.project, input.task),
		'',
		'## Goal Context',
		input.goal
			? `${input.goal.name} (${input.goal.status}): ${valueOrFallback(input.goal.summary)}\nSuccess signal: ${valueOrFallback(input.goal.successSignal)}`
			: 'No linked goal recorded.',
		'',
		'## Produce',
		numberedList([
			'Findings that answer the uncertainty or blocker',
			'Evidence, commands, files, or sources checked',
			'Assumptions that still need user confirmation',
			'Recommended next task mode: clarify, plan, execute, or stop',
			'Suggested updates to outcome, scope, acceptance criteria, validation, risk, or blockers'
		]),
		'',
		'## Safety Boundaries',
		bulletList([
			'Research mode is not permission to edit code or mutate project state.',
			'Prefer local repository evidence before broad speculation.',
			'Stop and ask if the next step requires credentials, paid services, production data, deployment, or contacting external parties.',
			'Call out conflicting evidence instead of hiding uncertainty.'
		])
	].join('\n');
}

export function buildReviewerPrompt(input: {
	project?: PromptProject | null;
	task: PromptTask;
	run?: PromptRun | null;
	review?: PromptReview | null;
}) {
	return [
		'# Reviewer Mode Work Packet',
		'',
		'You are operating in Reviewer mode. Assess the completed or blocked work. Do not make implementation changes unless the user explicitly asks for a revision pass.',
		'',
		'## Task Under Review',
		taskContractSection(input.task),
		'',
		'## Run Under Review',
		input.run
			? [
					`Run: ${input.run.id}`,
					`Status: ${input.run.status}`,
					`Summary: ${valueOrFallback(input.run.summary)}`,
					`Error summary: ${valueOrFallback(input.run.errorSummary, 'None')}`,
					`Artifacts: ${(input.run.artifactPaths ?? []).join(', ') || 'None recorded'}`,
					`Prompt digest: ${valueOrFallback(input.run.promptDigest)}`,
					`Thread: ${input.run.agentThreadId || input.run.threadId || 'Not recorded'}`
				].join('\n')
			: 'No specific run selected. Review the latest completed or blocked task state.',
		'',
		'## Existing Review',
		input.review
			? `${input.review.id} (${input.review.status}): ${valueOrFallback(input.review.summary)}`
			: 'No open review record supplied.',
		'',
		'## Project Context',
		input.project ? projectMemorySection(input.project) : 'No project context supplied.',
		'',
		'## Rigor Profile',
		input.project
			? rigorGuidanceSection(input.project, input.task)
			: `Task rigor profile: ${input.task.rigorProfile ?? 'INTERNAL'}`,
		'',
		'## Assess',
		numberedList([
			'What was attempted',
			'What changed',
			'Whether acceptance criteria were met',
			'Validation results and whether they are credible',
			'Risks, regressions, missing tests, or unresolved blockers',
			'Follow-up tasks, if needed',
			'Decision: accept, reject, or needs revision'
		]),
		'',
		'## Safety Boundaries',
		bulletList([
			'Prefer evidence from diffs, artifacts, logs, and validation output.',
			'Do not accept work when acceptance criteria or validation evidence are missing.',
			'Request revision with specific next actions when the work is incomplete or risky.',
			'Escalate to explicit approval for high-risk, external-state, deployment, or irreversible changes.'
		])
	].join('\n');
}
