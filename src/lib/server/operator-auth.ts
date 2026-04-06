import { createHmac, timingSafeEqual } from 'node:crypto';

export const OPERATOR_SESSION_COOKIE = 'ams_operator_session';
export const OPERATOR_LOGIN_PATH = '/auth/login';
export const OPERATOR_LOGOUT_PATH = '/auth/logout';

const DEFAULT_REDIRECT_PATH = '/app/home';

export type OperatorAuthConfig = {
	password: string;
	sessionSecret: string;
};

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
		if (!timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSignature, 'utf8'))) {
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
