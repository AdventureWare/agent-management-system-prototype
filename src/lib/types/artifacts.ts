export type ArtifactEntryKind = 'file' | 'directory' | 'other';

export type ArtifactDirectoryEntry = {
	name: string;
	path: string;
	kind: ArtifactEntryKind;
	extension: string;
	sizeBytes: number | null;
};

export type ArtifactKnownOutput = {
	label: string;
	path: string;
	kind: ArtifactEntryKind;
	extension: string;
	sizeBytes: number | null;
	exists: boolean;
	href: string | null;
	description: string;
};

export type ArtifactBrowserData = {
	rootPath: string;
	rootKind: 'directory' | 'file' | 'missing' | 'unreadable';
	browsePath: string | null;
	inspectingParentDirectory: boolean;
	directoryEntries: ArtifactDirectoryEntry[];
	directoryEntriesTruncated: boolean;
	knownOutputs: ArtifactKnownOutput[];
	errorMessage: string;
};
