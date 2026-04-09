import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import type { AgentThreadAttachment } from '$lib/types/agent-thread';
import { sanitizeTaskAttachmentName } from '$lib/server/task-attachments';

const INLINE_ATTACHMENT_EXTENSIONS = new Set([
	'.txt',
	'.md',
	'.markdown',
	'.json',
	'.jsonl',
	'.yaml',
	'.yml',
	'.csv',
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
	'.svelte',
	'.html',
	'.css',
	'.xml',
	'.svg',
	'.sh'
]);
const MAX_INLINE_ATTACHMENT_BYTES = 64 * 1024;
const MAX_INLINE_ATTACHMENT_CHARS = 12_000;

function createThreadAttachmentId() {
	return `thread_attachment_${randomUUID()}`;
}

function formatAttachmentSize(sizeBytes: number) {
	if (sizeBytes < 1024) {
		return `${sizeBytes} B`;
	}

	if (sizeBytes < 1024 * 1024) {
		return `${(sizeBytes / 1024).toFixed(1)} KB`;
	}

	return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isInlineAttachment(upload: File) {
	if (upload.size > MAX_INLINE_ATTACHMENT_BYTES) {
		return false;
	}

	if (upload.type.startsWith('text/')) {
		return true;
	}

	return INLINE_ATTACHMENT_EXTENSIONS.has(extname(upload.name).toLowerCase());
}

function inferAttachmentContentType(path: string) {
	switch (extname(path).toLowerCase()) {
		case '.md':
		case '.markdown':
			return 'text/markdown; charset=utf-8';
		case '.txt':
		case '.log':
		case '.yml':
		case '.yaml':
		case '.csv':
		case '.ts':
		case '.tsx':
		case '.js':
		case '.jsx':
		case '.mjs':
		case '.cjs':
		case '.svelte':
		case '.css':
		case '.xml':
		case '.sh':
			return 'text/plain; charset=utf-8';
		case '.json':
		case '.jsonl':
			return 'application/json; charset=utf-8';
		case '.html':
			return 'text/html; charset=utf-8';
		case '.svg':
			return 'image/svg+xml';
		case '.png':
			return 'image/png';
		case '.jpg':
		case '.jpeg':
			return 'image/jpeg';
		case '.gif':
			return 'image/gif';
		case '.webp':
			return 'image/webp';
		case '.pdf':
			return 'application/pdf';
		default:
			return 'application/octet-stream';
	}
}

function isInlineAttachmentPath(path: string, sizeBytes: number) {
	if (sizeBytes > MAX_INLINE_ATTACHMENT_BYTES) {
		return false;
	}

	const contentType = inferAttachmentContentType(path);

	if (contentType.startsWith('text/')) {
		return true;
	}

	return INLINE_ATTACHMENT_EXTENSIONS.has(extname(path).toLowerCase());
}

function decodeInlineAttachment(buffer: Buffer) {
	const normalized = buffer.toString('utf8').replace(/\r\n/g, '\n').split('\0').join('').trim();

	if (!normalized) {
		return null;
	}

	return normalized.length > MAX_INLINE_ATTACHMENT_CHARS
		? `${normalized.slice(0, MAX_INLINE_ATTACHMENT_CHARS).trimEnd()}\n[truncated]`
		: normalized;
}

export function buildThreadAttachmentPrompt(input: {
	prompt: string;
	attachments: AgentThreadAttachment[];
	inlineAttachmentContents: { attachment: AgentThreadAttachment; content: string }[];
}) {
	if (input.attachments.length === 0) {
		return input.prompt;
	}

	const attachmentLines = input.attachments.map(
		(attachment) =>
			`- ${attachment.name} (${attachment.contentType || 'application/octet-stream'}, ${formatAttachmentSize(attachment.sizeBytes)}) at ${attachment.path}`
	);
	const inlineSections = input.inlineAttachmentContents.map(
		({ attachment, content }) =>
			`Attachment: ${attachment.name}\nPath: ${attachment.path}\nContent:\n\`\`\`\n${content}\n\`\`\``
	);
	const instruction = input.prompt.trim() || 'Review the attached files and continue the thread.';

	return [
		'A follow-up was sent with files attached to this thread. Treat them as immediate context for this run.',
		'',
		'Thread attachments:',
		...attachmentLines,
		inlineSections.length > 0 ? '\nInline attachment context:' : '',
		...inlineSections,
		'\nUser instruction:',
		instruction
	]
		.filter(Boolean)
		.join('\n');
}

export async function persistThreadAttachments(input: {
	rootPath: string;
	threadId: string;
	uploads: File[];
}) {
	const attachmentDir = resolve(input.rootPath, input.threadId, 'attachments');

	await mkdir(attachmentDir, { recursive: true });

	const attachments: AgentThreadAttachment[] = [];
	const inlineAttachmentContents: { attachment: AgentThreadAttachment; content: string }[] = [];

	for (const upload of input.uploads) {
		const attachmentId = createThreadAttachmentId();
		const safeName = sanitizeTaskAttachmentName(upload.name);
		const attachmentPath = resolve(attachmentDir, `${attachmentId}-${safeName}`);
		const buffer = Buffer.from(await upload.arrayBuffer());
		const attachment: AgentThreadAttachment = {
			id: attachmentId,
			name: upload.name.trim() || safeName,
			path: attachmentPath,
			contentType: upload.type || 'application/octet-stream',
			sizeBytes: upload.size,
			attachedAt: new Date().toISOString()
		};

		await writeFile(attachmentPath, buffer);
		attachments.push(attachment);

		if (!isInlineAttachment(upload)) {
			continue;
		}

		const content = decodeInlineAttachment(buffer);

		if (content) {
			inlineAttachmentContents.push({ attachment, content });
		}
	}

	return {
		attachments,
		inlineAttachmentContents
	};
}

export async function persistThreadAttachmentPaths(input: {
	rootPath: string;
	threadId: string;
	paths: string[];
}) {
	const attachmentDir = resolve(input.rootPath, input.threadId, 'attachments');

	await mkdir(attachmentDir, { recursive: true });

	const attachments: AgentThreadAttachment[] = [];
	const inlineAttachmentContents: { attachment: AgentThreadAttachment; content: string }[] = [];
	const normalizedPaths = [...new Set(input.paths.map((path) => path.trim()).filter(Boolean))];

	for (const sourcePath of normalizedPaths) {
		let details;

		try {
			details = await stat(sourcePath);
		} catch {
			throw new Error(`Attachment path is missing from disk: ${sourcePath}`);
		}

		if (!details.isFile()) {
			throw new Error(`Attachment path must point to a file: ${sourcePath}`);
		}

		const attachmentId = createThreadAttachmentId();
		const safeName = sanitizeTaskAttachmentName(basename(sourcePath));
		const attachmentPath = resolve(attachmentDir, `${attachmentId}-${safeName}`);

		await copyFile(sourcePath, attachmentPath);

		const attachment: AgentThreadAttachment = {
			id: attachmentId,
			name: safeName,
			path: attachmentPath,
			contentType: inferAttachmentContentType(sourcePath),
			sizeBytes: details.size,
			attachedAt: new Date().toISOString()
		};

		attachments.push(attachment);

		if (!isInlineAttachmentPath(sourcePath, details.size)) {
			continue;
		}

		const content = decodeInlineAttachment(await readFile(attachmentPath));

		if (content) {
			inlineAttachmentContents.push({ attachment, content });
		}
	}

	return {
		attachments,
		inlineAttachmentContents
	};
}
