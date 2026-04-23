import { randomUUID } from 'node:crypto';
import type {
	AssistantAction,
	AssistantActionPlan,
	AssistantClarification,
	AssistantContextObject,
	AssistantContextSnapshot,
	AssistantPlanPayload,
	AssistantPlanResponse
} from '$lib/assistant/types';
import type { ControlPlaneData, Project, Role } from '$lib/types/control-plane';

function compactWhitespace(value: string) {
	return value.replace(/\s+/g, ' ').trim();
}

function sentenceCase(value: string) {
	const normalized = compactWhitespace(value.replace(/[.!?]+$/, ''));
	return normalized ? `${normalized[0].toUpperCase()}${normalized.slice(1)}` : '';
}

function escapeRegex(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeEntityReference(value: string) {
	return value
		.toLowerCase()
		.replace(/[_-]+/g, ' ')
		.replace(/[^a-z0-9]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function titleFromPhrase(value: string) {
	return sentenceCase(value)
		.replace(/\bproject\b$/i, '')
		.replace(/\bgoal\b$/i, '')
		.replace(/\btask\b$/i, '')
		.trim();
}

function stripObjectRequestPrefix(input: string, objectWords: string[]) {
	const objectPattern = objectWords.map(escapeRegex).join('|');
	return compactWhitespace(
		input
			.replace(
				new RegExp(
					`^\\b(?:please\\s+)?(?:create|make|add|draft|new|turn|convert)\\b\\s*(?:an?\\s+)?(?:${objectPattern})\\b\\s*`,
					'i'
				),
				''
			)
			.replace(
				new RegExp(
					`^\\b(?:please\\s+)?(?:create|make|add|draft|new|turn|convert)\\b\\s*(?:an?\\s+)?`,
					'i'
				),
				''
			)
	);
}

function firstMatch(input: string, patterns: RegExp[]) {
	for (const pattern of patterns) {
		const match = input.match(pattern);
		const value = match?.[1] ? compactWhitespace(match[1]) : '';

		if (value) {
			return value.replace(/^['"“”‘’]|['"“”‘’]$/g, '').trim();
		}
	}

	return '';
}

function extractInstructions(input: string) {
	return sentenceCase(
		firstMatch(input, [
			/\binstructions?\s+(?:are|is|saying|should\s+say)\s+(.+)$/i,
			/\bwith\s+instructions?\s+(?:saying\s+)?(.+)$/i,
			/\bdescription\s+(?:is|saying)\s+(.+)$/i,
			/\bthat\s+(?:is|are)\s+(.+)$/i
		])
	);
}

function extractName(input: string, objectWords: string[]) {
	const objectPattern = objectWords.map(escapeRegex).join('|');
	const explicit = firstMatch(input, [
		/\b(?:called|named)\s+["“]([^"”]+)["”]/i,
		/\b(?:called|named)\s+([^.;,]+?)(?:\s+with\s+instructions?|\s+that\s+|$)/i,
		new RegExp(
			`\\b(?:create|make|add|draft|new|turn|convert)\\s+(?:an?\\s+)?([^.;,]+?)\\s+(?:${objectPattern})\\b(?:\\s+with\\b|\\s+that\\b|$)`,
			'i'
		),
		new RegExp(`\\b(?:${objectPattern})\\s+(?:called|named)\\s+([^.;,]+)`, 'i'),
		new RegExp(`\\b(?:${objectPattern})\\s+for\\s+([^.;,]+)`, 'i'),
		new RegExp(`\\b(?:${objectPattern})\\s+about\\s+([^.;,]+)`, 'i')
	]);

	if (explicit) {
		return titleFromPhrase(explicit);
	}

	return '';
}

function detectAction(input: string, context: AssistantContextSnapshot): AssistantAction | null {
	const normalized = input.toLowerCase();
	const hasCreateVerb = /\b(create|make|add|draft|new|turn|convert)\b/.test(normalized);
	const mentionedActions: AssistantAction[] = [];

	if (/\bagent\b|\bexecution surface\b/.test(normalized)) {
		mentionedActions.push('create_agent');
	}

	if (/\btask\b|\btodo\b|\bto-do\b|\bchild task\b/.test(normalized)) {
		mentionedActions.push('create_task');
	}

	if (/\brole\b/.test(normalized)) {
		mentionedActions.push('create_role');
	}

	if (/\bgoal\b|\bobjective\b|\bmilestone\b/.test(normalized)) {
		mentionedActions.push('create_goal');
	}

	if (hasCreateVerb && mentionedActions.length > 0) {
		return mentionedActions[0];
	}

	if (mentionedActions.length === 1) {
		return mentionedActions[0];
	}

	if (
		context.visibleCapabilities.includes('create_task') &&
		/\b(track|tracking|fix|improv|redesign|follow[\s-]?up|work item|something to)\b/.test(
			normalized
		)
	) {
		return 'create_task';
	}

	if (
		context.visibleCapabilities.includes('create_role') &&
		/\b(expert|speciali[sz]e|frontend|backend|developer|engineer|designer|researcher|documentation)\b/.test(
			normalized
		)
	) {
		return 'create_role';
	}

	if (/\bone\b/.test(normalized) && context.pageType === 'agent_list') {
		return 'create_agent';
	}

	return null;
}

function contextPreview(context: AssistantContextSnapshot) {
	return {
		route: context.route,
		pageType: context.pageType,
		currentObject: context.currentObject,
		selectedObjects: context.selectedObjects,
		breadcrumbs: context.breadcrumbs,
		visibleCapabilities: context.visibleCapabilities
	};
}

function findCurrentRole(context: AssistantContextSnapshot, data: ControlPlaneData): Role | null {
	const object = context.currentObject;
	if (object?.type !== 'role') {
		return null;
	}

	return data.roles.find((role) => role.id === object.id) ?? null;
}

function inferProjectFromInput(rawInput: string, data: ControlPlaneData): Project | null {
	const normalizedInput = normalizeEntityReference(rawInput);

	if (!normalizedInput) {
		return null;
	}

	const sortedProjects = [...data.projects].sort(
		(left, right) => right.name.length - left.name.length
	);

	for (const project of sortedProjects) {
		const normalizedProjectName = normalizeEntityReference(project.name);

		if (!normalizedProjectName) {
			continue;
		}

		const projectPatterns = [
			normalizedProjectName,
			`${normalizedProjectName} project`,
			`project ${normalizedProjectName}`,
			`belongs to ${normalizedProjectName}`,
			`in ${normalizedProjectName}`,
			`within ${normalizedProjectName}`
		];

		if (projectPatterns.some((pattern) => normalizedInput.includes(pattern))) {
			return project;
		}
	}

	return null;
}

function inferProjectId(
	rawInput: string,
	context: AssistantContextSnapshot,
	data: ControlPlaneData
) {
	const mentionedProject = inferProjectFromInput(rawInput, data);
	if (mentionedProject) {
		return mentionedProject.id;
	}

	const current = context.currentObject;
	const breadcrumbProject = context.breadcrumbs.find((entry) => entry.type === 'project');

	if (current?.type === 'project' && data.projects.some((project) => project.id === current.id)) {
		return current.id;
	}

	if (current?.projectId && data.projects.some((project) => project.id === current.projectId)) {
		return current.projectId;
	}

	if (breadcrumbProject && data.projects.some((project) => project.id === breadcrumbProject.id)) {
		return breadcrumbProject.id;
	}

	if (current?.type === 'goal') {
		const goal = data.goals.find((candidate) => candidate.id === current.id);
		const projectId = goal?.projectIds?.[0];

		if (projectId && data.projects.some((project) => project.id === projectId)) {
			return projectId;
		}
	}

	return data.projects.length === 1 ? data.projects[0].id : '';
}

function inferParentTaskId(context: AssistantContextSnapshot) {
	return context.currentObject?.type === 'task' ? context.currentObject.id : null;
}

function inferGoalId(context: AssistantContextSnapshot, data: ControlPlaneData) {
	const current = context.currentObject;

	if (current?.type === 'goal' && data.goals.some((goal) => goal.id === current.id)) {
		return current.id;
	}

	if (current?.goalId && data.goals.some((goal) => goal.id === current.goalId)) {
		return current.goalId;
	}

	return null;
}

function inferParentGoalId(context: AssistantContextSnapshot, data: ControlPlaneData) {
	const current = context.currentObject;
	return current?.type === 'goal' && data.goals.some((goal) => goal.id === current.id)
		? current.id
		: null;
}

function projectLabel(projectId: string, projects: Project[]) {
	return projects.find((project) => project.id === projectId)?.name ?? projectId;
}

function buildClarification(
	question: string,
	reason: string,
	context: AssistantContextSnapshot,
	options?: string[]
): AssistantClarification {
	return {
		kind: 'clarification',
		question,
		reason,
		contextUsed: contextPreview(context),
		options
	};
}

function missingPlanFieldClarification(
	action: AssistantAction,
	missingFields: string[],
	context: AssistantContextSnapshot
) {
	if (missingFields.includes('projectId')) {
		return buildClarification(
			'Which project should this task belong to?',
			'Creating a task requires a project, and the current page did not provide one.',
			context
		);
	}

	if (missingFields.includes('supportedRoleIds')) {
		return buildClarification(
			'Which role should this agent use?',
			'Creating an agent requires at least one supported role.',
			context
		);
	}

	const label = action.replace('create_', '');
	return buildClarification(
		`What should I call this ${label}?`,
		`The request did not include a clear ${label} name.`,
		context
	);
}

function buildPlan(input: {
	action: AssistantAction;
	objectType: AssistantActionPlan['objectType'];
	confidence: number;
	summary: string;
	payload: AssistantPlanPayload;
	context: AssistantContextSnapshot;
	missingFields: string[];
}): AssistantPlanResponse {
	if (input.missingFields.length > 0) {
		return missingPlanFieldClarification(input.action, input.missingFields, input.context);
	}

	return {
		kind: 'plan',
		plan: {
			id: `assistant_plan_${randomUUID()}`,
			action: input.action,
			objectType: input.objectType,
			confidence: input.confidence,
			summary: input.summary,
			payload: input.payload,
			contextUsed: contextPreview(input.context),
			missingFields: [],
			needsConfirmation: true
		}
	};
}

function buildTaskPlan(
	rawInput: string,
	context: AssistantContextSnapshot,
	data: ControlPlaneData
): AssistantPlanResponse {
	const title =
		extractName(rawInput, ['task', 'todo', 'to-do', 'child task']) ||
		titleFromPhrase(
			firstMatch(rawInput, [
				/\b(?:task|todo|to-do)\s+(?:under|in|on)\s+(?:this|the current)\s+project\s+(?:to|for|about)\s+([^.;,]+)/i,
				/\b(?:task|todo|to-do)\s+(?:to|for|about)\s+([^.;,]+)/i
			])
		) ||
		titleFromPhrase(stripObjectRequestPrefix(rawInput, ['task', 'todo', 'to-do', 'child task'])) ||
		'New Task';
	const instructions = extractInstructions(rawInput);
	const projectId = inferProjectId(rawInput, context, data);
	const goalId = inferGoalId(context, data);
	const parentTaskId = /child task|under this|under the current|under current/i.test(rawInput)
		? inferParentTaskId(context)
		: null;
	const summary = instructions || rawInput;
	const missingFields = [!projectId ? 'projectId' : ''].filter(Boolean);

	return buildPlan({
		action: 'create_task',
		objectType: 'task',
		confidence: parentTaskId || projectId ? 0.86 : 0.72,
		summary: `Create task${projectId ? ` in ${projectLabel(projectId, data.projects)}` : ''}`,
		payload: {
			title,
			summary,
			instructions: summary,
			projectId,
			goalId,
			parentTaskId
		},
		context,
		missingFields
	});
}

function buildGoalPlan(
	rawInput: string,
	context: AssistantContextSnapshot,
	data: ControlPlaneData
): AssistantPlanResponse {
	const name =
		extractName(rawInput, ['goal', 'objective', 'milestone']) ||
		titleFromPhrase(firstMatch(rawInput, [/\b(?:goal|objective|milestone)\s+for\s+([^.;,]+)/i])) ||
		titleFromPhrase(stripObjectRequestPrefix(rawInput, ['goal', 'objective', 'milestone'])) ||
		'New Goal';
	const summary = extractInstructions(rawInput) || rawInput;
	const projectId = inferProjectId(rawInput, context, data);
	const parentGoalId = inferParentGoalId(context, data);

	return buildPlan({
		action: 'create_goal',
		objectType: 'goal',
		confidence: projectId || parentGoalId ? 0.84 : 0.74,
		summary: 'Create goal',
		payload: {
			name,
			summary,
			projectId,
			parentGoalId
		},
		context,
		missingFields: []
	});
}

function buildRolePlan(rawInput: string, context: AssistantContextSnapshot): AssistantPlanResponse {
	const focusArea =
		firstMatch(rawInput, [
			/\bexpert\s+(?:in|at)\s+([^.;,]+)/i,
			/\bspeciali[sz](?:es|ed|ing)?\s+in\s+([^.;,]+)/i,
			/\bfor\s+([^.;,]+?)(?:\s+with\b|\s+that\b|$)/i
		]) || '';
	const name =
		extractName(rawInput, ['role']) ||
		titleFromPhrase(firstMatch(rawInput, [/\brole\s+(?:for|about)\s+([^.;,]+)/i])) ||
		(focusArea ? `${titleFromPhrase(focusArea)} Role` : '') ||
		titleFromPhrase(stripObjectRequestPrefix(rawInput, ['role'])) ||
		'New Role';
	const instructions =
		extractInstructions(rawInput) ||
		(focusArea ? `Expert in ${sentenceCase(focusArea).toLowerCase()}.` : '') ||
		sentenceCase(stripObjectRequestPrefix(rawInput, ['role'])) ||
		`Assistant-created role for ${name}.`;
	const description = instructions || rawInput;

	return buildPlan({
		action: 'create_role',
		objectType: 'role',
		confidence: 0.82,
		summary: 'Create role',
		payload: {
			name,
			description,
			instructions: description,
			systemPrompt: description
		},
		context,
		missingFields: []
	});
}

function buildAgentPlan(
	rawInput: string,
	context: AssistantContextSnapshot,
	data: ControlPlaneData
): AssistantPlanResponse {
	const currentRole = findCurrentRole(context, data);
	const mentionedRole =
		data.roles.find((role) => rawInput.toLowerCase().includes(role.name.toLowerCase())) ?? null;
	const explicitNameCandidate = extractName(rawInput, ['agent', 'execution surface']);
	const explicitName = /^(this|one)$/i.test(explicitNameCandidate) ? '' : explicitNameCandidate;
	const purpose = titleFromPhrase(firstMatch(rawInput, [/\b(?:agent|one)\s+for\s+([^.;,]+)/i]));
	const fallbackRole =
		currentRole ?? mentionedRole ?? (data.roles.length === 1 ? data.roles[0] : null);
	const name =
		explicitName ||
		(fallbackRole ? `${fallbackRole.name} Agent` : purpose && `${purpose} Agent`) ||
		'New Agent';
	const provider =
		data.providers.find((candidate) => candidate.enabled) ?? data.providers[0] ?? null;
	const supportedRoleIds = fallbackRole ? [fallbackRole.id] : [];
	const note =
		extractInstructions(rawInput) ||
		(fallbackRole ? `Assistant-created agent for the ${fallbackRole.name} role.` : rawInput);
	const missingFields = [
		!provider ? 'providerId' : '',
		supportedRoleIds.length === 0 ? 'supportedRoleIds' : ''
	].filter(Boolean);

	return buildPlan({
		action: 'create_agent',
		objectType: 'agent',
		confidence: fallbackRole ? 0.9 : 0.68,
		summary: fallbackRole ? `Create agent for ${fallbackRole.name}` : 'Create agent',
		payload: {
			name: name || '',
			providerId: provider?.id ?? '',
			supportedRoleIds,
			note,
			tags: ['assistant-created']
		},
		context,
		missingFields
	});
}

export function interpretAssistantRequest(input: {
	rawInput: string;
	context: AssistantContextSnapshot;
	data: ControlPlaneData;
}): AssistantPlanResponse {
	const rawInput = compactWhitespace(input.rawInput);

	if (!rawInput) {
		return buildClarification(
			'What would you like me to create?',
			'The assistant needs text before it can plan a structured action.',
			input.context,
			['Create task', 'Create goal', 'Create role', 'Create agent']
		);
	}

	const action = detectAction(rawInput, input.context);

	if (!action) {
		return buildClarification(
			'Do you want this created as a task, goal, role, or agent?',
			'The request did not clearly map to one supported V1 create action.',
			input.context,
			['Task', 'Goal', 'Role', 'Agent']
		);
	}

	switch (action) {
		case 'create_task':
			return buildTaskPlan(rawInput, input.context, input.data);
		case 'create_goal':
			return buildGoalPlan(rawInput, input.context, input.data);
		case 'create_role':
			return buildRolePlan(rawInput, input.context);
		case 'create_agent':
			return buildAgentPlan(rawInput, input.context, input.data);
	}
}
