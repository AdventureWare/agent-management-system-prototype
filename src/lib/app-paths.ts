import { resolve } from '$app/paths';

export function resolveMaybeInternalPath(href: string) {
	if (!href.startsWith('/') || href.startsWith('//')) {
		return href;
	}

	return (resolve as (path: string) => string)(href);
}
