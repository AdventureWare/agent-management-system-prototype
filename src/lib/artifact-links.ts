export type ArtifactPreviewKind = 'text' | 'image' | 'pdf';

type ArtifactPageOptions = {
	line?: number | null;
	column?: number | null;
};

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
const TEXT_EXTENSIONS = new Set([
	'md',
	'markdown',
	'txt',
	'log',
	'yml',
	'yaml',
	'svelte',
	'ts',
	'tsx',
	'js',
	'jsx',
	'json',
	'css',
	'html',
	'xml',
	'sh'
]);

export function artifactPreviewKind(path: string): ArtifactPreviewKind | null {
	const extension = path.split('.').pop()?.toLowerCase() ?? '';

	if (IMAGE_EXTENSIONS.has(extension)) {
		return 'image';
	}

	if (TEXT_EXTENSIONS.has(extension)) {
		return 'text';
	}

	if (extension === 'pdf') {
		return 'pdf';
	}

	return null;
}

export function artifactPreviewHref(path: string) {
	return `/api/artifacts/preview?path=${encodeURIComponent(path)}`;
}

export function artifactFileHref(path: string, options: ArtifactPageOptions = {}) {
	const searchParams = new URLSearchParams({
		path
	});

	if (options.line && options.line > 0) {
		searchParams.set('line', String(options.line));
	}

	if (options.column && options.column > 0) {
		searchParams.set('column', String(options.column));
	}

	return `/app/artifacts?${searchParams.toString()}`;
}

export function artifactFolderHref(path: string) {
	const separatorIndex = path.lastIndexOf('/');
	const folderPath = separatorIndex > 0 ? path.slice(0, separatorIndex) : path;
	return `/app/artifacts?path=${encodeURIComponent(folderPath)}`;
}

export function artifactDownloadHref(path: string) {
	return `/api/artifacts/file?path=${encodeURIComponent(path)}`;
}
