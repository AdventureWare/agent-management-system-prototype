import { redirect, type Handle } from '@sveltejs/kit';
import {
	OPERATOR_SESSION_COOKIE,
	getOperatorAuthConfig,
	isOperatorAuthPublicPath,
	isValidAgentApiToken,
	isValidOperatorSession,
	operatorLoginRedirect
} from '$lib/server/operator-auth';
import { readBearerToken } from '$lib/server/operator-auth';

export const handle: Handle = async ({ event, resolve }) => {
	const authConfig = getOperatorAuthConfig();

	if (!authConfig || isOperatorAuthPublicPath(event.url.pathname)) {
		return resolve(event);
	}

	const isThreadApiPath =
		event.url.pathname === '/api/agents/threads' ||
		event.url.pathname.startsWith('/api/agents/threads/');
	const bearerToken = readBearerToken(event.request.headers.get('authorization'));

	if (isThreadApiPath && isValidAgentApiToken(bearerToken)) {
		return resolve(event);
	}

	const isAuthorized = isValidOperatorSession(
		event.cookies.get(OPERATOR_SESSION_COOKIE),
		authConfig
	);

	if (isAuthorized) {
		return resolve(event);
	}

	const nextPath = `${event.url.pathname}${event.url.search}`;

	if (event.url.pathname.startsWith('/api/')) {
		return new Response(JSON.stringify({ error: 'Remote access login required.' }), {
			status: 401,
			headers: { 'content-type': 'application/json' }
		});
	}

	throw redirect(303, operatorLoginRedirect(nextPath));
};
