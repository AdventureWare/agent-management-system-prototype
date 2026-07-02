import type { AssistantContextSnapshot } from '$lib/assistant/types';
import { resolveEffectiveRigorProfile } from '$lib/rigor-profiles';
import type {
	ControlPlaneData,
	Goal,
	PlanningConfidence,
	Project,
	RigorProfile,
	Run,
	Task,
	TaskApprovalMode,
	TaskAutonomyLevel,
	TaskReadinessLevel,
	TaskReviewRequirement,
	TaskRiskLevel
} from '$lib/types/control-plane';

export type IntentInterpretationSourceKind =
	| 'assistant_request'
	| 'task'
	| 'run'
	| 'thread_contact'
	| 'manual_note';

export type IntentInterpretationConfidence = 'low' | 'medium' | 'high';

export type IntentInterpretationSourceLink = {
	kind: 'raw_intent' | 'project' | 'goal' | 'task' | 'run' | 'assistant_context';
	id: string | null;
	field: string;
	excerpt: string;
};

export type IntentInterpretationAssumption = {
	text: string;
	confidence: IntentInterpretationConfidence;
	evidence: string;
	sourceLinks: IntentInterpretationSourceLink[];
};

export type IntentInterpretationConstraint = {
	text: string;
	source: 'user' | 'project' | 'goal' | 'task' | 'inferred';
	sourceLinks: IntentInterpretationSourceLink[];
};

export type IntentInterpretationUncertainty = {
	question: string;
	blocks: 'goal' | 'task' | 'routing' | 'approval' | 'validation';
	severity: 'low' | 'medium' | 'high';
	sourceLinks: IntentInterpretationSourceLink[];
};

export type IntentInterpretationOpenQuestion = {
	question: string;
	recommendedQuestionTarget: 'operator' | 'agent' | 'reviewer';
	sourceLinks: IntentInterpretationSourceLink[];
};

export type CandidateGoalMapping = {
	name: string;
	summary: string;
	successSignal: string;
	parentGoalId: string | null;
	projectIds: string[];
	planningPriority: number;
	confidence: PlanningConfidence;
	rationale: string;
	sourceLinks: IntentInterpretationSourceLink[];
};

export type CandidateTaskMapping = {
	title: string;
	summary: string;
	expectedOutcome: string;
	scope: string;
	nonGoals: string;
	successCriteria: string;
	validationSteps: string;
	dependencyTaskIds: string[];
	projectId: string | null;
	goalId: string | null;
	parentTaskId: string | null;
	readinessLevel: TaskReadinessLevel;
	autonomyLevel: TaskAutonomyLevel;
	riskLevel: TaskRiskLevel;
	rigorProfile: RigorProfile;
	reviewRequirement: TaskReviewRequirement;
	approvalMode: TaskApprovalMode;
	requiredPromptSkillNames: string[];
	requiredCapabilityNames: string[];
	requiredToolNames: string[];
	routingRationale: string;
	sourceLinks: IntentInterpretationSourceLink[];
};

export type CandidateDecisionMapping = {
	title: string;
	summary: string;
	decisionNeeded: string;
	relatedProjectId: string | null;
	relatedGoalId: string | null;
	relatedTaskId: string | null;
	rationale: string;
	sourceLinks: IntentInterpretationSourceLink[];
};

export type CandidateBlockerMapping = {
	blocker: string;
	blockedEntityKind: 'goal' | 'task' | 'routing' | 'approval' | 'validation';
	blockedEntityId: string | null;
	recommendedResolution: 'ask_clarification' | 'research' | 'request_approval' | 'plan';
	severity: 'low' | 'medium' | 'high';
	sourceLinks: IntentInterpretationSourceLink[];
};

export type IntentInterpretationRoutingAction =
	| 'create_goal'
	| 'create_task'
	| 'update_task'
	| 'ask_clarification'
	| 'research'
	| 'plan'
	| 'request_approval'
	| 'no_action';

export type IntentInterpretationWorkPacketMode =
	| 'planner'
	| 'research'
	| 'executor'
	| 'reviewer'
	| 'clarification';

