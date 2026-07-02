import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import {
	interpretIntent,
	type IntentInterpretationContext,
	type IntentInterpretationProposal,
	type IntentInterpretationSourceKind
} from '$lib/server/intent-interpretation';
import type { ControlPlaneData } from '$lib/types/control-plane';

export const AGENT_INTENT_INTERPRETATION_COMMANDS = ['interpret_intent'] as const;

export type AgentIntentInterpretationCommand =
	(typeof AGENT_INTENT_INTERPRETATION_COMMANDS)[number];

export type AgentIntentInterpretationInput = {
	command: string;
	rawIntent?: unknown;
	intent?: unknown;
	context?: IntentInterpretationContext | null;
	sourceKind?: IntentInterpretationSourceKind | null;
	sourceId?: string | null;
	projectId?: string | null;
	goalId?: string | null;
	taskId?: string | null;
	runId?: string | null;
};

function normalizeCommand(command: string): AgentIntentInterpretationCommand {
	const normalized = command.trim() as AgentIntentInterpretationCommand;

	if (AGENT_INTENT_INTERPRETATION_COMMANDS.includes(normalized)) {
		return normalized;
	}

	throw new AgentControlPlaneApiError(404, 'Unknown intent interpretation command.', {
		code: 'intent_interpretation_command_not_found',
		suggestedNextCommands: ['manifest --resource intent --command interpret_intent'],
		details: { command }
	});
}

function optionalString(value: unknown) {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readRawIntent(input: AgentIntentInterpretationInput) {
	const rawIntent = input.rawIntent ?? input.intent;

	if (typeof rawIntent !== 'string') {
		throw new AgentControlPlaneApiError(400, 'rawIntent is required.', {
			code: 'raw_intent_required',
			suggestedNextCommands: ['intent:interpret_intent'],
			details: { expectedPayload: { rawIntent: '<operator intent text>' } }
		});
	}

	return rawIntent;
}

function normalizeContext(input: AgentIntentInterpretationInput): IntentInterpretationContext {
	const nested: IntentInterpretationContext =
		input.context && typeof input.context === 'object' ? input.context : {};

	return {
		...nested,
		sourceKind: input.sourceKind ?? nested.sourceKind,
		sourceId: optionalString(input.sourceId) ?? optionalString(nested.sourceId),
		projectId: optionalString(input.projectId) ?? optionalString(nested.projectId),
		goalId: optionalString(input.goalId) ?? optionalString(nested.goalId),
		taskId: optionalString(input.taskId) ?? optionalString(nested.taskId),
		runId: optionalString(input.runId) ?? optionalString(nested.runId),
		assistantContext: nested.assistantContext ?? null
	};
}

export function buildAgentIntentInterpretationResponse(
	data: ControlPlaneData,
	input: AgentIntentInterpretationInput
): IntentInterpretationProposal {
	normalizeCommand(input.command);

	return interpretIntent({
		rawIntent: readRawIntent(input),
		context: normalizeContext(input),
		data
	});
}
