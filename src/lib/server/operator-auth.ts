import { createHmac, timingSafeEqual } from 'node:crypto';

export const OPERATOR_SESSION_COOKIE = 'ams_operator_session';
export const OPERATOR_LOGIN_PATH = '/auth/login';
export const OPERATOR_LOGOUT_PATH = '/auth/logout';

const DEFAULT_REDIRECT_PATH = '/app/tasks';

export type OperatorAuthConfig = {
	password: string;
	sessionSecret: string;
};

function safeEqual(value: string, expected: string) {
	try {
		return timingSafeEqual(Buffer.from(value, 'utf8'), Buffer.from(expected, 'utf8'));
	} catch {
		return false;
	}
}

function base64UrlEncode(value: string) {
	return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
	return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload: string, sessionSecret: string) {
	return createHmac('sha256', sessionSecret).update(payload).digest('base64url');
}

export function getOperatorAuthConfig(): OperatorAuthConfig | null {
	const password = process.env.AMS_OPERATOR_PASSWORD?.trim();

	if (!password) {
		return null;
	}

	return {
		password,
		sessionSecret: process.env.AMS_OPERATOR_SESSION_SECRET?.trim() || password
	};
}

export function createOperatorSessionValue(config: OperatorAuthConfig) {
	const payload = base64UrlEncode(
		JSON.stringify({
			authorized: true,
			issuedAt: Date.now()
		})
	);

	return `${payload}.${signPayload(payload, config.sessionSecret)}`;
}

export function isValidOperatorSession(
	sessionValue: string | undefined,
	config: OperatorAuthConfig | null
) {
	if (!config || !sessionValue) {
		return false;
	}

	const [payload, signature] = sessionValue.split('.');

	if (!payload || !signature) {
		return false;
	}

	const expectedSignature = signPayload(payload, config.sessionSecret);

	try {
		if (!safeEqual(signature, expectedSignature)) {
			return false;
		}

		const parsed = JSON.parse(base64UrlDecode(payload)) as {
			authorized?: boolean;
			issuedAt?: number;
		};

		return parsed.authorized === true && Number.isFinite(parsed.issuedAt);
	} catch {
		return false;
	}
}

export function getAgentApiToken() {
	return (
		process.env.AMS_AGENT_API_TOKEN?.trim() ||
		process.env.AMS_OPERATOR_SESSION_SECRET?.trim() ||
		process.env.AMS_OPERATOR_PASSWORD?.trim() ||
		null
	);
}

export function isValidAgentApiToken(token: string | null | undefined) {
	const expectedToken = getAgentApiToken();

	if (!token || !expectedToken) {
		return false;
	}

	return safeEqual(token, expectedToken);
}

export function readBearerToken(value: string | null | undefined) {
	if (!value) {
		return null;
	}

	const match = value.match(/^Bearer\s+(.+)$/i);
	return match?.[1]?.trim() || null;
}

export function operatorLoginRedirect(nextPath?: string | null) {
	const next = sanitizeNextPath(nextPath);
	const encodedNext = encodeURIComponent(next);
	return `${OPERATOR_LOGIN_PATH}?next=${encodedNext}`;
}

export function sanitizeNextPath(nextPath?: string | null) {
	if (!nextPath || !nextPath.startsWith('/')) {
		return DEFAULT_REDIRECT_PATH;
	}

	if (nextPath.startsWith('//') || nextPath.startsWith(OPERATOR_LOGIN_PATH)) {
		return DEFAULT_REDIRECT_PATH;
	}

	return nextPath;
}

export function isOperatorAuthPublicPath(pathname: string) {
	return (
		pathname.startsWith('/_app/') ||
		pathname === '/favicon.ico' ||
		pathname === '/favicon.svg' ||
		pathname.startsWith('/auth/')
	);
}