export type IntentInterpretationProposal = {
	source: {
		rawIntent: string;
		sourceKind: IntentInterpretationSourceKind;
		sourceId: string | null;
		projectId: string | null;
		goalId: string | null;
		taskId: string | null;
		runId: string | null;
		sourceLinks: IntentInterpretationSourceLink[];
	};
	interpretation: {
		statedIntent: string;
		inferredIntent: string;
		assumptions: IntentInterpretationAssumption[];
		constraints: IntentInterpretationConstraint[];
		uncertainties: IntentInterpretationUncertainty[];
		openQuestions: IntentInterpretationOpenQuestion[];
	};
	candidateMappings: {
		candidateGoals: CandidateGoalMapping[];
		candidateTasks: CandidateTaskMapping[];
		candidateDecisions: CandidateDecisionMapping[];
		candidateBlockers: CandidateBlockerMapping[];
	};
	routing: {
		recommendedNextAction: IntentInterpretationRoutingAction;
		rationale: string;
		readinessLevel: TaskReadinessLevel;
		autonomyLevel: TaskAutonomyLevel;
		riskLevel: TaskRiskLevel;
		rigorProfile: RigorProfile;
		reviewRequirement: TaskReviewRequirement;
		workPacketMode: IntentInterpretationWorkPacketMode;
		sourceLinks: IntentInterpretationSourceLink[];
	};
	reviewState: {
		status: 'draft' | 'ready_for_review' | 'accepted' | 'changes_requested' | 'rejected';
		reviewerNotes: string;
		acceptedEntityIds: string[];
	};
	safety: {
		readOnly: true;
		mutationCount: 0;
		notes: string[];
	};
};

export type IntentInterpretationContext = {
	sourceKind?: IntentInterpretationSourceKind;
	sourceId?: string | null;
	projectId?: string | null;
	goalId?: string | null;
	taskId?: string | null;
	runId?: string | null;
	assistantContext?: AssistantContextSnapshot | null;
};

export type InterpretIntentInput = {
	rawIntent: string;
	context?: IntentInterpretationContext;
	data?: ControlPlaneData | null;
};

const MAX_RAW_INTENT_LENGTH = 4000;
const MAX_TEXT_LENGTH = 700;
const MAX_SHORT_TEXT_LENGTH = 240;
const MAX_LIST_ITEMS = 6;

function compactWhitespace(value: string) {
	return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, limit = MAX_TEXT_LENGTH) {
	const normalized = compactWhitespace(value);
	return normalized.length > limit ? `${normalized.slice(0, limit - 1).trim()}...` : normalized;
}

function sentenceCase(value: string) {
	const normalized = compactWhitespace(value.replace(/[.!?]+$/, ''));
	return normalized ? `${normalized[0].toUpperCase()}${normalized.slice(1)}` : '';
}

function titleFromIntent(rawIntent: string) {
	const stripped = compactWhitespace(
		rawIntent
			.replace(
				/^(please\s+)?(create|make|add|draft|implement|build|fix|update|research|investigate|plan|clarify)\s+(a|an|the)?\s*/i,
				''
			)
			.replace(/^(task|goal|objective|work item|todo|to-do)\s+(for|to|about|on)?\s*/i, '')
	);
	const firstClause = stripped.split(/[.;]/)[0] ?? stripped;
	return truncate(sentenceCase(firstClause || rawIntent || 'Interpret operator intent'), 90);
}

function sourceLink(
	kind: IntentInterpretationSourceLink['kind'],
	id: string | null,
	field: string,
	excerpt: string
): IntentInterpretationSourceLink {
	return {
		kind,
		id,
		field,
		excerpt: truncate(excerpt, MAX_SHORT_TEXT_LENGTH)
	};
}

function uniqueByText<
	T extends { text?: string; question?: string; blocker?: string; title?: string }
>(items: T[]) {
	const seen = new Set<string>();
	const result: T[] = [];

	for (const item of items) {
		const key = compactWhitespace(item.text ?? item.question ?? item.blocker ?? item.title ?? '');
		if (!key || seen.has(key.toLowerCase())) {
			continue;
		}

		seen.add(key.toLowerCase());
		result.push(item);
	}

	return result.slice(0, MAX_LIST_ITEMS);
}

function includesAny(value: string, patterns: RegExp[]) {
	return patterns.some((pattern) => pattern.test(value));
}

