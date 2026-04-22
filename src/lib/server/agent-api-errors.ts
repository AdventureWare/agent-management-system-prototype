export type AgentApiErrorPayload = {
	error: string;
	errorCode: string;
	retryable: boolean;
	suggestedNextCommands: string[];
	details?: Record<string, unknown>;
};

export type AgentApiErrorOptions = {
	code?: string;
	retryable?: boolean;
	suggestedNextCommands?: string[];
	details?: Record<string, unknown>;
};

export class AgentControlPlaneApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly retryable: boolean;
	readonly suggestedNextCommands: string[];
	readonly details?: Record<string, unknown>;

	constructor(status: number, message: string, options: AgentApiErrorOptions = {}) {
		super(message);
		this.name = 'AgentControlPlaneApiError';
		this.status = status;
		this.code = options.code ?? 'agent_api_error';
		this.retryable = options.retryable ?? false;
		this.suggestedNextCommands = options.suggestedNextCommands ?? [];
		this.details = options.details;
	}
}

export function buildAgentApiErrorPayload(error: AgentControlPlaneApiError): AgentApiErrorPayload {
	return {
		error: error.message,
		errorCode: error.code,
		retryable: error.retryable,
		suggestedNextCommands: error.suggestedNextCommands,
		...(error.details ? { details: error.details } : {})
	};
}

export function formatAgentApiErrorMessage(errorPayload: {
	error?: string;
	errorCode?: string;
	suggestedNextCommands?: string[];
}) {
	const message = errorPayload.error?.trim() || 'Request failed.';
	const codeSegment = errorPayload.errorCode ? ` [${errorPayload.errorCode}]` : '';
	const suggestions =
		Array.isArray(errorPayload.suggestedNextCommands) &&
		errorPayload.suggestedNextCommands.length > 0
			? ` Next: ${errorPayload.suggestedNextCommands.join(', ')}.`
			: '';

	return `${message}${codeSegment}${suggestions}`;
}
