import { redirect, type Handle } from '@sveltejs/kit';
import {
	OPERATOR_SESSION_COOKIE,
	getOperatorLoginNextPath,
	getOperatorAuthConfig,
	isOperatorAuthPublicPath,
	isValidAgentApiToken,
	isValidOperatorSession,
	operatorLoginRedirect
} from '$lib/server/operator-auth';
import { readBearerToken } from '$lib/server/operator-auth';

export function isAgentControlPlaneApiPath(pathname: string) {
	return (
		pathname === '/api/agent-capabilities' ||
		pathname === '/api/agent-context/current' ||
		pathname.startsWith('/api/agent-intents/') ||
		pathname.startsWith('/api/agent-goal-loop/') ||
		pathname.startsWith('/api/agent-work-packets/') ||
		pathname.startsWith('/api/agent-run-results/') ||
		pathname.startsWith('/api/agent-reviews/') ||
		pathname === '/api/tasks' ||
		pathname.startsWith('/api/tasks/') ||
		pathname === '/api/goals' ||
		pathname.startsWith('/api/goals/') ||
		pathname === '/api/projects' ||
		pathname.startsWith('/api/projects/')
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	const authConfig = getOperatorAuthConfig();

	if (!authConfig || isOperatorAuthPublicPath(event.url.pathname)) {
		return resolve(event);
	}

	const isThreadApiPath =
		event.url.pathname === '/api/agents/threads' ||
		event.url.pathname.startsWith('/api/agents/threads/');
	const bearerToken = readBearerToken(event.request.headers.get('authorization'));

	if (
		(isThreadApiPath || isAgentControlPlaneApiPath(event.url.pathname)) &&
		isValidAgentApiToken(bearerToken)
	) {
		return resolve(event);
	}

	const isAuthorized = isValidOperatorSession(
		event.cookies.get(OPERATOR_SESSION_COOKIE),
		authConfig
	);

	if (isAuthorized) {
		return resolve(event);
	}

	const nextPath = getOperatorLoginNextPath(event.url);

	if (event.url.pathname.startsWith('/api/')) {
		return new Response(JSON.stringify({ error: 'Remote access login required.' }), {
			status: 401,
			headers: { 'content-type': 'application/json' }
		});
	}

	throw redirect(303, operatorLoginRedirect(nextPath));
};