function resolveContext(input: InterpretIntentInput) {
	const context = input.context ?? {};
	const data = input.data ?? null;
	const assistantObject = context.assistantContext?.currentObject ?? null;
	let run: Run | null =
		context.runId && data ? (data.runs.find((item) => item.id === context.runId) ?? null) : null;
	let task: Task | null =
		context.taskId && data ? (data.tasks.find((item) => item.id === context.taskId) ?? null) : null;
	let goal: Goal | null =
		context.goalId && data ? (data.goals.find((item) => item.id === context.goalId) ?? null) : null;
	let project: Project | null =
		context.projectId && data
			? (data.projects.find((item) => item.id === context.projectId) ?? null)
			: null;

	if (!task && run && data) {
		task = data.tasks.find((item) => item.id === run.taskId) ?? null;
	}

	if (!task && assistantObject?.type === 'task' && data) {
		task = data.tasks.find((item) => item.id === assistantObject.id) ?? null;
	}

	if (!goal && task?.goalId && data) {
		goal = data.goals.find((item) => item.id === task.goalId) ?? null;
	}

	if (!goal && assistantObject?.type === 'goal' && data) {
		goal = data.goals.find((item) => item.id === assistantObject.id) ?? null;
	}

	if (!project && task?.projectId && data) {
		project = data.projects.find((item) => item.id === task.projectId) ?? null;
	}

	if (!project && goal?.projectIds?.[0] && data) {
		project = data.projects.find((item) => item.id === goal.projectIds?.[0]) ?? null;
	}

	if (!project && assistantObject?.type === 'project' && data) {
		project = data.projects.find((item) => item.id === assistantObject.id) ?? null;
	}

	if (!project && data?.projects.length === 1) {
		project = data.projects[0] ?? null;
	}

	return { context, data, project, goal, task, run };
}

function userConstraintLinks(rawIntent: string) {
	const constraints: IntentInterpretationConstraint[] = [];
	const rawLink = sourceLink('raw_intent', null, 'rawIntent', rawIntent);
	const sentences = rawIntent
		.split(/[.;\n]/)
		.map((item) => compactWhitespace(item))
		.filter(Boolean);

	for (const sentence of sentences) {
		if (
			/\b(must|only|keep|avoid|do not|don't|without|no\s+new|read[-\s]?only|migration[-\s]?free)\b/i.test(
				sentence
			)
		) {
			constraints.push({
				text: truncate(sentence),
				source: 'user',
				sourceLinks: [rawLink]
			});
		}
	}

	return constraints;
}

function contextConstraints(input: {
	project: Project | null;
	goal: Goal | null;
	task: Task | null;
}) {
	const constraints: IntentInterpretationConstraint[] = [];
	const { project, goal, task } = input;

	if (project?.constraints) {
		constraints.push({
			text: project.constraints,
			source: 'project',
			sourceLinks: [sourceLink('project', project.id, 'constraints', project.constraints)]
		});
	}

	if (project?.nonGoals) {
		constraints.push({
			text: project.nonGoals,
			source: 'project',
			sourceLinks: [sourceLink('project', project.id, 'nonGoals', project.nonGoals)]
		});
	}

	if (project?.approvalRequirements) {
		constraints.push({
			text: project.approvalRequirements,
			source: 'project',
			sourceLinks: [
				sourceLink('project', project.id, 'approvalRequirements', project.approvalRequirements)
			]
		});
	}

	if (goal?.successSignal) {
		constraints.push({
			text: `Goal success signal: ${goal.successSignal}`,
			source: 'goal',
			sourceLinks: [sourceLink('goal', goal.id, 'successSignal', goal.successSignal)]
		});
	}

	if (task?.scope) {
		constraints.push({
			text: `Existing task scope: ${task.scope}`,
			source: 'task',
			sourceLinks: [sourceLink('task', task.id, 'scope', task.scope)]
		});
	}

	if (task?.nonGoals) {
		constraints.push({
			text: `Existing task non-goals: ${task.nonGoals}`,
			source: 'task',
			sourceLinks: [sourceLink('task', task.id, 'nonGoals', task.nonGoals)]
		});
	}

	return constraints;
}

