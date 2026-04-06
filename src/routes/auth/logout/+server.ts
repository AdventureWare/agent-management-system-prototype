import { redirect } from '@sveltejs/kit';
import { OPERATOR_LOGIN_PATH, OPERATOR_SESSION_COOKIE } from '$lib/server/operator-auth';

export const POST = async ({ cookies }) => {
	cookies.delete(OPERATOR_SESSION_COOKIE, { path: '/' });
	throw redirect(303, OPERATOR_LOGIN_PATH);
};
