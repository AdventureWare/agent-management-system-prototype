import { AGENT_SANDBOX_OPTIONS, type AgentSandbox } from '$lib/types/agent-thread';

export type TaskTemplateEditorValues = {
	taskTemplateId: string;
	taskTemplateName: string;
	taskTemplateSummary: string;
	projectId: string;
	lifecycleStatus: string;
	sourceTaskTemplateId: string;
	forkReason: string;
	supersededByTaskTemplateId: string;
	goalId: string;
	workflowId: string;
	name: string;
	instructions: string;
	successCriteria: string;
	readyCondition: string;
	expectedOutcome: string;
	area: string;
	priority: string;
	riskLevel: string;
	approvalMode: string;
	requiredThreadSandbox: '' | AgentSandbox;
	requiresReview: boolean;
	desiredRoleId: string;
	assigneeExecutionSurfaceId: string;
	requiredPromptSkillNames: string;
	requiredCapabilityNames: string;
	requiredToolNames: string;
};

export function buildDefaultTaskTemplateEditorValues(
	values?: Partial<Record<keyof TaskTemplateEditorValues, unknown>>,
	fallbackProjectId = ''
): TaskTemplateEditorValues {
	const defaultProjectId =
		typeof values?.projectId === 'string' ? values.projectId : fallbackProjectId;

	return {
		taskTemplateId: typeof values?.taskTemplateId === 'string' ? values.taskTemplateId : '',
		taskTemplateName: typeof values?.taskTemplateName === 'string' ? values.taskTemplateName : '',
		taskTemplateSummary:
			typeof values?.taskTemplateSummary === 'string' ? values.taskTemplateSummary : '',
		projectId: defaultProjectId,
		lifecycleStatus:
			typeof values?.lifecycleStatus === 'string' ? values.lifecycleStatus : 'active',
		sourceTaskTemplateId:
			typeof values?.sourceTaskTemplateId === 'string' ? values.sourceTaskTemplateId : '',
		forkReason: typeof values?.forkReason === 'string' ? values.forkReason : '',
		supersededByTaskTemplateId:
			typeof values?.supersededByTaskTemplateId === 'string'
				? values.supersededByTaskTemplateId
				: '',
		goalId: typeof values?.goalId === 'string' ? values.goalId : '',
		workflowId: typeof values?.workflowId === 'string' ? values.workflowId : '',
		name: typeof values?.name === 'string' ? values.name : '',
		instructions: typeof values?.instructions === 'string' ? values.instructions : '',
		successCriteria: typeof values?.successCriteria === 'string' ? values.successCriteria : '',
		readyCondition: typeof values?.readyCondition === 'string' ? values.readyCondition : '',
		expectedOutcome: typeof values?.expectedOutcome === 'string' ? values.expectedOutcome : '',
		area: typeof values?.area === 'string' ? values.area : 'product',
		priority: typeof values?.priority === 'string' ? values.priority : 'medium',
		riskLevel: typeof values?.riskLevel === 'string' ? values.riskLevel : 'medium',
		approvalMode: typeof values?.approvalMode === 'string' ? values.approvalMode : 'none',
		requiredThreadSandbox:
			typeof values?.requiredThreadSandbox === 'string' &&
			AGENT_SANDBOX_OPTIONS.includes(values.requiredThreadSandbox as AgentSandbox)
				? (values.requiredThreadSandbox as AgentSandbox)
				: '',
		requiresReview: typeof values?.requiresReview === 'boolean' ? values.requiresReview : true,
		desiredRoleId: typeof values?.desiredRoleId === 'string' ? values.desiredRoleId : '',
		assigneeExecutionSurfaceId:
			typeof values?.assigneeExecutionSurfaceId === 'string'
				? values.assigneeExecutionSurfaceId
				: '',
		requiredPromptSkillNames: Array.isArray(values?.requiredPromptSkillNames)
			? values.requiredPromptSkillNames.join(', ')
			: typeof values?.requiredPromptSkillNames === 'string'
				? values.requiredPromptSkillNames
				: '',
		requiredCapabilityNames: Array.isArray(values?.requiredCapabilityNames)
			? values.requiredCapabilityNames.join(', ')
			: typeof values?.requiredCapabilityNames === 'string'
				? values.requiredCapabilityNames
				: '',
		requiredToolNames: Array.isArray(values?.requiredToolNames)
			? values.requiredToolNames.join(', ')
			: typeof values?.requiredToolNames === 'string'
				? values.requiredToolNames
				: ''
	};
}