function buildUncertainties(input: {
	rawIntent: string;
	project: Project | null;
	goal: Goal | null;
	task: Task | null;
}) {
	const rawIntent = input.rawIntent;
	const normalized = rawIntent.toLowerCase();
	const rawLink = sourceLink('raw_intent', null, 'rawIntent', rawIntent);
	const uncertainties: IntentInterpretationUncertainty[] = [];

	if (!rawIntent) {
		uncertainties.push({
			question: 'What intent should AMS interpret?',
			blocks: 'routing',
			severity: 'high',
			sourceLinks: [rawLink]
		});
	}

	if (
		rawIntent &&
		/\b(this|that|it|the page|the thing|stuff|something)\b/i.test(rawIntent) &&
		!input.task &&
		!input.goal &&
		!input.project
	) {
		uncertainties.push({
			question: 'Which existing AMS object does the referenced work belong to?',
			blocks: 'routing',
			severity: 'high',
			sourceLinks: [rawLink]
		});
	}

	if (rawIntent && !input.project) {
		uncertainties.push({
			question: 'Which project should own any resulting task, goal, decision, or blocker?',
			blocks: 'task',
			severity: 'medium',
			sourceLinks: [rawLink]
		});
	}

	if (/\b(unclear|ambiguous|maybe|not sure|unsure|figure out)\b/.test(normalized)) {
		uncertainties.push({
			question: 'Which interpretation should be treated as the operator-approved intent?',
			blocks: 'routing',
			severity: 'medium',
			sourceLinks: [rawLink]
		});
	}

	if (
		/\b(validate|verify|test|success criteria|done when|acceptance)\b/.test(normalized) === false
	) {
		uncertainties.push({
			question:
				'What validation or acceptance signal should prove the interpreted work is complete?',
			blocks: 'validation',
			severity: 'low',
			sourceLinks: [rawLink]
		});
	}

	return uniqueByText(uncertainties);
}

function classifyIntent(rawIntent: string) {
	const normalized = rawIntent.toLowerCase();
	const needsApproval = includesAny(normalized, [
		/\b(approve|approval|permission|authorize)\b/,
		/\b(deploy|merge|release|production|prod|delete|remove data|credential|secret|external state|migration)\b/
	]);
	const needsResearch = includesAny(normalized, [
		/\b(research|investigate|look up|lookup|verify|compare|explore|spike|unknown|uncertain|find out)\b/
	]);
	const asksGoal = /\b(goal|objective|success signal|outcome)\b/.test(normalized);
	const asksTask = /\b(task|todo|to-do|work item|implement|build|fix|update|add|create)\b/.test(
		normalized
	);
	const asksDecision = /\b(decide|decision|choose|approve|approval|confirm)\b/.test(normalized);
	const asksPlan = /\b(plan|break down|decompose|scope|design)\b/.test(normalized);

	return { needsApproval, needsResearch, asksGoal, asksTask, asksDecision, asksPlan };
}

