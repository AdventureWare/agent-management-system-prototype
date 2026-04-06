import { getOperatorAuthConfig } from '$lib/server/operator-auth';

export const load = async () => {
	return {
		operatorAuthEnabled: Boolean(getOperatorAuthConfig())
	};
};
