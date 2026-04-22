/**
 * @param {{ error?: string; errorCode?: string; suggestedNextCommands?: string[] }} [errorPayload]
 */
export function formatAgentApiErrorMessage(errorPayload = {}) {
	const message = errorPayload.error?.trim() || 'Request failed.';
	const codeSegment = errorPayload.errorCode ? ` [${errorPayload.errorCode}]` : '';
	const suggestions =
		Array.isArray(errorPayload.suggestedNextCommands) &&
		errorPayload.suggestedNextCommands.length > 0
			? ` Next: ${errorPayload.suggestedNextCommands.join(', ')}.`
			: '';

	return `${message}${codeSegment}${suggestions}`;
}