function routeIntent(input: {
	rawIntent: string;
	project: Project | null;
	goal: Goal | null;
	task: Task | null;
	uncertainties: IntentInterpretationUncertainty[];
}) {
	const classified = classifyIntent(input.rawIntent);
	const hasHighSeverityUncertainty = input.uncertainties.some((item) => item.severity === 'high');

	if (!input.rawIntent) {
		return {
			action: 'no_action' as const,
			mode: 'clarification' as const,
			rationale: 'No raw intent was provided, so the helper can only preserve an empty draft.',
			readinessLevel: 'R0_IDEA' as const,
			autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE' as const,
			riskLevel: 'low' as const,
			reviewRequirement: 'SUMMARY_REVIEW' as const,
			approvalMode: 'none' as const
		};
	}

	if (classified.needsApproval) {
		return {
			action: 'request_approval' as const,
			mode: 'clarification' as const,
			rationale:
				'The intent mentions approval-gated, production, destructive, or external-state work.',
			readinessLevel: 'R2_SPECIFIED' as const,
			autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE' as const,
			riskLevel: 'high' as const,
			reviewRequirement: 'EXPLICIT_APPROVAL_REQUIRED' as const,
			approvalMode: 'before_apply' as const
		};
	}

	if (hasHighSeverityUncertainty) {
		return {
			action: 'ask_clarification' as const,
			mode: 'clarification' as const,
			rationale: 'The request depends on unresolved references or missing ownership context.',
			readinessLevel: 'R1_FRAMED' as const,
			autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE' as const,
			riskLevel: 'medium' as const,
			reviewRequirement: 'SUMMARY_REVIEW' as const,
			approvalMode: 'none' as const
		};
	}

	if (classified.needsResearch) {
		return {
			action: 'research' as const,
			mode: 'research' as const,
			rationale: 'The intent asks AMS to reduce uncertainty before execution.',
			readinessLevel: 'R2_SPECIFIED' as const,
			autonomyLevel: 'A2_AGENT_MAY_DRAFT_ARTIFACTS' as const,
			riskLevel: 'medium' as const,
			reviewRequirement: 'SUMMARY_REVIEW' as const,
			approvalMode: 'none' as const
		};
	}

	if (classified.asksGoal && !classified.asksTask) {
		return {
			action: 'create_goal' as const,
			mode: 'planner' as const,
			rationale:
				'The stated intent is goal-shaped and should be reviewed before creating a durable goal.',
			readinessLevel: 'R2_SPECIFIED' as const,
			autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE' as const,
			riskLevel: 'medium' as const,
			reviewRequirement: 'SUMMARY_REVIEW' as const,
			approvalMode: 'none' as const
		};
	}

	if (input.task && /\b(update|change|revise|edit|add to|modify)\b/i.test(input.rawIntent)) {
		return {
			action: 'update_task' as const,
			mode: 'planner' as const,
			rationale: 'The request is anchored to an existing task and appears to change its contract.',
			readinessLevel: 'R2_SPECIFIED' as const,
			autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE' as const,
			riskLevel: 'medium' as const,
			reviewRequirement: 'SUMMARY_REVIEW' as const,
			approvalMode: 'none' as const
		};
	}

	if (classified.asksPlan) {
		return {
			action: 'plan' as const,
			mode: 'planner' as const,
			rationale: 'The request asks for planning or decomposition before execution.',
			readinessLevel: 'R2_SPECIFIED' as const,
			autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE' as const,
			riskLevel: 'medium' as const,
			reviewRequirement: 'SUMMARY_REVIEW' as const,
			approvalMode: 'none' as const
		};
	}

	return {
		action: 'create_task' as const,
		mode: 'executor' as const,
		rationale:
			'The intent is specific enough to propose a bounded task, but the helper will not create it.',
		readinessLevel: 'R3_EXECUTABLE' as const,
		autonomyLevel: 'A2_AGENT_MAY_DRAFT_ARTIFACTS' as const,
		riskLevel: 'medium' as const,
		reviewRequirement: 'SUMMARY_REVIEW' as const,
		approvalMode: 'none' as const
	};
}

