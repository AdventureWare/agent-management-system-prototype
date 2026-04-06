import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	OPERATOR_SESSION_COOKIE,
	createOperatorSessionValue,
	getOperatorAuthConfig,
	isValidOperatorSession,
	sanitizeNextPath
} from '$lib/server/operator-auth';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const authConfig = getOperatorAuthConfig();

	if (!authConfig) {
		throw redirect(303, '/app/home');
	}

	if (isValidOperatorSession(cookies.get(OPERATOR_SESSION_COOKIE), authConfig)) {
		throw redirect(303, sanitizeNextPath(url.searchParams.get('next')));
	}

	return {
		nextPath: sanitizeNextPath(url.searchParams.get('next'))
	};
};

export const actions: Actions = {
	default: async ({ cookies, request }) => {
		const authConfig = getOperatorAuthConfig();

		if (!authConfig) {
			throw redirect(303, '/app/home');
		}

		const formData = await request.formData();
		const password = formData.get('password')?.toString() ?? '';
		const nextPath = sanitizeNextPath(formData.get('next')?.toString() ?? null);

		if (password !== authConfig.password) {
			return fail(401, {
				ok: false,
				nextPath,
				message: 'Password did not match the configured remote operator password.'
			});
		}

		cookies.set(OPERATOR_SESSION_COOKIE, createOperatorSessionValue(authConfig), {
			httpOnly: true,
			path: '/',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 14
		});

		throw redirect(303, nextPath);
	}
};
