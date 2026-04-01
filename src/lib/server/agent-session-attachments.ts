import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import type { AgentSessionAttachment } from '$lib/types/agent-session';
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

function createSessionAttachmentId() {
	return `session_attachment_${randomUUID()}`;
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

function decodeInlineAttachment(buffer: Buffer) {
	const normalized = buffer.toString('utf8').replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim();

	if (!normalized) {
		return null;
	}

	return normalized.length > MAX_INLINE_ATTACHMENT_CHARS
		? `${normalized.slice(0, MAX_INLINE_ATTACHMENT_CHARS).trimEnd()}\n[truncated]`
		: normalized;
}

export function buildSessionAttachmentPrompt(input: {
	prompt: string;
	attachments: AgentSessionAttachment[];
	inlineAttachmentContents: { attachment: AgentSessionAttachment; content: string }[];
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

export async function persistSessionAttachments(input: {
	rootPath: string;
	sessionId: string;
	uploads: File[];
}) {
	const attachmentDir = resolve(input.rootPath, input.sessionId, 'attachments');

	await mkdir(attachmentDir, { recursive: true });

	const attachments: AgentSessionAttachment[] = [];
	const inlineAttachmentContents: { attachment: AgentSessionAttachment; content: string }[] = [];

	for (const upload of input.uploads) {
		const attachmentId = createSessionAttachmentId();
		const safeName = sanitizeTaskAttachmentName(upload.name);
		const attachmentPath = resolve(attachmentDir, `${attachmentId}-${safeName}`);
		const buffer = Buffer.from(await upload.arrayBuffer());
		const attachment: AgentSessionAttachment = {
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
