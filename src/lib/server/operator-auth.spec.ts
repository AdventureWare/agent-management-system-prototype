import { describe, expect, it } from 'vitest';
import {
	createOperatorSessionValue,
	getAgentApiToken,
	isOperatorAuthPublicPath,
	isValidAgentApiToken,
	isValidOperatorSession,
	operatorLoginRedirect,
	readBearerToken,
	sanitizeNextPath,
	type OperatorAuthConfig
} from './operator-auth';

const config: OperatorAuthConfig = {
	password: 'secret',
	sessionSecret: 'session-secret'
};

describe('operator auth', () => {
	it('accepts signed session values created with the configured secret', () => {
		const sessionValue = createOperatorSessionValue(config);

		expect(isValidOperatorSession(sessionValue, config)).toBe(true);
	});

	it('rejects tampered session values', () => {
		const sessionValue = createOperatorSessionValue(config);
		const [payload] = sessionValue.split('.');

		expect(isValidOperatorSession(`${payload}.tampered`, config)).toBe(false);
	});

	it('keeps login redirects on local app paths', () => {
		expect(operatorLoginRedirect('/app/tasks/task_1')).toBe(
			'/auth/login?next=%2Fapp%2Ftasks%2Ftask_1'
		);
		expect(sanitizeNextPath('//evil.example')).toBe('/app/home');
		expect(sanitizeNextPath('/auth/login?next=%2Fapp%2Fhome')).toBe('/app/home');
	});

	it('only exposes auth and static assets without login', () => {
		expect(isOperatorAuthPublicPath('/auth/login')).toBe(true);
		expect(isOperatorAuthPublicPath('/_app/immutable/app.js')).toBe(true);
		expect(isOperatorAuthPublicPath('/app/home')).toBe(false);
	});

	it('accepts the configured agent api bearer token', () => {
		process.env.AMS_AGENT_API_TOKEN = 'thread-token';

		expect(getAgentApiToken()).toBe('thread-token');
		expect(readBearerToken('Bearer thread-token')).toBe('thread-token');
		expect(isValidAgentApiToken('thread-token')).toBe(true);
		expect(isValidAgentApiToken('wrong-token')).toBe(false);

		delete process.env.AMS_AGENT_API_TOKEN;
	});
});