export function interpretIntent(input: InterpretIntentInput): IntentInterpretationProposal {
	const rawIntent = truncate(input.rawIntent ?? '', MAX_RAW_INTENT_LENGTH);
	const resolved = resolveContext(input);
	const { context, project, goal, task, run } = resolved;
	const sourceKind = context.sourceKind ?? (task ? 'task' : run ? 'run' : 'assistant_request');
	const sourceId = context.sourceId ?? task?.id ?? run?.id ?? null;
	const rawLink = sourceLink('raw_intent', sourceId, 'rawIntent', rawIntent);
	const sourceLinks = [
		rawLink,
		project ? sourceLink('project', project.id, 'summary', project.summary) : null,
		goal ? sourceLink('goal', goal.id, 'summary', goal.summary) : null,
		task ? sourceLink('task', task.id, 'summary', task.summary) : null,
		run ? sourceLink('run', run.id, 'summary', run.summary) : null,
		context.assistantContext
			? sourceLink('assistant_context', null, 'route', context.assistantContext.route)
			: null
	].filter((item): item is IntentInterpretationSourceLink => Boolean(item));
	const uncertainties = buildUncertainties({ rawIntent, project, goal, task });
	const route = routeIntent({ rawIntent, project, goal, task, uncertainties });
	const rigorProfile = resolveEffectiveRigorProfile({
		task: task ?? { rigorProfile: null },
		project
	});
	const statedIntent = rawIntent || 'No stated intent provided.';
	const inferredIntent =
		route.action === 'no_action'
			? 'No actionable AMS intent can be inferred yet.'
			: `${route.action.replace(/_/g, ' ')} using ${route.mode} mode.`;
	const assumptions: IntentInterpretationAssumption[] = uniqueByText(
		[
			project
				? {
						text: `Use project "${project.name}" as the owning context.`,
						confidence: 'high',
						evidence: `Resolved project ${project.id} from explicit or AMS context.`,
						sourceLinks: [sourceLink('project', project.id, 'name', project.name)]
					}
				: {
						text: 'No project ownership is resolved yet.',
						confidence: 'medium',
						evidence: 'No project ID or current project context was supplied.',
						sourceLinks: [rawLink]
					},
			goal
				? {
						text: `Keep the proposal aligned with goal "${goal.name}".`,
						confidence: 'high',
						evidence: `Resolved goal ${goal.id} from explicit or AMS context.`,
						sourceLinks: [sourceLink('goal', goal.id, 'name', goal.name)]
					}
				: null,
			task
				? {
						text: `Treat existing task "${task.title}" as the likely update anchor.`,
						confidence: route.action === 'update_task' ? 'high' : 'medium',
						evidence: `Resolved task ${task.id} from explicit or AMS context.`,
						sourceLinks: [sourceLink('task', task.id, 'title', task.title)]
					}
				: null,
			{
				text: 'Candidate mappings are proposals only and require review before durable state changes.',
				confidence: 'high',
				evidence: 'Intent interpretation helper is read-only by design.',
				sourceLinks: [rawLink]
			}
		].filter((item): item is IntentInterpretationAssumption => Boolean(item))
	);
	const constraints = uniqueByText<IntentInterpretationConstraint>([
		...userConstraintLinks(rawIntent),
		...contextConstraints({ project, goal, task }),
		{
			text: 'Do not create or update goals, tasks, decisions, blockers, reviews, approvals, runs, or project memory from this helper.',
			source: 'inferred' as const,
			sourceLinks: [rawLink]
		}
	]);
	const openQuestions: IntentInterpretationOpenQuestion[] = uncertainties
		.filter((item) => item.severity !== 'low')
		.slice(0, MAX_LIST_ITEMS)
		.map((item) => ({
			question: item.question,
			recommendedQuestionTarget: item.blocks === 'validation' ? 'reviewer' : 'operator',
			sourceLinks: item.sourceLinks
		}));
	const candidateGoals: CandidateGoalMapping[] =
		route.action === 'create_goal'
			? [
					{
						name: titleFromIntent(rawIntent),
						summary: truncate(rawIntent),
						successSignal:
							'Operator accepts this interpretation and defines concrete success criteria.',
						parentGoalId: goal?.id ?? null,
						projectIds: project ? [project.id] : [],
						planningPriority: 2,
						confidence: uncertainties.length > 0 ? 'medium' : 'high',
						rationale: route.rationale,
						sourceLinks
					}
				]
			: [];
	const shouldProposeTask = [
		'create_task',
		'update_task',
		'research',
		'plan',
		'request_approval'
	].includes(route.action);
	const candidateTasks: CandidateTaskMapping[] = shouldProposeTask
		? [
				{
					title:
						route.action === 'research'
							? `Research ${titleFromIntent(rawIntent)}`
							: route.action === 'request_approval'
								? `Prepare approval for ${titleFromIntent(rawIntent)}`
								: titleFromIntent(rawIntent),
					summary: truncate(rawIntent),
					expectedOutcome:
						route.action === 'research'
							? 'Findings reduce uncertainty and recommend the next AMS state change.'
							: route.action === 'request_approval'
								? 'Operator has enough context to approve, reject, or request changes.'
								: 'A bounded, reviewable change proposal or implementation result exists.',
					scope:
						route.action === 'update_task' && task
							? `Update the contract for task ${task.id}; do not perform unrelated work.`
							: 'Stay within the stated intent and resolved AMS context.',
					nonGoals:
						'Do not mutate durable AMS state from interpretation output; do not create duplicate planning, task, review, approval, or workflow systems.',
					successCriteria:
						'Proposal preserves raw intent, names assumptions and uncertainty, and maps candidates to existing AMS concepts.',
					validationSteps:
						route.action === 'research'
							? 'Record sources, files, or commands checked and state remaining uncertainty.'
							: 'Review the proposal sections before creating or updating durable AMS records.',
					dependencyTaskIds: task?.dependencyTaskIds ?? [],
					projectId: project?.id ?? null,
					goalId: goal?.id ?? task?.goalId ?? null,
					parentTaskId: task?.id ?? null,
					readinessLevel: route.readinessLevel,
					autonomyLevel: route.autonomyLevel,
					riskLevel: route.riskLevel,
					rigorProfile,
					reviewRequirement: route.reviewRequirement,
					approvalMode: route.approvalMode,
					requiredPromptSkillNames: task?.requiredPromptSkillNames ?? [],
					requiredCapabilityNames: task?.requiredCapabilityNames ?? [],
					requiredToolNames: task?.requiredToolNames ?? [],
					routingRationale: route.rationale,
					sourceLinks
				}
			]
		: [];
	const candidateDecisions: CandidateDecisionMapping[] =
		route.action === 'request_approval' || classifyIntent(rawIntent).asksDecision
			? [
					{
						title: `Decide whether to proceed with ${titleFromIntent(rawIntent)}`,
						summary: truncate(rawIntent),
						decisionNeeded:
							'Operator must approve, reject, or narrow the interpreted action before execution.',
						relatedProjectId: project?.id ?? null,
						relatedGoalId: goal?.id ?? null,
						relatedTaskId: task?.id ?? null,
						rationale: route.rationale,
						sourceLinks
					}
				]
			: [];
	const candidateBlockers: CandidateBlockerMapping[] = [
		...uncertainties.map((item) => ({
			blocker: item.question,
			blockedEntityKind: item.blocks,
			blockedEntityId:
				item.blocks === 'goal'
					? (goal?.id ?? null)
					: item.blocks === 'task'
						? (task?.id ?? null)
						: null,
			recommendedResolution:
				route.action === 'research'
					? ('research' as const)
					: route.action === 'request_approval'
						? ('request_approval' as const)
						: item.blocks === 'validation'
							? ('plan' as const)
							: ('ask_clarification' as const),
			severity: item.severity,
			sourceLinks: item.sourceLinks
		})),
		route.action === 'request_approval'
			? {
					blocker: 'Approval-gated intent cannot proceed without operator approval.',
					blockedEntityKind: 'approval' as const,
					blockedEntityId: task?.id ?? null,
					recommendedResolution: 'request_approval' as const,
					severity: 'high' as const,
					sourceLinks
				}
			: null
	].filter((item): item is CandidateBlockerMapping => Boolean(item));

	return {
		source: {
			rawIntent,
			sourceKind,
			sourceId,
			projectId: project?.id ?? null,
			goalId: goal?.id ?? task?.goalId ?? null,
			taskId: task?.id ?? null,
			runId: run?.id ?? null,
			sourceLinks: sourceLinks.slice(0, MAX_LIST_ITEMS)
		},
		interpretation: {
			statedIntent,
			inferredIntent,
			assumptions,
			constraints,
			uncertainties,
			openQuestions
		},
		candidateMappings: {
			candidateGoals,
			candidateTasks,
			candidateDecisions,
			candidateBlockers: candidateBlockers.slice(0, MAX_LIST_ITEMS)
		},
		routing: {
			recommendedNextAction: route.action,
			rationale: route.rationale,
			readinessLevel: route.readinessLevel,
			autonomyLevel: route.autonomyLevel,
			riskLevel: route.riskLevel,
			rigorProfile,
			reviewRequirement: route.reviewRequirement,
			workPacketMode: route.mode,
			sourceLinks: sourceLinks.slice(0, MAX_LIST_ITEMS)
		},
		reviewState: {
			status: 'draft',
			reviewerNotes: '',
			acceptedEntityIds: []
		},
		safety: {
			readOnly: true,
			mutationCount: 0,
			notes: [
				'This proposal is derived from supplied input and context only.',
				'Use existing task, goal, decision, review, approval, or run operations for accepted mutations.'
			]
		}
	};
}
