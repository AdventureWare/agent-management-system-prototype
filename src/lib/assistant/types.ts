export type AssistantObjectType = 'project' | 'goal' | 'task' | 'role' | 'agent' | 'workflow';

export type AssistantAction = 'create_task' | 'create_goal' | 'create_role' | 'create_agent';

export type AssistantPageType =
	| 'dashboard'
	| 'project_list'
	| 'project_detail'
	| 'goal_list'
	| 'goal_detail'
	| 'task_list'
	| 'task_detail'
	| 'role_list'
	| 'role_detail'
	| 'agent_list'
	| 'agent_detail'
	| 'workflow_list'
	| 'workflow_detail'
	| 'unknown';

export type AssistantContextObject = {
	type: AssistantObjectType;
	id: string;
	name: string;
	projectId?: string | null;
	goalId?: string | null;
	roleId?: string | null;
	summary?: string | null;
};

export type AssistantBreadcrumb = AssistantContextObject;

export type AssistantContextSnapshot = {
	route: string;
	pageType: AssistantPageType;
	currentObject: AssistantContextObject | null;
	selectedObjects: AssistantContextObject[];
	breadcrumbs: AssistantBreadcrumb[];
	visibleCapabilities: AssistantAction[];
};

export type AssistantPlanPayload = {
	name?: string;
	title?: string;
	summary?: string;
	description?: string;
	instructions?: string;
	systemPrompt?: string;
	projectId?: string;
	goalId?: string | null;
	parentTaskId?: string | null;
	parentGoalId?: string | null;
	roleId?: string | null;
	providerId?: string;
	supportedRoleIds?: string[];
	note?: string;
	tags?: string[];
};

export type AssistantActionPlan = {
	id: string;
	action: AssistantAction;
	objectType: 'task' | 'goal' | 'role' | 'agent';
	confidence: number;
	summary: string;
	payload: AssistantPlanPayload;
	contextUsed: Partial<AssistantContextSnapshot>;
	missingFields: string[];
	needsConfirmation: true;
};

export type AssistantClarification = {
	kind: 'clarification';
	question: string;
	reason: string;
	contextUsed: Partial<AssistantContextSnapshot>;
	options?: string[];
};

export type AssistantPlanResponse =
	| {
			kind: 'plan';
			plan: AssistantActionPlan;
	  }
	| AssistantClarification;

export type AssistantExecuteResponse = {
	ok: boolean;
	action: AssistantAction;
	objectType: AssistantActionPlan['objectType'];
	record: {
		id: string;
		name: string;
		href: string;
	};
};
