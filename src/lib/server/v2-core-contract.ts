export const V2_CORE_FIRST_SLICE_ENTITIES = [
	'Project',
	'Goal',
	'Task',
	'Run',
	'Artifact',
	'Review',
	'Decision',
	'MemoryItem',
	'Tool',
	'ToolExecution',
	'ModelProvider',
	'EvaluationScenario',
	'EvaluationResult',
	'SourceReference'
] as const;

export type V2CoreFirstSliceEntity = (typeof V2_CORE_FIRST_SLICE_ENTITIES)[number];

export const V2_CORE_DEFERRED_CONCEPTS = [
	'Plan',
	'AgentProfile',
	'WorkSession',
	'ContextBundle',
	'Workflow',
	'Skill',
	'Capability',
	'RoutingPolicy',
	'ExternalAIDependency',
	'EventLog',
	'Approval'
] as const;

export type V2CoreDeferredConcept = (typeof V2_CORE_DEFERRED_CONCEPTS)[number];

export const V2_CORE_ENTITY_TABLES: Record<V2CoreFirstSliceEntity, readonly string[]> = {
	Project: ['v2_core_projects'],
	Goal: ['v2_core_goals'],
	Task: ['v2_core_tasks', 'v2_core_task_dependencies'],
	Run: ['v2_core_runs'],
	Artifact: ['v2_core_artifacts'],
	Review: ['v2_core_reviews'],
	Decision: ['v2_core_decisions'],
	MemoryItem: ['v2_core_memory_items', 'v2_core_memory_item_sources'],
	Tool: ['v2_core_tools'],
	ToolExecution: ['v2_core_tool_executions'],
	ModelProvider: ['v2_core_model_providers'],
	EvaluationScenario: ['v2_core_evaluation_scenarios'],
	EvaluationResult: ['v2_core_evaluation_results'],
	SourceReference: ['v2_core_source_references']
};

export const V2_CORE_DEFERRED_TABLE_NAMES = [
	'v2_core_plans',
	'v2_core_agent_profiles',
	'v2_core_work_sessions',
	'v2_core_context_bundles',
	'v2_core_workflows',
	'v2_core_skills',
	'v2_core_capabilities',
	'v2_core_routing_policies',
	'v2_core_external_ai_dependencies',
	'v2_core_event_log',
	'v2_core_approvals'
] as const;

export const V2_CORE_TASK_STATUSES = [
	'draft',
	'ready',
	'in_progress',
	'blocked',
	'review',
	'done',
	'canceled'
] as const;

export const V2_CORE_GOAL_STATUSES = [
	'draft',
	'active',
	'blocked',
	'paused',
	'completed',
	'superseded',
	'canceled'
] as const;

export const V2_CORE_RUN_STATUSES = ['planned', 'running', 'completed', 'failed', 'canceled'] as const;

export const V2_CORE_ARTIFACT_STATUSES = [
	'draft',
	'submitted',
	'accepted',
	'rejected',
	'superseded',
	'deprecated'
] as const;

export const V2_CORE_REVIEW_STATUSES = [
	'open',
	'approved',
	'changes_requested',
	'rejected',
	'canceled'
] as const;

export const V2_CORE_MEMORY_STATUSES = [
	'proposed',
	'trusted',
	'rejected',
	'stale',
	'superseded',
	'deprecated'
] as const;

export const V2_CORE_TOOL_STATUSES = [
	'available',
	'restricted',
	'deprecated',
	'unavailable'
] as const;

export const V2_CORE_MODEL_PROVIDER_STATUSES = ['available', 'unavailable', 'deprecated'] as const;

export const V2_CORE_EVALUATION_SCENARIO_STATUSES = [
	'active',
	'paused',
	'deprecated'
] as const;

export const V2_CORE_EVALUATION_RESULT_STATUSES = [
	'passed',
	'failed',
	'inconclusive'
] as const;

export function getV2CoreFirstSliceTables() {
	return Object.values(V2_CORE_ENTITY_TABLES).flat();
}
